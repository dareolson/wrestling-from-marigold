// Carry (PLAN_GRAPPLES T4c.4g): one man rides another's torso. Two men keyframed separately cannot be held together (the lifted man goes up like an
// elevator while the lifter's hands ride up his hip), so a clip can declare
//   carry: [{ role: 'defender', on: 'attacker', tilt: 1.3, in: [0.14, 0.20], out: [0.48, 0.58] }]
// and MoveRuntime.afterDraw, once both men have drawn, puts the carried man's pelvis at a point in the carrier's TORSO frame (the spot it has where
// the window starts, captured once per play) and turns his torso `tilt` times as far from vertical as the carrier's (leaning back with him). `in` / `out`
// are windowWeight windows, so the carry blends in and out of the sampled pose; resolved before grips, so the hands follow a hip that no longer moves
// against the carrier. Pure helpers here, the draw loop is MoveRuntime's. Points are { x, y } in world px, y down.
// Optional slide: { along, in: [start, peak] } raises that point along the torso
// during the lift, then holds it there through the peak beat.

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const pelvisOf = (pts) => (pts.nearHip && pts.farHip ? mid(pts.nearHip, pts.farHip) : pts.nearHip);

// The torso frame of a man facing `facing`: origin at his pelvis, `u` up the torso (hip to neck), `n` the way he faces, perpendicular to it.
export function torsoFrame(pts, facing) {
    const o = pelvisOf(pts), dx = pts.neck.x - o.x, dy = pts.neck.y - o.y, len = Math.hypot(dx, dy) || 1;
    const u = { x: dx / len, y: dy / len };
    const n = facing >= 0 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x };
    return { o, u, n };
}
export const toFrame = (f, p) => ({ along: (p.x - f.o.x) * f.u.x + (p.y - f.o.y) * f.u.y, across: (p.x - f.o.x) * f.n.x + (p.y - f.o.y) * f.n.y });
export const fromFrame = (f, q) => ({ x: f.o.x + f.u.x * q.along + f.n.x * q.across, y: f.o.y + f.u.y * q.along + f.n.y * q.across });

// How far his torso is from vertical, facing-relative: positive = head toward the way he faces (the `tilt` convention), negative = leaning back.
export function leanFromVertical(pts, facing) {
    const o = pelvisOf(pts), dx = (pts.neck.x - o.x) * (facing >= 0 ? 1 : -1), dy = o.y - pts.neck.y;
    return Math.atan2(dx, dy);
}

const lerp = (a, b, k) => a + (b - a) * k;

// What the carried man should be, this frame, at carry weight `w` (0 = the sampled pose, 1 = fully carried): the pelvis point and the tilt.
// `anchor` is the carried pelvis in the carrier's torso frame (captured at the window's start); `natural` the pelvis as drawn from the sampled pose.
export function carryTarget({ carrierPts, carrierFacing, anchor, natural, naturalTilt, ratio, w, slideAlong = 0 }) {
    const frame = torsoFrame(carrierPts, carrierFacing), held = fromFrame(frame, { ...anchor, along: anchor.along + slideAlong });
    return { x: lerp(natural.x, held.x, w), y: lerp(natural.y, held.y, w), tilt: lerp(naturalTilt, ratio * leanFromVertical(carrierPts, carrierFacing), w) };
}

// A small upward slide along the carrier's torso while the lift develops.
// Reaches its height at the top and holds it through the hitch; the carry's
// own out-window still owns the release into the landing.
export function carrySlideAt(carry, time) {
    if (!carry.slide) return 0;
    const [start, end] = carry.slide.in;
    const u = Math.max(0, Math.min(1, (time-start)/(end-start)));
    return carry.slide.along * u*u*(3-2*u);
}

// The platform a thigh makes (T4c.4j): the point on the TOP of the knee end of a raised thigh, `hip` -> `knee` in world px. It sits `back` of the way back from the knee toward
// the hip and `up` over the thigh's axis on the side that points up the screen, both as shares of the thigh's length.
export function thighTop(hip, knee, { back = 0.14, up = 0.13 } = {}) {
    const dx = knee.x - hip.x, dy = knee.y - hip.y, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    return { x: knee.x - dx * back + nx * up * len, y: knee.y - dy * back + ny * up * len };
}
