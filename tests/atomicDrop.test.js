// PLAN_GRAPPLES T4c.2: the atomic drop out of the waistlock (clip, Wrestler._doAtomicDrop, registry entry). Arena's input and hand-over are
// browser-checked (tools/debug/waistlock_throws.mjs, waistlock_cleanup.mjs); everything the Wrestler and the runtime own is here.
import test from 'node:test';
import assert from 'node:assert/strict';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { atomicDropClip } from '../src/animation/clips/atomicDrop.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { ATOMIC } from '../src/animation/waistlockThrows.js';
import { WAISTLOCK } from '../src/animation/waistlock.js';
import { MOVE_SPECS as MOVES } from '../src/moves/registry.js';
import Wrestler, { STAMINA_DRAIN } from '../src/Wrestler.js';

function setup() {
    const runtime = new MoveRuntime();
    runtime.register(atomicDropClip);
    const sounds = [], shakes = [];
    const scene = {
        moveRuntime: runtime, time: { now: 0, delayedCall: () => {} },
        tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} },
        cameras: { main: { shake: (...a) => shakes.push(a) } },
        crowd: { impact: (kind, size) => sounds.push([kind, size]) },
        _logEvent: () => {},
    };
    const drained = [];
    const make = (x, facing) => Object.assign(Object.create(Wrestler.prototype), {
        scene, x, y: 360, facing, state: 'lockup', stamina: 100, pose: {},
        idlePose: 'idle', skeleton: { setPartVariants() {} }, _activeMove: null,
        tweenPose(_p, _d, _e, done) { done?.(); }, _drain(n) { drained.push(n); }, _doSell() {},
    });
    // both face left, the attacker behind (on the right)
    return { runtime, sounds, shakes, drained, atk: make(560 + WAISTLOCK.holdBehind, -1), def: make(560, -1) };
}
const run = (runtime, seconds) => { for (let t = 0; t < seconds; t += 1 / 60) runtime.update(1 / 60); };

test('the registry knows the atomic drop: its clip is registered, its damage key exists, its sell is a back sell', () => {
    assert.ok(REGISTERED_MOVE_CLIPS.includes(atomicDropClip));
    assert.equal(MOVES.atomicDrop.clip, 'atomicDrop');
    assert.equal(MOVES.atomicDrop.damageKey, 'atomicDrop');
    assert.equal(STAMINA_DRAIN.atomicDrop, 12);
    assert.deepEqual(MOVES.atomicDrop.sell, ATOMIC.sellSpec);
});

test('the clip follows the beats: impact where the drop ends, the defender rises on the lift and is down on the knee at the impact', () => {
    assert.equal(atomicDropClip.duration, ATOMIC.duration);
    assert.deepEqual(atomicDropClip.events, [{ at: ATOMIC.impact, type: 'impact' }]);
    const att = atomicDropClip.tracks.attacker.keyframes, def = atomicDropClip.tracks.defender.keyframes;
    const at = (kfs, t) => kfs.find(k => Math.abs(k.at - t) < 1e-9);
    // T4c.4g: the rise is the carry's (his own lift track stays 0), so he is lifted by leaning back with the attacker, and has come forward past upright by the impact
    assert.ok(at(def, ATOMIC.lift).pose.tilt < -0.3, 'he leans back by the lift beat');
    assert.ok(at(def, ATOMIC.impact).pose.tilt > 0.1, 'and has come forward past upright by the impact');
    assert.ok(at(att, ATOMIC.impact).pose.lLeg > 1, 'the attacker\'s near knee is up at the impact');
    // he enters where the hold left him: holdBehind ahead of the attacker, `upstage` nearer the camera
    assert.equal(def[0].transform.x, WAISTLOCK.holdBehind);
    assert.equal(def[0].transform.y, WAISTLOCK.upstage);
    assert.deepEqual([att[0].transform.x, att[0].transform.y], [0, 0]);
    // nobody is turned and nobody ends tilted
    // T4c.4p: only the receiver turns, once, after the steps (feet together), and the attacker never does
    assert.ok(!att.some(k => 'facing' in k));
    assert.deepEqual(def.filter(k => 'facing' in k).map(k => [k.at, k.facing]), [[ATOMIC.turnAt, -1]]);
    assert.ok(att.every(k => k.pose.tilt === 0));
    assert.equal(def.at(-1).pose.tilt, 0);   // the defender is tilted only through the carry and the fall onto the knee, upright again after (T4c.4g)
    assert.ok(def.filter(k => k.at >= ATOMIC.impact + 0.10).every(k => k.pose.tilt === 0));
    assert.deepEqual(atomicDropClip.grips.map(g => [g.role, g.to.role, g.to.joint]), [['attacker', 'defender', 'Hip'], ['attacker', 'defender', 'Hip']]);
});

test('a landed drop hurts once for the damage key with a back sell, and both men end on their feet, facing as they were', () => {
    const { runtime, sounds, shakes, drained, atk, def } = setup();
    atk._doAtomicDrop(def);
    assert.equal(atk.state, 'holding'); assert.equal(def.state, 'holding');
    assert.equal(def.facing, -1, 'the defender is not turned round');
    run(runtime, ATOMIC.impact + 0.05);
    assert.deepEqual(drained, [STAMINA_DRAIN.atomicDrop]);
    assert.deepEqual(sounds, [['mat', 0.8]]);
    assert.equal(shakes.length, 1);
    assert.equal(def._pain.part, 'back'); assert.equal(def._pain.severity, 0.7);
    run(runtime, ATOMIC.duration);
    assert.equal(atk.state, 'standing'); assert.equal(def.state, 'standing');
    assert.equal(atk._fixedHold, false); assert.equal(def._fixedHold, false);
    assert.equal(atk._activeMove, null); assert.equal(def._activeMove, null);
    assert.equal(def.pose.tilt, 0); assert.equal(def.pose.lift, 0);
    assert.equal(def._pain.phase, 'recover', 'the hurt is carried on his feet, not left waiting for a knockdown');
    assert.deepEqual(drained, [STAMINA_DRAIN.atomicDrop], 'and nothing more drains');
});

test('a drop torn down in the lift costs nothing and stands both men up, no knockdown', () => {
    const { runtime, sounds, drained, atk, def } = setup();
    atk._doAtomicDrop(def);
    run(runtime, ATOMIC.lift / 2);
    runtime.cancel(atk._activeMove);
    assert.deepEqual(drained, []); assert.deepEqual(sounds, []);
    assert.equal(atk.state, 'standing'); assert.equal(def.state, 'standing');
    assert.equal(atk._fixedHold, false); assert.equal(def._fixedHold, false);
    run(runtime, 1);
    assert.deepEqual(drained, []);
});

test('a drop handed over to another clip (the snapmare) lays nobody down and leaves the next clip\'s states alone', () => {
    const { runtime, atk, def } = setup();
    atk._doAtomicDrop(def);
    run(runtime, 0.1);
    atk._reversed = true;
    runtime.cancel(atk._activeMove);
    assert.equal(atk.state, 'holding'); assert.equal(def.state, 'holding');
});
