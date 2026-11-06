// PLAN_FALLS T3.16: one uncapped AI-vs-AI match at 1/60 s steps (?falls=v1&grapples=v1&wear=show, the real AIs, Math.random seeded, nothing capped or placed), filmed with the
// wear bars on (the whole top of the canvas, so the bars are in frame). Every fall pick and every exceptional landing is marked with its reason; only the windows around the
// marks are kept (WIN_BEFORE / WIN_AFTER frames, merged where they touch; older frames are deleted as the run goes, the disk is small). events.json carries the marks, the windows
// and both men's wear and stamina once per second.
//   WFM_URL=http://localhost:5173 [PAIR=lou-george SEED=1 SEC=150] node tools/debug/falls_g3_r3_clip.mjs [outDir=research/animation/falls-2026-11/g3/r3clip]
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const outRoot = process.argv[2] ?? 'research/animation/falls-2026-11/g3/r3clip';
const PAIR = process.env.PAIR ?? 'lou-george', SEED = Number(process.env.SEED ?? 1), SEC = Number(process.env.SEC ?? 150);
const BEFORE = 90, AFTER = 210;
const [a, b] = PAIR.split('-');
process.env.WFM_P1 = RIGS[a]; process.env.WFM_P2 = RIGS[b]; process.env.WFM_QS = 'notitle=1&grapples=v1&falls=v1&wear=show';

const INSTALL = ({ seed }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    window.__T = sc.time.now;
    let a0 = seed;
    Math.random = () => { a0 = (a0 + 0x6D2B79F5) | 0; let t = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (const n of [1, 2]) if (sc[`w${n}`].input !== sc[`_p${n}AI`]) sc._togglePlayer(n);
    window.__exc = [];
    for (const [id, w] of [['p1', sc.w1], ['p2', sc.w2]]) {
        const start = w._startLanding.bind(w);
        w._startLanding = (kind, vy, additive, tier) => { start(kind, vy, additive, tier); if (tier === 'exceptional') window.__exc.push({ who: id, kind, source: w._pain?.source ?? w._fallVariant ?? null, wear: +(w.wear ?? 0).toFixed(1), stamina: +w.stamina.toFixed(1) }); };
    }
    const box = document.querySelector('canvas').getBoundingClientRect(), g = game.scale.gameSize;
    return { box: { x: box.x, y: box.y, w: box.width, h: box.height, gw: g.width, gh: g.height } };
};
const FRAME = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    const falls = sc.matchEvents.filter(e => e.type === 'fall');
    return { falls: falls.length, last: falls.at(-1) ?? null, exc: window.__exc.length, lastExc: window.__exc.at(-1) ?? null, w1: +(sc.w1.wear ?? 0).toFixed(1), w2: +(sc.w2.wear ?? 0).toFixed(1), st1: Math.round(sc.w1.stamina), st2: Math.round(sc.w2.stamina), over: !!sc.matchOver };
};

const h = await launch();
try {
    const page = h.page;
    await page.waitForTimeout(2500);
    const info = await page.evaluate(INSTALL, { seed: SEED });
    const bx = info.box, clip = { x: Math.round(bx.x), y: Math.round(bx.y), width: Math.round(bx.w), height: Math.round(bx.h * 480 / bx.gh) };
    const dir = join(outRoot, 'frames');
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    const name = (i) => join(dir, `s${String(i).padStart(4, '0')}.jpg`);
    const marks = [], trace = [], bouts = [];
    let seenFalls = 0, seenExc = 0, lastMark = -1e9, wasOver = false;
    const N = SEC * 60;
    for (let i = 0; i < N; i++) {
        const r = await page.evaluate(FRAME);
        await page.screenshot({ path: name(i), type: 'jpeg', quality: 50, clip });
        if (i % 60 === 0) trace.push({ t: i / 60, w1: r.w1, w2: r.w2, st1: r.st1, st2: r.st2 });
        if (r.falls > seenFalls) { seenFalls = r.falls; lastMark = i; marks.push({ frame: i, kind: 'fall', who: r.last.wrestler, move: r.last.move, fall: r.last.fall, tier: r.last.tier, wear: r.last.wear, stamina: r.last.stamina, reason: r.last.reason }); console.log(`[clip] ${(i / 60).toFixed(1)} s fall: ${r.last.wrestler} ${r.last.move} -> ${r.last.fall}: ${r.last.reason}`); }
        if (r.exc > seenExc) { seenExc = r.exc; lastMark = i; marks.push({ frame: i, kind: 'exceptional', who: r.lastExc.who, move: r.lastExc.source, fall: r.lastExc.kind, tier: 'exceptional', wear: r.lastExc.wear, stamina: r.lastExc.stamina }); console.log(`[clip] ${(i / 60).toFixed(1)} s exceptional landing: ${r.lastExc.who} ${r.lastExc.source} wear ${r.lastExc.wear}`); }
        if (r.over && !wasOver) bouts.push(i);
        wasOver = r.over;
        // keep a frame only inside a window: the one BEFORE + 1 frames back is deleted unless a mark's window covers it
        const c = i - BEFORE - 1;
        if (c >= 0 && !(c <= lastMark + AFTER)) rmSync(name(c), { force: true });
    }
    const windows = [];
    for (const m of marks) { const w0 = Math.max(0, m.frame - BEFORE), w1 = Math.min(N - 1, m.frame + AFTER), last = windows.at(-1); if (last && w0 <= last[1] + 1) last[1] = Math.max(last[1], w1); else windows.push([w0, w1]); }
    for (const f of readdirSync(dir)) { const i = +f.slice(1, 5); if (!windows.some(([w0, w1]) => i >= w0 && i <= w1)) rmSync(join(dir, f)); }
    writeFileSync(join(outRoot, 'events.json'), JSON.stringify({ pair: PAIR, seed: SEED, sec: SEC, frames: N, fps: 60, marks, windows, bouts, trace }, null, 1));
    console.log(`wrote ${marks.length} marks, ${windows.length} windows, ${readdirSync(dir).length} frames kept`);
} finally { await h.close(); }
