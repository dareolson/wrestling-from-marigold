// PLAN_LIGHT_MOVES Stage 12: each of the ten mat / lockup moves through its real executor, every rig pairing (ALL=1) or Lou<->George, both facings, stepped at 60 fps with the loop asleep.
// Per run: did the executor fire, hits (drain events) and the stamina taken, the largest joint step mid-move and at the start / end seams (px at s = 1 per frame), the closest the two bodies get (hips, px),
// where both end (state, lying, x past the ring clamp), and that nothing is left stuck 3 s after the clip. Optional SHOTS=<dir> takes stills of the first pairing, facing right, at eight times in the move.
//   WFM_URL=http://localhost:5231 node tools/debug/g12_play.mjs [move ...]   (ALL=1, JSON=<dir for <move>.json>, SHOTS=<dir>)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { RIGS, MOVES, BASE_MOVES, SETUP } from './g12_lib.mjs';
const URL = process.env.WFM_URL ?? 'http://localhost:5231';
const only = process.argv.slice(2), moves = (process.env.BASE ? BASE_MOVES : MOVES).filter(m => !only.length || only.includes(m[0]));
const pairs = [];
if (process.env.ALL) { for (const a of RIGS) for (const d of RIGS) pairs.push([a, d]); } else pairs.push([RIGS[0], RIGS[1]], [RIGS[1], RIGS[0]]);

// in-page: run to the end of the move and a little after, measuring. `shots` = frame numbers to stop at (the caller screenshots between).
const RUN = ({ exec, facing, kind, id }) => {
    const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
    g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60;
    let T = sc.time.now; window.__step = () => { T += 1000 / 60; g.step(T, 1000 / 60); };
    for (let i = 0; i < 2; i++) window.__step();
    let drained = 0, hits = 0;
    const orig = D._hurt.bind(D); D._hurt = (...a) => { const b = D.stamina; hits++; const r = orig(...a); drained += b - D.stamina; return r; };
    const jointNames = ['farHip','farKnee','farAnkle','nearHip','nearKnee','nearAnkle','farShoulder','farElbow','farWrist','nearShoulder','nearElbow','nearWrist','neck'];
    const joints = w => jointNames.map(name => { const p=w.skeleton.jointAttachmentPoints[name]; return [p?.x ?? NaN,p?.y ?? NaN]; });
    const step = (a, b, s) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]) / s); return m; };
    const fired = A[exec](D);
    const out = { fired: fired !== false, hits: 0, drain: 0, clip: null, dur: 0, frames: 0, minGap: 1e9, stepMid: { a: 0, d: 0 }, stepStart: 0, stepEnd: 0, nan: false };
    let prevA = null, prevD = null, clipEnd = null, f = 0, ended = false, bad = false;
    const rows = [];
    for (f = 1; f <= 60 * 10; f++) {
        if (out.clip === null && A._activeMove) { out.clip = A._activeMove.clip.id; out.dur = A._activeMove.clip.duration; }
        window.__step();
        const ja = joints(A), jd = joints(D);
        if ([...ja, ...jd].some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1])) || !Number.isFinite(A.x) || !Number.isFinite(D.x)) { out.nan = true; bad = true; }
        const sa = prevA ? step(ja, prevA, A.s) : 0, sd = prevD ? step(jd, prevD, D.s) : 0;
        rows.push({ f, sa, sd });
        prevA = ja; prevD = jd;
        out.minGap = Math.min(out.minGap, Math.abs(A.x - D.x));
        if (!A._activeMove && !D._activeMove && !ended && f > 3) { ended = true; clipEnd = f; }
        if (ended && f >= clipEnd + 180) break;
    }
    out.frames = f; out.clipEnd = clipEnd;
    const body = rows.filter(r => r.f > 3 && r.f < (clipEnd ?? 1e9) - 3);
    out.stepMid = { a: +Math.max(0, ...body.map(r => r.sa)).toFixed(1), d: +Math.max(0, ...body.map(r => r.sd)).toFixed(1) };
    out.stepStart = +Math.max(0, ...rows.filter(r => r.f <= 3).map(r => Math.max(r.sa, r.sd))).toFixed(1);
    out.stepEnd = +Math.max(0, ...rows.filter(r => clipEnd && r.f >= clipEnd - 3 && r.f <= clipEnd + 3).map(r => Math.max(r.sa, r.sd))).toFixed(1);
    out.hits = hits; out.drain = +drained.toFixed(1);
    D._hurt = orig;
    const clampMoved = w => { const x0 = w.x; w._clamp(); const m = Math.abs(w.x - x0); w.x = x0; return +m.toFixed(1); };
    out.end = { a: A.state, aLying: A.lying, d: D.state, dLying: D.lying, ax: Math.round(A.x), dx: Math.round(D.x), aClamp: clampMoved(A), dClamp: clampMoved(D), gap: Math.round(Math.abs(A.x - D.x)) };
    out.stuck = !['standing', 'down', 'staggered', 'possum', 'gettingUp', 'running', 'selling', 'falling'].includes(A.state) || (!['standing', 'down', 'staggered', 'possum', 'gettingUp', 'running', 'selling', 'falling', 'evading'].includes(D.state));
    out.bad = bad;
    return out;
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const summary = [];
for (const [id, exec, kind] of moves) {
    const rows = [];
    for (const [a, d] of pairs) {
        await page.goto(`${URL}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
        await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
        await page.waitForTimeout(1200);
        for (const facing of [1, -1]) {
            await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, kind })})`);
            const shot = process.env.SHOTS && a === RIGS[0] && d === RIGS[1] && facing === 1;
            let r;
            if (shot) {
                // frame-by-frame from node: stills at eight fractions of the clip
                await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; let T = sc.time.now; window.__step = () => { T += 1000 / 60; g.step(T, 1000 / 60); }; const cam = sc.cameras.main; cam.stopFollow?.(); cam.removeBounds?.(); cam.setZoom(1.3); window.__sc = sc; window.__step(); window.__step(); });
                const fired = await page.evaluate(({ exec }) => { const sc = window.__sc, A = sc.w1, D = sc.w2; const f = A[exec](D); sc.cameras.main.centerOn((A.x + D.x) / 2, 320); window.__dur = A._activeMove?.clip.duration ?? 1; return f; }, { exec });
                const dur = await page.evaluate(() => window.__dur);
                mkdirSync(process.env.SHOTS, { recursive: true });
                let at = 0;
                for (let k = 0; k < 8; k++) {
                    const want = Math.round((dur * (k + 0.5) / 8) * 60);
                    await page.evaluate(n => { for (let i = 0; i < n; i++) window.__step(); window.__sc.cameras.main.centerOn((window.__sc.w1.x + window.__sc.w2.x) / 2, 320); window.__step(); }, want - at);
                    at = want + 1;
                    await page.screenshot({ path: `${process.env.SHOTS}/${id}-${k + 1}.png`, clip: { x: 100, y: 100, width: 800, height: 460 } });
                }
                // then let it finish and measure as a second run is not needed: report as shots only
                r = { shots: true, fired: fired !== false };
            } else {
                r = await page.evaluate(`(${RUN})(${JSON.stringify({ exec, facing, kind, id })})`);
            }
            rows.push({ attacker: a.split('-')[0], defender: d.split('-')[0], facing: facing > 0 ? 'R' : 'L', ...r });
        }
    }
    const ok = rows.filter(r => !r.shots);
    const line = {
        id, runs: ok.length, fired: ok.filter(r => r.fired).length, nan: ok.filter(r => r.nan).length, stuck: ok.filter(r => r.stuck).length,
        clip: ok[0]?.dur, hits: [...new Set(ok.map(r => r.hits))].join('/'), drain: [...new Set(ok.map(r => r.drain))].join('/'),
        stepMidMax: Math.max(0, ...ok.map(r => Math.max(r.stepMid?.a ?? 0, r.stepMid?.d ?? 0))), seamStart: Math.max(0, ...ok.map(r => r.stepStart ?? 0)), seamEnd: Math.max(0, ...ok.map(r => r.stepEnd ?? 0)),
        minGapMin: Math.min(...ok.map(r => r.minGap ?? 1e9)).toFixed(0), clampMax: Math.max(0, ...ok.map(r => Math.max(r.end?.aClamp ?? 0, r.end?.dClamp ?? 0))),
        ends: [...new Set(ok.map(r => `${r.end?.a}/${r.end?.d}${r.end?.dLying ? ':' + r.end.dLying : ''}`))].join(' '),
    };
    summary.push(line);
    console.log(JSON.stringify(line));
    if (process.env.JSON) { mkdirSync(process.env.JSON, { recursive: true }); writeFileSync(`${process.env.JSON}/${id}.json`, JSON.stringify(rows, null, 1)); }
}
console.log('page errors', errors.length, errors.slice(0, 5));
await browser.close();
