#!/usr/bin/env node

// Measures whether a modular limb set stays connected through its articulation
// range. This is the automated half of the front3q acceptance gate: it answers
// "does the joint hold?" so that Derek's review can spend itself on "does it
// look like Lou?" instead.
//
// The three metrics are the ones NEW_ASSETS_SPEC.md already names, because the
// Python validator that defines them (v1-golden-master/tools/validate_joints.py)
// is meaningful precisely for having caught the real defects in the old sources
// at 51-102px of interior background:
//
//   interior_bg_px   unpainted pixels enclosed by the figure's own envelope --
//                    the wedge that opens between a parent and child when the
//                    joint rotates and the overlap runs out.
//   sharpest_deg     sharpest convex corner on the silhouette. A spear or spike
//                    is a flat authored cut edge rotated into view.
//   straight_run_px  longest straight hard-edged boundary run -- a crop ledge.
//
// TWO DELIBERATE DIVERGENCES FROM THE PYTHON, both pinned by tests:
//
// 1. interior_bg is reproduced exactly (row-span AND column-span minus paint),
//    so the two implementations can be cross-checked against each other on the
//    same input. That cross-check is the evidence this file is right, and it is
//    worth more here than a cleaner definition would be.
//
// 2. sharpest_deg and straight_run_px are NOT reproduced exactly. The Python
//    orders boundary pixels by their angle around the centroid, which is only a
//    contour for a star-shaped silhouette. A limb bent at the elbow or knee is
//    not star-shaped about its centroid, so that ordering interleaves points
//    from the two arms of the L and reports corners that are not on the
//    boundary in that order. It degrades worst at high flex -- exactly the
//    poses this harness exists to test. This file walks a real Moore-
//    neighbourhood contour instead. `tests/jointArticulationMeasure.test.js`
//    builds an L and shows the two answers diverge, with the traced one correct.
//
// ADVISORY by default, exits 0 whatever it finds; --strict makes the thresholds
// blocking. A number here is evidence for review, not an art-direction ruling.
//
// No Node pin, for the reason measure-art-contract.mjs documents: this writes no
// artifact and records no hash, so every number reproduces on any Node version.
//
// Usage:
//   node tools/wrestler-cutter/measure-joint-articulation.mjs \
//        --parts <dir> --landmarks <landmarks.json> [--json] [--strict]
//        [--proofs <out-dir>] [--step 10]

import { readdir, readFile } from 'node:fs/promises';

import { decodeRgbaPng } from './validate-source-manifest.mjs';

// Production articulation ranges, set by Derek 2026-09-13. These supersede the
// narrower ranges in NEW_ASSETS_SPEC.md (shoulder -30..+45, hip -30..+50,
// elbow/knee 0..-90), which excluded overhead attacks, rope taunts, backward arm
// travel, knee lifts and procedural gait extremes.
//
// They are STRESS ranges, not pose references: the art is not required to look
// natural at every angle in them, only to stay connected and opaque with no
// exposed finished attachment edge. They size the painted overlap.
export const ARTICULATION_RANGES = Object.freeze({
    shoulder: { min: -120, max: 190 },
    hip: { min: -60, max: 125 },
    elbow: { min: -10, max: 160 },
    knee: { min: -10, max: 150 },
});

export const THRESHOLDS = Object.freeze({
    interiorBgPx: 8,
    sharpestDeg: 35,
    straightRunPx: 18,
});

// Alpha at or below this reads as unpainted. Matches the Python's `> 40`.
export const PAINT_ALPHA = 40;

// ── Compositing ─────────────────────────────────────────────────────────────
//
// Replicates the runtime's jointPivotFrac attachment path, which is the path
// this art takes: Skeleton.js:818-821 returns the joint point unchanged when the
// child carries _jointPivotFrac, so for parts authored to this spec the pivot IS
// the joint and there is no overlap backoff to model.
//
// Local space and rotation follow Skeleton.js's _endXY (the general local->world
// transform, verified there as consistent with _end at lx=0):
//
//   world.x = px + lx*cos(a) + ly*sin(a)
//   world.y = py - lx*sin(a) + ly*cos(a)
//
// with the part's local origin at its pivot, +x toward the right of the
// unflipped source PNG and +y toward its bottom edge.

export function localToWorld(px, py, lx, ly, angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return { x: px + lx * c + ly * s, y: py - lx * s + ly * c };
}

// A canvas the compositor draws into. Alpha-only: every metric here reads the
// silhouette, and carrying RGB would only invite colour questions this file has
// no business answering.
export function canvas(w, h) {
    return { w, h, alpha: new Uint8Array(w * h) };
}

// Draws `part` onto `dst` with the part's pivot landing on (worldX, worldY),
// rotated by angleRad, mirrored when facing < 0.
//
// Inverse-mapped: for each destination pixel, find the source pixel. Forward
// mapping would leave unpainted gaps between rotated source pixels and those
// gaps would be counted as interior background, which is the defect being
// measured. Nearest-neighbour, because a bilinear sample would invent partial
// alpha along the silhouette edge and soften exactly the hard cut edges that
// straight_run_px is looking for.
export function drawPart(dst, part, pivotFrac, worldX, worldY, angleRad, facing = 1) {
    const pivotX = pivotFrac.u * part.width;
    const pivotY = pivotFrac.v * part.height;
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);

    for (let y = 0; y < dst.h; y++) {
        for (let x = 0; x < dst.w; x++) {
            // World -> part-local, inverting localToWorld.
            const dx = x - worldX;
            const dy = y - worldY;
            let lx = dx * c - dy * s;
            const ly = dx * s + dy * c;
            if (facing < 0) lx = -lx;

            const sx = Math.round(lx + pivotX);
            const sy = Math.round(ly + pivotY);
            if (sx < 0 || sy < 0 || sx >= part.width || sy >= part.height) continue;

            const a = part.alpha[sy * part.width + sx];
            if (a === 0) continue;
            const i = y * dst.w + x;
            if (a > dst.alpha[i]) dst.alpha[i] = a;
        }
    }
    return dst;
}

// ── Metrics ─────────────────────────────────────────────────────────────────

// Unpainted pixels lying inside the figure's own envelope: enclosed by paint
// both horizontally and vertically. Reproduces validate_joints.py:37-57 exactly
// so the two implementations cross-check.
export function interiorBackground(img) {
    const { w, h, alpha } = img;
    const painted = new Uint8Array(w * h);
    let any = 0;
    for (let i = 0; i < w * h; i++) {
        if (alpha[i] > PAINT_ALPHA) { painted[i] = 1; any++; }
    }
    if (any === 0) return { mask: new Uint8Array(w * h), count: 0 };

    const rowIn = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        let lo = -1;
        let hi = -1;
        for (let x = 0; x < w; x++) {
            if (painted[y * w + x]) { if (lo < 0) lo = x; hi = x; }
        }
        if (lo < 0) continue;
        for (let x = lo; x <= hi; x++) rowIn[y * w + x] = 1;
    }

    const colIn = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) {
        let lo = -1;
        let hi = -1;
        for (let y = 0; y < h; y++) {
            if (painted[y * w + x]) { if (lo < 0) lo = y; hi = y; }
        }
        if (lo < 0) continue;
        for (let y = lo; y <= hi; y++) colIn[y * w + x] = 1;
    }

    const mask = new Uint8Array(w * h);
    let count = 0;
    for (let i = 0; i < w * h; i++) {
        if (rowIn[i] && colIn[i] && !painted[i]) { mask[i] = 1; count++; }
    }
    return { mask, count };
}

// Moore-neighbourhood boundary trace of the largest painted component, walked in
// order. This is the divergence from the Python documented at the top of the
// file: a real contour rather than an angular sort about the centroid, so a
// shape bent past star-shapedness (every flexed elbow and knee) is measured on
// its actual boundary.
export function traceContour(img) {
    const { w, h, alpha } = img;
    const painted = (x, y) =>
        x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x] > PAINT_ALPHA;

    // Largest component, so a stray keyed speck cannot become the silhouette.
    const label = new Int32Array(w * h).fill(-1);
    let best = -1;
    let bestSize = 0;
    let next = 0;
    const stack = [];
    for (let sy = 0; sy < h; sy++) {
        for (let sx = 0; sx < w; sx++) {
            if (!painted(sx, sy) || label[sy * w + sx] >= 0) continue;
            const id = next++;
            let size = 0;
            stack.push(sx, sy);
            label[sy * w + sx] = id;
            while (stack.length) {
                const y = stack.pop();
                const x = stack.pop();
                size++;
                for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                    if (!painted(nx, ny) || label[ny * w + nx] >= 0) continue;
                    label[ny * w + nx] = id;
                    stack.push(nx, ny);
                }
            }
            if (size > bestSize) { bestSize = size; best = id; }
        }
    }
    if (best < 0 || bestSize < 20) return [];

    const inComponent = (x, y) =>
        x >= 0 && y >= 0 && x < w && y < h && label[y * w + x] === best;

    // Start at the topmost-leftmost pixel of that component.
    let startX = -1;
    let startY = -1;
    outer: for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (inComponent(x, y)) { startX = x; startY = y; break outer; }
        }
    }

    const NB = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const contour = [];
    let cx = startX;
    let cy = startY;
    let dir = 6; // came from "up"; scan clockwise from there
    const limit = 8 * bestSize + 64;
    for (let step = 0; step < limit; step++) {
        contour.push([cx, cy]);
        let moved = false;
        for (let k = 1; k <= 8; k++) {
            const d = (dir + k) % 8;
            const nx = cx + NB[d][0];
            const ny = cy + NB[d][1];
            if (!inComponent(nx, ny)) continue;
            cx = nx; cy = ny;
            dir = (d + 5) % 8; // back up to just past where we came from
            moved = true;
            break;
        }
        if (!moved) break;
        if (cx === startX && cy === startY && contour.length > 2) break;
    }
    return contour;
}

// Sharpest convex corner and longest straight run along the traced contour.
// The k-spacing matches the Python's `max(3, n//40)` so the two are comparable
// where the Python's ordering happens to be valid.
// An optional `focus` ({ x, y, radius }) restricts which contour points are
// scored, without cropping the image.
//
// THAT DISTINCTION IS THE WHOLE POINT, and it is a defect this harness had in
// its first version, inherited from the Python it mirrors. Both measured a
// square crop taken around the joint. When the figure runs off the edge of that
// crop -- which it always does, the torso being larger than any joint region --
// the silhouette is clipped by the crop rectangle, and the contour then walks
// the rectangle's own perfectly straight edge. Measured that way, straightRunPx
// came out at 34/46/60/80/92px for crop radii of 20/28/36/48/64, identical at
// every joint angle including rest. It was reporting the crop, not the art, and
// it would have failed every limb ever authored while looking like a gate.
//
// Measuring the full frame and filtering by distance to the joint keeps the
// silhouette intact, so a straight run means a straight run in the artwork.
export function sharpestAndStraight(img, focus = null) {
    const contour = traceContour(img);
    const n = contour.length;
    // `scoredPoints` is the honesty term. Both perfect values -- 180 degrees and
    // a zero-length straight run -- are also what this returns when it measures
    // NOTHING, so on their own they cannot distinguish a flawless joint from a
    // joint that was never in frame. The knees of the real front3q candidate sat
    // 86px below a fixed 512px canvas and scored a clean pass at every angle in
    // both facings on exactly that confusion. Callers must check this.
    if (n < 8) return { sharpestDeg: 180, straightRunPx: 0, scoredPoints: 0 };

    const inFocus = (p) => {
        if (!focus) return true;
        return Math.hypot(p[0] - focus.x, p[1] - focus.y) <= focus.radius;
    };

    const k = Math.max(3, Math.floor(n / 40));
    let sharpest = 180;
    let straight = 0;
    let run = 0;
    let scoredPoints = 0;
    for (let i = 0; i < n; i++) {
        if (!inFocus(contour[i])) { run = 0; continue; }
        scoredPoints++;
        const a = contour[(i - k + n) % n];
        const b = contour[i];
        const c = contour[(i + k) % n];
        const v1x = a[0] - b[0];
        const v1y = a[1] - b[1];
        const v2x = c[0] - b[0];
        const v2y = c[1] - b[1];
        const n1 = Math.hypot(v1x, v1y);
        const n2 = Math.hypot(v2x, v2y);
        if (n1 < 1e-6 || n2 < 1e-6) continue;
        const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
        const ang = (Math.acos(cos) * 180) / Math.PI;
        if (ang < sharpest) sharpest = ang;
        if (ang > 172) { run++; if (run > straight) straight = run; } else run = 0;
    }
    return { sharpestDeg: Math.round(sharpest * 10) / 10, straightRunPx: straight, scoredPoints };
}

// Green fringe left by an imperfect chroma key: pixels whose green channel
// stands clear of both other channels. Zero is the spec's requirement.
export function greenFringe(rgba, alpha) {
    let count = 0;
    for (let i = 0; i < alpha.length; i++) {
        if (alpha[i] <= PAINT_ALPHA) continue;
        const r = rgba[i * 4];
        const g = rgba[i * 4 + 1];
        const b = rgba[i * 4 + 2];
        if (g > r + 30 && g > b + 30) count++;
    }
    return count;
}

// ── Canvas fitting ──────────────────────────────────────────────────────────
//
// The canvas must hold the parent, the joint, the focus disc, and the child at
// EVERY angle in the sweep. It used to be a fixed 512px square with the parent
// pivot hardcoded at its centre, which is the same defect the proof renderer had
// at a fixed 900px: real parts are bigger than the assumption.
//
// On the real front3q candidate the thigh is 408px tall with its hip pivot 41px
// down, so the knee landed at y=598 on a 512px canvas -- 86px past the bottom
// edge. Nothing was drawn there and no contour point fell inside the focus disc,
// so interior_bg counted 0, sharpest_deg kept its 180 default and straight_run
// kept its 0, and BOTH KNEES REPORTED A CLEAN PASS AT EVERY ANGLE IN BOTH
// FACINGS. A gate that silently scores an unmeasured joint perfect is worse than
// no gate, because it launders an absence of evidence into a pass.
//
// The child is bounded by a disc about the joint rather than per-angle: its
// pivot is the joint, so no rotation can carry it further than its own furthest
// corner, and a disc is exact for a full sweep and cheap.
export function fitCanvas({
    parent, parentPivot, child, childPivot, childAttachFrac,
    facing = 1, regionRadius = 64, margin = 16, minSize = 0,
}) {
    const ppx = parentPivot.u * parent.width;
    const ppy = parentPivot.v * parent.height;

    // Parent corners relative to its pivot, at angle 0, mirrored when facing < 0.
    const px0 = facing < 0 ? -(parent.width - ppx) : -ppx;
    const px1 = facing < 0 ? ppx : parent.width - ppx;
    let minX = px0;
    let maxX = px1;
    let minY = -ppy;
    let maxY = parent.height - ppy;

    // The joint, relative to the parent pivot.
    const jointLocalX = (childAttachFrac.u - parentPivot.u) * parent.width;
    const jx = facing < 0 ? -jointLocalX : jointLocalX;
    const jy = (childAttachFrac.v - parentPivot.v) * parent.height;

    // Furthest the child's paint can reach from its own pivot, hence from the
    // joint, at any rotation.
    const cpx = childPivot.u * child.width;
    const cpy = childPivot.v * child.height;
    const reach = Math.max(
        Math.hypot(cpx, cpy),
        Math.hypot(child.width - cpx, cpy),
        Math.hypot(cpx, child.height - cpy),
        Math.hypot(child.width - cpx, child.height - cpy),
    );
    const radius = Math.max(reach, regionRadius);
    minX = Math.min(minX, jx - radius);
    maxX = Math.max(maxX, jx + radius);
    minY = Math.min(minY, jy - radius);
    maxY = Math.max(maxY, jy + radius);

    minX -= margin; maxX += margin; minY -= margin; maxY += margin;

    const w = Math.max(Math.ceil(maxX - minX), minSize);
    const h = Math.max(Math.ceil(maxY - minY), minSize);
    // Where the parent pivot goes so that the fitted bounds land on the canvas.
    //
    // Rounded to whole pixels deliberately. drawPart resamples nearest-neighbour,
    // so a fractional pivot shifts the rasterisation phase of every edge in the
    // frame, and straight_run_px -- which counts consecutive contour pixels that
    // stay within 8 degrees of straight -- is directly sensitive to whether a
    // rotated cut edge stair-steps. Leaving the origin fractional made the same
    // art measure differently for no reason but where the canvas happened to
    // start, which is the crop defect again in another costume.
    return { w, h, px: Math.round(-minX), py: Math.round(-minY) };
}

// ── The sweep ───────────────────────────────────────────────────────────────

// Measures one joint through its whole range in one facing. The region examined
// is a disc around the joint, matching the Python's region_alpha: a defect that
// opens at the elbow should not be diluted by a clean shoulder elsewhere in the
// frame, and a clean joint should not be credited for the far side of the body.
export function sweepJoint({
    parent, parentPivot, child, childPivot, childAttachFrac,
    range, facing = 1, step = 10, regionRadius = 64, canvasSize = 0,
}) {
    const results = [];
    // Fitted to this parent/child pair rather than assumed. `canvasSize` is now
    // only a floor; it used to be the whole answer, and on real parts that put
    // both knees off the frame entirely. See fitCanvas.
    const fit = fitCanvas({
        parent, parentPivot, child, childPivot, childAttachFrac,
        facing, regionRadius, minSize: canvasSize,
    });
    const cx = fit.px;
    const cy = fit.py;

    for (let deg = range.min; deg <= range.max; deg += step) {
        const frame = canvas(fit.w, fit.h);

        // Parent at rest; the joint angle is the child's, which is what the
        // runtime rotates -- Skeleton.js:1556-1565 attaches farForearm at the
        // far elbow with its own angle, independent of the upper arm.
        drawPart(frame, parent, parentPivot, cx, cy, 0, facing);

        // Where the parent's distal anchor has landed in world space.
        const jointLocalX = (childAttachFrac.u - parentPivot.u) * parent.width;
        const jointLocalY = (childAttachFrac.v - parentPivot.v) * parent.height;
        const joint = localToWorld(cx, cy, facing < 0 ? -jointLocalX : jointLocalX,
            jointLocalY, 0);

        drawPart(frame, child, childPivot, joint.x, joint.y,
            (deg * Math.PI) / 180, facing);

        // Measured on the whole frame, scored near the joint. Cropping first
        // would clip the silhouette against the crop rectangle and measure that
        // rectangle's edges -- see sharpestAndStraight's note.
        const focus = { x: joint.x, y: joint.y, radius: regionRadius };
        const { mask } = interiorBackground(frame);
        let count = 0;
        // Disc coverage, because "no contour was scored here" has two opposite
        // meanings and reporting one for the other is its own defect.
        let discPainted = 0;
        let discUnpainted = 0;
        for (let y = 0; y < frame.h; y++) {
            for (let x = 0; x < frame.w; x++) {
                const inDisc = Math.hypot(x - joint.x, y - joint.y) <= regionRadius;
                if (inDisc) {
                    if (frame.alpha[y * frame.w + x] > PAINT_ALPHA) discPainted++;
                    else discUnpainted++;
                }
                if (!mask[y * frame.w + x]) continue;
                if (inDisc) count++;
            }
        }
        const { sharpestDeg, straightRunPx, scoredPoints } = sharpestAndStraight(frame, focus);

        // Scoring no contour in the joint region means one of two OPPOSITE
        // things, and the metrics look identical in both -- 180 degrees and a
        // zero straight run, the perfect values:
        //
        //   empty   nothing is painted in the disc at all. The joint was never
        //           in frame. This is the real front3q knees: 86px below a
        //           fixed canvas, scoring clean at every angle in both facings.
        //           No verdict is available and it must never read as a pass.
        //   buried  every pixel in the disc is painted. The joint is completely
        //           covered through this pose, which is the BEST possible
        //           outcome and a genuine pass -- the far hip does exactly this
        //           from 90 to 110 degrees.
        //
        // Telling them apart needs the disc's own coverage, not the contour.
        // Collapsing them would trade a false pass for a false unknown.
        const empty = discPainted === 0;
        const buried = !empty && discUnpainted === 0;
        results.push({
            angleDeg: deg,
            interiorBgPx: count,
            sharpestDeg,
            straightRunPx,
            scoredPoints,
            discPainted,
            discUnpainted,
            measured: !empty,
            buried,
            pass: !empty
                && count <= THRESHOLDS.interiorBgPx
                && sharpestDeg >= THRESHOLDS.sharpestDeg
                && straightRunPx <= THRESHOLDS.straightRunPx,
        });
    }

    // Worst case across all three metrics, not by interior background alone.
    //
    // An early version of this ranked on interiorBgPx, on the assumption -- from
    // the old sources failing it at 51-102px -- that it is the metric that fails
    // first. Measured on capsule-and-ellipse fixtures, it is not. A limb
    // rotating outward from the torso opens a wedge that is open to the
    // background on at least one axis, so interiorBgPx stays 0 while the flat
    // authored cut edge swings into view and straightRunPx goes to 38-41 against
    // a limit of 18. Ranking on interiorBgPx would have reported the cleanest
    // frame of a failing sweep as its worst case.
    //
    // Each metric is scored as how far past its threshold it sits, normalised by
    // that threshold so the three are comparable, and the frame with the largest
    // single exceedance wins.
    // An unmeasured frame outranks every measured one: "we do not know" is a
    // worse finding than any number, and it must be what gets reported.
    const severity = (r) => (r.measured === false ? Infinity : Math.max(
        (r.interiorBgPx - THRESHOLDS.interiorBgPx) / THRESHOLDS.interiorBgPx,
        (THRESHOLDS.sharpestDeg - r.sharpestDeg) / THRESHOLDS.sharpestDeg,
        (r.straightRunPx - THRESHOLDS.straightRunPx) / THRESHOLDS.straightRunPx,
    ));
    const worst = results.reduce((a, b) => (severity(b) > severity(a) ? b : a));
    const unmeasured = results.filter((r) => !r.measured).length;
    const buried = results.filter((r) => r.buried).length;
    return {
        facing, results, worst, unmeasured, buried,
        pass: results.every((r) => r.pass),
    };
}

export function cropDisc(img, cx, cy, r) {
    const size = r * 2;
    const out = canvas(size, size);
    const x0 = Math.round(cx - r);
    const y0 = Math.round(cy - r);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const sx = x0 + x;
            const sy = y0 + y;
            if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
            out.alpha[y * size + x] = img.alpha[sy * img.w + sx];
        }
    }
    return out;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

// A SHARED PAINTING SERVES BOTH SIDES.
//
// The eight-part decomposition Derek's 2026-09-15 brief specifies ships one
// `upper_arm.png` and one `thigh.png`, each placed twice, because that is what
// the shipped rig can consume. Every tool here only knew the twelve-part
// spelling, so an eight-part set measured nothing at four of the eight joints
// and said "missing landmarks" -- which reads like an incomplete delivery
// rather than a tool that cannot see a complete one.
//
// Deliberately the runtime's own idiom, `textures.farForearm ?? textures.forearm`
// (Skeleton.js), rather than a second convention that could disagree with it.
export const SHARED_SOURCE = Object.freeze({
    near_upper_arm: 'upper_arm',
    far_upper_arm: 'upper_arm',
    near_thigh: 'thigh',
    far_thigh: 'thigh',
});

/** Fill each logical slot from its own entry, else from the shared one. */
export function resolveDelivery(map) {
    const out = { ...map };
    for (const [slot, shared] of Object.entries(SHARED_SOURCE)) {
        if (!out[slot] && map[shared]) out[slot] = map[shared];
    }
    return out;
}

/** Which file backs a logical slot, given the names the candidate delivered. */
export function sourceFor(deliveredNames, slot) {
    if (deliveredNames.has(slot)) return slot;
    const shared = SHARED_SOURCE[slot];
    return shared && deliveredNames.has(shared) ? shared : null;
}

// Joints, and which authored part plays parent and child at each. Both sides,
// because near and far are separately authored for their own front3q depth and
// perspective and a clean near elbow is no evidence about the far one.
export const JOINTS = Object.freeze([
    { name: 'nearShoulder', joint: 'shoulder', parent: 'torso', child: 'near_upper_arm', attach: 'nearShoulder' },
    { name: 'farShoulder', joint: 'shoulder', parent: 'torso', child: 'far_upper_arm', attach: 'farShoulder' },
    { name: 'nearElbow', joint: 'elbow', parent: 'near_upper_arm', child: 'near_forearm', attach: 'elbow' },
    { name: 'farElbow', joint: 'elbow', parent: 'far_upper_arm', child: 'far_forearm', attach: 'elbow' },
    { name: 'nearHip', joint: 'hip', parent: 'pelvis_underlay', child: 'near_thigh', attach: 'nearHip' },
    { name: 'farHip', joint: 'hip', parent: 'pelvis_underlay', child: 'far_thigh', attach: 'farHip' },
    { name: 'nearKnee', joint: 'knee', parent: 'near_thigh', child: 'near_shin', attach: 'knee' },
    { name: 'farKnee', joint: 'knee', parent: 'far_thigh', child: 'far_shin', attach: 'knee' },
]);

/**
 * The joint table for a given delivery. Only the hip parent varies.
 *
 * The twelve-part set ships a `pelvis_underlay` and roots both thighs on it.
 * Shipped Lou has no pelvis layer at all -- his trunks are painted into the
 * torso -- so an eight-part set roots them on the torso's own `nearHip`/`farHip`
 * sockets, which the torso declares either way. That is the SHIPPED case, not an
 * exception to it: reporting both hips as unmeasurable because a layer the rig
 * does not use is absent would be a tool defect filed as an art one, and this
 * notebook records several sessions lost to exactly that.
 *
 * Extracted from `main` so it can be pinned. It mirrors `chainsFor` in
 * render-articulation-proofs.mjs deliberately; the two make the same decision
 * and should be readable as the same decision.
 */
export function jointsFor(deliveredNames) {
    const hipParent = deliveredNames.has('pelvis_underlay') ? 'pelvis_underlay' : 'torso';
    return JOINTS.map((spec) => (
        spec.joint === 'hip' ? { ...spec, parent: hipParent } : spec));
}

async function loadPart(dir, name) {
    // decodeRgbaPng returns { w, h, alpha, rgba }.
    const buf = await readFile(`${dir}/${name}.png`);
    const img = decodeRgbaPng(buf);
    return { width: img.w, height: img.h, alpha: img.alpha, rgba: img.rgba };
}

async function main(argv) {
    const arg = (flag, fallback = null) => {
        const i = argv.indexOf(flag);
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
    };
    const partsDir = arg('--parts');
    const landmarksPath = arg('--landmarks');
    const strict = argv.includes('--strict');
    const asJson = argv.includes('--json');
    const step = Number(arg('--step', '10'));

    if (!partsDir || !landmarksPath) {
        console.error('usage: measure-joint-articulation.mjs --parts <dir> --landmarks <file.json>');
        process.exit(2);
    }

    const rawLandmarks = JSON.parse(await readFile(landmarksPath, 'utf8'));
    // What the candidate actually shipped, so a shared painting can serve both
    // of its sides rather than reading as two missing parts.
    const deliveredNames = new Set((await readdir(partsDir))
        .filter((f) => f.endsWith('.png'))
        .map((f) => f.replace(/\.png$/, '')));
    const landmarks = resolveDelivery(rawLandmarks);
    // Where the thighs hang; see `jointsFor` for why the torso is the shipped
    // answer rather than the fallback.
    const joints = jointsFor(deliveredNames);
    const report = [];

    for (const spec of joints) {
        const parentLm = landmarks[spec.parent];
        const childLm = landmarks[spec.child];
        const parentFile = sourceFor(deliveredNames, spec.parent);
        const childFile = sourceFor(deliveredNames, spec.child);
        if (!parentLm || !childLm || !parentFile || !childFile) {
            report.push({ joint: spec.name, skipped: 'missing landmarks' });
            continue;
        }
        const parent = await loadPart(partsDir, parentFile);
        const child = await loadPart(partsDir, childFile);
        const attach = parentLm.sockets?.[spec.attach] ?? parentLm.distalAnchorFrac;
        if (!attach) {
            report.push({ joint: spec.name, skipped: `no attach point ${spec.attach}` });
            continue;
        }

        for (const facing of [1, -1]) {
            const swept = sweepJoint({
                parent,
                parentPivot: parentLm.jointPivotFrac ?? { u: 0.5, v: 0 },
                child,
                childPivot: childLm.jointPivotFrac,
                childAttachFrac: attach,
                range: ARTICULATION_RANGES[spec.joint],
                facing,
                step,
            });
            report.push({
                joint: spec.name, facing, pass: swept.pass, worst: swept.worst,
                unmeasured: swept.unmeasured, buried: swept.buried,
                frames: swept.results.length,
            });
        }
    }

    if (asJson) {
        console.log(JSON.stringify({ thresholds: THRESHOLDS, ranges: ARTICULATION_RANGES, report }, null, 2));
    } else {
        for (const row of report) {
            if (row.skipped) { console.log(`  SKIP ${row.joint}: ${row.skipped}`); continue; }
            const w = row.worst;
            if (row.unmeasured) {
                // Named, never scored. These frames had no paint in the joint
                // region at all, so their metrics are defaults rather than
                // findings. Printing those defaults beside real numbers is
                // exactly how an unmeasured joint gets read as a clean one.
                console.log(`  UNMEASURED ${row.joint} facing ${row.facing > 0 ? '+1' : '-1'}`
                    + ` -- ${row.unmeasured}/${row.frames} frames had no paint`
                    + ' in the joint region; no verdict is available');
                continue;
            }
            const buried = row.buried
                ? `, ${row.buried}/${row.frames} fully buried` : '';
            console.log(`  ${row.pass ? 'pass' : 'FAIL'} ${row.joint} facing ${row.facing > 0 ? '+1' : '-1'}`
                + ` worst@${w.angleDeg}deg interior_bg=${w.interiorBgPx}`
                + ` sharpest=${w.sharpestDeg} straight=${w.straightRunPx}${buried}`);
        }
    }

    const rows = report.filter((r) => !r.skipped);
    const measured = rows.length;
    const unmeasuredRows = rows.filter((r) => r.unmeasured > 0).length;
    const failed = report.some((r) => r.pass === false);

    // Denominator is JOINTS x both facings: each facing is its own measurement,
    // and near and far are separately authored, so a clean +1 is no evidence
    // about -1. The old form printed "16/8", which is not a fraction.
    console.log(`  ${measured}/${JOINTS.length * 2} joint-facings measured`
        + `, ${report.filter((r) => r.skipped).length} skipped`
        + `, ${unmeasuredRows} with unmeasured frames`);

    // A gate that measured nothing must not report success. `art:validate-source`
    // already taught this lesson the expensive way: without --sheet it prints
    // "source manifest valid (11 parts)" while the production bank is empty, and
    // that is the form that got quoted into handoffs. Silence is not a pass.
    if (measured === 0) {
        console.error('  nothing was measured -- no joint had both parts and landmarks');
        if (strict) process.exit(1);
    }
    if (failed && strict) process.exit(1);
}

const invokedDirectly = process.argv[1]
    && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
    main(process.argv.slice(2)).catch((err) => {
        console.error(err);
        process.exit(2);
    });
}
