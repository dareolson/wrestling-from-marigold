#!/usr/bin/env node

// Normalizes the Derek-approved profile-v2 source parts into the canonical
// fixed part canvases and profile anchors declared by the v2 source manifest.
//
// The board the parts were generated on is not drawn at the fitted v2 skeleton's
// proportions, so each part is registered independently: a two-point similarity
// transform (uniform scale, rotation, translation -- never a mirror) maps two
// declared source landmarks onto that part's two manifest profile anchors.
//
// Cleanup is subtractive at concealed terminal joints: paint past the contract
// is clipped to the disk containing its overlap band, removing the shoulder ball
// and protruding knee lips. The visible thigh hip is the deliberate exception;
// its natural source contour is preserved and registered around the coverage
// zone. The only paint added is flat sampled fill inside a declared joint zone.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const MANIFEST_PATH = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.v2.example.json');
const V2 = path.join(ROOT, 'Sprite sheets/AI Pilot/Lou/v2-canonical');
const PASS_A_PATH = path.join(V2, 'pass-a/candidates/thesz-v2-pass-a-v3.png');
const PASS_A_SHA256 = 'ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb';
const SOURCE_PARTS = path.join(V2, 'pass-b/candidates/profile-v2/parts');
const REVISED_TORSO = path.join(V2,
    'pass-b/candidates/profile-v2/sources/profile-torso-trunks-v3-alpha.png');
const OUT_DIR = path.join(V2, 'pass-b/candidates/profile-v2-normalized-v4');
const OUT_PARTS = path.join(OUT_DIR, 'parts');
const VIEW = 'profile';

// ---------------------------------------------------------------- image utils

const emptyImage = (w, h) => ({ w, h, rgba: new Uint8Array(w * h * 4) });
const alphaAt = (image, x, y) => (x < 0 || y < 0 || x >= image.w || y >= image.h
    ? 0 : image.rgba[(y * image.w + x) * 4 + 3]);

function setPixel(image, x, y, rgba) {
    if (x < 0 || y < 0 || x >= image.w || y >= image.h) return;
    image.rgba.set(rgba, (y * image.w + x) * 4);
}

function paintBounds(image, threshold = 16) {
    let minX = image.w, minY = image.h, maxX = -1, maxY = -1;
    for (let y = 0; y < image.h; y++) for (let x = 0; x < image.w; x++) {
        if (alphaAt(image, x, y) <= threshold) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    if (maxX < 0) throw new Error('part has no paint');
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Row spans drive every declared landmark, so the derivation stays inspectable.
function rowSpans(image, threshold = 16) {
    const spans = [];
    for (let y = 0; y < image.h; y++) {
        let minX = image.w, maxX = -1;
        for (let x = 0; x < image.w; x++) {
            if (alphaAt(image, x, y) <= threshold) continue;
            if (x < minX) minX = x;
            maxX = x;
        }
        spans[y] = maxX < 0 ? null : { y, minX, maxX, span: maxX - minX + 1, mid: (minX + maxX) / 2 };
    }
    return spans;
}

const rowMid = (spans, y) => {
    for (let step = 0; step < 40; step++) {
        if (spans[y + step]) return spans[y + step].mid;
        if (spans[y - step]) return spans[y - step].mid;
    }
    throw new Error(`no painted row near y=${y}`);
};

function widestRow(spans, from, to) {
    let best = null;
    for (let y = from; y <= to; y++) if (spans[y] && (!best || spans[y].span > best.span)) best = spans[y];
    if (!best) throw new Error(`no painted rows in ${from}..${to}`);
    return best;
}

function narrowestRow(spans, from, to) {
    let best = null;
    for (let y = from; y <= to; y++) if (spans[y] && (!best || spans[y].span < best.span)) best = spans[y];
    if (!best) throw new Error(`no painted rows in ${from}..${to}`);
    return best;
}

// Bilinear sample in premultiplied space so half-transparent ink never bleeds.
function sample(image, x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    if (x0 < -1 || y0 < -1 || x0 > image.w || y0 > image.h) return [0, 0, 0, 0];
    const tx = x - x0, ty = y - y0;
    let a = 0, r = 0, g = 0, b = 0;
    for (const [sx, sy, weight] of [[x0, y0, (1 - tx) * (1 - ty)], [x0 + 1, y0, tx * (1 - ty)],
        [x0, y0 + 1, (1 - tx) * ty], [x0 + 1, y0 + 1, tx * ty]]) {
        if (sx < 0 || sy < 0 || sx >= image.w || sy >= image.h) continue;
        const offset = (sy * image.w + sx) * 4;
        const alpha = image.rgba[offset + 3] / 255;
        a += alpha * weight;
        r += image.rgba[offset] * alpha * weight;
        g += image.rgba[offset + 1] * alpha * weight;
        b += image.rgba[offset + 2] * alpha * weight;
    }
    return a < 1e-4 ? [0, 0, 0, 0]
        : [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a * 255)];
}

// ------------------------------------------------------- registration algebra

const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const length = v => Math.hypot(v.x, v.y);
const unit = v => { const l = length(v); return { x: v.x / l, y: v.y / l }; };

// Similarity transform taking dstA/dstB back to srcA/srcB. Uniform scale and
// rotation only: there is no reflection term, so no part can be mirrored.
function inverseSimilarity(srcA, srcB, dstA, dstB) {
    const source = subtract(srcB, srcA), destination = subtract(dstB, dstA);
    const scale = length(source) / length(destination);
    const angle = Math.atan2(source.y, source.x) - Math.atan2(destination.y, destination.x);
    const cos = Math.cos(angle) * scale, sin = Math.sin(angle) * scale;
    return point => {
        const dx = point.x - dstA.x, dy = point.y - dstA.y;
        return { x: srcA.x + dx * cos - dy * sin, y: srcA.y + dx * sin + dy * cos };
    };
}

// 3x3 supersample: every canonical cell downsamples its source by ~2x.
function renderRegistered(source, canvas, toSource) {
    const image = emptyImage(canvas.w, canvas.h);
    const offsets = [1 / 6, 1 / 2, 5 / 6];
    for (let y = 0; y < canvas.h; y++) for (let x = 0; x < canvas.w; x++) {
        let a = 0, r = 0, g = 0, b = 0;
        for (const dy of offsets) for (const dx of offsets) {
            const point = toSource({ x: x + dx, y: y + dy });
            const [sr, sg, sb, sa] = sample(source, point.x, point.y);
            const alpha = sa / 255;
            a += alpha; r += sr * alpha; g += sg * alpha; b += sb * alpha;
        }
        if (a < 1e-4) continue;
        setPixel(image, x, y, [Math.round(r / a), Math.round(g / a), Math.round(b / a),
            Math.round((a / 9) * 255)]);
    }
    return image;
}

// ------------------------------------------------------------------- cleanups

// The single cleanup rule. Past a terminal joint anchor a part may only keep
// the paint the contract actually asks it to carry, so the disk radius is the
// exact corner distance of that anchor's declared overlap band.
const terminalRadius = (zone, side) =>
    Math.ceil(Math.hypot(side === 'before' ? zone.beforePx : zone.afterPx, zone.opaqueCoreRadiusPx));

function clipTerminals(image, anchors, terminals) {
    let removed = 0;
    for (let y = 0; y < image.h; y++) for (let x = 0; x < image.w; x++) {
        if (!alphaAt(image, x, y)) continue;
        const point = { x: x + 0.5, y: y + 0.5 };
        for (const { anchor, axis, radius, capsule } of terminals) {
            if (capsule) {
                const delta = subtract(point, anchor);
                const along = delta.x * axis.x + delta.y * axis.y;
                if (along <= 0) continue;
                const across = Math.abs(delta.x * -axis.y + delta.y * axis.x);
                if (along <= capsule.length && across <= capsule.radius) continue;
                const cap = Math.hypot(along - capsule.length, across);
                if (along <= capsule.length || cap <= capsule.radius) continue;
                image.rgba.fill(0, (y * image.w + x) * 4, (y * image.w + x) * 4 + 4);
                removed++;
                break;
            }
            // `axis` points out of the part at this terminal.
            const delta = subtract(point, anchor);
            const along = delta.x * axis.x + delta.y * axis.y;
            if (along <= 0 || length(delta) <= radius) continue;

            image.rgba.fill(0, (y * image.w + x) * 4, (y * image.w + x) * 4 + 4);
            removed++;
            break;
        }
    }
    return removed;
}

function dropSmallComponents(image, keep = 1, threshold = 16) {
    const { w, h } = image;
    const seen = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    const components = [];
    for (let start = 0; start < w * h; start++) {
        if (seen[start] || image.rgba[start * 4 + 3] <= threshold) continue;
        let top = 0; stack[top++] = start; seen[start] = 1;
        const pixels = [];
        while (top) {
            const index = stack[--top];
            pixels.push(index);
            const x = index % w, y = (index / w) | 0;
            for (const next of [x > 0 ? index - 1 : -1, x < w - 1 ? index + 1 : -1,
                y > 0 ? index - w : -1, y < h - 1 ? index + w : -1]) {
                if (next < 0 || seen[next] || image.rgba[next * 4 + 3] <= threshold) continue;
                seen[next] = 1; stack[top++] = next;
            }
        }
        components.push(pixels);
    }
    components.sort((a, b) => b.length - a.length);
    let removed = 0;
    for (const component of components.slice(keep)) {
        for (const index of component) image.rgba.fill(0, index * 4, index * 4 + 4);
        removed += component.length;
    }
    return removed;
}

function countTransparentHoles(image, threshold = 16) {
    const seen = new Uint8Array(image.w * image.h);
    const queue = new Int32Array(image.w * image.h);
    let head = 0, tail = 0;
    const enqueue = index => {
        if (seen[index] || image.rgba[index * 4 + 3] > threshold) return;
        seen[index] = 1;
        queue[tail++] = index;
    };
    for (let x = 0; x < image.w; x++) {
        enqueue(x);
        enqueue((image.h - 1) * image.w + x);
    }
    for (let y = 0; y < image.h; y++) {
        enqueue(y * image.w);
        enqueue(y * image.w + image.w - 1);
    }
    while (head < tail) {
        const index = queue[head++], x = index % image.w, y = (index / image.w) | 0;
        if (x > 0) enqueue(index - 1);
        if (x < image.w - 1) enqueue(index + 1);
        if (y > 0) enqueue(index - image.w);
        if (y < image.h - 1) enqueue(index + image.w);
    }
    let holes = 0;
    for (let index = 0; index < image.w * image.h; index++) {
        if (!seen[index] && image.rgba[index * 4 + 3] <= threshold) holes++;
    }
    return holes;
}

// Alpha below this never survives: it is chroma-key fringe, not authored paint.
function hardenAlpha(image, floor = 24) {
    let cleared = 0;
    for (let index = 0; index < image.w * image.h; index++) {
        const offset = index * 4;
        if (image.rgba[offset + 3] === 0 || image.rgba[offset + 3] > floor) continue;
        image.rgba.fill(0, offset, offset + 4);
        cleared++;
    }
    // Transparent pixels must carry RGB 0,0,0 for the manifest's own check.
    for (let index = 0; index < image.w * image.h; index++) {
        const offset = index * 4;
        if (image.rgba[offset + 3] === 0) image.rgba.fill(0, offset, offset + 3);
    }
    return cleared;
}

function medianColor(image, center, radius, accept = () => true) {
    const channels = [[], [], []];
    for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y++) {
        for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x++) {
            if ((x - center.x) ** 2 + (y - center.y) ** 2 > radius ** 2) continue;
            if (alphaAt(image, x, y) !== 255) continue;
            const offset = (y * image.w + x) * 4;
            const rgba = image.rgba.slice(offset, offset + 4);
            if (!accept(rgba)) continue;
            for (let channel = 0; channel < 3; channel++) channels[channel].push(rgba[channel]);
        }
    }
    if (!channels[0].length) return null;
    return [...channels.map(values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]), 255];
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

function diskPoints(center, radius) {
    const points = [];
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
            points.push({ x: Math.round(center.x) + dx, y: Math.round(center.y) + dy });
        }
    }
    return points;
}

function zonePoints(anchor, axis, zone) {
    return [
        ...bandPoints(anchor, axis, -zone.beforePx, -1, zone.opaqueCoreRadiusPx),
        ...bandPoints(anchor, axis, 1, zone.afterPx, zone.opaqueCoreRadiusPx),
        ...diskPoints(anchor, zone.opaqueCoreRadiusPx),
    ];
}

// The zone the validator samples is a square-cornered band. Filling that band
// literally leaves hard rectangular tabs wherever the drawn part is narrower
// than the band, so fill the capsule that contains it instead: same coverage,
// rounded ends, reads as a limb stub rather than a box.
function capsulePoints(anchor, axis, before, after, radius) {
    const a = { x: anchor.x - axis.x * before, y: anchor.y - axis.y * before };
    const b = { x: anchor.x + axis.x * after, y: anchor.y + axis.y * after };
    const points = [];
    const minX = Math.floor(Math.min(a.x, b.x) - radius - 1);
    const maxX = Math.ceil(Math.max(a.x, b.x) + radius + 1);
    const minY = Math.floor(Math.min(a.y, b.y) - radius - 1);
    const maxY = Math.ceil(Math.max(a.y, b.y) + radius + 1);
    const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, length2 ? ((x - a.x) * dx + (y - a.y) * dy) / length2 : 0));
        if (Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)) <= radius) points.push({ x, y });
    }
    return points;
}

function fillZone(image, points, color) {
    let filled = 0;
    for (const point of points) {
        if (alphaAt(image, point.x, point.y) === 255) continue;
        setPixel(image, point.x, point.y, color);
        filled++;
    }
    return filled;
}

export {
    alphaAt, bandPoints, countTransparentHoles, diskPoints, emptyImage, inverseSimilarity, paintBounds,
    rowSpans, terminalRadius, zonePoints,
};
export const OUTPUT_DIR = OUT_DIR;
export const SOURCE_PARTS_DIR = SOURCE_PARTS;
export const FROZEN_PASS_A_SHA256 = PASS_A_SHA256;

// ------------------------------------------------------- declared landmarks
//
// Every landmark below is read off the part's own silhouette. Two kinds:
//
//   anatomical  a silhouette feature (the widest row of a cap, the narrowest
//               row of a waist, the topmost painted pixel).
//   budgeted    solved so the paint the part already carries past that anchor
//               is exactly the overlap the manifest declares for it, which is
//               what keeps the two sides of a joint the same width.
//
// Budgeted solves use vertical distance; each source part is drawn near-
// vertical, and the similarity transform absorbs the remaining tilt.

// Places `anchor` so `(end - anchor) * scale === overlap`, where scale itself
// falls out of the bone span between `anchor` and the fixed `other` landmark.
function budgetedAnchor({ other, end, span, overlap }) {
    const anchor = (span * end + overlap * other) / (span + overlap);
    return { y: anchor, scale: span / Math.abs(anchor - other) };
}

function deriveLandmarks(images) {
    const marks = {};
    const featureOf = name => {
        const image = images[name];
        return { image, bounds: paintBounds(image), spans: rowSpans(image) };
    };

    // head: crown is the topmost painted pixel; the neck seating column is read
    // at 85% of the head's height, below the jaw and inside the neck stub.
    {
        const { bounds, spans } = featureOf('head');
        const neckY = bounds.y + Math.round(bounds.h * 0.85);
        marks.head = {
            source: 'head.png',
            from: { name: 'crown', x: rowMid(spans, bounds.y), y: bounds.y },
            to: { name: 'neck', x: rowMid(spans, neckY), y: neckY },
        };
    }

    // torso: the neck anchor sits just inside the top of the neck stub. The hip
    // line is budgeted against the last row where the trunks still carry real
    // fill, so the pelvis lands on the manifest's pelvisCoverage band.
    {
        const { image, bounds, spans } = featureOf('torso-trunks');
        let usableBottom = bounds.y;
        for (let y = bounds.y; y < bounds.y + bounds.h; y++) {
            let solid = 0;
            for (let x = 0; x < image.w; x++) if (alphaAt(image, x, y) === 255) solid++;
            if (solid >= 40) usableBottom = y;
        }
        const neckY = bounds.y + 4;
        // 199.42px neck->hip, then 29px more to the bottom of pelvisCoverage.
        const hip = budgetedAnchor({ other: neckY, end: usableBottom, span: 199.42417105255822, overlap: 29 });
        marks.torso = {
            source: 'profile-torso-trunks-v3-alpha.png',
            sourceKey: 'torso-trunks',
            from: { name: 'neck', x: rowMid(spans, neckY), y: neckY },
            to: { name: 'midHip', x: rowMid(spans, Math.round(hip.y)), y: hip.y },
            usableBottom,
        };
    }

    // upperArm: the shoulder is the centre of the deltoid cap circle; the elbow
    // is the arm's waist. Cut from the full arm source, not the short crop,
    // which stops above the elbow and so carries no post-elbow overlap at all.
    {
        const { bounds, spans } = featureOf('upper-arm-source');
        const cap = widestRow(spans, bounds.y, bounds.y + Math.round(bounds.h * 0.4));
        const shoulderY = bounds.y + cap.span / 2;
        const elbow = narrowestRow(spans, bounds.y + Math.round(bounds.h * 0.55),
            bounds.y + Math.round(bounds.h * 0.75));
        marks.upperArm = {
            source: 'upper-arm-source.png',
            from: { name: 'shoulder', x: rowMid(spans, Math.round(shoulderY)), y: shoulderY },
            to: { name: 'elbow', x: elbow.mid, y: elbow.y },
        };
    }

    // forearms: the wrist is the arm's distal waist; the elbow is budgeted so
    // the drawn cap above it supplies the declared 24px pre-elbow overlap.
    for (const [key, file] of [['nearForearm', 'near-forearm-hand-source'],
        ['farForearm', 'far-forearm-hand-source']]) {
        const { bounds, spans } = featureOf(file);
        const wrist = narrowestRow(spans, bounds.y + Math.round(bounds.h * 0.55),
            bounds.y + Math.round(bounds.h * 0.80));
        const elbow = budgetedAnchor({ other: wrist.y, end: bounds.y, span: 74.33034373659252, overlap: 24 });
        marks[key] = {
            source: `${file}.png`,
            from: { name: 'elbow', x: rowMid(spans, Math.round(elbow.y)), y: elbow.y },
            to: { name: 'wrist', x: wrist.mid, y: wrist.y },
        };
    }

    // hands: same wrist point as their forearm, and an axis pointing down the
    // hand. Registering wrist->axis at the forearm's own scale keeps the hand
    // the size it was drawn relative to the arm it belongs to.
    for (const [key, forearmKey, file] of [['nearHand', 'nearForearm', 'near-forearm-hand-source'],
        ['farHand', 'farForearm', 'far-forearm-hand-source']]) {
        const { image, bounds, spans } = featureOf(file);
        const wrist = marks[forearmKey].to;
        const forearmScale = 74.33034373659252
            / length(subtract(marks[forearmKey].to, marks[forearmKey].from));
        let sumX = 0, sumY = 0, count = 0;
        for (let y = Math.ceil(wrist.y); y < bounds.y + bounds.h; y++) {
            if (!spans[y]) continue;
            for (let x = spans[y].minX; x <= spans[y].maxX; x++) {
                if (alphaAt(image, x, y) <= 16) continue;
                sumX += x; sumY += y; count++;
            }
        }
        const direction = unit(subtract({ x: sumX / count, y: sumY / count }, wrist));
        const axisLength = 20 / forearmScale;
        marks[key] = {
            source: `${file}.png`,
            from: { name: 'wrist', x: wrist.x, y: wrist.y },
            to: {
                name: 'wristAxis',
                x: wrist.x + direction.x * axisLength,
                y: wrist.y + direction.y * axisLength,
            },
        };
    }

    // thigh: keep the source's broad hip-to-thigh contour. The v1 normalizer
    // placed the hip at the widest row, then clipped everything above the
    // declared capsule and filled the capsule back in. That deterministic
    // cleanup manufactured the visible ball-joint knob; it was not source art.
    // Place the hip far enough into the existing upper-thigh paint that the
    // whole declared hip zone fits inside the natural silhouette. The knee is
    // still budgeted so the drawn tip below it is exactly the declared 30px
    // overlap.
    {
        const { bounds, spans } = featureOf('thigh');
        const boneSpan = 101.24228365658294;
        const kneeOverlap = 30;
        const requiredPaintBeforeHip = 20 + 12 + 1;
        const sourceEnd = bounds.y + bounds.h - 1;
        let hipY = bounds.y;
        while (hipY < bounds.y + Math.round(bounds.h * 0.4)) {
            const registeredAboveHip = (hipY - bounds.y) * (boneSpan + kneeOverlap)
                / (sourceEnd - hipY);
            if (registeredAboveHip >= requiredPaintBeforeHip) break;
            hipY++;
        }
        const hip = spans[hipY] ?? { ...widestRow(spans, hipY - 4, hipY + 4), y: hipY };
        const knee = budgetedAnchor({
            other: hip.y, end: sourceEnd, span: boneSpan, overlap: kneeOverlap,
        });
        marks.thigh = {
            source: 'thigh.png',
            from: { name: 'hip', x: hip.mid, y: hip.y },
            to: { name: 'knee', x: rowMid(spans, Math.round(knee.y)), y: knee.y },
        };
    }

    // shin: the ankle is the middle of the distal waist run; the knee is
    // budgeted against the drawn cap so it lands at the thigh's own knee width.
    {
        const { bounds, spans } = featureOf('shin');
        const from = bounds.y + Math.round(bounds.h * 0.65), to = bounds.y + Math.round(bounds.h * 0.92);
        const minimum = narrowestRow(spans, from, to).span;
        const run = [];
        for (let y = from; y <= to; y++) if (spans[y] && spans[y].span === minimum) run.push(y);
        const ankleY = run[Math.floor(run.length / 2)];
        const knee = budgetedAnchor({ other: ankleY, end: bounds.y, span: 98.02040603874276, overlap: 24 });
        marks.shin = {
            source: 'shin.png',
            from: { name: 'knee', x: rowMid(spans, Math.round(knee.y)), y: knee.y },
            to: { name: 'ankle', x: rowMid(spans, ankleY), y: ankleY },
        };
    }

    // boots: the ankle is budgeted so the drawn cuff above it supplies the 20px
    // pre-ankle overlap; the sole is the lowest paint directly under the ankle.
    for (const [key, file] of [['nearBoot', 'near-boot'], ['farBoot', 'far-boot']]) {
        const { image, bounds, spans } = featureOf(file);
        let ankleY = bounds.y, scale = 1, ankleX = rowMid(spans, bounds.y), soleY = bounds.y;
        for (let pass = 0; pass < 4; pass++) {
            soleY = bounds.y;
            for (let y = bounds.y + bounds.h - 1; y >= bounds.y; y--) {
                if (alphaAt(image, Math.round(ankleX), y) > 16) { soleY = y; break; }
            }
            const solved = budgetedAnchor({ other: soleY, end: bounds.y, span: 54, overlap: 20 });
            ankleY = solved.y; scale = solved.scale;
            ankleX = rowMid(spans, Math.round(ankleY));
        }
        // The sole is the grounding point directly under the ankle, not the
        // midpoint of the bottom row -- that midpoint sits out at the toe and
        // would register the whole boot rotated onto its toe.
        marks[key] = {
            source: `${file}.png`,
            from: { name: 'ankle', x: ankleX, y: ankleY },
            to: { name: 'sole', x: ankleX, y: soleY },
            scale,
        };
    }
    return marks;
}

// -------------------------------------------------------------- canonical set
//
// `slot` is the manifest bank cell the part belongs in. `alias` files exist
// because profile authors near and far forearms/hands separately while the
// 19-slot bank still has one `forearm` and one `hand.open` cell; Skeleton.js
// already reads nearForearm/farForearm and nearHand/farHand with a fallback to
// the single-slot names, so no renderer change is needed here.
export const PART_PLAN = [
    { key: 'head', part: 'head', slot: 'head.idle', file: 'head.png',
        anchors: ['crown', 'neck'], terminals: [['neck', 'after', 'crown']] },
    { key: 'torso', part: 'torso', slot: 'torso', file: 'torso.png',
        anchors: ['neck', 'midHip'], terminals: [] },
    { key: 'upperArm', part: 'upperArm', slot: 'upperArm', file: 'upper-arm.png',
        anchors: ['shoulder', 'elbow'],
        terminals: [['shoulder', 'before', 'elbow'], ['elbow', 'after', 'shoulder']] },
    { key: 'nearForearm', part: 'forearm', slot: 'forearm', file: 'near-forearm.png',
        anchors: ['elbow', 'wrist'],
        terminals: [['elbow', 'before', 'wrist'], ['wrist', 'after', 'elbow']] },
    { key: 'farForearm', part: 'forearm', slot: 'forearm', file: 'far-forearm.png',
        anchors: ['elbow', 'wrist'],
        terminals: [['elbow', 'before', 'wrist'], ['wrist', 'after', 'elbow']] },
    { key: 'nearHand', part: 'hand', slot: 'hand.open', file: 'near-hand.png',
        anchors: ['wrist', 'wristAxis'], terminals: [['wrist', 'before', 'wristAxis']] },
    { key: 'farHand', part: 'hand', slot: 'hand.open', file: 'far-hand.png',
        anchors: ['wrist', 'wristAxis'], terminals: [['wrist', 'before', 'wristAxis']] },
    // Preserve the thigh's painted hip contour. It is intentionally visible on
    // top of the solid trunks, so terminal clipping must not turn it into a
    // capsule. Registration above seats the declared coverage inside the paint.
    { key: 'thigh', part: 'thigh', slot: 'thigh', file: 'thigh.png',
        anchors: ['hip', 'knee'],
        terminals: [['knee', 'after', 'hip']] },
    { key: 'shin', part: 'shin', slot: 'shin', file: 'shin.png',
        anchors: ['knee', 'ankle'],
        terminals: [['knee', 'before', 'ankle'], ['ankle', 'after', 'knee']] },
    { key: 'nearBoot', part: 'boot', slot: 'boot.neutral', file: 'near-boot.png',
        anchors: ['ankle', 'sole'], terminals: [['ankle', 'before', 'sole']] },
    { key: 'farBoot', part: 'boot', slot: 'boot.neutral', file: 'far-boot.png',
        anchors: ['ankle', 'sole'], terminals: [['ankle', 'before', 'sole']] },
];

const SOURCE_FILES = ['head', 'torso-trunks', 'upper-arm-source', 'near-forearm-hand-source',
    'far-forearm-hand-source', 'thigh', 'shin', 'near-boot', 'far-boot'];

export function resolvedAnchors(manifest, partName) {
    return {
        ...(manifest.parts[partName].anchors ?? {}),
        ...(manifest.views[VIEW].anchorOverrides?.[partName] ?? {}),
    };
}

export function orientationAxis(manifest, partName) {
    const anchors = resolvedAnchors(manifest, partName);
    const [from, to] = manifest.parts[partName].orientation.frame;
    return unit(subtract(anchors[to], anchors[from]));
}

function buildNormalizedParts(manifest, images, marks) {
    const parts = {}, report = {};
    for (const plan of PART_PLAN) {
        const mark = marks[plan.key];
        const canvas = manifest.parts[plan.part].canvas;
        const anchors = resolvedAnchors(manifest, plan.part);
        // The torso's second registration point is the midpoint of its two
        // declared hips; every other part maps anchor to anchor.
        const destinationTo = plan.anchors[1] === 'midHip'
            ? { x: (anchors.leftHip.x + anchors.rightHip.x) / 2, y: anchors.leftHip.y }
            : anchors[plan.anchors[1]];
        const destinationFrom = anchors[plan.anchors[0]];
        const toSource = inverseSimilarity(mark.from, mark.to, destinationFrom, destinationTo);
        const image = renderRegistered(images[mark.sourceKey ?? mark.source.replace('.png', '')], canvas, toSource);

        const scale = length(subtract(destinationTo, destinationFrom))
            / length(subtract(mark.to, mark.from));
        const cleared = hardenAlpha(image);

        const zones = manifest.parts[plan.part].jointZones ?? {};
        const terminals = plan.terminals.map(([anchorName, side, awayFrom, shape]) => {
            const zone = zones[anchorName];
            return {
                anchor: anchors[anchorName],
                axis: unit(subtract(anchors[anchorName],
                    awayFrom === 'midHip' ? destinationTo : anchors[awayFrom])),
                radius: terminalRadius(zone, side),
                capsule: shape === 'capsule'
                    ? { length: side === 'before' ? zone.beforePx : zone.afterPx,
                        radius: zone.opaqueCoreRadiusPx + 1 }
                    : null,
            };
        });
        const trimmed = clipTerminals(image, anchors, terminals);
        const strays = dropSmallComponents(image, 1);
        hardenAlpha(image);

        parts[plan.key] = image;
        report[plan.key] = {
            slot: plan.slot, file: plan.file, canvas: { ...canvas },
            source: mark.source,
            sourceLandmarks: {
                [mark.from.name]: { x: +mark.from.x.toFixed(2), y: +mark.from.y.toFixed(2) },
                [mark.to.name]: { x: +mark.to.x.toFixed(2), y: +mark.to.y.toFixed(2) },
            },
            registeredScale: +scale.toFixed(5),
            mirrored: false,
            trimmedPx: trimmed, strayPx: strays, softAlphaClearedPx: cleared,
            terminalRadii: Object.fromEntries(plan.terminals.map(([name, side]) =>
                [name, terminalRadius(manifest.parts[plan.part].jointZones[name], side)])),
        };
    }
    return { parts, report };
}

// Sampled flat fill inside declared joint zones only. Nothing is drawn outside
// a zone, and every zone is concealed by the part that attaches there.
function fillJointZones(manifest, parts, report) {
    for (const plan of PART_PLAN) {
        const anchors = resolvedAnchors(manifest, plan.part);
        const axis = orientationAxis(manifest, plan.part);
        const zones = manifest.parts[plan.part].jointZones ?? {};
        for (const [jointName, zone] of Object.entries(zones)) {
            if (zone.coveragePart) continue;
            const anchor = anchors[jointName];
            const inside = { x: anchor.x + axis.x * zone.opaqueCoreRadiusPx * 1.5,
                y: anchor.y + axis.y * zone.opaqueCoreRadiusPx * 1.5 };
            const color = medianColor(parts[plan.key], inside, zone.opaqueCoreRadiusPx)
                ?? medianColor(parts[plan.key], anchor, zone.opaqueCoreRadiusPx + 10)
                ?? medianColor(parts[plan.key], anchor, zone.opaqueCoreRadiusPx + 26);
            if (!color) throw new Error(`${plan.key}.${jointName} has no fill colour to sample`);
            const points = capsulePoints(anchor, axis, zone.beforePx, zone.afterPx,
                zone.opaqueCoreRadiusPx + 1);
            const filled = fillZone(parts[plan.key], points, color);
            report[plan.key].zoneFillPx = (report[plan.key].zoneFillPx ?? 0) + filled;
            report[plan.key].zoneFillByJoint ??= {};
            report[plan.key].zoneFillByJoint[jointName] = filled;
            report[plan.key].zoneFillColor = `#${color.slice(0, 3)
                .map(value => value.toString(16).padStart(2, '0')).join('')}`;
        }
    }
}

function buildPelvisLayers(manifest, parts, report) {
    const canvas = manifest.parts.pelvisUnderlay.canvas;
    const coverage = manifest.parts.torso.pelvisCoverage;
    const anchors = resolvedAnchors(manifest, 'torso');
    const trunks = medianColor(parts.torso, { x: (anchors.leftHip.x + anchors.rightHip.x) / 2, y: anchors.leftHip.y - 26 }, 14,
        rgba => rgba[0] < 70 && rgba[1] < 70 && rgba[2] < 70);
    if (!trunks) throw new Error('could not sample the trunks colour from the normalized torso');

    const underlay = emptyImage(canvas.w, canvas.h);
    const { x, y, w, h } = coverage.bounds, radius = coverage.cornerRadiusPx;
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
        const cx = Math.max(x + radius, Math.min(x + w - 1 - radius, px));
        const cy = Math.max(y + radius, Math.min(y + h - 1 - radius, py));
        if ((px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2) setPixel(underlay, px, py, trunks);
    }
    const axis = orientationAxis(manifest, 'torso');
    for (const jointName of ['leftHip', 'rightHip']) {
        const zone = manifest.parts.torso.jointZones[jointName];
        fillZone(underlay, capsulePoints(anchors[jointName], axis,
            zone.beforePx, zone.afterPx, zone.opaqueCoreRadiusPx + 1), trunks);
    }
    parts.pelvisUnderlay = underlay;
    report.pelvisUnderlay = {
        slot: 'pelvisUnderlay', file: 'pelvis-underlay.png', canvas: { ...canvas },
        source: 'derived: manifest pelvisCoverage bounds filled with the torso trunks colour',
        fillColor: `#${trunks.slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('')}`,
        mirrored: false,
    };

    // Derek's profile rule: pelvisMask and the reserved shoulderMask stay
    // transparent unless a stress proof proves a lip is needed.
    for (const [key, slot, file] of [['pelvisMask', 'pelvisMask', 'pelvis-mask.png'],
        ['shoulderMask', 'shoulderMask', 'shoulder-mask.png']]) {
        parts[key] = emptyImage(canvas.w, canvas.h);
        report[key] = { slot, file, canvas: { ...canvas }, source: 'intentionally transparent', mirrored: false };
    }
}

// ---------------------------------------------------------------- proof render

function blit(source, target, dx, dy) {
    for (let y = 0; y < source.h; y++) for (let x = 0; x < source.w; x++) {
        const offset = (y * source.w + x) * 4;
        if (!source.rgba[offset + 3]) continue;
        setPixel(target, dx + x, dy + y, source.rgba.slice(offset, offset + 4));
    }
}

// Supersampled so the moved-limb proof shows the asset's own edge quality
// rather than the ragged fringe nearest-neighbour rotation would add.
function blitRotated(source, target, pivot, targetPivot, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const radius = Math.ceil(Math.hypot(source.w, source.h));
    const offsets = [1 / 6, 1 / 2, 5 / 6];
    for (let y = Math.floor(targetPivot.y - radius); y <= Math.ceil(targetPivot.y + radius); y++) {
        for (let x = Math.floor(targetPivot.x - radius); x <= Math.ceil(targetPivot.x + radius); x++) {
            let a = 0, r = 0, g = 0, b = 0;
            for (const sy of offsets) for (const sx of offsets) {
                const dx = x + sx - targetPivot.x, dy = y + sy - targetPivot.y;
                const [pr, pg, pb, pa] = sample(source,
                    pivot.x + cos * dx + sin * dy, pivot.y - sin * dx + cos * dy);
                const alpha = pa / 255;
                a += alpha; r += pr * alpha; g += pg * alpha; b += pb * alpha;
            }
            if (a < 1e-4) continue;
            const alpha = Math.round((a / 9) * 255);
            if (!alpha) continue;
            const existing = alphaAt(target, x, y);
            // Keep the underlying part where this one is only faintly covering,
            // so a rotated edge does not cut a translucent notch into it.
            if (alpha < 128 && existing === 255) continue;
            setPixel(target, x, y, [Math.round(r / a), Math.round(g / a), Math.round(b / a),
                Math.max(alpha, existing)]);
        }
    }
}

const PLACEMENT = {
    head: ['head', 'crown'], torso: ['torso', 'neck'],
    pelvisUnderlay: ['torso', 'neck'], pelvisMask: ['torso', 'neck'], shoulderMask: ['torso', 'neck'],
    upperArm: ['upperArm', 'shoulder'], nearForearm: ['forearm', 'elbow'], farForearm: ['forearm', 'elbow'],
    nearHand: ['hand', 'wrist'], farHand: ['hand', 'wrist'],
    thigh: ['thigh', 'hip'], shin: ['shin', 'knee'],
    nearBoot: ['boot', 'ankle'], farBoot: ['boot', 'ankle'],
};

function renderProofs(manifest, parts, stress = false) {
    const canvas = emptyImage(768, 960);
    const master = manifest.views[VIEW].masterLandmarks;
    const anchorOf = key => {
        const [partName, anchorName] = PLACEMENT[key];
        return resolvedAnchors(manifest, partName)[anchorName];
    };
    // No part is ever flipped: profile reuses one true side-view cut per family.
    const fixed = (key, target) => {
        const anchor = anchorOf(key);
        blit(parts[key], canvas, Math.round(target.x - anchor.x), Math.round(target.y - anchor.y));
    };
    const chained = (key, fromName, toName, target, angle) => {
        const [partName] = PLACEMENT[key];
        const anchors = resolvedAnchors(manifest, partName);
        const from = anchors[fromName], to = anchors[toName];
        blitRotated(parts[key], canvas, from, target, angle);
        const delta = subtract(to, from);
        return {
            x: target.x + delta.x * Math.cos(angle) - delta.y * Math.sin(angle),
            y: target.y + delta.x * Math.sin(angle) + delta.y * Math.cos(angle),
        };
    };
    const registered = (key, fromName, toName, targetFrom, targetTo) => {
        const [partName] = PLACEMENT[key];
        const anchors = resolvedAnchors(manifest, partName);
        const local = subtract(anchors[toName], anchors[fromName]);
        const target = subtract(targetTo, targetFrom);
        const angle = Math.atan2(target.y, target.x) - Math.atan2(local.y, local.x);
        blitRotated(parts[key], canvas, anchors[fromName], targetFrom, angle);
    };

    // Far side (camera-right) first, then the presentation stack, then near.
    registered('upperArm', 'shoulder', 'elbow', master.rightShoulder, master.rightElbow);
    registered('farForearm', 'elbow', 'wrist', master.rightElbow, master.rightWrist);
    fixed('farHand', master.rightWrist);
    fixed('pelvisUnderlay', master.neck);
    registered('thigh', 'hip', 'knee', master.rightHip, master.rightKnee);
    registered('shin', 'knee', 'ankle', master.rightKnee, master.rightAnkle);
    fixed('farBoot', master.rightAnkle);
    fixed('head', master.crown);
    fixed('torso', master.neck);

    if (!stress) {
        registered('thigh', 'hip', 'knee', master.leftHip, master.leftKnee);
        registered('shin', 'knee', 'ankle', master.leftKnee, master.leftAnkle);
        fixed('nearBoot', master.leftAnkle);
        fixed('pelvisMask', master.neck);
        registered('upperArm', 'shoulder', 'elbow', master.leftShoulder, master.leftElbow);
        registered('nearForearm', 'elbow', 'wrist', master.leftElbow, master.leftWrist);
        fixed('nearHand', master.leftWrist);
    } else {
        const knee = chained('thigh', 'hip', 'knee', master.leftHip, -0.42);
        const ankle = chained('shin', 'knee', 'ankle', knee, -0.18);
        chained('nearBoot', 'ankle', 'sole', ankle, -0.18);
        fixed('pelvisMask', master.neck);
        const elbow = chained('upperArm', 'shoulder', 'elbow', master.leftShoulder, -1.05);
        const wrist = chained('nearForearm', 'elbow', 'wrist', elbow, -0.78);
        chained('nearHand', 'wrist', 'wristAxis', wrist, -0.78);
    }
    fixed('shoulderMask', master.neck);
    return canvas;
}

// Derek's rule is that the profile pelvisMask stays transparent unless a stress
// proof shows a lip is genuinely needed. Both presentation masks exist to hide
// overlap that the near limb legally carries, so this measures exactly how much
// of that overlap actually lands in view, in the neutral pose and under load.
function measureMaskExposure(manifest, parts) {
    const master = manifest.views[VIEW].masterLandmarks;
    const torsoAnchors = resolvedAnchors(manifest, 'torso');
    const place = (key, target, angle = null, fromName = null, toName = null) => {
        const canvas = emptyImage(768, 960);
        const [partName, anchorName] = PLACEMENT[key];
        const anchors = resolvedAnchors(manifest, partName);
        if (angle === null) {
            const anchor = anchors[anchorName];
            blit(parts[key], canvas, Math.round(target.x - anchor.x), Math.round(target.y - anchor.y));
        } else {
            blitRotated(parts[key], canvas, anchors[fromName], target, angle);
        }
        return canvas;
    };
    const torso = place('torso', master.neck);
    const offset = { x: master.neck.x - torsoAnchors.neck.x, y: master.neck.y - torsoAnchors.neck.y };
    const coverage = manifest.parts.torso.pelvisCoverage.bounds;
    const inPelvisBand = (x, y) => x >= coverage.x + offset.x && x < coverage.x + coverage.w + offset.x
        && y >= coverage.y + offset.y && y < coverage.y + coverage.h + offset.y;

    const count = (layer, predicate) => {
        let total = 0;
        for (let y = 0; y < 960; y++) for (let x = 0; x < 768; x++) {
            if (alphaAt(layer, x, y) > 128 && predicate(x, y)) total++;
        }
        return total;
    };
    const overTrunks = (x, y) => inPelvisBand(x, y) && alphaAt(torso, x, y) > 128;
    const pastShoulder = (x, y) => alphaAt(torso, x, y) <= 128
        && y < master.leftShoulder.y && x < master.leftShoulder.x + 30;

    return {
        pelvisMask: {
            neutralPx: count(place('thigh', master.leftHip), overTrunks),
            stressPx: count(place('thigh', master.leftHip, -0.42, 'hip', 'knee'), overTrunks),
            note: 'near-thigh overlap drawn on top of the trunks inside pelvisCoverage',
        },
        shoulderMask: {
            neutralPx: count(place('upperArm', master.leftShoulder), pastShoulder),
            stressPx: count(place('upperArm', master.leftShoulder, -1.05, 'shoulder', 'elbow'), pastShoulder),
            note: 'near upper-arm overlap standing proud of the torso above the shoulder',
        },
    };
}

function renderContactSheet(parts) {
    const columns = [['head', 'torso', 'pelvisUnderlay'], ['upperArm', 'nearForearm', 'farForearm'],
        ['nearHand', 'farHand', 'thigh'], ['shin', 'nearBoot', 'farBoot']];
    const canvas = emptyImage(4 * 220, 3 * 280);
    columns.forEach((column, columnIndex) => column.forEach((key, rowIndex) => {
        const image = parts[key];
        blit(image, canvas, columnIndex * 220 + Math.round((220 - image.w) / 2),
            rowIndex * 280 + Math.round((280 - image.h) / 2));
    }));
    return canvas;
}

// -------------------------------------------------------------- validation

export function validate(manifest, parts) {
    const failures = [], checks = [];
    const record = (name, ok, detail = '') => {
        checks.push({ name, ok, detail });
        if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    };

    for (const [key, image] of Object.entries(parts)) {
        const plan = PART_PLAN.find(entry => entry.key === key);
        const partName = plan?.part ?? key;
        const canvas = manifest.parts[partName].canvas;
        record(`${key}.canvas`, image.w === canvas.w && image.h === canvas.h,
            `${image.w}x${image.h} vs ${canvas.w}x${canvas.h}`);
        let dirty = 0, soft = 0;
        for (let index = 0; index < image.w * image.h; index++) {
            const offset = index * 4, alpha = image.rgba[offset + 3];
            if (alpha === 0 && (image.rgba[offset] || image.rgba[offset + 1] || image.rgba[offset + 2])) dirty++;
            if (alpha > 0 && alpha <= 24) soft++;
        }
        record(`${key}.transparentRgbClean`, dirty === 0, `${dirty} contaminated pixels`);
        record(`${key}.noSoftAlphaFringe`, soft === 0, `${soft} pixels with alpha<=24`);
    }

    // Every declared joint zone must be fully opaque in the part that owns it.
    let zoneCount = 0;
    for (const plan of PART_PLAN) {
        const anchors = resolvedAnchors(manifest, plan.part);
        const axis = orientationAxis(manifest, plan.part);
        for (const [jointName, zone] of Object.entries(manifest.parts[plan.part].jointZones ?? {})) {
            if (zone.coveragePart) continue;
            const bad = zonePoints(anchors[jointName], axis, zone)
                .filter(point => alphaAt(parts[plan.key], point.x, point.y) !== 255);
            record(`${plan.key}.${jointName}.opaqueZone`, bad.length === 0,
                bad.length ? `${bad.length} non-opaque points, first ${bad[0].x},${bad[0].y}` : '');
            zoneCount++;
        }
    }
    const torsoAnchors = resolvedAnchors(manifest, 'torso');
    const torsoAxis = orientationAxis(manifest, 'torso');
    for (const jointName of ['leftHip', 'rightHip']) {
        const zone = manifest.parts.torso.jointZones[jointName];
        const bad = zonePoints(torsoAnchors[jointName], torsoAxis, zone)
            .filter(point => alphaAt(parts.pelvisUnderlay, point.x, point.y) !== 255);
        record(`pelvisUnderlay.${jointName}.opaqueZone`, bad.length === 0, `${bad.length} non-opaque points`);
        zoneCount++;
    }
    const coverage = manifest.parts.torso.pelvisCoverage;
    let uncovered = 0;
    for (let y = coverage.bounds.y; y < coverage.bounds.y + coverage.bounds.h; y++) {
        for (let x = coverage.bounds.x; x < coverage.bounds.x + coverage.bounds.w; x++) {
            const cx = Math.max(coverage.bounds.x + coverage.cornerRadiusPx,
                Math.min(coverage.bounds.x + coverage.bounds.w - 1 - coverage.cornerRadiusPx, x));
            const cy = Math.max(coverage.bounds.y + coverage.cornerRadiusPx,
                Math.min(coverage.bounds.y + coverage.bounds.h - 1 - coverage.cornerRadiusPx, y));
            if ((x - cx) ** 2 + (y - cy) ** 2 <= coverage.cornerRadiusPx ** 2
                && alphaAt(parts.pelvisUnderlay, x, y) !== 255) uncovered++;
        }
    }
    record('pelvisUnderlay.coverageComplete', uncovered === 0, `${uncovered} transparent coverage pixels`);

    record('pelvisMask.transparent',
        !parts.pelvisMask.rgba.some((value, index) => index % 4 === 3 && value !== 0),
        'profile pelvisMask must stay transparent');
    record('shoulderMask.transparent',
        !parts.shoulderMask.rgba.some((value, index) => index % 4 === 3 && value !== 0),
        'profile shoulderMask must stay transparent');
    record('torso.solidSilhouette', countTransparentHoles(parts.torso) === 0,
        `${countTransparentHoles(parts.torso)} enclosed transparent pixels`);

    // Orientation: both boots keep their drawn right-facing toe, and neither is
    // a mirror of the other. Same check proves the hands stay distinct surfaces.
    for (const key of ['nearBoot', 'farBoot']) {
        const bounds = paintBounds(parts[key]);
        // A right-facing boot carries its foot mass to the right of its cuff
        // mass. Measuring bbox extent from the ankle instead would be skewed by
        // the tall rear cuff and report a correct boot as backwards.
        const split = bounds.y + Math.round(bounds.h * 0.6);
        const centroid = (from, to) => {
            let sum = 0, count = 0;
            for (let y = from; y <= to; y++) for (let x = 0; x < parts[key].w; x++) {
                if (alphaAt(parts[key], x, y)) { sum += x; count++; }
            }
            return count ? sum / count : 0;
        };
        const cuff = centroid(bounds.y, split - 1);
        const foot = centroid(split, bounds.y + bounds.h - 1);
        record(`${key}.facesRight`, foot > cuff + 4,
            `foot centroid ${foot.toFixed(1)} vs cuff centroid ${cuff.toFixed(1)}`);
    }
    const mirrored = (a, b) => {
        if (a.w !== b.w || a.h !== b.h) return false;
        for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
            if (alphaAt(a, x, y) !== alphaAt(b, a.w - 1 - x, y)) return false;
        }
        return true;
    };
    const identical = (a, b) => a.w === b.w && a.h === b.h && a.rgba.every((v, i) => v === b.rgba[i]);
    for (const [left, right] of [['nearHand', 'farHand'], ['nearForearm', 'farForearm'],
        ['nearBoot', 'farBoot']]) {
        record(`${left}/${right}.distinct`, !identical(parts[left], parts[right]), 'cells are identical');
        record(`${left}/${right}.notMirrored`, !mirrored(parts[left], parts[right]), 'cells are horizontal mirrors');
    }
    return { failures, checks, zoneCount };
}

// ------------------------------------------------------------------- driver

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const decodedPixelSha256 = image => createHash('sha256')
    .update(Buffer.from(`${image.w}x${image.h}:`)).update(Buffer.from(image.rgba)).digest('hex');

async function main() {
    // Hard lock: the identity-approved Pass-A master is read-only for this tool.
    const passA = await readFile(PASS_A_PATH);
    const passAHash = sha256(passA);
    if (passAHash !== PASS_A_SHA256) throw new Error(`Pass-A v3 changed: ${passAHash}`);

    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    const images = Object.fromEntries(await Promise.all(SOURCE_FILES.map(async name =>
        [name, decodeRgbaPng(await readFile(name === 'torso-trunks'
            ? REVISED_TORSO : path.join(SOURCE_PARTS, `${name}.png`)))])));

    const marks = deriveLandmarks(images);
    const { parts, report } = buildNormalizedParts(manifest, images, marks);
    fillJointZones(manifest, parts, report);
    buildPelvisLayers(manifest, parts, report);
    const result = validate(manifest, parts);

    await mkdir(OUT_PARTS, { recursive: true });
    const written = [];
    for (const [key, entry] of Object.entries(report)) {
        const bytes = encodeRgbaPng(parts[key]);
        await writeFile(path.join(OUT_PARTS, entry.file), bytes);
        entry.fileSha256 = sha256(bytes);
        entry.decodedPixelSha256 = decodedPixelSha256(parts[key]);
        written.push(`parts/${entry.file}`);
    }
    const proofs = {
        'profile-v2n4-neutral-assembly.png': renderProofs(manifest, parts, false),
        'profile-v2n4-articulation-proof.png': renderProofs(manifest, parts, true),
        'profile-v2n4-parts-contact-sheet.png': renderContactSheet(parts),
    };
    const proofHashes = {};
    for (const [name, image] of Object.entries(proofs)) {
        const bytes = encodeRgbaPng(image);
        await writeFile(path.join(OUT_DIR, name), bytes);
        proofHashes[name] = { fileSha256: sha256(bytes), decodedPixelSha256: decodedPixelSha256(image) };
        written.push(name);
    }

    const index = {
        version: 'profile-v2-normalized-v4',
        derivedFrom: {
            approvedParts: 'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2/parts',
            revisedTorso: 'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2/sources/profile-torso-trunks-v3-alpha.png',
        },
        manifest: 'tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json',
        view: VIEW,
        passAv3Sha256: passAHash,
        registration: 'two-point similarity (uniform scale, rotation, translation); no reflection',
        cleanupRule: 'past a concealed terminal joint anchor, clip to the disk that contains its declared overlap band; preserve the visible thigh hip source contour',
        depthOrder: manifest.views[VIEW].depthOrder,
        parts: report,
        proofs: proofHashes,
        presentationMaskExposure: measureMaskExposure(manifest, parts),
        validation: { zoneCount: result.zoneCount, checks: result.checks.length, failures: result.failures },
    };
    await writeFile(path.join(OUT_DIR, 'parts-index.json'), `${JSON.stringify(index, null, 2)}\n`);

    const sums = [...Object.entries(report).map(([, entry]) => `${entry.fileSha256}  parts/${entry.file}`),
        ...Object.entries(proofHashes).map(([name, hashes]) => `${hashes.fileSha256}  ${name}`)];
    await writeFile(path.join(OUT_DIR, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);

    for (const [key, entry] of Object.entries(report)) {
        console.log(`${key.padEnd(15)} ${entry.file.padEnd(22)} ${entry.canvas.w}x${entry.canvas.h}`
            + ` scale=${entry.registeredScale ?? '-'} trimmed=${entry.trimmedPx ?? 0}`
            + ` zoneFill=${entry.zoneFillPx ?? 0} stray=${entry.strayPx ?? 0}`);
    }
    console.log(`\nwrote ${written.length} files to ${path.relative(ROOT, OUT_DIR)}`);
    console.log(`validated ${result.zoneCount} joint zones across ${result.checks.length} checks`);
    if (result.failures.length) {
        console.error(`\n${result.failures.length} VALIDATION FAILURES:`);
        for (const failure of result.failures) console.error(`  - ${failure}`);
        process.exitCode = 1;
    } else {
        console.log('all normalization checks passed');
    }
    console.log(`Pass-A v3 unchanged: ${passAHash}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
