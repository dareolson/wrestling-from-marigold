#!/usr/bin/env node

// Cuts a 4x3 front3q modular source plate into twelve independently authored
// candidates. The input must already be a straight-alpha RGBA PNG.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
    throw new Error('usage: node cut-front3q-modular-board.mjs INPUT_RGBA.png OUTPUT_DIR');
}

const inputPath = path.resolve(inputArg);
const outputDir = path.resolve(outputArg);
const image = decodeRgbaPng(await readFile(inputPath));

function components(source, threshold = 16, minimumPixels = 500) {
    const occupied = new Uint8Array(source.w * source.h);
    const seen = new Uint8Array(occupied.length);
    const queue = new Int32Array(occupied.length);
    const result = [];
    for (let i = 0; i < occupied.length; i++) {
        occupied[i] = source.rgba[i * 4 + 3] > threshold ? 1 : 0;
    }
    for (let start = 0; start < occupied.length; start++) {
        if (!occupied[start] || seen[start]) continue;
        let head = 0, tail = 0, pixels = 0;
        let minX = source.w, minY = source.h, maxX = -1, maxY = -1;
        queue[tail++] = start;
        seen[start] = 1;
        while (head < tail) {
            const index = queue[head++];
            const x = index % source.w;
            const y = Math.floor(index / source.w);
            pixels++;
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            const neighbors = [index - 1, index + 1, index - source.w, index + source.w];
            for (let n = 0; n < neighbors.length; n++) {
                const next = neighbors[n];
                if (next < 0 || next >= occupied.length || seen[next] || !occupied[next]) continue;
                if ((n === 0 && x === 0) || (n === 1 && x === source.w - 1)) continue;
                seen[next] = 1;
                queue[tail++] = next;
            }
        }
        if (pixels >= minimumPixels) {
            result.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, pixels });
        }
    }
    return result;
}

function padded(rect, padding = 12) {
    const x = Math.max(0, rect.x - padding);
    const y = Math.max(0, rect.y - padding);
    const right = Math.min(image.w, rect.x + rect.w + padding);
    const bottom = Math.min(image.h, rect.y + rect.h + padding);
    return { x, y, w: right - x, h: bottom - y };
}

function crop(rect) {
    const output = { w: rect.w, h: rect.h, rgba: new Uint8Array(rect.w * rect.h * 4) };
    for (let y = 0; y < rect.h; y++) {
        const sourceStart = ((rect.y + y) * image.w + rect.x) * 4;
        output.rgba.set(image.rgba.subarray(sourceStart, sourceStart + rect.w * 4), y * rect.w * 4);
    }
    return output;
}

const found = components(image);
if (found.length !== 12) {
    throw new Error(`expected exactly 12 components, found ${found.length}: ${JSON.stringify(found)}`);
}

const rows = [0, 1, 2].map(row => found
    .filter(rect => {
        const cy = rect.y + rect.h / 2;
        return cy >= row * image.h / 3 && cy < (row + 1) * image.h / 3;
    })
    .sort((a, b) => a.x - b.x));
if (rows.some(row => row.length !== 4)) {
    throw new Error(`expected four components per row, found ${rows.map(row => row.length).join('/')}`);
}

const layout = [
    ['head', rows[0][0]],
    ['torso', rows[0][1]],
    ['pelvis_overlay', rows[0][2]],
    ['pelvis_underlay', rows[0][3]],
    ['near_upper_arm', rows[1][0]],
    ['far_upper_arm', rows[1][1]],
    ['near_forearm', rows[1][2]],
    ['far_forearm', rows[1][3]],
    ['near_thigh', rows[2][0]],
    ['far_thigh', rows[2][1]],
    ['near_shin', rows[2][2]],
    ['far_shin', rows[2][3]],
];

await mkdir(outputDir, { recursive: true });
const parts = {};
for (const [name, bounds] of layout) {
    const exportRect = padded(bounds);
    const output = crop(exportRect);
    await writeFile(path.join(outputDir, `${name}.png`), encodeRgbaPng(output));
    parts[name] = { sourceBounds: bounds, exportRect, width: output.w, height: output.h };
}
await writeFile(path.join(outputDir, 'parts-index.json'), `${JSON.stringify({
    version: 'lou-front3q-modular-v1',
    source: inputPath,
    layout: layout.map(([name]) => name),
    parts,
}, null, 2)}\n`);

console.log(`wrote ${layout.length} front3q modular candidates to ${outputDir}`);
for (const [name] of layout) console.log(`${name}: ${parts[name].width}x${parts[name].height}`);
