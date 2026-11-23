// ?ropes=v1 (PLAN_ROPES T1.6): the bottom strand comes alive. A man down on, over or getting up off a wall's bottom strand kicks it; the swing travels round the ring wall by wall
// (a delay per post, a share of the energy lost at each), one damped spring per wall. Pure: Arena feeds it contact and draws `val` (px, + = down the screen) on strand 0 of each wall.
export const SWAY_WALLS = ['near', 'R', 'far', 'L'];   // round the ring: nearRight, farRight, farLeft, nearLeft posts between them
export const SWAY = Object.freeze({ amp: 12, freq: 3, zeta: 0.09, delay: 0.12, decay: 0.76, topUpEvery: 0.5, topUp: 0.15 });
// amp: px at the contact wall for hardness 1 and scale 1; decay^2 ~ 7/12 on the opposite wall; freq Hz; zeta gives ~1.8 s to settle under 5 % (ln 20 / (zeta * 2 pi freq))
export const swayHops = (a, b) => { const d = Math.abs(SWAY_WALLS.indexOf(a) - SWAY_WALLS.indexOf(b)); return Math.min(d, SWAY_WALLS.length - d); };
export function createSway() {
    return { t: 0, queue: [], log: [], spring: Object.fromEntries(SWAY_WALLS.map(w => [w, { val: 0, vel: 0 }])) };
}
/** Kick `wall` with `amp` px; every wall gets its share after hops * delay seconds. */
export function swayKick(s, wall, amp) {
    s.log.push({ t: s.t, wall, amp });
    for (const w of SWAY_WALLS) { const h = swayHops(wall, w); s.queue.push({ at: s.t + h * SWAY.delay, wall: w, amp: amp * SWAY.decay ** h }); }
}
export function swayStep(s, dt) {
    s.t += dt;
    const om = 2 * Math.PI * SWAY.freq;
    for (const q of s.queue) if (q.at <= s.t) { s.spring[q.wall].vel += q.amp * om; q.done = true; }
    s.queue = s.queue.filter(q => !q.done);
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    for (const w of SWAY_WALLS) {
        const sp = s.spring[w];
        for (let i = 0; i < n; i++) { sp.vel += (-om * om * sp.val - 2 * SWAY.zeta * om * sp.vel) * h; sp.val += sp.vel * h; }
        if (Math.abs(sp.val) < 0.02 && Math.abs(sp.vel) < 0.2 && !s.queue.length) { sp.val = 0; sp.vel = 0; }
    }
}
export const swayActive = s => s.queue.length > 0 || SWAY_WALLS.some(w => s.spring[w].val !== 0 || s.spring[w].vel !== 0);
// Which wall's bottom strand a lying man is on, or null. Side walls: his ink crosses the plane x at his depth and spans the strand's height (stripY +- STRIP_BAND);
// near / far: he lies within NEAR_FAR_BAND ground px of that wall. Ink is { minX, maxX, minY, maxY } over his parts.
export const STRIP_BAND = 8, NEAR_FAR_BAND = 14;
export function swayWall({ y, ink, bounds, stripY, nearY, farY }) {
    if (ink && ink.minY <= stripY + STRIP_BAND && ink.maxY >= stripY - STRIP_BAND) {
        if (ink.minX < bounds.left) return 'L';
        if (ink.maxX > bounds.right) return 'R';
    }
    if (y >= nearY - NEAR_FAR_BAND) return 'near';
    if (y <= farY + NEAR_FAR_BAND) return 'far';
    return null;
}
export const SWAY_STATES = new Set(['down', 'gettingUp', 'possum', 'pinned', 'sleeping']);
// How hard: a landing scales with its intensity and incoming speed (falls.js REF_VY), a man already down or rising kicks lightly.
export function swayHardness(landing, refVy) {
    if (!landing) return 0.35;
    const speed = Math.min(1.6, Math.max(0.4, (landing.vy || refVy) / refVy));
    return Math.min(1.5, Math.max(0.3, (landing.intensity ?? 0.6) * speed * 1.85));
}
