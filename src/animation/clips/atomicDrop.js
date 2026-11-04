// The atomic drop out of the waistlock (PLAN_GRAPPLES Stage 4c A2, T4c.4f), hand-posed for ?waistlock=v1 (not from a sheet, so no author_*.mjs). Both men
// face the same way, the attacker behind. Beats on waistlockThrows.js ATOMIC: wrap and lift 0..0.42 (a fridge lift: the attacker locks his arms round the
// waist, sits into a squat, stands and leans back with the man pressed to his chest), a hitch at the top, drop to 0.60 (`impact`: the pelvis meets the knee),
// sell to 1.10. Transform x/y are the clip tableau's: rig units from the attacker's place at play(), x along the shared facing, y world down
// (negative upstage). The defender enters where the hold left him, WAISTLOCK.holdBehind ahead of the attacker and `upstage` nearer the camera.
// KNEES: on the upright path a NEGATIVE lKnee/rKnee folds the heel back (a positive one swings the shin forward, a knee bent backward); see the note at
// the top of clips/index.js and tools/debug/clip_knee_audit.mjs.
import { WAISTLOCK } from '../waistlock.js';
import { ATOMIC } from '../waistlockThrows.js';

const kf = (at, ease, pose, x = 0, y = 0) => ({ at, ease, pose, transform: { x, y }, parts: {} });
const H = WAISTLOCK.holdBehind, U = WAISTLOCK.upstage;
const W = 0.14;                                        // the wrap is done as the Stage 3 lead-in ends
const L = ATOMIC.lift, T = L + ATOMIC.hitch, I = ATOMIC.impact, D = ATOMIC.duration;
const ARMS = { lArm: 0.95, rArm: 0.95, lElbow: 0.8, rElbow: 0.8 };   // locked round the waist: the same through the lift, the back does the work

export const atomicDropClip = {
    id: 'atomicDrop',
    duration: D,
    tracks: {
        // The man behind: from the A-frame he steps in and wraps, sits into a squat, stands and leans back with the man on his chest, then the near knee comes up.
        attacker: {
            keyframes: [
                kf(0, 'linear', { lArm: 0.7, rArm: 0.7, lElbow: 0.5, rElbow: 0.5, lLeg: -0.25, rLeg: 0.05, lKnee: -0.2, rKnee: -0.2, lean: 0, crouch: 0.40, tilt: 0, lift: 0, bend: 0.75 }, 0, 0),
                kf(W, 'easeOut', { ...ARMS, lLeg: -0.20, rLeg: 0.05, lKnee: -1.1, rKnee: -1.1, lean: 0, crouch: 1.0, tilt: 0, lift: 0, bend: 0.35 }, 22, 0),
                kf(L, 'easeInOut', { ...ARMS, lLeg: -0.05, rLeg: 0.10, lKnee: -0.1, rKnee: -0.1, lean: 0, crouch: 0.0, tilt: 0, lift: 0, bend: -0.55 }, 34, 0),
                kf(T, 'linear', { ...ARMS, lLeg: -0.05, rLeg: 0.10, lKnee: -0.1, rKnee: -0.1, lean: 0, crouch: 0.0, tilt: 0, lift: 0, bend: -0.60 }, 34, 0),
                kf(I, 'easeIn', { lArm: 0.8, rArm: 0.8, lElbow: 0.5, rElbow: 0.5, lLeg: 1.40, rLeg: -0.05, lKnee: -0.9, rKnee: -0.1, lean: 0.10, crouch: 0.15, tilt: 0, lift: 0, bend: 0.15 }, 34, 0),
                kf(D, 'easeInOut', { lArm: 0.04, rArm: 0.17, lElbow: 0.7, rElbow: 0.7, lLeg: -0.04, rLeg: 0.16, lKnee: -0.22, rKnee: -0.22, lean: 0.05, crouch: 0.05, tilt: 0, lift: 0, bend: 0 }, 18, 0),
            ],
        },
        // The man in front: held at the waist, lifted with his back to the chest and his legs kicking up, dropped seated, then popped forward onto his feet.
        defender: {
            keyframes: [
                kf(0, 'linear', { lArm: 0.15, rArm: 0.15, lElbow: 0.6, rElbow: 0.6, lLeg: -0.10, rLeg: 0.10, lKnee: -0.1, rKnee: -0.1, lean: 0, crouch: 0.12, tilt: 0, lift: 0, bend: 0.10 }, H, U),
                kf(W, 'easeOut', { lArm: 0.25, rArm: 0.25, lElbow: 0.7, rElbow: 0.7, lLeg: -0.10, rLeg: 0.10, lKnee: -0.1, rKnee: -0.1, lean: 0, crouch: 0.12, tilt: 0, lift: 0, bend: 0.12 }, H - 14, U),
                kf(L, 'easeInOut', { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: 0.60, rLeg: 0.50, lKnee: -0.55, rKnee: -0.45, lean: 0, crouch: 0, tilt: -0.5, lift: 0, bend: 0 }, H - 14, U),
                kf(T, 'linear', { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: 0.65, rLeg: 0.55, lKnee: -0.55, rKnee: -0.45, lean: 0, crouch: 0, tilt: -0.65, lift: 0, bend: 0 }, H - 14, U),
                kf(I, 'easeIn', { lArm: 0.3, rArm: 0.2, lElbow: 0.6, rElbow: 0.6, lLeg: 0.70, rLeg: 0.55, lKnee: -0.6, rKnee: -0.6, lean: 0, crouch: 0.20, tilt: 0.25, lift: 22, bend: 0.25 }, H - 5, U),
                kf(I + 0.10, 'easeOut', { lArm: -0.9, rArm: -0.8, lElbow: 0.3, rElbow: 0.3, lLeg: 0.30, rLeg: 0.15, lKnee: -0.4, rKnee: -0.3, lean: 0.12, crouch: 0.18, tilt: 0, lift: 0, bend: 0.28 }, H + 12, U),
                kf(I + 0.26, 'easeInOut', { lArm: -0.8, rArm: -0.7, lElbow: 0.3, rElbow: 0.3, lLeg: 0.20, rLeg: -0.08, lKnee: -0.3, rKnee: -0.2, lean: 0.10, crouch: 0.10, tilt: 0, lift: 0, bend: 0.22 }, H + 28, U),
                kf(D, 'easeInOut', { lArm: -0.3, rArm: -0.2, lElbow: 0.5, rElbow: 0.5, lLeg: -0.04, rLeg: 0.16, lKnee: -0.22, rKnee: -0.22, lean: 0.06, crouch: 0.05, tilt: 0, lift: 0, bend: 0.10 }, H + ATOMIC.stumbleFwd, U),
            ],
        },
    },
    // T4c.4g: from the end of the wrap to the end of the hitch the defender rides the attacker's torso, his torso leaning back 1.3x as far as Lou's: the rise comes
    // from the attacker's knees, hips and lean, an arc, not from the defender's own `lift` track (which stays 0 here). The window blends out into the drop's keys.
    carry: [{ role: 'defender', on: 'attacker', tilt: 1.3, in: [W, W + 0.04], out: [T, T + 0.10] }],
    grips: [
        { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [0, 0.02], out: [T, T + 0.06] },
        { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [0, 0.02], out: [T, T + 0.06] },
    ],
    events: [{ at: I, type: 'impact' }],
};
