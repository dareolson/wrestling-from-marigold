import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AUTHORING,
    neckPinch,
    rowInkWidths,
} from '../tools/wrestler-cutter/map-candidate-to-rig.mjs';

// REQUIREMENT 10: the torso must be headless.
//
// The front3q v5 draft's torso is a full bust -- head, neck and shoulders in one
// painting. Shipped Lou, shipped George and the v4 diagnostic control all ship a
// headless torso with a short neck stub, and the rig places `head.png`
// separately at the torso's own neck socket. Wired up as eight parts, the v5
// torso draws the head twice.
//
// NONE OF THE NINE EXISTING REQUIREMENTS CATCHES IT, which is the reason for a
// tenth rather than a tightening of an existing one. Requirement 9 does not: the
// v5 plate cut to exactly eight clean components and all eight MAP, because
// `torso.png` is a real file landing in a real slot. The joint checks do not:
// every shoulder and hip is present and articulates. A whole-character reference
// image does not, because a bust with a head on it is what a person looks like.
// It is only wrong once the part is a PART.
//
// The signature is a local minimum in the row-width profile between two maxima:
// a head mass, a neck, then the shoulders. A torso with no head on it widens
// monotonically from its neck stub into its shoulders and has no such minimum.
// Measured on every torso available:
//
//   front3q v5 draft     10.2%      front3q v4 control    0.0%
//   shipped Lou           0.0%      shipped George        0.0%
//   thesz-front3q-r1      0.0%
//
// Those are not "close to zero". They are zero, at every smoothing window from
// 3 rows to 21.

/**
 * A torso silhouette built from stacked ellipses, so the fixture states the
 * anatomy rather than a bitmap someone has to trust.
 *
 * `headW` of 0 draws the shipped shape: a narrow neck stub widening into
 * shoulders. Anything else draws a bust.
 */
function torso({ w = 240, h = 420, headW = 0, neckW = 38, shoulderW = 220 } = {}) {
    const rgba = new Uint8Array(w * h * 4);
    const paint = (y, width) => {
        const lo = Math.round((w - width) / 2);
        for (let x = lo; x < lo + width; x++) {
            if (x < 0 || x >= w) continue;
            const i = (y * w + x) * 4;
            rgba[i] = 190; rgba[i + 1] = 155; rgba[i + 2] = 140; rgba[i + 3] = 255;
        }
    };
    const headBottom = headW > 0 ? Math.round(h * 0.20) : 0;
    const neckBottom = Math.round(h * 0.26);
    const shoulderRow = Math.round(h * 0.34);
    for (let y = 0; y < h; y++) {
        let width;
        if (headW > 0 && y < headBottom) {
            // An ellipse: widest in the middle of the head, tapering to the neck.
            const t = (y / headBottom) * 2 - 1;
            width = Math.round(Math.max(neckW, headW * Math.sqrt(Math.max(0, 1 - t * t * 0.86))));
        } else if (y < neckBottom) {
            width = neckW;
        } else if (y < shoulderRow) {
            const t = (y - neckBottom) / (shoulderRow - neckBottom);
            width = Math.round(neckW + (shoulderW - neckW) * t);
        } else {
            // Taper gently to the waist, as a real torso does.
            const t = (y - shoulderRow) / (h - shoulderRow);
            width = Math.round(shoulderW * (1 - 0.45 * t));
        }
        paint(y, Math.max(1, width));
    }
    const alpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = rgba[i * 4 + 3];
    return { w, h, rgba, alpha };
}

test('a headless torso has no pinch at all', () => {
    const { fraction } = neckPinch(torso());
    assert.equal(fraction, 0,
        'a neck stub widening into shoulders never narrows, so there is nothing to find');
    assert.ok(fraction <= AUTHORING.maxNeckPinchFraction);
});

// The v5 draft's own proportions. Its pinch is SHALLOW -- the head sits on a
// thick collar mass, so the silhouette goes 147px -> 132px -> 343px and narrows
// by only 10.2%. A fixture with a slender neck pinches by 70% and would pass a
// check far too blunt to catch the real thing, so the hard case is pinned
// explicitly and the obvious one is kept only as a sanity check.
const V5_LIKE = { w: 367, h: 596, headW: 147, neckW: 132, shoulderW: 343 };

test('a bust is caught, and the pinch is where the neck is', () => {
    const bust = torso({ headW: 140 });
    const pinch = neckPinch(bust);
    assert.ok(pinch.fraction > AUTHORING.maxNeckPinchFraction,
        `a bust must fail requirement 10; measured ${(pinch.fraction * 100).toFixed(1)}%`);
    // The head mass sits above the neck, and the neck above the shoulders.
    assert.ok(pinch.headRow < pinch.neckRow, 'the head is above the neck');
    assert.ok(pinch.headWidthPx > pinch.neckWidthPx, 'and wider than it');
    assert.ok(pinch.shoulderWidthPx > pinch.headWidthPx,
        'while the shoulders are still the widest thing in the part');
    assert.ok(pinch.neckRow / bust.h < 0.4, 'the pinch is in the upper third, not the waist');
});

test('the SHALLOW pinch of the real v5 draft is caught', () => {
    // The case that matters. A head resting on a thick collar narrows the
    // silhouette by only about a tenth, and a threshold chosen against the
    // slender-necked fixture above would sail straight past it.
    const pinch = neckPinch(torso(V5_LIKE));
    assert.ok(pinch.fraction > AUTHORING.maxNeckPinchFraction,
        `the v5 proportions must fail; measured ${(pinch.fraction * 100).toFixed(1)}%`);
    assert.ok(pinch.fraction < 0.25,
        `and must do so on a genuinely shallow pinch, not a caricature `
        + `(${(pinch.fraction * 100).toFixed(1)}%)`);
    assert.ok(pinch.headRow < pinch.neckRow);
});

test('the margin over the threshold on the real proportions is stated, not assumed', () => {
    // If a future tightening of the threshold ever eats this margin, this test
    // is the thing that says so rather than the next candidate being approved
    // with a head baked into its chest.
    const measured = neckPinch(torso(V5_LIKE)).fraction;
    assert.ok(measured >= AUTHORING.maxNeckPinchFraction * 2,
        `the real defect clears the threshold by at least 2x `
        + `(${(measured * 100).toFixed(1)}% vs ${(AUTHORING.maxNeckPinchFraction * 100).toFixed(1)}%)`);
});

test('the waist taper below the shoulders is not mistaken for a neck', () => {
    // A real torso narrows toward the waist, and that narrowing is larger in
    // absolute terms than the neck pinch. Searching the whole canvas for "a
    // place where the silhouette gets narrower" would flag every torso ever
    // drawn; the search is deliberately bounded above the widest row.
    const plain = torso({ shoulderW: 220 });
    assert.equal(neckPinch(plain).fraction, 0);

    const waisted = torso({ w: 240, h: 420, shoulderW: 230 });
    assert.equal(neckPinch(waisted).fraction, 0,
        'a pronounced waist is below the shoulders and is not a neck');
});

test('the verdict is stable across smoothing windows', () => {
    // The threshold is only defensible if the measurement does not wander. On
    // the real art the headless torsos read exactly 0.0 from k=3 to k=21 and the
    // bust reads 9.6-11.5 over the same range.
    for (const k of [3, 5, 9, 15, 21]) {
        assert.equal(neckPinch(torso(), k).fraction, 0, `headless at k=${k}`);
        assert.ok(neckPinch(torso({ headW: 140 }), k).fraction > AUTHORING.maxNeckPinchFraction,
            `bust still caught at k=${k}`);
    }
});

test('smoothing is what keeps one stray row from inventing a neck', () => {
    // Unsmoothed, a single noisy row put shipped Lou's real torso at 0.7%. A
    // hair strand, an outline nib or one antialiased scanline must not read as
    // anatomy -- otherwise the check fails clean art and gets switched off.
    const nicked = torso();
    const row = Math.round(nicked.h * 0.30);
    for (let x = 0; x < nicked.w; x++) {
        const i = (row * nicked.w + x) * 4;
        nicked.rgba[i + 3] = 0;
        nicked.alpha[row * nicked.w + x] = 0;
    }
    assert.equal(neckPinch(nicked).fraction, 0,
        'one erased row is noise, not a neck');
});

test('the threshold sits in the measured gap, not against one side of it', () => {
    // 0.03 against a floor of 0.000 on four real headless torsos and a measured
    // bust at 0.102. Written as a range so tightening it toward either end is a
    // deliberate edit rather than a drift.
    assert.ok(AUTHORING.maxNeckPinchFraction > 0.01,
        'must clear the 0.7% a single unsmoothed noisy row can produce');
    assert.ok(AUTHORING.maxNeckPinchFraction < 0.09,
        'must still catch the v5 draft, which measured 0.096 at its most forgiving window');
});

test('rowInkWidths reads the silhouette, not the paint inside it', () => {
    // The measurement is left-edge to right-edge, so a light chest or an
    // unpainted gap between arms does not narrow the row. A pinch has to be a
    // real change in OUTLINE.
    const hollow = torso();
    const row = Math.round(hollow.h * 0.5);
    for (let x = 100; x < 140; x++) {
        hollow.rgba[(row * hollow.w + x) * 4 + 3] = 0;
        hollow.alpha[row * hollow.w + x] = 0;
    }
    const widths = rowInkWidths(hollow, 1);
    const solid = rowInkWidths(torso(), 1);
    assert.equal(widths[row], solid[row], 'a hole inside the silhouette changes no width');
});

test('an empty part reports nothing rather than dividing by zero', () => {
    const blank = {
        w: 8, h: 8, rgba: new Uint8Array(8 * 8 * 4), alpha: new Uint8Array(8 * 8),
    };
    const pinch = neckPinch(blank);
    assert.equal(pinch.fraction, 0);
    assert.ok(Number.isFinite(pinch.fraction));
});
