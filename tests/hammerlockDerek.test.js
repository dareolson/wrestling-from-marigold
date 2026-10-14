// Derek's hammerlock — the clip the game actually plays (registered in
// src/animation/clips/index.js). tests/hammerlockClip.test.js and
// tests/hammerlockAuthoring.test.js cover the earlier generated clip, which
// stays as the authoring pipeline's fixture.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { hammerlockWipClip } from '../src/animation/clips/hammerlockWip.js';
import { MOVE_SPECS } from '../src/moves/registry.js';

const fakeActor = () => ({ pose: {}, skeleton: { setPartVariants() {} } });

test('the game registers Derek\'s hammerlock under the registry id', () => {
    const registered = REGISTERED_MOVE_CLIPS.filter(clip => clip.id === MOVE_SPECS.hammerlock.clip);
    assert.equal(registered.length, 1);
    assert.equal(registered[0], hammerlockWipClip);
});

test('Derek\'s hammerlock validates and compiles', () => {
    const result = validateClip(hammerlockWipClip);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.doesNotThrow(() => compileClip(hammerlockWipClip));
});

// _doHammerlock's handlers key on these three markers: no acquire means no
// grip, no drain means no damage, no release means no release drain.
for (const hz of [30, 60, 120]) {
    test(`every marker the executor needs fires once, in order, at ${hz} Hz`, () => {
        const seen = [];
        const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
        runtime.register(hammerlockWipClip);
        runtime.play('hammerlock', { attacker: fakeActor(), defender: fakeActor() });
        const dt = 1 / hz;
        for (let t = 0; t < hammerlockWipClip.duration + dt; t += dt) runtime.update(dt);
        assert.deepEqual(seen, ['acquire-contact', 'apply-drain', 'release-contact']);
    });
}

test('the defender ends up behind-the-back: turned the attacker\'s way during the hold', () => {
    const clip = compileClip(hammerlockWipClip);
    const held = sampleClip(clip, 1.0).tracks;
    assert.equal(held.attacker.facing, held.defender.facing);
});

// The clip's last key leaves parts as they were (parts accumulate), so it is
// MoveRuntime's release that hands both wrestlers their base art back.
test('the grip and the pain face are on during the hold and gone once it ends', () => {
    const clip = compileClip(hammerlockWipClip);
    const held = sampleClip(clip, 1.0).tracks;
    assert.equal(held.attacker.parts.workingHand, 'grip');
    assert.equal(held.defender.parts.head, 'hurt');

    const record = () => { const calls = []; return { pose: {}, calls, skeleton: { setPartVariants: sel => calls.push({ ...sel }) } }; };
    const attacker = record(), defender = record();
    const runtime = new MoveRuntime();
    runtime.register(hammerlockWipClip);
    runtime.play('hammerlock', { attacker, defender });
    for (let t = 0; t < hammerlockWipClip.duration + 0.1; t += 1 / 60) runtime.update(1 / 60);
    assert.deepEqual(attacker.calls.at(-1), {});
    assert.deepEqual(defender.calls.at(-1), {});
});
