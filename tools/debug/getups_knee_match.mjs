// Knee audit, real matches (Derek 2026-10-29): getups_knee.mjs forces rises from a stale pose; this runs the G3 seeded AI-vs-AI matches
// (same setup as getups_g3.mjs: Lou thesz-procreate-v1 = w1, George george-roster-v1 = w2, ?getups=v1, 1/60 s steps) and records, for every
// frame a wrestler is 'down' or 'gettingUp', the knee as _applyGrounded is handed it: d = shin channel - thigh channel per leg (table
// convention: < 0 flexed, 0 straight, > 0 hyperextended). One row per down-then-rise; no frames are filmed.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/getups_knee_match.mjs <outJson> <seed> [<seed> ...]    e.g. 4 5 7 9
// A seed repeats the random stream, not the match frame for frame (see getups_g3.mjs), so these are not the same rises as the reel's.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch } from './harness.mjs';

const OUT = process.argv[2];
const SEEDS = process.argv.slice(3).map(Number);
const RIGS = { w1: 'thesz-procreate-v1', w2: 'george-roster-v1' };
const PER_WRESTLER = 6, MAX_MATCH_S = 180, MAX_STEPS = 16000, TOL = 0.02;

const SETUP = ({ perWrestler, maxMatchS, tol }) => {
    const TOL = tol;
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep(); window.__reseed(); sc.tweens.getDelta = () => 1000 / 60;
    const U = { w1: {}, w2: {} };
    const W = { w1: sc.w1, w2: sc.w2 }, R = { w1: { cur: null, rises: [], starts: 0, prev: null }, w2: { cur: null, rises: [], starts: 0, prev: null } };
    for (const who of ['w1', 'w2']) {
        const sk = W[who].skeleton, orig = sk._applyGrounded.bind(sk);
        sk._applyGrounded = (x, y, s, facing, g) => { sk.__g = { nt: g.nearThigh, ns: g.nearShin, ft: g.farThigh, fs: g.farShin }; return orig(x, y, s, facing, g); };
    }
    const K = (who, st) => { const g = W[who].skeleton.__g; W[who].skeleton.__g = null; return g ? { near: g.ns - g.nt, far: g.fs - g.ft } : null; };
    const open = (who, w, state) => ({ who, state0: state, id: w._getUp?.id ?? null, lying: w.lying, facing: w.facing, stamina: Math.round(w.stamina), pain: w._pain?.part ?? null,
        fallVariant: w._fallVariant ?? null, matchT: Math.round(sc._matchTime * 10) / 10, down: { frames: 0, over: 0, worst: { near: 0, far: 0 }, at: null }, rise: { frames: 0, over: 0, worst: { near: 0, far: 0 }, at: null, riseT: null } });
    const note = (part, k, w, tag) => {
        part.frames++;
        const n = Math.max(0, k.near), f = Math.max(0, k.far);
        if (n > TOL || f > TOL) part.over++;
        if (n > part.worst.near) part.worst.near = +n.toFixed(3);
        if (f > part.worst.far) part.worst.far = +f.toFixed(3);
        if (Math.max(n, f) >= Math.max(part.worst.near, part.worst.far) && Math.max(n, f) > TOL) part.at = { riseT: +(w.riseT ?? 0).toFixed(3), tag };
    };
    let T = 100000, n = 0;
    window.__km = { R, U, run: (k) => {
        for (let i = 0; i < k; i++) {
            T += 1000 / 60; game.step(T, 1000 / 60); n++;
            for (const who of ['w1', 'w2']) {
                const w = W[who], st = w.state, r = R[who], kn = K(who, st);
                if (st === 'down' && r.prev !== 'down' && r.prev !== 'gettingUp') r.cur = open(who, w, 'down'); // a fresh fall
                if (st === 'gettingUp' && r.prev !== 'gettingUp') { r.starts++; r.cur ??= open(who, w, 'gettingUp'); r.cur.id = w._getUp?.id ?? null; r.cur.lying = w.lying; r.cur.facing = w.facing; r.cur.stamina = Math.round(w.stamina); r.cur.pain = w._pain?.part ?? r.cur.pain; }
                { const js = w.skeleton._jointState; // upright render only: local flex per knee (< 0 = past straight; JOINT_LIMITS.knee.min = -0.10)
                  if (js && st !== 'down' && st !== 'gettingUp') { const m = Math.min(js.lKnee ?? 9, js.rKnee ?? 9), u = (U[who][st] ??= { frames: 0, over: 0, overLimit: 0, minFlex: 9 }); u.frames++; if (m < -TOL) u.over++; if (m < -0.1 - 1e-6) u.overLimit++; if (m < u.minFlex) u.minFlex = +m.toFixed(3); } }
                if (r.cur && kn) { if (st === 'down') note(r.cur.down, kn, w, 'down'); else if (st === 'gettingUp') note(r.cur.rise, kn, w, 'rise'); }
                if (r.cur && r.prev === 'gettingUp' && st !== 'gettingUp') { r.rises.push(r.cur); r.cur = null; }
                if (r.cur && st !== 'down' && st !== 'gettingUp' && r.prev === 'down') { r.cur = null; } // down that ended another way (pinned, quick rise, ...)
                r.prev = st;
            }
            if (sc.matchOver || sc._matchTime >= maxMatchS || (R.w1.starts >= perWrestler && R.w2.starts >= perWrestler)) return { done: true, n, matchT: Math.round(sc._matchTime * 10) / 10 };
        }
        return { done: false, n };
    } };
    return true;
};

mkdirSync(dirname(OUT), { recursive: true });
const all = [], upright = [];
for (const SEED_N of SEEDS) {
    const seed = (0x5eed0000 + SEED_N * 7919) >>> 0;
    const initPath = join(dirname(OUT), `knee-seed-init-${SEED_N}.js`);
    writeFileSync(initPath, `(() => { let a = ${seed}; window.__reseed = () => { a = ${seed}; }; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`);
    process.env.WFM_P1 = RIGS.w1; process.env.WFM_P2 = RIGS.w2; process.env.WFM_QS = 'notitle=1&getups=v1'; process.env.WFM_INIT_SCRIPT = initPath;
    const h = await launch();
    try {
        const page = h.page;
        for (let i = 0; i < 60 && !(await h.snap())?.w1; i++) await page.waitForTimeout(500);
        await page.evaluate(SETUP, { perWrestler: PER_WRESTLER, maxMatchS: MAX_MATCH_S, tol: TOL });
        for (const key of ['Digit1', 'Digit2']) { await page.keyboard.press(key); await page.evaluate(() => window.__km.run(4)); }
        let r = { done: false };
        for (let k = 0; k < MAX_STEPS / 60 && !r.done; k++) r = await page.evaluate(() => window.__km.run(60));
        const R = await page.evaluate(() => JSON.parse(JSON.stringify(window.__km.R)));
        const U = await page.evaluate(() => JSON.parse(JSON.stringify(window.__km.U)));
        for (const who of ['w1', 'w2']) for (const [st, u] of Object.entries(U[who])) upright.push({ seed: SEED_N, who, state: st, ...u });
        for (const who of ['w1', 'w2']) for (const rise of R[who].rises) all.push({ seed: SEED_N, k: all.filter(x => x.seed === SEED_N && x.who === who).length + 1, ...rise });
        console.log(`[knee-match] seed ${SEED_N}: ${r.n} steps, match ${r.matchT}s, rises w1 ${R.w1.rises.length} w2 ${R.w2.rises.length}`);
    } finally { await h.close(); }
}
writeFileSync(OUT, JSON.stringify({ tol: TOL, rises: all, upright }, null, 1));
const byState = {};
for (const u of upright) { const b = (byState[u.state] ??= { frames: 0, over: 0, overLimit: 0, minFlex: 9 }); b.frames += u.frames; b.over += u.over; b.overLimit += u.overLimit; b.minFlex = Math.min(b.minFlex, u.minFlex); }
console.log('upright knee (min local flex; < 0 = past straight, limit -0.10):'); for (const [st, b] of Object.entries(byState)) console.log(`  ${st.padEnd(14)} frames ${String(b.frames).padStart(6)}  past straight ${String(b.over).padStart(5)}  past the -0.10 limit ${String(b.overLimit).padStart(5)}  min ${b.minFlex}`);
const worst = (x) => Math.max(x.down.worst.near, x.down.worst.far, x.rise.worst.near, x.rise.worst.far);
for (const x of all) console.log(`seed ${x.seed} ${x.who === 'w1' ? 'Lou ' : 'George'} #${x.k} ${String(x.id).padEnd(22)} stam ${String(x.stamina).padStart(3)} pain ${String(x.pain).padEnd(5)} | down over ${x.down.over}/${x.down.frames} worst n ${x.down.worst.near} f ${x.down.worst.far} | rise over ${x.rise.over}/${x.rise.frames} worst n ${x.rise.worst.near} f ${x.rise.worst.far}`);
const bad = all.filter(x => worst(x) > TOL);
console.log(`${bad.length} of ${all.length} rises have the knee past straight by > ${TOL} rad; largest ${Math.max(0, ...all.map(worst)).toFixed(3)} rad`);
process.exit(0);
