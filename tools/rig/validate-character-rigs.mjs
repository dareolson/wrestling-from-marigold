import { access, readFile } from 'node:fs/promises';
import { george } from '../../src/characters/george.js';
import { thesz } from '../../src/characters/thesz.js';
import {
    baseEntryForSlot,
    enumerateCharacterAssets,
    textureKey,
    validateCharacterArt,
} from '../../src/rig/partVariants.js';

async function pngSize(file) {
    const bytes = await readFile(file);
    const signature = bytes.subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a' || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
        throw new Error('not a PNG');
    }
    return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

let failed = false;
for (const character of [george, thesz]) {
    const result = validateCharacterArt(character);
    for (const warning of result.warnings) console.warn(`${character.id}: warning: ${warning}`);
    for (const error of result.errors) {
        failed = true;
        console.error(`${character.id}: ${error}`);
    }
    const assets = enumerateCharacterAssets(character);
    const assetsByKey = new Map(assets.map(asset => [asset.key, asset]));
    const sizesByKey = new Map();
    for (const asset of assets) {
        try {
            await access(asset.file);
            sizesByKey.set(asset.key, await pngSize(asset.file));
        } catch (error) {
            failed = true;
            console.error(`${character.id}: unreadable ${asset.slot}.${asset.variant} PNG: ${asset.file} (${error.message})`);
        }
    }
    for (const asset of assets.filter(asset => asset.variant !== 'base')) {
        const entry = character.textures.variants[asset.slot][asset.variant];
        const hasGeometryOverride = ['box', 'jointPivotFrac', 'pivotOffsetFrac', 'distalAnchorFrac', 'soleAnchorFrac']
            .some(key => entry[key] !== undefined);
        if (hasGeometryOverride) continue;
        const baseKey = textureKey(baseEntryForSlot(character.textures, asset.slot));
        const baseAsset = assetsByKey.get(baseKey);
        const baseSize = sizesByKey.get(baseKey);
        const variantSize = sizesByKey.get(asset.key);
        if (baseAsset && baseSize && variantSize
            && (baseSize.w !== variantSize.w || baseSize.h !== variantSize.h)) {
            failed = true;
            console.error(
                `${character.id}: ${asset.slot}.${asset.variant} is ${variantSize.w}x${variantSize.h}; `
                + `expected base canvas ${baseSize.w}x${baseSize.h} or explicit geometry overrides`,
            );
        }
    }
    if (result.ok) console.log(`${character.id}: rig contract valid (${assets.length} textures)`);
}

if (failed) process.exitCode = 1;
