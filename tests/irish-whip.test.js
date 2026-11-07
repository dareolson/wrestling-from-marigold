import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';

function pair() {
    const calls = [], events = [];
    const scene = { time: { delayedCall: (ms, fn) => calls.push({ ms, fn }) }, tweens: { add: () => {} }, _logEvent: (...args) => events.push(args) };
    const a = Object.assign(Object.create(Wrestler.prototype), { scene, x: 400, y: 400, facing: 1, pose: {}, _runPoseSequence: () => {} });
    const d = { x: 470, y: 400, facing: -1, state: 'standing', tweenPose: () => {} };
    return { a, d, calls, events };
}
for (const direction of [-1, 1]) test(`whip ${direction}: holds until release, preserves selected direction`, () => {
    const { a, d, calls, events } = pair();
    const spec = a._doIrishWhipLeadIn(d, direction);
    assert.equal(spec.crossBody, direction === -1);
    assert.equal(d.state, 'grabbed');
    assert.equal(d.facing, -1);
    assert.equal(calls[0].ms, direction === -1 ? 240 : 170);
    // Steering after selection cannot change the chosen rope.
    a.facing = -direction;
    calls[0].fn();
    assert.equal(d.state, 'running');
    assert.equal(d.runFacing, direction);
    assert.equal(d.facing, direction);
    assert.equal(Math.sign(d.runTarget - d.x), direction);
    assert.equal(events[0][0], 'whipRelease');
});
test('interrupted whip does not revive a downed receiver', () => {
    const { a, d, calls } = pair();
    a._doIrishWhipLeadIn(d, 1);
    d.state = 'down';
    calls[0].fn();
    assert.equal(d.state, 'down');
    assert.equal(d.runPhase, null);
});
test('interrupted attacker releases a receiver still grabbed', () => {
    const { a, d, calls } = pair();
    a._doIrishWhipLeadIn(d, -1);
    a.state = 'down';
    calls[0].fn();
    assert.equal(a.state, 'down');
    assert.equal(d.state, 'standing');
});
test('cross-body release turns the attacker with the receiver; same-side leaves him', () => {
    for (const [direction, turns] of [[-1, true], [1, false]]) {
        const { a, d, calls } = pair();
        a._doIrishWhipLeadIn(d, direction);
        calls[0].fn();
        assert.equal(a.facing, turns ? direction : 1);
        assert.equal(d.facing, direction);
    }
});
test('an interrupted attacker auto-faces again even with _whip left set', () => {
    const { a, d } = pair();
    a._doIrishWhipLeadIn(d, -1);
    a.state = 'staggered';
    a.facing = -1;
    a.move(16, d);
    assert.equal(a.facing, 1);
});
test('depth whip: release sends the receiver on a line to the corner row; no depth keeps the flat rope run', () => {
    for (const [depth, y] of [[-1, 264], [1, 439], [0, null]]) {
        const { a, d, calls } = pair();
        d._setRunLine = Wrestler.prototype._setRunLine;
        a._doIrishWhipLeadIn(d, 1, depth);
        calls[0].fn();
        assert.equal(d.runPhase, depth ? 'toCorner' : 'toRope');
        assert.equal(d.runTargetY, y);
        assert.equal(d.facing, 1);
    }
});
