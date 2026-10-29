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
//   hands   B5/E2, support hands as data: { near|far: phase | [phase, ...] }, phase = { target, space: 'world'|'thighLocal',
//           push: [t0, t1], w, release: [t1, t2], lead? (the ease-in span before t0, default .10) }. A `world` phase holds a mat point taken once at its push start (its
//           `target` is a label only); `thighLocal` follows the named joint. Phases are in order and only overlap in a hand-over.
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
    for (const [side, spec] of Object.entries(e.hands ?? {})) {
        if (side !== 'near' && side !== 'far') bad.push(`hands.${side}: near or far`);
        if (side === 'near' && e.tags?.includes('backSell')) bad.push('a backSell variant keeps the near hand for the back reach');
        // E2: one phase, or an ordered array of phases
        const phases = Array.isArray(spec) ? spec : [spec];
        if (!phases.length) bad.push(`hands.${side} has no phases`);
        phases.forEach((h, i) => {
            const at = `hands.${side}${Array.isArray(spec) ? `[${i}]` : ''}`;
            if (!h || typeof h !== 'object') return bad.push(`${at} must be a phase`);
            if (!Array.isArray(h.push) || !(h.push[0] < h.push[1])) bad.push(`${at}.push must be [t0, t1]`);
            if (Array.isArray(spec)) {
                if (h.space !== 'world' && h.space !== 'thighLocal') bad.push(`${at}.space must be world or thighLocal`);
                if (h.space === 'thighLocal' && typeof h.target !== 'string') bad.push(`${at}.target needs a joint name`);
                if (h.lead !== undefined && !(h.lead > 0)) bad.push(`${at}.lead must be positive`);
                if (h.release !== undefined && !(Array.isArray(h.release) && h.release[0] <= h.release[1])) bad.push(`${at}.release must be [t1, t2]`);
            }
        });
        if (Array.isArray(spec)) {
            // phases run in order: a phase's push ends before its release starts (or with it), and the next phase's push starts
            // no sooner than the previous release starts, so two phases are only live together in a hand-over
            for (let i = 1; i < phases.length; i++) {
                const a = phases[i - 1], b = phases[i];
                if (!Array.isArray(a?.push) || !Array.isArray(b?.push)) continue;
                if (b.push[0] < a.push[1]) bad.push(`hands.${side}[${i}] overlaps hands.${side}[${i - 1}]`);
                else if (b.push[0] < (a.release?.[0] ?? a.push[1])) bad.push(`hands.${side}[${i}] starts before hands.${side}[${i - 1}] releases`);
            }
        }
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

// ── frontKnee (Bret 244-258, from the front): push up with both hands, bring a knee under, hand on the knee, stand. Replaces
// the prone path that has no hand route. Rough keys for G2a, untuned. A prone body lies torso π - 1.62, legs trailing (negative).
const PUSHUP = { t: 0.22, hip: 22, torso: P - 1.15, farThigh: -1.40, farShin: -1.55, nearThigh: -1.35, nearShin: -1.50, farArm: 0.15, farFore: 0.10, nearArm: 0.05, nearFore: 0.0 };
// all fours: the legacy prone rise's own key (thighs vertical, shins flat behind, arms straight down)
const ALLFOURS = { ...Skeleton.GETUP_POSES[2], t: 0.42 };
// one knee under, the far foot planted, the near hand on the mat ahead, the far hand reaching its knee (the flip pose)
const KNEEL_F = { t: 0.62, hip: 40, torso: P - 0.95, farThigh: 1.10, farShin: -0.25, nearThigh: 0.10, nearShin: -1.50, farArm: 0.80, farFore: 0.75, nearArm: 0.40, nearFore: 0.40 };
const PUSH_F = { ...PUSH, t: 0.82 };
const frontKneeBase = {
    from: 'prone', duration: 0.85, pivot: 'nearKnee', tags: ['knee'],
    // E2 / T3.4: both hands on the mat (a world point held under where each wrist is at t .12) while he pushes up to all fours
    // (key .42), released before the flip (.62); then the far hand goes to the far knee as before.
    hands: {
        near: [{ target: 'mat', space: 'world', push: [0.12, 0.46], w: 1, release: [0.46, 0.58] }],
        far: [
            { target: 'mat', space: 'world', push: [0.12, 0.46], w: 1, release: [0.46, 0.62] },
            // lead = the mat phase's release span, so the two ramps are complementary: the hand travels mat -> knee, never back to the keyed pose
            { target: 'farKnee', space: 'thighLocal', push: [0.62, 0.82], w: 1, release: [0.82, 0.92], lead: 0.16 },
        ],
    },
};
export const frontKnee = Object.freeze({
    id: 'frontKnee', ...frontKneeBase, flipAt: KNEEL_F.t,
    keys: keyed(Skeleton.GROUNDED_FLAT, PUSHUP, ALLFOURS, KNEEL_F),
    after: keyed(turnedPose(KNEEL_F), PUSH_F, { ...STAND, t: 1 }),
});
export const frontKneeStraight = Object.freeze({
    id: 'frontKneeStraight', ...frontKneeBase,
    keys: keyed(Skeleton.GROUNDED_FLAT, PUSHUP, ALLFOURS, KNEEL_F, PUSH_F, { ...STAND, t: 1 }),
});

// T3.5 / E3: the back-sell variants of frontKnee: same keys, the near hand stays on the back, so only the far hand's schedule
// (mat, then the far knee) remains. backTuck is two-handed and has no Back variant (see eligibleForBackSell).
const farHandOnly = (e) => ({ far: e.hands.far });
export const frontKneeBack = Object.freeze({ ...frontKnee, id: 'frontKneeBack', tags: ['knee', 'backSell'], hands: farHandOnly(frontKnee) });
export const frontKneeBackStraight = Object.freeze({ ...frontKneeStraight, id: 'frontKneeBackStraight', tags: ['knee', 'backSell'], hands: farHandOnly(frontKneeStraight) });

/** True when the entry schedules the near hand at all (any phase). */
export const usesNearHand = (entry) => {
    const n = entry?.hands?.near;
    return Array.isArray(n) ? n.length > 0 : !!n;
};
/** A back sell keeps the near hand on the back, so only an entry that never uses it can play with one (T4.0's chooseGetUp reads this). */
export const eligibleForBackSell = (entry) => !!entry && !usesNearHand(entry);

// ── backTuck: today's rise from the back with the weight added: both hands propped behind, the feet drawn in under him, the
// body leans forward over them and the hands leave the mat to the knees as he stands. No turn (a fresh wrestler who is
// already facing the opponent). Rough keys for G2a, untuned.
const PROP = { t: 0.30, hip: 16, torso: P + 0.45, farThigh: 1.42, farShin: 1.58, nearThigh: 1.34, nearShin: 1.52, farArm: -0.38, farFore: -0.55, nearArm: -0.30, nearFore: -0.48 };
const TUCK = { t: 0.52, hip: 28, torso: P + 0.12, farThigh: 1.85, farShin: -0.45, nearThigh: 1.75, nearShin: -0.55, farArm: -0.30, farFore: -0.40, nearArm: -0.25, nearFore: -0.35 };
const LEAN = { t: 0.74, hip: 52, torso: P - 0.50, farThigh: 1.25, farShin: -0.20, nearThigh: 1.05, nearShin: -0.30, farArm: 0.85, farFore: 0.90, nearArm: 0.75, nearFore: 0.80 };
export const backTuck = Object.freeze({
    id: 'backTuck', from: 'supine', duration: 0.85, tags: ['noTurn'],
    // E2 / T3.4: both hands on the mat behind him (a world point held under each wrist at t .08) through the tuck (key .52),
    // then both to their knees as the lean takes him over his feet (key .74).
    hands: {
        near: [
            { target: 'mat', space: 'world', push: [0.08, 0.50], w: 1, release: [0.50, 0.66] },
            { target: 'nearKnee', space: 'thighLocal', push: [0.66, 0.84], w: 1, release: [0.84, 0.96], lead: 0.16 },
        ],
        far: [
            { target: 'mat', space: 'world', push: [0.08, 0.50], w: 1, release: [0.50, 0.66] },
            { target: 'farKnee', space: 'thighLocal', push: [0.66, 0.84], w: 1, release: [0.84, 0.96], lead: 0.16 },
        ],
    },
    keys: keyed(Skeleton.GROUNDED_SUPINE, PROP, TUCK, LEAN, { ...STAND, t: 1 }),
});

/** The turn / straight variants of each get-up family, for the dev override `?getups=v1&getup=<family>` (until chooseGetUp, T4.0). */
export const GETUP_SETS = Object.freeze({
    backKneeHurt: { from: 'supine', turn: backKneeHurt, straight: backKneeHurtStraight, turnBack: backKneeHurtBack, straightBack: backKneeHurtBackStraight },
    frontKnee: { from: 'prone', turn: frontKnee, straight: frontKneeStraight, turnBack: frontKneeBack, straightBack: frontKneeBackStraight },
    backTuck: { from: 'supine', straight: backTuck },
});

export const GETUPS = Object.freeze({ legacySupine, legacyProne, backKneeHurt, backKneeHurtStraight, backKneeHurtBack, backKneeHurtBackStraight, frontKnee, frontKneeStraight, frontKneeBack, frontKneeBackStraight, backTuck });
