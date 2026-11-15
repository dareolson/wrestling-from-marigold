// PLAN_LIGHT_MOVES T8.3 (?light=v1): a true knee drop on a man lying on his back. A one-wrestler clip (the man stays on the grounded rig and takes the knee drop's existing chest sell):
// a short walk to the chest, a set, a leap clearly off the mat, one knee tucked under him with the shin trailing and the other leg folded beside, and the descent onto the chest knee first.
// The descent is gravity (lift = apex * (1 - u^2): the speed rises into the contact, as the elbow drop's T4.7b fall). After the hit he kneels up and stands.
// One spec (build rules): body-relative: the apex is a fraction of the attacker's standing hip height (`apexFrac`), the walk comes from the executor; a rig that differs is an attacker override.
// `reach`: his root to the knee point at contact along the facing (px at s = 1), measured per rig at the contact frame; `kneeRest`: see below. At the contact he steps in across the depth (`land`: his mat line goes to the chest's), so the knee is on the chest with the body down, not hovering; before and after he stands beside the body in depth (`walk`).
import { shinsFromFolds } from '../../rig/articulation.js';
import { specFor } from './rigOverrides.js';

const REFERENCE_HIP_HEIGHT = 124;   // Skeleton's: the body `lift` is authored for

export const KNEE_DROP_V2_SPEC = {
    apexFrac: 0.7,         // apex lift as a fraction of his standing hip height (the old hop: 38 units, about 0.3)
    reach: 30,
    depthMargin: 4,         // his mat line this far (px at s = 1) below the lowest pixel the man draws: beside him in depth, never on his depth line
    kneeRest: 10,           // the kneeling knee's height above his own mat line (px at s = 1): at the contact his mat line is this far below the chest point, so the knee is on it with no lift
    times: { set: 0.45, takeoff: 0.6, apex: 0.78, contact: 0.94, hold: 1.06, rise: 1.4, end: 1.7 },
    keys: {
        idle:    { lLeg: -0.04, rLeg: 0.16, lFold: 0, rFold: 0, lArm: 0, rArm: 0, lElbow: 0.1, rElbow: 0.1, lean: 0, bend: 0, crouch: 0 },
        set:     { lLeg: 0.15, rLeg: 0.1, lFold: 0.7, rFold: 0.7, lArm: -0.5, rArm: -0.3, lElbow: 0.4, rElbow: 0.3, lean: 0.15, bend: 0.2, crouch: 0.6 },
        takeoff: { lLeg: 0.1, rLeg: 0.05, lFold: 0.1, rFold: 0.1, lArm: 1.3, rArm: 1.1, lElbow: 0.4, rElbow: 0.4, lean: -0.05, bend: 0, crouch: 0 },
        apex:    { lLeg: 1.2, rLeg: 0.2, lFold: 1.6, rFold: 1.9, lArm: 1.0, rArm: 0.8, lElbow: 0.5, rElbow: 0.5, lean: 0.12, bend: 0.2, crouch: 0.3 },
        contact: { lLeg: -0.15, rLeg: -0.45, lFold: 2.1, rFold: 2.1, lArm: 0.7, rArm: 0.4, lElbow: 0.5, rElbow: 0.4, lean: 0.2, bend: 0.45, crouch: 1.05 },
        hold:    { lLeg: -0.15, rLeg: -0.45, lFold: 2.1, rFold: 2.1, lArm: 0.7, rArm: 0.4, lElbow: 0.5, rElbow: 0.4, lean: 0.24, bend: 0.5, crouch: 1.1 },
        rise:    { lLeg: 0.4, rLeg: -0.1, lFold: 1.2, rFold: 1.4, lArm: 0.3, rArm: 0.2, lElbow: 0.3, rElbow: 0.2, lean: 0.1, bend: 0.2, crouch: 0.6 },
    },
    // first fit by rig (knee_drop probe, knee point above the chest point at the hit): a shallower crouch for the rigs whose knee stays high (a deeper one raised it: the knee swings forward and up)
    attacker: {
        'george-roster-v1':   { reach: 22, keys: { contact: { crouch: 0.85 }, hold: { crouch: 0.9 } } },
        'kowalski-roster-v1': { keys: { contact: { crouch: 0.93 }, hold: { crouch: 0.98 } } },
        'guido-roster-v1':    { keys: { contact: { crouch: 0.9 }, hold: { crouch: 0.95 } } },
    },
};

// `hipHeight`: his standing hip height in px at s = 1 (the executor reads it from his skeleton); `walk`: where he stands beside the man, { x along his facing, y down the screen } from where he starts; `land`: his y at the contact (the chest's depth plus the kneeling knee's height), same frame.
export const kneeDropV2Clip = (spec = KNEE_DROP_V2_SPEC, rigId, { hipHeight = 100, walk = { x: 0, y: 0 }, land = walk } = {}) => {
    const s = specFor(spec, { attackerRigId: rigId }), t = s.times;
    // the pose's `lift` is in reference units: the skeleton scales it by his standing hip height over REFERENCE_HIP_HEIGHT (124, Skeleton._applyBodyTilt), so heights in px at s = 1 convert by 124 / hipHeight
    const unit = REFERENCE_HIP_HEIGHT / hipHeight, apex = s.apexFrac * hipHeight * unit;
    const key = (at, k, lift = 0, move = true, ease = 'easeInOut') => ({ at, ease, pose: shinsFromFolds({ ...s.keys[k], lift }), transform: move ? { x: walk.x, y: walk.y } : { x: 0, y: 0 } });
    const rising = (at, k) => ({ at, ease: 'easeOut', pose: shinsFromFolds({ ...s.keys.takeoff, ...s.keys[k], lift: apex }), transform: { x: walk.x, y: walk.y } });
    const frames = [key(0, 'idle', 0, false), key(t.set, 'set'), key(t.takeoff, 'takeoff'), rising(t.apex, 'apex')];
    // the descent: gravity, lift = apex (1 - u^2) from the apex to the contact, the body easing into the kneeling pose as u^2 as well
    const N = 4;
    for (let i = 1; i < N; i++) {
        const u = i / N, at = t.apex + (t.contact - t.apex) * u, mix = Object.fromEntries(Object.keys(s.keys.apex).map(n => [n, s.keys.apex[n] + (s.keys.contact[n] - s.keys.apex[n]) * u * u]));
        frames.push({ at, ease: 'linear', pose: shinsFromFolds({ ...mix, lift: apex * (1 - u * u) }), transform: { x: walk.x, y: walk.y + (land.y - walk.y) * u * u } });
    }
    const at = (y) => ({ x: walk.x, y });
    frames.push({ at: t.contact, ease: 'linear', pose: shinsFromFolds({ ...s.keys.contact, lift: 0 }), transform: at(land.y) });
    frames.push({ ...key(t.hold, 'hold', 0, true, 'easeOut'), transform: at(land.y) }, key(t.rise, 'rise', 0), key(t.end, 'idle', 0));
    return { id: 'kneeDropV2', duration: t.end, events: [{ at: t.contact, type: 'impact' }], tracks: { attacker: { keyframes: frames } }, apexLift: apex };
};
