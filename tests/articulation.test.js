import test from 'node:test';
import assert from 'node:assert/strict';

import {
    childAngleFromLocalFlex,
    clampLocalFlex,
    JOINT_LIMITS,
    MANNEQUIN_ARTICULATION_MATRIX,
} from '../src/rig/articulation.js';
import Skeleton from '../src/Skeleton.js';
import { solveTwoAnchorBinding, transformBoundPoint } from '../src/rig/twoAnchorBinding.js';

const end = (root, length, angle) => Skeleton.prototype._end(root.x, root.y, length, angle);

test('changing local elbow flex fixes shoulder/elbow and moves only the wrist', () => {
    const shoulder = { x: 100, y: 80 }, upperAngle = 0.45;
    const elbow = end(shoulder, 60, upperAngle);
    const wristA = end(elbow, 50, childAngleFromLocalFlex(upperAngle, 0.1, 1, 'elbow'));
    const wristB = end(elbow, 50, childAngleFromLocalFlex(upperAngle, 1.8, 1, 'elbow'));
    assert.deepEqual(end(shoulder, 60, upperAngle), elbow);
    assert.ok(Math.hypot(wristA.x - wristB.x, wristA.y - wristB.y) > 60);
});

test('changing shoulder carries elbow and wrist while preserving local flex', () => {
    const shoulder = { x: 40, y: 50 }, flex = 1.2;
    const chain = angle => {
        const elbow = end(shoulder, 60, angle);
        return { elbow, wrist: end(elbow, 50, childAngleFromLocalFlex(angle, flex, 1, 'elbow')) };
    };
    const a = chain(-0.4), b = chain(1.1);
    assert.ok(Math.hypot(a.elbow.x - b.elbow.x, a.elbow.y - b.elbow.y) > 70);
    assert.ok(Math.hypot(a.wrist.x - b.wrist.x, a.wrist.y - b.wrist.y) > 100);
});

test('local articulation mirrors without bend inversion', () => {
    const root = { x: 0, y: 0 }, parent = 0.35, flex = 1.4;
    const right = end(root, 50, childAngleFromLocalFlex(parent, flex, 1, 'elbow'));
    const left = end(root, 50, childAngleFromLocalFlex(-parent, flex, -1, 'elbow'));
    assert.ok(Math.abs(right.x + left.x) < 1e-9);
    assert.ok(Math.abs(right.y - left.y) < 1e-9);
});

test('elbow and knee limits prevent hyperextension and overfolding', () => {
    assert.equal(clampLocalFlex(-99, 'elbow'), JOINT_LIMITS.elbow.min);
    assert.equal(clampLocalFlex(99, 'elbow'), JOINT_LIMITS.elbow.max);
    assert.equal(clampLocalFlex(-99, 'knee'), JOINT_LIMITS.knee.min);
    assert.equal(clampLocalFlex(99, 'knee'), JOINT_LIMITS.knee.max);
});

test('mannequin articulation matrix includes visibly distinct combat configurations', () => {
    assert.deepEqual(Object.keys(MANNEQUIN_ARTICULATION_MATRIX), ['extended', 'guard90', 'deepFlex', 'overhead']);
    assert.ok(MANNEQUIN_ARTICULATION_MATRIX.guard90.elbow > 1.5);
    assert.ok(MANNEQUIN_ARTICULATION_MATRIX.deepFlex.elbow > 2.4);
    assert.ok(MANNEQUIN_ARTICULATION_MATRIX.overhead.shoulder > 2.5);
});

test('articulation-matrix extremes keep forearm proximal anchor exactly on elbow', () => {
    const canvas = { w: 110, h: 180 };
    const proximal = { x: 55, y: 24 }, distal = { x: 55, y: 154 };
    const shoulder = { x: 20, y: 30 };
    for (const facing of [1, -1]) for (const pose of Object.values(MANNEQUIN_ARTICULATION_MATRIX)) {
        const upper = facing * pose.shoulder;
        const elbow = end(shoulder, 60, upper);
        const wrist = end(elbow, 50, childAngleFromLocalFlex(upper, pose.elbow, facing, 'elbow'));
        const binding = solveTwoAnchorBinding({ canvas, proximal, distal, worldProximal: elbow, worldDistal: wrist, facing });
        const mapped = transformBoundPoint(binding, canvas, proximal, facing);
        assert.ok(Math.hypot(mapped.x - elbow.x, mapped.y - elbow.y) < 1e-9);
    }
});
