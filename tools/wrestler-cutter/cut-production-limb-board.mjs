#!/usr/bin/env node

// Cuts the six-piece production limb plate used by the asymmetric Lou rig:
//
//   far-arm | far-leg | near-upper-arm
//   near-forearm-hand | near-thigh | near-shin-boot
//
// The input must already be a straight-alpha RGBA PNG. Components are
// classified spatially, never by size, so complete far limbs and shorter
// detachable near segments cannot exchange identities accidentally.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
    throw new Error('usage: node cut-production-limb-board.mjs INPUT_RGBA.png OUTPUT_DIR');
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
if (found.length !== 6) {
    throw new Error(`expected exactly 6 limb components, found ${found.length}: ${JSON.stringify(found)}`);
}

const midpoint = image.h / 2;
const top = found.filter(rect => rect.y + rect.h / 2 < midpoint).sort((a, b) => a.x - b.x);
const bottom = found.filter(rect => rect.y + rect.h / 2 >= midpoint).sort((a, b) => a.x - b.x);
if (top.length !== 3 || bottom.length !== 3) {
    throw new Error(`expected a 3-by-2 layout, found top=${top.length} bottom=${bottom.length}`);
}

const names = [
    ['far-arm', top[0]],
    ['far-leg', top[1]],
    ['near-upper-arm', top[2]],
    ['near-forearm-hand', bottom[0]],
    ['near-thigh', bottom[1]],
    ['near-shin-boot', bottom[2]],
];

await mkdir(outputDir, { recursive: true });
const index = {};
for (const [name, bounds] of names) {
    const rect = padded(bounds);
    const output = crop(rect);
    await writeFile(path.join(outputDir, `${name}.png`), encodeRgbaPng(output));
    index[name] = { sourceBounds: bounds, exportRect: rect, width: output.w, height: output.h };
}
await writeFile(path.join(outputDir, 'parts-index.json'), `${JSON.stringify({
    version: 'lou-production-limbs-v1',
    source: inputPath,
    layout: names.map(([name]) => name),
    parts: index,
}, null, 2)}\n`);

console.log(`wrote ${names.length} production limb candidates to ${outputDir}`);
for (const [name] of names) console.log(`${name}: ${index[name].width}x${index[name].height}`);
