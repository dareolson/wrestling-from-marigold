// Whip with weight (PLAN_GRAPPLES T3d): the same scripted whip run against two servers, today (WFM_BASE) and revised (WFM_URL).
// Reports the thrower's hip drop and lean, the receiver's x speed after the release, torso pitch, arm and elbow angles at the turn,
// the load and the launch, release-to-rope time, direction, and first-frame pose steps. With FILM=<dir>, films a tight strip.
//   WFM_URL=http://localhost:5177 WFM_BASE=http://127.0.0.1:5191 node tools/debug/whip_weight.mjs [outFile]
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const STAMINA = [['fresh', 100], ['worn', 20]];
const kind = process.env.KIND ?? 'rope';       // rope | cross | corner
const out = process.argv[2] ?? `${process.env.TMPDIR ?? '/tmp'}whip_weight.json`;

const step = (a, b) => { let m = 0; a.parts.forEach((p, i) => { if (!p.vis || !b.parts[i].vis) return; p.c.forEach((c, j) => { m = Math.max(m, Math.hypot(c[0] - b.parts[i].c[j][0], c[1] - b.parts[i].c[j][1])); }); }); return m; };
const r = (v, n = 2) => (v == null ? null : +v.toFixed(n));

const SCR = () => { const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2, cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width;
    return { phase: d.runPhase ?? null, dx: d.x, rt: d.runTarget, scr: { x: box.x + (d.x - cam.worldView.x) * cam.zoom * k, y: box.y + (d.y - cam.worldView.y) * cam.zoom * k } }; };
// One scripted whip. `shots` = { window: [from, to], at: row index whose receiver position centres the clip, dir } films every frame in the window.
async function run(h, { dirKey, st, shots }) {
    await h.page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1.y = sc.w2.y = 400; });
    const rows = []; let n = 0, clip = null;
    for (let i = 0; i < 260; i++) {
        if (i === 47) await h.page.evaluate((s) => { window.__WFM_GAME.scene.scenes[0].w2.stamina = s; }, st);
        const row = await h.page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [] }, hold: { a: i === 48 ? [dirKey] : [] } });
        const ex = await h.page.evaluate(SCR);
        rows.push({ ...row, ...ex, dy: 0, i });
        if (shots && i >= shots.window[0] && i <= shots.window[1]) {
            if (!clip) { const c = shots.centre, W = 520, H = 330; clip = { x: Math.max(0, c.x - W / 2), y: Math.max(0, c.y - H * 0.72), width: W, height: H }; }
            await h.page.screenshot({ path: `${shots.dir}/s${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
        }
    }
    return rows;
}

function measure(rows, dirKey) {
    const dir = dirKey === 'right' ? 1 : -1;
    const rel = rows.findIndex(r => r.d.state === 'running');
    const hit = rows.findIndex((r, i) => i > rel && r.phase === 'ropeHit');
    const turn = rows.findIndex((r, i) => i > rel && i < hit && r.d.facing !== rows[i - 1].d.facing);
    const launch = rows.findIndex((r, i) => i > hit && r.phase === 'returning');
    if (rel < 0 || hit < 0) return null;
    const A = (i, k) => rows[i].a.pose[k], D = (i, k) => rows[i].d.pose[k];
    const att = rows.slice(40, rel + 30).map(r => r.a);
    const hipOf = a => (a.pts.nearHip.y + a.pts.farHip.y) / 2 - a.y;   // against the man's own y, so a step in depth doesn't count
    const leanPx = a => (a.pts.neck.x - (a.pts.nearHip.x + a.pts.farHip.x) / 2) * a.facing / a.s;
    const hipY = att.map(hipOf);
    const base = IDLE_HIP[rows[0].a.s > 0 ? 'v' : 'v'];
    const speed = rows.slice(rel - 1, rel + 13).map((r, k, arr) => (k ? r.dx - arr[k - 1].dx : 0)).map(v => r(v * dir));
    const f = (i) => ({ bend: r(D(i, 'bend')), lArm: r(D(i, 'lArm')), rArm: r(D(i, 'rArm')), lElbow: r(D(i, 'lElbow')), rElbow: r(D(i, 'rElbow')), crouch: r(D(i, 'crouch')) });
    const load = hit + Math.round(0.17 * 60);
    const pitch = rows.slice(rel, hit).filter((_, k) => k % 4 === 0).map(r0 => r(r0.d.pose.bend));
    return {
        releaseFrame: rel, releaseToRopeMs: r((hit - rel) * 1000 / 60, 0),
        dirOK: Math.sign(rows[hit].dx - rows[rel].dx) === dir && rows[rel + 5].d.facing === dir,
        thrower: { hipDropPx: r(Math.max(...hipY.map(v => v - base))), hipDropPerS: r(Math.max(...hipY.map(v => v - base)) / att[0].s), torsoLeanPxPerS: [r(Math.min(...att.map(leanPx))), r(Math.max(...att.map(leanPx)))], leanMin: r(Math.min(...rows.slice(40, rel + 30).map(rr => rr.a.pose.bend ?? 0))), leanMax: r(Math.max(...rows.slice(40, rel + 30).map(rr => rr.a.pose.bend ?? 0))), crouchMax: r(Math.max(...rows.slice(40, rel + 30).map(rr => rr.a.pose.crouch ?? 0))) },
        recvSpeedPxPerFrame: speed, recvPitchEvery4: pitch, recvTorsoLeanPxPerS: rows.slice(rel, hit).filter((_, k) => k % 6 === 0).map(rr => r(leanPx(rr.d), 1)),
        arms: { turn: turn > 0 ? f(turn) : null, load: f(load), launch: launch > 0 ? f(launch) : null },
        steps: { release: r(step(rows[rel - 1].d, rows[rel].d)), rope: r(step(rows[hit - 1].d, rows[hit].d)) },
    };
}

const IDLE_HIP = { v: 0 };   // hip height above the feet's y at rest, set per rig before each case
const results = {};
for (const [which, url] of [['revised', process.env.WFM_URL], ['today', process.env.WFM_BASE]]) {
    if (!url) continue;
    process.env.WFM_URL = url;
    for (const [pair, att, def] of PAIRS) {
        process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
        const h = await launch();
        try {
            await h.page.waitForTimeout(2500);
            await h.page.evaluate(INSTALL);
            IDLE_HIP.v = await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1; w.state = 'standing'; sc.tweens.killTweensOf(w.pose); w._choreoUntil = sc.time.now + 5000; Object.assign(w.pose, { crouch: 0, bend: 0, lean: 0, lKnee: 0, rKnee: 0 }); window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); const p = w.skeleton.jointAttachmentPoints; return (p.nearHip.y + p.farHip.y) / 2 - w.y; });
            for (const dirKey of ['left', 'right']) for (const [label, st] of STAMINA) {
                const id = `${pair}-${dirKey}-${label}`;
                const rows = await run(h, { dirKey, st });
                const m = measure(rows, dirKey);
                (results[which] ??= {})[id] = m;
                if (process.env.FILM && label === 'fresh' && m) {
                    const hit = rows.findIndex((r, i) => i > m.releaseFrame && r.phase === 'ropeHit'), launch = rows.findIndex((r, i) => i > hit && r.phase === 'returning');
                    for (const [name, window, at] of [['throw', [m.releaseFrame - 18, m.releaseFrame + 40], m.releaseFrame - 18], ['rope', [hit - 16, launch + 40], hit - 16]]) {
                        const dir = `${process.env.FILM}/${which}/${id}/${name}`; mkdirSync(dir, { recursive: true });
                        await run(h, { dirKey, st, shots: { window, dir, centre: rows[at].scr } });
                    }
                }
                console.log(which, id, JSON.stringify(results[which][id]));
            }
        } finally { await h.close(); }
    }
}
writeFileSync(out, JSON.stringify(results, null, 2));
