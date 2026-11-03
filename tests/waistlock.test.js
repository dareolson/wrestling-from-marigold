// PLAN_GRAPPLES T4b.1: the go-behind waistlock's pure data and math (src/animation/waistlock.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WAISTLOCK, WAISTLOCK_POSES, goBehindOffset, waistlockPhase, waistlockPoseChannels, waistlockGrips, waistlockLayerOrder, waistPoint, releaseTravel } from '../src/animation/waistlock.js';
import { LOCKUP } from '../src/animation/lockup.js';
import { waistlockCandidate } from '../src/Wrestler.js';

const DT = 1 / 60;
const START = { fwd: LOCKUP.holdGap, dy: 0 };
const actor = (facing, lSide, over = {}) => ({
    facing, s: over.s ?? 1,
    skeleton: { lChannelSide: () => lSide, _farLegOverTorso: over.farOver ?? false, jointAttachmentPoints: { nearHip: { x: 100, y: 200 }, farHip: { x: 110, y: 198 }, ...over.pts } },
});

test('the circle starts where the tie-up left him and ends behind the defender, upstage', () => {
    for (const side of [-1, 1]) {
        const a = goBehindOffset(0, side, START), z = goBehindOffset(1, side, START);
        assert.equal(a.fwd, START.fwd); assert.equal(a.dy, START.dy);
        assert.equal(z.fwd, -WAISTLOCK.holdBehind); assert.ok(Math.abs(z.dy + WAISTLOCK.upstage) < 1e-9);
        assert.equal(a.facesDefenderWay, false); assert.equal(z.facesDefenderWay, true);
    }
});

test('up bulges upstage and down bulges toward the camera; the lane is widest at mid-circle', () => {
    const far = goBehindOffset(0.5, -1, START), near = goBehindOffset(0.5, 1, START);
    assert.ok(far.dy < -WAISTLOCK.lane * 0.9 && near.dy > WAISTLOCK.lane * 0.9 - WAISTLOCK.upstage);
    assert.ok(far.dy < 0 && near.dy > 0);
    for (let u = 0; u <= 1; u += 0.05) assert.ok(Math.abs(goBehindOffset(u, 1, START).dy) <= WAISTLOCK.lane + WAISTLOCK.upstage + 1e-9);
});

test('offsets scale with s and the start; the path is continuous frame to frame', () => {
    const s = 0.8, st = { fwd: 64, dy: 3 };
    let prev = goBehindOffset(0, 1, st, s);
    for (let t = DT; t <= WAISTLOCK.goBehind + 1e-9; t += DT) {
        const o = goBehindOffset(t / WAISTLOCK.goBehind, 1, st, s);
        assert.ok(Math.abs(o.fwd - prev.fwd) < 8 && Math.abs(o.dy - prev.dy) < 8, `${t}`);
        prev = o;
    }
    assert.ok(Math.abs(goBehindOffset(1, 1, st, s).fwd + WAISTLOCK.holdBehind * s) < 1e-9);
});

test('phases run goBehind, hold, release, done on the constants; the hold times out after WAISTLOCK.timeout', () => {
    const seen = [];
    for (let t = 0; t < WAISTLOCK.goBehind + WAISTLOCK.timeout + WAISTLOCK.release.dur + 0.2; t += DT) { const p = waistlockPhase(t).phase; if (seen.at(-1) !== p) seen.push(p); }
    assert.deepEqual(seen, ['goBehind', 'hold', 'release', 'done']);
    assert.equal(waistlockPhase(WAISTLOCK.goBehind - DT).phase, 'goBehind');
    assert.equal(waistlockPhase(WAISTLOCK.goBehind).phase, 'hold');
    assert.equal(waistlockPhase(WAISTLOCK.goBehind + WAISTLOCK.timeout - DT).phase, 'hold');
    assert.equal(waistlockPhase(WAISTLOCK.goBehind + WAISTLOCK.timeout + DT).phase, 'release');
});

test('the hands are closed when the circle ends, held through the hold, and open in the release', () => {
    const end = waistlockPhase(WAISTLOCK.goBehind), mid = waistlockPhase(WAISTLOCK.goBehind / 2);
    assert.equal(end.grips.attacker.near, 1); assert.equal(end.grips.defender.pry, 1);
    assert.ok(mid.grips.attacker.near < 1);
    assert.equal(waistlockPhase(0).grips.attacker.near, 0);
    const rel = waistlockPhase(WAISTLOCK.goBehind + WAISTLOCK.timeout + WAISTLOCK.release.dur - DT);
    assert.ok(rel.grips.attacker.near < 0.01 && rel.release > 0.99);
});

test('pose keys: the attacker bends further than the defender; the channels follow the near-side convention', () => {
    assert.ok(WAISTLOCK_POSES.attacker.bend > WAISTLOCK_POSES.defender.bend);
    const near = waistlockPoseChannels('attacker', 'near'), far = waistlockPoseChannels('attacker', 'far');
    assert.equal(near.lLeg, WAISTLOCK_POSES.attacker.lead); assert.equal(near.rLeg, WAISTLOCK_POSES.attacker.rear);
    assert.equal(far.rLeg, WAISTLOCK_POSES.attacker.lead); assert.equal(far.lLeg, WAISTLOCK_POSES.attacker.rear);
    assert.equal(near.bend, WAISTLOCK_POSES.attacker.bend);
});

test('the release straightens the attacker and leans the defender forward', () => {
    const a = waistlockPoseChannels('attacker', 'near', { release: 1 }), d = waistlockPoseChannels('defender', 'near', { release: 1 });
    assert.equal(a.bend, 0); assert.equal(a.lArm, LOCKUP.shove.arm);
    assert.ok(d.bend > WAISTLOCK_POSES.defender.bend);
    assert.deepEqual(releaseTravel(), { attacker: LOCKUP.shove.attackerPx, defender: LOCKUP.shove.stepPx });
});

test('W5 grips in both facings and both channel sides: attacker near hand on the front of the waist, far hand at the middle, defender near hand on the attacker\'s near wrist', () => {
    const full = { attacker: { near: 1, far: 1 }, defender: { pry: 1 } };
    for (const lSide of ['near', 'far']) for (const facing of [1, -1]) {
        const a = actor(facing, lSide), d = actor(facing, lSide, { s: 0.8 });
        const nearCh = lSide === 'near' ? 'l' : 'r', farCh = nearCh === 'l' ? 'r' : 'l';
        const { attacker, defender } = waistlockGrips(a, d, full);
        assert.equal(attacker.find(g => g.arm === nearCh).at.x, 105 + facing * WAISTLOCK.waistFront * 0.8);
        assert.equal(attacker.find(g => g.arm === farCh).at.x, 105);
        assert.equal(attacker[0].at.y, 199 - WAISTLOCK.waistRise * 0.8);
        assert.equal(defender.length, 1);
        assert.equal(defender[0].arm, nearCh); assert.equal(defender[0].joint, 'Wrist'); assert.equal(defender[0].partner, a); assert.equal(defender[0].side, 'same');
    }
    assert.equal(waistlockGrips(actor(1, 'near'), actor(1, 'near'), { attacker: { near: 0, far: 0 }, defender: { pry: 0 } }).attacker.length, 0);
    assert.equal(waistPoint({ facing: 1, s: 1, skeleton: { jointAttachmentPoints: {} } }), null);
});

test('W4 layer order, back to front: attacker far arm, defender far arm, attacker body, defender body, defender near arm, attacker near arm', () => {
    for (const lSide of ['near', 'far']) for (const farOver of [false, true]) {
        const a = actor(1, lSide, { farOver }), d = actor(1, lSide, { farOver });
        const o = waistlockLayerOrder(a, d).map(([r, p]) => `${r}.${p}`);
        const near = lSide === 'near' ? 'l' : 'r', far = near === 'l' ? 'r' : 'l';
        assert.deepEqual([o[0], o[1], o.at(-2), o.at(-1)], [`attacker.${far}Arm`, `defender.${far}Arm`, `defender.${near}Arm`, `attacker.${near}Arm`]);
        assert.equal(o.length, 12);
        assert.ok(o.indexOf('attacker.torso') < o.indexOf('defender.torso'));
        assert.equal(o[2 + (farOver ? 0 : 1)], 'attacker.torso');
    }
});

test('W1: waistlock is opt-in: only =v1 turns it on, an absent flag and no location are off', () => {
    const withSearch = (search) => { globalThis.location = { search }; try { return waistlockCandidate(); } finally { delete globalThis.location; } };
    assert.equal(waistlockCandidate(), false, 'Node with no location');
    assert.equal(withSearch(''), false);
    assert.equal(withSearch('?grapples=v1'), false);
    assert.equal(withSearch('?waistlock=v1'), true);
    assert.equal(withSearch('?waistlock=off'), false);
    assert.equal(withSearch('?waistlock=1'), false);
});
