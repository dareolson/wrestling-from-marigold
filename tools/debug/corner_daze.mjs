// Stuck in the corner and the running attack at him (PLAN_GRAPPLES T3c.6-T3c.7): real lockup input whips the receiver into a corner
// (grapples=v1); then the daze alone, a charge that hits, or a charge that misses because he got out. Measures every case; films the
// near and far corners of both kits (every game frame, tight on the corner) for the page's normal and quarter speed.
//   WFM_URL=http://localhost:5173 node tools/debug/corner_daze.mjs [--no-film]
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
const root = 'research/animation/whip-2026-10';
const FILM = !process.argv.includes('--no-film');
mkdirSync(root, { recursive: true });
const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
// the four corners: whip direction (left/right) and up (far) or down (near)
const CORNERS = [['left-near', 'left', 'down'], ['right-near', 'right', 'down'], ['left-far', 'left', 'up'], ['right-far', 'right', 'up']];
const FILMED = new Set(['left-near', 'right-far']);
const SCENARIOS = ['daze', 'hit', 'miss'];
const FULL = process.env.FULL === '1';
if (FULL) { SCENARIOS.length = 0; SCENARIOS.push('full'); CORNERS.splice(1); }   // one long run: arrive, hold, hit, restore, walk off, charge again as he escapes (a miss)

const READ = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize;
    const k = box.width / g.width, ep = d._cornerEp, aep = a._cornerEp;
    const bodyDepth = (w) => w.skeleton.depth ?? w.skeleton._parts?.[0]?.depth ?? null;
    const parts = (w) => w.skeleton._parts.filter(i => i.visible).map(img => {
        const m = img.getWorldTransformMatrix(), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
        return [[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([x, y]) => [m.a * x + m.c * y + m.tx, m.b * x + m.d * y + m.ty]);
    });
    const bb = (w) => { const all = parts(w).flat(); return { minX: Math.min(...all.map(p => p[0])), maxX: Math.max(...all.map(p => p[0])) }; };
    return {
        a: { x: a.x, y: a.y, s: a.s, state: a.state, phase: a.runPhase, stamina: a.stamina, facing: a.facing },
        d: { x: d.x, y: d.y, s: d.s, state: d.state, phase: d.runPhase, stamina: d.stamina, facing: d.facing, bend: d.pose.bend, crouch: d.pose.crouch, depth: bodyDepth(d), box: bb(d) },
        ep: ep ? { id: ep.id, ms: ep.ms, left: ep.left, extended: ep.extended, grip: ep.gripMiss, x: ep.x, dir: ep.dir } : null,
        aep: aep ? { id: aep.id } : null,
        nearRope: sc.nearRopeBands[0].depth, side: sc.sideRopeBands.map(b => b.depth),
        scr: { x: box.x + (d.x - cam.worldView.x) * cam.zoom * k, y: box.y + (d.y - cam.worldView.y) * cam.zoom * k, k: cam.zoom * k },
        events: sc.matchEvents.slice(-6).map(e => e.type + (e.move ? ':' + e.move : '')),
        moveSets: [a.moveSet.includes('cornerCharge'), d.moveSet.includes('cornerCharge')],
    };
};
const SET_STAMINA = (s) => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w2.stamina = s; };
const FORCE_LEFT = (t) => { const sc = window.__WFM_GAME.scene.scenes[0]; if (sc.w2._cornerEp) sc.w2._cornerEp.left = t; };

const runCase = async (h, { cornerKey, dirKey, vert, scenario, stamina = 100, shots }) => {
    const facing = dirKey === 'right' ? 1 : -1;
    await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    await h.page.evaluate(SET_STAMINA, stamina);
    const rows = [];
    let n = 0, clip = null, arrived = -1, pressed = -1, pressed2 = -1, endI = -1, aSeen = -1;
    const frames = 900;
    for (let i = 0; i < frames; i++) {
        let press = [], hold = [];
        if (i === 48) { press = ['action']; hold = [dirKey, vert]; }
        let pressA = press;
        const last = rows.at(-1);
        if (scenario === 'full' && arrived >= 0) {
            if (pressed < 0 && i - arrived >= 15) { pressed = i; pressA = ['run']; }
            if (pressed >= 0 && pressed2 < 0 && rows.some(r => r.hit)) {
                // he is struck; the attacker walks away to charging distance, then charges again as the daze runs out
                const far = Math.abs(last.a.x - last.d.x) > 260;
                if (!far) hold = [last.a.x > last.d.x ? 'right' : 'left'];
                else if (last.ep && last.ep.left <= 0.3 && last.a.state === 'standing') { pressed2 = i; pressA = ['run']; }
            }
        }
        if (arrived >= 0 && pressed < 0 && scenario !== 'daze' && scenario !== 'full') {
            // hit: charge at once, once the load has settled (15 frames in); miss: charge with 0.25 s of daze left
            if (scenario === 'hit' && i - arrived >= 15) { pressed = i; pressA = ['run']; }
            if (scenario === 'miss' && last.ep && last.ep.left <= 0.25) { pressed = i; pressA = ['run']; }
        }
        const row = await h.page.evaluate(STEP, { press: { a: pressA }, hold: { a: hold } });
        const m = await h.page.evaluate(READ);
        const prev = rows.at(-1);
        rows.push({ i, ...m, st: row.d.state, ax: row.a.x, hit: prev ? m.d.stamina < prev.d.stamina - 5 : false });
        if (arrived < 0 && m.d.state === 'cornered') {
            arrived = i;
            if (scenario === 'hit') await h.page.evaluate(FORCE_LEFT, 2.3);
            if (scenario === 'full') await h.page.evaluate(FORCE_LEFT, 4.5);   // a short daze can end before a long run gets there; the real length is reported separately
        }
        if (shots && arrived >= 0 && i >= arrived - 25) {
            if (!clip) {   // fixed for the whole strip, framed on the corner point (not on him: he is still running at the first frame)
                const c = await h.page.evaluate(({ cornerKey, vert }) => {
                    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize;
                    const k = box.width / g.width, y = vert === 'down' ? 439 : 264, t = (445 - y) / (445 - 258), left = cornerKey.startsWith('left');
                    const x = left ? 40 + 170 * t : 920 - 170 * t;
                    return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k, in: left ? 1 : -1, k: cam.zoom * k };
                }, { cornerKey, vert });
                const W = 440, H = 280;
                clip = { x: Math.max(0, Math.min(c.x + c.in * 120 * c.k - W / 2, 1100 - W)), y: Math.max(0, c.y - H * 0.93), width: W, height: H };
            }
            await h.page.screenshot({ path: `${shots}/s${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 72, clip }); n++;
        }
        if (endI < 0 && arrived >= 0 && i > arrived && m.d.state === 'standing') endI = i;
        if (aSeen < 0 && m.aep) aSeen = i;
        const done = endI >= 0 && i > endI + 90 && (scenario === 'daze' || pressed >= 0) && ((scenario !== 'miss' && scenario !== 'full') || (aSeen >= 0 && i > aSeen + 60));
        if (done) break;
    }
    return { rows, arrived, pressed, pressed2, n };
};

const sum = (rows, arrived, pressed, scenario, cornerKey) => {
    const r0 = rows[arrived], dir = r0.ep.dir, s = r0.d.s;
    const rope = r0.ep.x;                        // the corner point (x where he arrived)
    const past = Math.max(...rows.filter(r => r.d.state === 'cornered').map(r => (r.d.x - rope) * dir));
    const endI = rows.findIndex((r, k) => k > arrived && r.d.state === 'standing');
    const cornered = rows.slice(arrived, endI < 0 ? rows.length : endI);
    const dazeMs = endI < 0 ? null : Math.round((endI - arrived) * 1000 / 60);
    const out = { cornerKey, scenario, arrivedFrame: arrived, dazeMs, depthPx: +past.toFixed(1), depthOverS: +(past / s).toFixed(2), facing: r0.d.facing, scale: +s.toFixed(3) };
    // draw order: his body depth against the near ropes, the side bands within reach of him, and the near post (25.7)
    const dd = r0.d.depth;
    out.bodyDepth = +dd.toFixed(3); out.nearRopeDepth = r0.nearRope; out.nearPostDepth = 25.7;
    const t = (445 - r0.d.y) / (445 - 258), bands = r0.side.map((b, k) => ({ k, b, tMid: (k + 0.5) / r0.side.length })).filter(b => Math.abs(b.tMid - t) < 0.2);
    out.sideBandsInFront = bands.filter(b => b.b >= dd).length; out.sideBandsConsidered = bands.length;
    const near = cornerKey.includes('near');
    out.drawsBehindNearPost = near ? dd < 25.7 : null; out.drawsBehindNearRope = near ? dd < r0.nearRope : null;
    const grips = cornered.filter(r => r.ep?.grip && r.ep.ms > 200).map(r => r.ep.grip).filter(g => g.every(v => v != null));
    if (grips.length) { const all = grips.flat(); out.handMissPx = { min: +Math.min(...all).toFixed(1), max: +Math.max(...all).toFixed(1), mean: +(all.reduce((x, y) => x + y, 0) / all.length).toFixed(1) }; }
    if (endI > 0) { out.stepFromLoadedPx = +Math.abs(rows[Math.min(rows.length - 1, endI + 30)].d.x - rows[endI].d.x).toFixed(1); out.stepFromLoadedOverS = +(out.stepFromLoadedPx / s).toFixed(1); }
    if (scenario === 'daze') { out.stayed = cornered.every(r => r.d.state === 'cornered'); out.stepForwardPx = endI < 0 ? null : +(Math.abs(rows[Math.min(rows.length - 1, endI + 30)].d.x - rope) / s).toFixed(1); }
    if (pressed >= 0) {
        out.pressedFrame = pressed;
        const arr = rows.findIndex((r, k) => k > pressed && r.a.phase !== 'charge' && rows[k - 1].a.phase === 'charge');
        out.chargeStartX = +rows[pressed].a.x.toFixed(1);
        out.startDistance = +Math.abs(rows[pressed].a.x - rows[pressed].d.x).toFixed(1);
        if (arr > 0) {
            out.chargeMs = Math.round((arr - pressed) * 1000 / 60);
            out.arrivalGap = +Math.abs(rows[arr].a.x - rows[arr].d.x).toFixed(1); out.arrivalGapOverS = +(out.arrivalGap / rows[arr].a.s).toFixed(1);
            out.arrivalDepthDiff = +Math.abs(rows[arr].a.y - rows[arr].d.y).toFixed(1);
            out.victimStillCornered = rows[arr].d.state === 'cornered' || rows[arr].d.state === 'selling';
            const hitI = rows.findIndex((r, k) => k >= arr && k > 0 && r.d.stamina < rows[k - 1].d.stamina - 5);
            if (hitI > 0) {
                out.hitFrame = hitI; out.damage = +(rows[hitI - 1].d.stamina - rows[hitI].d.stamina).toFixed(1);
                out.gapAtImpact = +Math.abs(rows[hitI].a.x - rows[hitI].d.x).toFixed(1); out.gapAtImpactOverS = +(out.gapAtImpact / rows[hitI].a.s).toFixed(2);
                out.depthDiffAtImpact = +Math.abs(rows[hitI].a.y - rows[hitI].d.y).toFixed(1);
                out.impactMsAfterArrival = Math.round((hitI - arr) * 1000 / 60);
                const leftBefore = rows[hitI - 1].ep?.left, leftAfter = rows[hitI + 1]?.ep?.left;
                out.extensionSeen = leftAfter != null && leftBefore != null ? +(leftAfter - leftBefore + 2 / 60).toFixed(2) : null;
                out.stillDazedAfter = rows.slice(hitI + 2, hitI + 20).every(r => r.d.state === 'cornered' || r.d.state === 'selling');
                out.damageEvents = rows.filter((r, k) => k > 0 && r.d.stamina < rows[k - 1].d.stamina - 5).length;
                out.epIdsAcrossHit = [...new Set(rows.slice(arrived, hitI + 40).map(r => r.ep?.id).filter(Boolean))];
                out.dazeMsAfterHit = out.dazeMs;
            } else { out.hit = false; }
        }
        const am = rows.findIndex(r => r.aep);
        if (am >= 0) { out.attackerCorneredFrame = am; out.attackerDamage = 0; }
        out.defenderDamageTotal = +(rows[0].d.stamina - rows.at(-1).d.stamina).toFixed(1);
    }
    out.epIdsAll = [...new Set(rows.map(r => r.ep?.id).filter(Boolean))];
    out.extensionJumps = rows.filter((r, k) => k > 0 && r.ep && rows[k - 1].ep && r.ep.left - rows[k - 1].ep.left > 0.4).length;
    out.damageEventsAll = rows.filter(r => r.hit).length;
    out.endStates = { d: rows.at(-1).d.state, a: rows.at(-1).a.state, dHasEpisode: !!rows.at(-1).ep, aHasEpisode: !!rows.at(-1).aep };
    return out;
};

const runs = [], films = [];
for (const [pair, att, def] of (process.env.PAIR ? PAIRS.filter(p => p[0] === process.env.PAIR) : PAIRS)) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL);
        console.log(pair, 'move sets', info.moveSets.a.includes('cornerCharge'), info.moveSets.d.includes('cornerCharge'));
        for (const [cornerKey, dirKey, vert] of CORNERS) for (const scenario of SCENARIOS) {
            const id = `${pair}-${cornerKey}-${scenario}`;
            if (process.env.ONLY && !id.includes(process.env.ONLY)) continue;
            const film = FILM && FILMED.has(cornerKey);
            const dir = `${root}/corner-daze-frames/${id}`;
            if (film) mkdirSync(dir, { recursive: true });
            const { rows, arrived, pressed, pressed2, n } = await runCase(h, { cornerKey, dirKey, vert, scenario, shots: film ? dir : null });
            if (arrived < 0) { console.log({ id, error: 'never cornered' }); continue; }
            const rec = { id, pair, ...sum(rows, arrived, pressed, scenario, cornerKey) };
            if (pressed2 >= 0) rec.secondChargeFrame = pressed2;
            if (film) { rec.frames = n; films.push(rec); }
            runs.push(rec);
            console.log(JSON.stringify(rec));
        }
        // daze length per stagger type: receiver's stamina at the whip, near-left corner, no input
        for (const [type, st] of (process.env.ONLY || FULL) ? [] : [['rock', 100], ['stumble', 55], ['reel', 35], ['buckle', 20], ['outOnFeet', 5]]) {
            const { rows, arrived } = await runCase(h, { cornerKey: 'left-near', dirKey: 'left', vert: 'down', scenario: 'daze', stamina: st });
            if (arrived < 0) continue;
            const r = sum(rows, arrived, -1, 'daze', 'left-near');
            runs.push({ id: `${pair}-type-${type}`, pair, type, stamina: st, dazeMs: r.dazeMs, depthPx: r.depthPx });
            console.log(pair, type, st, r.dazeMs);
        }
    } finally { await h.close(); }
}
writeFileSync(`${root}/${FULL ? 'corner-full-results' : process.env.ONLY ? 'corner-daze-only' : 'corner-daze-results'}.json`, JSON.stringify({ runs, films }, null, 2));
