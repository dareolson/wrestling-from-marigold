// Body tilt/lift portability (2026-10-15): one clip sits the same on every
// wrestler. Off his feet every rig uses the crouch-only hip rule, and lift is
// authored for the reference body (shipped Lou, hips 124) and scaled to each
// rig's own standing hip height. Measured in the editor after the change:
// lying flat puts the hips 14–16 off the mat on all four casts tried.

import test from 'node:test';
import assert from 'node:assert/strict';
import Skeleton, { REFERENCE_HIP_HEIGHT, P } from '../src/Skeleton.js';
import { LYING, hipsAt, REF_HIPS } from '../tools/move-editor/authoring.mjs';

test('standing poses are untouched; tilt or lift ramps the body off its feet continuously', () => {
    const w = Skeleton.bodyPlacementWeight;
    assert.equal(w({}), 0);
    assert.equal(w({ lean: 0.4, crouch: 0.5 }), 0, 'ordinary posing never engages it');
    assert.equal(w({ lift: 10 }), 0.5);
    assert.equal(w({ tilt: -0.15 }), 0.5);
    assert.equal(w({ lift: -110 }), 1);
    assert.equal(w({ tilt: Math.PI }), 1);
    // Continuity: no jump between a standing key and a slightly lifted one.
    assert.ok(w({ lift: 0.2 }) < 0.02);
});

test('standing hip height is boot + thigh + shin; shipped Lou is the reference', () => {
    const rig = thigh => Object.create(Skeleton.prototype, { _thighH: { value: thigh }, _shinH: { value: 50 } });
    assert.equal(rig(49).standingHipHeight, P.bootH + 49 + 50);
    assert.equal(P.bootH + 49 + 50, REFERENCE_HIP_HEIGHT, 'shipped Lou (thigh 49, shin 50) is the 124 reference');
});

test('authoring helpers speak the same units as the rig', () => {
    assert.equal(REF_HIPS, REFERENCE_HIP_HEIGHT);
    assert.equal(hipsAt(REF_HIPS), 0, 'standing height is no lift');
    assert.equal(LYING, hipsAt(14));
});
