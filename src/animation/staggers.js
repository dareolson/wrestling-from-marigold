// Stagger types (Derek, 2026-10-21): "several types that get progressively worse".
// Each is a different MOVEMENT, not the same wobble made longer. Data only;
// Wrestler.startStagger picks one by stamina and plays it.
//
// A step is { pose, dur, e, dx }:
//   pose  a pose object (POSES channels; `bend` is the torso, + pitches forward
//         toward facing, - throws the chest back; `lean` renders nothing)
//   dur   milliseconds
//   dx    world px the body travels BACKWARD (away from facing) during the step,
//         scaled by the wrestler's own scale and held inside the ropes. Legs swing
//         on the same step so the feet read as stepping, not sliding.
//
// The progression:
//   rock        one snap back and a half step; he's rattled, nothing more
//   stumble     chest reels back, over-corrects, two corrective steps
//   reel        rubber-legged: folds and flings back by turns, three lurching steps
//   buckle      the knees give, he hauls himself up, they give again
//   outOnFeet   barely upright: deep sag, slow sway, one more blow and he's down
//
// `minStamina` is exclusive: a type applies while stamina is above it, tested in order.

const arms = (l, r) => ({ lArm: l, rArm: r });
const step = (pose, dur, e = 'Sine.easeInOut', dx = 0) => ({ pose, dur, e, dx });

export const STAGGER_TYPES = Object.freeze([
    {
        id: 'rock', minStamina: 65, seconds: 0.85,
        steps: [
            step({ ...arms(0.35, 0.2), lLeg: -0.1, rLeg: 0.12, crouch: 0.04, bend: -0.2 }, 110, 'Cubic.easeOut', 6),
            step({ ...arms(0.2, 0.15), lLeg: 0.08, rLeg: -0.06, crouch: 0.1, bend: 0.06 }, 150, 'Sine.easeInOut', 5),
            step({ ...arms(0, 0), lLeg: -0.04, rLeg: 0.16, crouch: 0, bend: 0 }, 260, 'Linear', 0),
        ],
    },
    {
        id: 'stumble', minStamina: 45, seconds: 1.35,
        steps: [
            step({ ...arms(0.7, 0.55), lLeg: -0.2, rLeg: 0.26, crouch: 0.08, bend: -0.27 }, 130, 'Cubic.easeOut', 14),
            step({ ...arms(0.4, 0.9), lLeg: 0.18, rLeg: -0.18, crouch: 0.14, bend: 0.12 }, 150, 'Sine.easeInOut', 10),
            step({ ...arms(0.9, 0.6), lLeg: -0.14, rLeg: 0.2, crouch: 0.1, bend: -0.15 }, 140, 'Sine.easeInOut', 10),
            step({ ...arms(0.3, 0.3), lLeg: 0.06, rLeg: -0.04, crouch: 0.12, bend: 0.05 }, 200, 'Sine.easeInOut', 0),
            step({ ...arms(0, 0), lLeg: -0.04, rLeg: 0.16, crouch: 0, bend: 0 }, 250, 'Linear', 0),
        ],
    },
    {
        id: 'reel', minStamina: 28, seconds: 1.9,
        steps: [
            step({ ...arms(1.1, 0.9), lLeg: -0.34, rLeg: 0.34, crouch: 0.12, bend: -0.36 }, 140, 'Cubic.easeOut', 20),
            step({ ...arms(0.15, 0.05), lLeg: 0.26, rLeg: -0.24, crouch: 0.3, bend: 0.44 }, 190, 'Sine.easeInOut', 12),
            step({ ...arms(1.0, 0.6), lLeg: -0.32, rLeg: 0.3, crouch: 0.22, bend: -0.3 }, 170, 'Sine.easeInOut', 16),
            step({ ...arms(0.05, 0.25), lLeg: 0.24, rLeg: -0.24, crouch: 0.34, bend: 0.4 }, 180, 'Sine.easeInOut', 10),
            step({ ...arms(0.5, 0.4), lLeg: 0.04, rLeg: 0.04, crouch: 0.22, bend: 0.02 }, 220, 'Sine.easeInOut', 0),
            step({ ...arms(0, 0), lLeg: -0.04, rLeg: 0.16, crouch: 0, bend: 0 }, 330, 'Linear', 0),
        ],
    },
    {
        id: 'buckle', minStamina: 12, seconds: 2.4,
        steps: [
            step({ ...arms(1.0, 0.9), lLeg: -0.34, rLeg: 0.3, crouch: 0.1, bend: -0.32 }, 150, 'Cubic.easeOut', 14),
            step({ ...arms(0.15, 0.1), lLeg: 0.35, rLeg: -0.3, crouch: 0.5, bend: 0.42 }, 220, 'Cubic.easeIn', 6),
            step({ ...arms(0.6, 0.7), lLeg: 0.1, rLeg: -0.06, crouch: 0.22, bend: 0.12 }, 260, 'Cubic.easeOut', 0),
            step({ ...arms(0.1, 0.0), lLeg: 0.34, rLeg: -0.3, crouch: 0.6, bend: 0.46 }, 230, 'Cubic.easeIn', 6),
            step({ ...arms(0.9, 0.6), lLeg: -0.2, rLeg: 0.22, crouch: 0.35, bend: -0.2 }, 220, 'Sine.easeInOut', 8),
            step({ ...arms(0.4, 0.4), lLeg: 0.06, rLeg: 0.02, crouch: 0.2, bend: 0.1 }, 260, 'Sine.easeInOut', 0),
            step({ ...arms(0, 0), lLeg: -0.04, rLeg: 0.16, crouch: 0, bend: 0 }, 400, 'Linear', 0),
        ],
    },
    {
        id: 'outOnFeet', minStamina: -Infinity, seconds: 3.0,
        steps: [
            step({ ...arms(1.2, 1.0), lLeg: -0.4, rLeg: 0.36, crouch: 0.12, bend: -0.34 }, 170, 'Cubic.easeOut', 16),
            step({ ...arms(0, 0.05), lLeg: 0.4, rLeg: -0.34, crouch: 0.62, bend: 0.5 }, 260, 'Cubic.easeIn', 6),
            step({ ...arms(0.6, 0.3), lLeg: -0.1, rLeg: 0.12, crouch: 0.45, bend: -0.25 }, 280, 'Sine.easeInOut', 4),
            step({ ...arms(0, 0), lLeg: 0.38, rLeg: -0.32, crouch: 0.7, bend: 0.52 }, 290, 'Cubic.easeIn', 4),
            step({ ...arms(0.5, 0.5), lLeg: 0.0, rLeg: 0.08, crouch: 0.35, bend: -0.1 }, 260, 'Sine.easeInOut', 0),
            step({ ...arms(0, 0.05), lLeg: 0.36, rLeg: -0.3, crouch: 0.62, bend: 0.46 }, 270, 'Cubic.easeIn', 0),
            step({ ...arms(0.3, 0.2), lLeg: 0.1, rLeg: 0.0, crouch: 0.5, bend: 0.15 }, 280, 'Sine.easeInOut', 0),
            step({ ...arms(0, 0), lLeg: -0.04, rLeg: 0.16, crouch: 0, bend: 0 }, 450, 'Linear', 0),
        ],
    },
]);

// The type for a wrestler this hurt.
export function staggerFor(stamina) {
    return STAGGER_TYPES.find(t => stamina > t.minStamina) ?? STAGGER_TYPES[STAGGER_TYPES.length - 1];
}

export const stepMs = type => type.steps.reduce((ms, s) => ms + s.dur, 0);
