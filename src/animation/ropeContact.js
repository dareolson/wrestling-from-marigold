// `?ropeContact=v1` (PLAN_ROPES T2.1/T2.2): parts bend the strands, and each bend is a spring. Pure: Arena feeds it per-man, per-wall, per-strand target bows (px) and reads back the sprung bow
// and where along the strand it sits. A bow that loses its target keeps its place and eases out; settled bows are dropped.
export const CONTACT = Object.freeze({ k: 900, c: 22, pxMax: 14, pxBase: 5, pxPerPast: 0.5, pad: 5, uncovered: 0.35, settleVal: 0.02, settleVel: 0.2 });   // c 22 at k 900: damping ratio ~0.37, quiet in ~0.4 s
// The states _ropePresses skips (airborne, held, climbing): their bodies press no strand.
export const CONTACT_SKIP = new Set(['climbing', 'onTurnbuckle', 'diving', 'grabbed', 'falling', 'flipping', 'slamming', 'dropkicking']);
export const CONTACT_PARTS = ['head', 'torso', 'nearUpArm', 'farUpArm', 'nearForearm', 'farForearm', 'nearThigh', 'farThigh'];
/** Side wall: how far a part's ink is past the plane (px, > 0 = outside) -> the bow it pushes, capped. 0 when it does not reach. */
export const sidePartPx = past => past > 0 ? Math.min(CONTACT.pxMax, CONTACT.pxBase + CONTACT.pxPerPast * past) : 0;
/** Does a part's ink (screen y range) reach strand height `y`? */
export const reachesY = (ink, y) => !!ink && ink.minY - CONTACT.pad <= y && ink.maxY + CONTACT.pad >= y;
/** Near / far walls: a part carries no ground depth, so the root press stays; the strands a body does not reach at height take the `uncovered` share. */
export const coverWeight = (inks, y) => inks.some(k => reachesY(k, y)) ? 1 : CONTACT.uncovered;
export function createContact() { return new Map(); }   // key -> { val, vel, pos }
/** targets: Map key -> { px, pos }. Returns [{ key, val, pos }] for every bow still alive. */
export function contactStep(st, targets, dt) {
    for (const [key, t] of targets) { const s = st.get(key) ?? { val: 0, vel: 0, pos: t.pos }; s.pos = t.pos; st.set(key, s); }
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n, out = [];
    for (const [key, s] of st) {
        const target = targets.get(key)?.px ?? 0;
        for (let i = 0; i < n; i++) { s.vel += (-(s.val - target) * CONTACT.k - s.vel * CONTACT.c) * h; s.val += s.vel * h; }
        if (!target && Math.abs(s.val) < CONTACT.settleVal && Math.abs(s.vel) < CONTACT.settleVel) { st.delete(key); continue; }
        out.push({ key, val: s.val, pos: s.pos, target });
    }
    return out;
}
