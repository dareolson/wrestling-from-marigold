// PLAN_GETUPS T1.1-T1.3: the get-up tables, the validator, the entry-driven rise and the flip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton, { syncUnionCopy } from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';
import { GETUPS, GETUP_SETS, legacySupine, legacyProne, legacyFor, validateGetUp, turnedPose, sampleGetUp, usesNearHand, eligibleForBackSell } from '../src/animation/getUps.js';

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
        // wrists swing with the arm channels (so a world target taken off the keyed wrist depends on the pose and the facing)
        const wrist = (a, b) => ({ x: hip.x + f * (Math.sin(a) * 50 + Math.sin(b) * 30) * s, y: hip.y - 40 * s + (Math.cos(a) * 50 + Math.cos(b) * 30) * s });
        sk.jointAttachmentPoints = { nearHip: hip, nearKnee: knee, farKnee: sk.farKneeAt ?? knee, nearWrist: wrist(g.nearArm, g.nearFore), farWrist: wrist(g.farArm, g.farFore) };
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

// ── T3.4: the support-hand schedule (E2) ──────────────────────────────────────────────────────────────────
const phase = (push, release, extra = {}) => ({ target: 'mat', space: 'world', push, w: 1, release, ...extra });

test('hands.<side> takes one phase or an ordered array; overlapping phases and a phase that starts before the last releases are rejected', () => {
    const base = clone(GETUPS.frontKneeStraight);
    const ok = { ...base, hands: { far: [phase([0.1, 0.4], [0.4, 0.5]), { target: 'farKnee', space: 'thighLocal', push: [0.6, 0.8], w: 1, release: [0.8, 0.9] }] } };
    assert.deepEqual(validateGetUp(ok), []);
    assert.deepEqual(validateGetUp({ ...base, hands: { far: phase([0.1, 0.4], [0.4, 0.5]) } }), [], 'a single object is still fine');
    const overlap = { ...base, hands: { far: [phase([0.1, 0.5], [0.5, 0.6]), phase([0.4, 0.7], [0.7, 0.8])] } };
    assert.ok(validateGetUp(overlap).some(m => /overlaps/.test(m)));
    const early = { ...base, hands: { far: [phase([0.1, 0.3], [0.5, 0.6]), phase([0.4, 0.7], [0.7, 0.8])] } };
    assert.ok(validateGetUp(early).some(m => /before hands\.far\[0\] releases/.test(m)));
    assert.ok(validateGetUp({ ...base, hands: { far: [] } }).some(m => /no phases/.test(m)));
    assert.ok(validateGetUp({ ...base, hands: { far: [phase([0.5, 0.2], [0.5, 0.6])] } }).some(m => /push/.test(m)));
    assert.ok(validateGetUp({ ...base, hands: { far: [{ ...phase([0.1, 0.3], [0.3, 0.4]), space: 'sky' }] } }).some(m => /space/.test(m)));
    const back = { ...base, tags: ['backSell'], hands: { near: [phase([0.1, 0.3], [0.3, 0.4])] } };
    assert.ok(validateGetUp(back).some(m => /backSell/.test(m)), 'an array does not get the near hand past a backSell entry');
});

test('frontKnee: both hands on the mat then the far hand to the knee; backTuck: both on the mat then both to the knees; backKneeHurt stays one object', () => {
    for (const id of ['frontKnee', 'frontKneeStraight']) {
        const h = GETUPS[id].hands;
        assert.deepEqual(h.near.map(p => p.space), ['world']);
        assert.deepEqual(h.far.map(p => [p.space, p.target]), [['world', 'mat'], ['thighLocal', 'farKnee']]);
    }
    const t = GETUPS.backTuck.hands;
    assert.deepEqual(t.near.map(p => [p.space, p.target]), [['world', 'mat'], ['thighLocal', 'nearKnee']]);
    assert.deepEqual(t.far.map(p => [p.space, p.target]), [['world', 'mat'], ['thighLocal', 'farKnee']]);
    assert.equal(JSON.stringify(GETUPS.backKneeHurt.hands), JSON.stringify({ far: { target: 'farKnee', space: 'thighLocal', push: [0.46, 0.72], w: 1, release: [0.72, 0.86] } }));
    assert.equal(JSON.stringify(GETUPS.backKneeHurtStraight.hands), JSON.stringify(GETUPS.backKneeHurt.hands));
    assert.equal(JSON.stringify(GETUPS.backKneeHurtBack.hands), JSON.stringify(GETUPS.backKneeHurt.hands));
});

// updateGetUp over a list of t, returning the reach each frame asked for
function reachesAt(entry, ts, { x = 0, y = 0, s = 1, facing = 1, lying = 'prone', flipped = false, sk = stubSkeleton() } = {}) {
    let seen = null;
    sk.updateGroundedReach = (_x, _y, _s, _f, _g, reach) => { seen = reach; };
    sk.farKneeAt = { x: 5, y: -20 };
    return ts.map((t) => { seen = null; sk.updateGetUp(x, y, s, facing, t, lying, null, null, null, entry, flipped); return seen; });
}

test('a world target does not move in world space during its push, in both facings and two body sizes, even when a frame step jumps over push start', () => {
    // stand-ins for Lou and George in Node: two scales and root positions (the real rigs are measured in the browser, T3.6)
    const bodies = [{ s: 1, x: 300, y: 355 }, { s: 1.12, x: 640, y: 372 }];
    const cases = [['frontKneeStraight', 'prone', 'near', 0.12, 0.46], ['frontKneeStraight', 'prone', 'far', 0.12, 0.46],
        ['backTuck', 'supine', 'near', 0.08, 0.50], ['backTuck', 'supine', 'far', 0.08, 0.50]];
    for (const [id, lying, side, p0, p1] of cases) for (const facing of [1, -1]) for (const b of bodies) {
        const entry = GETUPS[id], inPush = [];
        for (let t = p0; t <= p1 + 1e-9; t += 0.02) inPush.push(+t.toFixed(3));
        const stepped = reachesAt(entry, [0, 0.02, ...inPush], { ...b, facing, lying });
        const jumped = reachesAt(entry, [0, 0.25, ...inPush], { ...b, facing, lying });   // 0 -> .25 jumps over push start
        const fromStart = stepped.slice(2).map(r => r[side].at), fromJump = jumped.slice(2).map(r => r[side].at);
        for (const at of [...fromStart, ...fromJump]) {
            assert.equal(at.x, fromStart[0].x, `${id} ${side} facing ${facing} x`);
            assert.equal(at.y, b.y, `${id} ${side} on the mat line`);
            assert.equal(at.y, fromStart[0].y);
        }
        for (const r of [...stepped.slice(2), ...jumped.slice(2)]) assert.equal(r[side].w, 1, 'full weight through the push');
    }
});

test('the two facings put the hand target on the same side of the root as the keyed wrist', () => {
    const a = reachesAt(GETUPS.frontKneeStraight, [0.3], { facing: 1 })[0].near.at, b = reachesAt(GETUPS.frontKneeStraight, [0.3], { facing: -1 })[0].near.at;
    assert.ok(Math.abs(a.x + b.x) < 1e-9 && a.x !== 0);
});

test('the next phase blends in from the held hand: the hand-over moves the target from the mat point to the knee, weight never dips', () => {
    const sk = stubSkeleton();
    const rs = reachesAt(GETUPS.frontKneeStraight, [0.3, 0.46, 0.50, 0.54, 0.58, 0.62, 0.7], { sk }).map(r => r.far);
    const mat = rs[0].at, knee = { x: 5, y: -20 };
    assert.deepEqual(rs[1].at, mat, 'at the end of the push: still the mat point');
    const toKnee = (r) => Math.hypot(r.at.x - knee.x, r.at.y - knee.y);
    for (const r of rs.slice(0, 5)) assert.ok(Math.abs(r.w - 1) < 1e-9, `weight stays 1 through the hand-over (${r.w})`);
    assert.ok(toKnee(rs[2]) < toKnee(rs[1]) && toKnee(rs[3]) < toKnee(rs[2]) && toKnee(rs[4]) < toKnee(rs[3]), 'moving toward the knee');
    assert.deepEqual(rs[5].at, knee); assert.deepEqual(rs[6].at, knee);
});

test('single-object entries ask for the same reach as before: backKneeHurt far hand is the knee at the posed weight', () => {
    for (const id of ['backKneeHurt', 'backKneeHurtStraight', 'backKneeHurtBack']) {
        const e = GETUPS[id];
        for (let t = 0; t <= 1.0001; t += 0.05) {
            const [r] = reachesAt(e, [Math.min(1, t)], { lying: 'supine', flipped: !!e.after && t >= e.flipAt });
            const w = Skeleton.getUpHandWeight(e.hands.far, Math.min(1, t));
            if (w > 0.001) assert.deepEqual(r, { far: { at: { x: 5, y: -20 }, w } }, `${id} t=${t}`);
            else assert.equal(r, null);
        }
    }
});

test('interruption mid-push clears the held world target (pin, pickup, reset); a restart takes a new one', () => {
    for (const state of ['pinned', 'carried', 'down', 'standing']) {
        const w = wrestler({ lying: 'prone', _lastOther: { x: 700 } });
        withFlag('?getups=v1&getup=frontKnee', () => w._startRiseUp());
        assert.equal(w._getUp.id, 'frontKneeStraight');
        w.state = 'gettingUp'; w.riseT = 0.3; w._tickRiseFlip(); drawFrame(w);
        assert.ok(w.skeleton._getUpHold, 'held at mid-push');
        w.state = state; w._tickRiseFlip();
        assert.equal(w.skeleton._getUpHold, null, state);
    }
    // restart from a different root: the target is the new one, not the stale one
    const sk = stubSkeleton(); sk.updateGroundedReach = () => {};
    sk.updateGetUp(100, 0, 1, 1, 0.3, 'prone', null, null, null, GETUPS.frontKneeStraight, false);
    const first = sk._getUpHold.pts.near0.x;
    sk.updateGetUp(400, 0, 1, 1, 0.3, 'prone', null, null, null, GETUPS.frontKneeStraight, false);
    assert.equal(sk._getUpHold.pts.near0.x, first, 'same rise: held');
    sk.updateGetUp(400, 0, 1, 1, 0.1, 'prone', null, null, null, GETUPS.frontKneeStraight, false); // t ran backwards = a new rise
    sk.updateGetUp(400, 0, 1, 1, 0.3, 'prone', null, null, null, GETUPS.frontKneeStraight, false);
    assert.equal(sk._getUpHold.pts.near0.x, first + 300);
});

test('the facing flip re-captures a world target after the flip (not before) and holds it from then on; the pivot move re-takes it at the final x', () => {
    const entry = { ...clone(GETUPS.backKneeHurt), hands: { far: [phase([0.30, 0.66], [0.66, 0.80])] } };
    assert.deepEqual(validateGetUp(entry), []);
    for (const facing of [1, -1]) {
        const w = wrestler({ facing, lying: 'supine', _lastOther: { x: facing > 0 ? 300 : 700 }, _getUp: entry });
        w.state = 'gettingUp'; w._riseFlip = null; w.skeleton.updateGroundedReach = () => {};
        const targets = [];
        for (const t of [0.35, 0.40, 0.44, 0.47, 0.5, 0.56, 0.62, 0.66]) {
            w.riseT = t; w._tickRiseFlip(); drawFrame(w);
            targets.push({ t, flipped: !!w._riseFlip, at: { ...w.skeleton._getUpHold.pts.far0 }, x: w.x });
        }
        const before = targets.filter(r => !r.flipped), after = targets.filter(r => r.flipped);
        assert.ok(before.length >= 3 && after.length >= 3);
        for (const r of before) assert.deepEqual(r.at, before[0].at, 'held before the flip');
        for (const r of after) assert.deepEqual(r.at, after[0].at, 'held after the flip');
        assert.notDeepEqual(after[0].at, before[0].at, 'taken again after the flip');
    }
});

test('no hands, no hold: legacy and hand-less entries keep no world state', () => {
    const sk = stubSkeleton(); sk.updateGroundedReach = () => {};
    sk.updateGetUp(0, 0, 1, 1, 0.3, 'supine', null, null, null, legacySupine, false);
    assert.equal(sk._getUpHold ?? null, null);
});

// ── T3.5: back-sell variants and eligibility (E3) ─────────────────────────────────────────────────────────
test('frontKneeBack(Straight): same keys as frontKnee, tagged backSell, far-hand schedule only; every backSell entry has no near-hand phase', () => {
    for (const [id, base] of [['frontKneeBack', 'frontKnee'], ['frontKneeBackStraight', 'frontKneeStraight']]) {
        const e = GETUPS[id];
        assert.deepEqual(validateGetUp(e), [], id);
        assert.ok(e.tags.includes('backSell'));
        assert.deepEqual(Object.keys(e.hands), ['far']);
        assert.deepEqual(e.hands.far, GETUPS[base].hands.far);
        assert.equal(e.keys, GETUPS[base].keys); assert.equal(e.after, GETUPS[base].after);
        assert.equal(e.flipAt, GETUPS[base].flipAt);
    }
    for (const e of Object.values(GETUPS).filter(x => x.tags?.includes('backSell'))) assert.equal(usesNearHand(e), false, e.id);
});

test('usesNearHand and eligibleForBackSell: backTuck and frontKnee use the near hand; backKneeHurt and the Back variants do not', () => {
    assert.equal(usesNearHand(GETUPS.backTuck), true);
    assert.equal(usesNearHand(GETUPS.frontKnee), true);
    assert.equal(usesNearHand(GETUPS.backKneeHurt), false);
    assert.equal(usesNearHand(GETUPS.legacySupine), false);
    assert.equal(usesNearHand({ hands: { near: [] } }), false);
    assert.equal(eligibleForBackSell(GETUPS.backTuck), false);
    assert.equal(eligibleForBackSell(GETUPS.frontKneeBack), true);
    assert.equal(eligibleForBackSell(GETUPS.backKneeHurt), true);
    assert.equal(eligibleForBackSell(null), false);
});

test('?getup=<family> while back-selling: the Back variant plays; backTuck is refused and falls back to the legacy rise, logging why', () => {
    const back = { _backRiseContext: () => ({ part: 'back', severity: 1 }) };
    const pick = (search, props) => withFlag(search, () => { const w = wrestler({ ...back, ...props }); w._startRiseUp(); return w._getUp?.id ?? null; });
    assert.equal(pick('?getups=v1&getup=frontKnee', { lying: 'prone', _lastOther: { x: 300 } }), 'frontKneeBack');
    assert.equal(pick('?getups=v1&getup=frontKnee', { lying: 'prone', _lastOther: { x: 700 } }), 'frontKneeBackStraight');
    assert.equal(pick('?getups=v1&getup=backKneeHurt', { lying: 'supine', _lastOther: { x: 300 } }), 'backKneeHurtBack');
    const warned = [], warn = console.warn; console.warn = (m) => warned.push(m);
    try {
        assert.equal(pick('?getups=v1&getup=backTuck', { lying: 'supine', _lastOther: { x: 700 } }), 'legacySupine');
    } finally { console.warn = warn; }
    assert.equal(warned.length, 1); assert.match(warned[0], /backTuck.*near hand/);
    // not back-selling: unchanged
    const plain = (search, props) => withFlag(search, () => { const w = wrestler(props); w._startRiseUp(); return w._getUp?.id ?? null; });
    assert.equal(plain('?getups=v1&getup=frontKnee', { lying: 'prone', _lastOther: { x: 300 } }), 'frontKnee');
    assert.equal(plain('?getups=v1&getup=backTuck', { lying: 'supine', _lastOther: { x: 700 } }), 'backTuck');
});
