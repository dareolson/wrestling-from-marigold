// PLAN_LIGHT_MOVES T5.2 (?light=v1): the body slam as a slam, not a powerbomb. bodySlam's tracks, re-timed:
//  - the man is lifted to the attacker's shoulder height and held horizontal (old peak 167-174% of the shoulder, now about 100%), the lift slower than the drop,
//    a short hang, then he is dropped flat onto his back 150 px in front (old: thrown 200 px from a hang over the head, 41-45 px/frame);
//  - grips (D5): the l hand under his near hip (the scoop), the r hand to his far shoulder; no grip is guessed at beyond the rig's hip and shoulder joints;
//  - the attacker's soles are planted (D4) through the lift: his x holds 0 until the slam, the lift comes from the crouch;
//  - D3: both men's shins through shinsFromFolds, the old positive lKnee/rKnee (a hyperextended upright knee) become folds.
// Same impact marker (1.08 s), damage, sell and landing type as bodySlam.
import { bodySlamClip } from './bodySlam.js';
import { shinsFromFolds } from '../../rig/articulation.js';

const IMPACT = 1.08;
const owned = pose => { const { lKnee, rKnee, ...rest } = pose; return shinsFromFolds({ ...rest, lFold: lKnee ?? 0.22, rFold: rKnee ?? 0.22 }); };

// [at, ease, lift, tilt, x, y] for the receiver; poses between are the old clip's at the nearest earlier key.
const LIFT = [
    [0, 'linear', 0, 0, 72], [0.12, 'easeIn', 0, 0, 66], [0.3, 'easeOut', 10, -0.4, 60], [0.5, 'easeInOut', 28, -1.45, 30], [0.7, 'easeInOut', 40, -1.58, 8],
    [0.84, 'easeOut', 51, -1.6, 0], [0.9, 'linear', 38, -1.6, 25], [1.0, 'linear', -20, -1.55, 90], [IMPACT, 'linear', -110, -1.52, 150],
];
const oldAt = (keys, at) => keys.reduce((m, k) => (k.at <= at ? k : m), keys[0]);

const defender = (liftScale) => {
    const old = bodySlamClip.tracks.defender.keyframes;
    const pre = LIFT.map(([at, ease, lift, tilt, x]) => ({ at, ease, pose: owned({ ...oldAt(old, Math.min(at, 0.9)).pose, lift: lift > 0 ? lift * liftScale : lift, tilt }), transform: { x, y: at > 0.2 && at < IMPACT ? 4 : 0 }, parts: {} }));
    return [...pre, ...old.filter(k => k.at > IMPACT).map(k => ({ ...k, pose: owned(k.pose), transform: { ...k.transform, x: 150 } }))];
};
const attacker = () => bodySlamClip.tracks.attacker.keyframes.map(k => ({ ...k, pose: owned(k.pose), transform: { ...k.transform, x: k.at < 1.0 ? 0 : k.transform.x } }));

// `liftScale`: the receiver's carried height scales with who carries him (George's shoulder is lower than Lou's, and Lou is the taller man to carry).
const build = (id, liftScale) => ({
    ...bodySlamClip,
    id,
    tracks: { attacker: { keyframes: attacker() }, defender: { keyframes: defender(liftScale) } },
    grips: [
        { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [0.3, 0.42], out: [IMPACT - 0.04, IMPACT] },
        { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Shoulder', side: 'other' }, in: [0.3, 0.42], out: [IMPACT - 0.04, IMPACT] },
    ],
    plants: [
        { role: 'attacker', leg: 'l', in: [0.4, 0.5], out: [1.0, IMPACT] },
        { role: 'attacker', leg: 'r', in: [0.4, 0.5], out: [1.0, IMPACT] },
    ],
});
export const bodySlamV2Clip = build('bodySlamV2', 1);
export const bodySlamV2GeorgeClip = build('bodySlamV2George', 0.6);
export const bodySlamV2For = rigId => (/george/i.test(rigId ?? '') ? 'bodySlamV2George' : 'bodySlamV2');
