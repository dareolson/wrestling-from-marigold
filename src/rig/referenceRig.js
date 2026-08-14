// The reference rig — a standards-compliant character that exists in code
// rather than in artwork.
//
// WHY THIS EXISTS
// ---------------
// Audit finding (2026-08-12): neither shipped character exercises the
// production rig contract at all. George and Thesz declare no `hand` slot, no
// `boot` slot, no two-anchor `binding`, and no `variants`. That means
// Skeleton's `_placeAttachment` returns null on its first guard at all six of
// its call sites, `_placeBoundPart` always falls through to the legacy
// `_placePart`, and `resolvePartSelection` never swaps anything. The exact
// two-anchor bindings, the independent hand/boot attachment slots, the
// pelvisUnderlay/pelvisMask pair, and the variant system are therefore dead
// code in the shipped game — verified by deliberately breaking
// `solveAnchoredAttachment` (centering every hand and boot on its quad
// instead of its authored wrist/ankle anchor) and observing that 205/205 unit
// tests, both validators, the articulation probe, and the joint-attachment
// audit all produced byte-identical output.
//
// A character cannot be certified against a contract that nothing executes.
// This module is the first — currently the only — executable instance of the
// production standard, so it serves two jobs at once:
//
//   1. It runs the production render path, so regressions in binding geometry
//      have somewhere to show up.
//   2. It is the CONTROL for attribution. When a pose fails, the question
//      "does the compliant rig fail the same way?" is the difference between
//      "the architecture is broken" and "this character's artwork is legacy".
//      That question is objective 7, and it is unanswerable without this file.
//
// The art is painted procedurally from the manifest's own anchors and joint
// zones, so it is compliant BY CONSTRUCTION rather than by an artist
// remembering the rules: every joint zone is filled because the painter fills
// it, and the fill is a flat mid-tone so no dark attachment contour can
// appear. Deliberately crude — this is a measuring instrument, not a
// wrestler. It never ships in a match and is never loaded by Arena.

import { sourceManifestToTextures } from './sourceManifestAdapter.js';

// Flat mid-tone. Luminance must stay clear of the dark-contour heuristic in
// detectOverlapEdgeWarnings (lum < 55 on >=70% of a joint row raises a bevel
// warning); this sits at ~134, and being a single flat fill there is no edge
// to detect in the first place.
const INK = Object.freeze({ r: 150, g: 130, b: 110 });
const TRUNKS_INK = Object.freeze({ r: 64, g: 64, b: 72 });

export const REFERENCE_MANIFEST = Object.freeze({
    version: 1,
    characterId: 'refrig',
    coordinateSpace: 'export-pixels',
    workingScale: 4,
    minimumJointOverlapPx: 12,
    jointSurfaceRule: 'continuous-fill-no-edge',
    humanExtremeAngleReviewRequired: true,
    markerLayer: {
        name: 'RIG_MARKERS',
        exportedIntoArt: false,
        cleanArtFile: 'source-art.png',
        guideFile: 'source-guides.png',
    },
    parts: {
        head: {
            file: 'head.png',
            geometryLock: 'refrig-head-v1',
            canvas: { w: 200, h: 200 },
            anchors: { neck: { x: 100, y: 178 } },
            jointZones: { neck: { beforePx: 16, afterPx: 16, surface: 'continuous-fill-no-edge' } },
        },
        torso: {
            file: 'torso.png',
            geometryLock: 'refrig-torso-v1',
            canvas: { w: 190, h: 260 },
            anchors: {
                neck: { x: 95, y: 20 },
                nearShoulder: { x: 45, y: 55 },
                farShoulder: { x: 142, y: 50 },
                nearHip: { x: 76, y: 232 },
                farHip: { x: 112, y: 228 },
            },
            // owner is pelvisUnderlay, not torso: the production model is an
            // underlay BEHIND both thighs plus a mask ABOVE both thighs.
            // George's legacy middle-depth pelvisOverlay is explicitly not
            // this, which is why he cannot serve as the reference.
            pelvisCoverage: {
                owner: 'pelvisUnderlay',
                bounds: { x: 58, y: 204, w: 78, h: 50 },
                cornerRadiusPx: 18,
                hipRadiusPx: 16,
                sweepRadiusPx: 12,
                optionalFrontMask: 'pelvis_mask.png',
                attachmentSurface: 'continuous-fill-no-edge',
            },
            jointZones: {},
        },
        pelvisUnderlay: {
            file: 'pelvis_underlay.png',
            geometryLock: 'refrig-torso-v1',
            // Must match the torso canvas exactly: validatePelvisSweep indexes
            // the owner image with torso-space coordinates.
            canvas: { w: 190, h: 260 },
            anchors: {},
            jointZones: {},
        },
        pelvisMask: {
            file: 'pelvis_mask.png',
            geometryLock: 'refrig-torso-v1',
            canvas: { w: 190, h: 260 },
            anchors: {},
            jointZones: {},
        },
        upperArm: {
            file: 'upper_arm.png',
            geometryLock: 'refrig-upper-arm-v1',
            canvas: { w: 130, h: 180 },
            anchors: { shoulder: { x: 65, y: 20 }, elbow: { x: 64, y: 148 } },
            jointZones: {
                shoulder: { beforePx: 20, afterPx: 14, surface: 'continuous-fill-no-edge' },
                elbow: { beforePx: 14, afterPx: 32, surface: 'continuous-fill-no-edge' },
            },
        },
        forearm: {
            file: 'forearm.png',
            geometryLock: 'refrig-forearm-v1',
            canvas: { w: 110, h: 180 },
            anchors: { elbow: { x: 55, y: 24 }, wrist: { x: 55, y: 154 } },
            jointZones: {
                elbow: { beforePx: 24, afterPx: 14, surface: 'continuous-fill-no-edge' },
                wrist: { beforePx: 14, afterPx: 26, surface: 'continuous-fill-no-edge' },
            },
        },
        hand: {
            file: 'hand.png',
            geometryLock: 'refrig-hand-v1',
            canvas: { w: 96, h: 96 },
            anchors: { wrist: { x: 48, y: 22 }, contact: { x: 60, y: 60 } },
            jointZones: { wrist: { beforePx: 22, afterPx: 14, surface: 'continuous-fill-no-edge' } },
        },
        thigh: {
            file: 'thigh.png',
            geometryLock: 'refrig-thigh-v1',
            canvas: { w: 150, h: 180 },
            anchors: { hip: { x: 75, y: 20 }, knee: { x: 75, y: 150 } },
            jointZones: {
                hip: { beforePx: 20, afterPx: 14, surface: 'continuous-fill-no-edge' },
                knee: { beforePx: 14, afterPx: 30, surface: 'continuous-fill-no-edge' },
            },
        },
        shin: {
            file: 'shin.png',
            geometryLock: 'refrig-shin-v1',
            canvas: { w: 130, h: 210 },
            anchors: { knee: { x: 65, y: 24 }, ankle: { x: 65, y: 180 } },
            jointZones: {
                knee: { beforePx: 24, afterPx: 14, surface: 'continuous-fill-no-edge' },
                ankle: { beforePx: 14, afterPx: 30, surface: 'continuous-fill-no-edge' },
            },
        },
        // Boot geometry is constrained by the engine's grounding solve, not
        // just by the source standard. Skeleton computes `ankleRest = bootH *
        // 0.9` and seats the ankle that far above the mat, so the authored
        // sole must sit 0.9 of the boot's RENDERED height below its ankle or
        // the wrestler floats. Rendered height is fixed at bootH (25px) via
        // displayScale = 25 / canvas.h, so the constraint in canvas space is
        // (sole.y - ankle.y) / canvas.h === 0.9. Here: (118 - 10) / 120.
        // The certifier's sole-grounding invariant caught an earlier version
        // of this boot floating ~8px; see CHARACTER_ART_SOURCE_STANDARD.md.
        boot: {
            file: 'boot.png',
            geometryLock: 'refrig-boot-v1',
            canvas: { w: 120, h: 120 },
            anchors: { ankle: { x: 36, y: 10 }, sole: { x: 86, y: 118 } },
            jointZones: { ankle: { beforePx: 22, afterPx: 14, surface: 'continuous-fill-no-edge' } },
        },
    },
    // Structural anchors (wrist, ankle) are byte-identical across each family
    // — that is the swap contract. Only the semantic contact point moves,
    // which is what certifyVariantDrift measures on screen.
    variantFamilies: {
        head: [
            { id: 'idle', geometryLock: 'refrig-head-v1', canvas: { w: 200, h: 200 }, anchors: { neck: { x: 100, y: 178 } } },
            { id: 'hurt', geometryLock: 'refrig-head-v1', canvas: { w: 200, h: 200 }, anchors: { neck: { x: 100, y: 178 } } },
        ],
        hand: [
            { id: 'open', geometryLock: 'refrig-hand-v1', canvas: { w: 96, h: 96 }, anchors: { wrist: { x: 48, y: 22 }, contact: { x: 60, y: 60 } } },
            { id: 'fist', geometryLock: 'refrig-hand-v1', canvas: { w: 96, h: 96 }, anchors: { wrist: { x: 48, y: 22 }, contact: { x: 70, y: 54 } } },
            { id: 'grip', geometryLock: 'refrig-hand-v1', canvas: { w: 96, h: 96 }, anchors: { wrist: { x: 48, y: 22 }, contact: { x: 63, y: 64 } } },
        ],
        // Only `neutral` is a planted stance and holds the 0.9 grounding
        // ratio. flexed and toePoint deliberately lift the sole — a pointed
        // toe does not bear weight — which is why sole grounding asks for at
        // least one planted foot rather than for every sole to touch.
        boot: [
            { id: 'neutral', geometryLock: 'refrig-boot-v1', canvas: { w: 120, h: 120 }, anchors: { ankle: { x: 36, y: 10 }, sole: { x: 86, y: 118 } } },
            { id: 'flexed', geometryLock: 'refrig-boot-v1', canvas: { w: 120, h: 120 }, anchors: { ankle: { x: 36, y: 10 }, sole: { x: 74, y: 110 } } },
            { id: 'toePoint', geometryLock: 'refrig-boot-v1', canvas: { w: 120, h: 120 }, anchors: { ankle: { x: 36, y: 10 }, sole: { x: 112, y: 96 } } },
        ],
    },
});

// ── Painter ──────────────────────────────────────────────────────────────
// Emits { w, h, rgba, alpha } so one implementation feeds both the Node-side
// pixel validators (validatePixelCoverage / validatePelvisSweep want .alpha,
// detectOverlapEdgeWarnings wants .rgba) and the browser, where the same
// buffer goes straight into ImageData. No PNG encoder, no new dependency, and
// no chance of the validated pixels and the rendered pixels diverging.

function blankImage(canvas) {
    return {
        w: canvas.w,
        h: canvas.h,
        rgba: new Uint8ClampedArray(canvas.w * canvas.h * 4),
        alpha: new Uint8Array(canvas.w * canvas.h),
    };
}

function plot(image, x, y, ink) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= image.w || iy < 0 || iy >= image.h) return;
    const index = iy * image.w + ix;
    image.alpha[index] = 255;
    image.rgba[index * 4] = ink.r;
    image.rgba[index * 4 + 1] = ink.g;
    image.rgba[index * 4 + 2] = ink.b;
    image.rgba[index * 4 + 3] = 255;
}

// Flat capsule between two anchors. This is the whole reason the reference
// art is compliant: a capsule drawn anchor-to-anchor and extended past both
// ends necessarily fills its joint zones, so `continuous-fill-no-edge` holds
// without anyone hand-checking it.
function fillCapsule(image, ax, ay, bx, by, radius, ink = INK) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const x0 = Math.floor(Math.min(ax, bx) - radius);
    const x1 = Math.ceil(Math.max(ax, bx) + radius);
    const y0 = Math.floor(Math.min(ay, by) - radius);
    const y1 = Math.ceil(Math.max(ay, by) + radius);
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const t = lengthSq > 0
                ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSq))
                : 0;
            const px = ax + t * dx;
            const py = ay + t * dy;
            if ((x - px) ** 2 + (y - py) ** 2 <= radius * radius) plot(image, x, y, ink);
        }
    }
}

function fillDisk(image, cx, cy, radius, ink = INK) {
    fillCapsule(image, cx, cy, cx, cy, radius, ink);
}

function fillRoundedRect(image, bounds, radius, ink = INK) {
    const left = bounds.x;
    const right = bounds.x + bounds.w - 1;
    const top = bounds.y;
    const bottom = bounds.y + bounds.h - 1;
    for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
        for (let x = Math.floor(left); x <= Math.ceil(right); x++) {
            const cx = Math.max(left + radius, Math.min(right - radius, x));
            const cy = Math.max(top + radius, Math.min(bottom - radius, y));
            if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) plot(image, x, y, ink);
        }
    }
}

function paintSegment(canvas, proximal, distal, radius) {
    const image = blankImage(canvas);
    // Extend past both anchors to the canvas edge along the bone axis so the
    // authored overlap slack (jointZones before/after) is real ink, not a
    // flat cap sitting exactly on the joint row.
    const dx = distal.x - proximal.x;
    const dy = distal.y - proximal.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const overshoot = Math.max(canvas.w, canvas.h);
    fillCapsule(
        image,
        proximal.x - ux * overshoot, proximal.y - uy * overshoot,
        distal.x + ux * overshoot, distal.y + uy * overshoot,
        radius,
    );
    return image;
}

function paintHand(canvas, wrist, contact) {
    const image = blankImage(canvas);
    // Palm disk seated on the wrist, plus a lobe reaching the contact point.
    // The lobe is what differs between open/fist/grip, so a variant swap
    // visibly changes the semantic contact while the wrist stays put.
    fillCapsule(image, wrist.x, wrist.y - 24, wrist.x, wrist.y + 14, 30);
    fillCapsule(image, wrist.x, wrist.y + 8, contact.x, contact.y, 26);
    fillDisk(image, contact.x, contact.y, 20);
    return image;
}

function paintBoot(canvas, ankle, sole) {
    const image = blankImage(canvas);
    fillCapsule(image, ankle.x, ankle.y - 26, ankle.x, ankle.y + 22, 26);
    fillCapsule(image, ankle.x, ankle.y + 14, sole.x, sole.y, 24);
    fillDisk(image, sole.x, sole.y, 16);
    return image;
}

function paintTorso(manifest) {
    const part = manifest.parts.torso;
    const image = blankImage(part.canvas);
    fillRoundedRect(image, { x: 20, y: 10, w: 150, h: 245 }, 30);
    for (const socket of ['nearShoulder', 'farShoulder', 'nearHip', 'farHip']) {
        fillDisk(image, part.anchors[socket].x, part.anchors[socket].y, 26);
    }
    fillCapsule(image, part.anchors.neck.x, 0, part.anchors.neck.x, 40, 30);
    return image;
}

function paintPelvisUnderlay(manifest) {
    const torso = manifest.parts.torso;
    const coverage = torso.pelvisCoverage;
    const image = blankImage(manifest.parts.pelvisUnderlay.canvas);
    // Fill exactly the rounded underbody the sweep validator probes, then the
    // hip disks. Both hips end up covered by the owner alone, which is the
    // point of an underlay: no thigh rotation can open a hole in it.
    fillRoundedRect(image, coverage.bounds, coverage.cornerRadiusPx, TRUNKS_INK);
    for (const socket of ['nearHip', 'farHip']) {
        fillDisk(image, torso.anchors[socket].x, torso.anchors[socket].y, coverage.hipRadiusPx + 6, TRUNKS_INK);
    }
    return image;
}

function paintPelvisMask(manifest) {
    const coverage = manifest.parts.torso.pelvisCoverage;
    const image = blankImage(manifest.parts.pelvisMask.canvas);
    // Front trunks panel: rides ABOVE both thighs, so it hides the thigh
    // roots rather than being hidden by them.
    fillRoundedRect(image, {
        x: coverage.bounds.x + 6,
        y: coverage.bounds.y + 4,
        w: coverage.bounds.w - 12,
        h: coverage.bounds.h - 18,
    }, 12, TRUNKS_INK);
    return image;
}

/**
 * Paint every base part and variant for a manifest.
 * Returns { <partName>: image, variants: { <family>: { <id>: image } } } —
 * exactly the shape validatePixelCoverage and validatePelvisSweep consume.
 */
export function paintReferenceRig(manifest = REFERENCE_MANIFEST) {
    const parts = manifest.parts;
    const images = {
        head: (() => {
            const image = blankImage(parts.head.canvas);
            fillDisk(image, 100, 96, 88);
            fillCapsule(image, parts.head.anchors.neck.x, 120, parts.head.anchors.neck.x, parts.head.canvas.h - 1, 26);
            return image;
        })(),
        torso: paintTorso(manifest),
        pelvisUnderlay: paintPelvisUnderlay(manifest),
        pelvisMask: paintPelvisMask(manifest),
        upperArm: paintSegment(parts.upperArm.canvas, parts.upperArm.anchors.shoulder, parts.upperArm.anchors.elbow, 38),
        forearm: paintSegment(parts.forearm.canvas, parts.forearm.anchors.elbow, parts.forearm.anchors.wrist, 32),
        hand: paintHand(parts.hand.canvas, parts.hand.anchors.wrist, parts.hand.anchors.contact),
        thigh: paintSegment(parts.thigh.canvas, parts.thigh.anchors.hip, parts.thigh.anchors.knee, 44),
        shin: paintSegment(parts.shin.canvas, parts.shin.anchors.knee, parts.shin.anchors.ankle, 36),
        boot: paintBoot(parts.boot.canvas, parts.boot.anchors.ankle, parts.boot.anchors.sole),
        variants: {},
    };
    for (const [family, variants] of Object.entries(manifest.variantFamilies ?? {})) {
        images.variants[family] = {};
        for (const variant of variants) {
            images.variants[family][variant.id] = family === 'hand'
                ? paintHand(variant.canvas, variant.anchors.wrist, variant.anchors.contact)
                : family === 'boot'
                    ? paintBoot(variant.canvas, variant.anchors.ankle, variant.anchors.sole)
                    : images.head;
        }
    }
    return images;
}

/**
 * The reference rig as a runtime character config, ready to hand to Skeleton.
 * Textures come from the same source-manifest adapter every real character
 * uses — there is no second conversion path here, which is the point.
 */
export function referenceCharacter(keyPrefix = 'refrig') {
    return {
        id: keyPrefix,
        skinCol: (INK.r << 16) | (INK.g << 8) | INK.b,
        trunksCol: (TRUNKS_INK.r << 16) | (TRUNKS_INK.g << 8) | TRUNKS_INK.b,
        textures: {
            ...sourceManifestToTextures(REFERENCE_MANIFEST, keyPrefix),
            heightScale: 0.86,
            headScale: 0.62,
            neckInTorso: true,
        },
    };
}

// Which painted image backs each texture slot. Slot names are the adapter's,
// image names are the painter's; the two differ only where the adapter splits
// one source part across near/far slots.
const SLOT_IMAGE = Object.freeze({
    head: 'head', torso: 'torso',
    pelvisUnderlay: 'pelvisUnderlay', pelvisMask: 'pelvisMask',
    upperArm: 'upperArm', forearm: 'forearm', hand: 'hand',
    thigh: 'thigh', shin: 'shin', boot: 'boot',
});

/**
 * Texture keys the runner must register before constructing the Skeleton,
 * each paired with the painted image that backs it.
 *
 * Derived from the character config rather than by restating the adapter's
 * naming convention: if sourceManifestToTextures ever changes how it names a
 * key, the plan follows it instead of silently registering a key nothing
 * reads (which renders as a missing-texture box, not an error).
 */
export function referenceTexturePlan(keyPrefix = 'refrig') {
    const textures = referenceCharacter(keyPrefix).textures;
    const plan = [];
    for (const [slot, image] of Object.entries(SLOT_IMAGE)) {
        const entry = textures[slot];
        const key = typeof entry === 'string' ? entry : entry?.key;
        if (key) plan.push({ key, image });
    }
    for (const [slot, variants] of Object.entries(textures.variants ?? {})) {
        // nearHand/farHand share the `hand` family's painted variants; same
        // for boots. The slot prefix only distinguishes the texture key.
        const family = slot.replace(/^(near|far)/, '').replace(/^./, c => c.toLowerCase());
        for (const [id, entry] of Object.entries(variants)) {
            if (entry?.key) plan.push({ key: entry.key, image: family, variant: id });
        }
    }
    return plan;
}
