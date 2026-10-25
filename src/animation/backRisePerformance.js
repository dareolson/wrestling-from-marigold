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
export function backRiseWeight(t, from = 0, peak = 1) {
    const f = Number.isFinite(from) ? Math.max(0, Math.min(1, from)) : 0;
    if (!Number.isFinite(t) || t >= 1) return 0;
    if (t <= 0) return f;
    return (f + (peak - f) * smooth(t / 0.18)) * (1 - smooth((t - 0.70) / 0.30));
}

// Lying hold (D4, ?sellart=v1): after a back clutch lets go, the near hand settles
// at the small of the back at weight `w` with a slow authored breath, instead of
// returning to rest. `w` is the lowest centre weight whose breathing trough keeps
// both hand arts (grip and fist) within 15 px of backWaist on Lou, both facings
// (tools/debug/hold_weight_sweep.mjs: grip <= 15 px from w .67, fist from w .70;
// trough = w - breath = .72). A pure function of seconds since the clutch ended.
export const HOLD = Object.freeze({ w: 0.80, breath: 0.08, periodSec: 1.6 });
export function holdWeight(sinceReleaseSec) {
    if (!Number.isFinite(sinceReleaseSec) || sinceReleaseSec < 0) return HOLD.w;
    return HOLD.w + HOLD.breath * Math.sin(2 * Math.PI * sinceReleaseSec / HOLD.periodSec);
}

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
// hand rests at the back waist while the hurt is carried. Probed on Procreate Lou's LIVE
// settled pose, which carries local elbow flex (tools/debug/recovery_probe.mjs): lArm -1.2 /
// lElbow +1.5 puts the painted contact 2.33 px from backWaist, both facings, elbow flex
// 125.8 deg (limit 157.6). A pose that still carries only the legacy absolute forearm
// takes the same relative bend: forearm offset = elbow - arm.
export const RECOVERY_BACK_HAND = Object.freeze({ arm: -1.2, elbow: 1.5 });
