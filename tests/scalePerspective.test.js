// PLAN_SCALE T2.1: under ?scale=v1 perspectiveScale follows the ring's own width ratio; flag off is the old 0.58 + 0.42t.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RING, ringBoundsAtY, perspectiveScale, HORIZON_Y, ringHorizonY } from '../src/constants.js';

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

// T3.1: the guard. HORIZON_Y is whatever RING's side edges say, and the width-ratio match holds for any ring, so a moved corner can't leave a stale constant.
const edgeMeet = (r) => {   // an independent solve: intersect the two side edges as lines y = m x + c
    const L = (a, b) => { const m = (b.y - a.y) / (b.x - a.x); return [m, a.y - m * a.x]; };
    const [m1, c1] = L(r.nearLeft, r.farLeft), [m2, c2] = L(r.nearRight, r.farRight), x = (c2 - c1) / (m1 - m2);
    return m1 * x + c1;
};
const widthAt = (r, y) => { const t = (r.nearLeft.y - y) / (r.nearLeft.y - r.farLeft.y); return (r.nearRight.x + (r.farRight.x - r.nearRight.x) * t) - (r.nearLeft.x + (r.farLeft.x - r.nearLeft.x) * t); };

test('T3.1: HORIZON_Y equals ringHorizonY(RING) and an independent intersection of the side edges', () => {
    assert.equal(HORIZON_Y, ringHorizonY(RING));
    assert.ok(Math.abs(HORIZON_Y - edgeMeet(RING)) < 1e-9);
});

test('T3.1: for moved corners the horizon formula still reproduces the ring width ratio at every row', () => {
    const moved = [
        { ...RING, farLeft: { x: 190, y: 258 }, farRight: { x: 770, y: 258 } },
        { ...RING, nearLeft: { x: 60, y: 450 }, nearRight: { x: 900, y: 450 }, farLeft: { x: 230, y: 250 }, farRight: { x: 730, y: 250 } },
        { ...RING, farLeft: { x: 240, y: 270 }, farRight: { x: 720, y: 270 } },
    ];
    for (const r of moved) {
        const H = ringHorizonY(r);
        assert.ok(Math.abs(H - edgeMeet(r)) < 1e-9);
        for (let y = r.farLeft.y; y <= r.nearLeft.y; y += 5) {
            const s = (y - H) / (r.nearLeft.y - H), ratio = widthAt(r, y) / widthAt(r, r.nearLeft.y);
            assert.ok(Math.abs(s / ratio - 1) < 1e-9, `y ${y}: ${s} vs ${ratio}`);
        }
    }
});

test('T3.1: a ring whose side edges are parallel has no horizon (ringHorizonY is not finite)', () => {
    const box = { ...RING, farLeft: { x: 40, y: 258 }, farRight: { x: 920, y: 258 } };
    assert.ok(!Number.isFinite(ringHorizonY(box)));
});
