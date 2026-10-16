import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileClip, validateClip } from '../src/animation/AnimationClip.js';
import { dropkickV2Clip } from '../src/animation/clips/dropkickV2.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { soloClip } from '../tools/move-editor/authoring.mjs';

// The ?dropkick=v2 comparison candidate: a one-wrestler clip like the live
// dropkick (the executor owns position), exported from its draft, and NOT a
// registered move — Arena registers it only when the flag is on.
const draft = JSON.parse(readFileSync(new URL('../tools/move-editor/drafts/dropkick-v2.json', import.meta.url)));

test('dropkick v2: valid solo clip, exactly its draft export, no transform', () => {
    assert.equal(validateClip(dropkickV2Clip).ok, true);
    assert.deepEqual(soloClip(draft), JSON.parse(JSON.stringify(dropkickV2Clip)));
    assert.deepEqual(Object.keys(dropkickV2Clip.tracks), ['attacker']);
    assert.equal(compileClip(dropkickV2Clip).authorsTransform, false);
    assert.equal(dropkickV2Clip.events.filter(e => e.type === 'impact').length, 1);
});

test('dropkick v2 is a candidate, not a registered move', () => {
    assert.equal(REGISTERED_MOVE_CLIPS.includes(dropkickV2Clip), false);
});
