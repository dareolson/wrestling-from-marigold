// The collar-and-elbow tie-up (PLAN_GRAPPLES Stage 1, D1-D9). Pure data and math, behind `?grapples=v1`: nothing here
// touches POSES or a Wrestler, so flag off is untouched. Arena._tickLockup asks lockupPhase() what the pair does this
// frame; lockupGrips() says where each hand goes (Wrestler.holdGrips does the IK). All times in seconds, all lengths in
// px at s = 1 (the caller multiplies by the wrestler's perspective scale `s`).

import { clampLocalFlex } from '../rig/articulation.js';

export const LOCKUP = Object.freeze({
    timeout: 1.4,                       // D2: was 0.8 s
    engageEnd: 0.30,
    engageClose: Object.freeze({ attacker: 0.7, defender: 0.3 }),   // share of the closing distance each man walks
    // Grip weight 1 lands at these times (the ramp starts GRIP_RAMP earlier).
    gripLand: Object.freeze({
        attacker: Object.freeze({ collar: 0.20, elbow: 0.23 }),   // not before the closing gap puts the neck in reach (T1.8)
        defender: Object.freeze({ collar: 0.26, elbow: 0.29 }),
    }),
    gripRamp: 0.10,
    joltAt: 0.17, joltPx: 3, joltWidth: 0.06,
    evenEnd: 0.55,
    tugPx: Object.freeze([2, 5]), tugEvery: Object.freeze([0.15, 0.30]), tugLean: 0.04,
    driveBlend: 0.18,                   // even -> role pose, after evenEnd
    stepPeriod: 0.30, stepMoving: 0.20, // one step per period; the foot moves for `stepMoving`, then both are planted
    driveSpeed: 0.35,                   // x the walk speed while a step is moving
    walkSpeed: 140,                     // px/s at s = 1 (Wrestler SPEED)
    strainHz: 9, strainLean: 0.02,      // the stalled push
    exitBlend: Object.freeze({ default: 0.14 }),   // s the draw eases from the held tie-up onto a follow-up (Stage 3); per move entries by move name
    ropeBreak: Object.freeze({ stepPx: 34, handsUp: 1.5, elbow: 1.3 }),   // a stall that times out (D6, T4a.1): hands off, he steps well back, hands raised
    shove: Object.freeze({ odds: 1 / 3, stepPx: 44, attackerPx: 6, arm: 1.5, elbow: 0.25, stumbleLean: -0.3 }),   // T4a.2: two hands, the defender stumbles back, the attacker keeps his feet
    stealHitch: 0.12, stealCrossfade: 0.20, stealDip: 0.06,
    breakGrip: 0.10, breakStep: 0.25, breakStepPx: 14,
    breakRelease: 0.16, breakBendRelease: 0.22, breakArm: -0.12,   // the torsos come up and the arms go home this fast, so hands that let go don't drop onto the other man (D12)
    legGain: 1.086,                     // ankle travel per rad of a leg channel, as a share of that rig's thigh + shin length (T1.12 probe at s = 1: Lou 129 px over 118.8, George 106 over 97.6, every role key)
    holdGap: 80,                        // px at s = 1 between the pair's x while held. D12 sweep (T1.7): no overlap under the belt or torso on torso, every grip 0 px; 78 also passes, but on the edge of the band, where the tugs and the strain leave it
    collarBack: 9, collarDrop: 6,       // px at s = 1: the collar point is the partner's neck, back of it and lower (D7)
    elbowCup: -0.6,                     // where the far hand cups, as a share of the partner's upper arm from the elbow toward his shoulder; negative = past the elbow, onto his forearm. Solved on the elbow itself, Lou's far hand flips to a fold the rig's elbow can't draw and misses by 30 px (T1.8)
});

// Pose keys (D6, D13). Legs, shins, bend, crouch only; the arms come from the IK. `bend` is the torso pitch the rig draws (`lean` is not
// drawn): D12's A-frame, heads and hands meet across the gap while the hips stay apart, so the defender keeps it while he is driven.
// `lead` / `rear` are the near-side and far-side leg channels (resolved per facing by lockupPoseChannels); on the 3/4 rigs the far
// hip sits ahead of the near one, so the far leg is the one that stands under its hip and the near leg trails behind it. Each
// `*Shin` is the shin's angle relative to its own leg channel, written as the absolute `lShin` / `rShin`: the lockup owns that
// joint outright (a local-flex `lKnee` cannot bend the natural way, JOINT_LIMITS.knee.min is -0.10), so the shin follows its leg
// through the drive's foot offsets. Values solved on both rigs by tools/debug/grapples_legs_solve.mjs (T1.12): knees ahead of the
// hip-ankle line, ankles >= 26 px and knees >= 18 px apart, soles on the idle ground line, hip height as in G1b.
export const LOCKUP_ARMS = Object.freeze({ arm: 0.3, elbow: 0.7 });

export const LOCKUP_POSES = Object.freeze({
    even:     Object.freeze({ bend: 0.38, crouch: 0.24, lead: -0.20, leadShin: -0.10, rear: 0.10, rearShin: -0.40 }),
    attacker: Object.freeze({ bend: 0.38, crouch: 0.32, lead: -0.25, leadShin: -0.10, rear: 0.05, rearShin: -0.40 }),
    defender: Object.freeze({ bend: 0.38, crouch: 0.14, lead: -0.15, leadShin: -0.10, rear: 0.15, rearShin: -0.40 }),
});

const smooth = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
const ramp = (t, land, width) => smooth((t - (land - width)) / width);

export function seededRandom(seed) {
    let a = (seed >>> 0) || 1;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// How a timeout ends (T4a): a stall is a clean rope break; away from the ropes, one seeded break in three is a shove-off. Seeded apart from the tugs.
export function breakKind(seed, stalled) {
    if (stalled) return 'rope';
    return seededRandom((seed ^ 0x5bd1e995) >>> 0)() < LOCKUP.shove.odds ? 'shove' : 'plain';
}

// The even-phase tug schedule from a seed: [{ at, to }] where `to` is the pair's x offset (px at s = 1, signed along the
// attacker's facing) reached at `at`. Alternates direction at irregular intervals and ends at 0 at evenEnd.
export function tugSchedule(seed) {
    const rnd = seededRandom(seed);
    const [aMin, aMax] = LOCKUP.tugPx, [gMin, gMax] = LOCKUP.tugEvery;
    const out = [{ at: LOCKUP.engageEnd, to: 0 }];
    let t = LOCKUP.engageEnd, sign = rnd() < 0.5 ? -1 : 1;
    for (;;) {
        t += gMin + rnd() * (gMax - gMin);
        if (t >= LOCKUP.evenEnd - 0.08) break;
        out.push({ at: t, to: sign * (aMin + rnd() * (aMax - aMin)) });
        sign = -sign;
    }
    out.push({ at: LOCKUP.evenEnd, to: 0 });
    return out;
}

function tugOffset(schedule, t) {
    if (t <= schedule[0].at) return 0;
    if (t >= schedule.at(-1).at) return 0;
    let i = 1;
    while (schedule[i].at < t) i++;
    const a = schedule[i - 1], b = schedule[i];
    return a.to + (b.to - a.to) * smooth((t - a.at) / (b.at - a.at));
}

// The step pulses of a drive that started at `driveT0`: step k moves during [k*period, k*period + moving), planted after.
// Returns { index, foot, u (0..1 through the moving window, or null when planted) }.
export function stepAt(sinceDrive) {
    if (sinceDrive < 0) return { index: -1, foot: null, u: null };
    const index = Math.floor(sinceDrive / LOCKUP.stepPeriod);
    const within = sinceDrive - index * LOCKUP.stepPeriod;
    return { index, foot: index % 2 === 0 ? 'lead' : 'rear', u: within < LOCKUP.stepMoving ? within / LOCKUP.stepMoving : null };
}

// Pair travel speed in px/s at s = 1, along the drive direction, only while a step is moving (a smoothstep pulse that
// averages to driveSpeed * walkSpeed over the moving window).
function driveVelocity(sinceDrive) {
    const step = stepAt(sinceDrive);
    if (step.u === null) return 0;
    return LOCKUP.driveSpeed * LOCKUP.walkSpeed * 6 * step.u * (1 - step.u);   // d/du of smoothstep: averages driveSpeed * walkSpeed over the moving window
}

const idleWeights = { even: 0, attacker: 0, defender: 0 };

// What the pair does at time `t`. `state`:
//   t           seconds since the lockup began (monotonic, includes the steal hitch and the break)
//   dt          this frame's length
//   seed        tug seed, set at lockup start
//   stealAt     t when the latest steal happened, or null (roles are already swapped at that moment: `attacker` is the
//               new man in control, still holding the old pose until the cross-fade finishes)
//   nearRopes   the defender is within rope range behind him: the travel stops, the push goes on
//   breakAt     t when the break began, or null (set by the caller at `timeout`)
// Returns { phase, weights: { attacker, defender }, dip, lean: { attacker, defender }, grips: { attacker: {collar,elbow},
//   defender: {collar,elbow} }, dx (px at s = 1 this frame, signed along the attacker's facing), jolt (px at s = 1, the
//   compression of the gap, >= 0), release (0..1, the break's let-go: torsos up, arms home), step: { index, foot, u }, close: { attacker, defender } (fraction of the closure) }.
export function lockupPhase(state) {
    const { t, dt = 1 / 60, seed = 1, stealAt = null, nearRopes = false, breakAt = null } = state;
    const grips = {
        attacker: { collar: ramp(t, LOCKUP.gripLand.attacker.collar, LOCKUP.gripRamp), elbow: ramp(t, LOCKUP.gripLand.attacker.elbow, LOCKUP.gripRamp) },
        defender: { collar: ramp(t, LOCKUP.gripLand.defender.collar, LOCKUP.gripRamp), elbow: ramp(t, LOCKUP.gripLand.defender.elbow, LOCKUP.gripRamp) },
    };
    const out = {
        phase: 'engage', weights: { attacker: { ...idleWeights }, defender: { ...idleWeights } }, dip: { attacker: 0, defender: 0 },
        lean: { attacker: 0, defender: 0 }, release: 0, grips, dx: 0, jolt: 0, step: { index: -1, foot: null, u: null },
        close: { attacker: 0, defender: 0 },
    };
    // Engage: the closure is shared 70 / 30, smoothed over the engage window, and the chests meet at joltAt.
    const closeU = smooth(t / LOCKUP.engageEnd);
    out.close = { attacker: LOCKUP.engageClose.attacker * closeU, defender: LOCKUP.engageClose.defender * closeU };
    out.jolt = Math.max(0, LOCKUP.joltPx * Math.exp(-(((t - LOCKUP.joltAt) / LOCKUP.joltWidth) ** 2)));
    const roleWeights = (keyA, keyD, wA, wD) => ({ attacker: { ...idleWeights, [keyA]: wA, even: 1 - wA }, defender: { ...idleWeights, [keyD]: wD, even: 1 - wD } });

    const schedule = tugSchedule(seed);
    let driveT0 = LOCKUP.evenEnd;
    if (stealAt !== null) driveT0 = stealAt + LOCKUP.stealHitch;
    const sinceDrive = t - driveT0;
    // A pulse starts and ends at rest (6u(1-u)), so a reversal starts from rest too.
    const travel = (dir) => {
        if (nearRopes || sinceDrive < 0) return 0;
        return dir * driveVelocity(sinceDrive) * dt;
    };

    if (breakAt !== null && t >= breakAt) {
        const tb = t - breakAt;
        out.phase = 'break';
        out.weights = roleWeights('attacker', 'defender', 1, 1);
        out.release = smooth(tb / LOCKUP.breakRelease);
        out.releaseBend = smooth(tb / LOCKUP.breakBendRelease);   // the torso comes up slower than the arms let go: no one-frame hip snap
        const g = 1 - smooth(tb / LOCKUP.breakGrip);
        for (const r of ['attacker', 'defender']) for (const k of ['collar', 'elbow']) out.grips[r][k] = g;
        out.step = { index: 0, foot: 'lead', u: tb > LOCKUP.breakGrip ? Math.min(1, (tb - LOCKUP.breakGrip) / LOCKUP.breakStep) : null };
        return out;
    }
    if (stealAt !== null && t < stealAt + LOCKUP.stealHitch) {
        // Hitch: both stop, the stealer (the new attacker) drops. Roles are swapped, poses still the old ones.
        out.phase = 'steal';
        const u = smooth((t - stealAt) / LOCKUP.stealHitch);
        out.weights = roleWeights('defender', 'attacker', 1, 1);   // new attacker still holds the loser's pose
        out.dip.attacker = LOCKUP.stealDip * Math.sin(Math.PI * u);
        return out;
    }
    if (t < LOCKUP.engageEnd) {
        out.weights = { attacker: { ...idleWeights, even: 1 }, defender: { ...idleWeights, even: 1 } };
        return out;
    }
    if (stealAt === null && t < LOCKUP.evenEnd) {
        out.phase = 'even';
        out.weights = { attacker: { ...idleWeights, even: 1 }, defender: { ...idleWeights, even: 1 } };
        const off = (tt) => tugOffset(schedule, tt);
        out.dx = off(t) - off(t - dt);
        const tilt = off(t) / LOCKUP.tugPx[1];
        out.lean = { attacker: LOCKUP.tugLean * tilt, defender: -LOCKUP.tugLean * tilt };
        return out;
    }
    // Drive (or stall). After a steal the poses cross-fade over stealCrossfade from the old assignment.
    let wA = smooth((t - LOCKUP.evenEnd) / LOCKUP.driveBlend), wD = wA;
    out.weights = roleWeights('attacker', 'defender', wA, wD);
    if (stealAt !== null) {
        const x = smooth((t - (stealAt + LOCKUP.stealHitch)) / LOCKUP.stealCrossfade);
        out.weights = {
            attacker: { even: 0, attacker: x, defender: 1 - x },
            defender: { even: 0, attacker: 1 - x, defender: x },
        };
    }
    // The last tug frame straddles evenEnd: finish its return to 0 here so the tugs always net to zero.
    const tail = stealAt === null ? tugOffset(schedule, t) - tugOffset(schedule, t - dt) : 0;
    out.step = stepAt(sinceDrive);
    if (nearRopes) {
        out.phase = 'stall';
        const strain = Math.sin(2 * Math.PI * LOCKUP.strainHz * t) * LOCKUP.strainLean;
        out.lean = { attacker: strain, defender: -strain * 0.5 };
        out.step = { index: out.step.index, foot: null, u: null };
        out.dx = tail;
    } else {
        out.phase = 'drive';
        out.dx = travel(1) + tail;
    }
    return out;
}

const LEG_LEN_DEFAULT = 118.8;   // Lou's thigh + shin at s = 1; Arena passes the real rig's
// Mix a role's pose key weights into the leg/lean/crouch channels. `lSide` is skeleton.lChannelSide(facing): which depth
// side the 'l' channels draw on. The lead leg is the near-side leg, the rear leg the far-side leg.
export function lockupPoseChannels(weights, lSide, extra = {}) {
    const legs = extra.legRel ?? { lead: 0, rear: 0 }, legLen = extra.legLen ?? LEG_LEN_DEFAULT;
    const mix = (field) => weights.even * LOCKUP_POSES.even[field] + weights.attacker * LOCKUP_POSES.attacker[field] + weights.defender * LOCKUP_POSES.defender[field];
    const nearCh = lSide === 'far' ? 'r' : 'l', farCh = nearCh === 'l' ? 'r' : 'l';
    if (extra.ending?.role) return { ...endingPose(weights, extra), ...legChannels(mix, nearCh, farCh, legs, legLen) };
    const release = extra.release ?? 0, arm = LOCKUP_ARMS.arm + (LOCKUP.breakArm - LOCKUP_ARMS.arm) * Math.min(1, release * 2.5);   // the arms go first
    return {
        lArm: arm, rArm: arm, lElbow: LOCKUP_ARMS.elbow, rElbow: LOCKUP_ARMS.elbow,
        bend: (mix('bend') + (extra.lean ?? 0)) * (1 - (extra.releaseBend ?? release)),
        crouch: mix('crouch') + (extra.dip ?? 0),
        ...legChannels(mix, nearCh, farCh, legs, legLen),
    };
}

export function legChannels(mix, nearCh, farCh, legs, legLen) {
    const gain = LOCKUP.legGain * legLen, near = mix('lead') + legs.lead / gain, far = mix('rear') + legs.rear / gain;
    return {
        [`${nearCh}Leg`]: near, [`${nearCh}Shin`]: near + mix('leadShin'),
        [`${farCh}Leg`]: far, [`${farCh}Shin`]: far + mix('rearShin'),
    };
}

// Arms and torso of the rope break and the shove, from the A-frame (even-weighted bend) by `u` 0..1. ending = { kind, role, u }.
function endingPose(weights, { ending: { kind, role, u }, releaseBend, lean = 0, dip = 0 }) {
    const bend0 = LOCKUP_POSES.even.bend, crouch = weights.even * LOCKUP_POSES.even.crouch + weights.attacker * LOCKUP_POSES.attacker.crouch + weights.defender * LOCKUP_POSES.defender.crouch;
    const k = smooth(u), to = (a, b) => a + (b - a) * k;
    let arm = to(LOCKUP_ARMS.arm, LOCKUP.breakArm), elbow = LOCKUP_ARMS.elbow, bend = releaseBend === undefined ? to(bend0, 0) : bend0 * (1 - releaseBend);
    if (kind === 'rope' && role === 'attacker') { arm = to(LOCKUP_ARMS.arm, LOCKUP.ropeBreak.handsUp); elbow = to(LOCKUP_ARMS.elbow, LOCKUP.ropeBreak.elbow); }
    if (kind === 'shove' && role === 'attacker') { arm = to(LOCKUP_ARMS.arm, LOCKUP.shove.arm); elbow = to(LOCKUP_ARMS.elbow, LOCKUP.shove.elbow); }
    if (kind === 'shove' && role === 'defender') bend = bend0 + (LOCKUP.shove.stumbleLean - bend0) * (releaseBend ?? k);
    return { lArm: arm, rArm: arm, lElbow: elbow, rElbow: elbow, bend: bend + lean, crouch: crouch + dip };
}

// The D4 grip list, in Wrestler.holdGrips form, for each role's actor. Near arm = the arm whose channel draws on the near
// side (skeleton.lChannelSide). Attacker: near arm collar (behind the defender's neck), far arm on the defender's far
// elbow. Defender: far arm collar (behind the attacker's neck), near arm on the attacker's near elbow.
export function lockupGrips(attacker, defender, grips) {
    const nearArm = (actor) => ((actor.skeleton?.lChannelSide?.(actor.facing) ?? 'near') === 'near' ? 'l' : 'r');
    const farArm = (actor) => (nearArm(actor) === 'l' ? 'r' : 'l');
    const collarAt = (partner) => {
        const neck = partner.skeleton?.jointAttachmentPoints?.neck;
        if (!neck) return null;
        const s = partner.s ?? 1;
        return { x: neck.x - partner.facing * LOCKUP.collarBack * s, y: neck.y + LOCKUP.collarDrop * s };
    };
    const list = (actor, partner, g, collarArm, elbowArm) => {
        const out = [];
        const at = collarAt(partner);
        if (at && g.collar > 0) out.push({ arm: collarArm, partner, joint: 'Neck', side: 'same', at, w: g.collar });
        if (g.elbow > 0) out.push({ arm: elbowArm, partner, joint: 'Elbow', side: 'same', above: LOCKUP.elbowCup, w: g.elbow });
        return out;
    };
    return {
        attacker: list(attacker, defender, grips.attacker, nearArm(attacker), farArm(attacker)),
        defender: list(defender, attacker, grips.defender, farArm(defender), nearArm(defender)),
    };
}

// What each man travels in an ending (px at s = 1, backward, away from the other man) by kind.
export function breakTravel(kind) {
    if (kind === 'rope') return { attacker: LOCKUP.ropeBreak.stepPx, defender: 0 };
    if (kind === 'shove') return { attacker: LOCKUP.shove.attackerPx, defender: LOCKUP.shove.stepPx };
    return { attacker: LOCKUP.breakStepPx / 2, defender: LOCKUP.breakStepPx / 2 };
}

// Where a holdGrips entry's hand goes, for a hand on `handSide`: its `at`, else the partner's joint on that side (or the other side), moved
// `above` of the way up to the partner's shoulder. Read fresh each pass, because the partner's own grips move his joints.
export function gripTarget({ partner, joint, side, at, above }, handSide) {
    if (at) return at;
    const pts = partner.skeleton.jointAttachmentPoints, on = side === 'other' ? (handSide === 'near' ? 'far' : 'near') : handSide;
    const p = pts?.[`${on}${joint}`];
    if (!p || !above) return p;   // `above` < 0 goes past the joint
    const q = pts[`${on}Shoulder`];
    return q ? { x: p.x + (q.x - p.x) * above, y: p.y + (q.y - p.y) * above } : p;
}

// Stage 3: what the man looks like this frame on the way out of the tie-up. `held` is his pose and place in the last held frame, `now` where
// the move has him, u 0..1 through the lead-in. Only for the draw: the move's own pose and x are put back after it, so timing and damage
// don't move. A channel only one side has eases from or to its value on the other side.
export function exitBlendPose(held, now, u) {
    const k = smooth(u), pose = { ...now.pose };
    for (const key of Object.keys(held.pose)) {
        const a = held.pose[key], b = now.pose[key];
        if (typeof a !== 'number') continue;
        // D13: the move has no absolute shin; its shin is the crouch path's, leg minus .75 crouch, which is what the drawn blend lands on
        const away = key === 'lShin' || key === 'rShin' ? (now.pose[`${key[0]}Leg`] ?? 0) - 0.75 * (now.pose.crouch ?? 0) : 0;
        pose[key] = typeof b === 'number' ? a + (b - a) * k : a * (1 - k) + away * k;
    }
    // Bridge a change of knee representation in rendered angle space. A local
    // knee otherwise wins immediately over the interpolated legacy shin, and
    // converting the held shin to local flex clamps away its natural bend.
    // Keep this temporary absolute owner only in the returned draw pose.
    for (const side of ['l', 'r']) {
        const shin = side + 'Shin', knee = side + 'Knee';
        const legacyToLocal = Number.isFinite(held.pose[shin]) && !Number.isFinite(held.pose[knee]) && Number.isFinite(now.pose[knee]);
        const localToLegacy = Number.isFinite(held.pose[knee]) && Number.isFinite(now.pose[shin]) && !Number.isFinite(now.pose[knee]);
        if (!legacyToLocal && !localToLegacy) continue;
        const angle = p => Number.isFinite(p[knee])
            ? (p[side + 'Leg'] ?? 0) + .85 * (p.crouch ?? 0) + clampLocalFlex(p[knee], 'knee')
            : p[shin];
        pose[shin] = angle(held.pose) * (1-k) + angle(now.pose) * k;
        delete pose[knee];
    }
    return { pose, x: held.x + (now.x - held.x) * k, y: held.y + (now.y - held.y) * k };
}

// Foot offsets (px at s = 1, along the wrestler's facing) relative to the pose's base leg angles, so a planted foot holds its
// place in the world while the body travels. Each pulse moves the body by PULSE_PX; the stepping foot gains 2 * PULSE_PX in the
// world, i.e. +PULSE_PX against the hips, and the planted one loses PULSE_PX against the hips; they swap each pulse, so the
// offsets stay within +-PULSE_PX / 2. `dirRel` is +1 when the body travels along its facing (the attacker), -1 against it (the
// defender, and both men in the break).
export const PULSE_PX = LOCKUP.driveSpeed * LOCKUP.walkSpeed * LOCKUP.stepMoving;
export function legRel(step, dirRel) {
    if (!step || step.index < 0) return { lead: 0, rear: 0 };
    const p = smooth(step.u ?? 1);
    const stepper = -dirRel * PULSE_PX * (0.5 - p), planted = dirRel * PULSE_PX * (0.5 - p);
    return step.index % 2 === 0 ? { lead: stepper, rear: planted } : { lead: planted, rear: stepper };
}
