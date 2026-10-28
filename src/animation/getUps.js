// Authored get-ups (PLAN_GETUPS D1): grounded keypose tables, the same channels as Skeleton.GETUP_POSES
// (hip, torso, *Thigh, *Shin, *Arm, *Fore), sampled at rise progress t (0 lying -> 1 standing).
//
// An entry: { id, from: 'supine'|'prone', duration (s, full stamina), keys, flipAt?, after?, pivot?, hands?, tags }.
//   keys    t ascending from 0, the last key is the standing key (t = 1), or, with a flip, the pose at `flipAt`.
//   flipAt  (D2) the rise turns to face the other way at this t. `after` then holds the keys from flipAt to 1, authored
//           for the NEW facing; its first key is the last of `keys` (turnedPose): channels are facing-relative, so the
//           same channels with the facing flipped draw the body reflected about the hip, and the pivot hold moves x so
//           the planted joint stays put. (Not the sells.js roll: negated angles with a flipped facing draw the SAME world
//           body with the art turned over, which does not turn him to face the other way.)
//   pivot   the joint (a Skeleton.jointAttachmentPoints name, e.g. 'nearKnee') that stays put across the flip; the
//           Wrestler's x is corrected so it does (B4).
//   hands   B5, support hands as data: { near|far: { target, space, push: [t0, t1], w, release: [t1, t2] } }.
//   tags    ['backSell'] keeps the near hand for the carried back reach, so `hands.near` is rejected there.
import Skeleton from '../Skeleton.js';

const CHANNELS = ['hip', 'torso', 'farThigh', 'farShin', 'nearThigh', 'nearShin', 'farArm', 'farFore', 'nearArm', 'nearFore'];

/** The pose a flip hands the second half: the same facing-relative channels (the facing flips, so the body is reflected). */
export const turnedPose = (p) => ({ ...p });

/** The key table a rise at this stage samples: before the flip `keys`, from it `after` (or `keys` without a flip). */
export const keysFor = (entry, flipped = false) => (entry.after && flipped ? entry.after : entry.keys);

/** The grounded pose at t. `flipped` says which half (the Wrestler's own flag, not t, so a frame exactly on flipAt is unambiguous). */
export function sampleGetUp(entry, t, flipped = false) {
    return Skeleton._sampleKeyposes(keysFor(entry, flipped), t);
}

const ordered = (keys) => keys.every((k, i) => i === 0 || k.t > keys[i - 1].t);

/** Problems with an entry, as strings (empty = valid). */
export function validateGetUp(e) {
    const bad = [];
    if (!e || typeof e.id !== 'string') return ['missing id'];
    if (e.from !== 'supine' && e.from !== 'prone') bad.push('from must be supine or prone');
    if (!(e.duration > 0)) bad.push('duration must be positive');
    if (!Array.isArray(e.keys) || e.keys.length < 2) return [...bad, 'keys needs at least two entries'];
    for (const k of e.keys) for (const c of CHANNELS) if (!Number.isFinite(k[c])) bad.push(`key t=${k.t} lacks ${c}`);
    if (e.keys[0].t !== 0) bad.push('first key must be t = 0');
    if (!ordered(e.keys)) bad.push('keys out of order');
    const hasFlip = e.flipAt !== undefined, hasAfter = e.after !== undefined;
    if (hasFlip !== hasAfter) bad.push('flipAt and after go together');
    if (hasFlip) {
        if (!(e.flipAt > 0 && e.flipAt < 1)) bad.push('flipAt must be inside (0, 1)');
        if (e.keys.at(-1).t !== e.flipAt) bad.push('last key must sit at flipAt');
        if (!e.pivot) bad.push('a flip needs a pivot');
        if (!Array.isArray(e.after) || e.after.length < 2) bad.push('after needs at least two entries');
        else {
            if (!ordered(e.after)) bad.push('after out of order');
            if (e.after[0].t !== e.flipAt) bad.push('after must start at flipAt');
            if (e.after.at(-1).t !== 1) bad.push('missing standing key (after must end at t = 1)');
            const m = turnedPose(e.keys.at(-1));
            for (const c of CHANNELS) if (!(Math.abs(m[c] - e.after[0][c]) < 1e-9)) bad.push(`after[0].${c} is not the flip key`);
        }
    } else if (e.keys.at(-1).t !== 1) bad.push('missing standing key (last key must be t = 1)');
    const standing = (hasFlip ? e.after?.at(-1) : e.keys.at(-1));
    if (standing && Math.abs(standing.torso - Math.PI) > 1e-9) bad.push('the last key must be the standing key (torso π)');
    for (const [side, h] of Object.entries(e.hands ?? {})) {
        if (side !== 'near' && side !== 'far') bad.push(`hands.${side}: near or far`);
        if (side === 'near' && e.tags?.includes('backSell')) bad.push('a backSell variant keeps the near hand for the back reach');
        if (!Array.isArray(h.push) || !(h.push[0] < h.push[1])) bad.push(`hands.${side}.push must be [t0, t1]`);
    }
    return bad;
}

// Today's two rises as entries: the same key tables by reference, so they sample byte-identical.
export const legacySupine = Object.freeze({ id: 'legacySupine', from: 'supine', duration: 0.85, keys: Skeleton.GETUP_SUPINE_POSES, tags: ['legacy'] });
export const legacyProne = Object.freeze({ id: 'legacyProne', from: 'prone', duration: 0.85, keys: Skeleton.GETUP_POSES, tags: ['legacy'] });
export const legacyFor = (lying) => (lying === 'supine' ? legacySupine : legacyProne);

// ── backKneeHurt (Bret 64-68, Derek's description): crunch up with the knees drawn in, roll onto the near knee,
// push off it with the far hand, stand. Rough keys for G1a, untuned. Channels are facing-relative (0 = down,
// + toward facing; torso π = upright; a supine body has torso π + ~1.5, feet toward facing).
const P = Math.PI;
const SITUP = { t: 0.24, hip: 16, torso: P + 0.30, farThigh: 1.95, farShin: -0.35, nearThigh: 1.80, nearShin: -0.50, farArm: 0.35, farFore: 0.60, nearArm: 0.20, nearFore: 0.45 };
// on the near knee, far foot planted, torso over it, far hand reaching for the far knee (the flip pose)
const KNEEL = { t: 0.46, hip: 36, torso: P - 0.85, farThigh: 1.15, farShin: -0.25, nearThigh: 0.10, nearShin: -1.50, farArm: 0.95, farFore: 0.95, nearArm: 0.20, nearFore: 0.30 };
const PUSH = { t: 0.72, hip: 58, torso: P - 0.45, farThigh: 0.95, farShin: -0.10, nearThigh: 0.30, nearShin: -0.95, farArm: 0.70, farFore: 0.75, nearArm: 0.10, nearFore: 0.20 };
const STAND = Skeleton.GETUP_POSES.at(-1);
const flipKey = turnedPose(KNEEL);
const keyed = (...ks) => ks.map((k) => ({ ...k }));

const backKneeHurtBase = {
    from: 'supine', duration: 0.85, pivot: 'nearKnee', tags: ['knee'],
    hands: { far: { target: 'farKnee', space: 'thighLocal', push: [0.46, 0.72], w: 1, release: [0.72, 0.86] } },
};
// Turning: the flip happens on the knee; the after half is drawn for the new facing.
export const backKneeHurt = Object.freeze({
    id: 'backKneeHurt', ...backKneeHurtBase, flipAt: KNEEL.t,
    keys: keyed(Skeleton.GROUNDED_SUPINE, SITUP, KNEEL),
    after: keyed(flipKey, PUSH, { ...STAND, t: 1 }),
});
// Not turning: the same rise, no mirror.
export const backKneeHurtStraight = Object.freeze({
    id: 'backKneeHurtStraight', ...backKneeHurtBase,
    keys: keyed(Skeleton.GROUNDED_SUPINE, SITUP, KNEEL, PUSH, { ...STAND, t: 1 }),
});

// The back-sell variants (D5): same keys; the near hand stays on the back (the carried back reach, Skeleton.updateGetUp)
// and only the far hand pushes. Chosen when the rise carries back pain.
export const backKneeHurtBack = Object.freeze({ ...backKneeHurt, id: 'backKneeHurtBack', tags: ['knee', 'backSell'] });
export const backKneeHurtBackStraight = Object.freeze({ ...backKneeHurtStraight, id: 'backKneeHurtBackStraight', tags: ['knee', 'backSell'] });

export const GETUPS = Object.freeze({ legacySupine, legacyProne, backKneeHurt, backKneeHurtStraight, backKneeHurtBack, backKneeHurtBackStraight });
