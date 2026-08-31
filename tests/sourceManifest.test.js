import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

import {
    decodeRgbaPng,
    extractV2SheetImages,
    findV2TransparentRgbViolation,
    validatePelvisSweep,
    validatePixelCoverage,
    validateSourceManifest,
    validateV2MasterPanelPixels,
    verifyV2SourceSheetHash,
} from '../tools/wrestler-cutter/validate-source-manifest.mjs';

const example = JSON.parse(await readFile(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.example.json', import.meta.url),
    'utf8',
));
const v2Example = JSON.parse(await readFile(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json', import.meta.url),
    'utf8',
));

const clone = value => structuredClone(value);

test('the example eight-part source manifest passes', () => {
    assert.deepEqual(validateSourceManifest(clone(example)).errors, []);
});

test('the v1 neutral boot preserves the certified 0.9 ankle-to-sole canvas ratio', () => {
    const neutral = example.variantFamilies.boot.find(variant => variant.id === 'neutral');
    assert.equal((neutral.anchors.sole.y - neutral.anchors.ankle.y) / neutral.canvas.h, 0.9);
    assert.deepEqual(neutral.canvas, { w: 120, h: 120 });
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

function v2PartForSlot(slot) {
    return slot.includes('.') ? slot.slice(0, slot.indexOf('.')) : slot;
}

function fillOpaqueDisk(image, center, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            image.alpha[(center.y + dy) * image.w + center.x + dx] = 255;
        }
    }
}

function resolvedV2AnchorsForTest(manifest, viewName, partName) {
    return {
        ...manifest.parts[partName].anchors,
        ...(manifest.views[viewName].anchorOverrides?.[partName] ?? {}),
    };
}

function v2OrientationAxisForTest(manifest, viewName, partName) {
    const part = manifest.parts[partName];
    const anchors = resolvedV2AnchorsForTest(manifest, viewName, partName);
    const [fromName, toName] = part.orientation.frame;
    const from = anchors[fromName], to = anchors[toName];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function v2OrientedBandPointsForTest(anchor, axis, start, end, radius) {
    const points = new Map();
    const perpendicular = { x: -axis.y, y: axis.x };
    for (let along = start; along <= end; along++) {
        for (let across = -radius; across <= radius; across++) {
            const x = Math.round(anchor.x + axis.x * along + perpendicular.x * across);
            const y = Math.round(anchor.y + axis.y * along + perpendicular.y * across);
            points.set(`${x},${y}`, { x, y });
        }
    }
    return [...points.values()];
}

function fillOpaqueBand(image, anchor, axis, zone) {
    for (const point of [
        ...v2OrientedBandPointsForTest(anchor, axis, -zone.beforePx, -1, zone.opaqueCoreRadiusPx),
        ...v2OrientedBandPointsForTest(anchor, axis, 1, zone.afterPx, zone.opaqueCoreRadiusPx),
    ]) {
        image.alpha[point.y * image.w + point.x] = 255;
    }
}

function roundedRectContainsForTest(x, y, bounds, radius) {
    const left = bounds.x, right = bounds.x + bounds.w - 1;
    const top = bounds.y, bottom = bounds.y + bounds.h - 1;
    const cx = Math.max(left + radius, Math.min(right - radius, x));
    const cy = Math.max(top + radius, Math.min(bottom - radius, y));
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function syntheticV2Images(manifest) {
    const images = { views: {} };
    const grid = manifest.sourceSheet.productionGrid;
    for (const viewName of grid.viewOrder) {
        images.views[viewName] = {};
        for (const slot of grid.slotOrder) {
            const partName = v2PartForSlot(slot);
            const part = manifest.parts[partName];
            images.views[viewName][slot] = {
                w: part.canvas.w,
                h: part.canvas.h,
                alpha: new Uint8Array(part.canvas.w * part.canvas.h),
            };
        }
        for (const slot of grid.slotOrder) {
            const partName = v2PartForSlot(slot);
            const part = manifest.parts[partName];
            if (!part.orientation?.frame) continue;
            const anchors = resolvedV2AnchorsForTest(manifest, viewName, partName);
            const axis = v2OrientationAxisForTest(manifest, viewName, partName);
            for (const [jointName, zone] of Object.entries(part.jointZones ?? {})) {
                const target = images.views[viewName][zone.coveragePart ?? slot];
                fillOpaqueDisk(target, anchors[jointName], zone.opaqueCoreRadiusPx);
                fillOpaqueBand(target, anchors[jointName], axis, zone);
            }
        }
        const coverage = manifest.parts.torso.pelvisCoverage;
        const owner = images.views[viewName][coverage.owner];
        for (let y = coverage.bounds.y; y < coverage.bounds.y + coverage.bounds.h; y++) {
            for (let x = coverage.bounds.x; x < coverage.bounds.x + coverage.bounds.w; x++) {
                if (roundedRectContainsForTest(x, y, coverage.bounds, coverage.cornerRadiusPx)) {
                    owner.alpha[y * owner.w + x] = 255;
                }
            }
        }
        const torsoAnchors = {
            ...manifest.parts.torso.anchors,
            ...(manifest.views[viewName].anchorOverrides?.torso ?? {}),
        };
        const hipSweepRadius = Math.max(coverage.hipRadiusPx, coverage.sweepRadiusPx);
        fillOpaqueDisk(owner, torsoAnchors.leftHip, hipSweepRadius);
        fillOpaqueDisk(owner, torsoAnchors.rightHip, hipSweepRadius);
    }
    return images;
}

test('the canonical v2 source manifest freezes the identity-approved pixels while later reviews remain explicit', () => {
    const result = validateSourceManifest(clone(v2Example));
    assert.deepEqual(result.errors, []);
    assert.ok(result.warnings.some(warning => warning.includes('identity is approved')));

    const mistypedStatus = clone(v2Example);
    mistypedStatus.humanReview.status = 'aproved';
    assert.ok(validateSourceManifest(mistypedStatus).errors.some(error => error.includes('"identity-approved"')));

    const partialPending = clone(v2Example);
    partialPending.humanReview = {
        status: 'pending', sourceSheetSha256: null, extremeJointAngles: false,
        artistStrokeAtGameScale: true, broadcastNearMiddleFar: false,
    };
    assert.ok(validateSourceManifest(partialPending).errors.some(error => error.includes('pending humanReview')));

    const partialIdentity = clone(v2Example);
    partialIdentity.humanReview.extremeJointAngles = true;
    assert.ok(validateSourceManifest(partialIdentity).errors.some(error => error.includes('must remain false when identity-approved')));

    const identityBytes = Buffer.from('identity-approved pixels');
    const frozenIdentity = clone(v2Example);
    frozenIdentity.humanReview.sourceSheetSha256 = createHash('sha256').update(identityBytes).digest('hex');
    assert.equal(verifyV2SourceSheetHash(frozenIdentity, identityBytes), frozenIdentity.humanReview.sourceSheetSha256);
    assert.throws(() => verifyV2SourceSheetHash(frozenIdentity, Buffer.from('pixel drift')),
        /does not match frozen humanReview.sourceSheetSha256/);
});

test('v2 locks the 4096 sheet, five-view registry, 19 slots, and fixed export rectangles', () => {
    const wrongCanvas = clone(v2Example);
    wrongCanvas.sourceSheet.canvas.w = 4095;
    assert.ok(validateSourceManifest(wrongCanvas).errors.some(error => error.includes('exactly 4096x4096')));

    const missingView = clone(v2Example);
    delete missingView.views.back3q;
    assert.ok(validateSourceManifest(missingView).errors.some(error => error.includes('views must contain exactly')));

    const movedSlot = clone(v2Example);
    [movedSlot.sourceSheet.productionGrid.slotOrder[4], movedSlot.sourceSheet.productionGrid.slotOrder[5]]
        = [movedSlot.sourceSheet.productionGrid.slotOrder[5], movedSlot.sourceSheet.productionGrid.slotOrder[4]];
    assert.ok(validateSourceManifest(movedSlot).errors.some(error => error.includes('19-slot registry')));

    const resizedExport = clone(v2Example);
    resizedExport.parts.hand.exportRect.w = 95;
    assert.ok(validateSourceManifest(resizedExport).errors.some(error => error.includes('hand.exportRect')));
});

test('v2 source density is exact across skeleton spans, part anchors, and every master view', () => {
    const wrongDensity = clone(v2Example);
    wrongDensity.assetPixelsPerRigUnit = 2.01;
    assert.ok(validateSourceManifest(wrongDensity).errors.some(error => error.includes('assetPixelsPerRigUnit must be exactly 2')));

    const wrongPartSpan = clone(v2Example);
    wrongPartSpan.parts.upperArm.anchors.elbow.y += 1;
    assert.ok(validateSourceManifest(wrongPartSpan).errors.some(error => error.includes('upperArm structural span')));

    const wrongSourceSpan = clone(v2Example);
    wrongSourceSpan.skeleton.sourceSpansPx.shin = 89;
    assert.ok(validateSourceManifest(wrongSourceSpan).errors.some(error => error.includes('sourceSpansPx.shin')));

    const wrongMaster = clone(v2Example);
    wrongMaster.views.back.masterLandmarks.leftWrist.y += 1;
    assert.ok(validateSourceManifest(wrongMaster).errors.some(error => error.includes('back.masterLandmarks left elbow-to-wrist span')));
});

test('v2 connections require exact centers, non-zero axes, and matching opaque cores', () => {
    const missingCenter = clone(v2Example);
    delete missingCenter.parts.forearm.anchors.elbow;
    assert.ok(validateSourceManifest(missingCenter).errors.some(error => error.includes('connection center is missing')));

    const zeroAxis = clone(v2Example);
    zeroAxis.parts.hand.anchors.wristAxis = { ...zeroAxis.parts.hand.anchors.wrist };
    assert.ok(validateSourceManifest(zeroAxis).errors.some(error => error.includes('axis points must not coincide')
        || error.includes('non-zero authored orientation axis')));

    const mismatchedCore = clone(v2Example);
    mismatchedCore.parts.shin.jointZones.ankle.opaqueCoreRadiusPx = 7;
    assert.ok(validateSourceManifest(mismatchedCore).errors.some(error => error.includes('opaque core must equal the connection radius')));

    const outOfBoundsBand = clone(v2Example);
    outOfBoundsBand.parts.upperArm.anchors.elbow.y = 170;
    assert.ok(validateSourceManifest(outOfBoundsBand).errors.some(error => error.includes('oriented overlap band extends outside')));
});

test('v2 keeps every unimplemented runtime dependency explicit and pending', () => {
    const missing = clone(v2Example);
    delete missing.runtimePrerequisites.bodyViewChannel;
    assert.ok(validateSourceManifest(missing).errors.some(error => error.includes('runtimePrerequisites must contain exactly')));

    const prematurelyReady = clone(v2Example);
    prematurelyReady.runtimePrerequisites.shoulderMaskSlot = 'ready';
    assert.ok(validateSourceManifest(prematurelyReady).errors.some(error => error.includes('shoulderMaskSlot must remain "pending"')));

    const dishonestProfile = clone(v2Example);
    dishonestProfile.views.profile.runtimeStatus = 'production-target';
    assert.ok(validateSourceManifest(dishonestProfile).errors.some(error => error.includes('pending-v2-profile-renderer')));

    const activatedMask = clone(v2Example);
    activatedMask.parts.shoulderMask.runtimeStatus = 'runtime-ready';
    assert.ok(validateSourceManifest(activatedMask).errors.some(error => error.includes('reserved-transparent-until-slot-exists')));

    const legacyBoot = clone(v2Example);
    legacyBoot.parts.boot.groundingContract.currentRuntimeCompatible = true;
    assert.ok(validateSourceManifest(legacyBoot).errors.some(error => error.includes('currentRuntimeCompatible must remain false')));
});

test('v2 locks the artist-stroke and moire-safety contract instead of treating it as optional prose', () => {
    const uniformInk = clone(v2Example);
    uniformInk.artContract.uniformOutlineForbidden = false;
    assert.ok(validateSourceManifest(uniformInk).errors.some(error => error.includes('artist-stroke')));

    const thickenedInk = clone(v2Example);
    thickenedInk.artContract.silhouetteStrokeSourcePx.typicalMax = 10;
    assert.ok(validateSourceManifest(thickenedInk).errors.some(error => error.includes('artist-stroke')));

    const missingPatternGate = clone(v2Example);
    delete missingPatternGate.artContract.forbiddenProjectedPatternPeriodPx;
    assert.ok(validateSourceManifest(missingPatternGate).errors.some(error => error.includes('moire-safety')));
});

test('v2 hand and boot variants require exact bounded semantic anchors and unit normals', () => {
    const missingContact = clone(v2Example);
    delete missingContact.variantFamilies.hand[1].semanticAnchors.contact;
    assert.ok(validateSourceManifest(missingContact).errors.some(error => error.includes('hand.fist.semanticAnchors must contain exactly')));

    const extraBootAnchor = clone(v2Example);
    extraBootAnchor.variantFamilies.boot[0].semanticAnchors.arch = { x: 50, y: 50 };
    assert.ok(validateSourceManifest(extraBootAnchor).errors.some(error => error.includes('boot.neutral.semanticAnchors must contain exactly')));

    const badNormal = clone(v2Example);
    badNormal.variantFamilies.hand[0].semanticAnchors.contactNormal = { x: 0.8, y: 0 };
    assert.ok(validateSourceManifest(badNormal).errors.some(error => error.includes('contactNormal vector length')));

    const escapedToe = clone(v2Example);
    escapedToe.variantFamilies.boot[2].semanticAnchors.toe.x = 120;
    assert.ok(validateSourceManifest(escapedToe).errors.some(error => error.includes('toe lies outside the common canvas')));
});

test('v2 pelvis coverage names a bounded torso-sized underlay and its separate front mask', () => {
    const wrongOwner = clone(v2Example);
    wrongOwner.parts.torso.pelvisCoverage.owner = 'torso';
    assert.ok(validateSourceManifest(wrongOwner).errors.some(error => error.includes('owner must be "pelvisUnderlay"')));

    const wrongMask = clone(v2Example);
    wrongMask.parts.torso.pelvisCoverage.frontMask = 'shoulderMask';
    assert.ok(validateSourceManifest(wrongMask).errors.some(error => error.includes('frontMask must be "pelvisMask"')));

    const escapedBounds = clone(v2Example);
    escapedBounds.parts.torso.pelvisCoverage.bounds.x = 180;
    assert.ok(validateSourceManifest(escapedBounds).errors.some(error => error.includes('bounds must lie inside')));

    const clippedHip = clone(v2Example);
    clippedHip.parts.torso.pelvisCoverage.bounds.x = 90;
    assert.ok(validateSourceManifest(clippedHip).errors.some(error => error.includes('complete base leftHip disk')));
});

test('v2 shoulder coverage stays torso-owned with an explicitly reserved front mask', () => {
    const wrongOwner = clone(v2Example);
    wrongOwner.parts.torso.shoulderCoverage.owner = 'pelvisUnderlay';
    assert.ok(validateSourceManifest(wrongOwner).errors.some(error => error.includes('shoulderCoverage.owner must be "torso"')));

    const wrongMask = clone(v2Example);
    wrongMask.parts.torso.shoulderCoverage.frontMask = 'pelvisMask';
    assert.ok(validateSourceManifest(wrongMask).errors.some(error => error.includes('shoulderCoverage.frontMask must be "shoulderMask"')));

    const wrongSweep = clone(v2Example);
    wrongSweep.parts.torso.shoulderCoverage.sweepRadiusPx = 11;
    assert.ok(validateSourceManifest(wrongSweep).errors.some(error => error.includes('shoulderCoverage.sweepRadiusPx must be exactly 12')));

    const beveled = clone(v2Example);
    beveled.parts.torso.shoulderCoverage.attachmentSurface = 'beveled-cap';
    assert.ok(validateSourceManifest(beveled).errors.some(error => error.includes('shoulderCoverage.attachmentSurface')));
});

test('v2 computes replacement geometry instead of trusting a matching geometryLock label', () => {
    const manifest = clone(v2Example);
    manifest.variantFamilies.hand[1].canvas = { w: 95, h: 96 };
    assert.equal(manifest.variantFamilies.hand[1].geometryLock, manifest.parts.hand.geometryLock);
    const { errors } = validateSourceManifest(manifest);
    assert.ok(errors.some(error => error.includes('computed replacement geometry does not match')));
});

test('v2 pixel audit covers every fixed base and head/hand/boot variant in all five views', () => {
    const images = syntheticV2Images(v2Example);
    assert.deepEqual(validatePixelCoverage(v2Example, images).errors, []);

    const viewName = 'back3q', slot = 'hand.grip';
    const wrist = v2Example.parts.hand.anchors.wrist;
    images.views[viewName][slot].alpha[wrist.y * images.views[viewName][slot].w + wrist.x] = 0;
    const { errors } = validatePixelCoverage(v2Example, images);
    assert.ok(errors.some(error => error.includes('views.back3q.hand.grip.wrist')));
});

test('v2 pixel audit grades both oriented overlap bands for base and replacement slots', () => {
    const beforeGap = syntheticV2Images(v2Example);
    const hand = v2Example.parts.hand;
    const wrist = resolvedV2AnchorsForTest(v2Example, 'front3q', 'hand').wrist;
    const handAxis = v2OrientationAxisForTest(v2Example, 'front3q', 'hand');
    const beforePoint = v2OrientedBandPointsForTest(
        wrist, handAxis, -hand.jointZones.wrist.beforePx, -1, hand.jointZones.wrist.opaqueCoreRadiusPx,
    ).find(point => Math.hypot(point.x - wrist.x, point.y - wrist.y) > hand.jointZones.wrist.opaqueCoreRadiusPx);
    beforeGap.views.front3q['hand.fist'].alpha[
        beforePoint.y * beforeGap.views.front3q['hand.fist'].w + beforePoint.x
    ] = 0;
    let errors = validatePixelCoverage(v2Example, beforeGap).errors;
    assert.ok(errors.some(error => error.includes('views.front3q.hand.fist.wrist.before')));

    const afterGap = syntheticV2Images(v2Example);
    const upperArm = v2Example.parts.upperArm;
    const elbow = resolvedV2AnchorsForTest(v2Example, 'back', 'upperArm').elbow;
    const armAxis = v2OrientationAxisForTest(v2Example, 'back', 'upperArm');
    const afterPoint = v2OrientedBandPointsForTest(
        elbow, armAxis, 1, upperArm.jointZones.elbow.afterPx, upperArm.jointZones.elbow.opaqueCoreRadiusPx,
    ).find(point => Math.hypot(point.x - elbow.x, point.y - elbow.y) > upperArm.jointZones.elbow.opaqueCoreRadiusPx);
    afterGap.views.back.upperArm.alpha[afterPoint.y * afterGap.views.back.upperArm.w + afterPoint.x] = 0;
    errors = validatePixelCoverage(v2Example, afterGap).errors;
    assert.ok(errors.some(error => error.includes('views.back.upperArm.elbow.after')));
});

test('v2 hip joint pixels are owned by pelvisUnderlay even though torso owns the hip anchors', () => {
    const images = syntheticV2Images(v2Example);
    images.views.front.torso.alpha.fill(255);
    const torso = v2Example.parts.torso;
    const leftHip = resolvedV2AnchorsForTest(v2Example, 'front', 'torso').leftHip;
    const axis = v2OrientationAxisForTest(v2Example, 'front', 'torso');
    const point = v2OrientedBandPointsForTest(
        leftHip, axis, -torso.jointZones.leftHip.beforePx, -1,
        torso.jointZones.leftHip.opaqueCoreRadiusPx,
    ).find(candidate => Math.hypot(candidate.x - leftHip.x, candidate.y - leftHip.y)
        > torso.jointZones.leftHip.opaqueCoreRadiusPx);
    images.views.front.pelvisUnderlay.alpha[point.y * images.views.front.pelvisUnderlay.w + point.x] = 0;
    const { errors } = validatePixelCoverage(v2Example, images);
    assert.ok(errors.some(error => error.includes('views.front.pelvisUnderlay.leftHip.before')));
});

test('v2 rejects a transparent pelvis owner in every view while allowing the reserved shoulder mask to stay empty', () => {
    const images = syntheticV2Images(v2Example);
    for (const viewName of v2Example.sourceSheet.productionGrid.viewOrder) {
        assert.ok(images.views[viewName].shoulderMask.alpha.every(value => value === 0));
    }
    assert.deepEqual(validatePixelCoverage(v2Example, images).errors, []);

    images.views.profile.pelvisUnderlay.alpha.fill(0);
    let errors = validatePixelCoverage(v2Example, images).errors;
    assert.ok(errors.some(error => error.includes('views.profile.pelvisUnderlay.pelvisCoverage.bounds')));

    const hipGap = syntheticV2Images(v2Example);
    const frontHip = {
        ...v2Example.parts.torso.anchors,
        ...v2Example.views.front.anchorOverrides.torso,
    }.leftHip;
    hipGap.views.front.pelvisUnderlay.alpha[
        frontHip.y * hipGap.views.front.pelvisUnderlay.w + frontHip.x
    ] = 0;
    errors = validatePixelCoverage(v2Example, hipGap).errors;
    assert.ok(errors.some(error => error.includes('views.front.pelvisUnderlay.pelvisCoverage.leftHip')));
});

test('v2 fixed-cell extraction copies the declared sheet rectangle at exactly 1:1', () => {
    const sheet = { w: 4096, h: 4096, alpha: new Uint8Array(4096 * 4096) };
    const grid = v2Example.sourceSheet.productionGrid;
    const viewIndex = grid.viewOrder.indexOf('back');
    const slotIndex = grid.slotOrder.indexOf('boot.toePoint');
    const globalCell = viewIndex * grid.slotsPerView + slotIndex;
    const cellX = grid.origin.x + (globalCell % grid.columns) * grid.cell.w;
    const cellY = grid.origin.y + Math.floor(globalCell / grid.columns) * grid.cell.h;
    const rect = v2Example.parts.boot.exportRect;
    sheet.alpha[(cellY + rect.y + 9) * sheet.w + cellX + rect.x + 7] = 211;

    const images = extractV2SheetImages(v2Example, sheet);
    const crop = images.views.back['boot.toePoint'];
    assert.deepEqual({ w: crop.w, h: crop.h }, v2Example.parts.boot.canvas);
    assert.equal(crop.alpha[9 * crop.w + 7], 211);
    assert.throws(() => extractV2SheetImages(v2Example, {
        w: 4095, h: 4096, alpha: new Uint8Array(4095 * 4096),
    }), /expected exactly 4096x4096/);
});

test('v2 rejects hidden RGB contamination in fully transparent source pixels', () => {
    const clean = {
        w: 2,
        h: 1,
        alpha: new Uint8Array([0, 255]),
        rgba: new Uint8Array([0, 0, 0, 0, 12, 34, 56, 255]),
    };
    assert.equal(findV2TransparentRgbViolation(clean), null);
    clean.rgba[0] = 9;
    assert.deepEqual(findV2TransparentRgbViolation(clean), { x: 0, y: 0, rgb: [9, 0, 0] });
});

test('approved v2 review binds to the SHA-256 of the exact source-sheet bytes', () => {
    const manifest = clone(v2Example);
    const approvedBytes = Buffer.from('exact approved sheet bytes');
    manifest.humanReview = {
        status: 'approved',
        sourceSheetSha256: createHash('sha256').update(approvedBytes).digest('hex'),
        extremeJointAngles: true,
        artistStrokeAtGameScale: true,
        broadcastNearMiddleFar: true,
    };
    assert.equal(verifyV2SourceSheetHash(manifest, approvedBytes), manifest.humanReview.sourceSheetSha256);
    assert.throws(() => verifyV2SourceSheetHash(manifest, Buffer.from('different bytes')),
        /does not match frozen humanReview.sourceSheetSha256/);
});

function syntheticV2MasterSheet(manifest) {
    const sheet = { w: 4096, h: 4096, alpha: new Uint8Array(4096 * 4096) };
    for (const viewName of manifest.sourceSheet.productionGrid.viewOrder) {
        const panel = manifest.sourceSheet.masterPanels[viewName];
        const landmarks = manifest.views[viewName].masterLandmarks;
        const plantedSide = manifest.bilateralSegmentReuse.bootSourceSideByView[viewName];
        const plantedSole = landmarks[`${plantedSide}Sole`];
        for (let y = landmarks.crown.y; y <= plantedSole.y; y++) {
            sheet.alpha[(panel.y + y) * sheet.w + panel.x + landmarks.crown.x] = 255;
        }
    }
    return sheet;
}

test('v2 master panels require connected-ish nonempty alpha with exact 530px crown-to-sole extent', () => {
    const sheet = syntheticV2MasterSheet(v2Example);
    assert.deepEqual(validateV2MasterPanelPixels(v2Example, sheet).errors, []);

    const profile = v2Example.sourceSheet.masterPanels.profile;
    const profileCrown = v2Example.views.profile.masterLandmarks.crown;
    const profileCrownIndex = (profile.y + profileCrown.y) * sheet.w + profile.x + profileCrown.x;
    sheet.alpha[profileCrownIndex] = 0;
    let errors = validateV2MasterPanelPixels(v2Example, sheet).errors;
    assert.ok(errors.some(error => error.includes('masterPanels.profile: alpha extent')));
    sheet.alpha[profileCrownIndex] = 255;

    const front = v2Example.sourceSheet.masterPanels.front;
    const frontLandmarks = v2Example.views.front.masterLandmarks;
    for (let y = frontLandmarks.crown.y; y <= frontLandmarks.leftSole.y; y++) {
        sheet.alpha[(front.y + y) * sheet.w + front.x + frontLandmarks.crown.x + 100] = 255;
    }
    errors = validateV2MasterPanelPixels(v2Example, sheet).errors;
    assert.ok(errors.some(error => error.includes('masterPanels.front: largest connected alpha component')));
});

function pngChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)]);
}

function rgbaPng(width, height, { transparentRgbAt = null } = {}) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const scanlines = Buffer.alloc((width * 4 + 1) * height);
    if (transparentRgbAt) {
        const offset = transparentRgbAt.y * (width * 4 + 1) + 1 + transparentRgbAt.x * 4;
        scanlines[offset] = transparentRgbAt.r ?? 1;
        scanlines[offset + 1] = transparentRgbAt.g ?? 0;
        scanlines[offset + 2] = transparentRgbAt.b ?? 0;
        scanlines[offset + 3] = 0;
    }
    return Buffer.concat([
        Buffer.from('89504e470d0a1a0a', 'hex'),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', deflateSync(scanlines)),
        pngChunk('IEND', Buffer.alloc(0)),
    ]);
}

test('the --sheet CLI rejects a source PNG that is not exactly 4096x4096', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'marigold-v2-sheet-'));
    try {
        const wrongSheet = join(tempDir, 'wrong.png');
        await writeFile(wrongSheet, rgbaPng(1, 1));
        const script = fileURLToPath(new URL('../tools/wrestler-cutter/validate-source-manifest.mjs', import.meta.url));
        const manifestPath = join(tempDir, 'pending.json');
        const manifest = clone(v2Example);
        manifest.humanReview = { status: 'pending', sourceSheetSha256: null, extremeJointAngles: false, artistStrokeAtGameScale: false, broadcastNearMiddleFar: false };
        await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
        const result = spawnSync(process.execPath, [script, manifestPath, '--sheet', wrongSheet], { encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /expected exactly 4096x4096/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

test('the --sheet CLI rejects transparent RGBA pixels carrying nonzero RGB', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'marigold-v2-transparent-rgb-'));
    try {
        const contaminatedSheet = join(tempDir, 'contaminated.png');
        await writeFile(contaminatedSheet, rgbaPng(4096, 4096, {
            transparentRgbAt: { x: 0, y: 0, r: 7 },
        }));
        const script = fileURLToPath(new URL('../tools/wrestler-cutter/validate-source-manifest.mjs', import.meta.url));
        const manifestPath = join(tempDir, 'pending.json');
        const manifest = clone(v2Example);
        manifest.humanReview = { status: 'pending', sourceSheetSha256: null, extremeJointAngles: false, artistStrokeAtGameScale: false, broadcastNearMiddleFar: false };
        await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
        const result = spawnSync(process.execPath, [script, manifestPath, '--sheet', contaminatedSheet], { encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /transparent source pixel at \(0,0\) has nonzero RGB 7,0,0/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

test('the --sheet CLI rejects byte drift from an approved source-sheet SHA-256', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'marigold-v2-approved-hash-'));
    try {
        const sheetPath = join(tempDir, 'changed.png');
        const manifestPath = join(tempDir, 'approved.json');
        const manifest = clone(v2Example);
        manifest.humanReview = {
            status: 'approved',
            sourceSheetSha256: '0'.repeat(64),
            extremeJointAngles: true,
            artistStrokeAtGameScale: true,
            broadcastNearMiddleFar: true,
        };
        await Promise.all([
            writeFile(sheetPath, rgbaPng(1, 1)),
            writeFile(manifestPath, `${JSON.stringify(manifest)}\n`),
        ]);
        const script = fileURLToPath(new URL('../tools/wrestler-cutter/validate-source-manifest.mjs', import.meta.url));
        const result = spawnSync(process.execPath, [script, manifestPath, '--sheet', sheetPath], { encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /does not match frozen humanReview.sourceSheetSha256/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});
