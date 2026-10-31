// Stuck in the corner (PLAN_GRAPPLES T3c.6, grapples=v1): he runs backwards into the corner, takes it as the rope hit takes the rope
// (same turn, same load pose), but there is no spring: he stays in the lean, dazed, as the set-up for a running attack (T3c.7).
// Pure timeline: Wrestler._tickCorner drives it from a timer, so an interruption cannot strand it.
// Every length is rig px, times the wrestler's scale at the call site. Starting points; Derek sets the daze length by eye.
import { ROPE_HIT, ropeHitPose } from './ropeHit.js';
import { staggerFor } from './staggers.js';

export const CORNER = Object.freeze({
    depth: 12,          // px past the corner point at full load, so he never draws through the post (the rope's is 34)
    settleMs: 200,      // from the load pose into the daze
    minDazeS: 1.5,      // length is max(this, the stagger type's seconds)
    extendS: 0.6,       // a charge that connects adds this, once per episode
    exitStep: 30,       // px forward when the daze ends
    exitMs: 260,
    swayBend: 0.05, swayPeriodS: 2.7,     // slow sway of the torso
    swayCrouch: 0.025, swayCrouchPeriodS: 1.8,
    handsMs: 170,       // hands reach the top rope over the load
    handSpread: 24,     // px between the two hands along the rope
});

// The running attack at a cornered man (T3c.7).
export const CORNER_CHARGE = Object.freeze({
    gap: 46,            // px short of him the run ends (arm's reach, no hip contact)
    minDist: 120,       // farther than this and the run key charges him
    minTravelX: 40,     // the run itself must cover at least this much x, or there is no charge (a near-vertical run would crawl)
    hitRange: 70,       // x gap at impact that still connects
    backOff: 84,        // px from him the attacker settles to afterwards (separation holds men 80·s apart)
    backOffMs: 160,
    windupMs: 100,      // the clothesline cock; damage and sell land after it
    shake: [150, 0.002],
});

const easeOut = u => 1 - Math.pow(1 - u, 3);
const clamp01 = u => Math.max(0, Math.min(1, u));

export const cornerDazeSeconds = stamina => Math.max(CORNER.minDazeS, staggerFor(stamina).seconds);

// Slumped, weight back against the post, knees soft, feet planted; hands go up to the top rope (holdGrips refines them).
export const CORNER_DAZE_POSE = Object.freeze({ bend: -0.22, crouch: 0.16, lLeg: -0.08, rLeg: 0.12, lArm: 0.95, rArm: 0.85 });

// ms since contact: px past the corner point (toward the post). Eases out over the load, then holds.
export function cornerOffsetAt(ms) {
    return CORNER.depth * easeOut(clamp01(ms / ROPE_HIT.loadMs));
}

// The pose at ms since contact: the rope hit's load, then eased into the daze, with the sway on top.
export function cornerPoseAt(ms) {
    const load = ropeHitPose(Math.min(ms, ROPE_HIT.loadMs), 100);
    const k = easeOut(clamp01((ms - ROPE_HIT.loadMs) / CORNER.settleMs));
    const out = {};
    for (const key of new Set([...Object.keys(load), ...Object.keys(CORNER_DAZE_POSE)])) {
        out[key] = (load[key] ?? 0) * (1 - k) + (CORNER_DAZE_POSE[key] ?? 0) * k;
    }
    const t = Math.max(0, ms - ROPE_HIT.loadMs) / 1000;
    out.bend += CORNER.swayBend * k * Math.sin(2 * Math.PI * t / CORNER.swayPeriodS);
    out.crouch += CORNER.swayCrouch * k * Math.sin(2 * Math.PI * t / CORNER.swayCrouchPeriodS + 0.8);
    return out;
}
