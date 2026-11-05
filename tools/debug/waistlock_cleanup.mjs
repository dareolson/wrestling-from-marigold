// PLAN_GRAPPLES T4b.2b.1: ending the match in the circle, the hold or the let-go leaves no facing lock, no orphanRescue and no stuck state,
// and after the reset crossing the opponent turns each man as normal. T4c.2-T4c.3: the same for the atomic drop's clip (the attacker presses power
// again in the hold; the match ends in its lift and again in its sell) and for the snapmare (the defender reverses; the match ends in the pull and in the flip). Stepped browser checks (Arena has no Node test). Fails nonzero.
//   WFM_URL=http://localhost:5173 node tools/debug/waistlock_cleanup.mjs
import { launch } from './harness.mjs';
import { INSTALL, SETUP } from './grapples_film.mjs';
import { STEP } from './grapples_waistlock.mjs';
import { WAISTLOCK } from '../../src/animation/waistlock.js';
import { ATOMIC } from '../../src/animation/waistlockThrows.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PRESS_AT = 36, DROP_AT = 80, F = (s) => Math.round(s * 60);
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)})`}`); if (!ok) fails++; };

const CASES = [
    ['the circle', PRESS_AT + F(WAISTLOCK.goBehind / 2)],
    ['the hold', PRESS_AT + F(WAISTLOCK.goBehind + 0.5)],
    ['the let-go', PRESS_AT + F(WAISTLOCK.goBehind + WAISTLOCK.timeout + 0.1)],
    ['the drop\'s lift', DROP_AT + F(0.15), true],
    ['the drop\'s sell', DROP_AT + F(0.65), true],
    ['the drop\'s walk away', DROP_AT + F(1.30), true],   // T4c.4p: the receiver is mid-step, facing away, his soles planted
    ['the drop\'s turn', DROP_AT + F(ATOMIC.turnAt + 0.02), true],   // ... and a frame after his facing flipped
    ['the snapmare\'s pull', DROP_AT + 6 + F(0.25), true, true],   // T4c.3: the defender reverses 0.1 s into the lift
    ['the snapmare\'s flip', DROP_AT + 6 + F(0.6), true, true],
    ['the sleeper\'s fight', DROP_AT + F(0.5), false, false, true],   // T4d.2: the attacker presses the finisher in the hold
    ['the sleeper\'s limp stage', DROP_AT + F(3.2), false, false, true],
];
const snap = () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    return { phase: sc.waistlockState?.phase ?? null, held: !!sc.waistlockState, clip: !!(sc.w1._activeMove || sc.w2._activeMove), fixed: [!!sc.w1._fixedHold, !!sc.w2._fixedHold], dropState: !!sc.dropState, sleeper: !!sc.sleeperState, states: [sc.w1.state, sc.w2.state], locks: [!!sc.w1._facingLock, !!sc.w2._facingLock], matchOver: sc.matchOver, orphans: sc.matchEvents.filter(e => e.type === 'orphanRescue').length };
};

for (const [name, endAt, drop, rev, sleeper] of CASES) {
    process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        await page.evaluate(INSTALL);
        await page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, layer: false, seed: 11 });
        await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; for (const w of [sc.w1, sc.w2]) for (const m of ['atomicDrop', 'snapmare', 'sleeperHold']) if (!w.moveSet.includes(m)) w.moveSet.push(m); sc.matchEvents.length = 0; });
        for (let i = 0; i < endAt; i++) await page.evaluate(STEP, { press: { a: i === PRESS_AT || (drop && i === DROP_AT) ? ['power'] : sleeper && i === DROP_AT ? ['finisher'] : [], d: rev && i === DROP_AT + 6 ? ['power'] : [] }, hold: { a: i === PRESS_AT ? ['up'] : [] }, mask: false });
        const before = await page.evaluate(snap);
        if (sleeper) check(`${name}: the match ends inside the rear sleeper`, before.sleeper && !before.held && before.states[1] === 'sleeping', before);
        else if (drop) check(`${name}: the match ends inside the ${rev ? 'snapmare' : 'atomic drop'}'s clip`, before.clip && before.fixed.every(Boolean) && !before.held, before);
        else check(`${name}: the match ends inside the waistlock (${before.phase})`, before.held && before.locks.every(Boolean), before);
        await page.evaluate(() => window.__WFM_GAME.scene.scenes[0]._endMatch('TEST'));
        const after = await page.evaluate(snap);
        check(`${name}: right after the match ends both facing locks are off and the state is gone`, !after.held && !after.dropState && !after.sleeper && after.locks.every(v => !v), after);
        // the banner, the 4 s delay, the fade and the reset, at the fixed step; 6 s is enough
        for (let i = 0; i < 360; i++) await page.evaluate(STEP, { mask: false });
        const reset = await page.evaluate(snap);
        check(`${name}: after the reset the match is on, both men stand, no lock, no orphanRescue`, reset.matchOver === false && reset.states.every(s => s === 'standing') && reset.locks.every(v => !v) && reset.orphans === 0 && !reset.clip && !reset.sleeper && reset.fixed.every(v => !v), reset);
        // crossing the opponent turns each man: w1 left of w2 faces right; put him to the right of w2 and he must face left
        const turned = await page.evaluate(async () => {
            const sc = window.__WFM_GAME.scene.scenes[0], out = [];
            for (const [x1, x2] of [[300, 600], [700, 400]]) {
                for (const w of [sc.w1, sc.w2]) { w.state = 'standing'; w.vx = 0; w.y = 400; }
                sc.w1.x = x1; sc.w2.x = x2;
                for (let k = 0; k < 4; k++) { window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); }
                out.push([sc.w1.facing, sc.w2.facing]);
            }
            return out;
        });
        check(`${name}: after the reset crossing the opponent turns each man`, turned[0][0] === 1 && turned[0][1] === -1 && turned[1][0] === -1 && turned[1][1] === 1, turned);
    } finally { await h.close(); }
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
