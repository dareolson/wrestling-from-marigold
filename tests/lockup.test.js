// PLAN_GRAPPLES T1.1: the lockup's pure data and math (src/animation/lockup.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKUP, lockupPhase, lockupGrips, lockupPoseChannels, tugSchedule, stepAt } from '../src/animation/lockup.js';

const DT = 1 / 60;
const run = (extra = {}, from = 0, to = LOCKUP.timeout) => {
    const frames = [];
    for (let t = from; t <= to + 1e-9; t += DT) frames.push({ t, ...lockupPhase({ t, dt: DT, seed: 7, ...extra }) });
    return frames;
};
const actor = (facing, lSide, neck, s = 1) => ({
    facing, s, skeleton: { lChannelSide: () => lSide, jointAttachmentPoints: { neck } },
});

test('the attacker\'s collar and elbow land before the defender\'s', () => {
    const first = (role, key) => run().find(f => f.grips[role][key] >= 1)?.t;
    const a = [first('attacker', 'collar'), first('attacker', 'elbow')], d = [first('defender', 'collar'), first('defender', 'elbow')];
    assert.ok(a[0] < a[1] && a[1] < d[0] && d[0] < d[1], `${a} ${d}`);
    for (const [land, at] of [[LOCKUP.gripLand.attacker.collar, a[0]], [LOCKUP.gripLand.defender.elbow, d[1]]]) {
        assert.ok(Math.abs(at - land) <= DT + 1e-9, `${at} vs ${land}`);
    }
});

test('D4 sides in both facings: attacker near arm on the collar, far arm on the far elbow; defender far arm on the collar, near arm on the near elbow', () => {
    const grips = { attacker: { collar: 1, elbow: 1 }, defender: { collar: 1, elbow: 1 } };
    for (const lSide of ['near', 'far']) {
        for (const facing of [1, -1]) {
            const a = actor(facing, lSide, { x: 100, y: 50 }), d = actor(-facing, lSide, { x: 160, y: 50 });
            const nearCh = lSide === 'near' ? 'l' : 'r', farCh = nearCh === 'l' ? 'r' : 'l';
            const { attacker, defender } = lockupGrips(a, d, grips);
            const by = (list, joint) => list.find(g => g.joint === joint);
            assert.equal(by(attacker, 'Neck').arm, nearCh);
            assert.equal(by(attacker, 'Elbow').arm, farCh);
            assert.equal(by(defender, 'Neck').arm, farCh);
            assert.equal(by(defender, 'Elbow').arm, nearCh);
            assert.equal(by(attacker, 'Elbow').side, 'same');
            assert.equal(by(attacker, 'Neck').partner, d);
            assert.equal(by(defender, 'Neck').partner, a);
        }
    }
});

test('the collar point is behind the partner\'s neck (against his facing) and lower, scaled by s', () => {
    const grips = { attacker: { collar: 1, elbow: 0 }, defender: { collar: 1, elbow: 0 } };
    for (const facing of [1, -1]) {
        const a = actor(facing, 'near', { x: 0, y: 0 }), d = actor(-facing, 'near', { x: 200, y: 40 }, 0.8);
        const { attacker } = lockupGrips(a, d, grips);
        const at = attacker[0].at;
        assert.equal(at.x, 200 - d.facing * LOCKUP.collarBack * 0.8);
        assert.equal(at.y, 40 + LOCKUP.collarDrop * 0.8);
    }
});

test('no elbow entry before its weight, and weights ramp 0 -> 1', () => {
    const g = lockupGrips(actor(1, 'near', { x: 0, y: 0 }), actor(-1, 'near', { x: 50, y: 0 }), { attacker: { collar: 0.5, elbow: 0 }, defender: { collar: 0, elbow: 0 } });
    assert.equal(g.attacker.length, 1);
    assert.equal(g.defender.length, 0);
    const early = lockupPhase({ t: 0, seed: 1 });
    assert.equal(early.grips.attacker.collar, 0);
});

test('travel only happens during step pulses; feet are planted between them', () => {
    const frames = run();
    const drive = frames.filter(f => f.phase === 'drive');
    assert.ok(drive.length > 20);
    let moved = 0, planted = 0;
    for (const f of drive) {
        if (f.step.u === null) { planted++; assert.equal(f.dx, 0, `dx at planted t=${f.t}`); }
        else { moved++; assert.ok(f.dx >= 0); }
    }
    assert.ok(moved > 5 && planted > 2, `${moved} ${planted}`);
    // One pulse moves driveSpeed * walkSpeed * stepMoving px.
    const k = 1, pulse = frames.filter(f => f.phase === 'drive' && f.step.index === k).reduce((n, f) => n + f.dx, 0);
    const want = LOCKUP.driveSpeed * LOCKUP.walkSpeed * LOCKUP.stepMoving;
    assert.ok(Math.abs(pulse - want) < want * 0.1, `${pulse} vs ${want}`);
    assert.deepEqual([stepAt(0).foot, stepAt(LOCKUP.stepPeriod).foot, stepAt(0.25).u === null, stepAt(0.1).u === null], ['lead', 'rear', true, false]);
});

test('no travel during the engage and the even phase beyond the tugs, and the tugs return to 0', () => {
    const frames = run();
    const even = frames.filter(f => f.phase === 'even');
    const net = frames.filter(f => f.t < LOCKUP.evenEnd + DT).reduce((n, f) => n + f.dx, 0);
    assert.ok(Math.abs(net) < 1e-6, `${net}`);
    assert.ok(Math.max(...even.map(f => Math.abs(f.dx))) > 0);
    assert.ok(frames.filter(f => f.phase === 'engage').every(f => f.dx === 0));
});

test('the stall: zero travel with the poses held and the strain going', () => {
    const frames = run({ nearRopes: true }).filter(f => f.t > LOCKUP.evenEnd);
    assert.ok(frames.every(f => f.phase === 'stall' && f.dx === 0));
    assert.ok(frames.some(f => f.lean.attacker > 0) && frames.some(f => f.lean.attacker < 0));
});

test('the steal: a hitch with no travel, then the drive runs the same way for the new attacker', () => {
    const stealAt = 0.7;
    const frames = run({ stealAt }, stealAt - DT, LOCKUP.timeout);
    const hitch = frames.filter(f => f.phase === 'steal');
    assert.ok(hitch.length >= 6 && hitch.every(f => f.dx === 0));
    assert.ok(hitch.some(f => f.dip.attacker > 0.5 * LOCKUP.stealDip));
    // Cross-fade: the new attacker starts on the defender pose and ends on the attacker pose.
    assert.equal(hitch[0].weights.attacker.defender, 1);
    const end = frames.at(-1);
    assert.equal(end.weights.attacker.attacker, 1);
    // The new drive starts from a fresh step 0 at hitch end.
    const first = frames.find(f => f.phase === 'drive' && f.step.u !== null);
    assert.equal(first.step.index, 0);
    assert.ok(first.dx >= 0);
});

test('a steal reverses the world direction of travel when the caller swaps the roles (dx stays + along the NEW attacker)', () => {
    // lockupPhase is always signed along the attacker's facing; the caller swaps attacker/defender at the steal, so
    // the new attacker's facing is the old defender's: the pair goes the other way on screen.
    const f = run({ stealAt: 0.6 }).filter(x => x.phase === 'drive' && x.t > 0.8);
    assert.ok(f.every(x => x.dx >= 0));
});

test('break: grips ramp to 0 over breakGrip, then one step back', () => {
    const breakAt = LOCKUP.timeout;
    const frames = run({ breakAt }, breakAt - DT, breakAt + LOCKUP.breakGrip + LOCKUP.breakStep + DT).filter(f => f.t >= breakAt);
    assert.equal(frames[0].phase, 'break');
    assert.ok(frames[0].grips.attacker.collar > 0.9);
    const gone = frames.find(f => f.t >= breakAt + LOCKUP.breakGrip);
    assert.equal(gone.grips.attacker.collar, 0);
    assert.ok(frames.some(f => f.step.u !== null && f.step.u > 0.9));
});

test('the same seed gives the same tugs; different seeds differ', () => {
    assert.deepEqual(tugSchedule(11), tugSchedule(11));
    assert.notDeepEqual(tugSchedule(11), tugSchedule(12));
    const a = run({ seed: 5 }).map(f => f.dx), b = run({ seed: 5 }).map(f => f.dx), c = run({ seed: 6 }).map(f => f.dx);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    const s = tugSchedule(3);
    for (let i = 2; i < s.length - 1; i++) {
        const gap = s[i].at - s[i - 1].at;
        assert.ok(gap >= LOCKUP.tugEvery[0] - 1e-9 && gap <= LOCKUP.tugEvery[1] + 1e-9);
        assert.ok(Math.sign(s[i].to) !== Math.sign(s[i - 1].to) || i === 1);
        assert.ok(Math.abs(s[i].to) >= LOCKUP.tugPx[0] - 1e-9 && Math.abs(s[i].to) <= LOCKUP.tugPx[1] + 1e-9);
    }
});

test('engage: the attacker closes 70 % and the defender 30 %, the jolt peaks near 0.12 s', () => {
    const end = lockupPhase({ t: LOCKUP.engageEnd, seed: 1 });
    assert.ok(Math.abs(end.close.attacker - 0.7) < 1e-9 && Math.abs(end.close.defender - 0.3) < 1e-9);
    const peak = run().filter(f => f.t < LOCKUP.engageEnd).reduce((a, f) => (f.jolt > a.jolt ? f : a));
    assert.ok(Math.abs(peak.t - LOCKUP.joltAt) <= DT);
    assert.ok(Math.abs(peak.jolt - LOCKUP.joltPx) < 0.1);
});

test('pose channels: lead leg is the near-side leg per facing, weights mix', () => {
    const w = { even: 0, attacker: 1, defender: 0 };
    const near = lockupPoseChannels(w, 'near'), far = lockupPoseChannels(w, 'far');
    assert.equal(near.lLeg, 0.35); assert.equal(near.rLeg, -0.30);
    assert.equal(far.rLeg, 0.35); assert.equal(far.lLeg, -0.30);
    assert.equal(near.lean, 0.45);
    const half = lockupPoseChannels({ even: 0, attacker: 0.5, defender: 0.5 }, 'near');
    assert.ok(Math.abs(half.crouch - (0.32 + 0.14) / 2) < 1e-12);
    assert.equal(lockupPoseChannels(w, 'near', { dip: 0.06 }).crouch, 0.38);
});
