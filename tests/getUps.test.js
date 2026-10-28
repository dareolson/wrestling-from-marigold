// PLAN_GETUPS T1.1-T1.3: the get-up tables, the validator, the entry-driven rise and the flip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton, { syncUnionCopy } from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';
import { GETUPS, GETUP_SETS, legacySupine, legacyProne, legacyFor, validateGetUp, turnedPose, sampleGetUp } from '../src/animation/getUps.js';

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
    assert.ok(validateGetUp(flip).some(m => /not the flip key/.test(m)));
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
        sk.jointAttachmentPoints = { nearHip: hip, nearKnee: knee, farKnee: sk.farKneeAt ?? knee };
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

test('the second half starts on the flip key channels, so only the facing changes', () => {
    const e = GETUPS.backKneeHurt;
    const a = sampleGetUp(e, e.flipAt, false), b = sampleGetUp(e, e.flipAt, true);
    const m = turnedPose(a);
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

test('the back-sell variants keep the near hand for the back reach and push with the far hand', () => {
    for (const id of ['backKneeHurtBack', 'backKneeHurtBackStraight']) {
        const e = GETUPS[id];
        assert.deepEqual(validateGetUp(e), [], id);
        assert.ok(e.tags.includes('backSell'));
        assert.deepEqual(Object.keys(e.hands), ['far']);
        assert.deepEqual(e.keys, GETUPS[id.replace('Back', '')].keys, 'same keys as the plain variant');
    }
});

test('the support hand weight eases in before the push, holds through it and releases', () => {
    const h = GETUPS.backKneeHurt.hands.far, w = (t) => Skeleton.getUpHandWeight(h, t);
    assert.equal(w(0), 0);
    assert.equal(w(0.3), 0);
    assert.ok(w(0.41) > 0 && w(0.41) < 1);
    for (const t of [0.46, 0.55, 0.72]) assert.equal(w(t), 1);
    assert.ok(w(0.8) > 0 && w(0.8) < 1);
    assert.equal(w(0.86), 0);
    assert.equal(w(1), 0);
});

test('updateGetUp reaches the far hand for the far knee in the push window, and a legacy entry has no hands', () => {
    const sk = stubSkeleton(); let seen = null;
    sk.updateGroundedReach = (x, y, s, f, g, reach) => { seen = reach; };
    sk.farKneeAt = { x: 5, y: -20 };
    const e = GETUPS.backKneeHurtStraight;
    sk.updateGetUp(0, 0, 1, 1, 0.5, 'supine', null, null, null, e, false);
    assert.deepEqual(seen.far.at, { x: 5, y: -20 }); assert.equal(seen.far.w, 1); assert.equal(seen.near, undefined);
    seen = null;
    sk.updateGetUp(0, 0, 1, 1, 0.5, 'supine', null, null, null, legacySupine, false);
    assert.equal(seen, null);
});

test('a back rise keeps the near-hand back reach on a backSell entry and drops it on a plain one', () => {
    const calls = [];
    const sk = stubSkeleton(); sk.updateGroundedReach = (x, y, s, f, g, reach) => calls.push(reach);
    const pain = { part: 'back', severity: 1, carry: true };
    sk.updateGetUp(0, 0, 1, 1, 0.3, 'supine', pain, null, null, GETUPS.backKneeHurtBackStraight, false);
    assert.equal(calls.at(-1).near.to, 'nearHip');
    calls.length = 0;
    sk.updateGetUp(0, 0, 1, 1, 0.3, 'supine', pain, null, null, GETUPS.backKneeHurtStraight, false);
    assert.equal(calls.length, 0, 'no reach at all at t .3 on the plain entry');
});

test('rise start picks the backSell variant when the rise carries back pain', () => {
    const w = wrestler({ _lastOther: { x: 300 }, _backRiseContext: () => ({ part: 'back', severity: 1 }) });
    start(w);
    assert.equal(w._getUp.id, 'backKneeHurtBack');
    const s = wrestler({ _lastOther: { x: 700 }, _backRiseContext: () => ({ part: 'back', severity: 1 }) });
    start(s);
    assert.equal(s._getUp.id, 'backKneeHurtBackStraight');
});

// ── T2.6: the hand route out from the back ────────────────────────────────────────────────────────
import { pathPoint, backSellSupport } from '../src/rig/backSell.js';

test('pathPoint walks the polyline by arc length, ends on the last point, and a zero-length path stays put', () => {
    const a = { x: 0, y: 0 }, pts = [{ x: 10, y: 0 }, { x: 10, y: 10 }];
    assert.deepEqual(pathPoint(a, pts, 0), a);
    assert.deepEqual(pathPoint(a, pts, 0.5), { x: 10, y: 0 });
    assert.deepEqual(pathPoint(a, pts, 0.75), { x: 10, y: 5 });
    assert.deepEqual(pathPoint(a, pts, 1), { x: 10, y: 10 });
    assert.deepEqual(pathPoint(a, pts, 2), { x: 10, y: 10 });
    assert.deepEqual(pathPoint(a, [a], 0.5), a);
});

test('aroundVia.path is validated: 1-4 finite points, handUnder only', () => {
    const skel = (path) => ({ _textureConfig: { backSell: { holdW: 0.7, recoveryArm: -0.7, recoveryElbow: 1.1, settledElbow: 0.7, contactPx: 15, evidence: 'x', handUnder: true,
        aroundVia: { u: -0.25, v: 0.9, recoveryArm: -0.6, recoveryElbow: -0.4, ...(path === undefined ? {} : { path }) } } }, torso: { _semanticAnchors: { backWaist: { u: 0.25, v: 0.6 } } } });
    assert.equal(backSellSupport(skel(undefined)).ok, true);
    assert.equal(backSellSupport(skel([{ u: -0.4, v: 0.6 }])).ok, true);
    for (const bad of [[], 'x', [{ u: 1 }], [{ u: NaN, v: 0 }], [1, 2, 3, 4, 5].map(() => ({ u: 0, v: 0 }))]) assert.equal(backSellSupport(skel(bad)).ok, false, JSON.stringify(bad));
});

// a two-bone arm rooted at a fixed shoulder: world angle = facing * channel, forearm = arm + facing * flex (the real conventions)
function armRig() {
    const sk = Object.assign(Object.create(Skeleton.prototype), { jointAttachmentPoints: {}, _lockLimbJoints: false });
    const S = { x: 100, y: 200 }, LU = 40, LF = 30;
    let wasteTarget = { x: 70, y: 260 };
    sk.updateUpright = (x, y, s, facing, pose) => {
        const f = facing >= 0 ? 1 : -1, A = f * pose.lArm, F = A + f * pose.lElbow;
        const E = { x: S.x + Math.sin(A) * LU, y: S.y + Math.cos(A) * LU }, W = { x: E.x + Math.sin(F) * LF, y: E.y + Math.cos(F) * LF };
        sk.jointAttachmentPoints = { nearShoulder: S, nearElbow: E, nearWrist: W };
    };
    sk.backWaistPoint = () => ({ x: 95, y: 255 });
    sk.aroundPathPoints = () => [wasteTarget];
    return { sk, setVia: (p) => { wasteTarget = p; } };
}

test('solveRouteHand puts the wrist on the path point in both facings, keeping the elbow branch', () => {
    for (const facing of [1, -1]) {
        const { sk, setVia } = armRig();
        setVia({ x: 60, y: 250 });
        const pose = { lArm: 0.1, lElbow: -0.6 };
        for (const t of [0, 0.3, 0.7, 1]) {
            const r = sk.solveRouteHand([0, 0, 1, facing, pose, 0, 0, 0, 0, 0.5, 0], pose, 'l', t);
            assert.ok(r.err < 0.5, `facing ${facing} t ${t}: err ${r.err}`);
            const G = pathPoint({ x: 95, y: 255 }, [{ x: 60, y: 250 }], t);
            sk.updateUpright(0, 0, 1, facing, r.pose);
            const W = sk.jointAttachmentPoints.nearWrist;
            assert.ok(Math.hypot(W.x - G.x, W.y - G.y) < 0.5);
            assert.ok(r.pose.lElbow < 0.3, 'the elbow stays folded the way it started (behind), it did not flip');
        }
    }
});

test('solveRouteHand with nothing measurable returns null', () => {
    const { sk } = armRig(); sk.aroundPathPoints = () => null;
    assert.equal(sk.solveRouteHand([0, 0, 1, 1, {}, 0, 0, 0, 0, 0.5, 0], { lArm: 0, lElbow: 0 }, 'l', 0.5), null);
});

test('the union clearance fails closed: a missing silhouette is not clear; off, the torso alone as before', () => {
    const sk = Object.assign(Object.create(Skeleton.prototype), { torso: { texture: { key: 't' } }, nearThigh: null, farThigh: null });
    sk.nearHandSamples = () => ({ wrist: { x: 0, y: 0 } });
    sk.setHandUnion(true);
    const r = sk.handClearance(1);
    assert.equal(r.clear, false);
    assert.equal(r.min, -Infinity);
    sk.setHandUnion(false);
    assert.equal(sk.handClearance(1), null, 'union off: the torso alone, no silhouette in Node, null as before');
});

// T2.8 item 2: the union mask's copies follow their parts in world terms (A3): alpha and a parent's transform included.
const copyStub = () => { const c = { calls: {} }; for (const k of ['setVisible', 'setTexture', 'setOrigin', 'setPosition', 'setScale', 'setRotation', 'setFlip', 'setAlpha']) c[k] = (...a) => { c.calls[k] = a; return c; }; return c; };
const partStub = (o = {}) => ({ visible: true, alpha: 1, texture: { key: 'tex' }, frame: { name: 'f' }, originX: 0.5, originY: 0.25, flipX: true, flipY: false, parentContainer: null,
    getWorldTransformMatrix: () => ({ decomposeMatrix: () => ({ translateX: 10, translateY: 20, scaleX: 2, scaleY: 3, rotation: 0.4 }) }), ...o });

test('a union copy takes the part\'s world transform, flip, frame and alpha', () => {
    const c = copyStub(); syncUnionCopy(c, partStub({ alpha: 0.5 }));
    assert.deepEqual(c.calls.setVisible, [true]);
    assert.deepEqual(c.calls.setTexture, ['tex', 'f']);
    assert.deepEqual(c.calls.setPosition, [10, 20]);
    assert.deepEqual(c.calls.setScale, [2, 3]);
    assert.deepEqual(c.calls.setRotation, [0.4]);
    assert.deepEqual(c.calls.setFlip, [true, false]);
    assert.deepEqual(c.calls.setAlpha, [0.5]);
});

test('a union copy multiplies the parents\' alpha and hides with a hidden part or parent', () => {
    const c = copyStub(), parent = { visible: true, alpha: 0.5, parentContainer: { visible: true, alpha: 0.5, parentContainer: null } };
    syncUnionCopy(c, partStub({ alpha: 0.8, parentContainer: parent }));
    assert.ok(Math.abs(c.calls.setAlpha[0] - 0.2) < 1e-9);
    for (const part of [partStub({ visible: false }), partStub({ texture: null }), partStub({ parentContainer: { visible: false, alpha: 1, parentContainer: null } })]) {
        const h = copyStub(); syncUnionCopy(h, part);
        assert.deepEqual(h.calls.setVisible, [false]);
        assert.equal(h.calls.setPosition, undefined, 'a hidden copy is not moved');
    }
});

// PLAN_GETUPS Stage 3 (G2a): frontKnee and backTuck rough keys, and the dev override that plays them.
test('frontKnee and backTuck end on the standing key; frontKnee turns on its knee, backTuck does not turn', () => {
    const stand = GETUPS.legacySupine.keys.at(-1);
    for (const id of ['frontKnee', 'frontKneeStraight', 'backTuck']) {
        const e = GETUPS[id], last = (e.after ?? e.keys).at(-1);
        for (const c of ['hip', 'torso', 'farThigh', 'nearShin', 'farArm']) assert.equal(last[c], stand[c], `${id}.${c}`);
    }
    assert.equal(GETUPS.frontKnee.from, 'prone'); assert.equal(GETUPS.backTuck.from, 'supine');
    assert.equal(GETUPS.frontKnee.pivot, 'nearKnee');
    assert.equal(GETUPS.backTuck.flipAt, undefined);
    assert.equal(sampleGetUp(GETUPS.frontKnee, 0).torso, Skeleton.GROUNDED_FLAT.torso, 'starts flat on the face');
    assert.equal(sampleGetUp(GETUPS.backTuck, 0).torso, Skeleton.GROUNDED_SUPINE.torso, 'starts flat on the back');
});

test('?getup=<family> plays that family when it fits how he lies, turning by the same deadband rule; no param keeps the rough pick', () => {
    const pick = (search, props) => withFlag(search, () => { const w = wrestler(props); w._startRiseUp(); return w._getUp?.id ?? null; });
    assert.equal(pick('?getups=v1&getup=frontKnee', { lying: 'prone', _lastOther: { x: 300 } }), 'frontKnee');
    assert.equal(pick('?getups=v1&getup=frontKnee', { lying: 'prone', _lastOther: { x: 700 } }), 'frontKneeStraight');
    assert.equal(pick('?getups=v1&getup=backTuck', { lying: 'supine', _lastOther: { x: 700 } }), 'backTuck');
    assert.equal(pick('?getups=v1&getup=backTuck', { lying: 'supine', _lastOther: { x: 300 } }), 'backTuck', 'no turning variant: plays straight');
    assert.equal(pick('?getups=v1&getup=frontKnee', { lying: 'supine', _lastOther: { x: 300 } }), 'backKneeHurt', 'does not fit a supine wrestler: the rough pick');
    assert.equal(pick('?getups=v1&getup=nonsense', { lying: 'prone' }), null);
    assert.equal(pick('?getups=v1', { lying: 'prone' }), null, 'prone keeps today\'s rise without the override');
    assert.equal(pick('?getup=frontKnee', { lying: 'prone' }), null, 'flag off: the override is ignored');
    assert.deepEqual(Object.keys(GETUP_SETS).sort(), ['backKneeHurt', 'backTuck', 'frontKnee']);
});
