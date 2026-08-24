import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validatePassASheet } from '../tools/wrestler-cutter/validate-pass-a.mjs';

const manifestPath = fileURLToPath(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json', import.meta.url));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const CANVAS = manifest.sourceSheet.canvas;

function blankSheet(w = CANVAS.w, h = CANVAS.h) {
    return { w, h, alpha: new Uint8Array(w * h), rgba: new Uint8Array(w * h * 4) };
}

function paint(sheet, x, y, alpha = 255) {
    const index = y * sheet.w + x;
    sheet.alpha[index] = alpha;
    sheet.rgba[index * 4 + 3] = alpha;
}

// Paints a figure whose alpha extent runs exactly crown..sole for the view, as
// one connected blob, so the master-panel check is satisfied and the Pass-A
// specific rules are what the assertions isolate.
function paintFigure(sheet, view) {
    const panel = manifest.sourceSheet.masterPanels[view];
    const marks = manifest.views[view].masterLandmarks;
    const crownY = marks.crown.y;
    const soleY = Math.max(marks.leftSole.y, marks.rightSole.y);
    const centerX = panel.x + Math.round(panel.w / 2);
    for (let y = crownY; y <= soleY; y++) {
        for (let dx = -12; dx <= 12; dx++) paint(sheet, centerX + dx, panel.y + y);
    }
}

function validSheet() {
    const sheet = blankSheet();
    for (const view of manifest.sourceSheet.productionGrid.viewOrder) paintFigure(sheet, view);
    return sheet;
}

test('a five-master sheet with an empty production bank passes Pass A', () => {
    const result = validatePassASheet(manifest, validSheet());
    assert.deepEqual(result.errors, []);
    assert.equal(result.strayPixels, 0);
    assert.deepEqual(result.occupiedCells, []);
});

test('Pass A still reports that likeness and ink remain human review', () => {
    const result = validatePassASheet(manifest, validSheet());
    assert.ok(result.warnings.some(w => /human review/.test(w)),
        'a mechanically clean Pass A must not be mistaken for completed Gate A');
});

test('a wrong-sized sheet is rejected outright rather than resized', () => {
    const result = validatePassASheet(manifest, blankSheet(2048, 2048));
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /2048x2048; expected exactly 4096x4096/);
    assert.match(result.errors[0], /never resized into compliance/);
});

test('paint in a production-bank cell fails and the cell is named', () => {
    const sheet = validSheet();
    const grid = manifest.sourceSheet.productionGrid;
    // Global cell 38 is profile/torso — the first gameplay-target cell.
    const col = 38 % grid.columns;
    const row = Math.floor(38 / grid.columns);
    const x = grid.origin.x + col * grid.cell.w + 100;
    const y = grid.origin.y + row * grid.cell.h + 100;
    paint(sheet, x, y);

    const result = validatePassASheet(manifest, sheet);
    const banked = result.errors.find(e => /production-bank cell/.test(e));
    assert.ok(banked, 'paint inside the bank must fail Pass A');
    assert.match(banked, /38 profile\/torso/);
    assert.equal(result.occupiedCells.length, 1);
    assert.equal(result.occupiedCells[0].index, 38);
});

test('a single stray pixel outside every panel and cell is still caught', () => {
    const sheet = validSheet();
    // The gutter above the bank and below the panels belongs to neither.
    paint(sheet, 2048, 1200);
    const result = validatePassASheet(manifest, sheet);
    const stray = result.errors.find(e => /outside both the master panels/.test(e));
    assert.ok(stray, 'Pass A paints only inside the five master panels');
    assert.match(stray, /first at 2048,1200/);
});

test('an empty master panel fails', () => {
    const sheet = blankSheet();
    for (const view of manifest.sourceSheet.productionGrid.viewOrder) {
        if (view !== 'back') paintFigure(sheet, view);
    }
    const result = validatePassASheet(manifest, sheet);
    assert.ok(result.errors.some(e => /masterPanels\.back.*empty/.test(e)),
        'a missing view must fail rather than silently fall back');
});

test('a figure that is not exactly 530px crown-to-sole fails', () => {
    const sheet = blankSheet();
    for (const view of manifest.sourceSheet.productionGrid.viewOrder) paintFigure(sheet, view);
    // Extend the profile figure one row past its declared sole.
    const panel = manifest.sourceSheet.masterPanels.profile;
    const marks = manifest.views.profile.masterLandmarks;
    const soleY = Math.max(marks.leftSole.y, marks.rightSole.y);
    const centerX = panel.x + Math.round(panel.w / 2);
    for (let dx = -12; dx <= 12; dx++) paint(sheet, centerX + dx, panel.y + soleY + 1);

    const result = validatePassASheet(manifest, sheet);
    assert.ok(result.errors.some(e => /masterPanels\.profile.*alpha extent/.test(e)),
        `530px is the whole point of the master; got ${JSON.stringify(result.errors)}`);
});

test('a transparent pixel carrying colour fails the straight-alpha rule', () => {
    const sheet = validSheet();
    sheet.rgba[(1200 * sheet.w + 2048) * 4] = 255; // red, alpha still 0
    const result = validatePassASheet(manifest, sheet);
    assert.ok(result.errors.some(e => /carries RGB 255,0,0/.test(e)));
});

test('the shipped blank-clean template is not mistaken for a finished Pass A', () => {
    const result = validatePassASheet(manifest, blankSheet());
    assert.ok(result.errors.length >= 5,
        'an entirely empty sheet must fail every master panel, not pass for lack of stray paint');
    assert.equal(result.occupiedCells.length, 0);
});
