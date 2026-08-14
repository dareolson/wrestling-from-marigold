// Public construction API for the reference rig.
//
// This is the supported way to get a live, standards-compliant Skeleton into a
// Phaser scene — used by the certification runner (tools/rig/certify.mjs) and
// intended as the move editor's production preview target.
//
// It exists as its own module so there is exactly ONE construction path. The
// certifier previously registered these textures with its own inline copy of
// this logic; a second consumer writing a second copy is how the preview and
// the gate drift apart until a move that certifies clean looks wrong in the
// editor (or worse, the reverse).
//
// Why preview against this rather than George or Lou: neither shipped
// character declares a `hand` slot, a `boot` slot, a two-anchor `binding`, or
// any `variants`, so neither exercises `_placeAttachment`, `_placeBoundPart`,
// or `resolvePartSelection` at all. A move that reads correctly on Lou may be
// riding legacy fixed forearm offsets and will break on the first character
// regenerated under the production standard. See CHARACTER_ART_SOURCE_STANDARD.md.
//
// Node-importable (Skeleton takes its scene by injection and imports no
// Phaser), but `installReferenceRigTextures` and `createReferenceRigSkeleton`
// need a real scene and a DOM canvas, so they only run in the browser.

import Skeleton from '../Skeleton.js';
import { paintReferenceRig, referenceCharacter, referenceTexturePlan } from './referenceRig.js';

export const REFERENCE_RIG_ID = 'refrig';

/**
 * Paint the reference art and register it as scene textures.
 *
 * The painter's RGBA buffer goes straight onto the canvas, so the pixels the
 * Node-side validators check are byte-for-byte the pixels the GPU samples —
 * there is no encode/decode step in between to disagree about.
 *
 * Idempotent: re-registering replaces existing keys, so a hot-reloading editor
 * can call this repeatedly without leaking textures or throwing on a
 * duplicate key.
 *
 * @param {Phaser.Scene} scene
 * @param {{ keyPrefix?: string }} [options]
 * @returns {string[]} the texture keys now registered
 */
export function installReferenceRigTextures(scene, { keyPrefix = REFERENCE_RIG_ID } = {}) {
    const images = paintReferenceRig();
    const registered = [];
    for (const { key, image, variant } of referenceTexturePlan(keyPrefix)) {
        const source = variant ? images.variants[image]?.[variant] : images[image];
        if (!source) throw new Error(`reference rig texture plan names "${key}" with no painted source`);
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const canvas = document.createElement('canvas');
        canvas.width = source.w;
        canvas.height = source.h;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.putImageData(new ImageData(new Uint8ClampedArray(source.rgba), source.w, source.h), 0, 0);
        scene.textures.addCanvas(key, canvas);
        registered.push(key);
    }
    return registered;
}

/**
 * Build a ready-to-drive reference Skeleton in `scene`.
 *
 * Drive it through the same entry points the game uses —
 * `updateUpright(x, y, s, facing, pose, walkPhase, combatBlend, lean,
 * moveBlend, liftScale, runBlend)` and `updateGetUp(x, y, s, facing, t)` —
 * so the preview exercises the production render path rather than a
 * bespoke one.
 *
 * @param {Phaser.Scene} scene
 * @param {{ keyPrefix?: string, depth?: number, visible?: boolean }} [options]
 * @returns {{ skeleton: Skeleton, character: object, textureKeys: string[] }}
 */
export function createReferenceRigSkeleton(scene, { keyPrefix = REFERENCE_RIG_ID, depth = 50, visible = true } = {}) {
    const textureKeys = installReferenceRigTextures(scene, { keyPrefix });
    const character = referenceCharacter(keyPrefix);
    const skeleton = new Skeleton(scene, character.skinCol, character.trunksCol, character.textures);
    skeleton.setDepth(depth);
    skeleton.setVisible(visible);
    return { skeleton, character, textureKeys };
}

/**
 * Which production subsystems a built skeleton actually exercises.
 *
 * Worth surfacing in the editor: a character reporting `false` across the
 * board can survive every pose an author throws at it while proving nothing,
 * because the code paths under test never execute. That is exactly how this
 * architecture stayed unverified beneath a green test suite.
 */
export function exercisedSubsystems(skeleton, character) {
    const limbSlots = ['nearUpArm', 'farUpArm', 'nearForearm', 'farForearm', 'nearThigh', 'farThigh', 'nearShin', 'farShin'];
    return {
        twoAnchorBinding: limbSlots.some(slot => !!skeleton[slot]?._binding?.distal),
        attachmentSlots: !!(skeleton.nearHand?._binding?.proximal || skeleton.nearBoot?._binding?.proximal),
        pelvisUnderlayMask: !!(skeleton.pelvisUnderlay && skeleton.pelvisMask),
        partVariants: Object.keys(character?.textures?.variants ?? {}).length > 0,
    };
}
