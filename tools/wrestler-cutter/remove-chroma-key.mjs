#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

import { encodeRgbaPng } from './export-v2-sheet.mjs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
    throw new Error('usage: node remove-chroma-key.mjs INPUT.png OUTPUT.png');
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

function decodeRgbOrRgbaPng(buffer) {
    if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('not a PNG');
    let offset = 8, width, height, bitDepth, colorType, interlace;
    const idat = [];
    while (offset + 12 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
            interlace = data[12];
        } else if (type === 'IDAT') idat.push(data);
        else if (type === 'IEND') break;
    }
    if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) {
        throw new Error('expected non-interlaced 8-bit RGB or RGBA PNG');
    }
    const channels = colorType === 6 ? 4 : 3;
    const stride = width * channels;
    const packed = inflateSync(Buffer.concat(idat));
    const pixels = Buffer.alloc(stride * height);
    let source = 0;
    for (let y = 0; y < height; y++) {
        const filter = packed[source++];
        for (let x = 0; x < stride; x++) {
            const raw = packed[source++];
            const left = x >= channels ? pixels[y * stride + x - channels] : 0;
            const up = y ? pixels[(y - 1) * stride + x] : 0;
            const upperLeft = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
            const value = filter === 0 ? raw
                : filter === 1 ? raw + left
                    : filter === 2 ? raw + up
                        : filter === 3 ? raw + Math.floor((left + up) / 2)
                            : filter === 4 ? raw + paeth(left, up, upperLeft) : NaN;
            if (!Number.isFinite(value)) throw new Error(`unsupported PNG filter ${filter}`);
            pixels[y * stride + x] = value & 255;
        }
    }
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        rgba[i * 4] = pixels[i * channels];
        rgba[i * 4 + 1] = pixels[i * channels + 1];
        rgba[i * 4 + 2] = pixels[i * channels + 2];
        rgba[i * 4 + 3] = channels === 4 ? pixels[i * channels + 3] : 255;
    }
    return { w: width, h: height, rgba };
}

const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
const smoothstep = value => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
};

function median(values) {
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
}

function cornerKey(image) {
    const channels = [[], [], []];
    const patch = Math.min(12, image.w, image.h);
    const origins = [[0, 0], [image.w - patch, 0], [0, image.h - patch], [image.w - patch, image.h - patch]];
    for (const [originX, originY] of origins) {
        for (let y = 0; y < patch; y++) for (let x = 0; x < patch; x++) {
            const offset = ((originY + y) * image.w + originX + x) * 4;
            for (let channel = 0; channel < 3; channel++) channels[channel].push(image.rgba[offset + channel]);
        }
    }
    return channels.map(median);
}

function removeGreen(image) {
    const key = cornerKey(image);
    const keyStrength = Math.max(...key);
    let transparent = 0, partial = 0;
    for (let offset = 0; offset < image.rgba.length; offset += 4) {
        let r = image.rgba[offset], g = image.rgba[offset + 1], b = image.rgba[offset + 2];
        const sourceAlpha = image.rgba[offset + 3];
        const distance = Math.max(Math.abs(r - key[0]), Math.abs(g - key[1]), Math.abs(b - key[2]));
        const dominance = g - Math.max(r, b);
        const keyLike = distance <= 32 || dominance >= 16;
        let alpha = 255;
        if (keyLike) {
            const distanceAlpha = distance <= 12 ? 0
                : distance >= 96 ? 255
                    : 255 * smoothstep((distance - 12) / 84);
            const dominanceAlpha = dominance <= 0 ? 255
                : 255 * (1 - Math.min(1, dominance / Math.max(1, keyStrength - Math.max(r, b))));
            alpha = Math.min(distanceAlpha, dominanceAlpha);
        }
        alpha = clamp(alpha * sourceAlpha / 255);
        if (alpha <= 8) alpha = 0;
        if (alpha === 0) {
            r = 0; g = 0; b = 0; transparent++;
        } else if (alpha < 252 && keyLike) {
            g = Math.min(g, Math.max(r, b) - 1);
            partial++;
        }
        image.rgba[offset] = r;
        image.rgba[offset + 1] = Math.max(0, g);
        image.rgba[offset + 2] = b;
        image.rgba[offset + 3] = alpha;
    }
    return { transparent, partial, key };
}

const image = decodeRgbOrRgbaPng(await readFile(inputPath));
const counts = removeGreen(image);
await writeFile(outputPath, encodeRgbaPng(image));
console.log(`wrote ${outputPath}`);
console.log(`sampled key: #${counts.key.map(value => value.toString(16).padStart(2, '0')).join('')}`);
console.log(`transparent pixels: ${counts.transparent}/${image.w * image.h}`);
console.log(`partially transparent pixels: ${counts.partial}/${image.w * image.h}`);
