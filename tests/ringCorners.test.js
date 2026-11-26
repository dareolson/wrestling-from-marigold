import test from 'node:test';
import assert from 'node:assert/strict';
import { RING } from '../src/constants.js';
import { cornerGeom, cornerGaps, CORNER_GAP } from '../src/ringCorners.js';

const G = cornerGeom(RING);
const inside = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
const mat = [RING.nearLeft, RING.nearRight, RING.farRight, RING.farLeft];

test('cornerGeom: every post stands outside the mat trapezoid, by the gap, along the outward diagonal', () => {
    for (const [k, c] of Object.entries(G)) {
        assert.equal(inside(c.foot, mat), false, `${k} foot outside the mat`);
        assert.ok(Math.abs(Math.hypot(c.foot.x - c.corner.x, c.foot.y - c.corner.y) - c.gap) < 1e-9);
        assert.ok(Math.abs(Math.hypot(c.out.x, c.out.y) - 1) < 1e-9);
    }
    assert.equal(G.nl.gap, CORNER_GAP.near); assert.equal(G.fl.gap, CORNER_GAP.far);
    assert.ok(G.nl.foot.x < RING.nearLeft.x && G.nl.foot.y > RING.nearLeft.y, 'near left: out is left and toward the camera');
    assert.ok(G.fr.foot.x > RING.farRight.x && G.fr.foot.y < RING.farRight.y, 'far right: out is right and away');
});
test('cornerGeom: the turnbuckles are the strand ends (corner x, the rope row there), the RING is not changed', () => {
    const before = JSON.stringify(RING);
    for (const [k, c] of Object.entries(G)) c.levels.forEach((lv, i) => {
        assert.equal(lv.turnbuckle.x, c.corner.x);
        assert.equal(lv.turnbuckle.y, RING.ropes[i][k[0] === 'n' ? 'nearY' : 'farY']);
        assert.ok(lv.connector > 0 && lv.connector < 2 * c.gap, 'a short connector');
        assert.ok(Math.abs(lv.onPost.y - lv.turnbuckle.y - (c.foot.y - c.corner.y)) < 1e-9, 'same height on the post');
    });
    assert.equal(JSON.stringify(RING), before);
});
test('cornerGeom: the two walls give a symmetric bisector at mirrored corners', () => {
    assert.ok(Math.abs(G.nl.out.x + G.nr.out.x) < 1e-9 && Math.abs(G.nl.out.y - G.nr.out.y) < 1e-9);
    assert.ok(Math.abs(G.fl.out.x + G.fr.out.x) < 1e-9 && Math.abs(G.fl.out.y - G.fr.out.y) < 1e-9);
});
test('cornerGaps: the far posts scale with the far/near ring width; the gap moves the footprint by exactly that', () => {
    const g = cornerGaps(20, RING), far = 20 * 540 / 880;
    assert.ok(Math.abs(g.far - far) < 1e-9 && g.near === 20);
    const W = cornerGeom(RING, g);
    assert.ok(Math.abs(Math.hypot(W.nl.foot.x - RING.nearLeft.x, W.nl.foot.y - RING.nearLeft.y) - 20) < 1e-9);
    assert.ok(Math.abs(Math.hypot(W.fr.foot.x - RING.farRight.x, W.fr.foot.y - RING.farRight.y) - far) < 1e-9);
});
