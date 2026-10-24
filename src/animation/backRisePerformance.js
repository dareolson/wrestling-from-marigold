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
