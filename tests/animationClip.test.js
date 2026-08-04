import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, eventsBetween, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';

const clipSource = {
    id: 'test-grapple',
    duration: 1,
    tracks: {
        attacker: {
            keyframes: [
                { at: 0, pose: { lean: 0, lArm: 0 }, parts: { nearForearm: 'base' } },
                { at: 0.5, ease: 'linear', pose: { lean: 1 }, parts: { nearForearm: 'grip' } },
                { at: 1, pose: { lean: 0 }, parts: { nearForearm: 'base' } },
            ],
        },
        defender: {
            keyframes: [
                { at: 0, transform: { x: 10 } },
                { at: 1, transform: { x: 20 } },
            ],
        },
    },
    events: [
        { at: 0.5, type: 'contact' },
        { at: 0.75, type: 'impact' },
    ],
};

test('clip sampling blends numeric channels and steps art at authored keyframes', () => {
    const clip = compileClip(clipSource);
    const before = sampleClip(clip, 0.25);
    assert.equal(before.tracks.attacker.pose.lean, 0.5);
    assert.equal(before.tracks.attacker.parts.nearForearm, 'base');
    assert.equal(before.tracks.defender.transform.x, 12.5);

    const contact = sampleClip(clip, 0.5);
    assert.equal(contact.tracks.attacker.parts.nearForearm, 'grip');
    assert.equal(contact.tracks.attacker.pose.lArm, 0, 'partial keyframes inherit authored channels');
});

test('event interval is deterministic and does not double-fire its left boundary', () => {
    const clip = compileClip(clipSource);
    assert.deepEqual(eventsBetween(clip, 0, 0.5).map(event => event.type), ['contact']);
    assert.deepEqual(eventsBetween(clip, 0.5, 0.75).map(event => event.type), ['impact']);
});

test('runtime keeps paired tracks synchronized and resets part variants on completion', () => {
    const seen = [];
    const variantCalls = [];
    const attacker = {
        pose: {},
        skeleton: { setPartVariants: selection => variantCalls.push({ ...selection }) },
    };
    const defender = { x: 0 };
    const runtime = new MoveRuntime({ onEvent: event => seen.push(event.type) });
    runtime.register(clipSource);
    runtime.play('test-grapple', { attacker, defender });
    runtime.update(0.5);
    assert.equal(attacker.pose.lean, 1);
    assert.equal(defender.x, 15);
    assert.equal(variantCalls.at(-1).nearForearm, 'grip');
    runtime.update(0.5);
    assert.deepEqual(seen, ['contact', 'impact']);
    assert.deepEqual(variantCalls.at(-1), {}, 'completion clears stranded appearance swaps');
});

test('invalid clips fail before they reach gameplay', () => {
    const result = validateClip({ id: 'bad', duration: 1, tracks: { attacker: { keyframes: [{ at: 2 }] } } });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(error => error.includes('outside the clip')));
});

test('a handler that cancels a later clip stops it in the same update', () => {
    // Regression: one clip's event cancels another (e.g. a jab impact makes the
    // defender sell, cancelling the defender's own in-flight jab). The cancelled
    // clip — visited later in the same iteration — must not advance or emit.
    const cancelSource = { id: 'canceller', duration: 1,
        tracks: { a: { keyframes: [{ at: 0, pose: { v: 0 } }] } },
        events: [{ at: 0.05, type: 'cancel-other' }] };
    let victimSamples = 0;
    const victimBinding = { applyAnimationSample: () => { victimSamples++; } };
    const victimSource = { id: 'victim', duration: 1,
        tracks: { a: { keyframes: [{ at: 0, pose: { v: 0 } }] } },
        events: [{ at: 0.09, type: 'should-not-fire' }] };

    let victimEvents = 0;
    const runtime = new MoveRuntime({ onEvent: e => { if (e.type === 'should-not-fire') victimEvents++; } });
    runtime.register(cancelSource);
    runtime.register(victimSource);
    // Play the canceller FIRST so it's visited first in the update iteration
    // and cancels the victim before the victim's own turn comes up.
    let victim;
    runtime.play('canceller', { a: {} }, { onEvent: e => { if (e.type === 'cancel-other') runtime.cancel(victim); } });
    victim = runtime.play('victim', { a: victimBinding });

    victimSamples = 0; // ignore the initial play() apply
    runtime.update(0.1); // crosses both events; canceller fires first and cancels victim
    assert.equal(victimEvents, 0, 'cancelled clip must not emit its event');
    assert.equal(victimSamples, 0, 'cancelled clip must not be sampled after cancellation');
});
