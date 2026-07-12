#!/usr/bin/env node
// process-parts.mjs — turns rough hand-cut body-part PNGs into spec-compliant
// wrestler textures (head, torso, upper_arm, forearm, thigh, shin) per
// DRAWING_GUIDE.md. Drives headless Chrome via playwright-core and does all
// raster math with canvas 2D in the page context — no PIL, no pngjs, no
// image-processing npm deps.
//
// Usage:
//   node tools/wrestler-cutter/process-parts.mjs [character]
//
// Adding a new character: add an entry to CHARACTERS below pointing at its
// source PNGs and destination folder. Two source shapes are supported:
//   - Composite characters (george): torso+trunks and shin+foot are drawn as
//     separate layers and composited by the pipeline (see `composites`).
//   - Simple characters (thesz): each of the six parts is a single
//     already-complete source layer (trunks baked into torso, boot baked
//     into shin) — no composite step, just clean/rotate/crop/scale.
// Facing: George's whole source sheet was drawn facing left, so every part
// flips (`flip: 'all'`). A character can instead face right per-part already
// and only need specific parts mirrored — pass `flip` as a map of source key
// -> boolean (thesz: only the boot-bearing shin layer is mirrored).
// The pipeline itself (alpha audit → mask → speck removal → flip → rotate →
// composite → cap flatten → pivot crop → scale/flush) is character-agnostic.
//
// Processing order (see DRAWING_GUIDE.md + the session brief this was built
// against):
//   1. Alpha audit — flag sources with no real alpha (opaque white bg) and
//      fall back to near-white keying, loudly.
//   2. Content mask — alpha > ALPHA_THRESHOLD counts as content.
//   3. Speck removal — connected components, drop any < 1% of the largest.
//   4. Facing flip — per-character/per-part config (see above).
//   5. Forearm rotation — PCA-align the forearm's long axis to vertical,
//      fist down, elbow up.
//   6. Composites (composite characters only) — torso+trunks, shin+foot
//      (underlay drawn behind).
//   7. Opaque-cap flattening — forearm/shin only, shave the top until it's a
//      flat opaque joint-cover. For a shin with the boot already baked into
//      the same source layer (no separate foot file to scope against), the
//      pipeline finds the ankle "pinch" (local width minimum) between the
//      knee cap search start and the boot flare, and scopes the cap search
//      to above it — the boot is not the joint this cap covers.
//   8. Pivot-centered crop — symmetric around the opaque x-center of the
//      PIVOT_ROWS rows nearest the pivot edge (top for torso/upper_arm/
//      forearm/thigh/shin, bottom — the neck — for head), NOT the bbox
//      center. Hair/hands/boots skew the bbox; they must not skew the pivot.
//   9. Scale + flush — fit target canvas, pivot edge flush (y=0 for top-
//      pivot parts, y=targetH for bottom-pivot parts like head).
//  10. Write PNGs + QA images.

import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const GEORGE_QA_DIR = '/private/tmp/claude-501/-Users-home-Documents-urworthy/8cbc67d6-398e-45d9-a9e4-a5f9b95bae03/scratchpad/george-art/qa';
const THESZ_QA_DIR = '/private/tmp/claude-501/-Users-home-Documents-urworthy/8cbc67d6-398e-45d9-a9e4-a5f9b95bae03/scratchpad/thesz-art/qa';

const CHARACTERS = {
    george: {
        srcDir: '/Users/home/Documents/wrestling-from-marigold/Sprite sheets/GeorgeParts',
        destDir: path.join(REPO_ROOT, 'src/assets/wrestlers/george'),
        qaDir: GEORGE_QA_DIR,
        sourceKeys: ['head', 'torso', 'trunks', 'upperArm', 'forearm', 'thigh', 'shin', 'foot'],
        files: {
            head: 'georgehead2.png',
            torso: 'torso3.png',
            trunks: 'Trunks.png',
            upperArm: 'L_Arm_Upper.png',
            forearm: 'L_Arm_Lower.png',
            thigh: 'L_Leg_Upper.png',
            shin: 'L_Leg_Lower.png',
            foot: 'L_Foot.png',
        },
        // Whole source sheet was drawn facing left.
        flip: 'all',
        // torso3.png has trunks hand-drawn into the same layer (Derek,
        // 2026-07-12 — the algorithmic Trunks.png composite read like a
        // diaper) — no separate trunks composite for torso anymore.
        composites: { shin: 'foot' },
    },
    thesz: {
        srcDir: '/Users/home/Downloads/louThesz',
        destDir: path.join(REPO_ROOT, 'src/assets/wrestlers/thesz'),
        qaDir: THESZ_QA_DIR,
        sourceKeys: ['head', 'torso', 'upperArm', 'forearm', 'thigh', 'shin'],
        files: {
            head: 'head.png',
            torso: 'torso.png',
            upperArm: 'upper arm.png',
            forearm: 'LowerArm.png',
            thigh: 'upperLeg.png',
            shin: 'LowerLeg.png',
        },
        // All parts including the shin's baked-in boot already face right in
        // the source art (Derek, 2026-07-12 — the earlier `shin: true` flip
        // here was based on a misread of the source at a tiny preview scale;
        // a tight crop on the boot's actual content bbox showed the toe
        // already pointing right, so flipping it was backward — the boot
        // was reading mirrored in-game).
        flip: {},
        // Trunks are already baked into torso, the boot into shin — no
        // composite step this round.
        composites: {},
    },
};

const PART_SPECS = {
    head:      { w: 200, h: 200, opaqueCap: false, pivotEdge: 'bottom' },
    torso:     { w: 190, h: 260, opaqueCap: false, pivotEdge: 'top' },
    upper_arm: { w: 130, h: 160, opaqueCap: false, pivotEdge: 'top' },
    forearm:   { w: 130, h: 190, opaqueCap: true,  pivotEdge: 'top' },
    thigh:     { w: 150, h: 150, opaqueCap: false, pivotEdge: 'top' },
    shin:      { w: 150, h: 230, opaqueCap: true,  pivotEdge: 'top' },
};

const ALPHA_THRESHOLD = 10;
const SPECK_AREA_FRAC = 0.01;
const NEAR_WHITE = 250;
const OPAQUE_CAP_MIN_FRAC = 0.6;
// Flatten to a stricter target at source scale: bicubic downsampling softens
// the top row's edges, costing ~10% of the opaque run width in the final
// PNG. 0.72 at source keeps the final comfortably above the 0.6 spec floor.
const OPAQUE_CAP_FLATTEN_FRAC = 0.72;
const PIVOT_ROWS = 8;
// Trunks scale relative to the waistband width. Round 1 used 1.08 which read
// as a narrow apron below the waistband; the director's round-2 pick from the
// 1.15 / 1.25 / 1.35 candidate sheet (see trunks_candidates.png in the QA dir)
// is set here. Candidates are still generated on every run for review.
const TRUNKS_WIDTH_MULT = 1.25;
const TRUNKS_CANDIDATE_MULTS = [1.15, 1.25, 1.35];
// Deep tuck: the trunks' own dark top band must hide completely behind the
// torso's waistband (no gap, no double band).
const TRUNKS_OVERLAP_PX = 24;
const SHIN_OVERLAP_PX = 12;
// Content fills the canvas height exactly (see scaleFlush); a small horizontal
// safety margin keeps antialiased edges off the texture border.
const SIDE_SAFETY = 2;
// Shin ankle-pinch search window (fraction of the shin's own content height)
// for characters whose boot is already baked into the shin source layer —
// see findNarrowestRow below.
const ANKLE_SEARCH_START_FRAC = 0.15;
const ANKLE_SEARCH_END_FRAC = 0.65;

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

  // Bakes real alpha into the canvas. For sources with a real alpha channel
  // this is a no-op. For keyed (opaque white background) sources it does
  // three passes:
  //   1. hard key: all channels >= NEAR_WHITE -> alpha 0
  //   2. alpha decontamination of the fringe: content pixels near the
  //      background are white-blended (obs = a*ink + (1-a)*255). Estimate a
  //      against the darkest nearby core pixel's luminance, then recover the
  //      un-blended color as (rgb - (1-a)*255)/a, clamped. This kills the
  //      white halo plain keying leaves against dark game backgrounds.
  //   3. tiny alpha-island cleanup: connected alpha>0 clusters smaller than
  //      a few px (keying survivors / scan dust) are dropped outright.
  // Returns { decontaminated, extendedKeyed, speckPixelsDropped, speckIslandsDropped }.
  function bakeAlpha(canvas, needsKeying) {
    if (!needsKeying) return { decontaminated: 0, extendedKeyed: 0, speckPixelsDropped: 0, speckIslandsDropped: 0 };
    const ctx = ctxOf(canvas);
    const w = canvas.width, h = canvas.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;

    // pass 1: hard key
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] >= NEAR_WHITE && d[i+1] >= NEAR_WHITE && d[i+2] >= NEAR_WHITE) d[i+3] = 0;
    }

    const lum = p => 0.299 * d[p*4] + 0.587 * d[p*4+1] + 0.114 * d[p*4+2];
    const isBg = p => d[p*4+3] === 0;

    // fringe band: content pixels within 2px (chebyshev) of background
    const band = [];
    const inBand = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (isBg(p)) continue;
        let nearBg = false;
        for (let dy = -2; dy <= 2 && !nearBg; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) { nearBg = true; break; }
            if (isBg(ny * w + nx)) { nearBg = true; break; }
          }
        }
        if (nearBg) { band.push(p); inBand[p] = 1; }
      }
    }

    // pass 2: decontaminate the band
    let decontaminated = 0, extendedKeyed = 0;
    const FRINGE_L_MIN = 245;   // this light in the band -> just background residue
    const INK_FALLBACK_L = 30;  // assume black outline if no core neighbor found
    for (const p of band) {
      const x = p % w, y = (p / w) | 0;
      const L = lum(p);
      if (L >= FRINGE_L_MIN) { d[p*4+3] = 0; extendedKeyed++; continue; }
      // darkest core (non-band, non-bg) pixel in the 7x7 neighborhood is the
      // best guess at the ink this fringe pixel was blended from
      let coreL = null;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const np = ny * w + nx;
          if (isBg(np) || inBand[np]) continue;
          const nL = lum(np);
          if (coreL === null || nL < coreL) coreL = nL;
        }
      }
      if (coreL === null) coreL = INK_FALLBACK_L;
      if (coreL > 240) continue; // core is itself near-white: nothing sane to recover
      const a = Math.min(1, Math.max(0, (255 - L) / (255 - coreL)));
      if (a >= 0.98) continue;   // effectively solid ink already
      if (a <= 0.02) { d[p*4+3] = 0; extendedKeyed++; continue; }
      for (let c = 0; c < 3; c++) {
        const rec = (d[p*4+c] - (1 - a) * 255) / a;
        d[p*4+c] = Math.max(0, Math.min(255, Math.round(rec)));
      }
      d[p*4+3] = Math.round(a * 255);
      decontaminated++;
    }

    // pass 3: drop tiny alpha>0 islands (keying survivors / scan dust)
    const MAX_SPECK = 8;
    const visited = new Uint8Array(w * h);
    let speckPixelsDropped = 0, speckIslandsDropped = 0;
    const stack = [];
    for (let start = 0; start < w * h; start++) {
      if (visited[start] || d[start*4+3] === 0) continue;
      const px = [];
      stack.length = 0;
      stack.push(start);
      visited[start] = 1;
      while (stack.length) {
        const p = stack.pop();
        px.push(p);
        const x = p % w, y = (p / w) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const np = ny * w + nx;
            if (!visited[np] && d[np*4+3] > 0) { visited[np] = 1; stack.push(np); }
          }
        }
      }
      if (px.length <= MAX_SPECK) {
        for (const p of px) d[p*4+3] = 0;
        speckPixelsDropped += px.length;
        speckIslandsDropped++;
      }
    }

    ctx.putImageData(id, 0, 0);
    return { decontaminated, extendedKeyed, speckPixelsDropped, speckIslandsDropped };
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

  // Y (within [yStart,yEnd]) of the row with minimum content width — used to
  // find the ankle "pinch" separating a shin from a boot that's already
  // baked into the same source layer (no separate foot file to scope
  // against, unlike the composite-character path). The cap-flatten search
  // must not run into the boot's much wider silhouette below this point.
  function findNarrowestRow(canvas, yStart, yEnd) {
    let bestY = yStart, bestWidth = Infinity;
    for (let y = yStart; y <= yEnd; y++) {
      const r = rowStats(canvas, y);
      if (r && r.width < bestWidth) { bestWidth = r.width; bestY = y; }
    }
    return { y: bestY, width: bestWidth };
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
  // looks — for a composited part (shin+foot), or a shin whose boot is baked
  // into the same source layer, the joint-cap rule is about the shin's OWN
  // cross-section at the knee, not the much wider boot body further down the
  // same canvas, so callers pass the shin's own pre-boot bottom edge here
  // (from the pre-composite source, or from findNarrowestRow's ankle pinch).
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

  // Pivot x = opaque x-center of the PIVOT_ROWS content rows nearest the
  // pivot edge — the top rows for a joint pivot (torso/upper_arm/forearm/
  // thigh/shin), or the bottom rows (the neck) for the head, whose pivot
  // sits at canvas bottom. Crop window is symmetric around pivotX,
  // vertically spanning content top..bottom either way.
  function pivotCrop(canvas, pivotRows, edge) {
    edge = edge || 'top';
    const bbox = contentBBox(canvas);
    let wSum = 0, cSum = 0, n = 0;
    for (let i = 0; i < pivotRows; i++) {
      const y = edge === 'top' ? bbox.minY + i : bbox.maxY - i;
      if (y < bbox.minY || y > bbox.maxY) continue;
      const r = rowStats(canvas, y);
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

  // Fit croppedCanvas into targetW x targetH: pivot edge flush (y=0 for a
  // top pivot, y=targetH for a bottom pivot like the head), horizontally
  // centered (which centers the pivot since the crop is pivot-symmetric).
  //
  // The rig (Skeleton.js) maps the FULL canvas onto the bone span — canvas
  // top = pivot joint, canvas bottom = bone end (hip line for the torso,
  // elbow for the upper arm, ground line for the shin+boot). So the content
  // must FILL the canvas height exactly or the art falls short of the joint
  // and gaps open at the hips/elbows/knees in-game (this is exactly what
  // round 1's 20px bottom padding caused). Height-fill is the target; width
  // caps the scale when the art is proportionally too wide (shin+boot toe),
  // in which case fillFrac < 1 is reported and the rig's TEX display box
  // must compensate. The head's display size is a fixed rig constant
  // (headR-derived), not a TEX box, so its fillFrac just measures crop
  // tightness for QA — nothing downstream depends on it.
  function scaleFlush(croppedCanvas, targetW, targetH, sideSafety, edge) {
    edge = edge || 'top';
    const cropW = croppedCanvas.width, cropH = croppedCanvas.height;
    const availW = targetW - sideSafety * 2;
    const scale = Math.min(availW / cropW, targetH / cropH);
    const drawW = cropW * scale, drawH = cropH * scale;
    const dx = (targetW - drawW) / 2;
    const dy = edge === 'top' ? 0 : targetH - drawH;
    const out = newCanvas(targetW, targetH);
    ctxOf(out).drawImage(croppedCanvas, 0, 0, cropW, cropH, dx, dy, drawW, drawH);
    return {
      canvas: out, scale, drawW, drawH, dx, dy,
      leftPad: dx, rightPad: targetW - (dx + drawW),
      topPad: dy, bottomPad: targetH - (dy + drawH),
      fillFrac: drawH / targetH,
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
  function buildQA(croppedCanvas, finalCanvas, targetW, targetH, zoom, label, pivotEdge) {
    pivotEdge = pivotEdge || 'top';
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
    // crosshair at pivot (targetW/2, top or bottom edge)
    const px = (targetW / 2) * zoom;
    const py = pivotEdge === 'top' ? 0 : rightH;
    ctx.strokeStyle = '#5cc8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px - 10, py); ctx.lineTo(px + 10, py); ctx.stroke();
    ctx.beginPath();
    if (pivotEdge === 'top') { ctx.moveTo(px, 0); ctx.lineTo(px, 24); }
    else { ctx.moveTo(px, rightH - 24); ctx.lineTo(px, rightH); }
    ctx.stroke();
    ctx.restore();
    return out;
  }

  return {
    newCanvas, ctxOf, loadImage, alphaAudit, bakeAlpha, connectedComponents,
    dropSmallComponents, contentBBox, rowStats, flipHorizontal, darkBandWidth,
    edgeAverageWidth, findNarrowestRow, principalAngle, rotateAround, alignVerticalFistDown,
    flattenOpaqueCap, pivotCrop, scaleFlush, placeUnderlay, toDataURL,
    drawCheckerboard, buildQA,
  };
})();
`;

function dataUrlFromFile(p) {
    return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}

// ── Shared per-part builders (character-agnostic) ──────────────────────────

// upper_arm / thigh / head: pivot-crop then scale-flush, no rotation, no
// composite, no cap flatten. `spec.pivotEdge` selects top vs bottom pivot.
async function buildSimplePart(page, sourceDataUrl, spec, label) {
    const res = await page.evaluate(async ({ dataUrl, spec, pivotRows, sideSafety, label }) => {
        const edge = spec.pivotEdge || 'top';
        const canvas = await window.WC.loadImage(dataUrl);
        const pivot = window.WC.pivotCrop(canvas, pivotRows, edge);
        const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, sideSafety, edge);
        const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 4, label, edge);
        return {
            finalDataUrl: window.WC.toDataURL(flushed.canvas),
            qaDataUrl: window.WC.toDataURL(qa),
            pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
            leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
            drawW: flushed.drawW, drawH: flushed.drawH, fillFrac: flushed.fillFrac,
        };
    }, { dataUrl: sourceDataUrl, spec, pivotRows: PIVOT_ROWS, sideSafety: SIDE_SAFETY, label });
    return res;
}

// forearm: rotate to vertical fist-down, cap-flatten the elbow-joint top
// edge, then pivot-crop/scale-flush. No composite — same for every character.
async function buildForearmPart(page, cleanedForearmDataUrl, spec) {
    const res = await page.evaluate(async ({ dataUrl, spec, flattenFrac, pivotRows, sideSafety }) => {
        const canvas = await window.WC.loadImage(dataUrl);
        // Fist hint: the bottom-right-most content pixel. Sources are
        // cleaned (and, per-character, optionally flipped) so the fist ends
        // up at the diagonal's lower-right end before this step runs.
        const bbox = window.WC.contentBBox(canvas);
        const hintX = bbox.maxX, hintY = bbox.maxY;
        const rot = window.WC.alignVerticalFistDown(canvas, hintX, hintY);
        const cap = window.WC.flattenOpaqueCap(rot.canvas, flattenFrac);
        const pivot = window.WC.pivotCrop(rot.canvas, pivotRows, 'top');
        const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, sideSafety, 'top');
        const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 4, 'forearm', 'top');
        return {
            finalDataUrl: window.WC.toDataURL(flushed.canvas),
            qaDataUrl: window.WC.toDataURL(qa),
            rotationDeg: rot.phiDeg, thetaDeg: rot.thetaDeg, flipped180: rot.flipped180,
            capShaved: cap.shavedRows, capMaxWidth: cap.maxWidth, capFinalTopWidth: cap.finalTopWidth,
            pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
            leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
            drawW: flushed.drawW, drawH: flushed.drawH, fillFrac: flushed.fillFrac,
        };
    }, { dataUrl: cleanedForearmDataUrl, spec, flattenFrac: OPAQUE_CAP_FLATTEN_FRAC, pivotRows: PIVOT_ROWS, sideSafety: SIDE_SAFETY });
    return res;
}

// shin with NO separate foot source (boot already baked into the same
// layer): find the ankle pinch to scope the cap-flatten search away from the
// boot, then cap-flatten/pivot-crop/scale-flush exactly like the composite
// path's shin+foot result.
async function buildShinNoComposite(page, cleanedShinDataUrl, spec) {
    const res = await page.evaluate(async ({ dataUrl, spec, flattenFrac, pivotRows, sideSafety, searchStartFrac, searchEndFrac }) => {
        const canvas = await window.WC.loadImage(dataUrl);
        const bbox = window.WC.contentBBox(canvas);
        const h = bbox.maxY - bbox.minY + 1;
        const searchStart = bbox.minY + Math.round(h * searchStartFrac);
        const searchEnd = bbox.minY + Math.round(h * searchEndFrac);
        const pinch = window.WC.findNarrowestRow(canvas, searchStart, searchEnd);
        const cap = window.WC.flattenOpaqueCap(canvas, flattenFrac, pinch.y);
        const pivot = window.WC.pivotCrop(canvas, pivotRows, 'top');
        const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, sideSafety, 'top');
        const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 4, 'shin', 'top');
        // Where the ankle pinch (shin/boot boundary) ends up in the final
        // canvas's y-coordinates, so verification can scope its max-width
        // search the same way flattenOpaqueCap did.
        const ownRegionBottomYFinal = (pinch.y - pivot.cropY0) * flushed.scale + flushed.dy;
        return {
            finalDataUrl: window.WC.toDataURL(flushed.canvas), qaDataUrl: window.WC.toDataURL(qa),
            pinchY: pinch.y, pinchWidth: pinch.width,
            capShaved: cap.shavedRows, capMaxWidth: cap.maxWidth, capFinalTopWidth: cap.finalTopWidth,
            pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
            leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
            drawW: flushed.drawW, drawH: flushed.drawH, fillFrac: flushed.fillFrac, ownRegionBottomYFinal,
        };
    }, {
        dataUrl: cleanedShinDataUrl, spec, flattenFrac: OPAQUE_CAP_FLATTEN_FRAC, pivotRows: PIVOT_ROWS, sideSafety: SIDE_SAFETY,
        searchStartFrac: ANKLE_SEARCH_START_FRAC, searchEndFrac: ANKLE_SEARCH_END_FRAC,
    });
    return res;
}

async function main() {
    const slug = process.argv[2] || 'george';
    const char = CHARACTERS[slug];
    if (!char) throw new Error(`Unknown character "${slug}". Known: ${Object.keys(CHARACTERS).join(', ')}`);

    const qaDir = char.qaDir;
    fs.mkdirSync(char.destDir, { recursive: true });
    fs.mkdirSync(qaDir, { recursive: true });

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ content: BROWSER_LIB });

    const flipDescription = char.flip === 'all'
        ? 'all parts mirrored horizontally to face right'
        : 'per-part: ' + Object.entries(char.flip).filter(([, v]) => v).map(([k]) => k).join(', ') + ' mirrored; rest already face right';
    const report = { alphaAudit: {}, defringe: {}, droppedSpecks: {}, flip: flipDescription, flipApplied: {}, rotation: null, composites: {}, capFlatten: {}, pivotCrop: {}, finalPadding: {} };

    // ── Load + clean every source (mask, defringe, speck removal, flip) ───
    const cleaned = {};
    for (const key of char.sourceKeys) {
        const filePath = path.join(char.srcDir, char.files[key]);
        const dataUrl = dataUrlFromFile(filePath);
        const shouldFlip = char.flip === 'all' ? true : !!(char.flip && char.flip[key]);
        const result = await page.evaluate(async ({ dataUrl, fracThreshold, shouldFlip }) => {
            const canvas = await window.WC.loadImage(dataUrl);
            const audit = window.WC.alphaAudit(canvas);
            const defringe = window.WC.bakeAlpha(canvas, audit.needsKeying);
            const { keptCount, dropped } = window.WC.dropSmallComponents(canvas, fracThreshold);
            const finalCanvas = shouldFlip ? window.WC.flipHorizontal(canvas) : canvas;
            return { dataUrl: window.WC.toDataURL(finalCanvas), audit, defringe, keptCount, dropped };
        }, { dataUrl, fracThreshold: SPECK_AREA_FRAC, shouldFlip });
        cleaned[key] = result.dataUrl;
        report.alphaAudit[char.files[key]] = result.audit;
        report.defringe[char.files[key]] = result.defringe;
        report.droppedSpecks[char.files[key]] = result.dropped;
        report.flipApplied[key] = shouldFlip;
    }

    const outputs = {};

    // ── head (bottom-pivot, simple characters only) ────────────────────────
    if (char.files.head) {
        outputs.head = await buildSimplePart(page, cleaned.head, PART_SPECS.head, 'head');
        report.pivotCrop.head = { pivotX: outputs.head.pivotX, bboxCenterX: outputs.head.bboxCenterX, delta: outputs.head.pivotDelta };
        report.finalPadding.head = { leftPad: outputs.head.leftPad, rightPad: outputs.head.rightPad, bottomPad: outputs.head.bottomPad, drawW: outputs.head.drawW, drawH: outputs.head.drawH, fillFrac: outputs.head.fillFrac };
    }

    // ── upper_arm (single source, no composite/rotation) ───────────────────
    outputs.upper_arm = await buildSimplePart(page, cleaned.upperArm, PART_SPECS.upper_arm, 'upper_arm');
    report.pivotCrop.upper_arm = { pivotX: outputs.upper_arm.pivotX, bboxCenterX: outputs.upper_arm.bboxCenterX, delta: outputs.upper_arm.pivotDelta };
    report.finalPadding.upper_arm = { leftPad: outputs.upper_arm.leftPad, rightPad: outputs.upper_arm.rightPad, bottomPad: outputs.upper_arm.bottomPad, drawW: outputs.upper_arm.drawW, drawH: outputs.upper_arm.drawH, fillFrac: outputs.upper_arm.fillFrac };

    // ── forearm (rotate to vertical fist-down, then cap-flatten) — shared ──
    {
        const res = await buildForearmPart(page, cleaned.forearm, PART_SPECS.forearm);
        outputs.forearm = res;
        report.rotation = { forearm_thetaDeg: res.thetaDeg, forearm_rotationAppliedDeg: res.rotationDeg, flipped180ForFistDown: res.flipped180 };
        report.capFlatten.forearm = { shavedRows: res.capShaved, maxWidth: res.capMaxWidth, finalTopWidth: res.capFinalTopWidth };
        report.pivotCrop.forearm = { pivotX: res.pivotX, bboxCenterX: res.bboxCenterX, delta: res.pivotDelta };
        report.finalPadding.forearm = { leftPad: res.leftPad, rightPad: res.rightPad, bottomPad: res.bottomPad, drawW: res.drawW, drawH: res.drawH, fillFrac: res.fillFrac };
    }

    // ── thigh (single source, no composite/rotation) ───────────────────────
    outputs.thigh = await buildSimplePart(page, cleaned.thigh, PART_SPECS.thigh, 'thigh');
    report.pivotCrop.thigh = { pivotX: outputs.thigh.pivotX, bboxCenterX: outputs.thigh.bboxCenterX, delta: outputs.thigh.pivotDelta };
    report.finalPadding.thigh = { leftPad: outputs.thigh.leftPad, rightPad: outputs.thigh.rightPad, bottomPad: outputs.thigh.bottomPad, drawW: outputs.thigh.drawW, drawH: outputs.thigh.drawH, fillFrac: outputs.thigh.fillFrac };

    // ── torso ────────────────────────────────────────────────────────────
    if (char.composites.torso) {
        // torso = Torso + Trunks composite. Builds one final canvas per
        // candidate width multiplier plus the chosen one; the candidates go
        // into a side-by-side comparison sheet in the QA dir so the trunks
        // scale can be judged against the torso silhouette.
        const res = await page.evaluate(async ({ torsoUrl, trunksUrl, spec, widthMult, candidateMults, overlapPx, pivotRows, sideSafety }) => {
            const torso = await window.WC.loadImage(torsoUrl);
            const trunks = await window.WC.loadImage(trunksUrl);
            const torsoBBox = window.WC.contentBBox(torso);
            const searchStart = torsoBBox.minY + Math.round((torsoBBox.maxY - torsoBBox.minY) * 0.65);
            const band = window.WC.darkBandWidth(torso, searchStart, torsoBBox.maxY, 0.5);
            const trunksBBox = window.WC.contentBBox(trunks);
            const trunksRefWidth = trunksBBox.maxX - trunksBBox.minX + 1;
            const trunksRefXCenter = (trunksBBox.minX + trunksBBox.maxX) / 2;

            const build = (mult) => {
                const placed = window.WC.placeUnderlay({
                    baseCanvas: torso, baseEdgeY: torsoBBox.maxY, baseWidthAtEdge: band.width, baseXCenterAtEdge: band.xCenter,
                    underlayCanvas: trunks, underlayBBox: trunksBBox, underlayRefWidth: trunksRefWidth, underlayRefXCenter: trunksRefXCenter,
                    widthMultiplier: mult, overlapPx,
                });
                const pivot = window.WC.pivotCrop(placed.canvas, pivotRows, 'top');
                const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, sideSafety, 'top');
                return { placed, pivot, flushed };
            };

            // candidate comparison sheet (3x zoom, dark checker behind each)
            const zoom = 3, gap = 30, labelH = 26;
            const sheet = window.WC.newCanvas(
                candidateMults.length * (spec.w * zoom + gap) + gap,
                spec.h * zoom + labelH + 16);
            const sctx = window.WC.ctxOf(sheet);
            sctx.fillStyle = '#1b1b1f';
            sctx.fillRect(0, 0, sheet.width, sheet.height);
            candidateMults.forEach((mult, i) => {
                const { flushed } = build(mult);
                const ox = gap + i * (spec.w * zoom + gap);
                sctx.fillStyle = '#e8e6e3';
                sctx.font = '16px monospace';
                sctx.fillText(mult.toFixed(2) + 'x waistband' + (mult === widthMult ? '  <-- CHOSEN' : ''), ox, 18);
                sctx.save(); sctx.translate(ox, labelH);
                window.WC.drawCheckerboard(sctx, spec.w * zoom, spec.h * zoom, 12);
                sctx.drawImage(flushed.canvas, 0, 0, spec.w, spec.h, 0, 0, spec.w * zoom, spec.h * zoom);
                sctx.restore();
            });

            const { placed, pivot, flushed } = build(widthMult);
            const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 4, 'torso', 'top');
            const uncomposited = window.WC.toDataURL(torso);
            return {
                finalDataUrl: window.WC.toDataURL(flushed.canvas), qaDataUrl: window.WC.toDataURL(qa),
                candidatesDataUrl: window.WC.toDataURL(sheet), uncompositedDataUrl: uncomposited,
                waistbandWidth: band.width, waistbandY: band.y, waistbandXCenter: band.xCenter,
                trunksRefWidth, trunksRefXCenter, scale: placed.scale, dx: placed.dx, dy: placed.dy, dw: placed.dw, dh: placed.dh,
                pivotX: pivot.pivotX, bboxCenterX: pivot.bboxCenterX, pivotDelta: pivot.delta,
                leftPad: flushed.leftPad, rightPad: flushed.rightPad, bottomPad: flushed.bottomPad,
                drawW: flushed.drawW, drawH: flushed.drawH, fillFrac: flushed.fillFrac,
            };
        }, { torsoUrl: cleaned.torso, trunksUrl: cleaned.trunks, spec: PART_SPECS.torso, widthMult: TRUNKS_WIDTH_MULT, candidateMults: TRUNKS_CANDIDATE_MULTS, overlapPx: TRUNKS_OVERLAP_PX, pivotRows: PIVOT_ROWS, sideSafety: SIDE_SAFETY });
        outputs.torso = res;
        report.composites.torso_trunks = {
            waistbandWidth: res.waistbandWidth, waistbandRow: res.waistbandY, waistbandXCenter: res.waistbandXCenter,
            trunksContentWidth: res.trunksRefWidth, trunksXCenter: res.trunksRefXCenter,
            appliedScale: res.scale, placedAt: { dx: res.dx, dy: res.dy, dw: res.dw, dh: res.dh },
        };
        fs.writeFileSync(path.join(qaDir, 'trunks_candidates.png'), Buffer.from(res.candidatesDataUrl.split(',')[1], 'base64'));
        fs.writeFileSync(path.join(qaDir, 'uncomposited_torso.png'), Buffer.from(res.uncompositedDataUrl.split(',')[1], 'base64'));
    } else {
        // Trunks already baked into the torso source layer — no composite.
        outputs.torso = await buildSimplePart(page, cleaned.torso, PART_SPECS.torso, 'torso');
    }
    report.pivotCrop.torso = { pivotX: outputs.torso.pivotX, bboxCenterX: outputs.torso.bboxCenterX, delta: outputs.torso.pivotDelta };
    report.finalPadding.torso = { leftPad: outputs.torso.leftPad, rightPad: outputs.torso.rightPad, bottomPad: outputs.torso.bottomPad, drawW: outputs.torso.drawW, drawH: outputs.torso.drawH, fillFrac: outputs.torso.fillFrac };

    // ── shin ─────────────────────────────────────────────────────────────
    if (char.composites.shin) {
        // shin = L_Leg_Lower + L_Foot composite, then cap-flatten.
        const res = await page.evaluate(async ({ shinUrl, footUrl, spec, overlapPx, flattenFrac, pivotRows, sideSafety }) => {
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
            const cap = window.WC.flattenOpaqueCap(placed.canvas, flattenFrac, shinBBox.maxY);
            const pivot = window.WC.pivotCrop(placed.canvas, pivotRows, 'top');
            const flushed = window.WC.scaleFlush(pivot.canvas, spec.w, spec.h, sideSafety, 'top');
            const qa = window.WC.buildQA(pivot.canvas, flushed.canvas, spec.w, spec.h, 4, 'shin', 'top');
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
                drawW: flushed.drawW, drawH: flushed.drawH, fillFrac: flushed.fillFrac, ownRegionBottomYFinal,
            };
        }, { shinUrl: cleaned.shin, footUrl: cleaned.foot, spec: PART_SPECS.shin, overlapPx: SHIN_OVERLAP_PX, flattenFrac: OPAQUE_CAP_FLATTEN_FRAC, pivotRows: PIVOT_ROWS, sideSafety: SIDE_SAFETY });
        outputs.shin = res;
        report.composites.shin_foot = {
            cuffWidth: res.cuffWidth, cuffRow: res.cuffY, shinBottomRowXCenter: res.bottomRowXCenter,
            footAnkleWidth: res.ankleWidth, footAnkleXCenter: res.ankleXCenter,
            appliedScale: res.scale, placedAt: { dx: res.dx, dy: res.dy, dw: res.dw, dh: res.dh },
        };
        fs.writeFileSync(path.join(qaDir, 'uncomposited_shin.png'), Buffer.from(res.uncompositedDataUrl.split(',')[1], 'base64'));
    } else {
        // Boot already baked into the shin source layer — no composite, but
        // the cap-flatten search still needs to be scoped away from it.
        outputs.shin = await buildShinNoComposite(page, cleaned.shin, PART_SPECS.shin);
        report.ankleP = { pinchY: outputs.shin.pinchY, pinchWidth: outputs.shin.pinchWidth };
    }
    report.capFlatten.shin = { shavedRows: outputs.shin.capShaved, maxWidth: outputs.shin.capMaxWidth, finalTopWidth: outputs.shin.capFinalTopWidth };
    report.pivotCrop.shin = { pivotX: outputs.shin.pivotX, bboxCenterX: outputs.shin.bboxCenterX, delta: outputs.shin.pivotDelta };
    report.finalPadding.shin = { leftPad: outputs.shin.leftPad, rightPad: outputs.shin.rightPad, bottomPad: outputs.shin.bottomPad, drawW: outputs.shin.drawW, drawH: outputs.shin.drawH, fillFrac: outputs.shin.fillFrac };

    // ── write final PNGs to destDir ─────────────────────────────────────────
    const partNames = ['torso', 'upper_arm', 'forearm', 'thigh', 'shin', ...(char.files.head ? ['head'] : [])];
    for (const name of partNames) {
        const b64 = outputs[name].finalDataUrl.split(',')[1];
        fs.writeFileSync(path.join(char.destDir, `${name}.png`), Buffer.from(b64, 'base64'));
    }

    // ── verification pass: exact spec dims, opaque content present, cap
    //    rule holds, nothing touches the left/right/bottom edges ───────────
    report.verification = {};
    let verificationOk = true;
    for (const name of partNames) {
        const spec = PART_SPECS[name];
        const edge = spec.pivotEdge || 'top';
        const filePath = path.join(char.destDir, `${name}.png`);
        const dataUrl = dataUrlFromFile(filePath);
        // For shin, scope the max-width search to its own (pre-boot) region
        // — same reasoning as flattenOpaqueCap: the boot is much wider than
        // the shin and isn't the joint this cap is covering.
        const maxWidthSearchYEnd = name === 'shin' ? outputs.shin.ownRegionBottomYFinal : null;
        const v = await page.evaluate(async ({ dataUrl, spec, minFrac, maxWidthSearchYEnd, edge }) => {
            const canvas = await window.WC.loadImage(dataUrl);
            const dimsOk = canvas.width === spec.w && canvas.height === spec.h;
            const bbox = window.WC.contentBBox(canvas);
            const hasContent = !!bbox;
            // sides must stay off the texture border (bleed safety); the
            // PIVOT edge is the opposite — the rig maps that edge to the
            // joint/bone-end, so content should reach it (within a couple
            // px) whenever the part isn't width-limited (fillFrac < 1).
            const sidesFree = bbox ? (bbox.minX > 0 && bbox.maxX < canvas.width - 1) : false;
            const pivotFlush = bbox ? (edge === 'top' ? bbox.minY === 0 : bbox.maxY === canvas.height - 1) : false;
            let capOk = true, capTopWidth = null, capMaxWidth = null;
            if (spec.opaqueCap && bbox) {
                const topRow = window.WC.rowStats(canvas, bbox.minY);
                const searchEnd = maxWidthSearchYEnd != null ? Math.min(bbox.maxY, Math.round(maxWidthSearchYEnd)) : bbox.maxY;
                let maxWidth = 0;
                for (let y = bbox.minY; y <= searchEnd; y++) {
                    const r = window.WC.rowStats(canvas, y);
                    if (r && r.width > maxWidth) maxWidth = r.width;
                }
                // The joint-cover width that matters is the longest
                // CONTIGUOUS effectively-opaque run in the top row — that's
                // the strip that actually hides the elbow/knee seam.
                // Threshold 240, not 255: source art is itself painted at
                // near-solid alpha, and bicubic resampling shaves a few more
                // units; 240+ is indistinguishable from solid on screen.
                let runWidth = 0;
                if (topRow) {
                    const ctx = window.WC.ctxOf(canvas);
                    const rowData = ctx.getImageData(topRow.minX, bbox.minY, topRow.width, 1).data;
                    let run = 0;
                    for (let i = 0; i < topRow.width; i++) {
                        if (rowData[i * 4 + 3] >= 240) { run++; if (run > runWidth) runWidth = run; }
                        else run = 0;
                    }
                }
                capTopWidth = runWidth;
                capMaxWidth = maxWidth;
                capOk = maxWidth > 0 && (runWidth / maxWidth) >= minFrac;
            }
            return { w: canvas.width, h: canvas.height, dimsOk, hasContent, sidesFree, pivotFlush, bbox, capOk, capTopWidth, capMaxWidth };
        }, { dataUrl, spec, minFrac: OPAQUE_CAP_MIN_FRAC, maxWidthSearchYEnd, edge });
        // pivot-edge flush required unless the part is width-limited
        // (fillFrac<1, i.e. the art physically can't reach the far edge at
        // legal width)
        const expectedEdgePos = edge === 'top'
            ? Math.round(spec.h * outputs[name].fillFrac) - 1
            : spec.h - Math.round(spec.h * outputs[name].fillFrac);
        const contentEdgeOk = v.bbox
            ? (edge === 'top' ? Math.abs(v.bbox.maxY - expectedEdgePos) <= 2 : Math.abs(v.bbox.minY - expectedEdgePos) <= 2)
            : false;
        const pass = v.dimsOk && v.hasContent && v.sidesFree && v.pivotFlush && contentEdgeOk && v.capOk;
        report.verification[name] = { ...v, contentEdgeOk, expectedEdgePos, fillFrac: outputs[name].fillFrac, pass };
        if (!pass) verificationOk = false;
    }
    report.verificationOk = verificationOk;
    if (!verificationOk) {
        console.error('VERIFICATION FAILED:', JSON.stringify(report.verification, null, 2));
    }

    // ── write QA images to scratchpad ───────────────────────────────────────
    for (const name of partNames) {
        const qaB64 = outputs[name].qaDataUrl.split(',')[1];
        fs.writeFileSync(path.join(qaDir, `qa_${name}.png`), Buffer.from(qaB64, 'base64'));
    }

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
        fs.writeFileSync(path.join(qaDir, 'paper_doll.png'), Buffer.from(dollUrl.split(',')[1], 'base64'));
    } else {
        report.paperDollSkipped = 'head.png not found at ' + headPath;
    }

    await browser.close();

    fs.writeFileSync(path.join(qaDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
