// Stuck in the corner (PLAN_GRAPPLES T3c.6, grapples=v1): he runs backwards into the corner, takes it as the rope hit takes the rope
// (same turn, same load pose), but there is no spring: he stays in the lean, dazed, as the set-up for a running attack (T3c.7).
// Pure timeline: Wrestler._tickCorner drives it from a timer, so an interruption cannot strand it.
// Every length is rig px, times the wrestler's scale at the call site. Starting points; Derek sets the daze length by eye.
import { ROPE_HIT, ropeHitPose } from './ropeHit.js';
import { staggerFor } from './staggers.js';

export const CORNER = Object.freeze({
    depth: 12,          // px past the corner point at full load, so he never draws through the post (the rope's is 34)
    settleMs: 200,      // from the load pose into the daze
    minDazeS: 2.2,      // length is max(this, the stagger type's seconds); 1.5 ended before most charges from far landed (T3c.6b)
    exitStep: 30,       // px forward when the daze ends
    exitMs: 260,
    swayBend: 0.05, swayPeriodS: 2.7,     // slow sway of the torso
    swayCrouch: 0.025, swayCrouchPeriodS: 1.8,
    armFallMs: 320,     // the arms settle from the load's guard to the hang, slower than the torso's settle (T3c.6b)
    elbow: 0.25,        // limp: not the idle .7
});

// The running attack at a cornered man (T3c.7).
export const CORNER_CHARGE = Object.freeze({
    gap: 46,            // px short of him the run ends (arm's reach, no hip contact)
    minDist: 120,       // farther than this and the run key charges him
    minTravelX: 40,     // the run itself must cover at least this much x, or there is no charge (a near-vertical run would crawl)
    hitRange: 70,       // x gap at impact that still connects
    backOff: 330,       // px from where he stood the attacker settles to, from the impact on a hit: the body goes down and inward (T3c.8)
    backOffMs: 450,
    missBackOff: 84,    // a whiff: the step T3c.7 had (separation holds standing men 80·s apart)
    missBackOffMs: 160,
    landMargin: 120,    // px·s from the rope to his hips when he lands: the legs lie about 94·s behind them (measured), so the feet stay inside
    reactMs: 150,       // the hit's reaction before the fall
    sellRoomS: 1.4,     // down time on top of DOWN_SEC, so the forced clutch does not eat the rest
    windupMs: 100,      // the clothesline cock; damage and sell land after it
    shake: [150, 0.002],
});

const easeOut = u => 1 - Math.pow(1 - u, 3);
const clamp01 = u => Math.max(0, Math.min(1, u));

export const cornerDazeSeconds = stamina => Math.max(CORNER.minDazeS, staggerFor(stamina).seconds);

// Slumped, weight back against the post, knees soft, feet planted, arms hanging.
export const CORNER_DAZE_POSE = Object.freeze({ bend: -0.22, crouch: 0.16, lLeg: -0.08, rLeg: 0.12, lArm: -0.1, rArm: 0.02 });   // arms hang as dead weight. lArm is the near arm in both facings; -0.1 swings it clear of George's hip (.06 put his wrist 4.9 px from it)

// ms since contact: px past the corner point (toward the post). Eases out over the load, then holds.
export function cornerOffsetAt(ms) {
    return CORNER.depth * easeOut(clamp01(ms / ROPE_HIT.loadMs));
}

// The pose at ms since contact: the rope hit's load, then eased into the daze, with the sway on top.
export function cornerPoseAt(ms) {
    const load = ropeHitPose(Math.min(ms, ROPE_HIT.loadMs), 100);
    const k = easeOut(clamp01((ms - ROPE_HIT.loadMs) / CORNER.settleMs));
    const out = {};
    const ua = clamp01((ms - ROPE_HIT.loadMs) / CORNER.armFallMs), ka = ua * ua * (3 - 2 * ua);   // the arms fall slower than the torso settles, with no bounce
    for (const key of new Set([...Object.keys(load), ...Object.keys(CORNER_DAZE_POSE)])) {
        const w = key === 'lArm' || key === 'rArm' ? ka : k;
        out[key] = (load[key] ?? 0) * (1 - w) + (CORNER_DAZE_POSE[key] ?? 0) * w;
    }
    // the elbows start from the load's guard (T3d.4) and unfold to limp over armFallMs
    for (const e of ['lElbow', 'rElbow']) out[e] = (load[e] ?? 0.7) * (1 - ka) + CORNER.elbow * ka;
    const t = Math.max(0, ms - ROPE_HIT.loadMs) / 1000;
    out.bend += CORNER.swayBend * k * Math.sin(2 * Math.PI * t / CORNER.swayPeriodS);
    out.crouch += CORNER.swayCrouch * k * Math.sin(2 * Math.PI * t / CORNER.swayCrouchPeriodS + 0.8);
    return out;
}
