// Cold-start safety for articulated pose channels.
//
// tests/articulatedPosePath.test.js proves the channels are TRANSPORTED into
// the tween config, using a fake `tweens.add` that writes each final value
// straight onto the target. That fake models an ideal tween which never reads a
// start value — so it cannot see the failure real Phaser produces: interpolating
// a property the target does not have yet starts from `undefined` and yields
// NaN for the entire tween.
//
// The consequences were asymmetric and both silent:
//   - lElbow/lKnee: clampLocalFlex replaces a non-finite flex with the joint
//     default, so the joint renders at a plausible angle and simply never
//     animates.
//   - lForearm/lShin/rShin: used raw as `facing * pose.lForearm`, so NaN flows
//     into sprite rotation AND position. Measured in-game on Thesz — whose
//     theszIdle is the only pose in the codebase authoring these — a knee drop's
//     recovery-to-idle left nearShin.x/y and farShin.rotation NaN and both shins
//     and boots vanished.
//
// These tests assert the invariant that holds no matter what the tween engine
// does: after tweenPose returns, every articulated channel the target authors is
// finite on the live pose. The fake below deliberately does NOTHING on add(),
// which is the honest model of "the tween has been scheduled but has not run".

import test from 'node:test';
import assert from 'node:assert/strict';

import Wrestler, { ARTICULATED_CHANNELS } from '../src/Wrestler.js';

/** A wrestler whose scheduled tweens never run — nothing writes the target. */
function wrestlerWithInertTween(pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 }) {
    const calls = [];
    const self = Object.assign(Object.create(Wrestler.prototype), {
        pose: { ...pose },
        _activeMove: null,
        _choreoUntil: 0,
        scene: {
            time: { now: 1000 },
            tweens: { killTweensOf() {}, add(config) { calls.push(config); } },
        },
    });
    return { self, calls };
}

test('a cold articulated channel is finite immediately, never NaN-from-undefined', () => {
    const { self } = wrestlerWithInertTween();
    for (const channel of ARTICULATED_CHANNELS) {
        assert.equal(self.pose[channel], undefined, `${channel} should start absent`);
    }

    self.tweenPose({ lLeg: 0.1, rLeg: -0.1, lArm: 0.2, rArm: -0.2, lForearm: 0.8, lShin: -0.11, rShin: -0.06 }, 220);

    assert.equal(self.pose.lForearm, 0.8);
    assert.equal(self.pose.lShin, -0.11);
    assert.equal(self.pose.rShin, -0.06);
});

// The wrestler in this file has no skeleton, which is the "nothing has rendered
// yet" case. Seeding a cold channel from the current joint relationship is the
// normal path (tests/articulatedContinuity.test.js); this asserts the fallback
// underneath it, which trades motion for the NaN guarantee and must stay.
test('with no rendered relationship available, a cold channel is assigned outright', () => {
    const { self, calls } = wrestlerWithInertTween();
    self.tweenPose({ lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lElbow: 1.15 }, 140);

    assert.equal(self.pose.lElbow, 1.15, 'assigned onto the live pose');
    assert.equal('lElbow' in calls[0], false,
        'a channel with no start value must not be tweened — that is the NaN path');
});

test('a warm channel tweens normally instead of snapping', () => {
    const { self, calls } = wrestlerWithInertTween();
    self.tweenPose({ lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lElbow: 0.30 }, 0);   // seed it
    assert.equal(self.pose.lElbow, 0.30);

    self.tweenPose({ lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lElbow: 1.15 }, 140);
    const config = calls.at(-1);
    assert.equal(config.lElbow, 1.15, 'warm channel goes through the tween');
    assert.equal(self.pose.lElbow, 0.30, 'and is left for the tween to move, not snapped');
});

// A pose left holding NaN from any other source must not stay poisoned: a
// non-finite live value is treated as "no start value" and snapped.
test('a NaN left on the live pose is healed rather than tweened from', () => {
    const { self, calls } = wrestlerWithInertTween();
    self.pose.lShin = NaN;

    self.tweenPose({ lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lShin: -0.11 }, 200);

    assert.equal(self.pose.lShin, -0.11);
    assert.equal('lShin' in calls[0], false);
});

test('a malformed dual-authored pose resolves to finite canonical local owners', () => {
    const { self } = wrestlerWithInertTween();
    const target = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0 };
    for (const [i, channel] of ARTICULATED_CHANNELS.entries()) target[channel] = 0.2 + i * 0.1;

    self.tweenPose(target, 180);

    for (const channel of ['lElbow', 'rElbow', 'lKnee', 'rKnee'])
        assert.ok(Number.isFinite(self.pose[channel]), `${channel} has a finite canonical owner`);
    for (const channel of ['lForearm', 'rForearm', 'lShin', 'rShin'])
        assert.equal(self.pose[channel], undefined, `${channel} loses to canonical local flex`);
});

test('the zero-duration path is unaffected', () => {
    const { self } = wrestlerWithInertTween();
    self.tweenPose({ lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lForearm: 0.8 }, 0);
    assert.equal(self.pose.lForearm, 0.8);
});

// Poses that omit a channel must not be forced to carry one — that is what keeps
// an unauthored joint on its derived relationship.
test('channels the target does not author are not invented', () => {
    const { self } = wrestlerWithInertTween();
    self.tweenPose({ lLeg: 0, rLeg: 0, lArm: 0, rArm: 0 }, 120);
    for (const channel of ARTICULATED_CHANNELS) {
        assert.equal(self.pose[channel], undefined, `${channel} should still be absent`);
    }
});
