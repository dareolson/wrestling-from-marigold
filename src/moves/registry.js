// Move registry — the canonical list of move IDs and what each one is.
//
// This is DATA, not behavior, in the same spirit as src/animation/clips/*.
// It answers "which moves exist, what kind of move is this, which clip and
// executor and damage key belong to it" — nothing more. It deliberately does
// NOT encode eligibility rules (range checks, target states, input gating).
// Those live in Wrestler/Arena/moveDecision/AIHandler and re-encoding them
// here would create exactly the third source of truth this registry exists to
// eliminate. The `trigger` field is a prose pointer to the function that owns
// the real rule, so a reader can find it; it is documentation, not logic.
//
// Nothing here imports from Wrestler.js or Arena.js. Keeping the registry
// dependency-free avoids an import cycle (Wrestler is what would consume it)
// and lets tests/moveRegistry.test.js cross-check it against the real
// MOVE_DEFS, STAMINA_DRAIN, Wrestler prototype, and character kits from the
// outside. The tests are what give this file teeth — if a move is renamed,
// loses its executor, or drifts out of a kit, they fail.

/** Broad shape of a move. Used for grouping and validation, not dispatch. */
export const MOVE_CATEGORY = {
    STRIKE:  'strike',   // contact strike; damage on an impact beat
    THROW:   'throw',    // attacker takes the defender off their feet
    HOLD:    'hold',     // sustained submission/rest hold with escape mashing
    AERIAL:  'aerial',   // attacker leaves the mat before contact
    GRAPPLE: 'grapple',  // clinch/positional; sets up other moves
    PIN:     'pin',      // cover for the count
    TAUNT:   'taunt',    // no contact, no damage
};

const C = MOVE_CATEGORY;

/**
 * Every move ID the game knows about.
 *
 *   category  — MOVE_CATEGORY value
 *   clip      — seekable clip ID (src/animation/clips/), or null if the move
 *               still runs the legacy MOVE_DEFS.poseSeq + delayedCall path
 *   executor  — Wrestler method that performs it, or null when the move is
 *               run inline rather than through a dedicated method
 *   damageKey — key into Wrestler.js's STAMINA_DRAIN, or null for no damage
 *   poseSeq   — true when MOVE_DEFS carries choreography for this ID
 *   legacyFallback
 *             — for a migrated move that deliberately KEEPS its poseSeq: the
 *               Wrestler method that runs the old path. The two migrated moves
 *               resolved this differently and both are correct: hammerlock
 *               deleted MOVE_DEFS.hammerlock outright, while jab keeps
 *               MOVE_DEFS.jab so _doJabLegacy can drive a Wrestler built
 *               without a MoveRuntime (unit tests, standalone use). Null for
 *               every unmigrated move — they have only the legacy path, which
 *               is not a "fallback". The tests reject a migrated move that
 *               keeps a poseSeq without naming the method that justifies it,
 *               since that is the genuine two-timing-sources trap.
 *   kitGated  — true when something checks `moveSet.includes(id)`. False means
 *               the move is available to every character regardless of kit.
 *   trigger   — prose pointer to the function owning the real eligibility rule
 *   ai        — coarse tags describing when the move is relevant; descriptive
 *               only, nothing dispatches on these
 */
export const MOVE_SPECS = {
    // ── Strikes ───────────────────────────────────────────────────────────
    jab: {
        category: C.STRIKE, clip: 'jab', executor: '_doJab',
        damageKey: 'jab', poseSeq: true, legacyFallback: '_doJabLegacy', kitGated: true,
        trigger: 'tryPower() -> resolvePowerMove() — standing/blocking target inside jabReach',
        ai: ['opener', 'pointBlank'],
    },
    headbutt: {
        category: C.STRIKE, clip: null, executor: '_doHeadbutt',
        damageKey: 'headbutt', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryPower() -> resolvePowerMove() — staggered target inside reach',
        ai: ['vsStaggered', 'pointBlank'],
    },
    kneeLift: {
        category: C.STRIKE, clip: null, executor: '_doKneeLift',
        damageKey: 'kneeLift', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryPower() — hold up at point-blank vs a standing opponent; overrides the jab',
        ai: ['pointBlank', 'causesStagger'],
    },
    clothesline: {
        category: C.STRIKE, clip: null, executor: '_doClothesline',
        damageKey: 'clothesline', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryAction() — in range, incl. the returning-runner answer',
        ai: ['antiRunner', 'knockdown'],
    },
    dropkick: {
        category: C.STRIKE, clip: null, executor: '_doDropkick',
        damageKey: 'dropkick', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryPower() -> resolvePowerMove() — standing/blocking target inside medReach',
        ai: ['midRange', 'knockdown'],
    },
    doubleAxeHandle: {
        category: C.STRIKE, clip: null, executor: '_doDoubleAxeHandle',
        damageKey: 'doubleAxeHandle', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryRunningAttack() — the running attack, not the standing power button',
        ai: ['pointBlank'],
    },

    // ── Throws ────────────────────────────────────────────────────────────
    bodySlam: {
        category: C.THROW, clip: null, executor: '_doBodySlam',
        damageKey: 'bodySlam', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryAction() — grapple range',
        ai: ['grappleFinish', 'knockdown'],
    },
    piledriver: {
        category: C.THROW, clip: null, executor: '_doPiledriver',
        damageKey: 'piledriver', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryAction() — grapple range, preferred over bodySlam',
        ai: ['grappleFinish', 'knockdown', 'heavy'],
    },
    suplex: {
        category: C.THROW, clip: null, executor: '_doSuplex',
        damageKey: 'suplex', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'Arena lockup resolution — up',
        ai: ['lockup', 'knockdown'],
    },
    armDrag: {
        category: C.THROW, clip: null, executor: '_doArmDrag',
        damageKey: 'armDrag', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'Arena lockup resolution — power',
        ai: ['lockup'],
    },
    backBodyDrop: {
        category: C.THROW, clip: null, executor: '_doBackBodyDrop',
        damageKey: 'backBodyDrop', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryAction() — directional answer to a returning runner',
        ai: ['antiRunner', 'knockdown'],
    },

    // ── Holds ─────────────────────────────────────────────────────────────
    hammerlock: {
        category: C.HOLD, clip: 'hammerlock', executor: '_doHammerlock',
        damageKey: 'hammerlock', poseSeq: false, legacyFallback: null, kitGated: true,
        trigger: 'Arena lockup/finisher handling — finisher input at grapple range',
        ai: ['paired', 'holdDrain'],
    },
    sleeperHold: {
        category: C.HOLD, clip: null, executor: '_doSleeperHold',
        damageKey: 'sleeperHold', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryFinisher() — standing or blocking target in reach',
        ai: ['holdDrain', 'vsBlocking'],
    },
    headlock: {
        category: C.HOLD, clip: null, executor: '_doHeadlock',
        damageKey: 'headlock', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'Arena lockup resolution — down',
        ai: ['lockup', 'holdDrain'],
    },
    armBar: {
        category: C.HOLD, clip: null, executor: '_doArmBar',
        damageKey: 'armBar', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'Arena lockup resolution — right',
        ai: ['lockup', 'holdDrain'],
    },
    ankleLock: {
        category: C.HOLD, clip: null, executor: '_doAnkleLock',
        damageKey: 'ankleLock', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'Arena lockup resolution — left',
        ai: ['lockup', 'holdDrain'],
    },

    // ── Aerials ───────────────────────────────────────────────────────────
    elbowDrop: {
        category: C.AERIAL, clip: null, executor: '_doElbowDrop',
        damageKey: 'elbowDrop', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryPower() -> resolvePowerMove() — down/possum target in reach',
        ai: ['vsDown'],
    },
    kneeDrop: {
        category: C.AERIAL, clip: null, executor: '_doKneeDrop',
        damageKey: 'kneeDrop', poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryPower() — hold down vs a down/possum opponent',
        ai: ['vsDown'],
    },
    theszPress: {
        category: C.AERIAL, clip: null, executor: '_doTheszPress',
        damageKey: 'theszPress', poseSeq: false, legacyFallback: null, kitGated: true,
        trigger: 'tryFinisher() — standing/staggered target beyond reach, within 300*s',
        ai: ['finisher', 'lunge', 'intoPin'],
    },
    divingElbow: {
        category: C.AERIAL, clip: null, executor: '_doDive',
        damageKey: 'divingElbow', poseSeq: false, legacyFallback: null, kitGated: false,
        trigger: 'tryDive() — dive from the turnbuckle; available to every character',
        ai: ['turnbuckle', 'vsDown'],
    },
    topDive: {
        category: C.AERIAL, clip: null, executor: '_doTopDive',
        damageKey: 'topDive', poseSeq: false, legacyFallback: null, kitGated: false,
        trigger: 'tryDive() — top-rope dive; available to every character',
        ai: ['turnbuckle', 'heavy'],
    },

    // ── Grapple / pin / taunts ────────────────────────────────────────────
    irishWhip: {
        category: C.GRAPPLE, clip: null, executor: '_doIrishWhip',
        damageKey: null, poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'Arena lockup resolution — left/right',
        ai: ['lockup', 'setup'],
    },
    pin: {
        // No dedicated executor: tryPower() sets the states and runs the pose
        // sequence inline. Damage is the count, not a stamina drain.
        category: C.PIN, clip: null, executor: null,
        damageKey: null, poseSeq: true, legacyFallback: null, kitGated: true,
        trigger: 'tryAction() — down/possum target in reach; runs the pose sequence inline',
        ai: ['vsDown', 'winCondition'],
    },
    taunt: {
        category: C.TAUNT, clip: null, executor: '_doTaunt',
        damageKey: null, poseSeq: true, legacyFallback: null, kitGated: false,
        trigger: 'tryFinisher() — taunt input at range; available to every character',
        ai: ['crowd'],
    },
    turnbuckleTaunt: {
        category: C.TAUNT, clip: null, executor: '_doTurnbuckleTaunt',
        damageKey: null, poseSeq: true, legacyFallback: null, kitGated: false,
        trigger: 'tryDive() — taunt while on the turnbuckle; available to every character',
        ai: ['crowd', 'turnbuckle'],
    },
};

/** Every known move ID. */
export const MOVE_IDS = Object.freeze(Object.keys(MOVE_SPECS));

/** Move IDs a character kit is allowed to list (i.e. the kit-gated ones). */
export const KIT_ELIGIBLE_IDS = Object.freeze(
    MOVE_IDS.filter(id => MOVE_SPECS[id].kitGated),
);

/** Look up one spec. Returns undefined for unknown IDs — callers decide. */
export function getMoveSpec(id) {
    return MOVE_SPECS[id];
}

/** All move IDs in a category. */
export function movesInCategory(category) {
    return MOVE_IDS.filter(id => MOVE_SPECS[id].category === category);
}

/**
 * Validate one character's kit against the registry.
 *
 * Returns an array of problem strings; empty means valid. Catches the two
 * failure modes that actually bit this project: an ID that no longer exists
 * (typo or rename), and the same ID listed twice.
 *
 * `label` just names the kit in the messages.
 */
export function validateKit(kit, label = 'kit') {
    const problems = [];

    if (!Array.isArray(kit)) {
        return [`${label}: moveSet must be an array, got ${typeof kit}`];
    }

    const seen = new Set();
    for (const id of kit) {
        if (!(id in MOVE_SPECS)) {
            problems.push(`${label}: unknown move ID "${id}"`);
            continue;
        }
        if (seen.has(id)) {
            problems.push(`${label}: duplicate move ID "${id}"`);
            continue;
        }
        seen.add(id);

        if (!MOVE_SPECS[id].kitGated) {
            problems.push(
                `${label}: "${id}" is available to every character ` +
                `(nothing checks moveSet for it) — listing it in a kit is misleading`,
            );
        }
    }

    return problems;
}

/**
 * Kit-gated moves that no supplied kit lists — i.e. fully implemented moves
 * that are unreachable in the current roster. Pass every character's kit.
 *
 * As of 2026-08-10 this is armBar and ankleLock: both have poses, executors,
 * damage values, and live lockup gating in Arena, and neither George nor
 * Thesz can ever reach them. Surfaced rather than auto-fixed — adding them to
 * a kit is a roster decision, not a lint fix.
 */
export function orphanedMoves(...kits) {
    const claimed = new Set(kits.flat());
    return KIT_ELIGIBLE_IDS.filter(id => !claimed.has(id));
}
