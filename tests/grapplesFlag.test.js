// PLAN_GRAPPLES T1.2 / T5.3: the flag is on by default (off with ?grapples=off), and holdGrips takes a world point (`at`) in place of a partner joint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { grapplesCandidate } from '../src/Wrestler.js';
import { CLASP_REACH } from '../src/animation/clasps.js';

const withSearch = (search, fn) => {
    globalThis.location = { search };
    try { return fn(); } finally { delete globalThis.location; }
};

test('grapples is on by default in the game: absent and =v1 are on, any other value is off, no location is off', () => {
    assert.equal(grapplesCandidate(), false, 'Node with no location');
    assert.equal(withSearch('', grapplesCandidate), true);
    assert.equal(withSearch('?getups=v1', grapplesCandidate), true);
    assert.equal(withSearch('?grapples=v1', grapplesCandidate), true);
    assert.equal(withSearch('?grapples=off', grapplesCandidate), false);
    assert.equal(withSearch('?grapples=1', grapplesCandidate), false);
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

test('the clasp reach cap needs the art on: no art or a subthreshold grip solves as an unlabelled one, art on stops at CLASP_REACH', () => {
    const far = { x: 100 + 200, y: 200 };   // out of reach of an 80 px arm
    const solve = (grip, sel) => {
        const w = armed();
        w._claspSel = sel;
        w.holdGrips([{ arm: 'l', partner: null, joint: 'Neck', side: 'same', at: far, w: 1, ...grip }]);
        const p = w.skeleton.jointAttachmentPoints;
        return { pose: { ...w.pose }, reach: Math.hypot(p.nearWrist.x - p.nearShoulder.x, p.nearWrist.y - p.nearShoulder.y), flex: w.pose.lElbow };
    };
    const plain = solve({}, null);
    assert.deepEqual(solve({ clasp: 'collarTie' }, null).pose, plain.pose, 'a rig with no such art');
    assert.deepEqual(solve({ clasp: 'collarTie' }, { farForearm: 'collarTie' }).pose, plain.pose, 'the art is on the other arm');
    assert.deepEqual(solve({ clasp: 'bicepGrip' }, { nearForearm: 'collarTie' }).pose, plain.pose, 'the art on is another label\'s');
    const on = solve({ clasp: 'collarTie' }, { nearForearm: 'collarTie' }), via = solve({ clasp: 'bicepGrip' }, { nearForearm: 'elbowCup' });
    assert.deepEqual(via.pose, on.pose, 'bicepGrip is held in the elbowCup art');
    assert.ok(on.reach <= 80 * CLASP_REACH + 0.01, `drawn reach ${on.reach}`);
    assert.ok(plain.reach > on.reach, `${plain.reach} vs ${on.reach}`);
});
