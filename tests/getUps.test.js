// PLAN_GETUPS T1.1-T1.3: the get-up tables, the validator, the entry-driven rise and the flip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';
import { GETUPS, legacySupine, legacyProne, legacyFor, validateGetUp, mirrorPose, sampleGetUp } from '../src/animation/getUps.js';

const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };
const clone = (e) => JSON.parse(JSON.stringify(e));

test('every shipped entry validates', () => {
    for (const e of Object.values(GETUPS)) assert.deepEqual(validateGetUp(e), [], e.id);
});

test('validator rejects a missing standing key, a flipAt without after, keys out of order', () => {
    const e = clone(GETUPS.backKneeHurtStraight);
    const noStand = { ...e, keys: e.keys.slice(0, -1) };
    assert.ok(validateGetUp(noStand).some(m => /standing/.test(m)));
    assert.ok(validateGetUp({ ...e, flipAt: 0.46 }).some(m => /flipAt and after/.test(m)));
    const swapped = { ...e, keys: [e.keys[0], e.keys[2], e.keys[1], ...e.keys.slice(3)] };
    assert.ok(validateGetUp(swapped).some(m => /out of order/.test(m)));
    const flip = clone(GETUPS.backKneeHurt);
    assert.ok(validateGetUp({ ...flip, pivot: undefined }).some(m => /pivot/.test(m)));
    flip.after[0].torso += 0.1;
    assert.ok(validateGetUp(flip).some(m => /not the mirror/.test(m)));
    const back = { ...clone(e), tags: ['backSell'], hands: { near: { target: 'x', space: 'world', push: [0.4, 0.7], w: 1, release: [0.7, 0.8] } } };
    assert.ok(validateGetUp(back).some(m => /backSell/.test(m)));
});

test('the legacy entries are today\'s tables and sample byte-identical', () => {
    assert.equal(legacySupine.keys, Skeleton.GETUP_SUPINE_POSES);
    assert.equal(legacyProne.keys, Skeleton.GETUP_POSES);
    assert.equal(legacyFor('supine'), legacySupine);
    for (let i = 0; i <= 100; i++) {
        assert.deepEqual(sampleGetUp(legacySupine, i / 100), Skeleton._sampleKeyposes(Skeleton.GETUP_SUPINE_POSES, i / 100));
        assert.deepEqual(sampleGetUp(legacyProne, i / 100), Skeleton._sampleKeyposes(Skeleton.GETUP_POSES, i / 100));
    }
});

// a skeleton that records the pose it is asked to draw, and the points of a stub body
function stubSkeleton() {
    const sk = Object.assign(Object.create(Skeleton.prototype), { _lockLimbJoints: false, jointAttachmentPoints: {}, drawn: null });
    Object.defineProperty(sk, 'standingHipHeight', { value: 124 });
    const dir = (f, a) => ({ x: Math.sin(f * a), y: Math.cos(f * a) });
    sk._applyGrounded = (x, y, s, facing, g) => {
        sk.drawn = { ...g };
        const f = facing >= 0 ? 1 : -1, hip = { x, y: y - g.hip * s };
        const knee = { x: hip.x + dir(f, g.nearThigh).x * 40 * s, y: hip.y + dir(f, g.nearThigh).y * 40 * s };
        sk.jointAttachmentPoints = { nearHip: hip, nearKnee: knee };
    };
    return sk;
}

test('updateGetUp with a legacy entry draws exactly what it drew without one', () => {
    for (const lying of ['supine', 'prone']) for (let i = 0; i <= 20; i++) {
        const a = stubSkeleton(), b = stubSkeleton();
        a.updateGetUp(0, 0, 1, 1, i / 20, lying);
        b.updateGetUp(0, 0, 1, 1, i / 20, lying, null, null, null, legacyFor(lying), false);
        assert.deepEqual(b.drawn, a.drawn);
    }
});

test('the flip pose is the mirror of the last key before it, so both halves draw one body', () => {
    const e = GETUPS.backKneeHurt;
    const a = sampleGetUp(e, e.flipAt, false), b = sampleGetUp(e, e.flipAt, true);
    const m = mirrorPose(a);
    for (const c of Object.keys(m)) assert.ok(Math.abs(m[c] - b[c]) < 1e-9, c);
    // the first-half table never reaches standing, the second ends on it
    assert.equal(sampleGetUp(e, 1, true).torso, Math.PI);
});

test('updateGetUp draws the first half before the flip and the second after, no standing hip finish on the first', () => {
    const sk = stubSkeleton(); sk._lockLimbJoints = true;
    sk.updateGetUp(0, 0, 1, 1, GETUPS.backKneeHurt.flipAt, 'supine', null, null, null, GETUPS.backKneeHurt, false);
    assert.equal(sk.drawn.hip, GETUPS.backKneeHurt.keys.at(-1).hip);
    sk.updateGetUp(0, 0, 1, 1, 1, 'supine', null, null, null, GETUPS.backKneeHurt, true);
    assert.equal(sk.drawn.hip, 124);
});

// ── the Wrestler side: choice, one flip, the pivot, interruption ───────────────────────────────────────
function wrestler(extra = {}) {
    globalThis.Phaser = { Math: { Clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)) } };
    const sk = stubSkeleton();
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { tweens: { add() {}, killTweensOf() {} }, time: { now: 0 } },
        stamina: 100, lying: 'supine', state: 'down', riseT: 0, facing: 1, x: 500, y: 355, _heightScale: 1, skeleton: sk,
        _lyingHold: () => null, _syncSellAppearance() {}, _painRising() {}, _painRecovering() {}, _carriedRiseEnd: () => null,
        _tickPain() {}, _lastOther: { x: 700 }, ...extra,
    });
    return w;
}
const start = (w) => withFlag('?getups=v1', () => w._startRiseUp());
// what draw() does on a gettingUp frame
function drawFrame(w) {
    const flipped = !!w._riseFlip;
    const d = (x) => w.skeleton.updateGetUp(x, 0, 1, w.facing, w.riseT, w.lying, null, null, null, w._getUp, flipped);
    d(w.x);
    const dx = flipped ? w._holdRisePivot(1) : 0;
    if (dx) d(w.x);
    return dx;
}

test('flag off: no authored get-up is chosen and nothing flips', () => {
    const w = wrestler({ _lastOther: { x: 100 } });
    w._startRiseUp();
    assert.equal(w._getUp ?? null, null);
    w.riseT = 0.9; w._tickRiseFlip();
    assert.equal(w.facing, 1);
});

test('the route is chosen once at rise start: turn only when the opponent is behind, past the 12 px deadband', () => {
    for (const [ox, facing, id] of [[700, 1, 'backKneeHurtStraight'], [300, 1, 'backKneeHurt'], [700, -1, 'backKneeHurt'], [300, -1, 'backKneeHurtStraight'],
        [508, -1, 'backKneeHurtStraight'], [492, 1, 'backKneeHurtStraight'], [487, 1, 'backKneeHurt']]) {
        const w = wrestler({ _lastOther: { x: ox }, facing });
        start(w);
        assert.equal(w._getUp.id, id, `opp ${ox} facing ${facing}`);
    }
    const prone = wrestler({ lying: 'prone' });
    start(prone);
    assert.equal(prone._getUp, null, 'prone keeps today\'s rise this round');
});

test('opponent crossing during the rise changes nothing (B2)', () => {
    const w = wrestler({ _lastOther: { x: 300 } });
    start(w);
    assert.equal(w._getUp.id, 'backKneeHurt');
    w._lastOther.x = 700; w.state = 'gettingUp';
    w.riseT = 0.1; w._tickRiseFlip(); assert.equal(w.facing, 1);
    w.riseT = 0.5; w._tickRiseFlip(); assert.equal(w.facing, -1);
    w._lastOther.x = 300;
    w.riseT = 0.9; w._tickRiseFlip(); assert.equal(w.facing, -1, 'no second flip');
});

test('one flip, at flipAt, even when a frame step jumps over it; none on the straight route', () => {
    const w = wrestler({ _lastOther: { x: 300 } });
    start(w); w.state = 'gettingUp';
    let flips = 0, last = w.facing;
    for (const t of [0, 0.2, 0.44, 0.47, 0.5, 0.8, 1]) {
        w.riseT = t; w._tickRiseFlip(); drawFrame(w);
        if (w.facing !== last) { flips++; assert.ok(t >= GETUPS.backKneeHurt.flipAt && t < 0.5); last = w.facing; }
    }
    assert.equal(flips, 1);
    const jump = wrestler({ _lastOther: { x: 300 } });
    start(jump); jump.state = 'gettingUp'; jump.riseT = 0.2; jump._tickRiseFlip(); jump.riseT = 0.7; jump._tickRiseFlip();
    assert.equal(jump.facing, -1);
    const s = wrestler({ _lastOther: { x: 700 } });
    start(s); s.state = 'gettingUp';
    for (const t of [0, 0.3, 0.46, 0.6, 1]) { s.riseT = t; s._tickRiseFlip(); }
    assert.equal(s.facing, 1);
});

test('the pivot knee stays within 1 px across the flip, by moving x, and the first flipped frame is not drawn off', () => {
    for (const facing of [1, -1]) {
        const w = wrestler({ facing, _lastOther: { x: facing > 0 ? 300 : 700 } });
        start(w); w.state = 'gettingUp';
        w.riseT = 0.45; w._tickRiseFlip(); drawFrame(w);
        const before = w.skeleton.jointAttachmentPoints.nearKnee.x, x0 = w.x;
        w.riseT = 0.47; w._tickRiseFlip();
        assert.equal(w.facing, -facing);
        drawFrame(w);
        const after = w.skeleton.jointAttachmentPoints.nearKnee.x;
        assert.ok(Math.abs(after - before) < 1, `${before} vs ${after}`);
        assert.notEqual(w.x, x0, 'x carries the correction');
        assert.equal(w._riseFlip.clamped, false);
    }
});

test('a pin or pickup after the flip puts the old facing and x back; a finished rise keeps the new facing', () => {
    const w = wrestler({ _lastOther: { x: 300 } });
    start(w); w.state = 'gettingUp';
    w.riseT = 0.5; w._tickRiseFlip(); drawFrame(w);
    assert.equal(w.facing, -1);
    w.state = 'pinned'; w._tickRiseFlip();
    assert.equal(w.facing, 1);
    assert.equal(w.x, 500);
    assert.equal(w._getUp, null); assert.equal(w._riseFlip, null);
    const done = wrestler({ _lastOther: { x: 300 } });
    start(done); done.state = 'gettingUp';
    done.riseT = 0.5; done._tickRiseFlip(); drawFrame(done);
    done.state = 'standing'; done._tickRiseFlip();
    assert.equal(done.facing, -1);
    assert.equal(done._getUp, null);
});
