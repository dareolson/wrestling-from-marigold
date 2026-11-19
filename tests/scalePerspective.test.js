// PLAN_SCALE T2.1: under ?scale=v1 perspectiveScale follows the ring's own width ratio; flag off is the old 0.58 + 0.42t.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RING, ringBoundsAtY, perspectiveScale, HORIZON_Y } from '../src/constants.js';

const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };

test('T2.1: HORIZON_Y is where the ring side edges meet (≈ -39)', () => {
    assert.ok(Math.abs(HORIZON_Y - -39) < 0.5, String(HORIZON_Y));
});

test('T2.1: under ?scale=v1 the scale is within 0.5% of the ring width ratio at every row 258-445', () => {
    const near = ringBoundsAtY(RING.nearLeft.y), nearW = near.right - near.left;
    for (let y = 258; y <= 445; y++) {
        const b = ringBoundsAtY(y), ratio = (b.right - b.left) / nearW, s = withFlag('?scale=v1', () => perspectiveScale(y));
        assert.ok(Math.abs(s / ratio - 1) < 0.005, `y ${y}: scale ${s} vs ring ${ratio}`);
    }
});

test('T2.1: the front row is 1.000, the back row 0.614, and rows past the ring clamp', () => {
    withFlag('?scale=v1', () => {
        assert.equal(perspectiveScale(445), 1);
        assert.ok(Math.abs(perspectiveScale(258) - 0.614) < 0.001);
        assert.equal(perspectiveScale(600), 1);
        assert.equal(perspectiveScale(0), perspectiveScale(258));
    });
});

test('T2.1: flag off is the old formula, byte for byte', () => {
    for (let y = 200; y <= 500; y += 7) {
        const t = Math.max(0, Math.min(1, (y - 258) / (445 - 258)));
        assert.equal(perspectiveScale(y), 0.58 + t * 0.42);
    }
});
