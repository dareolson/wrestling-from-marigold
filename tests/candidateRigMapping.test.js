import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { BASE_PART_FILES } from '../src/rig/partVariants.js';
import {
    CANDIDATE_SLOTS,
    mapCandidate,
    splitCapableFamilies,
} from '../tools/wrestler-cutter/map-candidate-to-rig.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skeleton = await readFile(path.join(ROOT, 'src/Skeleton.js'), 'utf8');

// Two candidate decompositions have both been described in the handoffs as
// "targeting the shipped legacy rig", and neither matches it. Shipped Lou loads
// six FILES -- head, torso, upper_arm, forearm, thigh, shin -- in which the four
// limb families are each ONE painting placed twice with different offsets, tilts
// and scales. "Six parts" and "six files" are not the same statement, and the
// coincidence has been read as agreement.
//
// These tests pin what the runtime can actually load and tell apart, so the
// claim stops being re-derived by eye every session.

test('the runtime opt-ins are read from Skeleton.js, not assumed', () => {
    const families = splitCapableFamilies(skeleton);
    // The five that exist today. Each is the same one-line idiom:
    //     const farForearmEntry = textures.farForearm ?? textures.forearm;
    for (const family of ['forearm', 'shin', 'thigh', 'hand', 'boot']) {
        assert.ok(families.has(family),
            `${family} should still have a near/far opt-in in Skeleton.js`);
    }
    // And the one that does not. Skeleton.js assigns BOTH arms from
    // textures.upperArm directly, so a candidate's separately authored near and
    // far upper arms collapse to a single painting.
    assert.ok(!families.has('upperArm'),
        'upperArm has no near/far opt-in; if this now fails the runtime gained '
        + 'one, and the front3q candidate mapping should be revisited rather '
        + 'than this assertion relaxed');
    assert.match(skeleton, /this\.farUpArm\s*=\s*img\(textures\.upperArm/);
    assert.match(skeleton, /this\.nearUpArm\s*=\s*img\(textures\.upperArm/);
});

test('a whole far limb cannot drive a joint the rig bends', () => {
    // The six-part board delivers far-arm and far-leg as single pieces. The rig
    // articulates the far elbow and the far knee independently of the near ones,
    // so these fuse joints the rig moves -- there is no slot for them at any
    // filename, and no offset can bend a single painting in the middle.
    const rows = mapCandidate({
        partNames: ['far-arm', 'far-leg', 'near-upper-arm', 'near-forearm-hand',
            'near-thigh', 'near-shin-boot'],
        splitFamilies: splitCapableFamilies(skeleton),
        loadable: new Set(Object.keys(BASE_PART_FILES)),
    });
    const byPart = Object.fromEntries(rows.map((r) => [r.part, r]));
    assert.equal(byPart['far-arm'].status, 'unmappable');
    assert.match(byPart['far-arm'].note, /elbow/);
    assert.equal(byPart['far-leg'].status, 'unmappable');
    assert.match(byPart['far-leg'].note, /knee/);
    assert.equal(rows.filter((r) => r.status === 'mapped').length, 2,
        'only the near forearm and near shin map cleanly');
});

test('the twelve-part front3q candidate maps eight parts, and names the other four', () => {
    const rows = mapCandidate({
        partNames: ['head', 'torso', 'pelvis_overlay', 'pelvis_underlay',
            'near_upper_arm', 'far_upper_arm', 'near_forearm', 'far_forearm',
            'near_thigh', 'far_thigh', 'near_shin', 'far_shin'],
        splitFamilies: splitCapableFamilies(skeleton),
        loadable: new Set(Object.keys(BASE_PART_FILES)),
    });
    const byPart = Object.fromEntries(rows.map((r) => [r.part, r]));

    for (const part of ['head', 'torso', 'pelvis_overlay', 'pelvis_underlay',
        'near_forearm', 'far_forearm', 'near_shin', 'far_shin']) {
        assert.equal(byPart[part].status, 'mapped', `${part} should map cleanly`);
        assert.ok(BASE_PART_FILES[byPart[part].slot], `${part} needs a filename`);
    }

    // Two families fall short for two DIFFERENT reasons, and conflating them
    // would send the next session to fix the wrong layer.
    for (const part of ['near_upper_arm', 'far_upper_arm']) {
        assert.equal(byPart[part].status, 'shared-only',
            'the renderer cannot keep the two upper arms apart');
    }
    for (const part of ['near_thigh', 'far_thigh']) {
        assert.equal(byPart[part].status, 'no-filename',
            'the renderer supports split thighs; the loader has no filename for them');
    }

    assert.equal(rows.filter((r) => r.status === 'mapped').length, 8);
    // Every one of the twelve is accounted for by name; an unrecognised part
    // would come back 'unknown' rather than being quietly dropped.
    assert.ok(rows.every((r) => CANDIDATE_SLOTS[r.part]), 'no part is unrecognised');
});

test('the shipped rig already shares the families the candidate splits', () => {
    // This is why "8 of 12" is not a blocker. The near painting serves the
    // shared slot, which is exactly what shipped Lou does today -- one upper-arm
    // and one thigh painting, placed twice. Nothing regresses; the candidate's
    // extra far-side perspective simply goes unused, as it always has.
    const rows = mapCandidate({
        partNames: ['near_upper_arm', 'far_upper_arm', 'near_thigh', 'far_thigh'],
        splitFamilies: splitCapableFamilies(skeleton),
        loadable: new Set(Object.keys(BASE_PART_FILES)),
    });
    const byPart = Object.fromEntries(rows.map((r) => [r.part, r]));
    assert.match(byPart.near_upper_arm.fallback, /parity/);
    assert.match(byPart.near_thigh.fallback, /parity/);
    assert.match(byPart.far_upper_arm.fallback, /discarded/);
    assert.match(byPart.far_thigh.fallback, /discarded/);
});

test('shipped Lou declares no pelvis layers, so the pelvis findings are not on his path', () => {
    // The 8.2% torso-to-pelvis hip-span disagreement and the unregistered
    // pelvis_overlay are both real, and both are properties of layers shipped
    // Lou does not have: his torso carries its own trunks and hips. They block
    // a George-style pelvis split, not this production track.
    return import('../src/characters/thesz.js').then(({ thesz }) => {
        assert.equal(thesz.textures.pelvisOverlay, undefined);
        assert.equal(thesz.textures.pelvisUnderlay, undefined);
        assert.equal(thesz.textures.pelvisMask, undefined);
        assert.ok(thesz.textures.torso, 'the torso is where Lou keeps his trunks');
    });
});

// ── authoring requirements ──────────────────────────────────────────────────
//
// Derek's 2026-09-15 brief names nine requirements for the next generation.
// Two are measurable with code this repository already has, and a requirement
// that can be measured and is not is one the next generation misses the same
// way this one did -- the bent arms went unnoticed until they were wired into
// the running game and the forearm swung across the body.

test('darkTopFraction separates a baked trunks band from an outline', async () => {
    const { darkTopFraction, AUTHORING } = await import(
        '../tools/wrestler-cutter/map-candidate-to-rig.mjs');

    const part = (topLuma) => {
        const w = 40;
        const h = 200;
        const rgba = new Uint8Array(w * h * 4);
        const alpha = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                alpha[i] = 255;
                // Top 18% takes `topLuma`; the rest is skin.
                const v = y < h * 0.18 ? topLuma : 200;
                rgba[i * 4] = v; rgba[i * 4 + 1] = v; rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = 255;
            }
        }
        return { w, h, rgba, alpha };
    };

    // A black trunks band across the limb top.
    assert.ok(darkTopFraction(part(20)) > AUTHORING.maxDarkTopFraction,
        'a dark band across the whole limb top must be caught');
    // Ordinary skin with an outline somewhere in it.
    assert.ok(darkTopFraction(part(200)) <= AUTHORING.maxDarkTopFraction,
        'plain limb paint must not read as trunks');

    // The thresholds sit between the two real candidates by a wide margin, not
    // tuned to a target: the six-part board measures 0.52-0.74 and front3q v3
    // measures 0.03-0.05.
    assert.ok(AUTHORING.maxDarkTopFraction > 0.05 && AUTHORING.maxDarkTopFraction < 0.5);
    assert.ok(AUTHORING.maxBakedAxisDeg > 2 && AUTHORING.maxBakedAxisDeg < 9,
        'the bake threshold must separate v3 legs (1.7-5.2) from v3 arms (13.4-19.6)');
});
