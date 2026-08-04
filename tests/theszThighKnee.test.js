// Anatomical-knee preservation guard for Lou Thesz's shipped thigh art.
//
// The thigh is a deterministic distal trim of the standardized 150x150 source
// (Sprite sheets/.../runtime-conformed/parts/thigh.png) produced by
// tools/debug/lou_thigh_knee_crop.py. The trim's whole contract is: remove ONLY
// the hooked overlap tail BELOW the anatomical knee, and pass every pixel at and
// above the knee through byte-identical. A prior pass violated this — its cap
// masking started at row 106, ABOVE the knee (~row 111) — which ate real kneecap
// anatomy and produced a pinched/hourglass connection.
//
// This test fails if the shipped thigh ever again differs from the source at or
// above the anatomical knee row (a re-pinch), or if the canvas width changes.
// It decodes both PNGs with a tiny built-in zlib reader (no image dep).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Minimal PNG -> RGBA decoder for 8-bit colour-type 6 (truecolour+alpha),
// non-interlaced — the only format these two assets use. Handles all five
// scanline filters. Not a general decoder; asserts the assumptions it relies on.
function decodePngRGBA(path) {
    const buf = readFileSync(path);
    assert.ok(buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47, `${path}: not a PNG`);
    let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
    const idat = [];
    while (off < buf.length) {
        const len = buf.readUInt32BE(off);
        const type = buf.toString('ascii', off + 4, off + 8);
        const data = buf.subarray(off + 8, off + 8 + len);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0); height = data.readUInt32BE(4);
            bitDepth = data[8]; colorType = data[9]; interlace = data[12];
        } else if (type === 'IDAT') { idat.push(data); }
        else if (type === 'IEND') break;
        off += 12 + len;
    }
    assert.equal(bitDepth, 8, `${path}: expected 8-bit`);
    assert.equal(colorType, 6, `${path}: expected RGBA (colour type 6)`);
    assert.equal(interlace, 0, `${path}: expected non-interlaced`);
    const raw = inflateSync(Buffer.concat(idat));
    const bpp = 4, stride = width * bpp;
    const out = new Uint8Array(height * stride);
    const paeth = (a, b, c) => {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    };
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const rin = y * (stride + 1) + 1;
        const rout = y * stride;
        for (let x = 0; x < stride; x++) {
            const v = raw[rin + x];
            const a = x >= bpp ? out[rout + x - bpp] : 0;
            const b = y > 0 ? out[rout - stride + x] : 0;
            const c = x >= bpp && y > 0 ? out[rout - stride + x - bpp] : 0;
            let recon;
            switch (filter) {
                case 0: recon = v; break;
                case 1: recon = v + a; break;
                case 2: recon = v + b; break;
                case 3: recon = v + ((a + b) >> 1); break;
                case 4: recon = v + paeth(a, b, c); break;
                default: throw new Error(`${path}: bad filter ${filter}`);
            }
            out[rout + x] = recon & 0xff;
        }
    }
    return { width, height, data: out };
}

const SRC = fileURLToPath(new URL('../Sprite sheets/AI Pilot/Lou/v2-layer-standardization/runtime-conformed/parts/thigh.png', import.meta.url));
const SHIPPED = fileURLToPath(new URL('../src/assets/wrestlers/thesz/thigh.png', import.meta.url));

// Same rig geometry the crop tool uses to locate the knee on the canvas.
const ORIG_H = 150, ORIG_BOX_H = 85, THIGHH = 49, HIP_OVERLAP = 14;
const trueKneeRow = ((HIP_OVERLAP + THIGHH) / ORIG_BOX_H) * ORIG_H; // ~111.2
const kneeRow = Math.ceil(trueKneeRow); // 112 — "at and above the knee" = rows 0..112

test('shipped thigh preserves every source pixel at and above the anatomical knee', () => {
    const src = decodePngRGBA(SRC);
    const out = decodePngRGBA(SHIPPED);
    assert.equal(src.width, 150, 'source width');
    assert.equal(out.width, src.width, 'shipped thigh must keep the source canvas width (no horizontal squish)');
    assert.ok(out.height > kneeRow, `shipped thigh (${out.height} rows) must extend past the knee row ${kneeRow} for overlap`);

    const stride = src.width * 4;
    let firstDiff = -1;
    for (let y = 0; y <= kneeRow && firstDiff < 0; y++) {
        for (let x = 0; x < stride; x++) {
            if (src.data[y * stride + x] !== out.data[y * stride + x]) { firstDiff = y; break; }
        }
    }
    assert.equal(firstDiff, -1, `shipped thigh diverges from the source at row ${firstDiff}, which is at/above the anatomical knee (row ${kneeRow}) — the cap must start DISTAL to the knee, not eat kneecap anatomy`);
});

test('shipped thigh knee-band ink width is not pinched below the source', () => {
    const src = decodePngRGBA(SRC);
    const out = decodePngRGBA(SHIPPED);
    const inkWidth = (img, y) => {
        let lo = -1, hi = -1;
        for (let x = 0; x < img.width; x++) {
            if (img.data[(y * img.width + x) * 4 + 3] >= 32) { if (lo < 0) lo = x; hi = x; }
        }
        return lo < 0 ? 0 : hi - lo;
    };
    // Across the knee bulge (rows 106..115) the shipped ink must be at least as
    // wide as the source — the pinch defect narrowed these by up to ~9px.
    for (let y = 106; y <= 115; y++) {
        assert.ok(inkWidth(out, y) >= inkWidth(src, y),
            `knee-band row ${y}: shipped ink width ${inkWidth(out, y)} < source ${inkWidth(src, y)} (pinch)`);
    }
});
