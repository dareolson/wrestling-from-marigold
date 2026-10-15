// Knee drop hop — the airborne 230 ms between the set and the landing. The
// legacy hop drew primitives; this poses the rig through the same knee-drop
// poses the wind-up and landing already use (POSES.kneeDropLeap → kneeDropTuck;
// tests/referenceThrows.test.js holds these values equal to POSES) and lifts
// it 38 rig units at the top, the old hop height. A one-wrestler clip: the
// executor moves him beside the target, as before.
const leap = { lLeg: 0.72, rLeg: 0.18, lArm: -0.40, rArm: 0.52, lean: -0.08, crouch: 0.16 };
const tuck = { lLeg: 1.38, rLeg: 0.50, lArm: 0.30, rArm: 0.65, lean: 0.28, crouch: 0.50 };

export const KNEE_DROP_HOP = Object.freeze({ leap, tuck });

export const kneeDropClip = {
    id: 'kneeDrop',
    duration: 0.23,
    tracks: {
        attacker: {
            keyframes: [
                { at: 0,    pose: { ...leap, tilt: 0, lift: 0 } },
                { at: 0.10, ease: 'easeOut', pose: { ...leap, tilt: 0, lift: 34 } },
                { at: 0.14, pose: { ...tuck, tilt: 0, lift: 38 } },
                { at: 0.23, ease: 'easeIn', pose: { ...tuck, tilt: 0, lift: 0 } },
            ],
        },
    },
    events: [{ at: 0.23, type: 'impact' }],
};
