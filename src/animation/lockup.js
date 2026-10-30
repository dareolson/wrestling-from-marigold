// The collar-and-elbow tie-up (PLAN_GRAPPLES Stage 1, D1-D9). Pure data and math, behind `?grapples=v1`: nothing here
// touches POSES or a Wrestler, so flag off is untouched. Arena._tickLockup asks lockupPhase() what the pair does this
// frame; lockupGrips() says where each hand goes (Wrestler.holdGrips does the IK). All times in seconds, all lengths in
// px at s = 1 (the caller multiplies by the wrestler's perspective scale `s`).

export const LOCKUP = Object.freeze({
    timeout: 1.4,                       // D2: was 0.8 s
    engageEnd: 0.22,
    engageClose: Object.freeze({ attacker: 0.7, defender: 0.3 }),   // share of the closing distance each man walks
    // Grip weight 1 lands at these times (the ramp starts GRIP_RAMP earlier).
    gripLand: Object.freeze({
        attacker: Object.freeze({ collar: 0.10, elbow: 0.13 }),
        defender: Object.freeze({ collar: 0.17, elbow: 0.20 }),
    }),
    gripRamp: 0.04,
    joltAt: 0.12, joltPx: 3, joltWidth: 0.06,
    evenEnd: 0.55,
    tugPx: Object.freeze([2, 5]), tugEvery: Object.freeze([0.15, 0.30]), tugLean: 0.04,
    driveBlend: 0.18,                   // even -> role pose, after evenEnd
    stepPeriod: 0.30, stepMoving: 0.20, // one step per period; the foot moves for `stepMoving`, then both are planted
    driveSpeed: 0.35,                   // x the walk speed while a step is moving
    walkSpeed: 140,                     // px/s at s = 1 (Wrestler SPEED)
    strainHz: 9, strainLean: 0.02,      // the stalled push
    stealHitch: 0.12, stealCrossfade: 0.20, stealDip: 0.06,
    breakGrip: 0.10, breakStep: 0.25, breakStepPx: 14,
    holdGap: 70,                        // px at s = 1 between the pair's x while held (T1.2 tunes it from the arm, D9)
    collarBack: 9, collarDrop: 6,       // px at s = 1: the collar point is the partner's neck, back of it and lower (D7)
});

// Pose keys (D6). Legs, knees, lean, crouch only; the arms come from the IK. `lead` / `rear` are the near-side and
// far-side leg channels (resolved per facing by lockupPoseChannels).
export const LOCKUP_POSES = Object.freeze({
    even:     Object.freeze({ lean: 0.32, crouch: 0.24, lead: 0.30, leadKnee: 0.35, rear: -0.22, rearKnee: 0.20 }),
    attacker: Object.freeze({ lean: 0.45, crouch: 0.32, lead: 0.35, leadKnee: 0.45, rear: -0.30, rearKnee: 0.10 }),
    defender: Object.freeze({ lean: 0.02, crouch: 0.14, lead: 0.10, leadKnee: 0.20, rear: -0.15, rearKnee: 0.30 }),
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
//   compression of the gap, >= 0), step: { index, foot, u }, close: { attacker, defender } (fraction of the closure) }.
export function lockupPhase(state) {
    const { t, dt = 1 / 60, seed = 1, stealAt = null, nearRopes = false, breakAt = null } = state;
    const grips = {
        attacker: { collar: ramp(t, LOCKUP.gripLand.attacker.collar, LOCKUP.gripRamp), elbow: ramp(t, LOCKUP.gripLand.attacker.elbow, LOCKUP.gripRamp) },
        defender: { collar: ramp(t, LOCKUP.gripLand.defender.collar, LOCKUP.gripRamp), elbow: ramp(t, LOCKUP.gripLand.defender.elbow, LOCKUP.gripRamp) },
    };
    const out = {
        phase: 'engage', weights: { attacker: { ...idleWeights }, defender: { ...idleWeights } }, dip: { attacker: 0, defender: 0 },
        lean: { attacker: 0, defender: 0 }, grips, dx: 0, jolt: 0, step: { index: -1, foot: null, u: null },
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

// Mix a role's pose key weights into the leg/lean/crouch channels. `lSide` is skeleton.lChannelSide(facing): which depth
// side the 'l' channels draw on. The lead leg is the near-side leg, the rear leg the far-side leg.
export function lockupPoseChannels(weights, lSide, extra = {}) {
    const mix = (field) => weights.even * LOCKUP_POSES.even[field] + weights.attacker * LOCKUP_POSES.attacker[field] + weights.defender * LOCKUP_POSES.defender[field];
    const nearCh = lSide === 'far' ? 'r' : 'l', farCh = nearCh === 'l' ? 'r' : 'l';
    return {
        lean: mix('lean') + (extra.lean ?? 0),
        crouch: mix('crouch') + (extra.dip ?? 0),
        [`${nearCh}Leg`]: mix('lead'), [`${nearCh}Knee`]: mix('leadKnee'),
        [`${farCh}Leg`]: mix('rear'), [`${farCh}Knee`]: mix('rearKnee'),
    };
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
        if (g.elbow > 0) out.push({ arm: elbowArm, partner, joint: 'Elbow', side: 'same', w: g.elbow });
        return out;
    };
    return {
        attacker: list(attacker, defender, grips.attacker, nearArm(attacker), farArm(attacker)),
        defender: list(defender, attacker, grips.defender, farArm(defender), nearArm(defender)),
    };
}
