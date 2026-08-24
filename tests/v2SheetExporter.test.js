import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from '../tools/wrestler-cutter/validate-source-manifest.mjs';
import { encodeRgbaPng, exportV2Sheet } from '../tools/wrestler-cutter/export-v2-sheet.mjs';

const manifestUrl = new URL('../tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json', import.meta.url);
const cliPath = fileURLToPath(new URL('../tools/wrestler-cutter/export-v2-sheet.mjs', import.meta.url));
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

function slotPart(slot) {
    return slot.includes('.') ? slot.slice(0, slot.indexOf('.')) : slot;
}

function paintRect(rgba, sheetWidth, rect, color) {
    for (let y = 0; y < rect.h; y++) {
        for (let x = 0; x < rect.w; x++) {
            const offset = ((rect.y + y) * sheetWidth + rect.x + x) * 4;
            rgba[offset] = (color[0] + x) & 255;
            rgba[offset + 1] = (color[1] + y) & 255;
            rgba[offset + 2] = color[2];
            rgba[offset + 3] = 255;
        }
    }
}

function makeValidSheet() {
    const w = 4096, h = 4096;
    const rgba = new Uint8Array(w * h * 4);
    const grid = manifest.sourceSheet.productionGrid;
    for (const [viewIndex, view] of grid.viewOrder.entries()) {
        const panel = manifest.sourceSheet.masterPanels[view];
        const landmarks = manifest.views[view].masterLandmarks;
        const soleY = Math.max(landmarks.leftSole.y, landmarks.rightSole.y);
        paintRect(rgba, w, {
            x: panel.x + 300,
            y: panel.y + landmarks.crown.y,
            w: 40,
            h: soleY - landmarks.crown.y + 1,
        }, [20 + viewIndex, 30, 40]);
        for (const [slotIndex, slot] of grid.slotOrder.entries()) {
            const globalCell = viewIndex * grid.slotsPerView + slotIndex;
            const part = manifest.parts[slotPart(slot)];
            const rect = {
                x: grid.origin.x + (globalCell % grid.columns) * grid.cell.w + part.exportRect.x,
                y: grid.origin.y + Math.floor(globalCell / grid.columns) * grid.cell.h + part.exportRect.y,
                w: part.exportRect.w,
                h: part.exportRect.h,
            };
            // shoulderMask is contractually reserved transparent; it has no
            // required joint pixels. Every other crop is opaque and therefore
            // passes present and future overlap/sweep checks.
            if (slot !== 'shoulderMask') {
                paintRect(rgba, w, rect, [viewIndex * 31, slotIndex * 11, 77]);
            }
        }
    }
    return { w, h, rgba };
}

test('v2 exporter writes 95 exact deterministic crops and a checksum index', async () => {
    const temp = await mkdtemp(path.join(tmpdir(), 'marigold-v2-export-'));
    try {
        const manifestPath = path.join(temp, 'manifest.json');
        const sheetPath = path.join(temp, 'clean.png');
        const outputDir = path.join(temp, 'exports');
        await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
        await writeFile(sheetPath, encodeRgbaPng(makeValidSheet()));

        const firstRun = await exportV2Sheet({ manifestPath, sheetPath, outputDir });
        assert.equal(firstRun.index.exportCount, 95);
        assert.equal(firstRun.index.sourceReviewStatus, 'pending');
        assert.equal(firstRun.index.sourceManifestSha256, sha256(await readFile(manifestPath)));
        assert.equal(firstRun.index.sourceSheetSha256, sha256(await readFile(sheetPath)));
        assert.equal(firstRun.index.entries[0].file, 'front__torso.png');
        assert.equal(firstRun.index.entries[94].file, 'back__boot-toePoint.png');
        assert.equal(new Set(firstRun.index.entries.map(entry => entry.file)).size, 95);

        const names = (await readdir(outputDir)).sort();
        assert.equal(names.length, 96);
        assert.ok(names.includes('export-index.json'));
        assert.ok(names.includes('profile__hand-grip.png'));

        const firstEntry = firstRun.index.entries[0];
        const firstBytes = await readFile(path.join(outputDir, firstEntry.file));
        const firstImage = decodeRgbaPng(firstBytes);
        assert.deepEqual({ w: firstImage.w, h: firstImage.h }, { w: 190, h: 260 });
        assert.deepEqual([...firstImage.rgba.subarray(0, 4)], [0, 0, 77, 255]);
        assert.deepEqual([...firstImage.rgba.subarray(4, 8)], [1, 0, 77, 255]);
        assert.equal(sha256(firstBytes), firstEntry.sha256);
        assert.deepEqual(firstEntry.sourceRect, { x: 193, y: 1310, w: 190, h: 260 });

        const before = new Map();
        for (const name of names) before.set(name, await readFile(path.join(outputDir, name)));
        const secondRun = await exportV2Sheet({ manifestPath, sheetPath, outputDir });
        assert.deepEqual(secondRun.index, firstRun.index);
        for (const name of names) {
            assert.deepEqual(await readFile(path.join(outputDir, name)), before.get(name), `${name} changed on rerun`);
        }
    } finally {
        await rm(temp, { recursive: true, force: true });
    }
});

test('CLI refuses a wrong-sized source before creating its output directory', async () => {
    const temp = await mkdtemp(path.join(tmpdir(), 'marigold-v2-refusal-'));
    try {
        const manifestPath = path.join(temp, 'manifest.json');
        const sheetPath = path.join(temp, 'wrong.png');
        const outputDir = path.join(temp, 'must-not-exist');
        await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
        await writeFile(sheetPath, encodeRgbaPng({ w: 1, h: 1, rgba: new Uint8Array(4) }));
        const result = spawnSync(process.execPath, [
            cliPath,
            '--manifest', manifestPath,
            '--sheet', sheetPath,
            '--output-dir', outputDir,
        ], { encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /expected exactly 4096x4096/);
        await assert.rejects(readdir(outputDir), { code: 'ENOENT' });
    } finally {
        await rm(temp, { recursive: true, force: true });
    }
});

test('exporter binds an approved review to the exact source-sheet bytes before writing', async () => {
    const temp = await mkdtemp(path.join(tmpdir(), 'marigold-v2-reviewed-export-'));
    try {
        const reviewed = structuredClone(manifest);
        reviewed.humanReview = {
            status: 'approved',
            sourceSheetSha256: '0'.repeat(64),
            extremeJointAngles: true,
            artistStrokeAtGameScale: true,
            broadcastNearMiddleFar: true,
        };
        const manifestPath = path.join(temp, 'manifest.json');
        const sheetPath = path.join(temp, 'changed-after-review.png');
        const outputDir = path.join(temp, 'must-not-exist');
        await writeFile(manifestPath, `${JSON.stringify(reviewed)}\n`);
        await writeFile(sheetPath, Buffer.from('not the reviewed sheet'));

        await assert.rejects(
            exportV2Sheet({ manifestPath, sheetPath, outputDir }),
            /does not match approved humanReview\.sourceSheetSha256/,
        );
        await assert.rejects(readdir(outputDir), { code: 'ENOENT' });
    } finally {
        await rm(temp, { recursive: true, force: true });
    }
});
