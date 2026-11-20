// PLAN_LIGHT_MOVES TGP.1: ?light is on by default; what each URL value does (same rule as the other promoted flags).
import test from 'node:test';
import assert from 'node:assert/strict';
import { lightCandidate, georgePerformanceCandidate } from '../src/Wrestler.js';

const at = (search) => { globalThis.location = { search }; try { return lightCandidate(); } finally { delete globalThis.location; } };

test('?light: absent and =v1 are on; =off, =1, empty and =V1 are off; no location (node) is off', () => {
    assert.equal(at(''), true, 'no query string');
    assert.equal(at('?scale=off'), true, 'other params leave it on');
    assert.equal(at('?light=v1'), true);
    assert.equal(at('?light=off'), false);
    assert.equal(at('?light=1'), false);
    assert.equal(at('?light='), false);
    assert.equal(at('?light=V1'), false);
    assert.equal(lightCandidate(), false, 'no location');
});
test('opt-ins that sit on top of light stay opt-in', () => {
    globalThis.location = { search: '' };
    try { assert.equal(georgePerformanceCandidate(), false); } finally { delete globalThis.location; }
    globalThis.location = { search: '?georgePerformance=1' };
    try { assert.equal(georgePerformanceCandidate(), true); } finally { delete globalThis.location; }
    globalThis.location = { search: '?light=off&georgePerformance=1' };
    try { assert.equal(georgePerformanceCandidate(), false, 'light off takes it with it'); } finally { delete globalThis.location; }
});
