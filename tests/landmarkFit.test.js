import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { applyFit } from '../tools/wrestler-cutter/fit-v2-landmarks.mjs';
import { validateLandmarkFit } from '../tools/wrestler-cutter/validate-landmarks.mjs';
import { decodeRgbaPng, validateSourceManifest } from '../tools/wrestler-cutter/validate-source-manifest.mjs';

const manifestTemplate = JSON.parse(await readFile(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json', import.meta.url),
    'utf8',
));
const approvedImage = decodeRgbaPng(await readFile(new URL(
    '../Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png',
    import.meta.url,
)));
const clone = value => structuredClone(value);

test('approved Thesz landmarks satisfy source disks, declared reuse transforms, boot vectors, and grounding', () => {
    const result = validateLandmarkFit(clone(manifestTemplate), approvedImage);
    assert.deepEqual(result.errors, []);
    assert.deepEqual({
        disks: result.diskCount,
        vectors: result.vectorCount,
        soles: result.soleCount,
        planted: result.groundedSoles,
        productionCells: result.occupiedCells,
    }, { disks: 63, vectors: 63, soles: 10, planted: 5, productionCells: 0 });
});

test('landmark replay is idempotent and produces a structurally valid contract', () => {
    const once = applyFit(clone(manifestTemplate));
    const twice = applyFit(clone(once));
    assert.deepEqual(twice, once);
    assert.deepEqual(validateSourceManifest(once).errors, []);
});

test('landmark gate rejects a transparent joint center', () => {
    const image = { ...approvedImage, alpha: approvedImage.alpha.slice() };
    const panel = manifestTemplate.sourceSheet.masterPanels.front3q;
    const elbow = manifestTemplate.views.front3q.masterLandmarks.leftElbow;
    image.alpha[(panel.y + elbow.y) * image.w + panel.x + elbow.x] = 0;
    const { errors } = validateLandmarkFit(clone(manifestTemplate), image);
    assert.ok(errors.some(error => error.includes('front3q.leftElbow: radius-10 disk')));
});

test('landmark gate rejects an opposite limb that is not a true mirror', () => {
    const manifest = clone(manifestTemplate);
    manifest.views.front.masterLandmarks.rightElbow.x += 1;
    const { errors } = validateLandmarkFit(manifest, approvedImage);
    assert.ok(errors.some(error => error.includes('front: upperArm opposite-side vector')));
});

test('turned views register the same reusable limb without requiring a reflection', () => {
    for (const viewName of ['front3q', 'profile', 'back3q']) {
        assert.equal(manifestTemplate.bilateralSegmentReuse.oppositeTransformByView[viewName],
            'unreflected-registration');
    }
    assert.deepEqual(manifestTemplate.views.profile.registrationOnlyLandmarks, ['leftAnkle']);
    assert.deepEqual(manifestTemplate.views.back3q.registrationOnlyLandmarks, ['rightKnee']);
});

test('registration-only exceptions are restricted to concealed knee and ankle targets', () => {
    const manifest = clone(manifestTemplate);
    manifest.views.profile.registrationOnlyLandmarks.push('rightSole');
    const { errors } = validateSourceManifest(manifest);
    assert.ok(errors.some(error => error.includes('may contain only knee or ankle targets')));
});

test('profile foot correction keeps both soles fixed and lands each ankle on its owned boot', () => {
    const profile = manifestTemplate.views.profile.masterLandmarks;
    assert.deepEqual([profile.leftHip, profile.leftKnee, profile.leftAnkle, profile.leftSole], [
        { x: 378, y: 467 }, { x: 371, y: 568 }, { x: 369, y: 666 }, { x: 385, y: 720 },
    ]);
    assert.deepEqual([profile.rightHip, profile.rightKnee, profile.rightAnkle, profile.rightSole], [
        { x: 398, y: 467 }, { x: 391, y: 568 }, { x: 393, y: 666 }, { x: 441, y: 702 },
    ]);
    assert.equal(Math.abs(profile.leftAnkle.x - profile.rightAnkle.x), 24);
    const squared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    for (const side of ['left', 'right']) {
        assert.equal(squared(profile[`${side}Hip`], profile[`${side}Knee`]), 10250);
        assert.equal(squared(profile[`${side}Knee`], profile[`${side}Ankle`]), 9608);
    }
});

test('the approved back3q fit remains frozen', () => {
    const back3q = manifestTemplate.views.back3q.masterLandmarks;
    assert.deepEqual([back3q.rightHip, back3q.rightKnee, back3q.rightAnkle, back3q.rightSole], [
        { x: 386, y: 467 }, { x: 331, y: 552 }, { x: 329, y: 650 }, { x: 326, y: 710 },
    ]);
    assert.equal(Math.abs(back3q.leftAnkle.x - back3q.rightAnkle.x), 68);
});

test('landmark gate rejects a local boot vector that disagrees with its planted master boot', () => {
    const manifest = clone(manifestTemplate);
    manifest.views.back3q.anchorOverrides.boot.sole.x += 1;
    const { errors } = validateLandmarkFit(manifest, approvedImage);
    assert.ok(errors.some(error => error.includes('back3q: boot ankle->sole vector')));
});
