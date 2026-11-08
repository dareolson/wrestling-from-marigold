// Opt-in ankle lock: painted palms follow the boot heel and toe, not shin-axis proxies.
import { ankleLockClip } from './ankleLock.js';
import { shinsFromFolds } from '../../rig/articulation.js';

// Keep the attacker beside the leg; lean his shoulders toward it instead of stepping 80 px into the receiver.
const STEP_IN = 0;
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
        pose = shinsFromFolds({ ...legs, bend: k.at > 0 && k.at < 3.1 ? 0.75 : 0, lFold: fold ?? 0.5, rFold: fold ?? 0.5 });
    }
    const holding = k.at > 0 && k.at < 3.1;
    return {
        ...k, pose,
        ...(own ? { parts: { ...k.parts, nearForearm: holding ? 'grip' : 'base', farForearm: holding ? 'grip' : 'base' } } : {}),
        transform: x === null ? k.transform : {
            ...k.transform, x: x(k.at), ...(own ? { y: holding ? 20 : 0 } : {}),
        },
    };
});

export const ankleLockV2Clip = {
    ...ankleLockClip,
    id: 'ankleLockV2',
    tracks: {
        attacker: { ...ankleLockClip.tracks.attacker, keyframes: edited(ankleLockClip.tracks.attacker.keyframes, ATTACKER, (at) => (at === 0 || at === 3.1 ? 0 : STEP_IN), true) },
        defender: { ...ankleLockClip.tracks.defender, keyframes: edited(ankleLockClip.tracks.defender.keyframes, DEFENDER, () => DEFENDER_X, false) },
    },
    grips: [
        { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Ankle', side: 'same', anchor: 'heel' }, in: [0.15, 0.35], out: [HOLD_END, 2.95], natural: true, palm: 'clutch' },
        { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Ankle', side: 'other', anchor: 'toe' }, in: [0.15, 0.35], out: [HOLD_END, 2.95], natural: true, palm: 'clutch' },
    ],
    plants: [
        { role: 'attacker', leg: 'l', in: [0.3, 0.4], out: [HOLD_END, 2.9] },
        { role: 'attacker', leg: 'r', in: [0.3, 0.4], out: [HOLD_END, 2.9] },
    ],
};
