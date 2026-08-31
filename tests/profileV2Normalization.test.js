import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { decodeRgbaPng } from '../tools/wrestler-cutter/validate-source-manifest.mjs';
import {
    FROZEN_PASS_A_SHA256, OUTPUT_DIR, PART_PLAN, SOURCE_PARTS_DIR,
    alphaAt, countTransparentHoles, inverseSimilarity, orientationAxis, paintBounds, resolvedAnchors,
    rowSpans, zonePoints,
} from '../tools/wrestler-cutter/normalize-profile-v2-parts.mjs';

const manifest = JSON.parse(await readFile(
    new URL('../tools/wrestler-cutter/templates/rig-source-manifest.v2.example.json', import.meta.url),
    'utf8',
));
const index = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'parts-index.json'), 'utf8'));

const load = async file => decodeRgbaPng(await readFile(path.join(OUTPUT_DIR, 'parts', file)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const parts = Object.fromEntries(await Promise.all(
    Object.entries(index.parts).map(async ([key, entry]) => [key, await load(entry.file)]),
));

// The approved profile-v2 source set is read-only input. If normalization ever
// writes back into it, the parts it derives from stop being the parts Derek
// approved, so the hashes are frozen here rather than only asserted at run time.
const FROZEN_SOURCE_PARTS = {
    'head.png': 'fb666007afdd9e1a25c9ce1f8123980d0eae3b6c9d0aeb9aa1e1968dce8541af',
    'torso-trunks.png': '2518b74993fd588897845cdf6abe71cfb6e1cf947628e7dad2e711e956bec4d4',
    'upper-arm-source.png': '9dd433d85f1cf380e82b62c95cc04c25003e19fbc6947228fb6e4db43423c271',
    'near-forearm-hand-source.png': '9f9326e09c6b8fe8b38d8f1eccc7d28b8435f35412548694ed0d7fc644167718',
    'far-forearm-hand-source.png': '875a5c7dee6e1f70cd2b4d56339fbff0d9e2ef1d6c378e44891d7cb161a1a30b',
    'thigh.png': '6df6f045198c8f22cff87a45e5ae8a9dffaecfeac17bafe2a22a5294078e341e',
    'shin.png': '04f7350db0336ed0609fd57054ae66d5f986232c093e5ef5e63dcb113c63ba00',
    'near-boot.png': '7fabe00300d9daa5193dbda232e2b279ee8f41a0f266ba96e1d72c10e5acba1e',
    'far-boot.png': '702939f91c1dce9a64673d65d8e830c50993d98367ffa52e4423f00544d9d04b',
};
const REVISED_TORSO = new URL(
    '../Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2/sources/profile-torso-trunks-v3-alpha.png',
    import.meta.url,
);
const REVISED_TORSO_SHA256 = 'd65d9e297864d66b597066e83b1c73f667cb6a49a4c030e264fdf13eea122bd1';

test('the frozen Pass-A master and the approved profile-v2 sources are untouched', async () => {
    const passA = await readFile(new URL(
        '../Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png',
        import.meta.url,
    ));
    assert.equal(sha256(passA), FROZEN_PASS_A_SHA256);
    assert.equal(index.passAv3Sha256, FROZEN_PASS_A_SHA256);
    for (const [file, expected] of Object.entries(FROZEN_SOURCE_PARTS)) {
        assert.equal(sha256(await readFile(path.join(SOURCE_PARTS_DIR, file))), expected, file);
    }
    assert.equal(sha256(await readFile(REVISED_TORSO)), REVISED_TORSO_SHA256,
        'the revised torso/trunks source must stay frozen');
});

test('the visible thigh hip preserves source contour instead of exposing coverage geometry', () => {
    assert.equal(index.parts.thigh.zoneFillByJoint.hip, 0,
        'hip coverage must already exist in the registered source paint');
    assert.equal(index.parts.thigh.terminalRadii.hip, undefined,
        'the visible hip must not be clipped to a disk or capsule');

    const spans = rowSpans(parts.thigh);
    const hipY = manifest.views.profile.anchorOverrides.thigh.hip.y;
    const painted = spans.slice(0, hipY + 1).filter(Boolean);
    assert.ok(painted.length > 20, 'upper thigh must carry a substantial painted contour');
    // A generated ball joint creates a local narrow waist below a rounded cap.
    // The natural source contour broadens continuously into the thigh instead.
    let largestDrop = 0;
    for (let i = 1; i < painted.length; i++) {
        largestDrop = Math.max(largestDrop, painted[i - 1].span - painted[i].span);
    }
    assert.ok(largestDrop <= 3, `upper-thigh contour pinches by ${largestDrop}px`);
});

test('every normalized cell lands on its canonical canvas with clean alpha', () => {
    for (const [key, entry] of Object.entries(index.parts)) {
        const partName = PART_PLAN.find(plan => plan.key === key)?.part ?? key;
        const canvas = manifest.parts[partName].canvas;
        assert.deepEqual({ w: parts[key].w, h: parts[key].h }, { w: canvas.w, h: canvas.h }, key);
        assert.equal(entry.mirrored, false, `${key} must not be mirrored`);

        const image = parts[key];
        let contaminated = 0, fringe = 0;
        for (let pixel = 0; pixel < image.w * image.h; pixel++) {
            const offset = pixel * 4, alpha = image.rgba[offset + 3];
            if (alpha === 0 && (image.rgba[offset] || image.rgba[offset + 1] || image.rgba[offset + 2])) {
                contaminated++;
            }
            if (alpha > 0 && alpha <= 24) fringe++;
        }
        assert.equal(contaminated, 0, `${key} transparent RGB must be 0,0,0`);
        assert.equal(fringe, 0, `${key} must carry no chroma-key alpha fringe`);
    }
});

test('every declared joint zone is fully opaque in the part that owns it', () => {
    let zones = 0;
    for (const plan of PART_PLAN) {
        const anchors = resolvedAnchors(manifest, plan.part);
        const axis = orientationAxis(manifest, plan.part);
        for (const [jointName, zone] of Object.entries(manifest.parts[plan.part].jointZones ?? {})) {
            if (zone.coveragePart) continue;
            for (const point of zonePoints(anchors[jointName], axis, zone)) {
                assert.equal(alphaAt(parts[plan.key], point.x, point.y), 255,
                    `${plan.key}.${jointName} is open at ${point.x},${point.y}`);
            }
            zones++;
        }
    }
    // Both hips are covered by the pelvis underlay rather than by the torso.
    const torsoAnchors = resolvedAnchors(manifest, 'torso');
    const torsoAxis = orientationAxis(manifest, 'torso');
    for (const jointName of ['leftHip', 'rightHip']) {
        const zone = manifest.parts.torso.jointZones[jointName];
        for (const point of zonePoints(torsoAnchors[jointName], torsoAxis, zone)) {
            assert.equal(alphaAt(parts.pelvisUnderlay, point.x, point.y), 255,
                `pelvisUnderlay.${jointName} is open at ${point.x},${point.y}`);
        }
        zones++;
    }
    assert.equal(zones, 20);
});

test('the pelvis underlay closes the trunks leg opening and the front mask stays transparent', () => {
    const coverage = manifest.parts.torso.pelvisCoverage;
    const { x, y, w, h } = coverage.bounds, radius = coverage.cornerRadiusPx;
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
        const cx = Math.max(x + radius, Math.min(x + w - 1 - radius, px));
        const cy = Math.max(y + radius, Math.min(y + h - 1 - radius, py));
        if ((px - cx) ** 2 + (py - cy) ** 2 > radius ** 2) continue;
        assert.equal(alphaAt(parts.pelvisUnderlay, px, py), 255, `underlay open at ${px},${py}`);
    }
    for (const key of ['pelvisMask', 'shoulderMask']) {
        assert.ok(!parts[key].rgba.some((value, offset) => offset % 4 === 3 && value !== 0),
            `${key} must stay transparent in profile`);
    }
});

test('the regenerated torso and trunks are one solid silhouette with no transparent opening', async () => {
    const source = decodeRgbaPng(await readFile(REVISED_TORSO));
    assert.equal(countTransparentHoles(source), 0, 'revised source must not contain a transparent hole');
    assert.equal(countTransparentHoles(parts.torso), 0, 'normalized torso must not contain a transparent hole');
});

test('profile reuse never mirrors: both boots face right and the near/far pairs stay distinct', () => {
    for (const key of ['nearBoot', 'farBoot']) {
        const bounds = paintBounds(parts[key]);
        const split = bounds.y + Math.round(bounds.h * 0.6);
        const centroid = (from, to) => {
            let sum = 0, count = 0;
            for (let y = from; y <= to; y++) for (let x = 0; x < parts[key].w; x++) {
                if (alphaAt(parts[key], x, y)) { sum += x; count++; }
            }
            return count ? sum / count : 0;
        };
        assert.ok(centroid(split, bounds.y + bounds.h - 1) > centroid(bounds.y, split - 1) + 4,
            `${key} toe must point right`);
    }
    const mirrored = (a, b) => {
        for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
            if (alphaAt(a, x, y) !== alphaAt(b, a.w - 1 - x, y)) return false;
        }
        return true;
    };
    for (const [near, far] of [['nearHand', 'farHand'], ['nearForearm', 'farForearm'],
        ['nearBoot', 'farBoot']]) {
        assert.ok(parts[near].rgba.some((value, offset) => value !== parts[far].rgba[offset]),
            `${near}/${far} must be separately authored`);
        assert.equal(mirrored(parts[near], parts[far]), false,
            `${near}/${far} must not be a horizontal flip of each other`);
    }
});

test('registration is a similarity transform with no reflection term', () => {
    const toSource = inverseSimilarity({ x: 10, y: 20 }, { x: 10, y: 120 },
        { x: 50, y: 40 }, { x: 50, y: 90 });
    // A reflection would flip the sign of the cross product of the two mapped
    // basis vectors; a rotation and uniform scale preserve it.
    const origin = toSource({ x: 0, y: 0 });
    const alongX = toSource({ x: 1, y: 0 }), alongY = toSource({ x: 0, y: 1 });
    const ux = { x: alongX.x - origin.x, y: alongX.y - origin.y };
    const uy = { x: alongY.x - origin.x, y: alongY.y - origin.y };
    assert.ok(ux.x * uy.y - ux.y * uy.x > 0, 'transform must preserve handedness');
    assert.ok(Math.abs(Math.hypot(ux.x, ux.y) - Math.hypot(uy.x, uy.y)) < 1e-9, 'scale must be uniform');
});

test('the normalization report records a scale and landmarks for every registered cell', () => {
    for (const plan of PART_PLAN) {
        const entry = index.parts[plan.key];
        assert.ok(entry.registeredScale > 0, `${plan.key} needs a positive scale`);
        assert.equal(Object.keys(entry.sourceLandmarks).length, 2, `${plan.key} needs two landmarks`);
        assert.ok(entry.fileSha256 && entry.decodedPixelSha256, `${plan.key} needs hashes`);
    }
    assert.deepEqual(index.validation.failures, []);
    assert.equal(index.depthOrder.length, 9);
});
