// The throws out of the waistlock (PLAN_GRAPPLES Stage 4c, A1-A8): the atomic drop and the snapmare that reverses it. Pure data and math, behind
// `?waistlock=v1`, like waistlock.js: nothing here touches a Wrestler or a POSE. Times in seconds, lengths in px at s = 1 (the caller scales).
// Both men face the same way, the attacker behind; `facing` below is that shared direction.
import { WAISTLOCK } from './waistlock.js';

// A2 / A3: the drop's beats on the clip's own clock (the Stage 3 lead-in is the Arena's draw blend over the clip's first 0.14 s, so the
// reverse window and the beats run from the clip's start). `impact` is when the defender's pelvis meets the knee.
export const ATOMIC = Object.freeze({
    lift: 0.30,                         // (a) the attacker straightens, the defender rises, legs hanging
    drop: 0.12,                         // (b) he comes down seated on the raised knee
    impact: 0.42,                       // lift + drop
    sell: 0.50,                         // (c) pops forward off the knee, hands to his backside, stumbles on his feet
    duration: 0.92,                     // impact + sell
    reverseWindow: 0.20,                // A3: the defender's reversal counts from the lift's start until this far in
    damageKey: 'atomicDrop',            // STAMINA_DRAIN key, 12
    sellSpec: Object.freeze({ part: 'back', intensity: 0.7 }),
    liftPeak: 80,                     // px the defender's pelvis rises over standing at the top of the lift (G4c-a: was 55, Derek wanted him higher)
    stumbleFwd: 36,                     // px the defender is carried forward off the knee, along the facing
});

// A4 / A6: the snapmare's beats (the old defender is the clip's attacker, the old attacker the thrown man). `flip` runs from the pull's end
// to the landing.
export const SNAPMARE = Object.freeze({
    reach: 0.15,                        // (a) feet down, both hands back to the head
    pull: 0.20,                         // (b) down to the near knee, the head pulled over the near shoulder
    flip: 0.46,                         // (c) one forward turn to the landing angle (270 degrees, flat on his back), path above the shoulder line
    land: 0.15 + 0.20 + 0.46,           // the impact frame
    duration: 1.30,                     // the landing, then the thrower's rise from the knee
    turns: 0,                           // whole forward turns before the landing angle (G4c-a: Derek wants one flip, not two)
    landFwd: 215,                      // px in front of the thrower (along the facing) that the thrown man lands
    damageKey: 'snapmare',              // STAMINA_DRAIN key, 16
    sellSpec: Object.freeze({ part: 'back', intensity: 1.0 }),
});

// Is the defender's reversal still open `t` seconds after the lift began? Late input does nothing (A3).
export function reversalOpen(t) {
    return t >= 0 && t < ATOMIC.reverseWindow;
}

// A6: where the snapmare lands the thrown man (world x) and whether that spot is inside the ring. `bounds` = ringBoundsAtY(thrower.y). The
// same 20 px margin from the side ropes as behindSpotFits (Wrestler._clamp keeps a man that far in).
export function snapmareLandingX(thrower, facing) {
    return thrower.x + facing * SNAPMARE.landFwd * (thrower.s ?? 1);
}
export function snapmareFits(thrower, facing, bounds) {
    const x = snapmareLandingX(thrower, facing);
    return x >= bounds.left + 20 && x <= bounds.right - 20;
}

// The thrown man's total forward rotation at progress `u` (0..1) of the flip, in radians. One whole turn plus the angle that leaves him
// flat on his back: a standing man rotated a quarter turn lies on his back or front depending on direction, so `landAngle` is
// the end of the throw's `tilt` track and is solved against the rig in T4c.3 (the suplex defender's 0 -> 4.76 is the backward reference).
export function flipTilt(u, landAngle) {
    const k = Math.max(0, Math.min(1, u));
    const total = 2 * Math.PI * SNAPMARE.turns + landAngle;
    return total * k * k * (3 - 2 * k) * 0.5 + total * k * 0.5;   // eased in and out, but never stalled mid-air
}

// Can the hold throw at all: it is a hold (grips closed), not the circle or the let-go, and not already thrown once. (A1: one try per hold.)
export function dropAvailable(ws) {
    return !!ws && !ws.ending && !ws.threw && ws.t >= WAISTLOCK.goBehind && ws.t < ws.holdEnd;
}

// How closed the thrower's hands are on the thrown man's head at clip time `t` of the snapmare (0..1): they close over the reach, hold through
// the pull and let go as the flip takes him (A4 a-c).
export function snapmareHeadGrip(t) {
    const smooth = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
    const reachEnd = SNAPMARE.reach, pullEnd = SNAPMARE.reach + SNAPMARE.pull;
    return smooth((t - 0.04) / (reachEnd - 0.04)) * (1 - smooth((t - pullEnd) / 0.08));
}
