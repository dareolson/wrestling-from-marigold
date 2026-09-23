#!/usr/bin/env node

// Maps a modular art candidate's parts onto the slots a shipped character's rig
// can actually load and draw, and names what does not fit.
//
// WHY THIS EXISTS. The front3q candidates are described in the handoffs as
// "targeting the shipped legacy rig", and two different decompositions have both
// carried that description while neither matched it:
//
//   production-limb-redesign/v1   six parts -- far-arm and far-leg as WHOLE
//                                 limbs, near side split at elbow and knee.
//   production-front3q-modular/v3 twelve parts -- both sides split at elbow and
//                                 knee, near and far authored separately, plus
//                                 a pelvis underlay and overlay.
//
// Shipped Lou is neither. He loads six FILES -- head, torso, upper_arm, forearm,
// thigh, shin -- in which the upper arm, forearm, thigh and shin are each ONE
// painting shared by both sides, placed twice with different offsets, tilts and
// scales. "Six parts" and "six files" are not the same statement, and the
// coincidence has been read as agreement.
//
// So the question a candidate has to answer is not how many pieces it has. It is
// which of them the loader can find and the renderer can tell apart. This tool
// answers that from the runtime itself rather than from a document:
//
//   - the loader's filename table (rig/partVariants.js BASE_PART_FILES) decides
//     what can be discovered at all;
//   - Skeleton.js's own `textures.farX ?? textures.X` opt-ins decide which
//     families can carry separately authored near and far paint.
//
// Both are read from source, so the day someone adds an opt-in this tool starts
// reporting the new capability instead of a stale table.
//
// ADVISORY. It reports; it does not gate. Exits 0 unless --strict and something
// is unmappable.
//
// Usage:
//   node tools/wrestler-cutter/map-candidate-to-rig.mjs --parts <dir> \
//        [--landmarks <file.json>] [--json] [--strict]

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE_PART_FILES } from '../../src/rig/partVariants.js';
import { decodeRgbaPng } from './validate-source-manifest.mjs';
import { bakedAxis } from './straighten-limb-bake.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Candidate part name (as exported by the cutters) -> the rig slot it is for.
// `shareable` families are the ones the shipped rig paints once and places
// twice; a candidate that authors them separately per side is offering more
// than the rig asks for, which is a finding rather than an error.
export const CANDIDATE_SLOTS = Object.freeze({
    head: { slot: 'head', side: null },
    torso: { slot: 'torso', side: null },
    pelvis_overlay: { slot: 'pelvisOverlay', side: null },
    pelvis_underlay: { slot: 'pelvisUnderlay', side: null },
    pelvis_mask: { slot: 'pelvisMask', side: null },
    near_upper_arm: { slot: 'nearUpperArm', side: 'near', family: 'upperArm' },
    far_upper_arm: { slot: 'farUpperArm', side: 'far', family: 'upperArm' },
    near_forearm: { slot: 'nearForearm', side: 'near', family: 'forearm' },
    far_forearm: { slot: 'farForearm', side: 'far', family: 'forearm' },
    near_thigh: { slot: 'nearThigh', side: 'near', family: 'thigh' },
    far_thigh: { slot: 'farThigh', side: 'far', family: 'thigh' },
    near_shin: { slot: 'nearShin', side: 'near', family: 'shin' },
    far_shin: { slot: 'farShin', side: 'far', family: 'shin' },
    // The six-part board's whole-limb pieces. They have no slot at all: the rig
    // articulates the elbow and the knee on BOTH sides, so a limb delivered as
    // one piece cannot bend where the rig bends it.
    'far-arm': { slot: null, side: 'far', fuses: ['farUpperArm', 'farForearm'], at: 'elbow' },
    'far-leg': { slot: null, side: 'far', fuses: ['farThigh', 'farShin'], at: 'knee' },
    'near-upper-arm': { slot: 'nearUpperArm', side: 'near', family: 'upperArm' },
    'near-forearm-hand': { slot: 'nearForearm', side: 'near', family: 'forearm' },
    'near-thigh': { slot: 'nearThigh', side: 'near', family: 'thigh' },
    'near-shin-boot': { slot: 'nearShin', side: 'near', family: 'shin' },
});

/**
 * Which limb families Skeleton.js lets a character author separately per side.
 *
 * Read from the source rather than listed here, because the list has changed
 * twice (near/far shin, then near/far forearm for George's v4 hands) and a
 * hardcoded copy would be wrong the third time without anyone noticing.
 *
 * The opt-in is a one-line idiom, and the absence of that line is exactly the
 * limitation this tool reports:
 *     const farForearmEntry = textures.farForearm ?? textures.forearm;
 */
export function splitCapableFamilies(skeletonSource) {
    const families = new Set();
    const re = /textures\.(far|near)([A-Z]\w*)\s*\?\?\s*textures\.(\w+)/g;
    for (let m = re.exec(skeletonSource); m; m = re.exec(skeletonSource)) {
        const shared = m[3];
        const derived = m[2][0].toLowerCase() + m[2].slice(1);
        if (derived === shared) families.add(shared);
    }
    return families;
}

/** Slots the asset loader can discover, i.e. those with a declared filename. */
export function loadableSlots() {
    return new Set(Object.keys(BASE_PART_FILES));
}

/**
 * What to do with a side-specific painting the shipped rig cannot keep separate.
 *
 * Nothing, as it turns out, and that is the useful answer. Shipped Lou already
 * paints the upper arm and the thigh ONCE and places each twice, with the far
 * copy scaled and offset (RIG.FAR_ARM_SCALE, farThighScale, the far* offsets in
 * thesz.js). Feeding the near painting into the shared slot is therefore exactly
 * what he does today: it is parity, not a regression, and it needs no runtime
 * change. What is given up is only the EXTRA the candidate offers -- far-side
 * paint authored for its own three-quarter perspective, which the shipped rig
 * has never been able to use for these two families.
 *
 * Using the near side is the deliberate choice: it is the camera-near copy, it
 * is the one drawn at full scale, and it is the one a viewer reads.
 */
function sharedFallback(family, side) {
    if (!family) return null;
    return side === 'near'
        ? `serve the shared ${family} slot from this near painting -- parity with `
            + 'how the shipped rig already paints this family once and places it twice'
        : `unused on the shipped rig: the shared ${family} slot is served by the near `
            + 'painting, so this separately authored far perspective is discarded';
}

export function mapCandidate({ partNames, splitFamilies, loadable }) {
    const rows = [];
    for (const name of partNames) {
        const spec = CANDIDATE_SLOTS[name];
        if (!spec) {
            rows.push({ part: name, status: 'unknown', note: 'no slot mapping declared for this part name' });
            continue;
        }
        if (spec.slot === null) {
            rows.push({
                part: name, status: 'unmappable',
                note: `one piece spanning the ${spec.at}: the rig articulates `
                    + `${spec.fuses.join(' and ')} separately, so this fuses a joint the rig bends`,
            });
            continue;
        }
        const file = BASE_PART_FILES[spec.slot];
        const family = spec.family;
        // A side-specific slot needs BOTH a filename to be found by and a
        // renderer that keeps the two sides apart.
        if (spec.side && family && !splitFamilies.has(family)) {
            rows.push({
                part: name, status: 'shared-only', slot: spec.slot, family,
                note: `Skeleton.js draws both sides of ${family} from textures.${family}; `
                    + 'there is no near/far opt-in, so separately authored sides collapse to one painting',
                fallback: sharedFallback(family, spec.side),
            });
            continue;
        }
        if (!file) {
            rows.push({
                part: name, status: 'no-filename', slot: spec.slot,
                note: `BASE_PART_FILES declares no filename for ${spec.slot}, `
                    + 'so the loader cannot discover this file even though the renderer supports the slot',
                fallback: sharedFallback(family, spec.side),
            });
            continue;
        }
        rows.push({ part: name, status: 'mapped', slot: spec.slot, file, family: family ?? null });
    }
    return rows;
}


// ── authoring requirements, checked rather than asserted in prose ───────────
//
// Derek's 2026-09-15 brief for the next generation names nine requirements. Two
// of them are already measurable with code this repository has, and a
// requirement that can be measured and is not is a requirement the next
// generation will miss the same way this one did:
//
//   "Limb paintings authored on neutral, straight bone axes -- no baked elbow
//    or knee flex."
//        The front3q v3 arms missed this by 13-20 degrees and nothing noticed
//        until they were wired into the running game and the forearm swung
//        across the body. Reported here per part.
//
//   "No baked trunks material on limb pieces."
//        The six-part board bakes the black band onto the limb tops --
//        near-thigh 73.8% dark in its top rows against front3q v3's 3.9%. Two
//        candidates, same described intent, opposite results.
//
// Advisory, like the rest of this tool: it reports, it does not gate.

const DARK_LUMA = 70;
const TOP_ROWS_FRACTION = 0.18;

/** Fraction of the part's top rows that are painted dark, i.e. trunks material. */
export function darkTopFraction(image) {
    const rows = Math.floor(image.h * TOP_ROWS_FRACTION);
    let opaque = 0;
    let dark = 0;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < image.w; x++) {
            const i = y * image.w + x;
            if (image.alpha[i] <= 40) continue;
            opaque++;
            const luma = 0.299 * image.rgba[i * 4] + 0.587 * image.rgba[i * 4 + 1]
                + 0.114 * image.rgba[i * 4 + 2];
            if (luma < DARK_LUMA) dark++;
        }
    }
    return opaque ? dark / opaque : 0;
}

// Thresholds are PROPOSED, not ratified, like every other number this pipeline
// reports. They are set where the two measured candidates fall either side of
// them by a wide margin, not tuned to a target.
export const AUTHORING = Object.freeze({
    maxBakedAxisDeg: 3,       // v3 arms: 13.4-19.6. v3 legs: 1.7-5.2.
    maxDarkTopFraction: 0.20, // six-part board: 0.52-0.74. front3q v3: 0.03-0.05.
});

async function main(argv) {
    const arg = (flag, fallback = null) => {
        const i = argv.indexOf(flag);
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
    };
    const partsDir = arg('--parts');
    const strict = argv.includes('--strict');
    const asJson = argv.includes('--json');
    if (!partsDir) {
        console.error('usage: map-candidate-to-rig.mjs --parts <dir> '
            + '[--landmarks <file.json>] [--json] [--strict]');
        process.exit(2);
    }

    const partNames = (await readdir(partsDir))
        .filter((f) => f.endsWith('.png'))
        .map((f) => f.replace(/\.png$/, ''))
        .sort();

    const skeleton = await readFile(path.join(ROOT, 'src/Skeleton.js'), 'utf8');
    const splitFamilies = splitCapableFamilies(skeleton);
    const rows = mapCandidate({ partNames, splitFamilies, loadable: loadableSlots() });

    // Authoring checks, where the part is a limb segment and a landmark file is
    // available to say where its joint is.
    const landmarksPath = arg('--landmarks');
    const landmarks = landmarksPath ? JSON.parse(await readFile(landmarksPath, 'utf8')) : null;
    const authoring = [];
    for (const name of partNames) {
        const spec = CANDIDATE_SLOTS[name];
        if (!spec?.family) continue;
        const image = decodeRgbaPng(await readFile(path.join(partsDir, `${name}.png`)));
        const dark = darkTopFraction(image);
        let axisDeg = null;
        const landmark = landmarks?.[name];
        if (landmark?.jointPivotFrac) {
            // Pick the most truthful axis the part declares, in this order:
            //
            //   landmark   both ends declared -- upper arms, thighs. Exact.
            //   ankle      shins. The declared ankle, NOT the boot mass: a
            //              boot's toe juts forward and makes a straight shin
            //              measure bent. far_shin is the straightest segment in
            //              the set (0.0 deg) and the ink proxy called it 5.2.
            //   distalInk  forearms, which declare no distal anchor. The fist
            //              sits roughly on the bone axis, so this is sound
            //              here, but it is a fallback and it is named as one.
            const mode = landmark.distalAnchorFrac ? 'landmark'
                : (landmark.sourcePixel?.ankle ? 'ankle' : 'distalInk');
            axisDeg = bakedAxis(image, landmark, mode) * 180 / Math.PI;
        }
        authoring.push({
            part: name,
            bakedAxisDeg: axisDeg === null ? null : +axisDeg.toFixed(1),
            darkTopFraction: +dark.toFixed(3),
            neutralBake: axisDeg === null ? null : Math.abs(axisDeg) <= AUTHORING.maxBakedAxisDeg,
            trunksFree: dark <= AUTHORING.maxDarkTopFraction,
        });
    }

    if (asJson) {
        console.log(JSON.stringify({ splitFamilies: [...splitFamilies].sort(), rows, authoring }, null, 2));
    } else {
        console.log(`  families the runtime can author per side: ${[...splitFamilies].sort().join(', ') || 'none'}`);
        for (const row of rows) {
            const label = row.status.toUpperCase().padEnd(13);
            console.log(`  ${label} ${row.part}${row.slot ? ` -> ${row.slot}` : ''}`);
            if (row.note) console.log(`                ${row.note}`);
            if (row.fallback) console.log(`                ON THE SHIPPED RIG: ${row.fallback}`);
        }
        const mapped = rows.filter((r) => r.status === 'mapped').length;
        console.log(`  ${mapped}/${rows.length} parts map to a slot the rig can load and tell apart`);

        if (authoring.length) {
            console.log('\n  authoring requirements (advisory; --landmarks needed for the bake axis)');
            for (const row of authoring) {
                const axis = row.bakedAxisDeg === null ? '   n/a'
                    : `${row.bakedAxisDeg.toFixed(1).padStart(6)}`;
                const bake = row.neutralBake === null ? '?' : (row.neutralBake ? 'ok' : 'BAKED BENT');
                const trunks = row.trunksFree ? 'ok' : 'TRUNKS BAKED ON';
                console.log(`    ${row.part.padEnd(18)} bone axis ${axis} deg ${bake.padEnd(11)}`
                    + ` dark top ${(row.darkTopFraction * 100).toFixed(1).padStart(5)}%  ${trunks}`);
            }
        }
    }

    if (strict && rows.some((r) => r.status !== 'mapped')) process.exit(1);
}

const invokedDirectly = process.argv[1]
    && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
    main(process.argv.slice(2)).catch((err) => {
        console.error(err);
        process.exit(2);
    });
}
