// PLAN_GRAPPLES T1.2: the flag is opt-in, and holdGrips takes a world point (`at`) in place of a partner joint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { grapplesCandidate } from '../src/Wrestler.js';

const withSearch = (search, fn) => {
    globalThis.location = { search };
    try { return fn(); } finally { delete globalThis.location; }
};

test('grapples is opt-in: off without location, off by default, on only for grapples=v1', () => {
    assert.equal(grapplesCandidate(), false);
    assert.equal(withSearch('', grapplesCandidate), false);
    assert.equal(withSearch('?getups=v1', grapplesCandidate), false);
    assert.equal(withSearch('?grapples=off', grapplesCandidate), false);
    assert.equal(withSearch('?grapples=v1', grapplesCandidate), true);
});

// A two-bone near arm that a pose channel turns, so holdGrips' own IK is exercised without Phaser.
function armed() {
    const S = { x: 100, y: 200 }, lu = 40, lf = 40;
    const w = Object.assign(Object.create(Wrestler.prototype), { facing: 1, pose: { lArm: 0.5, lElbow: 0.3 } });
    const points = {};
    w.skeleton = { jointAttachmentPoints: points, lChannelSide: () => 'near' };
    w.draw = () => {
        const a = w.pose.lArm, e = w.pose.lElbow;
        points.nearShoulder = S;
        points.nearElbow = { x: S.x + lu * Math.cos(a), y: S.y + lu * Math.sin(a) };
        points.nearWrist = { x: points.nearElbow.x + lf * Math.cos(a + e), y: points.nearElbow.y + lf * Math.sin(a + e) };
    };
    w.draw();
    return w;
}

test('holdGrips with `at` brings the wrist onto the world point; weight 0.5 goes halfway', () => {
    const w = armed();
    const target = { x: 150, y: 250 };
    w.holdGrips([{ arm: 'l', partner: null, joint: 'Neck', side: 'same', at: target, w: 1 }]);
    const W = w.skeleton.jointAttachmentPoints.nearWrist;
    assert.ok(Math.hypot(W.x - target.x, W.y - target.y) < 0.6, `${W.x},${W.y}`);

    const h = armed();
    const W0 = { ...h.skeleton.jointAttachmentPoints.nearWrist };
    h.holdGrips([{ arm: 'l', partner: null, joint: 'Neck', side: 'same', at: target, w: 0.5 }]);
    const W1 = h.skeleton.jointAttachmentPoints.nearWrist;
    const want = { x: (W0.x + target.x) / 2, y: (W0.y + target.y) / 2 };
    assert.ok(Math.hypot(W1.x - want.x, W1.y - want.y) < 0.6, `${W1.x},${W1.y} vs ${want.x},${want.y}`);
});

test('holdGrips without `at` still reads the partner joint (unchanged)', () => {
    const w = armed();
    const partner = { skeleton: { jointAttachmentPoints: { nearElbow: { x: 150, y: 250 } } } };
    w.holdGrips([{ arm: 'l', partner, joint: 'Elbow', side: 'same', w: 1 }]);
    const W = w.skeleton.jointAttachmentPoints.nearWrist;
    assert.ok(Math.hypot(W.x - 150, W.y - 250) < 0.6);
});
