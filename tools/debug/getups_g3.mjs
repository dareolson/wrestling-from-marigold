// T4.1 (PLAN_GETUPS Rev 6): the G3 reel. One seeded AI-vs-AI match (Lou `thesz-procreate-v1` = w1, George `george-roster-v1` = w2,
// ?getups=v1), stepped by hand in fixed 1/60 s steps, until each wrestler has had 6 rises, or 180 s of game time, or the match ends.
// Every rise (full and quick) is filmed at 1x from its first frame to standing + .3 s (raw frames in .git/info/exclude) and measured
// from the DRAWN frames. Math.random is seeded before game init (mulberry32); frames that ran before the loop was put to sleep make the
// game state load-time dependent, so a seed is reproducible in kind, not frame for frame (the log of each run is what the page shows).
//
//   WFM_URL=http://localhost:5173 node tools/debug/getups_g3.mjs <outDir> <seed> [--off] [--nofilm]
//   --off = the same seed with ?getups off (counts only, B1a: the sell plans differ on purpose).
// Output: <out>/seed<NN>[-off].json, <out>/frames/seed<NN>/<w1|w2>-r<K>/sNNNN.jpg
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { partSteps } from './rise_handoff_probe.mjs';

const OUT = process.argv[2] ?? 'research/animation/getups-2026-10/g3';
const SEED_N = +(process.argv[3] ?? 1);
const OFF = process.argv.includes('--off'), NOFILM = process.argv.includes('--nofilm') || OFF;
const RIGS = { w1: 'thesz-procreate-v1', w2: 'george-roster-v1' };
const WHO = ['w1', 'w2'];
const TAIL = 18, MAX_STEPS = 16000, PER_WRESTLER = 6, MAX_MATCH_S = 180;
const seed = (0x5eed0000 + SEED_N * 7919) >>> 0;
const r2 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(2));
const maxBy = (a, f) => a.reduce((m, x) => { const v = f(x); return v !== null && v !== undefined && (m === null || v > m.v) ? { v, x } : m; }, null);

const INIT = `(() => { let a = ${seed}; window.__reseed = () => { a = ${seed}; }; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

// in-page: sleep the loop, install the stepper and the sampler
const SETUP = ({ perWrestler, maxMatchS }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    window.__reseed();
    sc.tweens.getDelta = () => 1000 / 60;
    const W = { w1: sc.w1, w2: sc.w2 };
    const names = {};
    for (const who of ['w1', 'w2']) {
        const sk = W[who].skeleton, n = sk._parts.map(() => null);
        for (const [k, v] of Object.entries(sk)) { const i = sk._parts.indexOf(v); if (i >= 0 && !n[i]) n[i] = k; }
        names[who] = n.map((x, i) => x ?? `part${i}`);
    }
    const sampleOf = (who) => {
        const w = W[who], sk = w.skeleton;
        const parts = sk._parts.map((img, i) => {
            const m = img.getWorldTransformMatrix();
            const fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
            const c = [[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([x, y]) => [+(m.a * x + m.c * y + m.tx).toFixed(2), +(m.b * x + m.d * y + m.ty).toFixed(2)]);
            return { n: names[who][i], vis: !!img.visible, c };
        });
        const pts = {};
        for (const [k, p] of Object.entries(sk.jointAttachmentPoints ?? {})) if (p) pts[k] = { x: +p.x.toFixed(2), y: +p.y.toFixed(2) };
        const held = !!(w._riseStall && w._getUp && Math.abs(w.riseT - w._getUp.stall) < 1e-9);
        return { now: sc.time.now, state: w.state, facing: w.facing, riseT: +(w.riseT ?? 0).toFixed(5), fp: +(w.fallProgress ?? 0).toFixed(4), x: w.x, y: w.y, held, parts, pts };
    };
    const cause = () => { const ev = sc.matchEvents ?? []; for (let i = ev.length - 1; i >= 0; i--) if (ev[i].move) return { type: ev[i].type, move: ev[i].move, attacker: ev[i].attacker ?? null, ageS: Math.round((sc._matchTime - ev[i].t) * 10) / 10 }; return null; };
    const g = (window.__g3 = { n: 0, T: 100000, prev: { w1: null, w2: null }, starts: { w1: 0, w2: 0 }, lastDown: {}, sampleOf, done: false });
    g.step = () => {
        g.T += 1000 / 60; game.step(g.T, 1000 / 60); g.n++;
        const events = [], pre = {};
        for (const who of ['w1', 'w2']) {
            const w = W[who], st = w.state, p = g.prev[who];
            if ((st === 'gettingUp' && p !== 'gettingUp') || (st === 'risingUp' && p !== 'risingUp')) {
                g.starts[who]++;
                const log = w._getUpLog?.at(-1) ?? null;
                events.push({ type: 'start', who, n: g.n, quick: st === 'risingUp', lying: w.lying, stamina: Math.round(w.stamina * 10) / 10, id: w._getUp?.id ?? null,
                    log, stall: w._riseStall ? Math.round(w._riseStall.ms) : 0, cause: cause(), fallVariant: w._fallVariant ?? null, matchT: Math.round(sc._matchTime * 10) / 10 });
                pre[who] = g.lastDown[who] ?? null;
            }
            if (((p === 'gettingUp' && st !== 'gettingUp') || (p === 'risingUp' && st !== 'risingUp'))) events.push({ type: 'end', who, n: g.n, to: st });
            if (st === 'down') g.lastDown[who] = sampleOf(who);
            g.prev[who] = st;
        }
        const finished = sc.matchOver || sc._matchTime >= maxMatchS || (g.starts.w1 >= perWrestler && g.starts.w2 >= perWrestler);
        return { n: g.n, events, pre, finished, matchT: Math.round(sc._matchTime * 10) / 10, over: !!sc.matchOver, stamina: [Math.round(W.w1.stamina), Math.round(W.w2.stamina)] };
    };
    return true;
};
const SAMPLE = (who) => window.__g3.sampleOf(who);

process.env.WFM_P1 = RIGS.w1; process.env.WFM_P2 = RIGS.w2;
process.env.WFM_QS = OFF ? 'notitle=1' : 'notitle=1&getups=v1';
mkdirSync(OUT, { recursive: true });
const initPath = join(OUT, `seed-init-${SEED_N}.js`);
writeFileSync(initPath, INIT);
process.env.WFM_INIT_SCRIPT = initPath;

const h = await launch();
const rises = [], open = [];
let lastStep = null;
try {
    const page = h.page;
    for (let i = 0; i < 60 && !(await h.snap())?.w1; i++) await page.waitForTimeout(500);
    await page.evaluate(SETUP, { perWrestler: PER_WRESTLER, maxMatchS: MAX_MATCH_S });
    // hand both sides to the AI (Arena keys 1 and 2); the keyboard manager reads its queue on the next steps
    for (const key of ['Digit1', 'Digit2']) { await page.keyboard.press(key); for (let k = 0; k < 4; k++) await page.evaluate(() => window.__g3.step()); }
    const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
    const clipFor = (s) => ({ width: 340, height: 330, x: Math.max(0, Math.min(1100 - 340, Math.round(box.x + s.x * box.w / box.gw - 170))), y: Math.max(0, Math.min(700 - 330, Math.round(box.y + (s.y + 30) * box.h / box.gh - 330))) });
    const idx = { w1: 0, w2: 0 };
    const frameOf = async (win, s) => {
        win.frames.push(s);
        if (!NOFILM) await page.screenshot({ path: join(win.dir, `s${String(win.frames.length - 1).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 80, clip: clipFor(s) });
    };
    for (let k = 0; k < MAX_STEPS; k++) {
        const r = await page.evaluate(() => window.__g3.step());
        lastStep = r;
        for (const ev of r.events) {
            if (ev.type === 'start') {
                const k2 = ++idx[ev.who];
                const dir = join(OUT, 'frames', `seed${String(SEED_N).padStart(2, '0')}${OFF ? '-off' : ''}`, `${ev.who}-r${String(k2).padStart(2, '0')}`);
                if (!NOFILM) { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
                const win = { ...ev, rig: RIGS[ev.who], seed: SEED_N, k: k2, dir, frames: [], pre: OFF ? null : r.pre[ev.who], endN: null, endTo: null, closeAt: null };
                rises.push(win); open.push(win);
            } else {
                const win = open.find(q => q.who === ev.who && q.endN === null);
                if (win) { win.endN = ev.n; win.endTo = ev.to; win.closeAt = ev.n + TAIL; }
            }
        }
        if (!OFF) for (const win of [...open]) {
            await frameOf(win, await page.evaluate(SAMPLE, win.who));
            if (win.closeAt !== null && r.n >= win.closeAt) open.splice(open.indexOf(win), 1);
        }
        if (r.finished && open.length === 0) break;
        if (r.finished && k > 0 && open.every(q => q.closeAt === null && r.n - q.n > 700)) break;
    }
} finally { await h.close(); }

// ── measurements from the drawn frames ───────────────────────────────────────────────────────────────────────
const step = (a, b, mx = null) => { const s = partSteps(a, b, mx); const m = maxBy(Object.entries(s), ([, v]) => v); return m ? { v: r2(m.v), part: m.x[0] } : null; };
const out = rises.map((win) => {
    const f = win.frames, row = { seed: win.seed, who: win.who, rig: win.rig, k: win.k, quick: win.quick, lying: win.lying, stamina: win.stamina, id: win.id, log: win.log,
        stallMs: win.stall, cause: win.cause, fallVariant: win.fallVariant, matchT: win.matchT, startN: win.n, endN: win.endN, endTo: win.endTo, frames: f.length,
        dir: win.dir.replace(`${OUT}/`, ''), interrupted: false };
    if (!f.length || OFF) return row;
    const isRise = (x) => x.state === 'gettingUp' || x.state === 'risingUp';
    const rise = f.filter(isRise), lastRise = f.map(isRise).lastIndexOf(true);
    // finished = the rise ran to its end (riseT 1 / fallProgress 0) before the state changed; the AI may act on the very next step
    // (evading, lockup, ...), so the state after the rise is not by itself an interruption
    row.interrupted = f[lastRise] ? (win.quick ? f[lastRise].fp > 0.05 : f[lastRise].riseT < 0.98) : false;
    row.lastRiseT = f[lastRise] ? (win.quick ? f[lastRise].fp : f[lastRise].riseT) : null;
    const iStand = row.interrupted || lastRise < 0 || lastRise + 1 >= f.length ? -1 : lastRise + 1;
    row.facing = f[0].facing; row.facingEnd = f[Math.max(0, lastRise)].facing; row.otherSide = null;
    row.riseMs = rise.length ? r2((rise.length) * 1000 / 60) : null;
    if (win.pre && f[0]) row.startStep = { ...step(win.pre, f[0]), a: 'pre-rise (last down frame)', b: 'frame 0' };
    if (iStand > 0) row.standStep = { ...step(f[iStand - 1], f[iStand]), i: iStand };
    const heldIdx = f.map((x, i) => (x.held ? i : -1)).filter(i => i >= 0);
    if (heldIdx.length) {
        const a = heldIdx[0], b = heldIdx.at(-1);
        const win2 = (lo, hi) => {
            let best = null;
            for (let i = Math.max(1, lo); i <= Math.min(f.length - 1, hi); i++) {
                const turned = f[i].facing !== f[i - 1].facing && f[i].state === 'gettingUp';
                const mx = turned ? (f[i - 1].pts.nearKnee?.x ?? f[i - 1].x) : null;
                const s = step(f[i - 1], f[i], mx);
                if (s && (!best || s.v > best.v)) best = { ...s, i, turned };
            }
            return best;
        };
        row.stall = { frames: heldIdx.length, ms: r2(heldIdx.length * 1000 / 60), enter: win2(a - 3, a + 12), leave: win2(b - 12, b + 3) };
    }
    return row;
});
const counts = { w1: 0, w2: 0 };
for (const r of rises) counts[r.who]++;
const res = { seed: SEED_N, seedValue: seed, off: OFF, steps: lastStep?.n, matchT: lastStep?.matchT, matchOver: lastStep?.over, starts: counts, rises: out };
writeFileSync(join(OUT, `seed${String(SEED_N).padStart(2, '0')}${OFF ? '-off' : ''}.json`), JSON.stringify(res, null, 1));
console.log(`[g3] seed ${SEED_N}${OFF ? ' off' : ''}: ${lastStep?.n} steps, match ${lastStep?.matchT}s${lastStep?.over ? ' (over)' : ''}, rises w1 ${counts.w1} w2 ${counts.w2}: ${out.map(r => `${r.who}:${r.quick ? 'quick' : (r.id ?? 'legacy')}`).join(' ')}`);
process.exit(0);
