#!/usr/bin/env node
// prepare_george_v9_broadcast.mjs — Phase A processor for
// CLAUDE_GEORGE_V9_BROADCAST_PASS.md. Produces a byte-independent,
// downsample-ONLY derivative of the frozen george-ai-pilot-v8 PNGs at each
// part's own broadcast-appropriate raster size (~2x its measured maximum
// on-screen display size — see tools/debug/measure_v8_bounds.mjs and
// phase0_measurements.json; this is NOT a guess from texture.box config
// values, which the task brief explicitly forbids).
//
// What this does, per part:
//   1. Decode the exact frozen v8 source PNG (full source resolution,
//      untouched pixels) via a headless-Chromium canvas (this project's
//      established convention for raster I/O — see process-parts.mjs's own
//      "no PIL, no pngjs, no image-processing npm deps" note; the actual
//      resampling MATH below is plain, inspectable JS, not the browser's
//      opaque built-in image scaling).
//   2. Premultiply RGB by alpha (float), so a transparent pixel's arbitrary
//      stored color can never bleed into a neighboring opaque pixel during
//      filtering — this is what "premultiplied-alpha downsampling" means and
//      is exactly what prevents dark/light fringes at cut edges.
//   3. Resample with a separable Lanczos-3 filter, width-scaled by 1/scale
//      when downsizing (the standard technique — see the EWA/area-correct
//      note in computeAxisWeights below) so the filter properly bandlimits
//      before sampling instead of aliasing.
//   4. Unpremultiply back to straight alpha, clamp, round.
//   5. Re-encode as PNG (again via canvas — lossless, no quality parameter)
//      and write to the new v9-broadcast asset directory.
//
// What this explicitly does NOT do (Phase A is downsample-only, per the
// brief): no crop/repad/rotate/flip/move, no sharpening/thresholding/
// morphology/posterization/denoising/contrast/selective line work, no
// touching torso/pelvisOverlay registration (both use the identical output
// canvas below, since they share one source canvas and runtime box contract
// already), no touching any v8 file.
//
// Usage:
//   node tools/wrestler-cutter/prepare_george_v9_broadcast.mjs
//
// Deterministic: same input bytes + same OUTPUT_SPEC constants below always
// produce the same output PNG bytes (the resize math has no randomness and
// no dependence on wall-clock time; OUTPUT_SPEC is a fixed table derived
// once from Phase 0 measurements, not re-measured live, so re-running this
// script cannot silently drift even if the game's rig config changes later).

import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const SRC_DIR = path.join(REPO_ROOT, 'src/assets/wrestlers/george-ai-pilot-v8');
const DEST_DIR = path.join(REPO_ROOT, 'src/assets/wrestlers/george-ai-pilot-v9-broadcast');

// Refuse to ever point source and destination at the same place — this
// script must never be able to overwrite the frozen v8 inputs, even if
// someone edits the constants above carelessly later.
if (path.resolve(SRC_DIR) === path.resolve(DEST_DIR)) {
    throw new Error('SRC_DIR and DEST_DIR must not be the same path — refusing to run.');
}
if (!fs.existsSync(SRC_DIR)) {
    throw new Error(`Frozen v8 source dir not found: ${SRC_DIR}`);
}

// Per-part output canvas, derived from tools/debug/measure_v8_bounds.mjs's
// phase0_measurements.json (real Phaser displayWidth/displayHeight at the
// near ring depth — the largest depth scale — across idle/gait/overhead/
// deep-bend poses and both facings; pose/facing never changed the measured
// display size, only depth did, confirming near is the true maximum).
// outFactor = 2 * max(measuredW/srcW, measuredH/srcH) — the "approximately
// 2x" the brief asks for, computed on whichever axis needs MORE relative
// resolution (torso/head are stretched non-uniformly by the runtime's
// texture.box vs. headR*headScale math, which this task freezes and does
// not touch — using the stricter axis keeps both dimensions safely at or
// above 2x true oversampling rather than averaging them down).
// upper_arm.png is one shared physical file for both near/far arms (see
// Skeleton.js: this.nearUpArm/this.farUpArm both wrap textures.upperArm) —
// sized to the near arm's larger requirement, since the far arm renders
// smaller (RIG.FAR_ARM_SCALE) and is already covered by that.
// thigh.png is likewise one shared file for both legs here (v8 does not
// declare separate nearThigh/farThigh keys); near and far measured
// identically (no farThighScale set on this character).
const OUTPUT_SPEC = [
    { name: 'torso', file: 'torso.png', outW: 142, outH: 209 },
    { name: 'pelvisOverlay', file: 'pelvis_overlay.png', outW: 142, outH: 209 },
    { name: 'head', file: 'head.png', outW: 114, outH: 139 },
    { name: 'upperArm', file: 'upper_arm.png', outW: 80, outH: 126 },
    { name: 'nearForearm', file: 'near_forearm.png', outW: 64, outH: 124 },
    { name: 'farForearm', file: 'far_forearm.png', outW: 62, outH: 111 },
    { name: 'thigh', file: 'thigh.png', outW: 66, outH: 124 },
    { name: 'nearShin', file: 'near_shin.png', outW: 149, outH: 185 },
    { name: 'farShin', file: 'far_shin.png', outW: 149, outH: 185 },
];

// ── Lanczos-3, separable, premultiplied-alpha, area-correct on minification ─

function lanczos3(x) {
    if (x === 0) return 1;
    if (x <= -3 || x >= 3) return 0;
    const px = Math.PI * x;
    return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px);
}

// Standard widened-kernel technique for correct minification: when scale
// (dst/src) < 1, stretch the filter's support by 1/scale so it integrates
// over the region each output pixel actually represents, instead of
// point-sampling a narrow kernel and aliasing high-frequency source detail
// (exactly the failure mode a naive "just evaluate lanczos3 at native width"
// resize would have on a 7-8x minification like v8's torso).
function computeAxisWeights(srcSize, dstSize) {
    const scale = dstSize / srcSize;
    const filterScale = scale < 1 ? 1 / scale : 1;
    const support = 3 * filterScale;
    const perDst = [];
    for (let dst = 0; dst < dstSize; dst++) {
        const center = (dst + 0.5) / scale - 0.5;
        const left = Math.floor(center - support);
        const right = Math.ceil(center + support);
        const raw = [];
        for (let s = left; s <= right; s++) {
            const w = lanczos3((s - center) / filterScale);
            if (w !== 0) raw.push([s, w]);
        }
        // Edge-clamp (repeat the border sample past the canvas edge — the
        // standard convention; content never reaches these frozen canvases'
        // true edges anyway) and merge any indices that collide after
        // clamping, then renormalize so weights always sum to 1.
        const merged = new Map();
        for (const [s, w] of raw) {
            const cs = Math.max(0, Math.min(srcSize - 1, s));
            merged.set(cs, (merged.get(cs) ?? 0) + w);
        }
        let sum = 0;
        for (const w of merged.values()) sum += w;
        perDst.push([...merged.entries()].map(([s, w]) => [s, w / sum]));
    }
    return perDst;
}

// data: Uint8ClampedArray RGBA, straight (unassociated) alpha — exactly what
// canvas getImageData returns per spec. Returns a new Uint8ClampedArray RGBA
// at dstW x dstH, straight alpha.
function resizeLanczos3Premultiplied(data, srcW, srcH, dstW, dstH) {
    const n = srcW * srcH;
    const pr = new Float64Array(n), pg = new Float64Array(n), pb = new Float64Array(n), pa = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const o = i * 4;
        const a = data[o + 3] / 255;
        pa[i] = a;
        // Premultiply — a fully transparent source pixel's RGB (which may be
        // arbitrary/leftover chroma-key noise) contributes exactly zero to
        // the filtered sum no matter what value it holds.
        pr[i] = (data[o] / 255) * a;
        pg[i] = (data[o + 1] / 255) * a;
        pb[i] = (data[o + 2] / 255) * a;
    }

    const wx = computeAxisWeights(srcW, dstW);
    const wy = computeAxisWeights(srcH, dstH);

    // Horizontal pass: srcW x srcH -> dstW x srcH.
    const hr = new Float64Array(dstW * srcH), hg = new Float64Array(dstW * srcH);
    const hb = new Float64Array(dstW * srcH), ha = new Float64Array(dstW * srcH);
    for (let y = 0; y < srcH; y++) {
        const rowOff = y * srcW;
        for (let dx = 0; dx < dstW; dx++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (const [sx, w] of wx[dx]) {
                const idx = rowOff + sx;
                r += pr[idx] * w; g += pg[idx] * w; b += pb[idx] * w; a += pa[idx] * w;
            }
            const o = y * dstW + dx;
            hr[o] = r; hg[o] = g; hb[o] = b; ha[o] = a;
        }
    }

    // Vertical pass: dstW x srcH -> dstW x dstH.
    const out = new Uint8ClampedArray(dstW * dstH * 4);
    for (let x = 0; x < dstW; x++) {
        for (let dy = 0; dy < dstH; dy++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (const [sy, w] of wy[dy]) {
                const idx = sy * dstW + x;
                r += hr[idx] * w; g += hg[idx] * w; b += hb[idx] * w; a += ha[idx] * w;
            }
            const o = (dy * dstW + x) * 4;
            // Unpremultiply. Below-epsilon alpha: emit transparent black
            // rather than dividing by ~0 (which would amplify filter
            // ringing into huge nonsense color values on fully-invisible
            // pixels — they're invisible either way, but keeps the file's
            // own transparent regions clean rather than noisy).
            const A = Math.max(0, Math.min(1, a));
            if (A > 1 / 255) {
                out[o] = Math.round((r / A) * 255);
                out[o + 1] = Math.round((g / A) * 255);
                out[o + 2] = Math.round((b / A) * 255);
            } else {
                out[o] = 0; out[o + 1] = 0; out[o + 2] = 0;
            }
            out[o + 3] = Math.round(A * 255);
        }
    }
    return out;
}

// ── Browser-driven PNG decode/encode (I/O boundary only — see file header) ─

function u8ToBase64Snippet() {
    // Executed inside the page — chunked to stay well under call-stack
    // limits for large typed arrays (source canvases here are ≤ ~2.3MB).
    return function u8ToBase64(u8) {
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < u8.length; i += chunk) {
            binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
        }
        return btoa(binary);
    };
}

async function decodePng(page, absPath) {
    // Pass the PNG in as a data: URL (base64, read straight from disk in
    // Node) rather than navigating to file:// — a file:// image loaded into
    // an about:blank page can taint the canvas / hit cross-origin loading
    // restrictions in headless Chrome; a data: URL has no such issue and
    // guarantees the browser sees the exact bytes on disk, untouched.
    const url = `data:image/png;base64,${fs.readFileSync(absPath).toString('base64')}`;
    return page.evaluate(async ({ url, u8ToBase64Src }) => {
        const u8ToBase64 = eval(`(${u8ToBase64Src})`);
        const img = await new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = (e) => reject(new Error(`image decode failed: ${e?.message ?? e}`));
            im.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return { width: canvas.width, height: canvas.height, dataB64: u8ToBase64(imageData.data) };
    }, { url, u8ToBase64Src: u8ToBase64Snippet().toString() });
}

async function encodePng(page, width, height, rgba) {
    const dataB64 = rgba.toString('base64'); // Buffer already has this built in
    return page.evaluate(async ({ width, height, dataB64 }) => {
        const binary = atob(dataB64);
        const bytes = new Uint8ClampedArray(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(new ImageData(bytes, width, height), 0, 0);
        return canvas.toDataURL('image/png');
    }, { width, height, dataB64 });
}

// ── Main ────────────────────────────────────────────────────────────────

fs.mkdirSync(DEST_DIR, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();

// Determinism is a claim about the output PNG bytes, not this report file —
// deliberately no timestamp field here so re-running doesn't create a spurious diff.
const report = { srcDir: SRC_DIR, destDir: DEST_DIR, parts: [] };

for (const spec of OUTPUT_SPEC) {
    const srcPath = path.join(SRC_DIR, spec.file);
    const destPath = path.join(DEST_DIR, spec.file);
    if (path.resolve(srcPath) === path.resolve(destPath)) {
        throw new Error(`Refusing to overwrite frozen v8 input: ${srcPath}`);
    }
    if (!fs.existsSync(srcPath)) throw new Error(`Missing expected v8 source: ${srcPath}`);

    const src = await decodePng(page, srcPath);
    const srcBytes = Buffer.from(src.dataB64, 'base64');
    const srcData = new Uint8ClampedArray(srcBytes.buffer, srcBytes.byteOffset, srcBytes.byteLength);

    const outData = resizeLanczos3Premultiplied(srcData, src.width, src.height, spec.outW, spec.outH);
    const dataUrl = await encodePng(page, spec.outW, spec.outH, Buffer.from(outData.buffer, outData.byteOffset, outData.byteLength));
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const pngBytes = Buffer.from(b64, 'base64');
    fs.writeFileSync(destPath, pngBytes);

    report.parts.push({
        name: spec.name,
        file: spec.file,
        srcW: src.width, srcH: src.height,
        outW: spec.outW, outH: spec.outH,
        scaleX: spec.outW / src.width, scaleY: spec.outH / src.height,
    });
    console.log(`${spec.name.padEnd(14)} ${src.width}x${src.height} -> ${spec.outW}x${spec.outH}  wrote ${destPath}`);
}

await browser.close();

fs.writeFileSync(path.join(DEST_DIR, 'phaseA_report.json'), JSON.stringify(report, null, 2));
console.log(`\nWrote ${DEST_DIR}/phaseA_report.json`);
