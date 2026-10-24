// Visual-only protective reach during a back-pain rise. Zero endpoints preserve
// the existing down/rise and rise/upright handoffs; no timers or gameplay locks.
const smooth = x => {
    const u = Math.max(0, Math.min(1, x));
    return u * u * (3 - 2 * u);
};
export function backRiseWeight(t) {
    if (!Number.isFinite(t) || t <= 0 || t >= 0.85) return 0;
    return smooth(t / 0.18) * (1 - smooth((t - 0.55) / 0.30));
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
