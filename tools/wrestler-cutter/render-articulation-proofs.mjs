#!/usr/bin/env node

// Renders the proof images for a modular limb set: the neutral assembled figure,
// articulation contact sheets through each joint's range, and a scale comparison
// against a reference sheet under the broadcast treatment the player actually
// sees.
//
// This is the visual half of the front3q acceptance work.
// `measure-joint-articulation.mjs` is the measured half and reports numbers; this
// file reports pictures. Neither is an approval -- CHARACTER_PIPELINE_REVIEW.md's
// standing rule is that mechanical counts are not a quality proxy, and the final
// word on how the art looks is Derek's, in browser, at gameplay scale.
//
// THE BROADCAST TREATMENT IS NOT DECORATION. Arena.js renders the match in
// grayscale(1) (Arena.js:873) under a scanline overlay that is 1px of black every
// 2px at alpha 0.18 (Arena.js:2877-2886). Comparing two figures in full colour at
// source resolution compares something the player never sees. Two details matter
// and are easy to get wrong:
//
//   1. Scanlines are SCREEN space, not figure space. The overlay is generated
//      once at the canvas size and composited over the finished frame, so its
//      2px pitch is constant no matter how tall the wrestler is. Scaling the
//      scanlines along with the figure would make a 154px figure look like it
//      receives the same number of scanlines as a 265px one. It does not -- it
//      receives proportionally more, which is exactly what makes small-scale
//      legibility hard and exactly what this comparison exists to show.
//
//   2. Grayscale is applied BEFORE the scanlines, matching the camera filter
//      order, and it discards all colour work. The declared hair (42) and boot
//      (54) value families collapse into one measured cluster at ~64-66 once
//      this runs.
//
// No Node pin: this writes proof images for human review, records no hash and
// feeds no artifact identity. Proofs are review material, never asset bytes.
//
// Usage:
//   node tools/wrestler-cutter/render-articulation-proofs.mjs \
//        --parts <dir> --landmarks <file.json> --out <dir> \
//        [--compare <reference.png>] [--heights 265,209,154]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';
import { ARTICULATION_RANGES } from './measure-joint-articulation.mjs';
import { DEFAULT_MANIFEST } from './production-config.mjs';

// Rec.709, the same coefficients measure-art-contract.mjs uses, chosen there
// because they match Phaser's luminance matrix closely enough to reason about.
const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 };

const SCANLINE_PITCH = 2;
const SCANLINE_ALPHA = 0.18;

// ── RGBA canvas ─────────────────────────────────────────────────────────────

export function rgbaCanvas(w, h, fill = [0, 0, 0, 0]) {
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        rgba[i * 4] = fill[0];
        rgba[i * 4 + 1] = fill[1];
        rgba[i * 4 + 2] = fill[2];
        rgba[i * 4 + 3] = fill[3];
    }
    return { w, h, rgba };
}

// Source-over composite of one part, rotated about its pivot and placed with
// that pivot on (worldX, worldY). Inverse-mapped and nearest-neighbour for the
// same reasons drawPart documents in measure-joint-articulation.mjs: forward
// mapping would leave gaps between rotated source pixels, and a bilinear sample
// would invent partial alpha along the silhouette edge.
export function drawPartRgba(dst, part, pivotFrac, worldX, worldY, angleRad, facing = 1) {
    const pivotX = pivotFrac.u * part.w;
    const pivotY = pivotFrac.v * part.h;
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);

    for (let y = 0; y < dst.h; y++) {
        for (let x = 0; x < dst.w; x++) {
            const dx = x - worldX;
            const dy = y - worldY;
            let lx = dx * c - dy * s;
            const ly = dx * s + dy * c;
            if (facing < 0) lx = -lx;

            const sx = Math.round(lx + pivotX);
            const sy = Math.round(ly + pivotY);
            if (sx < 0 || sy < 0 || sx >= part.w || sy >= part.h) continue;

            const si = (sy * part.w + sx) * 4;
            const sa = part.rgba[si + 3];
            if (sa === 0) continue;

            const di = (y * dst.w + x) * 4;
            const da = dst.rgba[di + 3];
            const a = sa / 255;
            const outA = a + (da / 255) * (1 - a);
            if (outA <= 0) continue;
            for (let k = 0; k < 3; k++) {
                dst.rgba[di + k] = Math.round(
                    (part.rgba[si + k] * a + dst.rgba[di + k] * (da / 255) * (1 - a)) / outA);
            }
            dst.rgba[di + 3] = Math.round(outA * 255);
        }
    }
    return dst;
}

// ── Broadcast treatment ─────────────────────────────────────────────────────

export function toGrayscale(img) {
    const out = rgbaCanvas(img.w, img.h);
    for (let i = 0; i < img.w * img.h; i++) {
        const r = img.rgba[i * 4];
        const g = img.rgba[i * 4 + 1];
        const b = img.rgba[i * 4 + 2];
        const y = Math.round(LUMA.r * r + LUMA.g * g + LUMA.b * b);
        out.rgba[i * 4] = y;
        out.rgba[i * 4 + 1] = y;
        out.rgba[i * 4 + 2] = y;
        out.rgba[i * 4 + 3] = img.rgba[i * 4 + 3];
    }
    return out;
}

// Applies the scanline overlay in SCREEN space: rows of the destination image,
// not rows of the figure. See the header note -- this is the detail that makes a
// small-scale comparison honest.
export function applyScanlines(img) {
    const out = rgbaCanvas(img.w, img.h);
    out.rgba.set(img.rgba);
    for (let y = 0; y < img.h; y += SCANLINE_PITCH) {
        for (let x = 0; x < img.w; x++) {
            const i = (y * img.w + x) * 4;
            for (let k = 0; k < 3; k++) {
                out.rgba[i + k] = Math.round(out.rgba[i + k] * (1 - SCANLINE_ALPHA));
            }
        }
    }
    return out;
}

// Box-filter downscale to a target height. A nearest-neighbour reduction would
// drop whole features at 154px and flatter the art by hiding exactly the detail
// that fails to survive; averaging is what the GPU does and what the player gets.
export function scaleToHeight(img, targetH) {
    const scale = targetH / img.h;
    const targetW = Math.max(1, Math.round(img.w * scale));
    const out = rgbaCanvas(targetW, targetH);
    const sx = img.w / targetW;
    const sy = img.h / targetH;

    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            const x0 = Math.floor(x * sx);
            const x1 = Math.min(img.w, Math.max(x0 + 1, Math.ceil((x + 1) * sx)));
            const y0 = Math.floor(y * sy);
            const y1 = Math.min(img.h, Math.max(y0 + 1, Math.ceil((y + 1) * sy)));

            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;
            let n = 0;
            for (let yy = y0; yy < y1; yy++) {
                for (let xx = x0; xx < x1; xx++) {
                    const i = (yy * img.w + xx) * 4;
                    const pa = img.rgba[i + 3] / 255;
                    // Premultiplied average, or transparent pixels drag the
                    // colour of the silhouette edge toward black.
                    r += img.rgba[i] * pa;
                    g += img.rgba[i + 1] * pa;
                    b += img.rgba[i + 2] * pa;
                    a += pa;
                    n++;
                }
            }
            if (n === 0 || a === 0) continue;
            const o = (y * targetW + x) * 4;
            out.rgba[o] = Math.round(r / a);
            out.rgba[o + 1] = Math.round(g / a);
            out.rgba[o + 2] = Math.round(b / a);
            out.rgba[o + 3] = Math.round((a / n) * 255);
        }
    }
    return out;
}

export function blitInto(dst, src, atX, atY) {
    for (let y = 0; y < src.h; y++) {
        const dy = atY + y;
        if (dy < 0 || dy >= dst.h) continue;
        for (let x = 0; x < src.w; x++) {
            const dx = atX + x;
            if (dx < 0 || dx >= dst.w) continue;
            const si = (y * src.w + x) * 4;
            const di = (dy * dst.w + dx) * 4;
            const sa = src.rgba[si + 3];
            if (sa === 0) continue;
            // Straight copy including alpha. The proof-alpha seam parked in
            // AI_HANDOFF.md comes from a blit that overwrote destination alpha
            // unconditionally; skipping fully transparent source pixels is what
            // avoids punching 1px translucent seams into the sheet.
            dst.rgba[di] = src.rgba[si];
            dst.rgba[di + 1] = src.rgba[si + 1];
            dst.rgba[di + 2] = src.rgba[si + 2];
            dst.rgba[di + 3] = sa;
        }
    }
    return dst;
}

export function trimToContent(img, pad = 0) {
    let minX = img.w;
    let minY = img.h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            if (img.rgba[(y * img.w + x) * 4 + 3] === 0) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (maxX < 0) return rgbaCanvas(1, 1);
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(img.w - 1, maxX + pad);
    maxY = Math.min(img.h - 1, maxY + pad);
    const out = rgbaCanvas(maxX - minX + 1, maxY - minY + 1);
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const si = (y * img.w + x) * 4;
            const di = ((y - minY) * out.w + (x - minX)) * 4;
            for (let k = 0; k < 4; k++) out.rgba[di + k] = img.rgba[si + k];
        }
    }
    return out;
}

// ── Assembly ────────────────────────────────────────────────────────────────

// Draw order for front3q, back to front. Far side before torso before near side
// is what makes a three-quarter view read as having depth.
//
// THIS IS NOT A DESIGN CHOICE HERE. It is a transcription of the order the
// runtime actually draws, Skeleton.js's setDepth block, and the point of this
// renderer is to predict what the game will show. The first version was written
// from first principles instead and inverted the runtime in five places, every
// one of which made the candidate look worse than it will actually render:
//
//   1. elbows, both sides -- it drew the forearm OVER the upper arm. The runtime
//      does the opposite (nearForearm 0.004 < nearUpArm 0.00401; farForearm base
//      < farUpArm base+0.00001) and says why: if the forearm wins that tie its
//      overlap band "sweeps across the upper-arm end as the elbow bends and the
//      joint appears to drift". Inverted, every elbow in every proof showed the
//      forearm's pale un-outlined attachment cap lying on top of the arm --
//      material the game keeps hidden.
//   2. pelvis_underlay -- drawn over the far leg. The runtime puts the underlay
//      behind both thighs (0.00005 < 0.0001); it is a complete underbody seen
//      only in the opening between the legs.
//   3. pelvis_overlay -- drawn over the near thigh. The runtime puts it under
//      (0.0025 < 0.003) on Derek's explicit instruction, quoted in Skeleton.js:
//      "his near leg needs to stack on top of his trunks".
//   4. head/torso -- drawn head over torso. The runtime draws the torso over the
//      head (0.0005 < 0.001), which is what `neckInTorso` depends on: the torso
//      carries the neck stub and must cover the head's neck base.
//
// A diagnostic instrument that disagrees with the runtime about which layer is
// on top is not measuring the art; it is measuring its own assumptions. Pinned
// against Skeleton.js's own depths by tests/articulationProofs.test.js.
export const FRONT3Q_DEPTH_ORDER = Object.freeze([
    'far_forearm', 'far_upper_arm',
    'pelvis_underlay',
    'far_thigh', 'far_shin',
    'head',
    'torso',
    'pelvis_overlay',
    'near_thigh', 'near_shin',
    'near_forearm', 'near_upper_arm',
]);

// Chains, so a pose can bend a limb rather than only place it.
//
// The head is here rather than treated as decoration: a part that appears in the
// depth order but has no chain entry gets no placement and is silently never
// drawn. `neck` has no articulation range, so callers that sweep a joint skip it.
const CHAINS = {
    head: { parent: 'torso', socket: 'neck', joint: 'neck' },
    far_upper_arm: { parent: 'torso', socket: 'farShoulder', joint: 'shoulder' },
    far_forearm: { parent: 'far_upper_arm', socket: 'distalAnchorFrac', joint: 'elbow' },
    near_upper_arm: { parent: 'torso', socket: 'nearShoulder', joint: 'shoulder' },
    near_forearm: { parent: 'near_upper_arm', socket: 'distalAnchorFrac', joint: 'elbow' },
    far_thigh: { parent: 'pelvis_underlay', socket: 'farHip', joint: 'hip' },
    far_shin: { parent: 'far_thigh', socket: 'distalAnchorFrac', joint: 'knee' },
    near_thigh: { parent: 'pelvis_underlay', socket: 'nearHip', joint: 'hip' },
    near_shin: { parent: 'near_thigh', socket: 'distalAnchorFrac', joint: 'knee' },
};

// THE PIVOT OF A PART, from the real landmark schema. One function, used by both
// the placer and the socket solver.
//
// An earlier version read `jointPivotFrac ?? {u:0.5,v:0}` when resolving sockets
// but `jointPivotFrac ?? {u:0.5,v:0.5}` when placing the root, so for a torso --
// which declares no jointPivotFrac at all -- the two disagreed by half the
// torso's height. Every socket hung off the figure by ~200px and the assembly
// came out with the pelvis above the head. Two defaults for one quantity is the
// bug; this function is the fix.
//
// The head is the other real-schema case: it declares `headAnchorFrac` (the neck
// base, near v=0.95) and NO `jointPivotFrac`. Reading only jointPivotFrac put the
// head's pivot at its top edge instead of its neck.
export function pivotOf(name, lm) {
    if (!lm) return { u: 0.5, v: 0.5 };
    if (name === 'head' && lm.headAnchorFrac) return lm.headAnchorFrac;
    if (lm.jointPivotFrac) return lm.jointPivotFrac;
    // Torso and the pelvis layers declare sockets rather than a pivot. Their
    // own centre is an arbitrary but CONSISTENT reference, which is all a root
    // or a socket-registered layer needs.
    return { u: 0.5, v: 0.5 };
}

// A named socket on a part, in that part's own canvas fractions. `sockets` is
// the real schema's container; `distalAnchorFrac` is a top-level field on limb
// segments.
function socketFrac(lm, socketName) {
    if (!lm) return null;
    if (socketName === 'distalAnchorFrac') return lm.distalAnchorFrac ?? null;
    return lm.sockets?.[socketName] ?? null;
}

// World position of a socket on an already-placed part.
function socketWorld(placement, part, lm, socketName) {
    const frac = socketFrac(lm, socketName);
    if (!frac) return null;
    const pivot = placement.pivot;
    const lx = (frac.u - pivot.u) * part.w;
    const ly = (frac.v - pivot.v) * part.h;
    const c = Math.cos(placement.angle);
    const s = Math.sin(placement.angle);
    const fx = placement.facing < 0 ? -lx : lx;
    return {
        x: placement.x + fx * c + ly * s,
        y: placement.y - fx * s + ly * c,
    };
}

// Registers a separately-cropped layer onto its parent by matching two shared
// sockets. The real exports give the pelvis layers their own cropped canvases
// with no shared origin, so "share the torso's box" is false for them: the only
// thing connecting them to the torso is that both declare nearHip and farHip.
//
// Translation only, from the midpoint of the two sockets. Rotation and scale are
// deliberately NOT solved: a hip span that disagrees between the two parts is a
// registration defect in the art, and silently scaling one to fit would hide
// exactly what a proof exists to reveal. The span ratio is returned so a caller
// can report it.
function registerBySockets(parentPlacement, parentPart, parentLm, childPart, childLm, names) {
    const parentPts = names.map((n) => socketWorld(parentPlacement, parentPart, parentLm, n));
    const childFracs = names.map((n) => socketFrac(childLm, n));
    if (parentPts.some((p) => !p) || childFracs.some((f) => !f)) return null;

    const pivot = pivotOf(null, childLm);
    const childLocal = childFracs.map((f) => ({
        x: (f.u - pivot.u) * childPart.w,
        y: (f.v - pivot.v) * childPart.h,
    }));

    const mid = (pts, k) => (pts[0][k] + pts[1][k]) / 2;
    const placement = {
        x: mid(parentPts, 'x') - mid(childLocal, 'x'),
        y: mid(parentPts, 'y') - mid(childLocal, 'y'),
        angle: parentPlacement.angle,
        facing: parentPlacement.facing,
        pivot,
    };

    const span = (pts) => Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const parentSpan = span(parentPts);
    const childSpan = span(childLocal);
    return {
        placement,
        spanRatio: parentSpan === 0 ? null : childSpan / parentSpan,
    };
}

// Assembles the figure at a given pose. `pose` maps part name -> angle in
// degrees, LOCAL to that part's parent; anything unnamed is at rest.
//
// Returns the frame plus a report of what was actually positioned. "12/12 parts
// rendered" proved only that twelve files decoded; a part can load fine and
// still have nowhere to go.
export function assemble({ parts, landmarks, pose = {}, facing = 1, size = 900 }) {
    const placements = {};
    const unregistered = [];
    const diagnostics = {};

    if (!parts.torso || !landmarks.torso) {
        return {
            frame: rgbaCanvas(size, size), placements,
            unregistered: [...FRONT3Q_DEPTH_ORDER], diagnostics, offset: { x: 0, y: 0 },
        };
    }

    placements.torso = {
        x: size / 2, y: size * 0.33, angle: 0, facing,
        pivot: pivotOf('torso', landmarks.torso),
    };

    // The pelvis underlay is registered to the torso through the hip sockets
    // both of them declare. It is not assumed to share the torso's canvas.
    if (parts.pelvis_underlay && landmarks.pelvis_underlay) {
        const reg = registerBySockets(
            placements.torso, parts.torso, landmarks.torso,
            parts.pelvis_underlay, landmarks.pelvis_underlay, ['nearHip', 'farHip']);
        if (reg) {
            placements.pelvis_underlay = reg.placement;
            diagnostics.pelvisHipSpanRatio = reg.spanRatio;
        } else {
            unregistered.push('pelvis_underlay');
        }
    } else if (parts.pelvis_underlay) {
        unregistered.push('pelvis_underlay');
    }

    // The overlay declares no landmarks in the real export, so there is nothing
    // to register it by. It is left undrawn and reported rather than guessed
    // into place: a trunks layer silently 30px out reads as an art defect.
    if (parts.pelvis_overlay) {
        const reg = landmarks.pelvis_overlay && placements.torso
            ? registerBySockets(
                placements.torso, parts.torso, landmarks.torso,
                parts.pelvis_overlay, landmarks.pelvis_overlay, ['nearHip', 'farHip'])
            : null;
        if (reg) placements.pelvis_overlay = reg.placement;
        else unregistered.push('pelvis_overlay');
    }

    // Chains, parents before children. Depth order is a DRAW order and is not
    // the same thing, so the chain is resolved by walking to the root instead.
    const resolve = (name, seen = new Set()) => {
        if (placements[name] || seen.has(name)) return;
        seen.add(name);
        const chain = CHAINS[name];
        if (!chain) return;
        resolve(chain.parent, seen);
        const parentPlacement = placements[chain.parent];
        const parentPart = parts[chain.parent];
        const parentLm = landmarks[chain.parent];
        if (!parentPlacement || !parentPart || !parentLm || !parts[name]) {
            if (parts[name]) unregistered.push(name);
            return;
        }
        const at = socketWorld(parentPlacement, parentPart, parentLm, chain.socket);
        if (!at) { unregistered.push(name); return; }

        // ROTATION PROPAGATES. The pose angle is local to the parent, so a child
        // inherits the parent's world angle and adds its own. Without this the
        // forearm is carried to the rotated elbow but keeps a world-absolute
        // angle, so raising the upper arm leaves the forearm pointing the way it
        // did at rest -- the runtime elbow relationship is not preserved and the
        // shoulder proof frames are not the poses the game would draw.
        const localDeg = pose[name] ?? 0;
        placements[name] = {
            x: at.x,
            y: at.y,
            angle: parentPlacement.angle + (localDeg * Math.PI) / 180,
            facing,
            pivot: pivotOf(name, landmarks[name]),
        };
    };
    for (const name of Object.keys(CHAINS)) resolve(name);

    // Fit the canvas to the figure before drawing.
    //
    // A fixed canvas with the root at a hardcoded fraction of it silently clips
    // whatever overruns. On the real V3 candidate the head is 279px tall and
    // anchors at v=0.946, so it reached about 131px above a 900px canvas and was
    // cut off entirely -- the neutral proof and every scale comparison showed a
    // headless Lou, and nothing reported it. An articulated pose reaches further
    // still: the whole point of a +190 degree shoulder is that the arm leaves the
    // resting silhouette.
    const corners = [];
    for (const name of FRONT3Q_DEPTH_ORDER) {
        const part = parts[name];
        const place = placements[name];
        if (!part || !place) continue;
        const px = place.pivot.u * part.w;
        const py = place.pivot.v * part.h;
        const c = Math.cos(place.angle);
        const sn = Math.sin(place.angle);
        for (const [cx, cy] of [[0, 0], [part.w, 0], [0, part.h], [part.w, part.h]]) {
            let lx = cx - px;
            const ly = cy - py;
            if (place.facing < 0) lx = -lx;
            corners.push([place.x + lx * c + ly * sn, place.y - lx * sn + ly * c]);
        }
    }

    let offsetX = 0;
    let offsetY = 0;
    let frame;
    if (corners.length === 0) {
        frame = rgbaCanvas(size, size);
    } else {
        const margin = 16;
        const minX = Math.min(...corners.map((p) => p[0])) - margin;
        const minY = Math.min(...corners.map((p) => p[1])) - margin;
        const maxX = Math.max(...corners.map((p) => p[0])) + margin;
        const maxY = Math.max(...corners.map((p) => p[1])) + margin;
        offsetX = -minX;
        offsetY = -minY;
        frame = rgbaCanvas(Math.ceil(maxX - minX), Math.ceil(maxY - minY));
    }

    for (const name of FRONT3Q_DEPTH_ORDER) {
        const part = parts[name];
        const place = placements[name];
        if (!part) continue;
        if (!place) { if (!unregistered.includes(name)) unregistered.push(name); continue; }
        drawPartRgba(frame, part, place.pivot,
            place.x + offsetX, place.y + offsetY, place.angle, place.facing);
    }
    return { frame, placements, unregistered, diagnostics, offset: { x: offsetX, y: offsetY } };
}

// Convenience for callers that only want the picture.
export function assembleFrame(opts) {
    return assemble(opts).frame;
}

// ── Proof sheets ────────────────────────────────────────────────────────────

const GUTTER = 12;
const BG = [24, 24, 24, 255];

export function contactSheet(frames, columns = frames.length) {
    if (frames.length === 0) return rgbaCanvas(1, 1);
    const cellW = Math.max(...frames.map((f) => f.w));
    const cellH = Math.max(...frames.map((f) => f.h));
    const rows = Math.ceil(frames.length / columns);
    const sheet = rgbaCanvas(
        columns * cellW + (columns + 1) * GUTTER,
        rows * cellH + (rows + 1) * GUTTER,
        BG);
    frames.forEach((f, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        blitInto(sheet,
            f,
            GUTTER + col * (cellW + GUTTER) + Math.floor((cellW - f.w) / 2),
            GUTTER + row * (cellH + GUTTER) + Math.floor((cellH - f.h) / 2));
    });
    return sheet;
}

// The extreme articulation proof for one joint: the figure through that joint's
// full range, both facings, so a reviewer sees what the numbers describe.
export function articulationProof({ parts, landmarks, partName, steps = 7 }) {
    const chain = CHAINS[partName];
    if (!chain) throw new Error(`no chain for ${partName}`);
    const range = ARTICULATION_RANGES[chain.joint];
    if (!range) throw new Error(`${partName} has no articulation range (joint ${chain.joint})`);
    const frames = [];
    for (const facing of [1, -1]) {
        for (let i = 0; i < steps; i++) {
            const deg = range.min + ((range.max - range.min) * i) / (steps - 1);
            frames.push(trimToContent(
                assembleFrame({ parts, landmarks, pose: { [partName]: deg }, facing }), 4));
        }
    }
    return contactSheet(frames, steps);
}

// Extracts one view's panel from a canonical master sheet.
//
// The Pass-A master is a 4096x4096 sheet carrying all five views side by side.
// Downscaling the whole sheet to "265px tall" makes the front3q figure about
// 60px and puts four irrelevant views beside it -- it compares the sheet, not
// the wrestler. The panel rectangles are declared in the manifest at
// `sourceSheet.masterPanels`, and they are coordinates on a canonical sheet, so
// they are only valid for a canvas of the declared size.
export function extractPanel(sheet, panel) {
    if (!panel) return null;
    const out = rgbaCanvas(panel.w, panel.h);
    for (let y = 0; y < panel.h; y++) {
        const sy = panel.y + y;
        if (sy < 0 || sy >= sheet.h) continue;
        for (let x = 0; x < panel.w; x++) {
            const sx = panel.x + x;
            if (sx < 0 || sx >= sheet.w) continue;
            const si = (sy * sheet.w + sx) * 4;
            const di = (y * panel.w + x) * 4;
            for (let k = 0; k < 4; k++) out.rgba[di + k] = sheet.rgba[si + k];
        }
    }
    return out;
}

// Side-by-side against a reference at each figure height, under identical
// grayscale and scanline treatment. Both figures get the same treatment in the
// same order or the comparison says nothing.
export function scaleComparison(candidate, reference, heights = [265, 209, 154]) {
    const rows = [];
    for (const h of heights) {
        const pair = [candidate, reference]
            .filter(Boolean)
            .map((img) => applyScanlines(toGrayscale(scaleToHeight(trimToContent(img, 2), h))));
        rows.push(contactSheet(pair, pair.length));
    }
    const w = Math.max(...rows.map((r) => r.w));
    const totalH = rows.reduce((n, r) => n + r.h, 0);
    const out = rgbaCanvas(w, totalH, BG);
    let y = 0;
    for (const r of rows) { blitInto(out, r, 0, y); y += r.h; }
    return out;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

async function loadPart(dir, name) {
    try {
        const img = decodeRgbaPng(await readFile(path.join(dir, `${name}.png`)));
        return { w: img.w, h: img.h, rgba: img.rgba };
    } catch {
        return null;
    }
}

async function main(argv) {
    const arg = (flag, fallback = null) => {
        const i = argv.indexOf(flag);
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
    };
    const partsDir = arg('--parts');
    const landmarksPath = arg('--landmarks');
    const outDir = arg('--out');
    const comparePath = arg('--compare');
    const heights = arg('--heights', '265,209,154').split(',').map(Number);
    const view = arg('--view', 'front3q');
    const strict = argv.includes('--strict');

    if (!partsDir || !landmarksPath || !outDir) {
        console.error('usage: render-articulation-proofs.mjs --parts <dir> '
            + '--landmarks <file.json> --out <dir> [--compare <ref.png>]');
        process.exit(2);
    }

    const landmarks = JSON.parse(await readFile(landmarksPath, 'utf8'));
    const parts = {};
    for (const name of FRONT3Q_DEPTH_ORDER) parts[name] = await loadPart(partsDir, name);
    const present = FRONT3Q_DEPTH_ORDER.filter((n) => parts[n]);

    if (present.length === 0) {
        console.error('  no parts found -- nothing to render');
        process.exit(1);
    }
    await mkdir(outDir, { recursive: true });

    const write = async (name, img) => {
        await writeFile(path.join(outDir, name), encodeRgbaPng(img));
        console.log(`  wrote ${name} (${img.w}x${img.h})`);
    };

    const assembled = assemble({ parts, landmarks });
    const neutral = trimToContent(assembled.frame, 8);
    await write('neutral-assembly.png', neutral);
    await write('neutral-assembly-broadcast.png', applyScanlines(toGrayscale(neutral)));

    for (const partName of Object.keys(CHAINS)) {
        if (!parts[partName]) continue;
        // `neck` has no articulation range; it is a placement, not a sweep.
        if (!ARTICULATION_RANGES[CHAINS[partName].joint]) continue;
        await write(`articulation-${partName.replace(/_/g, '-')}.png`,
            articulationProof({ parts, landmarks, partName }));
    }

    if (comparePath) {
        const sheet = decodeRgbaPng(await readFile(comparePath));
        let ref = { w: sheet.w, h: sheet.h, rgba: sheet.rgba };
        // Compare against one view's panel, not the whole five-view master.
        const manifest = JSON.parse(await readFile(DEFAULT_MANIFEST, 'utf8'));
        const panels = manifest?.sourceSheet?.masterPanels ?? {};
        const declared = manifest?.sourceSheet;
        const panel = panels[view];
        const canvasMatches = !declared?.width || !declared?.height
            || (sheet.w === declared.width && sheet.h === declared.height);
        if (panel && canvasMatches) {
            ref = extractPanel(ref, panel);
            console.log(`  comparing against the ${view} panel `
                + `(${panel.w}x${panel.h} at ${panel.x},${panel.y}) of the master`);
        } else if (panel) {
            console.error(`  reference is ${sheet.w}x${sheet.h}, not the canonical `
                + `${declared.width}x${declared.height}; comparing it whole. `
                + 'Panel rectangles are coordinates on a canonical sheet.');
        }
        await write('scale-comparison.png', scaleComparison(neutral, ref, heights));
    }

    // What actually reached the canvas, which is not the same as what loaded.
    const positioned = FRONT3Q_DEPTH_ORDER.filter((n) => assembled.placements[n]);
    console.log(`  ${positioned.length}/${FRONT3Q_DEPTH_ORDER.length} parts positioned `
        + `(${present.length} loaded)`);
    const missing = FRONT3Q_DEPTH_ORDER.filter((n) => !parts[n]);
    if (missing.length) console.error(`  missing files: ${missing.join(', ')}`);
    if (assembled.unregistered.length) {
        console.error(`  NOT PLACED, no registration landmark: `
            + `${assembled.unregistered.join(', ')}`);
    }
    const ratio = assembled.diagnostics.pelvisHipSpanRatio;
    if (typeof ratio === 'number' && Math.abs(ratio - 1) > 0.05) {
        console.error(`  pelvis hip span is ${(ratio * 100).toFixed(1)}% of the torso's `
            + '-- the two parts disagree about where the hips are');
    }
    if (assembled.unregistered.length && strict) process.exit(1);
}

const invokedDirectly = process.argv[1]
    && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
    main(process.argv.slice(2)).catch((err) => {
        console.error(err);
        process.exit(2);
    });
}
