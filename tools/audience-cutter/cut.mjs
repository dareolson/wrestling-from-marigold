#!/usr/bin/env node
// Cuts a chroma-keyed (green-screen) multi-frame reaction sheet into
// individual transparent PNG frames for a named crowd "extra" — see
// Arena.js's crowdFans system. This is NOT the wrestler rig pipeline
// (tools/wrestler-cutter) — these are flat multi-frame sprites, not jointed
// body parts, so there's no pivot/rotation/composite step: just chroma-key,
// split on content gaps, crop.
//
// Usage:
//   node tools/audience-cutter/cut.mjs <sourcePng> <slug>
//
// Reads <sourcePng> (a horizontal strip of N poses on a flat green-screen
// background, e.g. "Sprite sheets/Audience/oldman.png" — that folder is
// gitignored, only cut output is committed), auto-detects frame count from
// transparent-column gaps after keying, downscales to MAX_FRAME_HEIGHT (see
// below), and writes src/assets/audience/<slug>/frame1.png .. frameN.png.
// Also writes a QA preview (all frames on a dark backdrop) to
// tools/audience-cutter/_qa/ (gitignored) so the cut can be eyeballed before
// wiring a frame count into Arena.js (OLDMAN_FRAMES et al).
//
// Downscaling uses ONE shared scale factor per invocation — computed from
// this sheet's own TALLEST cropped frame, applied uniformly to every frame
// — never a per-frame independent fit to MAX_FRAME_HEIGHT. A sit→stand
// character's frames are naturally different native heights (that
// difference IS the growth signal Arena.js's sizeBasis:'height' relies on);
// fitting each frame to MAX_FRAME_HEIGHT independently would flatten every
// frame taller than the cap to exactly the same output height, erasing that
// signal (found 2026-07-17 debugging the photographer extra never visibly
// standing — root cause, not just his case: any character with more than
// one over-cap frame in the same sheet had this problem).
//
// For a two-sheet character (sheet A calm, sheet B builds to standing —
// the usual merge pattern, frame5 renumbered from sheet B's frame1), the
// two sheets are cut in SEPARATE invocations and each would otherwise
// compute its own local scale — inconsistent with each other, causing a
// visible size jump right at the sheet seam. Pass --scale=<factor> on the
// SECOND invocation using the value the FIRST invocation printed (or vice
// versa, whichever sheet has the globally tallest frame) so both sheets
// share one scale and the full 8-frame sequence's heights stay consistent.
//
// Usage:
//   node tools/audience-cutter/cut.mjs <sourcePng> <slug> [--scale=0.502]

import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const QA_DIR = path.join(__dirname, '_qa');

// Source reference sheets are cropped at whatever resolution Derek draws
// them at (~600-750px tall); Arena.js's CROWD_EXTRAS never renders an extra
// taller than spot.h, and no spot has gone above 140px. 360px gives ~2.5x
// headroom over that (retina-ish) while cutting a typical frame's file size
// by 70-80% versus shipping the raw crop — every extra's frames were
// loading 5-7x more pixels than ever get displayed. Never upscale a frame
// that's already smaller than this.
const MAX_FRAME_HEIGHT = 360;

const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));
const scaleFlag = process.argv.find(a => a.startsWith('--scale='));
const [srcArg, slugArg] = positional;
if (!srcArg || !slugArg) {
    console.log('usage: node tools/audience-cutter/cut.mjs <sourcePng> <slug> [--scale=0.502]');
    process.exit(1);
}
const FORCED_SCALE = scaleFlag ? parseFloat(scaleFlag.split('=')[1]) : null;
const SRC = path.resolve(REPO_ROOT, srcArg);
const SLUG = slugArg;
const DEST_DIR = path.join(REPO_ROOT, 'src/assets/audience', SLUG);

const BROWSER_LIB = `
window.CUT = (function () {
  function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctxOf(c) { const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; return ctx; }
  async function loadImage(dataUrl) {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const c = newCanvas(img.naturalWidth, img.naturalHeight);
    ctxOf(c).drawImage(img, 0, 0);
    return c;
  }

  // Chroma-key a green-screen canvas in place: distance-based key + feather
  // + spill suppression on remaining edge pixels.
  function chromaKeyGreen(canvas) {
    const ctx = ctxOf(canvas);
    const w = canvas.width, h = canvas.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    // key color = average of the 4 corners
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
    let kr = 0, kg = 0, kb = 0;
    for (const p of corners) { kr += d[p]; kg += d[p + 1]; kb += d[p + 2]; }
    kr /= 4; kg /= 4; kb /= 4;

    const LOW = 60, HIGH = 140; // distance thresholds (feather band)
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
      let a = 255;
      if (dist < LOW) a = 0;
      else if (dist < HIGH) a = Math.round(255 * (dist - LOW) / (HIGH - LOW));
      d[i + 3] = a;
      // spill suppression on surviving pixels: clamp green to the r/b average
      // when it's still the dominant channel (green-tinted edge fringe)
      if (a > 0 && g > r && g > b) {
        const cap = (r + b) / 2;
        d[i + 1] = Math.round(cap + (g - cap) * 0.15);
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  function columnHasContent(canvas, x, alphaThreshold) {
    const ctx = ctxOf(canvas);
    const { data } = ctx.getImageData(x, 0, 1, canvas.height);
    for (let i = 3; i < data.length; i += 4) if (data[i] > alphaThreshold) return true;
    return false;
  }

  // Splits a keyed canvas into N horizontal runs of content separated by
  // fully-transparent gap columns. Returns array of {minX,maxX} column ranges.
  function splitIntoRuns(canvas, alphaThreshold) {
    const w = canvas.width;
    const runs = [];
    let inRun = false, runStart = 0;
    for (let x = 0; x < w; x++) {
      const has = columnHasContent(canvas, x, alphaThreshold);
      if (has && !inRun) { inRun = true; runStart = x; }
      if (!has && inRun) { inRun = false; runs.push({ minX: runStart, maxX: x - 1 }); }
    }
    if (inRun) runs.push({ minX: runStart, maxX: w - 1 });
    return runs;
  }

  function cropWithPadding(canvas, run, alphaThreshold, pad) {
    const ctx = ctxOf(canvas);
    const h = canvas.height;
    const rw = run.maxX - run.minX + 1;
    const { data } = ctx.getImageData(run.minX, 0, rw, h);
    let minY = h, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < rw; x++) {
      if (data[(y * rw + x) * 4 + 3] > alphaThreshold) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    const x0 = Math.max(0, run.minX - pad), x1 = Math.min(canvas.width - 1, run.maxX + pad);
    const y0 = Math.max(0, minY - pad), y1 = Math.min(h - 1, maxY + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const out = newCanvas(cw, ch);
    ctxOf(out).drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
    return out;
  }

  function toDataURL(c) { return c.toDataURL('image/png'); }

  // Scales a canvas by a fixed factor (never upscales — scale is expected
  // pre-clamped to <=1). High-quality smoothing is already the default per
  // ctxOf. Unlike the old per-frame capHeight, the caller computes ONE scale
  // for the whole batch so relative frame-to-frame height differences (the
  // sit->stand growth signal) survive the downscale — see the file-header
  // comment for why a per-frame-independent fit-to-maxH broke that.
  function scaleCanvas(canvas, scale) {
    if (scale >= 1) return canvas;
    const out = newCanvas(Math.round(canvas.width * scale), Math.round(canvas.height * scale));
    ctxOf(out).drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  }

  return { loadImage, chromaKeyGreen, splitIntoRuns, cropWithPadding, scaleCanvas, toDataURL, newCanvas, ctxOf };
})();
`;

function dataUrlFromFile(p) { return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); }

async function main() {
    fs.mkdirSync(DEST_DIR, { recursive: true });
    fs.mkdirSync(QA_DIR, { recursive: true });

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ content: BROWSER_LIB });

    const dataUrl = dataUrlFromFile(SRC);
    const result = await page.evaluate(async ({ dataUrl, maxFrameHeight, forcedScale }) => {
        const canvas = await window.CUT.loadImage(dataUrl);
        window.CUT.chromaKeyGreen(canvas);
        const ALPHA_THRESHOLD = 25;
        const runs = window.CUT.splitIntoRuns(canvas, ALPHA_THRESHOLD);
        const crops = runs.map(run => window.CUT.cropWithPadding(canvas, run, ALPHA_THRESHOLD, 6));
        const nativeMaxH = Math.max(...crops.map(c => c.height));
        const scale = forcedScale ?? Math.min(1, maxFrameHeight / nativeMaxH);
        const frames = crops.map(c => window.CUT.scaleCanvas(c, scale));
        const frameData = frames.map(f => ({ w: f.width, h: f.height, dataUrl: window.CUT.toDataURL(f) }));

        // QA preview: all frames on a dark backdrop, common display height.
        const targetH = 220, gap = 24;
        const scaled = frames.map(f => ({ canvas: f, w: f.width * (targetH / f.height), h: targetH }));
        const totalW = scaled.reduce((s, f) => s + f.w, 0) + gap * (scaled.length - 1) + 80;
        const preview = window.CUT.newCanvas(totalW, targetH + 80);
        const pctx = window.CUT.ctxOf(preview);
        pctx.fillStyle = '#16120d';
        pctx.fillRect(0, 0, preview.width, preview.height);
        let x = 40;
        for (const f of scaled) { pctx.drawImage(f.canvas, x, 40, f.w, f.h); x += f.w + gap; }

        return { frameCount: frames.length, frameData, previewDataUrl: window.CUT.toDataURL(preview), scale, nativeMaxH };
    }, { dataUrl, maxFrameHeight: MAX_FRAME_HEIGHT, forcedScale: FORCED_SCALE });

    console.log(`Found ${result.frameCount} frame(s) for "${SLUG}".`);
    result.frameData.forEach((f, i) => {
        const p = path.join(DEST_DIR, `frame${i + 1}.png`);
        fs.writeFileSync(p, Buffer.from(f.dataUrl.split(',')[1], 'base64'));
        console.log(`  frame${i + 1}.png — ${f.w}x${f.h}`);
    });
    const qaPath = path.join(QA_DIR, `${SLUG}-preview.png`);
    fs.writeFileSync(qaPath, Buffer.from(result.previewDataUrl.split(',')[1], 'base64'));
    console.log(`QA preview: ${qaPath}`);
    console.log(`Scale used: ${result.scale.toFixed(4)} (native tallest frame: ${result.nativeMaxH}px)${FORCED_SCALE ? ' [forced via --scale]' : ''}`);
    console.log(`If this character has a second sheet that should share height with this one, pass --scale=${result.scale.toFixed(4)} on that invocation.`);
    console.log(`\nIf frame count changed, update OLDMAN_FRAMES (or the relevant constant) in src/scenes/Arena.js.`);

    await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
