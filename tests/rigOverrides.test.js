import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { specFor, deepMerge, LOU_RIG, GEORGE_RIG } from '../src/animation/clips/rigOverrides.js';
import { halfBostonCrabClip } from '../src/animation/clips/halfBostonCrab.js';
import { frontKickV2For } from '../src/animation/clips/frontKickV2.js';
import { armBarEntryClip } from '../src/animation/clips/armBarV2.js';
import { validateClip } from '../src/animation/AnimationClip.js';

const RIGS = [LOU_RIG, GEORGE_RIG, 'kowalski-roster-v1', 'guido-roster-v1'];
const ids = (a, b) => ({ attackerRigId: a, defenderRigId: b });

test('specFor merges base, then the attacker override, then the defender override', () => {
    const spec = { x: 1, att: { a: 1, b: 2 }, attacker: { A: { x: 2, att: { a: 9 } } }, defender: { D: { att: { b: 7 } } } };
    assert.deepEqual(specFor(spec, ids('A', 'D')), { x: 2, att: { a: 9, b: 7 } });
    assert.deepEqual(specFor(spec, ids('Z', 'Z')), { x: 1, att: { a: 1, b: 2 } });
    assert.deepEqual(deepMerge({ a: [1] }, { a: [2, 3] }), { a: [2, 3] });
});

// The approved clips, captured before B3b moved the pairing tables into role overrides: exact equality, Lou-on-George and George-on-Lou.
const approved = JSON.parse(readFileSync(new URL('./fixtures/approvedClips.json', import.meta.url)));
const same = (clip, name) => assert.deepEqual(JSON.parse(JSON.stringify(clip)), approved[name], name);
test('the approved clips are unchanged by the retrofit', () => {
    same(halfBostonCrabClip(120, ids(LOU_RIG, GEORGE_RIG)), 'crab lou>george');
    same(halfBostonCrabClip(120, ids(GEORGE_RIG, LOU_RIG)), 'crab george>lou');
    same(frontKickV2For(LOU_RIG), 'kick lou');
    same(frontKickV2For(GEORGE_RIG), 'kick george');
});

const finite = v => (v && typeof v === 'object' ? Object.values(v).every(finite) : typeof v !== 'number' || Number.isFinite(v));
test('every rig pairing builds each retrofitted move: valid clip, no NaN, grips present', () => {
    for (const a of RIGS) for (const d of RIGS) {
        const clips = { crab: halfBostonCrabClip(120, ids(a, d)), armBar: armBarEntryClip(70, d), armBarR: armBarEntryClip(70, d, 'r'), kick: frontKickV2For(a).clip };
        for (const [name, clip] of Object.entries(clips)) {
            assert.ok(validateClip(clip).ok, `${name} ${a} on ${d}`);
            assert.ok(finite(clip.tracks), `${name} ${a} on ${d}: NaN or Infinity`);
        }
        assert.ok(clips.crab.grips.length > 0 && clips.armBar.grips.length > 0 && clips.armBarR.grips.length > 0, `grips ${a} on ${d}`);
    }
});
