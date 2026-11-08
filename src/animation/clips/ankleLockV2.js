// PLAN_LIGHT_MOVES pickup revision after T2.2d (?light=v1): the ankle lock with his hands on the boot, re-staged. A copy of ankleLock (same duration, events, damage):
//  - grips (D5, T2.2b): the l arm aims its painted palm (`clutch`) at the boot's painted heel, the r arm at the toe (`to.anchor`, `palm`). Both rigs
//    draw the l channel on the near side whichever way they face (Skeleton.lChannelSide), so the l hand is the near hand and the trapped leg (the
//    defender's lLeg) is his near leg: l -> side 'same', r -> side 'other'.
//  - the attacker crouches to collect the grounded boot, then stands tall (held torso bend <= .3) and leans back on planted soles (D4); the downed man's hips come off the mat and the trapped leg
//    comes up in front of the attacker, the boot at his chest, so the hands hold it out in front of him, not at his waist.
//  - layers: the trapped leg over the attacker's body, his arms over the boot (clipLayers.js).
//  - knees (D3): both men own their shins (`lShin`/`rShin` through shinsFromFolds), never a positive lKnee/rKnee upright; the victim's trapped knee
//    is bent the natural way.
import { ankleLockClip } from './ankleLock.js';
import { shinsFromFolds } from '../../rig/articulation.js';

const DEFENDER_X = 68;   // the downed man's hips from the attacker while held, so the raised boot is within an arm of his chest
const APART_X = 210;     // default preview entry separation; gameplay captures the actual separation
export const GRAB_GAP = 205;    // receiver hips to attacker hips at the grounded-boot pickup, and at the release: his soles stay past the lying man's boots
const MID_GAP = 134;     // half way through the lift
const HIP_LIFT = -70;    // his hips come off the mat over the hold (lying is -110), which carries the boot up to chest height
const TRAPPED_LEG = 1.45; // the trapped thigh's lLeg while held
const FREE_LEG = -0.45;  // the other leg lies on the mat (the tilted body would lift it; rLeg .1 is flat only when he is), drawn behind the attacker's legs
const FREE_FOLD = 0.15;
const HOLD_END = 2.7;    // the hands let go from here; the foot falls after them

// Attacker poses on top of the old keys, by time. `fold` is the heel fold of both legs (0 = straight).
const STAND = { crouch: 0.5, bend: 0.25, fold: 0.8 };
const ATTACKER = {
    0: { fold: 0, bend: 0 },
    0.3: { crouch: 2, lean: 0.15, bend: 1.6, fold: 2.3 },
    0.45: { crouch: 1.1, lean: 0.05, bend: 0.5, fold: 1.1 },
    0.6: { ...STAND, lean: -0.05 }, 0.9: { ...STAND, lean: -0.15 }, 1.4: { ...STAND, lean: -0.1 }, 1.95: { ...STAND, lean: -0.18 }, 2.5: { ...STAND, lean: -0.1 },
    2.8: { ...STAND, lean: -0.1 },   // still down while the soles let go; he rises over the release
    3.1: { fold: 0, bend: 0 },
};
// Defender: the trapped leg up, his hips lifted, a soft bend in both knees (`fold` l = trapped, r = free).
const DEFENDER = {
    0: { lFold: 0.15, rFold: 0.15 }, 0.3: { lLeg: 0.05, rLeg: 0.1, lFold: 0.15, rFold: 0.15, tilt: -Math.PI / 2, lift: -110 },
    0.6: { tilt: -1.9, lLeg: TRAPPED_LEG, lFold: 0.5, rLeg: FREE_LEG, rFold: FREE_FOLD, lift: HIP_LIFT }, 0.9: { tilt: -1.7, lLeg: TRAPPED_LEG, lFold: 0.5, rLeg: FREE_LEG, rFold: FREE_FOLD, lift: HIP_LIFT },
    1.4: { tilt: -1.9, lLeg: TRAPPED_LEG, lFold: 0.5, rLeg: FREE_LEG, rFold: FREE_FOLD, lift: HIP_LIFT }, 1.95: { tilt: -1.65, lLeg: TRAPPED_LEG, lFold: 0.5, rLeg: FREE_LEG, rFold: FREE_FOLD, lift: HIP_LIFT },
    2.5: { tilt: -1.88, lLeg: TRAPPED_LEG, lFold: 0.5, rLeg: FREE_LEG, rFold: FREE_FOLD, lift: HIP_LIFT }, 2.8: { tilt: -1.7, lLeg: TRAPPED_LEG, lFold: 0.4, rLeg: FREE_LEG, rFold: FREE_FOLD, lift: HIP_LIFT },
    2.7: { tilt: -1.78, lLeg: TRAPPED_LEG, lFold: 0.45, rLeg: FREE_LEG, rFold: FREE_FOLD, lift: HIP_LIFT },
    3.1: { lFold: 0.15, rFold: 0.15 },
};

// Hips to hips between the two men at a key time, given where the receiver lies: out at the grab (0.3 s), in over the lift, held, out again at the release.
// The keys in between interpolate.
const gapAt = at => at <= 0.3 || at >= 3.1 ? GRAB_GAP : at >= 0.6 && at <= 2.8 ? DEFENDER_X : at === 0.45 ? MID_GAP : GRAB_GAP + (DEFENDER_X - GRAB_GAP) * (at - 0.3) / 0.3;
// The attacker's offset from where he stood at the entry (the receiver lies `distance` away and never moves). If that spot is closer than the grab
// spot, his first frame is already at the grab spot: he starts past the man's boots instead of on his shins.
const attackerX = (distance, at) => at === 0 ? Math.min(0, distance - GRAB_GAP) : distance - gapAt(at);

const attackerKeys = (keyframes) => {
    const keys = [...keyframes];
    const i = keys.findIndex(k => k.at > 0.45);
    keys.splice(i, 0, lerpKey(keys[i - 1], keys[i], 0.45));
    return keys.map(k => {
        const { fold, ...rest } = ATTACKER[k.at] ?? {};
        const { lKnee, rKnee, ...legs } = { ...k.pose, ...rest };   // he owns his shins: no positive lKnee/rKnee
        const holding = k.at > 0 && k.at < 3.1;
        return {
            ...k, pose: shinsFromFolds({ ...legs, lFold: fold ?? 0.5, rFold: fold ?? 0.5 }),
            transform: { ...k.transform, x: attackerX(APART_X, k.at) },
            parts: { ...k.parts, nearForearm: holding ? 'grip' : 'base', farForearm: holding ? 'grip' : 'base' },
        };
    });
};

const lerpKey = (a, b, at) => {
    const u = (at - a.at) / (b.at - a.at), mix = (p, q) => Object.fromEntries(Object.keys(q).map(n => [n, p[n] === undefined ? q[n] : p[n] + (q[n] - p[n]) * u]));
    return { ...a, at, pose: mix(a.pose, b.pose), transform: { ...a.transform } };
};

const defenderKeys = (keyframes) => {
    const keys = [...keyframes];
    const i = keys.findIndex(k => k.at > HOLD_END);   // keep an explicit pose at release; the receiver never slides out
    keys.splice(i, 0, lerpKey(keys[i - 1], keys[i], HOLD_END));
    return keys.map(k => {
        const { lKnee, rKnee, ...legs } = { ...k.pose, ...(DEFENDER[k.at] ?? {}) };
        return { ...k, pose: shinsFromFolds({ lFold: 0.15, rFold: 0.15, ...legs }), transform: { ...k.transform, x: APART_X } };
    });
};

export const ankleLockV2Clip = {
    ...ankleLockClip,
    id: 'ankleLockV2',
    tracks: {
        attacker: { ...ankleLockClip.tracks.attacker, keyframes: attackerKeys(ankleLockClip.tracks.attacker.keyframes) },
        defender: { ...ankleLockClip.tracks.defender, keyframes: defenderKeys(ankleLockClip.tracks.defender.keyframes) },
    },
    grips: [
        { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Ankle', side: 'same', anchor: 'heel' }, in: [0.2, 0.3], out: [HOLD_END, 2.95], natural: true, palm: 'clutch' },
        { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Ankle', side: 'other', anchor: 'toe' }, in: [0.2, 0.3], out: [HOLD_END, 2.95], natural: true, palm: 'clutch' },
    ],
    plants: [
        { role: 'attacker', leg: 'l', in: [0.6, 0.7], out: [HOLD_END, 2.9] },
        { role: 'attacker', leg: 'r', in: [0.6, 0.7], out: [HOLD_END, 2.9] },
    ],
    // back -> front: include the receiver torso/arms explicitly so his near leg cannot drop under an unlisted torso. The downed man's far arm is behind his torso,
    // his near arm in front of it (facing-relative names: `rArm`/`lArm` put both in front).
    // The victim's free leg, the attacker's far arm (the hand reaches round the far side of the boot), his torso and head, both his legs over
    // the torso (his far leg steps forward, so Lou's normal stack would bury it under the trunks; George's art already draws both over), the trapped leg,
    // his near arm over the boot. Named parts rather than `body`: that one is each rig's own stack.
    layers: [{ from: 0, to: 3.1, order: [['defender', 'rLeg'], ['defender', 'farArm'], ['defender', 'torso'], ['defender', 'head'], ['defender', 'nearArm'], ['attacker', 'farArm'], ['attacker', 'torso'], ['attacker', 'head'], ['attacker', 'farLeg'], ['attacker', 'nearLeg'], ['defender', 'lLeg'], ['attacker', 'nearArm']] }],
};

// Capture entry separation once. The receiver keeps his world position; the attacker
// goes to the grounded foot, closes his hands, then follows it up into the hold.
// This is per-play clip data, not an accumulated transform or a registry-wide offset.
export function ankleLockEntryClip(distance = APART_X) {
    const source = ankleLockV2Clip;
    return {
        ...source,
        tracks: {
            attacker: { ...source.tracks.attacker, keyframes: source.tracks.attacker.keyframes.map(k => ({
                ...k, transform: { ...k.transform, x: attackerX(distance, k.at) },
            })) },
            defender: { ...source.tracks.defender, keyframes: source.tracks.defender.keyframes.map(k => ({
                ...k, transform: { ...k.transform, x: distance },
            })) },
        },
    };
}
