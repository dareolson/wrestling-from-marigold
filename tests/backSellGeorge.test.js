// The back sell on a SECOND rig (PLAN_GEORGE_TRANSFER T3.4): George (george-roster-v1) runs the lying hold, the
// contact-latched art, the carried rise and the standing back hand from HIS data, with the declared fallbacks:
// no grip donor (gripArt 'none') and the wrist as the contact (contact 'wristProxy'). Nothing here uses Lou's
// numbers; tests/backSellLouFixture.test.js separately pins that Lou did not move.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { POSES } from '../src/Wrestler.js';
import { holdWeight, settledBackHand, carriedHandTarget, ARM_SETTLE_MS } from '../src/animation/backRisePerformance.js';
import { clutchSell, sampleSell } from '../src/animation/sells.js';
import { newGripLatch, nearGripParts } from '../src/animation/sellAppearance.js';
import { AROUND, aroundChannel, backSellSupport, recoveryVia } from '../src/rig/backSell.js';
import { georgeRosterV1 } from '../src/characters/george_roster_v1.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { onlyListed } from './support/promotedFlags.js';

const BOTH = '?sellart=v1&aftermath=v2';
const noop = () => {};
const withFlag = (search, fn) => { globalThis.location = { search: onlyListed(search) }; try { return fn(); } finally { delete globalThis.location; } };
const G = georgeRosterV1, BS = G.textures.backSell, LOU = theszProcreateV1.textures.backSell;
const IDLE = POSES[G.idlePose];
// the live settled stance: the rig's idle channels, local elbows at .70 (see tools/debug/recovery_probe.mjs)
const SETTLED = { lLeg: IDLE.lLeg, rLeg: IDLE.rLeg, lArm: IDLE.lArm, rArm: IDLE.rArm, lean: IDLE.lean ?? 0, crouch: IDLE.crouch ?? 0, lElbow: 0.7, rElbow: 0.7 };

function george({ state = 'standing', now = 1000, dist = 9, textures = G.textures, pain, sell = false } = {}) {
    const calls = [], drawn = [], grounded = [];
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now }, tweens: { add: () => ({ stop() {} }), killTweensOf: noop } },
        x: 400, y: 380, _heightScale: 1, facing: 1, state, lying: 'supine', idlePose: G.idlePose, stateTimer: 3,
        skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0, pose: { ...SETTLED },
        _activeMove: null, _choreoUntil: 0, _floorContacts: null, _groundHandoff: null, _hold: null, _riseFrom: 0, _gripLatch: null,
        _sell: sell ? { plan: [{ name: 'clutch', part: 'back', lying: 'supine', limb: null, rolls: 0, duration: 1, amp: 1 }], i: 0, t: 0.99, facing0: 1 } : null,
        input: { isDown: () => false, justDown: () => false },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: { _textureConfig: textures, lChannelSide: () => 'near', setPartVariants: p => calls.push({ ...p }),
            torso: { _semanticAnchors: textures.torso.semanticAnchors }, backContactDistance: () => w.__dist,
            carriedRiseEndArm: () => ({ arm: 0.3, elbow: 1.1 }),
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop,
            updateGroundedReach: (...a) => grounded.push(a), updateGrounded: noop, updateGetUp: noop,
            updateUpright: (...a) => drawn.push(a[4]) },
    });
    w.__dist = dist;
    w._pain = pain ?? { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since: now, until: now + 2500, planned: true };
    return { w, calls, drawn, grounded };
}

test('support: George is supported on his own numbers, with his grip donor and the painted clutch patch as the contact', () => {
    const s = backSellSupport({ _textureConfig: G.textures, torso: { _semanticAnchors: G.textures.torso.semanticAnchors } });
    assert.deepEqual({ ok: s.ok, reason: s.reason, gripArt: s.gripArt, contact: s.contact }, { ok: true, reason: null, gripArt: 'painted', contact: 'clutchPatch' });
    assert.equal(s.data, BS);
    assert.deepEqual(nearGripParts({ _textureConfig: G.textures }), { nearForearm: 'grip' }, 'the grip variant is registered on the near forearm (T5.2)');
    assert.deepEqual(G.textures.variants.forearm.grip.semanticAnchors.clutch, { u: 254 / 426, v: 344 / 439 }, 'Codex\'s measured contact point');
    for (const k of ['holdW', 'recoveryArm', 'recoveryElbow']) assert.notEqual(BS[k], LOU[k], `${k} is George's, not Lou's`);
    // the same rig with its data stripped is unsupported, and nothing falls back to Lou's numbers
    const bare = backSellSupport({ _textureConfig: { ...G.textures, backSell: undefined }, torso: { _semanticAnchors: G.textures.torso.semanticAnchors } });
    assert.deepEqual([bare.ok, bare.reason, bare.data], [false, 'no backSell data', null]);
});

test('lying hold: the last back clutch ends on George\'s holdW and the hold keeps it (the chest breathes, not the reach)', () => withFlag('?sellart=v1', () => {
    const { w } = george({ state: 'down', sell: true });
    w._tickSell(0.02);
    assert.ok(w._hold, 'the hold starts');
    w._tickSell(0.5);
    assert.equal(w._lyingHold().w, holdWeight(0.51, BS.holdW));
    assert.notEqual(w._lyingHold().w, holdWeight(0.51, LOU.holdW));
    assert.equal(holdWeight(0, BS.holdW), BS.holdW, 'starts where the clutch ends');
    assert.ok(Math.abs(sampleSell(clutchSell('supine', 'back', 1, 'near', BS.holdW).keys, 1).reach.near - BS.holdW) < 1e-12);
    assert.equal(w._lyingHold().w, BS.holdW, 'the reach weight is constant');
    // the clutch the sell is playing is built to end on that weight
    const f = george({ state: 'down', sell: true }); f.w._sell.t = 0.999;
    const pose = f.w._sellPose();
    assert.ok(Math.abs(pose.reach.near.w - BS.holdW) < 0.02, `clutch end weight ${pose.reach.near.w}`);
}));

test('contact-latched art: George\'s latch uses his contactPx and selects the grip art exactly while it is on', () => withFlag('?sellart=v1', () => {
    for (const [contactPx, dist, on] of [[15, 14, true], [15, 16, false], [10, 14, false], [10, 9, true]]) {
        const textures = { ...G.textures, backSell: { ...BS, contactPx } };
        const { w, calls } = george({ state: 'down', textures, dist });
        w._hold = { t: 0.3, lying: 'supine' };
        for (let now = 1000; now <= 1400; now += 50) { w.scene.time.now = now; w.draw(); }
        assert.equal(w._gripLatch?.on ?? false, on, `contactPx ${contactPx}, dist ${dist}`);
        assert.equal(calls.some(c => c.nearForearm === 'grip'), on, 'the grip art is selected while the latch is on, never otherwise');
    }
}));

test('carried rise: George\'s rise carries into the recovery and lands on his settled back hand', () => withFlag(BOTH, () => {
    const { w } = george({ state: 'gettingUp', pain: { phase: 'rise', part: 'back', severity: 1 } });
    assert.equal(w._backRiseContext()?.carry, true);
    const noData = george({ state: 'gettingUp', textures: { ...G.textures, backSell: undefined }, pain: { phase: 'rise', part: 'back', severity: 1 } }).w;
    assert.equal(noData._backRiseContext()?.carry, undefined, 'unsupported: not carried');
    const settled = settledBackHand(BS, IDLE);
    assert.ok(Math.abs(settled.arm - (IDLE.lArm + BS.recoveryArm)) < 1e-12 && Math.abs(settled.elbow - (0.7 + BS.recoveryElbow)) < 1e-12);
    assert.ok(Math.abs(settled.arm - (POSES[theszProcreateV1.idlePose].lArm + LOU.recoveryArm)) > 0.1, 'not Lou\'s target');
    const end = { arm: 0.3, elbow: 1.1 };
    assert.deepEqual(carriedHandTarget(end, 0, settled), end);
    const t1 = carriedHandTarget(end, ARM_SETTLE_MS, settled);
    assert.ok(Math.abs(t1.arm - settled.arm) < 1e-12 && Math.abs(t1.elbow - settled.elbow) < 1e-12);
    // through the real recovery draw: after the settle the near channels are the blend toward George's target
    const rec = george({ pain: { source: 'suplex', part: 'back', severity: 1, phase: 'recover', since: 1000, until: 3500, planned: true, carried: 1, riseEnd: end } });
    rec.w.scene.time.now = 1000 + ARM_SETTLE_MS + 100;
    const hw = rec.w._recoveryHandWeight(), p = rec.w._recoveryPose();
    assert.ok(hw > 0.5);
    // Rev 3 D9: George's channels run through his via pose (aroundChannel); at hw 1 that is exactly the settled target
    const via = recoveryVia(BS);
    assert.deepEqual(via, { arm: -0.6, elbow: -0.4 });
    assert.ok(Math.abs(p.lArm - aroundChannel(SETTLED.lArm, via.arm, settled.arm, hw)) < 1e-9);
    assert.ok(Math.abs(p.lElbow - aroundChannel(0.7, via.elbow, settled.elbow, hw)) < 1e-9);
    assert.equal(aroundChannel(SETTLED.lArm, via.arm, settled.arm, 1), settled.arm);
    // without a via pose (the same rig, no aroundVia) the carried hand takes the straight blend, as before Rev 3
    const straight = george({ textures: { ...G.textures, backSell: { ...G.textures.backSell, aroundVia: undefined } }, pain: { source: 'suplex', part: 'back', severity: 1, phase: 'recover', since: 1000, until: 3500, planned: true, carried: 1, riseEnd: end } });
    straight.w.scene.time.now = 1000 + ARM_SETTLE_MS + 100;
    const q = straight.w._recoveryPose(), hs = straight.w._recoveryHandWeight();
    assert.ok(Math.abs(q.lArm - (SETTLED.lArm + (settled.arm - SETTLED.lArm) * hs)) < 1e-9);
    assert.ok(Math.abs(q.lElbow - (0.7 + (settled.elbow - 0.7) * hs)) < 1e-9);
}));

test('standing back hand: the near l-channels carry George\'s offsets x the recovery weight; an unsupported rig gets the bend only', () => withFlag(BOTH, () => {
    const { w } = george({ now: 1300, pain: { source: 'suplex', part: 'back', severity: 1, phase: 'recover', since: 1000, until: 3500, planned: true } });
    const wt = w._recoveryWeight(), p = w._recoveryPose();
    assert.ok(wt > 0.05);
    const via = recoveryVia(BS);
    assert.ok(Math.abs(p.lArm - aroundChannel(SETTLED.lArm, via.arm, SETTLED.lArm + BS.recoveryArm, wt)) < 1e-12);
    assert.ok(Math.abs(p.lElbow - aroundChannel(SETTLED.lElbow, via.elbow, SETTLED.lElbow + BS.recoveryElbow, wt)) < 1e-12);
    assert.equal(p.rArm, SETTLED.rArm, 'far arm untouched');
    // no via pose: the offsets x the recovery weight, exactly as before Rev 3
    const plain = george({ now: 1300, textures: { ...G.textures, backSell: { ...G.textures.backSell, aroundVia: undefined } }, pain: { source: 'suplex', part: 'back', severity: 1, phase: 'recover', since: 1000, until: 3500, planned: true } });
    const wp = plain.w._recoveryWeight(), pp = plain.w._recoveryPose();
    assert.ok(Math.abs(pp.lArm - (SETTLED.lArm + BS.recoveryArm * wp)) < 1e-12);
    assert.ok(Math.abs(pp.lElbow - (SETTLED.lElbow + BS.recoveryElbow * wp)) < 1e-12);
    assert.ok(p.bend > 0.01, 'the aftermath bend is there');
    const bare = george({ now: 1300, textures: { ...G.textures, backSell: undefined }, pain: { source: 'suplex', part: 'back', severity: 1, phase: 'recover', since: 1000, until: 3500, planned: true } });
    const q = bare.w._recoveryPose();
    assert.equal(q.lArm, SETTLED.lArm);
    assert.equal(q.lElbow, SETTLED.lElbow);
    assert.ok(q.bend > 0.01);
}));

test('Rev 3: the standing recovery fades in over AROUND.rampMs on a rig with a via pose (a longer route needs more time), over 200 ms otherwise', () => withFlag(BOTH, () => {
    const pain = since => ({ source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since, until: since + 2500, planned: true });
    const at = (ms, textures) => { const r = george({ now: 1000 + ms, textures, pain: pain(1000) }); return r.w._recoveryWeight(); };
    const plain = { ...G.textures, backSell: { ...G.textures.backSell, aroundVia: undefined } };
    const full = at(AROUND.rampMs, G.textures), half = at(AROUND.rampMs / 2, G.textures);
    assert.ok(half < full * 0.55 && half > full * 0.4, `half way through the ramp: ${half} vs ${full}`);
    // the straight rig (same data without a via point) has the 200 ms ramp
    const ramp200 = at(200, plain), ramp100 = at(100, plain);
    assert.ok(Math.abs(ramp100 / ramp200 - 0.5) < 0.02, 'the straight rig ramps over 200 ms');
    assert.ok(at(200, G.textures) < ramp200 * 0.5, 'the via rig is not yet half way at 200 ms');
}));
