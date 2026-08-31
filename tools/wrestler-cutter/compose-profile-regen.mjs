#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const PASS_A = path.join(ROOT, 'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a');
const sourcePath = path.join(PASS_A, 'candidates/profile-regens/thesz-v2-profile-regen-v1-alpha.png');
const frozenPath = path.join(PASS_A, 'candidates/thesz-v2-pass-a-v3.png');
const candidatePath = path.join(PASS_A, 'candidates/thesz-v2-pass-a-v5-profile-regen-v1.png');
const comparePath = path.join(PASS_A, 'candidates/profile-regens/thesz-v2-profile-regen-v1-compare.png');

const PANEL = { x: 1664, y: 64, w: 768, h: 960 };
const TARGET = { centerX: 384, crownY: 190, height: 530 };

function alphaBounds(image, threshold = 16) {
    let minX = image.w, minY = image.h, maxX = -1, maxY = -1;
    for (let y = 0; y < image.h; y++) for (let x = 0; x < image.w; x++) {
        if (image.rgba[(y * image.w + x) * 4 + 3] <= threshold) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < minX) throw new Error('profile source is empty');
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function clearRect(image, rect) {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
        image.rgba.fill(0, (y * image.w + rect.x) * 4, (y * image.w + rect.x + rect.w) * 4);
    }
}

function samplePremultiplied(source, x, y) {
    const x0 = Math.max(0, Math.min(source.w - 1, Math.floor(x)));
    const y0 = Math.max(0, Math.min(source.h - 1, Math.floor(y)));
    const x1 = Math.min(source.w - 1, x0 + 1), y1 = Math.min(source.h - 1, y0 + 1);
    const tx = x - Math.floor(x), ty = y - Math.floor(y);
    const samples = [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)],
        [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]];
    let alpha = 0, red = 0, green = 0, blue = 0;
    for (const [sx, sy, weight] of samples) {
        const offset = (sy * source.w + sx) * 4;
        const a = source.rgba[offset + 3] / 255;
        alpha += a * weight;
        red += source.rgba[offset] * a * weight;
        green += source.rgba[offset + 1] * a * weight;
        blue += source.rgba[offset + 2] * a * weight;
    }
    if (alpha <= 0.001) return [0, 0, 0, 0];
    return [Math.round(red / alpha), Math.round(green / alpha), Math.round(blue / alpha), Math.round(alpha * 255)];
}

function placeScaled(source, sourceRect, target, targetRect) {
    for (let y = 0; y < targetRect.h; y++) for (let x = 0; x < targetRect.w; x++) {
        const sx = sourceRect.x + ((x + 0.5) * sourceRect.w / targetRect.w) - 0.5;
        const sy = sourceRect.y + ((y + 0.5) * sourceRect.h / targetRect.h) - 0.5;
        const rgba = samplePremultiplied(source, sx, sy);
        const offset = ((targetRect.y + y) * target.w + targetRect.x + x) * 4;
        target.rgba.set(rgba, offset);
    }
}

function copyPanel(source, panel, target, targetX) {
    for (let y = 0; y < panel.h; y++) {
        const sourceStart = ((panel.y + y) * source.w + panel.x) * 4;
        const targetStart = (y * target.w + targetX) * 4;
        target.rgba.set(source.rgba.subarray(sourceStart, sourceStart + panel.w * 4), targetStart);
    }
}

const source = decodeRgbaPng(await readFile(sourcePath));
const frozen = decodeRgbaPng(await readFile(frozenPath));
const candidate = { w: frozen.w, h: frozen.h, rgba: new Uint8Array(frozen.rgba) };
const bounds = alphaBounds(source);
const targetWidth = Math.round(bounds.w * TARGET.height / bounds.h);
const targetRect = {
    x: PANEL.x + Math.round(TARGET.centerX - targetWidth / 2),
    y: PANEL.y + TARGET.crownY,
    w: targetWidth,
    h: TARGET.height,
};
clearRect(candidate, PANEL);
placeScaled(source, bounds, candidate, targetRect);
await writeFile(candidatePath, encodeRgbaPng(candidate));

const compare = { w: PANEL.w * 2, h: PANEL.h, rgba: new Uint8Array(PANEL.w * 2 * PANEL.h * 4) };
copyPanel(frozen, PANEL, compare, 0);
copyPanel(candidate, PANEL, compare, PANEL.w);
await writeFile(comparePath, encodeRgbaPng(compare));

console.log(`wrote ${candidatePath}`);
console.log(`wrote ${comparePath}`);
console.log(`source bounds ${JSON.stringify(bounds)} -> panel rect ${JSON.stringify({
    x: targetRect.x - PANEL.x, y: targetRect.y - PANEL.y, w: targetRect.w, h: targetRect.h,
})}`);
