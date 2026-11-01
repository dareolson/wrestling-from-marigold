// Kit checks (PLAN_GRAPPLES T6.3): a roster kit holds no move a slot shadows, every kit move the AI
// has to be given a value for has one, and MOVE_CATALOG.md's generated table matches the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KIT_SLOTS, KIT_AI_ODDS, shadowedMoves, KIT_ELIGIBLE_IDS } from '../src/moves/registry.js';
import { ROSTER_KITS, ROSTER_PERSONALITIES } from '../src/characters/rosterKits.js';
import { PERSONALITIES } from '../src/AIHandler.js';
import { checkCatalog, kitRows, kitsBlock } from '../tools/move-critic/kits.mjs';

// Kits whose AI value is missing today. Each entry is a finding reported to Derek, not a decision: the
// move is in the kit, so a human can play it, but the AI never will. Retune the personality and delete the entry.
const AI_ALLOW = {
    'guido:hammerlock': 'Guido plays the brawler personality, which has no hammerlockOdds: the AI never starts the lockup finisher (T6.3, found 2026-11-01)',
    'guido:cornerCharge': 'brawler has no cornerWhipOdds: the AI never whips to a corner, so it never reaches the charge (T6.3, found 2026-11-01)',
};

test('slots only name kit-gated moves', () => {
    for (const [slot, order] of Object.entries(KIT_SLOTS)) {
        for (const id of order) assert.ok(KIT_ELIGIBLE_IDS.includes(id), `${slot}: ${id} is not a kit move`);
    }
});

test('shadowedMoves: hit and miss', () => {
    assert.deepEqual(shadowedMoves(['hipToss', 'armDrag', 'jab']), [{ move: 'armDrag', slot: 'lockupPower', shadowedBy: 'hipToss' }]);
    assert.deepEqual(shadowedMoves(['bodySlam', 'piledriver']), [{ move: 'bodySlam', slot: 'grapple', shadowedBy: 'piledriver' }]);
    assert.deepEqual(shadowedMoves(['armDrag', 'bodySlam', 'jab']), []);
    assert.deepEqual(shadowedMoves([]), []);
});

test('no roster kit holds a shadowed move', () => {
    for (const [name, kit] of Object.entries(ROSTER_KITS)) {
        assert.deepEqual(shadowedMoves(kit), [], `${name} holds a move a slot shadows`);
    }
});

test('KIT_AI_ODDS names kit moves', () => {
    for (const id of Object.keys(KIT_AI_ODDS)) assert.ok(KIT_ELIGIBLE_IDS.includes(id), `${id} is not a kit move`);
});

test('every roster kit move the AI needs a value for has one, or is on the allow list', () => {
    const used = new Set();
    for (const [name, kit] of Object.entries(ROSTER_KITS)) {
        const cfg = PERSONALITIES[ROSTER_PERSONALITIES[name]];
        assert.ok(cfg, `${name}: no personality "${ROSTER_PERSONALITIES[name]}"`);
        for (const id of kit.filter(m => KIT_AI_ODDS[m])) {
            const key = `${name}:${id}`, value = cfg[KIT_AI_ODDS[id]];
            if (value > 0) { assert.ok(!AI_ALLOW[key], `${key} now has ${KIT_AI_ODDS[id]}=${value}; remove it from AI_ALLOW`); continue; }
            assert.ok(AI_ALLOW[key], `${key}: ${KIT_AI_ODDS[id]} is ${value}, so the AI never uses ${id}; set it or allow-list it with a reason`);
            used.add(key);
        }
    }
    assert.deepEqual([...used].sort(), Object.keys(AI_ALLOW).sort());
});

test('the AI check catches a kit move with no value', () => {
    const cfg = PERSONALITIES.brawler;
    assert.ok(!(cfg[KIT_AI_ODDS.hammerlock] > 0));
    assert.ok(PERSONALITIES.thesz[KIT_AI_ODDS.hammerlock] > 0);
});

test('MOVE_CATALOG.md kits table matches the code', () => {
    const r = checkCatalog();
    assert.ok(r.ok, r.reason);
});

test('kits table: one row per registry id, and a roster kit move is listed under its wrestler', () => {
    const rows = kitRows();
    assert.equal(new Set(rows.map(r => r.id)).size, rows.length);
    assert.deepEqual(rows.find(r => r.id === 'shove').kits, ['Kowalski']);
    assert.equal(rows.find(r => r.id === 'armDrag').slot, 'lockupPower');
    assert.ok(kitsBlock(rows).includes('| `shove` | yes | Kowalski | - |'));
});
