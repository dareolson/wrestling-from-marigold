// PLAN_GETUPS Rev 8 T4.3: a knee never goes past straight on the mat under ?getups=v1. The real Skeleton._applyGrounded runs with its
// placement helpers recorded (Node has no Phaser parts): the claim is bounded to the thigh and shin angles each leg is drawn with
// (_recordJointAttachment 'Hip' / 'Knee' get the thigh's and the shin's drawn angle). Past straight = shin channel - thigh channel > 0
// (tools/debug/getups_knee.mjs); the channels are facing-independent, `ang` mirrors both, so it is the same for both facings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';

const noop = () => {};
const img = (name) => ({ name });

function grounded(on, facing, g) {
    const rec = {};
    const sk = Object.assign(Object.create(Skeleton.prototype), {
        _thighH: 40, _shinH: 40, _upperArmH: 30, _forearmH: 30, _torsoH: 60, _lockLimbJoints: false, _headIsImage: false, jointAttachmentPoints: {},
        head: { clear: noop, fillStyle: noop, fillCircle: noop, setPosition() { return this; }, setRotation() { return this; } }, torso: img('torso'),
        farThigh: img('farThigh'), farShin: img('farShin'), farBoot: null, nearThigh: img('nearThigh'), nearShin: img('nearShin'), nearBoot: null,
        farUpArm: img('farUpArm'), farForearm: img('farForearm'), nearUpArm: img('nearUpArm'), nearForearm: img('nearForearm'), farHand: img('fh'), nearHand: img('nh'),
        _getUps: on,
        _placePart: noop, _place: noop, _placeLimbPart: noop, _placeAttachment: () => true, _attachChild: (c, x, y) => ({ x, y }),
        _tuckBound: () => [{ x: 0, y: 0 }, { x: 0, y: 0 }], _kneeTuckPx: () => 0, _trueDistalEnd: (i, x, y) => ({ x, y }),
        _recordJointAttachment(name, _c, _x, _y, angle) { rec[name] = angle; },
    });
    sk._applyGrounded(100, 300, 1, facing, g);
    return rec;
}
const pose = (o = {}) => ({ hip: 20, torso: Math.PI + 1.5, farThigh: 1.45, farShin: 1.6, nearThigh: 1.38, nearShin: 1.53, farArm: 0, farFore: 0, nearArm: 0, nearFore: 0, ...o });

test('T4.3: a knee past straight is drawn straight: the shin takes the thigh\'s angle, the thigh keeps its own (both facings, both legs)', () => {
    for (const facing of [1, -1]) {
        const g = pose(), r = grounded(true, facing, g);
        assert.equal(r.farHip, facing * g.farThigh); assert.equal(r.nearHip, facing * g.nearThigh);
        assert.equal(r.farKnee, facing * g.farThigh, `far, facing ${facing}`);
        assert.equal(r.nearKnee, facing * g.nearThigh, `near, facing ${facing}`);
    }
});

test('T4.3: the convention is the audit tool\'s: the lying pose and the supine get-up table are past straight by shin - thigh > 0, and come out at 0', () => {
    for (const [name, p] of [['FALLS.backward end', Skeleton._sampleKeyposes(Skeleton.FALLS.backward.keys, 1)], ['FALLS.flip end', Skeleton._sampleKeyposes(Skeleton.FALLS.flip.keys, 1)],
        ['GETUP_SUPINE 0.34', Skeleton._sampleKeyposes(Skeleton.GETUP_SUPINE_POSES, 0.34)]]) {
        assert.ok(p.nearShin - p.nearThigh > 0 && p.farShin - p.farThigh > 0, `${name} is past straight in the table`);
        for (const facing of [1, -1]) {
            const on = grounded(true, facing, { ...pose(), ...p }), off = grounded(false, facing, { ...pose(), ...p });
            assert.equal(on.nearKnee - on.nearHip, 0, `${name} near ${facing}`); assert.equal(on.farKnee - on.farHip, 0, `${name} far ${facing}`);
            assert.ok(Math.abs(off.nearKnee - off.nearHip) > 0.1, `${name}: flag off keeps the authored angle`);
        }
    }
});

test('T4.3: a bent knee, and an exactly straight one, are untouched', () => {
    for (const facing of [1, -1]) for (const shinDelta of [-2.3, -1.0, -0.05, 0]) {
        const g = pose({ farShin: 1.45 + shinDelta, nearShin: 1.38 + shinDelta }), r = grounded(true, facing, g);
        assert.equal(r.farKnee, facing * g.farShin); assert.equal(r.nearKnee, facing * g.nearShin);
    }
});

test('T4.3: one leg at a time: only the leg past straight moves', () => {
    const g = pose({ farShin: 1.0 }), r = grounded(true, 1, g);
    assert.equal(r.farKnee, g.farShin, 'far is bent, untouched');
    assert.equal(r.nearKnee, g.nearThigh, 'near was past straight, now straight');
});

test('T4.3: flag off (and an unset flag) draws the authored angles', () => {
    for (const on of [false, undefined]) for (const facing of [1, -1]) {
        const g = pose(), r = grounded(on, facing, g);
        assert.equal(r.farKnee, facing * g.farShin); assert.equal(r.nearKnee, facing * g.nearShin);
    }
});
