// PLAN_GRAPPLES T4c.3: the snapmare reversal of the atomic drop (clip, Wrestler._doSnapmare, the hand-over from the drop's clip, the head grip curve).
// The window, the denial at the ropes and the Arena hand-over are browser-checked (tools/debug/waistlock_throws_assert.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { atomicDropClip } from '../src/animation/clips/atomicDrop.js';
import { snapmareClip } from '../src/animation/clips/snapmare.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { ATOMIC, SNAPMARE, flipTilt, snapmareHeadGrip } from '../src/animation/waistlockThrows.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import Wrestler, { STAMINA_DRAIN } from '../src/Wrestler.js';

function setup() {
    const runtime = new MoveRuntime();
    runtime.register(atomicDropClip); runtime.register(snapmareClip);
    const sounds = [], drained = [];
    const scene = {
        moveRuntime: runtime, time: { now: 0, delayedCall: () => {} },
        tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} },
        cameras: { main: { shake: () => {} } },
        crowd: { impact: (kind, size) => sounds.push([kind, size]) },
        _logEvent: () => {},
    };
    const make = (name, x) => Object.assign(Object.create(Wrestler.prototype), {
        name, scene, x, y: 360, facing: -1, state: 'lockup', stamina: 100, pose: {}, idlePose: 'idle',
        skeleton: { setPartVariants() {} }, _activeMove: null,
        tweenPose(_p, _d, _e, done) { done?.(); }, _drain(n) { drained.push([name, n]); }, _doSell() {},
    });
    return { runtime, sounds, drained, A: make('A', 640), D: make('D', 560) };   // A holds D from behind, both face left
}
const run = (runtime, seconds) => { for (let t = 0; t < seconds; t += 1 / 60) runtime.update(1 / 60); };
const at = (kfs, t) => kfs.find(k => Math.abs(k.at - t) < 1e-9);

test('the registry knows the snapmare: clip registered, damage key 16, a full back sell', () => {
    assert.ok(REGISTERED_MOVE_CLIPS.includes(snapmareClip));
    assert.equal(MOVE_SPECS.snapmare.clip, 'snapmare');
    assert.equal(STAMINA_DRAIN.snapmare, 16);
    assert.ok(STAMINA_DRAIN.snapmare > STAMINA_DRAIN.atomicDrop, 'a reversal is a bigger spot than the drop it stopped');
    assert.deepEqual(MOVE_SPECS.snapmare.sell, SNAPMARE.sellSpec);
});

test('the flip: the thrown man starts behind the thrower, turns forward by flipTilt to the landing angle, and lands one landFwd in front, flat', () => {
    assert.equal(snapmareClip.duration, SNAPMARE.duration);
    assert.deepEqual(snapmareClip.events, [{ at: SNAPMARE.land, type: 'impact' }]);
    const thrown = snapmareClip.tracks.defender.keyframes;
    assert.ok(thrown[0].transform.x < 0, 'he enters behind the man who throws him');
    const end = at(thrown, SNAPMARE.land);
    assert.equal(end.transform.x, SNAPMARE.landFwd);
    assert.equal(end.pose.lift, -100, 'his hips are on the mat');
    assert.ok(Math.abs(end.pose.tilt - flipTilt(1, 1.5 * Math.PI)) < 1e-9);
    // forward: tilt never decreases, and one frame never turns him more than half a turn
    let prev = 0;
    for (const k of thrown) { assert.ok(k.pose.tilt >= prev - 1e-9, `${k.at}`); assert.ok(k.pose.tilt - prev < Math.PI, `${k.at}`); prev = k.pose.tilt; }
    // the path arcs above the thrower's shoulder line: the highest keyframe is well above standing, and is passed over the thrower (x near 0)
    const top = thrown.reduce((best, k) => (k.pose.lift > best.pose.lift ? k : best));
    assert.ok(top.pose.lift > 80 && Math.abs(top.transform.x) < 0.5 * SNAPMARE.landFwd, `${top.pose.lift} at x ${top.transform.x}`);
    // the thrower never leaves the floor on the knee and ends standing
    const thrower = snapmareClip.tracks.attacker.keyframes;
    assert.ok(thrower.every(k => k.pose.tilt === 0));
    assert.equal(thrower[thrower.length - 1].pose.crouch, 0.05);
});

test('layers: the thrown man is behind the thrower until the flip is over his head, in front after; windows valid and cover the whole clip', () => {
    const l = snapmareClip.layers;
    assert.equal(l[0].from, 0); assert.equal(l[l.length - 1].to, snapmareClip.duration);
    assert.equal(l[0].order[0][0], 'defender'); assert.equal(l[l.length - 1].order[0][0], 'attacker');
    for (let i = 1; i < l.length; i++) assert.equal(l[i].from, l[i - 1].to);
});

test('the head grip closes over the reach, holds through the pull, lets go as the flip takes him', () => {
    assert.equal(snapmareHeadGrip(0), 0);
    assert.ok(snapmareHeadGrip(SNAPMARE.reach) > 0.99);
    assert.ok(snapmareHeadGrip(SNAPMARE.reach + SNAPMARE.pull) > 0.99);
    assert.ok(snapmareHeadGrip(SNAPMARE.reach + SNAPMARE.pull + 0.04) < 0.6);
    assert.equal(snapmareHeadGrip(SNAPMARE.land), 0);
});

test('a drop reversed in its lift: the drop does no damage and lays nobody down, the snapmare hurts once for 16 and lands the old attacker on his back', () => {
    const { runtime, sounds, drained, A, D } = setup();
    A._doAtomicDrop(D);
    run(runtime, 0.1);
    A._reversed = true;
    D._doSnapmare(A);                                     // Arena._beginSnapmare's two calls
    assert.equal(A.state, 'holding'); assert.equal(D.state, 'holding');
    assert.equal(D._activeMove, A._activeMove, 'one clip owns the pair');
    run(runtime, SNAPMARE.land + 0.05);
    assert.deepEqual(drained, [['A', STAMINA_DRAIN.snapmare]], 'the thrown man pays, once, nothing from the drop');
    assert.deepEqual(sounds, [['mat', 1.0]]);
    assert.equal(A._pain.part, 'back'); assert.equal(A._pain.severity, 1.0);
    run(runtime, SNAPMARE.duration);
    assert.equal(A.state, 'down'); assert.equal(A.lying, 'supine');
    assert.equal(D.state, 'standing');
    assert.equal(A._fixedHold, false); assert.equal(D._fixedHold, false);
    assert.equal(A._activeMove, null); assert.equal(D._activeMove, null);
    assert.equal(A.pose.tilt, 0); assert.equal(D.pose.tilt, 0);
});

test('a snapmare torn down mid-flip costs nothing and leaves nobody stuck in a hold', () => {
    const { runtime, sounds, drained, A, D } = setup();
    D._doSnapmare(A);
    run(runtime, SNAPMARE.reach + SNAPMARE.pull + 0.1);
    runtime.cancel(D._activeMove);
    assert.deepEqual(drained, []); assert.deepEqual(sounds, []);
    assert.notEqual(A.state, 'holding'); assert.notEqual(D.state, 'holding');
    assert.equal(A._fixedHold, false); assert.equal(D._fixedHold, false);
});

test('the drop still does its own damage if the reversal never comes (the window is only the lift)', () => {
    const { runtime, drained, A, D } = setup();
    A._doAtomicDrop(D);
    run(runtime, ATOMIC.reverseWindow + 0.05);
    run(runtime, ATOMIC.duration);
    assert.deepEqual(drained, [['D', STAMINA_DRAIN.atomicDrop]]);
});
