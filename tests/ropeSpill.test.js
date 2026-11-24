import test from 'node:test';
import assert from 'node:assert/strict';
import { SPILL, spillExt, spillHeadDir, spillPlan, spillBack, spillAtRopes } from '../src/animation/ropeSpill.js';
import { chooseFall } from '../src/animation/falls.js';
import { splitPlan } from '../src/animation/ropeSplit.js';

const B = { left: 100, right: 800 };
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';

test('head direction: on his back away from his facing, face down toward it', () => {
    assert.equal(spillHeadDir('supine', 1), -1); assert.equal(spillHeadDir('supine', -1), 1);
    assert.equal(spillHeadDir('prone', 1), 1); assert.equal(spillHeadDir('prone', -1), -1);
});
test('spillPlan: slides the root so the shoulders end neckPast beyond the plane, per wall and facing', () => {
    // on his back facing right = head to the left wall: root 60 px from the plane, Lou wants 72 - 12 = 60 -> no slide needed
    const p0 = spillPlan({ x: 160, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.equal(p0.wall, 'L'); assert.ok(Math.abs(p0.dx) < 1e-9);
    // 25 px from the wall (a slam beside it): he overshoots, slides 35 px back in (toward +x for the left wall)
    const p1 = spillPlan({ x: 125, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.ok(Math.abs(p1.dx - 35) < 1e-9 && p1.wall === 'L');
    // mirror: facing left, head to the right wall: slides -x
    const p2 = spillPlan({ x: 775, s: 1, facing: -1, lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.ok(Math.abs(p2.dx + 35) < 1e-9 && p2.wall === 'R');
    // 90 px out: 30 px toward the wall
    const p3 = spillPlan({ x: 190, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.ok(Math.abs(p3.dx + 30) < 1e-9);
});
test('spillPlan: capped, and null when the wall is too far for the cap or he is not lying', () => {
    assert.ok(Math.abs(spillPlan({ x: 150, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true }).dx) <= SPILL.cap);   // 50 from the wall -> overshoots 10 in
    assert.equal(spillPlan({ x: 300, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true }), null);                    // 200 px from the plane
    assert.equal(spillPlan({ x: 160, s: 1, facing: 1, lying: null, rig: LOU, bounds: B, thrown: true }), null);
    const near = spillPlan({ x: 112, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.equal(near.dx, SPILL.cap);   // 12 px from the plane: wants 48 in, capped at 40
});
test('spillPlan: rigs differ and the slide scales with s', () => {
    const l = spillPlan({ x: 125, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true }), g = spillPlan({ x: 125, s: 1, facing: 1, lying: 'supine', rig: GEORGE, bounds: B, thrown: true });
    assert.ok(l.dx - g.dx === spillExt(LOU, 'supine', true) - spillExt(GEORGE, 'supine', true));
    const half = spillPlan({ x: 112.5, s: 0.5, facing: 1, lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.ok(Math.abs(half.dx - 17.5) < 1e-9);
});
test('spillPlan: a fall (not thrown) and a face-down fall use their own reach', () => {
    const fall = spillPlan({ x: 125, s: 1, facing: 1, lying: 'supine', rig: LOU, bounds: B });
    assert.equal(fall.dx, SPILL.cap);   // wants 82 - 12 = 70 in from 25: 45, capped at 40
});
test('spillBack: slides the torso inside the plane, nothing when it already is', () => {
    const b = spillBack({ x: 160, s: 1, wall: 'L', lying: 'supine', rig: LOU, bounds: B, thrown: true });
    assert.ok(Math.abs(b.dx - (72 + SPILL.headExtra + SPILL.clear - 60)) < 1e-9);   // head clear: 48 px away from the left wall = toward +x
    assert.equal(spillBack({ x: 260, s: 1, wall: 'L', lying: 'supine', rig: LOU, bounds: B, thrown: true }), null);
    assert.ok(spillBack({ x: 740, s: 1, wall: 'R', lying: 'supine', rig: LOU, bounds: B, thrown: true }).dx < 0);
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
