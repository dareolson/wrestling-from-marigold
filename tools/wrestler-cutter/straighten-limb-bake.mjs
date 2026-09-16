#!/usr/bin/env node

// Straightens limb segments that were generated at an angle, so the bone runs
// down the canvas the way the rig assumes it does.
//
// THE DEFECT. NEW_ASSETS_SPEC.md requires every part "baked facing RIGHT,
// neutral/straight limb pose", and the rig depends on it: Skeleton places a
// segment with its pivot on the joint and rotates it by the POSE angle alone.
// If the painting already carries an angle, that angle adds to every pose, and
// the limb is wrong in every frame the game ever draws.
//
// The front3q v3 candidate's arms carry one. Measured two independent ways --
// from the declared proximal/distal landmarks, and from the centroid of the
// distal ink -- they agree:
//
//   part             landmark axis   distal-ink axis
//   near_upper_arm         -13.4            -16.8
//   far_upper_arm            9.3             13.5
//   near_forearm             n/a             18.3
//   far_forearm              n/a             18.2
//   near_thigh              -1.8             -2.1
//   far_thigh               -1.7             -1.7
//   near_shin                n/a              2.4
//   far_shin                 n/a              5.2
//
// So the near arm is painted with 31.7 degrees of elbow flex already in it
// (-13.4 upper meeting +18.3 forearm) and the far arm with 8.9. On screen the
// forearm swings across the body at rest. The legs are within a few degrees of
// neutral and are left alone: this corrects what is measurably wrong and
// nothing else.
//
// THIS IS A DETERMINISTIC TRANSFORM, NOT NEW ARTWORK, and the distinction
// matters for what may be claimed about the result. Every pixel is the
// candidate's own paint, rotated about its declared joint; nothing is invented,
// repainted or generated. The pipeline has done this before -- the approved v2
// forearm was "PCA-straightened from its +42deg authored bake, overlap
// retained". It cannot fix a defect of PAINT: the pale un-outlined attachment
// caps, the notched upper-arm silhouette and the flat cut faces that fail
// straight_run_px are all still exactly where they were.
//
// Landmarks are transported through the same rotation rather than re-measured
// by eye, so the corrected parts keep the registration the originals had.
//
// Usage:
//   node tools/wrestler-cutter/straighten-limb-bake.mjs \
//        --parts <dir> --landmarks <in.json> --out <dir> [--json]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';

const PAINT_ALPHA = 40;

// Which parts are straightened, and how each one's axis is defined.
//
// `landmark` uses the declared proximal pivot and distal anchor -- the actual
// bone, and the right answer where it exists. `distalInk` falls back to the
// centroid of the distal ink for a part that declares no distal anchor, which
// is both forearms. The two agree within 3.4 degrees everywhere both are
// available, which is the evidence the fallback is sound.
export const STRAIGHTEN = Object.freeze({
    near_upper_arm: 'landmark',
    far_upper_arm: 'landmark',
    near_forearm: 'distalInk',
    far_forearm: 'distalInk',
});

/** Angle, in radians, from straight-down to the part's bone axis. */
export function bakedAxis(image, landmark, mode, distalFrac = 0.20) {
    // decodeRgbaPng hands back a separate `alpha` plane; a freshly rotated
    // image has only `rgba`. Accept either, so the residual check can run on
    // this function's own output.
    const alphaAt = image.alpha
        ? (i) => image.alpha[i]
        : (i) => image.rgba[i * 4 + 3];
    const pivot = {
        x: landmark.jointPivotFrac.u * image.w,
        y: landmark.jointPivotFrac.v * image.h,
    };
    let distal;
    if (mode === 'landmark') {
        if (!landmark.distalAnchorFrac) throw new Error('landmark mode needs distalAnchorFrac');
        distal = {
            x: landmark.distalAnchorFrac.u * image.w,
            y: landmark.distalAnchorFrac.v * image.h,
        };
    } else {
        let top = -1;
        let bottom = -1;
        for (let y = 0; y < image.h; y++) {
            for (let x = 0; x < image.w; x++) {
                if (alphaAt(y * image.w + x) > PAINT_ALPHA) {
                    if (top < 0) top = y;
                    bottom = y;
                    break;
                }
            }
        }
        const cut = bottom - Math.round((bottom - top) * distalFrac);
        let n = 0;
        let sx = 0;
        let sy = 0;
        for (let y = cut; y <= bottom; y++) {
            for (let x = 0; x < image.w; x++) {
                if (alphaAt(y * image.w + x) > PAINT_ALPHA) { n++; sx += x; sy += y; }
            }
        }
        distal = { x: sx / n, y: sy / n };
    }
    return Math.atan2(distal.x - pivot.x, distal.y - pivot.y);
}

function sample(image, x, y) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= image.w || yi >= image.h) return [0, 0, 0, 0];
    const i = (yi * image.w + xi) * 4;
    return [image.rgba[i], image.rgba[i + 1], image.rgba[i + 2], image.rgba[i + 3]];
}

/**
 * Rotates `image` about `pivot` so that a feature sitting at `angle` ends up at
 * zero -- i.e. it applies the map phi -> phi - angle, where phi is measured from
 * straight-down toward +x, the same convention bakedAxis reports in. Pass the
 * measured bake angle and the bone comes out vertical. Returns the new image and
 * where the pivot landed on the grown canvas.
 *
 * The sign here is worth stating explicitly because getting it backwards does
 * not look like an error: it DOUBLES the bake instead of removing it, and the
 * output is still a plausible limb at a plausible angle. The first version of
 * this function used -angle and took the near upper arm from -13.4 degrees to
 * -26.9. Verified after every run by re-measuring the residual.
 *
 * 3x3 supersampled and premultiplied, matching normalize-profile-v2-parts.mjs:
 * averaging straight RGBA would drag edge colour toward transparent black and
 * grow a dark rim that is not in the art, and nearest-neighbour would alias the
 * silhouette that straight_run_px is measuring.
 */
export function rotateAboutPivot(image, pivot, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Where the four corners go, so nothing is clipped.
    const corners = [[0, 0], [image.w, 0], [0, image.h], [image.w, image.h]]
        .map(([x, y]) => {
            const dx = x - pivot.x;
            const dy = y - pivot.y;
            return { x: cos * dx - sin * dy, y: sin * dx + cos * dy };
        });
    const minX = Math.floor(Math.min(...corners.map((c) => c.x))) - 1;
    const maxX = Math.ceil(Math.max(...corners.map((c) => c.x))) + 1;
    const minY = Math.floor(Math.min(...corners.map((c) => c.y))) - 1;
    const maxY = Math.ceil(Math.max(...corners.map((c) => c.y))) + 1;

    const w = maxX - minX;
    const h = maxY - minY;
    const target = { w, h, rgba: new Uint8Array(w * h * 4) };
    const newPivot = { x: -minX, y: -minY };

    const offsets = [-1 / 3, 0, 1 / 3];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let a = 0;
            let r = 0;
            let g = 0;
            let b = 0;
            for (const sy of offsets) {
                for (const sx of offsets) {
                    const dx = x + sx - newPivot.x;
                    const dy = y + sy - newPivot.y;
                    // Inverse rotation back into the source.
                    const [pr, pg, pb, pa] = sample(image,
                        pivot.x + cos * dx + sin * dy,
                        pivot.y - sin * dx + cos * dy);
                    const alpha = pa / 255;
                    a += alpha; r += pr * alpha; g += pg * alpha; b += pb * alpha;
                }
            }
            if (a < 1e-4) continue;
            const alpha = Math.round((a / 9) * 255);
            if (!alpha) continue;
            const i = (y * w + x) * 4;
            target.rgba[i] = Math.round(r / a);
            target.rgba[i + 1] = Math.round(g / a);
            target.rgba[i + 2] = Math.round(b / a);
            target.rgba[i + 3] = alpha;
        }
    }
    return { image: target, pivot: newPivot };
}

/** Carries one {u,v} landmark through the same rotation onto the new canvas. */
export function transportFrac(frac, source, pivot, angle, target, newPivot) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = frac.u * source.w - pivot.x;
    const dy = frac.v * source.h - pivot.y;
    return {
        u: (newPivot.x + cos * dx - sin * dy) / target.w,
        v: (newPivot.y + sin * dx + cos * dy) / target.h,
    };
}

async function main(argv) {
    const arg = (flag, fallback = null) => {
        const i = argv.indexOf(flag);
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
    };
    const partsDir = arg('--parts');
    const landmarksPath = arg('--landmarks');
    const outDir = arg('--out');
    if (!partsDir || !landmarksPath || !outDir) {
        console.error('usage: straighten-limb-bake.mjs --parts <dir> --landmarks <in.json> --out <dir>');
        process.exit(2);
    }
    await mkdir(outDir, { recursive: true });

    const landmarks = JSON.parse(await readFile(landmarksPath, 'utf8'));
    const out = { ...landmarks };
    out.version = `${landmarks.version}-straightened`;
    out.straightenedFrom = landmarks.version;
    const report = [];

    for (const [name, mode] of Object.entries(STRAIGHTEN)) {
        const source = decodeRgbaPng(await readFile(path.join(partsDir, `${name}.png`)));
        const landmark = landmarks[name];
        const pivot = {
            x: landmark.jointPivotFrac.u * source.w,
            y: landmark.jointPivotFrac.v * source.h,
        };

        // Solve for the correction angle iteratively.
        //
        // `landmark` mode is exact in one step -- it rotates two known points.
        // `distalInk` is not: it averages the bottom fifth of the INK ROWS, and
        // rotating the part changes which pixels fall in those rows, so one
        // pass leaves about a degree behind. Iterating converges in two or
        // three.
        //
        // Every iteration rotates the ORIGINAL by the running total rather than
        // rotating the previous result again, so however many passes it takes,
        // the delivered art has been resampled exactly once.
        let angle = 0;
        let image;
        let newPivot;
        let residual = 0;
        for (let pass = 0; pass < 8; pass++) {
            angle += residual === 0 && pass === 0
                ? bakedAxis(source, landmark, mode)
                : residual;
            ({ image, pivot: newPivot } = rotateAboutPivot(source, pivot, angle));
            const moved = { ...landmark, jointPivotFrac: { u: newPivot.x / image.w, v: newPivot.y / image.h } };
            if (landmark.distalAnchorFrac) {
                moved.distalAnchorFrac = transportFrac(landmark.distalAnchorFrac,
                    source, pivot, angle, image, newPivot);
            }
            residual = bakedAxis(image, moved, mode);
            if (Math.abs(residual * 180 / Math.PI) < 0.05) break;
        }

        const corrected = { ...landmark };
        corrected.jointPivotFrac = { u: newPivot.x / image.w, v: newPivot.y / image.h };
        if (landmark.distalAnchorFrac) {
            corrected.distalAnchorFrac = transportFrac(landmark.distalAnchorFrac,
                source, pivot, angle, image, newPivot);
        }
        if (landmark.soleAnchorFrac) {
            corrected.soleAnchorFrac = transportFrac(landmark.soleAnchorFrac,
                source, pivot, angle, image, newPivot);
        }
        // pivotOffsetFrac is a lateral nudge measured against the OLD canvas
        // width and the old bake. Straightening is precisely the correction it
        // was standing in for, so it is re-derived rather than carried over:
        // the painted joint now sits where the pivot is.
        corrected.pivotOffsetFrac = +(corrected.jointPivotFrac.u - 0.5).toFixed(6);
        corrected.straightenedByDeg = +(angle * 180 / Math.PI).toFixed(3);
        corrected.straightenedUsing = mode;
        out[name] = corrected;

        await writeFile(path.join(outDir, `${name}.png`), encodeRgbaPng(image));
        // Re-measure the result rather than trusting the transform. A sign
        // error here doubles the bake instead of removing it and still looks
        // like a limb, so the residual is the only honest confirmation.
        const residualDeg = bakedAxis(image, corrected, mode) * 180 / Math.PI;
        if (Math.abs(residualDeg) > 0.1) {
            throw new Error(`${name}: straightening left ${residualDeg.toFixed(2)} deg of bake; `
                + 'the rotation did not do what it claims');
        }
        report.push({
            part: name, mode,
            rotatedDeg: +(-angle * 180 / Math.PI).toFixed(2),
            residualDeg: +residualDeg.toFixed(3),
            from: `${source.w}x${source.h}`, to: `${image.w}x${image.h}`,
        });
    }

    // Everything not straightened is copied byte for byte, so the output is a
    // complete part set and its provenance stays obvious.
    const untouched = ['head', 'torso', 'pelvis_overlay', 'pelvis_underlay',
        'near_thigh', 'far_thigh', 'near_shin', 'far_shin'];
    for (const name of untouched) {
        await writeFile(path.join(outDir, `${name}.png`),
            await readFile(path.join(partsDir, `${name}.png`)));
    }

    await writeFile(path.join(outDir, 'landmarks.json'), `${JSON.stringify(out, null, 2)}\n`);

    if (argv.includes('--json')) {
        console.log(JSON.stringify({ report, untouched }, null, 2));
    } else {
        for (const row of report) {
            console.log(`  straightened ${row.part.padEnd(16)} ${String(row.rotatedDeg).padStart(7)} deg`
                + `  ${row.from} -> ${row.to}  residual ${String(row.residualDeg).padStart(6)} deg  (${row.mode})`);
        }
        console.log(`  ${untouched.length} parts copied unchanged: ${untouched.join(', ')}`);
    }
}

const invokedDirectly = process.argv[1]
    && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
    main(process.argv.slice(2)).catch((err) => {
        console.error(err);
        process.exit(2);
    });
}
