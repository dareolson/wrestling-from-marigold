import { compileClip, eventsBetween, sampleClip } from './AnimationClip.js';

function applySample(target, sample) {
    if (!target) return;
    if (typeof target.applyAnimationSample === 'function') {
        target.applyAnimationSample(sample);
        return;
    }
    if (sample.pose && 'pose' in target) target.pose = { ...target.pose, ...sample.pose };
    if (sample.transform) {
        for (const [key, value] of Object.entries(sample.transform)) {
            if (key in target) target[key] = value;
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

    play(clipId, bindings, { rate = 1, onEvent = null, onComplete = null } = {}) {
        const clip = this._clips.get(clipId);
        if (!clip) throw new Error(`Unknown animation clip "${clipId}"`);
        const handle = {
            id: this._nextId++,
            clip,
            bindings,
            time: 0,
            rate,
            onEvent,
            onComplete,
            cancelled: false,
        };
        this._active.set(handle.id, handle);
        this._apply(handle);
        return handle;
    }

    seek(handle, time, { emitEvents = false } = {}) {
        if (!this._active.has(handle.id)) return null;
        const from = handle.time;
        handle.time = Math.max(0, Math.min(handle.clip.duration, time));
        if (emitEvents && handle.time >= from) this._emit(handle, from, handle.time);
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
            this._apply(handle);
            if (to >= handle.clip.duration) {
                this._active.delete(handle.id);
                this._release(handle);
                handle.onComplete?.(handle);
            }
        }
    }

    cancel(handle, reason = 'cancelled') {
        if (!handle || !this._active.delete(handle.id)) return false;
        handle.cancelled = true;
        handle.reason = reason;
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
        for (const [role, sample] of Object.entries(sampled.tracks)) applySample(handle.bindings[role], sample);
        return sampled;
    }

    _emit(handle, from, to) {
        for (const event of eventsBetween(handle.clip, from, to)) {
            handle.onEvent?.(event, handle);
            this._onEvent?.(event, handle);
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
