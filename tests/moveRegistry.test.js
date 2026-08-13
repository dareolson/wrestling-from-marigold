// Move registry cross-checks.
//
// src/moves/registry.js is deliberately dependency-free data, so it cannot
// verify itself at runtime. These tests are what give it teeth: they import
// the real MOVE_DEFS, STAMINA_DRAIN, Wrestler prototype, character kits, and
// clip modules, and assert the registry still describes them accurately.
//
// The failure these exist to prevent is the one that actually happened: Arena
// carried its own copy of each character's moveSet, it drifted from the
// character module's copy, and nothing noticed because the module copy was
// dead code.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MOVE_SPECS, MOVE_IDS, MOVE_CATEGORY, KIT_ELIGIBLE_IDS,
    getMoveSpec, movesInCategory, validateKit, orphanedMoves,
} from '../src/moves/registry.js';
import Wrestler, { MOVE_DEFS, STAMINA_DRAIN } from '../src/Wrestler.js';
import { george } from '../src/characters/george.js';
import { thesz } from '../src/characters/thesz.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';

const CATEGORIES = new Set(Object.values(MOVE_CATEGORY));

// ─── Spec integrity ───────────────────────────────────────────────────────

test('every spec declares a known category', () => {
    for (const id of MOVE_IDS) {
        assert.ok(CATEGORIES.has(MOVE_SPECS[id].category),
            `${id} has unknown category "${MOVE_SPECS[id].category}"`);
    }
});

test('every spec carries the full field set', () => {
    const fields = ['category', 'clip', 'executor', 'damageKey', 'poseSeq',
                    'legacyFallback', 'kitGated', 'trigger', 'ai'];
    for (const id of MOVE_IDS) {
        for (const f of fields) {
            assert.ok(f in MOVE_SPECS[id], `${id} is missing field "${f}"`);
        }
        assert.ok(Array.isArray(MOVE_SPECS[id].ai), `${id}.ai must be an array`);
        assert.ok(MOVE_SPECS[id].trigger.length > 0, `${id} has an empty trigger note`);
    }
});

test('every declared executor exists on Wrestler.prototype', () => {
    for (const id of MOVE_IDS) {
        const { executor } = MOVE_SPECS[id];
        if (executor === null) continue;
        assert.equal(typeof Wrestler.prototype[executor], 'function',
            `${id} declares executor ${executor}, which is not a Wrestler method`);
    }
});

test('every declared damageKey resolves in STAMINA_DRAIN', () => {
    for (const id of MOVE_IDS) {
        const { damageKey } = MOVE_SPECS[id];
        if (damageKey === null) continue;
        assert.equal(typeof STAMINA_DRAIN[damageKey], 'number',
            `${id} declares damageKey "${damageKey}", absent from STAMINA_DRAIN`);
    }
});

test('no STAMINA_DRAIN value is dead — every one is claimed by a move', () => {
    const claimed = new Set(MOVE_IDS.map(id => MOVE_SPECS[id].damageKey).filter(Boolean));
    for (const key of Object.keys(STAMINA_DRAIN)) {
        assert.ok(claimed.has(key),
            `STAMINA_DRAIN.${key} is not claimed by any move in the registry`);
    }
});

// ─── Registry vs MOVE_DEFS ────────────────────────────────────────────────

test('every MOVE_DEFS entry is registered', () => {
    for (const id of Object.keys(MOVE_DEFS)) {
        assert.ok(id in MOVE_SPECS,
            `MOVE_DEFS.${id} has choreography but no registry entry`);
    }
});

test('poseSeq flags match MOVE_DEFS reality', () => {
    for (const id of MOVE_IDS) {
        const declared = MOVE_SPECS[id].poseSeq;
        const actual   = Boolean(MOVE_DEFS[id]?.poseSeq);
        assert.equal(declared, actual,
            `${id} declares poseSeq:${declared} but MOVE_DEFS ${actual ? 'has' : 'has no'} poseSeq`);
    }
});

// A migrated move keeping its MOVE_DEFS.poseSeq means two timing sources for
// one move — the trap the hammerlock migration called out when it deleted
// MOVE_DEFS.hammerlock. It is allowed only when the poseSeq exists to serve a
// named fallback path, which is jab's case: _doJabLegacy drives a Wrestler
// constructed without a MoveRuntime. Anything else is drift.
test('a migrated move keeps a poseSeq only to serve a named fallback', () => {
    for (const id of MOVE_IDS) {
        const spec = MOVE_SPECS[id];
        if (!spec.clip) continue;

        if (spec.legacyFallback === null) {
            assert.equal(spec.poseSeq, false,
                `${id} has clip "${spec.clip}" and a MOVE_DEFS poseSeq but names no fallback — two timing sources`);
            assert.equal(MOVE_DEFS[id], undefined,
                `${id} is migrated with no fallback but still has a MOVE_DEFS entry`);
        } else {
            assert.equal(spec.poseSeq, true,
                `${id} names fallback ${spec.legacyFallback} but has no poseSeq for it to run`);
            assert.equal(typeof Wrestler.prototype[spec.legacyFallback], 'function',
                `${id} names fallback ${spec.legacyFallback}, which is not a Wrestler method`);
        }
    }
});

// Only a migrated move can have a fallback; an unmigrated move's legacy path
// is its only path, not a "fallback", and labelling it one would hide that it
// still needs migrating.
test('unmigrated moves declare no fallback', () => {
    for (const id of MOVE_IDS) {
        const spec = MOVE_SPECS[id];
        if (spec.clip) continue;
        assert.equal(spec.legacyFallback, null,
            `${id} is not migrated, so ${spec.legacyFallback} is its only path, not a fallback`);
    }
});

// ─── Registry vs the actual clip modules ──────────────────────────────────

// This compares the registry against the SAME list Arena registers from
// (animation/clips/index.js), so a migrated move that never gets registered
// fails here. Asserting against a hand-written list of imports in this file
// would prove only that the test file and the registry agree with each other.
test('every registered clip is a registry move, and vice versa', () => {
    const registeredIds = REGISTERED_MOVE_CLIPS.map(c => c.id).sort();
    const declaredIds   = MOVE_IDS.filter(id => MOVE_SPECS[id].clip !== null).sort();

    assert.deepEqual(registeredIds, declaredIds,
        'the clips Arena registers and the registry\'s migrated moves disagree — ' +
        'update animation/clips/index.js and the registry `clip` fields together');
});

test('registered clips carry the ids the registry expects', () => {
    for (const clip of REGISTERED_MOVE_CLIPS) {
        const spec = MOVE_SPECS[clip.id];
        assert.ok(spec, `clip "${clip.id}" is registered but has no registry entry`);
        assert.equal(spec.clip, clip.id,
            `${clip.id} registers under a different id than its registry clip field`);
    }
});

test('no duplicate registrations', () => {
    const ids = REGISTERED_MOVE_CLIPS.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate clip registration in ${ids.join(', ')}`);
});

// ─── Character kits ───────────────────────────────────────────────────────

test('George\'s kit is valid', () => {
    assert.deepEqual(validateKit(george.moveSet, 'george'), []);
});

test('Thesz\'s kit is valid', () => {
    assert.deepEqual(validateKit(thesz.moveSet, 'thesz'), []);
});

// Locks in the reconciliation. Thesz's module list had silently lost these
// three; if a future edit drops them again this fails instead of quietly
// nerfing him — and hammerlock in particular is the only paired-clip move in
// the default Thesz-vs-George matchup.
test('Thesz keeps the moves that were previously Arena-only', () => {
    for (const id of ['hammerlock', 'backBodyDrop', 'kneeDrop']) {
        assert.ok(thesz.moveSet.includes(id), `thesz.moveSet lost ${id}`);
    }
});

test('kit sizes are what the roster expects', () => {
    assert.equal(george.moveSet.length, 17);
    assert.equal(thesz.moveSet.length, 16);
});

test('the roster keeps its intended differentiation', () => {
    // George brawls, Thesz converts — these are the identity moves, not an
    // arbitrary snapshot.
    assert.ok(george.moveSet.includes('piledriver') && george.moveSet.includes('headbutt'),
        'George lost a brawler identity move');
    assert.ok(!thesz.moveSet.includes('piledriver') && !thesz.moveSet.includes('headbutt'),
        'Thesz picked up a brawler move — check this was deliberate');
    assert.ok(thesz.moveSet.includes('theszPress'), 'Thesz lost his finisher');
    assert.ok(!george.moveSet.includes('theszPress'), 'George picked up the Thesz press');
});

// ─── Validation behaviour ─────────────────────────────────────────────────

test('validateKit catches unknown move IDs', () => {
    const problems = validateKit(['jab', 'suplexx'], 'typo');
    assert.equal(problems.length, 1);
    assert.match(problems[0], /unknown move ID "suplexx"/);
});

test('validateKit catches duplicates', () => {
    const problems = validateKit(['jab', 'jab'], 'dupe');
    assert.equal(problems.length, 1);
    assert.match(problems[0], /duplicate move ID "jab"/);
});

test('validateKit rejects listing an ungated move in a kit', () => {
    // taunt is available to everyone; nothing reads moveSet for it, so putting
    // it in a kit implies a restriction that does not exist.
    const problems = validateKit(['taunt'], 'ungated');
    assert.equal(problems.length, 1);
    assert.match(problems[0], /available to every character/);
});

test('validateKit rejects a non-array', () => {
    assert.match(validateKit(undefined, 'missing')[0], /must be an array/);
});

test('validateKit passes a clean kit', () => {
    assert.deepEqual(validateKit(['jab', 'headbutt', 'pin'], 'ok'), []);
});

// ─── Orphans ──────────────────────────────────────────────────────────────

// armBar and ankleLock are fully implemented — poses, executors, damage
// values, and live lockup gating in Arena — but neither character's kit lists
// them, so no one can reach them. Asserted rather than fixed: adding them to a
// kit is a roster decision. If that decision gets made, this test is the
// reminder to update it.
test('the only unreachable moves are the known armBar/ankleLock pair', () => {
    const orphans = orphanedMoves(george.moveSet, thesz.moveSet);
    assert.deepEqual(orphans.sort(), ['ankleLock', 'armBar'],
        'the set of implemented-but-unreachable moves changed');
});

// ─── Helpers ──────────────────────────────────────────────────────────────

test('getMoveSpec returns specs and undefined for unknowns', () => {
    assert.equal(getMoveSpec('jab').category, MOVE_CATEGORY.STRIKE);
    assert.equal(getMoveSpec('nope'), undefined);
});

test('movesInCategory partitions the registry exactly', () => {
    const total = Object.values(MOVE_CATEGORY)
        .reduce((n, c) => n + movesInCategory(c).length, 0);
    assert.equal(total, MOVE_IDS.length, 'a move is in no category or two');
});

test('KIT_ELIGIBLE_IDS excludes the universally-available moves', () => {
    for (const id of ['taunt', 'turnbuckleTaunt', 'divingElbow', 'topDive']) {
        assert.ok(!KIT_ELIGIBLE_IDS.includes(id), `${id} should not be kit-gated`);
    }
    assert.ok(KIT_ELIGIBLE_IDS.includes('jab'));
});
