import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { jabClip, JAB_DURATION, JAB_IMPACT_AT } from '../src/animation/clips/jab.js';
import Wrestler from '../src/Wrestler.js';

// A stand-in for the wrestler binding: records every appearance selection so we
// can prove the fist swaps in and resets. Damage is modelled the way gameplay
// does it — applied only from the authored impact marker's handler.
function fakeAttacker() {
    const variantCalls = [];
    return {
        pose: {},
        skeleton: { setPartVariants: sel => variantCalls.push({ ...sel }) },
        variantCalls,
    };
}

test('jab clip passes validation and compiles', () => {
    const result = validateClip(jabClip);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.doesNotThrow(() => compileClip(jabClip));
});

test('arbitrary-time sampling is deterministic and blends the authored stance', () => {
    const clip = compileClip(jabClip);
    // Exactly at the impact keyframe: fully-cocked stance, fist swapped in.
    const impact = sampleClip(clip, JAB_IMPACT_AT).tracks.attacker;
    assert.equal(impact.pose.lArm, -0.55);
    assert.equal(impact.parts.strikingForearm, 'fist');
    // Blends between cock (0.083, lArm -0.55) and extension (0.150, lArm 1.00).
    const mid = sampleClip(clip, (0.083 + 0.150) / 2).tracks.attacker.pose.lArm;
    assert.ok(mid > -0.55 && mid < 1.0, 'arm extends forward between keyframes');
    // Same time -> identical output, every time.
    assert.deepEqual(sampleClip(clip, 0.2), sampleClip(clip, 0.2));
    // Recovery lands back on the neutral standing stance.
    const rest = sampleClip(clip, JAB_DURATION).tracks.attacker.pose;
    assert.deepEqual(rest, { lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lean: 0, crouch: 0 });
});

for (const hz of [30, 60, 120]) {
    test(`impact fires exactly once when stepped at ${hz} Hz`, () => {
        let impacts = 0;
        const runtime = new MoveRuntime({ onEvent: e => { if (e.type === 'impact') impacts++; } });
        runtime.register(jabClip);
        runtime.play('jab', { attacker: fakeAttacker() });
        const dt = 1 / hz;
        for (let t = 0; t < JAB_DURATION + dt; t += dt) runtime.update(dt);
        assert.equal(impacts, 1);
    });
}

test('seeking through the impact frame never emits it (no damage from previews)', () => {
    let impacts = 0;
    const runtime = new MoveRuntime({ onEvent: e => { if (e.type === 'impact') impacts++; } });
    runtime.register(jabClip);
    const handle = runtime.play('jab', { attacker: fakeAttacker() });
    runtime.seek(handle, JAB_IMPACT_AT + 0.05);
    runtime.seek(handle, JAB_DURATION);
    assert.equal(impacts, 0);
});

test('cancellation before impact causes no damage and no later impact', () => {
    const runtime = new MoveRuntime();
    runtime.register(jabClip);
    let damage = 0;
    const handle = runtime.play('jab', { attacker: fakeAttacker() },
        { onEvent: e => { if (e.type === 'impact') damage++; } });
    runtime.update(0.05); // still before the 0.083 impact
    runtime.cancel(handle);
    runtime.update(0.30); // would cross the impact if the clip were still live
    assert.equal(damage, 0);
});

test('cancellation after impact does not double-apply damage', () => {
    const runtime = new MoveRuntime();
    runtime.register(jabClip);
    let damage = 0;
    const handle = runtime.play('jab', { attacker: fakeAttacker() },
        { onEvent: e => { if (e.type === 'impact') damage++; } });
    runtime.update(0.10); // crosses 0.083 -> impact once
    assert.equal(damage, 1);
    runtime.cancel(handle);
    runtime.update(0.30);
    assert.equal(damage, 1);
});

test('appearance resets to base after natural completion', () => {
    const attacker = fakeAttacker();
    const runtime = new MoveRuntime();
    runtime.register(jabClip);
    runtime.play('jab', { attacker });
    runtime.update(JAB_DURATION + 0.01);
    assert.deepEqual(attacker.variantCalls.at(-1), {}, 'completion clears any stranded fist');
});

test('appearance resets to base after cancellation', () => {
    const attacker = fakeAttacker();
    const runtime = new MoveRuntime();
    runtime.register(jabClip);
    const handle = runtime.play('jab', { attacker });
    runtime.update(0.12); // fist is showing here
    assert.equal(attacker.variantCalls.some(c => c.strikingForearm === 'fist'), true);
    runtime.cancel(handle);
    assert.deepEqual(attacker.variantCalls.at(-1), {}, 'cancellation clears the fist');
});

test('shutdown cancels active jab handles and clears the registry', () => {
    const attacker = fakeAttacker();
    const runtime = new MoveRuntime();
    runtime.register(jabClip);
    runtime.play('jab', { attacker });
    runtime.shutdown();
    assert.deepEqual(attacker.variantCalls.at(-1), {}, 'shutdown resets appearance');
    assert.throws(() => runtime.play('jab', { attacker }), /Unknown animation clip/);
});

// ── striking-forearm resolution (the facing seam, tested without a live Scene) ──

test('the semantic strikingForearm slot maps to near/far by facing', () => {
    const resolve = (facing, parts) => Wrestler.prototype._resolveVariantSlots.call({ facing }, parts);
    assert.deepEqual(resolve(1, { strikingForearm: 'fist' }), { nearForearm: 'fist' });
    assert.deepEqual(resolve(-1, { strikingForearm: 'fist' }), { farForearm: 'fist' });
    // Non-semantic slots pass straight through.
    assert.deepEqual(resolve(1, { head: 'hurt' }), { head: 'hurt' });
});

test('applyAnimationSample merges authored channels and preserves the rest', () => {
    const setCalls = [];
    // Real prototype so applyAnimationSample can reach _resolveVariantSlots,
    // but no Scene/Phaser is constructed.
    const self = Object.assign(Object.create(Wrestler.prototype), {
        facing: 1,
        pose: { lArm: 0, lForearm: 0.8 },
        skeleton: { setPartVariants: sel => setCalls.push(sel) },
    });
    self.applyAnimationSample({ pose: { lArm: 1.0 }, parts: { strikingForearm: 'fist' } });
    assert.equal(self.pose.lArm, 1.0, 'authored channel written');
    assert.equal(self.pose.lForearm, 0.8, 'unauthored extended channel preserved');
    assert.deepEqual(setCalls.at(-1), { nearForearm: 'fist' });
});
