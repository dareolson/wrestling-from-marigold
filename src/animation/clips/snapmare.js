// The snapmare reversal of the atomic drop (PLAN_GRAPPLES Stage 4c A4/A5), hand-posed for ?waistlock=v1. Roles are swapped from the drop: the
// `attacker` track is the man who was lifted (he lands on his feet, reaches back for the head and pulls), the `defender` track the man who
// held him (he is thrown over the first man's shoulder, one forward turn to the landing angle, and lands flat on his back in front). Both
// face the same way throughout. Tableau: rig units from the thrower's place at play(), x along the shared facing, y world down; the thrown
// man enters behind him (x < 0) and `upstage` away from the camera. Beats on waistlockThrows.js SNAPMARE: reach to 0.15, pull to 0.35, flip to
// 0.81 (`impact`: his back meets the mat), then the thrower rises from the knee.
import { WAISTLOCK } from '../waistlock.js';
import { SNAPMARE, flipTilt } from '../waistlockThrows.js';

const U = WAISTLOCK.upstage;
const R = SNAPMARE.reach, P = R + SNAPMARE.pull, I = SNAPMARE.land, D = SNAPMARE.duration;
const GAP = 62;                       // the thrown man's entry gap behind the thrower: where the lift left the pair, 0.1-0.2 s in
const LAND_ANGLE = 1.5 * Math.PI;     // forward turns end here: flat on his back, head toward the thrower (tilt is clockwise for a man facing right)
const PULL_TILT = 0.4;                // the thrown man's tilt at the pull's end; the flip carries on from it, so with no whole turn it still never runs back
const PEAK = 110, HIP_DROP = 100;     // the thrown man's hips peak this far above standing and finish this far below (on the mat)

const kf = (at, ease, pose, x = 0, y = 0) => ({ at, ease, pose, transform: { x, y }, parts: {} });
const lerp = (a, b, k) => a + (b - a) * k;

// The flip, sampled every FLIP_STEP: tilt on flipTilt's curve, hips on an arc above the thrower's shoulder line and then down onto the mat.
const FLIP_STEP = 1 / 30;
const flipFrames = [];
for (let t = P + FLIP_STEP; t < I - 1e-9; t += FLIP_STEP) {
    const u = (t - P) / (I - P), tuck = Math.sin(Math.PI * Math.min(1, u * 1.15));
    flipFrames.push(kf(t, 'linear', {
        lArm: lerp(1.6, 0.8, tuck), rArm: lerp(1.6, 0.8, tuck), lElbow: lerp(0.4, 1.2, tuck), rElbow: lerp(0.4, 1.2, tuck),
        lLeg: lerp(0.3, 1.2, tuck), rLeg: lerp(0.2, 1.1, tuck), lKnee: lerp(0.4, 1.6, tuck), rKnee: lerp(0.4, 1.5, tuck),
        lean: 0, crouch: 0, tilt: PULL_TILT + flipTilt(u, LAND_ANGLE - PULL_TILT), lift: PEAK * 4 * u * (1 - u) - HIP_DROP * u ** 3, bend: lerp(0.9, 0.1, u),
    }, lerp(-34, SNAPMARE.landFwd, u), lerp(-U, 0, u)));
}
const landed = { lArm: 0.4, rArm: 0.35, lElbow: 0.3, rElbow: 0.3, lLeg: 0.45, rLeg: 0.35, lKnee: 0.55, rKnee: 0.45, lean: 0, crouch: 0, tilt: flipTilt(1, LAND_ANGLE), lift: -HIP_DROP, bend: 0.06 };

export const snapmareClip = {
    id: 'snapmare',
    duration: D,
    tracks: {
        // The man who was lifted: down onto his feet, both hands back to the head, down to the near knee and the pull, then he rises.
        attacker: {
            keyframes: [
                kf(0, 'linear', { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: 0.12, rLeg: 0.22, lKnee: 0.35, rKnee: 0.30, lean: -0.08, crouch: 0, tilt: 0, lift: 20, bend: -0.05 }, 0, 0),
                kf(R, 'easeOut', { lArm: 2.2, rArm: 2.2, lElbow: 0.5, rElbow: 0.5, lLeg: 0.15, rLeg: -0.05, lKnee: 0.25, rKnee: 0.25, lean: 0.05, crouch: 0.25, tilt: 0, lift: 0, bend: 0.20 }, 0, 0),
                kf(P, 'easeInOut', { lArm: 1.6, rArm: 1.6, lElbow: 0.6, rElbow: 0.6, lLeg: 0.7, rLeg: -0.9, lKnee: 0.2, rKnee: 1.4, lean: 0.20, crouch: 0.60, tilt: 0, lift: 0, bend: 0.55 }, 12, 0),
                kf(I, 'easeOut', { lArm: 0.9, rArm: 0.9, lElbow: 0.5, rElbow: 0.5, lLeg: 0.7, rLeg: -0.9, lKnee: 0.2, rKnee: 1.4, lean: 0.15, crouch: 0.60, tilt: 0, lift: 0, bend: 0.50 }, 14, 0),
                // The head grip let go in the flip: the arms follow through and are at his sides by the time he rises (T4c.4b-4, 0.2 s).
                kf(I + 0.20, 'easeInOut', { lArm: 0.10, rArm: 0.20, lElbow: 0.6, rElbow: 0.6, lLeg: 0.35, rLeg: -0.4, lKnee: 0.22, rKnee: 0.8, lean: 0.10, crouch: 0.30, tilt: 0, lift: 0, bend: 0.25 }, 14, 0),
                kf(D, 'easeInOut', { lArm: 0.04, rArm: 0.17, lElbow: 0.7, rElbow: 0.7, lLeg: -0.04, rLeg: 0.16, lKnee: 0.22, rKnee: 0.22, lean: 0.05, crouch: 0.05, tilt: 0, lift: 0, bend: 0 }, 10, 0),
            ],
        },
        // The man thrown: held at the thrower's waist, his head taken, pulled off his feet and over, flat on his back.
        defender: {
            keyframes: [
                kf(0, 'linear', { lArm: 0.9, rArm: 0.9, lElbow: 0.5, rElbow: 0.5, lLeg: -0.05, rLeg: 0.10, lKnee: 0.1, rKnee: 0.1, lean: -0.05, crouch: 0.30, tilt: 0, lift: 0, bend: 0.50 }, -GAP, -U),
                kf(R, 'easeOut', { lArm: 0.9, rArm: 0.9, lElbow: 0.5, rElbow: 0.5, lLeg: -0.15, rLeg: 0.05, lKnee: 0.1, rKnee: 0.1, lean: 0, crouch: 0.35, tilt: 0, lift: 0, bend: 0.75 }, -GAP, -U),
                // Bring his head down with the kneeling thrower; arm IK alone
                // cannot keep the far hand attached to a head left standing.
                kf(P, 'easeIn', { lArm: 1.3, rArm: 1.3, lElbow: 0.4, rElbow: 0.4, lLeg: 0.1, rLeg: 0.2, lKnee: 0.3, rKnee: 0.3, lean: 0, crouch: 0.50, tilt: PULL_TILT, lift: 0, bend: 0.90 }, -34, -U),
                ...flipFrames,
                kf(I, 'linear', landed, SNAPMARE.landFwd, 0),
                kf(D, 'easeOut', { ...landed, lArm: 0.05, rArm: 0.08, lElbow: 0.1, rElbow: 0.1, lLeg: 0.06, rLeg: 0.22, lKnee: 0.1, rKnee: 0.4, bend: 0 }, SNAPMARE.landFwd, 0),
            ],
        },
    },
    // A5: the thrown man behind the thrower until the flip is over his head, in front of him after; through the pull the thrower's arms are in front of his own head.
    layers: [
        { from: 0, to: P + 0.5 * (I - P), order: [['defender', 'lLeg'], ['defender', 'rLeg'], ['defender', 'torso'], ['defender', 'head'], ['defender', 'lArm'], ['defender', 'rArm'], ['attacker', 'lLeg'], ['attacker', 'rLeg'], ['attacker', 'torso'], ['attacker', 'head'], ['attacker', 'lArm'], ['attacker', 'rArm']] },
        { from: P + 0.5 * (I - P), to: D, order: [['attacker', 'lLeg'], ['attacker', 'rLeg'], ['attacker', 'torso'], ['attacker', 'head'], ['attacker', 'lArm'], ['attacker', 'rArm'], ['defender', 'lLeg'], ['defender', 'rLeg'], ['defender', 'torso'], ['defender', 'head'], ['defender', 'lArm'], ['defender', 'rArm']] },
    ],
    events: [{ at: I, type: 'impact' }],
};
