import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import { backRiseWeight } from '../src/animation/backRisePerformance.js';
import { JOINT_LIMITS } from '../src/rig/articulation.js';

test('protective back rise has smooth zero endpoints and a deliberate contact hold', () => {
    for (const t of [-1, 0, 1, 1.5, NaN]) assert.equal(backRiseWeight(t), 0);
    for (const t of [0.18, 0.3, 0.55, 0.7]) assert.equal(backRiseWeight(t), 1);
    assert.ok(backRiseWeight(0.1) > 0 && backRiseWeight(0.1) < 1);
    for (const t of [0.75, 0.85, 0.95, 0.999]) assert.ok(backRiseWeight(t) > 0 && backRiseWeight(t) < 1, `eases out late, t=${t}`);
});

test('get-up keeps original endpoint geometry and only adds a supine back reach', () => {
    const base = [], reaches = [];
    const sk = {
        _lockLimbJoints: false,
        _applyGrounded: (...a) => base.push(structuredClone(a[5])),
        updateGroundedReach: (...a) => reaches.push(a),
    };
    const draw = (t, lying, pain) => Skeleton.prototype.updateGetUp.call(sk, 10, 30, 1, 1, t, lying, pain);
    for (const t of [0, 1]) {
        draw(t, 'supine'); const reference = base.at(-1);
        draw(t, 'supine', { part: 'back', severity: 1 });
        assert.deepEqual(base.at(-1), reference);
    }
    draw(0.35, 'supine', { part: 'back', severity: 0.8 });
    assert.equal(reaches.length, 1);
    assert.deepEqual(reaches[0][5], { near: { to: 'nearHip', w: 0.8 } });
    assert.deepEqual(reaches[0][6], { paintedContacts: true, backContact: true });
    for (const [lying, pain] of [['prone', { part: 'back', severity: 1 }],
        ['supine', { part: 'knee', severity: 1 }], ['supine', { part: 'back', severity: 0 }]]) draw(0.35, lying, pain);
    assert.equal(reaches.length, 1);
});

test('painted hand landmark follows the actual image transform, origin and flips', () => {
    const image = {
        frame: { realWidth: 100, realHeight: 200 }, displayOriginX: 50, displayOriginY: 20,
        getWorldTransformMatrix: () => ({ a: 0, b: 2, c: -3, d: 0, tx: 10, ty: 30 }),
    };
    assert.deepEqual(Skeleton.imageAnchorPoint(image, { u: 0.7, v: 0.4 }), { x: -170, y: 70 });
    image.flipX = true;
    const flipped = Skeleton.imageAnchorPoint(image, { u: 0.7, v: 0.4 });
    assert.ok(Math.abs(flipped.x + 170) < 1e-9 && Math.abs(flipped.y + 10) < 1e-9);
    assert.equal(Skeleton.imageAnchorPoint({}, { u: 0.7, v: 0.4 }), null);
});

test('offset palm contact reserves enough angular budget for the real forearm fold', () => {
    for (const facing of [1, -1]) for (const offset of [-0.16, 0, 0.16]) {
        const S = { x: 0, y: 0 }, max = JOINT_LIMITS.elbow.max - Math.abs(offset);
        const { elbow, hand } = Skeleton.solveReachArm(S, 40, 45, { x: facing * 5, y: 0 }, null, -facing, max);
        const up = Math.atan2(elbow.y, elbow.x);
        const fore = Math.atan2(hand.y - elbow.y, hand.x - elbow.x) - offset;
        const fold = Math.abs(Math.atan2(Math.sin(fore - up), Math.cos(fore - up)));
        assert.ok(fold <= JOINT_LIMITS.elbow.max + 1e-9);
    }
});
