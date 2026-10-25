// rig/silhouette.js (PLAN_GEORGE_TRANSFER Rev 3 D10): the distance field of a painted alpha, the world -> image-pixel
// inverse, and the hand clearance test. Node stubs only, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSilhouette, imagePixelPoint, silhouetteDistance, handClearance } from '../src/rig/silhouette.js';

// a 10 x 8 image, painted block x 3..6, y 2..5
const W = 10, H = 8;
const alpha = new Uint8Array(W * H);
for (let y = 2; y <= 5; y++) for (let x = 3; x <= 6; x++) alpha[y * W + x] = 255;
const sil = buildSilhouette(W, H, alpha, { pad: 12 });

test('buildSilhouette: 0 on the art, source px to the nearest painted pixel outside (chamfer), off the image too', () => {
    assert.equal(sil.distance(4, 3), 0);
    assert.equal(sil.distance(3, 2), 0);
    assert.equal(sil.distance(2, 3), 1);          // one pixel left of the block
    assert.equal(sil.distance(0, 3), 3);
    assert.equal(sil.distance(4, 7), 2);          // below
    assert.ok(Math.abs(sil.distance(1, 0) - 2 * 1.4142) < 1e-6);   // two diagonal steps (2 left, 2 up)
    assert.equal(sil.distance(-5, 3), 8, 'off the left edge, inside the padded grid');
    assert.ok(Number.isFinite(sil.distance(-40, 3)), 'beyond the padded grid: an upper bound, finite');
    assert.ok(sil.distance(-40, 3) >= 43 - 1e-6);
});

test('buildSilhouette: an empty image has no distance (never "clear")', () => {
    const empty = buildSilhouette(4, 4, new Uint8Array(16), { pad: 4 });
    assert.equal(empty.distance(1, 1), Infinity);
});

// a Phaser-like image: world = M * (local), local = pixel - displayOrigin, scaled by `scale`, optional flipX
function image({ x = 100, y = 50, scale = 0.5, originX = 5, originY = 4, flipX = false } = {}) {
    return { frame: { realWidth: W, realHeight: H }, displayOriginX: originX, displayOriginY: originY, flipX, flipY: false,
        getWorldTransformMatrix: () => ({ a: scale, b: 0, c: 0, d: scale, tx: x, ty: y }) };
}
const worldOf = (img, px, py) => { const m = img.getWorldTransformMatrix(); const fx = img.flipX ? W - px : px; const lx = fx - img.displayOriginX, ly = py - img.displayOriginY; return { x: m.a * lx + m.c * ly + m.tx, y: m.b * lx + m.d * ly + m.ty }; };

test('imagePixelPoint is the inverse of the anchor transform, flips included', () => {
    for (const flipX of [false, true]) {
        const img = image({ flipX });
        const p = imagePixelPoint(img, worldOf(img, 4.5, 3.5));
        assert.ok(Math.abs(p.x - 4.5) < 1e-9 && Math.abs(p.y - 3.5) < 1e-9, `flipX ${flipX}`);
        assert.equal(p.gamePerPixel, 0.5);
    }
    assert.equal(imagePixelPoint(null, { x: 0, y: 0 }), null);
    assert.equal(imagePixelPoint({ ...image(), getWorldTransformMatrix: () => ({ a: 0, b: 0, c: 0, d: 0, tx: 0, ty: 0 }) }, { x: 0, y: 0 }), null);
});

test('silhouetteDistance is in game px; an unusable measurement is Infinity, not 0', () => {
    const img = image();
    assert.equal(silhouetteDistance(img, worldOf(img, 4.5, 3.5), sil), 0);
    assert.equal(silhouetteDistance(img, worldOf(img, 0.5, 3.5), sil), 3 * 0.5);   // 3 source px at .5 game px each
    assert.equal(silhouetteDistance(img, { x: NaN, y: 0 }, sil), Infinity);
    assert.equal(silhouetteDistance(img, worldOf(img, 4.5, 3.5), null), Infinity);
});

test('handClearance: every sample must clear the margin; one sample on the art, or unmeasured, is not clear', () => {
    const img = image();
    const at = (px, py) => worldOf(img, px, py);
    const far = { wrist: at(0.5, 3.5), contact: at(0.5, 3.5), forearmDistal: at(0.5, 0.5), handEnd: at(0.5, 7.5) };
    const ok = handClearance(img, far, sil, 1);
    assert.equal(ok.clear, true); assert.ok(ok.min >= 1);
    const fingers = handClearance(img, { ...far, handEnd: at(4.5, 3.5) }, sil, 1);
    assert.equal(fingers.clear, false, 'the hand end still over the art');
    assert.equal(fingers.min, 0); assert.equal(fingers.distances.handEnd, 0);
    assert.equal(handClearance(img, { ...far, handEnd: null }, sil, 1).clear, false, 'unmeasured');
    assert.equal(handClearance(img, {}, sil, 1).clear, false, 'no samples');
    assert.equal(handClearance(img, far, sil, 9).clear, false, 'margin larger than the distance');
});
