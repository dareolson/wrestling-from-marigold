// PLAN_GRAPPLES T4b.2b.1: ending the match in the circle, the hold or the let-go leaves no facing lock, no orphanRescue and no stuck state,
// and after the reset crossing the opponent turns each man as normal. Stepped browser checks (Arena has no Node test). Fails nonzero.
//   WFM_URL=http://localhost:5173 node tools/debug/waistlock_cleanup.mjs
import { launch } from './harness.mjs';
import { INSTALL, SETUP } from './grapples_film.mjs';
import { STEP } from './grapples_waistlock.mjs';
import { WAISTLOCK } from '../../src/animation/waistlock.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PRESS_AT = 36, F = (s) => Math.round(s * 60);
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)})`}`); if (!ok) fails++; };

const CASES = [
    ['the circle', PRESS_AT + F(WAISTLOCK.goBehind / 2)],
    ['the hold', PRESS_AT + F(WAISTLOCK.goBehind + 0.5)],
    ['the let-go', PRESS_AT + F(WAISTLOCK.goBehind + WAISTLOCK.timeout + 0.1)],
];
const snap = () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    return { phase: sc.waistlockState?.phase ?? null, held: !!sc.waistlockState, states: [sc.w1.state, sc.w2.state], locks: [!!sc.w1._facingLock, !!sc.w2._facingLock], matchOver: sc.matchOver, orphans: sc.matchEvents.filter(e => e.type === 'orphanRescue').length };
};

for (const [name, endAt] of CASES) {
    process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        await page.evaluate(INSTALL);
        await page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, layer: false, seed: 11 });
        await page.evaluate(() => { window.__WFM_GAME.scene.scenes[0].matchEvents.length = 0; });
        for (let i = 0; i < endAt; i++) await page.evaluate(STEP, { press: { a: i === PRESS_AT ? ['power'] : [] }, hold: { a: i === PRESS_AT ? ['up'] : [] }, mask: false });
        const before = await page.evaluate(snap);
        check(`${name}: the match ends inside the waistlock (${before.phase})`, before.held && before.locks.every(Boolean), before);
        await page.evaluate(() => window.__WFM_GAME.scene.scenes[0]._endMatch('TEST'));
        const after = await page.evaluate(snap);
        check(`${name}: right after the match ends both facing locks are off and the state is gone`, !after.held && after.locks.every(v => !v), after);
        // the banner, the 4 s delay, the fade and the reset, at the fixed step; 6 s is enough
        for (let i = 0; i < 360; i++) await page.evaluate(STEP, { mask: false });
        const reset = await page.evaluate(snap);
        check(`${name}: after the reset the match is on, both men stand, no lock, no orphanRescue`, reset.matchOver === false && reset.states.every(s => s === 'standing') && reset.locks.every(v => !v) && reset.orphans === 0, reset);
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
