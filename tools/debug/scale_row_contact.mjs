// PLAN_SCALE T3.5: does a paired move's contact survive the back row? Per move, row (back 266 / middle 352 / front 438), both facings, Lou/George both ways, flag off | ?scale=v1: the
// real executor at the trigger distance (70 * s apart, same depth), deterministic 1/60 s steps for 10 s. Clips started = 1 per run (the executor played its clip); contact landed = the
// defender's stamina dropped (the move's damage lands on its hit event). Also the frame of first contact, both men's end state, and the attacker-defender gap in draw-scale units at contact.
// A miss is a move that lands less often, later, or ends in a different state at the back row than at the front under the flag. Numbers only: nothing here retunes a move.
//   WFM_URL=http://localhost:5173 node tools/debug/scale_row_contact.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const MOVES = [   // [move, executor, attacker state, defender state, defender lying]
    ['piledriver', '_doPiledriver', 'lockup', 'lockup', null], ['hammerlock', '_doHammerlock', 'lockup', 'lockup', null], ['bodySlam', '_doBodySlam', 'lockup', 'lockup', null],
    ['wristlock', '_doWristlock', 'lockup', 'lockup', null], ['wristlockHammerlock', '_doWristlockHammerlock', 'lockup', 'lockup', null], ['flyingMare', '_doFlyingMare', 'lockup', 'lockup', null],
    ['testOfStrength', '_doTestOfStrength', 'lockup', 'lockup', null], ['backdropSuplex', '_doBackdropSuplex', 'lockup', 'lockup', null],
    ['halfBostonCrab', '_doHalfBostonCrab', 'standing', 'down', 'supine'], ['armBarV2', '_doArmBar', 'standing', 'down', 'supine'], ['bodyScissors', '_doBodyScissors', 'standing', 'down', 'supine'],
    ['indianDeathlock', '_doIndianDeathlock', 'standing', 'down', 'supine'], ['abdominalStretch', '_doAbdominalStretch', 'standing', 'staggered', null],
    ['hipTossRunner', '_doRunnerHipToss', 'standing', 'standing', null], ['uppercut', '_doUppercut', 'standing', 'standing', null],
];
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;   // e.g. ONLY=piledriver,bodySlam
const ROWS = { back: 266, middle: 352, front: 438 }, N = 600;
const RUN = ({ move, row, facing, n }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234; Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null; w._holdEscape = null; w._corner = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle); w.skeleton.setPartVariants?.({});
    }
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    a.facing = facing; d.facing = -facing; a.y = row; d.y = row; a.x = 480; d.x = 480 + facing * 70 * a.s;
    const [, exec, as, ds, lying] = move;
    a.state = as; d.state = ds; if (lying) { d.lying = lying; d.stateTimer = 99; }
    if (as === 'lockup') { a.tweenPose('lockup', 1, 'Linear'); d.tweenPose('lockup', 1, 'Linear'); sc.lockupState = { attacker: a, defender: d, timer: 0 }; }
    if (typeof a[exec] !== 'function') return { error: `no ${exec}` };
    a[exec](d);
    sc.lockupState = null;   // in play the tie-up tick that called the executor has ended the lockup; left set, it breaks the move
    const clip = a._activeMove?.clip?.id ?? null;
    let first = null, gap = null;
    for (let i = 0; i < n; i++) {
        window.__T += 1000 / 60; game.step(window.__T, 1000 / 60);
        if (first == null && d.stamina < 99.9) { first = i; gap = Math.abs(d.x - a.x) / a.drawScale(); }
    }
    return { clip, played: clip != null, landed: first != null, first, gap, drop: +(100 - d.stamina).toFixed(1), aEnd: a.state, dEnd: d.state, aActive: !!a._activeMove };
};
const out = [];
for (const on of [0, 1]) for (const [pa, pd, name] of [[LOU, GEORGE, 'lou-george'], [GEORGE, LOU, 'george-lou']]) {
    process.env.WFM_P1 = pa; process.env.WFM_P2 = pd; process.env.WFM_QS = 'notitle=1&light=v1' + (on ? '&scale=v1' : '');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 }); await page.waitForTimeout(1500);
        await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now; window.__idle = { ...sc.w1.pose }; });
        for (const move of MOVES.filter(m => !ONLY || ONLY.has(m[0]))) for (const [rn, row] of Object.entries(ROWS)) for (const facing of [1, -1]) out.push({ flag: on, pair: name, move: move[0], row: rn, facing, ...(await page.evaluate(RUN, { move, row, facing, n: N })) });
    } finally { await h.close(); }
}
writeFileSync(process.argv[2] ?? 'research/scale-2026-11/gs/row-contact.json', JSON.stringify(out));
const rows = [];
for (const move of MOVES.filter(m => !ONLY || ONLY.has(m[0]))) for (const flag of [0, 1]) {
    const r = { move: move[0], flag };
    for (const rn of Object.keys(ROWS)) {
        const xs = out.filter(o => o.move === move[0] && o.flag === flag && o.row === rn), ok = xs.filter(o => !o.error);
        const firsts = ok.filter(o => o.landed).map(o => o.first).sort((p, q) => p - q);
        r[rn] = ok.length ? `${ok.filter(o => o.landed).length}/${ok.length} @${firsts.length ? (firsts[firsts.length >> 1] / 60).toFixed(2) : '-'}s ${[...new Set(ok.map(o => o.dEnd + '/' + o.aEnd))].join(',')}` : 'ERR ' + xs[0]?.error;
    }
    rows.push(r);
}
console.table(rows);
process.exit(0);
