// The atomic drop out of the waistlock (PLAN_GRAPPLES Stage 4c A2), hand-posed for ?waistlock=v1 (not from a sheet, so no author_*.mjs). Both men
// face the same way, the attacker behind. Beats on waistlockThrows.js ATOMIC: lift 0..0.30, drop to 0.42 (`impact`: the pelvis meets the knee),
// sell to 0.92. Transform x/y are the clip tableau's: rig units from the attacker's place at play(), x along the shared facing, y world down
// (negative upstage). The defender enters where the hold left him, WAISTLOCK.holdBehind ahead of the attacker and `upstage` nearer the camera.
import { WAISTLOCK } from '../waistlock.js';
import { ATOMIC } from '../waistlockThrows.js';

const kf = (at, ease, pose, x = 0, y = 0) => ({ at, ease, pose, transform: { x, y }, parts: {} });
const H = WAISTLOCK.holdBehind, U = WAISTLOCK.upstage;
const L = ATOMIC.lift, I = ATOMIC.impact, D = ATOMIC.duration;

export const atomicDropClip = {
    id: 'atomicDrop',
    duration: D,
    tracks: {
        // The man behind: from the A-frame he straightens and lifts, the near knee comes up under the drop, then he rocks back to stand.
        attacker: {
            keyframes: [
                kf(0, 'linear', { lArm: 0.7, rArm: 0.7, lElbow: 0.5, rElbow: 0.5, lLeg: -0.25, rLeg: 0.05, lean: 0, crouch: 0.40, tilt: 0, lift: 0, bend: 0.75 }, 0, 0),
                kf(L, 'easeOut', { lArm: 1.0, rArm: 1.0, lElbow: 0.5, rElbow: 0.5, lLeg: -0.05, rLeg: 0.10, lean: -0.10, crouch: 0.05, tilt: 0, lift: 0, bend: 0.05 }, 28, 0),
                kf(I, 'easeIn', { lArm: 0.8, rArm: 0.8, lElbow: 0.5, rElbow: 0.5, lLeg: 1.40, rLeg: -0.05, lean: 0.10, crouch: 0.15, tilt: 0, lift: 0, bend: 0.15 }, 28, 0),
                kf(D, 'easeInOut', { lArm: 0.04, rArm: 0.17, lElbow: 0.7, rElbow: 0.7, lLeg: -0.04, rLeg: 0.16, lean: 0.05, crouch: 0.05, tilt: 0, lift: 0, bend: 0 }, 12, 0),
            ],
        },
        // The man in front: held at the waist, lifted with his legs hanging, dropped seated, then popped forward onto his feet.
        defender: {
            keyframes: [
                kf(0, 'linear', { lArm: 0.15, rArm: 0.15, lElbow: 0.6, rElbow: 0.6, lLeg: -0.10, rLeg: 0.10, lKnee: 0.1, rKnee: 0.1, lean: 0, crouch: 0.12, tilt: 0, lift: 0, bend: 0.10 }, H, U),
                kf(L, 'easeOut', { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: 0.12, rLeg: 0.22, lKnee: 0.35, rKnee: 0.30, lean: -0.08, crouch: 0, tilt: 0, lift: 55, bend: -0.05 }, H, U),
                kf(I, 'easeIn', { lArm: 0.3, rArm: 0.2, lElbow: 0.6, rElbow: 0.6, lLeg: 0.70, rLeg: 0.55, lKnee: 0.6, rKnee: 0.6, lean: 0, crouch: 0.20, tilt: 0, lift: 22, bend: 0.25 }, H - 5, U),
                kf(I + 0.10, 'easeOut', { lArm: -0.9, rArm: -0.8, lElbow: 0.3, rElbow: 0.3, lLeg: 0.30, rLeg: 0.15, lKnee: 0.4, rKnee: 0.3, lean: 0.12, crouch: 0.18, tilt: 0, lift: 0, bend: 0.28 }, H + 12, U),
                kf(I + 0.26, 'easeInOut', { lArm: -0.8, rArm: -0.7, lElbow: 0.3, rElbow: 0.3, lLeg: 0.20, rLeg: -0.08, lKnee: 0.3, rKnee: 0.2, lean: 0.10, crouch: 0.10, tilt: 0, lift: 0, bend: 0.22 }, H + 28, U),
                kf(D, 'easeInOut', { lArm: -0.3, rArm: -0.2, lElbow: 0.5, rElbow: 0.5, lLeg: -0.04, rLeg: 0.16, lKnee: 0.22, rKnee: 0.22, lean: 0.06, crouch: 0.05, tilt: 0, lift: 0, bend: 0.10 }, H + ATOMIC.stumbleFwd, U),
            ],
        },
    },
    grips: [
        { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [0, 0.02], out: [L, L + 0.06] },
        { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [0, 0.02], out: [L, L + 0.06] },
    ],
    events: [{ at: I, type: 'impact' }],
};
