// PLAN_LIGHT_MOVES T1.2 (?light=v1): the front kick rebuilt. A copy of frontKick (same 0.68 s, same impact event at 0.3, same arms and trunk keys), legs re-authored:
//  - weight goes onto the support (r) leg, which bends (soft knee) while its painted sole is held on the mat by a plant (D4: the old clip's support leg was straight and the
//    rig's sole-mean pelvis solve sank the hips and the support sole with them);
//  - the kicking (l) knee chambers up with the shin hanging, then the leg extends flat-footed into the gut (a push, not a snap) and comes back through the chamber;
//  - knees (D3): both legs own their shins as the absolute `lShin`/`rShin` through `shinsFromFolds`; the old clip's positive lKnee 1.55 / 1.3 folded the knee backward.
import { frontKickClip } from './frontKick.js';
import { shinsFromFolds } from '../../rig/articulation.js';

// per key time: the legs and the crouch that carries the soft support knee. `lFold`/`rFold` = heel fold in radians (0 = straight, shin parallel to the thigh).
const LEGS = {
    0:    { lLeg: -0.04, lFold: 0,    rLeg: 0.16, rFold: 0,    crouch: 0, lift: 0 },
    0.04: { lLeg: -0.04, lFold: 0.24, rLeg: 0.16, rFold: 0.24, crouch: 0.15, lift: 0 },   // both knees ease into a crouch first (fold 1.6 x crouch is the rig's own crouch), the soles stay on the mat
    0.12: { lLeg: 0.35,  lFold: 0.75, rLeg: 0.08, rFold: 0.6, crouch: 0.2, lift: 6 },   // weight onto the support leg, the kicking foot comes off the mat
    0.22: { lLeg: 1.30,  lFold: 1.55, rLeg: 0.05, rFold: 0.6, crouch: 0.32, lift: 12 },   // chamber: thigh up, shin hanging a little behind the knee
    0.30: { lLeg: 1.62,  lFold: 0.12, rLeg: 0.05, rFold: 0.6, crouch: 0.32, lift: 12 },   // the push, leg out flat-footed into the belly (the impact)
    0.36: { lLeg: 1.66,  lFold: 0.10, rLeg: 0.05, rFold: 0.6, crouch: 0.32, lift: 12 },
    0.46: { lLeg: 1.25,  lFold: 1.50, rLeg: 0.06, rFold: 0.6, crouch: 0.14, lift: 12 },   // back through the chamber
    0.58: { lLeg: 0.30,  lFold: 0.70, rLeg: 0.10, rFold: 0.5, crouch: 0.08, lift: 6 },   // setting down
    0.68: { lLeg: -0.04, lFold: 0,    rLeg: 0.16, rFold: 0,    crouch: 0, lift: 0 },
};

// An extra key at SHIFT_AT on the old keys' own path (every non-leg channel interpolated): the support knee is bent by the time the plant takes the sole, since a plant
// started on a straight leg solves to a straight leg (the knee's derivative is zero there) and never bends it.
const SHIFT_AT = 0.04;
const withShift = (keys) => {
    const [a, b] = keys, u = (SHIFT_AT - a.at) / (b.at - a.at), pose = {};
    for (const n of Object.keys(a.pose)) pose[n] = a.pose[n] + (b.pose[n] - a.pose[n]) * u;
    return [a, { ...a, at: SHIFT_AT, pose }, ...keys.slice(1)];
};

export const frontKickV2Clip = {
    id: 'frontKickV2',
    duration: frontKickClip.duration,
    tracks: {
        attacker: {
            ...frontKickClip.tracks.attacker,
            keyframes: withShift(frontKickClip.tracks.attacker.keyframes).map(k => {
                const { lKnee, rKnee, ...rest } = k.pose;
                return { ...k, pose: shinsFromFolds({ ...rest, ...LEGS[k.at] }) };
            }),
        },
    },
    // the support sole holds the mat point it had the first frame it carries weight, from the shift to the set-down
    plants: [{ role: 'attacker', leg: 'r', in: [0, 0.03], out: [0.66, 0.68], kneeRestart: true }],
    events: frontKickClip.events,
};
