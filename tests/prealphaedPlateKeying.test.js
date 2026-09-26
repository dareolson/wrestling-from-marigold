import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DEFAULT_GLOW_ALPHA,
    inkBounds,
    keyPrealphaedPlate,
} from '../tools/wrestler-cutter/key-prealphaed-plate.mjs';
import {
    decodeRgbaPng,
    findV2TransparentRgbViolation,
} from '../tools/wrestler-cutter/validate-source-manifest.mjs';
import { encodeRgbaPng } from '../tools/wrestler-cutter/export-v2-sheet.mjs';
import { PAINT_ALPHA } from '../tools/wrestler-cutter/measure-joint-articulation.mjs';

// A plate that reaches the cutter through `remove-chroma-key.mjs` has had its
// alpha DECIDED, and that tool writes 0,0,0 under every transparent pixel. A
// plate that arrives from the generator already carrying alpha has not, and
// keeps whatever colour sits under it. Measured on the two real plates:
//
//   v3, chroma-keyed        0 violations in 1,572,778 px
//   v5, pre-alpha'd         1,122,941 violations in 1,572,864 px
//
// The cut parts inherit it -- 22,060 to 86,334 colour-at-alpha-0 per part
// against the v4 control's zero -- and the plate's faint glow inherits with
// them, which is the part that actually distorts a review: bounding the v5
// figure at "alpha is not zero" measures the halo rather than the man.

/** A canvas with an opaque core, an antialiased rim, and a wide faint halo. */
function platedFigure({ w = 64, h = 64, halo = 28, rim = 3, core = 12 } = {}) {
    const rgba = new Uint8Array(w * h * 4);
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const d = Math.hypot(x - cx, y - cy);
            // Colour is written EVERYWHERE, which is exactly the defect: a
            // generator's plate carries its background colour under the alpha.
            rgba[i] = 120; rgba[i + 1] = 90; rgba[i + 2] = 70;
            if (d <= core) rgba[i + 3] = 255;
            else if (d <= core + rim) rgba[i + 3] = 200;   // genuine edge AA
            else if (d <= halo) rgba[i + 3] = 6;           // the glow
            else rgba[i + 3] = 0;                          // clear, but coloured
        }
    }
    return { w, h, rgba };
}

const alphaAt = (img, x, y) => img.rgba[(y * img.w + x) * 4 + 3];
const rgbAt = (img, x, y) => [
    img.rgba[(y * img.w + x) * 4],
    img.rgba[(y * img.w + x) * 4 + 1],
    img.rgba[(y * img.w + x) * 4 + 2],
];

test('the threshold is the pipeline\'s own paint floor, not a second opinion', () => {
    // MAX_BAKED_AXIS_DEG lives with the axis it measures for this reason. A
    // threshold copied into a second file is one that will eventually disagree
    // with itself, and nothing would report the disagreement.
    assert.equal(DEFAULT_GLOW_ALPHA, PAINT_ALPHA);
});

test('colour under a fully transparent pixel is cleared', () => {
    const plate = platedFigure();
    assert.ok(findV2TransparentRgbViolation(decodeRgbaPng(encodeRgbaPng(plate))),
        'the fixture must actually carry the defect, or this test proves nothing');

    const { image } = keyPrealphaedPlate(plate);
    assert.equal(findV2TransparentRgbViolation(decodeRgbaPng(encodeRgbaPng(image))), null,
        'the keyed plate satisfies the contract the validator enforces');
});

test('the opaque core is untouched, pixel for pixel', () => {
    // The whole claim of this step is that it is lossless where it matters. If
    // it moved a painted pixel it would be a repaint, and a repaint of source
    // art is not a thing a keying step may quietly do.
    const plate = platedFigure();
    const { image } = keyPrealphaedPlate(plate);
    const cx = Math.floor(plate.w / 2);
    const cy = Math.floor(plate.h / 2);
    assert.equal(alphaAt(image, cx, cy), 255);
    assert.deepEqual(rgbAt(image, cx, cy), [120, 90, 70]);

    let paintedBefore = 0;
    let paintedAfter = 0;
    for (let i = 0; i < plate.w * plate.h; i++) {
        if (plate.rgba[i * 4 + 3] > PAINT_ALPHA) paintedBefore++;
        if (image.rgba[i * 4 + 3] > PAINT_ALPHA) paintedAfter++;
    }
    assert.equal(paintedAfter, paintedBefore, 'no painted pixel was removed');
});

test('genuine edge antialiasing survives; the halo does not', () => {
    // The distinction the threshold is drawing. The v4 control keeps 134-388
    // pixels in the 1-40 band across a whole part -- that is a rim. The v5 parts
    // carried 2,237-4,107 -- that is a halo. Both must be told apart by
    // coverage, not by count, because a count is a property of the part's size.
    const plate = platedFigure();
    const { image, glowCleared } = keyPrealphaedPlate(plate);
    const cx = Math.floor(plate.w / 2);
    const cy = Math.floor(plate.h / 2);

    assert.equal(alphaAt(image, cx + 13, cy), 200, 'the 200-alpha rim is paint and stays');
    assert.equal(alphaAt(image, cx + 20, cy), 0, 'the 6-alpha halo is not paint and goes');
    assert.deepEqual(rgbAt(image, cx + 20, cy), [0, 0, 0], 'and takes its colour with it');
    assert.ok(glowCleared > 0, 'and the tool says how much it removed');
});

test('the glow was being measured as the figure', () => {
    // The reason this matters to a review rather than only to a validator.
    // Bounding the v5 figure at "alpha is not zero" gave 861x1475 against its
    // real 512x1313, so a 265px gate rendered Lou at about 236 -- leaner and
    // taller than he is, which is the exact judgement the gate exists to settle.
    const plate = platedFigure();
    const before = inkBounds(plate, 0);
    const { image } = keyPrealphaedPlate(plate);
    const after = inkBounds(image, 0);
    assert.ok(after.w < before.w && after.h < before.h,
        `bounds ${before.w}x${before.h} must shrink to the figure, got ${after.w}x${after.h}`);
    // The core plus its rim, which is what the figure actually is.
    assert.ok(Math.abs(after.w - (12 + 3) * 2 - 1) <= 2, `figure width ${after.w}`);
});

test('threshold 0 applies the contract and touches no coverage at all', () => {
    // The escape hatch, and the honest separation between the two halves: one is
    // a contract the validator enforces, the other is a judgement about what
    // counts as paint. A caller who wants only the first can have only the first.
    const plate = platedFigure();
    const { image, colourCleared, glowCleared } = keyPrealphaedPlate(plate, 0);
    assert.ok(colourCleared > 0);
    assert.equal(glowCleared, 0, 'nothing with any coverage was removed');
    const cx = Math.floor(plate.w / 2);
    const cy = Math.floor(plate.h / 2);
    assert.equal(alphaAt(image, cx + 20, cy), 6, 'the halo keeps its coverage');
    assert.equal(findV2TransparentRgbViolation(decodeRgbaPng(encodeRgbaPng(image))), null,
        'and the contract still holds');
});

test('re-keying is a byte-identical no-op', () => {
    // So it is safe in front of the cutter unconditionally, including on a plate
    // that was already keyed by chroma removal. A step that has to be applied
    // exactly once is a step someone will eventually apply twice.
    const once = keyPrealphaedPlate(platedFigure());
    const twice = keyPrealphaedPlate(once.image);
    assert.equal(twice.changed, 0, 'the second pass finds nothing to do');
    assert.deepEqual([...twice.image.rgba], [...once.image.rgba]);
    assert.deepEqual([...encodeRgbaPng(twice.image)], [...encodeRgbaPng(once.image)]);
});

test('an already-clean plate is passed straight through', () => {
    // What a chroma-keyed plate looks like arriving: alpha already decided,
    // 0,0,0 under every transparent pixel. Nothing to clear, nothing reported.
    const clean = platedFigure({ halo: 0 });
    for (let i = 0; i < clean.w * clean.h; i++) {
        if (clean.rgba[i * 4 + 3] !== 0) continue;
        clean.rgba[i * 4] = 0; clean.rgba[i * 4 + 1] = 0; clean.rgba[i * 4 + 2] = 0;
    }
    const { changed, colourCleared, glowCleared } = keyPrealphaedPlate(clean);
    assert.equal(changed, 0);
    assert.equal(colourCleared, 0);
    assert.equal(glowCleared, 0);
});

test('the two counters partition the pixels touched rather than double-counting', () => {
    // A glow pixel also has colour cleared, so reporting it under both headings
    // would make the totals exceed the work done and quietly overstate the fix.
    const plate = platedFigure();
    const { colourCleared, glowCleared, changed } = keyPrealphaedPlate(plate);
    assert.equal(changed, colourCleared + glowCleared);

    let touched = 0;
    for (let i = 0; i < plate.w * plate.h; i++) {
        const a = plate.rgba[i * 4 + 3];
        if (a > PAINT_ALPHA) continue;
        const hasColour = plate.rgba[i * 4] || plate.rgba[i * 4 + 1] || plate.rgba[i * 4 + 2];
        if (a > 0 || hasColour) touched++;
    }
    assert.equal(changed, touched);
});

test('a nonsensical threshold is refused rather than coerced', () => {
    for (const bad of [-1, 256, 1.5, NaN, '40']) {
        assert.throws(() => keyPrealphaedPlate(platedFigure(), bad), RangeError,
            `threshold ${String(bad)} must be refused`);
    }
});

test('inkBounds reports null for a plate with nothing on it', () => {
    const empty = { w: 4, h: 4, rgba: new Uint8Array(4 * 4 * 4) };
    assert.equal(inkBounds(empty, 0), null);
});
