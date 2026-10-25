import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECS, specFor, specStatus } from '../tools/move-critic/specs.mjs';

test('specStatus distinguishes specified, empty and missing', () => {
    assert.equal(specStatus('suplex').status, 'specified');
    assert.equal(specStatus('suplex').spec, SPECS.suplex);
    assert.equal(specStatus('hammerlock').status, 'empty');
    assert.equal(specStatus('noSuchMove').status, 'missing');
    assert.deepEqual(specStatus('noSuchMove').spec, {});
});

test('specStatus follows the same variant-suffix lookup as specFor', () => {
    assert.equal(specStatus('suplex-flip').status, 'specified');
    assert.equal(specFor('suplex-flip'), SPECS.suplex);
});

test('specFor is unchanged: spec, empty object, and {} for unknown', () => {
    assert.equal(specFor('suplex'), SPECS.suplex);
    assert.deepEqual(specFor('hammerlock'), {});
    assert.deepEqual(specFor('noSuchMove'), {});
});
