#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

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

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function samePoint(a, b) {
    return a?.x === b?.x && a?.y === b?.y;
}

function sameCanvas(a, b) {
    return a?.w === b?.w && a?.h === b?.h;
}

export function validateSourceManifest(manifest) {
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

export function validatePixelCoverage(manifest, images, alphaThreshold = 10) {
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
    const assetsDir = assetsFlag >= 0 ? path.resolve(args[assetsFlag + 1]) : null;
    if (assetsFlag >= 0) args.splice(assetsFlag, 2);
    const manifestPath = path.resolve(args[0] ?? DEFAULT_MANIFEST);
    let manifest;
    try {
        manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
        console.error(`source manifest unreadable: ${manifestPath} (${error.message})`);
        process.exit(1);
    }

    const result = validateSourceManifest(manifest);
    if (assetsDir && result.errors.length === 0) {
        try {
            const pixelResult = validatePixelCoverage(manifest, await loadManifestPngs(manifest, assetsDir));
            result.errors.push(...pixelResult.errors);
            result.warnings.push(...pixelResult.warnings);
        } catch (error) {
            result.errors.push(`PNG validation failed: ${error.message}`);
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
