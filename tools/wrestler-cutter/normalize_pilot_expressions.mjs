// Normalizes the George AI pilot's expression head art onto the same 262x320
// canvas and headAnchorFrac as the approved idle head
// (src/assets/wrestlers/george-ai-pilot/head.png, anchor from
// rig-profile-pilot.json's parts.head.neck) before any runtime wiring reads
// them. The five expression sources (Sprite sheets/AI Pilot/George/
// expressions/transparent/*.png -- gitignored, independent generations, not
// crops of the same body master) ship at a different raw canvas (1536x1024
// landscape vs. the idle head's 262x320) with no measured neck anchor of
// their own, so they cannot be wired as drop-in alternates until put on
// equal footing.
//
// Method: a first attempt reused this repo's limb-anchor convention
// (elbow_anchor_sweep.mjs's findDistalAnchor -- bottom-most opaque row's
// alpha-weighted x-centroid = the joint). That heuristic is WRONG here:
// checked against the idle head's own documented anchor, it lands 25.58px
// off (the idle head has ~25px of authored neck-stub art *below* the true
// anchor row -- consistent with this rig's overlap convention, but it means
// "bottom row" and "the joint" are different rows for a head, unlike a limb
// that's meant to fade out right at the joint). Falling back instead to a
// bounding-box-relative fraction: measure the idle head's own ink bbox, and
// find what fraction of that bbox's width/height its documented anchor
// falls at. That fraction is a geometric proxy (same silhouette style/crop
// convention assumed across all six expressions), not an independent
// per-image measurement -- see the PASS/FAIL block at the end, which is
// therefore a construction check (did the placement land where computed),
// not an anatomical verification. Treat these anchors as provisional until
// Derek visually confirms them in-engine; that gate is documented in
// AI_HANDOFF.md, not enforced by this script.
//
//   node tools/wrestler-cutter/normalize_pilot_expressions.mjs
//
// Writes src/assets/wrestlers/george-ai-pilot/head_<name>.png (smug, angry,
// hurt, exhausted, shocked), each 262x320, scaled uniformly off the ratio of
// ink-bbox heights (no distortion) so relative head size is preserved.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const OUT_DIR = path.join(REPO, 'src/assets/wrestlers/george-ai-pilot');
const IDLE_HEAD = path.join(OUT_DIR, 'head.png');
const EXPR_DIR = path.join(REPO, 'Sprite sheets/AI Pilot/George/expressions/transparent');
const CANVAS_W = 262, CANVAS_H = 320;
const IDLE_ANCHOR = { u: 0.4122137404580153, v: 0.84375 }; // rig-profile-pilot.json parts.head.neck
const ALPHA_THRESHOLD = 32;
const MAX_ACCEPTABLE_ERR = 0.5; // construction check, not an anatomical one -- see header

const EXPRESSIONS = [
    { name: 'smug',      file: 'george-smug-v1.png' },
    { name: 'angry',     file: 'george-angry-v1.png' },
    { name: 'hurt',      file: 'george-hurt-v1.png' },
    { name: 'exhausted', file: 'george-exhausted-v1.png' },
    { name: 'shocked',   file: 'george-shocked-v1.png' },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

async function measure(filePath) {
    const dataUrl = 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
    return page.evaluate(async ({ url, alphaThreshold }) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
        let minX = width, minY = height, maxX = -1, maxY = -1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[(y * width + x) * 4 + 3] >= alphaThreshold) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        // Cross-check only (not used for placement): bottom-most opaque
        // row's alpha-weighted x-centroid, the convention that DOES work
        // for limb joints -- reported so a human can eyeball whether it
        // tracks the bbox-fraction placement or diverges wildly per image.
        let bottomRowX = null, bottomRowY = null;
        for (let y = maxY; y >= minY; y--) {
            let sumX = 0, sumA = 0;
            for (let x = minX; x <= maxX; x++) {
                const a = data[(y * width + x) * 4 + 3];
                if (a >= alphaThreshold) { sumX += x; sumA++; }
            }
            if (sumA > 0) { bottomRowX = sumX / sumA + 0.5; bottomRowY = y + 0.5; break; }
        }
        return {
            width, height,
            bbox: { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 },
            bottomRow: { x: bottomRowX, y: bottomRowY },
        };
    }, { url: dataUrl, alphaThreshold: ALPHA_THRESHOLD });
}

// ── Step 1: calibrate the bbox-relative anchor fraction from the idle head's
// own documented anchor (not measured independently -- see header) ────────
const idle = await measure(IDLE_HEAD);
const idleAnchorPx = { x: IDLE_ANCHOR.u * CANVAS_W, y: IDLE_ANCHOR.v * CANVAS_H };
const uFrac = (idleAnchorPx.x - idle.bbox.minX) / idle.bbox.w;
const vFrac = (idleAnchorPx.y - idle.bbox.minY) / idle.bbox.h;
const idleBottomRowDelta = Math.hypot(idle.bottomRow.x - idleAnchorPx.x, idle.bottomRow.y - idleAnchorPx.y);
console.log('=== Idle head (calibration) ===');
console.log(`canvas ${idle.width}x${idle.height}, ink bbox ${JSON.stringify(idle.bbox)}`);
console.log(`documented headAnchorFrac px: (${idleAnchorPx.x.toFixed(2)}, ${idleAnchorPx.y.toFixed(2)})`);
console.log(`bbox-relative fraction: u=${uFrac.toFixed(4)} v=${vFrac.toFixed(4)} (this is what gets applied to each expression's own bbox)`);
console.log(`cross-check only -- bottom-row centroid: (${idle.bottomRow.x.toFixed(2)}, ${idle.bottomRow.y.toFixed(2)}), ${idleBottomRowDelta.toFixed(2)}px from the anchor (i.e. ~${idleBottomRowDelta.toFixed(0)}px of authored neck-stub art below the true joint on this character)`);
console.log('');

// ── Step 2: measure + normalize each expression ────────────────────────────
const results = [];
for (const { name, file } of EXPRESSIONS) {
    const srcPath = path.join(EXPR_DIR, file);
    const m = await measure(srcPath);
    // The anchor point in SOURCE px, from the calibrated bbox fraction.
    const anchorSrcX = m.bbox.minX + uFrac * m.bbox.w;
    const anchorSrcY = m.bbox.minY + vFrac * m.bbox.h;
    // Uniform scale off ink-bbox HEIGHT ratio (profile heads: height is the
    // stable axis across expressions; width varies with hair/jaw pose) --
    // same "one uniform scale, no distortion" rule used everywhere else in
    // this rig.
    const scale = idle.bbox.h / m.bbox.h;
    const outPath = path.join(OUT_DIR, `head_${name}.png`);
    await page.evaluate(async ({ url, scale, anchorSrcX, anchorSrcY, targetX, targetY, canvasW, canvasH }) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = canvasW;
        c.height = canvasH;
        const ctx = c.getContext('2d');
        const dx = targetX - anchorSrcX * scale;
        const dy = targetY - anchorSrcY * scale;
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, img.naturalWidth * scale, img.naturalHeight * scale);
        window.__lastDataUrl = c.toDataURL('image/png');
    }, { url: 'data:image/png;base64,' + fs.readFileSync(srcPath).toString('base64'), scale, anchorSrcX, anchorSrcY, targetX: idleAnchorPx.x, targetY: idleAnchorPx.y, canvasW: CANVAS_W, canvasH: CANVAS_H });
    const dataUrl = await page.evaluate(() => window.__lastDataUrl);
    fs.writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));

    // Re-measure the written output: confirms the PLACEMENT matches the
    // computed target exactly (construction check -- see header, this is
    // not an independent anatomical verification). Also report the same
    // bottom-row cross-check as idle's, so a human can compare deltas.
    const check = await measure(outPath);
    const placementErr = Math.hypot((check.bbox.minX + uFrac * check.bbox.w) - idleAnchorPx.x, (check.bbox.minY + vFrac * check.bbox.h) - idleAnchorPx.y);
    const outBottomRowDelta = Math.hypot(check.bottomRow.x - idleAnchorPx.x, check.bottomRow.y - idleAnchorPx.y);
    results.push({ name, placementErr, outBottomRowDelta });
    console.log(`${name}: src ${m.width}x${m.height} ink-bbox ${m.bbox.w}x${m.bbox.h} -> scale ${scale.toFixed(4)} -> ${path.relative(REPO, outPath)} (${check.width}x${check.height})`);
    console.log(`  placement check: ${placementErr.toFixed(3)}px | bottom-row cross-check delta: ${outBottomRowDelta.toFixed(2)}px (idle's own: ${idleBottomRowDelta.toFixed(2)}px)`);
}

await browser.close();

console.log('');
const allPlaced = results.every(r => r.placementErr < MAX_ACCEPTABLE_ERR);
console.log(allPlaced
    ? `PASS (construction check) -- all ${results.length} expression heads normalized to ${CANVAS_W}x${CANVAS_H}, computed anchor placed within ${MAX_ACCEPTABLE_ERR}px of headAnchorFrac by construction.`
    : 'FAIL -- placement did not land where computed; something is wrong with the script, not the source art.');
console.log('This is NOT an anatomical verification -- the bbox-relative fraction is a geometric proxy calibrated off one image (idle). Compare the bottom-row cross-check deltas above by eye/in-engine before treating these as final; flag any expression whose delta diverges sharply from idle\'s.');
process.exit(allPlaced ? 0 : 1);
