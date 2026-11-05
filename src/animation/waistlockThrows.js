// The throws out of the waistlock (PLAN_GRAPPLES Stage 4c, A1-A8): the atomic drop and the snapmare that reverses it. Pure data and math, behind
// `?waistlock=v1`, like waistlock.js: nothing here touches a Wrestler or a POSE. Times in seconds, lengths in px at s = 1 (the caller scales).
// Both men face the same way, the attacker behind; `facing` below is that shared direction.
import { WAISTLOCK } from './waistlock.js';

// A2 / A3: the drop's beats on the clip's own clock (the Stage 3 lead-in is the Arena's draw blend over the clip's first 0.14 s, so the
// reverse window and the beats run from the clip's start). `impact` is when the defender's pelvis meets the knee.
// T4c.4m: where the near knee chambers. 'lift' (Codex, default): during the lift, so he finishes it on one leg; 'hitch': r5's legs through the lift, the thigh
// comes up in the first 0.14 s of the hitch (measured at T4c.4m: the near sole still left the mat early and the support sole slid; a failed experiment, kept as a record). `?atomicChamber=hitch` is the page's way to film the other one; nothing else reads it.
const CHAMBER = (() => { const q = globalThis.location ? new URLSearchParams(globalThis.location.search).get('atomicChamber') : globalThis.process?.env?.WFM_ATOMIC_CHAMBER; return q === 'hitch' ? 'hitch' : 'lift'; })();
export const ATOMIC = Object.freeze({
    chamber: CHAMBER,
    lift: 0.42,                         // (a) the attacker sits into the squat and stands with the man locked to his chest, back leaning, legs kicking up
    hitch: 0.24,                        // readable peak beat after the quick lift (Derek 2026-11-04)
    drop: 0.07,                         // (b) he comes down seated on the raised knee (T4c.4j: was 0.12; first contact, seat-to-knee gap under 3 px, measured at 0.55 s)
    impact: 0.73,                       // lift + hitch + drop; contact and damage move with the longer peak beat
    getUp: 0.55,                        // (c) the attacker's rise off his knee, and the receiver's pop forward off it, hands to his backside (the old sell)
    sell: 1.17,                         // (c) T4c.4p: that, then his pain (hand to the tailbone), four planted steps away still facing away, the turn and the settle (was 0.55)
    turnAt: 1.70,                       // the clip time the receiver turns back on his feet, feet together (T4c.4p), after the steps
    duration: 1.90,                     // impact + sell
    reverseWindow: 0.20,                // A3: the defender's reversal counts from the lift's start until this far in
    damageKey: 'atomicDrop',            // STAMINA_DRAIN key, 12
    sellSpec: Object.freeze({ part: 'back', intensity: 0.7 }),
    liftPeak: 80,                     // px the defender's pelvis rises over standing at the top of the lift (G4c-a: was 55, Derek wanted him higher)
    stumbleFwd: 36,                     // px the defender is carried forward off the knee, along the facing (the pop; the steps away add `walkAway` to it)
    walkAway: 37,                       // px the four steps carry him along the facing: 10 + 15 + 9 + 3 (the hurt side shorter); the gap to the attacker at the turn is 123 = 1.5 x holdBehind
});

// A4 / A6: the snapmare's beats (the old defender is the clip's attacker, the old attacker the thrown man). `flip` runs from the pull's end
// to the landing.
// `speed` scales the reach, the pull and the flip (T4c.4e: Derek wants 1.5x or 2x, ships 2 (Derek 2026-11-05)); the thrower's rise after the landing keeps its
// own time. `?snapmareSpeed=2` is the page's way to film the other candidate; nothing else reads it.
const RISE = 0.49;
const SPEED = (() => { const q = Number(globalThis.location ? new URLSearchParams(globalThis.location.search).get('snapmareSpeed') : globalThis.process?.env?.WFM_SNAPMARE_SPEED); return q > 0 ? q : 2; })();
export const SNAPMARE = Object.freeze({
    speed: SPEED,
    reach: 0.15 / SPEED,                // (a) feet down, both hands back to the head
    pull: 0.20 / SPEED,                 // (b) down to the near knee, the head pulled over the near shoulder
    flip: 0.46 / SPEED,                 // (c) one forward turn to the landing angle (270 degrees, flat on his back), path above the shoulder line
    land: (0.15 + 0.20 + 0.46) / SPEED, // the impact frame
    duration: (0.15 + 0.20 + 0.46) / SPEED + RISE,   // the landing, then the thrower's rise from the knee
    turns: 0,                           // whole forward turns before the landing angle (G4c-a: Derek wants one flip, not two)
    landFwd: 260,                       // px in front of the thrower (along the facing) that the thrown man lands (T4c.4e: was 215, Derek wants him carried further)
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
    const k = SNAPMARE.speed;
    return smooth((t - 0.04 / k) / (reachEnd - 0.04 / k)) * (1 - smooth((t - pullEnd) / (0.08 / k)));
}
