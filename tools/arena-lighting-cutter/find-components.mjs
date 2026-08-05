#!/usr/bin/env node
// Probe tool for the arena-lighting fixture sheet: chroma-keys the green
// background, finds connected fixture blobs via flood fill, and writes each
// one's cropped PNG plus its bounding box so a human can identify which blob
// is which fixture. Used once to derive the FIXTURES bounding boxes in
// cut-fixtures.mjs; kept here so the sheet can be re-probed if the source
// art ever changes (e.g. a different fixture layout, see the concept doc's
// "Alternate fixture layout" section).
//
// Usage: node tools/arena-lighting-cutter/find-components.mjs
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(REPO_ROOT, 'Sprite sheets/Arena Lighting Concepts/showbusiness-fixtures-source-v1.png');
const OUT_DIR = path.join(__dirname, '_qa');
fs.mkdirSync(OUT_DIR, { recursive: true });

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
    return id;
  }

  // Connected-component labeling on alpha>threshold mask (BFS, 4-connected).
  function findComponents(imageData, w, h, alphaThreshold) {
    const d = imageData.data;
    const visited = new Uint8Array(w * h);
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = d[i * 4 + 3] > alphaThreshold ? 1 : 0;
    const comps = [];
    const qx = new Int32Array(w * h);
    const qy = new Int32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!mask[idx] || visited[idx]) continue;
        let head = 0, tail = 0;
        qx[tail] = x; qy[tail] = y; tail++;
        visited[idx] = 1;
        let minX = x, maxX = x, minY = y, maxY = y, count = 0;
        while (head < tail) {
          const cx = qx[head], cy = qy[head]; head++;
          count++;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
          const neighbors = [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nidx = ny * w + nx;
            if (mask[nidx] && !visited[nidx]) {
              visited[nidx] = 1;
              qx[tail] = nx; qy[tail] = ny; tail++;
            }
          }
        }
        if (count > 500) comps.push({ minX, maxX, minY, maxY, count });
      }
    }
    return comps;
  }

  function cropRegion(canvas, minX, minY, maxX, maxY, pad) {
    const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
    const x1 = Math.min(canvas.width - 1, maxX + pad), y1 = Math.min(canvas.height - 1, maxY + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const out = newCanvas(cw, ch);
    ctxOf(out).drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
    return out;
  }

  function toDataURL(c) { return c.toDataURL('image/png'); }

  return { loadImage, chromaKeyGreen, findComponents, cropRegion, toDataURL, newCanvas, ctxOf };
})();
`;

function dataUrlFromFile(p) { return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); }

async function main() {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ content: BROWSER_LIB });

    const dataUrl = dataUrlFromFile(SRC);
    const result = await page.evaluate(async ({ dataUrl }) => {
        const canvas = await window.CUT.loadImage(dataUrl);
        const imageData = window.CUT.chromaKeyGreen(canvas);
        const ALPHA_THRESHOLD = 25;
        const comps = window.CUT.findComponents(imageData, canvas.width, canvas.height, ALPHA_THRESHOLD);
        comps.sort((a, b) => (a.minY - b.minY) || (a.minX - b.minX));
        const crops = comps.map(c => {
            const cropped = window.CUT.cropRegion(canvas, c.minX, c.minY, c.maxX, c.maxY, 6);
            return { ...c, w: cropped.width, h: cropped.height, dataUrl: window.CUT.toDataURL(cropped) };
        });
        return { crops };
    }, { dataUrl });

    console.log(`Found ${result.crops.length} component(s).`);
    result.crops.forEach((c, i) => {
        const p = path.join(OUT_DIR, `blob${i + 1}.png`);
        fs.writeFileSync(p, Buffer.from(c.dataUrl.split(',')[1], 'base64'));
        console.log(`  blob${i + 1}.png — bbox(${c.minX},${c.minY})-(${c.maxX},${c.maxY}) size ${c.w}x${c.h} pixelCount=${c.count}`);
    });

    await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
