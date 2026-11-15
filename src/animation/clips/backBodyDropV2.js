// PLAN_LIGHT_MOVES T6.2 (?light=v1): the back body drop on a returning runner as a paired clip (the old one tweens the runner to the attacker's centerline
// and plays the clothesline fall). The runner keeps his speed into the contact (x falls at RUN_SPEED to the attacker, no stop), the attacker ducks low with his
// head down as he arrives and stands up into him; the runner's hips go up and over, he turns through the vertical and lands flat on his back behind the
// attacker, head toward where he came from (the old fall's lie). `distance`: runner to attacker when the answer is pressed, in the attacker's units.
// D3: both men own their shins (shinsFromFolds).
import { shinsFromFolds } from '../../rig/articulation.js';

export const RUN_SPEED_UNITS = 340;      // Wrestler RUN_SPEED in the attacker's units (306 px/s at scale 0.9, measured by tools/debug/runner_measure.mjs)
export const BBD_IMPACT_AFTER = 0.3;     // seconds after the contact the runner is over the attacker's back and starts down
const own = p => shinsFromFolds(p);

const stand = { lArm: 0.04, rArm: 0.17, lElbow: 0.7, rElbow: 0.7, lLeg: -0.1, rLeg: 0.2, lFold: 0.22, rFold: 0.22, lean: 0, crouch: 0.05, tilt: 0, lift: 0, bend: 0 };
const runA = { ...stand, tilt: 0, lLeg: 0.55, rLeg: -0.45, lFold: 0.9, rFold: 0.2, lArm: -0.5, rArm: 0.6, lElbow: 1.0, rElbow: 0.9, bend: 0.1 };
const runB = { ...runA, lLeg: -0.45, rLeg: 0.55, lFold: 0.2, rFold: 0.9, lArm: 0.6, rArm: -0.5 };

export function backBodyDropV2Clip(distance = 160, { flip = 1 } = {}) {
    const D = Math.max(60, distance), tc = Math.min(0.55, Math.max(0.16, (D - 12) / RUN_SPEED_UNITS));   // contact: he arrives with his speed intact
    const t = (k) => +(tc + k).toFixed(3), I = BBD_IMPACT_AFTER;
    const end = +(tc + I + 0.95).toFixed(3);
    // [at, ease, pose, x]; the attacker's x is 0 (soles stay), the runner's x is his distance from him
    const A = [
        [0, 'easeOut', { ...stand }, 0],
        [+(tc * 0.55).toFixed(3), 'easeInOut', { ...stand, crouch: 0.9, bend: 0.7, lFold: 1.2, rFold: 1.2, lArm: 0.5, rArm: 0.7, lElbow: 0.8, rElbow: 0.8 }, 0],
        [tc, 'easeInOut', { ...stand, crouch: 1.25, bend: 1.15, lFold: 1.6, rFold: 1.6, lArm: 0.7, rArm: 0.9, lElbow: 0.8, rElbow: 0.8 }, 0],
        [t(0.12), 'easeOut', { ...stand, crouch: 0.55, bend: 0.55, lFold: 1.0, rFold: 1.0, lArm: 1.2, rArm: 1.3, lElbow: 0.6, rElbow: 0.6 }, 0],
        [t(I), 'easeOut', { ...stand, crouch: 0.02, bend: -0.12, lean: -0.08, lArm: 1.8, rArm: 1.9, lElbow: 0.4, rElbow: 0.4 }, 0],
        [t(I + 0.25), 'easeInOut', { ...stand, crouch: 0.15, bend: 0.2, lArm: 1.0, rArm: 1.1 }, 0],
        [end, 'easeInOut', { ...stand }, 0],
    ];
    // The runner: strides in, hits the attacker's shoulders with his hips, goes over (tilt through the vertical, `flip` signs the turn) and lands supine.
    // A higher shoulder-driven arc, with another 0.06 s to descend.
    const R = [
        [0, 'linear', runA, D],
        [+(tc * 0.5).toFixed(3), 'linear', runB, D - RUN_SPEED_UNITS * tc * 0.5],
        [tc, 'linear', { ...runA, bend: 0.35, lean: 0.1 }, 12],
        [t(0.1), 'easeOut', { ...stand, tilt: flip * 1.2, lift: 80, bend: 0.3, lLeg: 0.7, rLeg: 0.5, lFold: 0.6, rFold: 0.5, lArm: 1.3, rArm: 1.5 }, -18],
        [t(I), 'easeInOut', { ...stand, tilt: flip * 3.1, lift: 150, lLeg: 0.2, rLeg: 0.1, lFold: 0.4, rFold: 0.3, lArm: 1.6, rArm: 1.8 }, -62],
        [t(I + 0.21), 'easeIn', { ...stand, tilt: flip * 4.6, lift: -90, lLeg: 0.35, rLeg: 0.3, lFold: 0.4, rFold: 0.3, lArm: 1.2, rArm: 1.4 }, -118],
        [t(I + 0.26), 'linear', { ...stand, tilt: flip * 4.7, lift: -110, lLeg: 0.4, rLeg: 0.3, lFold: 0.4, rFold: 0.3, lArm: 0.7, rArm: 0.6, bend: 0.2 }, -125],
        [t(I + 0.4), 'easeOut', { ...stand, tilt: flip * 4.7, lift: -110, lLeg: 0.3, rLeg: 0.25, lArm: 0.4, rArm: 0.4 }, -125],
        [end, 'easeInOut', { ...stand, tilt: flip * 4.7, lift: -110, lLeg: 0.06, rLeg: 0.25, lArm: 0.05, rArm: 0.08 }, -125],
    ];
    const key = ([at, ease, pose, x], facing) => ({ at, ease, pose: own(pose), transform: { x, y: 0 }, facing, parts: {} });
    return {
        id: 'backBodyDropV2',
        duration: end,
        events: [{ at: t(I + 0.26), type: 'impact' }],
        tracks: { attacker: { keyframes: A.map(k => key(k, 1)) }, defender: { keyframes: R.map(k => key(k, -1)) } },
    };
}
