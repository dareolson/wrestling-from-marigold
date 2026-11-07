// PLAN_FALLS T2.1: the landing response (src/animation/falls.js). Pure math over the rest poses; the draw is Wrestler's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import { RING } from '../src/constants.js';
import { JOINT_LIMITS } from '../src/rig/articulation.js';
import { landingResponse, reboundPlan, landingDuration, flexChange, applyOffsetsSoft, REF_VY, KINDS, SHAPES, TIERS } from '../src/animation/falls.js';

const REST = { back: Skeleton.REST_POSES.supine, front: Skeleton.REST_POSES.prone, catch: Skeleton.REST_POSES.prone, knees: Skeleton.REST_POSES.prone, seat: Skeleton.REST_POSES.supine, spill: Skeleton.REST_POSES.supine };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const CASES = [];
for (const kind of ['back', 'front', 'catch', 'knees', 'seat', 'spill']) for (const intensity of [0.3, 0.7, 0.85, 1]) for (const vy of [REF_VY * 0.6, REF_VY, REF_VY * 1.4]) CASES.push({ kind, intensity, vy });
const samples = (c) => { const T = landingDuration(c.kind, c.intensity, c.vy, c.tier); return Array.from({ length: 120 }, (_, k) => landingResponse(c.kind, c.intensity, c.vy, (k / 119) * T * 1.02, c.tier)); };
for (const tier of ['heavy', 'exceptional']) for (const intensity of [0.3, 0.7, 1]) for (const vy of [REF_VY * 0.6, REF_VY, REF_VY * 1.4]) CASES.push({ kind: 'back', intensity, vy, tier });

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
        const T = landingDuration(c.kind, c.intensity, c.vy, c.tier);
        for (const t of [T, T + 0.5]) { const r = landingResponse(c.kind, c.intensity, c.vy, t, c.tier); assert.ok(r.done); for (const [ch, v] of Object.entries(r.d)) assert.equal(v, 0, `${ch}`); }
        const near = landingResponse(c.kind, c.intensity, c.vy, T - 1e-4, c.tier);
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
    assert.deepEqual(Object.keys(KINDS).sort(), ['back', 'front', 'limp']);
    assert.deepEqual(Object.keys(SHAPES).sort(), ['catch', 'knees', 'seat', 'spill']);
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
async function slamFixture({ falls = true, qs = '', clips = ['bodySlam'] } = {}) {
    globalThis.location = { search: falls ? '?falls=v1' + qs : '' };
    const { default: Wrestler } = await import('../src/Wrestler.js');
    const { default: MoveRuntime } = await import('../src/animation/MoveRuntime.js');
    const rt = new MoveRuntime();
    const mod = { bodySlam: ['bodySlam', 'bodySlamClip'], suplex: ['suplex', 'suplexClip'], hipToss: ['hipToss', 'hipTossClip'], piledriver: ['piledriver', 'piledriverClip'], snapmare: ['snapmare', 'snapmareClip'] };
    for (const c of clips) { const m = await import(`../src/animation/clips/${mod[c][0]}.js`); rt.register(m[mod[c][1]] ?? Object.values(m)[0]); }
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

// ---- T2.5: the other falls, the slam tiers, the soft knee --------------------------------------------------------------------------
test('catch and knees are supported, not flights: the pelvis rises a few px at most (catch), not at all (knees); seat and spill keep the pelvis on the mat', () => {
    const peak = (kind) => Math.max(...samples({ kind, intensity: 1, vy: REF_VY }).map(r => r.lift));
    assert.ok(peak('catch') > 1 && peak('catch') <= 4.2 + 1e-9, `catch ${peak('catch')}`);
    for (const k of ['knees', 'seat', 'spill']) assert.equal(peak(k), 0, k);
    assert.ok(peak('catch') < 0.5 * reboundPlan(0.7, REF_VY).h1 + 2, 'far from the slam\'s hop');
});

test('catch: one forearm stays planted (the far elbow barely bends) while the near one yields; knees and seat bend both, staggered', () => {
    const maxFlex = (kind, side) => Math.max(...samples({ kind, intensity: 0.7, vy: REF_VY }).map(r => flexChange(r.d, 'elbow', side)));
    assert.ok(maxFlex('catch', 'near') > 0.25 && maxFlex('catch', 'far') < 0.1, `${maxFlex('catch', 'near')} ${maxFlex('catch', 'far')}`);
    for (const k of ['knees', 'seat']) assert.ok(maxFlex(k, 'near') > 0.1 && maxFlex(k, 'far') > 0.1, k);
});

test('no new landing runs longer than the r2 slam\'s (Lou\'s slam is intensity 0.8, two hops), and each ends within 0.45-0.8 s', () => {
    const r2 = landingDuration('back', 0.8, REF_VY);
    for (const k of Object.keys(SHAPES)) { const d = landingDuration(k, 0.8, REF_VY); assert.ok(d >= 0.45 && d <= 0.8 && d <= r2 + 0.05, `${k} ${d} vs ${r2}`); }
});

test('slam tiers: commanded 14 / 18.8 px at Lou\'s slam intensity 0.8 (the probe reads about 0.82x of it drawn over the blend base: 11.5 / 14.7); one dominant hop; shorter than r2', () => {
    const r2 = reboundPlan(0.8, REF_VY), hv = reboundPlan(0.8, REF_VY, 'heavy'), ex = reboundPlan(0.8, REF_VY, 'exceptional');
    assert.ok(r2.h1 < hv.h1 && hv.h1 < ex.h1);
    assert.ok(hv.h1 >= 13 && hv.h1 <= 15, `${hv.h1}`);
    assert.ok(ex.h1 >= 17 && ex.h1 <= 19.5, `${ex.h1}`);
    for (const t of ['heavy', 'exceptional']) { assert.equal(reboundPlan(1, REF_VY, t).hops.length, 1, `${t} one dominant rebound at any intensity`); assert.ok(landingDuration('back', 0.8, REF_VY, t) < landingDuration('back', 0.8, REF_VY)); }
    assert.equal(reboundPlan(0.85, REF_VY).hops.length, 2, 'r2 unchanged');
    assert.equal(TIERS.default.spent, 0);
    assert.ok(TIERS.heavy.spent > 0 && TIERS.exceptional.spent >= TIERS.heavy.spent);
});

test('no tier is r2 exactly: the same samples as before the tier argument existed', () => {
    for (const t of [0, 0.03, 0.06, 0.1, 0.2, 0.35, 0.5]) assert.deepEqual(landingResponse('back', 0.7, REF_VY, t), landingResponse('back', 0.7, REF_VY, t, null));
    assert.deepEqual(landingResponse('back', 0.7, REF_VY, 0.2, 'nonsense'), landingResponse('back', 0.7, REF_VY, 0.2));
});

test('applyOffsetsSoft: plain offsets below the knee point, continuous, monotone, never reaches the cap; straightening passes through', () => {
    const base = { nearThigh: 1.97, nearShin: 0.47, farThigh: 1.5, farShin: 1.55 };      // the supine rest pose's legs: near flex 1.5, far -0.05
    const flexAfter = (delta) => { const g = applyOffsetsSoft(base, { nearThigh: 0, nearShin: -delta, farThigh: 0, farShin: 0 }); return g.nearThigh - g.nearShin; };
    assert.ok(Math.abs(flexAfter(0.2) - 1.7) < 1e-9, 'inside the linear part: rest + delta');
    let prev = flexAfter(0);
    for (let d = 0.01; d <= 3; d += 0.01) { const f = flexAfter(d); assert.ok(f >= prev - 1e-12 && f - prev < 0.0101, `monotone and continuous at ${d}`); assert.ok(f < 2.45 + 1e-9, `${f} under the soft cap`); prev = f; }
    assert.ok(flexAfter(3) > 2.4, 'it does keep rising toward the cap');
    const g = applyOffsetsSoft(base, { nearThigh: 0, nearShin: 0.3, farThigh: 0, farShin: 0 });
    assert.ok(Math.abs((g.nearThigh - g.nearShin) - 1.2) < 1e-9, 'straightening is plain');
    const full = { nearThigh: 1.97, nearShin: -0.5, farThigh: 0, farShin: 0 };                  // a base already at the cap (flex 2.47): the added bend is dropped
    const gf = applyOffsetsSoft(full, { nearThigh: 0.1, nearShin: -0.3, farThigh: 0, farShin: 0 });
    assert.ok(Math.abs((gf.nearThigh - gf.nearShin) - 2.47) < 1e-9, `${gf.nearThigh - gf.nearShin}`);
    const g2 = applyOffsetsSoft(base, { nearThigh: 0.1, nearShin: 0.1, hip: 4 });
    assert.equal(g2.hip, base.hip === undefined ? undefined : g2.hip);   // unrelated channels untouched by the soft part
});

test('Skeleton.FALLS.spill lands supine, every key keeps both knees and both elbows inside the limits, and the hip lands before the shoulders', () => {
    const f = Skeleton.FALLS.spill;
    assert.equal(f.lands, 'supine');
    const keys = [...f.keys.slice(0, -1), { ...Skeleton.REST_POSES.supine, t: 1 }];   // ?falls=v1 ends every fall on the rest pose (Skeleton.updateFall)
    for (let k = 0; k <= 100; k++) {
        const g = Skeleton._sampleKeyposes(keys, k / 100);
        for (const side of ['near', 'far']) {
            const knee = wrap(g[`${side}Thigh`] - g[`${side}Shin`]), elbow = wrap(g[`${side}Fore`] - g[`${side}Arm`]);
            assert.ok(knee >= JOINT_LIMITS.knee.min && knee <= JOINT_LIMITS.knee.max, `${side} knee ${knee} at ${k / 100}`);
            assert.ok(elbow >= -0.12 && elbow <= JOINT_LIMITS.elbow.max, `${side} elbow ${elbow} at ${k / 100}`);
        }
    }
    const hipLow = f.keys.findIndex(q => q.hip <= 14), torsoDown = f.keys.findIndex(q => q.torso >= Math.PI + 0.9);
    assert.ok(hipLow >= 0 && torsoDown > hipLow, 'hip first (key 0.55), shoulders later (0.80)');
});

test('tiers by move (T2.5h): slam, suplex and back body drop heavy, piledriver exceptional, the rest r2; ?slamTier overrides the slam only; no flag, no tier', async () => {
    globalThis.location = { search: '' };
    const { moveTier } = await import('../src/Wrestler.js');
    assert.equal(moveTier('bodySlam'), null, 'flag off');
    const at = (qs, move) => { globalThis.location = { search: '?falls=v1' + qs }; return moveTier(move); };
    assert.equal(at('', 'bodySlam'), 'heavy'); assert.equal(at('', 'suplex'), 'heavy'); assert.equal(at('', 'backBodyDrop'), 'heavy'); assert.equal(at('', 'piledriver'), 'exceptional');
    for (const m of ['hipToss', 'snapmare', 'armDrag', 'clothesline']) assert.equal(at('', m), null, m);
    assert.equal(at('&slamTier=r2', 'bodySlam'), null); assert.equal(at('&slamTier=exceptional', 'bodySlam'), 'exceptional'); assert.equal(at('&slamTier=bogus', 'bodySlam'), 'heavy');
    assert.equal(at('&slamTier=exceptional', 'suplex'), 'heavy', 'the override is the slam\'s only');
    delete globalThis.location;
});

test('the slam tier rides the landing: the shake scales on the one hit, one damage event, r2 on request', async () => {
    const run = async (qs) => {
        const { rt, atk, def, log } = await slamFixture({ qs });
        let hurts = 0; const hurt = def._hurt.bind(def); def._hurt = (...a) => { hurts++; hurt(...a); };
        atk._doBodySlam(def);
        for (let i = 0; i < 100 && !def._landing; i++) { rt._t = i / 60; atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60); }
        const shakes = log.filter(l => l[0] === 'shake');
        return { tier: def._landing?.tier ?? null, hurts, shakes: shakes.length, amp: shakes[0]?.[3], foley: log.filter(l => l[0] === 'foley').map(l => l[3]) };
    };
    const r2 = await run('&slamTier=r2'), dflt = await run(''), hv = await run('&slamTier=heavy'), ex = await run('&slamTier=exceptional');
    assert.equal(r2.tier, null); assert.equal(dflt.tier, 'heavy'); assert.deepEqual(dflt, hv); assert.equal(ex.tier, 'exceptional');
    for (const r of [r2, hv, ex]) { assert.equal(r.hurts, 1); assert.equal(r.shakes, 1); assert.equal(r.foley.length, 1); }
    assert.ok(hv.amp > r2.amp && ex.amp > hv.amp, `${r2.amp} ${hv.amp} ${ex.amp}`);
    delete globalThis.location;
});

// T2.5g: each throw's landing. Both men's clip roles, one damage event, the landing one frame after the hit (the piledriver: at 1.8 s, the pelvis at the mat).
async function runThrow(move, call, { clips = [move], qs = '', falls = true } = {}) {
    const { rt, atk, def, log } = await slamFixture({ clips, qs, falls });
    let hurts = 0; const hurt = def._hurt.bind(def); def._hurt = (...a) => { hurts++; hurt(...a); };
    atk[call](def);
    let hitAt = null, defAt = null, atkAt = null, defLand = null, atkLand = null;
    for (let i = 0; i < 400 && !(defAt != null && (atkAt != null || move !== 'suplex')); i++) {
        rt._t = i / 60; atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60);
        if (hurts && hitAt == null) hitAt = i;
        if (def._landing && defAt == null) { defAt = i; defLand = { ...def._landing }; }
        if (atk._landing && atkAt == null) { atkAt = i; atkLand = { ...atk._landing }; }
    }
    // let the clip run out: nothing re-lays or double-damages
    for (let i = 0; i < 200; i++) { rt._t = i / 60; atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60); }
    delete globalThis.location;
    return { hurts, hitAt, defAt, atkAt, defLand, atkLand, def, atk, log };
}

test('hip toss, snapmare and suplex under ?falls=v1: one damage, the landing a frame after the hit, the right kind and tier; the suplex attacker bumps too', async () => {
    const hip = await runThrow('hipToss', '_doHipToss');
    assert.equal(hip.hurts, 1); assert.equal(hip.defAt - hip.hitAt, 1); assert.equal(hip.defLand.kind, 'back'); assert.equal(hip.defLand.tier, null);
    const snap = await runThrow('snapmare', '_doSnapmare');
    assert.equal(snap.hurts, 1); assert.equal(snap.defAt - snap.hitAt, 1); assert.equal(snap.defLand.kind, 'seat');
    const sup = await runThrow('suplex', '_doSuplex');
    assert.equal(sup.hurts, 1); assert.equal(sup.defAt - sup.hitAt, 1); assert.equal(sup.atkAt, sup.defAt, 'his own bump on the same frame');
    assert.equal(sup.defLand.kind, 'back'); assert.equal(sup.defLand.tier, 'heavy'); assert.equal(sup.atkLand.tier, null);
    assert.equal(sup.def.lying, 'supine'); assert.equal(sup.atk.lying, 'supine');
});

test('piledriver under ?falls=v1: damage on the hit, the landing at 1.8 s (not at the hit), face down, exceptional, limp arms; flag off: no landing', async () => {
    const pd = await runThrow('piledriver', '_doPiledriver');
    assert.equal(pd.hurts, 1);
    assert.ok(pd.defAt - pd.hitAt > 25 && pd.defAt - pd.hitAt < 45, `landing ${pd.defAt - pd.hitAt} frames after the hit`);
    assert.equal(pd.defLand.kind, 'limp'); assert.equal(pd.defLand.tier, 'exceptional'); assert.equal(pd.def.lying, 'prone');
    const off = await runThrow('piledriver', '_doPiledriver', { falls: false });
    assert.equal(off.hurts, 1); assert.equal(off.defAt, null, 'flag off: no landing');
    assert.equal(off.def.lying, 'prone');
});

// ---- T2.6: the falls from standing under gravity ----------------------------------------------------------------------------------
test('Skeleton.fallBallisticU: the pelvis (hip channel) follows free fall to contact, never slows before it, then the keys finish eased; u is monotone and ends at 1', () => {
    for (const variant of Object.keys(Skeleton.FALL_BALLISTIC)) {
        const b = Skeleton.FALL_BALLISTIC[variant], fall = Skeleton.FALLS[variant];
        const keys = [...fall.keys.slice(0, -1), { ...Skeleton.lyingBase(fall.lands, true), t: 1 }];
        const hip = (u) => Skeleton._sampleKeyposes(keys, u).hip;
        const D = Skeleton.fallDuration(variant), n = Math.round(D / (1000 / 60));
        let prevU = -1, prevDrop = -1;
        const h0 = hip(0), hc = hip(b.contactU);
        for (let k = 0; k <= n; k++) {
            const ms = Math.min(D, k * 1000 / 60), u = Skeleton.fallBallisticU(keys, variant, ms);
            assert.ok(u >= prevU - 1e-9 && u >= 0 && u <= 1 + 1e-9, `${variant} u monotone at ${ms}`);
            if (ms <= b.tb) assert.ok(Math.abs(hip(u) - (h0 - (h0 - hc) * (ms / b.tb) ** 2)) < 0.05, `${variant} hip follows free fall at ${ms}: ${hip(u)}`);
            if (k > 0 && ms <= b.tb) { const drop = hip(Skeleton.fallBallisticU(keys, variant, (k - 1) * 1000 / 60)) - hip(u); assert.ok(drop >= prevDrop - 0.05, `${variant} per-frame drop never decreases (${drop} after ${prevDrop})`); prevDrop = drop; }
            prevU = u;
        }
        assert.ok(Math.abs(Skeleton.fallBallisticU(keys, variant, D) - 1) < 1e-9, `${variant} ends on the rest pose`);
        assert.ok(Math.abs(Skeleton.fallBallisticU(keys, variant, b.tb) - b.contactU) < 1e-3, `${variant} contact at contactU`);
    }
    assert.equal(Skeleton.fallClosingSpeed('backward', true), 1710 * 0.4, 'the hop reads free fall\'s closing speed');
    assert.equal(Skeleton.fallDuration('backward'), 400);
});

// ── Stage 3: chooseFall (T3.1) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { chooseFall, MOVE_FALLS, LYING_REACH, KNOCKDOWN_WEAR, EXCEPTIONAL_WEAR, TIRED_WEAR, FRESH_WEAR, WEAR_MAX, WEAR_PER_DAMAGE, WEAR_RECOVER, wearAfterDamage, wearAfterRecovery } from '../src/animation/falls.js';
const OPEN = { back: 300, front: 300, side: 100 };
const seen = (ctx, n = 60) => { const out = new Set(); for (let i = 0; i < n; i++) out.add(chooseFall({ ...ctx, rng: () => (i + 0.5) / n }).fall); return [...out].sort(); };

test('chooseFall: front, head or chest -> backward or sitBack; gut -> kneesForward or sitBack', () => {
    assert.deepEqual(seen({ move: 'headbutt', side: 'front', wear: 40, room: OPEN }), ['backward', 'sitBack']);
    assert.deepEqual(seen({ move: 'jab', hit: 'chest', side: 'front', wear: 40, room: OPEN }), ['backward', 'sitBack']);
    assert.deepEqual(seen({ move: 'frontKick', side: 'front', wear: 40, room: OPEN }), ['kneesForward', 'sitBack']);
    assert.deepEqual(seen({ move: 'kneeLift', side: 'front', wear: 40, room: OPEN }), ['kneesForward', 'sitBack']);
});
test('chooseFall: from behind -> forward or kneesForward, whatever the hit', () => {
    for (const move of ['headbutt', 'frontKick', 'shove']) assert.deepEqual(seen({ move, side: 'behind', wear: 40, room: OPEN }), ['forward', 'kneesForward'], move);
});
test('chooseFall: a shove or glancing blow with room to the side spills; without room, or without the spill, it falls backward', () => {
    assert.deepEqual(seen({ move: 'shove', side: 'front', wear: 40, room: OPEN }), ['spill']);
    assert.deepEqual(seen({ move: 'jab', glancing: true, side: 'front', wear: 40, room: OPEN }), ['backward', 'sitBack']);   // the jab's own list has no spill
    assert.ok(!seen({ move: 'shove', side: 'front', wear: 40, room: { ...OPEN, side: 10 } }).includes('spill'));
    assert.ok(!seen({ move: 'shove', side: 'front', wear: 40, room: OPEN, spillAvailable: false }).includes('spill'));
    assert.deepEqual(seen({ move: 'shove', side: 'front', wear: 40, room: { ...OPEN, side: 10 } }), ['backward', 'sitBack']);
});
test('chooseFall: tired weights the collapses, fresh the straight falls, and neither excludes the other', () => {
    const share = (wear, fall) => { let n = 0; for (let i = 0; i < 1000; i++) if (chooseFall({ move: 'headbutt', side: 'front', wear, room: OPEN, rng: () => (i + 0.5) / 1000 }).fall === fall) n++; return n / 1000; };
    assert.equal(share(TIRED_WEAR, 'sitBack'), 0.75);
    assert.equal(share(TIRED_WEAR - 0.1, 'sitBack'), 0.5);
    assert.equal(share(FRESH_WEAR - 0.1, 'backward'), 0.75);
    assert.equal(share(FRESH_WEAR, 'backward'), 0.5);
});
test('chooseFall: a fall that would leave the ring is dropped, by its lying length', () => {
    // 94 px ahead: backward / sitBack reach 96 ahead, forward / kneesForward 92, so a front headbutt's own pool is out and the move's forward falls are what's left
    const r = chooseFall({ move: 'headbutt', side: 'front', wear: 40, room: { back: 300, front: 94, side: 100 }, rng: () => 0 });
    assert.ok(['forward', 'kneesForward'].includes(r.fall));
    assert.match(r.reason, /ring room/);
    // no fall of the move fits: the one that overshoots least, flagged
    const c = chooseFall({ move: 'cornerCharge', side: 'behind', wear: 40, room: { back: 50, front: 300, side: 100 }, rng: () => 0 });
    assert.match(c.reason, /cramped/);
    // the corner charge: room inward fits both of its falls
    assert.deepEqual(seen({ move: 'cornerCharge', side: 'behind', wear: 40, room: OPEN }), ['forward', 'kneesForward']);
});
test('chooseFall: exceptional when a big move lands on a receiver at EXCEPTIONAL_WEAR or over, otherwise the move\'s own tier', () => {
    assert.equal(chooseFall({ move: 'suplex', side: 'front', wear: EXCEPTIONAL_WEAR, tier: 'heavy', room: OPEN }).tier, 'exceptional');
    assert.equal(chooseFall({ move: 'bodySlam', side: 'front', wear: WEAR_MAX, room: OPEN }).tier, 'exceptional');
    assert.equal(chooseFall({ move: 'suplex', side: 'front', wear: EXCEPTIONAL_WEAR - 0.1, tier: 'heavy', room: OPEN }).tier, 'heavy');
    assert.equal(chooseFall({ move: 'hipToss', side: 'front', wear: WEAR_MAX, tier: null, room: OPEN }).tier, null);
    assert.equal(chooseFall({ move: 'headbutt', side: 'front', wear: WEAR_MAX, room: OPEN }).tier, null);
});
test('chooseFall: every result is a Skeleton.FALLS variant, for every move, side, wear and rng, and the table only names real falls', () => {
    for (const [m, spec] of Object.entries(MOVE_FALLS)) for (const f of spec.falls) assert.ok(Skeleton.FALLS[f] && LYING_REACH[f], `${m} ${f}`);
    for (const move of [...Object.keys(MOVE_FALLS), 'suplex', 'unknown']) for (const side of ['front', 'behind']) for (const wear of [0, 20, 34, 40, 60, 100])
        for (const room of [undefined, OPEN, { back: 20, front: 20, side: 0 }]) for (const rng of [() => 0, () => 0.5, () => 0.999]) {
            const r = chooseFall({ move, side, wear, room, rng });
            assert.ok(Skeleton.FALLS[r.fall], `${move} ${side} ${wear} -> ${r.fall}`);
            assert.equal(typeof r.reason, 'string');
        }
});
test('T3.13: wear rises with damage, caps at 100, recovers slowly and never below 0; stamina recovers far faster', () => {
    assert.equal(wearAfterDamage(0, 10), 10 * WEAR_PER_DAMAGE);
    assert.equal(wearAfterDamage(95, 1000), WEAR_MAX);
    assert.equal(wearAfterDamage(20, -5), 20, 'damage is never negative');
    assert.equal(wearAfterRecovery(50, 2), 50 - 2 * WEAR_RECOVER);
    assert.equal(wearAfterRecovery(0.1, 10), 0);
    assert.ok(WEAR_RECOVER > 0 && WEAR_RECOVER < 6 / 4, 'a fraction of stamina\'s 6 per second');
    assert.ok(0 < FRESH_WEAR && FRESH_WEAR < TIRED_WEAR && TIRED_WEAR <= KNOCKDOWN_WEAR && KNOCKDOWN_WEAR < EXCEPTIONAL_WEAR && EXCEPTIONAL_WEAR <= WEAR_MAX);
});

// ---- T3.5 / T3.6: read at the hit, at the executor (Wrestler + MoveRuntime, no Phaser) --------------------------------------------------------
async function jabFixture({ wear = 0, stamina = 100, behind, falls = true }) {
    const f = await slamFixture({ falls, clips: [] });
    const { jabClip } = await import('../src/animation/clips/jab.js');
    f.rt.register(jabClip);
    const { atk, def } = f;
    atk.x = 470; def.x = 540; atk.facing = 1;
    def.facing = behind ? 1 : -1;   // behind: he faces the same way as the attacker, his back to him
    def.stamina = stamina; def.wear = wear;
    const calls = { fall: [], stagger: 0, sellCb: null, facingAtFall: null };
    def.tweenPose = (pose, ms, e, cb) => { calls.sellCb = cb; };
    def.startFall = (dt, fall, exact, tier) => { calls.fall.push({ fall, exact, tier }); calls.facingAtFall = def.facing; };
    def.startStagger = () => { calls.stagger++; };
    return { ...f, calls };
}
async function jab(fx) {   // run the clip to its impact, then the sell's end, the way a frame loop would; between them the receiver turns to face the attacker (move())
    const { atk, def, rt, calls } = fx;
    atk._doJab(def);
    for (let i = 0; i < 60 && !calls.sellCb; i++) { atk.tickDown(1 / 60); rt.update(1 / 60); }
    assert.ok(calls.sellCb, 'the jab landed and the sell started');
    def.facing = Math.sign(atk.x - def.x);   // what the sell's frames do to a standing man
    calls.sellCb();
}
test('T3.5: a real jab from behind, no facing lock, picks a forward fall off the hit-time side and plays it facing as he stood', async () => {
    const fx = await jabFixture({ wear: KNOCKDOWN_WEAR + 20, behind: true });
    await jab(fx);
    assert.equal(fx.calls.fall.length, 1);
    assert.ok(['forward', 'kneesForward'].includes(fx.calls.fall[0].fall), fx.calls.fall[0].fall);
    assert.equal(fx.calls.facingAtFall, 1, 'he falls facing the way he faced at the hit, not turned by the sell');
    delete globalThis.location;
});
test('T3.5: the same jab from the front picks backward or sitBack', async () => {
    const fx = await jabFixture({ wear: KNOCKDOWN_WEAR + 20, behind: false });
    await jab(fx);
    assert.ok(['backward', 'sitBack'].includes(fx.calls.fall[0].fall), fx.calls.fall[0].fall);
    delete globalThis.location;
});
test('T3.14: the threshold is read right after the damage: wear just under KNOCKDOWN_WEAR staggers, at it falls; stamina does not matter (the jab adds its damage x WEAR_PER_DAMAGE)', async () => {
    const { STAMINA_DRAIN } = await import('../src/Wrestler.js');
    const add = STAMINA_DRAIN.jab * WEAR_PER_DAMAGE;
    for (const [after, falls, stamina] of [[KNOCKDOWN_WEAR - 0.1, false, 100], [KNOCKDOWN_WEAR, true, 100], [KNOCKDOWN_WEAR + 0.1, true, 100], [WEAR_MAX, true, 100], [0, false, 5], [KNOCKDOWN_WEAR - 0.1, false, 5]]) {
        const fx = await jabFixture({ wear: Math.max(0, after - add), stamina, behind: false });
        await jab(fx);
        assert.equal(fx.calls.fall.length, falls ? 1 : 0, `after ${after}`);
        assert.equal(fx.calls.stagger, falls ? 0 : 1, `after ${after}`);
        delete globalThis.location;
    }
});
test('T3.5: flag off, the same jab staggers a man at 10 stamina and full wear, from behind or not', async () => {
    for (const behind of [true, false]) {
        const fx = await jabFixture({ stamina: 10, wear: WEAR_MAX, behind, falls: false });
        await jab(fx);
        assert.equal(fx.calls.fall.length, 0); assert.equal(fx.calls.stagger, 1);
        delete globalThis.location;
    }
});
async function slamTierAt(wear, { qs = '', falls = true } = {}) {
    const { rt, atk, def } = await slamFixture({ falls, qs });
    def.wear = wear;
    atk._doBodySlam(def);
    for (let i = 0; i < 100 && !def._landing; i++) { atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60); }
    const tier = def._landing?.tier ?? null;
    delete globalThis.location;
    return tier;
}
test('T3.14: a body slam on a receiver at EXCEPTIONAL_WEAR lands exceptional, just under it heavy; the wear is read before the slam\'s own damage', async () => {
    assert.equal(await slamTierAt(EXCEPTIONAL_WEAR), 'exceptional');
    assert.equal(await slamTierAt(WEAR_MAX), 'exceptional');
    assert.equal(await slamTierAt(EXCEPTIONAL_WEAR - 0.1), 'heavy');
    assert.equal(await slamTierAt(0), 'heavy');
});
test('T3.6: ?slamTier= overrides the tired rule; flag off has no tier', async () => {
    assert.equal(await slamTierAt(WEAR_MAX, { qs: '&slamTier=heavy' }), 'heavy');
    assert.equal(await slamTierAt(0, { qs: '&slamTier=exceptional' }), 'exceptional');
    assert.equal(await slamTierAt(WEAR_MAX, { falls: false }), null);
});
test('tierFor: only the big moves go exceptional, at EXCEPTIONAL_WEAR or over', async () => {
    const { tierFor } = await import('../src/animation/falls.js');
    assert.equal(tierFor('suplex', EXCEPTIONAL_WEAR, 'heavy'), 'exceptional');
    assert.equal(tierFor('backBodyDrop', WEAR_MAX, 'heavy'), 'exceptional');
    assert.equal(tierFor('hipToss', WEAR_MAX, null), null);
    assert.equal(tierFor('piledriver', 0, 'exceptional'), 'exceptional');
    assert.equal(tierFor('suplex', EXCEPTIONAL_WEAR - 0.1, 'heavy'), 'heavy');
});

test('T3.9: when no fall fits, the pick keeps its fall and says how far to slide him inward; when one fits there is no slide', () => {
    const r = chooseFall({ move: 'headbutt', side: 'front', wear: 40, room: { back: 50, front: 300, side: 100 }, rng: () => 0 });
    assert.match(r.reason, /cramped/);
    assert.ok(['backward', 'sitBack'].includes(r.fall));
    assert.equal(r.slide.back, LYING_REACH[r.fall].back - 50);
    assert.equal(r.slide.front, 0);
    assert.equal(r.slide.dx, LYING_REACH[r.fall].back - 50, 'toward his front, away from the rope behind him');
    const f = chooseFall({ move: 'headbutt', side: 'front', wear: 40, room: { back: 300, front: 40, side: 100 }, rng: () => 0 });
    assert.ok(f.slide.dx < 0, 'a rope in front of him: toward his back');
    assert.equal(chooseFall({ move: 'headbutt', side: 'front', wear: 40, room: OPEN }).slide, null);
});

// ---- T3.10: the suplex cleans up both men when interrupted (the attacker's own bump is armed at the hit, like the victim's) ----------------------------------
async function suplexRun(cutAt) {
    const { rt, atk, def } = await slamFixture({ clips: ['suplex'] });
    atk.tweenPose = () => {}; def.tweenPose = () => {};
    atk._doSuplex(def);
    const frames = [];
    for (let i = 0; i < 400; i++) {
        atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60);
        frames.push({ atk: atk.state, def: def.state, aL: !!atk._landing, dL: !!def._landing });
        if (cutAt(i, frames)) { atk._cancelActiveMove('test'); def._cancelActiveMove('test'); for (let k = 0; k < 20; k++) { atk.tickDown(1 / 60); def.tickDown(1 / 60); rt.update(1 / 60); } break; }
    }
    delete globalThis.location;
    return { atk, def, frames };
}
test('T3.10: a suplex cut before the impact leaves the attacker standing and the victim on his back, nobody holding, no landing armed', async () => {
    const { atk, def, frames } = await suplexRun((i) => i === 20);
    assert.ok(!frames.some(f => f.dL || f.aL), 'no landing before the hit');
    assert.equal(atk.state, 'standing'); assert.notEqual(def.state, 'holding');
    assert.ok(!atk._activeMove); assert.ok(!def._activeMove);
    assert.equal(atk._fixedHold, false); assert.equal(def._fixedHold, false);
    assert.ok(!atk._landNext); assert.ok(!def._landNext);
});
test('T3.10: a suplex cut on the frame of the hit, before the landings start: both men are released, no stale landing hook fires later', async () => {
    let hit = -1;
    const { atk, def } = await suplexRun((i, frames) => { if (hit < 0 && frames.at(-1).def !== 'holding') hit = i; return false; });   // find the frame the victim leaves the clip
    assert.ok(hit > 0);
    const r = await suplexRun((i) => i === hit - 1);
    assert.notEqual(r.atk.state, 'holding'); assert.notEqual(r.def.state, 'holding');
    assert.ok(!r.atk._landNext, 'the attacker\'s armed bump does not outlive the cut'); assert.ok(!r.def._landNext);
    for (const w of [r.atk, r.def]) { assert.equal(w._fixedHold, false); assert.ok(!w._activeMove); }
});
test('T3.10: a suplex cut after both men have landed leaves both down with their own landing, neither holding', async () => {
    const { atk, def, frames } = await suplexRun((i, frames) => frames.at(-1).aL && frames.at(-1).dL);
    assert.equal(atk.state, 'down'); assert.equal(def.state, 'down');
    assert.ok(atk._landing && def._landing, 'both landings run to their own end');
    assert.equal(atk._fixedHold, false); assert.equal(def._fixedHold, false);
    assert.ok(frames.some(f => f.aL && f.dL));
});

test('T3.13: _hurt and _damage raise wear under ?falls=v1 only; _drain (the attacker\'s own cost) never does; recovery runs in the frame update, flag or not', async () => {
    const { STAMINA_DRAIN } = await import('../src/Wrestler.js');
    for (const falls of [true, false]) {
        const { def } = await slamFixture({ falls, clips: [] });
        def.wear = 0;
        def._hurt(STAMINA_DRAIN.jab, 'jab');
        def._damage(4);
        def._drain(10);
        assert.equal(def.stamina, 100 - STAMINA_DRAIN.jab - 4 - 10);
        assert.equal(def.wear, falls ? (STAMINA_DRAIN.jab + 4) * WEAR_PER_DAMAGE : 0, `falls ${falls}`);
        delete globalThis.location;
    }
});

// PLAN_FALLS T4.1: the down-hit jolt
import { joltResponse, joltDuration, JOLT_PEAK_SEC } from '../src/animation/falls.js';
for (const lying of ['supine', 'prone']) for (const intensity of [0.7, 0.8, 0.9, 1]) {
    test(`jolt ${lying} ${intensity}: peaks at the waist near 120 ms, returns to the exact rest pose, bend-only joints`, () => {
        const T = joltDuration(intensity), rest = Skeleton.REST_POSES[lying];
        assert.ok(T >= 0.45 - 1e-9 && T <= 0.6 + 1e-9, `duration ${T}`);
        let peakTorso = 0;
        for (let k = 0; k <= 200; k++) {
            const r = joltResponse(lying, intensity, (k / 200) * T * 1.05);
            if (r.done) { assert.ok(Object.values(r.d).every((v) => v === 0)); continue; }
            peakTorso = Math.max(peakTorso, Math.abs(r.d.torso));
            for (const side of ['near', 'far']) {
                assert.ok(flexChange(r.d, 'knee', side) >= -1e-9 && flexChange(r.d, 'elbow', side) >= -1e-9);
                const knee = wrap(rest[`${side}Thigh`] - rest[`${side}Shin`]) + flexChange(r.d, 'knee', side);
                assert.ok(knee >= JOINT_LIMITS.knee.min && knee <= JOINT_LIMITS.knee.max, `${side} knee ${knee}`);
            }
        }
        assert.ok(peakTorso >= 0.35 - 1e-9 && peakTorso <= 0.61 + 1e-9, `peak torso ${peakTorso} rad`);
        assert.ok(Math.abs(joltResponse(lying, intensity, JOLT_PEAK_SEC).d.torso) >= peakTorso - 1e-9, 'torso peaks at 120 ms');
        assert.equal(Math.abs(joltResponse(lying, intensity, 0).d.torso), 0);
        assert.ok(joltResponse(lying, intensity, T).done);
    });
}
test('jolt arms flail out of phase (the two arms do not mirror)', () => {
    let differ = 0;
    for (let k = 1; k < 40; k++) { const r = joltResponse('supine', 0.8, k * 0.01).d; if (Math.abs(r.nearArm - r.farArm) > 0.1) differ++; }
    assert.ok(differ > 20);
});

// ---- T4.1-T4.2b: the jolt and the attacker landings on the Wrestler (flight and pose runner stubbed, no Phaser) -------------------------------------------------
async function downFixture(falls) {
    globalThis.location = { search: falls ? '?falls=v1' : '' };
    const { default: Wrestler } = await import('../src/Wrestler.js');
    const shakes = [];
    const scene = { moveRuntime: { register() {} }, time: { now: 0 }, tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} }, cameras: { main: { shake: (...a) => shakes.push(a) } }, crowd: { impact() {} } };
    const mk = (x, facing) => Object.assign(Object.create(Wrestler.prototype), { scene, state: 'standing', facing, x, y: 360, stamina: 100, pose: { tilt: 1.5, lift: -95 }, idlePose: 'idle',
        skeleton: { setPartVariants() {}, jointAttachmentPoints: { neck: { x: 1, y: 2 } }, artPlacement: () => ({}) }, _activeMove: null, vx: 0, vy: 0, input: { justDown: () => false, isDown: () => false }, moveSet: [] });
    const atk = mk(470, 1), def = mk(520, -1);
    def.state = 'down'; def.lying = 'supine'; def.stateTimer = 4.5;
    let hurts = 0; def._hurt = () => { hurts++; };
    atk._playFlight = (clip, motion, land) => land();   // the flight ends at once, still in its flight state
    atk._runPoseSequence = (seq, done) => done?.();
    atk._drain = () => {};
    return { atk, def, Wrestler, hurts: () => hurts, shakes };
}

test('_downHitReact under ?falls=v1: jolts at the waist, peaks and returns to the lying pose, blocks the pin until it ends, leaves the down timer alone, a get-up clears it', async () => {
    const { def } = await downFixture(true);
    assert.equal(def._downHitReact({}, 'elbowDrop', 0.7), true);
    assert.equal(def.stateTimer, 4.5, 'damage and the down timer are the caller\'s');
    assert.equal(def.isLanding(), true, 'no pin mid-jolt');
    def.tickDown(0.12);
    assert.ok(Math.abs(def._landingOffsets().torso) >= 0.35, 'torso is up at the peak');
    for (let t = 0; t < 0.7; t += 1 / 60) def.tickDown(1 / 60);
    assert.equal(def._landingOffsets(), null, 'back on the lying pose');
    assert.equal(def.isLanding(), false);
    def._downHitReact({}, 'kneeDrop', 0.8); assert.ok(def._landingOffsets());
    def.state = 'gettingUp'; assert.equal(def._landingOffsets(), null, 'a get-up draws the lying pose, no offsets');
    def.tickDown(1 / 60); assert.equal(def._jolt, null);
    delete globalThis.location;
});

test('_downHitReact: prone takes the prone keys; a short down timer is held to the jolt\'s end; flag off is a no-op', async () => {
    let f = await downFixture(true);
    f.def.lying = 'prone'; f.def.stateTimer = 0.1; f.def._downHitReact({}, 'topDive', 0.9);
    assert.equal(f.def._jolt.lying, 'prone'); assert.ok(f.def.stateTimer >= 0.45 + 0.15 * 0.9 - 1e-9, 'held so the jolt never ends in a pop');
    f = await downFixture(false);
    assert.equal(f.def._downHitReact({}, 'elbowDrop', 0.7), false);
    assert.ok(!f.def._jolt && f.def._landingOffsets() === null && f.def.isLanding() === false);
    delete globalThis.location;
});

test('the four moves on a downed man call the jolt once with their weights (the reaction itself is flag-gated)', async () => {
    for (const falls of [true, false]) for (const [call, move, i] of [['_doElbowDrop', 'elbowDrop', 0.7], ['_doKneeDrop', 'kneeDrop', 0.8], ['_doDive', 'divingElbow', 0.9], ['_doTopDive', 'topDive', 0.9]]) {
        const { atk, def, hurts } = await downFixture(falls);
        const calls = []; def._downHitReact = (a, m, n) => calls.push([m, n]);
        atk.x = def.x - 20; atk[call](def);
        if (falls && call === '_doElbowDrop') { assert.equal(hurts(), 0, 'T4.7a: the elbow drop\'s damage waits for the contact frame'); for (let t = 0; t < 1; t += 1 / 60) atk.tickDown(1 / 60); }   // the ground attack's own contact
        assert.deepEqual(calls, [[move, i]], `${call} falls=${falls}`);   // the flag check is inside _downHitReact (no-op off, tested above)
        assert.equal(hurts(), 1);
        assert.equal(def.stateTimer >= 4.5, true);
    }
    delete globalThis.location;
});

test('T4.2b: the attacker of an elbow drop, diving elbow, top dive and press whiff lies down through _layDown (flag on) and rises through the get-up; flag off is as it was', async () => {
    for (const [call, sec] of [['_doDive', 2.0], ['_doTopDive', 3.0], ['_doTheszPress', 2.6]]) {
        const on = await downFixture(true);
        on.atk.x = on.def.x - 20; on.atk[call](on.def);
        assert.equal(on.atk.state, 'down', `${call}: down after the impact`);
        assert.equal(on.atk.lying, 'prone'); assert.equal(on.atk.stateTimer, sec);
        assert.ok(on.atk._groundHandoff, `${call}: the clip's last body eases into the grounded pose`);
        assert.equal(on.atk.pose.tilt, 0); assert.equal(on.atk.pose.lift, 0);
        let rose = 0; on.atk._startRiseUp = () => { rose++; }; on.atk.stateTimer = 0.01; on.atk.tickDown(0.02);
        assert.equal(rose, 1, `${call}: up through the get-up, not idle`);
    }
    const off = await downFixture(false);
    off.atk._doElbowDrop(off.def);
    assert.notEqual(off.atk.state, 'down', 'flag off: the elbow drop attacker still stands up from the crouch');
    assert.ok(!off.atk._groundHandoff);
    delete globalThis.location;
});

// PLAN_FALLS T4.6: the elbow drop's three contact poses stay inside the joint limits and the knee rule (positive thigh - shin only: no knee folds backward)
import { ELBOW_DROP } from '../src/animation/groundContact.js';
test('elbow drop stills: every phase has bend-only knees and elbows inside the limits, and the striking side is an arm the pose names', () => {
    assert.ok(['near', 'far'].includes(ELBOW_DROP.side));
    for (const [phase, { g }] of Object.entries(ELBOW_DROP.phases)) {
        for (const side of ['near', 'far']) {
            const knee = g[`${side}Thigh`] - g[`${side}Shin`], elbow = g[`${side}Fore`] - g[`${side}Arm`];
            assert.ok(knee >= 0 && knee <= JOINT_LIMITS.knee.max, `${phase} ${side} knee flex ${knee}`);
            assert.ok(elbow >= 0 && elbow <= JOINT_LIMITS.elbow.max, `${phase} ${side} elbow flex ${elbow}`);
        }
    }
});

// ---- PLAN_FALLS T4.7a: the elbow drop's ground attack (groundContact.js sampler, Wrestler._beginGroundAttack / _tickGroundAttack / _drawGroundAttack) -------------------------
import { sampleGroundAttack, groundAttackSeconds, groundAttackContactAt, groundAttackReleaseEnd } from '../src/animation/groundContact.js';
const REST_PRONE = Skeleton.REST_POSES.prone;

test('ground attack sampler: g is continuous at every segment join, ends exactly on the ordinary lying pose, and the contact time is the end of the reach', () => {
    const T = ELBOW_DROP.timing, dt = 1 / 600;
    let prev = null, worst = 0;
    for (let t = 0; t <= groundAttackSeconds(ELBOW_DROP) + 0.05; t += dt) {
        const g = sampleGroundAttack(ELBOW_DROP, t, REST_PRONE).g;
        if (prev) for (const k of Object.keys(g)) if (k !== 'hip') worst = Math.max(worst, Math.abs(g[k] - prev[k]));   // hip is px, the rest radians
        prev = g;
    }
    assert.ok(worst < 0.06, `largest channel step per 1/600 s ${worst}`);   // reach is eased in: the steepest part is the arrival at contact
    const end = sampleGroundAttack(ELBOW_DROP, groundAttackSeconds(ELBOW_DROP), REST_PRONE);
    for (const k of Object.keys(REST_PRONE)) if (k !== 't') assert.ok(Math.abs(end.g[k] - REST_PRONE[k]) < 1e-9, `${k} ends on the lying pose`);
    assert.equal(groundAttackContactAt(ELBOW_DROP), T.fall);
    assert.equal(sampleGroundAttack(ELBOW_DROP, groundAttackContactAt(ELBOW_DROP), REST_PRONE).seg, 'hold');
    assert.ok(sampleGroundAttack(ELBOW_DROP, groundAttackContactAt(ELBOW_DROP), REST_PRONE).layer, 'the forearm is over him at contact');
    assert.ok(!sampleGroundAttack(ELBOW_DROP, 0.3 * T.fall, REST_PRONE).layer && !sampleGroundAttack(ELBOW_DROP, groundAttackReleaseEnd(ELBOW_DROP), REST_PRONE).layer, 'no layering early in the fall or after the release');
});

test('ground attack: damage, jolt and shake land once, on the contact frame, and never before it', async () => {
    const { atk, def, hurts, shakes } = await downFixture(true);
    const jolts = []; def._downHitReact = (a, m, n) => jolts.push([m, n]);
    atk.x = def.x - 20; atk._doElbowDrop(def);
    assert.equal(atk.state, 'down'); assert.equal(atk.lying, 'prone'); assert.ok(atk._groundAttack);
    assert.ok(Math.abs(atk.stateTimer - (groundAttackSeconds(ELBOW_DROP) + 0.1)) < 1e-9);
    assert.equal(atk._groundHandoff, null, 'the ground attack draws the blend itself');
    const at = groundAttackContactAt(ELBOW_DROP);
    let t = 0, firedAt = null;
    for (; t < groundAttackSeconds(ELBOW_DROP) + 0.03; t += 1 / 60) { atk.tickDown(1 / 60); if (firedAt === null && hurts() > 0) firedAt = t + 1 / 60; }
    assert.ok(firedAt >= at - 1e-9 && firedAt <= at + 1 / 60 + 1e-9, `fired at ${firedAt}, contact ${at}`);
    assert.equal(hurts(), 1); assert.deepEqual(jolts, [['elbowDrop', 0.7]]); assert.equal(shakes.length, 1);
    assert.equal(atk._groundAttack, null, 'settled into the ordinary lying pose'); assert.equal(atk.state, 'down');
    assert.ok(atk.stateTimer <= 0.1 + 1e-9, 'the get-up follows after a short rest');
    delete globalThis.location;
});

test('ground attack cancel: a pin, a pick-up or a match end before contact costs the receiver nothing and ends the attack; layDown clears it too', async () => {
    for (const to of ['pinned', 'standing', 'gettingUp']) {
        const { atk, def, hurts } = await downFixture(true);
        def._downHitReact = () => {};
        atk.x = def.x - 20; atk._doElbowDrop(def);
        for (let t = 0; t < 0.1; t += 1 / 60) atk.tickDown(1 / 60);
        atk.state = to; atk.tickDown(1 / 60);
        assert.equal(atk._groundAttack, null, to);
        for (let t = 0; t < 1; t += 1 / 60) atk.tickDown(1 / 60);
        assert.equal(hurts(), 0, `${to}: interrupted before contact, no damage`);
    }
    const { atk, def } = await downFixture(true); def._downHitReact = () => {};
    atk._doElbowDrop(def); atk._layDown(1, 'supine'); assert.equal(atk._groundAttack, null);
    delete globalThis.location;
});

test('ground attack depth: the striking forearm draws over the receiver only inside the contact window, in a fixed order; outside it nothing is touched (the ordinary draw restores depths)', async () => {
    const { atk, def } = await downFixture(true);
    def._downHitReact = () => {};
    const depth = {}; const part = (k) => ({ setDepth: (d) => { depth[k] = d; } });
    Object.assign(atk.skeleton, { farUpArm: part('up'), farForearm: part('fore'), farHand: part('hand'), setVisible() {}, groundedPointAt: () => ({ x: 0, y: 0 }), _applyGrounded() {} });
    Object.assign(def.skeleton, { _parts: [], jointAttachmentPoints: {} }); def._heightScale = 1; atk._heightScale = 1;
    const gfx = { fillStyle() {}, fillEllipse() {} };
    atk._doElbowDrop(def);
    const draw = (t) => { for (const k of Object.keys(depth)) delete depth[k]; atk._groundAttack.t = t; atk._drawGroundAttack(1, 1, gfx); };
    draw(ELBOW_DROP.timing.fall + 0.01);
    const over = 12 + def.y * 0.03;
    assert.ok(depth.fore > over && depth.up > over && depth.hand > over, 'over the receiver at contact');
    assert.ok(depth.up < depth.fore && depth.fore < depth.hand, 'fixed order: upper arm, forearm, hand');
    draw(0.3 * ELBOW_DROP.timing.fall); assert.deepEqual(depth, {}, 'early in the fall: untouched');
    draw(groundAttackReleaseEnd(ELBOW_DROP) + 0.01); assert.deepEqual(depth, {}, 'after the release: untouched');
    delete globalThis.location;
});

test('ground attack ring room: the drawn root never leaves the ropes, whatever the receiver\'s position', async () => {
    const { atk, def } = await downFixture(true);
    def._downHitReact = () => {};
    const roots = [];
    Object.assign(atk.skeleton, { farUpArm: { setDepth() {} }, farForearm: { setDepth() {} }, farHand: { setDepth() {} }, setVisible() {}, groundedPointAt: () => ({ x: 0, y: 0 }), _applyGrounded: (x, y) => roots.push([x, y]) });
    Object.assign(def.skeleton, { _parts: [], jointAttachmentPoints: { neck: { x: 500, y: -400 }, nearHip: { x: 560, y: -400 }, farHip: { x: 560, y: -400 } } }); def._heightScale = 1; atk._heightScale = 1;   // a chest far past the far rope
    atk._doElbowDrop(def);
    const gfx = { fillStyle() {}, fillEllipse() {} };
    for (let t = 0.2; t < groundAttackReleaseEnd(ELBOW_DROP); t += 0.05) { atk._groundAttack.t = t; atk._drawGroundAttack(1, 1, gfx); }
    assert.ok(roots.length > 5);
    for (const [, y] of roots) assert.ok(y >= RING.farLeft.y + 6 - 1e-9 && y <= RING.nearLeft.y - 6 + 1e-9, `root y ${y}`);
    delete globalThis.location;
});

// ---- PLAN_FALLS T4.7b: one continuous fall into the chest ---------------------------------------------------------------------------------------------------------------------
test('T4.7b fall: the eased fraction keeps speeding up to the contact frame (no stall, no settled pose before it), and the hold starts exactly on the contact pose', () => {
    const T = ELBOW_DROP.timing, dt = T.fall / 100;
    let prevE = 0, prevV = -1;
    for (let t = dt; t <= T.fall + 1e-9; t += dt) {
        const s = sampleGroundAttack(ELBOW_DROP, Math.min(t, T.fall - 1e-9), REST_PRONE);
        assert.equal(s.seg, 'fall');
        const v = s.e - prevE; assert.ok(v > prevV, `speed rises at t=${t.toFixed(3)}`); prevV = v; prevE = s.e;
    }
    assert.ok(sampleGroundAttack(ELBOW_DROP, T.fall - 1e-9, REST_PRONE).e > 0.99);
    const hold0 = sampleGroundAttack(ELBOW_DROP, T.fall, REST_PRONE);
    assert.equal(hold0.seg, 'hold');
    for (const k of Object.keys(ELBOW_DROP.phases.contact.g)) assert.ok(Math.abs(hold0.g[k] - ELBOW_DROP.phases.contact.g[k]) < 1e-9, `${k}: the fall ends on the contact pose`);
    // compression: the hip dips into him over the hold and is back at the contact height at its end
    const mid = sampleGroundAttack(ELBOW_DROP, T.fall + T.hold * T.pressAt, REST_PRONE), end = sampleGroundAttack(ELBOW_DROP, T.fall + T.hold - 1e-9, REST_PRONE);
    assert.ok(Math.abs(mid.g.hip - (ELBOW_DROP.phases.contact.g.hip - T.pressHip)) < 1e-6 && Math.abs(end.g.hip - ELBOW_DROP.phases.contact.g.hip) < 0.01);
});

test('T4.7b: under ?falls=v1 the flight is the elbow drop clip cut at its apex key (no impact event, registered once); flag off plays the whole clip', async () => {
    for (const falls of [true, false]) {
        const { atk, def } = await downFixture(falls);
        const regs = []; atk.scene.moveRuntime.register = (c) => regs.push(c.id);
        const seen = []; atk._playFlight = (clip, motion, land) => { seen.push(clip); };
        atk._doElbowDrop(def); atk._doElbowDrop(def);
        const clip = seen[0];
        if (falls) {
            assert.equal(clip.id, 'elbowDropFall'); assert.equal(clip.duration, ELBOW_DROP.flightAt);
            const keys = clip.tracks.attacker.keyframes; assert.ok(keys.at(-1).at === ELBOW_DROP.flightAt && keys.every(k => k.at <= ELBOW_DROP.flightAt));
            assert.deepEqual(clip.events, []);
            assert.ok(clip.tracks.attacker.keyframes.at(-1).pose.lift > 0, 'cut while he is still in the air');
            assert.ok(regs.length <= 1, 'registered once per runtime');
        } else assert.equal(clip.id, 'elbowDrop');
    }
    delete globalThis.location;
});

// ---- PLAN_FALLS T4.7c: the sell after a ground hit (falls.js groundHitSell), the squash and recoil, the elbow-led fall -----------------------------------------------------------
import { groundHitSell, groundHitSellDuration, GROUND_SELL } from '../src/animation/falls.js';
test('T4.7c groundHitSell: exactly 0 at the end, chest pinned until the curl starts, knees only ever gain flex, three alternating kicks that fade', () => {
    for (const lying of ['supine', 'prone']) for (const i of [0.4, 0.7, 1]) {
        const end = groundHitSellDuration(i);
        for (const [ch, v] of Object.entries(groundHitSell(lying, i, end).d)) assert.equal(v, 0, `${lying} ${ch}`);
        assert.ok(groundHitSell(lying, i, end).done);
        let peak = 0;
        for (let t = 0; t < end; t += 1 / 240) {
            const { d } = groundHitSell(lying, i, t);
            if (t <= GROUND_SELL.pinned) assert.ok(Math.abs(d.torso) < 1e-9, `${lying} chest pinned at ${t.toFixed(3)}`);
            peak = Math.max(peak, Math.abs(d.torso));
            for (const side of ['near', 'far']) assert.ok(d[`${side}Thigh`] - d[`${side}Shin`] >= -1e-9, `${lying} ${side} flex never shrinks at ${t.toFixed(3)}`);
            for (const [ch, v] of Object.entries(d)) if (ch !== 'hip') assert.ok(Math.abs(v) < 1.6, `${lying} ${ch} bounded`);   // hip is px
        }
        assert.ok(peak > 0.1 && peak < 0.25, `${lying} curl ${peak}: a small curl (toned down at r2c), not the jolt's 0.35-0.61 lift`);
    }
    // the kicks: near, far, near, in that order, each a swing of the whole leg (supine: thigh and shin together), the third smaller than the first
    const kick = (t, side) => { const a = groundHitSell('supine', 0.7, t).d, base = groundHitSell('supine', 0.7, GROUND_SELL.kickFrom - 1e-3).d; return a[`${side}Thigh`] - 0.30 * 0 - base[`${side}Thigh`]; };
    const win = (j) => GROUND_SELL.kickFrom + (j + 0.5) * GROUND_SELL.kickEvery;
    const swing = (j) => { const side = j % 2 ? 'far' : 'near', other = j % 2 ? 'near' : 'far'; return [kick(win(j), side), kick(win(j), other)]; };
    const k0 = swing(0), k1 = swing(1), k2 = swing(2);
    assert.ok(k0[0] > 0.25 && k1[0] > 0.2 && k2[0] > 0.1, 'near, far, near each swing');
    assert.ok(k0[0] > k2[0], 'they fade');
});

test('T4.7c: the elbow drop\'s receiver gets the curl sell on the contact frame; it ends on the lying pose and holds the pin off until it does', async () => {
    const { atk, def } = await downFixture(true);
    const real = def._downHitReact.bind(def), seen = []; def._downHitReact = (a, m, n, sell) => { seen.push([m, n, sell]); return real(a, m, n, sell); };
    def._hurt = () => {};
    atk.x = def.x - 20; atk._doElbowDrop(def);
    for (let t = 0; t < groundAttackContactAt(ELBOW_DROP) + 0.02; t += 1 / 60) atk.tickDown(1 / 60);
    assert.deepEqual(seen, [['elbowDrop', 0.7, 'curl']]);
    assert.equal(def._jolt.sell, 'curl'); assert.equal(def.isLanding(), true, 'no pin mid-sell');
    assert.ok(def.stateTimer >= groundHitSellDuration(0.7) - 1e-9);
    let n = 0; while (def._jolt && n++ < 200) def.tickDown(1 / 60);
    assert.equal(def._jolt, null); assert.equal(def._landingOffsets(), null, 'back on the lying pose');
    delete globalThis.location;
});

test('T4.7c: the elbow drop\'s contact pose and roll-off keep his legs on the mat (knee flex only, thighs along the mat), and the fall\'s arms lead the body', () => {
    for (const ph of ['contact', 'rolloff']) { const g = ELBOW_DROP.phases[ph].g;
        for (const side of ['near', 'far']) { const flex = g[`${side}Thigh`] - g[`${side}Shin`]; assert.ok(flex >= 0 && flex < 0.5, `${ph} ${side} knee barely bent: ${flex}`); assert.ok(Math.abs(g[`${side}Thigh`] + Math.PI / 2) < 0.5, `${ph} ${side} thigh trails along the mat`); } }
    const s = sampleGroundAttack(ELBOW_DROP, ELBOW_DROP.timing.fall * 0.3, REST_PRONE);
    assert.ok(s.eArm > s.e + 0.3, `arms ${s.eArm} ahead of the body ${s.e} early in the fall`);
    assert.ok(sampleGroundAttack(ELBOW_DROP, ELBOW_DROP.timing.fall * ELBOW_DROP.timing.armLead, REST_PRONE).eArm > 0.999, 'the elbow is cocked by armLead');
});

// ---- PLAN_FALLS T4.7d: the knee drop, diving elbow and top dive sell with groundHitSell at their own weights ----------------------------------------------------------------
test('T4.7d knee drop, diving elbow and top dive on a downed man play groundHitSell (curl) at their own intensity, not the jolt', async () => {
    for (const [call, move, i] of [['_doKneeDrop', 'kneeDrop', 0.8], ['_doDive', 'divingElbow', 0.9], ['_doTopDive', 'topDive', 0.9]]) {
        const { atk, def } = await downFixture(true);
        const calls = []; const real = def._downHitReact.bind(def);
        def._downHitReact = (a, m, n, sell) => { calls.push([m, n, sell]); return real(a, m, n, sell); };
        atk.x = def.x - 20; atk[call](def);
        assert.deepEqual(calls, [[move, i, 'curl']], call);
        assert.equal(def._jolt.sell, 'curl', call);
        assert.ok(def.stateTimer >= groundHitSellDuration(i), `${call}: the timer holds to the sell's end`);
    }
    delete globalThis.location;
});
