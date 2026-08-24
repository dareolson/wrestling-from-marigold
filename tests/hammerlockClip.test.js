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
    HAMMERLOCK_STAGING,
} from '../src/animation/clips/hammerlock.js';
import Wrestler, { POSES } from '../src/Wrestler.js';

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

test('both actor tracks sample synchronously and say different things', () => {
    const clip = compileClip(hammerlockClip);

    // Entry: both start in the shared lockup tie-up, so the two tracks agree.
    const entry = sampleClip(clip, 0);
    assert.equal(entry.tracks.attacker.pose.lArm, 1.57);
    assert.equal(entry.tracks.defender.pose.lArm, 1.57);

    // From the catch on they must NOT agree: one wrestler is cranking an arm
    // and the other is being folded, at the same clip time. Asserting they
    // differ is the paired property; asserting a specific angle would just
    // re-state whatever the solver last produced.
    for (const at of [HAMMERLOCK_CONTACT_AT, HAMMERLOCK_DEF_SET_AT, HAMMERLOCK_DURATION]) {
        const frame = sampleClip(clip, at);
        assert.notEqual(frame.tracks.attacker.pose.lArm, frame.tracks.defender.pose.lArm,
            `the two roles read identically at ${at}s`);
    }

    // The trapped arm is folded and stays folded through the crank.
    const set = sampleClip(clip, HAMMERLOCK_DEF_SET_AT);
    const release = sampleClip(clip, HAMMERLOCK_DURATION);
    assert.ok(set.tracks.defender.pose.lElbow > 1.5, `defender elbow is folded at the set (${set.tracks.defender.pose.lElbow})`);
    assert.ok(release.tracks.defender.pose.lElbow >= set.tracks.defender.pose.lElbow,
        'the trapped arm is cranked further, never let out');
});

test('arbitrary-time sampling is deterministic across every named phase', () => {
    const clip = compileClip(hammerlockClip);
    for (const at of Object.values(HAMMERLOCK_PHASES)) {
        assert.deepEqual(sampleClip(clip, at), sampleClip(clip, at));
    }
    // The crank works the gripping arm progressively: the elbow folds from the
    // catch through the set to the release as the trapped wrist is driven up
    // the back. (The angles themselves are solved geometry — see
    // hammerlock.tracks.js — so what is asserted is the direction of the work,
    // not a literal.)
    const elbowAt = t => sampleClip(clip, t).tracks.attacker.pose.lElbow;
    assert.ok(elbowAt(HAMMERLOCK_PHASES.reach) < elbowAt(HAMMERLOCK_PHASES.set));
    assert.ok(elbowAt(HAMMERLOCK_PHASES.set) < elbowAt(HAMMERLOCK_PHASES.release));
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

// A tween "manager" that actually simulates progress (linear, ease ignored —
// irrelevant to the correctness properties under test) instead of just
// recording specs. `add` still records the raw spec onto `tweenAdds` (the
// existing spec-shape assertions read that), but now returns a live handle
// with a real `.stop()`/`.remove()` so source code that retains a tween
// handle and calls `.stop()` on early cancellation can be exercised for real,
// and `scene.tweens.advance(ms)` lets a test step time forward and observe
// whether a stopped tween actually stopped moving its target.
function makeTweenManager(tweenAdds) {
    const META_KEYS = new Set(['targets', 'duration', 'ease', 'onComplete']);
    const live = [];
    return {
        add(spec) {
            tweenAdds.push(spec);
            const startValues = {};
            for (const key of Object.keys(spec)) {
                if (META_KEYS.has(key)) continue;
                startValues[key] = spec.targets[key];
            }
            const entry = { spec, startValues, elapsed: 0, stopped: false };
            const handle = {
                stop()   { entry.stopped = true; },
                remove() { entry.stopped = true; },
            };
            live.push(entry);
            return handle;
        },
        killTweensOf: () => {},
        advance(ms) {
            for (const entry of live) {
                if (entry.stopped) continue;
                entry.elapsed = Math.min(entry.spec.duration, entry.elapsed + ms);
                const t = entry.spec.duration > 0 ? entry.elapsed / entry.spec.duration : 1;
                for (const [key, from] of Object.entries(entry.startValues)) {
                    entry.spec.targets[key] = from + (entry.spec[key] - from) * t;
                }
                if (entry.elapsed >= entry.spec.duration) {
                    entry.stopped = true;
                    entry.spec.onComplete?.();
                }
            }
        },
    };
}

function makeScene() {
    const runtime = new MoveRuntime();
    runtime.register(hammerlockClip);
    const scene = {
        moveRuntime: runtime,
        tweenAdds: [],
        timerCalls: 0,
        // The migrated paired path must schedule NO delayed callbacks — any call
        // here is a regression back toward the old delayedCall(300/1400) timing.
        time: { delayedCall: () => { scene.timerCalls++; } },
        _logEvent: () => {},
    };
    scene.tweens = makeTweenManager(scene.tweenAdds);
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
        // Staged placement writes x/y and zeroes walk velocity, and reads `s`
        // as the perspective scale (undefined falls back to 1 in captureOrigin,
        // which is what these unit fixtures want).
        vx: 0,
        vy: 0,
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

test('the clip — not the executor — owns staging, and places both actors on the authored tableau', () => {
    for (const facing of [1, -1]) {
        const { scene, atk, def, runtime } = pair({ facing });
        const originX = atk.x;
        const originY = atk.y;
        atk._doHammerlock(def);

        // ONE owner. The executor used to add two position tweens here; a clip
        // that authors transform takes ownership instead, and the two can never
        // both be live (src/animation/clipStaging.js, OWNERSHIP).
        const positionTweens = scene.tweenAdds.filter(spec => (spec.targets === atk || spec.targets === def) && 'x' in spec);
        assert.equal(positionTweens.length, 0, 'the executor must not also move the wrestlers');
        const staging = atk._activeMove.staging;
        assert.ok(staging, 'a transform-authoring clip captures a staging frame');
        assert.equal(staging.anchorRole, 'attacker');
        assert.equal(staging.facing, facing);

        // t=0 PLACES both actors at the authored entry tableau, from the ONE
        // shared origin — the attacker's position at commitment.
        const placed = (offset) => originX + facing * offset.x * (atk.s ?? 1);
        assert.equal(atk.x, placed(HAMMERLOCK_STAGING.attackerEntry));
        assert.equal(def.x, placed(HAMMERLOCK_STAGING.defenderEntry));
        assert.equal(def.y, originY, 'the pair is squared onto one depth line');

        // …and the working tableau is reached by the time the defender is set.
        advance(runtime, HAMMERLOCK_DEF_SET_AT + 0.02);
        assert.ok(Math.abs(atk.x - placed(HAMMERLOCK_STAGING.attackerWork)) < 1);
        assert.equal(def.x, placed(HAMMERLOCK_STAGING.defenderWork));
        // Defender stays ahead on the attacker's facing in BOTH facings — the
        // property a screen-space offset would break when mirrored.
        assert.equal(Math.sign(def.x - atk.x), facing);
    }
});

test('the staged tableau is identical from every trigger distance', () => {
    // The shared-origin guarantee, at the executor level: the defender's launch
    // position must not be able to leak into the authored geometry.
    const separations = new Set();
    for (const defX of [420, 500, 520, 560, 640]) {
        const { atk, def, runtime } = pair({ atkX: 470, defX });
        atk._doHammerlock(def);
        advance(runtime, HAMMERLOCK_DEF_SET_AT + 0.02);
        separations.add(`${(def.x - atk.x).toFixed(9)}|${(def.y - atk.y).toFixed(9)}`);
    }
    assert.equal(separations.size, 1, `trigger distance leaked into the tableau: ${[...separations].join(' / ')}`);
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

// ── Position ownership on cancellation ────────────────────────────────────────

test('cancelling mid-staging leaves both actors exactly where the last owned frame put them', () => {
    // The old executor kept two retained tween handles so a cancel could stop
    // them before they slid a wrestler into an abandoned stance. Clip staging
    // removes the hazard rather than handling it: every frame is an ABSOLUTE
    // placement, so the frame after the handle dies is simply the last frame it
    // wrote, and nothing is left in flight to keep moving.
    const { scene, atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, 0.10); // genuinely mid-approach — the defender is still travelling
    const atkAtCancel = atk.x;
    const defAtCancel = def.x;
    assert.ok(Math.abs(defAtCancel - (atk.x + HAMMERLOCK_STAGING.defenderWork.x)) > 1,
        'sanity: the defender has not finished its approach yet');

    runtime.cancel(atk._activeMove, 'test');
    advance(runtime, HAMMERLOCK_DURATION);
    scene.tweens.advance(1000);

    assert.equal(atk.x, atkAtCancel, 'attacker stops where the hold left it');
    assert.equal(def.x, defAtCancel, 'defender stops where the hold left it');
});

test('a completed hold leaves nobody drifting either', () => {
    const { scene, atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, HAMMERLOCK_DURATION + 0.05);
    const atkAtEnd = atk.x;
    const defAtEnd = def.x;
    advance(runtime, 1.0);
    scene.tweens.advance(1000);
    assert.equal(atk.x, atkAtEnd);
    assert.equal(def.x, defAtEnd);
    // Walk velocity is zeroed by every staged frame, so the frame after the
    // clip releases starts from rest rather than resuming a stale ramp.
    assert.equal(atk.vx, 0);
    assert.equal(def.vx, 0);
});

// ── Partner recovery on pose-claim interruption ─────────────────────────────────

test('interruption THROUGH the attacker: attacker keeps its new pose, defender recovers to its OWN idle, no completion-only damage', () => {
    const { scene, atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, HAMMERLOCK_DRAIN_AT + 0.05); // set drain (10) already applied
    assert.equal(def.stamina, 90);
    scene.tweenAdds.length = 0; // isolate what happens at the moment of interruption

    atk.tweenPose('sellChest', 120, 'Linear');

    const atkTween = scene.tweenAdds.find(t => t.targets === atk.pose);
    assert.ok(atkTween, 'attacker gets its newly requested tween');
    assert.equal(atkTween.duration, 120);
    assert.equal(atkTween.lArm, POSES.sellChest.lArm, 'attacker keeps the claimed pose, not idle');
    assert.equal(scene.tweenAdds.filter(t => t.targets === atk.pose).length, 1, 'attacker pose tween never double-fires');

    const defTween = scene.tweenAdds.find(t => t.targets === def.pose);
    assert.ok(defTween, 'defender gets a recovery tween instead of being left stranded');
    assert.equal(defTween.lArm, POSES[def.idlePose].lArm, 'defender recovers toward its OWN configured idle');
    assert.equal(scene.tweenAdds.filter(t => t.targets === def.pose).length, 1, 'defender recovery never double-fires');

    advance(runtime, HAMMERLOCK_DURATION);
    assert.equal(def.stamina, 90, 'no release drain lands on an interrupted hold');
});

test('interruption THROUGH the defender: defender keeps its new pose, attacker recovers to its OWN idle, no completion-only damage', () => {
    const { scene, atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, HAMMERLOCK_DRAIN_AT + 0.05);
    assert.equal(def.stamina, 90);
    scene.tweenAdds.length = 0;

    def.tweenPose('sellChest', 120, 'Linear');

    const defTween = scene.tweenAdds.find(t => t.targets === def.pose);
    assert.ok(defTween, 'defender gets its newly requested tween');
    assert.equal(defTween.lArm, POSES.sellChest.lArm, 'defender keeps the claimed pose, not idle');
    assert.equal(scene.tweenAdds.filter(t => t.targets === def.pose).length, 1);

    const atkTween = scene.tweenAdds.find(t => t.targets === atk.pose);
    assert.ok(atkTween, 'attacker gets a recovery tween instead of being left stranded');
    assert.equal(atkTween.lArm, POSES[atk.idlePose].lArm, 'attacker recovers toward its OWN configured idle');
    assert.equal(scene.tweenAdds.filter(t => t.targets === atk.pose).length, 1);

    advance(runtime, HAMMERLOCK_DURATION);
    assert.equal(def.stamina, 90, 'no release drain lands on an interrupted hold');
});

test('cancelTarget and shutdown do not know a pose-claim initiator, so neither wrestler gets a phantom recovery tween', () => {
    for (const trigger of ['cancelTarget', 'shutdown']) {
        const { scene, atk, def, runtime } = pair();
        atk._doHammerlock(def);
        advance(runtime, 0.6);
        scene.tweenAdds.length = 0;
        if (trigger === 'cancelTarget') runtime.cancelTarget(atk, 'test');
        else runtime.shutdown();
        assert.equal(scene.tweenAdds.filter(t => t.targets === atk.pose || t.targets === def.pose).length, 0,
            `${trigger} must not start any pose recovery tween for either wrestler`);
    }
});

test('shutdown mid-hammerlock never starts a recovery tween (idempotent, no leftover animation)', () => {
    const { scene, atk, def, runtime } = pair();
    atk._doHammerlock(def);
    advance(runtime, 0.6);
    scene.tweenAdds.length = 0;
    runtime.shutdown();
    assert.doesNotThrow(() => runtime.shutdown()); // idempotent
    assert.equal(scene.tweenAdds.length, 0);
    assert.equal(atk.state, 'standing');
    assert.equal(def.state, 'standing');
});
