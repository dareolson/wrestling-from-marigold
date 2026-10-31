// PLAN_GRAPPLES T1.1: the lockup's pure data and math (src/animation/lockup.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKUP, LOCKUP_POSES, gripTarget, exitBlendPose, breakKind, breakTravel, lockupPhase, lockupGrips, lockupPoseChannels, tugSchedule, stepAt } from '../src/animation/lockup.js';

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
    assert.equal(frames.at(-1).release, 1);
    const off = lockupPoseChannels({ even: 0, attacker: 1, defender: 0 }, 'near', { release: 1 });
    assert.equal(off.bend, 0);
    assert.equal(off.lArm, LOCKUP.breakArm);
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
    assert.equal(near.lLeg, -0.38); assert.equal(near.rLeg, -0.42);
    assert.equal(far.rLeg, -0.38); assert.equal(far.lLeg, -0.42);
    assert.equal(near.bend, 0.38);
    assert.equal(near.lean, undefined, 'lean is not drawn');
    const half = lockupPoseChannels({ even: 0, attacker: 0.5, defender: 0.5 }, 'near');
    assert.ok(Math.abs(half.crouch - (0.32 + 0.14) / 2) < 1e-12);
    assert.equal(lockupPoseChannels(w, 'near', { dip: 0.06 }).crouch, 0.38);
});

test('legRel: the planted foot holds its world place while the body travels; the stepper gains 2 pulses; offsets stay bounded', async () => {
    const { legRel, PULSE_PX } = await import('../src/animation/lockup.js');
    for (const dirRel of [1, -1]) {
        let prevWorld = null;
        for (let k = 0; k < 4; k++) {
            const body0 = dirRel * k * PULSE_PX;
            const worlds = [];
            for (let i = 0; i <= 20; i++) {
                const u = i / 20, step = { index: k, foot: k % 2 ? 'rear' : 'lead', u };
                const rel = legRel(step, dirRel);
                const p = u * u * (3 - 2 * u);
                const body = body0 + dirRel * PULSE_PX * p;
                const planted = k % 2 === 0 ? rel.rear : rel.lead, stepper = k % 2 === 0 ? rel.lead : rel.rear;
                worlds.push({ planted: body + planted, stepper: body + stepper });
                assert.ok(Math.abs(planted) <= PULSE_PX / 2 + 1e-9 && Math.abs(stepper) <= PULSE_PX / 2 + 1e-9);
            }
            for (const w of worlds) assert.ok(Math.abs(w.planted - worlds[0].planted) < 1e-9, 'planted foot slid');
            assert.ok(Math.abs(Math.abs(worlds.at(-1).stepper - worlds[0].stepper) - 2 * PULSE_PX) < 1e-9);
            // the stepper becomes the next pulse's planted foot at the same world place
            if (prevWorld !== null) assert.ok(Math.abs(worlds[0].planted - prevWorld) < 1e-9, `k ${k}: ${worlds[0].planted} vs ${prevWorld}`);
            prevWorld = worlds.at(-1).stepper;
        }
    }
    assert.deepEqual(legRel({ index: -1, u: null }, 1), { lead: 0, rear: 0 });
});

test('D12: the defender keeps the A-frame while he is driven, and the hold gap keeps the bodies apart', () => {
    for (const key of ['even', 'attacker', 'defender']) assert.ok(LOCKUP_POSES[key].bend >= 0.3, key);
    assert.ok(LOCKUP.holdGap >= 76);
    const held = lockupPoseChannels({ even: 0, attacker: 0, defender: 1 }, 'near', { lean: 0.02 });
    assert.ok(Math.abs(held.bend - 0.40) < 1e-12, 'tugs and strain go on the drawn channel');
});

test('gripTarget: `at` wins, a joint is the joint, `above` moves along the partner\'s upper arm, negative goes past the elbow', () => {
    const partner = { skeleton: { jointAttachmentPoints: { nearElbow: { x: 100, y: 50 }, nearShoulder: { x: 100, y: 10 }, farElbow: { x: 0, y: 0 } } } };
    const it = { partner, joint: 'Elbow', side: 'same' };
    assert.deepEqual(gripTarget({ ...it, at: { x: 1, y: 2 } }, 'near'), { x: 1, y: 2 });
    assert.deepEqual(gripTarget(it, 'near'), { x: 100, y: 50 });
    assert.deepEqual(gripTarget({ ...it, side: 'other' }, 'near'), { x: 0, y: 0 });
    assert.deepEqual(gripTarget({ ...it, above: 0.25 }, 'near'), { x: 100, y: 40 });
    assert.deepEqual(gripTarget({ ...it, above: -0.5 }, 'near'), { x: 100, y: 70 });
    assert.deepEqual(gripTarget({ ...it, side: 'other', above: 0.5 }, 'near'), { x: 0, y: 0 });
});

test('exitBlendPose: starts on the held tie-up, ends on the move, and leaves the move\'s own pose alone', () => {
    const held = { pose: { lArm: 1, bend: 0.4, name: 'x' }, x: 100, y: 400 }, now = { pose: { lArm: 0, tilt: 2 }, x: 200, y: 400 };
    const start = exitBlendPose(held, now, 0), end = exitBlendPose(held, now, 1), mid = exitBlendPose(held, now, 0.5);
    assert.deepEqual([start.pose.lArm, start.pose.bend, start.x], [1, 0.4, 100]);
    assert.deepEqual([end.pose.lArm, end.pose.bend, end.x, end.pose.tilt], [0, 0, 200, 2]);
    assert.deepEqual([mid.pose.lArm, mid.x], [0.5, 150]);
    assert.deepEqual(now, { pose: { lArm: 0, tilt: 2 }, x: 200, y: 400 });
});

test('T4a endings: a stall is always a rope break, a shove is seeded at about one in three, no stamina is involved', () => {
    for (let i = 1; i < 50; i++) assert.equal(breakKind(i * 977, true), 'rope');
    let shoves = 0;
    for (let i = 1; i <= 3000; i++) if (breakKind(i * 7919, false) === 'shove') shoves++;
    assert.ok(shoves > 850 && shoves < 1150, `${shoves}`);
    assert.equal(breakKind(5, false), breakKind(5, false));
});

test('T4a poses: the rope break raises the attacker\'s hands, the shove pushes the defender back, the plain break is unchanged', () => {
    const w = { even: 0, attacker: 1, defender: 0 };
    const rope = lockupPoseChannels(w, 'near', { ending: { kind: 'rope', role: 'attacker', u: 1 } });
    assert.equal(rope.lArm, LOCKUP.ropeBreak.handsUp); assert.equal(rope.bend, 0);
    const shoved = lockupPoseChannels({ even: 0, attacker: 0, defender: 1 }, 'near', { ending: { kind: 'shove', role: 'defender', u: 1 } });
    assert.ok(Math.abs(shoved.bend - LOCKUP.shove.stumbleLean) < 1e-12);
    assert.ok(breakTravel('shove').defender > breakTravel('plain').defender && breakTravel('rope').defender === 0);
});
