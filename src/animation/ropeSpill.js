// `?ropeSpill=v1` (PLAN_ROPES stage RS): a knockdown beside a side wall can end with his head and shoulders under the bottom strand. Authored and placed against the rope, not physics.
// Pure: Wrestler feeds the situation, gets the slide that puts him there, and the slide back out before the get-up. `ext` = root to the far edge of his torso ink along the head's
// direction (px at s = 1), measured by the rope probe (tools/debug/rope_order_probe.mjs --spillscan): a fall (strike knockdown) on his back Lou 82, George 78; thrown (slam, suplex) on his
// back Lou 72, George 67; face down Lou 84, George 80.
export const SPILL = Object.freeze({
    neckPast: 12,    // the base of the neck / shoulders end this far past the plane (px at s = 1)
    cap: 40,         // the slide is at most this (px at s = 1), eased
    dur: 0.35,       // s, the slide in during the landing's settle
    backDur: 0.4,    // s, the slide out before the get-up
    headExtra: 32,   // the head's far edge lies this much beyond the torso's (px at s = 1, probe: 25-31)
    clear: 4,        // s = 1 px: out, the head ends this far inside the plane (clear of the strand before the rise)
    ext: Object.freeze({
        default: Object.freeze({ supine: 80, thrown: 70, prone: 82 }),
        'thesz-procreate-v1': Object.freeze({ supine: 82, thrown: 72, prone: 84 }),
        'george-roster-v1': Object.freeze({ supine: 78, thrown: 67, prone: 80 }),
    }),
});
export const spillExt = (rig, lying, thrown = false) => (SPILL.ext[rig] ?? SPILL.ext.default)[lying === 'prone' ? 'prone' : thrown ? 'thrown' : 'supine'];
/** +1 = toward the right wall. On his back the head lies away from his facing, face down it lies toward it. */
export const spillHeadDir = (lying, facing) => (lying === 'prone' ? 1 : -1) * (facing || 1);
/** The slide in: { dx (world px, signed), dur (s), wall: 'L' | 'R' } or null (not lying, the wall is too far for the cap). bounds: { left, right } at his depth. */
export function spillPlan({ x, s = 1, facing = 1, lying, rig, bounds, thrown = false }) {
    if (lying !== 'supine' && lying !== 'prone') return null;
    const dir = spillHeadDir(lying, facing), plane = dir > 0 ? bounds.right : bounds.left;
    const dist = (dir > 0 ? plane - x : x - plane) / s;                 // root to the plane the head points at
    const want = spillExt(rig, lying, thrown) - SPILL.neckPast;                   // where the root should end
    const move = dist - want;                                             // + = toward the wall, - = away (he overshoots in)
    if (move > SPILL.cap) return null;                                    // too far from the wall: stays inside
    const dx = Math.max(-SPILL.cap, Math.min(SPILL.cap, move)) * s * dir;
    return { dx, dur: SPILL.dur, wall: dir > 0 ? 'R' : 'L' };
}
/** The slide out before the get-up: { dx, dur } putting the head `clear` px inside the plane, or null when it already is. */
export function spillBack({ x, s = 1, wall, lying, rig, bounds, thrown = false }) {
    const dir = wall === 'R' ? 1 : -1, plane = dir > 0 ? bounds.right : bounds.left;
    const dist = (dir > 0 ? plane - x : x - plane) / s, want = spillExt(rig, lying, thrown) + SPILL.headExtra + SPILL.clear;
    return want > dist ? { dx: -(want - dist) * s * dir, dur: SPILL.backDur } : null;
}
/** The rope-break test for a pin, sleeper or headlock on `w`: at the wall as before, or lying spilled under it. */
export function spillAtRopes({ x, s = 1, bounds, spilled = false }) { return spilled || x <= bounds.left + 30 * s || x >= bounds.right - 30 * s; }
