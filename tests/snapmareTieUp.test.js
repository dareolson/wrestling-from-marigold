import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapmareTieUpClip, PIVOT, PIVOT_FLIP } from '../src/animation/clips/snapmareTieUp.js';
import { snapmareClip } from '../src/animation/clips/snapmare.js';
import { validateClip } from '../src/animation/AnimationClip.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';

test('the tie-up clip is valid and the snapmare plays unchanged after the pivot, shifted by it', () => {
    const c = snapmareTieUpClip(100);
    assert.deepEqual(validateClip(c), { ok: true, errors: [] });
    assert.equal(c.duration, +(snapmareClip.duration + PIVOT).toFixed(3));
    assert.equal(c.events[0].at, +(snapmareClip.events[0].at + PIVOT).toFixed(3));
    const after = c.tracks.attacker.keyframes.filter(k => k.at >= PIVOT);
    assert.equal(after.length, snapmareClip.tracks.attacker.keyframes.length);
    after.forEach((k, i) => assert.deepEqual(k.pose, snapmareClip.tracks.attacker.keyframes[i].pose));
});

test('the thrower\'s facing flips once, at the hidden moment, on a symmetric straight pose', () => {
    const keys = snapmareTieUpClip(100).tracks.attacker.keyframes, flips = keys.filter((k, i) => i && k.facing !== keys[i - 1].facing);
    assert.equal(flips.length, 1);
    assert.equal(flips[0].at, PIVOT_FLIP);
    const before = keys[keys.indexOf(flips[0]) - 1];
    for (const ch of ['crouch', 'lLeg', 'rLeg', 'lElbow', 'rElbow', 'lShin', 'rShin', 'bend']) assert.ok(Math.abs(flips[0].pose[ch] - before.pose[ch]) < 1e-9, ch);
    assert.ok(PIVOT >= 0.3 && PIVOT <= 0.4);
});

test('the man keeps his facing (the same way as the thrower after the pivot) and arrives at the reversal\'s start (62 units behind)', () => {
    const d = snapmareTieUpClip(100).tracks.defender.keyframes;
    assert.ok(d.every(k => k.facing === -1));
    assert.equal(d[0].transform.x, 100);
    assert.equal(d.find(k => k.at === PIVOT).transform.x, 62);
});

test('D3: no lKnee/rKnee in the added pivot keys; flag off the clip is not statically registered', () => {
    for (const k of [...snapmareTieUpClip(100).tracks.attacker.keyframes.filter(k => k.at < PIVOT), ...snapmareTieUpClip(100).tracks.defender.keyframes.filter(k => k.at < PIVOT)]) assert.equal('lKnee' in k.pose, false);
    assert.equal(REGISTERED_MOVE_CLIPS.some(c => c.id === 'snapmareTieUp'), false);
});
