import test from 'node:test';
import assert from 'node:assert/strict';
import { SPILL, spillExt, spillHeadDir, spillPlan, spillBack, spillAtRopes, strandX } from '../src/animation/ropeSpill.js';
import { chooseFall } from '../src/animation/falls.js';
import { splitPlan } from '../src/animation/ropeSplit.js';

const B = { left: 127, right: 800 };   // the plane at row 350
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';

test('head direction: on his back away from his facing, face down toward it', () => {
    assert.equal(spillHeadDir('supine', 1), -1); assert.equal(spillHeadDir('supine', -1), 1);
    assert.equal(spillHeadDir('prone', 1), 1); assert.equal(spillHeadDir('prone', -1), -1);
});
const row = (x, o = {}) => ({ x, y: 350, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, ...o });   // facing right, on his back: the head points at the LEFT wall (plane x = 100)
test('strandX: the drawn bottom strand sits well outside the ground plane at the torso row', () => {
    assert.ok(Math.abs(strandX(380, -1) - 40) < 1e-9);                                    // near corner
    assert.ok(strandX(345, -1) > strandX(300, -1) - 200 && strandX(345, -1) < strandX(380, -1) + 100);
    assert.ok(strandX(345, 1) > strandX(345, -1), 'right wall is to the right');
    assert.ok(strandX(300, -1) > strandX(345, -1), 'higher up the screen = nearer the far corner = further in');
});
test('spillPlan: the root goes where the drawn strand crosses the torso a quarter in from the neck, never nearer the plane than hipsMin', () => {
    const near = spillPlan(row(B.left + 30, { canShift: true }));
    assert.equal(near.wall, 'L'); assert.ok(near.out > 40 && near.out < 55, `out ${near.out}`);
    assert.equal(near.want, SPILL.hipsMin);                                                // 82 - 45 - 23 < 20: held at the hips margin
    assert.ok(Math.abs(near.fallDx + 10) < 1e-9 && near.dx === 0, `${near.fallDx} ${near.dx}`);   // 10 px toward the wall (-x), all of it carried by the fall
    // a man far out: the fall carries him up to fallCap, the slide the rest, the hips still stop at the margin
    const far = spillPlan(row(B.left + 118, { canShift: true }));
    assert.ok(Math.abs(far.fallDx + SPILL.fallCap) < 1e-9 && Math.abs(far.dx + (118 - SPILL.hipsMin - SPILL.fallCap)) < 1e-9, `${far.fallDx} ${far.dx}`);
    assert.equal(spillPlan(row(B.left + 130, { canShift: true })), null, 'beyond fall shift + slide');
});
test('spillPlan: at the landing (no fall shift) or for a throw only the slide counts', () => {
    assert.ok(Math.abs(spillPlan(row(B.left + 30)).dx + 10) < 1e-9);
    assert.equal(spillPlan(row(B.left + 70)), null, '50 px is beyond the 40 px slide');
    const slam = spillPlan(row(B.left + 25, { thrown: true }));                            // a slam beside the wall
    assert.ok(Math.abs(slam.dx + 5) < 1e-9 && slam.fallDx === 0);
    // facing the other way: head to the right wall, the move is +x
    const r = spillPlan(row(B.right - 30, { facing: -1, canShift: true }));
    assert.equal(r.wall, 'R'); assert.ok(r.fallDx > 0);
});
test('spillPlan: not lying is null; the move scales with s; rigs differ in reach', () => {
    assert.equal(spillPlan(row(B.left + 30, { lying: null })), null);
    const half = spillPlan(row(B.left + 15, { s: 0.5, canShift: true }));
    assert.ok(half.fallDx < 0 && half.fallDx > -10, `${half.fallDx}`);
    const g = spillPlan(row(B.left + 60, { rig: GEORGE, canShift: true })), l = spillPlan(row(B.left + 60, { canShift: true }));
    assert.ok(g && l && g.want >= SPILL.hipsMin && l.want >= SPILL.hipsMin);
});
test('spillBack: slides his whole head inside the drawn strand (its x at the head top row) before the get-up, nothing when it already is', () => {
    const b = spillBack({ x: B.left + 20, y: 350, s: 1, wall: 'L', lying: 'supine', rig: LOU, bounds: B });
    const top = strandX(350 - 32, -1), outTop = B.left - top;                              // head top 32 px above the root's row
    assert.ok(Math.abs(b.dx - (121 - outTop + SPILL.clear - 20)) < 1e-9, `${b.dx}`);       // away from the left wall = +x
    assert.ok(b.dx > 40, 'a real slide, not a nudge');
    assert.equal(spillBack({ x: B.left + 300, y: 350, s: 1, wall: 'L', lying: 'supine', rig: LOU, bounds: B }), null);
    assert.ok(spillBack({ x: B.right - 20, y: 350, s: 1, wall: 'R', lying: 'supine', rig: LOU, bounds: B }).dx < 0);
    const th = spillBack({ x: B.left + 20, y: 350, s: 1, wall: 'L', lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.ok(Math.abs((b.dx - th.dx) - 10) < 1e-9, 'a thrown man lies 10 px shorter');
});
test('rope break: a spilled man is at the ropes wherever his root is; otherwise the 30 px rule', () => {
    assert.ok(spillAtRopes({ x: 190, s: 1, bounds: B, spilled: true }));
    assert.ok(!spillAtRopes({ x: 190, s: 1, bounds: B, spilled: false }));
    assert.ok(spillAtRopes({ x: 128, s: 1, bounds: B })); assert.ok(spillAtRopes({ x: 775, s: 1, bounds: B }));
});
test('chooseFall: with ropeSpill a head-toward-wall fall no longer counts the rope behind him as lost room; the boots still must fit', () => {
    const base = { move: 'chop', hit: 'chest', side: 'front', wear: 10, rng: () => 0.1 };
    const cramped = chooseFall({ ...base, room: { back: 20, front: 300, side: 200 } });
    assert.match(cramped.reason, /cramped/);
    const spill = chooseFall({ ...base, room: { back: 20, front: 300, side: 200 }, ropeSpill: true });
    assert.doesNotMatch(spill.reason, /cramped/); assert.equal(spill.slide, null);
    // boots toward the wall: the rope in front of a backward fall still counts
    const boots = chooseFall({ ...base, room: { back: 300, front: 20, side: 200 }, ropeSpill: true });
    assert.ok(boots.slide || /ring room|cramped/.test(boots.reason));
    // flag absent: same picks as before
    assert.deepEqual(chooseFall({ ...base, room: { back: 20, front: 300, side: 200 }, ropeSpill: false }), cramped);
});
test('splitPlan: a spilled man opens an over window on the bottom strand and cuts at its edges', () => {
    const p = splitPlan([{ t: 0.5, depth: 20, low: 19.99, over: [0.36, 0.64] }], 8);
    assert.ok(p.ts.includes(0.36) && p.ts.includes(0.64));
    const j = p.ts.findIndex((v, i) => v <= 0.5 && p.ts[i + 1] > 0.5);
    assert.ok(p.over[j]); assert.ok(!p.over[0]);
    assert.ok(splitPlan([{ t: 0.5, depth: 20, low: 19.99 }], 8).over.every(v => !v), 'no window, no over');
});

// TS.3: the AI does not pin or press a spilled man (it treats him as at the ropes); Arena._isAtRopes delegates to spillAtRopes (above)
import AIHandler from '../src/AIHandler.js';
test('AI: a spilled man is near the ropes wherever his root is; a man mid-ring is not', () => {
    const near = AIHandler.prototype._nearRopes;
    assert.ok(near.call({}, { x: 450, y: 350, s: 1, isSpilled: () => true }));
    assert.ok(!near.call({}, { x: 450, y: 350, s: 1, isSpilled: () => false }));
    assert.ok(!near.call({}, { x: 450, y: 350, s: 1 }), 'a wrestler without isSpilled (older objects) behaves as before');
    assert.ok(near.call({}, { x: 130, y: 350, s: 1, isSpilled: () => false }), 'the plain wall rule is unchanged');
});
