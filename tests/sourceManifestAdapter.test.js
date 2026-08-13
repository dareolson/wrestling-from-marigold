import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { sourceManifestToTextures } from '../src/rig/sourceManifestAdapter.js';
import { validateCharacterArt } from '../src/rig/partVariants.js';

const manifest = JSON.parse(await readFile(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.example.json', import.meta.url),
));

test('eight-part source mannequin converts into a valid runtime texture contract', () => {
    const textures = sourceManifestToTextures(manifest, 'mannequin');
    const result = validateCharacterArt({ id: 'mannequin', textures });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(textures.upperArm.binding.proximal, { u: 0.5, v: 20 / 180 });
    assert.deepEqual(textures.upperArm.binding.distal, { u: 64 / 130, v: 148 / 180 });
    assert.equal(textures.variants.nearHand.grip.binding.proximal.u, 0.5);
    assert.notDeepEqual(
        textures.variants.nearHand.open.semanticAnchors.contact,
        textures.variants.nearHand.fist.semanticAnchors.contact,
    );
});
