import { compileClip, eventsBetween, sampleClip } from './AnimationClip.js';
import { captureStagingContext, stagedWorldPoint } from './clipStaging.js';

// `staging` is the role's immutable playback context, or null when this track
// authors no transform channels (the clip does not own this actor's position).
// It is passed as a second argument rather than folded into `sample` so the
// sampled frame stays pure clip data — the same object a tool or test can
// inspect — and so a target that ignores staging is unchanged.
function applySample(target, sample, staging) {
    if (!target) return;
    if (typeof target.applyAnimationSample === 'function') {
        target.applyAnimationSample(sample, staging);
        return;
    }
    if (sample.pose && 'pose' in target) target.pose = { ...target.pose, ...sample.pose };
    if (sample.transform) {
        // Generic targets get the same contract as a real Wrestler: x/y resolve
        // through the staging frame, any other authored channel is a direct
        // write. A target with no captureStagingOrigin was captured at its own
        // x/y with facing +1 and scale 1, so an actor sitting at the origin
        // still sees the raw authored value.
        const point = staging ? stagedWorldPoint(staging, sample.transform) : null;
        for (const [key, value] of Object.entries(sample.transform)) {
            if (!(key in target)) continue;
            if (point && (key === 'x' || key === 'y')) target[key] = point[key];
            else target[key] = value;
        }
    }
    target.skeleton?.setPartVariants?.(sample.parts ?? {});
}

// Scene-clock animation orchestration. Gameplay still owns damage, legality,
// AI, and state transitions; this runtime only samples synchronized visual
// tracks and emits authored markers.
export default class MoveRuntime {
    constructor({ onEvent = null } = {}) {
        this._clips = new Map();
        this._active = new Map();
        this._nextId = 1;
        this._onEvent = onEvent;
    }

    register(source) {
        const clip = source._compiled ? source : compileClip(source);
        this._clips.set(clip.id, clip);
        return clip;
    }

    play(clipId, bindings, { rate = 1, onEvent = null, onComplete = null, onCancel = null } = {}) {
        const clip = this._clips.get(clipId);
        if (!clip) throw new Error(`Unknown animation clip "${clipId}"`);
        const handle = {
            id: this._nextId++,
            clip,
            bindings,
            time: 0,
            rate,
            onEvent,
            // Natural completion and cancellation are DIFFERENT outcomes and get
            // different callbacks. onComplete fires only when the clip reaches
            // its duration (release drains, graceful recovery are legitimate).
            // onCancel fires when the move is torn down early — through
            // cancel/cancelTarget/shutdown or a bound actor claiming its pose —
            // and must NOT run any completion-only gameplay (no release damage,
            // no "the hold finished" state). A move must never receive both.
            onComplete,
            onCancel,
            cancelled: false,
            // Per-role staging frame, captured ONCE here from the bound actors'
            // live positions and the anchor's facing/scale, then never rewritten
            // for the life of the handle. Capturing at play() rather than on
            // first sample is what makes seeking deterministic: every _apply
            // resolves against the same origins no matter what order times are
            // visited in. Null when no bound track authors transform channels.
            staging: captureStagingContext(clip, bindings),
        };
        this._active.set(handle.id, handle);
        this._apply(handle);
        return handle;
    }

    seek(handle, time, { emitEvents = false } = {}) {
        if (!this._active.has(handle.id)) return null;
        const from = handle.time;
        handle.time = Math.max(0, Math.min(handle.clip.duration, time));
        if (emitEvents && handle.time >= from) {
            this._emit(handle, from, handle.time);
            // A marker dispatched above can cancel this very handle (the same
            // self-cancellation hazard as update()). Once that happens the
            // handle is torn down — sampling and applying a pose for it here
            // would be a post-cancellation write.
            if (handle.cancelled) return null;
        }
        return this._apply(handle);
    }

    update(deltaSeconds) {
        for (const handle of [...this._active.values()]) {
            // An event handler fired by one clip can cancel another (e.g. a
            // jab's impact makes the defender sell, cancelling the defender's
            // own in-flight jab). We iterate a snapshot, so skip any handle a
            // prior handler already cancelled — otherwise it would advance and
            // even emit one extra frame after cancellation.
            if (!this._active.has(handle.id)) continue;
            const from = handle.time;
            const to = Math.min(handle.clip.duration, from + Math.max(0, deltaSeconds) * handle.rate);
            handle.time = to;
            this._emit(handle, from, to);
            // A marker dispatched above (via either the per-handle or global
            // onEvent) can cancel THIS handle mid-dispatch — onCancel has
            // already run and the handle is torn down. Applying a sample or
            // completing it here would be a post-cancellation write, and
            // could even fire onComplete after onCancel already fired.
            if (handle.cancelled) continue;
            this._apply(handle);
            if (to >= handle.clip.duration) {
                this._active.delete(handle.id);
                this._release(handle);
                handle.onComplete?.(handle);
            }
        }
    }

    cancel(handle, reason = 'cancelled', meta = null) {
        // The _active.delete guard makes cancellation idempotent and re-entrancy
        // safe: if an onCancel handler (or the pose-claim it triggers) loops back
        // into cancel for the same handle, the second delete returns false and we
        // no-op instead of firing onCancel twice or re-releasing.
        if (!handle || !this._active.delete(handle.id)) return false;
        handle.cancelled = true;
        handle.reason = reason;
        // Opaque caller-supplied context (e.g. which actor initiated a
        // pose-claim cancellation) — MoveRuntime doesn't interpret this, it's
        // just carried onto the handle for onCancel to read instead of the
        // handler having to guess the initiator from actor state.
        handle.cancelMeta = meta;
        // Logical teardown first (clear gameplay handles/state), then visual
        // (reset part variants on any target this handle no longer owns).
        handle.onCancel?.(handle);
        this._release(handle);
        return true;
    }

    cancelTarget(target, reason = 'target-cancelled') {
        for (const handle of [...this._active.values()]) {
            if (Object.values(handle.bindings).includes(target)) this.cancel(handle, reason);
        }
    }

    shutdown() {
        for (const handle of [...this._active.values()]) this.cancel(handle, 'shutdown');
        this._clips.clear();
    }

    _apply(handle) {
        const sampled = sampleClip(handle.clip, handle.time);
        for (const [role, sample] of Object.entries(sampled.tracks)) {
            applySample(handle.bindings[role], sample, handle.staging?.roles[role] ?? null);
        }
        return sampled;
    }

    _emit(handle, from, to) {
        for (const event of eventsBetween(handle.clip, from, to)) {
            handle.onEvent?.(event, handle);
            // The per-handle callback can cancel its own handle (or another
            // one it's chained to). If it just cancelled THIS handle, onCancel
            // has already run — stop here rather than also notifying the
            // global listener about an event on a now-dead handle, and don't
            // dispatch any later marker crossed by the same update.
            if (handle.cancelled) return;
            this._onEvent?.(event, handle);
            if (handle.cancelled) return;
        }
    }

    _release(handle) {
        for (const target of Object.values(handle.bindings)) {
            const stillOwned = [...this._active.values()]
                .some(active => Object.values(active.bindings).includes(target));
            if (!stillOwned) target?.skeleton?.setPartVariants?.({});
        }
    }
}
