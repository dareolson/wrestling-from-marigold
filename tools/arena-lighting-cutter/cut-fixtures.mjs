#!/usr/bin/env node
// Cuts the three approved theatrical fixtures out of the gitignored arena-
// lighting concept sheet (six fixtures on green, see
// ARENA_LIGHTING_AND_DEPTH_CONCEPTS.md's "Fixture source art" section) and
// writes clean transparent PNGs into src/assets/arena-lighting/, the
// project's normal shipped-assets location (mirrors tools/audience-cutter's
// role for the audience sheets).
//
// Not a general-purpose grid cutter: the three needed fixtures are picked by
// their known bounding-box position on this specific sheet (found once via
// tools/arena-lighting-cutter/find-components.mjs, a connected-component
// probe kept alongside this file for any future re-cut of the same sheet).
// Chroma-key + spill-suppression logic is copied from tools/audience-cutter/
// cut.mjs rather than shared, matching that tool's existing self-contained
// style.
//
// Usage: node tools/arena-lighting-cutter/cut-fixtures.mjs
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(REPO_ROOT, 'Sprite sheets/Arena Lighting Concepts/showbusiness-fixtures-source-v1.png');
const DEST_DIR = path.join(REPO_ROOT, 'src/assets/arena-lighting');

// Bounding boxes on the 1575x998 source sheet, found via find-components.mjs.
// left-fresnel-black: top-left black Fresnel (barn doors, chain) — LEFT key.
// fresnel-silver: top-middle silver Fresnel (barn doors, chain) — RIGHT key,
//   flipped/rotated by Arena.js at placement time, not here.
// followspot: bottom-middle followspot (top handle, small yoke stand) —
//   CENTER key.
const FIXTURES = [
    { name: 'left-fresnel-black', minX: 49, minY: 21, maxX: 525, maxY: 512 },
    { name: 'fresnel-silver', minX: 566, minY: 34, maxX: 1000, maxY: 510 },
    { name: 'followspot', minX: 549, minY: 569, maxX: 908, maxY: 951 },
];

// Ship at 2x the largest planned in-game display width (140px, see the
// concept doc's fixture map) for a crisp look at normal desktop DPI without
// shipping the full ~500px-native source resolution.
const MAX_OUTPUT_WIDTH = 280;

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
  // + spill suppression on remaining edge pixels. Copied from
  // tools/audience-cutter/cut.mjs.
  function chromaKeyGreen(canvas) {
    const ctx = ctxOf(canvas);
    const w = canvas.width, h = canvas.height;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
    let kr = 0, kg = 0, kb = 0;
    for (const p of corners) { kr += d[p]; kg += d[p + 1]; kb += d[p + 2]; }
    kr /= 4; kg /= 4; kb /= 4;

    const LOW = 60, HIGH = 140;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
      let a = 255;
      if (dist < LOW) a = 0;
      else if (dist < HIGH) a = Math.round(255 * (dist - LOW) / (HIGH - LOW));
      d[i + 3] = a;
      if (a > 0 && g > r && g > b) {
        const cap = (r + b) / 2;
        d[i + 1] = Math.round(cap + (g - cap) * 0.15);
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  function cropRegion(canvas, minX, minY, maxX, maxY, pad) {
    const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
    const x1 = Math.min(canvas.width - 1, maxX + pad), y1 = Math.min(canvas.height - 1, maxY + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const out = newCanvas(cw, ch);
    ctxOf(out).drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
    return out;
  }

  function scaleToWidth(canvas, maxW) {
    if (canvas.width <= maxW) return canvas;
    const scale = maxW / canvas.width;
    const out = newCanvas(Math.round(canvas.width * scale), Math.round(canvas.height * scale));
    ctxOf(out).drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  }

  function toDataURL(c) { return c.toDataURL('image/png'); }

  return { loadImage, chromaKeyGreen, cropRegion, scaleToWidth, toDataURL, newCanvas, ctxOf };
})();
`;

function dataUrlFromFile(p) { return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); }

async function main() {
    fs.mkdirSync(DEST_DIR, { recursive: true });

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ content: BROWSER_LIB });

    const dataUrl = dataUrlFromFile(SRC);
    const result = await page.evaluate(async ({ dataUrl, fixtures, maxOutputWidth }) => {
        const canvas = await window.CUT.loadImage(dataUrl);
        window.CUT.chromaKeyGreen(canvas);
        return fixtures.map(f => {
            const cropped = window.CUT.cropRegion(canvas, f.minX, f.minY, f.maxX, f.maxY, 6);
            const scaled = window.CUT.scaleToWidth(cropped, maxOutputWidth);
            return { name: f.name, w: scaled.width, h: scaled.height, dataUrl: window.CUT.toDataURL(scaled) };
        });
    }, { dataUrl, fixtures: FIXTURES, maxOutputWidth: MAX_OUTPUT_WIDTH });

    for (const f of result) {
        const p = path.join(DEST_DIR, `${f.name}.png`);
        fs.writeFileSync(p, Buffer.from(f.dataUrl.split(',')[1], 'base64'));
        console.log(`  ${f.name}.png — ${f.w}x${f.h}`);
    }

    await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
