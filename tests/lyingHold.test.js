// ?sellart=v1 lying hold (PLAN_SUPLEX_RISE T4.0b / D4): after the last back clutch the
// near hand settles on the back with an authored breath, the rise eases up from it, and
// the hand art follows the measured contact distance through a latch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import Skeleton from '../src/Skeleton.js';
import { backRiseWeight, HOLD_BREATH, holdOffsets, holdWeight as holdWeightAt } from '../src/animation/backRisePerformance.js';
import { sampleSell, clutchSell } from '../src/animation/sells.js';
import { GRIP_REFRACTORY_MS, newGripLatch, stepGripLatch as stepLatchAt } from '../src/animation/sellAppearance.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { onlyListed } from './support/promotedFlags.js';

const ON = '?sellart=v1';
// Lou's numbers live on his rig (textures.backSell); these keep the tests' old vocabulary.
const BACK_SELL = theszProcreateV1.textures.backSell;
const HOLD = { w: BACK_SELL.holdW };
const GRIP_CONTACT_PX = BACK_SELL.contactPx;
const holdWeight = t => holdWeightAt(t, BACK_SELL.holdW);
const stepGripLatch = (state, dist, now) => stepLatchAt(state, dist, now, GRIP_CONTACT_PX);
function withFlag(search, fn) {
    const prior = globalThis.location;
    if (search === undefined) delete globalThis.location; else globalThis.location = { search: onlyListed(search) };
    try { return fn(); } finally { if (prior === undefined) delete globalThis.location; else globalThis.location = prior; }
}
const noop = () => {};
function fixture({ backWaist = true, backSell = true, part = 'back', dist = null } = {}) {
    const calls = [], grounded = [], rises = [];
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now: 1000 }, tweens: { killTweensOf: noop, add: () => ({ stop() {} }) } },
        state: 'down', stateTimer: 3, facing: 1, lying: 'supine', _heightScale: 1,
        x: 400, y: 380, skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0, pose: {},
        _activeMove: null, _choreoUntil: 0, _groundHandoff: null, _hold: null, _riseFrom: 0, _gripLatch: null,
        _sell: { plan: [{ name: 'clutch', part, lying: 'supine', limb: null, rolls: 0, duration: 1, amp: 1 }], i: 0, t: 0.99, facing0: 1 },
        _pain: { phase: 'mat', part, severity: 1, planned: true },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: {
            _textureConfig: backSell ? theszProcreateV1.textures : { ...theszProcreateV1.textures, backSell: undefined }, lChannelSide: () => 'near', setPartVariants: p => calls.push({ ...p }),
            torso: backWaist ? { _semanticAnchors: { backWaist: { u: 0.22, v: 0.6 } } } : {},
            backContactDistance: () => w.__dist,
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop,
            updateGroundedReach: (...a) => grounded.push(a), updateGrounded: noop, updateUpright: noop,
            updateGetUp: (...a) => rises.push(a), updateFall: noop,
        },
    });
    w.__dist = dist;
    return { w, calls, grounded, rises };
}

test('hold weight is constant; the chest breathes instead (Rev 2 D7), a pure function of time since release', () => {
    assert.equal(holdWeight(0), HOLD.w, 'starts where the clutch ends');
    for (let t = -1; t < 6; t += 0.05) {
        assert.equal(holdWeight(t), HOLD.w, 'the reach does not breathe');
        assert.deepEqual(holdOffsets(t), holdOffsets(t), 'same input, same output');
        assert.ok(Math.abs(holdOffsets(t).torso) <= HOLD_BREATH.torso + 1e-12);
    }
    assert.equal(holdWeight(NaN, HOLD.w), HOLD.w);
    assert.equal(holdOffsets(0).torso, 0, 'zero at the start: no jump at the clutch -> hold handoff');
    assert.deepEqual(Object.keys(holdOffsets(0.3)), ['torso']);
    assert.ok(Math.abs(holdOffsets(HOLD_BREATH.periodSec).torso) < 1e-12, 'one full breath');
    assert.ok(Math.abs(holdOffsets(HOLD_BREATH.periodSec / 4).torso - HOLD_BREATH.torso) < 1e-12);
    assert.ok(Math.abs(holdOffsets(3 * HOLD_BREATH.periodSec / 4).torso + HOLD_BREATH.torso) < 1e-12);
    assert.equal(HOLD_BREATH.torso, 0.04);
    // the clutch hands over at the hold weight
    const { keys } = clutchSell('supine', 'back', 1, 'near', HOLD.w);
    assert.equal(sampleSell(keys, 1).reach.near, HOLD.w);
    assert.equal(sampleSell(clutchSell('supine', 'back', 1).keys, 1).reach.near, 0, 'default clutch still ends at rest');
});

test('rise weight is continuous at t = 0 when `from` is set and unchanged when it is not', () => {
    const smooth = x => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
    // the envelope with no hold: ramp .18, hold to .70, ease out by 1.0
    const old = t => (!Number.isFinite(t) || t <= 0 || t >= 1) ? 0 : smooth(t / 0.18) * (1 - smooth((t - 0.70) / 0.30));
    for (const t of [-1, 0, 0.01, 0.1, 0.18, 0.3, 0.55, 0.7, 0.85, 1, NaN]) {
        assert.equal(backRiseWeight(t), old(t), `no from, t=${t}`);
        assert.equal(backRiseWeight(t, 0), old(t));
    }
    for (const from of [0.72, 0.8, 0.88]) {
        assert.equal(backRiseWeight(0, from), from);
        assert.ok(Math.abs(backRiseWeight(1e-9, from) - from) < 1e-6, 'no step off t = 0');
        let prev = backRiseWeight(0, from);
        for (let t = 0.001; t <= 0.18; t += 0.001) {
            const v = backRiseWeight(t, from);
            assert.ok(v >= prev - 1e-12, `monotone up, no dip (t=${t})`);
            prev = v;
        }
        assert.equal(backRiseWeight(0.18, from), 1);
        assert.equal(backRiseWeight(1, from), 0);
    }
});

test('updateGetUp feeds the hold weight through at t = 0 for any severity', () => {
    const seen = [];
    const sk = { _lockLimbJoints: false, _applyGrounded: noop, updateGroundedReach: (...a) => seen.push(a[5]) };
    for (const severity of [0.6, 1]) {
        Skeleton.prototype.updateGetUp.call(sk, 0, 0, 1, 1, 0, 'supine', { part: 'back', severity, from: 0.8 });
        assert.ok(Math.abs(seen.at(-1).near.w - 0.8) < 1e-12, `severity ${severity}`);
    }
});

test('art latch: a distance hovering at the threshold cannot make grip -> fist -> grip under 250 ms', () => {
    for (const periodMs of [16.7, 50, 100, 120, 160, 200, 300]) {
        let st = newGripLatch(true, 0), prevOn = true, offFrom = null;
        const offRuns = [];
        for (let now = 0; now <= 6000; now += 1000 / 60) {
            const lowHalf = Math.floor(now / periodMs) % 2 === 0;
            st = stepGripLatch(st, lowHalf ? GRIP_CONTACT_PX - 0.1 : GRIP_CONTACT_PX + 0.1, now);
            if (prevOn && !st.on) offFrom = now;
            if (!prevOn && st.on) offRuns.push(now - offFrom);
            prevOn = st.on;
        }
        for (const run of offRuns) assert.ok(run >= GRIP_REFRACTORY_MS - 1e-6, `period ${periodMs}: fist run ${run}`);
    }
    let st = newGripLatch(false, 0);
    for (let now = 0; now < 99; now += 10) st = stepGripLatch(st, 5, now);
    assert.equal(st.on, false, 'needs a 100 ms dwell');
    st = stepGripLatch(st, 5, 120);
    assert.equal(st.on, true);
    assert.equal(stepGripLatch(st, NaN, 500), st, 'no measurement, no change');
});

test('the last back clutch starts the hold; other parts, other rigs and the flag-off path do not', () => {
    withFlag(ON, () => {
        const { w } = fixture();
        w._tickSell(0.02);
        assert.equal(w._sell, null);
        assert.ok(Math.abs(w._hold.t - 0.01) < 1e-9, 'time since release starts at the overshoot');
        assert.equal(w._hold.lying, 'supine');
        w._tickSell(0.5);
        assert.ok(Math.abs(w._hold.t - 0.51) < 1e-9);
        assert.equal(w._lyingHold().w, holdWeight(0.51));
        for (const over of [{ part: 'head' }, { part: 'knee' }, { backWaist: false }, { backSell: false }]) {
            const f = fixture(over); f.w._tickSell(0.02);
            assert.equal(f.w._hold, null, JSON.stringify(over));
        }
    });
    for (const search of [undefined, '', '?aftermath=v2']) withFlag(search, () => {
        const { w } = fixture(); w._tickSell(0.02);
        assert.equal(w._hold, null);
    });
});

test('other sells, moves, choreography and exits own the hands; the hold is not drawn', () => withFlag(ON, () => {
    const { w, grounded, calls } = fixture();
    w._tickSell(0.02);
    w.draw();
    assert.equal(grounded.at(-1)[5].near.w, holdWeight(0.01));
    assert.deepEqual(grounded.at(-1)[5], { near: { to: 'nearHip', w: holdWeight(0.01) } });
    assert.deepEqual(grounded.at(-1)[6], { paintedContacts: true, backContact: true });
    for (const over of [{ _sell: { plan: [{ name: 'writhe', part: 'back', lying: 'supine', duration: 1, amp: 1 }], i: 0, t: 0.5, facing0: 1 } },
        { _activeMove: {} }, { _choreoUntil: 5000 }, { _groundHandoff: { t0: 1 } }, { lying: 'prone' }, { state: 'pinned' }, { state: 'gettingUp' }]) {
        const saved = {}; for (const k of Object.keys(over)) saved[k] = w[k];
        Object.assign(w, over);
        assert.equal(w._lyingHold(), null, JSON.stringify(over));
        Object.assign(w, saved);
    }
    assert.ok(w._lyingHold());
    // picked up / pinned: the next draw releases the hold art
    w.state = 'pinned'; w.draw();
    assert.deepEqual(calls.at(-1), {});
}));

test('the art follows the measured distance with a latch; the rise carries the hold in', () => withFlag(ON, () => {
    const { w, calls, rises } = fixture({ dist: 9 });
    w._tickSell(0.02);
    w._gripLatch = newGripLatch(true, 1000);
    w.draw();
    assert.deepEqual(calls.at(-1), { nearForearm: 'grip' });
    w.__dist = 30; // far for 99 ms: still grip
    w.scene.time.now = 1050; w.draw();
    assert.deepEqual(calls.at(-1), { nearForearm: 'grip' });
    w.__dist = 9; w.scene.time.now = 1100; w.draw();
    // rise starts: eases up from the hold weight, keeps the grip with no fist frame
    w._hold.t = 0.4;
    const from = holdWeight(0.4);
    w._pain = { phase: 'mat', part: 'back', severity: 1 };
    w.scene.tweens.add = () => ({});
    w._startRiseUp();
    assert.equal(w._riseFrom, from);
    assert.equal(w._hold, null);
    w.riseT = 0; w.draw();
    assert.deepEqual(rises.at(-1)[6], { part: 'back', severity: 1, from });
    assert.deepEqual(calls.at(-1), { nearForearm: 'grip' });
    assert.equal(calls.filter(c => Object.keys(c).length === 0).length, 1, 'only the release at rise start, immediately re-selected in the same frame');
}));

test('a rise with no hold has no `from`', () => withFlag(ON, () => {
    const { w, rises } = fixture();
    w._sell = null; w._pain = { phase: 'mat', part: 'back', severity: 1 };
    w.scene.tweens.add = () => ({});
    w._startRiseUp(); w.riseT = 0.3; w.draw();
    assert.deepEqual(rises.at(-1)[6], { part: 'back', severity: 1 });
}));
