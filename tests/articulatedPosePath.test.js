import test from 'node:test';
import assert from 'node:assert/strict';

import Wrestler from '../src/Wrestler.js';
import Skeleton from '../src/Skeleton.js';

function wrestlerWithImmediateTween() {
    const calls = [];
    const self = Object.assign(Object.create(Wrestler.prototype), {
        pose: { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 },
        _activeMove: null,
        _choreoUntil: 0,
        scene: {
            tweens: {
                killTweensOf() {},
                add(config) {
                    calls.push(config);
                    for (const [key, value] of Object.entries(config)) {
                        if (Number.isFinite(value)) config.targets[key] = value;
                    }
                    config.onComplete?.();
                },
            },
        },
    });
    return { self, calls };
}

// Asserts the outcome this test is named for — the authored values end up on
// the live pose. It deliberately does NOT require them to travel via the tween
// config: a channel the live pose has never carried is snapped instead, because
// tweening it would interpolate from `undefined` and yield NaN (see
// tests/articulatedColdStart.test.js). The warm case below covers the config.
test('legacy tweenPose carries authored elbow and knee channels into the live pose', () => {
    const { self } = wrestlerWithImmediateTween();
    self.tweenPose({
        lLeg: 0.1, rLeg: -0.1, lArm: 0.2, rArm: -0.2,
        lForearm: 1.1, rForearm: -0.7, lShin: 0.65, rShin: -0.45,
    }, 100);
    assert.equal(self.pose.lForearm, 1.1);
    assert.equal(self.pose.rForearm, -0.7);
    assert.equal(self.pose.lShin, 0.65);
    assert.equal(self.pose.rShin, -0.45);
});

test('an already-live legacy channel is handed to the tween itself', () => {
    const { self, calls } = wrestlerWithImmediateTween();
    self.tweenPose({ lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lForearm: 0.4, lShin: 0.1 }, 0);
    self.tweenPose({
        lLeg: 0.1, rLeg: -0.1, lArm: 0.2, rArm: -0.2, lForearm: 1.1, lShin: 0.65,
    }, 100);
    const config = calls.at(-1);
    assert.equal(config.lForearm, 1.1);
    assert.equal(config.lShin, 0.65);
});

test('articulated pose channels change the exact world endpoints consumed by rendering', () => {
    const shoulder = { x: 100, y: 80 };
    const hip = { x: 100, y: 180 };
    const elbow = Skeleton.prototype._end(shoulder.x, shoulder.y, 50, 0.2);
    const knee = Skeleton.prototype._end(hip.x, hip.y, 55, -0.15);
    const straightWrist = Skeleton.prototype._end(elbow.x, elbow.y, 45, 0.2);
    const authoredWrist = Skeleton.prototype._end(elbow.x, elbow.y, 45, 1.1);
    const straightAnkle = Skeleton.prototype._end(knee.x, knee.y, 50, -0.15);
    const authoredAnkle = Skeleton.prototype._end(knee.x, knee.y, 50, 0.65);
    assert.ok(Math.hypot(authoredWrist.x - straightWrist.x, authoredWrist.y - straightWrist.y) > 30);
    assert.ok(Math.hypot(authoredAnkle.x - straightAnkle.x, authoredAnkle.y - straightAnkle.y) > 30);
});

test('seekable samples and legacy tweens agree on articulated channel ownership', () => {
    const { self } = wrestlerWithImmediateTween();
    self.skeleton = { setPartVariants() {} };
    self.facing = 1;
    self.tweenPose({ lForearm: 0.9, lShin: -0.4 }, 0);
    self.applyAnimationSample({ pose: { rForearm: -1.2, rShin: 0.7 } });
    assert.deepEqual(
        { lForearm: self.pose.lForearm, rForearm: self.pose.rForearm, lShin: self.pose.lShin, rShin: self.pose.rShin },
        { lForearm: 0.9, rForearm: -1.2, lShin: -0.4, rShin: 0.7 },
    );
});

test('local elbow/knee channels survive tweenPose transport', () => {
    const { self } = wrestlerWithImmediateTween();
    self.tweenPose({ lElbow: Math.PI / 2, rElbow: 2.2, lKnee: 0.6, rKnee: 1.8 }, 100);
    assert.equal(self.pose.lElbow, Math.PI / 2);
    assert.equal(self.pose.rElbow, 2.2);
    assert.equal(self.pose.lKnee, 0.6);
    assert.equal(self.pose.rKnee, 1.8);
});

test('an already-live local channel is handed to the tween itself', () => {
    const { self, calls } = wrestlerWithImmediateTween();
    self.tweenPose({ lElbow: 0.3, lKnee: 0.2 }, 0);
    self.tweenPose({ lElbow: Math.PI / 2, lKnee: 1.8 }, 100);
    const config = calls.at(-1);
    assert.equal(config.lElbow, Math.PI / 2);
    assert.equal(config.lKnee, 1.8);
});
