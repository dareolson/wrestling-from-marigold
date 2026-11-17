// PLAN_SCALE T1.2: a paired move's entry, flag off vs ?scale=v1. Real executors, deterministic 1/60 s steps (loop asleep, seeded Math.random, AIs nulled).
// Per move, both facings, Lou/George both ways, the defender starting DY px deeper/shallower than the attacker: the largest one-frame draw-scale change of either man in
// the first WINDOW s, the attacker's palm-to-target grip distance in the window (min over the target's two sides) and the two men's x/y at 0.5 / 1 / 2 s (window..0.7 s must match flag off; later the move-end separation differs by T1.1's x-only push).
//   WFM_URL=http://localhost:5173 node tools/debug/scale_entry_probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const MOVES = [   // [clip, executor, attacker state, defender state, defender lying]
    ['piledriver', '_doPiledriver', 'lockup', 'lockup', null], ['hammerlock', '_doHammerlock', 'lockup', 'lockup', null],
    ['halfBostonCrab', '_doHalfBostonCrab', 'standing', 'down', 'supine'], ['armBarV2', '_doArmBar', 'standing', 'down', 'supine'],
    ['hipTossRunner', '_doRunnerHipToss', 'standing', 'standing', null], ['bodySlam', '_doBodySlam', 'lockup', 'lockup', null], ['uppercut', '_doUppercut', 'standing', 'standing', null],
];
const WINDOW = 0.3, DYS = [0, 25, -25];
const SETUP = ({ move, facing, dy, sep }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234; Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle); w.skeleton.setPartVariants?.({});
    }
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    a.facing = facing; d.facing = -facing; a.y = 380; d.y = 380 + dy; a.x = 520; d.x = 520 + facing * sep * a.s;
    const [, exec, as, ds, lying] = move;
    a.state = as; d.state = ds; if (lying) { d.lying = lying; d.stateTimer = 99; }
    if (as === 'lockup') { a.tweenPose('lockup', 1, 'Linear'); d.tweenPose('lockup', 1, 'Linear'); sc.lockupState = { attacker: a, defender: d, timer: 0 }; }
    if (typeof a[exec] !== 'function') return { error: `no ${exec}` };
    const pre = { a: { x: a.x, y: a.y, s: a.s * a._heightScale }, d: { x: d.x, y: d.y, s: d.s * d._heightScale } };
    a[exec](d);
    return { clip: a._activeMove?.clip?.id ?? null, pre };
};
const STEP = (T) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    game.step(T, 1000 / 60);
    const grips = a._activeMove?.clip?.grips ?? [];
    let grip = null;
    try {
        const ap = a.skeleton.jointAttachmentPoints, dp = d.skeleton.jointAttachmentPoints;
        for (const g of grips) {
            const side = g.arm === 'l' ? a.skeleton.lChannelSide(a.facing) : g.arm === 'r' ? (a.skeleton.lChannelSide(a.facing) === 'near' ? 'far' : 'near') : g.arm;
            const palm = a.skeleton.partAnchorPoint(side + 'Forearm', 'clutch') ?? ap[side + 'Wrist'];
            const to = ['near', 'far'].map(sd => dp[sd + g.to.joint[0].toUpperCase() + g.to.joint.slice(1)]).filter(Boolean);
            const dist = Math.min(...to.map(p => Math.hypot(p.x - palm.x, p.y - palm.y)));
            if (Number.isFinite(dist)) grip = Math.max(grip ?? 0, dist);
        }
    } catch { /* no grip reading this frame */ }
    return { a: { x: a.x, y: a.y, s: a.s * a._heightScale }, d: { x: d.x, y: d.y, s: d.s * d._heightScale }, grip };
};
const out = [];
for (const flag of [0, 1]) {
    process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&light=v1' + (flag ? '&scale=v1' : '');
    for (const [pa, pd, name] of [[LOU, GEORGE, 'lou-george'], [GEORGE, LOU, 'george-lou']]) {
        process.env.WFM_P1 = pa; process.env.WFM_P2 = pd;
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 });
            await page.waitForTimeout(1500);
            await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now; window.__idle = { ...sc.w1.pose }; });
            for (const move of MOVES) for (const facing of [1, -1]) for (const dy of DYS) {
                const info = await page.evaluate(SETUP, { move, facing, dy, sep: 70 });
                const rec = { flag, pair: name, move: move[0], facing, dy, ...info, frames: [] };
                if (!info.error) for (let i = 0; i < 120; i++) { rec.frames.push(await page.evaluate((T) => { window.__T += 1000 / 60; return window.__T; }).then(T => page.evaluate(STEP, T))); }
                out.push(rec);
            }
        } finally { await h.close(); }
    }
}
// summary: flag off vs on per (pair, move, facing, dy)
const key = r => `${r.pair}|${r.move}|${r.facing}|${r.dy}`, offs = new Map(out.filter(r => !r.flag).map(r => [key(r), r]));
const maxPop = (r, n) => { let m = 0; const fr = [r.pre, ...r.frames]; for (let i = 1; i < Math.min(n, fr.length); i++) for (const w of ['a', 'd']) m = Math.max(m, Math.abs(fr[i][w].s / fr[i - 1][w].s - 1)); return +(m * 100).toFixed(2); };   // from the pre-play state, so the staging snap (play() or frame 0) is inside
const maxGrip = (r, n) => { const g = r.frames.slice(0, n).map(f => f.grip).filter(v => v != null); return g.length ? +Math.max(...g).toFixed(1) : null; };
const rows = [];
for (const r of out.filter(r => r.flag)) {
    const o = offs.get(key(r)); if (!o || r.error) { rows.push({ key: key(r), error: r.error ?? 'no flag-off twin' }); continue; }
    const n = Math.round(WINDOW * 60);
    let maxAfter = 0, at = null; for (let i = n; i < Math.min(o.frames.length, r.frames.length, 42); i++) for (const w of ['a', 'd']) { const m = Math.max(Math.abs(o.frames[i][w].x - r.frames[i][w].x), Math.abs(o.frames[i][w].y - r.frames[i][w].y)); if (m > maxAfter) { maxAfter = m; at = `${w}@${(i / 60).toFixed(2)}s`; } }
    rows.push({ key: key(r), clip: r.clip, popOffPct: maxPop(o, n), popOnPct: maxPop(r, n), gripOff: maxGrip(o, n), gripOn: maxGrip(r, n), maxDiffWindowTo0_7sPx: +maxAfter.toFixed(2), at });   // past 0.7 s the flag also changes the move-end separation (T1.1), so it is not compared
}
if (process.env.RAW) writeFileSync(process.env.RAW, JSON.stringify(out));
writeFileSync(process.argv[2] ?? 'research/scale-2026-11/s1/entry-probe.json', JSON.stringify({ rows }, null, 1));
console.table(rows);
