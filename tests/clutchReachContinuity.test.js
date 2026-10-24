import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import { JOINT_LIMITS } from '../src/rig/articulation.js';

test('grounded clutch hinge stays on its branch when the hand crosses the torso axis', () => {
    const S = { x: 0, y: 0 };
    for (const facing of [1, -1]) for (const [lu, lf] of [[50, 50], [40, 60], [60, 35]]) {
        let previous = null;
        for (let i = -100; i <= 100; i++) {
            const angle = i / 10000;
            const goal = { x: facing * 60 * Math.cos(angle), y: 60 * Math.sin(angle) };
            const { elbow, hand } = Skeleton.solveReachArm(S, lu, lf, goal, { x: facing, y: 0 }, -facing);
            const a = { x: elbow.x - S.x, y: elbow.y - S.y };
            const b = { x: hand.x - elbow.x, y: hand.y - elbow.y };
            const fold = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
            assert.ok(fold * -facing > 0, 'an elbow cannot change hinge branch during the reach');
            assert.ok(Math.abs(fold) <= JOINT_LIMITS.elbow.max + 1e-9);
            assert.ok(Math.hypot(hand.x - goal.x, hand.y - goal.y) < 1e-8);
            if (previous) assert.ok(Math.hypot(elbow.x - previous.x, elbow.y - previous.y) < 0.02, 'continuous target must not produce an elbow pop');
            previous = elbow;
        }
    }
});

test('a reach across the shoulder follows an arc and preserves both endpoints', () => {
    const S = { x: 15, y: -8 };
    const start = { x: 15, y: 72 }, target = { x: 15, y: -48 };
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    assert.ok(distance(Skeleton.blendReachTarget(S, start, target, 0), start) < 1e-9);
    assert.ok(distance(Skeleton.blendReachTarget(S, start, target, 1), target) < 1e-9);
    let previous = null;
    for (let i = 0; i <= 240; i++) {
        const goal = Skeleton.blendReachTarget(S, start, target, i / 240);
        assert.ok(distance(goal, S) >= 40 - 1e-9, 'the hand must not cross the shoulder singularity');
        if (previous) assert.ok(distance(goal, previous) < 1.1);
        previous = goal;
    }
});

test('curved reach mirrors with facing and stays finite at a shoulder target', () => {
    const S = { x: 0, y: 0 };
    for (let i = 0; i <= 20; i++) {
        const w = i / 20;
        const a = Skeleton.blendReachTarget(S, { x: 25, y: 60 }, { x: 15, y: -30 }, w);
        const b = Skeleton.blendReachTarget(S, { x: -25, y: 60 }, { x: -15, y: -30 }, w);
        assert.ok(Math.abs(a.x + b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9);
        for (const start of [S, { x: 30, y: 40 }]) {
            const p = Skeleton.blendReachTarget(S, start, S, w);
            assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
        }
    }
});

test('head reach keeps its authored direction when endpoints cross the antipodal seam', () => {
    for (const facing of [1, -1]) {
        const S = { x: 0, y: 0 }, start = { x: facing * 60, y: 0 };
        const a = Skeleton.blendReachTarget(S, start, { x: -facing * 40, y: -0.01 }, 0.4, -facing);
        const b = Skeleton.blendReachTarget(S, start, { x: -facing * 40, y: 0.01 }, 0.4, -facing);
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.02, 'the hand must not jump to the other side of the shoulder');
    }
});
