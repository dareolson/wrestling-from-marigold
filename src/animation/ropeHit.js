// The rope hit (PLAN_GRAPPLES T3c.5b, grapples=v1): he runs backwards into a side rope, it takes his weight and goes taut, then
// throws him back out. Pure timeline: Wrestler.tickRun drives it from a timer, Arena springs the rope from its tension.
// Every length is rig px, times the wrestler's scale at the call site. Starting points; Derek tunes by eye.

export const ROPE_HIT = Object.freeze({
    turnBefore: 40,      // px before the rope point where he turns his back to it
    depth: 34,           // px he goes past the rope point at full load
    loadMs: 170,
    tautMs: 70,          // worn (stamina under WORN_BELOW): tautWornMs
    tautWornMs: 110,
    springMs: 110,
    wornBelow: 45,
    tremble: 1,          // px, in the taut hold
    boost: 1.7,          // return speed multiplier at launch, down to 1 over boostMs
    boostMs: 260,
    launchBlend: 0.7,    // moveBlend at launch, so the run gait is mostly there
    ropeBow: 27,         // px the spring peaks at (about 30 with its overshoot), on top of the press's 8: the middle strand reaches 37+
});

const easeOut = u => 1 - Math.pow(1 - u, 3);
const easeIn = u => u * u * u;
const clamp01 = u => Math.max(0, Math.min(1, u));

export const tautMsFor = stamina => (stamina < ROPE_HIT.wornBelow ? ROPE_HIT.tautWornMs : ROPE_HIT.tautMs);
export const ropeHitTotalMs = stamina => ROPE_HIT.loadMs + tautMsFor(stamina) + ROPE_HIT.springMs;

// ms since contact. offset: px past the rope point (toward the rope). tension 0..1. phase: load | taut | spring | done.
export function ropeHitAt(ms, stamina) {
    const { loadMs, depth, springMs, tremble } = ROPE_HIT;
    const tautMs = tautMsFor(stamina);
    if (ms < loadMs) { const u = clamp01(ms / loadMs); return { phase: 'load', offset: depth * easeOut(u), tension: u }; }
    if (ms < loadMs + tautMs) {
        const k = Math.round((ms - loadMs) / (1000 / 60));
        return { phase: 'taut', offset: depth + (k % 2 ? tremble : -tremble) * 0.5, tension: 1 };
    }
    if (ms < loadMs + tautMs + springMs) {
        const u = clamp01((ms - loadMs - tautMs) / springMs), r = 1 - easeIn(u);
        return { phase: 'spring', offset: depth * r, tension: r };
    }
    return { phase: 'done', offset: 0, tension: 0 };
}

// Pose channels for the hit (T3d.3): shoulders back past the hips into the rope, hips sunk, elbows down against the ribs (the upper arms are set back to cancel the torso's lean, so they hang) and the forearms up in a guard;
// then folded forward with the arms back to the run's neutral (equal, so the gait's own opposite swing is all that moves them; unequal values read as flapping).
export const ELBOW_REST = 0.70; // a channel the pose has never carried starts from the rest flex
const LOAD = { bend: -0.52, lArm: -0.35, rArm: -0.4, lElbow: 2.0, rElbow: 1.95, crouch: 0.22, lLeg: -0.2, rLeg: 0.24 };
const SPRING = { bend: 0.34, lArm: 0.05, rArm: 0.05, lElbow: ELBOW_REST, rElbow: ELBOW_REST, crouch: 0.2, lLeg: 0.24, rLeg: -0.2 };
export function ropeHitPose(ms, stamina) {
    const { loadMs, springMs } = ROPE_HIT, tautMs = tautMsFor(stamina), out = {};
    const at = ms < loadMs ? easeOut(clamp01(ms / loadMs)) : 1;
    const sp = ms < loadMs + tautMs ? 0 : easeOut(clamp01((ms - loadMs - tautMs) / springMs));
    // an elbow comes in from the rest flex, not from 0 (a straight arm), so the guard is bent the whole way
    for (const k of Object.keys(LOAD)) { const from = k.endsWith('Elbow') ? ELBOW_REST : 0; out[k] = (from + (LOAD[k] - from) * at) * (1 - sp) + SPRING[k] * sp; }
    return out;
}

// The rope's own spring: tracks the target bow (px) stiffly and rings after it is released, overshooting inward.
export const ROPE_SPRING = Object.freeze({ k: 900, c: 14 });
export function stepRopeSpring(s, target, dt) {
    s.vel += (-(s.val - target) * ROPE_SPRING.k - s.vel * ROPE_SPRING.c) * dt;
    s.val += s.vel * dt;
    return s;
}
