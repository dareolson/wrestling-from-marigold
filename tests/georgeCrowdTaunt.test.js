import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateClip } from '../src/animation/AnimationClip.js';
import { georgeCrowdTauntClip, CROWD_TAUNT } from '../src/animation/clips/georgeCrowdTaunt.js';

const stance = { lLeg: -0.18, rLeg: 0.13, lArm: 0.10, rArm: 0.59, lean: 0.09, crouch: 0.22, lKnee: -0.1, rKnee: -0.1 };

test('crowd taunt: a valid clip with its beats in order', () => {
    const clip = georgeCrowdTauntClip(stance);
    assert.deepEqual(validateClip(clip), { ok: true, errors: [] });
    assert.deepEqual(clip.events.map(e => e.type), ['present', 'reject', 'dismiss', 'release']);
    assert.ok(CROWD_TAUNT.times.holdEnd - CROWD_TAUNT.times.present >= 0.6, 'the applause hold reads (>= 0.6 s)');
});

test('crowd taunt: the lower body holds the stance on every key (soles planted, no authored knee)', () => {
    const keys = georgeCrowdTauntClip(stance).tracks.attacker.keyframes;
    for (const k of keys) for (const c of ['lLeg', 'rLeg', 'crouch', 'lKnee', 'rKnee']) assert.equal(k.pose[c], stance[c], `${c} at ${k.at}`);
    assert.equal(keys[0].pose.lArm, stance.lArm, 'starts on the stance');
});

test('crowd taunt: no arm is raised overhead (the near hand stays below the face)', () => {
    for (const k of georgeCrowdTauntClip(stance).tracks.attacker.keyframes) assert.ok(k.pose.lArm <= 1.1 && k.pose.rArm <= 1.1, `${k.at}`);
});
