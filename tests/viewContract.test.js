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

// ── Derek's 2026-09-13 ruling, encoded ──────────────────────────────────────
//
// "Three-quarter is the primary view. The others are mostly tween and
// transition sources -- profile for suplexes and similar move mechanics, not
// for standing gameplay."
//
// Before this, views.profile.role was `primary-gameplay-source` and front3q was
// `front-turn-source`: the ruling's exact inverse. It sat that way in the
// manifest and in V2_VIEW_META for two days because nothing pinned it, which is
// what these tests are for. A decision that only lives in prose is a decision
// the next mechanical pass will quietly contradict.

test('front3q is the primary gameplay source and profile serves move mechanics', () => {
    assert.equal(manifest.views.front3q.role, 'primary-gameplay-source');
    assert.equal(manifest.views.profile.role, 'move-mechanics-source');

    // And the constants agree with the data, which is the half that actually
    // gates: V2_VIEW_META pins role per view name, so a manifest edit alone
    // cannot move the ruling.
    const swapped = clone();
    swapped.views.front3q.role = 'front-turn-source';
    swapped.views.profile.role = 'primary-gameplay-source';
    const errors = errorsFor(swapped);
    assert.ok(errors.some(e => e.includes('views.front3q.role must be "primary-gameplay-source"')),
        'reverting front3q must fail');
    assert.ok(errors.some(e => e.includes('views.profile.role must be "move-mechanics-source"')),
        'reverting profile must fail');
});

test('the ruling moves the role, and does not promote any runtime status', () => {
    // role says which view the art is FOR. runtimeStatus says what is missing
    // before it renders in a match. Making front3q primary is an art-direction
    // decision and must not be allowed to read as runtime progress.
    assert.equal(manifest.views.front3q.runtimeStatus, 'pending-bodyView');
    assert.equal(manifest.views.profile.runtimeStatus, 'pending-v2-profile-renderer');
    for (const [name, view] of Object.entries(manifest.views)) {
        assert.match(view.runtimeStatus, /^pending-/,
            `${name} must still declare a pending runtime status`);
    }
    for (const [name, state] of Object.entries(manifest.runtimePrerequisites)) {
        assert.equal(state, 'pending',
            `${name} must remain pending; none of this renders in a match yet`);
    }
});

test('the single-visible-limb ruling survives, and no longer gates the primary view', () => {
    // It still binds profile and back3q. But front3q declares both arms and
    // both legs, so promoting it does not smuggle the bilateral silhouette the
    // pipeline review rejected into the primary view by the back door.
    for (const viewName of ['profile', 'back3q']) {
        assert.equal(manifest.views[viewName].visibility.arms.length, 1);
        assert.equal(manifest.views[viewName].visibility.legs.length, 1);
    }
    assert.equal(manifest.views.front3q.visibility.arms.length, 2);
    assert.equal(manifest.views.front3q.visibility.legs.length, 2);
    assert.deepEqual(manifest.views.front3q.visibility.hiddenChainsRevealableByChoreography, []);
});

// ── cross-view reuse is declared, never silent ──────────────────────────────

test('the profile head on the front3q body is declared, not a fallback', () => {
    const reuse = manifest.crossViewPartReuse;
    assert.equal(reuse.policy, 'explicit-declaration-required-never-silent-fallback');
    const head = reuse.entries.find(e => e.part === 'head' && e.targetView === 'front3q');
    assert.ok(head, 'the borrow Derek is actually running must be in the manifest');
    assert.equal(head.sourceView, 'profile');
    assert.equal(head.temporary, true, 'it lasts until three-quarter heads exist');
    assert.equal(head.transform, 'unreflected-registration');
    assert.ok(head.reason.length >= 20, 'the declaration must say why');
});

test('a cross-view borrow without a reason or a transform is rejected', () => {
    // The declaration has to carry more information than the silent fallback it
    // replaces, or it is the same defect with a field name attached.
    const noReason = clone();
    noReason.crossViewPartReuse.entries[0].reason = 'temp';
    assert.ok(errorsFor(noReason).some(e => e.includes('.reason must record why the borrow is in force')));

    const reflected = clone();
    reflected.crossViewPartReuse.entries[0].transform = 'horizontal-mirror';
    assert.ok(errorsFor(reflected).some(e => e.includes('.transform must be "unreflected-registration"')),
        'cross-view reuse registers without reflection, as within-view reuse already must');

    const selfBorrow = clone();
    selfBorrow.crossViewPartReuse.entries[0].sourceView = 'front3q';
    assert.ok(errorsFor(selfBorrow).some(e => e.includes('must borrow from a different view than it serves')));

    const unknownPart = clone();
    unknownPart.crossViewPartReuse.entries[0].part = 'cape';
    assert.ok(errorsFor(unknownPart).some(e => e.includes('.part must name a declared part')));

    const missing = clone();
    delete missing.crossViewPartReuse;
    assert.ok(errorsFor(missing).some(e => e.includes('crossViewPartReuse')),
        'the block itself is required, so the borrow cannot be dropped back to silence');
});
