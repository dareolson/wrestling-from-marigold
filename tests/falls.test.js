// PLAN_FALLS T2.1: the landing response (src/animation/falls.js). Pure math over the rest poses; the draw is Wrestler's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import { JOINT_LIMITS } from '../src/rig/articulation.js';
import { landingResponse, reboundPlan, landingDuration, flexChange, REF_VY, KINDS } from '../src/animation/falls.js';

const REST = { back: Skeleton.REST_POSES.supine, front: Skeleton.REST_POSES.prone };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const CASES = [];
for (const kind of ['back', 'front']) for (const intensity of [0.3, 0.7, 0.85, 1]) for (const vy of [REF_VY * 0.6, REF_VY, REF_VY * 1.4]) CASES.push({ kind, intensity, vy });
const samples = (c) => { const T = landingDuration(c.kind, c.intensity, c.vy); return Array.from({ length: 120 }, (_, k) => landingResponse(c.kind, c.intensity, c.vy, (k / 119) * T * 1.02)); };

test('signed flex of every knee and elbow stays inside the limits over 120 samples per kind, intensity and speed', () => {
    for (const c of CASES) {
        const rest = REST[c.kind];
        for (const r of samples(c)) for (const side of ['near', 'far']) {
            const knee = wrap(rest[`${side}Thigh`] - rest[`${side}Shin`]) + flexChange(r.d, 'knee', side);
            const elbow = wrap(rest[`${side}Fore`] - rest[`${side}Arm`]) + flexChange(r.d, 'elbow', side);
            assert.ok(flexChange(r.d, 'knee', side) >= -1e-9 && flexChange(r.d, 'elbow', side) >= -1e-9, `${c.kind} ${side} flex change is bend-only`);
            assert.ok(knee >= JOINT_LIMITS.knee.min && knee <= JOINT_LIMITS.knee.max, `${JSON.stringify(c)} ${side} knee ${knee}`);
            assert.ok(elbow >= -0.12 && elbow <= JOINT_LIMITS.elbow.max, `${JSON.stringify(c)} ${side} elbow ${elbow}`);
        }
    }
});

test('the offsets are zero at the end (the rest pose is where it lands) and the response says done', () => {
    for (const c of CASES) {
        const T = landingDuration(c.kind, c.intensity, c.vy);
        for (const t of [T, T + 0.5]) { const r = landingResponse(c.kind, c.intensity, c.vy, t); assert.ok(r.done); for (const [ch, v] of Object.entries(r.d)) assert.equal(v, 0, `${ch}`); }
        const near = landingResponse(c.kind, c.intensity, c.vy, T - 1e-4);
        for (const [ch, v] of Object.entries(near.d)) assert.ok(Math.abs(v) < 0.01, `${c.kind} ${ch} ${v} just before the end`);
    }
});

test('Lou at intensity 0.7 and the reference speed hops 6-10 px, in about 0.45-0.7 s; the hop scales with intensity and speed', () => {
    const p = reboundPlan(0.7, REF_VY);
    assert.ok(p.h1 >= 6 && p.h1 <= 10, `hop ${p.h1}`);
    assert.ok(landingDuration('back', 0.7, REF_VY) >= 0.45 && landingDuration('back', 0.7, REF_VY) <= 0.7);
    assert.ok(reboundPlan(0.9, REF_VY).h1 > p.h1 && reboundPlan(0.7, REF_VY * 1.4).h1 > p.h1 && reboundPlan(0.7, REF_VY * 0.6).h1 < p.h1);
    assert.equal(reboundPlan(0.7).hops.length, 1);
    assert.equal(reboundPlan(0.85).hops.length, 2);
    assert.ok(reboundPlan(0.85).hops[1].h < reboundPlan(0.85).hops[0].h);
});

test('the measured pelvis lift peaks at the plan\'s hop height and is 0 in contact', () => {
    const c = { kind: 'back', intensity: 0.7, vy: REF_VY };
    const lifts = samples(c).map(r => r.lift), peak = Math.max(...lifts), p = reboundPlan(c.intensity, c.vy);
    assert.ok(peak > 0.8 * p.h1 && peak <= p.h1 + 1e-9, `${peak} vs ${p.h1}`);
    assert.equal(landingResponse('back', 0.7, REF_VY, 0).lift, 0);
});

test('the limbs do not move together: each limb peaks at its own time', () => {
    const peakT = (ch) => { let best = 0, bt = 0; for (let k = 0; k <= 600; k++) { const t = k / 1000, v = Math.abs(landingResponse('back', 0.7, REF_VY, t).d[ch]); if (v > best) { best = v; bt = t; } } return bt; };
    const times = ['nearThigh', 'farThigh', 'nearArm', 'farArm'].map(peakT);
    assert.ok(new Set(times.map(t => t.toFixed(3))).size >= 3, times.join(','));
});

test('the arms only move away from the torso line: the missile test (15 deg) holds through every sample', () => {
    const off = (arm, torso) => { let d = Math.abs(arm - torso) % Math.PI; if (d > Math.PI / 2) d = Math.PI - d; return d * 180 / Math.PI; };
    for (const c of CASES) for (const r of samples(c)) for (const side of ['near', 'far']) {
        const rest = REST[c.kind], torso = rest.torso + r.d.torso;
        assert.ok(off(rest[`${side}Arm`] + r.d[`${side}Arm`], torso) >= 15, `${JSON.stringify(c)} ${side} ${off(rest[`${side}Arm`] + r.d[`${side}Arm`], torso).toFixed(1)}`);
    }
});

test('unknown kind throws; every channel is finite', () => {
    assert.throws(() => landingResponse('side', 0.5, REF_VY, 0.1), RangeError);
    for (const c of CASES) for (const r of samples(c)) for (const v of Object.values(r.d)) assert.ok(Number.isFinite(v));
    assert.deepEqual(Object.keys(KINDS).sort(), ['back', 'front']);
});

test('Skeleton.fallClosingSpeed reads the backward fall\'s closing pelvis speed off its keys (px/s at s = 1)', () => {
    const v = Skeleton.fallClosingSpeed('backward');
    assert.ok(v > 0 && v < REF_VY, `${v}`);   // the fall is not yet gravity-timed (T2.6), so it closes slower than free fall's 684
});

test('MoveRuntime.releaseRole lets one actor go and the clip keeps playing for the other', async () => {
    const { default: MoveRuntime } = await import('../src/animation/MoveRuntime.js');
    const rt = new MoveRuntime();
    rt.register({ id: 'x', duration: 1, tracks: { attacker: { keyframes: [{ at: 0, pose: { lean: 0 } }, { at: 1, pose: { lean: 1 } }] }, defender: { keyframes: [{ at: 0, pose: { lean: 0 } }, { at: 1, pose: { lean: 1 } }] } }, events: [] });
    const a = { pose: { lean: 0 } }, d = { pose: { lean: 0 } };
    const h = rt.play('x', { attacker: a, defender: d });
    rt.seek(h, 0.5);
    const frozen = d.pose.lean;
    rt.releaseRole(h, 'defender');
    rt.seek(h, 1);
    assert.equal(d.pose.lean, frozen);
    assert.ok(a.pose.lean > 0.9);
});
