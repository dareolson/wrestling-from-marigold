import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateSourceManifest } from '../tools/wrestler-cutter/validate-source-manifest.mjs';

const manifest = JSON.parse(await readFile(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json', import.meta.url),
    'utf8',
));

const clone = () => JSON.parse(JSON.stringify(manifest));
const errorsFor = candidate => validateSourceManifest(candidate).errors;

// Milestone 2. A `continuous-fill-no-edge` core is un-outlined paint that only
// reads correctly because something covers it. Before this contract, the
// manifest could only name a coverage owner for the split-pelvis hips, so the
// shoulder cores were filled into the torso artwork where nothing could cover
// them. These tests pin the generalized rule in both directions.

test('a covered shoulder passes and the manifest names its owner', () => {
    assert.deepEqual(errorsFor(clone()), []);
    for (const jointName of ['leftShoulder', 'rightShoulder']) {
        assert.equal(manifest.parts.torso.jointZones[jointName].coveragePart, 'shoulderMask');
    }
    for (const jointName of ['leftHip', 'rightHip']) {
        assert.equal(manifest.parts.torso.jointZones[jointName].coveragePart, 'pelvisUnderlay');
    }
});

test('an exposed shoulder core is rejected', () => {
    for (const jointName of ['leftShoulder', 'rightShoulder']) {
        const candidate = clone();
        delete candidate.parts.torso.jointZones[jointName].coveragePart;
        assert.ok(errorsFor(candidate).some(error =>
            error.includes(`jointZones.${jointName}.coveragePart must be "shoulderMask"`)),
        `${jointName} without a coverage owner must be rejected`);
    }
});

test('the shoulder cores may not be reassigned to another owner', () => {
    const candidate = clone();
    candidate.parts.torso.jointZones.leftShoulder.coveragePart = 'pelvisUnderlay';
    assert.ok(errorsFor(candidate).some(error =>
        error.includes('jointZones.leftShoulder.coveragePart must be "shoulderMask"')));
});

test('coverage is no longer restricted to the split-pelvis hips', () => {
    // The old schema rejected coveragePart anywhere but torso.leftHip/rightHip.
    // Any zone may now name an owner, which is what makes the rule usable for
    // characters whose views hide different chains.
    const candidate = clone();
    candidate.parts.upperArm.jointZones.elbow.coveragePart = 'forearm';
    assert.deepEqual(errorsFor(candidate), []);
});

test('a coverage owner must be a real part, and never the zone owner itself', () => {
    const missing = clone();
    missing.parts.upperArm.jointZones.elbow.coveragePart = 'cape';
    assert.ok(errorsFor(missing).some(error =>
        error.includes('coveragePart "cape" is not a declared part')));

    const selfOwned = clone();
    selfOwned.parts.upperArm.jointZones.elbow.coveragePart = 'upperArm';
    assert.ok(errorsFor(selfOwned).some(error =>
        error.includes('coveragePart must not be the part that owns the zone')));
});

test('a coverage layer is drawn behind the parts whose cores it carries', () => {
    // Drawn on top, a layer carrying flat core fill paints over the collarbone
    // and deltoid strokes and makes a larger pale lump than the defect it was
    // added to remove. pelvisUnderlay has always backed the figure; shoulderMask
    // now sits with it rather than last.
    for (const [viewName, view] of Object.entries(manifest.views)) {
        const order = view.depthOrder;
        assert.ok(order.indexOf('shoulderMask') < order.indexOf('torso'),
            `${viewName}: shoulderMask must be drawn behind the torso`);
        // It belongs with the backing layers, not with the presentation masks.
        // The far-side chain still sits behind everything, so the only ordering
        // that matters is that shoulderMask precedes the torso it supports.
        assert.equal(order.indexOf('shoulderMask'), order.indexOf('pelvisUnderlay') - 1,
            `${viewName}: shoulderMask belongs beside pelvisUnderlay in the backing group`);
        assert.ok(order.indexOf('shoulderMask') < order.indexOf('pelvisMask'),
            `${viewName}: a backing layer must precede the presentation masks`);
    }
});
