#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.example.json');
const FILE_STEMS = Object.freeze({ upperArm: 'upper_arm' });

const REQUIRED_ANCHORS = Object.freeze({
    head: ['neck'],
    torso: ['neck', 'nearShoulder', 'farShoulder', 'nearHip', 'farHip'],
    upperArm: ['shoulder', 'elbow'],
    forearm: ['elbow', 'wrist'],
    hand: ['wrist', 'contact'],
    thigh: ['hip', 'knee'],
    shin: ['knee', 'ankle'],
    boot: ['ankle', 'sole'],
});

const REQUIRED_OVERLAP = Object.freeze({
    upperArm: ['shoulder', 'elbow'],
    forearm: ['elbow', 'wrist'],
    hand: ['wrist'],
    thigh: ['hip', 'knee'],
    shin: ['knee', 'ankle'],
    boot: ['ankle'],
});

// These define geometry and must be byte-for-byte coordinate-identical across
// a replacement family. Contact anchors (hand.contact, boot.sole) describe the
// painted pose and are intentionally allowed to vary per variant.
const LOCKED_VARIANT_ANCHORS = Object.freeze({
    head: ['neck'],
    torso: ['neck', 'nearShoulder', 'farShoulder', 'nearHip', 'farHip'],
    upperArm: ['shoulder', 'elbow'],
    forearm: ['elbow', 'wrist'],
    hand: ['wrist'],
    thigh: ['hip', 'knee'],
    shin: ['knee', 'ankle'],
    boot: ['ankle'],
});

const V2_VIEW_ORDER = Object.freeze(['front', 'front3q', 'profile', 'back3q', 'back']);
const V2_SLOT_ORDER = Object.freeze([
    'torso', 'pelvisUnderlay', 'pelvisMask', 'shoulderMask',
    'upperArm', 'forearm', 'thigh', 'shin',
    'head.idle', 'head.hurt', 'head.effort', 'head.down', 'head.winning',
    'hand.open', 'hand.fist', 'hand.grip',
    'boot.neutral', 'boot.flexed', 'boot.toePoint',
]);
const V2_MASTER_PANELS = Object.freeze({
    front: { x: 64, y: 64, w: 768, h: 960 },
    front3q: { x: 864, y: 64, w: 768, h: 960 },
    profile: { x: 1664, y: 64, w: 768, h: 960 },
    back3q: { x: 2464, y: 64, w: 768, h: 960 },
    back: { x: 3264, y: 64, w: 768, h: 960 },
});
const V2_PART_CONTRACT = Object.freeze({
    head: {
        canvas: { w: 200, h: 200 }, exportRect: { x: 60, y: 60, w: 200, h: 200 }, baseSlot: 'head.idle',
        anchors: ['crown', 'neckAxis', 'neck'], joints: ['neck'], frame: ['neck', 'neckAxis'],
    },
    torso: {
        canvas: { w: 190, h: 260 }, exportRect: { x: 65, y: 30, w: 190, h: 260 }, baseSlot: 'torso',
        anchors: ['neck', 'spineAxis', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'],
        joints: ['neck', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'], frame: ['neck', 'spineAxis'],
    },
    pelvisUnderlay: {
        canvas: { w: 190, h: 260 }, exportRect: { x: 65, y: 30, w: 190, h: 260 }, baseSlot: 'pelvisUnderlay',
        anchors: [], joints: [],
    },
    pelvisMask: {
        canvas: { w: 190, h: 260 }, exportRect: { x: 65, y: 30, w: 190, h: 260 }, baseSlot: 'pelvisMask',
        anchors: [], joints: [],
    },
    shoulderMask: {
        canvas: { w: 190, h: 260 }, exportRect: { x: 65, y: 30, w: 190, h: 260 }, baseSlot: 'shoulderMask',
        anchors: [], joints: [],
    },
    upperArm: {
        canvas: { w: 130, h: 180 }, exportRect: { x: 95, y: 70, w: 130, h: 180 }, baseSlot: 'upperArm',
        anchors: ['shoulder', 'elbow'], joints: ['shoulder', 'elbow'], frame: ['shoulder', 'elbow'],
    },
    forearm: {
        canvas: { w: 110, h: 180 }, exportRect: { x: 105, y: 70, w: 110, h: 180 }, baseSlot: 'forearm',
        anchors: ['elbow', 'wrist'], joints: ['elbow', 'wrist'], frame: ['elbow', 'wrist'],
    },
    hand: {
        canvas: { w: 96, h: 96 }, exportRect: { x: 112, y: 112, w: 96, h: 96 }, baseSlot: 'hand.open',
        anchors: ['wrist', 'wristAxis', 'contact', 'contactNormal'], joints: ['wrist'], frame: ['wrist', 'wristAxis'],
        vectors: ['contactNormal'],
    },
    thigh: {
        canvas: { w: 150, h: 180 }, exportRect: { x: 85, y: 70, w: 150, h: 180 }, baseSlot: 'thigh',
        anchors: ['hip', 'knee'], joints: ['hip', 'knee'], frame: ['hip', 'knee'],
    },
    shin: {
        canvas: { w: 130, h: 210 }, exportRect: { x: 95, y: 55, w: 130, h: 210 }, baseSlot: 'shin',
        anchors: ['knee', 'ankle'], joints: ['knee', 'ankle'], frame: ['knee', 'ankle'],
    },
    boot: {
        canvas: { w: 120, h: 120 }, exportRect: { x: 100, y: 100, w: 120, h: 120 }, baseSlot: 'boot.neutral',
        anchors: ['ankle', 'ankleAxis', 'heel', 'toe', 'sole', 'soleNormal'], joints: ['ankle'], frame: ['ankle', 'ankleAxis'],
        vectors: ['soleNormal'],
    },
});
const V2_MASTER_LANDMARKS = Object.freeze([
    'crown', 'neck',
    'leftShoulder', 'leftElbow', 'leftWrist',
    'rightShoulder', 'rightElbow', 'rightWrist',
    'leftHip', 'leftKnee', 'leftAnkle', 'leftSole',
    'rightHip', 'rightKnee', 'rightAnkle', 'rightSole',
]);
const V2_SPAN_KEYS = Object.freeze([
    'head', 'torso', 'upperArm', 'forearm', 'thigh', 'shin', 'plantedSoleVerticalDrop',
]);
const V2_CONNECTIONS = Object.freeze({
    neck: { parent: ['torso', 'neck'], child: ['head', 'neck'], radius: 8 },
    leftShoulder: { parent: ['torso', 'leftShoulder'], child: ['upperArm', 'shoulder'], radius: 12 },
    rightShoulder: { parent: ['torso', 'rightShoulder'], child: ['upperArm', 'shoulder'], radius: 12 },
    elbow: { parent: ['upperArm', 'elbow'], child: ['forearm', 'elbow'], radius: 10 },
    wrist: { parent: ['forearm', 'wrist'], child: ['hand', 'wrist'], radius: 8 },
    leftHip: { parent: ['torso', 'leftHip'], child: ['thigh', 'hip'], radius: 12 },
    rightHip: { parent: ['torso', 'rightHip'], child: ['thigh', 'hip'], radius: 12 },
    knee: { parent: ['thigh', 'knee'], child: ['shin', 'knee'], radius: 10 },
    ankle: { parent: ['shin', 'ankle'], child: ['boot', 'ankle'], radius: 8 },
});
const V2_VIEW_META = Object.freeze({
    front: { role: 'front-and-face-up-source', runtimeStatus: 'pending-bodyView', cameraNearSide: 'left' },
    front3q: { role: 'front-turn-source', runtimeStatus: 'pending-bodyView', cameraNearSide: 'left' },
    profile: { role: 'primary-gameplay-source', runtimeStatus: 'pending-v2-profile-renderer', cameraNearSide: 'left' },
    back3q: { role: 'rear-turn-source', runtimeStatus: 'pending-bodyView', cameraNearSide: 'right' },
    back: { role: 'back-and-prone-source', runtimeStatus: 'pending-bodyView', cameraNearSide: 'right' },
});
const V2_VARIANTS = Object.freeze({
    head: ['idle', 'hurt', 'effort', 'down', 'winning'],
    hand: ['open', 'fist', 'grip'],
    boot: ['neutral', 'flexed', 'toePoint'],
});
const V2_RUNTIME_PREREQUISITES = Object.freeze([
    'v2Compiler', 'uniformDensityProfileRenderer', 'semanticSolePoseGrounding',
    'bodyViewChannel', 'projectedSocketInterpolation', 'viewDepthOrderTransport',
    'shoulderMaskSlot',
]);
const V2_REQUIRED_SEMANTIC_ANCHORS = Object.freeze({
    hand: ['contact', 'contactNormal'],
    boot: ['heel', 'toe', 'sole', 'soleNormal'],
});
const V2_ART_CONTRACT = Object.freeze({
    targetBodyHeightsPx: [265, 209, 154],
    silhouetteStrokeSourcePx: {
        sustainedMin: 4.4,
        typicalMin: 5,
        typicalMax: 6.5,
        localVariationMinFraction: 0.2,
        localVariationMaxFraction: 0.25,
    },
    majorInternalStrokeSourcePx: { min: 3.5, max: 4.5 },
    secondaryStrokeSourcePx: { min: 2.5, max: 3.2 },
    minimumCriticalLumaDelta: 24,
    minimumStructuralValueFamilies: 4,
    maximumStructuralValueFamilies: 5,
    forbiddenProjectedPatternPeriodPx: { min: 1, max: 8 },
    uniformOutlineForbidden: true,
    hiddenAttachmentBevelForbidden: true,
    regularMicroPatternForbidden: true,
    randomOnePixelJitterForbidden: true,
    grayscaleProofRequired: true,
    broadcastProofRequired: true,
});

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function samePoint(a, b) {
    return a?.x === b?.x && a?.y === b?.y;
}

function sameCanvas(a, b) {
    return a?.w === b?.w && a?.h === b?.h;
}

function sameRect(a, b) {
    return a?.x === b?.x && a?.y === b?.y && a?.w === b?.w && a?.h === b?.h;
}

function sameArray(a, b) {
    return Array.isArray(a) && a.length === b.length && a.every((value, index) => value === b[index]);
}

function sortedKeys(value) {
    return isObject(value) ? Object.keys(value).sort() : [];
}

function requireExactKeys(value, expected, pathLabel, errors) {
    const actual = sortedKeys(value);
    const wanted = [...expected].sort();
    if (!sameArray(actual, wanted)) {
        errors.push(`${pathLabel} must contain exactly ${wanted.join(', ')}`);
    }
}

function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!isObject(value)) return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

function geometrySignature(value) {
    return JSON.stringify(stableValue(value));
}

function finitePoint(point) {
    return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function pointInside(point, canvas) {
    return finitePoint(point) && point.x >= 0 && point.x < canvas.w && point.y >= 0 && point.y < canvas.h;
}

function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function v2PartForSlot(slot) {
    return slot.includes('.') ? slot.slice(0, slot.indexOf('.')) : slot;
}

function resolvedV2Anchors(manifest, viewName, partName, variant = null) {
    return {
        ...(manifest.parts?.[partName]?.anchors ?? {}),
        ...(manifest.views?.[viewName]?.anchorOverrides?.[partName] ?? {}),
        ...(variant?.anchors ?? {}),
    };
}

function v2OrientationAxis(manifest, viewName, partName, variant = null) {
    const part = manifest.parts?.[partName];
    const frame = variant?.orientation?.frame ?? part?.orientation?.frame;
    const anchors = resolvedV2Anchors(manifest, viewName, partName, variant);
    const a = anchors[frame?.[0]], b = anchors[frame?.[1]];
    if (!finitePoint(a) || !finitePoint(b)) return null;
    const length = distance(a, b);
    if (!length) return null;
    return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
}

// V2 overlap bands are sampled in authored source space. For each whole source
// pixel along the declared negative (`beforePx`) or positive (`afterPx`) axis,
// sample the full perpendicular width [-opaqueCoreRadiusPx,+radius], rounding
// each transformed coordinate to its nearest source pixel. The separately
// graded circular core closes the hinge itself. Keeping the axial ends square
// is deliberate: an end-cap disk would extend beyond the declared band length.
function v2OrientedBandPoints(anchor, axis, start, end, radius) {
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

export function findV2TransparentRgbViolation(image) {
    if (!(image?.alpha instanceof Uint8Array) || !(image?.rgba instanceof Uint8Array)) return null;
    for (let index = 0; index < image.alpha.length; index++) {
        if (image.alpha[index] !== 0) continue;
        const rgbaIndex = index * 4;
        if (image.rgba[rgbaIndex] !== 0 || image.rgba[rgbaIndex + 1] !== 0 || image.rgba[rgbaIndex + 2] !== 0) {
            return {
                x: index % image.w,
                y: Math.floor(index / image.w),
                rgb: [image.rgba[rgbaIndex], image.rgba[rgbaIndex + 1], image.rgba[rgbaIndex + 2]],
            };
        }
    }
    return null;
}

export function verifyV2SourceSheetHash(manifest, bytes) {
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (manifest?.humanReview?.status === 'approved'
        && actual !== manifest.humanReview.sourceSheetSha256) {
        throw new Error(`source sheet SHA-256 ${actual} does not match approved humanReview.sourceSheetSha256 ${manifest.humanReview.sourceSheetSha256}`);
    }
    return actual;
}

export function validateV2MasterPanelPixels(manifest, sheetImage, alphaThreshold = 254) {
    const errors = [];
    const expectedCanvas = manifest?.sourceSheet?.canvas ?? { w: 4096, h: 4096 };
    if (sheetImage?.w !== expectedCanvas.w || sheetImage?.h !== expectedCanvas.h) {
        return { errors: [`source sheet is ${sheetImage?.w ?? 'unknown'}x${sheetImage?.h ?? 'unknown'}; expected exactly ${expectedCanvas.w}x${expectedCanvas.h}`] };
    }
    if (!(sheetImage.alpha instanceof Uint8Array)
        || sheetImage.alpha.length !== sheetImage.w * sheetImage.h) {
        return { errors: ['source sheet alpha buffer does not match its canvas for master-panel validation'] };
    }
    for (const viewName of V2_VIEW_ORDER) {
        const panel = manifest.sourceSheet?.masterPanels?.[viewName];
        const landmarks = manifest.views?.[viewName]?.masterLandmarks ?? {};
        if (!panel) continue;
        const mask = new Uint8Array(panel.w * panel.h);
        let total = 0, minY = Infinity, maxY = -Infinity;
        for (let y = 0; y < panel.h; y++) {
            const sourceRow = (panel.y + y) * sheetImage.w + panel.x;
            for (let x = 0; x < panel.w; x++) {
                if (sheetImage.alpha[sourceRow + x] <= alphaThreshold) continue;
                mask[y * panel.w + x] = 1;
                total++;
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
        const prefix = `sourceSheet.masterPanels.${viewName}`;
        if (!total) {
            errors.push(`${prefix}: registered master panel is empty`);
            continue;
        }
        const crownY = landmarks.crown?.y;
        const soleY = Math.max(landmarks.leftSole?.y ?? -Infinity, landmarks.rightSole?.y ?? -Infinity);
        if (minY !== crownY || maxY !== soleY || maxY - minY !== manifest.sourceSheet.masterFigureHeightPx) {
            errors.push(`${prefix}: alpha extent is y=${minY}..${maxY}; expected crown ${crownY}, sole ${soleY}, exact ${manifest.sourceSheet.masterFigureHeightPx}px extent`);
        }

        const queue = new Int32Array(panel.w * panel.h);
        let largest = 0;
        for (let start = 0; start < mask.length; start++) {
            if (mask[start] !== 1) continue;
            let head = 0, tail = 0, component = 0;
            queue[tail++] = start;
            mask[start] = 2;
            while (head < tail) {
                const current = queue[head++];
                component++;
                const x = current % panel.w, y = Math.floor(current / panel.w);
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if ((!dx && !dy) || x + dx < 0 || x + dx >= panel.w || y + dy < 0 || y + dy >= panel.h) continue;
                        const next = (y + dy) * panel.w + x + dx;
                        if (mask[next] !== 1) continue;
                        mask[next] = 2;
                        queue[tail++] = next;
                    }
                }
            }
            largest = Math.max(largest, component);
        }
        if (largest < manifest.sourceSheet.masterFigureHeightPx + 1 || largest / total < 0.9) {
            errors.push(`${prefix}: largest connected alpha component is ${largest}/${total} pixels; expected a crown-to-sole component and >= 90% connected coverage`);
        }
    }
    return { errors };
}

function v2StructuralAnchorNames(partName) {
    const semantic = partName === 'hand'
        ? new Set(['contact', 'contactNormal'])
        : partName === 'boot' ? new Set(['heel', 'toe', 'sole', 'soleNormal']) : new Set();
    return (V2_PART_CONTRACT[partName]?.anchors ?? []).filter(name => !semantic.has(name));
}

function v2ComputedGeometry(manifest, partName, variant = null, viewName = null) {
    const part = manifest.parts?.[partName] ?? {};
    const slotPart = v2PartForSlot(variant?.sheetSlot ?? part.baseSlot ?? partName);
    const slotContract = V2_PART_CONTRACT[slotPart] ?? {};
    const anchors = resolvedV2Anchors(manifest, viewName, partName, variant);
    const structuralAnchors = Object.fromEntries(v2StructuralAnchorNames(partName)
        .map(name => [name, anchors[name]]));
    return {
        canvas: variant?.canvas ?? slotContract.canvas ?? part.canvas,
        exportRect: variant?.exportRect ?? slotContract.exportRect ?? part.exportRect,
        structuralAnchors,
        jointZones: variant?.jointZones ?? part.jointZones,
        orientation: variant?.orientation ?? part.orientation,
        paddingPolicy: variant?.paddingPolicy ?? part.paddingPolicy,
        sourceFacing: variant?.sourceFacing ?? part.orientation?.sourceFacing ?? manifest.sourceFacing,
        assetPixelsPerRigUnit: variant?.assetPixelsPerRigUnit ?? manifest.assetPixelsPerRigUnit,
    };
}

function checkV2Span(actual, expected, label, errors) {
    if (!Number.isFinite(actual) || !Number.isFinite(expected) || Math.abs(actual - expected) > 1e-9) {
        errors.push(`${label} is ${Number.isFinite(actual) ? actual : 'invalid'}px; expected exactly ${expected}px`);
    }
}

function checkV2PartSpans(manifest, viewName, errors) {
    const spans = manifest.skeleton?.sourceSpansPx ?? {};
    const anchors = partName => resolvedV2Anchors(manifest, viewName, partName);
    const head = anchors('head');
    const torso = anchors('torso');
    const upperArm = anchors('upperArm');
    const forearm = anchors('forearm');
    const thigh = anchors('thigh');
    const shin = anchors('shin');
    const boot = anchors('boot');
    const prefix = viewName ? `views.${viewName}` : 'parts';
    if (finitePoint(head.crown) && finitePoint(head.neck)) {
        checkV2Span(distance(head.crown, head.neck), spans.head, `${prefix}.head crown-to-neck span`, errors);
    }
    if (finitePoint(torso.neck) && finitePoint(torso.leftHip) && finitePoint(torso.rightHip)) {
        checkV2Span(distance(torso.neck, midpoint(torso.leftHip, torso.rightHip)), spans.torso,
            `${prefix}.torso neck-to-hip-midpoint span`, errors);
    }
    for (const [partName, points, spanName] of [
        ['upperArm', upperArm, 'upperArm'], ['forearm', forearm, 'forearm'],
        ['thigh', thigh, 'thigh'], ['shin', shin, 'shin'],
    ]) {
        const frame = V2_PART_CONTRACT[partName].frame;
        if (finitePoint(points[frame[0]]) && finitePoint(points[frame[1]])) {
            checkV2Span(distance(points[frame[0]], points[frame[1]]), spans[spanName],
                `${prefix}.${partName} structural span`, errors);
        }
    }
    if (finitePoint(boot.ankle) && finitePoint(boot.sole)) {
        checkV2Span(Math.abs(boot.sole.y - boot.ankle.y), spans.plantedSoleVerticalDrop,
            `${prefix}.boot planted-sole vertical drop`, errors);
    }
}

function checkV2MasterSpans(manifest, viewName, landmarks, errors) {
    const spans = manifest.skeleton?.sourceSpansPx ?? {};
    const prefix = `views.${viewName}.masterLandmarks`;
    if (finitePoint(landmarks.crown) && finitePoint(landmarks.neck)) {
        checkV2Span(distance(landmarks.crown, landmarks.neck), spans.head, `${prefix} crown-to-neck span`, errors);
    }
    if (finitePoint(landmarks.neck) && finitePoint(landmarks.leftHip) && finitePoint(landmarks.rightHip)) {
        checkV2Span(distance(landmarks.neck, midpoint(landmarks.leftHip, landmarks.rightHip)), spans.torso,
            `${prefix} neck-to-hip-midpoint span`, errors);
    }
    for (const side of ['left', 'right']) {
        for (const [from, to, spanName] of [
            ['Shoulder', 'Elbow', 'upperArm'], ['Elbow', 'Wrist', 'forearm'],
            ['Hip', 'Knee', 'thigh'], ['Knee', 'Ankle', 'shin'],
        ]) {
            const a = landmarks[`${side}${from}`], b = landmarks[`${side}${to}`];
            if (finitePoint(a) && finitePoint(b)) {
                checkV2Span(distance(a, b), spans[spanName], `${prefix} ${side} ${from.toLowerCase()}-to-${to.toLowerCase()} span`, errors);
            }
        }
        const ankle = landmarks[`${side}Ankle`], sole = landmarks[`${side}Sole`];
        if (finitePoint(ankle) && finitePoint(sole)) {
            checkV2Span(Math.abs(sole.y - ankle.y), spans.plantedSoleVerticalDrop,
                `${prefix} ${side} planted-sole vertical drop`, errors);
        }
        if (finitePoint(landmarks.crown) && finitePoint(sole)) {
            checkV2Span(Math.abs(sole.y - landmarks.crown.y), manifest.sourceSheet?.masterFigureHeightPx,
                `${prefix} ${side} crown-to-sole height`, errors);
        }
    }
}

function validateSourceManifestV2(manifest) {
    const errors = [];
    const warnings = [];
    const sheet = manifest.sourceSheet;
    const grid = sheet?.productionGrid;
    const density = manifest.assetPixelsPerRigUnit;

    if (manifest.rigContract !== 'marigold-modular-v2') errors.push('rigContract must be "marigold-modular-v2"');
    if (!manifest.characterId) errors.push('characterId is required');
    if (manifest.coordinateSpace !== 'export-pixels') errors.push('coordinateSpace must be "export-pixels"');
    if (density !== 2) errors.push('assetPixelsPerRigUnit must be exactly 2');
    if (manifest.minimumJointOverlapPx !== 12) errors.push('minimumJointOverlapPx must be exactly 12');
    if (manifest.jointSurfaceRule !== 'continuous-fill-no-edge') errors.push('jointSurfaceRule must be "continuous-fill-no-edge"');
    if (manifest.slotConvention !== 'anatomical-left-right') errors.push('slotConvention must be "anatomical-left-right"');
    if (manifest.sourceFacing !== 'right') errors.push('sourceFacing must be "right"');
    if (geometrySignature(manifest.artContract) !== geometrySignature(V2_ART_CONTRACT)) {
        errors.push('artContract must match the canonical artist-stroke, value, grayscale, and moire-safety contract exactly');
    }
    requireExactKeys(manifest.runtimePrerequisites, V2_RUNTIME_PREREQUISITES, 'runtimePrerequisites', errors);
    for (const prerequisite of V2_RUNTIME_PREREQUISITES) {
        if (manifest.runtimePrerequisites?.[prerequisite] !== 'pending') {
            errors.push(`runtimePrerequisites.${prerequisite} must remain "pending" until its runtime implementation is certified`);
        }
    }
    if (manifest.markerLayer?.name !== 'RIG_MARKERS'
        || manifest.markerLayer?.exportedIntoArt !== false
        || manifest.markerLayer?.centers !== true
        || manifest.markerLayer?.axes !== true
        || manifest.markerLayer?.coverageRings !== true) {
        errors.push('markerLayer must retain non-exported RIG_MARKERS centers, axes, and coverage rings');
    }

    if (!isObject(sheet)) {
        errors.push('sourceSheet is required');
    } else {
        if (!sheet.file || !sheet.guideFile || sheet.file === sheet.guideFile) {
            errors.push('sourceSheet.file and distinct sourceSheet.guideFile are required');
        }
        if (!sameCanvas(sheet.canvas, { w: 4096, h: 4096 })) errors.push('sourceSheet.canvas must be exactly 4096x4096');
        if (sheet.masterFigureHeightPx !== 530) errors.push('sourceSheet.masterFigureHeightPx must be exactly 530');
        requireExactKeys(sheet.masterPanels, V2_VIEW_ORDER, 'sourceSheet.masterPanels', errors);
        for (const viewName of V2_VIEW_ORDER) {
            if (!sameRect(sheet.masterPanels?.[viewName], V2_MASTER_PANELS[viewName])) {
                errors.push(`sourceSheet.masterPanels.${viewName} must be exactly ${JSON.stringify(V2_MASTER_PANELS[viewName])}`);
            }
        }
        if (!samePoint(grid?.origin, { x: 128, y: 1280 })) errors.push('sourceSheet.productionGrid.origin must be exactly {x:128,y:1280}');
        if (!sameCanvas(grid?.cell, { w: 320, h: 320 })) errors.push('sourceSheet.productionGrid.cell must be exactly 320x320');
        if (grid?.columns !== 12 || grid?.rows !== 8 || grid?.slotsPerView !== 19) {
            errors.push('sourceSheet.productionGrid must be exactly 12 columns x 8 rows with 19 slots per view');
        }
        if (!sameArray(grid?.viewOrder, V2_VIEW_ORDER)) errors.push(`sourceSheet.productionGrid.viewOrder must be ${V2_VIEW_ORDER.join(', ')}`);
        if (!sameArray(grid?.slotOrder, V2_SLOT_ORDER)) errors.push('sourceSheet.productionGrid.slotOrder must match the canonical 19-slot registry exactly');
        if (!sameArray(grid?.reservedCells, [95])) errors.push('sourceSheet.productionGrid.reservedCells must be exactly [95]');
        if (sheet.extractionPolicy !== 'fixed-rect-1to1-no-trim-no-resample') {
            errors.push('sourceSheet.extractionPolicy must be "fixed-rect-1to1-no-trim-no-resample"');
        }
        if (!sameArray(sheet.transparentPixelRgb, [0, 0, 0])) errors.push('sourceSheet.transparentPixelRgb must be exactly [0,0,0]');
    }

    requireExactKeys(manifest.parts, Object.keys(V2_PART_CONTRACT), 'parts', errors);
    for (const [partName, contract] of Object.entries(V2_PART_CONTRACT)) {
        const part = manifest.parts?.[partName];
        const prefix = `parts.${partName}`;
        if (!isObject(part)) {
            errors.push(`${prefix} is required`);
            continue;
        }
        if (!part.geometryLock) errors.push(`${prefix}.geometryLock is required`);
        if (!sameCanvas(part.canvas, contract.canvas)) errors.push(`${prefix}.canvas must be exactly ${contract.canvas.w}x${contract.canvas.h}`);
        if (!sameRect(part.exportRect, contract.exportRect)) errors.push(`${prefix}.exportRect must match its canonical fixed-cell export rectangle`);
        if (part.baseSlot !== contract.baseSlot) errors.push(`${prefix}.baseSlot must be "${contract.baseSlot}"`);
        if (part.paddingPolicy !== 'fixed-canvas-no-alpha-trim') errors.push(`${prefix}.paddingPolicy must be "fixed-canvas-no-alpha-trim"`);
        if (part.orientation?.sourceFacing !== 'right') errors.push(`${prefix}.orientation.sourceFacing must be "right"`);
        for (const anchorName of contract.anchors) {
            const point = part.anchors?.[anchorName];
            if (!finitePoint(point)) {
                errors.push(`${prefix}.anchors.${anchorName} requires numeric x/y`);
                continue;
            }
            if (contract.vectors?.includes(anchorName)) {
                checkV2Span(Math.hypot(point.x, point.y), 1, `${prefix}.anchors.${anchorName} vector length`, errors);
            } else if (!pointInside(point, part.canvas)) {
                errors.push(`${prefix}.anchors.${anchorName} lies outside its canvas`);
            }
        }
        requireExactKeys(part.jointZones, contract.joints, `${prefix}.jointZones`, errors);
        for (const jointName of contract.joints) {
            const zone = part.jointZones?.[jointName];
            const anchor = part.anchors?.[jointName];
            const zonePrefix = `${prefix}.jointZones.${jointName}`;
            if (!isObject(zone)) continue;
            if (!Number.isFinite(zone.beforePx) || zone.beforePx < manifest.minimumJointOverlapPx) {
                errors.push(`${zonePrefix}.beforePx must be >= ${manifest.minimumJointOverlapPx}`);
            }
            if (!Number.isFinite(zone.afterPx) || zone.afterPx < manifest.minimumJointOverlapPx) {
                errors.push(`${zonePrefix}.afterPx must be >= ${manifest.minimumJointOverlapPx}`);
            }
            if (!Number.isFinite(zone.opaqueCoreRadiusPx) || zone.opaqueCoreRadiusPx <= 0
                || zone.opaqueCoreRadiusPx > Math.min(zone.beforePx ?? 0, zone.afterPx ?? 0)) {
                errors.push(`${zonePrefix}.opaqueCoreRadiusPx must fit inside both overlap sides`);
            }
            if (zone.surface !== 'continuous-fill-no-edge') errors.push(`${zonePrefix}.surface must be "continuous-fill-no-edge"`);
            const expectedCoveragePart = partName === 'torso' && ['leftHip', 'rightHip'].includes(jointName)
                ? 'pelvisUnderlay' : null;
            if (expectedCoveragePart && zone.coveragePart !== expectedCoveragePart) {
                errors.push(`${zonePrefix}.coveragePart must be "${expectedCoveragePart}"`);
            } else if (!expectedCoveragePart && zone.coveragePart !== undefined) {
                errors.push(`${zonePrefix}.coveragePart is only valid for split-pelvis hip coverage`);
            }
            const coverageCanvas = manifest.parts?.[zone.coveragePart]?.canvas ?? part.canvas;
            const axis = v2OrientationAxis(manifest, null, partName);
            if (finitePoint(anchor) && axis && Number.isFinite(zone.beforePx)
                && Number.isFinite(zone.afterPx) && Number.isFinite(zone.opaqueCoreRadiusPx)) {
                const beforePoints = v2OrientedBandPoints(anchor, axis, -zone.beforePx, -1, zone.opaqueCoreRadiusPx);
                const afterPoints = v2OrientedBandPoints(anchor, axis, 1, zone.afterPx, zone.opaqueCoreRadiusPx);
                if ([...beforePoints, ...afterPoints].some(point => !pointInside(point, coverageCanvas))) {
                    errors.push(`${zonePrefix} oriented overlap band extends outside its coverage canvas`);
                }
            }
            if (finitePoint(anchor) && Number.isFinite(zone.opaqueCoreRadiusPx)
                && (anchor.x - zone.opaqueCoreRadiusPx < 0 || anchor.x + zone.opaqueCoreRadiusPx >= coverageCanvas.w
                    || anchor.y - zone.opaqueCoreRadiusPx < 0 || anchor.y + zone.opaqueCoreRadiusPx >= coverageCanvas.h)) {
                errors.push(`${zonePrefix} opaque core extends outside the export canvas`);
            }
        }
        if (contract.frame) {
            if (!sameArray(part.orientation?.frame, contract.frame)) errors.push(`${prefix}.orientation.frame must be [${contract.frame.join(', ')}]`);
            const a = part.anchors?.[contract.frame[0]], b = part.anchors?.[contract.frame[1]];
            if (finitePoint(a) && finitePoint(b) && distance(a, b) === 0) errors.push(`${prefix}.orientation.frame axis points must not coincide`);
        } else if (part.orientation?.frame !== undefined) {
            errors.push(`${prefix}.orientation.frame is not valid for a mask-only part`);
        }
        if (part.exportRect && (part.exportRect.x < 0 || part.exportRect.y < 0
            || part.exportRect.x + part.exportRect.w > 320 || part.exportRect.y + part.exportRect.h > 320)) {
            errors.push(`${prefix}.exportRect lies outside its 320x320 macro-cell`);
        }
    }

    const torso = manifest.parts?.torso;
    const pelvisCoverage = torso?.pelvisCoverage;
    if (!isObject(pelvisCoverage)) {
        errors.push('parts.torso.pelvisCoverage is required');
    } else {
        const bounds = pelvisCoverage.bounds;
        const owner = manifest.parts?.[pelvisCoverage.owner];
        const frontMask = manifest.parts?.[pelvisCoverage.frontMask];
        if (pelvisCoverage.owner !== 'pelvisUnderlay') {
            errors.push('parts.torso.pelvisCoverage.owner must be "pelvisUnderlay"');
        }
        if (pelvisCoverage.frontMask !== 'pelvisMask') {
            errors.push('parts.torso.pelvisCoverage.frontMask must be "pelvisMask"');
        }
        if (!owner || !sameCanvas(owner.canvas, torso?.canvas)) {
            errors.push('parts.torso.pelvisCoverage.owner must name a torso-sized production part');
        }
        if (!frontMask || !sameCanvas(frontMask.canvas, torso?.canvas)) {
            errors.push('parts.torso.pelvisCoverage.frontMask must name a torso-sized production part');
        }
        if (!Number.isInteger(bounds?.x) || !Number.isInteger(bounds?.y)
            || !Number.isInteger(bounds?.w) || bounds.w <= 0
            || !Number.isInteger(bounds?.h) || bounds.h <= 0) {
            errors.push('parts.torso.pelvisCoverage.bounds must contain positive integer x/y/w/h');
        } else if (!torso?.canvas || bounds.x < 0 || bounds.y < 0
            || bounds.x + bounds.w > torso.canvas.w || bounds.y + bounds.h > torso.canvas.h) {
            errors.push('parts.torso.pelvisCoverage.bounds must lie inside the torso-sized owner canvas');
        }
        if (pelvisCoverage.cornerRadiusPx !== 18) {
            errors.push('parts.torso.pelvisCoverage.cornerRadiusPx must be exactly 18');
        } else if (bounds && pelvisCoverage.cornerRadiusPx > Math.min(bounds.w, bounds.h) / 2) {
            errors.push('parts.torso.pelvisCoverage.cornerRadiusPx does not fit its bounds');
        }
        if (pelvisCoverage.hipRadiusPx !== V2_CONNECTIONS.leftHip.radius) {
            errors.push(`parts.torso.pelvisCoverage.hipRadiusPx must be exactly ${V2_CONNECTIONS.leftHip.radius}`);
        }
        if (pelvisCoverage.sweepRadiusPx !== V2_CONNECTIONS.leftHip.radius) {
            errors.push(`parts.torso.pelvisCoverage.sweepRadiusPx must be exactly ${V2_CONNECTIONS.leftHip.radius}`);
        }
        if (pelvisCoverage.attachmentSurface !== 'continuous-fill-no-edge') {
            errors.push('parts.torso.pelvisCoverage.attachmentSurface must be "continuous-fill-no-edge"');
        }
        if (bounds && Number.isFinite(pelvisCoverage.hipRadiusPx)) {
            for (const hipName of ['leftHip', 'rightHip']) {
                const hip = torso?.anchors?.[hipName];
                const radius = pelvisCoverage.hipRadiusPx;
                if (finitePoint(hip) && (hip.x - radius < bounds.x || hip.x + radius >= bounds.x + bounds.w
                    || hip.y - radius < bounds.y || hip.y + radius >= bounds.y + bounds.h)) {
                    errors.push(`parts.torso.pelvisCoverage.bounds must contain the complete base ${hipName} disk`);
                }
            }
        }
    }

    const shoulderCoverage = torso?.shoulderCoverage;
    if (!isObject(shoulderCoverage)) {
        errors.push('parts.torso.shoulderCoverage is required');
    } else {
        const owner = manifest.parts?.[shoulderCoverage.owner];
        const frontMask = manifest.parts?.[shoulderCoverage.frontMask];
        if (shoulderCoverage.owner !== 'torso') {
            errors.push('parts.torso.shoulderCoverage.owner must be "torso"');
        }
        if (shoulderCoverage.frontMask !== 'shoulderMask') {
            errors.push('parts.torso.shoulderCoverage.frontMask must be "shoulderMask"');
        }
        if (!owner || !sameCanvas(owner.canvas, torso?.canvas)) {
            errors.push('parts.torso.shoulderCoverage.owner must name the torso-sized torso production part');
        }
        if (!frontMask || !sameCanvas(frontMask.canvas, torso?.canvas)) {
            errors.push('parts.torso.shoulderCoverage.frontMask must name a torso-sized production part');
        }
        if (shoulderCoverage.shoulderRadiusPx !== V2_CONNECTIONS.leftShoulder.radius) {
            errors.push(`parts.torso.shoulderCoverage.shoulderRadiusPx must be exactly ${V2_CONNECTIONS.leftShoulder.radius}`);
        }
        if (shoulderCoverage.sweepRadiusPx !== V2_CONNECTIONS.leftShoulder.radius) {
            errors.push(`parts.torso.shoulderCoverage.sweepRadiusPx must be exactly ${V2_CONNECTIONS.leftShoulder.radius}`);
        }
        if (shoulderCoverage.neckRadiusPx !== V2_CONNECTIONS.neck.radius) {
            errors.push(`parts.torso.shoulderCoverage.neckRadiusPx must be exactly ${V2_CONNECTIONS.neck.radius}`);
        }
        if (shoulderCoverage.attachmentSurface !== 'continuous-fill-no-edge') {
            errors.push('parts.torso.shoulderCoverage.attachmentSurface must be "continuous-fill-no-edge"');
        }
    }
    if (manifest.parts?.shoulderMask?.runtimeStatus !== 'reserved-transparent-until-slot-exists') {
        errors.push('parts.shoulderMask.runtimeStatus must be "reserved-transparent-until-slot-exists"');
    }

    const boneLengths = manifest.skeleton?.boneLengths;
    const sourceSpans = manifest.skeleton?.sourceSpansPx;
    if (!manifest.skeleton?.id) errors.push('skeleton.id is required');
    requireExactKeys(boneLengths, V2_SPAN_KEYS, 'skeleton.boneLengths', errors);
    requireExactKeys(sourceSpans, V2_SPAN_KEYS, 'skeleton.sourceSpansPx', errors);
    for (const spanName of V2_SPAN_KEYS) {
        const bone = boneLengths?.[spanName], span = sourceSpans?.[spanName];
        if (!Number.isFinite(bone) || bone <= 0) errors.push(`skeleton.boneLengths.${spanName} must be positive`);
        if (!Number.isFinite(span) || span <= 0) errors.push(`skeleton.sourceSpansPx.${spanName} must be positive`);
        if (Number.isFinite(bone) && Number.isFinite(span) && span !== bone * density) {
            errors.push(`skeleton.sourceSpansPx.${spanName} must equal bone length x assetPixelsPerRigUnit (${bone * density})`);
        }
    }
    if (sourceSpans && sourceSpans.head + sourceSpans.torso + sourceSpans.thigh + sourceSpans.shin
        + sourceSpans.plantedSoleVerticalDrop !== sheet?.masterFigureHeightPx) {
        errors.push('skeleton vertical source spans must add exactly to sourceSheet.masterFigureHeightPx');
    }
    const grounding = manifest.parts?.boot?.groundingContract;
    if (grounding?.mode !== 'semantic-sole-uniform-density-v2') {
        errors.push('parts.boot.groundingContract.mode must be "semantic-sole-uniform-density-v2"');
    }
    if (grounding?.verticalDropPx !== sourceSpans?.plantedSoleVerticalDrop) {
        errors.push('parts.boot.groundingContract.verticalDropPx must equal skeleton.sourceSpansPx.plantedSoleVerticalDrop');
    }
    if (grounding?.currentRuntimeCompatible !== false) {
        errors.push('parts.boot.groundingContract.currentRuntimeCompatible must remain false until semantic sole grounding is certified');
    }
    checkV2PartSpans(manifest, null, errors);

    requireExactKeys(manifest.views, V2_VIEW_ORDER, 'views', errors);
    const depthParts = ['leftArm', 'leftLeg', 'rightArm', 'rightLeg', 'pelvisUnderlay', 'torso', 'pelvisMask', 'shoulderMask', 'head'].sort();
    for (const [index, viewName] of V2_VIEW_ORDER.entries()) {
        const view = manifest.views?.[viewName];
        const prefix = `views.${viewName}`;
        if (!isObject(view)) continue;
        const meta = V2_VIEW_META[viewName];
        if (view.index !== index) errors.push(`${prefix}.index must be ${index}`);
        for (const field of ['role', 'runtimeStatus', 'cameraNearSide']) {
            if (view[field] !== meta[field]) errors.push(`${prefix}.${field} must be "${meta[field]}"`);
        }
        const actualDepth = Array.isArray(view.depthOrder) ? [...view.depthOrder].sort() : [];
        if (!sameArray(actualDepth, depthParts)) errors.push(`${prefix}.depthOrder must contain each anatomical side and presentation layer exactly once`);
        requireExactKeys(view.masterLandmarks, V2_MASTER_LANDMARKS, `${prefix}.masterLandmarks`, errors);
        for (const landmarkName of V2_MASTER_LANDMARKS) {
            const point = view.masterLandmarks?.[landmarkName];
            if (!pointInside(point, { w: 768, h: 960 })) errors.push(`${prefix}.masterLandmarks.${landmarkName} must lie inside its 768x960 panel`);
        }
        for (const [partName, overrides] of Object.entries(view.anchorOverrides ?? {})) {
            const part = manifest.parts?.[partName];
            if (!part) {
                errors.push(`${prefix}.anchorOverrides.${partName} refers to an unknown part`);
                continue;
            }
            for (const [anchorName, point] of Object.entries(overrides ?? {})) {
                if (!(anchorName in (part.anchors ?? {}))) errors.push(`${prefix}.anchorOverrides.${partName}.${anchorName} is not a declared anchor`);
                if (!pointInside(point, part.canvas)) errors.push(`${prefix}.anchorOverrides.${partName}.${anchorName} lies outside the part canvas`);
            }
        }
        for (const [partName, contract] of Object.entries(V2_PART_CONTRACT)) {
            if (!contract.frame) continue;
            const anchors = resolvedV2Anchors(manifest, viewName, partName);
            const a = anchors[contract.frame[0]], b = anchors[contract.frame[1]];
            if (finitePoint(a) && finitePoint(b) && distance(a, b) === 0) errors.push(`${prefix}.${partName} orientation axis points must not coincide`);
            const axis = v2OrientationAxis(manifest, viewName, partName);
            for (const [jointName, zone] of Object.entries(manifest.parts?.[partName]?.jointZones ?? {})) {
                const anchor = anchors[jointName];
                const coverageCanvas = manifest.parts?.[zone.coveragePart]?.canvas ?? manifest.parts?.[partName]?.canvas;
                if (!finitePoint(anchor) || !axis || !coverageCanvas
                    || !Number.isFinite(zone.beforePx) || !Number.isFinite(zone.afterPx)
                    || !Number.isFinite(zone.opaqueCoreRadiusPx)) continue;
                const points = [
                    ...v2OrientedBandPoints(anchor, axis, -zone.beforePx, -1, zone.opaqueCoreRadiusPx),
                    ...v2OrientedBandPoints(anchor, axis, 1, zone.afterPx, zone.opaqueCoreRadiusPx),
                ];
                if (points.some(point => !pointInside(point, coverageCanvas))) {
                    errors.push(`${prefix}.${partName}.jointZones.${jointName} oriented overlap band extends outside its coverage canvas`);
                }
            }
        }
        checkV2PartSpans(manifest, viewName, errors);
        checkV2MasterSpans(manifest, viewName, view.masterLandmarks ?? {}, errors);
    }

    const reuse = manifest.bilateralSegmentReuse;
    if (!sameArray(reuse?.families, ['upperArm', 'forearm', 'thigh', 'shin'])
        || reuse?.policy !== 'one-declared-source-side-mirrored-to-opposite-side') {
        errors.push('bilateralSegmentReuse must declare the canonical four bilateral families and mirrored-source policy');
    }
    for (const viewName of V2_VIEW_ORDER) {
        if (reuse?.sourceSideByView?.[viewName] !== V2_VIEW_META[viewName].cameraNearSide) {
            errors.push(`bilateralSegmentReuse.sourceSideByView.${viewName} must be "${V2_VIEW_META[viewName].cameraNearSide}"`);
        }
    }

    requireExactKeys(manifest.connections, Object.keys(V2_CONNECTIONS), 'connections', errors);
    for (const [connectionName, expected] of Object.entries(V2_CONNECTIONS)) {
        const connection = manifest.connections?.[connectionName];
        const prefix = `connections.${connectionName}`;
        if (!isObject(connection)) continue;
        for (const endpoint of ['parent', 'child']) {
            const [partName, anchorName] = expected[endpoint];
            if (connection[endpoint]?.part !== partName || connection[endpoint]?.anchor !== anchorName) {
                errors.push(`${prefix}.${endpoint} must be ${partName}.${anchorName}`);
            }
            const part = manifest.parts?.[partName];
            const zone = part?.jointZones?.[anchorName];
            if (!finitePoint(part?.anchors?.[anchorName])) errors.push(`${prefix}.${endpoint} connection center is missing`);
            if (zone?.opaqueCoreRadiusPx !== connection.opaqueCoreRadiusPx) {
                errors.push(`${prefix}.${endpoint} opaque core must equal the connection radius`);
            }
            const frame = part?.orientation?.frame;
            if (!Array.isArray(frame) || frame.length !== 2
                || !finitePoint(part.anchors?.[frame[0]]) || !finitePoint(part.anchors?.[frame[1]])
                || distance(part.anchors[frame[0]], part.anchors[frame[1]]) === 0) {
                errors.push(`${prefix}.${endpoint} requires a non-zero authored orientation axis`);
            }
        }
        if (connection.opaqueCoreRadiusPx !== expected.radius) errors.push(`${prefix}.opaqueCoreRadiusPx must be exactly ${expected.radius}`);
    }

    requireExactKeys(manifest.variantFamilies, Object.keys(V2_VARIANTS), 'variantFamilies', errors);
    for (const [partName, expectedIds] of Object.entries(V2_VARIANTS)) {
        const variants = manifest.variantFamilies?.[partName];
        const prefix = `variantFamilies.${partName}`;
        if (!Array.isArray(variants)) {
            errors.push(`${prefix} must be an array`);
            continue;
        }
        if (!sameArray(variants.map(variant => variant?.id), expectedIds)) {
            errors.push(`${prefix} must contain ${expectedIds.join(', ')} in canonical slot order`);
        }
        const base = manifest.parts?.[partName];
        for (const variant of variants) {
            const variantPrefix = `${prefix}.${variant?.id ?? '<missing-id>'}`;
            if (variant?.sheetSlot !== `${partName}.${variant?.id}`) errors.push(`${variantPrefix}.sheetSlot must be "${partName}.${variant?.id}"`);
            if (!V2_SLOT_ORDER.includes(variant?.sheetSlot)) errors.push(`${variantPrefix}.sheetSlot is not in the production slot registry`);
            if (variant?.geometryLock !== base?.geometryLock) errors.push(`${variantPrefix}.geometryLock must equal ${base?.geometryLock}`);
            for (const viewName of V2_VIEW_ORDER) {
                const baseGeometry = v2ComputedGeometry(manifest, partName, null, viewName);
                const variantGeometry = v2ComputedGeometry(manifest, partName, variant, viewName);
                if (geometrySignature(variantGeometry) !== geometrySignature(baseGeometry)) {
                    errors.push(`${variantPrefix}: computed replacement geometry does not match the base in ${viewName}`);
                    break;
                }
            }
            const requiredSemanticAnchors = V2_REQUIRED_SEMANTIC_ANCHORS[partName];
            if (requiredSemanticAnchors) {
                requireExactKeys(variant?.semanticAnchors, requiredSemanticAnchors,
                    `${variantPrefix}.semanticAnchors`, errors);
            }
            for (const [name, point] of Object.entries(variant?.semanticAnchors ?? {})) {
                if (!finitePoint(point)) {
                    errors.push(`${variantPrefix}.semanticAnchors.${name} requires numeric x/y`);
                } else if (name.endsWith('Normal')) {
                    checkV2Span(Math.hypot(point.x, point.y), 1, `${variantPrefix}.semanticAnchors.${name} vector length`, errors);
                } else if (!pointInside(point, base?.canvas ?? { w: 0, h: 0 })) {
                    errors.push(`${variantPrefix}.semanticAnchors.${name} lies outside the common canvas`);
                }
            }
        }
    }

    requireExactKeys(manifest.humanReview, [
        'status', 'sourceSheetSha256', 'extremeJointAngles',
        'artistStrokeAtGameScale', 'broadcastNearMiddleFar',
    ], 'humanReview', errors);
    if (manifest.humanReview?.status === 'pending') {
        if (manifest.humanReview.sourceSheetSha256 !== null
            || manifest.humanReview.extremeJointAngles !== false
            || manifest.humanReview.artistStrokeAtGameScale !== false
            || manifest.humanReview.broadcastNearMiddleFar !== false) {
            errors.push('pending humanReview must keep sourceSheetSha256 null and every review flag false');
        }
        warnings.push('humanReview is pending; this mechanical precheck does not substitute for extreme-angle, game-scale, and broadcast review');
    } else if (manifest.humanReview?.status === 'approved') {
        if (!/^[a-f0-9]{64}$/i.test(manifest.humanReview?.sourceSheetSha256 ?? '')) errors.push('humanReview.sourceSheetSha256 must be a SHA-256 when approved');
        for (const field of ['extremeJointAngles', 'artistStrokeAtGameScale', 'broadcastNearMiddleFar']) {
            if (manifest.humanReview?.[field] !== true) errors.push(`humanReview.${field} must be true when approved`);
        }
    } else {
        errors.push('humanReview.status must be "pending" or "approved"');
    }

    return { errors, warnings };
}

export function validateSourceManifest(manifest) {
    if (manifest?.version === 2) return validateSourceManifestV2(manifest);
    return validateSourceManifestV1(manifest);
}

function validateSourceManifestV1(manifest) {
    const errors = [];
    const warn = [];
    const minOverlap = manifest.minimumJointOverlapPx;

    if (manifest.version !== 1) errors.push('version must be 1');
    if (!manifest.characterId) errors.push('characterId is required');
    if (manifest.coordinateSpace !== 'export-pixels') {
        errors.push('coordinateSpace must be "export-pixels"');
    }
    if (!Number.isFinite(manifest.workingScale) || manifest.workingScale < 1) {
        errors.push('workingScale must be a number >= 1');
    }
    if (!Number.isFinite(minOverlap) || minOverlap < 1) {
        errors.push('minimumJointOverlapPx must be a positive number');
    }
    if (manifest.jointSurfaceRule !== 'continuous-fill-no-edge') {
        errors.push('jointSurfaceRule must be "continuous-fill-no-edge"');
    }
    if (manifest.humanExtremeAngleReviewRequired !== true) {
        errors.push('humanExtremeAngleReviewRequired must be true');
    }
    if (manifest.markerLayer?.exportedIntoArt !== false) {
        errors.push('markerLayer.exportedIntoArt must be false');
    }
    if (!manifest.markerLayer?.name) errors.push('markerLayer.name is required');

    for (const [partName, requiredAnchors] of Object.entries(REQUIRED_ANCHORS)) {
        const part = manifest.parts?.[partName];
        const prefix = `parts.${partName}`;
        if (!isObject(part)) {
            errors.push(`${prefix} is required`);
            continue;
        }
        if (!part.geometryLock) errors.push(`${prefix}.geometryLock is required`);
        if (!Number.isInteger(part.canvas?.w) || part.canvas.w <= 0
            || !Number.isInteger(part.canvas?.h) || part.canvas.h <= 0) {
            errors.push(`${prefix}.canvas must contain positive integer w/h`);
            continue;
        }
        for (const anchorName of requiredAnchors) {
            const point = part.anchors?.[anchorName];
            if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
                errors.push(`${prefix}.anchors.${anchorName} requires numeric x/y`);
                continue;
            }
            if (point.x < 0 || point.x >= part.canvas.w || point.y < 0 || point.y >= part.canvas.h) {
                errors.push(`${prefix}.anchors.${anchorName} lies outside its canvas`);
            }
        }
        for (const jointName of REQUIRED_OVERLAP[partName] ?? []) {
            const zone = part.jointZones?.[jointName];
            if (!isObject(zone)) {
                errors.push(`${prefix}.jointZones.${jointName} is required`);
                continue;
            }
            if (!Number.isFinite(zone.beforePx) || zone.beforePx < minOverlap) {
                errors.push(`${prefix}.jointZones.${jointName}.beforePx must be >= ${minOverlap}`);
            }
            if (!Number.isFinite(zone.afterPx) || zone.afterPx < minOverlap) {
                errors.push(`${prefix}.jointZones.${jointName}.afterPx must be >= ${minOverlap}`);
            }
            if (zone.surface !== 'continuous-fill-no-edge') {
                errors.push(`${prefix}.jointZones.${jointName}.surface must be "continuous-fill-no-edge"`);
            }
        }
    }

    const torso = manifest.parts?.torso;
    const coverage = torso?.pelvisCoverage;
    if (!isObject(coverage)) {
        errors.push('parts.torso.pelvisCoverage is required');
    } else {
        const owner = coverage.owner;
        if (owner !== 'torso' && owner !== 'pelvisUnderlay') {
            errors.push('parts.torso.pelvisCoverage.owner must be "torso" or "pelvisUnderlay"');
        }
        const bounds = coverage.bounds;
        if (!Number.isFinite(bounds?.x) || !Number.isFinite(bounds?.y)
            || !Number.isFinite(bounds?.w) || bounds.w <= 0
            || !Number.isFinite(bounds?.h) || bounds.h <= 0) {
            errors.push('parts.torso.pelvisCoverage.bounds requires positive x/y/w/h geometry');
        } else if (bounds.x < 0 || bounds.y < 0
            || bounds.x + bounds.w > torso.canvas.w || bounds.y + bounds.h > torso.canvas.h) {
            errors.push('parts.torso.pelvisCoverage.bounds lies outside the torso canvas');
        }
        for (const field of ['cornerRadiusPx', 'hipRadiusPx', 'sweepRadiusPx']) {
            if (!Number.isFinite(coverage[field]) || coverage[field] < minOverlap) {
                errors.push(`parts.torso.pelvisCoverage.${field} must be >= ${minOverlap}`);
            }
        }
        for (const socket of ['nearHip', 'farHip']) {
            const point = torso.anchors?.[socket];
            if (bounds && point && (point.x < bounds.x || point.x > bounds.x + bounds.w
                || point.y < bounds.y || point.y > bounds.y + bounds.h)) {
                errors.push(`parts.torso.anchors.${socket} must lie inside pelvisCoverage.bounds`);
            }
        }
        if (owner === 'pelvisUnderlay' && !manifest.parts?.pelvisUnderlay) {
            errors.push('parts.pelvisUnderlay is required when it owns pelvis coverage');
        }
        if (coverage.attachmentSurface !== 'continuous-fill-no-edge') {
            errors.push('parts.torso.pelvisCoverage.attachmentSurface must be "continuous-fill-no-edge"');
        }
    }

    for (const [partName, variants] of Object.entries(manifest.variantFamilies ?? {})) {
        const base = manifest.parts?.[partName];
        const prefix = `variantFamilies.${partName}`;
        if (!base) {
            errors.push(`${prefix} has no matching base part`);
            continue;
        }
        if (!Array.isArray(variants) || variants.length === 0) {
            errors.push(`${prefix} must be a non-empty array`);
            continue;
        }
        const ids = new Set();
        for (const variant of variants) {
            const variantPrefix = `${prefix}.${variant?.id ?? '<missing-id>'}`;
            if (!variant?.id) errors.push(`${variantPrefix}: id is required`);
            if (ids.has(variant?.id)) errors.push(`${variantPrefix}: duplicate id`);
            ids.add(variant?.id);
            if (variant?.geometryLock !== base.geometryLock) {
                errors.push(`${variantPrefix}: geometryLock must equal ${base.geometryLock}`);
            }
            if (!sameCanvas(variant?.canvas, base.canvas)) {
                errors.push(`${variantPrefix}: canvas must exactly match the base part`);
            }
            for (const anchorName of REQUIRED_ANCHORS[partName] ?? []) {
                const point = variant?.anchors?.[anchorName];
                if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
                    errors.push(`${variantPrefix}: anchor ${anchorName} requires numeric x/y`);
                } else if (point.x < 0 || point.x >= base.canvas.w || point.y < 0 || point.y >= base.canvas.h) {
                    errors.push(`${variantPrefix}: anchor ${anchorName} lies outside the common canvas`);
                }
            }
            for (const anchorName of LOCKED_VARIANT_ANCHORS[partName] ?? []) {
                if (!samePoint(variant?.anchors?.[anchorName], base.anchors?.[anchorName])) {
                    errors.push(`${variantPrefix}: anchor ${anchorName} must exactly match the base part`);
                }
            }
        }
    }

    for (const family of ['head', 'hand', 'boot']) {
        if (!manifest.variantFamilies?.[family]) {
            warn.push(`variantFamilies.${family} is not planned yet`);
        }
    }

    return { errors, warnings: warn };
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

// Dependency-free PNG reader for the RGBA exports required by the production
// source standard. It deliberately rejects palette/grayscale/interlaced files
// instead of guessing how their alpha should be interpreted.
export function decodeRgbaPng(buffer) {
    const signature = buffer.subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') throw new Error('not a PNG');
    let offset = 8, width, height, bitDepth, colorType, interlace;
    const idat = [];
    while (offset + 12 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;
        if (type === 'IHDR') {
            width = data.readUInt32BE(0); height = data.readUInt32BE(4);
            bitDepth = data[8]; colorType = data[9]; interlace = data[12];
        } else if (type === 'IDAT') idat.push(data);
        else if (type === 'IEND') break;
    }
    if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error('expected non-interlaced 8-bit RGBA PNG');
    }
    const packed = inflateSync(Buffer.concat(idat));
    const stride = width * 4;
    const rgba = Buffer.alloc(stride * height);
    let source = 0;
    for (let y = 0; y < height; y++) {
        const filter = packed[source++];
        for (let x = 0; x < stride; x++) {
            const raw = packed[source++];
            const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
            const up = y > 0 ? rgba[(y - 1) * stride + x] : 0;
            const upperLeft = y > 0 && x >= 4 ? rgba[(y - 1) * stride + x - 4] : 0;
            const value = filter === 0 ? raw
                : filter === 1 ? raw + left
                    : filter === 2 ? raw + up
                        : filter === 3 ? raw + Math.floor((left + up) / 2)
                            : filter === 4 ? raw + paeth(left, up, upperLeft) : NaN;
            if (!Number.isFinite(value)) throw new Error(`unsupported PNG filter ${filter}`);
            rgba[y * stride + x] = value & 255;
        }
    }
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    return { w: width, h: height, alpha, rgba };
}

function cropRgbaImage(image, rect) {
    if (rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.h <= 0
        || rect.x + rect.w > image.w || rect.y + rect.h > image.h) {
        throw new RangeError(`crop ${JSON.stringify(rect)} lies outside ${image.w}x${image.h} source sheet`);
    }
    const alpha = new Uint8Array(rect.w * rect.h);
    const rgba = image.rgba ? new Uint8Array(rect.w * rect.h * 4) : null;
    for (let y = 0; y < rect.h; y++) {
        const sourceAlpha = (rect.y + y) * image.w + rect.x;
        alpha.set(image.alpha.subarray(sourceAlpha, sourceAlpha + rect.w), y * rect.w);
        if (rgba) {
            const sourceRgba = sourceAlpha * 4;
            rgba.set(image.rgba.subarray(sourceRgba, sourceRgba + rect.w * 4), y * rect.w * 4);
        }
    }
    return { w: rect.w, h: rect.h, alpha, ...(rgba ? { rgba } : {}) };
}

// The v2 source is a fixed registered bank, not a collection of independently
// cropped PNGs. This is intentionally a literal 1:1 copy: no alpha trim,
// normalization, rotation, or resampling is allowed between the sheet and the
// pixels audited below.
export function extractV2SheetImages(manifest, sheetImage) {
    if (manifest?.version !== 2) throw new TypeError('fixed source-sheet extraction requires a v2 manifest');
    if (sheetImage?.w !== 4096 || sheetImage?.h !== 4096) {
        throw new RangeError(`source sheet is ${sheetImage?.w ?? 'unknown'}x${sheetImage?.h ?? 'unknown'}; expected exactly 4096x4096`);
    }
    if (!(sheetImage.alpha instanceof Uint8Array) || sheetImage.alpha.length !== sheetImage.w * sheetImage.h) {
        throw new TypeError('source sheet alpha buffer does not match its 4096x4096 canvas');
    }
    if (sheetImage.rgba !== undefined
        && (!(sheetImage.rgba instanceof Uint8Array) || sheetImage.rgba.length !== sheetImage.w * sheetImage.h * 4)) {
        throw new TypeError('source sheet RGBA buffer does not match its 4096x4096 canvas');
    }
    const transparentRgb = findV2TransparentRgbViolation(sheetImage);
    if (transparentRgb) {
        throw new Error(`transparent source pixel at (${transparentRgb.x},${transparentRgb.y}) has nonzero RGB ${transparentRgb.rgb.join(',')}; expected 0,0,0`);
    }
    const grid = manifest.sourceSheet.productionGrid;
    const images = {
        views: {},
        sheetErrors: validateV2MasterPanelPixels(manifest, sheetImage).errors,
    };
    for (const [viewIndex, viewName] of grid.viewOrder.entries()) {
        images.views[viewName] = {};
        for (const [slotIndex, slot] of grid.slotOrder.entries()) {
            const globalCell = viewIndex * grid.slotsPerView + slotIndex;
            const cellX = grid.origin.x + (globalCell % grid.columns) * grid.cell.w;
            const cellY = grid.origin.y + Math.floor(globalCell / grid.columns) * grid.cell.h;
            const partName = v2PartForSlot(slot);
            const exportRect = manifest.parts[partName].exportRect;
            images.views[viewName][slot] = cropRgbaImage(sheetImage, {
                x: cellX + exportRect.x,
                y: cellY + exportRect.y,
                w: exportRect.w,
                h: exportRect.h,
            });
        }
    }
    return images;
}

export async function loadV2SourceSheet(manifest, sheetPath) {
    const bytes = await readFile(sheetPath);
    const sourceSheetSha256 = verifyV2SourceSheetHash(manifest, bytes);
    const sheetImage = decodeRgbaPng(bytes);
    return { ...extractV2SheetImages(manifest, sheetImage), sourceSheetSha256 };
}

function validateV2PixelCoverage(manifest, images, alphaThreshold = 254) {
    const errors = [...(Array.isArray(images?.sheetErrors) ? images.sheetErrors : [])];
    const warnings = [];
    const threshold = Math.max(254, alphaThreshold);
    for (const viewName of V2_VIEW_ORDER) {
        const viewImages = images?.views?.[viewName];
        if (!isObject(viewImages)) {
            errors.push(`views.${viewName}: cropped source-sheet pixels are required`);
            continue;
        }
        for (const slot of V2_SLOT_ORDER) {
            const partName = v2PartForSlot(slot);
            const part = manifest.parts?.[partName];
            const variant = slot.includes('.')
                ? manifest.variantFamilies?.[partName]?.find(candidate => candidate?.sheetSlot === slot)
                : null;
            const image = viewImages[slot];
            const prefix = `views.${viewName}.${slot}`;
            if (!image) {
                errors.push(`${prefix}: fixed-cell pixel data is required`);
                continue;
            }
            if (image.w !== part?.canvas?.w || image.h !== part?.canvas?.h) {
                errors.push(`${prefix}: crop ${image.w}x${image.h} does not match exact export canvas ${part?.canvas?.w}x${part?.canvas?.h}`);
                continue;
            }
            if (!(image.alpha instanceof Uint8Array) || image.alpha.length !== image.w * image.h) {
                errors.push(`${prefix}: alpha buffer does not match the exact export canvas`);
                continue;
            }
            const anchors = resolvedV2Anchors(manifest, viewName, partName, variant);
            const axis = v2OrientationAxis(manifest, viewName, partName, variant);
            const jointZones = variant?.jointZones ?? part.jointZones ?? {};
            for (const [jointName, zone] of Object.entries(jointZones)) {
                const anchor = anchors[jointName];
                const radius = zone.opaqueCoreRadiusPx;
                if (!finitePoint(anchor) || !Number.isFinite(radius) || !axis) continue;
                const coverageSlot = zone.coveragePart ?? slot;
                const coverageImage = viewImages[coverageSlot];
                const jointPrefix = `views.${viewName}.${coverageSlot}.${jointName}`;
                if (!coverageImage) {
                    errors.push(`${jointPrefix}: coverage owner pixel data is required for ${slot}`);
                    continue;
                }
                if (coverageImage.w !== manifest.parts?.[zone.coveragePart ?? partName]?.canvas?.w
                    || coverageImage.h !== manifest.parts?.[zone.coveragePart ?? partName]?.canvas?.h
                    || !(coverageImage.alpha instanceof Uint8Array)
                    || coverageImage.alpha.length !== coverageImage.w * coverageImage.h) {
                    errors.push(`${jointPrefix}: coverage owner alpha buffer does not match its exact export canvas`);
                    continue;
                }
                let opaque = 0, samples = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (dx * dx + dy * dy > radius * radius) continue;
                        samples++;
                        if (opaqueAt(coverageImage, anchor.x + dx, anchor.y + dy, threshold)) opaque++;
                    }
                }
                if (!samples || opaque !== samples) {
                    errors.push(`${jointPrefix}: opaque core is ${opaque}/${samples} fully opaque pixels; expected 100% within radius ${radius}`);
                }
                for (const [bandName, points] of [
                    ['before', v2OrientedBandPoints(anchor, axis, -zone.beforePx, -1, radius)],
                    ['after', v2OrientedBandPoints(anchor, axis, 1, zone.afterPx, radius)],
                ]) {
                    let bandOpaque = 0;
                    for (const point of points) {
                        if (opaqueAt(coverageImage, point.x, point.y, threshold)) bandOpaque++;
                    }
                    if (!points.length || bandOpaque !== points.length) {
                        errors.push(`${jointPrefix}.${bandName}: overlap band is ${bandOpaque}/${points.length} fully opaque pixels; expected 100% in ${slot}`);
                    }
                }
            }
        }

        const coverage = manifest.parts?.torso?.pelvisCoverage;
        const ownerImage = viewImages[coverage?.owner];
        const pelvisPrefix = `views.${viewName}.${coverage?.owner ?? '<missing-owner>'}.pelvisCoverage`;
        if (coverage && ownerImage?.w === manifest.parts?.torso?.canvas?.w
            && ownerImage?.h === manifest.parts?.torso?.canvas?.h
            && ownerImage.alpha instanceof Uint8Array) {
            const bounds = coverage.bounds;
            let opaque = 0, samples = 0;
            for (let y = bounds.y; y < bounds.y + bounds.h; y++) {
                for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
                    if (!roundedRectContains(x, y, bounds, coverage.cornerRadiusPx)) continue;
                    samples++;
                    if (opaqueAt(ownerImage, x, y, threshold)) opaque++;
                }
            }
            if (!samples || opaque !== samples) {
                errors.push(`${pelvisPrefix}.bounds: rounded underbody is ${opaque}/${samples} fully opaque pixels; expected 100%`);
            }

            const torsoAnchors = resolvedV2Anchors(manifest, viewName, 'torso');
            const hipSweepRadius = Math.max(coverage.hipRadiusPx, coverage.sweepRadiusPx);
            for (const hipName of ['leftHip', 'rightHip']) {
                const hip = torsoAnchors[hipName];
                let hipOpaque = 0, hipSamples = 0;
                for (let dy = -hipSweepRadius; dy <= hipSweepRadius; dy++) {
                    for (let dx = -hipSweepRadius; dx <= hipSweepRadius; dx++) {
                        if (dx * dx + dy * dy > hipSweepRadius * hipSweepRadius) continue;
                        hipSamples++;
                        if (opaqueAt(ownerImage, hip.x + dx, hip.y + dy, threshold)) hipOpaque++;
                    }
                }
                if (!hipSamples || hipOpaque !== hipSamples) {
                    errors.push(`${pelvisPrefix}.${hipName}: hip/sweep disk is ${hipOpaque}/${hipSamples} fully opaque pixels; expected 100% within radius ${hipSweepRadius}`);
                }
            }
        } else if (coverage) {
            errors.push(`${pelvisPrefix}: torso-sized owner pixel data is required`);
        }
    }
    return { errors, warnings };
}

export function validatePixelCoverage(manifest, images, alphaThreshold = 10) {
    if (manifest?.version === 2) return validateV2PixelCoverage(manifest, images, alphaThreshold);
    return validateV1PixelCoverage(manifest, images, alphaThreshold);
}

function validateV1PixelCoverage(manifest, images, alphaThreshold = 10) {
    const errors = [];
    const warnings = [];
    const minimum = manifest.minimumJointOverlapPx;
    for (const [partName, variants] of Object.entries(images?.variants ?? {})) {
        const baseCanvas = manifest.parts?.[partName]?.canvas;
        for (const [id, image] of Object.entries(variants)) {
            if (image.w !== baseCanvas?.w || image.h !== baseCanvas?.h) {
                errors.push(`variantFamilies.${partName}.${id}: PNG ${image.w}x${image.h} does not match base canvas ${baseCanvas?.w}x${baseCanvas?.h}`);
            }
        }
    }
    for (const [partName, joints] of Object.entries(REQUIRED_OVERLAP)) {
        const part = manifest.parts?.[partName];
        const image = images?.[partName];
        if (!part || !image) {
            errors.push(`parts.${partName}: PNG pixel data is required`);
            continue;
        }
        if (image.w !== part.canvas.w || image.h !== part.canvas.h) {
            errors.push(`parts.${partName}: PNG ${image.w}x${image.h} does not match canvas ${part.canvas.w}x${part.canvas.h}`);
            continue;
        }
        for (const jointName of joints) {
            const anchor = part.anchors[jointName];
            const zone = part.jointZones[jointName];
            const radius = Math.max(2, Math.floor(minimum / 2));
            for (const [side, from, to] of [
                ['before', Math.max(0, Math.floor(anchor.y - zone.beforePx)), Math.floor(anchor.y)],
                ['after', Math.ceil(anchor.y), Math.min(image.h - 1, Math.ceil(anchor.y + zone.afterPx))],
            ]) {
                let coveredRows = 0;
                const rows = Math.max(1, to - from + 1);
                for (let y = from; y <= to; y++) {
                    let covered = false;
                    for (let x = Math.max(0, Math.floor(anchor.x - radius)); x <= Math.min(image.w - 1, Math.ceil(anchor.x + radius)); x++) {
                        if (image.alpha[y * image.w + x] > alphaThreshold) { covered = true; break; }
                    }
                    if (covered) coveredRows++;
                }
                if (coveredRows / rows < 0.75) {
                    errors.push(`parts.${partName}.${jointName}: opaque ${side} coverage is ${Math.round(coveredRows / rows * 100)}%, expected >= 75%`);
                }
            }
        }
    }
    errors.push(...validatePelvisSweep(manifest, images, alphaThreshold).errors);
    warnings.push(...detectOverlapEdgeWarnings(manifest, images, alphaThreshold));
    return { errors, warnings };
}

export function detectOverlapEdgeWarnings(manifest, images, alphaThreshold = 10) {
    const warnings = [];
    const radius = manifest.minimumJointOverlapPx;
    for (const [partName, joints] of Object.entries(REQUIRED_OVERLAP)) {
        const part = manifest.parts?.[partName];
        const image = images?.[partName];
        if (!part || !image?.rgba) continue;
        for (const jointName of joints) {
            const anchor = part.anchors[jointName];
            let dark = 0, opaque = 0;
            const y = Math.round(anchor.y);
            for (let x = Math.round(anchor.x - radius); x <= Math.round(anchor.x + radius); x++) {
                if (x < 0 || x >= image.w || y < 0 || y >= image.h) continue;
                const i = (y * image.w + x) * 4;
                if (image.rgba[i + 3] <= alphaThreshold) continue;
                opaque++;
                const lum = 0.299 * image.rgba[i] + 0.587 * image.rgba[i + 1] + 0.114 * image.rgba[i + 2];
                if (lum < 55) dark++;
            }
            if (opaque >= radius && dark / opaque >= 0.7) {
                warnings.push(`${partName}.${jointName}: possible dark contour/bevel spanning hidden attachment face; inspect guide overlay at extreme angles`);
            }
        }
    }
    return warnings;
}

function roundedRectContains(x, y, bounds, radius) {
    const left = bounds.x, right = bounds.x + bounds.w - 1;
    const top = bounds.y, bottom = bounds.y + bounds.h - 1;
    const cx = Math.max(left + radius, Math.min(right - radius, x));
    const cy = Math.max(top + radius, Math.min(bottom - radius, y));
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function opaqueAt(image, x, y, threshold) {
    const ix = Math.round(x), iy = Math.round(y);
    return ix >= 0 && ix < image.w && iy >= 0 && iy < image.h
        && image.alpha[iy * image.w + ix] > threshold;
}

// Pixel-space get-up/leg-separation gate. The pelvis owner must cover a
// rounded underbody, and the union with each rotating thigh root must retain
// the internal hip disk at every representative combat angle and facing.
export function validatePelvisSweep(manifest, images, alphaThreshold = 10) {
    const errors = [];
    const torso = manifest.parts?.torso;
    const coverage = torso?.pelvisCoverage;
    const owner = images?.[coverage?.owner];
    const thigh = images?.thigh;
    if (!coverage || !owner || !thigh) {
        errors.push('pelvis sweep requires pelvis owner and thigh PNG pixel data');
        return { errors };
    }
    const bounds = coverage.bounds;
    let opaque = 0, total = 0;
    for (let y = Math.floor(bounds.y); y < Math.ceil(bounds.y + bounds.h); y++) {
        for (let x = Math.floor(bounds.x); x < Math.ceil(bounds.x + bounds.w); x++) {
            if (!roundedRectContains(x, y, bounds, coverage.cornerRadiusPx)) continue;
            total++;
            if (opaqueAt(owner, x, y, alphaThreshold)) opaque++;
        }
    }
    if (!total || opaque / total < 0.95) {
        errors.push(`pelvis underbody opaque coverage is ${Math.round(opaque / Math.max(1, total) * 100)}%, expected >= 95%`);
    }

    const thighHip = manifest.parts.thigh.anchors.hip;
    const angles = [-2.2, -1.3, -0.6, 0, 0.6, 1.3, 2.2];
    for (const facing of [1, -1]) {
        for (const socketName of ['nearHip', 'farHip']) {
            const socket = torso.anchors[socketName];
            for (const angle of angles) {
                let covered = 0, samples = 0;
                const radius = coverage.sweepRadiusPx;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (dx * dx + dy * dy > radius * radius) continue;
                        samples++;
                        if (opaqueAt(owner, socket.x + dx, socket.y + dy, alphaThreshold)) {
                            covered++; continue;
                        }
                        const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
                        const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
                        const sourceX = thighHip.x + facing * localX;
                        const sourceY = thighHip.y + localY;
                        if (opaqueAt(thigh, sourceX, sourceY, alphaThreshold)) covered++;
                    }
                }
                if (covered / samples < 0.98) {
                    errors.push(`pelvis/thigh union hole at ${socketName}, facing ${facing}, angle ${angle.toFixed(1)} (${Math.round(covered / samples * 100)}% covered)`);
                }
            }
        }
    }
    return { errors };
}

export async function loadManifestPngs(manifest, assetsDir) {
    const images = { variants: {} };
    for (const [partName, part] of Object.entries(manifest.parts ?? {})) {
        if (!part.file) throw new Error(`parts.${partName}.file is required for PNG validation`);
        images[partName] = decodeRgbaPng(await readFile(path.join(assetsDir, part.file)));
    }
    for (const [partName, variants] of Object.entries(manifest.variantFamilies ?? {})) {
        images.variants[partName] = {};
        for (const variant of variants) {
            const file = variant.file ?? `${FILE_STEMS[partName] ?? partName}_${variant.id}.png`;
            images.variants[partName][variant.id] = decodeRgbaPng(await readFile(path.join(assetsDir, file)));
        }
    }
    return images;
}

async function main() {
    const args = process.argv.slice(2);
    const assetsFlag = args.indexOf('--assets-dir');
    const sheetFlag = args.indexOf('--sheet');
    const assetsDir = assetsFlag >= 0 && args[assetsFlag + 1] ? path.resolve(args[assetsFlag + 1]) : null;
    const sheetPath = sheetFlag >= 0 && args[sheetFlag + 1] ? path.resolve(args[sheetFlag + 1]) : null;
    if (assetsFlag >= 0) args.splice(assetsFlag, 2);
    const adjustedSheetFlag = args.indexOf('--sheet');
    if (adjustedSheetFlag >= 0) args.splice(adjustedSheetFlag, 2);
    const manifestPath = path.resolve(args[0] ?? DEFAULT_MANIFEST);
    let manifest;
    try {
        manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
        console.error(`source manifest unreadable: ${manifestPath} (${error.message})`);
        process.exit(1);
    }

    const result = validateSourceManifest(manifest);
    if (assetsFlag >= 0 && !assetsDir) result.errors.push('--assets-dir requires a directory path');
    if (sheetFlag >= 0 && !sheetPath) result.errors.push('--sheet requires a PNG path');
    if (assetsDir && sheetPath) result.errors.push('use either --assets-dir or --sheet, not both');
    if (manifest.version === 2 && assetsDir) result.errors.push('v2 manifests use --sheet fixed-cell validation, not --assets-dir');
    if (manifest.version !== 2 && sheetPath) result.errors.push('--sheet fixed-cell validation requires a v2 manifest');
    if (assetsDir && manifest.version !== 2 && result.errors.length === 0) {
        try {
            const pixelResult = validatePixelCoverage(manifest, await loadManifestPngs(manifest, assetsDir));
            result.errors.push(...pixelResult.errors);
            result.warnings.push(...pixelResult.warnings);
        } catch (error) {
            result.errors.push(`PNG validation failed: ${error.message}`);
        }
    }
    if (sheetPath && manifest.version === 2 && result.errors.length === 0) {
        try {
            const pixelResult = validatePixelCoverage(manifest, await loadV2SourceSheet(manifest, sheetPath));
            result.errors.push(...pixelResult.errors);
            result.warnings.push(...pixelResult.warnings);
        } catch (error) {
            result.errors.push(`source-sheet validation failed: ${error.message}`);
        }
    }
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    for (const error of result.errors) console.error(`error: ${error}`);

    if (result.errors.length) {
        console.error(`source manifest invalid (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`);
        process.exit(1);
    }

    console.log(`${manifest.characterId}: source manifest valid (${Object.keys(manifest.parts).length} parts)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
