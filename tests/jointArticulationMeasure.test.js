import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARTICULATION_RANGES,
    THRESHOLDS,
    canvas,
    cropDisc,
    drawPart,
    greenFringe,
    interiorBackground,
    localToWorld,
    sharpestAndStraight,
    sweepJoint,
    traceContour,
} from '../tools/wrestler-cutter/measure-joint-articulation.mjs';

// This harness measures whether a limb set stays connected through its range.
// The repository has been burned three times by a metric that was confidently
// wrong -- a unique-colour count that was always 1, a drift score that flagged a
// correct turnaround, and an arm-overhang metric that measured the complement of
// the quantity it named. Every metric here is therefore pinned against synthetic
// art whose answer is known by construction, not against real parts whose
// correct answer nobody knows yet.

function part(w, h, paint) {
    const alpha = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) alpha[y * w + x] = paint(x, y) ? 255 : 0;
    }
    return { width: w, height: h, alpha };
}

function rect(w, h) {
    return part(w, h, () => true);
}

// Limb art has rounded silhouettes, and the metrics are sensitive to that: a
// bare rectangle has a long flat side and reads as a crop ledge by
// construction, so a rectangle fixture would fail straight_run_px no matter how
// well the joint behaved. A capsule is the simplest honest stand-in for a limb
// segment, and an ellipse for a torso.
function capsule(w, h) {
    const r = w / 2;
    const cx = w / 2 - 0.5;
    return part(w, h, (x, y) => {
        if (y < r) return (x - cx) ** 2 + (y - r) ** 2 <= r * r;
        if (y > h - r) return (x - cx) ** 2 + (y - (h - r)) ** 2 <= r * r;
        return Math.abs(x - cx) <= r;
    });
}

function ellipse(w, h) {
    const cx = w / 2 - 0.5;
    const cy = h / 2 - 0.5;
    return part(w, h, (x, y) => ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1);
}

// A limb segment whose proximal end is cut flat: no overlap material above the
// pivot. This is the defect -- the flat authored attachment face that swings
// into view as the joint opens.
function flatCutLimb(w, h) {
    const r = w / 2;
    const cx = w / 2 - 0.5;
    return part(w, h, (x, y) => {
        if (y > h - r) return (x - cx) ** 2 + (y - (h - r)) ** 2 <= r * r;
        return Math.abs(x - cx) <= r;
    });
}

// ── interiorBackground ──────────────────────────────────────────────────────

test('interiorBackground: a solid rectangle encloses nothing', () => {
    const img = canvas(20, 20);
    img.alpha.fill(255);
    assert.equal(interiorBackground(img).count, 0);
});

test('interiorBackground: counts a hole, exactly', () => {
    const img = canvas(20, 20);
    img.alpha.fill(255);
    // A 3x4 hole = 12 unpainted pixels enclosed on both axes.
    for (let y = 8; y < 12; y++) {
        for (let x = 5; x < 8; x++) img.alpha[y * 20 + x] = 0;
    }
    assert.equal(interiorBackground(img).count, 12);
});

test('interiorBackground: outside background is not counted', () => {
    const img = canvas(20, 20);
    // A small blob in the middle; everything around it is outside, not interior.
    for (let y = 8; y < 12; y++) {
        for (let x = 8; x < 12; x++) img.alpha[y * 20 + x] = 255;
    }
    assert.equal(interiorBackground(img).count, 0);
});

test('interiorBackground: the wedge between two separated parts is interior', () => {
    // Two vertical bars with a gap. Rows crossing both bars enclose the gap
    // horizontally; the columns in the gap are empty so they enclose nothing --
    // which is the point of the AND: a gap open to the outside does not count.
    const img = canvas(20, 20);
    for (let y = 4; y < 16; y++) {
        for (let x = 2; x < 6; x++) img.alpha[y * 20 + x] = 255;
        for (let x = 14; x < 18; x++) img.alpha[y * 20 + x] = 255;
    }
    assert.equal(interiorBackground(img).count, 0);

    // Bridge the top and bottom so the gap is now enclosed on both axes: that
    // is the wedge shape this metric exists to catch.
    for (let x = 2; x < 18; x++) {
        img.alpha[4 * 20 + x] = 255;
        img.alpha[15 * 20 + x] = 255;
    }
    assert.ok(interiorBackground(img).count > 0,
        'an enclosed wedge must register as interior background');
});

test('interiorBackground: alpha at or below 40 reads as unpainted', () => {
    const img = canvas(10, 10);
    img.alpha.fill(255);
    img.alpha[5 * 10 + 5] = 40;
    assert.equal(interiorBackground(img).count, 1);
    img.alpha[5 * 10 + 5] = 41;
    assert.equal(interiorBackground(img).count, 0);
});

// ── traceContour and the divergence from the Python ─────────────────────────

test('traceContour: walks the boundary of a rectangle once', () => {
    const img = canvas(12, 12);
    for (let y = 3; y < 9; y++) {
        for (let x = 3; x < 9; x++) img.alpha[y * 12 + x] = 255;
    }
    const contour = traceContour(img);
    // A 6x6 square has 20 boundary pixels. The trace may revisit the start.
    assert.ok(contour.length >= 20, `expected >= 20 boundary points, got ${contour.length}`);
    for (const [x, y] of contour) {
        assert.ok(x >= 3 && x < 9 && y >= 3 && y < 9, 'contour stays on the shape');
    }
});

test('traceContour: ignores a stray speck and follows the largest component', () => {
    const img = canvas(20, 20);
    for (let y = 5; y < 15; y++) {
        for (let x = 5; x < 15; x++) img.alpha[y * 20 + x] = 255;
    }
    img.alpha[1 * 20 + 1] = 255; // keyer speck
    const contour = traceContour(img);
    assert.ok(contour.every(([x, y]) => x >= 5 && y >= 5),
        'the speck must not become the silhouette');
});

// The documented reason this file does not reproduce the Python's contour.
// validate_joints.py orders boundary pixels by angle around the centroid, which
// is a contour only for a star-shaped silhouette. An L -- every flexed elbow and
// knee -- is not star-shaped about its centroid: the centroid falls in the
// notch, and points from the two arms interleave in the angular sort.
test('traceContour: an L is measured on its real boundary, not an angular sort', () => {
    const w = 40;
    const img = canvas(w, w);
    const inL = (x, y) => (x >= 4 && x < 12 && y >= 4 && y < 32)
        || (y >= 24 && y < 32 && x >= 4 && x < 32);
    for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) if (inL(x, y)) img.alpha[y * w + x] = 255;
    }

    const contour = traceContour(img);
    assert.ok(contour.length > 40, 'the L has a substantial boundary');
    for (const [x, y] of contour) {
        assert.ok(inL(x, y), 'every traced point lies on the L itself');
    }

    // The centroid of an L lies OUTSIDE the shape, in the notch. That is
    // precisely what breaks the angular ordering, and it is checkable.
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const [x, y] of contour) { sx += x; sy += y; n++; }
    const cx = Math.round(sx / n);
    const cy = Math.round(sy / n);
    assert.equal(inL(cx, cy), false,
        'the L centroid falls outside the shape, so an angular sort about it '
        + 'cannot order this boundary -- this is why the Python is not reused here');

    // Consecutive traced points are always neighbours. An angular sort about an
    // outside centroid cannot promise this, and a contour that teleports
    // produces invented corners and invented straight runs.
    for (let i = 1; i < contour.length; i++) {
        const dx = Math.abs(contour[i][0] - contour[i - 1][0]);
        const dy = Math.abs(contour[i][1] - contour[i - 1][1]);
        assert.ok(dx <= 1 && dy <= 1,
            `contour step ${i} jumped (${dx},${dy}); a real trace never teleports`);
    }
});

// ── sharpestAndStraight ─────────────────────────────────────────────────────

test('sharpestAndStraight: a disc has no sharp corner and no long straight run', () => {
    const size = 80;
    const img = canvas(size, size);
    const r = 30;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - size / 2;
            const dy = y - size / 2;
            if (dx * dx + dy * dy <= r * r) img.alpha[y * size + x] = 255;
        }
    }
    const { sharpestDeg, straightRunPx } = sharpestAndStraight(img);
    assert.ok(sharpestDeg >= THRESHOLDS.sharpestDeg,
        `a disc must not read as a spike, got ${sharpestDeg}`);
    assert.ok(straightRunPx <= THRESHOLDS.straightRunPx,
        `a disc has no crop ledge, got ${straightRunPx}`);
});

test('sharpestAndStraight: a spear reads as a sharp corner', () => {
    // A narrow triangle: the tip is roughly 20 degrees.
    const size = 80;
    const img = canvas(size, size);
    for (let y = 10; y < 70; y++) {
        const halfWidth = Math.floor((y - 10) / 6);
        for (let x = 40 - halfWidth; x <= 40 + halfWidth; x++) {
            if (x >= 0 && x < size) img.alpha[y * size + x] = 255;
        }
    }
    const { sharpestDeg } = sharpestAndStraight(img);
    assert.ok(sharpestDeg < THRESHOLDS.sharpestDeg,
        `a spear tip must fail the 35deg floor, got ${sharpestDeg}`);
});

// Regression pin for the defect this harness shipped with in its first version,
// inherited from validate_joints.py: measuring a square crop taken around the
// joint. The figure always overruns such a crop, the silhouette is clipped by
// the crop rectangle, and the contour then walks the rectangle's own straight
// edge -- so straightRunPx reported the crop size at every joint angle,
// including rest, and would have failed every limb ever authored.
//
// If this test fails because someone reintroduced cropping into the measurement
// path, the gate is measuring its own crop again.
test('sharpestAndStraight: a clipped silhouette does not fabricate a straight run', () => {
    const size = 60;
    const full = canvas(size, size);
    // A disc larger than the frame: every boundary pixel is frame edge.
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - size / 2;
            const dy = y - size / 2;
            if (dx * dx + dy * dy <= 80 * 80) full.alpha[y * size + x] = 255;
        }
    }
    const clipped = sharpestAndStraight(full);
    assert.ok(clipped.straightRunPx > THRESHOLDS.straightRunPx,
        'a silhouette clipped to the frame does read as straight -- which is '
        + 'exactly why the measurement must not be handed a crop');

    // The same shape scored only near its centre, away from the clipped edges,
    // reports no straight run: the focus filter is what makes this safe.
    const focused = sharpestAndStraight(full, { x: size / 2, y: size / 2, radius: 8 });
    assert.equal(focused.straightRunPx, 0,
        'no contour lies within the focus, so nothing is scored');
});

test('sharpestAndStraight: a long flat cut edge reads as a straight run', () => {
    // A wide rectangle: its long side is a crop ledge by construction.
    const img = canvas(120, 40);
    for (let y = 10; y < 30; y++) {
        for (let x = 5; x < 115; x++) img.alpha[y * 120 + x] = 255;
    }
    const { straightRunPx } = sharpestAndStraight(img);
    assert.ok(straightRunPx > THRESHOLDS.straightRunPx,
        `a 110px flat edge must exceed the 18px ledge limit, got ${straightRunPx}`);
});

// ── compositing ─────────────────────────────────────────────────────────────

test('localToWorld: matches Skeleton.js _endXY at the identity angle', () => {
    const p = localToWorld(100, 100, 7, -3, 0);
    assert.deepEqual(p, { x: 107, y: 97 });
});

test('localToWorld: reduces to _end along the bone axis', () => {
    // Skeleton.js _end: x = px + sin(a)*h, y = py + cos(a)*h for a point at
    // local (0, h). localToWorld must agree, or the harness poses limbs
    // differently from the runtime and every number it prints is about a body
    // the game never draws.
    for (const deg of [0, 30, 90, 145, -60]) {
        const a = (deg * Math.PI) / 180;
        const h = 50;
        const viaEnd = { x: 100 + Math.sin(a) * h, y: 100 + Math.cos(a) * h };
        const viaLocal = localToWorld(100, 100, 0, h, a);
        assert.ok(Math.abs(viaEnd.x - viaLocal.x) < 1e-9
            && Math.abs(viaEnd.y - viaLocal.y) < 1e-9,
            `divergence at ${deg}deg`);
    }
});

test('drawPart: an unrotated part lands with its pivot on the joint', () => {
    const dst = canvas(60, 60);
    const p = rect(10, 20);
    // Pivot at top-centre, the convention Skeleton.js uses.
    drawPart(dst, p, { u: 0.5, v: 0 }, 30, 20, 0, 1);
    // The pixel at the pivot is painted, and the part extends downward.
    assert.ok(dst.alpha[20 * 60 + 30] > 0, 'pivot pixel is painted');
    assert.ok(dst.alpha[38 * 60 + 30] > 0, 'part extends down from the pivot');
    assert.equal(dst.alpha[10 * 60 + 30], 0, 'part does not extend above the pivot');
});

test('drawPart: rotation is about the pivot, and area is preserved', () => {
    const areaAt = (deg) => {
        const dst = canvas(120, 120);
        const p = rect(12, 40);
        drawPart(dst, p, { u: 0.5, v: 0 }, 60, 60, (deg * Math.PI) / 180, 1);
        return dst.alpha.reduce((n, a) => n + (a > 0 ? 1 : 0), 0);
    };
    const base = areaAt(0);
    // Nearest-neighbour resampling is not exactly area preserving, but a limb
    // that loses or gains a tenth of itself under rotation would make every
    // interior-background number meaningless.
    for (const deg of [45, 90, 137, 190, -120]) {
        const a = areaAt(deg);
        assert.ok(Math.abs(a - base) / base < 0.1,
            `area at ${deg}deg drifted from ${base} to ${a}`);
    }
});

test('drawPart: inverse mapping leaves no gaps in a rotated part', () => {
    // Forward mapping would scatter source pixels and leave unpainted holes,
    // and those holes would be counted as interior background -- the harness
    // would then report a defect it had introduced itself.
    const dst = canvas(120, 120);
    drawPart(dst, rect(20, 60), { u: 0.5, v: 0 }, 60, 60, (37 * Math.PI) / 180, 1);
    assert.equal(interiorBackground(dst).count, 0,
        'a rotated solid part must enclose no unpainted pixels');
});

test('drawPart: facing -1 mirrors the part', () => {
    const asymmetric = part(20, 20, (x) => x < 6);
    const right = canvas(60, 60);
    const left = canvas(60, 60);
    drawPart(right, asymmetric, { u: 0.5, v: 0.5 }, 30, 30, 0, 1);
    drawPart(left, asymmetric, { u: 0.5, v: 0.5 }, 30, 30, 0, -1);
    const massLeftOf = (img) => {
        let n = 0;
        for (let y = 0; y < 60; y++) for (let x = 0; x < 30; x++) if (img.alpha[y * 60 + x]) n++;
        return n;
    };
    assert.ok(massLeftOf(right) > massLeftOf(left),
        'mirroring must move the mass to the other side of the pivot');
});

// ── the sweep, end to end ───────────────────────────────────────────────────

// A shoulder: limb capsule attaching inside an elliptical torso.
const SHOULDER = {
    parent: ellipse(140, 180),
    parentPivot: { u: 0.5, v: 0.5 },
    childAttachFrac: { u: 0.72, v: 0.30 },
};

test('sweepJoint: a generously overlapped joint holds through the full range', () => {
    // The child's pivot sits 30% down its own paint, so the material above the
    // pivot is overlap that stays buried in the torso at every angle. This is
    // "generous anatomically painted overlap extending through the joint",
    // reduced to the geometry the metric can see.
    const swept = sweepJoint({
        ...SHOULDER,
        child: capsule(34, 110),
        childPivot: { u: 0.5, v: 0.30 },
        range: ARTICULATION_RANGES.shoulder,
        step: 20,
    });
    assert.equal(swept.pass, true,
        `overlapped joint failed at ${swept.worst.angleDeg}deg: `
        + `interior_bg=${swept.worst.interiorBgPx} `
        + `sharpest=${swept.worst.sharpestDeg} straight=${swept.worst.straightRunPx}`);
});

test('sweepJoint: a flat-cut attachment face is caught at high flex', () => {
    // The same joint with the limb's proximal end cut flat and the pivot on
    // that cut: no overlap. This is the defect the old sources had, and a
    // harness that cannot see it is worthless.
    const swept = sweepJoint({
        ...SHOULDER,
        child: flatCutLimb(34, 110),
        childPivot: { u: 0.5, v: 0 },
        range: ARTICULATION_RANGES.shoulder,
        step: 20,
    });
    assert.equal(swept.pass, false, 'a zero-overlap flat cut must fail');
});

// Pinned because it corrects an assumption this harness was first built on.
// The old sources failed interior_bg at 51-102px, so interiorBgPx looked like
// the metric that fails first. For a limb rotating outward from the torso it is
// not: the wedge that opens is open to the background on at least one axis, so
// interiorBgPx stays 0 and straightRunPx is what registers the defect. A future
// change that quietly drops straightRunPx would stop catching flat cut faces
// altogether while still looking like a working gate.
test('sweepJoint: an outward rotation is caught by straight run, not interior bg', () => {
    const swept = sweepJoint({
        ...SHOULDER,
        child: flatCutLimb(34, 110),
        childPivot: { u: 0.5, v: 0 },
        range: { min: 60, max: 190 },
        step: 65,
    });
    assert.ok(swept.results.every((r) => r.interiorBgPx === 0),
        'an outward-opening wedge is not enclosed, so interior bg stays 0');
    assert.ok(swept.results.some((r) => r.straightRunPx > THRESHOLDS.straightRunPx),
        'the flat cut edge must register as a straight run');
    assert.equal(swept.pass, false);
});

test('sweepJoint: reports the worst angle, not the rest pose', () => {
    // A joint that is clean at rest and fails only at extension must be
    // reported as failing, and the reported frame must be the failing one.
    // Averaging across the sweep, or ranking on the wrong metric, would hide
    // exactly the pose the stress ranges were widened to reach.
    const swept = sweepJoint({
        ...SHOULDER,
        child: flatCutLimb(34, 110),
        childPivot: { u: 0.5, v: 0 },
        range: { min: 0, max: 190 },
        step: 20,
    });
    const atRest = swept.results.find((r) => r.angleDeg === 0);
    assert.equal(atRest.pass, true, 'at rest the flat cut is hidden and passes');
    assert.equal(swept.pass, false, 'and the sweep still catches it');
    assert.equal(swept.worst.pass, false,
        'the reported worst frame must be one that actually fails');
    assert.notEqual(swept.worst.angleDeg, 0);
});

test('sweepJoint: both facings are measured independently', () => {
    const base = {
        ...SHOULDER,
        child: capsule(34, 110),
        childPivot: { u: 0.5, v: 0.30 },
        range: ARTICULATION_RANGES.knee,
        step: 30,
    };
    const right = sweepJoint({ ...base, facing: 1 });
    const left = sweepJoint({ ...base, facing: -1 });
    assert.equal(right.facing, 1);
    assert.equal(left.facing, -1);
    assert.equal(right.results.length, left.results.length);
});

// ── ranges and thresholds ───────────────────────────────────────────────────

test('the production articulation ranges are the ones Derek set', () => {
    // Pinned because they supersede NEW_ASSETS_SPEC.md's narrower table, and a
    // silent narrowing would quietly stop testing overhead attacks, rope taunts,
    // backward arm travel, knee lifts and gait extremes.
    assert.deepEqual(ARTICULATION_RANGES.shoulder, { min: -120, max: 190 });
    assert.deepEqual(ARTICULATION_RANGES.hip, { min: -60, max: 125 });
    assert.deepEqual(ARTICULATION_RANGES.elbow, { min: -10, max: 160 });
    assert.deepEqual(ARTICULATION_RANGES.knee, { min: -10, max: 150 });
});

test('the thresholds still match NEW_ASSETS_SPEC.md', () => {
    assert.equal(THRESHOLDS.interiorBgPx, 8);
    assert.equal(THRESHOLDS.sharpestDeg, 35);
    assert.equal(THRESHOLDS.straightRunPx, 18);
});

// ── green fringe ────────────────────────────────────────────────────────────

test('greenFringe: counts keyer residue only where the part is painted', () => {
    const alpha = new Uint8Array([255, 255, 0]);
    const rgba = new Uint8Array([
        20, 200, 20, 255,   // painted, green: fringe
        180, 150, 140, 255, // painted, skin: not fringe
        20, 200, 20, 0,     // transparent: not counted
    ]);
    assert.equal(greenFringe(rgba, alpha), 1);
});

// ── cropDisc ────────────────────────────────────────────────────────────────

test('cropDisc: pads rather than throwing when the joint is near an edge', () => {
    const img = canvas(40, 40);
    img.alpha.fill(255);
    const out = cropDisc(img, 2, 2, 16);
    assert.equal(out.w, 32);
    assert.equal(out.alpha[0], 0, 'off-canvas area reads as unpainted');
    assert.ok(out.alpha[20 * 32 + 20] > 0, 'on-canvas area is preserved');
});
