import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from '../tools/wrestler-cutter/validate-source-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

import {
    FRONT3Q_DEPTH_ORDER,
    applyScanlines,
    articulationProof,
    assemble,
    assembleFrame,
    extractPanel,
    pivotOf,
    blitInto,
    contactSheet,
    drawPartRgba,
    rgbaCanvas,
    scaleComparison,
    scaleToHeight,
    toGrayscale,
    trimToContent,
} from '../tools/wrestler-cutter/render-articulation-proofs.mjs';

// The proof renderer produces the pictures a human approves from. A defect here
// is worse than a defect in a measurement, because a wrong number invites
// argument and a wrong picture gets believed. The parked proof-alpha seam in
// AI_HANDOFF.md is the standing example: a blit that overwrote destination alpha
// punched translucent seams into proof images for weeks, and every reviewer who
// saw them was looking at the renderer rather than the art.

function solidPart(w, h, rgb = [180, 150, 140]) {
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        rgba[i * 4] = rgb[0];
        rgba[i * 4 + 1] = rgb[1];
        rgba[i * 4 + 2] = rgb[2];
        rgba[i * 4 + 3] = 255;
    }
    return { w, h, rgba };
}

// ── treatment ───────────────────────────────────────────────────────────────

test('toGrayscale: collapses colour and preserves alpha', () => {
    const img = rgbaCanvas(2, 1);
    img.rgba.set([255, 0, 0, 255, 0, 0, 255, 128]);
    const g = toGrayscale(img);
    assert.equal(g.rgba[0], g.rgba[1]);
    assert.equal(g.rgba[1], g.rgba[2]);
    assert.equal(g.rgba[3], 255, 'alpha survives');
    assert.equal(g.rgba[7], 128, 'partial alpha survives');
    // Rec.709: red is darker than blue is not true -- red 0.2126 > blue 0.0722.
    assert.ok(g.rgba[0] > g.rgba[4], 'red luminance exceeds blue');
});

test('toGrayscale: collapses the declared hair and boot families together', () => {
    // AI_HANDOFF.md records that hair (42) and boot (54) collapse into one
    // cluster at ~64-66 under the broadcast filter. The exact cluster value
    // depends on the source hue; what is pinned here is that two families
    // 12 luma apart in the contract can land within a couple of luma of each
    // other once colour is discarded -- which is why colour separation is not a
    // substitute for value separation.
    const hair = rgbaCanvas(1, 1);
    hair.rgba.set([20, 50, 30, 255]);
    const boot = rgbaCanvas(1, 1);
    boot.rgba.set([60, 44, 40, 255]);
    const dh = toGrayscale(hair).rgba[0];
    const db = toGrayscale(boot).rgba[0];
    assert.ok(Math.abs(dh - db) < 10,
        `two visibly different colours landed at ${dh} and ${db} in grayscale`);
});

test('applyScanlines: darkens every other row, in screen space', () => {
    const img = rgbaCanvas(4, 4, [200, 200, 200, 255]);
    const out = applyScanlines(img);
    const rowValue = (y) => out.rgba[(y * 4 + 0) * 4];
    assert.ok(rowValue(0) < 200, 'row 0 is scanlined');
    assert.equal(rowValue(1), 200, 'row 1 is untouched');
    assert.ok(rowValue(2) < 200, 'row 2 is scanlined');
    assert.equal(rowValue(3), 200, 'row 3 is untouched');
});

// The detail that makes a small-scale comparison honest. Arena.js generates the
// scanline texture once at canvas size and composites it over the finished
// frame, so the 2px pitch is constant regardless of how tall the wrestler is. A
// renderer that scaled scanlines with the figure would show every figure
// receiving the same number of lines and hide the whole reason small scale is
// hard.
test('applyScanlines: pitch is fixed, so a smaller figure takes proportionally more', () => {
    const tall = rgbaCanvas(8, 80, [200, 200, 200, 255]);
    const short = scaleToHeight(tall, 20);
    const linesIn = (img) => {
        let n = 0;
        for (let y = 0; y < img.h; y++) {
            if (img.rgba[(y * img.w) * 4] < 190) n++;
        }
        return n;
    };
    const tallLines = linesIn(applyScanlines(tall));
    const shortLines = linesIn(applyScanlines(short));
    assert.equal(tallLines, 40);
    assert.equal(shortLines, 10);
    // Same fraction of rows, but across a figure with a quarter of the height:
    // each scanline eats four times as much of the wrestler.
    assert.ok(tallLines / tall.h === shortLines / short.h,
        'the pitch is a property of the screen, not of the figure');
});

test('scaleToHeight: averages rather than dropping pixels', () => {
    // A 1px black line on white must survive as grey, not vanish. Nearest
    // neighbour would drop it entirely half the time and flatter the art by
    // hiding detail that does not survive downscaling.
    const img = rgbaCanvas(4, 4, [255, 255, 255, 255]);
    for (let x = 0; x < 4; x++) {
        const i = (1 * 4 + x) * 4;
        img.rgba[i] = 0; img.rgba[i + 1] = 0; img.rgba[i + 2] = 0;
    }
    const small = scaleToHeight(img, 2);
    assert.equal(small.h, 2);
    const top = small.rgba[0];
    assert.ok(top > 0 && top < 255, `expected a grey average, got ${top}`);
});

test('scaleToHeight: transparent pixels do not darken the silhouette edge', () => {
    // Premultiplied averaging. Without it, a transparent black pixel next to an
    // opaque skin pixel drags the edge toward black and the figure grows a dark
    // outline that is not in the art.
    const img = rgbaCanvas(2, 2);
    for (let i = 0; i < 4; i++) {
        img.rgba[i * 4] = 200; img.rgba[i * 4 + 1] = 180; img.rgba[i * 4 + 2] = 170;
    }
    img.rgba[3] = 255;   // one opaque
    img.rgba[7] = 0;     // three transparent
    img.rgba[11] = 0;
    img.rgba[15] = 0;
    const small = scaleToHeight(img, 1);
    assert.equal(small.rgba[0], 200, 'colour comes only from the opaque pixel');
    assert.ok(small.rgba[3] > 0 && small.rgba[3] < 255, 'alpha is averaged');
});

// ── blit ────────────────────────────────────────────────────────────────────

// Regression pin for the seam parked in AI_HANDOFF.md: the proof renderer's
// non-rotated blit overwrote destination alpha unconditionally, punching
// translucent 1px seams into 11 strictly-interior cases. Proofs only, never
// asset bytes -- but reviewers saw them and could not tell renderer from art.
test('blitInto: a transparent source pixel does not punch a hole', () => {
    const dst = rgbaCanvas(4, 4, [255, 255, 255, 255]);
    const src = rgbaCanvas(2, 2); // fully transparent
    blitInto(dst, src, 1, 1);
    for (let i = 0; i < 16; i++) {
        assert.equal(dst.rgba[i * 4 + 3], 255,
            'destination alpha must survive a transparent source');
    }
});

test('blitInto: clips at the destination edge instead of wrapping', () => {
    const dst = rgbaCanvas(4, 4);
    const src = rgbaCanvas(3, 3, [10, 20, 30, 255]);
    blitInto(dst, src, 3, 3);
    assert.equal(dst.rgba[(3 * 4 + 3) * 4 + 3], 255, 'the in-bounds pixel lands');
    assert.equal(dst.rgba[0], 0, 'nothing wrapped to the opposite corner');
});

// ── trim ────────────────────────────────────────────────────────────────────

test('trimToContent: crops to the painted bounds with padding', () => {
    const img = rgbaCanvas(20, 20);
    for (let y = 8; y < 12; y++) {
        for (let x = 5; x < 9; x++) img.rgba[(y * 20 + x) * 4 + 3] = 255;
    }
    const trimmed = trimToContent(img, 1);
    assert.equal(trimmed.w, 6);
    assert.equal(trimmed.h, 6);
});

test('trimToContent: an empty image does not throw', () => {
    const out = trimToContent(rgbaCanvas(10, 10));
    assert.equal(out.w, 1);
});

// ── composite ───────────────────────────────────────────────────────────────

test('drawPartRgba: composites source-over and keeps colour', () => {
    const dst = rgbaCanvas(20, 20);
    drawPartRgba(dst, solidPart(6, 6, [10, 200, 30]), { u: 0.5, v: 0.5 }, 10, 10, 0, 1);
    const i = (10 * 20 + 10) * 4;
    assert.equal(dst.rgba[i + 1], 200, 'green channel survives');
    assert.equal(dst.rgba[i + 3], 255);
});

test('drawPartRgba: a rotated part leaves no interior gaps', () => {
    const dst = rgbaCanvas(80, 80);
    drawPartRgba(dst, solidPart(16, 50), { u: 0.5, v: 0 }, 40, 20, (37 * Math.PI) / 180, 1);
    // Walk the painted rows: no fully transparent pixel may sit between two
    // painted ones on the same row, which is what forward mapping would leave.
    for (let y = 0; y < 80; y++) {
        let first = -1;
        let last = -1;
        for (let x = 0; x < 80; x++) {
            if (dst.rgba[(y * 80 + x) * 4 + 3] > 0) { if (first < 0) first = x; last = x; }
        }
        if (first < 0) continue;
        for (let x = first; x <= last; x++) {
            assert.ok(dst.rgba[(y * 80 + x) * 4 + 3] > 0,
                `gap at (${x},${y}) in a rotated solid part`);
        }
    }
});

// ── assembly, end to end ────────────────────────────────────────────────────

// A complete synthetic part set with landmarks, so the renderer is proven to
// work before any real art exists. Every part is a flat rectangle of a distinct
// colour -- the point is the wiring, not the anatomy.
function syntheticSet() {
    const parts = {};
    const landmarks = {};
    const add = (name, w, h, rgb, lm) => {
        parts[name] = solidPart(w, h, rgb);
        landmarks[name] = lm;
    };

    add('torso', 120, 160, [190, 160, 150], {
        jointPivotFrac: { u: 0.5, v: 0.5 },
        sockets: {
            neck: { u: 0.5, v: 0.08 },
            nearShoulder: { u: 0.70, v: 0.16 },
            farShoulder: { u: 0.30, v: 0.16 },
            nearHip: { u: 0.62, v: 0.92 },
            farHip: { u: 0.38, v: 0.92 },
        },
    });
    add('pelvis_underlay', 120, 160, [120, 110, 105], {
        jointPivotFrac: { u: 0.5, v: 0.5 },
        sockets: {
            nearHip: { u: 0.62, v: 0.92 },
            farHip: { u: 0.38, v: 0.92 },
        },
    });
    add('pelvis_overlay', 120, 160, [40, 40, 45], { jointPivotFrac: { u: 0.5, v: 0.5 } });
    add('head', 60, 70, [200, 175, 165], {
        jointPivotFrac: { u: 0.5, v: 1 }, headAnchorFrac: { u: 0.5, v: 1 },
    });

    for (const [name, rgb] of [['near_upper_arm', [185, 155, 145]], ['far_upper_arm', [150, 125, 118]]]) {
        add(name, 30, 80, rgb, {
            jointPivotFrac: { u: 0.5, v: 0.20 },
            distalAnchorFrac: { u: 0.5, v: 0.95 },
        });
    }
    for (const [name, rgb] of [['near_forearm', [185, 155, 145]], ['far_forearm', [150, 125, 118]]]) {
        add(name, 26, 78, rgb, { jointPivotFrac: { u: 0.5, v: 0.20 } });
    }
    for (const [name, rgb] of [['near_thigh', [180, 150, 142]], ['far_thigh', [145, 120, 114]]]) {
        add(name, 38, 90, rgb, {
            jointPivotFrac: { u: 0.5, v: 0.18 },
            distalAnchorFrac: { u: 0.5, v: 0.95 },
        });
    }
    for (const [name, rgb] of [['near_shin', [175, 148, 140]], ['far_shin', [140, 118, 112]]]) {
        add(name, 34, 92, rgb, { jointPivotFrac: { u: 0.5, v: 0.18 } });
    }
    return { parts, landmarks };
}

test('assemble: builds a figure from a complete part set', () => {
    const { parts, landmarks } = syntheticSet();
    const figure = trimToContent(assembleFrame({ parts, landmarks }));
    assert.ok(figure.w > 100 && figure.h > 200,
        `assembled figure is implausibly small: ${figure.w}x${figure.h}`);
    let painted = 0;
    for (let i = 0; i < figure.w * figure.h; i++) if (figure.rgba[i * 4 + 3] > 0) painted++;
    assert.ok(painted > 5000, 'the figure has substantial painted area');
});

test('assemble: a posed joint moves its child and its grandchild', () => {
    // The elbow must follow the shoulder. If the chain were not walked, rotating
    // the upper arm would leave the forearm floating at its rest position -- the
    // disconnected-limb failure, introduced by the renderer rather than the art.
    const { parts, landmarks } = syntheticSet();
    const rest = trimToContent(assembleFrame({ parts, landmarks }));
    const posed = trimToContent(assembleFrame({
        parts, landmarks, pose: { near_upper_arm: 90 },
    }));
    assert.notEqual(rest.w, posed.w,
        'raising the arm to 90deg must change the figure silhouette');
});

// Regression pin. The head is in FRONT3Q_DEPTH_ORDER but was missing from the
// chain table, so it got no placement and was silently never drawn -- while the
// renderer still reported "12/12 parts rendered", because the part had loaded
// fine and merely had nowhere to go. Caught by looking at the output image, not
// by any assertion that existed at the time.
//
// Any part in the depth order must actually reach the canvas.
test('assemble: every part in the depth order is drawn, the head included', () => {
    const { parts, landmarks } = syntheticSet();
    const withHead = assembleFrame({ parts, landmarks });
    const headless = assembleFrame({ parts: { ...parts, head: null }, landmarks });
    const painted = (img) => {
        let n = 0;
        for (let i = 0; i < img.w * img.h; i++) if (img.rgba[i * 4 + 3] > 0) n++;
        return n;
    };
    assert.ok(painted(withHead) > painted(headless),
        'dropping the head must change the figure -- if it does not, the head '
        + 'was never being drawn in the first place');
});

test('assemble: missing parts degrade rather than throw', () => {
    const { parts, landmarks } = syntheticSet();
    delete parts.far_forearm;
    delete parts.head;
    assert.doesNotThrow(() => assembleFrame({ parts, landmarks }));
});

test('articulationProof: renders both facings across the range', () => {
    const { parts, landmarks } = syntheticSet();
    const steps = 5;
    const sheet = articulationProof({ parts, landmarks, partName: 'near_upper_arm', steps });
    // Two rows of `steps` cells.
    assert.ok(sheet.w > sheet.h / 2, 'the sheet lays frames out in rows');
    let painted = 0;
    for (let i = 0; i < sheet.w * sheet.h; i++) if (sheet.rgba[i * 4 + 3] > 0) painted++;
    assert.ok(painted > 0, 'the contact sheet is not blank');
});

test('scaleComparison: emits every requested height under identical treatment', () => {
    const { parts, landmarks } = syntheticSet();
    const figure = trimToContent(assembleFrame({ parts, landmarks }));
    const heights = [265, 209, 154];
    const out = scaleComparison(figure, figure, heights);
    // Three stacked rows, each at least as tall as its figure plus gutters.
    const minimum = heights.reduce((n, h) => n + h, 0);
    assert.ok(out.h >= minimum, `expected at least ${minimum}px of stacked rows, got ${out.h}`);
});

test('scaleComparison: works with no reference to compare against', () => {
    const { parts, landmarks } = syntheticSet();
    const figure = trimToContent(assembleFrame({ parts, landmarks }));
    assert.doesNotThrow(() => scaleComparison(figure, null, [154]));
});

test('contactSheet: an empty frame list does not throw', () => {
    assert.equal(contactSheet([]).w, 1);
});

test('the front3q depth order backs coverage layers behind what they support', () => {
    const at = (name) => FRONT3Q_DEPTH_ORDER.indexOf(name);
    // pelvisUnderlay behind the thighs it backs; pelvisOverlay over them to hide
    // the hip seam. A coverage layer drawn on top paints over the art it exists
    // to support -- the mistake that put shoulderMask last in every view's
    // depthOrder before Milestone 4.
    assert.ok(at('pelvis_underlay') < at('near_thigh'));
    assert.ok(at('pelvis_overlay') > at('near_thigh'));
    // Far side behind the torso, near side in front: what makes 3q read as depth.
    assert.ok(at('far_upper_arm') < at('torso'));
    assert.ok(at('near_upper_arm') > at('torso'));
});

// ── real schema ─────────────────────────────────────────────────────────────
//
// Everything above this line uses a synthetic set that declares BOTH
// headAnchorFrac and jointPivotFrac on every part, and gives the pelvis the
// torso's own canvas. Real exports do neither, and that gap is exactly what let
// a renderer pass 20 tests and still assemble Lou with his pelvis above his
// head. These fixtures use the real schema's shapes.

// The real head declares headAnchorFrac and NO jointPivotFrac.
test('pivotOf: the head pivots on its neck base, not its top edge', () => {
    const head = { headAnchorFrac: { u: 0.56872, v: 0.946237 }, headScale: 1 };
    assert.deepEqual(pivotOf('head', head), head.headAnchorFrac);
});

// The real torso declares sockets and NO jointPivotFrac. The bug was two
// different defaults for that missing value -- {u:0.5,v:0} when resolving a
// socket, {u:0.5,v:0.5} when placing the root -- so every socket hung half a
// torso-height off the figure.
test('pivotOf: one default for a part that declares no pivot', () => {
    const torso = { sockets: { neck: { u: 0.5, v: 0.1 } } };
    const a = pivotOf('torso', torso);
    const b = pivotOf('torso', torso);
    assert.deepEqual(a, b);
    assert.deepEqual(a, { u: 0.5, v: 0.5 },
        'the fallback must be a single declared value, not per-call-site');
});

test('pivotOf: a limb segment uses its declared joint pivot', () => {
    const arm = { jointPivotFrac: { u: 0.67, v: 0.155 }, distalAnchorFrac: { u: 0.35, v: 0.92 } };
    assert.deepEqual(pivotOf('near_upper_arm', arm), arm.jointPivotFrac);
});

// A real-schema set: head with only headAnchorFrac, torso with only sockets,
// pelvis on its OWN cropped canvas registered through shared hip sockets.
function realSchemaSet() {
    const parts = {
        head: solidPart(211, 279),
        torso: solidPart(266, 418),
        pelvis_underlay: solidPart(260, 216),
        near_upper_arm: solidPart(167, 296),
        near_forearm: solidPart(179, 293),
        near_thigh: solidPart(148, 408),
        near_shin: solidPart(150, 300),
    };
    const landmarks = {
        head: { headAnchorFrac: { u: 0.56872, v: 0.946237 }, headScale: 1 },
        torso: {
            sockets: {
                neck: { u: 0.567669, v: 0.107656 },
                nearShoulder: { u: 0.236842, v: 0.27512 },
                farShoulder: { u: 0.81203, v: 0.251196 },
                nearHip: { u: 0.315789, v: 0.889952 },
                farHip: { u: 0.793233, v: 0.866029 },
            },
        },
        pelvis_underlay: {
            sockets: {
                nearHip: { u: 0.273077, v: 0.569444 },
                farHip: { u: 0.723077, v: 0.569444 },
            },
        },
        near_upper_arm: {
            jointPivotFrac: { u: 0.670659, v: 0.155405 },
            distalAnchorFrac: { u: 0.347305, v: 0.918919 },
        },
        near_forearm: { jointPivotFrac: { u: 0.290503, v: 0.156997 } },
        near_thigh: {
            jointPivotFrac: { u: 0.466216, v: 0.10049 },
            distalAnchorFrac: { u: 0.391892, v: 0.938725 },
        },
        near_shin: { jointPivotFrac: { u: 0.395, v: 0.084706 } },
    };
    return { parts, landmarks };
}

test('assemble: the real schema places the head below the torso top, not above it', () => {
    // The reported failure, as an assertion. The head attaches at the torso's
    // neck socket (v=0.108), so its neck base must land near the top of the
    // torso -- never above the torso's own top edge, which is what a pivot
    // mismatch produced.
    const { parts, landmarks } = realSchemaSet();
    const { placements } = assemble({ parts, landmarks });
    const torso = placements.torso;
    const head = placements.head;
    assert.ok(head, 'the head is placed');
    const torsoTop = torso.y - pivotOf('torso', landmarks.torso).v * parts.torso.h;
    assert.ok(head.y > torsoTop,
        `head anchor at ${head.y.toFixed(1)} is above the torso top ${torsoTop.toFixed(1)}`);
    assert.ok(Math.abs(head.y - (torsoTop + 0.107656 * parts.torso.h)) < 2,
        'the head anchor sits on the torso neck socket');
});

test('assemble: the pelvis registers to the torso through shared hip sockets', () => {
    // The real pelvis export is its own cropped canvas with no shared origin.
    // The only thing tying it to the torso is that both declare nearHip/farHip.
    const { parts, landmarks } = realSchemaSet();
    const { placements, diagnostics } = assemble({ parts, landmarks });
    assert.ok(placements.pelvis_underlay, 'the pelvis is registered, not skipped');
    assert.ok(typeof diagnostics.pelvisHipSpanRatio === 'number',
        'the hip-span disagreement is reported rather than silently scaled away');

    // Hip midpoints must coincide: that is what registration means.
    const pel = placements.pelvis_underlay;
    const pelPivot = pivotOf('pelvis_underlay', landmarks.pelvis_underlay);
    const pelMidU = (0.273077 + 0.723077) / 2;
    const pelMidV = 0.569444;
    const pelHipX = pel.x + (pelMidU - pelPivot.u) * parts.pelvis_underlay.w;
    const pelHipY = pel.y + (pelMidV - pelPivot.v) * parts.pelvis_underlay.h;

    const torso = placements.torso;
    const tPivot = pivotOf('torso', landmarks.torso);
    const tMidU = (0.315789 + 0.793233) / 2;
    const tMidV = (0.889952 + 0.866029) / 2;
    const tHipX = torso.x + (tMidU - tPivot.u) * parts.torso.w;
    const tHipY = torso.y + (tMidV - tPivot.v) * parts.torso.h;

    assert.ok(Math.hypot(pelHipX - tHipX, pelHipY - tHipY) < 1,
        'the pelvis hip midpoint must land on the torso hip midpoint');
});

test('assemble: a layer with no registration landmark is reported, not guessed', () => {
    // The real pelvis_overlay declares no landmarks at all. Placing it by
    // assumption would put a trunks layer silently out of register, which reads
    // as an art defect. It must be named instead.
    const { parts, landmarks } = realSchemaSet();
    parts.pelvis_overlay = solidPart(248, 220);
    const { placements, unregistered } = assemble({ parts, landmarks });
    assert.equal(placements.pelvis_overlay, undefined);
    assert.ok(unregistered.includes('pelvis_overlay'));
});

// The defect Codex reported: shoulder proof frames did not preserve the runtime
// elbow relationship, because a child was carried to the rotated socket but kept
// a world-absolute angle.
test('assemble: rotating a parent rotates its child, not just its position', () => {
    const { parts, landmarks } = realSchemaSet();
    const rest = assemble({ parts, landmarks });
    const raised = assemble({ parts, landmarks, pose: { near_upper_arm: 90 } });

    const d = (90 * Math.PI) / 180;
    assert.ok(Math.abs(raised.placements.near_upper_arm.angle
        - rest.placements.near_upper_arm.angle - d) < 1e-9,
        'the upper arm takes the posed angle');
    assert.ok(Math.abs(raised.placements.near_forearm.angle
        - rest.placements.near_forearm.angle - d) < 1e-9,
        'the forearm inherits the shoulder rotation -- without this the elbow '
        + 'relationship the runtime draws is not preserved in the proof');

    // And it moved, so it is carried as well as turned.
    assert.notEqual(
        Math.round(raised.placements.near_forearm.x),
        Math.round(rest.placements.near_forearm.x));
});

test('assemble: a local pose angle composes with its parent', () => {
    const { parts, landmarks } = realSchemaSet();
    const both = assemble({
        parts, landmarks, pose: { near_upper_arm: 30, near_forearm: 45 },
    });
    const expected = ((30 + 45) * Math.PI) / 180;
    assert.ok(Math.abs(both.placements.near_forearm.angle - expected) < 1e-9,
        'a child angle is local to its parent, so the two compose');
});

// ── Pass-A panel extraction ─────────────────────────────────────────────────

test('extractPanel: takes one view, not the whole five-view master', () => {
    // The master is 4096x4096 carrying five 768x960 panels. Downscaling it whole
    // to "265px tall" yields a ~60px wrestler beside four irrelevant views.
    const sheet = rgbaCanvas(4096, 4096);
    const panel = { x: 864, y: 64, w: 768, h: 960 };
    // Mark one pixel inside the front3q panel.
    const mark = ((panel.y + 10) * 4096 + (panel.x + 10)) * 4;
    sheet.rgba[mark] = 123;
    sheet.rgba[mark + 3] = 255;

    const out = extractPanel(sheet, panel);
    assert.equal(out.w, 768);
    assert.equal(out.h, 960);
    assert.equal(out.rgba[(10 * 768 + 10) * 4], 123, 'the panel content is preserved');
});

test('extractPanel: clips rather than reading outside the sheet', () => {
    const sheet = rgbaCanvas(100, 100, [9, 9, 9, 255]);
    const out = extractPanel(sheet, { x: 80, y: 80, w: 40, h: 40 });
    assert.equal(out.w, 40);
    assert.equal(out.rgba[(0 * 40 + 0) * 4 + 3], 255, 'in-bounds pixels copied');
    assert.equal(out.rgba[(39 * 40 + 39) * 4 + 3], 0, 'out-of-bounds stays empty');
});

// ── the real V3 candidate ───────────────────────────────────────────────────
//
// Synthetic fixtures encode what I believed the schema was. This one runs the
// renderer against the artwork Codex actually exported, which is the only thing
// that proves the belief matched reality. It skips when the candidate is absent:
// `Sprite sheets/` is gitignored in full, so this art is not in a fresh
// checkout and cannot be a hard dependency of the suite.
//
// A skip here is not a pass. If it skips in CI forever, the real-data claim in
// AI_HANDOFF.md is resting on nothing.

const V3_PARTS = path.join(ROOT,
    'Sprite sheets/AI Pilot/Lou/production-front3q-modular/v3/parts');
const V3_LANDMARKS = path.join(ROOT,
    'Sprite sheets/AI Pilot/Lou/production-front3q-modular/v2/landmarks.json');

async function loadV3() {
    if (!existsSync(V3_PARTS) || !existsSync(V3_LANDMARKS)) return null;
    const landmarks = JSON.parse(await readFile(V3_LANDMARKS, 'utf8'));
    const parts = {};
    for (const name of FRONT3Q_DEPTH_ORDER) {
        const file = path.join(V3_PARTS, `${name}.png`);
        if (!existsSync(file)) continue;
        const img = decodeRgbaPng(await readFile(file));
        parts[name] = { w: img.w, h: img.h, rgba: img.rgba };
    }
    return { parts, landmarks };
}

test('the real V3 candidate assembles as a coherent figure', async (t) => {
    const set = await loadV3();
    if (!set) return t.skip('V3 candidate not present (Sprite sheets/ is gitignored)');

    const { placements, unregistered } = assemble(set);

    // Every part that has a landmark entry must reach the canvas. pelvis_overlay
    // has none in this export and is expected to be reported.
    for (const name of ['head', 'torso', 'pelvis_underlay',
        'near_upper_arm', 'far_upper_arm', 'near_forearm', 'far_forearm',
        'near_thigh', 'far_thigh', 'near_shin', 'far_shin']) {
        assert.ok(placements[name], `${name} was not positioned`);
    }
    assert.deepEqual(unregistered, ['pelvis_overlay'],
        'only the layer with no landmarks should be unplaced');

    // Anatomical ordering, top to bottom. This is the assertion that fails on
    // the misregistered assembly Codex reported, where the pelvis rendered
    // above the head.
    const y = (n) => placements[n].y;
    assert.ok(y('head') < y('torso'),
        `head anchor (${y('head').toFixed(0)}) must sit above the torso centre `
        + `(${y('torso').toFixed(0)})`);
    assert.ok(y('torso') < y('pelvis_underlay'),
        'the torso centre must sit above the pelvis');
    assert.ok(y('pelvis_underlay') < y('near_thigh'),
        'the pelvis must sit above the thigh root');
    assert.ok(y('near_thigh') < y('near_shin'),
        'the thigh root must sit above the knee');
    assert.ok(y('near_upper_arm') < y('near_forearm'),
        'the shoulder must sit above the elbow');
});

test('the real V3 candidate carries its forearm through a shoulder sweep', async (t) => {
    const set = await loadV3();
    if (!set) return t.skip('V3 candidate not present (Sprite sheets/ is gitignored)');

    const rest = assemble(set);
    const raised = assemble({ ...set, pose: { near_upper_arm: 120 } });
    const delta = (120 * Math.PI) / 180;
    assert.ok(Math.abs(raised.placements.near_forearm.angle
        - rest.placements.near_forearm.angle - delta) < 1e-9,
        'the forearm must inherit the shoulder rotation on real art too');
});

// Regression pin for silent clipping. The canvas was fixed at 900px with the
// root at a hardcoded fraction of it, so the real head -- 279px tall, anchored
// at v=0.946 -- reached ~131px above the top and was cut off. Every neutral
// proof and scale comparison showed a headless Lou and nothing reported it.
test('the real V3 candidate is not clipped by the canvas', async (t) => {
    const set = await loadV3();
    if (!set) return t.skip('V3 candidate not present (Sprite sheets/ is gitignored)');

    const { frame } = assemble(set);
    const opaqueOnEdge = (xs, ys) => {
        for (const y of ys) {
            for (const x of xs) {
                if (frame.rgba[(y * frame.w + x) * 4 + 3] > 0) return true;
            }
        }
        return false;
    };
    const cols = Array.from({ length: frame.w }, (_, i) => i);
    const rows = Array.from({ length: frame.h }, (_, i) => i);
    assert.equal(opaqueOnEdge(cols, [0]), false, 'art touches the top edge -- clipped');
    assert.equal(opaqueOnEdge(cols, [frame.h - 1]), false, 'art touches the bottom edge');
    assert.equal(opaqueOnEdge([0], rows), false, 'art touches the left edge');
    assert.equal(opaqueOnEdge([frame.w - 1], rows), false, 'art touches the right edge');
});

test('an extreme pose is not clipped either', async (t) => {
    const set = await loadV3();
    if (!set) return t.skip('V3 candidate not present (Sprite sheets/ is gitignored)');
    // +190 degrees is the point of the stress range: the arm leaves the resting
    // silhouette, and a fixed canvas would cut it off.
    const { frame } = assemble({ ...set, pose: { near_upper_arm: 190 } });
    const cols = Array.from({ length: frame.w }, (_, i) => i);
    let touching = false;
    for (const x of cols) if (frame.rgba[x * 4 + 3] > 0) touching = true;
    assert.equal(touching, false, 'a raised arm must not be clipped at the top');
});
