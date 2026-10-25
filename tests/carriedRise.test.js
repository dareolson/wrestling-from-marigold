// D5 (PLAN_SUPLEX_RISE T4.6): a back rise that hands off into the carried standing recovery
// keeps its reach to t = 1, and the standing hand starts on the arm the rise ended with.
// Node has no Phaser parts: a stub forward-kinematics rig runs the REAL solver and
// Skeleton.carriedRiseEndArm; real-rig numbers come from tools/debug/rise_end_arm.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';
import { backRiseWeight, carriedHandTarget, ARM_SETTLE_MS, RECOVERY_BACK_HAND_ABS, RECOVERY_BACK_HAND } from '../src/animation/backRisePerformance.js';
import { JOINT_LIMITS } from '../src/rig/articulation.js';
import { newGripLatch } from '../src/animation/sellAppearance.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';

const BOTH = '?sellart=v1&aftermath=v2';
const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };
const noop = () => {};

// ── backRiseWeight(t, from, peak, carry) ────────────────────────────────────────────────────────
test('carry: monotone from `from` to `peak`, equal to peak at t = 1 and beyond; without carry nothing changes', () => {
    for (const peak of [0.6, 1]) for (const from of [0, 0.4, 0.8]) {
        if (from > peak) continue;
        let prev = backRiseWeight(0, from, peak, true);
        assert.equal(prev, from);
        for (let t = 0.01; t <= 1.0001; t += 0.01) {
            const v = backRiseWeight(Math.min(1, t), from, peak, true);
            assert.ok(v >= prev - 1e-12, `monotone at t=${t}`);
            prev = v;
        }
        assert.equal(backRiseWeight(1, from, peak, true), peak);
        assert.equal(backRiseWeight(1.5, from, peak, true), peak);
        assert.equal(backRiseWeight(0.18, from, peak, true), peak);
    }
    assert.equal(backRiseWeight(NaN, 0.5, 1, true), 0);
    for (const t of [-1, 0, 0.1, 0.5, 0.7, 0.85, 0.999, 1, 2]) for (const from of [0, 0.5]) {
        assert.equal(backRiseWeight(t, from, 1, false), backRiseWeight(t, from, 1), `t=${t}`);
        assert.equal(backRiseWeight(t, from), backRiseWeight(t, from, 1, false));
    }
    assert.equal(backRiseWeight(1), 0, 'the un-carried rise still ends at 0');
});

test('carry with no hold equals the original envelope up to the ease-out start', () => {
    for (let t = 0; t <= 0.7; t += 0.05) assert.ok(Math.abs(backRiseWeight(t, 0, 0.8, true) - backRiseWeight(t) * 0.8) < 1e-12);
});

// ── carriedRiseEndArm on a stub rig: the channel conversion ────────────────────────────────────
const LU = 36, LF = 36, TORSO = 60;
const dirOf = (f, a) => ({ x: Math.sin(f * a), y: Math.cos(f * a) });
function rig() {
    const sk = Object.create(Skeleton.prototype);
    Object.assign(sk, { _lockLimbJoints: false });
    sk._applyGrounded = function (x, y, s, facing, g) {
        const f = facing >= 0 ? 1 : -1, tdir = dirOf(f, g.torso);
        const hip = { x, y: y - g.hip * s };
        const S = { x: hip.x + tdir.x * TORSO * s, y: hip.y + tdir.y * TORSO * s };
        const arm = (a, b) => {
            const E = { x: S.x + dirOf(f, a).x * LU * s, y: S.y + dirOf(f, a).y * LU * s };
            return [E, { x: E.x + dirOf(f, b).x * LF * s, y: E.y + dirOf(f, b).y * LF * s }];
        };
        const [fe, fw] = arm(g.farArm, g.farFore), [ne, nw] = arm(g.nearArm, g.nearFore);
        this.jointAttachmentPoints = { neck: S, nearHip: hip, farHip: hip, nearShoulder: S, farShoulder: S,
            nearElbow: ne, nearWrist: nw, farElbow: fe, farWrist: fw };
        this.last = { g: { ...g }, S, nw };
    };
    return sk;
}

test('the rise-end arm in upright channels puts the near wrist where the rise left it (<= 2 px), both facings', () => {
    const FWD = 0.09; // updateUpright's ARM_FWD
    for (const facing of [1, -1]) {
        const sk = rig();
        const end = sk.carriedRiseEndArm(1, facing, 1);
        assert.ok(end, 'a reach exists');
        // the rise's own last frame: the same solve, drawn
        const g = Skeleton._getUpPose(Skeleton.GETUP_SUPINE_POSES, 1, false, 0);
        sk.updateGroundedReach(400, 430, 1, facing, g, { near: { to: 'nearHip', w: 1 } }, { paintedContacts: true, backContact: true });
        const { S, nw } = sk.last;
        // updateUpright's arm math from the same shoulder: f*arm + f*FWD, forearm = arm + local flex
        const upA = facing * end.arm + facing * FWD;
        const upF = facing * end.arm + facing * end.elbow + facing * FWD;
        const E = { x: S.x + Math.sin(upA) * LU, y: S.y + Math.cos(upA) * LU };
        const W = { x: E.x + Math.sin(upF) * LF, y: E.y + Math.cos(upF) * LF };
        assert.ok(Math.hypot(W.x - nw.x, W.y - nw.y) <= 2, `wrist off by ${Math.hypot(W.x - nw.x, W.y - nw.y)}`);
        assert.ok(end.elbow <= JOINT_LIMITS.elbow.max && end.elbow >= JOINT_LIMITS.elbow.min);
    }
});

test('the rise-end arm is cached per scale/facing/peak and identical in pose space for both facings', () => {
    const sk = rig();
    const a = sk.carriedRiseEndArm(1, 1, 1), b = sk.carriedRiseEndArm(1, -1, 1);
    assert.ok(Math.abs(a.arm - b.arm) < 1e-9 && Math.abs(a.elbow - b.elbow) < 1e-9);
    assert.equal(sk.carriedRiseEndArm(1, -1, 1), b, 'cached');
    assert.notEqual(sk.carriedRiseEndArm(1, -1, 0.5), b, 'peak is part of the key');
});

// ── Wrestler wiring ────────────────────────────────────────────────────────────────────────────
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05, lElbow: 0.7, rElbow: 0.7, lShin: -0.11, rShin: -0.06 };
const END = { arm: -1.205, elbow: 2.26 };
function fixture({ backWaist = true, state = 'standing', pain, now = 1000 } = {}) {
    const drawn = [], guards = [], calls = [];
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now }, tweens: { add: () => ({ stop() {} }) } },
        x: 400, y: 380, _heightScale: 1, facing: 1, state, lying: 'supine',
        skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0.9, pose: { ...IDLE },
        _activeMove: null, _choreoUntil: 0, _floorContacts: null, _sell: null, _hold: null, _riseFrom: 0, _gripLatch: null,
        stateTimer: 0, input: { isDown: () => false, justDown: () => false },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: {
            _textureConfig: theszProcreateV1.textures, lChannelSide: () => 'near', setPartVariants: p => calls.push({ ...p }),
            torso: backWaist ? { _semanticAnchors: { backWaist: { u: 0.22, v: 0.6 } } } : {},
            backContactDistance: () => 5, carriedRiseEndArm: () => ({ ...END }),
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop,
            updateGetUp: noop,
            updateUpright: (...a) => { drawn.push(a[4]); guards.push(a[6]); },
        },
    });
    w._pain = pain ?? { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since: now, until: now + 2500, planned: true,
        carried: 1, riseEnd: { ...END } };
    return { w, drawn, guards, calls };
}

test('the rise context carries `carry` only with both flags and a painted backWaist; the landing stores the end arm', () => {
    const ctxOf = (flags, over) => withFlag(flags, () => fixture({ state: 'gettingUp', pain: { phase: 'rise', part: 'back', severity: 1 }, ...over }).w._backRiseContext());
    assert.equal(ctxOf(BOTH)?.carry, true);
    assert.equal(ctxOf('?sellart=v1')?.carry, undefined, 'sellart alone: not carried');
    assert.equal(ctxOf(BOTH, { backWaist: false })?.carry, undefined, 'no painted backWaist: not carried');
    assert.equal(ctxOf('?aftermath=v2'), null, 'aftermath alone: no rise context at all');
    withFlag(BOTH, () => {
        const { w } = fixture({ state: 'gettingUp', pain: { phase: 'rise', part: 'back', severity: 0.6 } });
        const carried = w._carriedRiseEnd();
        assert.equal(carried.w, 0.6);
        w.state = 'standing';
        w.scene.time.now = 2000;
        w._painRecovering(carried);
        assert.equal(w._pain.carried, 0.6);
        assert.deepEqual(w._pain.riseEnd, END);
        // a quick rise (or any landing that was not a carried rise) stores nothing
        const q = fixture({ pain: { phase: 'rise', part: 'back', severity: 1 } }).w;
        q._painRecovering();
        assert.equal(q._pain.carried, undefined);
    });
});

test('first standing draw: hand already at full weight on the rise-end arm; guard fully given up; art carried', () => withFlag(BOTH, () => {
    const { w, drawn, guards, calls } = fixture();
    assert.equal(w._recoveryWeight(), 0, 'the ordinary recovery weight still ramps in from 0');
    assert.equal(w._recoveryHandWeight(), 1);
    w._gripLatch = newGripLatch(true, 0);
    w.draw();
    assert.ok(Math.abs(drawn.at(-1).lArm - END.arm) < 1e-12);
    assert.ok(Math.abs(drawn.at(-1).lElbow - END.elbow) < 1e-12);
    assert.equal(guards.at(-1), 0, 'guard scaled by 1 - hand weight');
    assert.deepEqual(calls.at(-1), { nearForearm: 'grip' });
    assert.equal(drawn.at(-1).bend, IDLE.bend ?? 0 + 0, 'bend keeps its fade-in (0 at entry)');
    assert.equal(drawn.at(-1).rArm, IDLE.rArm, 'far arm untouched');
}));

test('the near-arm channels move <= .05 rad per frame from the rise end through settling, and land on the probed pose', () => withFlag(BOTH, () => {
    const { w, drawn } = fixture();
    const since = w._pain.since;
    let prev = END, maxStep = 0;
    for (let ms = 0; ms <= 1500; ms += 1000 / 60) {
        w.scene.time.now = since + ms;
        w.draw();
        const p = drawn.at(-1);
        maxStep = Math.max(maxStep, Math.abs(p.lArm - prev.arm), Math.abs(p.lElbow - prev.elbow));
        prev = { arm: p.lArm, elbow: p.lElbow };
        if (ms >= ARM_SETTLE_MS + 50) {
            // settled: the carried hand is the absolute probed pose x hand weight blended into the idle
            const hw = w._recoveryHandWeight();
            assert.ok(Math.abs(p.lArm - (IDLE.lArm + (RECOVERY_BACK_HAND_ABS.arm - IDLE.lArm) * hw)) < 1e-9);
        }
    }
    assert.ok(maxStep <= 0.05, `max per-frame step ${maxStep}`);
    assert.ok(Math.abs(RECOVERY_BACK_HAND_ABS.arm - (IDLE.lArm + RECOVERY_BACK_HAND.arm)) < 1e-12);
    assert.ok(Math.abs(RECOVERY_BACK_HAND_ABS.elbow - (IDLE.lElbow + RECOVERY_BACK_HAND.elbow)) < 1e-12);
    const t0 = carriedHandTarget(END, 0), t1 = carriedHandTarget(END, ARM_SETTLE_MS);
    assert.deepEqual(t0, END);
    assert.ok(Math.abs(t1.arm - RECOVERY_BACK_HAND_ABS.arm) < 1e-12 && Math.abs(t1.elbow - RECOVERY_BACK_HAND_ABS.elbow) < 1e-12);
}));

test('legacy-forearm pose: the carried hand blends the absolute forearm instead', () => withFlag(BOTH, () => {
    const { w, drawn } = fixture();
    const { lElbow, rElbow, ...legacy } = IDLE;
    w.pose = { ...legacy, lForearm: 0.8 };
    w.draw();
    const got = drawn.at(-1);
    assert.ok(Math.abs(got.lArm - END.arm) < 1e-12);
    assert.ok(Math.abs(got.lForearm - (END.arm + END.elbow)) < 1e-12);
    assert.equal(got.lElbow, undefined);
}));

test('expiry of a carried recovery: no frame snap > .02 rad, back to the idle arm, art released', () => withFlag(BOTH, () => {
    const { w, drawn, calls } = fixture();
    const { since, until } = w._pain;
    w._gripLatch = newGripLatch(true, 0);
    let prev = null, maxStep = 0;
    for (let now = since; now <= until + 100; now += 1000 / 60) {
        w.scene.time.now = now;
        w.draw();
        const arm = drawn.at(-1).lArm;
        if (prev !== null && now >= until - 500) maxStep = Math.max(maxStep, Math.abs(arm - prev));
        prev = arm;
    }
    assert.ok(maxStep < 0.02, `max step ${maxStep}`);
    assert.ok(Math.abs(prev - IDLE.lArm) < 1e-9);
    assert.deepEqual(calls.at(-1), {});
    assert.equal(w._gripLatch, null);
}));

test('interruptions still release a carried recovery: a hit, choreography, a move', () => withFlag(BOTH, () => {
    const hit = fixture();
    hit.w._gripLatch = newGripLatch(true, 0);
    hit.w.draw();
    assert.deepEqual(hit.calls.at(-1), { nearForearm: 'grip' });
    hit.w._hurt(5, 'jab');
    assert.equal(hit.w._recoveryHandOnBack(), false);
    hit.w.draw();
    assert.deepEqual(hit.calls.at(-1), {});
    const choreo = fixture();
    choreo.w._choreoUntil = 99999;
    assert.equal(choreo.w._recoveryHandOnBack(), false);
    const moving = fixture();
    moving.w._activeMove = { id: 'x' };
    assert.equal(moving.w._recoveryHandOnBack(), false);
}));

test('not carried: aftermath alone, sellart alone, a rig without backWaist and an un-carried recovery are unchanged', () => {
    withFlag('?aftermath=v2', () => {
        const { w, drawn } = fixture();
        w.draw();
        assert.equal(drawn.at(-1).lArm, IDLE.lArm, 'aft-only: no hand motif');
        assert.ok(w._recoveryHandWeight() === 0);
    });
    withFlag('?sellart=v1', () => {
        const { w, drawn } = fixture();
        w.draw();
        assert.equal(drawn.at(-1), w.pose, 'no recovery without aftermath=v2');
    });
    withFlag(BOTH, () => {
        const { w, drawn } = fixture({ backWaist: false });
        w.draw();
        assert.equal(drawn.at(-1).lArm, IDLE.lArm, 'George-style rig: no hand motif');
        // a recovery that was not entered from a carried rise keeps the offset path and its 200 ms fade-in
        const plain = fixture({ pain: { source: 'suplex', part: 'back', severity: 1, phase: 'recover', since: 1000, until: 3500, planned: true } });
        assert.equal(plain.w._recoveryHandWeight(), plain.w._recoveryWeight());
        assert.equal(plain.w._recoveryPose(), null, 'weight 0 on the first frame: nothing drawn');
        plain.w.scene.time.now = 1100;
        const p = plain.w._recoveryPose(), wt = plain.w._recoveryWeight();
        assert.ok(Math.abs(p.lArm - (IDLE.lArm + RECOVERY_BACK_HAND.arm * wt)) < 1e-12);
    });
});
