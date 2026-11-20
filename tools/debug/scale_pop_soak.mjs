// PLAN_SCALE S0 (T0.1): an AI-vs-AI soak that flags one-frame draw-scale pops under ?light=v1 (scale is the default now: SCALE=off adds &scale=off).
//   WFM_URL=http://127.0.0.1:5173 PAIR=lou-george SEC=150 [SCALE=1] [BAR=0.02] node tools/debug/scale_pop_soak.mjs [outDir]   (WFM_TS default 1 so a frame is a real frame; PAIR = any two of lou george kowalski guido)
// Deltas are normalised to a 60 fps frame: |Δs/s| * (1/60)/dt, so the bar means the same at any game frame rate (PLAN_SCALE S0 review: bar 2%).
// Draw scale mirrors Wrestler.draw(): perspectiveScale(y) * _heightScale, or the corner matY scale while on the ropes.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch } from './harness.mjs';
// --check (PLAN_SCALE T3.2): one short soak per pairing with no scale query (the default game) (each in its own process, one at a time so the game runs at 60 fps), exit 1 on any pop over BAR that is not on the named list.
//   WFM_URL=http://127.0.0.1:5173 [CHECK_SEC=60] node tools/debug/scale_pop_soak.mjs --check [outDir=research/scale-2026-11/gs]
// Named list (accepted pops): a ground-attack route's continuous travel (below), the match-reset snap (both men put on their start marks in one frame, intended) and kneeDropV2's clip-authored y, which sits on the 2% bar (T1.3).
const NAMED = [{ name: 'match reset snap (intended)', test: f => f.cause?.startsWith('H ') }, { name: 'kneeDropV2 clip-authored y (on the 2% bar)', test: f => f.clipBefore === 'kneeDropV2' && f.clipAfter === 'kneeDropV2' }];
if (process.argv.includes('--check')) {
    const dir = process.argv.filter(a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1])[0] ?? 'research/scale-2026-11/gs', bad = [], accepted = [];
    for (const pair of ['lou-george', 'lou-kowalski', 'george-guido', 'kowalski-guido']) {
        const r = spawnSync(process.execPath, [process.argv[1], dir], { env: { ...process.env, PAIR: pair, SCALE: undefined, SEC: process.env.CHECK_SEC ?? '60' }, stdio: ['ignore', 'inherit', 'inherit'] });
        if (r.status !== 0) { bad.push({ pair, why: `soak exited ${r.status}` }); continue; }
        const out = JSON.parse(readFileSync(join(dir, `${pair}-scale.json`)));
        if (out.errors.length) bad.push({ pair, why: `${out.errors.length} page errors: ${out.errors[0]}` });
        // a ground attack's route (cause I) is travel by construction: the drawn scale follows the route root along the mat every frame (T1.1), so it is never a step; a
        // route accelerating up-screen runs 2-3.6%/frame for ~8 frames (Opus, T4.1 review: george-guido t 15.37-15.48), and a single frame can start a run.
        // A clip's authored y travel (cause D, same clip throughout) is travel when it is a run of >= 3 consecutive frames under 3% (piledriver, ankleLockV2: the holder ~7 px/frame for 4 frames).
        const clipY = f => f.cause?.startsWith('D ') && f.clipBefore && f.clipBefore === f.clipAfter && Math.abs(f.dPct) < 3;
        const run = f => f.cause?.startsWith('I ') || (clipY(f) && out.flags.filter(g => g.who === f.who && g.clipBefore === f.clipBefore && clipY(g) && Math.abs(g.t - f.t) <= 0.1).length >= 3);
        for (const f of out.flags) { const n = NAMED.find(x => x.test(f)) ?? (run(f) ? { name: 'ground-attack route or clip y travel (continuous)' } : null); if (n) accepted.push({ pair, t: f.t, dPct: f.dPct, named: n.name }); else bad.push({ pair, t: f.t, dPct: f.dPct, cause: f.cause, stBefore: f.stBefore, stAfter: f.stAfter, clipBefore: f.clipBefore, clipAfter: f.clipAfter }); }
    }
    console.log(`[pop-check] accepted (named list): ${accepted.length}`, accepted.length ? JSON.stringify(accepted) : '');
    console.log(`[pop-check] ${bad.length ? 'FAIL' : 'PASS'}: ${bad.length} pops/errors outside the named list`, bad.length ? JSON.stringify(bad, null, 1) : '');
    process.exit(bad.length ? 1 : 0);
}
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kowalski: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
const PAIR = process.env.PAIR ?? 'lou-george', SEC = Number(process.env.SEC ?? 150), BAR = Number(process.env.BAR ?? 0.02), SCALE = process.env.SCALE !== 'off';   // SCALE=off: ?scale=off (the old game); SCALE=1: ?scale=v1; unset: no scale param, the default (on since 2026-11-19)
const outDir = process.argv[2] ?? 'research/scale-2026-11/s0';
const [a, b] = PAIR.split('-');
process.env.WFM_P1 = RIGS[a]; process.env.WFM_P2 = RIGS[b]; process.env.WFM_TS = process.env.WFM_TS ?? '1';
process.env.WFM_QS = 'notitle=1&light=v1' + (process.env.SCALE === '1' ? '&scale=v1' : process.env.SCALE === 'off' ? '&scale=off' : '');
const INSTALL = (BAR) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const n of [1, 2]) if (sc[`w${n}`].input !== sc[`_p${n}AI`]) sc._togglePlayer(n);
    // perspectiveScale() is not on window: recover it from the live getter (w.s === perspectiveScale(w.y)) by probing nothing; use w.s at the frame's y.
    const S = window.__spop = { gsec: 0, flags: [], hist: {}, frames: 0, prev: {} };
    const drawScale = (w) => {
        const onRopes = (w.state === 'climbing' || w.state === 'onTurnbuckle' || (w.state === 'taunting' && w._ropeLevel > 0)) && w._corner;
        // A ground attack (elbow drop, splash) draws the body at ga.root with the scale following it (_drawGroundAttack/_drawSplash), then commits root to x/y: the drawn size is continuous there, so measure it at root.y
        const ga = w._groundAttack;
        if (ga?.root && !ga.committed) { const y = w.y; w.y = ga.root.y; const s = w.s * w._heightScale; w.y = y; return s; }
        if (!onRopes) return w.s * w._heightScale;
        const y = w.y; w.y = w._corner.matY; const s = w.s * w._heightScale; w.y = y; return s;
    };
    sc.events.on('postupdate', (time, delta) => {
        const dt = delta / 1000 * sc.timeScale; S.gsec += dt; S.frames++;
        for (const [id, w, o] of [['p1', sc.w1, sc.w2], ['p2', sc.w2, sc.w1]]) {
            const cur = { s: drawScale(w), y: w.y, st: w.state, clip: w._activeMove?.clip?.id ?? null };
            const p = S.prev[id]; S.prev[id] = cur;
            if (!p) continue;
            const raw = (cur.s - p.s) / p.s, d = dt > 0 ? raw * (1 / 60) / dt : 0, ad = Math.abs(d);
            const key = p.st === cur.st ? cur.st : 'transition';
            const h = S.hist[key] ??= { n: 0, bins: {} };
            h.n++; const bin = Math.floor(ad / 0.0005); h.bins[bin] = (h.bins[bin] ?? 0) + 1;
            if (ad > BAR) S.flags.push({ t: +S.gsec.toFixed(2), who: id, dPct: +(d * 100).toFixed(2), rawPct: +(raw * 100).toFixed(2), dt: +dt.toFixed(4), stBefore: p.st, stAfter: cur.st, clipBefore: p.clip, clipAfter: cur.clip, dy: +(cur.y - p.y).toFixed(1), y: +cur.y.toFixed(0), ox: +(o.x - w.x).toFixed(1), oy: +(o.y - w.y).toFixed(1), oState: o.state, oLying: o.lying ?? null, ga: !!(w._groundAttack?.root && !w._groundAttack.committed) });
        }
    });
    return true;
};
const h = await launch();
const errors = [];
try {
    const page = h.page;
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(INSTALL, BAR);
    const clock = () => page.evaluate(() => window.__spop.gsec), start = await clock(), ts = Number(process.env.WFM_TS), wall0 = Date.now();
    for (;;) { await page.waitForTimeout(2000); if ((await clock()) - start >= SEC || (Date.now() - wall0) / 1000 > SEC / ts * 2 + 60) break; }
    const data = await page.evaluate(() => { const S = window.__spop; return { gameSec: S.gsec, frames: S.frames, flags: S.flags, hist: S.hist }; });
    // Cause tag from what the flag record shows; the raw fields stay so Opus can recheck.
    const cause = f => {
        if (f.ga) return 'I ground-attack route (the drawn scale follows the body along its path)';
        if (f.stBefore === 'down' && f.stAfter === 'down' && Math.abs(f.dy) >= 25) return 'A separation push of stacked down bodies';
        if (f.stBefore !== f.stAfter && f.clipAfter && !f.clipBefore) return 'B paired-move entry snap (clip staging y)';
        if (f.stBefore !== f.stAfter) return 'C other state change with y step';
        if (f.clipBefore && f.clipBefore === f.clipAfter) return 'D clip-authored y motion';
        if (f.stBefore === 'slamming') return 'E slam carry y motion (no clip)';
        if (f.stBefore === 'running') return 'F run line past a body';
        return 'G standing separation / 26-48 band y step';
    };
    // Arena.js:4405: after a match both men are put back at their start marks (x 330/630, y 360) in one frame: both flagged on the same frame, both landing on y 360. Intended.
    const resetFrames = new Set(data.flags.filter(f => f.y === 360 && data.flags.some(g => g !== f && g.t === f.t && g.y === 360)).map(f => f.t));
    for (const f of data.flags) f.cause = resetFrames.has(f.t) && f.y === 360 ? 'H match reset snap (intended)' : cause(f);
    const byCause = {}; for (const f of data.flags) byCause[f.cause] = (byCause[f.cause] ?? 0) + 1;
    const pct = (hh, q) => { let n = 0; const tot = Object.values(hh.bins).reduce((s, v) => s + v, 0); const top = Math.max(...Object.keys(hh.bins).map(Number)); for (let i = 0; i <= top; i++) { n += hh.bins[i] ?? 0; if (n >= q * tot) return +((i + 1) * 0.05).toFixed(2); } return +((top + 1) * 0.05).toFixed(2); };
    const dist = Object.fromEntries(Object.entries(data.hist).map(([k, v]) => [k, { frames: v.n, p50: pct(v, .5), p99: pct(v, .99), p999: pct(v, .999), max: pct(v, 1) }]));   // |Δscale| in % per 60 fps-equivalent frame, bin upper edge (0.05% bins, uncapped)
    mkdirSync(outDir, { recursive: true });
    const gameSec = +data.gameSec.toFixed(1), out = { pair: PAIR, scale: SCALE, bar: BAR, ts, errors, gameSec, frames: data.frames, fps: +(data.frames / gameSec).toFixed(1), popsPerMin: +(data.flags.length / (gameSec / 60)).toFixed(2), byCause, distPctPerFrame: dist, flags: data.flags };
    writeFileSync(join(outDir, `${PAIR}${SCALE ? '-scale' : ''}.json`), JSON.stringify(out, null, 1));
    console.log(`[pop] ${PAIR}${SCALE ? ' scale on' : ' scale=off'}: ${gameSec} game s, ${data.frames} frames, ${data.flags.length} pops (${out.popsPerMin}/min) ${JSON.stringify(byCause)}, page errors ${errors.length}`);
} finally { await h.close(); }
