// ?sellart=v1 standing back-recovery hand (PLAN_SUPLEX_RISE T4.2 / T4.4): the near hand rests
// at the back waist while the hurt is carried, on top of ?aftermath=v2; released by the same
// rules as the rest of the recovery, plus pain.until.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { newGripLatch } from '../src/animation/sellAppearance.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { onlyListed } from './support/promotedFlags.js';

const noop = () => {};
const BOTH = '?sellart=v1&aftermath=v2';
// Lou's numbers live on his rig (textures.backSell); this keeps the tests' old vocabulary.
const RECOVERY_BACK_HAND = { arm: theszProcreateV1.textures.backSell.recoveryArm, elbow: theszProcreateV1.textures.backSell.recoveryElbow };
const withFlag = (search, fn) => { globalThis.location = { search: onlyListed(search) }; try { return fn(); } finally { delete globalThis.location; } };
// the live settled pose (film dbg.pose): local elbow flex, no legacy forearm
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05, lElbow: 0.7, rElbow: 0.7, lShin: -0.11, rShin: -0.06 };

function standing({ backWaist = true, backSell = true, now = 1000, since = 0, until = 3500, dist = 5 } = {}) {
    const drawn = [], calls = [];
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now }, tweens: { add: () => ({ stop() {} }) } },
        x: 400, y: 380, _heightScale: 1, facing: 1, state: 'standing', lying: 'supine',
        skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0, pose: { ...IDLE },
        _activeMove: null, _choreoUntil: 0, _floorContacts: null, _sell: null, _groundHandoff: null, _hold: null, _riseFrom: 0, _gripLatch: null,
        stateTimer: 0, input: { isDown: () => false, justDown: () => false },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: {
            _textureConfig: backSell ? theszProcreateV1.textures : { ...theszProcreateV1.textures, backSell: undefined }, lChannelSide: () => 'near', setPartVariants: p => calls.push({ ...p }),
            torso: backWaist ? { _semanticAnchors: { backWaist: { u: 0.22, v: 0.6 } } } : {},
            backContactDistance: () => w.__dist,
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop, updateUpright: (...a) => { drawn.push(a[4]); w.__guard = a[6]; },
        },
    });
    w.__dist = dist;
    w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since, until, planned: true };
    return { w, drawn, calls };
}

test('with both flags the near l-channels carry the back-waist offsets x recovery weight; this.pose is untouched', () => {
    withFlag(BOTH, () => {
        const { w, drawn } = standing({ now: 1000 });
        const w0 = w._recoveryWeight();
        assert.ok(w0 > 0);
        const before = structuredClone(w.pose);
        w.draw();
        const got = drawn.at(-1);
        assert.notEqual(got, w.pose);
        assert.deepEqual(w.pose, before);
        assert.ok(Math.abs(got.lArm - (IDLE.lArm + RECOVERY_BACK_HAND.arm * w0)) < 1e-12);
        assert.ok(Math.abs(got.lElbow - (IDLE.lElbow + RECOVERY_BACK_HAND.elbow * w0)) < 1e-12);
        assert.equal(got.lForearm, undefined, 'the elbow owner is not duplicated');
        assert.ok(got.bend > 0.1, 'the aftermath bend is still there');
        assert.equal(got.rArm, IDLE.rArm, 'far arm untouched');
    });
});

test('a pose that still carries only the legacy forearm gets the same relative elbow bend', () => {
    withFlag(BOTH, () => {
        const { w, drawn } = standing({ now: 1000 });
        const { lElbow, rElbow, ...legacy } = IDLE;
        w.pose = { ...legacy, lForearm: 0.8 };
        const w0 = w._recoveryWeight();
        w.draw();
        const got = drawn.at(-1);
        const rel = (got.lForearm - got.lArm) - (0.8 - IDLE.lArm);
        assert.ok(Math.abs(rel - RECOVERY_BACK_HAND.elbow * w0) < 1e-12);
    });
});

test('aftermath alone keeps its bend-only back motif; sellart alone adds nothing; a rig without backWaist gets the bend only', () => {
    withFlag('?aftermath=v2', () => {
        const { w, drawn } = standing();
        w.draw();
        assert.equal(drawn.at(-1).lArm, IDLE.lArm);
        assert.equal(drawn.at(-1).lElbow, IDLE.lElbow);
    });
    withFlag('?sellart=v1', () => {
        const { w, drawn } = standing();
        w.draw();
        assert.equal(drawn.at(-1), w.pose, 'no recovery without aftermath=v2');
    });
    withFlag(BOTH, () => {
        const { w, drawn } = standing({ backWaist: false });
        w.draw();
        assert.equal(drawn.at(-1).lArm, IDLE.lArm, 'George-style rig: no hand motif');
        assert.ok(drawn.at(-1).bend > 0.1);
    });
    withFlag(BOTH, () => {
        const { w, drawn } = standing({ backSell: false });
        w.draw();
        assert.equal(drawn.at(-1).lArm, IDLE.lArm, 'a backWaist without backSell data: no hand motif, Lou\'s numbers are not borrowed');
        assert.equal(drawn.at(-1).lElbow, IDLE.lElbow);
        assert.ok(drawn.at(-1).bend > 0.1);
    });
});

test('the grip carries into recovery from the measured distance and is released with the motif', () => withFlag(BOTH, () => {
    const { w, calls } = standing({ dist: 5 });
    w._gripLatch = newGripLatch(true, 0);
    w.draw();
    assert.deepEqual(calls.at(-1), { nearForearm: 'grip' });
    // hit during recovery: _hurt replaces the pain context (phase 'mat'); the motif and art go on the next draw
    w._hurt(5, 'jab');
    assert.equal(w._recoveryHandOnBack(), false);
    w.draw();
    assert.deepEqual(calls.at(-1), {});
    assert.equal(w._gripLatch, null);
}));

test('pain.until expiry mid-recovery: the motif ramps out, no frame-to-frame snap, art released', () => withFlag(BOTH, () => {
    const until = 3500, since = 1000;
    const { w, drawn, calls } = standing({ now: since, since, until });
    w._gripLatch = newGripLatch(true, 0);
    let prev = null, maxStep = 0, lastNonZero = null;
    for (let now = since; now <= until + 100; now += 1000 / 60) {
        w.scene.time.now = now;
        w.draw();
        const arm = drawn.at(-1).lArm;
        if (prev !== null && now >= until - 500) maxStep = Math.max(maxStep, Math.abs(arm - prev));
        prev = arm;
        if (w._recoveryWeight() > 0) lastNonZero = now;
    }
    assert.ok(maxStep < 0.02, `max per-frame lArm step ${maxStep}`);
    assert.ok(Math.abs(prev - IDLE.lArm) < 1e-9, 'back to the idle arm after expiry');
    assert.ok(lastNonZero > until - 100);
    // art: once the weight is 0 the hand has no owner, so the selection is released
    assert.deepEqual(calls.at(-1), {});
    assert.equal(w._gripLatch, null);
}));

test('picked up / moved during recovery: choreography and moves claim the pose and the hand art', () => withFlag(BOTH, () => {
    for (const over of [{ _choreoUntil: 9999 }, { state: 'staggered' }]) {
        const { w, drawn } = standing();
        Object.assign(w, over);
        w.draw();
        assert.equal(drawn.at(-1)?.lArm ?? IDLE.lArm, IDLE.lArm, JSON.stringify(over));
        assert.equal(w._recoveryHandOnBack(), false, JSON.stringify(over));
    }
}));

test('the combat guard yields to the back hand in proportion to the recovery weight; otherwise it is untouched', () => {
    withFlag(BOTH, () => {
        const { w } = standing({ now: 1000 });
        w.combatBlend = 1;
        w.draw();
        assert.ok(Math.abs(w.__guard - (1 - w._recoveryWeight())) < 1e-12);
        w._pain.part = 'knee'; w._pain.limb = 'rLeg'; w.draw();
        assert.equal(w.__guard, 1, 'knee recovery keeps the guard');
    });
    for (const search of ['?aftermath=v2', '?sellart=v1', '']) withFlag(search, () => {
        const { w } = standing({ now: 1000 });
        w.combatBlend = 0.7; w.draw();
        assert.equal(w.__guard, 0.7, search);
    });
});
