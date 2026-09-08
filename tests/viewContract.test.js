import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { DEFAULT_MANIFEST } from '../tools/wrestler-cutter/production-config.mjs';
import { validateSourceManifest } from '../tools/wrestler-cutter/validate-source-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(DEFAULT_MANIFEST, 'utf8'));
const clone = () => JSON.parse(JSON.stringify(manifest));
const errorsFor = candidate => validateSourceManifest(candidate).errors;

// Milestone 4. Which limbs a view draws is data on the view, checked separately
// from depth order and from logical-chain completeness. Derek's ruling is that
// profile and back3q present one visible arm and one visible leg in neutral
// assembly while the rig keeps both chains.

test('every view declares the arms and legs it draws', () => {
    assert.deepEqual(errorsFor(clone()), []);
    for (const [viewName, view] of Object.entries(manifest.views)) {
        assert.ok(Array.isArray(view.visibility?.arms), `${viewName} declares visible arms`);
        assert.ok(Array.isArray(view.visibility?.legs), `${viewName} declares visible legs`);
    }
});

test('profile and back3q present one visible arm and one visible leg', () => {
    for (const viewName of ['profile', 'back3q']) {
        const view = manifest.views[viewName];
        assert.deepEqual(view.visibility.arms, [view.cameraNearSide],
            `${viewName} draws only the near arm`);
        assert.deepEqual(view.visibility.legs, [view.cameraNearSide],
            `${viewName} draws only the near leg`);
    }
    for (const viewName of ['front', 'front3q', 'back']) {
        assert.equal(manifest.views[viewName].visibility.arms.length, 2);
        assert.equal(manifest.views[viewName].visibility.legs.length, 2);
    }
});

test('a second offset limb in profile or back3q is rejected', () => {
    for (const viewName of ['profile', 'back3q']) {
        const candidate = clone();
        candidate.views[viewName].visibility.arms = ['left', 'right'];
        assert.ok(errorsFor(candidate).some(error =>
            error.includes(`views.${viewName}.visibility.arms must list 1 side`)),
        `${viewName} must refuse a bilateral neutral silhouette`);
    }
});

test('the single visible limb must be the near side', () => {
    const candidate = clone();
    const far = manifest.views.profile.cameraNearSide === 'left' ? 'right' : 'left';
    candidate.views.profile.visibility.arms = [far];
    candidate.views.profile.visibility.hiddenChainsRevealableByChoreography =
        ['leftArm', 'rightLeg'];
    assert.ok(errorsFor(candidate).some(error =>
        error.includes('views.profile.visibility.arms must be the near side')));
});

test('hidden chains keep their landmarks and their place in the depth order', () => {
    for (const [viewName, view] of Object.entries(manifest.views)) {
        const hidden = view.visibility.hiddenChainsRevealableByChoreography;
        for (const chain of hidden) {
            assert.ok(view.depthOrder.includes(chain),
                `${viewName}.depthOrder still contains ${chain}`);
        }
        // Logical-chain completeness is independent of visibility: all sixteen
        // master landmarks exist in every view, including the hidden side's.
        for (const side of ['left', 'right']) {
            for (const joint of ['Shoulder', 'Elbow', 'Wrist', 'Hip', 'Knee', 'Ankle', 'Sole']) {
                assert.ok(view.masterLandmarks[`${side}${joint}`],
                    `${viewName} keeps ${side}${joint} whether or not it is drawn`);
            }
        }
    }
    // Dropping a hidden chain from the depth order is a separate failure from
    // hiding it.
    const candidate = clone();
    candidate.views.profile.depthOrder =
        candidate.views.profile.depthOrder.filter(entry => entry !== 'rightArm');
    const errors = errorsFor(candidate);
    assert.ok(errors.some(error => error.includes('views.profile.depthOrder must contain each')));
});

test('the hidden list must be exactly the chains a view does not draw', () => {
    const candidate = clone();
    candidate.views.profile.visibility.hiddenChainsRevealableByChoreography = ['rightArm'];
    assert.ok(errorsFor(candidate).some(error => error.includes(
        'hiddenChainsRevealableByChoreography must be exactly the chains this view does not draw')));
});

test('registrationOnlyLandmarks stays a narrow fitting exception, separate from visibility', () => {
    // It is not the mechanism for hiding a limb: it is capped to knees and
    // ankles, and the profile's hidden arm is not in it.
    assert.deepEqual(manifest.views.profile.registrationOnlyLandmarks, ['leftAnkle']);
    assert.deepEqual(manifest.views.back3q.registrationOnlyLandmarks, ['rightKnee']);

    const candidate = clone();
    candidate.views.profile.registrationOnlyLandmarks = ['rightShoulder'];
    assert.ok(errorsFor(candidate).some(error =>
        error.includes('registrationOnlyLandmarks may contain only knee or ankle targets')),
    'a hidden chain must not be expressed as a fitting exemption');
});

test('the proof renderer has no view-specific hardcoded drawing sequence', async () => {
    // The exit gate. The sequence is depthOrder and the limb count is
    // visibility; neither may be reintroduced as a literal here.
    const source = await readFile(
        path.join(ROOT, 'tools/wrestler-cutter/normalize-profile-v2-parts.mjs'), 'utf8');
    const render = source.slice(source.indexOf('function renderProofs'),
        source.indexOf('function measureUncoveredCores'));
    const code = render.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');

    assert.match(code, /for \(const entry of view\.depthOrder\)/,
        'the sequence must be driven by the manifest depthOrder');
    assert.doesNotMatch(code, /master\.(left|right)(Shoulder|Elbow|Wrist|Hip|Knee|Ankle)/,
        'no side-specific landmark may be named in the draw sequence');
    assert.match(code, /view\.cameraNearSide/,
        'near/far part selection must follow the declared camera near side');
    assert.match(code, /visibility\.arms/, 'arm chains must be gated by declared visibility');
    assert.match(code, /visibility\.legs/, 'leg chains must be gated by declared visibility');
});
