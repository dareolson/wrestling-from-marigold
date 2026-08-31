#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const BASE = path.join(ROOT, 'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2');
const BOARD_PATH = path.join(BASE, 'sources/profile-parts-board-v2-alpha.png');
const TORSO_PATH = path.join(BASE, 'sources/profile-torso-trunks-v2-alpha.png');
const OUT_DIR = path.join(BASE, 'parts');

function alphaBounds(image, threshold = 16) {
    let minX = image.w, minY = image.h, maxX = -1, maxY = -1, pixels = 0;
    for (let y = 0; y < image.h; y++) for (let x = 0; x < image.w; x++) {
        if (image.rgba[(y * image.w + x) * 4 + 3] <= threshold) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); pixels++;
    }
    if (maxX < minX) throw new Error('image is empty');
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, pixels };
}

function components(image, threshold = 16) {
    const occupied = new Uint8Array(image.w * image.h);
    const seen = new Uint8Array(occupied.length);
    for (let i = 0; i < occupied.length; i++) occupied[i] = image.rgba[i * 4 + 3] > threshold ? 1 : 0;
    const result = [];
    const queue = new Int32Array(occupied.length);
    for (let start = 0; start < occupied.length; start++) {
        if (!occupied[start] || seen[start]) continue;
        let head = 0, tail = 0;
        queue[tail++] = start; seen[start] = 1;
        let minX = image.w, minY = image.h, maxX = -1, maxY = -1, pixels = 0;
        while (head < tail) {
            const index = queue[head++], x = index % image.w, y = Math.floor(index / image.w);
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); pixels++;
            const neighbors = [index - 1, index + 1, index - image.w, index + image.w];
            for (let n = 0; n < neighbors.length; n++) {
                const next = neighbors[n];
                if (next < 0 || next >= occupied.length || seen[next] || !occupied[next]) continue;
                if (n === 0 && x === 0 || n === 1 && x === image.w - 1) continue;
                seen[next] = 1; queue[tail++] = next;
            }
        }
        if (pixels >= 500) result.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, pixels });
    }
    return result.sort((a, b) => a.y - b.y || a.x - b.x);
}

function padded(rect, image, padding = 16) {
    const x = Math.max(0, rect.x - padding), y = Math.max(0, rect.y - padding);
    const right = Math.min(image.w, rect.x + rect.w + padding);
    const bottom = Math.min(image.h, rect.y + rect.h + padding);
    return { x, y, w: right - x, h: bottom - y };
}

function crop(image, rect) {
    const output = { w: rect.w, h: rect.h, rgba: new Uint8Array(rect.w * rect.h * 4) };
    for (let y = 0; y < rect.h; y++) {
        const sourceStart = ((rect.y + y) * image.w + rect.x) * 4;
        output.rgba.set(image.rgba.subarray(sourceStart, sourceStart + rect.w * 4), y * rect.w * 4);
    }
    return output;
}

function withoutAttachedThigh(image) {
    const output = { w: image.w, h: image.h, rgba: new Uint8Array(image.rgba) };
    const bounds = alphaBounds(output);
    const cutoff = bounds.y + Math.round(bounds.h * 0.68);
    for (let y = cutoff; y < bounds.y + bounds.h; y++) for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
        const offset = (y * output.w + x) * 4;
        const r = output.rgba[offset], g = output.rgba[offset + 1], b = output.rgba[offset + 2];
        const skinLike = r > 110 && r > b + 15 && g > 60;
        if (!skinLike) continue;
        output.rgba.fill(0, offset, offset + 4);
    }
    return output;
}

async function writeCrop(name, image, rect, padding = 16) {
    const finalRect = padded(rect, image, padding);
    await writeFile(path.join(OUT_DIR, `${name}.png`), encodeRgbaPng(crop(image, finalRect)));
    return finalRect;
}

await mkdir(OUT_DIR, { recursive: true });
const board = decodeRgbaPng(await readFile(BOARD_PATH));
const torso = withoutAttachedThigh(decodeRgbaPng(await readFile(TORSO_PATH)));
const found = components(board);
if (found.length !== 9) throw new Error(`expected 9 large board components, found ${found.length}: ${JSON.stringify(found)}`);

// The board is deliberately spatially ordered: five components across the top,
// then thigh, shin and two same-facing boots across the bottom. Classify by
// position rather than top edge because the tall torso begins above the head.
const top = found.filter(rect => rect.y < 550).sort((a, b) => a.x - b.x);
const bottom = found.filter(rect => rect.y > 500).sort((a, b) => a.x - b.x);
if (top.length !== 5 || bottom.length !== 4) {
    throw new Error(`unexpected component layout: top=${top.length}, bottom=${bottom.length}`);
}
const [head, rejectedTorso, upperArmSource, nearForearmHand, farForearmHand] = top;
const [thigh, shin, nearBoot, farBoot] = bottom;
void rejectedTorso;

const outputs = {};
outputs.head = await writeCrop('head', board, head);
outputs.torsoTrunks = await writeCrop('torso-trunks', torso, alphaBounds(torso));
outputs.upperArmSource = await writeCrop('upper-arm-source', board, upperArmSource);
outputs.upperArm = await writeCrop('upper-arm', board, {
    ...upperArmSource,
    h: Math.round(upperArmSource.h * 0.55),
});

for (const [side, rect] of [['near', nearForearmHand], ['far', farForearmHand]]) {
    outputs[`${side}ForearmHand`] = await writeCrop(`${side}-forearm-hand-source`, board, rect);
    outputs[`${side}Forearm`] = await writeCrop(`${side}-forearm`, board, {
        ...rect,
        h: Math.round(rect.h * 0.78),
    });
    const handStart = rect.y + Math.round(rect.h * 0.64);
    outputs[`${side}Hand`] = await writeCrop(`${side}-hand`, board, {
        x: rect.x,
        y: handStart,
        w: rect.w,
        h: rect.y + rect.h - handStart,
    });
}

outputs.thigh = await writeCrop('thigh', board, thigh);
outputs.shin = await writeCrop('shin', board, shin);
outputs.nearBoot = await writeCrop('near-boot', board, nearBoot);
outputs.farBoot = await writeCrop('far-boot', board, farBoot);

await writeFile(path.join(BASE, 'parts-index.json'), `${JSON.stringify({
    version: 'profile-v2-source-parts',
    board: path.relative(ROOT, BOARD_PATH),
    torsoSource: path.relative(ROOT, TORSO_PATH),
    components: found,
    outputs,
    notes: {
        torso: 'visible black trunks are permanently attached',
        depth: ['pelvisUnderlay', 'farLeg', 'torsoTrunks', 'nearLeg', 'arms'],
        bilateral: 'upper arm, thigh, shin and boot reuse without horizontal mirroring',
        forearms: 'near/outward-back-of-hand and far/inward-palm are separate authored sources',
    },
}, null, 2)}\n`);

console.log(`wrote profile v2 source parts to ${OUT_DIR}`);
console.log(JSON.stringify(found));
