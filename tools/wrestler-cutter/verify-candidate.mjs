#!/usr/bin/env node
// Portable identity check for a produced candidate directory.
//
// Two hashes describe every artifact this pipeline writes, and they do not mean
// the same thing:
//
//   decodedPixelSha256 — hash of the decoded RGBA buffer plus its dimensions.
//     This is the ARTIFACT IDENTITY. It is portable: it reproduces from the
//     same inputs on any machine and any Node version, because it depends only
//     on the pixels the pipeline decided to draw.
//
//   fileSha256 — hash of the PNG container bytes. This is an ENVIRONMENT CHECK.
//     It detects that a file on disk has not been edited since it was written
//     here, but it does NOT reproduce across encoders or Node versions, because
//     the PNG encoder is not byte-deterministic.
//
// A candidate whose decoded-pixel hashes all match is the same artwork. A
// candidate whose file hashes differ while decoded pixels match has merely been
// re-encoded. Only the first claim is worth carrying between machines.
//
// Usage:
//   node tools/wrestler-cutter/verify-candidate.mjs <candidate-dir>
//   node tools/wrestler-cutter/verify-candidate.mjs            # defaults to profile v4

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodeRgbaPng } from './validate-source-manifest.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const DEFAULT_CANDIDATE = path.join(ROOT,
    'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2-normalized-v4');

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export const decodedPixelSha256 = image => createHash('sha256')
    .update(Buffer.from(`${image.w}x${image.h}:`)).update(Buffer.from(image.rgba)).digest('hex');

/**
 * Recompute both hashes for every artifact a candidate's parts-index.json
 * names, and compare them with what the index recorded.
 */
export async function verifyCandidate(candidateDir) {
    const index = JSON.parse(await readFile(path.join(candidateDir, 'parts-index.json'), 'utf8'));

    const targets = [
        ...Object.entries(index.parts ?? {}).map(([key, entry]) =>
            ({ key, relPath: path.join('parts', entry.file), recorded: entry })),
        ...Object.entries(index.proofs ?? {}).map(([name, entry]) =>
            ({ key: name, relPath: name, recorded: entry })),
    ];

    const results = [];
    for (const { key, relPath, recorded } of targets) {
        const bytes = await readFile(path.join(candidateDir, relPath));
        const image = decodeRgbaPng(bytes);
        results.push({
            key,
            relPath,
            pixelsMatch: decodedPixelSha256(image) === recorded.decodedPixelSha256,
            bytesMatch: sha256(bytes) === recorded.fileSha256,
            recordedPixels: recorded.decodedPixelSha256,
            actualPixels: decodedPixelSha256(image),
        });
    }

    return {
        version: index.version,
        candidateDir,
        results,
        identityOk: results.every(entry => entry.pixelsMatch),
        bytesOk: results.every(entry => entry.bytesMatch),
    };
}

async function main() {
    const [dirArg] = process.argv.slice(2);
    const candidateDir = dirArg ? path.resolve(dirArg) : DEFAULT_CANDIDATE;
    const report = await verifyCandidate(candidateDir);

    const drifted = report.results.filter(entry => !entry.pixelsMatch);
    const reEncoded = report.results.filter(entry => entry.pixelsMatch && !entry.bytesMatch);

    console.log(`candidate: ${report.version}`);
    console.log(`artifacts: ${report.results.length}`);
    console.log(`identity  (decoded pixels): ${report.identityOk ? 'MATCH' : `${drifted.length} DRIFTED`}`);
    console.log(`container (file bytes)    : ${report.bytesOk ? 'match'
        : `${reEncoded.length} re-encoded (expected across encoders/Node versions)`}`);

    for (const entry of drifted) {
        console.error(`  PIXEL DRIFT ${entry.relPath}`);
        console.error(`    recorded ${entry.recordedPixels}`);
        console.error(`    actual   ${entry.actualPixels}`);
    }

    if (!report.identityOk) {
        console.error('\nartifact identity does not reproduce; this candidate is not the recorded artwork');
        process.exitCode = 1;
    } else {
        console.log('\nartifact identity verified');
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
