import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkNode, pinnedMajor, runningMajor } from '../tools/env/require-node.mjs';
import { decodedPixelSha256, sha256, verifyCandidate }
    from '../tools/wrestler-cutter/verify-candidate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_V4 = path.join(ROOT,
    'Sprite sheets/AI Pilot/Lou/v2-canonical/pass-b/candidates/profile-v2-normalized-v4');

// Milestone 1: the toolchain is pinned, and artifact identity is the decoded
// pixels rather than the PNG container bytes.

test('the repository pins a Node major and the guard reads it', () => {
    assert.equal(pinnedMajor(ROOT), 22);
    assert.equal(runningMajor('v22.23.1'), 22);
});

test('the guard accepts only the pinned major', () => {
    assert.equal(checkNode({ root: ROOT, version: 'v22.23.1' }).ok, true);
    assert.equal(checkNode({ root: ROOT, version: 'v19.8.1' }).ok, false);
    assert.equal(checkNode({ root: ROOT, version: 'v25.8.1' }).ok, false);
});

test('production commands are guarded by the pinned-Node check', async () => {
    const pkg = JSON.parse(await import('node:fs/promises')
        .then(fs => fs.readFile(path.join(ROOT, 'package.json'), 'utf8')));
    const guarded = ['test', 'art:validate-source', 'art:apply-landmarks', 'art:validate-landmarks',
        'art:normalize-profile-v2', 'art:export-v2', 'art:verify-candidate', 'rig:validate', 'rig:certify'];
    for (const name of guarded) {
        assert.ok(pkg.scripts[name], `${name} should exist`);
        assert.match(pkg.scripts[`pre${name}`] ?? '', /require-node/,
            `${name} should refuse to run off the pinned Node`);
    }
});

test('decoded-pixel identity ignores container bytes but not pixels', () => {
    const image = { w: 2, h: 1, rgba: new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]) };
    const same = { w: 2, h: 1, rgba: new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]) };
    const different = { w: 2, h: 1, rgba: new Uint8Array([1, 2, 3, 255, 4, 5, 7, 255]) };
    const reshaped = { w: 1, h: 2, rgba: new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]) };

    assert.equal(decodedPixelSha256(image), decodedPixelSha256(same));
    assert.notEqual(decodedPixelSha256(image), decodedPixelSha256(different));
    // Dimensions are part of identity, so the same buffer at another shape differs.
    assert.notEqual(decodedPixelSha256(image), decodedPixelSha256(reshaped));
    assert.notEqual(sha256(Buffer.from('a')), sha256(Buffer.from('b')));
});

test('frozen profile v4 reproduces its recorded artifact identity', async () => {
    const report = await verifyCandidate(PROFILE_V4);
    assert.equal(report.version, 'profile-v2-normalized-v4');
    assert.equal(report.results.length, 17);
    assert.equal(report.identityOk, true, 'v4 decoded pixels must reproduce');
    for (const entry of report.results) {
        assert.equal(entry.pixelsMatch, true, `${entry.relPath} decoded pixels drifted`);
    }
});
