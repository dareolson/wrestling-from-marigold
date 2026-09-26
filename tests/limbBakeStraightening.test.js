import assert from 'node:assert/strict';
import test from 'node:test';

import {
    MAX_BAKED_AXIS_DEG,
    axisModeFor,
    bakedAxis,
    rotateAboutPivot,
    transportFrac,
} from '../tools/wrestler-cutter/straighten-limb-bake.mjs';

// NEW_ASSETS_SPEC.md requires every part baked in a neutral, straight limb pose,
// and the rig depends on it: Skeleton places a segment with its pivot on the
// joint and rotates it by the POSE angle alone. An angle already in the painting
// adds to every pose, so the limb is wrong in every frame the game draws.
//
// The front3q v3 arms carry 13-20 degrees of it. These tests pin the correction,
// and above all its SIGN: rotating the wrong way doubles the bake instead of
// removing it, and the result is still a plausible-looking limb at a plausible
// angle. That is exactly what the first implementation did.

function limb(w, h, angleDeg, { pivotV = 0.15 } = {}) {
    // A capsule whose axis leaves the pivot at `angleDeg` from straight down.
    const rgba = new Uint8Array(w * h * 4);
    const px = w / 2;
    const py = pivotV * h;
    const a = (angleDeg * Math.PI) / 180;
    const len = h * 0.78;
    const radius = w * 0.12;
    for (let t = 0; t <= len; t += 0.5) {
        const cx = px + Math.sin(a) * t;
        const cy = py + Math.cos(a) * t;
        for (let dy = -radius; dy <= radius; dy += 0.5) {
            for (let dx = -radius; dx <= radius; dx += 0.5) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = Math.round(cx + dx);
                const y = Math.round(cy + dy);
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                const i = (y * w + x) * 4;
                rgba[i] = 200; rgba[i + 1] = 150; rgba[i + 2] = 140; rgba[i + 3] = 255;
            }
        }
    }
    const alpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = rgba[i * 4 + 3];
    return { w, h, rgba, alpha };
}

const DEG = 180 / Math.PI;

test('bakedAxis reads the angle a limb was painted at', () => {
    for (const authored of [-20, -13.4, 0, 9.3, 18]) {
        const part = limb(160, 300, authored);
        const landmark = { jointPivotFrac: { u: 0.5, v: 0.15 } };
        const measured = bakedAxis(part, landmark, 'distalInk') * DEG;
        assert.ok(Math.abs(measured - authored) < 2.5,
            `painted at ${authored}, measured ${measured.toFixed(1)}`);
    }
});

test('bakedAxis in landmark mode uses the declared bone, not the paint mass', () => {
    // The real upper arms declare both ends, and the deltoid bulge biases a
    // whole-part PCA away from the actual bone. Where the landmarks exist they
    // are the answer.
    const part = limb(160, 300, -13.4);
    const landmark = {
        jointPivotFrac: { u: 0.5, v: 0.15 },
        distalAnchorFrac: { u: 0.5 + Math.sin(-13.4 / DEG) * 0.78 * 300 / 160, v: 0.15 + Math.cos(-13.4 / DEG) * 0.78 },
    };
    const measured = bakedAxis(part, landmark, 'landmark') * DEG;
    assert.ok(Math.abs(measured + 13.4) < 0.5, `measured ${measured.toFixed(2)}`);
});

// THE SIGN TEST. This is the one that matters.
test('straightening removes the bake rather than doubling it', () => {
    for (const authored of [-19, -13.4, 9.3, 18.3]) {
        const part = limb(180, 320, authored);
        const pivot = { x: 0.5 * 180, y: 0.15 * 320 };
        const angle = bakedAxis(part, { jointPivotFrac: { u: 0.5, v: 0.15 } }, 'distalInk');
        const { image, pivot: newPivot } = rotateAboutPivot(part, pivot, angle);
        const residual = bakedAxis(image,
            { jointPivotFrac: { u: newPivot.x / image.w, v: newPivot.y / image.h } },
            'distalInk') * DEG;

        assert.ok(Math.abs(residual) < Math.abs(authored),
            `rotating made it WORSE: ${authored} -> ${residual.toFixed(1)}`);
        // And specifically not the doubling that a flipped sign produces.
        assert.ok(Math.abs(residual - 2 * authored) > Math.abs(authored) / 2,
            `${authored} came back as ${residual.toFixed(1)}, which is the doubled bake`);
        assert.ok(Math.abs(residual) < 2.5,
            `${authored} left ${residual.toFixed(1)} degrees behind`);
    }
});

test('rotation grows the canvas so no paint is clipped', () => {
    const part = limb(180, 320, 18);
    const before = part.alpha.reduce((n, a) => n + (a > 40 ? 1 : 0), 0);
    const pivot = { x: 90, y: 48 };
    const { image } = rotateAboutPivot(part, pivot, 18 / DEG);
    let after = 0;
    for (let i = 0; i < image.w * image.h; i++) if (image.rgba[i * 4 + 3] > 40) after++;
    assert.ok(image.w > part.w && image.h > part.h, 'the canvas must grow');
    // Resampling is not exactly area preserving, but nothing may be cut off.
    assert.ok(after > before * 0.95, `lost paint: ${before} -> ${after}`);
    // No paint on the border => nothing ran off the edge.
    for (let x = 0; x < image.w; x++) {
        assert.equal(image.rgba[x * 4 + 3], 0, 'top row must be clear');
        assert.equal(image.rgba[((image.h - 1) * image.w + x) * 4 + 3], 0, 'bottom row must be clear');
    }
});

test('rotation does not grow a dark rim on the silhouette', () => {
    // Premultiplied averaging. Straight RGBA averaging drags edge colour toward
    // transparent black, which would darken every limb edge and quietly change
    // the value structure the broadcast filter depends on.
    const part = limb(180, 320, 15);
    const { image } = rotateAboutPivot(part, { x: 90, y: 48 }, 15 / DEG);
    let darkEdge = 0;
    for (let i = 0; i < image.w * image.h; i++) {
        const a = image.rgba[i * 4 + 3];
        if (a > 40 && a < 255 && image.rgba[i * 4] < 100) darkEdge++;
    }
    assert.equal(darkEdge, 0, 'partially transparent edge pixels must keep the limb colour');
});

test('landmarks are carried through the same rotation', () => {
    const part = limb(180, 320, 14);
    const pivot = { x: 90, y: 48 };
    const angle = 14 / DEG;
    const { image, pivot: newPivot } = rotateAboutPivot(part, pivot, angle);

    // The pivot itself is the rotation centre and must land on newPivot.
    const moved = transportFrac({ u: 90 / 180, v: 48 / 320 }, part, pivot, angle, image, newPivot);
    assert.ok(Math.abs(moved.u * image.w - newPivot.x) < 1e-6);
    assert.ok(Math.abs(moved.v * image.h - newPivot.y) < 1e-6);

    // A distal point on the bone axis must end up directly below the pivot.
    const distal = { u: (90 + Math.sin(angle) * 200) / 180, v: (48 + Math.cos(angle) * 200) / 320 };
    const movedDistal = transportFrac(distal, part, pivot, angle, image, newPivot);
    assert.ok(Math.abs(movedDistal.u * image.w - newPivot.x) < 0.5,
        'a straightened bone must be vertical in the new canvas');
    assert.ok(movedDistal.v * image.h > newPivot.y, 'and still below the pivot');
});

test('which parts are bent is measured, not listed by name', () => {
    // This was a four-name table until 2026-09-22, which meant the tool could
    // only straighten the twelve-part decomposition it was written for: an
    // eight-part set delivering one shared `upper_arm` and one shared `thigh`
    // had no entry, and a part with no entry is never looked at. The mode now
    // comes from what the part declares, so a new decomposition needs no edit.
    assert.equal(axisModeFor({ jointPivotFrac: {}, distalAnchorFrac: { u: 0.5, v: 0.9 } }), 'landmark',
        'both ends declared is the actual bone -- upper arms and thighs');
    assert.equal(axisModeFor({ jointPivotFrac: {}, sourcePixel: { ankle: { x: 1, y: 2 } } }), 'ankle',
        'a shin is measured on its declared ankle, never on its boot');
    assert.equal(axisModeFor({ jointPivotFrac: {} }), 'distalInk',
        'the forearms declare neither, so the ink is the only axis available');

    // The eight-part names resolve the same way the twelve-part ones did, which
    // is the whole point: `upper_arm` is an upper arm whatever it is called.
    const withAnchor = { jointPivotFrac: {}, distalAnchorFrac: { u: 0.5, v: 0.9 } };
    for (const part of ['near_upper_arm', 'far_upper_arm', 'upper_arm', 'thigh']) {
        assert.equal(axisModeFor(withAnchor), 'landmark', `${part} declares both ends`);
    }
});

test('a part already straight is copied, not resampled', () => {
    // The legs of the set this tool was written for measured 1.7-1.8 degrees.
    // A correction that touches everything it can reach is not a correction, it
    // is a rewrite -- and resampling costs real quality for nothing. The
    // threshold is the same one art:map-candidate reports requirement 3
    // against, deliberately: one number, one module.
    assert.equal(MAX_BAKED_AXIS_DEG, 3);
    assert.ok(1.8 <= MAX_BAKED_AXIS_DEG, 'the v3 thighs are copied, as they were before');
    assert.ok(13.4 > MAX_BAKED_AXIS_DEG, 'the v3 arms are straightened, as they were before');
});

test('a shin is measured on its declared ankle, not on its boot', () => {
    // The distal-ink fallback is wrong for a shin and quietly so: it averages
    // the boot, whose toe juts forward, so a perfectly straight shin reports a
    // lean. On the real parts knee->ankle is -1.6 and 0.0 degrees while
    // knee->boot-mass reads 2.4 and 5.2 and knee->sole reads 7.1 and 10.3. The
    // first version of the authoring check used the fallback and flagged
    // far_shin -- the straightest segment in the whole candidate -- as bent.
    const w = 200;
    const h = 420;
    const rgba = new Uint8Array(w * h * 4);
    const alpha = new Uint8Array(w * h);
    const paint = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = y * w + x;
        alpha[i] = 255;
        rgba[i * 4] = 200; rgba[i * 4 + 1] = 150; rgba[i * 4 + 2] = 140; rgba[i * 4 + 3] = 255;
    };
    // A perfectly vertical shaft from the knee to the ankle...
    const kneeX = 80;
    const kneeY = 36;
    const ankleY = 300;
    for (let y = kneeY; y <= ankleY; y++) {
        for (let d = -18; d <= 18; d++) paint(kneeX + d, y);
    }
    // ...and a boot below it whose toe juts well forward.
    for (let y = ankleY; y < h - 10; y++) {
        for (let d = -20; d <= 70; d++) paint(kneeX + d, y);
    }
    const image = { w, h, rgba, alpha };
    const landmark = {
        jointPivotFrac: { u: kneeX / w, v: kneeY / h },
        sourcePixel: { knee: { x: kneeX, y: kneeY }, ankle: { x: kneeX, y: ankleY } },
    };

    const viaAnkle = bakedAxis(image, landmark, 'ankle') * DEG;
    const viaInk = bakedAxis(image, landmark, 'distalInk') * DEG;

    assert.ok(Math.abs(viaAnkle) < 0.01,
        `the shaft is vertical, so the bone axis is 0; got ${viaAnkle.toFixed(2)}`);
    assert.ok(viaInk > 3,
        `the boot must be what biases the ink proxy; got ${viaInk.toFixed(2)}`);
});
