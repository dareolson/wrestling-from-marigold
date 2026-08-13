import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    enumerateCharacterAssets,
    mergeVariantEntry,
    resolvePartSelection,
    validateCharacterArt,
} from '../src/rig/partVariants.js';
import Skeleton from '../src/Skeleton.js';

const character = {
    id: 'test',
    textures: {
        head: 'test_head',
        forearm: {
            key: 'test_forearm',
            box: { w: 40, h: 60 },
            jointPivotFrac: 0.1,
            distalAnchorFrac: { u: 0.5, v: 0.9 },
        },
        variants: {
            head: {
                hurt: { key: 'test_head_hurt', file: 'head_hurt.png' },
            },
            nearForearm: {
                grip: { key: 'test_near_forearm_grip', file: 'near_forearm_grip.png' },
            },
        },
        rigProfile: { sockets: { neck: { u: 0.5, v: 0.1 } } },
    },
};

test('variant inherits calibrated geometry from its base part', () => {
    const base = character.textures.forearm;
    const merged = mergeVariantEntry(base, character.textures.variants.nearForearm.grip);
    assert.equal(merged.key, 'test_near_forearm_grip');
    assert.deepEqual(merged.box, base.box);
    assert.equal(merged.jointPivotFrac, 0.1);
    assert.deepEqual(merged.distalAnchorFrac, base.distalAnchorFrac);
});

test('near/far render slots fall back to shared base art independently', () => {
    const resolved = resolvePartSelection(character.textures, { nearForearm: 'grip' });
    assert.equal(resolved.nearForearm.key, 'test_near_forearm_grip');
    assert.equal(resolved.farForearm.key, 'test_forearm');
});

test('a unified forearm variant family reaches both semantic near/far slots', () => {
    const textures = {
        forearm: { key: 'unified_forearm', box: { w: 40, h: 60 } },
        variants: {
            forearm: {
                fist: { key: 'unified_fist', file: 'forearm_fist.png' },
            },
        },
    };
    const near = resolvePartSelection(textures, { nearForearm: 'fist' });
    const far = resolvePartSelection(textures, { farForearm: 'fist' });
    assert.equal(near.nearForearm.key, 'unified_fist');
    assert.equal(far.farForearm.key, 'unified_fist');
    assert.equal(validateCharacterArt({ id: 'unified', textures }).ok, true);
});

test('a side-specific family overrides the unified fallback', () => {
    const textures = {
        forearm: { key: 'base', box: { w: 40, h: 60 } },
        variants: {
            forearm: { fist: { key: 'shared_fist', file: 'shared.png' } },
            nearForearm: { fist: { key: 'near_fist', file: 'near.png' } },
        },
    };
    const resolved = resolvePartSelection(textures, { nearForearm: 'fist', farForearm: 'fist' });
    assert.equal(resolved.nearForearm.key, 'near_fist');
    assert.equal(resolved.farForearm.key, 'shared_fist');
});

test('asset enumeration includes explicit variants without treating rig metadata as files', () => {
    const assets = enumerateCharacterAssets(character);
    assert.deepEqual(assets.map(asset => asset.key), [
        'test_head',
        'test_forearm',
        'test_head_hurt',
        'test_near_forearm_grip',
    ]);
});

test('variant contract rejects unknown slots and missing files', () => {
    const bad = structuredClone(character);
    bad.textures.variants.elbowPad = { fist: { key: 'bad' } };
    const result = validateCharacterArt(bad);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(error => error.includes('unknown render slot')));
});

test('modular hand variants lock the wrist but may move contact geometry', () => {
    const modular = {
        id: 'modular',
        textures: {
            hand: {
                key: 'hand_open', box: { w: 96, h: 96 },
                binding: { proximal: { u: 0.5, v: 0.2 } },
                semanticAnchors: { contact: { u: 0.6, v: 0.6 } },
            },
            variants: {
                nearHand: {
                    fist: {
                        key: 'hand_fist', file: 'hand_fist.png', box: { w: 96, h: 96 },
                        binding: { proximal: { u: 0.5, v: 0.2 } },
                        semanticAnchors: { contact: { u: 0.75, v: 0.55 } },
                    },
                },
            },
        },
    };
    assert.equal(validateCharacterArt(modular).ok, true);
    modular.textures.variants.nearHand.fist.binding.proximal.u += 0.01;
    const result = validateCharacterArt(modular);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(error => error.includes('binding.proximal must exactly match')));
});

test('Skeleton applies and then cleanly resets a calibrated whole-part swap', () => {
    const image = {
        _texDims: { w: 40, h: 60 },
        setTexture(key) { this.key = key; return this; },
        setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    };
    const skeleton = {
        _textureConfig: character.textures,
        _partImages: { nearForearm: image },
        _partBaseDims: { nearForearm: { w: 40, h: 60 } },
        _partVariantState: {},
    };
    Skeleton.prototype.setPartVariants.call(skeleton, { nearForearm: 'grip' });
    assert.equal(image.key, 'test_near_forearm_grip');
    assert.deepEqual(image._texDims, { w: 40, h: 60 });
    assert.equal(image.originY, 0.1);

    Skeleton.prototype.setPartVariants.call(skeleton, {});
    assert.equal(image.key, 'test_forearm');
    assert.deepEqual(image._texDims, { w: 40, h: 60 });
});
