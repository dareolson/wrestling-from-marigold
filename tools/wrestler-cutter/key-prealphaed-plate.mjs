#!/usr/bin/env node

// Hard-keys a source plate that arrived WITH an alpha channel already on it,
// so it satisfies the same transparent-RGB contract a chroma-keyed plate does.
//
// THE DEFECT, AND WHOSE IT IS NOT. The front3q v5 draft cut into eight clean
// components, and every one of them violated the contract:
//
//   part          colour at alpha 0   alpha 1-40      v4 control
//   torso                    86,334        4,107        0 /   194
//   far_shin                 45,804        3,212        0 /   191
//   near_shin                41,586        2,993        0 /   150
//   upper_arm                33,896        2,530        0 /   368
//   thigh                    29,295        2,645        0 /   202
//   far_forearm              26,901        2,237        0 /   388
//   near_forearm             24,546        2,329        0 /   356
//   head                     22,060        2,466        0 /   134
//
// The cutter did not do this and must not be asked to undo it: it reproduces
// v3's twelve parts byte for byte, and that reproduction is the evidence its
// eight-part support changed nothing. The difference is upstream of it. v3's
// plate reached the cutter through `remove-chroma-key.mjs`, which decides
// alpha itself and writes 0,0,0 under every transparent pixel -- measured on
// v3's keyed plate: zero violations in 1,572,778 pixels. The v5 plate arrived
// from the generator already carrying alpha and never passed through any
// keying step at all, so it kept whatever colour sat under it.
//
// WHY IT IS NOT MERELY COSMETIC. Invisible colour is invisible only until
// something measures the image instead of looking at it, and this pipeline is
// mostly things that measure images. The plate also carries a faint glow --
// a broad low-alpha halo reaching well past the figure, 1,103 pixels at alpha
// 16-31 and thousands more below that. Trimming at "alpha is not zero"
// measures the glow rather than the man: the v5 figure bounded that way is
// 861x1475 against its real 512x1313, so scaling it to a 265px gate renders
// Lou at about 236px in a frame labelled 265 -- leaner and taller than he is,
// which is the exact judgement the comparison exists to settle. Any
// `art:proofs --parts` run on an unkeyed plate understates the figure the same
// way.
//
// WHAT THIS DOES, in two separable steps:
//
//   1. THE CONTRACT, always. Wherever alpha is 0, RGB becomes 0,0,0. This is
//      lossless by construction -- a fully transparent pixel's colour is not
//      visible in any compositor -- and it is the whole of what
//      `findV2TransparentRgbViolation` asks for.
//   2. THE GLOW, at a threshold. Wherever alpha is at or below `--threshold`,
//      the pixel is cleared outright: alpha 0, RGB 0,0,0. This is a judgement
//      and not a contract, so it is a named number with a default rather than
//      something the tool does silently.
//
// THE DEFAULT THRESHOLD is the pipeline's own PAINT_ALPHA, imported rather
// than restated. It is defensible here on the measured evidence and not only
// by convention: this plate's alpha is strongly bimodal -- 1,153,215 pixels
// under 16 and 408,547 over 240, with barely 8,000 in between -- so the bbox
// is stable anywhere from about 8 upward, and a pixel at alpha 40 carries at
// most 16% coverage. The v4 control keeps only 134-388 pixels in that band
// across a whole part, which is what genuine edge antialiasing looks like;
// thousands is a halo. Pass `--threshold 0` to apply the contract alone and
// leave every painted pixel exactly as it arrived.
//
// This is a DETERMINISTIC TRANSFORM, not new artwork. It removes colour that
// was never visible and coverage below a stated floor; it invents nothing,
// repaints nothing, and resamples nothing. Running it on an already-keyed
// plate is a byte-identical no-op, so it is safe to put in front of the cutter
// unconditionally.
//
// Usage:
//   node tools/wrestler-cutter/key-prealphaed-plate.mjs \
//        INPUT.png OUTPUT.png [--threshold 40] [--json]

import { readFile, writeFile } from 'node:fs/promises';

import { decodeRgbaPng, findV2TransparentRgbViolation } from './validate-source-manifest.mjs';
import { encodeRgbaPng } from './export-v2-sheet.mjs';
import { PAINT_ALPHA } from './measure-joint-articulation.mjs';

// Single-sourced from the module that owns the paint/no-paint decision, for the
// same reason MAX_BAKED_AXIS_DEG lives with the axis it measures: a threshold
// copied into a second file is a threshold that will eventually disagree with
// itself, and nothing would report the disagreement.
export const DEFAULT_GLOW_ALPHA = PAINT_ALPHA;

/**
 * Hard-keys a pre-alpha'd image.
 *
 * Returns the new image plus a census of what actually changed, because "it
 * ran" and "it had something to do" are different claims and the second is the
 * one worth reporting.
 *
 * @param {{w:number,h:number,rgba:Uint8Array}} image
 * @param {number} glowAlpha pixels at or below this alpha are cleared outright
 */
export function keyPrealphaedPlate(image, glowAlpha = DEFAULT_GLOW_ALPHA) {
    if (!Number.isInteger(glowAlpha) || glowAlpha < 0 || glowAlpha > 255) {
        throw new RangeError(`glow alpha must be an integer 0-255, got ${glowAlpha}`);
    }
    const rgba = Uint8Array.from(image.rgba);
    let colourCleared = 0;  // opaque-channel colour sitting under alpha 0
    let glowCleared = 0;    // painted-but-negligible pixels removed outright
    for (let i = 0; i < image.w * image.h; i++) {
        const at = i * 4;
        const alpha = rgba[at + 3];
        if (alpha > glowAlpha) continue;
        const hasColour = rgba[at] !== 0 || rgba[at + 1] !== 0 || rgba[at + 2] !== 0;
        // Counted before the write, and the two counters are deliberately
        // disjoint: a glow pixel is reported as glow even though clearing it
        // also clears its colour, so the numbers add up to the pixels touched
        // rather than double-counting them.
        if (alpha === 0) {
            if (hasColour) colourCleared++;
        } else {
            glowCleared++;
        }
        rgba[at] = 0;
        rgba[at + 1] = 0;
        rgba[at + 2] = 0;
        rgba[at + 3] = 0;
    }
    return {
        image: { w: image.w, h: image.h, rgba },
        colourCleared,
        glowCleared,
        changed: colourCleared + glowCleared,
    };
}

/** The ink bounding box at a given alpha floor, for reporting what moved. */
export function inkBounds(image, threshold = 0) {
    let minX = image.w; let minY = image.h; let maxX = -1; let maxY = -1;
    for (let y = 0; y < image.h; y++) {
        for (let x = 0; x < image.w; x++) {
            if (image.rgba[(y * image.w + x) * 4 + 3] <= threshold) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function main(argv) {
    const positional = argv.filter((a) => !a.startsWith('--'));
    const [inputPath, outputPath] = positional;
    const json = argv.includes('--json');
    const flagIndex = argv.indexOf('--threshold');
    const glowAlpha = flagIndex >= 0 ? Number(argv[flagIndex + 1]) : DEFAULT_GLOW_ALPHA;

    if (!inputPath || !outputPath) {
        console.error('usage: key-prealphaed-plate.mjs INPUT.png OUTPUT.png '
            + '[--threshold 40] [--json]');
        process.exit(2);
    }

    const source = decodeRgbaPng(await readFile(inputPath));
    const before = inkBounds(source, 0);
    const result = keyPrealphaedPlate(source, glowAlpha);
    const after = inkBounds(result.image, 0);

    // Self-check rather than self-report. The contract has a checker already;
    // running it on the output is cheap and turns "this should satisfy the
    // contract" into "this does".
    const violation = findV2TransparentRgbViolation(decodeRgbaPng(encodeRgbaPng(result.image)));
    if (violation) {
        console.error(`keying left a transparent pixel at (${violation.x},${violation.y}) `
            + `carrying RGB ${violation.rgb.join(',')}`);
        process.exit(1);
    }

    await writeFile(outputPath, encodeRgbaPng(result.image));

    const report = {
        input: inputPath,
        output: outputPath,
        canvas: { w: source.w, h: source.h },
        glowAlpha,
        colourCleared: result.colourCleared,
        glowCleared: result.glowCleared,
        inkBounds: { before, after },
        contractClean: true,
    };
    if (json) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }
    console.log(`keyed ${inputPath} -> ${outputPath} (${source.w}x${source.h})`);
    console.log(`  colour under alpha 0 cleared: ${result.colourCleared}`);
    console.log(`  glow cleared at alpha <= ${glowAlpha}: ${result.glowCleared}`);
    if (before && after && (before.w !== after.w || before.h !== after.h)) {
        console.log(`  ink bounds ${before.w}x${before.h} -> ${after.w}x${after.h} `
            + `(the glow was being measured as the figure)`);
    }
    console.log('  transparent-RGB contract: clean');
    if (result.changed === 0) console.log('  (already keyed; output is byte-identical input)');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await main(process.argv.slice(2));
}
