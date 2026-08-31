#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    decodeRgbaPng,
    validateSourceManifest,
    verifyV2SourceSheetHash,
} from './validate-source-manifest.mjs';
import { validatePassASheet } from './validate-pass-a.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, 'templates/rig-source-manifest.v2.example.json');
const DEFAULT_SHEET = path.resolve(SCRIPT_DIR,
    '../../Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png');
const VIEW_ORDER = ['front', 'front3q', 'profile', 'back3q', 'back'];
const JOINTS = Object.freeze({
    neck: 8, leftShoulder: 12, rightShoulder: 12,
    leftElbow: 10, rightElbow: 10, leftWrist: 8, rightWrist: 8,
    leftHip: 12, rightHip: 12, leftKnee: 10, rightKnee: 10,
    leftAnkle: 8, rightAnkle: 8,
});

const finitePoint = value => Number.isFinite(value?.x) && Number.isFinite(value?.y);
const delta = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const sameVector = (a, b) => a.x === b.x && a.y === b.y;
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function resolvedAnchors(manifest, viewName, partName) {
    return {
        ...(manifest.parts?.[partName]?.anchors ?? {}),
        ...(manifest.views?.[viewName]?.anchorOverrides?.[partName] ?? {}),
    };
}

function opaqueDisk(image, panel, center, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            const x = panel.x + center.x + dx, y = panel.y + center.y + dy;
            if (x < panel.x || x >= panel.x + panel.w || y < panel.y || y >= panel.y + panel.h) return false;
            if (image.alpha[y * image.w + x] !== 255) return false;
        }
    }
    return true;
}

function masterToPartVectorChecks(manifest, viewName, errors) {
    const master = manifest.views[viewName].masterLandmarks;
    const side = manifest.bilateralSegmentReuse.sourceSideByView[viewName];
    const cap = value => `${side}${value}`;
    const checks = [
        ['head', 'crown', 'neck', master.crown, master.neck],
        ['torso', 'neck', 'leftShoulder', master.neck, master.leftShoulder],
        ['torso', 'neck', 'rightShoulder', master.neck, master.rightShoulder],
        ['torso', 'neck', 'leftHip', master.neck, master.leftHip],
        ['torso', 'neck', 'rightHip', master.neck, master.rightHip],
        ['upperArm', 'shoulder', 'elbow', master[cap('Shoulder')], master[cap('Elbow')]],
        ['forearm', 'elbow', 'wrist', master[cap('Elbow')], master[cap('Wrist')]],
        ['thigh', 'hip', 'knee', master[cap('Hip')], master[cap('Knee')]],
        ['shin', 'knee', 'ankle', master[cap('Knee')], master[cap('Ankle')]],
    ];
    for (const [partName, fromName, toName, masterFrom, masterTo] of checks) {
        const anchors = resolvedAnchors(manifest, viewName, partName);
        if (!finitePoint(anchors[fromName]) || !finitePoint(anchors[toName])) continue;
        const masterVector = delta(masterFrom, masterTo), partVector = delta(anchors[fromName], anchors[toName]);
        if (!sameVector(masterVector, partVector)) {
            errors.push(`${viewName}: ${partName} ${fromName}->${toName} vector ${partVector.x},${partVector.y} does not equal master ${masterVector.x},${masterVector.y}`);
        }
    }
    const opposite = side === 'left' ? 'right' : 'left';
    const oppositeCap = value => `${opposite}${value}`;
    let checksRun = checks.length;
    if (manifest.bilateralSegmentReuse.oppositeTransformByView[viewName] === 'horizontal-mirror') {
        for (const [partName, from, to] of [
            ['upperArm', 'Shoulder', 'Elbow'], ['forearm', 'Elbow', 'Wrist'],
            ['thigh', 'Hip', 'Knee'], ['shin', 'Knee', 'Ankle'],
        ]) {
            const sourceVector = delta(master[cap(from)], master[cap(to)]);
            const oppositeVector = delta(master[oppositeCap(from)], master[oppositeCap(to)]);
            const mirrored = { x: -sourceVector.x, y: sourceVector.y };
            if (!sameVector(oppositeVector, mirrored)) {
                errors.push(`${viewName}: ${partName} opposite-side vector ${oppositeVector.x},${oppositeVector.y} is not the horizontal mirror ${mirrored.x},${mirrored.y}`);
            }
            checksRun++;
        }
    }
    const bootSide = manifest.bilateralSegmentReuse.bootSourceSideByView[viewName];
    const bootCap = value => `${bootSide}${value}`;
    const boot = resolvedAnchors(manifest, viewName, 'boot');
    if (finitePoint(boot.ankle) && finitePoint(boot.sole)) {
        const masterVector = delta(master[bootCap('Ankle')], master[bootCap('Sole')]);
        const partVector = delta(boot.ankle, boot.sole);
        if (!sameVector(masterVector, partVector)) {
            errors.push(`${viewName}: boot ankle->sole vector ${partVector.x},${partVector.y} does not equal planted master ${masterVector.x},${masterVector.y}`);
        }
        checksRun++;
    }
    const torso = resolvedAnchors(manifest, viewName, 'torso');
    const localHipMid = midpoint(torso.leftHip, torso.rightHip);
    const masterHipMid = midpoint(master.leftHip, master.rightHip);
    if (!sameVector(delta(torso.neck, localHipMid), delta(master.neck, masterHipMid))) {
        errors.push(`${viewName}: torso neck-to-hip-midpoint vector does not agree with the master`);
    }
    checksRun++;
    return checksRun;
}

export function validateLandmarkFit(manifest, image) {
    const errors = [...validateSourceManifest(manifest).errors];
    const passA = validatePassASheet(manifest, image);
    errors.push(...passA.errors.map(error => `Pass A: ${error}`));
    let diskCount = 0, vectorCount = 0, soleCount = 0, groundedSoles = 0;
    for (const viewName of VIEW_ORDER) {
        const panel = manifest.sourceSheet.masterPanels[viewName];
        const landmarks = manifest.views[viewName].masterLandmarks;
        const registrationOnly = new Set(manifest.views[viewName].registrationOnlyLandmarks ?? []);
        for (const [jointName, radius] of Object.entries(JOINTS)) {
            if (!registrationOnly.has(jointName) && !opaqueDisk(image, panel, landmarks[jointName], radius)) {
                errors.push(`${viewName}.${jointName}: radius-${radius} disk is not fully opaque`);
            }
            if (!registrationOnly.has(jointName)) diskCount++;
        }
        vectorCount += masterToPartVectorChecks(manifest, viewName, errors);
        const groundY = landmarks.crown.y + manifest.sourceSheet.masterFigureHeightPx;
        const plantedSide = manifest.bilateralSegmentReuse.bootSourceSideByView[viewName];
        for (const soleName of ['leftSole', 'rightSole']) {
            const sole = landmarks[soleName];
            const pixel = image.alpha[(panel.y + sole.y) * image.w + panel.x + sole.x];
            if (pixel !== 255) errors.push(`${viewName}.${soleName}: semantic sole is not on opaque art`);
            if (sole.y > groundY) errors.push(`${viewName}.${soleName}: sole falls below derived ground y=${groundY}`);
            const side = soleName.startsWith('left') ? 'left' : 'right';
            if (side === plantedSide) {
                if (sole.y !== groundY) errors.push(`${viewName}.${soleName}: planted sole must equal derived ground y=${groundY}`);
                groundedSoles++;
            }
            soleCount++;
        }
    }
    return { errors, diskCount, vectorCount, soleCount, groundedSoles, occupiedCells: passA.occupiedCells.length };
}

async function main() {
    const args = process.argv.slice(2);
    const manifestPath = path.resolve(args.find(arg => arg.endsWith('.json')) ?? DEFAULT_MANIFEST);
    const sheetPath = path.resolve(args.find(arg => arg.endsWith('.png')) ?? DEFAULT_SHEET);
    const [manifestText, sheetBytes] = await Promise.all([readFile(manifestPath, 'utf8'), readFile(sheetPath)]);
    const manifest = JSON.parse(manifestText);
    verifyV2SourceSheetHash(manifest, sheetBytes);
    const result = validateLandmarkFit(manifest, decodeRgbaPng(sheetBytes));
    if (result.errors.length) {
        for (const error of result.errors) console.error(`error: ${error}`);
        process.exitCode = 1;
        return;
    }
    console.log(`landmark fit valid: ${result.diskCount} opaque joint disks, ${result.vectorCount} exact reuse/vector checks, ${result.soleCount} semantic soles (${result.groundedSoles} planted), ${result.occupiedCells} occupied production cells`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
