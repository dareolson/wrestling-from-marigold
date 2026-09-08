#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFlags, resolveProduction } from './production-config.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.v2.example.json');
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');

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

/**
 * Derives every landmark-dependent manifest field from the character's own
 * `landmarkContract`: master landmarks per view, per-part anchor overrides,
 * skeleton spans and bone lengths, bilateral reuse sides, and the boot
 * grounding anchors.
 *
 * This does not fit anything. The landmarks are human-selected and frozen; the
 * command replays them and is named for what it does. The contract used to be a
 * `const` in this file with the character id hardcoded beside it, which is why
 * a second wrestler meant editing source rather than supplying data.
 */
export function applyLandmarkContract(manifest) {
    const contract = manifest.landmarkContract;
    if (!contract) {
        throw new Error(`${manifest.characterId ?? 'manifest'} has no "landmarkContract" block`);
    }
    const FIT = contract.fit;
    const BOOT_SOURCE_SIDE = contract.bootSourceSideByView;
    const OPPOSITE_TRANSFORM = contract.oppositeTransformByView;
    const REGISTRATION_ONLY = contract.registrationOnlyByView;
    const APPROVED_SHA256 = contract.approvedSheetSha256;

    manifest.sourceSheet.file = contract.sheetFile;
    manifest.sourceSheet.guideFile = contract.guideFile;
    manifest.bilateralSegmentReuse.policy = 'per-view-declared-opposite-transform';
    manifest.bilateralSegmentReuse.oppositeTransformByView = { ...OPPOSITE_TRANSFORM };
    const spans = {
        ...Object.fromEntries(Object.entries(contract.sourceSpansSquared)
            .map(([name, squared]) => [name, Math.sqrt(squared)])),
        plantedSoleVerticalDrop: contract.plantedSoleVerticalDrop,
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
        const torsoDx = contract.torsoHipMidTarget.x - masterHipMid.x;
        const torsoDy = contract.torsoHipMidTarget.y - masterHipMid.y;
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
            x: localAnkle.x + Math.round(bootDelta.x * contract.bootAxisLengthPx / bootLength),
            y: localAnkle.y + Math.round(bootDelta.y * contract.bootAxisLengthPx / bootLength),
        };
        const localCrown = { ...contract.localCrown };
        const headDelta = vector(crown, neck);
        const localNeck = { x: localCrown.x + headDelta.x, y: localCrown.y + headDelta.y };
        const headAxisScale = contract.headAxisLengthPx / spans.head;
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
    manifest.parts.boot.anchors.heel = { x: contract.bootHeelX, y: manifest.parts.boot.anchors.sole.y };
    manifest.parts.boot.anchors.toe = { x: contract.bootToeX, y: manifest.parts.boot.anchors.sole.y };
    manifest.parts.boot.anchors.soleNormal = { x: 0, y: 1 };
    for (const variant of manifest.variantFamilies.boot) {
        if (variant.id === 'neutral') {
            variant.semanticAnchors.heel.y = manifest.parts.boot.anchors.sole.y;
            variant.semanticAnchors.toe.y = manifest.parts.boot.anchors.sole.y;
            variant.semanticAnchors.sole = structuredClone(manifest.parts.boot.anchors.sole);
        }
    }
    manifest.parts.boot.groundingContract.verticalDropPx = contract.plantedSoleVerticalDrop;
    manifest.humanReview = {
        status: 'identity-approved', sourceSheetSha256: APPROVED_SHA256,
        extremeJointAngles: false, artistStrokeAtGameScale: false, broadcastNearMiddleFar: false,
    };
    return manifest;
}

async function main() {
    const flags = parseFlags(process.argv.slice(2));
    const args = process.argv.slice(2);
    const manifestPath = path.resolve(REPO_ROOT,
        flags.manifest ?? args.find(arg => arg.endsWith('.json')) ?? DEFAULT_MANIFEST);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

    // The sheet defaults to the one the character's own production block names,
    // so no path here is specific to any wrestler.
    const production = resolveProduction(manifest, flags);
    const sheetPath = path.resolve(REPO_ROOT,
        flags.sheet ?? args.find(arg => arg.endsWith('.png')) ?? production.passASheet);

    const sheetBytes = await readFile(sheetPath);
    const actualHash = createHash('sha256').update(sheetBytes).digest('hex');
    const approved = manifest.landmarkContract?.approvedSheetSha256;
    if (actualHash !== approved) {
        throw new Error(`refusing to apply landmarks to unapproved pixels: ${actualHash}`);
    }

    const output = `${JSON.stringify(applyLandmarkContract(manifest), null, 2)}\n`;
    if (flags.write) {
        await writeFile(manifestPath, output);
        console.log(`applied ${manifest.characterId} landmark contract to ${path.relative(REPO_ROOT, manifestPath)}`);
    } else {
        process.stdout.write(output);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
