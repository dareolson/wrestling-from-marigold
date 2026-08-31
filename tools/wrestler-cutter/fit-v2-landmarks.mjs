#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.v2.example.json');
const DEFAULT_SHEET = path.resolve(SCRIPT_DIR,
    '../../Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png');
const APPROVED_SHA256 = 'ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb';

// Human-selected landmarks, mechanically verified against the frozen v3 alpha.
// This command replays an approved landmark contract; it does not alter pixels.
const FIT = Object.freeze({
    front: {
        crown: [384, 190], neck: [372, 272],
        leftArm: [[326, 303], [307, 380], [285, 451]], rightArm: [[442, 303], [461, 380], [483, 451]],
        leftLeg: [[365, 471], [336, 568], [334, 666]], rightLeg: [[405, 471], [434, 568], [436, 666]],
        soles: [[313, 720], [458, 720]],
    },
    front3q: {
        crown: [372, 190], neck: [384, 272],
        leftArm: [[356, 304], [337, 381], [344, 455]], rightArm: [[448, 308], [467, 385], [460, 459]],
        leftLeg: [[385, 471], [356, 568], [354, 666]], rightLeg: [[409, 471], [438, 568], [440, 666]],
        soles: [[323, 708], [421, 720]],
    },
    profile: {
        crown: [403, 190], neck: [375, 268],
        leftArm: [[350, 299], [343, 378], [350, 452]], rightArm: [[400, 299], [407, 378], [400, 452]],
        leftLeg: [[378, 467], [371, 568], [369, 666]], rightLeg: [[398, 467], [391, 568], [393, 666]],
        soles: [[385, 720], [441, 702]],
    },
    back3q: {
        crown: [411, 190], neck: [383, 268],
        leftArm: [[407, 311], [438, 384], [416, 455]], rightArm: [[347, 298], [316, 371], [338, 442]],
        leftLeg: [[406, 467], [399, 568], [397, 666]], rightLeg: [[386, 467], [331, 552], [329, 650]],
        soles: [[396, 720], [326, 710]],
    },
    back: {
        crown: [381, 190], neck: [369, 272],
        leftArm: [[435, 305], [466, 378], [488, 449]], rightArm: [[332, 306], [301, 379], [279, 450]],
        leftLeg: [[402, 471], [431, 568], [433, 666]], rightLeg: [[362, 471], [333, 568], [331, 666]],
        soles: [[434, 720], [332, 720]],
    },
});

const BOOT_SOURCE_SIDE = Object.freeze({
    front: 'left', front3q: 'right', profile: 'left', back3q: 'left', back: 'right',
});
const OPPOSITE_TRANSFORM = Object.freeze({
    front: 'horizontal-mirror',
    front3q: 'unreflected-registration',
    profile: 'unreflected-registration',
    back3q: 'unreflected-registration',
    back: 'horizontal-mirror',
});
const REGISTRATION_ONLY = Object.freeze({
    front: [], front3q: [], profile: ['leftAnkle'], back3q: ['rightKnee'], back: [],
});

const point = ([x, y]) => ({ x, y });
const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });

function placedSegment(a, b, canvas) {
    const delta = vector(a, b);
    const start = {
        x: Math.round((canvas.w - delta.x) / 2),
        y: Math.round((canvas.h - delta.y) / 2),
    };
    return [start, { x: start.x + delta.x, y: start.y + delta.y }];
}

export function applyFit(manifest) {
    manifest.characterId = 'lou_thesz_v2';
    manifest.sourceSheet.file = 'thesz-v2-pass-a-v3.png';
    manifest.sourceSheet.guideFile = 'thesz-v2-pass-a-v7-profile-foot-guide.png';
    manifest.bilateralSegmentReuse.policy = 'per-view-declared-opposite-transform';
    manifest.bilateralSegmentReuse.oppositeTransformByView = { ...OPPOSITE_TRANSFORM };
    const spans = {
        head: Math.sqrt(6868), torso: Math.sqrt(39770), upperArm: Math.sqrt(6290),
        forearm: Math.sqrt(5525), thigh: Math.sqrt(10250), shin: Math.sqrt(9608),
        plantedSoleVerticalDrop: 54,
    };
    manifest.skeleton.sourceSpansPx = spans;
    manifest.skeleton.boneLengths = Object.fromEntries(
        Object.entries(spans).map(([name, value]) => [name, value / manifest.assetPixelsPerRigUnit]));

    for (const [viewName, fitted] of Object.entries(FIT)) {
        const crown = point(fitted.crown), neck = point(fitted.neck);
        const [leftShoulder, leftElbow, leftWrist] = fitted.leftArm.map(point);
        const [rightShoulder, rightElbow, rightWrist] = fitted.rightArm.map(point);
        const [leftHip, leftKnee, leftAnkle] = fitted.leftLeg.map(point);
        const [rightHip, rightKnee, rightAnkle] = fitted.rightLeg.map(point);
        const [leftSole, rightSole] = fitted.soles.map(point);
        manifest.views[viewName].masterLandmarks = {
            crown, neck, leftShoulder, leftElbow, leftWrist, rightShoulder, rightElbow, rightWrist,
            leftHip, leftKnee, leftAnkle, leftSole, rightHip, rightKnee, rightAnkle, rightSole,
        };
        manifest.views[viewName].registrationOnlyLandmarks = [...REGISTRATION_ONLY[viewName]];

        manifest.bilateralSegmentReuse.bootSourceSideByView = { ...BOOT_SOURCE_SIDE };

        const masterHipMid = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
        const torsoDx = 96 - masterHipMid.x, torsoDy = 223 - masterHipMid.y;
        const translate = source => ({ x: source.x + torsoDx, y: source.y + torsoDy });
        const sourceSide = manifest.bilateralSegmentReuse.sourceSideByView[viewName];
        const arm = sourceSide === 'left' ? [leftShoulder, leftElbow, leftWrist] : [rightShoulder, rightElbow, rightWrist];
        const leg = sourceSide === 'left' ? [leftHip, leftKnee, leftAnkle] : [rightHip, rightKnee, rightAnkle];
        const [upperShoulder, upperElbow] = placedSegment(arm[0], arm[1], manifest.parts.upperArm.canvas);
        const [foreElbow, foreWrist] = placedSegment(arm[1], arm[2], manifest.parts.forearm.canvas);
        const [thighHip, thighKnee] = placedSegment(leg[0], leg[1], manifest.parts.thigh.canvas);
        const [shinKnee, shinAnkle] = placedSegment(leg[1], leg[2], manifest.parts.shin.canvas);
        const bootSide = BOOT_SOURCE_SIDE[viewName];
        const bootAnkle = bootSide === 'left' ? leftAnkle : rightAnkle;
        const bootSole = bootSide === 'left' ? leftSole : rightSole;
        const [localAnkle, localSole] = placedSegment(bootAnkle, bootSole, manifest.parts.boot.canvas);
        const bootDelta = vector(localAnkle, localSole);
        const bootLength = Math.hypot(bootDelta.x, bootDelta.y);
        const ankleAxis = {
            x: localAnkle.x + Math.round(bootDelta.x * 20 / bootLength),
            y: localAnkle.y + Math.round(bootDelta.y * 20 / bootLength),
        };
        const localCrown = { x: 100, y: 48 };
        const headDelta = vector(crown, neck);
        const localNeck = { x: localCrown.x + headDelta.x, y: localCrown.y + headDelta.y };
        const headAxisScale = 20 / spans.head;
        manifest.views[viewName].anchorOverrides = {
            head: {
                crown: localCrown,
                neckAxis: {
                    x: localNeck.x - headDelta.x * headAxisScale,
                    y: localNeck.y - headDelta.y * headAxisScale,
                },
                neck: localNeck,
            },
            torso: {
                neck: translate(neck), spineAxis: translate({ x: neck.x, y: neck.y + 20 }),
                leftShoulder: translate(leftShoulder), rightShoulder: translate(rightShoulder),
                leftHip: translate(leftHip), rightHip: translate(rightHip),
            },
            upperArm: { shoulder: upperShoulder, elbow: upperElbow },
            forearm: { elbow: foreElbow, wrist: foreWrist },
            thigh: { hip: thighHip, knee: thighKnee },
            shin: { knee: shinKnee, ankle: shinAnkle },
            boot: { ankle: localAnkle, ankleAxis, sole: localSole },
        };
    }

    for (const partName of ['head', 'torso', 'upperArm', 'forearm', 'thigh', 'shin', 'boot']) {
        manifest.parts[partName].anchors = structuredClone(manifest.views.front.anchorOverrides[partName]);
    }
    manifest.parts.boot.anchors.heel = { x: 40, y: manifest.parts.boot.anchors.sole.y };
    manifest.parts.boot.anchors.toe = { x: 92, y: manifest.parts.boot.anchors.sole.y };
    manifest.parts.boot.anchors.soleNormal = { x: 0, y: 1 };
    for (const variant of manifest.variantFamilies.boot) {
        if (variant.id === 'neutral') {
            variant.semanticAnchors.heel.y = manifest.parts.boot.anchors.sole.y;
            variant.semanticAnchors.toe.y = manifest.parts.boot.anchors.sole.y;
            variant.semanticAnchors.sole = structuredClone(manifest.parts.boot.anchors.sole);
        }
    }
    manifest.parts.boot.groundingContract.verticalDropPx = 54;
    manifest.humanReview = {
        status: 'identity-approved', sourceSheetSha256: APPROVED_SHA256,
        extremeJointAngles: false, artistStrokeAtGameScale: false, broadcastNearMiddleFar: false,
    };
    return manifest;
}

async function main() {
    const args = process.argv.slice(2);
    const manifestPath = path.resolve(args.find(arg => arg.endsWith('.json')) ?? DEFAULT_MANIFEST);
    const sheetPath = path.resolve(args.find(arg => arg.endsWith('.png')) ?? DEFAULT_SHEET);
    const write = args.includes('--write');
    const sheetBytes = await readFile(sheetPath);
    const actualHash = createHash('sha256').update(sheetBytes).digest('hex');
    if (actualHash !== APPROVED_SHA256) throw new Error(`refusing to apply landmarks to unapproved pixels: ${actualHash}`);
    const manifest = applyFit(JSON.parse(await readFile(manifestPath, 'utf8')));
    const output = `${JSON.stringify(manifest, null, 2)}\n`;
    if (write) {
        await writeFile(manifestPath, output);
        console.log(`applied canonical ankle re-fit landmarks to ${manifestPath}`);
    } else {
        process.stdout.write(output);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
