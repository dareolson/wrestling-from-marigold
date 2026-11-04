// PLAN_GRAPPLES T4c.4g: a clip's `carry` puts one man's pelvis at a fixed point in the other's torso frame and turns him with the carrier's lean. The
// draw is a stand-in with the Skeleton's contract (tilt about the hips, lift raises in screen y, scaled), so the maths is checked in node; the browser
// check is tools/debug/waistlock_throws_assert.mjs and the r4 page.
import test from 'node:test';
import assert from 'node:assert/strict';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { compileClip, validateClip } from '../src/animation/AnimationClip.js';
import { atomicDropClip } from '../src/animation/clips/atomicDrop.js';
import { torsoFrame, toFrame, fromFrame, leanFromVertical, pelvisOf } from '../src/animation/carry.js';

// A man whose drawn joints come from x, y, facing, pose.tilt (forward-positive about the hips), pose.lift and a fixed 60 px torso. `scale` px per lift unit.
function man(x, y, facing, scale = 0.8) {
    const w = {
        x, y, facing, pose: { tilt: 0, lift: 0 }, skeleton: { jointAttachmentPoints: {}, setPartVariants() {} }, draws: 0,
        applyAnimationSample(sample) { Object.assign(this.pose, sample.pose ?? {}); if (sample.transform?.x !== undefined) this._tx = sample.transform.x; },
        draw() {
            this.draws++;
            const hipY = this.y - this.pose.lift * scale, a = this.facing * (this.pose.tilt ?? 0);
            const hip = { x: this.x, y: hipY }, neck = { x: this.x + Math.sin(a) * 60, y: hipY - Math.cos(a) * 60 };
            this.skeleton.jointAttachmentPoints = { nearHip: { ...hip }, farHip: { ...hip }, neck };
        },
    };
    w.draw();
    return w;
}
const clip = (carry) => compileClip({
    id: 'carryTest', duration: 1,
    tracks: { carrier: { keyframes: [{ at: 0, pose: { tilt: 0 } }, { at: 1, pose: { tilt: -0.5 } }] }, rider: { keyframes: [{ at: 0, pose: { tilt: 0, lift: 0 } }, { at: 1, pose: { tilt: 0, lift: 0 } }] } },
    carry,
});

test('torso frame maths: toFrame and fromFrame invert, and lean is facing-relative, negative leaning back', () => {
    for (const facing of [1, -1]) {
        const w = man(100, 300, facing); w.pose.tilt = -0.4; w.draw();
        const p = w.skeleton.jointAttachmentPoints, f = torsoFrame(p, facing);
        const q = { x: 123, y: 217 }, back = fromFrame(f, toFrame(f, q));
        assert.ok(Math.hypot(back.x - q.x, back.y - q.y) < 1e-9);
        assert.ok(Math.abs(leanFromVertical(p, facing) - -0.4) < 1e-9, `${facing}`);
        assert.ok(toFrame(f, { x: f.o.x + facing * 10, y: f.o.y }).across > 0, 'across is toward the way he faces');
    }
});

test('validateClip: carry needs two different tracks, a tilt ratio and a window', () => {
    const base = { id: 'x', duration: 1, tracks: { a: { keyframes: [{ at: 0, pose: {} }] }, b: { keyframes: [{ at: 0, pose: {} }] } } };
    assert.equal(validateClip({ ...base, carry: [{ role: 'a', on: 'b', tilt: 1.3, in: [0, 0.1], out: [0.5, 0.6] }] }).ok, true);
    assert.equal(validateClip({ ...base, carry: [{ role: 'a', on: 'a', tilt: 1, in: [0, 0.1], out: [0.5, 0.6] }] }).ok, false);
    assert.equal(validateClip({ ...base, carry: [{ role: 'a', on: 'b', tilt: 'x', in: [0, 0.1], out: [0.5, 0.6] }] }).ok, false);
    assert.equal(validateClip({ ...base, carry: [{ role: 'a', on: 'b', in: [0.5, 0.1], out: [0.5, 0.6] }] }).ok, false);
});

test('a carried man stays at one spot in the carrier\'s torso frame while the carrier leans, and leans back with him by the ratio; both facings', () => {
    for (const facing of [1, -1]) {
        const runtime = new MoveRuntime(), carrier = man(300, 360, facing), rider = man(300 + facing * 40, 360, facing);
        runtime.register(clip([{ role: 'rider', on: 'carrier', tilt: 1.3, in: [0, 0.05], out: [0.8, 0.9] }]));
        runtime.play('carryTest', { carrier, rider });
        const frames = [];
        for (let i = 0; i < 40; i++) {
            runtime.update(1 / 60); carrier.draw(); rider.draw(); runtime.afterDraw();
            frames.push({ t: (i + 1) / 60, a: toFrame(torsoFrame(carrier.skeleton.jointAttachmentPoints, facing), pelvisOf(rider.skeleton.jointAttachmentPoints)), carrierLean: leanFromVertical(carrier.skeleton.jointAttachmentPoints, facing), riderLean: leanFromVertical(rider.skeleton.jointAttachmentPoints, facing) });
        }
        const full = frames.filter(f => f.t > 0.1);
        for (const f of full) {
            assert.ok(Math.abs(f.a.along - full[0].a.along) < 0.5 && Math.abs(f.a.across - full[0].a.across) < 0.5, `pelvis fixed in his torso frame at ${f.t}`);
            assert.ok(Math.abs(f.riderLean - 1.3 * f.carrierLean) < 1e-6, `tilt ratio at ${f.t}`);
        }
        assert.ok(full.at(-1).carrierLean < -0.1, 'the carrier did lean back');
    }
});

test('outside its window the carry does nothing: no redraws, the sampled pose stands', () => {
    const runtime = new MoveRuntime(), carrier = man(300, 360, 1), rider = man(340, 360, 1);
    runtime.register(clip([{ role: 'rider', on: 'carrier', tilt: 1.3, in: [0.5, 0.6], out: [0.7, 0.8] }]));
    runtime.play('carryTest', { carrier, rider });
    const before = rider.draws, x = rider.x;
    for (let i = 0; i < 20; i++) { runtime.update(1 / 60); runtime.afterDraw(); }
    assert.equal(rider.draws, before);
    assert.equal(rider.x, x);
});

test('the atomic drop carries the defender and leaves his lift track at zero while the torso carry holds him (the thigh carry takes over from its release)', () => {
    assert.equal(atomicDropClip.carry.length, 2, 'the torso carry, then the hand-over to the raised thigh (T4c.4j)');
    const c = atomicDropClip.carry[0];
    assert.equal(c.role, 'defender'); assert.equal(c.on, 'attacker'); assert.ok(c.tilt > 1 && c.tilt < 1.5);
    for (const k of atomicDropClip.tracks.defender.keyframes.filter(k => k.at >= c.in[0] && k.at <= c.out[0])) assert.equal(k.pose.lift ?? 0, 0, `lift at ${k.at}`);
});
