// PLAN_LIGHT_MOVES T2.2 (?light=v1): the ankle lock with its hands on the foot. A copy of ankleLock (same staging, timing, events) with:
//  - grips (D5): the l arm at the heel, the r arm over the toes (`past` = fraction of the shin beyond the ankle). Both rigs draw the l channel on
//    the near side whichever way they face (Skeleton.lChannelSide), so the l hand is the near hand and the trapped leg (the defender's lLeg) is his
//    near leg: l -> side 'same', r -> side 'other'.
//  - the foot raised toward the hands and the man pulled in (his hips 100 from the attacker, was 150), and the attacker stepping in over the grab
//    (0 -> 0.3) and out over the release, so his shoulders are within an arm of the boot (George's arm is 59 px, the boot was ~110 px away).
//  - knees (D3): the old keys bent the attacker's knees with a positive lKnee/rKnee, which hyperextends upright. Here they are heel folds through
//    shinsFromFolds (lShin/rShin), and both soles are planted (D4) from the step-in's end to the start of the release.
import { ankleLockClip } from './ankleLock.js';
import { shinsFromFolds } from '../../rig/articulation.js';

const STEP_IN = 80;
const DEFENDER_X = 100;
const HOLD_END = 2.7;   // the hands let go from here; the foot falls after them

// Pose edits on top of the old keys, by time. `fold` is the attacker's heel fold, both legs (0 = straight).
const ATTACKER = {
    0: { fold: 0 }, 0.3: { fold: 1.0 }, 0.6: { crouch: 0.85, lean: 0.15, fold: 1.25 }, 0.9: { crouch: 0.85, lean: 0.15, fold: 1.25 },
    1.4: { crouch: 0.85, lean: 0.15, fold: 1.25 }, 1.95: { crouch: 0.85, lean: 0.12, fold: 1.25 }, 2.5: { crouch: 0.85, lean: 0.15, fold: 1.25 },
    2.8: { crouch: 0.7, lean: 0.1, fold: 1.0 }, 3.1: { fold: 0 },
};
const DEFENDER = { 0.6: { lLeg: 1.45 }, 0.9: { lLeg: 1.45 }, 1.4: { lLeg: 1.45 }, 1.95: { lLeg: 1.45 }, 2.5: { lLeg: 1.45 }, 2.8: { lLeg: 1.45 } };

const edited = (keyframes, edits, x, own) => keyframes.map(k => {
    const { fold, ...rest } = edits[k.at] ?? {};
    let pose = { ...k.pose, ...rest };
    if (own) {   // the attacker owns his shins: no positive lKnee/rKnee
        const { lKnee, rKnee, ...legs } = pose;
        pose = shinsFromFolds({ ...legs, lFold: fold ?? 0.5, rFold: fold ?? 0.5 });
    }
    return { ...k, pose, transform: x === null ? k.transform : { ...k.transform, x: x(k.at) } };
});

export const ankleLockV2Clip = {
    ...ankleLockClip,
    id: 'ankleLockV2',
    tracks: {
        attacker: { ...ankleLockClip.tracks.attacker, keyframes: edited(ankleLockClip.tracks.attacker.keyframes, ATTACKER, (at) => (at === 0 || at === 3.1 ? 0 : STEP_IN), true) },
        defender: { ...ankleLockClip.tracks.defender, keyframes: edited(ankleLockClip.tracks.defender.keyframes, DEFENDER, () => DEFENDER_X, false) },
    },
    grips: [
        { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Ankle', side: 'same', past: 0.15 }, in: [0.15, 0.35], out: [HOLD_END, 2.95], natural: true },
        { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Ankle', side: 'other', past: 0.4 }, in: [0.15, 0.35], out: [HOLD_END, 2.95], natural: true },
    ],
    plants: [
        { role: 'attacker', leg: 'l', in: [0.3, 0.4], out: [HOLD_END, 2.9] },
        { role: 'attacker', leg: 'r', in: [0.3, 0.4], out: [HOLD_END, 2.9] },
    ],
};
