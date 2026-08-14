import test from 'node:test';
import assert from 'node:assert/strict';

import {
    REFERENCE_MANIFEST,
    paintReferenceRig,
    referenceCharacter,
    referenceTexturePlan,
} from '../src/rig/referenceRig.js';
import { validateCharacterArt } from '../src/rig/partVariants.js';
import {
    detectOverlapEdgeWarnings,
    validatePelvisSweep,
    validatePixelCoverage,
    validateSourceManifest,
} from '../tools/wrestler-cutter/validate-source-manifest.mjs';

const clone = value => structuredClone(value);

test('the reference manifest passes the production source standard with no warnings', () => {
    const result = validateSourceManifest(clone(REFERENCE_MANIFEST));
    assert.deepEqual(result.errors, []);
    // Unlike the example template, the reference rig plans every variant
    // family — it has to, since it is the only thing that exercises swapping.
    assert.deepEqual(result.warnings, []);
});

test('the painted reference art satisfies every joint zone in real pixels', () => {
    const { errors, warnings } = validatePixelCoverage(clone(REFERENCE_MANIFEST), paintReferenceRig());
    assert.deepEqual(errors, []);
    // A flat mid-tone fill has no attachment contour to detect.
    assert.deepEqual(warnings, []);
});

test('the reference pelvis closes over a rotating thigh root at every swept angle', () => {
    assert.deepEqual(validatePelvisSweep(clone(REFERENCE_MANIFEST), paintReferenceRig()).errors, []);
});

test('the reference rig owns pelvis coverage with an underlay, not a middle-depth overlay', () => {
    // George's legacy pelvisOverlay is explicitly not the production model,
    // which is why he cannot serve as the control.
    assert.equal(REFERENCE_MANIFEST.parts.torso.pelvisCoverage.owner, 'pelvisUnderlay');
    assert.ok(REFERENCE_MANIFEST.parts.pelvisUnderlay);
    assert.ok(REFERENCE_MANIFEST.parts.pelvisMask);
    // The sweep validator indexes the owner with torso-space coordinates.
    assert.deepEqual(REFERENCE_MANIFEST.parts.pelvisUnderlay.canvas, REFERENCE_MANIFEST.parts.torso.canvas);
});

test('the reference rig converts into a valid runtime character contract', () => {
    const result = validateCharacterArt(referenceCharacter());
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.ok(result.ok);
});

test('the reference rig declares the production subsystems no shipped character exercises', () => {
    const textures = referenceCharacter().textures;
    // Two-anchor bindings on every production limb.
    for (const slot of ['upperArm', 'forearm', 'thigh', 'shin']) {
        assert.ok(textures[slot].binding.proximal, `${slot} lacks a proximal anchor`);
        assert.ok(textures[slot].binding.distal, `${slot} lacks a distal anchor`);
    }
    // Independent hand and boot attachment slots with semantic contacts.
    assert.ok(textures.hand.binding.proximal);
    assert.ok(textures.hand.semanticAnchors.contact);
    assert.ok(textures.boot.binding.proximal);
    assert.ok(textures.boot.semanticAnchors.sole);
    // Both pelvis layers.
    assert.ok(textures.pelvisUnderlay);
    assert.ok(textures.pelvisMask);
    // Swappable families on independent near/far slots.
    for (const slot of ['nearHand', 'farHand', 'nearBoot', 'farBoot']) {
        assert.ok(Object.keys(textures.variants[slot]).length >= 2, `${slot} has no swappable variants`);
    }
});

test('a hand or boot variant repaints its contact without moving its structural anchor', () => {
    const textures = referenceCharacter().textures;
    const base = textures.hand.binding.proximal;
    const contacts = new Set();
    for (const entry of Object.values(textures.variants.nearHand)) {
        assert.deepEqual(entry.binding.proximal, base, 'a hand variant moved the wrist socket');
        contacts.add(`${entry.semanticAnchors.contact.u},${entry.semanticAnchors.contact.v}`);
    }
    // The variants must actually differ, or the swap proves nothing.
    assert.ok(contacts.size > 1, 'every hand variant shares one contact point');
});

test('the texture plan names exactly the keys the runtime contract asks for', () => {
    const textures = referenceCharacter().textures;
    const planned = new Set(referenceTexturePlan().map(entry => entry.key));
    const required = new Set();
    for (const slot of ['head', 'torso', 'pelvisUnderlay', 'pelvisMask', 'upperArm', 'forearm', 'hand', 'thigh', 'shin', 'boot']) {
        const entry = textures[slot];
        required.add(typeof entry === 'string' ? entry : entry.key);
    }
    for (const variants of Object.values(textures.variants)) {
        for (const entry of Object.values(variants)) required.add(entry.key);
    }
    assert.deepEqual([...planned].sort(), [...required].sort());
});

test('every planned key resolves to painted pixels with real coverage', () => {
    const images = paintReferenceRig();
    for (const { key, image, variant } of referenceTexturePlan()) {
        const source = variant ? images.variants[image]?.[variant] : images[image];
        assert.ok(source, `${key} has no painted source`);
        assert.equal(source.rgba.length, source.w * source.h * 4);
        // Guards against a plan entry pointing at a blank or misrouted
        // buffer, which renders as an invisible limb rather than an error.
        // An absolute floor, not a fraction of canvas: pelvisMask is a small
        // front garment panel covering ~4% of the torso canvas by design.
        const opaque = source.alpha.reduce((count, value) => count + (value > 10 ? 1 : 0), 0);
        assert.ok(opaque > 500, `${key} is essentially empty (${opaque} opaque px)`);
        // Alpha and RGBA must agree, or the Node-validated pixels and the
        // browser-rendered pixels are not the same pixels.
        let mismatched = 0;
        for (let i = 0; i < source.alpha.length; i++) {
            if ((source.alpha[i] > 10) !== (source.rgba[i * 4 + 3] > 10)) mismatched++;
        }
        assert.equal(mismatched, 0, `${key} alpha and rgba disagree on ${mismatched} pixels`);
    }
});
