// Down-state sells (MOVE_REFINEMENT_METHOD.md, "a shared selling library",
// Derek 2026-10-15): what a wrestler does on the mat after a move puts him
// there, instead of lying still. Data plus a pure sampler; Wrestler plans and
// plays them, Skeleton.updateGroundedReach draws them.
//
// A sell is grounded keyposes (the channels of Skeleton.GROUNDED_FLAT:
// hip height and absolute segment angles, see _applyGrounded) written as
// OFFSETS from the lying pose. The first and last keys are the lying pose
// itself, so every sell ends exactly where the get-up starts: no new pops.
//
// Angle sense, facing right (the renderer mirrors for facing left):
//   supine (head away from facing): torso − curls the shoulders up, + presses
//     them down; thigh + raises the knee; shin − (relative to the thigh)
//     bends the knee; arm + raises the arm off the mat.
//   prone (head toward facing): torso + lifts the chest; arm + swings the
//     hand under the shoulder; shin − lifts the heel (the knee bends the
//     other way from supine).
// Prone is NOT supine mirrored: mirroring keeps up as up, which would bend a
// face-down man's knees backward. Each lying has its own sells.
//
// `reach` (clutch sells): per key, how far each named hand has gone from its
// posed place to the hurt part (0–1). The hand's target is a point on the
// body (CLUTCH_TARGETS); Skeleton solves the arm onto it each frame, so it
// fits every cast's own arm length.

const SUPINE_CLUTCH = {
    // Near knee drawn up, curled forward, both hands on it.
    knee: { d: { nearThigh: 1.0, nearShin: -1.0, farThigh: 0.15, farShin: -0.1, torso: -0.35, hip: 2 }, hands: { near: 'nearKnee', far: 'nearKnee' } },
    // Curled up, both hands to the head.
    head: { d: { torso: -0.30, nearThigh: 0.5, nearShin: -0.5, farThigh: 0.3, farShin: -0.3 }, hands: { near: 'head', far: 'head' } },
    // Far hand across to the hurt near shoulder; the near arm stays limp.
    arm: { d: { torso: -0.18, farThigh: 0.4, farShin: -0.4, nearArm: 0.15 }, hands: { far: 'nearShoulder' } },
    // Arched off the mat, knees up, near hand at the small of the back.
    back: { d: { hip: 8, torso: 0.18, nearThigh: 0.6, nearShin: -0.5, farThigh: 0.5, farShin: -0.45 }, hands: { near: 'nearHip' } },
    // Curled over the chest, both hands on it.
    chest: { d: { torso: -0.22, nearThigh: 0.5, nearShin: -0.45, farThigh: 0.35, farShin: -0.3 }, hands: { near: 'chest', far: 'chest' } },
};

const PRONE_CLUTCH = {
    // Face down he can't reach the knee: heel drawn up, pushing up on the
    // far arm, near hand back to the hip.
    knee: { d: { nearShin: -1.1, torso: 0.25, hip: 2, farArm: 1.2, farFore: 1.3 }, hands: { near: 'nearHip' } },
    head: { d: { torso: 0.30, farArm: 1.2, farFore: 1.3, nearShin: -0.4 }, hands: { near: 'head' } },
    arm: { d: { torso: 0.20, nearShin: -0.5, nearArm: 0.4 }, hands: { far: 'nearShoulder' } },
    back: { d: { torso: 0.15, hip: 3, nearShin: -0.6, farShin: -0.3, farArm: 1.0, farFore: 1.2 }, hands: { near: 'nearHip' } },
    chest: { d: { torso: 0.35, hip: 4, farArm: 1.3, farFore: 1.4, nearShin: -0.4 }, hands: { near: 'chest' } },
};

// A clutch: reach in, hold, a squeeze, hold, let go.
function clutchKeys(spec) {
    const hold = (k) => Object.fromEntries(Object.entries(spec.d).map(([c, v]) => [c, v * k]));
    const w = (v) => Object.fromEntries(Object.keys(spec.hands).map(side => [side, v]));
    return [
        { t: 0, d: {}, reach: w(0) },
        { t: 0.25, d: hold(1), reach: w(1) },
        { t: 0.45, d: hold(1.25), reach: w(1) },
        { t: 0.70, d: hold(1), reach: w(1) },
        { t: 1, d: {}, reach: w(0) },
    ];
}

// Rolling over: up onto the side (hips higher, knees bent), then the body is
// the other lying from there on. At the swap every segment angle is the
// same: a supine pose P facing f draws where the prone pose −P facing −f
// does. Only the art turns over, and with it the 3/4 shoulder and hip
// sockets, which sit on the other side of the spine face down (the near
// shoulder moves ~45 px). So the arms stay along the body there: a
// shoulder rolling over reads, a raised arm jumping does not.
const ON_SIDE = { hip: 14, nearThigh: 0.35, nearShin: -0.5, farThigh: 0.25, farShin: -0.4, nearArm: 0.05, nearFore: 0.15 };
const negate = d => Object.fromEntries(Object.entries(d).map(([c, v]) => [c, c === 'hip' ? v : -v]));

export const SELLS = {
    supine: {
        // Back arching, knees drawing up, a slow sway.
        writhe: {
            duration: 1.4, keys: [
                { t: 0, d: {} },
                { t: 0.22, d: { hip: 6, torso: 0.12, nearThigh: 0.7, nearShin: -0.6, farThigh: 0.4, farShin: -0.35, nearArm: 0.3, farArm: 0.3 } },
                { t: 0.46, d: { hip: 2, torso: -0.15, nearThigh: 0.35, nearShin: -0.2, farThigh: 0.8, farShin: -0.7, nearArm: 0.6, nearFore: 0.9 } },
                { t: 0.72, d: { hip: 7, torso: 0.15, nearThigh: 0.8, nearShin: -0.7, farThigh: 0.5, farShin: -0.4, farArm: 0.4 } },
                { t: 1, d: {} },
            ],
        },
        // Flair's flop on his back (Flair sheet 298–306): legs kicking in
        // turn, arms flailing, head coming up.
        kick: {
            duration: 1.3, keys: [
                { t: 0, d: {} },
                { t: 0.12, d: { torso: -0.25, nearThigh: 1.0, nearShin: -0.2, farThigh: 0.3, farShin: -0.3, nearArm: 0.8, farArm: 0.5, nearFore: 1.0 } },
                { t: 0.26, d: { torso: -0.20, nearThigh: 0.2, nearShin: -0.2, farThigh: 1.0, farShin: -0.2, nearArm: 0.4, farArm: 1.1, farFore: 1.2 } },
                { t: 0.40, d: { torso: -0.25, nearThigh: 0.9, nearShin: -0.25, farThigh: 0.25, farShin: -0.3, nearArm: 1.0, farArm: 0.4 } },
                { t: 0.54, d: { torso: -0.20, nearThigh: 0.3, nearShin: -0.3, farThigh: 0.9, farShin: -0.25, nearArm: 0.5, farArm: 1.0 } },
                { t: 0.68, d: { torso: -0.15, nearThigh: 0.7, nearShin: -0.3, farThigh: 0.2, farShin: -0.2, nearArm: 0.7, farArm: 0.3 } },
                { t: 0.82, d: { torso: -0.05, nearThigh: 0.3, nearShin: -0.2, farThigh: 0.3, farShin: -0.2 } },
                { t: 1, d: {} },
            ],
        },
        roll: {
            duration: 0.9, to: 'prone', swapAt: 0.5, keys: [
                { t: 0, d: {} },
                { t: 0.5, d: ON_SIDE },
            ], after: [
                { t: 0.5, d: negate(ON_SIDE) },
                { t: 1, d: {} },
            ],
        },
        clutch: SUPINE_CLUTCH,
    },
    prone: {
        // Tries to push up, sags, tries again.
        stir: {
            duration: 1.2, keys: [
                { t: 0, d: {} },
                { t: 0.30, d: { hip: 4, torso: 0.45, nearArm: 1.3, nearFore: 1.4, farArm: 1.3, farFore: 1.4, nearShin: -0.6 } },
                { t: 0.55, d: { hip: 1, torso: 0.15, nearArm: 0.9, nearFore: 1.0, farArm: 0.9, farFore: 1.0, nearShin: -0.3 } },
                { t: 0.78, d: { hip: 3, torso: 0.32, nearArm: 1.2, nearFore: 1.3, farArm: 1.1, farFore: 1.2, farShin: -0.5 } },
                { t: 1, d: {} },
            ],
        },
        roll: {
            duration: 0.9, to: 'supine', swapAt: 0.5, keys: [
                { t: 0, d: {} },
                { t: 0.5, d: negate(ON_SIDE) },
            ], after: [
                { t: 0.5, d: ON_SIDE },
                { t: 1, d: {} },
            ],
        },
        clutch: PRONE_CLUTCH,
    },
};

// Limb-aware clutch (PLAN_MOVE_PERFORMANCE.md D3, T4.2). The clutch specs
// above are written for the NEAR limb. A hurt limb is anatomical ('lLeg'),
// and which grounded slot it occupies was MEASURED on the rendered rigs
// (tools/debug/grounded_slot_probe.mjs, 2026-10-23: george, thesz,
// thesz-procreate-v1, thesz/george/kowalski/guido-roster-v1, front3q-r1):
//   - Falling hands the upright pose to the grounded rig slot for slot
//     (Skeleton.groundedPoseFrom). The l-channels land in the slot
//     Skeleton.lChannelSide(facing) names; the r-channels in the other.
//     That held on every rig, both facings, both lyings.
//       rig family                         lLeg/lArm   rLeg/rArm
//       swaps at facing -1 (george,        f=+1 near   far
//         thesz-roster-v1, front3q-r1)     f=-1 far    near
//       stays near (thesz, procreate Lou,  f=+1 near   far
//         george/kowalski/guido-roster)    f=-1 near   far
//   - The lying (supine/prone) never changes the slot: the table is the same
//     in both. Raising nearThigh/farThigh on the grounded rig moves the near/
//     far sprite in every facing x lying.
//   - A roll draws supine P facing f and prone -P facing -f at the same slot
//     angles (ankles within 9-19 px on the rigs in play, 0 on front3q-r1: the
//     art turns over), so no sprite swaps places, but the BODY turned over:
//     the injured limb now occupies the other slot. Each roll flips it, on
//     every rig (lChannelSide alone would miss that on the stay-near rigs).
// So: slot = lChannelSide(facing when he went down) for an l-limb, the other
// for an r-limb, flipped once per roll since. `facing` here is the facing the
// trip started with, not the current one (a roll flips facing too).
const OTHER_SLOT = { near: 'far', far: 'near' };
export function groundedSlot(limb, facing, lying, skeleton, rolls = 0) {
    if (!limb) return null;
    const l = skeleton?.lChannelSide?.(facing) ?? 'near';
    const slot = limb.startsWith('l') ? l : OTHER_SLOT[l];
    return rolls % 2 ? OTHER_SLOT[slot] : slot;
}

const swapName = (name) => name.replace(/^(near|far)/, m => OTHER_SLOT[m]);
/** A clutch spec mirrored to the other side of the body: near<->far in the offsets, hands and targets. */
export function sideSwap(spec) {
    return {
        d: Object.fromEntries(Object.entries(spec.d).map(([c, v]) => [swapName(c), v])),
        hands: Object.fromEntries(Object.entries(spec.hands).map(([side, to]) => [OTHER_SLOT[side], swapName(to)])),
    };
}

/** Clutch spec for a body part on a lying, as a playable sell. `slot` 'far' clutches the far-side limb. */
export function clutchSell(lying, part, duration, slot = 'near') {
    const base = SELLS[lying].clutch[part] ?? SELLS[lying].clutch.chest;
    const spec = slot === 'far' ? sideSwap(base) : base;
    return { duration, keys: clutchKeys(spec), hands: spec.hands };
}

const smooth = u => u * u * (3 - 2 * u);

/**
 * Sample a sell's offsets at u (0–1): { d, reach } with each channel eased
 * per segment and scaled by amp. For a roll, pass the half you are in
 * (`keys` before swapAt, `after` from it).
 */
export function sampleSell(keys, u, amp = 1) {
    let a = keys[0], b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
        if (u >= keys[i].t && u <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
    }
    const k = b.t > a.t ? smooth(Math.min(1, Math.max(0, (u - a.t) / (b.t - a.t)))) : 0;
    const d = {};
    for (const c of new Set([...Object.keys(a.d), ...Object.keys(b.d)])) {
        d[c] = ((a.d[c] ?? 0) + ((b.d[c] ?? 0) - (a.d[c] ?? 0)) * k) * amp;
    }
    const reach = {};
    for (const side of new Set([...Object.keys(a.reach ?? {}), ...Object.keys(b.reach ?? {})])) {
        reach[side] = (a.reach?.[side] ?? 0) + ((b.reach?.[side] ?? 0) - (a.reach?.[side] ?? 0)) * k;
    }
    return { d, reach };
}

/** A lying pose plus sampled offsets. */
export function applyOffsets(base, d) {
    const g = { ...base };
    for (const [c, v] of Object.entries(d)) if (c in g) g[c] += v;
    return g;
}

// How each style sells (Derek: George theatrical, Lou economical). Weights
// pick the first sell; a theatrical seller may chain a second if the down
// timer has room. `amp` scales every offset, `pace` every duration.
export const SELL_STYLES = {
    economical: { amp: 0.75, pace: 0.8, chain: false, weights: { none: 0.3, clutch: 0.7 } },
    theatrical: { amp: 1.3, pace: 1.15, chain: true, weights: { clutch: 0.35, writhe: 0.25, kick: 0.2, roll: 0.2 } },
};

// ?aftermath=v2 (D4): from this severity up there is always at least a compact
// clutch (Derek, Q2); economical may still skip a reaction below it.
export const COMPACT_MIN_SEVERITY = 0.6;
export const COMPACT_CLUTCH_SEC = 0.55;

/**
 * Plan the sells for one trip to the mat: a list of { name, lying, part,
 * duration, amp } that fits inside `budget` seconds. `rand` is injectable for
 * tests. Prone has no kick and stirs instead of writhing. `limb` rides along
 * on each entry (with `rolls`, the rolls done before it) so the clutch can find
 * its slot. `compact` (?aftermath=v2, D4): a hurt of intensity >= 0.6 never
 * sells nothing; if the plan comes out empty, plan one compact clutch.
 */
export function planSells({ style = 'economical', lying, part = 'chest', intensity = 0.8, budget, rand = Math.random, limb = null, compact = false }) {
    const st = SELL_STYLES[style] ?? SELL_STYLES.economical;
    const amp = st.amp * (0.6 + 0.4 * intensity);
    const pick = (weights) => {
        const entries = Object.entries(weights);
        let r = rand() * entries.reduce((sum, [, w]) => sum + w, 0);
        for (const [name, w] of entries) { if ((r -= w) <= 0) return name; }
        return entries.at(-1)[0];
    };
    const durationOf = (name, ly) => (name === 'clutch' ? 1.2 : SELLS[ly][name].duration) * st.pace;
    const resolve = (name, ly) => (ly === 'prone' && name === 'writhe' ? 'stir' : ly === 'prone' && name === 'kick' ? 'stir' : name);

    const plan = [];
    let left = budget, ly = lying, rolls = 0;
    let name = pick(st.weights);
    while (name !== 'none') {
        name = resolve(name, ly);
        const duration = durationOf(name, ly);
        if (duration > left) break;
        plan.push({ name, lying: ly, part, duration, amp, limb, rolls });
        left -= duration;
        if (SELLS[ly][name].to) { ly = SELLS[ly][name].to; rolls++; }
        if (!st.chain || plan.length >= 2) break;
        // After a roll, clutch where it hurts; otherwise sometimes nothing more.
        name = plan.at(-1).name === 'roll' ? 'clutch' : pick({ none: 0.4, clutch: 0.4, writhe: 0.2 });
    }
    if (compact && !plan.length && intensity >= COMPACT_MIN_SEVERITY) {
        const duration = COMPACT_CLUTCH_SEC * st.pace;
        if (duration <= budget) plan.push({ name: 'clutch', lying, part, duration, amp, limb, rolls: 0, compact: true });
    }
    return plan;
}
