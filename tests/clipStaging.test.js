import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { captureStagingContext, pickAnchorRole, stagedWorldPoint } from '../src/animation/clipStaging.js';
import {
    stagingProofClip,
    STAGING_PROOF_CLIP_ID,
    STAGING_PROOF_DURATION,
    STAGING_PROOF_CONTACT_AT,
    STAGING_PROOF_STEP_AT,
    STAGING_PROOF_OFFSETS,
} from '../src/animation/clips/stagingProof.js';
import { hammerlockClip } from '../src/animation/clips/hammerlock.js';
import { jabClip } from '../src/animation/clips/jab.js';
import Wrestler from '../src/Wrestler.js';
import { ringBoundsAtY, perspectiveScale } from '../src/constants.js';

// Real Wrestler instances — real `s` getter, real `_clamp`, real
// applyAnimationSample. Only the Phaser-facing scene surface is stubbed, so
// what these tests exercise is the production transport, not a model of it.
function makeScene() {
    const runtime = new MoveRuntime();
    runtime.register(stagingProofClip);
    return {
        moveRuntime: runtime,
        time: { now: 0, delayedCall: () => {} },
        tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} },
        _logEvent: () => {},
    };
}

function makeWrestler(scene, { facing = 1, x = 480, y = 360 } = {}) {
    const variantCalls = [];
    return Object.assign(Object.create(Wrestler.prototype), {
        scene,
        state: 'holding',
        facing,
        x,
        y,
        vx: 0,
        vy: 0,
        stamina: 100,
        pose: {},
        idlePose: 'idle',
        skeleton: { setPartVariants: selection => variantCalls.push({ ...selection }) },
        _activeMove: null,
        variantCalls,
    });
}

function pair(scene, opts = {}) {
    const atk = makeWrestler(scene, { facing: opts.facing ?? 1, x: opts.atkX ?? 470, y: opts.y ?? 360 });
    const def = makeWrestler(scene, { facing: -(opts.facing ?? 1), x: opts.defX ?? 540, y: opts.y ?? 360 });
    return { atk, def };
}

function advance(runtime, seconds, dt = 1 / 60) {
    for (let t = 0; t < seconds; t += dt) runtime.update(Math.min(dt, seconds - t));
}

// ── Compile-time ownership flag ───────────────────────────────────────────────

test('authorsTransform is set only for tracks that actually author transform channels', () => {
    const proof = compileClip(stagingProofClip);
    assert.equal(proof.authorsTransform, true);
    assert.equal(proof.tracks.attacker.authorsTransform, true);
    assert.equal(proof.tracks.defender.authorsTransform, true);

    // The shipped gameplay clips author no transforms: their executors still own
    // staging. This is the regression guard for "two owners can never fight".
    const hammerlock = compileClip(hammerlockClip);
    assert.equal(hammerlock.authorsTransform, false);
    assert.equal(compileClip(jabClip).authorsTransform, false);
});

test('a clip that authors no transform gets no staging context at all', () => {
    const scene = makeScene();
    scene.moveRuntime.register(hammerlockClip);
    const { atk, def } = pair(scene);
    const handle = scene.moveRuntime.play('hammerlock', { attacker: atk, defender: def });
    assert.equal(handle.staging, null);
});

test('a mixed clip stages only the role whose track authors transform', () => {
    const clip = compileClip({
        id: 'mixed-ownership',
        duration: 1,
        tracks: {
            attacker: { keyframes: [{ at: 0, transform: { x: 0 } }, { at: 1, transform: { x: 10 } }] },
            defender: { keyframes: [{ at: 0, pose: { lArm: 0 } }, { at: 1, pose: { lArm: 1 } }] },
        },
    });
    const staging = captureStagingContext(clip, { attacker: { x: 100, y: 200, facing: 1 }, defender: { x: 300, y: 200, facing: -1 } });
    assert.ok(staging.roles.attacker, 'transform-authoring role is staged');
    assert.equal(staging.roles.defender, undefined, 'pose-only role is left to its executor');
});

// ── Anchor selection ──────────────────────────────────────────────────────────

test('the staging axis comes from the attacker, and falls back predictably', () => {
    assert.equal(pickAnchorRole(['defender', 'attacker']), 'attacker');
    assert.equal(pickAnchorRole(['solo']), 'solo');
    assert.equal(pickAnchorRole(['thrower', 'victim']), 'thrower');
});

test('both roles share one captured axis and scale, taken from the anchor', () => {
    const scene = makeScene();
    // Deliberately different depths: the defender's own perspective scale
    // differs from the attacker's, and must NOT be used.
    const atk = makeWrestler(scene, { facing: -1, x: 500, y: 400 });
    const def = makeWrestler(scene, { facing: 1, x: 560, y: 300 });
    const handle = scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
    assert.equal(handle.staging.anchorRole, 'attacker');
    assert.equal(handle.staging.facing, -1, 'axis is the attacker facing, not the defender');
    assert.equal(handle.staging.roles.defender.facing, -1);
    assert.equal(handle.staging.roles.defender.scale, perspectiveScale(400), 'defender inherits the attacker scale');
    assert.notEqual(perspectiveScale(300), perspectiveScale(400), 'the two depths really do scale differently');
});

// ── Facing, roles, and rigid mirroring ────────────────────────────────────────

test('staging mirrors as one rigid tableau in both facings', () => {
    const geometry = {};
    for (const facing of [1, -1]) {
        const scene = makeScene();
        const { atk, def } = pair(scene, { facing, atkX: 470, defX: 470 });
        scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
        advance(scene.moveRuntime, STAGING_PROOF_CONTACT_AT);

        const scale = perspectiveScale(360);
        // Absolute placement follows facing...
        assert.ok(Math.abs(atk.x - (470 + facing * STAGING_PROOF_OFFSETS.attackerContact * scale)) < 1e-6);
        assert.ok(Math.abs(def.x - (470 + facing * STAGING_PROOF_OFFSETS.defenderContact * scale)) < 1e-6);
        // ...and the attacker is always AHEAD of the defender along its own
        // facing, in both facings. This is the property a screen-space offset
        // would break.
        assert.equal(Math.sign((atk.x - def.x) * facing), 1, `attacker leads in facing ${facing}`);
        geometry[facing] = Math.abs(atk.x - def.x);
    }
    assert.ok(Math.abs(geometry[1] - geometry[-1]) < 1e-9, 'the pair keeps identical separation when mirrored');
});

test('depth is not mirrored by facing', () => {
    for (const facing of [1, -1]) {
        const scene = makeScene();
        const { atk, def } = pair(scene, { facing });
        scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
        advance(scene.moveRuntime, STAGING_PROOF_CONTACT_AT);
        assert.ok(def.y > 360, `defender is driven toward the camera in facing ${facing}, not away`);
    }
});

test('role reversal follows the binding, not the wrestler identity', () => {
    const scene = makeScene();
    const { atk, def } = pair(scene, { facing: 1, atkX: 470, defX: 470 });
    // Bind the SAME two bodies with the roles swapped. The wrestler bound as
    // attacker gets the attacker offsets, whichever object it is.
    scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: def, defender: atk });
    advance(scene.moveRuntime, STAGING_PROOF_CONTACT_AT);
    const scale = perspectiveScale(360);
    // `def` is now the attacker, and the axis is ITS facing (-1).
    assert.ok(Math.abs(def.x - (470 - STAGING_PROOF_OFFSETS.attackerContact * scale)) < 1e-6);
    assert.ok(Math.abs(atk.x - (470 - STAGING_PROOF_OFFSETS.defenderContact * scale)) < 1e-6);
});

// ── Determinism ───────────────────────────────────────────────────────────────

test('seeking to an arbitrary time is order-independent and never accumulates', () => {
    const scene = makeScene();
    const { atk, def } = pair(scene);
    const handle = scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });

    scene.moveRuntime.seek(handle, 0.27);
    const forward = { ax: atk.x, ay: atk.y, dx: def.x, dy: def.y };

    // Reach the same time from the far end, and after a long detour.
    scene.moveRuntime.seek(handle, STAGING_PROOF_DURATION);
    scene.moveRuntime.seek(handle, 0);
    scene.moveRuntime.seek(handle, 0.51);
    scene.moveRuntime.seek(handle, 0.27);
    assert.deepEqual({ ax: atk.x, ay: atk.y, dx: def.x, dy: def.y }, forward);

    // Re-applying the same time repeatedly must not ratchet anybody anywhere.
    for (let i = 0; i < 20; i++) scene.moveRuntime.seek(handle, 0.27);
    assert.deepEqual({ ax: atk.x, ay: atk.y, dx: def.x, dy: def.y }, forward);
});

test('playing forward and seeking cold land in the same place', () => {
    const played = makeScene();
    const a = pair(played);
    played.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: a.atk, defender: a.def });
    advance(played.moveRuntime, STAGING_PROOF_CONTACT_AT);

    const sought = makeScene();
    const b = pair(sought);
    const handle = sought.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: b.atk, defender: b.def });
    sought.moveRuntime.seek(handle, STAGING_PROOF_CONTACT_AT);

    assert.ok(Math.abs(a.atk.x - b.atk.x) < 1e-9 && Math.abs(a.def.x - b.def.x) < 1e-9);
    assert.ok(Math.abs(a.def.y - b.def.y) < 1e-9);
});

// ── One frame carries pose, parts, and transform together ─────────────────────

test('pose, parts, and transform arrive on the same sampled frame', () => {
    const scene = makeScene();
    const { atk, def } = pair(scene);
    const applied = [];
    const original = Wrestler.prototype.applyAnimationSample;
    atk.applyAnimationSample = function (sample, staging) {
        original.call(this, sample, staging);
        applied.push({ time: sample.time ?? null, pose: { ...this.pose }, x: this.x, parts: { ...sample.parts } });
    };
    const handle = scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
    scene.moveRuntime.seek(handle, STAGING_PROOF_CONTACT_AT);

    const frame = applied.at(-1);
    const expected = sampleClip(compileClip(stagingProofClip), STAGING_PROOF_CONTACT_AT).tracks.attacker;
    assert.equal(frame.pose.lArm, expected.pose.lArm, 'pose from this frame');
    assert.equal(frame.parts.strikingForearm, 'fist', 'part variant from this frame');
    const scale = perspectiveScale(360);
    assert.ok(Math.abs(frame.x - (470 + STAGING_PROOF_OFFSETS.attackerContact * scale)) < 1e-6, 'transform from this frame');
    // The variant resolved through the semantic-slot mapping, facing +1.
    assert.equal(atk.variantCalls.at(-1).nearForearm, 'fist');
});

test('articulated elbow and knee channels survive the trip', () => {
    const scene = makeScene();
    const { atk, def } = pair(scene);
    const handle = scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
    scene.moveRuntime.seek(handle, STAGING_PROOF_CONTACT_AT);
    assert.equal(atk.pose.lElbow, 0.42);
    assert.equal(def.pose.rKnee, 0.48);
    // Local flex must not leave a competing legacy absolute channel behind.
    assert.equal('lForearm' in atk.pose, false);
});

// ── Ring bounds ───────────────────────────────────────────────────────────────

test('staging is clamped at the ring edge instead of pushing a wrestler through the apron', () => {
    const scene = makeScene();
    const y = 360;
    const bounds = ringBoundsAtY(y);
    // Start the attacker hard against the right rope facing out.
    const { atk, def } = pair(scene, { facing: 1, atkX: bounds.right - 22, defX: bounds.right - 22, y });
    scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
    advance(scene.moveRuntime, STAGING_PROOF_DURATION);
    assert.ok(atk.x <= ringBoundsAtY(atk.y).right - 20 + 1e-9, 'attacker stays inside the ropes');
    assert.ok(def.x <= ringBoundsAtY(def.y).right - 20 + 1e-9, 'defender stays inside the ropes');
});

// ── Completion and cancellation ───────────────────────────────────────────────

test('natural completion leaves both wrestlers parked at the final authored frame', () => {
    const scene = makeScene();
    const { atk, def } = pair(scene);
    let completed = false;
    scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def }, { onComplete: () => { completed = true; } });
    advance(scene.moveRuntime, STAGING_PROOF_DURATION + 0.1);
    assert.equal(completed, true);

    const scale = perspectiveScale(360);
    assert.ok(Math.abs(atk.x - (470 + STAGING_PROOF_OFFSETS.attackerSettle * scale)) < 1e-6);
    assert.ok(Math.abs(def.y - 360) < 1e-6, 'defender is back at its starting depth');
    assert.equal(atk.vx, 0, 'nobody is left with residual velocity');

    // And nothing moves afterwards.
    const parked = { ax: atk.x, dx: def.x };
    advance(scene.moveRuntime, 0.5);
    assert.deepEqual({ ax: atk.x, dx: def.x }, parked);
});

for (const [label, at] of [['before contact', STAGING_PROOF_STEP_AT - 0.05], ['after contact', STAGING_PROOF_CONTACT_AT + 0.08]]) {
    test(`cancellation ${label} freezes both wrestlers with no further movement`, () => {
        const scene = makeScene();
        const { atk, def } = pair(scene);
        const handle = scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
        advance(scene.moveRuntime, at);
        const frozen = { ax: atk.x, ay: atk.y, dx: def.x, dy: def.y };

        assert.equal(scene.moveRuntime.cancel(handle, 'interrupted'), true);
        assert.deepEqual({ ax: atk.x, ay: atk.y, dx: def.x, dy: def.y }, frozen, 'cancellation itself moves nobody');

        // No stale tween, no residual velocity, no further sampling: the clip is
        // simply no longer an owner of position.
        advance(scene.moveRuntime, 1.0);
        assert.deepEqual({ ax: atk.x, ay: atk.y, dx: def.x, dy: def.y }, frozen, `no post-cancellation drift (${label})`);
        assert.equal(atk.vx, 0);
        assert.equal(def.vx, 0);
    });
}

test('a cancelled clip never applies the completion frame', () => {
    const scene = makeScene();
    const { atk, def } = pair(scene);
    const handle = scene.moveRuntime.play(STAGING_PROOF_CLIP_ID, { attacker: atk, defender: def });
    advance(scene.moveRuntime, STAGING_PROOF_CONTACT_AT);
    scene.moveRuntime.cancel(handle);
    const scale = perspectiveScale(360);
    assert.ok(Math.abs(atk.x - (470 + STAGING_PROOF_OFFSETS.attackerSettle * scale)) > 1, 'not parked on the settle frame');
});

// ── Pure helper contract ──────────────────────────────────────────────────────

test('non-finite authored channels resolve to no offset rather than NaN', () => {
    const staging = { originX: 100, originY: 200, facing: 1, scale: 1 };
    assert.deepEqual(stagedWorldPoint(staging, { x: NaN, y: Infinity }), { x: 100, y: 200 });
    assert.deepEqual(stagedWorldPoint(staging, {}), { x: 100, y: 200 });
});

test('a Wrestler driven by a non-finite transform stays inside the ring', () => {
    const scene = makeScene();
    scene.moveRuntime.register({
        id: 'broken-transform',
        duration: 0.2,
        tracks: { attacker: { keyframes: [{ at: 0, transform: { x: 0 } }, { at: 0.2, transform: { x: 5 } }] } },
    });
    const { atk } = pair(scene);
    const handle = scene.moveRuntime.play('broken-transform', { attacker: atk });
    // Corrupt the compiled state the way a bad authored value would.
    handle.clip.tracks.attacker.keyframes[1].state.transform.x = NaN;
    scene.moveRuntime.seek(handle, 0.2);
    assert.ok(Number.isFinite(atk.x) && Number.isFinite(atk.y));
});
