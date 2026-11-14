// PLAN_LIGHT_MOVES T7.2 (?light=v1): the snapmare from the tie-up. The existing clip starts with the thrower's back to the man's chest, same facing, the man 62
// units behind him (the reversal's start). Out of a face-to-face tie-up the thrower pivots into that orientation first: a 0.34 s turn in which his facing flips once,
// on a symmetric straight pose (knees and elbows bend toward the facing, so any other pose snaps when mirrored), while the man is eased in to the clip's start.
// The clip then plays unchanged, shifted by the lead-in and carried into the thrower's new facing (x runs the other way, the thrower's facing keys are -1).
// `distance`: hips to hips in the tie-up, in the thrower's units.
import { snapmareClip } from './snapmare.js';
import { shinsFromFolds } from '../../rig/articulation.js';

export const PIVOT = 0.34, PIVOT_FLIP = 0.17;
const STRAIGHT = { lArm: 0, rArm: 0, lElbow: 0, rElbow: 0, lLeg: 0, rLeg: 0, lFold: 0, rFold: 0, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0 };
const TIE = { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: -0.1, rLeg: 0.2, lFold: 0.22, rFold: 0.22, lean: 0, crouch: 0.05, tilt: 0, lift: 0, bend: 0 };

export function snapmareTieUpClip(distance = 100) {
    const att = snapmareClip.tracks.attacker.keyframes, def = snapmareClip.tracks.defender.keyframes;
    const shift = (k, facing) => ({ ...k, at: +(k.at + PIVOT).toFixed(3), transform: { ...k.transform, x: -k.transform.x }, facing });
    const key = (at, ease, pose, x, facing) => ({ at, ease, pose: shinsFromFolds(pose), transform: { x, y: 0 }, facing, parts: {} });
    const gapNow = distance, gapClip = -def[0].transform.x;   // the man is at +gap along the thrower's original facing
    const a0 = att[0].pose, d0 = def[0];
    return {
        ...snapmareClip,
        id: 'snapmareTieUp',
        duration: +(snapmareClip.duration + PIVOT).toFixed(3),
        events: snapmareClip.events.map(e => ({ ...e, at: +(e.at + PIVOT).toFixed(3) })),
        tracks: {
            attacker: { ...snapmareClip.tracks.attacker, keyframes: [
                key(0, 'easeOut', TIE, 0, 1),
                key(+(PIVOT_FLIP - 0.01).toFixed(3), 'easeInOut', STRAIGHT, 0, 1),
                key(PIVOT_FLIP, 'easeInOut', STRAIGHT, 0, -1),
                ...att.map(k => shift(k, -1)),
            ] },
            defender: { ...snapmareClip.tracks.defender, keyframes: [
                { at: 0, ease: 'easeOut', pose: shinsFromFolds({ ...TIE, lFold: 0.22 }), transform: { x: gapNow, y: 0 }, facing: -1, parts: {} },
                { at: PIVOT_FLIP, ease: 'easeInOut', pose: shinsFromFolds({ ...TIE, bend: 0.2, crouch: 0.15 }), transform: { x: (gapNow + gapClip) / 2, y: d0.transform.y / 2 }, facing: -1, parts: {} },
                ...def.map(k => shift(k, -1)),
            ] },
        },
    };
}
