// PLAN_GRAPPLES T4b.3: every waistlock ending, stepped in a real Arena (it has no Node test). Fails nonzero.
//   WFM_URL=http://localhost:5173 node tools/debug/waistlock_assert.mjs
// Lou attacks George, facing right, far side (George faces left, so "forward" for him is -x). The go-behind is pressed at frame 36; the hold starts at frame 36 + 36.
import { launch } from './harness.mjs';
import { INSTALL, SETUP } from './grapples_film.mjs';
import { STEP } from './grapples_waistlock.mjs';
import { WAISTLOCK } from '../../src/animation/waistlock.js';
import { LOCKUP } from '../../src/animation/lockup.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PRESS_AT = 36, HOLD_AT = PRESS_AT + Math.round(WAISTLOCK.goBehind * 60);
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)})`}`); if (!ok) fails++; };
const snap = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], ws = sc.waistlockState;
    return { held: !!ws, phase: ws?.phase ?? null, t: ws ? +ws.t.toFixed(3) : null, attacker: ws ? (ws.attacker === sc.w1 ? 'a' : 'd') : null, switches: ws?.switches ?? null, ending: ws?.ending ?? null, ax: sc.w1.x, dx: sc.w2.x, states: [sc.w1.state, sc.w2.state], locks: [sc.w1._facingLock ?? false, sc.w2._facingLock ?? false], events: sc.matchEvents.map(e => e.type + (e.kind ? ':' + e.kind : '')) };
};

async function fresh(setup = {}) {
    process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    await h.page.waitForTimeout(2500);
    await h.page.evaluate(INSTALL);
    await h.page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, layer: false, seed: 11, ...setup });
    await h.page.evaluate(() => { window.__WFM_GAME.scene.scenes[0].matchEvents.length = 0; });
    return h;
}
// run frames; `keys(i)` returns { a: [...], d: [...] } presses for frame i; `until(snap, i)` stops early
async function run(page, frames, keys = () => ({}), until = null) {
    let s;
    for (let i = 0; i < frames; i++) {
        const k = keys(i);
        await page.evaluate(STEP, { press: { a: k.a ?? [], d: k.d ?? [] }, hold: { a: k.holdA ?? [], d: [] }, mask: false });
        s = await page.evaluate(snap);
        if (until && until(s, i)) return { s, i };
    }
    return { s, i: frames };
}
const go = (i) => (i === PRESS_AT ? { a: ['power'], holdA: ['up'] } : {});
const clean = (s) => s.states.every(x => x === 'standing') && !s.locks[0] && s.events.every(e => e !== 'orphanRescue');

{   // timeout: the hold lets go on its own after WAISTLOCK.timeout and pushes the defender forward
    const h = await fresh();
    try {
        const p = h.page;
        const at = await run(p, HOLD_AT + 2, go);
        const d0 = at.s.dx;
        const end = await run(p, 400, () => ({}), (s) => !s.held);
        const expectF = HOLD_AT + Math.round((WAISTLOCK.timeout + WAISTLOCK.release.dur) * 60);
        check('timeout: the hold ends on the timeout (+ the let-go)', Math.abs(end.i + HOLD_AT + 2 - expectF) <= 3, [end.i + HOLD_AT + 2, expectF]);
        const after = await p.evaluate(snap);
        check('timeout: the defender is pushed forward by the shove\'s step, both stand, no orphan', -(after.dx - d0) > LOCKUP.shove.stepPx * 0.8 && clean(after), { moved: after.dx - d0, after });
    } finally { await h.close(); }
}
{   // (b) shove-off: the attacker's action lets go early
    const h = await fresh();
    try {
        const p = h.page;
        await run(p, HOLD_AT + 6, go);
        const t0 = (await p.evaluate(snap)).dx;
        await run(p, 1, () => ({ a: ['action'] }));
        const s1 = await p.evaluate(snap);
        check('shove-off: the attacker\'s action ends the hold early (release now)', s1.ending === 'shove' && s1.phase === 'release', s1);
        const end = await run(p, 60, () => ({}), (s) => !s.held);
        const after = await p.evaluate(snap);
        check('shove-off: over within the release, defender pushed forward, both stand, no orphan', end.i <= Math.ceil(WAISTLOCK.release.dur * 60) + 2 && -(after.dx - t0) > LOCKUP.shove.stepPx * 0.8 && clean(after), { frames: end.i, moved: after.dx - t0, after });
        check('shove-off: logged', after.events.includes('waistlockEnd:shove'), after.events);
    } finally { await h.close(); }
}
{   // (a) switch: the defender's action reverses it; the new defender can reverse it back; a held key doesn't chain
    const h = await fresh();
    try {
        const p = h.page;
        await run(p, HOLD_AT + 6, go);
        await run(p, 1, () => ({ d: ['action'] }));
        const s1 = await p.evaluate(snap);
        check('switch: the roles swap (George is the attacker), the hitch is a negative time', s1.attacker === 'd' && s1.switches === 1 && s1.t < 0, s1);
        // the button mashed through the hitch and the circle does nothing
        const mash = await run(p, Math.round(WAISTLOCK.goBehind * 60) - 6, () => ({ a: ['action'], d: ['action'] }));
        check('switch: no second reversal and no early let-go while the new circle runs', mash.s.switches === 1 && mash.s.held && mash.s.ending === null, mash.s);
        const hold = await run(p, 14, () => ({}), (s) => s.phase === 'hold');
        const sw = await run(p, 1, () => ({ a: ['action'] }));   // the new defender is Lou: his action swaps back
        check('switch: it swaps back (Lou is the attacker again), 2 reversals', sw.s.attacker === 'a' && sw.s.switches === 2, { hold: hold.s.phase, ...sw.s });
        check('switch: the facing locks stay on through it and the tie-up\'s men are still in lockup', sw.s.locks.every(Boolean) && sw.s.states.every(x => x === 'lockup'), sw.s);
        const end = await run(p, 400, () => ({}), (s) => !s.held);
        const after = await p.evaluate(snap);
        check('switch: the swapped hold times out like any other, both stand, no orphan', end.i < 400 && clean(after), after);
        check('switch: logged', after.events.filter(e => e === 'waistlockSwitch').length === 2, after.events);
    } finally { await h.close(); }
}
{   // (c) rope break: a man within the rope's reach at the hold's close: a clean break, no push (the defender walks off the rope). George faces left, Lou goes behind him to his right,
    // so Lou's spot is D + 74 px (82 at s .9): with `defRope: 125` George starts 112 px inside the right rope (879), Lou's spot is 853, inside the ring (859) and the rope's reach (848).
    const h = await fresh({ defRope: 125 });
    try {
        const p = h.page;
        await run(p, HOLD_AT + 1, go);
        const s0 = await p.evaluate(snap);
        const d0 = s0.dx, a0 = s0.ax;
        check('rope break: the hold is called off as soon as it closes (the attacker is inside the rope\'s reach)', s0.ending === 'rope', s0);
        const end = await run(p, 60, () => ({}), (s) => !s.held);
        const after = await p.evaluate(snap);
        check('rope break: the defender walks away from the rope by the rope break\'s step, the attacker stays, both stand', Math.abs(-(after.dx - d0) - LOCKUP.ropeBreak.stepPx * 0.9) < 6 && Math.abs(after.ax - a0) < 1.5 && clean(after), { aMoved: after.ax - a0, dMoved: after.dx - d0, after });
        check('rope break: logged', after.events.includes('waistlockEnd:rope'), after.events);
    } finally { await h.close(); }
}
{   // no room behind him: the go-behind is denied and the tie-up goes on
    const h = await fresh({ defRope: 20 });
    try {
        const p = h.page;
        await run(p, PRESS_AT + 6, go);
        const s = await p.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return { wl: !!sc.waistlockState, lockup: !!sc.lockupState, events: sc.matchEvents.map(e => e.type), states: [sc.w1.state, sc.w2.state] }; });
        check('denied: with his spot past the ropes the go-behind does not start, the tie-up goes on', !s.wl && s.lockup && s.events.includes('waistlockDenied'), s);
    } finally { await h.close(); }
}
{   // a switch with no room behind the other man ends it as a rope break
    const h = await fresh({ defRope: 180 });   // Lou's spot 788, out of reach; the spot behind Lou would be 862, past the ring's 859
    try {
        const p = h.page;
        await run(p, HOLD_AT + 6, go);
        const s0 = await p.evaluate(snap);
        await run(p, 1, () => ({ d: ['action'] }));
        const s1 = await p.evaluate(snap);
        check('switch with no room: it breaks at the ropes instead of reversing', s0.ending === null && s1.ending === 'rope' && s1.switches === 0, { s0: s0.ending, s1 });
    } finally { await h.close(); }
}
{   // a man taken out of the hold (a sell, a move) ends it: no overwrite of his state, locks off
    const h = await fresh();
    try {
        const p = h.page;
        await run(p, HOLD_AT + 10, go);
        await p.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w2.state = 'down'; sc.w2.lying = 'supine'; sc.w2.stateTimer = 3; });
        await run(p, 4);
        const s = await p.evaluate(snap);
        check('interrupted: the hold is gone, the man who went down stays down, the other stands, locks off', !s.held && s.states[1] === 'down' && s.states[0] === 'standing' && s.locks.every(v => !v), s);
    } finally { await h.close(); }
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
