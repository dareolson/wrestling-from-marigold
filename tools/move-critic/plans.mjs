// Refinement plans for the pilot moves: what refine.mjs is allowed to change.
// Each op is a fix for a finding in the baseline critique, with the reason.
export const PLANS = {
    jab: {
        ops: [
            // The fist reaches full extension on the impact frame but at chest
            // height; the game plays a head sell. Aim it at George's face.
            { op: 'reach', role: 'attacker', limb: 'nearWrist', target: { part: 'head' }, offset: { x: -14, y: 6 },
                from: 0.075, to: 0.092, ramp: 0.05, why: 'jab lands on the chest; the sell is sellHead' },
            // The lead foot's slide is a boxer's push-step (intended); only
            // the rear foot is held.
            { op: 'reach', role: 'attacker', limb: 'farAnkle', target: { plant: true }, from: 0, to: 0.4, ramp: 0.01, why: 'far foot holds still' },
        ],
    },
    dropkick: {
        ops: [
            // Feet go through George's chest; stop the travel at his front edge.
            { op: 'stopAt', role: 'attacker', at: 0.36, limbs: ['nearAnkle', 'farAnkle'], parts: ['torso', 'trunks'], why: 'feet pass through the chest' },
        ],
    },
    suplex: {
        ops: [
            // Lou's feet stay planted through the lift.
            { op: 'reach', role: 'attacker', limb: 'nearAnkle', target: { plant: true }, from: 0, to: 0.95, ramp: 0.12 },
            { op: 'reach', role: 'attacker', limb: 'farAnkle', target: { plant: true }, from: 0, to: 0.95, ramp: 0.12 },
            // The grip: near hand behind George's neck, far hand at his waist.
            { op: 'reach', role: 'attacker', limb: 'nearWrist', target: { joint: 'neck' }, from: 0.2, to: 1.0, ramp: 0.1 },
            { op: 'reach', role: 'attacker', limb: 'farWrist', target: { joint: 'nearHip' }, from: 0.2, to: 1.0, ramp: 0.1 },
            // George lands on top of Lou; land him beyond Lou's head.
            { op: 'shift', role: 'defender', dx: -45, from: 1.25, to: 1.6, ramp: 0.15 },
        ],
    },
    hammerlock: {
        ops: [
            // Derek's declared grip: Lou's near hand on George's near wrist.
            { op: 'reach', role: 'attacker', limb: 'nearWrist', target: { joint: 'nearWrist' }, from: 0.55, to: 2.1, ramp: 0.12 },
            // Both men's feet planted through the hold.
            { op: 'reach', role: 'defender', limb: 'nearAnkle', target: { plant: true }, from: 0.4, to: 2.1, ramp: 0.1 },
            { op: 'reach', role: 'defender', limb: 'farAnkle', target: { plant: true }, from: 0.4, to: 2.1, ramp: 0.1 },
            { op: 'reach', role: 'attacker', limb: 'nearAnkle', target: { plant: true }, from: 0.4, to: 2.1, ramp: 0.1 },
            { op: 'reach', role: 'attacker', limb: 'farAnkle', target: { plant: true }, from: 0.4, to: 2.1, ramp: 0.1 },
        ],
    },
};
PLANS['hammerlock-derek-wip'] = PLANS.hammerlock;
