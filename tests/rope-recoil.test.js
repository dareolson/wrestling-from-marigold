// PLAN_GRAPPLES T3c.5: the rope hit copies the corner hit: no flip on arrival, the first stagger step, then the turn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { ringBoundsAtY } from '../src/constants.js';
import { STAGGER_TYPES, staggerFor } from '../src/animation/staggers.js';

globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };
const withFlag = (on, fn) => {
    if (on) globalThis.location = { search: '?grapples=v1' };
    try { return fn(); } finally { delete globalThis.location; }
};
function rig(o = {}) {
    const played = [];
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { triggerRopeBounce: () => {}, _logEvent: () => {}, time: { now: 1000 } },
        x: 450, y: 350, facing: 1, runFacing: 1, state: 'running', runPhase: 'toRope', stamina: 100,
        walkPhase: 0, moveBlend: 1, _heightScale: 1, _gaitV2: null, runTargetY: null,
        _runStaggerSteps(steps, state) { played.push([steps, state]); }, ...o });
    w.runTarget = ringBoundsAtY(w.y).right - 20;
    return [w, played];
}
const toArrival = w => { for (let i = 0; i < 900 && w.runPhase === 'toRope'; i++) w.tickRun(1 / 60); };

test('flag on: arrival plays the first stagger step, facing unchanged; the flip waits for the recoil', () => {
    for (const t of STAGGER_TYPES) {
        withFlag(true, () => {
            const [w, played] = rig({ stamina: t.minStamina === -Infinity ? 1 : t.minStamina + 1 });
            assert.equal(staggerFor(w.stamina).id, t.id);
            toArrival(w);
            assert.equal(w.runPhase, 'ropeRecoil');
            assert.equal(w.facing, 1); assert.equal(w.runFacing, 1);
            assert.deepEqual(played, [[[t.steps[0]], 'running']]);
            const frames = Math.ceil(t.steps[0].dur / 1000 * 60);
            for (let i = 0; i < frames - 2; i++) { w.tickRun(1 / 60); assert.equal(w.runPhase, 'ropeRecoil'); assert.equal(w.facing, 1); }
            for (let i = 0; i < 4 && w.runPhase === 'ropeRecoil'; i++) w.tickRun(1 / 60);
            assert.equal(w.runPhase, 'returning');
            assert.equal(w.facing, -1); assert.equal(w.moveBlend, 0);
        });
    }
});
test('the return line reads the attacker\'s y at the end of the recoil', () => {
    withFlag(true, () => {
        const att = { x: 200, y: 300 };
        const [w] = rig({ _lastOther: att });
        toArrival(w);
        att.y = 420;
        for (let i = 0; i < 60 && w.runPhase === 'ropeRecoil'; i++) w.tickRun(1 / 60);
        assert.equal(w.runTargetY, 420);
    });
});
test('a hit during the recoil leaves no stuck phase', () => {
    withFlag(true, () => {
        const [w] = rig();
        toArrival(w);
        w.state = 'falling';              // dropkick, strike: anything that takes the state
        w.tickRun(1 / 60);
        assert.equal(w.runPhase, null);
    });
});
test('not returning during the recoil, so a clothesline cannot catch him', () => {
    withFlag(true, () => {
        const [w] = rig();
        toArrival(w);
        assert.notEqual(w.runPhase, 'returning');
    });
});
test('flag off: flips on arrival, no recoil', () => {
    const [w, played] = rig();
    toArrival(w);
    assert.equal(w.runPhase, 'returning'); assert.equal(w.facing, -1); assert.deepEqual(played, []);
});
test('the pose is held to the flip frame, then handed to the run gait', () => {
    withFlag(true, () => {
        const [w] = rig();
        toArrival(w);
        while (w.runPhase === 'ropeRecoil') { w.tickRun(1 / 60); if (w.runPhase === 'ropeRecoil') assert.ok(w._choreoUntil > w.scene.time.now); }
        assert.equal(w._choreoUntil, 0);
    });
});
