#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const BASE = path.join(ROOT, 'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2');
const PARTS = path.join(BASE, 'parts');

const names = ['head', 'torso-trunks', 'upper-arm', 'near-forearm-hand-source',
    'far-forearm-hand-source', 'thigh', 'shin', 'near-boot', 'far-boot'];
const images = Object.fromEntries(await Promise.all(names.map(async name => [
    name, decodeRgbaPng(await readFile(path.join(PARTS, `${name}.png`))),
])));

function emptyImage(w, h) {
    return { w, h, rgba: new Uint8Array(w * h * 4) };
}

function bounds(image, threshold = 16) {
    let minX = image.w, minY = image.h, maxX = -1, maxY = -1;
    for (let y = 0; y < image.h; y++) for (let x = 0; x < image.w; x++) {
        if (image.rgba[(y * image.w + x) * 4 + 3] <= threshold) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < minX) throw new Error('empty part');
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function blend(target, x, y, rgba) {
    if (x < 0 || x >= target.w || y < 0 || y >= target.h || !rgba[3]) return;
    const offset = (y * target.w + x) * 4;
    const sa = rgba[3] / 255, da = target.rgba[offset + 3] / 255;
    const outA = sa + da * (1 - sa);
    for (let channel = 0; channel < 3; channel++) {
        const value = (rgba[channel] * sa + target.rgba[offset + channel] * da * (1 - sa)) / Math.max(outA, 1e-6);
        target.rgba[offset + channel] = Math.round(value);
    }
    target.rgba[offset + 3] = Math.round(outA * 255);
}

function sample(image, x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    if (x0 < 0 || y0 < 0 || x0 >= image.w || y0 >= image.h) return [0, 0, 0, 0];
    const x1 = Math.min(image.w - 1, x0 + 1), y1 = Math.min(image.h - 1, y0 + 1);
    const tx = x - x0, ty = y - y0;
    const points = [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)],
        [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]];
    let a = 0, r = 0, g = 0, b = 0;
    for (const [sx, sy, weight] of points) {
        const offset = (sy * image.w + sx) * 4, alpha = image.rgba[offset + 3] / 255;
        a += alpha * weight;
        r += image.rgba[offset] * alpha * weight;
        g += image.rgba[offset + 1] * alpha * weight;
        b += image.rgba[offset + 2] * alpha * weight;
    }
    return a < 0.001 ? [0, 0, 0, 0]
        : [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a * 255)];
}

function drawPart(target, image, { pivot, height, angle = 0, pivotX = 0.5, pivotY = 0.08 }) {
    const rect = bounds(image);
    const scale = height / rect.h;
    const sourcePivot = { x: rect.x + rect.w * pivotX, y: rect.y + rect.h * pivotY };
    const radius = Math.ceil(Math.hypot(rect.w, rect.h) * scale);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (let y = Math.floor(pivot.y - radius); y <= Math.ceil(pivot.y + radius); y++) {
        for (let x = Math.floor(pivot.x - radius); x <= Math.ceil(pivot.x + radius); x++) {
            const dx = x + 0.5 - pivot.x, dy = y + 0.5 - pivot.y;
            const sx = sourcePivot.x + (dx * cos + dy * sin) / scale;
            const sy = sourcePivot.y + (-dx * sin + dy * cos) / scale;
            if (sx < rect.x - 1 || sx > rect.x + rect.w || sy < rect.y - 1 || sy > rect.y + rect.h) continue;
            blend(target, x, y, sample(image, sx, sy));
        }
    }
}

function fillEllipse(target, centerX, centerY, radiusX, radiusY, rgba) {
    for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y++) {
        for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x++) {
            if (((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2 <= 1) blend(target, x, y, rgba);
        }
    }
}

function endpoint(origin, length, angle) {
    return { x: origin.x - Math.sin(angle) * length, y: origin.y + Math.cos(angle) * length };
}

function renderPose(stress = false) {
    const canvas = emptyImage(768, 960);
    const far = stress ? { arm: -0.16, forearm: 0.20, thigh: -0.12, shin: 0.18 } : { arm: 0, forearm: 0, thigh: 0, shin: 0 };
    const near = stress ? { arm: 0.20, forearm: -0.16, thigh: 0.18, shin: -0.22 } : { arm: 0, forearm: 0, thigh: 0, shin: 0 };
    const farShoulder = { x: 402, y: 303 }, nearShoulder = { x: 350, y: 303 };
    const farElbow = endpoint(farShoulder, 79, far.arm), nearElbow = endpoint(nearShoulder, 79, near.arm);
    const farHip = { x: 400, y: 466 }, nearHip = { x: 367, y: 466 };
    const farKnee = endpoint(farHip, 102, far.thigh), nearKnee = endpoint(nearHip, 102, near.thigh);
    const farAnkle = endpoint(farKnee, 98, far.shin), nearAnkle = endpoint(nearKnee, 98, near.shin);

    // Far arm sits behind the body. Its forearm/hand source is separately
    // authored to expose the palm surface.
    drawPart(canvas, images['upper-arm'], { pivot: farShoulder, height: 112, angle: far.arm, pivotY: 0.13 });
    drawPart(canvas, images['far-forearm-hand-source'], { pivot: farElbow, height: 116, angle: far.forearm, pivotY: 0.05 });

    // Hidden garment-colored safety fill; never a visible floating garment.
    fillEllipse(canvas, 386, 473, 34, 28, [0, 0, 0, 255]);

    // Far leg attaches underneath the torso/trunks layer.
    drawPart(canvas, images.thigh, { pivot: farHip, height: 135, angle: far.thigh, pivotY: 0.10 });
    drawPart(canvas, images.shin, { pivot: farKnee, height: 132, angle: far.shin, pivotY: 0.08 });
    drawPart(canvas, images['far-boot'], { pivot: farAnkle, height: 76, angle: far.shin, pivotX: 0.34, pivotY: 0.05 });

    drawPart(canvas, images.head, { pivot: { x: 382, y: 276 }, height: 106, pivotX: 0.57, pivotY: 0.88 });
    drawPart(canvas, images['torso-trunks'], { pivot: { x: 382, y: 274 }, height: 224, pivotX: 0.48, pivotY: 0.03 });

    // Near leg attaches on top of the visible torso/trunks asset.
    drawPart(canvas, images.thigh, { pivot: nearHip, height: 135, angle: near.thigh, pivotY: 0.10 });
    drawPart(canvas, images.shin, { pivot: nearKnee, height: 132, angle: near.shin, pivotY: 0.08 });
    drawPart(canvas, images['near-boot'], { pivot: nearAnkle, height: 76, angle: near.shin, pivotX: 0.34, pivotY: 0.05 });

    drawPart(canvas, images['upper-arm'], { pivot: nearShoulder, height: 112, angle: near.arm, pivotY: 0.13 });
    drawPart(canvas, images['near-forearm-hand-source'], { pivot: nearElbow, height: 116, angle: near.forearm, pivotY: 0.05 });
    return canvas;
}

function renderContactSheet() {
    const canvas = emptyImage(900, 720);
    const placements = [
        ['head', 120, 65, 150], ['torso-trunks', 430, 45, 270], ['upper-arm', 700, 70, 190],
        ['near-forearm-hand-source', 125, 330, 220], ['far-forearm-hand-source', 315, 330, 220],
        ['thigh', 490, 355, 210], ['shin', 625, 355, 210], ['near-boot', 790, 485, 130],
    ];
    for (const [name, x, y, height] of placements) {
        drawPart(canvas, images[name], { pivot: { x, y }, height, pivotY: 0 });
    }
    return canvas;
}

await mkdir(BASE, { recursive: true });
await writeFile(path.join(BASE, 'profile-v2-neutral-assembly.png'), encodeRgbaPng(renderPose(false)));
await writeFile(path.join(BASE, 'profile-v2-articulation-proof.png'), encodeRgbaPng(renderPose(true)));
await writeFile(path.join(BASE, 'profile-v2-parts-contact-sheet.png'), encodeRgbaPng(renderContactSheet()));
console.log(`wrote neutral, articulation and contact-sheet proofs to ${BASE}`);
