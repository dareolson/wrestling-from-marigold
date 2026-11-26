// `?ropeSpill=v1` (PLAN_ROPES stage RS): a knockdown beside a side wall can end with his head and shoulders under the bottom strand. Authored and placed against the rope, not physics.
// Pure: Wrestler feeds the situation, gets the move that puts him there (carried by the fall, then a settle slide) and the slide back out before the get-up. The target is on the DRAWN
// strand (TS.5), not the ground plane: the strand is ~18" up, so on screen at his torso's row it crosses well outside the plane at his feet.
import { RING } from '../constants.js';
export const SPILL = Object.freeze({
    f: 0.25,         // where the drawn strand crosses his torso, as a fraction of its length from the neck end (target 0 = neck base .. 0.5 = mid-chest)
    hipsMin: 20,     // s = 1 px: the root (hips) stays at least this far inside the plane (the movement clamp's own margin)
    fallCap: 60,     // px at s = 1: how far the fall itself may carry him toward the wall (the knockback of the knockdown)
    cap: 40,         // px at s = 1: the eased slide in the landing's settle covers the rest, at most this
    dur: 0.35,       // s, the slide in
    backDur: 0.45,   // s, the slide out before the get-up
    clear: 4,        // s = 1 px: out, the head ends this far inside the drawn strand (clear of it before the rise)
    // per rig, px at s = 1 (rope probe --spillscan): ext = root to the torso ink's far edge along the head's direction (a fall on his back / thrown on his back / face down),
    // len = torso ink length, mid = torso ink mid-height above the root's row (negative = up the screen), head = root to the head ink's far edge (lying on his back, fall),
    // headTop = the head ink's top edge above the root's row
    rig: Object.freeze({
        default: Object.freeze({ reach: Object.freeze({ supine: 121, prone: 121 }), supine: 80, thrown: 70, prone: 82, len: 92, midSupine: -8, midProne: -14, head: 115, headTopSupine: -32, headTopProne: -32 }),
        'george-roster-v1': Object.freeze({ reach: Object.freeze({ supine: 121, prone: 120 }), supine: 78, thrown: 67, prone: 80, len: 93, midSupine: -10, midProne: -14, head: 120, headTopSupine: -32, headTopProne: -38 }),
        'thesz-procreate-v1': Object.freeze({ reach: Object.freeze({ supine: 114, prone: 114 }), supine: 82, thrown: 72, prone: 84, len: 90, midSupine: -5, midProne: -14, head: 114, headTopSupine: -31, headTopProne: -27 }),
    }),
});
const rigOf = rig => SPILL.rig[rig] ?? SPILL.rig.default;
/** The longest any head / torso ink pixel reaches from the root along the head's direction in the whole knockdown window (landing, sells, get-up), px at s = 1: TS.6b `reach`, measured per rig (rope probe --catchscan, REACH=1). */
export const reachOf = (rig, lying) => rigOf(rig).reach[lying === 'prone' ? 'prone' : 'supine'];
export const spillExt = (rig, lying, thrown = false) => rigOf(rig)[lying === 'prone' ? 'prone' : thrown ? 'thrown' : 'supine'];
/** +1 = toward the right wall. On his back the head lies away from his facing, face down it lies toward it. */
export const spillHeadDir = (lying, facing) => (lying === 'prone' ? 1 : -1) * (facing || 1);
/** The bottom side strand's drawn x at screen row `y` (the rest line: near corner to far corner along strand 0), for the wall `dir` (-1 left, 1 right). */
export function strandX(y, dir) {
    const r = RING.ropes[0], t = (r.nearY - y) / (r.nearY - r.farY), a = dir < 0 ? RING.nearLeft.x : RING.nearRight.x, b = dir < 0 ? RING.farLeft.x : RING.farRight.x;
    return a + (b - a) * t;
}
// How far outside the ground plane the drawn strand crosses his torso (px at s = 1, >= 0): the strand is ~18" up, so on screen at the torso's row it sits well outside the plane at his feet.
function strandOut({ y, s, lying, rig, bounds, dir, row = 'mid' }) {
    const r = rigOf(rig), dy = row === 'headTop' ? (lying === 'prone' ? r.headTopProne : r.headTopSupine) : (lying === 'prone' ? r.midProne : r.midSupine), plane = dir > 0 ? bounds.right : bounds.left;
    return Math.max(0, dir * (strandX(y + dy * s, dir) - plane) / s);
}
/**
 * The move in: { dx (the settle slide, world px, signed), fallDx (the part carried by the fall, world px), dur, wall: 'L' | 'R' } or null (not lying, or too far from the wall for the fall
 * shift + slide). `canShift`: the knockdown is still falling, so the fall may carry him (fallCap); at the landing and for a throw only the slide. bounds: { left, right } at his row `y`.
 * The root ends where the drawn strand crosses his torso `SPILL.f` of its length in from the neck end, but never nearer the plane than `hipsMin`.
 */
export function spillPlan({ x, y, s = 1, facing = 1, lying, rig, bounds, thrown = false, canShift = false }) {
    if (lying !== 'supine' && lying !== 'prone') return null;
    const dir = spillHeadDir(lying, facing), plane = dir > 0 ? bounds.right : bounds.left;
    const dist = (dir > 0 ? plane - x : x - plane) / s;                                     // root to the plane the head points at
    const out = strandOut({ y, s, lying, rig, bounds, dir });
    const want = Math.max(SPILL.hipsMin, spillExt(rig, lying, thrown) - out - SPILL.f * rigOf(rig).len);   // where the root should end (distance to the plane)
    const need = dist - want;                                                               // + toward the wall, - away
    const shiftCap = canShift ? SPILL.fallCap : 0;
    if (need > shiftCap + SPILL.cap) return null;                                           // too far from the wall: stays inside
    const fall = Math.max(0, Math.min(shiftCap, need)), slide = Math.max(-SPILL.cap, Math.min(SPILL.cap, need - fall));
    return { dx: slide * s * dir, fallDx: fall * s * dir, dur: SPILL.dur, wall: dir > 0 ? 'R' : 'L', want, out };
}
/**
 * The slide out before the get-up: { dx, dur } putting his whole head inside the drawn strand (the strand slants up the screen, so the line to clear is its x at the head's TOP row),
 * `clear` px in, or null when it already is. The head's reach is shorter by the supine fall/thrown difference when thrown.
 */
export function spillBack({ x, y, s = 1, wall, lying, rig, bounds, thrown = false }) {
    const dir = wall === 'R' ? 1 : -1, plane = dir > 0 ? bounds.right : bounds.left, r = rigOf(rig);
    const dist = (dir > 0 ? plane - x : x - plane) / s, out = strandOut({ y, s, lying, rig, bounds, dir, row: 'headTop' });
    const head = r.head - (thrown && lying !== 'prone' ? r.supine - r.thrown : 0);
    const want = head - out + SPILL.clear;
    return want > dist ? { dx: -(want - dist) * s * dir, dur: SPILL.backDur } : null;
}
// TS.6 / TS.6b: the rope catches him. A knockdown whose head or torso ink reaches the drawn bottom strand AT HIS DEPTH is stopped there (the fall's travel toward the wall ends at the first ink pixel on the
// strand) and thrown back by one small hop that leaves his whole head inside it for the landing, the sells and the get-up.
export const CATCH = Object.freeze({
    lift: 14,     // s = 1 px: the hop's peak height
    minDx: 10,    // s = 1 px: the least the bounce carries him, so even a graze reads as a bounce
    dur: 0.45,    // s, the one hop
    extra: 12,    // s = 1 px (6 -> 12 for the 3x rope sag, 2026-11-25: Lou slammed ended 1-2 px inside): carried past the measured reach + clear, so the strand's own bow and the pose's small swings stay inside it
    near: 140,    // s = 1 px: ink is only measured within this of the plane (the longest lying reach is 121)
    rows: 14,     // px: the strand's rows at his depth are widened by this: its drawn thickness and the kick, bow and his own hop lift between the frame it was read on and the one drawn (the probe counts only 4)
    depth: 18,    // s = 1 px: one body depth (the shadow ellipse's half height) either side of his root's row
});
/**
 * The bottom strand at his depth from its drawn points `pts` (near corner .. far corner, evenly in t; the drawn strand, bow and sway included): { xs, ys, rows } where (xs, ys) is its point at his
 * root's ground row `y` and `rows` is how far its rows reach over one body depth either side of it, plus `CATCH.rows`. Null without points.
 */
export function strandAtDepth(pts, y, s = 1) {
    if (!pts || pts.length < 2) return null;
    const span = RING.nearLeft.y - RING.farLeft.y, at = (t) => { const k = Math.max(0, Math.min(1, t)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(k)), q = k - i; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * q, y: pts[i].y + (pts[i + 1].y - pts[i].y) * q }; };
    const t = (RING.nearLeft.y - y) / span, dt = CATCH.depth * s / span, c = at(t), a = at(t - dt), b = at(t + dt);
    return { xs: c.x, ys: c.y, rows: Math.abs(b.y - a.y) / 2 + CATCH.rows };
}
/** The strand at his depth from the rest line when the drawn points are not to hand (tests). */
export function strandRest(y, dir, s = 1) {
    const r = RING.ropes[0], span = RING.nearLeft.y - RING.farLeft.y, t = (RING.nearLeft.y - y) / span, row = (u) => r.nearY - (r.nearY - r.farY) * u, dt = CATCH.depth * s / span;
    return { xs: strandX(row(t), dir), ys: row(t), rows: Math.abs(row(t + dt) - row(t - dt)) / 2 + CATCH.rows };
}
/**
 * The hop at the first ink on the strand: { dx (world px, signed, away from the wall), lift (world px), dur, wall } or null when the pose's longest reach already lies inside it.
 * `dist` (s = 1 px): the root's distance to the strand's x now; the hop ends with the rig's longest lying reach plus SPILL.clear plus CATCH.extra inside it.
 */
export function catchPlan({ s = 1, facing = 1, lying, rig, dist, wallDir = null, held = false }) {
    if (lying !== 'supine' && lying !== 'prone') return null;
    const head = spillHeadDir(lying, facing), dir = wallDir ?? head;
    // the measured reach is along the head's direction; with the head away from the wall (legs toward it) the torso's length is the reach he can sweep toward it (rising); in a throw's clip the facing is not final: the longer
    const reach = dir === head && !held ? reachOf(rig, lying) : Math.max(held ? reachOf(rig, lying) : 0, rigOf(rig).len);
    const want = reach + SPILL.clear + CATCH.extra, base = want - dist;
    if (base <= 0) return null;
    return { dx: -dir * Math.max(base, CATCH.minDx) * s, lift: CATCH.lift * s, dur: CATCH.dur, wall: dir > 0 ? 'R' : 'L' };
}
/** The rope break test for a pin, sleeper or headlock on `w`: at the wall as before, or lying spilled under it. */
export function spillAtRopes({ x, s = 1, bounds, spilled = false }) { return spilled || x <= bounds.left + 30 * s || x >= bounds.right - 30 * s; }
