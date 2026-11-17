// PLAN_SCALE S0 (T0.1): an AI-vs-AI soak that flags one-frame draw-scale pops under ?light=v1 (plus &scale=v1 when SCALE=1).
//   WFM_URL=http://127.0.0.1:5173 PAIR=lou-george SEC=150 [SCALE=1] [BAR=0.015] node tools/debug/scale_pop_soak.mjs [outDir]   (WFM_TS default 1 so a frame is a real frame; PAIR = any two of lou george kowalski guido)
// Draw scale mirrors Wrestler.draw(): perspectiveScale(y) * _heightScale, or the corner matY scale while on the ropes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kowalski: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
const PAIR = process.env.PAIR ?? 'lou-george', SEC = Number(process.env.SEC ?? 150), BAR = Number(process.env.BAR ?? 0.015), SCALE = process.env.SCALE === '1';
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
        if (!onRopes) return w.s * w._heightScale;
        const y = w.y; w.y = w._corner.matY; const s = w.s * w._heightScale; w.y = y; return s;
    };
    sc.events.on('postupdate', (time, delta) => {
        const dt = delta / 1000 * sc.timeScale; S.gsec += dt; S.frames++;
        for (const [id, w, o] of [['p1', sc.w1, sc.w2], ['p2', sc.w2, sc.w1]]) {
            const cur = { s: drawScale(w), y: w.y, st: w.state, clip: w._activeMove?.clip?.id ?? null };
            const p = S.prev[id]; S.prev[id] = cur;
            if (!p) continue;
            const d = (cur.s - p.s) / p.s, ad = Math.abs(d);
            const key = p.st === cur.st ? cur.st : 'transition';
            const h = S.hist[key] ??= { n: 0, bins: {} };
            h.n++; const bin = Math.min(Math.floor(ad / 0.0005), 100); h.bins[bin] = (h.bins[bin] ?? 0) + 1;
            if (ad > BAR) S.flags.push({ t: +S.gsec.toFixed(2), who: id, dPct: +(d * 100).toFixed(2), dt: +dt.toFixed(4), stBefore: p.st, stAfter: cur.st, clipBefore: p.clip, clipAfter: cur.clip, dy: +(cur.y - p.y).toFixed(1), y: +cur.y.toFixed(0), ox: +(o.x - w.x).toFixed(1), oy: +(o.y - w.y).toFixed(1), oState: o.state, oLying: o.lying ?? null });
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
        if (f.stBefore !== f.stAfter || f.clipBefore !== f.clipAfter) return Math.abs(f.dy) >= 3 ? 'state/clip change with y step' : 'state/clip change (height or scale only)';
        if (Math.abs(f.dy) < 0.5) return 'scale change without y (heightScale/corner)';
        if (Math.abs(f.ox) < 90 && Math.abs(f.oy) < 60) return 'near the other body (separation/cover)';
        return 'y step, other far';
    };
    for (const f of data.flags) f.cause = cause(f);
    const byCause = {}; for (const f of data.flags) byCause[f.cause] = (byCause[f.cause] ?? 0) + 1;
    const pct = (hh, q) => { let n = 0; const tot = Object.values(hh.bins).reduce((s, v) => s + v, 0); for (let i = 0; i <= 100; i++) { n += hh.bins[i] ?? 0; if (n >= q * tot) return +((i + 1) * 0.05).toFixed(2); } return 5; };
    const dist = Object.fromEntries(Object.entries(data.hist).map(([k, v]) => [k, { frames: v.n, p50: pct(v, .5), p99: pct(v, .99), p999: pct(v, .999), max: pct(v, 1) }]));   // |Δscale| in % per frame, bin upper edge (0.05% bins)
    mkdirSync(outDir, { recursive: true });
    const gameSec = +data.gameSec.toFixed(1), out = { pair: PAIR, scale: SCALE, bar: BAR, ts, errors, gameSec, frames: data.frames, popsPerMin: +(data.flags.length / (gameSec / 60)).toFixed(2), byCause, distPctPerFrame: dist, flags: data.flags };
    writeFileSync(join(outDir, `${PAIR}${SCALE ? '-scale' : ''}.json`), JSON.stringify(out, null, 1));
    console.log(`[pop] ${PAIR}${SCALE ? ' scale=v1' : ''}: ${gameSec} game s, ${data.frames} frames, ${data.flags.length} pops (${out.popsPerMin}/min) ${JSON.stringify(byCause)}, page errors ${errors.length}`);
} finally { await h.close(); }
