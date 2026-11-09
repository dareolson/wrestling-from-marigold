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
export const LEAD_IN = 0.2;     // seconds to shuffle from where he stood to the grab spot (the worst close entry, 50 px, steps 11-12 px/frame, under the release's 13)
const BOOT_ON = 0.45;   // the trapped boot's bent-boot art goes on here (the lift's middle) and off at BOOT_OFF (the foot falling)
const BOOT_OFF = 2.95;
const HOLD_END = 2.7;    // the hands let go from here; the foot falls after them

// Attacker poses on top of the old keys, by time. `fold` is the heel fold of both legs (0 = straight).
const STAND = { crouch: 0.5, bend: 0.25, fold: 0.8 };
const ATTACKER = {
    0: { fold: 0, bend: 0 },
    0.2: { crouch: 1.35, lean: 0.12, bend: 1.07, fold: 1.53 },   // two thirds of the way down, the lead-in's end
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
const gapAt = at => at >= LEAD_IN && at <= 0.3 || at >= 3.1 ? GRAB_GAP : at >= 0.6 && at <= 2.8 ? DEFENDER_X : at === 0.45 ? MID_GAP : GRAB_GAP + (DEFENDER_X - GRAB_GAP) * (at - 0.3) / 0.3;
// The attacker's offset from where he stood at the entry (the receiver lies `distance` away and never moves). He starts where he stands and shuffles to the
// grab spot over LEAD_IN seconds, so a close entry steps him back at a walking pace instead of teleporting him past the man's boots on frame 1.
const attackerX = (distance, at) => at === 0 ? 0 : distance - gapAt(at);

const attackerKeys = (keyframes) => {
    const keys = [...keyframes];
    for (const at of [LEAD_IN, 0.45]) {   // a key where the shuffle ends, one half way through the lift
        const i = keys.findIndex(k => k.at > at);
        keys.splice(i, 0, lerpKey(keys[i - 1], keys[i], at));
    }
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

// T2.3, the downed man's sell, authored on the channels the clip already has (no new system, no new art): on each squeeze (1.2, 1.8, 2.4 s) his
// head comes up (`bend`: the upper body curls toward his feet about the hips; the legs, hence the boot the attacker holds, stay put), his near arm
// reaches for the rope on the first and third and slaps the mat on the second, his far arm follows a little, and his free leg draws up and kicks out
// between the squeezes. All of it is back at the rest pose by 2.8 s, where the hold lets go. Rows: [t, bend, nearArm, nearElbow, farArm, farElbow, kick, bendKnee].
// `kick` swings the free thigh (added to rLeg), `bendKnee` adds to its fold (flex only grows, so the knee never hyperextends).
const SELL = [
    [0.6, 0, 0.05, 0.1, 0.05, 0.1, 0, 0],
    [1.05, 0, 0.05, 0.1, 0.05, 0.1, 0, 0],
    [1.26, 0.45, 2.3, 0.35, 0.8, 0.3, 0, 0],     // squeeze 1: head up, the near arm reaches for the rope
    [1.5, 0.15, 1.9, 0.5, 0.5, 0.3, 0, 0.7],     // the free knee draws in toward his own body (the shin folds back, away from the attacker's legs)
    [1.68, 0.05, 1.3, 0.4, 0.3, 0.2, 0, 0.1],       // ... and kicks out
    [1.8, 0.35, 1.7, 0.2, 0.7, 0.2, 0, 0.2],        // squeeze 2: head up, the near arm up for a slap
    [1.88, 0.5, 2.0, 0.1, 0.6, 0.2, 0, 0],      // ... cocked back over his head
    [1.96, 0.05, 3.3, 0.05, 0.5, 0.2, 0, 0],     // ... and slapped down onto the mat as his head drops back
    [2.1, 0.12, 1.5, 0.2, 0.4, 0.3, 0, 0.7],
    [2.28, 0.05, 0.5, 0.2, 0.3, 0.3, 0, 0.1],
    [2.46, 0.45, 2.2, 0.35, 0.8, 0.3, 0, 0],      // squeeze 3: head up, the near arm reaches again
    [2.8, 0, 0.05, 0.1, 0.05, 0.1, 0, 0],
];
const sellAt = (t) => {
    if (t <= SELL[0][0]) return SELL[0];
    const i = SELL.findIndex(r => r[0] >= t);
    if (i < 0) return SELL[SELL.length - 1];
    const [a, b] = [SELL[i - 1], SELL[i]], u = (t - a[0]) / (b[0] - a[0]);
    return a.map((v, n) => v + (b[n] - v) * u);
};

const defenderKeys = (keyframes) => {
    const keys = [...keyframes];
    const i = keys.findIndex(k => k.at > HOLD_END);   // keep an explicit pose at release; the receiver never slides out
    keys.splice(i, 0, lerpKey(keys[i - 1], keys[i], HOLD_END));
    const base = keys.map(k => {
        const { lKnee, rKnee, ...legs } = { ...k.pose, ...(DEFENDER[k.at] ?? {}) };
        return { ...k, pose: shinsFromFolds({ lFold: 0.15, rFold: 0.15, ...legs }), transform: { ...k.transform, x: APART_X } };
    });
    // the sell's keys between the hold's own, each a blend of its neighbours before the sell is laid on
    const times = SELL.map(r => r[0]).filter(t => t > 0.6 && t < 2.8 && !base.some(k => k.at === t));
    for (const at of times) {
        const j = base.findIndex(k => k.at > at);
        base.splice(j, 0, lerpKey(base[j - 1], base[j], at));
    }
    // T2.6: the trapped boot wears the bent-boot shin (`variants.shin.ankleTwist`, a rig without it keeps its normal shin) from half way through the lift,
    // while the leg is moving, until the foot falls after the hands let go. Parts are discrete, so the swap keys sit inside moving stretches.
    for (const at of [BOOT_ON, BOOT_OFF]) {
        const j = base.findIndex(k => k.at > at);
        if (!base.some(k => k.at === at)) base.splice(j, 0, lerpKey(base[j - 1], base[j], at));
    }
    for (const k of base) k.parts = { ...k.parts, lShin: k.at >= BOOT_ON && k.at < BOOT_OFF ? 'ankleTwist' : 'base' };
    return base.map(k => {
        if (k.at < 0.6 || k.at > 2.8) return k;
        const [, bend, lArm, lElbow, rArm, rElbow, kick, bendKnee] = sellAt(k.at);
        const rLeg = k.pose.rLeg + kick;
        return { ...k, pose: { ...k.pose, bend, lArm, lElbow, rArm, rElbow, rLeg, rShin: k.pose.rShin + kick - bendKnee } };
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
