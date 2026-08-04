const RESERVED_TRACK_KEYS = new Set(['pose', 'transform', 'parts']);

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function ease(name, t) {
    if (name === 'step') return 0;
    if (name === 'easeIn') return t * t;
    if (name === 'easeOut') return 1 - (1 - t) * (1 - t);
    if (name === 'easeInOut') return t * t * (3 - 2 * t);
    return t;
}

function cloneState(state) {
    return {
        pose: { ...state.pose },
        transform: { ...state.transform },
        parts: { ...state.parts },
    };
}

function expandKeyframes(keyframes) {
    const state = { pose: {}, transform: {}, parts: {} };
    return keyframes.map(frame => {
        Object.assign(state.pose, frame.pose);
        Object.assign(state.transform, frame.transform);
        Object.assign(state.parts, frame.parts);
        return { ...frame, state: cloneState(state) };
    });
}

export function validateClip(source) {
    const errors = [];
    if (!source?.id || typeof source.id !== 'string') errors.push('clip.id is required');
    if (!Number.isFinite(source?.duration) || source.duration <= 0) errors.push('clip.duration must be > 0');
    if (!isObject(source?.tracks) || Object.keys(source.tracks).length === 0) errors.push('clip.tracks requires at least one role');
    for (const [role, track] of Object.entries(source?.tracks ?? {})) {
        if (!Array.isArray(track?.keyframes) || track.keyframes.length === 0) {
            errors.push(`tracks.${role}.keyframes requires at least one keyframe`);
            continue;
        }
        let previous = -Infinity;
        for (const [index, frame] of track.keyframes.entries()) {
            if (!Number.isFinite(frame.at) || frame.at < 0 || frame.at > source.duration) {
                errors.push(`tracks.${role}.keyframes[${index}].at is outside the clip`);
            }
            if (frame.at < previous) errors.push(`tracks.${role}.keyframes must be sorted by at`);
            previous = frame.at;
            for (const key of Object.keys(frame)) {
                if (!RESERVED_TRACK_KEYS.has(key) && !['at', 'ease'].includes(key)) {
                    errors.push(`tracks.${role}.keyframes[${index}].${key} is not a supported channel`);
                }
            }
            for (const group of ['pose', 'transform']) {
                if (frame[group] !== undefined && !isObject(frame[group])) errors.push(`tracks.${role}.keyframes[${index}].${group} must be an object`);
                for (const [channel, value] of Object.entries(frame[group] ?? {})) {
                    if (!Number.isFinite(value)) errors.push(`tracks.${role}.${group}.${channel} must be numeric`);
                }
            }
            if (frame.parts !== undefined && !isObject(frame.parts)) errors.push(`tracks.${role}.keyframes[${index}].parts must be an object`);
        }
    }
    let previousEvent = -Infinity;
    for (const [index, event] of (source?.events ?? []).entries()) {
        if (!Number.isFinite(event.at) || event.at < 0 || event.at > source.duration) errors.push(`events[${index}].at is outside the clip`);
        if (!event.type) errors.push(`events[${index}].type is required`);
        if (event.at < previousEvent) errors.push('events must be sorted by at');
        previousEvent = event.at;
    }
    return { ok: errors.length === 0, errors };
}

export function compileClip(source) {
    const result = validateClip(source);
    if (!result.ok) throw new Error(`Invalid animation clip "${source?.id ?? 'unknown'}":\n- ${result.errors.join('\n- ')}`);
    const tracks = Object.fromEntries(Object.entries(source.tracks).map(([role, track]) => [
        role,
        { keyframes: expandKeyframes(track.keyframes.map(frame => ({
            at: frame.at,
            ease: frame.ease ?? 'linear',
            pose: frame.pose ?? {},
            transform: frame.transform ?? {},
            parts: frame.parts ?? {},
        }))) },
    ]));
    return Object.freeze({
        _compiled: true,
        id: source.id,
        duration: source.duration,
        tracks,
        events: (source.events ?? []).map((event, index) => ({ ...event, _order: index })),
    });
}

function sampleNumericGroup(from, to, t) {
    const result = {};
    for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
        const a = from[key] ?? to[key] ?? 0;
        const b = to[key] ?? a;
        result[key] = lerp(a, b, t);
    }
    return result;
}

export function sampleTrack(track, time) {
    const frames = track.keyframes;
    if (time <= frames[0].at) return cloneState(frames[0].state);
    if (time >= frames.at(-1).at) return cloneState(frames.at(-1).state);
    let right = 1;
    while (frames[right].at < time) right++;
    const a = frames[right - 1];
    const b = frames[right];
    if (time === b.at) return cloneState(b.state);
    const span = b.at - a.at;
    const t = ease(b.ease, span > 0 ? (time - a.at) / span : 1);
    return {
        pose: sampleNumericGroup(a.state.pose, b.state.pose, t),
        transform: sampleNumericGroup(a.state.transform, b.state.transform, t),
        // Art swaps are intentionally discrete. Put the swap on a contact or
        // anticipation keyframe; numeric pose/transform channels still blend.
        parts: { ...a.state.parts },
    };
}

export function sampleClip(clip, time) {
    const at = clamp(time, 0, clip.duration);
    return {
        id: clip.id,
        time: at,
        progress: at / clip.duration,
        tracks: Object.fromEntries(Object.entries(clip.tracks).map(([role, track]) => [role, sampleTrack(track, at)])),
    };
}

export function eventsBetween(clip, from, to) {
    if (to < from) return [];
    return clip.events.filter(event => event.at > from && event.at <= to);
}
