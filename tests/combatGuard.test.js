// Combat-guard suppression: who owns the arms.
//
// Regression cover for a bug the whole suite missed. Skeleton's combat-ready
// guard blends the arms toward a fixed stance as combatBlend -> 1, and at 1 it
// REPLACES them outright:
//
//     lArmAng = lArmAng + (GUARD_UPPER - lArmAng) * b      // b = 1  =>  GUARD_UPPER
//
// combatBlend only falls when the state leaves standing/staggered, and jab and
// headbutt never change state, so both were being flattened at exactly the
// range where they are legal — 1.55 rad of authored jab travel rendered as
// 0.0025 rad. Every gameplay event still fired, so all 17 live scenarios and
// every unit test passed while the move was invisible. That is why this tests
// the ownership predicate directly.
//
// _choreoOwnsPose reads only _activeMove, scene.time.now, and _choreoUntil, so
// it can be exercised without a Phaser scene.

import test from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';

const ownsPose = Wrestler.prototype._choreoOwnsPose;

/** Minimal stand-in carrying only the fields the predicate reads. */
function actor({ activeMove = null, now = 1000, until = 0 } = {}) {
    return { _activeMove: activeMove, _choreoUntil: until, scene: { time: { now } } };
}

test('a neutral wrestler does not own the pose — the guard applies', () => {
    assert.equal(ownsPose.call(actor()), false);
});

test('an active MoveRuntime clip owns the pose', () => {
    assert.equal(ownsPose.call(actor({ activeMove: { id: 1 } })), true);
});

test('a running pose sequence owns the pose until its deadline', () => {
    assert.equal(ownsPose.call(actor({ now: 1000, until: 1400 })), true);
});

// The failure mode a boolean flag would have: a sequence interrupted before its
// final callback leaves the guard suppressed forever, and the wrestler silently
// loses their combat stance for the rest of the match.
test('ownership expires on its own — it cannot get stuck on', () => {
    assert.equal(ownsPose.call(actor({ now: 1401, until: 1400 })), false);
});

test('ownership ends exactly at the deadline, not after', () => {
    assert.equal(ownsPose.call(actor({ now: 1400, until: 1400 })), false);
});

// tweenPose zeroes _choreoUntil when something else claims the stance, so
// selling, blocking, and the idle settle hand the guard straight back.
test('a cleared deadline releases the pose', () => {
    assert.equal(ownsPose.call(actor({ now: 1000, until: 0 })), false);
});

// A clip outlives a stale deadline: cancellation clears _activeMove, and the
// deadline is what expires, so neither source alone can pin ownership on.
test('a live clip still owns the pose even with no sequence deadline', () => {
    assert.equal(ownsPose.call(actor({ activeMove: { id: 7 }, now: 9999, until: 0 })), true);
});

test('the predicate exists on the prototype under the expected name', () => {
    // The draw path calls this every frame; a rename that missed the call site
    // would silently restore the bug.
    assert.equal(typeof Wrestler.prototype._choreoOwnsPose, 'function');
});
