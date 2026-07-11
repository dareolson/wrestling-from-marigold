// Table-driven tests for the pure resolvePowerMove() decision logic
// extracted from Wrestler.tryPower. Plain node:test — no Phaser, no
// game objects, just the context shape the resolver expects:
//   { dist, scale, otherState, moveSet }
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePowerMove } from '../src/logic/moveDecision.js';

// Mirrors the thresholds inside moveDecision.js — kept local so a test
// failure here means the resolver's numbers actually changed.
const JAB_REACH = 85;
const REACH     = 110;
const MED_REACH = 220;

function decide({ dist, scale = 1, otherState, moveSet }) {
    return resolvePowerMove({ dist, scale, otherState, moveSet });
}

// ─── General branch coverage (one happy-path case per outcome) ─────────────

const branchCases = [
    {
        name: 'headbutt fires on staggered opponent within reach when available',
        dist: 50, scale: 1, otherState: 'staggered', moveSet: ['headbutt'],
        expected: 'headbutt',
    },
    {
        name: 'elbowDrop fires on down opponent within reach when available',
        dist: 50, scale: 1, otherState: 'down', moveSet: ['elbowDrop'],
        expected: 'elbowDrop',
    },
    {
        name: 'elbowDrop fires on possum opponent within reach when available',
        dist: 50, scale: 1, otherState: 'possum', moveSet: ['elbowDrop'],
        expected: 'elbowDrop',
    },
    {
        name: 'jab fires on standing opponent within jabReach when available',
        dist: 50, scale: 1, otherState: 'standing', moveSet: ['jab'],
        expected: 'jab',
    },
    {
        name: 'jab fires on blocking opponent within jabReach when available',
        dist: 50, scale: 1, otherState: 'blocking', moveSet: ['jab'],
        expected: 'jab',
    },
    {
        name: 'dropkick fires on standing opponent within medReach when available',
        dist: 150, scale: 1, otherState: 'standing', moveSet: ['dropkick'],
        expected: 'dropkick',
    },
    {
        name: 'dropkick fires on blocking opponent within medReach when available',
        dist: 150, scale: 1, otherState: 'blocking', moveSet: ['dropkick'],
        expected: 'dropkick',
    },
    {
        name: 'false when opponent state matches nothing, even with every move available',
        dist: 10, scale: 1, otherState: 'running',
        moveSet: ['headbutt', 'elbowDrop', 'jab', 'dropkick'],
        expected: false,
    },
    {
        name: 'false when moveSet is empty regardless of otherState/distance',
        dist: 10, scale: 1, otherState: 'standing', moveSet: [],
        expected: false,
    },
];

for (const c of branchCases) {
    test(c.name, () => {
        assert.strictEqual(decide(c), c.expected);
    });
}

// ─── Unavailable-move fallthrough ───────────────────────────────────────────

test('headbutt unavailable on staggered opponent falls through to false (no other branch matches "staggered")', () => {
    const result = decide({
        dist: 50, scale: 1, otherState: 'staggered',
        moveSet: ['elbowDrop', 'jab', 'dropkick'], // headbutt missing
    });
    assert.strictEqual(result, false);
});

test('elbowDrop unavailable on down opponent falls through to false (no other branch matches "down")', () => {
    const result = decide({
        dist: 50, scale: 1, otherState: 'down',
        moveSet: ['headbutt', 'jab', 'dropkick'], // elbowDrop missing
    });
    assert.strictEqual(result, false);
});

test('elbowDrop unavailable on possum opponent falls through to false', () => {
    const result = decide({
        dist: 50, scale: 1, otherState: 'possum',
        moveSet: ['headbutt', 'jab', 'dropkick'], // elbowDrop missing
    });
    assert.strictEqual(result, false);
});

test('jab unavailable on standing opponent within jabReach falls through to dropkick', () => {
    const result = decide({
        dist: 10, scale: 1, otherState: 'standing',
        moveSet: ['dropkick'], // jab missing, dist is within both jabReach and medReach
    });
    assert.strictEqual(result, 'dropkick');
});

test('jab unavailable on blocking opponent within jabReach falls through to dropkick', () => {
    const result = decide({
        dist: 10, scale: 1, otherState: 'blocking',
        moveSet: ['dropkick'],
    });
    assert.strictEqual(result, 'dropkick');
});

test('jab and dropkick both unavailable on standing opponent falls through to false', () => {
    const result = decide({
        dist: 10, scale: 1, otherState: 'standing',
        moveSet: ['headbutt', 'elbowDrop'], // jab/dropkick missing
    });
    assert.strictEqual(result, false);
});

test('dropkick unavailable beyond jabReach but within medReach falls through to false', () => {
    const result = decide({
        dist: 150, scale: 1, otherState: 'standing',
        moveSet: ['jab'], // dropkick missing, dist(150) > jabReach(85) so jab cannot fire either
    });
    assert.strictEqual(result, false);
});

// ─── Fallback order priority (when more than one branch's conditions hold) ──

test('jab takes priority over dropkick when both available and within jabReach', () => {
    const result = decide({
        dist: 10, scale: 1, otherState: 'standing',
        moveSet: ['dropkick', 'jab'], // order in array shouldn't matter
    });
    assert.strictEqual(result, 'jab');
});

test('headbutt takes priority when staggered and every move is available', () => {
    const result = decide({
        dist: 10, scale: 1, otherState: 'staggered',
        moveSet: ['headbutt', 'elbowDrop', 'jab', 'dropkick'],
    });
    assert.strictEqual(result, 'headbutt');
});

test('elbowDrop takes priority when down and every move is available', () => {
    const result = decide({
        dist: 10, scale: 1, otherState: 'down',
        moveSet: ['headbutt', 'elbowDrop', 'jab', 'dropkick'],
    });
    assert.strictEqual(result, 'elbowDrop');
});

// ─── Distance-threshold boundaries: below / at / above, per branch ─────────
// Each threshold is checked at scale 1 and at a non-1 scale to confirm the
// `* scale` multiplication is applied before the comparison.

const thresholdCases = [
    // headbutt uses `reach` (<=)
    { name: 'headbutt: just below reach @ scale 1 fires',   scale: 1, dist: REACH * 1 - 1, otherState: 'staggered', moveSet: ['headbutt'], expected: 'headbutt' },
    { name: 'headbutt: exactly at reach @ scale 1 fires',   scale: 1, dist: REACH * 1,     otherState: 'staggered', moveSet: ['headbutt'], expected: 'headbutt' },
    { name: 'headbutt: just above reach @ scale 1 fails',   scale: 1, dist: REACH * 1 + 1, otherState: 'staggered', moveSet: ['headbutt'], expected: false },
    { name: 'headbutt: just below reach @ scale 2 fires',   scale: 2, dist: REACH * 2 - 1, otherState: 'staggered', moveSet: ['headbutt'], expected: 'headbutt' },
    { name: 'headbutt: exactly at reach @ scale 2 fires',   scale: 2, dist: REACH * 2,     otherState: 'staggered', moveSet: ['headbutt'], expected: 'headbutt' },
    { name: 'headbutt: just above reach @ scale 2 fails',   scale: 2, dist: REACH * 2 + 1, otherState: 'staggered', moveSet: ['headbutt'], expected: false },

    // elbowDrop uses `reach` (<=)
    { name: 'elbowDrop: just below reach @ scale 1 fires',  scale: 1, dist: REACH * 1 - 1, otherState: 'down', moveSet: ['elbowDrop'], expected: 'elbowDrop' },
    { name: 'elbowDrop: exactly at reach @ scale 1 fires',  scale: 1, dist: REACH * 1,     otherState: 'down', moveSet: ['elbowDrop'], expected: 'elbowDrop' },
    { name: 'elbowDrop: just above reach @ scale 1 fails',  scale: 1, dist: REACH * 1 + 1, otherState: 'down', moveSet: ['elbowDrop'], expected: false },
    { name: 'elbowDrop: just below reach @ scale 2 fires',  scale: 2, dist: REACH * 2 - 1, otherState: 'down', moveSet: ['elbowDrop'], expected: 'elbowDrop' },
    { name: 'elbowDrop: exactly at reach @ scale 2 fires',  scale: 2, dist: REACH * 2,     otherState: 'down', moveSet: ['elbowDrop'], expected: 'elbowDrop' },
    { name: 'elbowDrop: just above reach @ scale 2 fails',  scale: 2, dist: REACH * 2 + 1, otherState: 'down', moveSet: ['elbowDrop'], expected: false },

    // jab uses `jabReach` (<=). moveSet has only 'jab' so dropkick fallthrough
    // can't mask a failure at/above the jab boundary.
    { name: 'jab: just below jabReach @ scale 1 fires',     scale: 1, dist: JAB_REACH * 1 - 1, otherState: 'standing', moveSet: ['jab'], expected: 'jab' },
    { name: 'jab: exactly at jabReach @ scale 1 fires',     scale: 1, dist: JAB_REACH * 1,     otherState: 'standing', moveSet: ['jab'], expected: 'jab' },
    { name: 'jab: just above jabReach @ scale 1 fails',     scale: 1, dist: JAB_REACH * 1 + 1, otherState: 'standing', moveSet: ['jab'], expected: false },
    { name: 'jab: just below jabReach @ scale 2 fires',     scale: 2, dist: JAB_REACH * 2 - 1, otherState: 'standing', moveSet: ['jab'], expected: 'jab' },
    { name: 'jab: exactly at jabReach @ scale 2 fires',     scale: 2, dist: JAB_REACH * 2,     otherState: 'standing', moveSet: ['jab'], expected: 'jab' },
    { name: 'jab: just above jabReach @ scale 2 fails',     scale: 2, dist: JAB_REACH * 2 + 1, otherState: 'standing', moveSet: ['jab'], expected: false },

    // dropkick uses `medReach` (<=). moveSet has only 'dropkick' so jab
    // (which never reaches this far below medReach at these deltas) doesn't
    // interfere, and there's nothing else to fall through to at/above medReach.
    { name: 'dropkick: just below medReach @ scale 1 fires', scale: 1, dist: MED_REACH * 1 - 1, otherState: 'standing', moveSet: ['dropkick'], expected: 'dropkick' },
    { name: 'dropkick: exactly at medReach @ scale 1 fires', scale: 1, dist: MED_REACH * 1,     otherState: 'standing', moveSet: ['dropkick'], expected: 'dropkick' },
    { name: 'dropkick: just above medReach @ scale 1 fails', scale: 1, dist: MED_REACH * 1 + 1, otherState: 'standing', moveSet: ['dropkick'], expected: false },
    { name: 'dropkick: just below medReach @ scale 2 fires', scale: 2, dist: MED_REACH * 2 - 1, otherState: 'standing', moveSet: ['dropkick'], expected: 'dropkick' },
    { name: 'dropkick: exactly at medReach @ scale 2 fires', scale: 2, dist: MED_REACH * 2,     otherState: 'standing', moveSet: ['dropkick'], expected: 'dropkick' },
    { name: 'dropkick: just above medReach @ scale 2 fails', scale: 2, dist: MED_REACH * 2 + 1, otherState: 'standing', moveSet: ['dropkick'], expected: false },
];

for (const c of thresholdCases) {
    test(c.name, () => {
        assert.strictEqual(decide(c), c.expected);
    });
}
