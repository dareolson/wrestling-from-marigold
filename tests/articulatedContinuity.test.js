// Intermediate-frame continuity for articulated joint channels.
//
// tests/articulatedColdStart.test.js proves a newly introduced channel can never
// be NaN. That is a safety property, not a motion property: snapping the channel
// straight to its destination is NaN-free but makes the first elbow or knee
// articulation pop instead of animate.
//
// The canonical behaviour is to seed a cold channel from the joint relationship
// the renderer is CURRENTLY drawing, then tween from that seed to the authored
// value. The seed is render-identical to what was already on screen, so frame
// one is unchanged and the motion is continuous from there.
//
// These tests assert the start of the motion, which is where a snap and a seed
// differ. Continuity of the rendered limb across real frames is covered by
// phase 3 of tools/debug/articulated_channel_probe.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';

import Wrestler from '../src/Wrestler.js';

/**
 * A wrestler whose tweens never run, and whose skeleton reports the joint
 * relationship it is currently rendering.
 */
function wrestlerWithRenderedJoints(jointState) {
    const calls = [];
    const self = Object.assign(Object.create(Wrestler.prototype), {
        pose: { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 },
        _activeMove: null,
        _choreoUntil: 0,
        facing: 1,
        skeleton: {
            setPartVariants() {},
            currentPoseChannel(channel) { return jointState?.[channel]; },
        },
        scene: {
            time: { now: 1000 },
            tweens: { killTweensOf() {}, add(config) { calls.push(config); } },
        },
    });
    return { self, calls };
}

const BASE = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0 };

test('a cold channel starts from the currently rendered relationship, not the destination', () => {
    // 0.70 is what the derived elbow relationship renders today (FOREARM_BEND).
    const { self } = wrestlerWithRenderedJoints({ lElbow: 0.70 });

    self.tweenPose({ ...BASE, lElbow: 1.15 }, 140);

    assert.equal(self.pose.lElbow, 0.70,
        'the live pose must begin at what was already on screen, so frame one does not jump');
});

test('a cold channel is handed to the tween so it actually animates', () => {
    const { self, calls } = wrestlerWithRenderedJoints({ lElbow: 0.70 });

    self.tweenPose({ ...BASE, lElbow: 1.15 }, 140);

    assert.equal(calls.at(-1).lElbow, 1.15,
        'the destination must go through the tween — snapping it would skip the motion');
});

test('the seeded canonical start is finite and removes its legacy competitor', () => {
    const { self } = wrestlerWithRenderedJoints({ lKnee: 0.31, lShin: -0.22 });

    self.tweenPose({ ...BASE, lKnee: 1.5, lShin: -0.11 }, 200);

    assert.ok(Number.isFinite(self.pose.lKnee));
    assert.equal(self.pose.lShin, undefined);
});

test('legacy absolute channels seed from the rendered angle too', () => {
    const { self, calls } = wrestlerWithRenderedJoints({ lForearm: 0.62 });

    self.tweenPose({ ...BASE, lForearm: 0.8 }, 220);

    assert.equal(self.pose.lForearm, 0.62, 'starts where the forearm is being drawn');
    assert.equal(calls.at(-1).lForearm, 0.8, 'and tweens to the authored value');
});

// Continuity must never be bought at the cost of the NaN guarantee. Before the
// first render there is no joint state to seed from, and the channel is snapped
// — correct but motionless, which is strictly better than NaN.
test('with no rendered joint state yet, the channel snaps rather than going NaN', () => {
    const { self, calls } = wrestlerWithRenderedJoints(undefined);

    self.tweenPose({ ...BASE, lElbow: 1.15 }, 140);

    assert.equal(self.pose.lElbow, 1.15);
    assert.equal('lElbow' in calls.at(-1), false);
});

test('a non-finite reported relationship is not trusted as a seed', () => {
    const { self } = wrestlerWithRenderedJoints({ lElbow: NaN });

    self.tweenPose({ ...BASE, lElbow: 1.15 }, 140);

    assert.equal(self.pose.lElbow, 1.15, 'falls back to the snap instead of seeding NaN');
});

test('a warm channel is untouched by seeding and still tweens from where it was', () => {
    const { self, calls } = wrestlerWithRenderedJoints({ lElbow: 0.70 });
    self.tweenPose({ ...BASE, lElbow: 0.30 }, 0);

    self.tweenPose({ ...BASE, lElbow: 1.15 }, 140);

    assert.equal(self.pose.lElbow, 0.30, 'the live value wins over the rendered relationship');
    assert.equal(calls.at(-1).lElbow, 1.15);
});

test('switching legacy absolute ownership to canonical local flex is continuous and exclusive', () => {
    const { self, calls } = wrestlerWithRenderedJoints({ lElbow: 0.76, lForearm: 0.80 });
    self.pose.lForearm = 0.80;

    self.tweenPose({ ...BASE, lElbow: 1.40 }, 180);

    assert.equal(self.pose.lElbow, 0.76, 'new local owner starts at the rendered relationship');
    assert.equal(self.pose.lForearm, undefined, 'legacy owner is removed before interpolation');
    assert.equal(calls.at(-1).lElbow, 1.40);
    assert.equal('lForearm' in calls.at(-1), false);
});

test('a legacy compatibility pose can take ownership back without fighting local flex', () => {
    const { self, calls } = wrestlerWithRenderedJoints({ lElbow: 1.10, lForearm: 1.25 });
    self.pose.lElbow = 1.10;

    self.tweenPose({ ...BASE, lForearm: 0.80 }, 180);

    assert.equal(self.pose.lForearm, 1.25, 'legacy owner starts at its equivalent rendered input');
    assert.equal(self.pose.lElbow, undefined, 'local owner is removed while compatibility content runs');
    assert.equal(calls.at(-1).lForearm, 0.80);
});

test('if both representations are authored, canonical local flex wins deterministically', () => {
    const { self, calls } = wrestlerWithRenderedJoints({ lElbow: 0.70, lForearm: 0.80 });

    self.tweenPose({ ...BASE, lElbow: 1.25, lForearm: -2.4 }, 180);

    assert.equal(calls.at(-1).lElbow, 1.25);
    assert.equal('lForearm' in calls.at(-1), false);
    assert.equal(self.pose.lForearm, undefined);
});

test('an omitted joint preserves its one current owner', () => {
    const { self } = wrestlerWithRenderedJoints({ lElbow: 0.70 });
    self.pose.lElbow = 0.95;

    self.tweenPose(BASE, 180);

    assert.equal(self.pose.lElbow, 0.95);
    assert.equal(self.pose.lForearm, undefined);
});
