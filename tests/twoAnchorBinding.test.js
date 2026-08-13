import test from 'node:test';
import assert from 'node:assert/strict';

import {
    solveAnchoredAttachment,
    solveTwoAnchorBinding,
    transformBoundPoint,
} from '../src/rig/twoAnchorBinding.js';

const canvas = { w: 120, h: 200 };
const proximal = { x: 47, y: 24 };
const distal = { x: 69, y: 168 };

test('two-anchor binding maps both endpoints exactly through rotation and both facings', () => {
    for (const facing of [1, -1]) {
        for (let angle = -Math.PI; angle <= Math.PI; angle += 0.19) {
            const length = 83;
            const a = { x: 17, y: -9 };
            const b = { x: a.x + Math.sin(angle) * length, y: a.y + Math.cos(angle) * length };
            const binding = solveTwoAnchorBinding({ canvas, proximal, distal, worldProximal: a, worldDistal: b, facing });
            const gotA = transformBoundPoint(binding, canvas, proximal, facing);
            const gotB = transformBoundPoint(binding, canvas, distal, facing);
            assert.ok(Math.hypot(gotA.x - a.x, gotA.y - a.y) < 1e-9);
            assert.ok(Math.hypot(gotB.x - b.x, gotB.y - b.y) < 1e-9);
        }
    }
});

test('off-axis authored anchors do not change the solved world joint', () => {
    const binding = solveTwoAnchorBinding({
        canvas,
        proximal,
        distal,
        worldProximal: { x: 100, y: 50 },
        worldDistal: { x: 140, y: 125 },
        facing: 1,
    });
    assert.notEqual(binding.skeletonAngle, Math.atan2(40, 75));
    const end = transformBoundPoint(binding, canvas, distal, 1);
    assert.ok(Math.hypot(end.x - 140, end.y - 125) < 1e-9);
});

test('swappable attachment keeps wrist fixed while semantic contact may move', () => {
    const wrist = { x: 80, y: 60 };
    const attachment = solveAnchoredAttachment({
        canvas: { w: 96, h: 96 }, anchor: { x: 48, y: 22 },
        worldAnchor: wrist, angle: 0.7, scale: 0.5, facing: -1,
    });
    for (const contact of [{ x: 60, y: 60 }, { x: 70, y: 54 }, { x: 63, y: 64 }]) {
        const point = transformBoundPoint(attachment, { w: 96, h: 96 }, contact, -1);
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
        assert.equal(attachment.x, wrist.x);
        assert.equal(attachment.y, wrist.y);
    }
});

test('coincident structural anchors fail loudly', () => {
    assert.throws(() => solveTwoAnchorBinding({
        canvas, proximal, distal: proximal,
        worldProximal: { x: 0, y: 0 }, worldDistal: { x: 0, y: 10 }, facing: 1,
    }), /must not coincide/);
});
