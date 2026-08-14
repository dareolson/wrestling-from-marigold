import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CERTIFICATION_MATRIX,
    GETUP_SAMPLES,
    MOTION_SAMPLES,
    coverageGaps,
    motionFrames,
    postureGaps,
    riggedEntries,
} from '../src/rig/certificationMatrix.js';
import { POSES } from '../src/Wrestler.js';
import Skeleton from '../src/Skeleton.js';

test('the matrix covers every required high-strain configuration', () => {
    const ids = new Set(CERTIFICATION_MATRIX.map(entry => entry.id));
    for (const required of [
        'relaxed-stance', 'combat-guard', 'straight-jab', 'bent-elbow-strike',
        'overhead-double-axe', 'hammerlock', 'arm-drag-reach', 'lockup',
        'deep-squat', 'single-knee-stance', 'knee-lift', 'dropkick-extension',
        'sprawl', 'seated-getup', 'back-drop-arch', 'down-state', 'pinned-state',
    ]) {
        assert.ok(ids.has(required), `matrix is missing ${required}`);
    }
});

test('every pose the matrix names exists in the shipped pose table', () => {
    for (const entry of CERTIFICATION_MATRIX) {
        for (const name of [entry.pose, ...(entry.motion ?? [])].filter(Boolean)) {
            assert.ok(POSES[name], `${entry.id} references unknown pose "${name}"`);
        }
    }
});

test('entries that bypass the rig are declared, not silently certified', () => {
    const gaps = coverageGaps();
    assert.ok(gaps.length > 0);
    for (const entry of gaps) {
        // A gap must say what draws it instead, or it is not actionable.
        assert.ok(entry.gap, `${entry.id} is a coverage gap with no explanation`);
        assert.ok(entry.state, `${entry.id} names no wrestler state`);
        assert.equal(entry.pose, undefined);
    }
    // Airborne states still bypass the modular rig.
    const ids = gaps.map(entry => entry.id);
    assert.ok(ids.includes('dropkick-extension'));
    // The down and pinned STATE PATHS were migrated onto
    // Skeleton.updateGrounded (2026-08-13) and are no longer gaps.
    assert.ok(!ids.includes('down-state'));
    assert.ok(!ids.includes('pinned-state'));
});

test('lying flat and the get-up first keyframe are the same pose object', () => {
    // Identity, not value equality. An earlier version spread GROUNDED_FLAT
    // into the keyframe, which kept the values in sync at module load but
    // asserted a weaker guarantee than the comment claimed (Codex review,
    // 2026-08-13). `===` is what actually makes the down -> gettingUp handoff
    // 0px by construction and stops the two drifting when either is tuned.
    assert.strictEqual(Skeleton.GROUNDED_POSES.flat, Skeleton.GROUNDED_FLAT);
    assert.strictEqual(Skeleton.GETUP_POSES[0], Skeleton.GROUNDED_FLAT);
    assert.equal(Skeleton.GETUP_POSES[0].t, 0);
    assert.ok(Object.isFrozen(Skeleton.GROUNDED_FLAT));
});

test('a grounded entry that renders a stand-in pose declares the posture it lacks', () => {
    // "16/17 entries reach the modular rig" must never be readable as
    // "16/17 wrestling postures exist". down/pinned/possum all render one
    // shared flat pose, exactly as _drawFlat rendered all three identically
    // before the migration (Codex review, 2026-08-13).
    const gaps = postureGaps();
    assert.ok(gaps.length >= 2);
    for (const entry of gaps) {
        assert.equal(entry.renderPath, 'grounded');
        assert.match(entry.postureGap, /flat pose/);
        // A stand-in must not advertise a posture in its own label.
        assert.doesNotMatch(entry.label, /prone|bridge/i);
    }
    // Every grounded entry currently shares the one authored flat pose.
    const grounded = CERTIFICATION_MATRIX.filter(entry => entry.renderPath === 'grounded');
    assert.equal(new Set(grounded.map(entry => entry.groundedPose)).size, 1);
    assert.equal(grounded.length, gaps.length, 'a grounded entry has no posture declared');
});

test('rigged and unrigged entries partition the matrix', () => {
    assert.equal(riggedEntries().length + coverageGaps().length, CERTIFICATION_MATRIX.length);
    for (const entry of riggedEntries()) {
        assert.ok(['upright', 'getup', 'grounded'].includes(entry.renderPath));
        assert.ok(entry.pose || entry.motion || entry.getUp || entry.groundedPose, `${entry.id} renders nothing`);
    }
});

test('motion expands into intermediate frames, not just its endpoints', () => {
    const entry = CERTIFICATION_MATRIX.find(candidate => candidate.id === 'hammerlock');
    const frames = motionFrames(entry, MOTION_SAMPLES);
    // Three segments across four keyframes, sampled MOTION_SAMPLES per segment.
    assert.equal(frames.length, MOTION_SAMPLES * (entry.motion.length - 1) + 1);
    assert.ok(frames.some(frame => frame.t > 0 && frame.t < 1), 'no intermediate frames');
    // Keyframe boundaries land exactly, so ink probing can key off t === 0.
    assert.equal(frames[0].t, 0);
    assert.equal(frames[0].from, 'hammerlockReach');
    assert.equal(frames[MOTION_SAMPLES].t, 0);
    assert.equal(frames[MOTION_SAMPLES].from, 'hammerlockTurn');
});

test('a static entry expands to exactly one frame', () => {
    const entry = CERTIFICATION_MATRIX.find(candidate => candidate.id === 'lockup');
    assert.deepEqual(motionFrames(entry), ['lockup']);
});

// The get-up tween runs 850ms (~51 frames at 60fps) at full stamina. Sampling
// it more coarsely than playback makes ordinary motion register as an endpoint
// discontinuity — an earlier draft used 7 samples and produced exactly that
// false positive on the reference rig.
test('get-up sampling is at least as dense as real playback', () => {
    assert.ok(GETUP_SAMPLES.length >= 49, `${GETUP_SAMPLES.length} samples is coarser than playback`);
    assert.equal(GETUP_SAMPLES[0], 0);
    assert.equal(GETUP_SAMPLES.at(-1), 1);
    for (let i = 1; i < GETUP_SAMPLES.length; i++) {
        assert.ok(GETUP_SAMPLES[i] > GETUP_SAMPLES[i - 1], 'get-up samples must increase');
    }
});
