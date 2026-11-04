// PLAN_GRAPPLES T4b.1: the go-behind waistlock's pure data and math (src/animation/waistlock.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WAISTLOCK, WAISTLOCK_POSES, goBehindOffset, waistlockPhase, waistlockPoseChannels, waistlockGrips, waistlockLayerOrder, waistPoint, releaseTravel, atRopes, behindSpotFits } from '../src/animation/waistlock.js';
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
    assert.deepEqual(releaseTravel('shove'), releaseTravel());
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

test('W6: an early holdEnd moves the let-go forward; the release then runs its own length', () => {
    const early = WAISTLOCK.goBehind + 0.3;
    assert.equal(waistlockPhase(early - DT, early).phase, 'hold');
    assert.equal(waistlockPhase(early, early).phase, 'release');
    assert.equal(waistlockPhase(early + WAISTLOCK.release.dur - DT, early).phase, 'release');
    assert.equal(waistlockPhase(early + WAISTLOCK.release.dur, early).phase, 'done');
    assert.equal(waistlockPhase(early, early).grips.attacker.near, 1, 'the hands open over breakGrip, not at once');
});

test('W6 (c): the rope break walks the defender away and leaves the attacker; hands up, no forward lean', () => {
    assert.deepEqual(releaseTravel('rope'), { attacker: 0, defender: LOCKUP.ropeBreak.stepPx });
    const a = waistlockPoseChannels('attacker', 'near', { release: 1, kind: 'rope' }), d = waistlockPoseChannels('defender', 'near', { release: 1, kind: 'rope' });
    assert.equal(a.lArm, LOCKUP.ropeBreak.handsUp); assert.equal(a.lElbow, LOCKUP.ropeBreak.elbow);
    assert.equal(d.bend, 0, 'he stands up');
    assert.ok(waistlockPoseChannels('defender', 'near', { release: 1 }).bend > 0, 'the shove leans him forward');
});

test('atRopes: within 34 px at his scale of either side rope', () => {
    const b = { left: 100, right: 900 };
    assert.equal(atRopes({ x: 500, s: 1 }, b), false);
    assert.equal(atRopes({ x: 900 - 33, s: 1 }, b), true);
    assert.equal(atRopes({ x: 900 - 35, s: 1 }, b), false);
    assert.equal(atRopes({ x: 100 + 0.8 * 34 - 1, s: 0.8 }, b), true);
    assert.equal(atRopes({ x: 100 + 0.8 * 34 + 1, s: 0.8 }, b), false);
});

test('a switch starts before the circle: a negative t is the hitch, the pose and hands unchanged', () => {
    const p = waistlockPhase(-LOCKUP.stealHitch);
    assert.equal(p.phase, 'goBehind'); assert.equal(p.pose, 0); assert.equal(p.grips.attacker.near, 0);
    const o = goBehindOffset(p.u, 1, START);
    assert.equal(o.fwd, START.fwd); assert.equal(o.dy, START.dy);
});

test('behindSpotFits: the spot behind a man has to be 20 px inside the side ropes, whichever way he faces', () => {
    const b = { left: 100, right: 900 }, hb = WAISTLOCK.holdBehind;
    assert.equal(behindSpotFits({ x: 500, s: 1 }, 1, b), true);
    assert.equal(behindSpotFits({ x: 900 - hb + 19, s: 1 }, -1, b), false);   // facing left, the spot is to his right
    assert.equal(behindSpotFits({ x: 900 - hb - 21 + 41, s: 1 }, -1, b), false);
    assert.equal(behindSpotFits({ x: 900 - hb - 21, s: 1 }, -1, b), true);
    assert.equal(behindSpotFits({ x: 100 + hb * 0.8 + 19, s: 0.8 }, 1, b), false);   // facing right, the spot is to his left
    assert.equal(behindSpotFits({ x: 100 + hb * 0.8 + 21, s: 0.8 }, 1, b), true);
});

// PLAN_GRAPPLES T4c.1: the throws out of the hold (src/animation/waistlockThrows.js).
import { ATOMIC, SNAPMARE, reversalOpen, snapmareLandingX, snapmareFits, flipTilt, dropAvailable } from '../src/animation/waistlockThrows.js';

test('the drop is lift + drop + sell, the impact is where the drop ends, and the reverse window is inside the lift', () => {
    assert.ok(Math.abs(ATOMIC.lift + ATOMIC.hitch + ATOMIC.drop - ATOMIC.impact) < 1e-9);
    assert.ok(Math.abs(ATOMIC.impact + ATOMIC.sell - ATOMIC.duration) < 1e-9);
    assert.ok(ATOMIC.reverseWindow > 0 && ATOMIC.reverseWindow < ATOMIC.lift);
    assert.ok(Math.abs(SNAPMARE.reach + SNAPMARE.pull + SNAPMARE.flip - SNAPMARE.land) < 1e-9 && SNAPMARE.land < SNAPMARE.duration);
});

test('the reversal is open from the lift\'s start to reverseWindow and not before or after', () => {
    assert.equal(reversalOpen(-0.01), false);
    assert.equal(reversalOpen(0), true);
    assert.equal(reversalOpen(ATOMIC.reverseWindow - 1e-6), true);
    assert.equal(reversalOpen(ATOMIC.reverseWindow), false);
    assert.equal(reversalOpen(0.5), false);
});

test('the snapmare lands one body length in front of the thrower, scaled, both facings, and is denied past the ropes', () => {
    const b = { left: 100, right: 900 };
    for (const f of [1, -1]) {
        const m = { x: 500, s: 0.8 };
        assert.equal(snapmareLandingX(m, f), 500 + f * SNAPMARE.landFwd * 0.8);
        assert.equal(snapmareFits(m, f, b), true);
    }
    assert.equal(snapmareFits({ x: 850, s: 1 }, 1, b), false);
    assert.equal(snapmareFits({ x: 150, s: 1 }, -1, b), false);
    assert.equal(snapmareFits({ x: 850, s: 1 }, -1, b), true);   // the room is on the facing side only
    // the margin matches behindSpotFits: exactly 20 px inside the rope still fits, 21 px short does not
    assert.equal(snapmareFits({ x: b.right - 20 - SNAPMARE.landFwd, s: 1 }, 1, b), true);
    assert.equal(snapmareFits({ x: b.right - 19 - SNAPMARE.landFwd, s: 1 }, 1, b), false);
});

test('flipTilt runs 0 to a whole turn plus the landing angle, never goes backward and never stalls', () => {
    const land = 1.2, total = 2 * Math.PI * SNAPMARE.turns + land;
    assert.equal(flipTilt(0, land), 0);
    assert.ok(Math.abs(flipTilt(1, land) - total) < 1e-9);
    let prev = 0;
    for (let u = 0.01; u <= 1.0001; u += 0.01) { const v = flipTilt(u, land); assert.ok(v > prev, `${u}`); prev = v; }
});

test('one try per hold: the drop is only available inside the hold, once', () => {
    const ws = { t: WAISTLOCK.goBehind + 0.1, holdEnd: WAISTLOCK.goBehind + WAISTLOCK.timeout, ending: null, threw: false };
    assert.equal(dropAvailable(ws), true);
    assert.equal(dropAvailable({ ...ws, t: WAISTLOCK.goBehind - 0.01 }), false);   // still in the circle
    assert.equal(dropAvailable({ ...ws, t: ws.holdEnd }), false);                   // the let-go
    assert.equal(dropAvailable({ ...ws, ending: 'shove' }), false);
    assert.equal(dropAvailable({ ...ws, threw: true }), false);
    assert.equal(dropAvailable(null), false);
});
