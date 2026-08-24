#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import {
    decodeRgbaPng,
    extractV2SheetImages,
    validatePixelCoverage,
    validateSourceManifest,
    verifyV2SourceSheetHash,
} from './validate-source-manifest.mjs';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const INDEX_FILE = 'export-index.json';

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    typeBuffer.copy(chunk, 4);
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
    return chunk;
}

// Fixed PNG encoding is part of the deterministic export contract: RGBA8,
// non-interlaced, filter 0 on every row, no ancillary chunks or timestamps.
export function encodeRgbaPng(image) {
    if (!Number.isInteger(image?.w) || image.w <= 0 || !Number.isInteger(image?.h) || image.h <= 0) {
        throw new TypeError('RGBA image requires positive integer w/h');
    }
    if (!(image.rgba instanceof Uint8Array) || image.rgba.length !== image.w * image.h * 4) {
        throw new TypeError('RGBA buffer does not match image dimensions');
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(image.w, 0);
    ihdr.writeUInt32BE(image.h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const stride = image.w * 4;
    const scanlines = Buffer.alloc((stride + 1) * image.h);
    for (let y = 0; y < image.h; y++) {
        const row = y * (stride + 1);
        scanlines[row] = 0;
        Buffer.from(image.rgba.buffer, image.rgba.byteOffset + y * stride, stride).copy(scanlines, row + 1);
    }

    return Buffer.concat([
        PNG_SIGNATURE,
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
        pngChunk('IEND'),
    ]);
}

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

function filenameFor(view, slot) {
    const safeView = view.replace(/[^a-zA-Z0-9_-]/g, '-');
    const safeSlot = slot.replace(/[^a-zA-Z0-9_-]/g, '-');
    return `${safeView}__${safeSlot}.png`;
}

function sourceRectFor(manifest, viewIndex, slotIndex, slot) {
    const grid = manifest.sourceSheet.productionGrid;
    const globalCell = viewIndex * grid.slotsPerView + slotIndex;
    const partName = slot.includes('.') ? slot.slice(0, slot.indexOf('.')) : slot;
    const exportRect = manifest.parts[partName].exportRect;
    return {
        x: grid.origin.x + (globalCell % grid.columns) * grid.cell.w + exportRect.x,
        y: grid.origin.y + Math.floor(globalCell / grid.columns) * grid.cell.h + exportRect.y,
        w: exportRect.w,
        h: exportRect.h,
    };
}

export async function exportV2Sheet({ manifestPath, sheetPath, outputDir }) {
    if (!manifestPath || !sheetPath || !outputDir) {
        throw new TypeError('manifestPath, sheetPath, and outputDir are required');
    }

    const [manifestBytes, sheetBytes] = await Promise.all([
        readFile(manifestPath),
        readFile(sheetPath),
    ]);
    let manifest;
    try {
        manifest = JSON.parse(manifestBytes.toString('utf8'));
    } catch (error) {
        throw new Error(`manifest is not valid JSON: ${error.message}`);
    }

    // Refuse all output until both the existing structural and real-pixel
    // gates pass. This also enforces v2's exact 4096x4096 RGBA source input.
    const structural = validateSourceManifest(manifest);
    if (structural.errors.length) {
        throw new Error(`manifest validation failed:\n${structural.errors.join('\n')}`);
    }
    verifyV2SourceSheetHash(manifest, sheetBytes);
    let sheetImage;
    try {
        sheetImage = decodeRgbaPng(sheetBytes);
    } catch (error) {
        throw new Error(`source-sheet decode failed: ${error.message}`);
    }
    const images = extractV2SheetImages(manifest, sheetImage);
    const pixels = validatePixelCoverage(manifest, images);
    if (pixels.errors.length) {
        throw new Error(`source-sheet pixel validation failed:\n${pixels.errors.join('\n')}`);
    }

    const grid = manifest.sourceSheet.productionGrid;
    const entries = [];
    const encodedFiles = [];
    const seenNames = new Set();
    for (const [viewIndex, view] of grid.viewOrder.entries()) {
        for (const [slotIndex, slot] of grid.slotOrder.entries()) {
            const file = filenameFor(view, slot);
            if (seenNames.has(file)) throw new Error(`export filename collision: ${file}`);
            seenNames.add(file);
            const image = images.views[view][slot];
            const png = encodeRgbaPng(image);
            encodedFiles.push({ file, png });
            entries.push({
                view,
                slot,
                file,
                width: image.w,
                height: image.h,
                sourceRect: sourceRectFor(manifest, viewIndex, slotIndex, slot),
                sha256: sha256(png),
            });
        }
    }

    const index = {
        schemaVersion: 1,
        characterId: manifest.characterId,
        rigContract: manifest.rigContract,
        extractionPolicy: 'fixed-rect-1to1-no-trim-no-resample',
        sourceManifestSha256: sha256(manifestBytes),
        sourceSheetSha256: sha256(sheetBytes),
        sourceReviewStatus: manifest.humanReview.status,
        exportCount: entries.length,
        entries,
    };
    const indexBytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`, 'utf8');

    await mkdir(outputDir, { recursive: true });
    await Promise.all(encodedFiles.map(({ file, png }) => writeFile(path.join(outputDir, file), png)));
    await writeFile(path.join(outputDir, INDEX_FILE), indexBytes);

    return { index, warnings: [...structural.warnings, ...pixels.warnings] };
}

function parseArgs(args) {
    if (args.includes('--help') || args.includes('-h')) return { help: true };
    const values = {};
    for (let i = 0; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        if (!['--manifest', '--sheet', '--output-dir'].includes(flag) || !value || value.startsWith('--')) {
            throw new Error(`invalid arguments near ${flag ?? '(end)'}`);
        }
        if (values[flag]) throw new Error(`${flag} may only be specified once`);
        values[flag] = value;
    }
    for (const flag of ['--manifest', '--sheet', '--output-dir']) {
        if (!values[flag]) throw new Error(`${flag} is required`);
    }
    return {
        manifestPath: path.resolve(values['--manifest']),
        sheetPath: path.resolve(values['--sheet']),
        outputDir: path.resolve(values['--output-dir']),
    };
}

async function main() {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`v2 export refused: ${error.message}`);
        process.exitCode = 1;
        return;
    }
    if (options.help) {
        console.log('Usage: node tools/wrestler-cutter/export-v2-sheet.mjs --manifest <v2.json> --sheet <clean-rgba.png> --output-dir <directory>');
        return;
    }
    try {
        const { index, warnings } = await exportV2Sheet(options);
        for (const warning of warnings) console.warn(`warning: ${warning}`);
        console.log(`${index.characterId}: exported ${index.exportCount} fixed 1:1 cells to ${options.outputDir}`);
    } catch (error) {
        console.error(`v2 export refused: ${error.message}`);
        process.exitCode = 1;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
