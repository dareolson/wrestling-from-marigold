// The piledriver clip, posed against the WWF Raw sheet's frames 140–153 with
// the body tilt/lift channels (tools/move-editor/author_piledriver.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { piledriverClip } from '../src/animation/clips/piledriver.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import { exportClip } from '../tools/move-editor/model.js';

const draft = JSON.parse(readFileSync(new URL('../tools/move-editor/drafts/piledriver.json', import.meta.url), 'utf8'));
const fakeActor = () => ({ pose: {}, skeleton: { setPartVariants() {} } });

test('the piledriver clip is registered under the registry id and validates', () => {
    assert.equal(MOVE_SPECS.piledriver.clip, piledriverClip.id);
    assert.ok(REGISTERED_MOVE_CLIPS.includes(piledriverClip));
    const result = validateClip(piledriverClip);
    assert.equal(result.ok, true, result.errors.join('; '));
});

test('the committed clip is exactly what its draft exports', () => {
    assert.deepEqual(exportClip(draft), JSON.parse(JSON.stringify(piledriverClip)));
});

test('the draft carries its sprite references, the clip never does', () => {
    assert.ok(draft.references.length > 0);
    assert.equal('references' in piledriverClip, false);
});

// The executor's damage keys on this one marker.
for (const hz of [30, 60, 120]) {
    test(`impact fires exactly once at ${hz} Hz`, () => {
        const seen = [];
        const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
        runtime.register(piledriverClip);
        runtime.play('piledriver', { attacker: fakeActor(), defender: fakeActor() });
        for (let t = 0; t < piledriverClip.duration + 0.1; t += 1 / hz) runtime.update(1 / hz);
        assert.deepEqual(seen, ['impact']);
    });
}

test('the victim is held upside down, then driven head-first into the mat', () => {
    const clip = compileClip(piledriverClip);
    const impactAt = piledriverClip.events.find(e => e.type === 'impact').at;
    const held = sampleClip(clip, 0.9).tracks.defender.pose;
    assert.ok(Math.abs(held.tilt - Math.PI) < 0.05, `held tilt ${held.tilt}`);
    assert.ok(held.lift > 80, `held lift ${held.lift}`);
    const impact = sampleClip(clip, impactAt).tracks.defender.pose;
    assert.ok(Math.abs(impact.tilt - Math.PI) < 0.05);
    assert.ok(impact.lift < held.lift / 2, 'lowered to the mat at impact');
});
