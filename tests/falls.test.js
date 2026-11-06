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

// ---- T2.4c: the slam, end to end (Wrestler + MoveRuntime, no Phaser) -------------------------------------------------------------
async function slamFixture({ falls = true } = {}) {
    globalThis.location = { search: falls ? '?falls=v1' : '' };
    const { default: Wrestler } = await import('../src/Wrestler.js');
    const { default: MoveRuntime } = await import('../src/animation/MoveRuntime.js');
    const { bodySlamClip } = await import('../src/animation/clips/bodySlam.js');
    const rt = new MoveRuntime(); rt.register(bodySlamClip);
    const log = [];
    const scene = { moveRuntime: rt, time: { now: 0, delayedCall: () => {} }, tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} }, _logEvent: () => {},
        cameras: { main: { shake: (...a) => log.push(['shake', rt._t ?? 0, ...a]) } }, crowd: { impact: (...a) => log.push(['foley', rt._t ?? 0, ...a]) } };
    const mk = (facing, x) => Object.assign(Object.create(Wrestler.prototype), { scene, state: 'standing', facing, x, y: 360, stamina: 100, pose: {}, idlePose: 'idle',
        skeleton: { setPartVariants() {}, jointAttachmentPoints: null }, _activeMove: null, _fixedHold: false, vx: 0, vy: 0, input: { justDown: () => false, isDown: () => false }, moveSet: ['pin'] });
    const atk = mk(1, 470), def = mk(-1, 520);
    return { Wrestler, rt, atk, def, log, scene };
}
function stepTo(rt, log, from, to) { for (let t = from; t < to - 1e-9; t += 1 / 60) { rt._t = t; rt.update(1 / 60); } }

test('the slam under ?falls=v1: one damage event, the foley and shake on the hit, the landing one frame later, the pin and the AI wait until it ends, a get-up clears it', async () => {
    const { rt, atk, def, log } = await slamFixture();
    let hurts = 0; const hurt = def._hurt.bind(def); def._hurt = (...a) => { hurts++; hurt(...a); };
    atk._doBodySlam(def);
    const frames = [];
    for (let i = 0; i < 100 && !def._landing; i++) { rt._t = i / 60; atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60); frames.push({ t: (i + 1) / 60, hurts, foley: log.filter(l => l[0] === 'foley').length }); }
    assert.ok(def._landing, 'the landing started');
    assert.equal(def.state, 'down');
    assert.equal(hurts, 1, 'exactly one damage event');
    assert.equal(log.filter(l => l[0] === 'foley').length, 1);
    assert.equal(log.filter(l => l[0] === 'shake').length, 1);
    const hitFrame = frames.findIndex(f => f.hurts === 1), landFrame = frames.length - 1;
    assert.ok(landFrame - hitFrame <= 1, `the landing starts within one frame of the hit (hit ${hitFrame}, landing ${landFrame})`);
    assert.equal(def._landing.additive, true, 'the slam landing rides over the blend');
    assert.equal(def.isLanding(), true);
    // the pin starts in tryAction: while he lands it does nothing to him; once the landing is over the same call pins
    atk._fixedHold = false; atk.state = 'standing'; atk._runPoseSequence = () => {}; atk.input = { justDown: (k) => k === 'action', isDown: () => false };
    globalThis.Phaser ??= { Math: { Distance: { Between: (a, b, c, d) => Math.hypot(c - a, d - b) } } };
    def.x = atk.x + 60;   // the slam threw him out of reach
    atk.tryAction(def);
    assert.equal(def.state, 'down', 'no pin while he is landing');
    // the landing ends on its own clock (landingDuration), then isLanding() is false and the man is still down
    const { landingDuration } = await import('../src/animation/falls.js');
    const dur = landingDuration(def._landing.kind, def._landing.intensity, def._landing.vy);
    def.stateTimer = 5;
    for (let t = 0; t < dur + 0.1; t += 1 / 60) def.tickDown(1 / 60);
    assert.equal(def.isLanding(), false);
    assert.equal(def.state, 'down');
    atk.state = 'standing'; atk.tryAction(def);
    assert.equal(def.state, 'pinned', 'the same call pins once the landing is over');
    def.state = 'down';
    // a get-up (state leaves 'down') clears a landing that is still running
    def._startLanding('back', undefined, true); assert.equal(def.isLanding(), true);
    def.state = 'gettingUp'; def.tickDown(1 / 60);
    assert.equal(def.isLanding(), false, 'leaving the mat clears the landing');
    assert.equal(hurts, 1, 'still one damage event after the clip ends');
});

test('the slam with the flag off: no landing, he stays in the clip until it ends, one damage event on the impact', async () => {
    const { rt, atk, def } = await slamFixture({ falls: false });
    let hurts = 0; const hurt = def._hurt.bind(def); def._hurt = (...a) => { hurts++; hurt(...a); };
    atk._doBodySlam(def);
    for (let i = 0; i < 100 && hurts === 0; i++) { atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60); }
    assert.equal(hurts, 1);
    assert.equal(def.state, 'holding', 'flag off: the clip still owns him after the hit');
    assert.ok(!def._landing);
    delete globalThis.location;
});
