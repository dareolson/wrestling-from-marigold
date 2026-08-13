import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { decodeRgbaPng, validatePelvisSweep, validatePixelCoverage, validateSourceManifest } from '../tools/wrestler-cutter/validate-source-manifest.mjs';

const example = JSON.parse(await readFile(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.example.json', import.meta.url),
    'utf8',
));

const clone = value => structuredClone(value);

test('the example eight-part source manifest passes', () => {
    assert.deepEqual(validateSourceManifest(clone(example)).errors, []);
});

test('PNG audit reads real shipped RGBA canvas and alpha data', async () => {
    const png = decodeRgbaPng(await readFile(new URL('../src/assets/wrestlers/thesz/forearm.png', import.meta.url)));
    assert.deepEqual({ w: png.w, h: png.h }, { w: 130, h: 190 });
    assert.equal(png.alpha.length, 130 * 190);
    assert.ok(png.alpha.some(value => value === 0));
    assert.ok(png.alpha.some(value => value > 10));
});

test('a hand variant cannot move its structural wrist socket', () => {
    const manifest = clone(example);
    manifest.variantFamilies.hand[1].anchors.wrist.x += 1;
    const { errors } = validateSourceManifest(manifest);
    assert.ok(errors.some(error => error.includes('anchor wrist must exactly match')));
});

test('a hand variant may define its own semantic contact point', () => {
    const manifest = clone(example);
    manifest.variantFamilies.hand[1].anchors.contact = { x: 80, y: 44 };
    assert.deepEqual(validateSourceManifest(manifest).errors, []);
});

test('elbow and knee segments require overlap on both sides of the joint', () => {
    const manifest = clone(example);
    manifest.parts.forearm.jointZones.elbow.beforePx = 4;
    manifest.parts.thigh.jointZones.knee.afterPx = 3;
    const { errors } = validateSourceManifest(manifest);
    assert.ok(errors.some(error => error.includes('forearm.jointZones.elbow.beforePx')));
    assert.ok(errors.some(error => error.includes('thigh.jointZones.knee.afterPx')));
});

test('all eight modular base parts are mandatory', () => {
    const manifest = clone(example);
    delete manifest.parts.boot;
    const { errors } = validateSourceManifest(manifest);
    assert.ok(errors.some(error => error.includes('parts.boot is required')));
});

function syntheticMannequin(manifest) {
    const images = {};
    for (const [name, part] of Object.entries(manifest.parts)) {
        const alpha = new Uint8Array(part.canvas.w * part.canvas.h);
        for (const [joint, zone] of Object.entries(part.jointZones ?? {})) {
            const anchor = part.anchors[joint];
            for (let y = Math.max(0, anchor.y - zone.beforePx); y <= Math.min(part.canvas.h - 1, anchor.y + zone.afterPx); y++) {
                for (let x = Math.max(0, anchor.x - 8); x <= Math.min(part.canvas.w - 1, anchor.x + 8); x++) {
                    alpha[y * part.canvas.w + x] = 255;
                }
            }
        }
        images[name] = { w: part.canvas.w, h: part.canvas.h, alpha };
    }
    const coverage = manifest.parts.torso.pelvisCoverage;
    const pelvis = images[coverage.owner];
    for (let y = coverage.bounds.y; y < coverage.bounds.y + coverage.bounds.h; y++) {
        for (let x = coverage.bounds.x; x < coverage.bounds.x + coverage.bounds.w; x++) {
            pelvis.alpha[y * pelvis.w + x] = 255;
        }
    }
    return images;
}

test('synthetic eight-part mannequin has actual opaque coverage across every production joint', () => {
    assert.deepEqual(validatePixelCoverage(example, syntheticMannequin(example)).errors, []);
});

test('pixel audit catches transparent knee overlap even when manifest numbers claim it exists', () => {
    const images = syntheticMannequin(example);
    images.shin.alpha.fill(0);
    const { errors } = validatePixelCoverage(example, images);
    assert.ok(errors.some(error => error.includes('shin.knee')));
});

test('pixel audit rejects a replacement PNG canvas that differs from its locked family', () => {
    const images = syntheticMannequin(example);
    images.variants = { hand: { fist: { w: 95, h: 96, alpha: new Uint8Array(95 * 96) } } };
    const { errors } = validatePixelCoverage(example, images);
    assert.ok(errors.some(error => error.includes('variantFamilies.hand.fist')));
});

test('pelvis/thigh sweep covers both hip interiors at combat angles and facings', () => {
    assert.deepEqual(validatePelvisSweep(example, syntheticMannequin(example)).errors, []);
});

test('pelvis sweep catches the transparent-bottom failure even if thigh anchors coincide', () => {
    const images = syntheticMannequin(example);
    const torso = example.parts.torso;
    for (const socket of [torso.anchors.nearHip, torso.anchors.farHip]) {
        for (let y = socket.y - 8; y <= socket.y + 8; y++) {
            for (let x = socket.x - 8; x <= socket.x + 8; x++) images.torso.alpha[y * images.torso.w + x] = 0;
        }
    }
    const { errors } = validatePelvisSweep(example, images);
    assert.ok(errors.some(error => error.includes('pelvis/thigh union hole') || error.includes('underbody opaque coverage')));
});

test('source contract requires thigh overlap above and below the hip anchor', () => {
    const manifest = clone(example);
    delete manifest.parts.thigh.jointZones.hip;
    const { errors } = validateSourceManifest(manifest);
    assert.ok(errors.some(error => error.includes('thigh.jointZones.hip')));
});

test('source contract rejects a finished-edge surface declaration in hidden overlap', () => {
    const manifest = clone(example);
    manifest.parts.upperArm.jointZones.shoulder.surface = 'beveled-cap';
    const { errors } = validateSourceManifest(manifest);
    assert.ok(errors.some(error => error.includes('upperArm.jointZones.shoulder.surface')));
});

test('pixel audit warns about a likely dark contour spanning an attachment face', () => {
    const images = syntheticMannequin(example);
    const part = example.parts.forearm;
    const image = images.forearm;
    image.rgba = new Uint8Array(image.w * image.h * 4);
    for (let i = 0; i < image.alpha.length; i++) image.rgba[i * 4 + 3] = image.alpha[i];
    const anchor = part.anchors.elbow;
    for (let x = anchor.x - 12; x <= anchor.x + 12; x++) {
        const i = (anchor.y * image.w + x) * 4;
        image.rgba[i] = 5; image.rgba[i + 1] = 5; image.rgba[i + 2] = 5; image.rgba[i + 3] = 255;
    }
    const { warnings } = validatePixelCoverage(example, images);
    assert.ok(warnings.some(warning => warning.includes('forearm.elbow')));
});
