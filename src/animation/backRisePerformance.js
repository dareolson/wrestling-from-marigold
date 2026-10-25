// Visual-only protective reach during a back-pain rise. Zero endpoints preserve
// the existing down/rise and rise/upright handoffs; no timers or gameplay locks.
// The ease-out runs .70 -> 1.0 (was .55 -> .85) so the hand is still on the back when
// the standing recovery motif (RECOVERY_BACK_HAND) takes over (D3 option A).
const smooth = x => {
    const u = Math.max(0, Math.min(1, x));
    return u * u * (3 - 2 * u);
};
// `from` (D4): the lying-hold weight the rise starts from. The rise eases from it up
// to full reach instead of dipping to 0 and back; with no hold (from = 0) this is
// the original envelope exactly. A pure function of (t, from).
// `peak` is the reach the rise holds (severity); a hold above it eases down to it.
// `carry` (D5, a rise that hands off into the carried standing recovery): no ease-out; the
// weight keeps climbing to `peak` and stays there through t = 1, so the arm leaves the rise
// where the recovery picks it up. Without it the envelope is exactly the original.
export function backRiseWeight(t, from = 0, peak = 1, carry = false) {
    const f = Number.isFinite(from) ? Math.max(0, Math.min(1, from)) : 0;
    if (carry) return !Number.isFinite(t) ? 0 : t <= 0 ? f : f + (peak - f) * smooth(t / 0.18);
    if (!Number.isFinite(t) || t >= 1) return 0;
    if (t <= 0) return f;
    return (f + (peak - f) * smooth(t / 0.18)) * (1 - smooth((t - 0.70) / 0.30));
}

// Lying hold (D4, ?sellart=v1): after a back clutch lets go, the near hand settles
// at the small of the back at a CONSTANT reach weight `holdW` instead of returning to rest.
// `holdW` is RIG DATA (textures.backSell.holdW, rig/backSell.js): the lowest weight that keeps the
// contact within the rig's contactPx of backWaist on both facings (tools/debug/hold_weight_sweep.mjs;
// Lou: .80). The hand does not move on its own (Rev 2 D7, Derek at G6: a breathing reach read as
// rubbing the belly); the CHEST breathes instead, a grounded `torso` offset, and the reach re-solves
// each frame so the hand follows the body. The breath is the same for every rig.
export const HOLD_BREATH = Object.freeze({ torso: 0.04, periodSec: 1.6 });
// Constant in time. `sinceReleaseSec` stays in the signature (the callers and the T1.2 fixture pass it).
export function holdWeight(sinceReleaseSec, holdW) {
    return holdW;
}
// Leg life during the hold (Rev 2 D8, Derek at G6: stiff legs read weird). A slow, pained alternating knee
// draw-up in a `cycleSec` cycle: the near knee goes up and down, a short rest, the far knee goes up and down,
// a rest. Each lift is a sin^2 bump (smooth in and out, 1 at the middle of its window). Peaks are about half
// the supine `writhe` key (sells.js). The legs ramp in from 0 over `rampSec` of the hold so the clutch -> hold
// handoff does not jump. Same for every rig; the knees still go through `limitKnees` when drawn.
export const HOLD_LEGS = Object.freeze({
    cycleSec: 3.6, rampSec: 0.4,
    nearWindow: Object.freeze([0, 1.4]), farWindow: Object.freeze([1.8, 3.2]),
    near: Object.freeze({ nearThigh: 0.40, nearShin: -0.35 }),
    far: Object.freeze({ farThigh: 0.35, farShin: -0.30 }),
    hip: 2,
});
const bump = (t, [a, b]) => t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)) ** 2;
// The grounded offsets the hold adds to the lying pose, a pure function of seconds since the clutch ended.
// Zero at the start, so the clutch -> hold handoff does not jump.
export function holdOffsets(sinceReleaseSec) {
    const t = Number.isFinite(sinceReleaseSec) && sinceReleaseSec > 0 ? sinceReleaseSec : 0;
    const ramp = smooth(t / HOLD_LEGS.rampSec);
    const c = t % HOLD_LEGS.cycleSec;
    const n = bump(c, HOLD_LEGS.nearWindow) * ramp, f = bump(c, HOLD_LEGS.farWindow) * ramp;
    return {
        torso: HOLD_BREATH.torso * Math.sin(2 * Math.PI * t / HOLD_BREATH.periodSec),
        nearThigh: HOLD_LEGS.near.nearThigh * n, nearShin: HOLD_LEGS.near.nearShin * n,
        farThigh: HOLD_LEGS.far.farThigh * f, farShin: HOLD_LEGS.far.farShin * f,
        hip: HOLD_LEGS.hip * Math.max(n, f),
    };
}

// Rise continuity (Rev 2): the rise starts from the pose the hold last drew, so the hold's leg and torso
// offsets are carried into the rise and eased out over t in [0, RISE_HOLD_EASE]. 1 at t = 0, 0 from the end.
// A pure function of t.
export const RISE_HOLD_EASE = 0.15;
export const riseHoldCarry = t => !Number.isFinite(t) || t >= RISE_HOLD_EASE ? 0 : t <= 0 ? 1 : 1 - smooth(t / RISE_HOLD_EASE);

// Far (support) hand plant during the same rise. Visual-only, a pure function of
// rise progress t and the rig's own base keyposes: the far wrist, where the base
// rise has it at t0 (y on the mat line), stays put until the base shoulder is
// `reach` of the arm length away from it (tLift, found per rig in Skeleton), then
// lets go. t0 is the earliest start of the longest window measured by
// tools/debug/sell_art_rise_measure.mjs on Procreate Lou (the plan's 3 px rule
// gives a 0.02 window); t1 caps tLift at the hip-lift keypose.
export const PLANT = Object.freeze({ t0: 0.12, t1: 0.70, reach: 0.98, inSpan: 0.05, outSpan: 0.08 });
export function plantWeight(t, tLift) {
    if (!Number.isFinite(t) || !Number.isFinite(tLift) || t <= PLANT.t0 || t >= tLift + PLANT.outSpan) return 0;
    return smooth((t - PLANT.t0) / PLANT.inSpan) * (1 - smooth((t - tLift) / PLANT.outSpan));
}

// Standing recovery, back (D3 option A, ?sellart=v1 + ?aftermath=v2): offsets added x the
// recovery weight to the near-arm l-channels of the pose he is standing in, so the near
// hand rests at the back waist while the hurt is carried. The offsets are RIG DATA
// (textures.backSell.recoveryArm / recoveryElbow), probed on the rig's LIVE settled pose, which
// carries local elbow flex (tools/debug/recovery_probe.mjs; Lou: arm -1.2 / elbow +1.5 puts the
// painted contact 2.33 px from backWaist, both facings, elbow flex 125.8 deg, limit 157.6).
// A pose that still carries only the legacy absolute forearm takes the same relative bend:
// forearm offset = elbow - arm.

// D5 (carried rise): the standing hand starts on the arm the rise ended on (`riseEnd`,
// Skeleton.carriedRiseEndArm, upright channels) and eases over ARM_SETTLE_MS into the probed
// back-hand pose, now as absolute channels on the rig's settled idle (`settledBackHand`).
// Absolute because the live pose is still tweening to idle on the first standing frames.
// A pure function of (riseEnd, ms since standing, the settled back hand).
export const ARM_SETTLE_MS = 300;
// The settled idle plus the rig's probed offsets. The settled arm is DERIVED: the idle pose's own
// `lArm` (`idle` = POSES[wrestler.idlePose]), which is what the live settled pose carries; the
// settled elbow is the rig's `backSell.settledElbow`.
export const settledBackHand = (backSell, idle) => ({
    arm: (idle?.lArm ?? 0) + backSell.recoveryArm, elbow: backSell.settledElbow + backSell.recoveryElbow });
export function carriedHandTarget(riseEnd, sinceMs, settled) {
    const u = smooth(sinceMs / ARM_SETTLE_MS);
    return { arm: riseEnd.arm + (settled.arm - riseEnd.arm) * u,
        elbow: riseEnd.elbow + (settled.elbow - riseEnd.elbow) * u };
}
