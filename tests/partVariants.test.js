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
    bad.textures.variants.hand = { fist: { key: 'bad' } };
    const result = validateCharacterArt(bad);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(error => error.includes('unknown render slot')));
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
