import { validateLayers } from './clipLayers.js';

// `facing` is a per-keyframe whole-body facing: +1 faces along the staging
// axis (the direction the anchor role faced when the clip started, the same
// axis transform.x uses), -1 faces against it. Discrete like parts -- it holds
// from its keyframe until the next one that sets it, never blends. Omitted on
// every keyframe, the clip leaves facing to its executor, as before.
const RESERVED_TRACK_KEYS = new Set(['pose', 'transform', 'parts', 'facing']);

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
    const clone = {
        pose: { ...state.pose },
        transform: { ...state.transform },
        parts: { ...state.parts },
    };
    if (state.facing !== undefined) clone.facing = state.facing;
    return clone;
}

function expandKeyframes(keyframes) {
    const state = { pose: {}, transform: {}, parts: {} };
    return keyframes.map(frame => {
        Object.assign(state.pose, frame.pose);
        Object.assign(state.transform, frame.transform);
        Object.assign(state.parts, frame.parts);
        if (frame.facing !== undefined) state.facing = frame.facing;
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
            if (frame.facing !== undefined && frame.facing !== 1 && frame.facing !== -1) {
                errors.push(`tracks.${role}.keyframes[${index}].facing must be 1 or -1`);
            }
        }
    }
    const badWindow = (entry) => {
        const times = [...(entry?.in ?? []), ...(entry?.out ?? [])];
        return times.length !== 4 || times.some((t, i) => !Number.isFinite(t) || t < (times[i - 1] ?? 0) || t > source.duration);
    };
    for (const [index, contact] of (source?.floorContacts ?? []).entries()) {
        if (!source.tracks?.[contact?.role]) errors.push(`floorContacts[${index}].role has no track`);
        if (!FLOOR_POINTS.includes(contact?.point)) errors.push(`floorContacts[${index}].point must be one of ${FLOOR_POINTS.join(', ')}`);
        if (badWindow(contact)) errors.push(`floorContacts[${index}] needs in: [start, full] and out: [hold end, release], in order, inside the clip`);
    }
    for (const [index, grip] of (source?.grips ?? []).entries()) {
        if (!source.tracks?.[grip?.role] || !source.tracks?.[grip?.to?.role]) errors.push(`grips[${index}] roles need tracks`);
        if (!['l', 'r'].includes(grip?.arm)) errors.push(`grips[${index}].arm must be 'l' or 'r'`);
        if (!GRIP_JOINTS.includes(grip?.to?.joint)) errors.push(`grips[${index}].to.joint must be one of ${GRIP_JOINTS.join(', ')}`);
        if (!['same', 'other'].includes(grip?.to?.side ?? 'same')) errors.push(`grips[${index}].to.side must be 'same' or 'other'`);
        if (badWindow(grip)) errors.push(`grips[${index}] needs in: [start, full] and out: [hold end, release], in order, inside the clip`);
    }
    errors.push(...validateLayers(source).errors);
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
    const tracks = Object.fromEntries(Object.entries(source.tracks).map(([role, track]) => {
        const keyframes = expandKeyframes(track.keyframes.map(frame => ({
            at: frame.at,
            ease: frame.ease ?? 'linear',
            pose: frame.pose ?? {},
            transform: frame.transform ?? {},
            parts: frame.parts ?? {},
            ...(frame.facing !== undefined ? { facing: frame.facing } : {}),
        })));
        return [role, {
            keyframes,
            // Whether this track claims ownership of its actor's position. Read
            // by clipStaging.captureStagingContext: a track that authors no
            // transform channel gets no staging context, so its executor keeps
            // sole ownership of position (see src/animation/clipStaging.js).
            // Measured on the RAW per-frame channels, not the expanded running
            // state, so it means "the author wrote a transform here".
            authorsTransform: keyframes.some(frame => Object.keys(frame.transform).length > 0),
            // Whether this track turns its actor (see RESERVED_TRACK_KEYS).
            authorsFacing: keyframes.some(frame => frame.facing !== undefined),
        }];
    }));
    return Object.freeze({
        _compiled: true,
        id: source.id,
        duration: source.duration,
        tracks,
        authorsTransform: Object.values(tracks).some(track => track.authorsTransform),
        authorsFacing: Object.values(tracks).some(track => track.authorsFacing),
        events: (source.events ?? []).map((event, index) => ({ ...event, _order: index })),
        floorContacts: (source.floorContacts ?? []).map(contact => Object.freeze({ ...contact })),
        grips: (source.grips ?? []).map(grip => Object.freeze({ ...grip, to: Object.freeze({ side: 'same', ...grip.to }) })),
        // Cross-actor part order (clipLayers.js). Absent on most clips.
        ...(source.layers ? { layers: Object.freeze(source.layers.map(win => Object.freeze({
            from: win.from, to: win.to,
            order: Object.freeze(win.order.map(entry => Object.freeze([...entry]))),
        }))) } : {}),
        ...(source.layerTie ? { layerTie: Object.freeze([...source.layerTie]) } : {}),
    });
}

// A clip can hold a point of a body on the mat over a window (2026-10-15):
// the piledriver's crown. Lift is authored on one reference body and scales
// with each rig's hip height, so it can't put every cast's crown on the mat;
// the Wrestler measures the gap and closes it (Wrestler.draw). `in` ramps
// the hold up, `out` ramps it back off; weights are smoothstepped.
export const FLOOR_POINTS = Object.freeze(['crown']);

// A clip can also hold a hand on a partner's joint (2026-10-15). The clip's
// arm angles are solved on one cast; a partner of other proportions moves
// the joint, so after both bodies draw MoveRuntime.afterDraw pulls the hand
// back onto it (Wrestler.holdGrips). `arm` is the gripping actor's pose
// channel ('l'/'r'); `to.side` says whether the joint is on the same depth
// side as that hand ('same', near hand on near hip) or the other. Each rig
// decides which side a channel draws on (Skeleton.lChannelSide).
export const GRIP_JOINTS = Object.freeze(['Hip', 'Knee', 'Ankle', 'Shoulder', 'Elbow', 'Wrist']);

export function floorContactWeight(contact, time) { return windowWeight(contact, time); }

export function windowWeight(contact, time) {
    const [a, b] = contact.in, [c, d] = contact.out;
    const ramp = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
    if (time <= a || time >= d) return 0;
    if (time < b) return ramp((time - a) / (b - a));
    if (time <= c) return 1;
    return 1 - ramp((time - c) / (d - c));
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
    const sample = {
        pose: sampleNumericGroup(a.state.pose, b.state.pose, t),
        transform: sampleNumericGroup(a.state.transform, b.state.transform, t),
        // Art swaps are intentionally discrete. Put the swap on a contact or
        // anticipation keyframe; numeric pose/transform channels still blend.
        parts: { ...a.state.parts },
    };
    // Facing is discrete for the same reason: it turns on its keyframe.
    if (a.state.facing !== undefined) sample.facing = a.state.facing;
    return sample;
}

export function sampleClip(clip, time) {
    const at = clamp(time, 0, clip.duration);
    return {
        id: clip.id,
        time: at,
        progress: at / clip.duration,
        tracks: Object.fromEntries(Object.entries(clip.tracks).map(([role, track]) => {
            const sample = sampleTrack(track, at);
            const contacts = (clip.floorContacts ?? []).filter(c => c.role === role)
                .map(c => ({ point: c.point, w: floorContactWeight(c, at) })).filter(c => c.w > 0);
            if (contacts.length) sample.floorContacts = contacts;
            return [role, sample];
        })),
    };
}

export function eventsBetween(clip, from, to) {
    if (to < from) return [];
    return clip.events.filter(event => event.at > from && event.at <= to);
}
