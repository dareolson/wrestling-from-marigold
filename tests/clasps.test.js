import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claspSelection, CLASP_ON } from '../src/animation/clasps.js';
import { lockupGrips } from '../src/animation/lockup.js';
import { waistlockGrips } from '../src/animation/waistlock.js';

test('the art goes on at the grip weight CLASP_ON and off below it; the arm\'s slot follows the side that carries lArm', () => {
    const at = (w) => claspSelection([{ arm: 'l', w, clasp: 'collarTie' }, { arm: 'r', w: 1, clasp: 'elbowCup' }], 'near');
    assert.deepEqual(at(CLASP_ON), { nearForearm: 'collarTie', farForearm: 'elbowCup' });
    assert.deepEqual(at(CLASP_ON - 0.01), { farForearm: 'elbowCup' });
    assert.deepEqual(claspSelection([{ arm: 'l', w: 1, clasp: 'collarTie' }], 'far'), { farForearm: 'collarTie' });
    assert.deepEqual(claspSelection([{ arm: 'r', w: 1, clasp: 'collarTie' }], 'far'), { nearForearm: 'collarTie' });
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
    assert.deepEqual(l.defender.map(i => i.clasp), ['elbowCup', 'elbowCup'], 'the tied-up man holds the attacker\'s arm with both hands');
    const waist = { skeleton: { jointAttachmentPoints: { nearHip: { x: 0, y: 0 }, farHip: { x: 0, y: 0 }, neck: { x: 0, y: -50 } }, lChannelSide: () => 'near' }, facing: 1, s: 1 };
    const w = waistlockGrips(a, waist, { attacker: { near: 1, far: 1 }, defender: { pry: 1 } });
    assert.deepEqual(w.attacker.map(i => i.clasp ?? null), ['waistClasp', null], 'the near hand clasps; the far hand is already hidden behind the defender');
    assert.equal(w.defender[0].clasp, undefined);
});
