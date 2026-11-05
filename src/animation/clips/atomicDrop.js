// The atomic drop out of the waistlock (PLAN_GRAPPLES Stage 4c A2, T4c.4f), hand-posed for ?waistlock=v1 (not from a sheet, so no author_*.mjs). Both men
// face the same way, the attacker behind. Beats on waistlockThrows.js ATOMIC: wrap and lift 0..0.42 (a fridge lift: the attacker locks his arms round the
// waist, sits into a squat, stands and leans back with the man pressed to his chest), a 0.24 s hitch at the top, drop to 0.73 (`impact`: the pelvis meets the knee),
// sell to 1.28. Transform x/y are the clip tableau's: rig units from the attacker's place at play(), x along the shared facing, y world down
// (negative upstage). The defender enters where the hold left him, WAISTLOCK.holdBehind ahead of the attacker and `upstage` nearer the camera.
// KNEES: the clamp at JOINT_LIMITS.knee.min (-0.10) eats a local-flex lKnee/rKnee fold, so this clip owns each shin as the absolute lShin/rShin. Keys are
// written `lFold`/`rFold` (heel fold in radians, > 0 = heel toward the back of the thigh) and kf() turns them into shins with foldShin (rig/articulation.js).
import { shinsFromFolds } from '../../rig/articulation.js';
import { WAISTLOCK } from '../waistlock.js';
import { ATOMIC } from '../waistlockThrows.js';

const kf = (at, ease, pose, x = 0, y = 0) => ({ at, ease, pose: shinsFromFolds(pose), transform: { x, y }, parts: {} });
const H = WAISTLOCK.holdBehind, U = WAISTLOCK.upstage;
const HITCH = ATOMIC.chamber === 'hitch', CH = 0.14, HLIFT = 13;   // HLIFT: the hitch variant's `lift` over the chamber, tuned so the carried man's pelvis drop is least over both rigs (measured at T4c.4m: it still failed support, see the Codex chamber review)
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
                kf(0, 'linear', { lArm: 0.7, rArm: 0.7, lElbow: 0.5, rElbow: 0.5, lLeg: -0.25, rLeg: 0.05, lFold: 0.2, rFold: 0.2, lean: 0, crouch: 0.40, tilt: 0, lift: 0, bend: 0.75 }, 0, 0),
                kf(W, 'easeOut', { ...ARMS, lLeg: -0.20, rLeg: 0.05, lFold: 1.1, rFold: 1.1, lean: 0, crouch: 1.0, tilt: 0, lift: 0, bend: 0.35 }, 22, 0),
                // T4c.4m: ATOMIC.chamber 'hitch' keeps r5's legs at the top of the lift and chambers the thigh over the first CH s of the hitch. Both feet down is the intent, not what was measured: the near sole left the mat 16.1 px before L and the support sole moved 19.5 px (a failed experiment, 'lift' is the default)
                kf(L, 'easeInOut', { ...ARMS, lLeg: HITCH ? 0.45 : 1.25, rLeg: 0.10, lFold: HITCH ? 0.45 : 1.0, rFold: 0.1, lean: 0, crouch: 0.0, tilt: 0, lift: 8, bend: -0.60 }, 34, 0),
                ...(HITCH ? [kf(L + CH, 'easeOut', { ...ARMS, lLeg: 1.25, rLeg: 0.10, lFold: 1.0, rFold: 0.1, lean: 0, crouch: 0.0, tilt: 0, lift: HLIFT, bend: -0.60 }, 34, 0)] : []),
                kf(T, 'easeOut', { ...ARMS, lLeg: 1.25, rLeg: 0.10, lFold: 1.0, rFold: 0.1, lean: 0, crouch: 0.0, tilt: 0, lift: HITCH ? HLIFT : 8, bend: -0.60 }, 34, 0),
                kf(I, 'easeIn', { lArm: 0.8, rArm: 0.8, lElbow: 0.5, rElbow: 0.5, lLeg: 1.35, rLeg: -0.05, lFold: 1.2, rFold: 0.1, lean: 0.10, crouch: 0.15, tilt: 0, lift: 8, bend: 0.15 }, 34, 0),
                // the support leg gives 3-5 px as the weight lands; the knee holds until the recoil has started, then drops away (T4c.4j)
                kf(I + 0.04, 'easeOut', { lArm: 0.8, rArm: 0.8, lElbow: 0.5, rElbow: 0.5, lLeg: 1.35, rLeg: -0.05, lFold: 1.2, rFold: 0.1, lean: 0.10, crouch: 0.19, tilt: 0, lift: 8, bend: 0.15 }, 34, 0),
                kf(I + 0.14, 'easeInOut', { lArm: 0.8, rArm: 0.8, lElbow: 0.5, rElbow: 0.5, lLeg: 1.35, rLeg: -0.05, lFold: 1.2, rFold: 0.1, lean: 0.10, crouch: 0.17, tilt: 0, lift: 8, bend: 0.15 }, 34, 0),
                kf(D, 'easeInOut', { lArm: 0.04, rArm: 0.17, lElbow: 0.7, rElbow: 0.7, lLeg: -0.04, rLeg: 0.16, lFold: 0.22, rFold: 0.22, lean: 0.05, crouch: 0.05, tilt: 0, lift: 0, bend: 0 }, 18, 0),
            ],
        },
        // The man in front: held at the waist, lifted with his back to the chest and his legs kicking up, dropped seated, then popped forward onto his feet.
        defender: {
            keyframes: [
                kf(0, 'linear', { lArm: 0.15, rArm: 0.15, lElbow: 0.6, rElbow: 0.6, lLeg: -0.10, rLeg: 0.10, lFold: 0.1, rFold: 0.1, lean: 0, crouch: 0.12, tilt: 0, lift: 0, bend: 0.10 }, H, U),
                kf(W, 'easeOut', { lArm: 0.25, rArm: 0.25, lElbow: 0.7, rElbow: 0.7, lLeg: -0.10, rLeg: 0.10, lFold: 0.1, rFold: 0.1, lean: 0, crouch: 0.12, tilt: 0, lift: 0, bend: 0.12 }, H - 14, U),
                kf(L, 'easeInOut', { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: 0.65, rLeg: 0.55, lFold: 0.55, rFold: 0.45, lean: 0, crouch: 0, tilt: -0.65, lift: 0, bend: 0 }, H - 14, U),
                kf(T, 'linear', { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: 0.65, rLeg: 0.55, lFold: 0.55, rFold: 0.45, lean: 0, crouch: 0, tilt: -0.65, lift: 0, bend: 0 }, H - 14, U),
                kf(I, 'easeIn', { lArm: 0.3, rArm: 0.2, lElbow: 0.6, rElbow: 0.6, lLeg: 0.70, rLeg: 0.55, lFold: 0.95, rFold: 0.90, lean: 0, crouch: 0.20, tilt: 0.25, lift: 22, bend: 0.25 }, H - 5, U),
                // T4c.4j: impact, then compression (hips and torso fold onto the knee, the arms lag a frame behind), then the recoil (arch, pops forward, hands to his backside).
                kf(I + 0.04, 'easeOut', { lArm: 0.3, rArm: 0.2, lElbow: 0.6, rElbow: 0.6, lLeg: 0.72, rLeg: 0.55, lFold: 1.15, rFold: 1.05, lean: 0, crouch: 0.38, tilt: 0.30, lift: 0, bend: 0.50 }, H - 5, U),
                kf(I + 0.12, 'easeOut', { lArm: -0.9, rArm: -0.8, lElbow: 0.3, rElbow: 0.3, lLeg: 0.30, rLeg: 0.15, lFold: 0.4, rFold: 0.3, lean: 0.12, crouch: 0.18, tilt: 0, lift: 0, bend: -0.12 }, H + 12, U),
                kf(I + 0.26, 'easeInOut', { lArm: -0.8, rArm: -0.7, lElbow: 0.3, rElbow: 0.3, lLeg: 0.20, rLeg: -0.08, lFold: 0.3, rFold: 0.2, lean: 0.10, crouch: 0.10, tilt: 0, lift: 0, bend: 0.22 }, H + 28, U),
                kf(D, 'easeInOut', { lArm: -0.3, rArm: -0.2, lElbow: 0.5, rElbow: 0.5, lLeg: -0.04, rLeg: 0.16, lFold: 0.22, rFold: 0.22, lean: 0.06, crouch: 0.05, tilt: 0, lift: 0, bend: 0.10 }, H + ATOMIC.stumbleFwd, U),
            ],
        },
    },
    // From the wrap to the hitch he rides the torso and slides higher along it
    // during the lift (Derek 2026-11-04), then holds the peak. His torso leans back 1.3x as far as Lou's: the rise comes
    // from the attacker's knees, hips and lean, an arc, not from the defender's own `lift` track (which stays 0 here). The window blends out into the drop's keys.
    carry: [
        { role: 'defender', on: 'attacker', tilt: 1.3, slide: { along: 36, in: [W, L] }, in: [W, W + 0.04], out: [T, T + 0.10] },
        // T4c.4j: over the drop the torso carry hands him to the attacker's raised thigh, so his pelvis is one curve (up and back, then forward and down onto the knee); the knee stays under him past
        // the impact and he lets go of it as the recoil starts.
        { role: 'defender', on: 'attacker', frame: 'thigh', leg: 'l', in: [T, I], out: [I + 0.10, I + 0.22] },
    ],
    // T4c.4j: the attacker's support (r) foot holds the mat from the wrap to the catch, released over 0.10 s once the weight has gone.
    // Only the support (r) leg is anchored. Under 'hitch' the near (l) foot was meant to stay down until L, but nothing plants it, and the body solve moved it (measured, T4c.4m).
    plants: [{ role: 'attacker', leg: 'r', in: [W, W + 0.04], out: [I + 0.20, I + 0.30] }],
    grips: [
        { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [0, 0.02], out: [T, T + 0.06] },
        { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [0, 0.02], out: [T, T + 0.06] },
    ],
    events: [{ at: I, type: 'impact' }],
};
