// PLAN_FALLS T3.4: one AI-vs-AI match at 1/60 s steps (?falls=v1&grapples=v1, the real AIs, Math.random seeded), every fall logged with the rule that picked it.
//   WFM_URL=http://localhost:5173 node tools/debug/falls_g3_match.mjs [outDir=research/animation/falls-2026-11/g3/match] [shots=1]
// Env: PAIR (lou-george), SEED (1), MAX_SEC (game seconds, 90), MIN_FALLS (8; the run ends MIN_FALLS_TAIL_SEC (4) after the last of them), START_STAMINA (100),
//      CAP_STAMINA (none): both men's stamina is held at or under it every frame, a worn-down match on demand (stamina recovers within seconds in play, and
//      the strike knockdown only exists under 35); the page says so when it is set.
// With shots=1 every frame is filmed, then only the windows around the falls are kept (frames/sNNNN.jpg, git-excluded; the disk is small): WIN_BEFORE (1.5 s) before each pick
// and WIN_AFTER (3.5 s) after it, merged where they touch. events.json carries the frame of each fall's pick, down and rise, and the kept windows.
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const [outRoot = 'research/animation/falls-2026-11/g3/match', shots = '1'] = process.argv.slice(2);
const PAIR = process.env.PAIR ?? 'lou-george', SEED = Number(process.env.SEED ?? 1), MAX_SEC = Number(process.env.MAX_SEC ?? 90), MIN_FALLS = Number(process.env.MIN_FALLS ?? 8), TAIL = Number(process.env.MIN_FALLS_TAIL_SEC ?? 4), START = Number(process.env.START_STAMINA ?? 100), CAP = Number(process.env.CAP_STAMINA ?? 0);
const [a, b] = PAIR.split('-');
process.env.WFM_P1 = RIGS[a]; process.env.WFM_P2 = RIGS[b]; process.env.WFM_QS = 'notitle=1&grapples=v1&falls=v1';

const INSTALL = ({ seed, stamina }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    window.__T = sc.time.now;
    let a0 = seed;
    Math.random = () => { a0 = (a0 + 0x6D2B79F5) | 0; let t = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (const n of [1, 2]) if (sc[`w${n}`].input !== sc[`_p${n}AI`]) sc._togglePlayer(n);   // both sides on the real AI
    sc.w1.stamina = sc.w2.stamina = stamina;
    const box = document.querySelector('canvas').getBoundingClientRect(), g = game.scale.gameSize;
    return { box: { x: box.x, y: box.y, w: box.width, h: box.height, gw: g.width, gh: g.height } };
};
const FRAME = (cap) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    if (cap) for (const w of [sc.w1, sc.w2]) w.stamina = Math.min(w.stamina, cap);
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    const falls = sc.matchEvents.filter(e => e.type === 'fall');
    return { falls: falls.length, last: falls.at(-1) ?? null, s1: sc.w1.state, s2: sc.w2.state, x1: Math.round(sc.w1.x), x2: Math.round(sc.w2.x), st1: Math.round(sc.w1.stamina), st2: Math.round(sc.w2.stamina), over: !!sc.matchOver };
};

const h = await launch();
try {
    const page = h.page;
    await page.waitForTimeout(2500);
    const info = await page.evaluate(INSTALL, { seed: SEED, stamina: START });
    const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
    const clip = { x: Math.max(0, Math.round(mX(120))), y: Math.round(mY(110)), width: Math.round(mX(820) - mX(120)), height: Math.round(mY(480) - mY(110)) };
    const dir = join(outRoot, 'frames');
    if (shots === '1') { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
    mkdirSync(outRoot, { recursive: true });
    const events = [], rows = [];
    let seen = 0, lastFallFrame = -1;
    for (let i = 0; i < MAX_SEC * 60; i++) {
        const r = await page.evaluate(FRAME, CAP); rows.push({ s1: r.s1, s2: r.s2, st1: r.st1, st2: r.st2, over: r.over });
        if (shots === '1') await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 50, clip });
        if (r.falls > seen) { seen = r.falls; lastFallFrame = i; events.push({ frame: i, ...r.last }); console.log(`[match] frame ${i} (${(i / 60).toFixed(1)} s): ${r.last.wrestler} ${r.last.move} -> ${r.last.fall}${r.last.tier ? ' [' + r.last.tier + ']' : ''}: ${r.last.reason}`); }
        if (r.over && !rows.at(-1).over) console.log(`[match] a bout ended at frame ${i}; the arena resets it`);
        if (seen >= MIN_FALLS && i - lastFallFrame > TAIL * 60) break;
    }
    // each fall's down and rise frame, read off the receiver's state in rows
    for (const e of events) {
        const k = e.wrestler === 'p1' ? 's1' : 's2';
        let i = e.frame; while (i < rows.length && rows[i][k] !== 'down') i++;
        e.downFrame = i < rows.length ? i : null;
        let j = i; while (j < rows.length && rows[j][k] === 'down') j++;
        e.upFrame = j < rows.length ? j : null;
    }
    const counts = await page.evaluate(() => { const c = {}; for (const e of window.__WFM_GAME.scene.scenes[0].matchEvents) { const k = e.type === 'move' ? `move:${e.move}` : e.type; c[k] = (c[k] ?? 0) + 1; } return c; });
    console.log('[match] events', JSON.stringify(counts));
    const BEFORE = 90, AFTER = 210, windows = [];
    for (const e of events) {
        const w0 = Math.max(0, e.frame - BEFORE), w1 = Math.min(rows.length - 1, e.frame + AFTER), last = windows.at(-1);
        if (last && w0 <= last[1] + 1) last[1] = Math.max(last[1], w1); else windows.push([w0, w1]);
    }
    if (shots === '1') for (let i = 0; i < rows.length; i++) if (!windows.some(([a0, a1]) => i >= a0 && i <= a1)) { const f = join(dir, `s${String(i).padStart(4, '0')}.jpg`); if (existsSync(f)) rmSync(f); }
    writeFileSync(join(outRoot, 'events.json'), JSON.stringify({ pair: PAIR, windows, counts, seed: SEED, startStamina: START, capStamina: CAP || null, frames: rows.length, fps: 60, events, stamina: rows.map(r => [r.st1, r.st2]).filter((_, i) => i % 60 === 0) }, null, 1));
    console.log(`wrote ${events.length} falls over ${rows.length} frames`);
} finally { await h.close(); }
