// Per-keyframe facing (2026-10-11): a clip may turn an actor mid-move, e.g. an
// attacker stepping round behind the defender. Facing is relative to the
// staging axis (the anchor's facing at play()), discrete like parts, and a
// clip that authors none leaves facing to its executor exactly as before.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { captureFacingAxis } from '../src/animation/clipStaging.js';
import { hammerlockClip } from '../src/animation/clips/hammerlock.js';
import { jabClip } from '../src/animation/clips/jab.js';
import { insertKeyframe, createPairedDraft, exportClip } from '../tools/move-editor/model.js';

// Attacker turns to face the other way at 0.5s; defender never authors facing.
const turnClip = {
    id: 'facing_turn_test',
    duration: 1,
    tracks: {
        attacker: { keyframes: [
            { at: 0, pose: { lArm: 0 }, facing: 1 },
            { at: 0.5, pose: { lArm: 1 }, facing: -1 },
            { at: 1, pose: { lArm: 0 } },
        ] },
        defender: { keyframes: [{ at: 0, pose: { lArm: 0 } }] },
    },
};

const actor = facing => ({ x: 0, y: 0, facing, pose: {}, skeleton: { setPartVariants() {} } });

test('facing must be 1 or -1', () => {
    const bad = structuredClone(turnClip);
    bad.tracks.attacker.keyframes[1].facing = 0.5;
    const { ok, errors } = validateClip(bad);
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('facing must be 1 or -1')), errors.join('; '));
});

test('facing is discrete: it holds until its keyframe, then snaps', () => {
    const clip = compileClip(turnClip);
    assert.equal(clip.authorsFacing, true);
    assert.equal(clip.tracks.defender.authorsFacing, false);
    const at = t => sampleClip(clip, t).tracks.attacker.facing;
    assert.equal(at(0), 1);
    assert.equal(at(0.49), 1, 'no blending toward the turn');
    assert.equal(at(0.5), -1);
    assert.equal(at(0.9), -1, 'carried forward by a keyframe that omits it');
    assert.equal('facing' in sampleClip(clip, 0.3).tracks.defender, false, 'unauthored role samples no facing');
});

test('runtime resolves facing against the anchor\'s START facing, so it mirrors', () => {
    for (const start of [1, -1]) {
        const attacker = actor(start), defender = actor(-start);
        const runtime = new MoveRuntime();
        runtime.register(turnClip);
        const handle = runtime.play('facing_turn_test', { attacker, defender });
        assert.equal(handle.facingAxis, start);
        runtime.seek(handle, 0.25);
        assert.equal(attacker.facing, start);
        runtime.seek(handle, 0.75);
        assert.equal(attacker.facing, -start, 'the turn is relative, not absolute');
        assert.equal(defender.facing, -start, 'an actor with no authored facing is never turned');
        // The axis is captured once: the attacker having turned does not flip it.
        runtime.seek(handle, 0.25);
        assert.equal(attacker.facing, start);
    }
});

test('authored facing wins over a facing reset between frames', () => {
    // Wrestler.move() re-faces every wrestler toward the other each tick, BEFORE
    // the runtime applies its sample; the clip's facing must be what renders.
    const attacker = actor(1);
    const runtime = new MoveRuntime();
    runtime.register(turnClip);
    runtime.play('facing_turn_test', { attacker });
    runtime.update(0.6);
    attacker.facing = 1; // gameplay's per-tick reset
    runtime.update(0.016);
    assert.equal(attacker.facing, -1);
});

test('shipped clips author no facing, so they get no axis and change nothing', () => {
    for (const source of [hammerlockClip, jabClip]) {
        const clip = compileClip(source);
        assert.equal(clip.authorsFacing, false, source.id);
        assert.equal(captureFacingAxis(clip, { attacker: actor(1) }), null, source.id);
    }
});

test('the editor model stores facing on a captured keyframe and exports it', () => {
    const draft = createPairedDraft('facing_draft', 1);
    insertKeyframe(draft, 'attacker', 0.5, { pose: { lArm: 1 }, facing: -1 });
    insertKeyframe(draft, 'attacker', 0.75, { pose: { lArm: 1 } });
    const frames = exportClip(draft).tracks.attacker.keyframes;
    assert.equal(frames.find(f => f.at === 0.5).facing, -1);
    assert.equal('facing' in frames.find(f => f.at === 0.75), false, 'omitted facing is not invented');
});

// ── Which limb the l-channels drive (2026-10-11) ─────────────────────────────
// Procreate Lou and the reference rig render facing left by drawing facing
// right and mirroring, so lArm stays the NEAR arm; shipped Lou and George take
// the core path, where facing left swaps it to the far arm. The semantic slots
// (workingHand) and the editor's limb handles must follow the render path, or
// the grip lands on the wrong arm facing left.
import Skeleton from '../src/Skeleton.js';
import { resolveSemanticSlots } from '../src/rig/partVariants.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';

test('lChannelSide agrees with the path updateUpright actually takes', () => {
    const configs = [
        { _authoredLegRig: true, _faceLeftOverrides: null },   // Procreate Lou, reference rig
        { _authoredLegRig: true, _faceLeftOverrides: {} },     // George
        { _authoredLegRig: false, _faceLeftOverrides: null },  // shipped Lou
    ];
    for (const config of configs) {
        for (const facing of [1, -1]) {
            let coreFacing = null, mirrored = false;
            const stub = {
                ...config,
                _withFaceLeftOverrides: fn => fn(),
                _updateUprightCore: (x, y, s, f) => { coreFacing = f; },
                _mirrorUpright: () => { mirrored = true; },
            };
            Skeleton.prototype.updateUpright.call(stub, 0, 0, 1, facing, {}, 0);
            // The core path puts lArm on near at facing +1 and on far at -1; a
            // mirrored render keeps whatever the facing-+1 core drew.
            const drawn = coreFacing >= 0 ? 'near' : 'far';
            assert.equal(Skeleton.prototype.lChannelSide.call(stub, facing), drawn,
                `${JSON.stringify(config)} facing ${facing} (mirrored=${mirrored})`);
        }
    }
});

test('workingHand follows the drawn arm when given the skeleton\'s side', () => {
    const t = theszProcreateV1.textures;
    assert.deepEqual(resolveSemanticSlots({ workingHand: 'grip' }, -1, t, 'near'), { nearForearm: 'grip' });
    assert.deepEqual(resolveSemanticSlots({ strikingForearm: 'fist' }, -1, null, 'near'), { nearForearm: 'fist' });
    // No side given: the old facing-only rule, unchanged for existing callers.
    assert.deepEqual(resolveSemanticSlots({ workingHand: 'grip' }, -1), { farHand: 'grip' });
});
