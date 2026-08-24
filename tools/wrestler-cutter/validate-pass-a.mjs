#!/usr/bin/env node

// Pass-A gate for a canonical v2 source sheet.
//
// Pass A paints the five cohesive 530px masters and NOTHING else. That makes it
// the exact inverse of the normal v2 source check, which expects a fully
// populated production bank: here an occupied cell is a failure, because paint
// in the bank before the identity is approved means a limb was generated rather
// than masked from an approved master.
//
// This is a mechanical precheck only. It cannot judge likeness, stroke taper,
// value families, or luma separation — CHARACTER_ART_SOURCE_STANDARD.md keeps
// those as human review, and a pass here is never reported as Gate A.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    decodeRgbaPng,
    findV2TransparentRgbViolation,
    validateV2MasterPanelPixels,
} from './validate-source-manifest.mjs';

const DEFAULT_MANIFEST = fileURLToPath(
    new URL('./templates/rig-source-manifest.v2.example.json', import.meta.url));

// Alpha above this counts as painted. Deliberately low: a Pass-A sheet must be
// clean, so even faint stray paint in the bank is a real finding rather than
// an antialiasing artefact to be forgiven.
const STRAY_ALPHA_THRESHOLD = 0;

function panelRects(manifest) {
    const panels = manifest?.sourceSheet?.masterPanels ?? {};
    return (manifest?.sourceSheet?.productionGrid?.viewOrder ?? [])
        .map(view => ({ view, ...panels[view] }))
        .filter(panel => Number.isFinite(panel.x) && Number.isFinite(panel.y));
}

function insideAnyPanel(panels, x, y) {
    for (const panel of panels) {
        if (x >= panel.x && x < panel.x + panel.w && y >= panel.y && y < panel.y + panel.h) return true;
    }
    return false;
}

function cellDescriptor(manifest, index) {
    const grid = manifest.sourceSheet.productionGrid;
    return {
        index,
        view: grid.viewOrder[Math.floor(index / grid.slotsPerView)] ?? null,
        slot: grid.slotOrder[index % grid.slotsPerView] ?? null,
        x: grid.origin.x + (index % grid.columns) * grid.cell.w,
        y: grid.origin.y + Math.floor(index / grid.columns) * grid.cell.h,
        w: grid.cell.w,
        h: grid.cell.h,
    };
}

// Pass A's defining rule, stated positively: paint is legal inside the five
// master panels and nowhere else. Reporting occupied bank cells by name is what
// makes a failure actionable, so they are attributed rather than merely counted.
export function validatePassASheet(manifest, sheetImage) {
    const errors = [];
    const warnings = [];

    const canvas = manifest?.sourceSheet?.canvas ?? { w: 4096, h: 4096 };
    if (sheetImage?.w !== canvas.w || sheetImage?.h !== canvas.h) {
        return {
            errors: [`sheet is ${sheetImage?.w ?? 'unknown'}x${sheetImage?.h ?? 'unknown'}; expected exactly ${canvas.w}x${canvas.h}. A wrong-sized result is rejected, never resized into compliance.`],
            warnings,
            strayPixels: 0,
            occupiedCells: [],
        };
    }

    const panels = panelRects(manifest);
    if (panels.length !== 5) {
        errors.push(`expected 5 registered master panels; manifest declares ${panels.length}`);
    }

    const grid = manifest.sourceSheet.productionGrid;
    const totalCells = grid.columns * grid.rows;
    const cellPaint = new Map();
    let strayPixels = 0;
    let firstStray = null;

    for (let y = 0; y < sheetImage.h; y++) {
        const row = y * sheetImage.w;
        for (let x = 0; x < sheetImage.w; x++) {
            if (sheetImage.alpha[row + x] <= STRAY_ALPHA_THRESHOLD) continue;
            if (insideAnyPanel(panels, x, y)) continue;
            strayPixels++;
            if (!firstStray) firstStray = { x, y };
            const col = Math.floor((x - grid.origin.x) / grid.cell.w);
            const gridRow = Math.floor((y - grid.origin.y) / grid.cell.h);
            if (x < grid.origin.x || y < grid.origin.y || col < 0 || col >= grid.columns
                || gridRow < 0 || gridRow >= grid.rows) continue;
            const index = gridRow * grid.columns + col;
            if (index >= totalCells) continue;
            cellPaint.set(index, (cellPaint.get(index) ?? 0) + 1);
        }
    }

    const occupiedCells = [...cellPaint.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([index, painted]) => {
            const cell = cellDescriptor(manifest, index);
            return { index, view: cell.view, slot: cell.slot, painted };
        });

    if (occupiedCells.length) {
        const named = occupiedCells.slice(0, 8)
            .map(cell => `${String(cell.index).padStart(2, '0')} ${cell.view ?? 'reserved'}/${cell.slot ?? 'reserved'} (${cell.painted}px)`)
            .join(', ');
        const more = occupiedCells.length > 8 ? `, +${occupiedCells.length - 8} more` : '';
        errors.push(`${occupiedCells.length} production-bank cell${occupiedCells.length === 1 ? '' : 's'} contain paint; Pass A must leave every cell empty: ${named}${more}`);
    }

    const strayOutsideBank = strayPixels - occupiedCells.reduce((sum, cell) => sum + cell.painted, 0);
    if (strayOutsideBank > 0) {
        errors.push(`${strayOutsideBank} painted pixel${strayOutsideBank === 1 ? '' : 's'} lie outside both the master panels and the production bank (first at ${firstStray.x},${firstStray.y}); Pass A paints only inside the five master panels`);
    }

    // Figures present, inside their own panel, and exactly crown-to-sole tall.
    errors.push(...validateV2MasterPanelPixels(manifest, sheetImage).errors);

    const violation = findV2TransparentRgbViolation(sheetImage);
    if (violation) {
        errors.push(`transparent pixel at ${violation.x},${violation.y} carries RGB ${violation.rgb.join(',')}; straight-alpha source requires RGB 0,0,0 where alpha is 0`);
    }

    warnings.push('mechanical precheck only: likeness, clean-shaven grooming, stroke taper, value families, and luma separation remain human review and are not measured here');

    return { errors, warnings, strayPixels, occupiedCells };
}

async function main() {
    const args = process.argv.slice(2);
    const sheetFlag = args.indexOf('--sheet');
    const manifestFlag = args.indexOf('--manifest');
    const sheetPath = sheetFlag >= 0 ? args[sheetFlag + 1] : args.find(arg => !arg.startsWith('--'));
    const manifestPath = manifestFlag >= 0 ? args[manifestFlag + 1] : DEFAULT_MANIFEST;

    if (!sheetPath) {
        console.error('usage: art:validate-pass-a -- --sheet <pass-a-sheet.png> [--manifest <manifest.json>]');
        process.exit(2);
    }

    let manifest;
    try {
        manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
        console.error(`error: manifest could not be read: ${error.message}`);
        process.exit(1);
    }

    let sheetImage;
    try {
        sheetImage = decodeRgbaPng(await readFile(sheetPath));
    } catch (error) {
        console.error(`error: sheet could not be decoded: ${error.message}`);
        process.exit(1);
    }

    const result = validatePassASheet(manifest, sheetImage);
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    for (const error of result.errors) console.error(`error: ${error}`);

    if (result.errors.length) {
        console.error(`Pass A invalid (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`);
        process.exit(1);
    }

    console.log(`${manifest.characterId}: Pass A valid — 5 masters at ${manifest.sourceSheet.masterFigureHeightPx}px, all ${manifest.sourceSheet.productionGrid.columns * manifest.sourceSheet.productionGrid.rows} production cells empty`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
