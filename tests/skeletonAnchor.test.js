// Pure-math coverage for Skeleton's distal-anchor mechanism
// (_trueDistalEnd/_endXY/_end), independent of Phaser — these methods only
// touch plain numbers and a mock "image" object, never scene state.
//
// Added 2026-07-25 per Codex's review of the cohesive-body-rig-binding
// Phase C work: no shipped character currently combines jointPivotFrac
// (proximal overlap, used by forearm/shin) with distalAnchorFrac (distal
// anchor, used by upperArm) on the same part, so that interaction was an
// unexercised path. Covers it directly so a future part that needs both
// doesn't silently regress.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';

// _trueDistalEnd/_endXY/_end don't read `this` at all beyond calling
// sibling methods on the same object, so binding them off the real
// prototype (no Phaser scene needed) exercises the exact shipped code.
const proto = Skeleton.prototype;
const trueDistalEnd = (...args) => proto._trueDistalEnd.apply(proto, args);

function mockImg({ texDims, jointPivotFrac = 0, distalAnchorFrac }) {
    return { _texDims: texDims, _jointPivotFrac: jointPivotFrac, _distalAnchorFrac: distalAnchorFrac };
}

test('distalAnchorFrac alone (jointPivotFrac 0): anchor.v=1 matches the old bone-length _end() exactly', () => {
    const img = mockImg({ texDims: { w: 50, h: 100 }, distalAnchorFrac: { u: 0.5, v: 1 } });
    const got = trueDistalEnd(img, 0, 0, 100, 0, 1, 1);
    const want = proto._end(0, 0, 100, 0);
    assert.ok(Math.abs(got.x - want.x) < 1e-9 && Math.abs(got.y - want.y) < 1e-9);
});

test('distalAnchorFrac lateral offset moves perpendicular to the bone axis, both facings', () => {
    const img = mockImg({ texDims: { w: 50, h: 100 }, distalAnchorFrac: { u: 0.6, v: 1 } });
    const posFacing = trueDistalEnd(img, 0, 0, 100, 0, 1, 1);
    const negFacing = trueDistalEnd(img, 0, 0, 100, 0, 1, -1);
    // angle=0 means bone axis is straight down (+y); lateral offset is +x/-x.
    assert.ok(posFacing.x > 0, 'facing +1 shifts anchor toward +x');
    assert.ok(negFacing.x < 0, 'facing -1 mirrors the shift to -x');
    assert.ok(Math.abs(posFacing.x + negFacing.x) < 1e-9, 'mirrored symmetrically');
    assert.ok(Math.abs(posFacing.y - negFacing.y) < 1e-9, 'y unaffected by facing');
});

test('combined jointPivotFrac + distalAnchorFrac: anchor.v is measured relative to the shifted origin, not canvas row 0', () => {
    // A part whose origin sits 20% down its own (grown) canvas (jointPivotFrac
    // 0.2 -- e.g. an authored-overlap forearm/shin) AND that separately
    // declares a distal anchor at v=0.9 of that same canvas. The distance
    // from the origin to the anchor should be (0.9 - 0.2) = 0.7 of the grown
    // display height, not 0.9 of it.
    const jointPivotFrac = 0.2;
    const texDims = { w: 40, h: 60 };
    const img = mockImg({ texDims, jointPivotFrac, distalAnchorFrac: { u: 0.5, v: 0.9 } });
    const s = 1, angle = 0;
    const got = trueDistalEnd(img, 0, 0, /* len (unused when anchor present) */ 999, angle, s, 1);
    const growth = 1 / (1 - jointPivotFrac);
    const expectedLy = (0.9 - jointPivotFrac) * texDims.h * s * growth;
    assert.ok(Math.abs(got.y - expectedLy) < 1e-9, `expected ly ${expectedLy}, got ${got.y}`);
});

test('combined jointPivotFrac + distalAnchorFrac holds across rotation angles and both facings', () => {
    const jointPivotFrac = 0.15;
    const texDims = { w: 30, h: 50 };
    const img = mockImg({ texDims, jointPivotFrac, distalAnchorFrac: { u: 0.55, v: 0.85 } });
    const growth = 1 / (1 - jointPivotFrac);
    const dw = texDims.w * growth, dh = texDims.h * growth;
    const localLx = (0.55 - 0.5) * dw;
    const localLy = (0.85 - jointPivotFrac) * dh;
    // The anchor's distance from the origin (px,py) must be rotation- and
    // facing-invariant -- only its direction changes.
    const expectedDist = Math.hypot(localLx, localLy);
    for (const facing of [1, -1]) {
        for (let angle = -Math.PI; angle <= Math.PI; angle += 0.3) {
            const p = trueDistalEnd(img, 5, -3, 999, angle, 1, facing);
            const dist = Math.hypot(p.x - 5, p.y - (-3));
            assert.ok(Math.abs(dist - expectedDist) < 1e-9, `angle ${angle} facing ${facing}: expected dist ${expectedDist}, got ${dist}`);
        }
    }
});

test('legacy part with only jointPivotFrac (no distalAnchorFrac) is unaffected -- falls through to plain _end()', () => {
    const img = mockImg({ texDims: { w: 40, h: 60 }, jointPivotFrac: 0.2, distalAnchorFrac: undefined });
    const got = trueDistalEnd(img, 10, 20, 45, 0.7, 1, 1);
    const want = proto._end(10, 20, 45, 0.7);
    assert.deepStrictEqual(got, want);
});

test('legacy part with only distalAnchorFrac (jointPivotFrac 0, e.g. George/Thesz upperArm) matches the pre-fix formula', () => {
    // Regression guard for the exact shipped George/Thesz elbow values --
    // if this ever drifts, the elbow_anchor_sweep.mjs tool (which needs a
    // browser) is the fuller check, but this pins the underlying math.
    const img = mockImg({ texDims: { w: 55, h: 71 }, distalAnchorFrac: { u: 0.6, v: 0.9969 } });
    const s = 0.5, angle = 0.3, facing = 1;
    const got = trueDistalEnd(img, 100, 200, 999, angle, s, facing);
    const dw = 55 * s, dh = 71 * s;
    const lx = facing * (0.6 - 0.5) * dw;
    const ly = 0.9969 * dh; // jointPivotFrac 0 -> no shift
    const want = proto._endXY(100, 200, lx, ly, angle);
    assert.deepStrictEqual(got, want);
});
