import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claspSelection, claspStep, CLASP_RELEASE, CLASP_GRAB_MIN, CLASP_FULL, CLASP_FAST } from '../src/animation/clasps.js';
import { lockupGrips } from '../src/animation/lockup.js';
import { waistlockGrips } from '../src/animation/waistlock.js';

test('with no hand speed the art goes on from CLASP_GRAB_MIN; the arm\'s slot follows the side that carries lArm', () => {
    const at = (w) => claspSelection([{ arm: 'l', w, clasp: 'collarTie' }, { arm: 'r', w: 1, clasp: 'elbowCup' }], 'near');
    assert.deepEqual(at(CLASP_GRAB_MIN), { nearForearm: 'collarTie', farForearm: 'elbowCup' });
    assert.deepEqual(at(CLASP_GRAB_MIN - 0.01), { farForearm: 'elbowCup' });
    assert.deepEqual(claspSelection([{ arm: 'l', w: 1, clasp: 'collarTie' }], 'far'), { farForearm: 'collarTie' });
    assert.deepEqual(claspSelection([{ arm: 'r', w: 1, clasp: 'collarTie' }], 'far'), { nearForearm: 'collarTie' });
});

// r6 (Derek G2): the swap rides the hand's own speed, with the weights as fallbacks.
const g = (w) => [{ arm: 'l', w, clasp: 'collarTie' }];
const step = (w, state) => claspStep(g(w), 'near', undefined, state);
test('grab: art on at the first fast frame once the grip has weight; a still hand waits for full weight', () => {
    const still = { speed: () => 0 }, fast = { speed: () => CLASP_FAST };
    assert.deepEqual(step(0.3, still).want, {}, 'a slow hand at weight .3 keeps the base art');
    assert.deepEqual(step(0.3, fast).want, { nearForearm: 'collarTie' });
    assert.deepEqual(step(CLASP_GRAB_MIN - 0.01, fast).want, {}, 'no weight yet: a fast hand is not a grab');
    assert.deepEqual(step(CLASP_FULL, still).want, { nearForearm: 'collarTie' }, 'the fallback: full weight');
    assert.deepEqual(step(0.9, { speed: () => CLASP_FAST - 0.1 }).want, {});
});

test('release: art off once a full grip falls below CLASP_RELEASE, however fast the hand; stays off while the grip lasts (no on-off-on)', () => {
    const worn = { nearForearm: 'collarTie' }, full = { nearForearm: true };
    assert.deepEqual(step(1, { worn, speed: () => 99 }).want, worn, 'full weight holds, however fast');
    assert.deepEqual(step(1, { worn, speed: () => 0 }).full, full, 'and marks the grip full');
    assert.deepEqual(step(0.1, { worn, speed: () => 99 }).want, worn, 'still closing, never full: the art stays through a fast hand');
    assert.deepEqual(step(CLASP_RELEASE + 0.01, { worn, full, speed: () => 99 }).want, worn, 'falling, not yet below the release weight');
    const off = step(CLASP_RELEASE - 0.01, { worn, full, speed: () => 0 });
    assert.deepEqual(off.want, {});
    assert.deepEqual(off.released, { nearForearm: true });
    for (const w of [0.19, 0.97, 1, 0.6]) assert.deepEqual(step(w, { worn: {}, speed: () => 99, released: off.released }).want, {}, `wobble back to ${w}`);
    assert.deepEqual(step(CLASP_GRAB_MIN - 0.01, { worn: {}, released: off.released }).released, {}, 'the latch clears when the grip is gone');
});

test('one arm never wears two clasps, a rig without the art keeps its base forearm, a grip with no clasp stays base', () => {
    assert.deepEqual(claspSelection([{ arm: 'l', w: 0.6, clasp: 'collarTie' }, { arm: 'l', w: 0.9, clasp: 'elbowCup' }], 'near'), { nearForearm: 'elbowCup' });
    assert.deepEqual(claspSelection([{ arm: 'l', w: 1, clasp: 'collarTie' }], 'near', () => false), {});
    assert.deepEqual(claspSelection([{ arm: 'l', w: 1 }], 'near'), {});
});

test('the lockup, the waistlock and its far hand: which grip carries which clasp', () => {
    const man = (facing) => ({ facing, s: 1, skeleton: { lChannelSide: () => 'near', jointAttachmentPoints: { neck: { x: 0, y: 0 } } } });
    const a = man(1), d = man(-1);
    const l = lockupGrips(a, d, { attacker: { collar: 1, elbow: 1 }, defender: { collar: 1, elbow: 1 } });
    assert.deepEqual(l.attacker.map(i => i.clasp).sort(), ['collarTie', 'elbowCup']);
    assert.deepEqual(l.defender.map(i => i.clasp), ['bicepGrip', 'bicepGrip']);
    const waist = { skeleton: { jointAttachmentPoints: { nearHip: { x: 0, y: 0 }, farHip: { x: 0, y: 0 }, neck: { x: 0, y: -50 } }, lChannelSide: () => 'near' }, facing: 1, s: 1 };
    const w = waistlockGrips(a, waist, { attacker: { near: 1, far: 1 }, defender: { pry: 1 } });
    assert.deepEqual(w.attacker.map(i => i.clasp ?? null), ['waistClasp', null], 'the near hand clasps; the far hand is already hidden behind the defender');
    assert.equal(w.defender[0].clasp, undefined);
});

test('a clasp never reaches the arm\'s full length, so its elbow keeps a bend (Derek G2)', async () => {
    const { CLASP_REACH } = await import('../src/animation/clasps.js');
    assert.ok(CLASP_REACH < 0.97 && CLASP_REACH > 0.85, `${CLASP_REACH}`);
});

test('bicepGrip wears the elbowCup art until it has its own, and only where the rig has that art', () => {
    const l = [{ arm: 'l', w: 1, clasp: 'bicepGrip' }, { arm: 'r', w: 1, clasp: 'bicepGrip' }];
    assert.deepEqual(claspSelection(l, 'near'), { nearForearm: 'elbowCup', farForearm: 'elbowCup' });
    assert.deepEqual(claspSelection(l, 'near', (name) => name === 'elbowCup'), { nearForearm: 'elbowCup', farForearm: 'elbowCup' });
    assert.deepEqual(claspSelection(l, 'near', (name) => name === 'bicepGrip'), {});
});
