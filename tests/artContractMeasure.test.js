import assert from 'node:assert/strict';
import test from 'node:test';

import { measureSheet } from '../tools/wrestler-cutter/measure-art-contract.mjs';

// The art-contract harness exists because CHARACTER_ART_SOURCE_STANDARD.md files
// value families, view consistency and micro-pattern as human-review items with
// no measurement behind them. A measurement introduced to fill that gap has to
// clear the bar the repository already set for itself: "measurement must report
// the quantity that matters, not its complement." Two earlier versions of these
// metrics failed exactly that way — a unique-colour count that was always 1, and
// a busyness score that graded comb-hatched hair the same as a face with eyes —
// so each metric here is pinned against synthetic art whose answer is known by
// construction.

// A decoded image in the shape decodeRgbaPng returns. Built directly rather than
// through a PNG so a test describes the pixels it means.
function image(w, h, paint) {
    const rgba = new Uint8Array(w * h * 4);
    const alpha = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const value = paint(x, y);
            const i = y * w + x;
            if (value === null) continue;
            rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = value;
            rgba[i * 4 + 3] = 255;
            alpha[i] = 255;
        }
    }
    return { w, h, alpha, rgba };
}

// No manifest: the harness measures the whole canvas as one figure, which is the
// supported way to point it at an assembled proof.
const measure = img => measureSheet(img, {}, {});
const only = result => result.views[0];

const INSIDE = (x, y, w, h) => x > 4 && x < w - 5 && y > 4 && y < h - 5;

test('flat value fills score near 100%; a gradient of the same shape does not', () => {
    const FLAT = [0, 60, 140, 190];
    const flat = image(200, 400, (x, y) =>
        INSIDE(x, y, 200, 400) ? FLAT[Math.floor(y / 100)] : null);
    const gradient = image(200, 400, (x, y) =>
        INSIDE(x, y, 200, 400) ? Math.round((y / 400) * 255) : null);

    const flatScore = only(measure(flat)).flatness.within4;
    const gradientScore = only(measure(gradient)).flatness.within4;

    assert.ok(flatScore > 0.99, `flat art scored ${flatScore}`);
    assert.ok(gradientScore < 0.25, `gradient scored ${gradientScore}`);
    assert.ok(flatScore - gradientScore > 0.7, 'the metric must separate the two cases widely');
});

test('unique colour count reports the colours present, not a constant', () => {
    // The first version indexed the whole sheet's buffer with region-local
    // offsets and returned 1 for every input. This is the regression pin.
    const four = image(100, 200, (x, y) =>
        INSIDE(x, y, 100, 200) ? [0, 60, 140, 190][Math.floor(y / 50)] : null);
    const many = image(100, 200, (x, y) =>
        INSIDE(x, y, 100, 200) ? (y * 2) % 256 : null);

    assert.equal(only(measure(four)).flatness.uniqueColours, 4);
    assert.ok(only(measure(many)).flatness.uniqueColours > 50);
});

test('regular hatching is detected by period; irregular detail of equal busyness is not', () => {
    // Both figures change value just as often. Only one does it on a fixed
    // period, and only that one beats against the scanline grid.
    let seed = 1;
    const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    const hatched = image(240, 480, (x, y) =>
        INSIDE(x, y, 240, 480) ? (x % 6 < 3 ? 60 : 190) : null);
    const irregular = image(240, 480, (x, y) =>
        INSIDE(x, y, 240, 480) ? (random() < 0.5 ? 60 : 190) : null);

    const at265 = v => v.broadcast.find(b => b.targetHeight === 265);
    const hatchedPeak = at265(only(measure(hatched))).figurePeriodicity.peak;
    const irregularPeak = at265(only(measure(irregular))).figurePeriodicity.peak;

    assert.ok(hatchedPeak > 0.4, `hatching scored ${hatchedPeak}`);
    assert.ok(irregularPeak < 0.25, `irregular detail scored ${irregularPeak}`);
    assert.ok(at265(only(measure(hatched))).figurePeriodicity.lag !== null,
        'a periodicity finding must name the period to go and look at');
});

test('hairline and head dark-mass are compared only among views that show a face', () => {
    // A back view is legitimately almost all hair. An earlier version grouped it
    // with the face views and reported 122.9% "drift" on a correct turnaround.
    // The figure needs a real silhouette: the neck is found as the narrowest row
    // in the top third, so a plain rectangle has no head to measure.
    const HALF = y => (y < 60 ? 20 : y < 78 ? 8 : 60);
    const sheet = dark => image(160, 400, (x, y) => {
        if (y < 6 || y > 393) return null;
        if (Math.abs(x - 80) > HALF(y)) return null;
        if (y < 60) return (dark || y < 26) ? 30 : 190;
        return 190;
    });

    const faceOnly = measureSheet(sheet(false), {}, {});
    assert.equal(only(faceOnly).identity.showsFace, true);

    const rear = measureSheet(sheet(true), {}, {});
    assert.equal(only(rear).identity.showsFace, false);
});

test('measurement is deterministic', () => {
    const art = image(160, 320, (x, y) =>
        INSIDE(x, y, 160, 320) ? [0, 60, 140, 190][(x + y) % 4] : null);
    assert.deepEqual(
        JSON.parse(JSON.stringify(measure(art))),
        JSON.parse(JSON.stringify(measure(art))),
    );
});

test('an empty region is reported as empty rather than scoring zero', () => {
    const blank = image(80, 80, () => null);
    assert.equal(only(measure(blank)).empty, true);
});

test('manifest panels are only applied to a canvas of the declared sheet size', () => {
    // A limb board or parts plate can be large enough to contain the front
    // master-panel rectangle. Measuring it through that rectangle reports a crop
    // of an unrelated image under a view name, which is worse than not using the
    // manifest at all.
    const manifest = {
        sourceSheet: {
            canvas: { w: 4096, h: 4096 },
            masterPanels: { front: { x: 64, y: 64, w: 768, h: 960 } },
            productionGrid: { viewOrder: ['front'] },
        },
    };
    const board = image(1536, 1024, (x, y) => INSIDE(x, y, 1536, 1024) ? 190 : null);
    const result = measureSheet(board, manifest, {});
    assert.equal(result.views.length, 1);
    assert.equal(result.views[0].view, 'image', 'a non-sheet canvas is measured whole');
});
