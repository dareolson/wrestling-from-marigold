#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const MANIFEST_PATH = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.v2.example.json');
const SOURCE_PATH = path.join(ROOT,
    'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png');
const OUT_DIR = path.join(ROOT, 'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates');
const SHEET_PATH = path.join(OUT_DIR, 'thesz-v2-pass-b-profile-base-v1.png');
const ASSEMBLY_PATH = path.join(OUT_DIR, 'thesz-v2-pass-b-profile-base-v1-assembly.png');
const STRESS_PATH = path.join(OUT_DIR, 'thesz-v2-pass-b-profile-base-v1-stress.png');
const COMPARE_PATH = path.join(OUT_DIR, 'thesz-v2-pass-b-profile-base-v1-compare.png');
const APPROVED_SHA256 = 'ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb';
const VIEW = 'profile';
const BASE_SLOTS = ['torso', 'pelvisUnderlay', 'pelvisMask', 'shoulderMask', 'upperArm', 'forearm',
    'thigh', 'shin', 'head.idle', 'hand.open', 'boot.neutral'];

const finitePoint = value => Number.isFinite(value?.x) && Number.isFinite(value?.y);

function cloneImage(image) {
    return { w: image.w, h: image.h, rgba: new Uint8Array(image.rgba) };
}

function emptyImage(w, h) {
    return { w, h, rgba: new Uint8Array(w * h * 4) };
}

function alphaAt(image, x, y) {
    if (x < 0 || x >= image.w || y < 0 || y >= image.h) return 0;
    return image.rgba[(y * image.w + x) * 4 + 3];
}

function pixelAt(image, x, y) {
    const offset = (y * image.w + x) * 4;
    return image.rgba.slice(offset, offset + 4);
}

function setPixel(image, x, y, rgba) {
    if (x < 0 || x >= image.w || y < 0 || y >= image.h) return;
    image.rgba.set(rgba, (y * image.w + x) * 4);
}

function resolvedAnchors(manifest, partName) {
    return {
        ...(manifest.parts[partName].anchors ?? {}),
        ...(manifest.views[VIEW].anchorOverrides?.[partName] ?? {}),
    };
}

function cellRect(manifest, slot) {
    const grid = manifest.sourceSheet.productionGrid;
    const viewIndex = grid.viewOrder.indexOf(VIEW);
    const slotIndex = grid.slotOrder.indexOf(slot);
    const global = viewIndex * grid.slotsPerView + slotIndex;
    const partName = slot.split('.')[0];
    const exportRect = manifest.parts[partName].exportRect;
    return {
        x: grid.origin.x + (global % grid.columns) * grid.cell.w + exportRect.x,
        y: grid.origin.y + Math.floor(global / grid.columns) * grid.cell.h + exportRect.y,
        w: exportRect.w,
        h: exportRect.h,
    };
}

function distanceToSegment(point, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const raw = length2 ? ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2 : 0;
    const t = Math.max(0, Math.min(1, raw));
    const x = a.x + dx * t, y = a.y + dy * t;
    return { distance: Math.hypot(point.x - x, point.y - y), raw };
}

function capsule(a, b, radius, before = 0.2, after = 0.25) {
    return point => {
        const result = distanceToSegment(point, a, b);
        return result.raw >= -before && result.raw <= 1 + after && result.distance <= radius;
    };
}

function medianColor(source, panel, center, radius, accept = () => true) {
    const channels = [[], [], []];
    for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y++) {
        for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x++) {
            if ((x - center.x) ** 2 + (y - center.y) ** 2 > radius ** 2) continue;
            const rgba = pixelAt(source, panel.x + x, panel.y + y);
            if (rgba[3] !== 255 || !accept(rgba)) continue;
            for (let channel = 0; channel < 3; channel++) channels[channel].push(rgba[channel]);
        }
    }
    if (!channels[0].length) throw new Error(`could not sample fill at ${center.x},${center.y}`);
    return [...channels.map(values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]), 255];
}

function copyTranslated(source, panel, target, translation, predicate, pixelFilter = () => true) {
    let copied = 0;
    for (let y = 0; y < target.h; y++) {
        for (let x = 0; x < target.w; x++) {
            const master = { x: x + translation.x, y: y + translation.y };
            if (!predicate({ x, y }, master)) continue;
            const rgba = pixelAt(source, panel.x + master.x, panel.y + master.y);
            if (!rgba[3] || !pixelFilter(rgba)) continue;
            setPixel(target, x, y, rgba);
            copied++;
        }
    }
    return copied;
}

function orientationAxis(part, anchors) {
    const [fromName, toName] = part.orientation.frame;
    const from = anchors[fromName], to = anchors[toName];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function bandPoints(anchor, axis, start, end, radius) {
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

function fillDisk(image, center, radius, color, onlyGaps = true) {
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            const x = center.x + dx, y = center.y + dy;
            if (!onlyGaps || alphaAt(image, x, y) !== 255) setPixel(image, x, y, color);
        }
    }
}

function fillJointZones(part, anchors, image, colorsByJoint) {
    const axis = orientationAxis(part, anchors);
    for (const [jointName, zone] of Object.entries(part.jointZones ?? {})) {
        const anchor = anchors[jointName];
        if (!finitePoint(anchor)) continue;
        const color = colorsByJoint[jointName];
        for (const point of [
            ...bandPoints(anchor, axis, -zone.beforePx, -1, zone.opaqueCoreRadiusPx),
            ...bandPoints(anchor, axis, 1, zone.afterPx, zone.opaqueCoreRadiusPx),
        ]) {
            if (alphaAt(image, point.x, point.y) !== 255) setPixel(image, point.x, point.y, color);
        }
        fillDisk(image, anchor, zone.opaqueCoreRadiusPx, color);
    }
}

function withoutCoverageZones(part) {
    return {
        ...part,
        jointZones: Object.fromEntries(Object.entries(part.jointZones ?? {})
            .filter(([, zone]) => !zone.coveragePart)),
    };
}

function onlyCoverageZones(part) {
    return {
        ...part,
        jointZones: Object.fromEntries(Object.entries(part.jointZones ?? {})
            .filter(([, zone]) => zone.coveragePart)),
    };
}

function fillRoundedRect(image, bounds, radius, color) {
    const left = bounds.x, right = bounds.x + bounds.w - 1;
    const top = bounds.y, bottom = bounds.y + bounds.h - 1;
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            const cx = Math.max(left + radius, Math.min(right - radius, x));
            const cy = Math.max(top + radius, Math.min(bottom - radius, y));
            if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(image, x, y, color);
        }
    }
}

function blit(source, target, dx, dy, flipX = false) {
    for (let y = 0; y < source.h; y++) {
        for (let x = 0; x < source.w; x++) {
            const sx = flipX ? source.w - 1 - x : x;
            const rgba = pixelAt(source, sx, y);
            if (!rgba[3]) continue;
            setPixel(target, dx + x, dy + y, rgba);
        }
    }
}

function blitRotated(source, target, pivot, targetPivot, angle, flipX = false) {
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const radius = Math.ceil(Math.hypot(source.w, source.h));
    for (let y = Math.floor(targetPivot.y - radius); y <= Math.ceil(targetPivot.y + radius); y++) {
        for (let x = Math.floor(targetPivot.x - radius); x <= Math.ceil(targetPivot.x + radius); x++) {
            const dx = x - targetPivot.x, dy = y - targetPivot.y;
            const ux = cosine * dx + sine * dy;
            const uy = -sine * dx + cosine * dy;
            let sx = Math.round(pivot.x + ux), sy = Math.round(pivot.y + uy);
            if (flipX) sx = source.w - 1 - sx;
            if (sx < 0 || sx >= source.w || sy < 0 || sy >= source.h) continue;
            const rgba = pixelAt(source, sx, sy);
            if (rgba[3]) setPixel(target, x, y, rgba);
        }
    }
}

function rotateVector(vector, angle) {
    return {
        x: vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
        y: vector.x * Math.sin(angle) + vector.y * Math.cos(angle),
    };
}

function partPlacement(part, anchors, masterAnchor, localAnchor, flipX = false) {
    const effectiveX = flipX ? part.canvas.w - 1 - localAnchor.x : localAnchor.x;
    return { x: Math.round(masterAnchor.x - effectiveX), y: Math.round(masterAnchor.y - localAnchor.y) };
}

function buildProfileParts(manifest, source) {
    const panel = manifest.sourceSheet.masterPanels[VIEW];
    const master = manifest.views[VIEW].masterLandmarks;
    const parts = {};
    const skin = medianColor(source, panel, master.leftElbow, 18, rgba => rgba[0] > 120 && rgba[1] > 70);
    const dark = medianColor(source, panel, { x: 402, y: 455 }, 24, rgba => rgba[0] < 50 && rgba[1] < 50 && rgba[2] < 50);
    const blue = medianColor(source, panel, { x: 390, y: 690 }, 22, rgba => rgba[2] > rgba[0] + 20);

    const make = partName => {
        const canvas = manifest.parts[partName].canvas;
        return emptyImage(canvas.w, canvas.h);
    };

    const headAnchors = resolvedAnchors(manifest, 'head');
    parts['head.idle'] = make('head');
    copyTranslated(source, panel, parts['head.idle'], {
        x: master.crown.x - headAnchors.crown.x,
        y: master.crown.y - headAnchors.crown.y,
    }, local => local.x >= 24 && local.x <= 164 && local.y >= 18 && local.y <= 158);
    fillJointZones(manifest.parts.head, headAnchors, parts['head.idle'], { neck: skin });

    const torsoAnchors = resolvedAnchors(manifest, 'torso');
    const torsoTranslation = { x: master.neck.x - torsoAnchors.neck.x, y: master.neck.y - torsoAnchors.neck.y };
    parts.torso = make('torso');
    copyTranslated(source, panel, parts.torso, torsoTranslation,
        local => local.x >= 65 && local.x <= 155 && local.y >= 4 && local.y <= 214);
    fillJointZones(withoutCoverageZones(manifest.parts.torso), torsoAnchors, parts.torso, {
        neck: skin, leftShoulder: skin, rightShoulder: skin, leftHip: dark, rightHip: dark,
    });

    parts.shoulderMask = make('shoulderMask');
    copyTranslated(source, panel, parts.shoulderMask, torsoTranslation,
        local => Math.hypot(local.x - torsoAnchors.leftShoulder.x,
            local.y - torsoAnchors.leftShoulder.y) <= 22);

    parts.pelvisUnderlay = make('pelvisUnderlay');
    fillRoundedRect(parts.pelvisUnderlay, manifest.parts.torso.pelvisCoverage.bounds,
        manifest.parts.torso.pelvisCoverage.cornerRadiusPx, dark);
    fillJointZones(onlyCoverageZones(manifest.parts.torso), torsoAnchors, parts.pelvisUnderlay,
        { leftHip: dark, rightHip: dark });

    parts.pelvisMask = make('pelvisMask');
    copyTranslated(source, panel, parts.pelvisMask, torsoTranslation,
        local => local.y >= 180 && local.y <= 236 && local.x >= 62 && local.x <= 154,
        rgba => rgba[0] < 70 && rgba[1] < 70 && rgba[2] < 70);

    const limbSpecs = [
        ['upperArm', 'shoulder', 'elbow', master.leftShoulder, 25, 83, skin],
        ['forearm', 'elbow', 'wrist', master.leftElbow, 19, 75, skin],
        ['thigh', 'hip', 'knee', master.leftHip, 32, 100, skin],
        ['shin', 'knee', 'ankle', master.leftKnee, 24, 92, skin],
    ];
    for (const [partName, fromName, toName, masterFrom, radius, maxX, color] of limbSpecs) {
        const anchors = ['pelvisUnderlay', 'pelvisMask', 'shoulderMask'].includes(partName)
            ? resolvedAnchors(manifest, 'torso') : resolvedAnchors(manifest, partName);
        const image = make(partName);
        const withinCapsule = capsule(anchors[fromName], anchors[toName], radius);
        const predicate = local => local.x <= maxX && withinCapsule(local);
        copyTranslated(source, panel, image, {
            x: masterFrom.x - anchors[fromName].x,
            y: masterFrom.y - anchors[fromName].y,
        }, predicate, partName === 'thigh'
            ? (rgba => !(rgba[0] < 60 && rgba[1] < 60 && rgba[2] < 60))
            : (() => true));
        fillJointZones(manifest.parts[partName], anchors, image,
            Object.fromEntries(Object.keys(manifest.parts[partName].jointZones).map(name => [name, color])));
        parts[partName] = image;
    }

    const handAnchors = resolvedAnchors(manifest, 'hand');
    parts['hand.open'] = make('hand');
    const handShape = capsule(handAnchors.wrist, handAnchors.wristAxis, 20, 0.8, 2);
    copyTranslated(source, panel, parts['hand.open'], {
        x: master.leftWrist.x - handAnchors.wrist.x,
        y: master.leftWrist.y - handAnchors.wrist.y,
    }, local => local.x >= 24 && local.x <= 72 && local.y <= 70 && handShape(local));
    fillJointZones(manifest.parts.hand, handAnchors, parts['hand.open'], { wrist: skin });

    const bootAnchors = resolvedAnchors(manifest, 'boot');
    parts['boot.neutral'] = make('boot');
    copyTranslated(source, panel, parts['boot.neutral'], {
        x: master.leftAnkle.x - bootAnchors.ankle.x,
        y: master.leftAnkle.y - bootAnchors.ankle.y,
    }, local => local.x >= 10 && local.x <= 96 && local.y >= 12 && local.y <= 102,
    rgba => rgba[2] > rgba[0] + 15 || (rgba[0] < 75 && rgba[1] < 75 && rgba[2] < 90));
    fillJointZones(manifest.parts.boot, bootAnchors, parts['boot.neutral'], { ankle: blue });

    return parts;
}

function assertOpaque(image, points, label) {
    for (const point of points) {
        if (alphaAt(image, point.x, point.y) !== 255) {
            throw new Error(`${label} is not fully opaque at ${point.x},${point.y}`);
        }
    }
}

function diskPoints(center, radius) {
    const points = [];
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) points.push({ x: center.x + dx, y: center.y + dy });
        }
    }
    return points;
}

function validateTrialParts(manifest, parts) {
    let zones = 0;
    for (const slot of ['head.idle', 'torso', 'upperArm', 'forearm', 'thigh', 'shin', 'hand.open', 'boot.neutral']) {
        const partName = slot.split('.')[0];
        const part = manifest.parts[partName];
        const anchors = resolvedAnchors(manifest, partName);
        const axis = orientationAxis(part, anchors);
        for (const [jointName, zone] of Object.entries(part.jointZones ?? {})) {
            const owner = zone.coveragePart ? parts[zone.coveragePart] : parts[slot];
            const anchor = anchors[jointName];
            assertOpaque(owner, diskPoints(anchor, zone.opaqueCoreRadiusPx), `${slot}.${jointName}.core`);
            assertOpaque(owner, [
                ...bandPoints(anchor, axis, -zone.beforePx, -1, zone.opaqueCoreRadiusPx),
                ...bandPoints(anchor, axis, 1, zone.afterPx, zone.opaqueCoreRadiusPx),
            ], `${slot}.${jointName}.bands`);
            zones++;
        }
    }
    const coverage = manifest.parts.torso.pelvisCoverage;
    for (let y = coverage.bounds.y; y < coverage.bounds.y + coverage.bounds.h; y++) {
        for (let x = coverage.bounds.x; x < coverage.bounds.x + coverage.bounds.w; x++) {
            const cx = Math.max(coverage.bounds.x + coverage.cornerRadiusPx,
                Math.min(coverage.bounds.x + coverage.bounds.w - 1 - coverage.cornerRadiusPx, x));
            const cy = Math.max(coverage.bounds.y + coverage.cornerRadiusPx,
                Math.min(coverage.bounds.y + coverage.bounds.h - 1 - coverage.cornerRadiusPx, y));
            if ((x - cx) ** 2 + (y - cy) ** 2 <= coverage.cornerRadiusPx ** 2
                && alphaAt(parts.pelvisUnderlay, x, y) !== 255) {
                throw new Error(`pelvis underlay coverage is transparent at ${x},${y}`);
            }
        }
    }
    for (const slot of BASE_SLOTS) {
        const image = parts[slot];
        if (!image?.rgba.some((value, index) => index % 4 === 3 && value > 0)) {
            throw new Error(`${slot} trial cell is empty`);
        }
    }
    return zones;
}

function writePartsIntoSheet(manifest, sheet, parts) {
    for (const [slot, image] of Object.entries(parts)) {
        const rect = cellRect(manifest, slot);
        blit(image, sheet, rect.x, rect.y);
    }
}

function validateSheetMutation(manifest, source, sheet) {
    const allowed = new Set(BASE_SLOTS.map(slot => {
        const grid = manifest.sourceSheet.productionGrid;
        return grid.viewOrder.indexOf(VIEW) * grid.slotsPerView + grid.slotOrder.indexOf(slot);
    }));
    const rects = BASE_SLOTS.map(slot => cellRect(manifest, slot));
    let changedPixels = 0;
    for (let y = 0; y < sheet.h; y++) {
        for (let x = 0; x < sheet.w; x++) {
            const offset = (y * sheet.w + x) * 4;
            const changed = sheet.rgba[offset] !== source.rgba[offset]
                || sheet.rgba[offset + 1] !== source.rgba[offset + 1]
                || sheet.rgba[offset + 2] !== source.rgba[offset + 2]
                || sheet.rgba[offset + 3] !== source.rgba[offset + 3];
            if (changed) {
                changedPixels++;
                if (!rects.some(rect => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h)) {
                    throw new Error(`trial changed a frozen/out-of-scope pixel at ${x},${y}`);
                }
            }
            if (sheet.rgba[offset + 3] === 0
                && (sheet.rgba[offset] || sheet.rgba[offset + 1] || sheet.rgba[offset + 2])) {
                throw new Error(`transparent RGB contamination at ${x},${y}`);
            }
        }
    }
    const grid = manifest.sourceSheet.productionGrid;
    const occupied = [];
    for (let index = 0; index < grid.columns * grid.rows; index++) {
        const cellX = grid.origin.x + (index % grid.columns) * grid.cell.w;
        const cellY = grid.origin.y + Math.floor(index / grid.columns) * grid.cell.h;
        let painted = false;
        for (let y = cellY; y < cellY + grid.cell.h && !painted; y++) {
            for (let x = cellX; x < cellX + grid.cell.w; x++) {
                if (alphaAt(sheet, x, y)) { painted = true; break; }
            }
        }
        if (painted) occupied.push(index);
    }
    if (occupied.length !== allowed.size || occupied.some(index => !allowed.has(index))) {
        throw new Error(`unexpected occupied trial cells: ${occupied.join(',')}`);
    }
    return { changedPixels, occupied };
}

function assembleProfile(manifest, parts) {
    const result = emptyImage(768, 960);
    const master = manifest.views[VIEW].masterLandmarks;
    const drawPart = (slot, anchorName, masterPoint, flipX = false) => {
        const partName = slot.split('.')[0];
        const part = manifest.parts[partName];
        const anchors = ['pelvisUnderlay', 'pelvisMask', 'shoulderMask'].includes(partName)
            ? resolvedAnchors(manifest, 'torso') : resolvedAnchors(manifest, partName);
        const placement = partPlacement(part, anchors, masterPoint, anchors[anchorName], flipX);
        blit(parts[slot], result, placement.x, placement.y, flipX);
    };
    const drawArm = (side, flip) => {
        drawPart('upperArm', 'shoulder', master[`${side}Shoulder`], flip);
        drawPart('forearm', 'elbow', master[`${side}Elbow`], flip);
        drawPart('hand.open', 'wrist', master[`${side}Wrist`], flip);
    };
    const drawLeg = (side, flip) => {
        drawPart('thigh', 'hip', master[`${side}Hip`], flip);
        drawPart('shin', 'knee', master[`${side}Knee`], flip);
        drawPart('boot.neutral', 'ankle', master[`${side}Ankle`], flip);
    };

    drawArm('right', true);
    drawPart('pelvisUnderlay', 'neck', master.neck);
    drawLeg('right', true);
    drawPart('head.idle', 'crown', master.crown);
    drawPart('torso', 'neck', master.neck);
    drawLeg('left', false);
    drawPart('pelvisMask', 'neck', master.neck);
    drawArm('left', false);
    drawPart('shoulderMask', 'neck', master.neck);
    return result;
}

function assembleStressProfile(manifest, parts) {
    const result = emptyImage(768, 960);
    const master = manifest.views[VIEW].masterLandmarks;
    const drawFixed = (slot, anchorName, masterPoint, flipX = false) => {
        const partName = slot.split('.')[0];
        const part = manifest.parts[partName];
        const anchors = ['pelvisUnderlay', 'pelvisMask', 'shoulderMask'].includes(partName)
            ? resolvedAnchors(manifest, 'torso') : resolvedAnchors(manifest, partName);
        const placement = partPlacement(part, anchors, masterPoint, anchors[anchorName], flipX);
        blit(parts[slot], result, placement.x, placement.y, flipX);
    };
    const drawChainPart = (slot, fromName, toName, targetFrom, angle, flipX = false) => {
        const partName = slot.split('.')[0];
        const anchors = resolvedAnchors(manifest, partName);
        const from = anchors[fromName], to = anchors[toName];
        const effectiveFrom = flipX ? { x: parts[slot].w - 1 - from.x, y: from.y } : from;
        const effectiveTo = flipX ? { x: parts[slot].w - 1 - to.x, y: to.y } : to;
        blitRotated(parts[slot], result, effectiveFrom, targetFrom, angle, flipX);
        const delta = rotateVector({ x: effectiveTo.x - effectiveFrom.x, y: effectiveTo.y - effectiveFrom.y }, angle);
        return { x: targetFrom.x + delta.x, y: targetFrom.y + delta.y };
    };

    // Far side stays neutral so the moved near side can be judged against it.
    drawFixed('upperArm', 'shoulder', master.rightShoulder, true);
    drawFixed('forearm', 'elbow', master.rightElbow, true);
    drawFixed('hand.open', 'wrist', master.rightWrist, true);
    drawFixed('pelvisUnderlay', 'neck', master.neck);
    drawFixed('thigh', 'hip', master.rightHip, true);
    drawFixed('shin', 'knee', master.rightKnee, true);
    drawFixed('boot.neutral', 'ankle', master.rightAnkle, true);
    drawFixed('head.idle', 'crown', master.crown);
    // The future shoulder presentation layer covers this root. Drawing the
    // upper arm before torso here proves the same concealment without baking
    // that optional mask into the Pass-B trial cell.
    const movedElbow = drawChainPart('upperArm', 'shoulder', 'elbow', master.leftShoulder, -1.05);
    drawFixed('torso', 'neck', master.neck);

    const movedKnee = drawChainPart('thigh', 'hip', 'knee', master.leftHip, -0.42);
    const movedAnkle = drawChainPart('shin', 'knee', 'ankle', movedKnee, -0.18);
    drawChainPart('boot.neutral', 'ankle', 'ankleAxis', movedAnkle, -0.18);
    drawFixed('pelvisMask', 'neck', master.neck);

    const movedWrist = drawChainPart('forearm', 'elbow', 'wrist', movedElbow, -0.78);
    drawChainPart('hand.open', 'wrist', 'wristAxis', movedWrist, -0.78);
    drawFixed('shoulderMask', 'neck', master.neck);
    return result;
}

function comparisonImage(source, panel, neutral, stress) {
    const result = emptyImage(panel.w * 3, panel.h);
    for (let y = 0; y < panel.h; y++) {
        for (let x = 0; x < panel.w; x++) {
            setPixel(result, x, y, pixelAt(source, panel.x + x, panel.y + y));
        }
    }
    blit(neutral, result, panel.w, 0);
    blit(stress, result, panel.w * 2, 0);
    return result;
}

async function main() {
    const [manifestBytes, sourceBytes] = await Promise.all([readFile(MANIFEST_PATH), readFile(SOURCE_PATH)]);
    const actualHash = createHash('sha256').update(sourceBytes).digest('hex');
    if (actualHash !== APPROVED_SHA256) throw new Error(`approved Pass A hash changed: ${actualHash}`);
    const manifest = JSON.parse(manifestBytes);
    const source = decodeRgbaPng(sourceBytes);
    const sheet = cloneImage(source);
    const parts = buildProfileParts(manifest, source);
    const validatedZones = validateTrialParts(manifest, parts);
    writePartsIntoSheet(manifest, sheet, parts);
    const mutation = validateSheetMutation(manifest, source, sheet);
    const assembly = assembleProfile(manifest, parts);
    const stress = assembleStressProfile(manifest, parts);
    const comparison = comparisonImage(source, manifest.sourceSheet.masterPanels[VIEW], assembly, stress);
    await mkdir(OUT_DIR, { recursive: true });
    await Promise.all([
        writeFile(SHEET_PATH, encodeRgbaPng(sheet)),
        writeFile(ASSEMBLY_PATH, encodeRgbaPng(assembly)),
        writeFile(STRESS_PATH, encodeRgbaPng(stress)),
        writeFile(COMPARE_PATH, encodeRgbaPng(comparison)),
    ]);
    console.log(`wrote ${BASE_SLOTS.length} profile base cells to ${SHEET_PATH}`);
    console.log(`wrote neutral source-locked assembly to ${ASSEMBLY_PATH}`);
    console.log(`wrote moved-limb overlap proof to ${STRESS_PATH}`);
    console.log(`profile trial valid: ${validatedZones} opaque joint zones plus complete pelvis underlay`);
    console.log(`source lock valid: ${mutation.changedPixels} new pixels confined to cells ${mutation.occupied.join(',')}`);
}

await main();
