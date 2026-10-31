// PLAN_GRAPPLES T3c.2: a returning runner only meets an attacker in his lane, flag on. Flag off is unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { sharesDepth } from '../src/Wrestler.js';

globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };

const withFlag = (on, fn) => {
    if (on) globalThis.location = { search: '?grapples=v1' };
    try { return fn(); } finally { delete globalThis.location; }
};
function pair(runnerY) {
    const calls = [];
    const scene = { time: { delayedCall: (ms, fn) => calls.push({ ms, fn }) }, tweens: { add: () => {} }, _logEvent: () => {} };
    const keys = new Set(['action']);
    const input = { justDown: k => keys.has(k), isDown: () => false };
    const a = Object.assign(Object.create(Wrestler.prototype), {
        scene, x: 400, y: 400, facing: 1, state: 'standing', input, moveSet: ['clothesline', 'backBodyDrop', 'doubleAxeHandle'],
        _runPoseSequence: () => {}, _drain() {}, _hurt() {},
    });
    const r = { x: 450, y: runnerY, state: 'running', runPhase: 'returning', runFacing: -1, _hurt() {}, _doSell() {} };
    return { a, r };
}
test('sharesDepth: flag off always true; flag on needs under 48 px', () => {
    assert.equal(sharesDepth({ y: 0 }, { y: 300 }), true);
    withFlag(true, () => {
        assert.equal(sharesDepth({ y: 400 }, { y: 400 + 22 }), true, "the whip's own 22 px step passes");
        assert.equal(sharesDepth({ y: 400 }, { y: 447.9 }), true);
        assert.equal(sharesDepth({ y: 400 }, { y: 448 }), false);
    });
});
test('clothesline: runner across the ring is not hit; same depth still is; flag off hits anyway', () => {
    withFlag(true, () => {
        const { a, r } = pair(500);
        assert.equal(a.tryAction(r), false);
        const same = pair(410);
        assert.equal(same.a.tryAction(same.r), 'clothesline');
    });
    const off = pair(500);
    assert.equal(off.a.tryAction(off.r), 'clothesline');
});
test('double axe handle: runner 100 px off in depth is not hit; same depth still is', () => {
    withFlag(true, () => {
        const far = pair(500);
        far.a.input = { justDown: k => k === 'power', isDown: () => false };
        assert.equal(far.a.tryRunningAttack.call(Object.assign(far.a, { state: 'running', runPhase: 'returning' }), far.r), false);
        const near = pair(410);
        Object.assign(near.a, { state: 'running', runPhase: 'returning', input: { justDown: k => k === 'power', isDown: () => false } });
        assert.equal(near.a.tryRunningAttack(near.r), 'doubleAxeHandle');
    });
});
