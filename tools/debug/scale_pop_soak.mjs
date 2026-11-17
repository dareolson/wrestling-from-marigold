// PLAN_SCALE S0 (T0.1): an AI-vs-AI soak that flags one-frame draw-scale pops under ?light=v1 (plus &scale=v1 when SCALE=1).
//   WFM_URL=http://127.0.0.1:5173 PAIR=lou-george SEC=150 [SCALE=1] [BAR=0.02] node tools/debug/scale_pop_soak.mjs [outDir]   (WFM_TS default 1 so a frame is a real frame; PAIR = any two of lou george kowalski guido)
// Deltas are normalised to a 60 fps frame: |Δs/s| * (1/60)/dt, so the bar means the same at any game frame rate (PLAN_SCALE S0 review: bar 2%).
// Draw scale mirrors Wrestler.draw(): perspectiveScale(y) * _heightScale, or the corner matY scale while on the ropes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kowalski: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
const PAIR = process.env.PAIR ?? 'lou-george', SEC = Number(process.env.SEC ?? 150), BAR = Number(process.env.BAR ?? 0.02), SCALE = process.env.SCALE === '1';
const outDir = process.argv[2] ?? 'research/scale-2026-11/s0';
const [a, b] = PAIR.split('-');
process.env.WFM_P1 = RIGS[a]; process.env.WFM_P2 = RIGS[b]; process.env.WFM_TS = process.env.WFM_TS ?? '1';
process.env.WFM_QS = 'notitle=1&light=v1' + (SCALE ? '&scale=v1' : '');
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
            if (ad > BAR) S.flags.push({ t: +S.gsec.toFixed(2), who: id, dPct: +(d * 100).toFixed(2), rawPct: +(raw * 100).toFixed(2), dt: +dt.toFixed(4), stBefore: p.st, stAfter: cur.st, clipBefore: p.clip, clipAfter: cur.clip, dy: +(cur.y - p.y).toFixed(1), y: +cur.y.toFixed(0), ox: +(o.x - w.x).toFixed(1), oy: +(o.y - w.y).toFixed(1), oState: o.state, oLying: o.lying ?? null });
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
        if (f.stBefore === 'down' && f.stAfter === 'down' && Math.abs(f.dy) >= 25) return 'A separation push of stacked down bodies';
        if (f.stBefore !== f.stAfter && f.clipAfter && !f.clipBefore) return 'B paired-move entry snap (clip staging y)';
        if (f.stBefore !== f.stAfter) return 'C other state change with y step';
        if (f.clipBefore && f.clipBefore === f.clipAfter) return 'D clip-authored y motion';
        if (f.stBefore === 'slamming') return 'E slam carry y motion (no clip)';
        if (f.stBefore === 'running') return 'F run line past a body';
        return 'G standing separation / 26-48 band y step';
    };
    for (const f of data.flags) f.cause = cause(f);
    const byCause = {}; for (const f of data.flags) byCause[f.cause] = (byCause[f.cause] ?? 0) + 1;
    const pct = (hh, q) => { let n = 0; const tot = Object.values(hh.bins).reduce((s, v) => s + v, 0); const top = Math.max(...Object.keys(hh.bins).map(Number)); for (let i = 0; i <= top; i++) { n += hh.bins[i] ?? 0; if (n >= q * tot) return +((i + 1) * 0.05).toFixed(2); } return +((top + 1) * 0.05).toFixed(2); };
    const dist = Object.fromEntries(Object.entries(data.hist).map(([k, v]) => [k, { frames: v.n, p50: pct(v, .5), p99: pct(v, .99), p999: pct(v, .999), max: pct(v, 1) }]));   // |Δscale| in % per 60 fps-equivalent frame, bin upper edge (0.05% bins, uncapped)
    mkdirSync(outDir, { recursive: true });
    const gameSec = +data.gameSec.toFixed(1), out = { pair: PAIR, scale: SCALE, bar: BAR, ts, errors, gameSec, frames: data.frames, fps: +(data.frames / gameSec).toFixed(1), popsPerMin: +(data.flags.length / (gameSec / 60)).toFixed(2), byCause, distPctPerFrame: dist, flags: data.flags };
    writeFileSync(join(outDir, `${PAIR}${SCALE ? '-scale' : ''}.json`), JSON.stringify(out, null, 1));
    console.log(`[pop] ${PAIR}${SCALE ? ' scale=v1' : ''}: ${gameSec} game s, ${data.frames} frames, ${data.flags.length} pops (${out.popsPerMin}/min) ${JSON.stringify(byCause)}, page errors ${errors.length}`);
} finally { await h.close(); }
