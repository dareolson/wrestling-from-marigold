import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip, validateClip, eventsBetween } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import {
    hammerlockClip,
    HAMMERLOCK_DURATION,
    HAMMERLOCK_CONTACT_AT,
    HAMMERLOCK_DRAIN_AT,
    HAMMERLOCK_RELEASE_AT,
    HAMMERLOCK_DEF_SET_AT,
    HAMMERLOCK_PHASES,
} from '../src/animation/clips/hammerlock.js';
import Wrestler from '../src/Wrestler.js';

// ── Pure clip / runtime tests (no Wrestler) ────────────────────────────────────

// Minimal binding for a role: records every part-variant selection, uses the
// runtime's generic pose/parts fallback (no applyAnimationSample).
function fakeActor() {
    const variantCalls = [];
    return {
        pose: {},
        skeleton: { setPartVariants: sel => variantCalls.push({ ...sel }) },
        variantCalls,
    };
}

test('hammerlock clip passes validation and compiles', () => {
    const result = validateClip(hammerlockClip);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.doesNotThrow(() => compileClip(hammerlockClip));
});

test('both actor tracks sample synchronously at the same clip time', () => {
    const clip = compileClip(hammerlockClip);

    // Entry: both start in the shared lockup tie-up.
    const entry = sampleClip(clip, 0);
    assert.equal(entry.tracks.attacker.pose.lArm, 1.57);
    assert.equal(entry.tracks.defender.pose.lArm, 1.57);

    // By the defender's set time the trapped stance is fully in (armBarDefender:
    // lArm -0.60, rArm 0.90) while the attacker is mid wind-up between reach and
    // turn — proving the two tracks advance together but say different things.
    const set = sampleClip(clip, HAMMERLOCK_DEF_SET_AT);
    assert.equal(set.tracks.defender.pose.lArm, -0.60);
    assert.equal(set.tracks.defender.pose.rArm, 0.90);
    assert.ok(set.tracks.attacker.pose.lArm > 0.42 && set.tracks.attacker.pose.lArm < 1.32);

    // Release: attacker cranked (lArm 2.18), defender held in the trapped stance.
    const rel = sampleClip(clip, HAMMERLOCK_DURATION);
    assert.equal(rel.tracks.attacker.pose.lArm, 2.18);
    assert.equal(rel.tracks.defender.pose.lArm, -0.60);
});

test('arbitrary-time sampling is deterministic across every named phase', () => {
    const clip = compileClip(hammerlockClip);
    for (const at of Object.values(HAMMERLOCK_PHASES)) {
        assert.deepEqual(sampleClip(clip, at), sampleClip(clip, at));
    }
    // The attacker arm monotonically loads from reach through the set (0.78 ->
    // 1.92) before the crank flattens it — spot-check the blend is moving.
    const armAt = t => sampleClip(clip, t).tracks.attacker.pose.lArm;
    assert.ok(armAt(HAMMERLOCK_PHASES.reach) < armAt(HAMMERLOCK_PHASES.set));
});

test('the three markers are authored in order at their preserved times', () => {
    const clip = compileClip(hammerlockClip);
    const all = eventsBetween(clip, -1, HAMMERLOCK_DURATION).map(e => e.type);
    assert.deepEqual(all, ['acquire-contact', 'apply-drain', 'release-contact']);
    assert.equal(HAMMERLOCK_CONTACT_AT, 0.120);
    assert.equal(HAMMERLOCK_DRAIN_AT, 0.300);
    assert.equal(HAMMERLOCK_RELEASE_AT, 1.400);
});

for (const hz of [30, 60, 120]) {
    test(`each marker fires exactly once, in order, when stepped at ${hz} Hz`, () => {
        const seen = [];
        const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
        runtime.register(hammerlockClip);
        runtime.play('hammerlock', { attacker: fakeActor(), defender: fakeActor() });
        const dt = 1 / hz;
        for (let t = 0; t < HAMMERLOCK_DURATION + dt; t += dt) runtime.update(dt);
        assert.deepEqual(seen, ['acquire-contact', 'apply-drain', 'release-contact'],
            `saw: ${seen.join(', ')}`);
    });
}

test('preview seeking never emits a marker (no damage from inspection)', () => {
    let events = 0;
    const runtime = new MoveRuntime({ onEvent: () => events++ });
    runtime.register(hammerlockClip);
    const handle = runtime.play('hammerlock', { attacker: fakeActor(), defender: fakeActor() });
    for (const at of Object.values(HAMMERLOCK_PHASES)) runtime.seek(handle, at);
    runtime.seek(handle, HAMMERLOCK_DURATION);
    assert.equal(events, 0);
});

test('a cancelled hold never reaches its later markers', () => {
    const seen = [];
    const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
    runtime.register(hammerlockClip);
    const handle = runtime.play('hammerlock', { attacker: fakeActor(), defender: fakeActor() });
    runtime.update(HAMMERLOCK_DRAIN_AT + 0.02); // crosses acquire-contact + apply-drain
    runtime.cancel(handle);
    runtime.update(HAMMERLOCK_DURATION); // would cross release-contact if still live
    assert.deepEqual(seen, ['acquire-contact', 'apply-drain']);
});

test('completion clears part variants on both actors', () => {
    const attacker = fakeActor();
    const defender = fakeActor();
    const runtime = new MoveRuntime();
    runtime.register(hammerlockClip);
    runtime.play('hammerlock', { attacker, defender });
    runtime.update(HAMMERLOCK_DURATION + 0.01);
    assert.deepEqual(attacker.variantCalls.at(-1), {});
    assert.deepEqual(defender.variantCalls.at(-1), {});
});

// ── Integration: the real _doHammerlock on the real prototype ──────────────────
// These build wrestlers on Wrestler.prototype (like jabClip.test.js's
// applyAnimationSample test) so the ACTUAL migrated executor, its paired-handle
// binding, releaseHold cleanup, and the real tweenPose/_cancelActiveMove
// interruption seam all run — just without a live Phaser Scene.

function makeScene() {
    const runtime = new MoveRuntime();
    runtime.register(hammerlockClip);
    const scene = {
        moveRuntime: runtime,
        tweenAdds: [],
        timerCalls: 0,
        tweens: {
            add: spec => { scene.tweenAdds.push(spec); return spec; },
            killTweensOf: () => {},
        },
        // The migrated paired path must schedule NO delayed callbacks — any call
        // here is a regression back toward the old delayedCall(300/1400) timing.
        time: { delayedCall: () => { scene.timerCalls++; } },
        _logEvent: () => {},
    };
    return scene;
}

function makeWrestler(scene, { facing = 1, x = 480, idlePose = 'theszIdle' } = {}) {
    return Object.assign(Object.create(Wrestler.prototype), {
        scene,
        state: 'lockup',
        facing,
        x,
        y: 360,
        stamina: 100,
        pose: {},
        idlePose,
        skeleton: { setPartVariants() {} },
        _activeMove: null,
        _fixedHold: false,
    });
}

function pair(opts = {}) {
    const scene = makeScene();
    const atk = makeWrestler(scene, { facing: opts.facing ?? 1, x: opts.atkX ?? 470, idlePose: 'theszIdle' });
    const def = makeWrestler(scene, { facing: -(opts.facing ?? 1), x: opts.defX ?? 520, idlePose: 'powerIdle' });
    return { scene, atk, def, runtime: scene.moveRuntime };
}

// Advance the runtime by `seconds` in ~60Hz steps (marker emission is
// frame-boundary sensitive, so step rather than jump).
function advance(runtime, seconds, dt = 1 / 60) {
    for (let t = 0; t < seconds; t += dt) runtime.update(Math.min(dt, seconds - t));
}

test('commitment: both holding, fixed-hold set, attacker paid, no timers scheduled', () => {
    const { scene, atk, def } = pair();
    atk._doHammerlock(def);
    assert.equal(atk.state, 'holding');
    assert.equal(def.state, 'holding');
    assert.equal(def.facing, atk.facing, 'defender faces attacker');
    assert.equal(atk._fixedHold, true);
    assert.equal(def._fixedHold, true);
    assert.equal(atk.stamina, 97, 'attacker paid the 3 commitment cost');
    assert.equal(def.stamina, 100, 'no defender drain yet');
    assert.equal(scene.timerCalls, 0, 'no delayedCall scheduled by the migrated path');
    // Both actors share ONE handle.
    assert.ok(atk._activeMove && atk._activeMove === def._activeMove);
});

test('staging is ring-clamped and offset by facing (P1/P2 + both facings)', () => {
    for (const facing of [1, -1]) {
        const { scene, atk, def } = pair({ facing });
        atk._doHammerlock(def);
        const defTween = scene.tweenAdds.find(t => t.targets === def);
        const atkTween = scene.tweenAdds.find(t => t.targets === atk);
        assert.ok(defTween && atkTween, 'both bodies get a staging tween');
        // Defender staged ahead on the attacker's facing side; attacker steps in
        // behind it (toward the attacker's start), so their offset has the sign
        // of the facing.
        assert.equal(Math.sign(defTween.x - atkTween.x), facing);
    }
});

test('natural completion: both drains applied, both recovered to their own idle', () => {
    const { scene, atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, HAMMERLOCK_DURATION + 0.05);
    assert.equal(atk.state, 'standing');
    assert.equal(def.state, 'standing');
    assert.equal(atk._fixedHold, false);
    assert.equal(def._fixedHold, false);
    assert.equal(atk._activeMove, null);
    assert.equal(def._activeMove, null);
    assert.equal(atk.stamina, 97, 'attacker only paid commitment');
    assert.equal(def.stamina, 100 - 10 - 4, 'defender took set drain (10) + release drain (4)');
    // Recovery is executor-owned: a 220ms tween toward each character's OWN idle.
    const recoverTweens = scene.tweenAdds.filter(t => t.duration === 220);
    assert.equal(recoverTweens.length, 2, 'both wrestlers settle to idle');
});

test('cancellation before contact: no drains, clean legal teardown, no later damage', () => {
    const { atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, HAMMERLOCK_CONTACT_AT - 0.02); // before the reach/contact frame
    runtime.cancel(atk._activeMove, 'test');
    advance(runtime, HAMMERLOCK_DURATION); // would cross both drains if still live
    assert.equal(atk.state, 'standing');
    assert.equal(def.state, 'standing');
    assert.equal(atk._fixedHold, false);
    assert.equal(def._fixedHold, false);
    assert.equal(atk._activeMove, null);
    assert.equal(def._activeMove, null);
    assert.equal(def.stamina, 100, 'interrupted before contact -> no defender drain ever');
});

test('cancellation during the working hold: set drain kept, release drain never lands', () => {
    const { atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, HAMMERLOCK_DRAIN_AT + 0.05); // past the set drain, deep in the crank
    assert.equal(def.stamina, 90, 'set drain (10) already applied');
    runtime.cancel(atk._activeMove, 'test');
    advance(runtime, HAMMERLOCK_DURATION);
    assert.equal(def.stamina, 90, 'no release drain on an interrupted hold');
    assert.equal(atk.state, 'standing');
    assert.equal(def.state, 'standing');
    assert.equal(atk._fixedHold, false);
    assert.equal(def._fixedHold, false);
});

test('interruption THROUGH the attacker (its pose claimed) tears down the pair', () => {
    const { atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, 0.6);
    // The real seam: something makes the attacker take a new stance.
    atk.tweenPose('sellChest', 120, 'Linear');
    assert.equal(atk._activeMove, null);
    assert.equal(def._activeMove, null, 'defender handle cleared too');
    assert.equal(def.state, 'standing');
    assert.equal(def._fixedHold, false);
    advance(runtime, HAMMERLOCK_DURATION); // nothing should keep advancing/draining
    assert.equal(def.stamina, 90, 'only the pre-cancel set drain');
});

test('interruption THROUGH the defender (its pose claimed) tears down the pair', () => {
    const { atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, 0.6);
    def.tweenPose('sellChest', 120, 'Linear');
    assert.equal(def._activeMove, null);
    assert.equal(atk._activeMove, null, 'attacker handle cleared too');
    assert.equal(atk.state, 'standing');
    assert.equal(atk._fixedHold, false);
});

test('cancelTarget on either bound actor cancels the shared move', () => {
    for (const who of ['attacker', 'defender']) {
        const { atk, def, runtime } = pair();
        atk._doHammerlock(def);
        advance(runtime, 0.6);
        runtime.cancelTarget(who === 'attacker' ? atk : def, 'test');
        assert.equal(atk._activeMove, null);
        assert.equal(def._activeMove, null);
        assert.equal(atk.state, 'standing');
        assert.equal(def.state, 'standing');
    }
});

test('shutdown cancels an active hammerlock and leaves both actors legal', () => {
    const { atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, 0.6);
    runtime.shutdown();
    assert.equal(atk.state, 'standing');
    assert.equal(def.state, 'standing');
    assert.equal(atk._fixedHold, false);
    assert.equal(def._fixedHold, false);
    assert.equal(atk._activeMove, null);
    assert.equal(def._activeMove, null);
});

test('re-entrant cleanup is idempotent (recovery pose-claim cannot double-fire)', () => {
    // Natural completion's releaseHold calls tweenPose, which routes back into
    // _cancelActiveMove; the guard must make that a no-op, not a second teardown.
    const { scene, atk, def, runtime } = pair();
    atk._doHammerlock(def);
    let cancels = 0;
    const realCancel = runtime.cancel.bind(runtime);
    runtime.cancel = (h, r) => { cancels++; return realCancel(h, r); };
    advance(runtime, HAMMERLOCK_DURATION + 0.05);
    assert.equal(cancels, 0, 'natural completion never routes through cancel');
    assert.equal(def.stamina, 100 - 14);
    assert.equal(scene.timerCalls, 0);
});
