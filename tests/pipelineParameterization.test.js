import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    DEFAULT_MANIFEST, declaredViews, parseFlags, resolveProduction,
} from '../tools/wrestler-cutter/production-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CUTTER = path.join(ROOT, 'tools/wrestler-cutter');
const manifest = JSON.parse(await readFile(DEFAULT_MANIFEST, 'utf8'));

// Milestone 3. Adding a wrestler must be data and artwork, never a producer-code
// edit. These tests pin that: a second character resolves entirely from its own
// manifest, and the producer sources carry no character-specific paths.

// A second wrestler, declared only as data. It reuses the v2 part contract and
// changes everything that is character-specific: id, root, sheet, view set.
const secondCharacter = {
    ...structuredClone(manifest),
    characterId: 'synthetic_wrestler_2',
    production: {
        characterRoot: 'Sprite sheets/AI Pilot/Synthetic/v2-canonical',
        passASheet: 'pass-a/candidates/synthetic-pass-a-v1.png',
        passASha256: '0'.repeat(64),
        views: {
            front: {
                sourceParts: 'pass-b/candidates/front-v1/parts',
                revisedTorso: 'pass-b/candidates/front-v1/sources/torso.png',
                output: 'pass-b/candidates/front-v1-normalized',
                proofPrefix: 'synthetic-front',
            },
        },
    },
};

test('a second character resolves every path from its own manifest', () => {
    const config = resolveProduction(secondCharacter, {});
    assert.equal(config.characterId, 'synthetic_wrestler_2');
    assert.equal(config.view, 'front', 'falls back to the only declared view');
    assert.ok(config.passASheet.endsWith('Synthetic/v2-canonical/pass-a/candidates/synthetic-pass-a-v1.png'));
    assert.ok(config.sourceParts.endsWith('Synthetic/v2-canonical/pass-b/candidates/front-v1/parts'));
    assert.ok(config.output.endsWith('Synthetic/v2-canonical/pass-b/candidates/front-v1-normalized'));
    assert.equal(config.proofPrefix, 'synthetic-front');
    // Nothing of the first character leaks into the second's resolution.
    for (const value of [config.passASheet, config.sourceParts, config.output]) {
        assert.ok(!/Lou|thesz/i.test(value), `${value} must not reference the first character`);
    }
});

test('the first character resolves to its current candidate, with v4 kept as provenance', () => {
    const config = resolveProduction(manifest, { view: 'profile' });
    assert.equal(config.characterId, 'lou_thesz_v2');
    assert.ok(config.output.endsWith('profile-v2-normalized-v5'));
    assert.equal(config.proofPrefix, 'profile-v2n5');
    assert.deepEqual(declaredViews(manifest), ['profile']);
    // Superseded candidates are recorded, never overwritten.
    assert.deepEqual(manifest.production.supersededCandidates.profile,
        ['pass-b/candidates/profile-v2-normalized-v4']);
});

test('flags override the manifest, and a view with no declared paths is refused', () => {
    const overridden = resolveProduction(manifest,
        parseFlags(['--view', 'profile', '--output', '/tmp/elsewhere']));
    assert.equal(overridden.output, '/tmp/elsewhere');

    assert.throws(() => resolveProduction(manifest, { view: 'back3q' }),
        /declares no production paths for view "back3q"/);
    // ...unless the caller supplies the paths explicitly.
    const explicit = resolveProduction(manifest,
        parseFlags(['--view', 'back3q', '--source-parts', '/tmp/parts', '--output', '/tmp/out']));
    assert.equal(explicit.view, 'back3q');
    assert.equal(explicit.sourceParts, '/tmp/parts');
});

test('a manifest without a production block names itself in the error', () => {
    const bare = { ...structuredClone(manifest), characterId: 'no_paths' };
    delete bare.production;
    assert.throws(() => resolveProduction(bare, {}), /no_paths has no "production" block/);
});

test('the landmark contract is data on the character, not code in the tool', async () => {
    const contract = manifest.landmarkContract;
    assert.ok(contract, 'the manifest carries its own landmark contract');
    assert.deepEqual(Object.keys(contract.fit).sort(),
        ['back', 'back3q', 'front', 'front3q', 'profile']);
    assert.equal(contract.approvedSheetSha256, manifest.humanReview.sourceSheetSha256);

    const source = await readFile(path.join(CUTTER, 'apply-landmark-contract.mjs'), 'utf8');
    assert.doesNotMatch(source, /const FIT = Object\.freeze/,
        'the frozen landmark table must live in the manifest, not the tool');
    assert.doesNotMatch(source, /characterId = '/,
        'the tool must not hardcode a character id');
});

// The stages `art:build` runs, plus the gates it calls. These are the pipeline;
// everything else in the directory is a one-off from an earlier pass.
const PRODUCTION_STAGES = [
    'production-config.mjs',
    'build-character-view.mjs',
    'apply-landmark-contract.mjs',
    'normalize-profile-v2-parts.mjs',
    'verify-candidate.mjs',
    'validate-source-manifest.mjs',
    'validate-landmarks.mjs',
    'validate-pass-a.mjs',
    'export-v2-sheet.mjs',
];

// Superseded single-use scripts, kept as provenance for how the first character
// was produced. They are not part of the pipeline and nothing runs them. Listing
// them by name is what keeps the guard above honest: a new stage is covered by
// default, and retiring one of these is a deletion from this list.
const LEGACY_ONE_OFFS = [
    'build-pass-b-profile-trial.mjs',
    'compose-profile-regen.mjs',
    'extract-profile-v2-parts.mjs',
    'normalize_pilot_expressions.mjs',
    'process-parts.mjs',
    'render-landmark-overlay.mjs',
    'render-profile-v2-proofs.mjs',
];

const stripComments = source => source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

test('no production stage hardcodes a character path', async () => {
    // The exit gate for this milestone, enforced rather than asserted in prose.
    // Comments are stripped first, so prose about the first character is allowed.
    const offenders = [];
    for (const name of PRODUCTION_STAGES) {
        const code = stripComments(await readFile(path.join(CUTTER, name), 'utf8'));
        if (/Sprite sheets\/AI Pilot/.test(code)) offenders.push(`${name}: character asset path`);
        if (/thesz/i.test(code)) offenders.push(`${name}: character name`);
    }
    assert.deepEqual(offenders, [],
        'production code must take character paths as data, not embed them');
});

test('every cutter tool is either a production stage or a listed one-off', async () => {
    const present = (await readdir(CUTTER)).filter(name => name.endsWith('.mjs'));
    const accounted = new Set([...PRODUCTION_STAGES, ...LEGACY_ONE_OFFS,
        // smoke tests and utilities that take their input as arguments
        'anchor-editor-smoke.mjs', 'canonical-sheet-smoke.mjs',
        'prepare_george_v9_broadcast.mjs', 'remove-chroma-key.mjs',
        'cut-front3q-modular-board.mjs', 'cut-production-limb-board.mjs', 'measure-art-contract.mjs',
        'measure-joint-articulation.mjs', 'render-articulation-proofs.mjs']);
    const unaccounted = present.filter(name => !accounted.has(name));
    assert.deepEqual(unaccounted, [],
        'a new cutter tool must be declared a production stage or a one-off');

    for (const name of PRODUCTION_STAGES) {
        assert.ok(present.includes(name), `${name} is missing from the cutter directory`);
    }
});

test('every guarded npm command accepts a manifest rather than assuming one', async () => {
    const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['art:build'], 'node tools/wrestler-cutter/build-character-view.mjs');
    assert.match(pkg.scripts['art:apply-landmarks'], /apply-landmark-contract\.mjs/,
        'the landmark command is named for what it does');
    assert.ok(!pkg.scripts['art:apply-landmarks'].includes('fit-v2-landmarks'));
});
