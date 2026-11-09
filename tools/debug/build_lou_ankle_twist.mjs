// T2.5: register the generated foot on Lou's original canvas, preserving the shaft.
import { readFileSync, writeFileSync } from 'node:fs';
import { decodeRgbaPng } from '../wrestler-cutter/validate-source-manifest.mjs';
import { encodeRgbaPng } from '../wrestler-cutter/export-v2-sheet.mjs';
const basePath = 'src/assets/wrestlers/thesz-procreate-v1/shin.png';
const outPath = 'src/assets/wrestlers/thesz-procreate-v1/shin_ankle_twist.png';
const review = 'research/art/lou-ankle-twist-2026-11-08/';
const base = decodeRgbaPng(readFileSync(basePath));
const donor = decodeRgbaPng(readFileSync(review + 'donor.png'));
const ankleRow = 395, blendEnd = 411;
const out = { w: base.w, h: base.h, rgba: new Uint8Array(base.rgba) };
// Bilinear premultiplied-alpha sampling of the entire donor canvas.
for (let y = ankleRow; y < base.h; y++) for (let x = 0; x < base.w; x++) {
    const sx = (x + .5) * donor.w / base.w - .5;
    const sy = (y + .5) * donor.h / base.h - .5;
    const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
    const c = [0, 0, 0, 0];
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const p = (Math.max(0, Math.min(donor.h - 1, iy + dy)) * donor.w + Math.max(0, Math.min(donor.w - 1, ix + dx))) * 4;
        const weight = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy), a = donor.rgba[p + 3] / 255;
        for (let k = 0; k < 3; k++) c[k] += donor.rgba[p + k] * a * weight;
        c[3] += a * weight;
    }
    const p = (y * base.w + x) * 4, t = Math.min(1, (y - ankleRow) / (blendEnd - ankleRow));
    const a0 = base.rgba[p + 3] / 255, a = a0 * (1 - t) + c[3] * t;
    for (let k = 0; k < 3; k++) out.rgba[p + k] = a ? Math.round((base.rgba[p + k] * a0 * (1 - t) + c[k] * t) / a) : 0;
    out.rgba[p + 3] = Math.round(a * 255);
}
if (!process.argv.includes('--check')) writeFileSync(outPath, encodeRgbaPng(out));
const actual = decodeRgbaPng(readFileSync(outPath));
if (actual.w !== base.w || actual.h !== base.h) throw Error('Canvas mismatch');
let above = 0, changed = 0;
for (let p = 0; p < actual.rgba.length; p += 4) {
    if (actual.rgba.subarray(p, p + 4).some((v, k) => v !== out.rgba[p + k])) throw Error('Rebuild mismatch');
    if (actual.rgba.subarray(p, p + 4).some((v, k) => v !== base.rgba[p + k])) { changed++; if (p / 4 < ankleRow * base.w) above++; }
}
if (above > 5) throw Error('Shaft pixel gate failed');
const report = { canvas: [base.w, base.h], ankleRow, blendEnd, changedPixelsAboveAnkle: above, changedPixels: changed, gate: '<= 5', output: outPath };
if (!process.argv.includes('--check')) writeFileSync(review + 'pixel-check.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
