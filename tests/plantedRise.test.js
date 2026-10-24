// ?sellart=v1 support-hand plant during the supine back rise (PLAN_SUPLEX_RISE D1/T2.2).
// Node has no Phaser parts, so a stub forward-kinematics _applyGrounded stands in for
// the rig: the REAL updateGetUp / updateGroundedReach / solveReachArm run on top of it.
// Real-rig numbers (slide, elbow, reach) come from tools/debug/sell_art_rise_measure.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';
import { PLANT, plantWeight } from '../src/animation/backRisePerformance.js';
import { JOINT_LIMITS } from '../src/rig/articulation.js';

const LU = 36, LF = 36, TORSO = 60;
function rig() {
    const sk = Object.create(Skeleton.prototype);
    Object.assign(sk, { _lockLimbJoints: false, calls: [] });
    sk._applyGrounded = function (x, y, s, facing, g) {
        const f = facing >= 0 ? 1 : -1, dir = a => ({ x: Math.sin(f * a), y: Math.cos(f * a) });
        const hip = { x, y: y - g.hip * s }, tdir = dir(g.torso);
        const S = { x: hip.x + tdir.x * TORSO * s, y: hip.y + tdir.y * TORSO * s };
        const arm = (a, b) => {
            const E = { x: S.x + dir(a).x * LU * s, y: S.y + dir(a).y * LU * s };
            return [E, { x: E.x + dir(b).x * LF * s, y: E.y + dir(b).y * LF * s }];
        };
        const [fe, fw] = arm(g.farArm, g.farFore), [ne, nw] = arm(g.nearArm, g.nearFore);
        this.jointAttachmentPoints = { neck: S, nearHip: hip, farHip: hip, nearShoulder: S, farShoulder: S,
            nearElbow: ne, nearWrist: nw, farElbow: fe, farWrist: fw };
        this.calls.push({ x, y, s, facing, g: { ...g }, far: { S, E: fe, W: fw } });
    };
    return sk;
}
const BACK = { part: 'back', severity: 1, plant: true };
const rise = (sk, facing, t, pain) => { Skeleton.prototype.updateGetUp.call(sk, 400, 430, 1, facing, t, 'supine', pain); return sk.calls.at(-1); };
const tLiftOf = sk => sk._plantPlan(1, Skeleton.GETUP_SUPINE_POSES).tLift;
const flex = (S, E, W, facing) => {
    const a = Math.atan2(E.x - S.x, E.y - S.y), b = Math.atan2(W.x - E.x, W.y - E.y);
    return Math.atan2(Math.sin(b - a), Math.cos(b - a)) * facing;
};

test('plant weight is zero outside the window, smooth, and 1 between arrival and push-off', () => {
    const lift = 0.34;
    for (const t of [-1, 0, PLANT.t0, lift + PLANT.outSpan, 0.9, 1, NaN]) assert.equal(plantWeight(t, lift), 0);
    assert.equal(plantWeight(0.3, lift), 1);
    assert.ok(plantWeight(PLANT.t0 + 0.02, lift) > 0 && plantWeight(PLANT.t0 + 0.02, lift) < 1);
    assert.ok(plantWeight(lift + 0.04, lift) > 0 && plantWeight(lift + 0.04, lift) < 1);
});

test('the contact stays within 0.5 px of the plant across [t0+0.05, tLift], both facings', () => {
    for (const facing of [1, -1]) {
        const sk = rig(), lift = tLiftOf(sk);
        assert.ok(lift > PLANT.t0 + 0.1 && lift <= PLANT.t1, `window exists (tLift ${lift})`);
        const pts = [];
        for (let t = PLANT.t0 + PLANT.inSpan; t <= lift + 1e-9; t += 0.01) pts.push(rise(sk, facing, t, BACK).far.W);
        const mid = pts[Math.floor(pts.length / 2)];
        for (const p of pts) assert.ok(Math.hypot(p.x - mid.x, p.y - mid.y) < 0.5, `slide ${Math.hypot(p.x - mid.x, p.y - mid.y)}`);
        assert.ok(Math.abs(mid.y - 430) < 0.5, 'planted on the mat line');
    }
});

test('facing mirrors the plant about the root', () => {
    const sk = rig(), t = 0.25;
    const a = rise(sk, 1, t, BACK).far.W, b = rise(sk, -1, t, BACK).far.W;
    assert.ok(Math.abs((a.x - 400) + (b.x - 400)) < 1e-6 && Math.abs(a.y - b.y) < 1e-6);
});

test('t = 0 and t = 1 poses are unchanged by the plant', () => {
    for (const facing of [1, -1]) for (const t of [0, 1]) {
        const sk = rig();
        const ref = rise(sk, facing, t, null).g, planted = rise(sk, facing, t, BACK).g;
        assert.deepEqual(planted, ref);
    }
});

test('elbow folds the anatomical way inside the window and never past its limit', () => {
    for (const facing of [1, -1]) {
        const sk = rig(), lift = tLiftOf(sk);
        for (let t = 0; t <= 1.0001; t += 0.01) {
            const { far } = rise(sk, facing, Math.min(1, t), BACK);
            const fl = flex(far.S, far.E, far.W, facing);
            assert.ok(fl <= JOINT_LIMITS.elbow.max + 1e-9 && fl >= JOINT_LIMITS.elbow.min, `t=${t} flex ${fl}`);
            if (t >= PLANT.t0 + PLANT.inSpan && t <= lift) assert.ok(fl > 0, `t=${t} hinge ${fl}`);
        }
    }
});

test('a null or non-back context never plants; seeking back gives the same pose', () => {
    const sk = rig();
    for (const pain of [null, { part: 'knee', severity: 1 }, { part: 'back', severity: 0 }]) {
        const base = rise(sk, 1, 0.25, null).g;
        assert.deepEqual(rise(sk, 1, 0.25, pain).g, base);
    }
    const first = rise(sk, 1, 0.25, BACK).g;
    rise(sk, 1, 0.5, BACK); rise(sk, 1, 0.1, BACK);
    assert.deepEqual(rise(sk, 1, 0.25, BACK).g, first);
});

test('interrupting the rise drops the plant: the next draw carries no plant weight', () => {
    globalThis.location = { search: '?sellart=v1' };
    try {
        const make = over => Object.assign(Object.create(Wrestler.prototype), {
            scene: { time: { now: 1000 } }, state: 'gettingUp', lying: 'supine', _activeMove: null, _choreoUntil: 0,
            _pain: { phase: 'rise', part: 'back', severity: 1 }, ...over });
        assert.deepEqual(make({})._backRiseContext(), { part: 'back', severity: 1 });
        globalThis.location = { search: '?sellart=v1&plant=1' };
        assert.deepEqual(make({})._backRiseContext(), { part: 'back', severity: 1, plant: true });
        globalThis.location = { search: '?sellart=v1' };
        for (const over of [{ state: 'standing' }, { state: 'down' }, { _activeMove: { id: 'x' } },
            { _choreoUntil: 5000 }, { _pain: null }, { _pain: { phase: 'recover', part: 'back', severity: 1 } }])
            assert.equal(make(over)._backRiseContext(), null, JSON.stringify(over));
        // the plant is a pure function of the context handed in: no state survives a null draw
        const sk = rig();
        const cold = rise(rig(), 1, 0.25, null).g;
        rise(sk, 1, 0.25, BACK);
        assert.deepEqual(rise(sk, 1, 0.25, null).g, cold);
        assert.equal(sk._plantReach(400, 430, 1, 1, 0.25, Skeleton.GETUP_SUPINE_POSES).w, 1);
    } finally { delete globalThis.location; }
});

test('a back context without plant:true is the protect-only path: no far entry, same pose as before the plant existed', () => {
    for (const facing of [1, -1]) for (const t of [0.1, 0.2, 0.3, 0.5, 0.7]) {
        const sk = rig(), seen = [];
        sk.updateGroundedReach = function (x, y, s, f, pose, reach) { seen.push(reach); return Skeleton.prototype.updateGroundedReach.call(this, x, y, s, f, pose, reach, { paintedContacts: true, backContact: true }); };
        const plain = rise(sk, facing, t, { part: 'back', severity: 1 }).g;
        assert.ok(seen.every(r => !r.far), `t=${t} far entry`);
        const ref = rig(); ref._plantReach = () => null;
        assert.deepEqual(rise(ref, facing, t, BACK).g, plain);
    }
});
