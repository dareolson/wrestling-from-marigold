// PLAN_GRAPPLES T3c.4: the rebound aims at the attacker's depth; up/down aims a self-started run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { ringBoundsAtY } from '../src/constants.js';

globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };
const withFlag = (on, fn) => {
    if (on) globalThis.location = { search: '?grapples=v1' };
    try { return fn(); } finally { delete globalThis.location; }
};
const base = (o) => Object.assign(Object.create(Wrestler.prototype), {
    scene: { triggerRopeBounce: () => {}, time: { delayedCall: () => {} }, tweens: { add: () => {} }, _logEvent: () => {} },
    facing: 1, walkPhase: 0, moveBlend: 1, _heightScale: 1, _gaitV2: null, runTargetY: null, ...o });

test('flag on: the return from the rope meets the attacker 60 px off in depth, and the clothesline connects', () => {
    withFlag(true, () => {
        const att = base({ x: 300, y: 410, state: 'standing', input: { justDown: k => k === 'action', isDown: () => false }, moveSet: ['clothesline'], _runPoseSequence() {}, _hurt() {} });
        const r = base({ x: 450, y: 350, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: att, _hurt() {}, _doSell() {} });
        r.runTarget = ringBoundsAtY(350).right - 20;
        let hit = null;
        for (let i = 0; i < 900 && !hit; i++) {
            r.tickRun(1 / 60);
            if (r.runPhase === 'returning' && Math.abs(r.x - att.x) < 120) hit = att.tryAction(r);
        }
        assert.equal(hit, 'clothesline');
        assert.ok(Math.abs(r.y - att.y) < 48, `runner y ${r.y} vs attacker 410`);
    });
});
test('flag off: the return is flat, so a runner across the lane keeps his own y', () => {
    const att = base({ x: 300, y: 410, state: 'standing' });
    const r = base({ x: 450, y: 350, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: att });
    r.runTarget = ringBoundsAtY(350).right - 20;
    for (let i = 0; i < 900 && r.state === 'running'; i++) r.tickRun(1 / 60);
    assert.equal(r.y, 350);
});
test('same depth: the flag-on return is the flat line it always was', () => {
    withFlag(true, () => {
        const att = base({ x: 300, y: 350, state: 'standing' });
        const r = base({ x: 450, y: 350, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: att });
        r.runTarget = ringBoundsAtY(350).right - 20;
        for (let i = 0; i < 900 && r.state === 'running'; i++) { r.tickRun(1 / 60); assert.equal(r.y, 350); }
    });
});
test('tryRun: up or down held aims the rope point 70 px up or down, clamped; none keeps it flat; flag off ignores it', () => {
    const mk = (held) => base({ x: 500, y: 350, state: 'standing', input: { justDown: k => k === 'run', isDown: k => k === held } });
    withFlag(true, () => {
        const up = mk('up'); up.tryRun();
        assert.equal(up.runTargetY, 350 - 70 * up.s);
        const down = mk('down'); down.tryRun();
        assert.equal(down.runTargetY, 350 + 70 * down.s);
        const none = mk(null); none.tryRun();
        assert.equal(none.runTargetY, null);
        const edge = base({ x: 500, y: 262, state: 'standing', input: { justDown: k => k === 'run', isDown: k => k === 'up' } });
        edge.tryRun();
        assert.equal(edge.runTargetY, 264);
    });
    const off = mk('up'); off.tryRun();
    assert.equal(off.runTargetY, null);
});
