// George borrowing Ric Flair's act (2026-10-14): the figure-four leglock
// (tests/referenceThrows.test.js covers its clip) and begging off.

import test from 'node:test';
import assert from 'node:assert/strict';
import Wrestler, { POSES } from '../src/Wrestler.js';
import { george } from '../src/characters/george.js';
import { thesz } from '../src/characters/thesz.js';

// _doTaunt only sets state and runs a pose sequence; record which.
function taunter({ begsOff, stamina, struts = false }) {
    const actor = { begsOff, struts, stamina, state: 'standing', tauntPose: 'tauntArmsWide', idlePose: 'powerIdle',
        x: 400, y: 380, s: 1, facing: 1, scene: { tweens: { add: tween => { actor.moved = tween.x - 400; } } } };
    actor._runPoseSequence = (sequence) => { actor.sequence = sequence.map(step => step.p); };
    return actor;
}

test('a hurt George begs off instead of preening', () => {
    const actor = taunter({ begsOff: true, stamina: 20 });
    Wrestler.prototype._doTaunt.call(actor);
    assert.equal(actor.state, 'taunting');
    assert.equal(actor.sequence[0], 'begPlead');
    assert.ok(actor.sequence.includes('begShake'));
    assert.equal(actor.sequence.at(-1), 'powerIdle');
});

test('a fresh George still preens; a wrestler who does not beg never begs', () => {
    for (const actor of [taunter({ begsOff: true, stamina: 80 }), taunter({ begsOff: false, stamina: 20 })]) {
        Wrestler.prototype._doTaunt.call(actor);
        assert.ok(!actor.sequence.includes('begPlead'), JSON.stringify(actor.sequence));
    }
});

test('the beg poses exist and George is the one who begs', () => {
    assert.ok(POSES.begPlead && POSES.begShake);
    assert.equal(george.begsOff, true);
    assert.ok(!thesz.begsOff, 'Thesz never begs');
    assert.ok(george.moveSet.includes('figureFour'));
    assert.ok(!thesz.moveSet.includes('figureFour'));
});

test('healthy George struts forward; hurt George still begs', () => {
    const fresh = taunter({ begsOff: true, struts: true, stamina: 80 });
    Wrestler.prototype._doTaunt.call(fresh);
    assert.deepEqual(fresh.sequence.slice(0, 4), ['strutLeft', 'strutRight', 'strutLeft', 'strutRight']);
    assert.ok(fresh.moved > 0, 'struts toward where he faces');
    const hurt = taunter({ begsOff: true, struts: true, stamina: 20 });
    Wrestler.prototype._doTaunt.call(hurt);
    assert.equal(hurt.sequence[0], 'begPlead');
    assert.equal(george.struts, true);
    assert.ok(!thesz.struts);
});
