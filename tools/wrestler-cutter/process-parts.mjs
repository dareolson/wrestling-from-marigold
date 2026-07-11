#!/usr/bin/env node
// process-parts.mjs — turns rough hand-cut body-part PNGs into spec-compliant
// wrestler textures (torso, upper_arm, forearm, thigh, shin) per
// DRAWING_GUIDE.md. Drives headless Chrome via playwright-core and does all
// raster math with canvas 2D in the page context — no PIL, no pngjs, no
// image-processing npm deps.
//
// Usage:
//   node tools/wrestler-cutter/process-parts.mjs [character]
//
// Adding a new character: add an entry to CHARACTERS below pointing at its
// source PNGs (six single-instance parts: torso, trunks, upperArm, forearm,
// thigh, shin, foot — trunks/foot are "underlay" pieces baked into
// torso/shin respectively) and its destination folder. The pipeline itself
// (alpha audit → mask → speck removal → flip → rotate → composite → cap
// flatten → pivot crop → scale/flush) is character-agnostic.
//
// Processing order (see DRAWING_GUIDE.md + the session brief this was built
// against):
//   1. Alpha audit — flag sources with no real alpha (opaque white bg) and
//      fall back to near-white keying, loudly.
//   2. Content mask — alpha > ALPHA_THRESHOLD counts as content.
//   3. Speck removal — connected components, drop any < 1% of the largest.
//   4. Facing flip — mirror every part so the character faces right.
//   5. Forearm rotation — PCA-align the forearm's long axis to vertical,
//      fist down, elbow up.
//   6. Composites — torso+trunks, shin+foot (underlay drawn behind).
//   7. Opaque-cap flattening — forearm/shin only, shave the top until it's a
//      flat opaque joint-cover.
//   8. Pivot-centered crop — symmetric around the top-row opaque x-center,
//      NOT the bbox center.
//   9. Scale + flush — fit target canvas, pivot edge flush at y=0.
//  10. Write PNGs + QA images.

import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const CHARACTERS = {
    george: {
        srcDir: '/Users/home/Documents/wrestling-from-marigold/Sprite sheets/GeorgeParts',
        destDir: path.join(REPO_ROOT, 'src/assets/wrestlers/george'),
        files: {
            torso: 'Torso.png',
            trunks: 'Trunks.png',
            upperArm: 'L_Arm_Upper.png',
            forearm: 'L_Arm_Lower.png',
            thigh: 'L_Leg_Upper.png',
            shin: 'L_Leg_Lower.png',
            foot: 'L_Foot.png',
        },
    },
};

const DEFAULT_QA_DIR = '/private/tmp/claude-501/-Users-home-Documents-urworthy/8cbc67d6-398e-45d9-a9e4-a5f9b95bae03/scratchpad/george-art/qa';

const PART_SPECS = {
    torso:     { w: 190, h: 260, opaqueCap: false },
    upper_arm: { w: 130, h: 160, opaqueCap: false },
    forearm:   { w: 130, h: 190, opaqueCap: true },
    thigh:     { w: 150, h: 150, opaqueCap: false },
    shin:      { w: 150, h: 230, opaqueCap: true },
};

const ALPHA_THRESHOLD = 10;
const SPECK_AREA_FRAC = 0.01;
const NEAR_WHITE = 250;
const OPAQUE_CAP_MIN_FRAC = 0.6;
const PIVOT_ROWS = 8;
const TRUNKS_WIDTH_MULT = 1.08;
const COMPOSITE_OVERLAP_PX = 12;
const PAD_SIDES = 20; // per side -> 40 total width budget
const PAD_BOTTOM = 20;

// ── Browser-side pixel-math library (injected once via addScriptTag) ──────
const BROWSER_LIB = `
window.WC = (function () {
  const ALPHA_THRESHOLD = ${ALPHA_THRESHOLD};
  const NEAR_WHITE = ${NEAR_WHITE};

  function newCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function ctxOf(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return ctx;
  }

  async function loadImage(dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const c = newCanvas(img.naturalWidth, img.naturalHeight);
    ctxOf(c).drawImage(img, 0, 0);
    return c;
  }

  function alphaAudit(canvas) {
    const ctx = ctxOf(canvas);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let fullyTransparent = 0, partial = 0, opaque = 0, nearWhiteOpaque = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) fullyTransparent++;
      else if (a === 255) opaque++;
      else partial++;
      if (a === 255 && data[i] >= NEAR_WHITE && data[i+1] >= NEAR_WHITE && data[i+2] >= NEAR_WHITE) nearWhiteOpaque++;
    }
    const total = canvas.width * canvas.height;
    const needsKeying = fullyTransparent === 0 && partial === 0; // fully-opaque source: no real alpha channel in use
    return { w: canvas.width, h: canvas.height, fullyTransparent, partial, opaque, nearWhiteOpaque, total, needsKeying };
  }

  // Bakes real alpha into the canvas: either trusts existing alpha, or (fallback)
  // keys out near-white pixels as background. Returns the audit info too.
  function bakeAlpha(canvas, needsKeying) {
    const ctx = ctxOf(canvas);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = id.data;
    if (needsKeying) {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] >= NEAR_WHITE && d[i+1] >= NEAR_WHITE && d[i+2] >= NEAR_WHITE) d[i+3] = 0;
      }
      ctx.putImageData(id, 0, 0);
    }
    return canvas;
  }

  // 8-connected components over alpha>ALPHA_THRESHOLD. Iterative flood fill.
  function connectedComponents(canvas) {
    const ctx = ctxOf(canvas);
    const w = canvas.width, h = canvas.height;
    const { data } = ctx.getImageData(0, 0, w, h);
    const mask = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0;
    const visited = new Uint8Array(w * h);
    const comps = [];
    const stack = new Int32Array(w * h);
    for (let start = 0; start < w * h; start++) {
      if (!mask[start] || visited[start]) continue;
      let sp = 0;
      stack[sp++] = start;
      visited[start] = 1;
      let area = 0, minX = w, minY = h, maxX = -1, maxY = -1;
      while (sp > 0) {
        const p = stack[--sp];
        const x = p % w, y = (p / w) | 0;
        area++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const np = ny * w + nx;
            if (mask[np] && !visited[np]) { visited[np] = 1; stack[sp++] = np; }
          }
        }
      }
      comps.push({ area, minX, minY, maxX, maxY });
    }
    return { mask, comps, w, h };
  }

  // Drops components below fracThreshold of the largest; zeroes their alpha
  // in-place on the canvas. Returns { keptCount, dropped: [{area,cx,cy}] }.
  function dropSmallComponents(canvas, fracThreshold) {
    const { mask, comps, w, h } = connectedComponents(canvas);
    if (comps.length === 0) return { keptCount: 0, dropped: [] };
    const maxArea = Math.max(...comps.map(c => c.area));
    const threshold = maxArea * fracThreshold;
    const dropped = [];
    const keep = new Uint8Array(w * h); // 1 = pixel belongs to a kept component
    // Re-run flood fill bookkeeping isn't stored per-pixel above (memory), so
    // do a second labeled pass to know which pixels belong to which comp.
    const labels = new Int32Array(w * h).fill(-1);
    const visited2 = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let compIdx = 0;
    for (let start = 0; start < w * h; start++) {
      if (!mask[start] || visited2[start]) continue;
      let sp = 0;
      stack[sp++] = start;
      visited2[start] = 1;
      const label = compIdx++;
      while (sp > 0) {
        const p = stack[--sp];
        labels[p] = label;
        const x = p % w, y = (p / w) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const np = ny * w + nx;
            if (mask[np] && !visited2[np]) { visited2[np] = 1; stack[sp++] = np; }
          }
        }
      }
    }
    const ctx = ctxOf(canvas);
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < comps.length; i++) {
      if (comps[i].area < threshold) {
        const c = comps[i];
        dropped.push({ area: c.area, cx: Math.round((c.minX + c.maxX) / 2), cy: Math.round((c.minY + c.maxY) / 2), bbox: { minX: c.minX, minY: c.minY, maxX: c.maxX, maxY: c.maxY } });
      }
    }
    for (let p = 0; p < w * h; p++) {
      const lbl = labels[p];
      if (lbl >= 0 && comps[lbl].area < threshold) {
        d[p * 4 + 3] = 0;
      }
    }
    ctx.putImageData(id, 0, 0);
    return { keptCount: comps.length - dropped.length, dropped };
  }

  function contentBBox(canvas) {
    const ctx = ctxOf(canvas);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const w = canvas.width, h = canvas.height;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { minX, minY, maxX, maxY };
  }

  function rowStats(canvas, y) {
    const ctx = ctxOf(canvas);
    const w = canvas.width;
    const { data } = ctx.getImageData(0, y, w, 1);
    let minX = w, maxX = -1, count = 0, darkCount = 0;
    for (let x = 0; x < w; x++) {
      const i = x * 4;
      const a = data[i + 3];
      if (a > ALPHA_THRESHOLD) {
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if ((data[i] + data[i+1] + data[i+2]) / 3 < 70) darkCount++;
      }
    }
    if (count === 0) return null;
    return { y, minX, maxX, width: maxX - minX + 1, count, darkFrac: darkCount / count };
  }

  function flipHorizontal(canvas) {
    const out = newCanvas(canvas.width, canvas.height);
    const ctx = ctxOf(out);
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
    return out;
  }

  // Max content width among rows in [yStart,yEnd] whose darkFrac >= threshold.
  // Returns { width, y, xCenter } of the widest qualifying row (or null).
  function darkBandWidth(canvas, yStart, yEnd, darkThreshold) {
    let best = null;
    for (let y = yStart; y <= yEnd; y++) {
      const r = rowStats(canvas, y);
      if (!r || r.darkFrac < darkThreshold) continue;
      if (!best || r.width > best.width) best = r;
    }
    if (!best) return null;
    return { width: best.width, y: best.y, xCenter: (best.minX + best.maxX) / 2 };
  }

  // Average width/xCenter of rows [yStart, yStart+count) — used for the
  // foot's ankle-opening measurement (DRAWING_GUIDE calls for "topmost ~10
  // rows"); skips the first 'skip' rows to dodge the antialiased tip.
  function edgeAverageWidth(canvas, yStart, count, skip) {
    let wSum = 0, cSum = 0, n = 0;
    for (let i = skip; i < skip + count; i++) {
      const r = rowStats(canvas, yStart + i);
      if (!r) continue;
      wSum += r.width; cSum += (r.minX + r.maxX) / 2; n++;
    }
    if (n === 0) return null;
    return { width: wSum / n, xCenter: cSum / n };
  }

  // PCA of the content mask -> angle (radians) of the principal axis from +x.
  function principalAngle(canvas) {
    const ctx = ctxOf(canvas);
    const w = canvas.width, h = canvas.height;
    const { data } = ctx.getImageData(0, 0, w, h);
    let n = 0, sx = 0, sy = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) { n++; sx += x; sy += y; }
    }
    const cx = sx / n, cy = sy / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) {
        const dx = x - cx, dy = y - cy;
        sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
      }
    }
    sxx /= n; syy /= n; sxy /= n;
    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    return { theta, cx, cy, n };
  }

  // Rotates canvas content around (cx,cy) by 'phi' radians (about that point,
  // canvas grows as needed so nothing clips). Bicubic-quality smoothing.
  function rotateAround(canvas, cx, cy, phi) {
    const w = canvas.width, h = canvas.height;
    // generous margin: content is far from edges for this art, but be safe
    const margin = Math.ceil(Math.max(w, h) * 0.15);
    const out = newCanvas(w + margin * 2, h + margin * 2);
    const ctx = ctxOf(out);
    ctx.translate(margin, margin);
    ctx.translate(cx, cy);
    ctx.rotate(phi);
    ctx.translate(-cx, -cy);
    ctx.drawImage(canvas, 0, 0);
    return out;
  }

  // Rotate 'canvas' so its principal axis is vertical with the point nearest
  // (fistHintX,fistHintY) ending up BELOW the centroid (fist down).
  function alignVerticalFistDown(canvas, fistHintX, fistHintY) {
    const { theta, cx, cy } = principalAngle(canvas);
    let phi = Math.PI / 2 - theta;
    // where does the fist hint land after rotating by phi about (cx,cy)?
    const dx = fistHintX - cx, dy = fistHintY - cy;
    const rx = dx * Math.cos(phi) - dy * Math.sin(phi);
    const ry = dx * Math.sin(phi) + dy * Math.cos(phi);
    let flipped = false;
    if (ry < 0) { phi += Math.PI; flipped = true; } // fist landed above center -> wrong way
    const out = rotateAround(canvas, cx, cy, phi);
    return { canvas: out, phi, thetaDeg: theta * 180 / Math.PI, phiDeg: phi * 180 / Math.PI, flipped180: flipped };
  }

  // Shaves rows from the top of the content until the top row's opaque width
  // >= minFrac * the content's max row width. Mutates canvas in place
  // (zeroes alpha on shaved rows). Returns { shavedRows, maxWidth, finalTopWidth }.
  // maxWidthSearchYEnd (optional) caps how far down the max-width search
  // looks — for a composited part (shin+foot) the joint-cap rule is about
  // the shin's OWN cross-section at the knee, not the much wider boot body
  // further down the same canvas, so callers pass the base part's own
  // pre-composite bottom edge here.
  function flattenOpaqueCap(canvas, minFrac, maxWidthSearchYEnd) {
    const bbox = contentBBox(canvas);
    if (!bbox) return { shavedRows: 0, maxWidth: 0, finalTopWidth: 0 };
    const searchEnd = maxWidthSearchYEnd != null ? Math.min(bbox.maxY, maxWidthSearchYEnd) : bbox.maxY;
    let maxWidth = 0;
    for (let y = bbox.minY; y <= searchEnd; y++) {
      const r = rowStats(canvas, y);
      if (r && r.width > maxWidth) maxWidth = r.width;
    }
    const ctx = ctxOf(canvas);
    let shaved = 0;
    let top = bbox.minY;
    let topWidth = rowStats(canvas, top)?.width ?? 0;
    const w = canvas.width;
    while (topWidth / maxWidth < minFrac && top < bbox.maxY) {
      const id = ctx.getImageData(0, top, w, 1);
      const d = id.data;
      for (let x = 0; x < w; x++) d[x * 4 + 3] = 0;
      ctx.putImageData(id, 0, top);
      shaved++;
      top++;
      topWidth = rowStats(canvas, top)?.width ?? 0;
    }
    return { shavedRows: shaved, maxWidth, finalTopWidth: topWidth, newTopY: top };
  }

  // Pivot x = opaque x-center of the top PIVOT_ROWS content rows. Crop window
  // symmetric around pivotX, vertically spanning content top..bottom.
  function pivotCrop(canvas, pivotRows) {
    const bbox = contentBBox(canvas);
    let wSum = 0, cSum = 0, n = 0;
    for (let i = 0; i < pivotRows; i++) {
      const r = rowStats(canvas, bbox.minY + i);
      if (!r) continue;
      wSum += r.count; cSum += ((r.minX + r.maxX) / 2) * r.count; n += r.count;
    }
    const pivotX = n > 0 ? cSum / n : (bbox.minX + bbox.maxX) / 2;
    const bboxCenterX = (bbox.minX + bbox.maxX) / 2;
    const halfWidth = Math.max(pivotX - bbox.minX, bbox.maxX - pivotX);
    const cropX0 = Math.max(0, Math.round(pivotX - halfWidth));
    const cropX1 = Math.min(canvas.width - 1, Math.round(pivotX + halfWidth));
    const cropW = cropX1 - cropX0 + 1;
    const cropH = bbox.maxY - bbox.minY + 1;
    const out = newCanvas(cropW, cropH);
    ctxOf(out).drawImage(canvas, cropX0, bbox.minY, cropW, cropH, 0, 0, cropW, cropH);
    return { canvas: out, pivotX, bboxCenterX, delta: pivotX - bboxCenterX, bbox, cropX0, cropY0: bbox.minY };
  }

  // Fit croppedCanvas into targetW x targetH: pivot edge flush at y=0,
  // horizontally centered (which centers the pivot since the crop is
  // pivot-symmetric), padSides/padBottom minimums honored via the smaller
  // of the two available scale factors.
  function scaleFlush(croppedCanvas, targetW, targetH, padSides, padBottom) {
    const cropW = croppedCanvas.width, cropH = croppedCanvas.height;
    const availW = targetW - padSides * 2;
    const availH = targetH - padBottom;
    const scale = Math.min(availW / cropW, availH / cropH);
    const drawW = cropW * scale, drawH = cropH * scale;
    const dx = (targetW - drawW) / 2, dy = 0;
    const out = newCanvas(targetW, targetH);
    ctxOf(out).drawImage(croppedCanvas, 0, 0, cropW, cropH, dx, dy, drawW, drawH);
    return {
      canvas: out, scale, drawW, drawH, dx, dy,
      leftPad: dx, rightPad: targetW - (dx + drawW), bottomPad: targetH - (dy + drawH),
    };
  }

  // Places 'underlayCanvas' behind 'baseCanvas' at a computed scale/offset so
  // the underlay's reference width matches widthMultiplier * baseWidthAtEdge,
  // x-centered on baseXCenterAtEdge, overlapping overlapPx above baseEdgeY.
  function placeUnderlay(opts) {
    const { baseCanvas, baseEdgeY, baseWidthAtEdge, baseXCenterAtEdge,
            underlayCanvas, underlayBBox, underlayRefWidth, underlayRefXCenter,
            widthMultiplier, overlapPx } = opts;
    const scale = (baseWidthAtEdge * widthMultiplier) / underlayRefWidth;
    const sx = underlayBBox.minX, sy = underlayBBox.minY;
    const sw = underlayBBox.maxX - underlayBBox.minX + 1;
    const sh = underlayBBox.maxY - underlayBBox.minY + 1;
    const dw = sw * scale, dh = sh * scale;
    const dx = baseXCenterAtEdge - (underlayRefXCenter - sx) * scale;
    // underlay's content-top (sy) lands overlapPx above the base's edge row,
    // so the base draws over the top ~overlapPx of the underlay at native scale
    const dy = baseEdgeY - overlapPx;
    const out = newCanvas(Math.max(baseCanvas.width, dx + dw + 50), Math.max(baseCanvas.height, dy + dh + 50));
    const ctx = ctxOf(out);
    ctx.drawImage(underlayCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.drawImage(baseCanvas, 0, 0);
    return { canvas: out, scale, dx, dy, dw, dh };
  }

  function toDataURL(canvas) { return canvas.toDataURL('image/png'); }

  function drawCheckerboard(ctx, w, h, cell) {
    for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
      ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#3a3a3a' : '#2a2a2a';
      ctx.fillRect(x, y, cell, cell);
    }
  }

  // Side-by-side QA: left = pre-scale cropped content (zoomed), right =
  // final target canvas with crosshair at pivot + border, at N-times zoom.
  function buildQA(croppedCanvas, finalCanvas, targetW, targetH, zoom, label) {
    const leftW = croppedCanvas.width * zoom, leftH = croppedCanvas.height * zoom;
    const rightW = targetW * zoom, rightH = targetH * zoom;
    const gap = 24;
    const labelH = 24;
    const out = newCanvas(leftW + gap + rightW + 20, Math.max(leftH, rightH) + labelH + 10);
    const ctx = ctxOf(out);
    ctx.fillStyle = '#1b1b1f';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = '#e8e6e3';
    ctx.font = '14px monospace';
    ctx.fillText(label, 8, 16);
    drawCheckerboard(ctx, leftW, leftH, 10);
    ctx.save(); ctx.translate(0, labelH);
    ctx.drawImage(croppedCanvas, 0, 0, croppedCanvas.width, croppedCanvas.height, 0, 0, leftW, leftH);
    ctx.restore();
    ctx.save(); ctx.translate(leftW + gap, labelH);
    drawCheckerboard(ctx, rightW, rightH, 10);
    ctx.drawImage(finalCanvas, 0, 0, targetW, targetH, 0, 0, rightW, rightH);
    ctx.strokeStyle = '#ff5c5c'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, rightW - 1, rightH - 1);
    // crosshair at pivot (targetW/2, 0)
    const px = (targetW / 2) * zoom;
    ctx.strokeStyle = '#5cc8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px - 10, 2); ctx.lineTo(px + 10, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, 24); ctx.stroke();
    ctx.restore();
    return out;
  }

  return {
    newCanvas, ctxOf, loadImage, alphaAudit, bakeAlpha, connectedComponents,
    dropSmallComponents, contentBBox, rowStats, flipHorizontal, darkBandWidth,
    edgeAverageWidth, principalAngle, rotateAround, alignVerticalFistDown,
    flattenOpaqueCap, pivotCrop, scaleFlush, placeUnderlay, toDataURL,
    drawCheckerboard, buildQA,
  };
})();
`;

function dataUrlFromFile(p) {
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}

async function main() {
    const slug = process.argv[2] || 'george';
    const char = CHARACTERS[slug];
    if (!char) throw new Error(`Unknown character "${slug}". Known: ${Object.keys(CHARACTERS).join(', ')}`);

    fs.mkdirSync(char.destDir, { recursive: true });
    fs.mkdirSync(DEFAULT_QA_DIR, { recursive: true });

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ content: BROWSER_LIB });

    const report = { alphaAudit: {}, droppedSpecks: {}, flip: 'all parts mirrored horizontally to face right', rotation: null, composites: {}, capFlatten: {}, pivotCrop: {}, finalPadding: {} };

    // ── Load + clean every source (mask, speck removal, flip) once ────────
    const sourceKeys = ['torso', 'trunks', 'upperArm', 'forearm', 'thigh', 'shin', 'foot'];
    const cleaned = {};
    for (const key of sourceKeys) {
        const filePath = path.join(char.srcDir, char.files[key]);
        const dataUrl = dataUrlFromFile(filePath);
        const result = await page.evaluate(async ({ dataUrl, fracThreshold }) => {
            const canvas = await window.WC.loadImage(dataUrl);
            const audit = window.WC.alphaAudit(canvas);
            window.WC.bakeAlpha(canvas, audit.needsKeying);
            const { keptCount, dropped } = window.WC.dropSmallComponents(canvas, fracThreshold);
            const flipped = window.WC.flipHorizontal(canvas);
            return { dataUrl: window.WC.toDataURL(flipped), audit, keptCount, dropped };
        }, { dataUrl, fracThreshold: SPECK_AREA_FRAC });
        cleaned[key] = result.dataUrl;
        report.alphaAudit[char.files[key]] = result.audit;
        report.droppedSpecks[char.files[key]] = result.dropped;
    }

    // ── upper_arm (single source, no composite/rotation) ───────────────────
    const outputs = {};
    outputs.upper_arm = await buildSimplePart(page, cleaned.upperArm, PART_SPECS.upper_arm, 'upper_arm');
    report.pivotCrop.upper_arm = { pivotX: outputs.upper_arm.pivotX, bboxCenterX: outputs.upper_arm.bboxCenterX, delta: outputs.upper_arm.pivotDelta };
    report.finalPadding.upper_arm = { leftPad: outputs.upper_arm.leftPad, rightPad: outputs.upper_arm.rightPad, bottomPad: outputs.upper_arm.bottomPad, drawW: outputs.upper_arm.drawW, drawH: outputs.upper_arm.drawH };

    // ── forearm (rotate to vertical fist-down, then cap-flatten) ──────────
    {
        const res = await page.evaluate(async ({ dataUrl, spec, minFrac, pivotRows, padSides, padBottom }) => {
            const canvas = await window.WC.loadImage(dataUrl);
            // Fist hint: after the facing flip, the fist is the LOWER-RIGHT
            // end of the diagonal (source had elbow upper-right/fist
            // lower-left; a horizontal flip swaps left<->right). Use the
            // content bbox's bottom-right-most content pixel as the hint.
            const bbox = window.WC.contentBBox(canvas);
            const hintX = bbox.maxX, hintY = bbox.maxY;
            const rot = window.WC.alignVerticalFistDown(canvas, hintX, hintY);
            const cap = window.WC.flattenOpaqueCap(rot.canvas, minFrac);
            const pivot = window.WC.pivotCrop(rot.canvas, pivotRows);
            const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, padSides, padBottom);
            const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 3, 'forearm');
            return {
                finalDataUrl: window.WC.toDataURL(flushed.canvas),
                qaDataUrl: window.WC.toDataURL(qa),
                rotationDeg: rot.phiDeg, thetaDeg: rot.thetaDeg, flipped180: rot.flipped180,
                capShaved: cap.shavedRows, capMaxWidth: cap.maxWidth, capFinalTopWidth: cap.finalTopWidth,
                pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
                leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
                drawW: flushed.drawW, drawH: flushed.drawH,
            };
        }, { dataUrl: cleaned.forearm, spec: PART_SPECS.forearm, minFrac: OPAQUE_CAP_MIN_FRAC, pivotRows: PIVOT_ROWS, padSides: PAD_SIDES, padBottom: PAD_BOTTOM });
        outputs.forearm = res;
        report.rotation = { forearm_thetaDeg: res.thetaDeg, forearm_rotationAppliedDeg: res.rotationDeg, flipped180ForFistDown: res.flipped180 };
        report.capFlatten.forearm = { shavedRows: res.capShaved, maxWidth: res.capMaxWidth, finalTopWidth: res.capFinalTopWidth };
        report.pivotCrop.forearm = { pivotX: res.pivotX, bboxCenterX: res.bboxCenterX, delta: res.pivotDelta };
        report.finalPadding.forearm = { leftPad: res.leftPad, rightPad: res.rightPad, bottomPad: res.bottomPad, drawW: res.drawW, drawH: res.drawH };
    }

    // ── thigh (single source, no composite/rotation) ───────────────────────
    outputs.thigh = await buildSimplePart(page, cleaned.thigh, PART_SPECS.thigh, 'thigh');
    report.pivotCrop.thigh = { pivotX: outputs.thigh.pivotX, bboxCenterX: outputs.thigh.bboxCenterX, delta: outputs.thigh.pivotDelta };
    report.finalPadding.thigh = { leftPad: outputs.thigh.leftPad, rightPad: outputs.thigh.rightPad, bottomPad: outputs.thigh.bottomPad, drawW: outputs.thigh.drawW, drawH: outputs.thigh.drawH };

    // ── torso = Torso + Trunks composite ───────────────────────────────────
    {
        const res = await page.evaluate(async ({ torsoUrl, trunksUrl, spec, widthMult, overlapPx, pivotRows, padSides, padBottom }) => {
            const torso = await window.WC.loadImage(torsoUrl);
            const trunks = await window.WC.loadImage(trunksUrl);
            const torsoBBox = window.WC.contentBBox(torso);
            const searchStart = torsoBBox.minY + Math.round((torsoBBox.maxY - torsoBBox.minY) * 0.65);
            const band = window.WC.darkBandWidth(torso, searchStart, torsoBBox.maxY, 0.5);
            const trunksBBox = window.WC.contentBBox(trunks);
            const trunksRefWidth = trunksBBox.maxX - trunksBBox.minX + 1;
            const trunksRefXCenter = (trunksBBox.minX + trunksBBox.maxX) / 2;
            const placed = window.WC.placeUnderlay({
                baseCanvas: torso, baseEdgeY: torsoBBox.maxY, baseWidthAtEdge: band.width, baseXCenterAtEdge: band.xCenter,
                underlayCanvas: trunks, underlayBBox: trunksBBox, underlayRefWidth: trunksRefWidth, underlayRefXCenter: trunksRefXCenter,
                widthMultiplier: widthMult, overlapPx,
            });
            const pivot = window.WC.pivotCrop(placed.canvas, pivotRows);
            const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, padSides, padBottom);
            const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 2, 'torso');
            const uncomposited = window.WC.toDataURL(torso);
            return {
                finalDataUrl: window.WC.toDataURL(flushed.canvas), qaDataUrl: window.WC.toDataURL(qa), uncompositedDataUrl: uncomposited,
                waistbandWidth: band.width, waistbandY: band.y, waistbandXCenter: band.xCenter,
                trunksRefWidth, trunksRefXCenter, scale: placed.scale, dx: placed.dx, dy: placed.dy, dw: placed.dw, dh: placed.dh,
                pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
                leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
                drawW: flushed.drawW, drawH: flushed.drawH,
            };
        }, { torsoUrl: cleaned.torso, trunksUrl: cleaned.trunks, spec: PART_SPECS.torso, widthMult: TRUNKS_WIDTH_MULT, overlapPx: COMPOSITE_OVERLAP_PX, pivotRows: PIVOT_ROWS, padSides: PAD_SIDES, padBottom: PAD_BOTTOM });
        outputs.torso = res;
        report.composites.torso_trunks = {
            waistbandWidth: res.waistbandWidth, waistbandRow: res.waistbandY, waistbandXCenter: res.waistbandXCenter,
            trunksContentWidth: res.trunksRefWidth, trunksXCenter: res.trunksRefXCenter,
            appliedScale: res.scale, placedAt: { dx: res.dx, dy: res.dy, dw: res.dw, dh: res.dh },
        };
        report.pivotCrop.torso = { pivotX: res.pivotX, bboxCenterX: res.bboxCenterX, delta: res.pivotDelta };
        report.finalPadding.torso = { leftPad: res.leftPad, rightPad: res.rightPad, bottomPad: res.bottomPad, drawW: res.drawW, drawH: res.drawH };
    }

    // ── shin = L_Leg_Lower + L_Foot composite, then cap-flatten ────────────
    {
        const res = await page.evaluate(async ({ shinUrl, footUrl, spec, overlapPx, minFrac, pivotRows, padSides, padBottom }) => {
            const shin = await window.WC.loadImage(shinUrl);
            const foot = await window.WC.loadImage(footUrl);
            const shinBBox = window.WC.contentBBox(shin);
            const searchStart = shinBBox.minY + Math.round((shinBBox.maxY - shinBBox.minY) * 0.6);
            const band = window.WC.darkBandWidth(shin, searchStart, shinBBox.maxY, 0.4);
            const bottomRow = window.WC.rowStats(shin, shinBBox.maxY);
            const bottomRowXCenter = (bottomRow.minX + bottomRow.maxX) / 2;
            const footBBox = window.WC.contentBBox(foot);
            const ankle = window.WC.edgeAverageWidth(foot, footBBox.minY, 10, 5);
            const placed = window.WC.placeUnderlay({
                baseCanvas: shin, baseEdgeY: shinBBox.maxY, baseWidthAtEdge: band.width, baseXCenterAtEdge: bottomRowXCenter,
                underlayCanvas: foot, underlayBBox: footBBox, underlayRefWidth: ankle.width, underlayRefXCenter: ankle.xCenter,
                widthMultiplier: 1.0, overlapPx,
            });
            const cap = window.WC.flattenOpaqueCap(placed.canvas, minFrac, shinBBox.maxY);
            const pivot = window.WC.pivotCrop(placed.canvas, pivotRows);
            const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, padSides, padBottom);
            const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 2, 'shin');
            const uncomposited = window.WC.toDataURL(shin);
            // Where the shin's OWN region (pre-boot) ends up in the final
            // canvas's y-coordinates, so verification can scope its
            // max-width search the same way flattenOpaqueCap did (excluding
            // the much-wider boot silhouette further down).
            const ownRegionBottomYFinal = (shinBBox.maxY - pivot.cropY0) * flushed.scale + flushed.dy;
            return {
                finalDataUrl: window.WC.toDataURL(flushed.canvas), qaDataUrl: window.WC.toDataURL(qa), uncompositedDataUrl: uncomposited,
                cuffWidth: band.width, cuffY: band.y, bottomRowXCenter,
                ankleWidth: ankle.width, ankleXCenter: ankle.xCenter, scale: placed.scale, dx: placed.dx, dy: placed.dy, dw: placed.dw, dh: placed.dh,
                capShaved: cap.shavedRows, capMaxWidth: cap.maxWidth, capFinalTopWidth: cap.finalTopWidth,
                pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
                leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
                drawW: flushed.drawW, drawH: flushed.drawH, ownRegionBottomYFinal,
            };
        }, { shinUrl: cleaned.shin, footUrl: cleaned.foot, spec: PART_SPECS.shin, overlapPx: COMPOSITE_OVERLAP_PX, minFrac: OPAQUE_CAP_MIN_FRAC, pivotRows: PIVOT_ROWS, padSides: PAD_SIDES, padBottom: PAD_BOTTOM });
        outputs.shin = res;
        report.composites.shin_foot = {
            cuffWidth: res.cuffWidth, cuffRow: res.cuffY, shinBottomRowXCenter: res.bottomRowXCenter,
            footAnkleWidth: res.ankleWidth, footAnkleXCenter: res.ankleXCenter,
            appliedScale: res.scale, placedAt: { dx: res.dx, dy: res.dy, dw: res.dw, dh: res.dh },
        };
        report.capFlatten.shin = { shavedRows: res.capShaved, maxWidth: res.capMaxWidth, finalTopWidth: res.capFinalTopWidth };
        report.pivotCrop.shin = { pivotX: res.pivotX, bboxCenterX: res.bboxCenterX, delta: res.pivotDelta };
        report.finalPadding.shin = { leftPad: res.leftPad, rightPad: res.rightPad, bottomPad: res.bottomPad, drawW: res.drawW, drawH: res.drawH };
    }

    // ── write final PNGs to destDir ─────────────────────────────────────────
    for (const name of ['torso', 'upper_arm', 'forearm', 'thigh', 'shin']) {
        const b64 = outputs[name].finalDataUrl.split(',')[1];
        fs.writeFileSync(path.join(char.destDir, `${name}.png`), Buffer.from(b64, 'base64'));
    }

    // ── verification pass: exact spec dims, opaque content present, cap
    //    rule holds, nothing touches the left/right/bottom edges ───────────
    report.verification = {};
    let verificationOk = true;
    for (const name of ['torso', 'upper_arm', 'forearm', 'thigh', 'shin']) {
        const spec = PART_SPECS[name];
        const filePath = path.join(char.destDir, `${name}.png`);
        const dataUrl = dataUrlFromFile(filePath);
        // For shin, scope the max-width search to its own (pre-boot) region
        // — same reasoning as flattenOpaqueCap: the boot is much wider than
        // the shin and isn't the joint this cap is covering.
        const maxWidthSearchYEnd = name === 'shin' ? outputs.shin.ownRegionBottomYFinal : null;
        const v = await page.evaluate(async ({ dataUrl, spec, minFrac, maxWidthSearchYEnd, edgeTrim }) => {
            const canvas = await window.WC.loadImage(dataUrl);
            const dimsOk = canvas.width === spec.w && canvas.height === spec.h;
            const bbox = window.WC.contentBBox(canvas);
            const hasContent = !!bbox;
            const edgeFree = bbox ? (bbox.minX > 0 && bbox.maxX < canvas.width - 1 && bbox.maxY < canvas.height - 1) : false;
            let capOk = true, capTopWidth = null, capMaxWidth = null;
            if (spec.opaqueCap && bbox) {
                const topRow = window.WC.rowStats(canvas, bbox.minY);
                const searchEnd = maxWidthSearchYEnd != null ? Math.min(bbox.maxY, Math.round(maxWidthSearchYEnd)) : bbox.maxY;
                let maxWidth = 0;
                for (let y = bbox.minY; y <= searchEnd; y++) {
                    const r = window.WC.rowStats(canvas, y);
                    if (r && r.width > maxWidth) maxWidth = r.width;
                }
                capTopWidth = topRow ? topRow.width : 0;
                capMaxWidth = maxWidth;
                capOk = maxWidth > 0 && (capTopWidth / maxWidth) >= minFrac;
                // Require the top row's CORE (its own span, minus a few
                // pixels of unavoidable antialiasing at each outer edge) to
                // be fully opaque — a hard 0-tolerance check would flag the
                // natural 1-3px edge taper every raster silhouette has, which
                // isn't a joint-seam gap since it sits at the very boundary
                // of an already-wide-enough cap, not its center.
                if (topRow && topRow.width > edgeTrim * 2) {
                    const ctx = window.WC.ctxOf(canvas);
                    const rowData = ctx.getImageData(topRow.minX, bbox.minY, topRow.width, 1).data;
                    for (let i = edgeTrim; i < topRow.width - edgeTrim; i++) {
                        if (rowData[i * 4 + 3] < 250) { capOk = false; break; }
                    }
                }
            }
            return { w: canvas.width, h: canvas.height, dimsOk, hasContent, edgeFree, bbox, capOk, capTopWidth, capMaxWidth };
        }, { dataUrl, spec, minFrac: OPAQUE_CAP_MIN_FRAC, maxWidthSearchYEnd, edgeTrim: 3 });
        const pass = v.dimsOk && v.hasContent && v.edgeFree && v.capOk;
        report.verification[name] = { ...v, pass };
        if (!pass) verificationOk = false;
    }
    report.verificationOk = verificationOk;
    if (!verificationOk) {
        console.error('VERIFICATION FAILED:', JSON.stringify(report.verification, null, 2));
    }

    // ── write QA images + uncomposited variants to scratchpad ──────────────
    for (const name of ['torso', 'upper_arm', 'forearm', 'thigh', 'shin']) {
        const qaB64 = outputs[name].qaDataUrl.split(',')[1];
        fs.writeFileSync(path.join(DEFAULT_QA_DIR, `qa_${name}.png`), Buffer.from(qaB64, 'base64'));
    }
    fs.writeFileSync(path.join(DEFAULT_QA_DIR, 'uncomposited_torso.png'), Buffer.from(outputs.torso.uncompositedDataUrl.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(DEFAULT_QA_DIR, 'uncomposited_shin.png'), Buffer.from(outputs.shin.uncompositedDataUrl.split(',')[1], 'base64'));

    // ── paper doll mock ──────────────────────────────────────────────────
    const headPath = path.join(char.destDir, 'head.png');
    if (fs.existsSync(headPath)) {
        const headUrl = dataUrlFromFile(headPath);
        const partUrls = {};
        for (const name of ['torso', 'upper_arm', 'forearm', 'thigh', 'shin']) {
            partUrls[name] = outputs[name].finalDataUrl;
        }
        const dollUrl = await page.evaluate(async ({ headUrl, partUrls }) => {
            const head = await window.WC.loadImage(headUrl);
            const torso = await window.WC.loadImage(partUrls.torso);
            const upperArm = await window.WC.loadImage(partUrls.upper_arm);
            const forearm = await window.WC.loadImage(partUrls.forearm);
            const thigh = await window.WC.loadImage(partUrls.thigh);
            const shin = await window.WC.loadImage(partUrls.shin);
            // Use each part's actual content bbox (not the padded canvas) so
            // joints stack tight instead of leaving gaps from pivot padding.
            const cb = c => window.WC.contentBBox(c);
            const headBB = cb(head), torsoBB = cb(torso), upperArmBB = cb(upperArm),
                  forearmBB = cb(forearm), thighBB = cb(thigh), shinBB = cb(shin);
            const out = window.WC.newCanvas(500, 700);
            const ctx = window.WC.ctxOf(out);
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, out.width, out.height);
            // head bottom-center pivot (origin 0.5,1 in-game) at (250, 120)
            const headX = 250, headY = 120;
            ctx.drawImage(head, headX - head.width / 2, headY - head.height, head.width, head.height);
            // torso top-center pivot (origin 0.5,0) at the head's pivot
            const torsoX = headX, torsoY = headY;
            ctx.drawImage(torso, torsoX - torso.width / 2, torsoY, torso.width, torso.height);
            // shoulder sits just outside the torso's own content edge, not
            // its padded canvas edge, so the arm hangs beside the body
            const torsoContentRight = torsoX - torso.width / 2 + torsoBB.maxX;
            const shoulderX = torsoContentRight - 8, shoulderY = torsoY + torsoBB.minY + 6;
            ctx.drawImage(upperArm, shoulderX - upperArm.width / 2, shoulderY, upperArm.width, upperArm.height);
            // elbow = shoulder + upper arm's own content height (skip its padding)
            const elbowY = shoulderY + upperArmBB.maxY;
            ctx.drawImage(forearm, shoulderX - forearm.width / 2, elbowY, forearm.width, forearm.height);
            // hip near torso's bottom content edge, inset from center toward the near leg
            const hipX = torsoX + torso.width * 0.12;
            const hipY = torsoY + torsoBB.maxY - 6;
            ctx.drawImage(thigh, hipX - thigh.width / 2, hipY, thigh.width, thigh.height);
            const kneeY = hipY + thighBB.maxY;
            ctx.drawImage(shin, hipX - shin.width / 2, kneeY, shin.width, shin.height);
            ctx.fillStyle = '#e8e6e3';
            ctx.font = '11px monospace';
            ctx.fillText('paper doll: head+torso(+trunks)+arm+leg, facing right', 8, 16);
            return window.WC.toDataURL(out);
        }, { headUrl, partUrls });
        fs.writeFileSync(path.join(DEFAULT_QA_DIR, 'paper_doll.png'), Buffer.from(dollUrl.split(',')[1], 'base64'));
    } else {
        report.paperDollSkipped = 'head.png not found at ' + headPath;
    }

    await browser.close();

    fs.writeFileSync(path.join(DEFAULT_QA_DIR, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}

async function buildSimplePart(page, sourceDataUrl, spec, label) {
    const res = await page.evaluate(async ({ dataUrl, spec, pivotRows, padSides, padBottom, label }) => {
        const canvas = await window.WC.loadImage(dataUrl);
        const pivot = window.WC.pivotCrop(canvas, pivotRows);
        const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, padSides, padBottom);
        const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 3, label);
        return {
            finalDataUrl: window.WC.toDataURL(flushed.canvas),
            qaDataUrl: window.WC.toDataURL(qa),
            pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
            leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
            drawW: flushed.drawW, drawH: flushed.drawH,
        };
    }, { dataUrl: sourceDataUrl, spec, pivotRows: PIVOT_ROWS, padSides: PAD_SIDES, padBottom: PAD_BOTTOM, label });
    return res;
}

main().catch(e => { console.error(e); process.exit(1); });
