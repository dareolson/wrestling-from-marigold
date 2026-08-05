import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';

// A minimal binding: records every applied sample and every part-variant
// selection, using the runtime's generic pose/parts fallback.
function fakeActor() {
    const samples = [];
    return {
        pose: {},
        skeleton: { setPartVariants: () => {} },
        applyAnimationSample(sample) {
            samples.push(sample);
            if (sample.pose) Object.assign(this.pose, sample.pose);
        },
        samples,
    };
}

// Three evenly spaced markers so a single large delta can cross all of them
// in one update() call.
const THREE_MARKER_DURATION = 0.3;
function threeMarkerClip() {
    return compileClip({
        id: 'three-marker-test-clip',
        duration: THREE_MARKER_DURATION,
        tracks: {
            solo: { keyframes: [{ at: 0, pose: { x: 0 } }, { at: THREE_MARKER_DURATION, pose: { x: 1 } }] },
        },
        events: [
            { at: 0.10, type: 'm1' },
            { at: 0.20, type: 'm2' },
            { at: 0.30, type: 'm3' },
        ],
    });
}

// ── update(): self-cancellation from a per-handle onEvent ──────────────────────

test('a per-handle onEvent that cancels its own handle stops later markers in the same update, and never applies a post-cancel sample', () => {
    const clip = threeMarkerClip();
    const seen = [];
    const runtime = new MoveRuntime();
    runtime.register(clip);
    const actor = fakeActor();
    let handle;
    let completed = false, cancelled = false;
    handle = runtime.play('three-marker-test-clip', { solo: actor }, {
        onEvent: (event, h) => {
            seen.push(event.type);
            if (event.type === 'm1') runtime.cancel(h, 'self-cancel-on-first-marker');
        },
        onComplete: () => { completed = true; },
        onCancel:   () => { cancelled = true; },
    });
    const samplesBeforeUpdate = actor.samples.length;

    // A single large delta crosses all three markers at once.
    runtime.update(THREE_MARKER_DURATION + 1);

    assert.deepEqual(seen, ['m1'], 'm2 and m3 must never fire once m1 cancelled the handle');
    assert.equal(cancelled, true);
    assert.equal(completed, false, 'onComplete must never fire once onCancel already fired');
    assert.equal(actor.samples.length, samplesBeforeUpdate, 'no post-cancellation sample is applied');
    assert.equal(runtime._active.has(handle.id), false);
});

test('a per-handle onEvent that cancels its own handle on a LATER marker still blocks any marker after it', () => {
    const clip = threeMarkerClip();
    const seen = [];
    const runtime = new MoveRuntime();
    runtime.register(clip);
    const actor = fakeActor();
    runtime.play('three-marker-test-clip', { solo: actor }, {
        onEvent: (event, h) => {
            seen.push(event.type);
            if (event.type === 'm2') runtime.cancel(h, 'self-cancel-on-second-marker');
        },
    });

    runtime.update(THREE_MARKER_DURATION + 1);

    assert.deepEqual(seen, ['m1', 'm2'], 'm3 must never fire once m2 cancelled the handle');
});

// ── update(): self-cancellation from the global onEvent ────────────────────────

test('a GLOBAL onEvent that cancels the handle also stops later markers, and the per-handle callback for a later marker never runs', () => {
    const clip = threeMarkerClip();
    const globalSeen = [];
    const perHandleSeen = [];
    const runtime = new MoveRuntime({
        onEvent: (event, h) => {
            globalSeen.push(event.type);
            if (event.type === 'm1') runtime.cancel(h, 'global-self-cancel');
        },
    });
    runtime.register(clip);
    const actor = fakeActor();
    runtime.play('three-marker-test-clip', { solo: actor }, {
        onEvent: (event) => perHandleSeen.push(event.type),
    });

    runtime.update(THREE_MARKER_DURATION + 1);

    assert.deepEqual(globalSeen, ['m1']);
    assert.deepEqual(perHandleSeen, ['m1'], 'the per-handle callback DOES see m1 (it runs before the global callback), but never m2/m3');
});

test('when the per-handle callback cancels the handle, the global callback is not invoked for that same event', () => {
    const globalSeen = [];
    const clip = threeMarkerClip();
    const runtime = new MoveRuntime({ onEvent: (event) => globalSeen.push(event.type) });
    runtime.register(clip);
    const actor = fakeActor();
    runtime.play('three-marker-test-clip', { solo: actor }, {
        onEvent: (event, h) => { if (event.type === 'm1') runtime.cancel(h, 'self-cancel'); },
    });

    runtime.update(THREE_MARKER_DURATION + 1);

    assert.deepEqual(globalSeen, [], 'a handle already cancelled by its own onEvent must not also notify the global listener');
});

// ── Cross-handle cancellation must keep working (not a regression) ─────────────

test('one handle cancelling ANOTHER handle during the same update is preserved (only self-cancellation is special-cased)', () => {
    const clip = threeMarkerClip();
    const runtime = new MoveRuntime();
    runtime.register(clip);
    const actorA = fakeActor();
    const actorB = fakeActor();
    let bCancelled = false;
    // update() iterates active handles in insertion (play) order, so A must be
    // played first — otherwise B would already run its own full (natural
    // completion) turn in the same update before A's onEvent gets a chance to
    // cancel it, which would test something else entirely.
    runtime.play('three-marker-test-clip', { solo: actorA }, {
        onEvent: (event, h) => { if (event.type === 'm1') runtime.cancel(handleB, 'cross-cancel'); },
    });
    const handleB = runtime.play('three-marker-test-clip', { solo: actorB }, {
        onCancel: () => { bCancelled = true; },
    });

    runtime.update(THREE_MARKER_DURATION + 1);

    assert.equal(bCancelled, true, 'handle A must still be able to cancel handle B mid-update');
});

// ── seek()'s emitEvents path ────────────────────────────────────────────────────

test('seek() with emitEvents: a marker that cancels the handle must not apply a post-cancellation sample', () => {
    const clip = threeMarkerClip();
    const runtime = new MoveRuntime();
    runtime.register(clip);
    const actor = fakeActor();
    let cancelled = false;
    const handle = runtime.play('three-marker-test-clip', { solo: actor }, {
        onEvent: (event, h) => { if (event.type === 'm1') runtime.cancel(h, 'seek-self-cancel'); },
        onCancel: () => { cancelled = true; },
    });
    const samplesBeforeSeek = actor.samples.length;

    const result = runtime.seek(handle, THREE_MARKER_DURATION, { emitEvents: true });

    assert.equal(cancelled, true);
    assert.equal(result, null, 'seek returns null instead of a sample for a handle it just cancelled');
    assert.equal(actor.samples.length, samplesBeforeSeek, 'no sample is applied after seek() cancels the handle mid-dispatch');
});

test('seek() with emitEvents on a handle that survives still applies and returns a sample as before', () => {
    const clip = threeMarkerClip();
    const runtime = new MoveRuntime();
    runtime.register(clip);
    const actor = fakeActor();
    const seen = [];
    const handle = runtime.play('three-marker-test-clip', { solo: actor }, { onEvent: e => seen.push(e.type) });

    const result = runtime.seek(handle, THREE_MARKER_DURATION, { emitEvents: true });

    assert.deepEqual(seen, ['m1', 'm2', 'm3']);
    assert.ok(result, 'a surviving handle still gets its sample back from seek()');
    assert.equal(actor.pose.x, 1);
});

// ── Idempotency: onCancel and onComplete can never both fire ───────────────────

test('cancelling a handle that already reached natural completion in the same update is a no-op (idempotent delete guard)', () => {
    const clip = threeMarkerClip();
    const runtime = new MoveRuntime();
    runtime.register(clip);
    const actor = fakeActor();
    let completed = false, cancelled = false;
    const handle = runtime.play('three-marker-test-clip', { solo: actor }, {
        onComplete: () => { completed = true; },
        onCancel:   () => { cancelled = true; },
    });

    runtime.update(THREE_MARKER_DURATION + 1); // completes naturally
    assert.equal(completed, true);

    const cancelledNow = runtime.cancel(handle, 'late-cancel-after-completion');
    assert.equal(cancelledNow, false, 'cancel() on an already-completed handle is a no-op');
    assert.equal(cancelled, false, 'onCancel never fires once onComplete already fired');
});
