import { compileClip, sampleClip, validateClip } from '../../src/animation/AnimationClip.js';

export const ROLES = Object.freeze(['attacker', 'defender']);

// Transform channels the gameplay runtime can actually consume. Anything else
// an author puts in a `transform` block previews in the editor and then reaches
// nothing — exactly the failure this milestone closed for x/y, so the readiness
// report names it rather than letting it ship silently. See
// src/animation/clipStaging.js for what x/y mean.
export const RUNTIME_TRANSFORM_CHANNELS = Object.freeze(['x', 'y']);

// Render/posture modes an author can select. Grounded authoring stays closed in
// this milestone: down/pinned/possum now reach the modular rig, but only ONE
// flat pose exists — distinct prone, bridge, and kneeling postures are still
// open postureGap entries and grounded child orientation is a documented open
// defect. `upright` is the only mode a clip may declare.
export const SUPPORTED_POSTURE_MODES = Object.freeze(['upright']);

// Joints a contact pair may name. These are the structural anchors the Skeleton
// publishes in jointAttachmentPoints, so a declared contact can always be
// measured against a real rendered point.
export const CONTACT_SOURCES = Object.freeze(['nearWrist', 'farWrist', 'nearAnkle', 'farAnkle']);
export const CONTACT_TARGETS = Object.freeze([
    'nearShoulder', 'farShoulder', 'nearElbow', 'farElbow', 'nearWrist', 'farWrist',
    'nearHip', 'farHip', 'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle',
]);
export const EASES = Object.freeze(['linear', 'easeIn', 'easeOut', 'easeInOut', 'step']);
export const POSE_CHANNELS = Object.freeze([
    'lArm', 'rArm', 'lElbow', 'rElbow',
    'lLeg', 'rLeg', 'lKnee', 'rKnee',
    'lean', 'crouch',
]);

const round = value => Math.round(value * 10000) / 10000;
const clone = value => JSON.parse(JSON.stringify(value));

export function basePose() {
    return {
        lArm: 0, rArm: 0, lElbow: 0.7, rElbow: 0.7,
        lLeg: -0.08, rLeg: 0.08, lKnee: 0.22, rKnee: 0.22,
        lean: 0, crouch: 0,
    };
}

export function createDraft(id = 'untitled_move', duration = 1.2) {
    const pose = basePose();
    return {
        id,
        duration,
        tracks: Object.fromEntries(ROLES.map(role => [role, {
            keyframes: [{ at: 0, ease: 'linear', pose: { ...pose }, transform: { x: 0, y: 0 }, parts: {} }],
        }])),
        events: [],
        // Editor/draft-only declarative record of which limb was snapped onto
        // which anchor, and when. See normalizeContacts.
        contacts: [],
    };
}

// Declared contact pairs are AUTHORING METADATA. They exist so the readiness
// report can measure whether interpolation pulls a baked contact apart between
// keyframes; they are deliberately stripped from the exported clip
// (exportClip), never sent to the runtime, and nothing about damage, legality,
// or hit detection may ever read them. Contact in gameplay stays snap-and-bake:
// this records what the author asserted, it does not re-solve it at runtime.
function normalizeContacts(source, duration) {
    return (Array.isArray(source) ? source : [])
        .map(contact => ({
            at: Math.max(0, Math.min(duration, Number(contact?.at) || 0)),
            role: ROLES.includes(contact?.role) ? contact.role : ROLES[0],
            source: CONTACT_SOURCES.includes(contact?.source) ? contact.source : null,
            target: CONTACT_TARGETS.includes(contact?.target) ? contact.target : null,
        }))
        .filter(contact => contact.source && contact.target)
        .sort((a, b) => a.at - b.at);
}

// The other role in a two-actor contact — a contact is always authored against
// the opposite wrestler's anchor.
export function contactPartner(role) {
    return role === 'attacker' ? 'defender' : 'attacker';
}

export function normalizeDraft(source) {
    const draft = clone(source ?? createDraft());
    draft.id ||= 'untitled_move';
    draft.duration = Math.max(0.05, Number(draft.duration) || 1.2);
    draft.tracks ||= {};
    for (const role of ROLES) {
        const track = draft.tracks[role] ??= { keyframes: [] };
        if (!track.keyframes.length) {
            track.keyframes.push({ at: 0, ease: 'linear', pose: basePose(), transform: { x: 0, y: 0 }, parts: {} });
        }
        for (const frame of track.keyframes) {
            frame.at = Math.max(0, Math.min(draft.duration, Number(frame.at) || 0));
            frame.ease = EASES.includes(frame.ease) ? frame.ease : 'linear';
            frame.pose ||= {};
            frame.transform ||= {};
            frame.parts ||= {};
        }
        track.keyframes.sort((a, b) => a.at - b.at);
    }
    draft.events = (draft.events ?? []).map(event => ({
        at: Math.max(0, Math.min(draft.duration, Number(event.at) || 0)),
        type: String(event.type || 'marker'),
    })).sort((a, b) => a.at - b.at);
    draft.contacts = normalizeContacts(draft.contacts, draft.duration);
    // Declared posture is PRESERVED, not coerced. Silently rewriting an
    // imported `prone` draft to `upright` would hand the author a clip that
    // does something other than what it says; clipReadiness blocks on it
    // instead, and exportClip drops the field either way.
    draft.posture = typeof draft.posture === 'string' && draft.posture ? draft.posture : 'upright';
    return draft;
}

export function addContact(draft, { at, role, source, target }) {
    draft.contacts ??= [];
    draft.contacts.push({ at: round(at), role, source, target });
    draft.contacts = normalizeContacts(draft.contacts, draft.duration);
    return draft.contacts;
}

export function insertKeyframe(draft, role, at, state) {
    const track = draft.tracks[role];
    if (!track) throw new Error(`Unknown role ${role}`);
    const time = Math.max(0, Math.min(draft.duration, round(at)));
    const existing = track.keyframes.findIndex(frame => Math.abs(frame.at - time) < 0.0001);
    const frame = {
        at: time,
        ease: state.ease ?? 'linear',
        pose: clone(state.pose ?? {}),
        transform: clone(state.transform ?? {}),
        parts: clone(state.parts ?? {}),
    };
    if (existing >= 0) track.keyframes[existing] = frame;
    else track.keyframes.push(frame);
    track.keyframes.sort((a, b) => a.at - b.at);
    return track.keyframes.indexOf(frame);
}

export function removeKeyframe(draft, role, index) {
    const frames = draft.tracks[role]?.keyframes;
    if (!frames || frames.length <= 1) return false;
    frames.splice(index, 1);
    return true;
}

export function addEvent(draft, at, type) {
    draft.events.push({ at: round(Math.max(0, Math.min(draft.duration, at))), type: type || 'marker' });
    draft.events.sort((a, b) => a.at - b.at);
}

export function sampleDraft(draft, at) {
    return sampleClip(compileClip(normalizeDraft(draft)), at);
}

export function draftValidation(draft) {
    return validateClip(normalizeDraft(draft));
}

function jsValue(value, indent = 0) {
    const space = ' '.repeat(indent);
    if (Array.isArray(value)) {
        if (!value.length) return '[]';
        return `[\n${value.map(item => `${' '.repeat(indent + 4)}${jsValue(item, indent + 4)}`).join(',\n')}\n${space}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value);
        if (!entries.length) return '{}';
        return `{\n${entries.map(([key, item]) => `${' '.repeat(indent + 4)}${key}: ${jsValue(item, indent + 4)}`).join(',\n')}\n${space}}`;
    }
    if (typeof value === 'string') return JSON.stringify(value);
    return String(value);
}

// The runtime-shaped clip: exactly the four keys AnimationClip compiles, with
// every editor-only field (contacts, posture) dropped. Keeping this separate
// from normalizeDraft is what guarantees authoring metadata cannot leak into
// gameplay data by accident.
export function exportClip(draft) {
    const { id, duration, tracks, events } = normalizeDraft(draft);
    return { id, duration, tracks, events };
}

export function exportModule(draft) {
    const clip = exportClip(draft);
    const symbol = clip.id.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[^a-zA-Z_$]/, '_$&');
    return `// Generated by tools/move-editor. Review event handling in the move executor.\nexport const ${symbol}Clip = ${jsValue(clip)};\n`;
}

// ── Production readiness ─────────────────────────────────────────────────────

// How densely the whole clip is swept. The current-pose certification badge
// only ever sees the frame the author is looking at, which is precisely how a
// clip that reads fine at every keyframe ships with a broken interpolation
// between two of them. Keyframe times are always sampled exactly, plus a
// uniform grid, plus the midpoint of every span (where eased interpolation
// deviates most from the straight line between the baked endpoints).
export const READINESS_GRID = 60;

function sampleTimes(draft, grid = READINESS_GRID) {
    const times = new Set([0, draft.duration]);
    for (let i = 0; i <= grid; i++) times.add(round(draft.duration * (i / grid)));
    for (const track of Object.values(draft.tracks)) {
        const frames = track.keyframes;
        for (const [index, frame] of frames.entries()) {
            times.add(frame.at);
            const next = frames[index + 1];
            if (next) times.add(round((frame.at + next.at) / 2));
        }
    }
    return [...times].sort((a, b) => a - b);
}

/**
 * Sweep an entire draft and report whether it is fit to leave the editor.
 *
 * Pure over everything it can be pure about. The two things it cannot compute
 * without a live rig are injected:
 *
 * @param {object} draft
 * @param {object} [options]
 * @param {(at:number, contact:object)=>(number|null)} [options.measureContactGap]
 *        Render the clip at `at` and return the px distance between the
 *        contact's source joint and its target anchor, or null if it cannot be
 *        measured. The editor supplies this from its live skeletons.
 * @param {()=>object} [options.certify] Live per-frame certification, called at
 *        each swept time; return `{ ok, failures }`.
 * @returns {object} report
 */
export function clipReadiness(draft, { measureContactGap = null, certify = null, grid = READINESS_GRID } = {}) {
    const normalized = normalizeDraft(draft);
    const validation = validateClip(exportClip(normalized));
    const blocking = [...validation.errors];
    const warnings = [];
    const nonFinite = [];
    const unsupportedStaging = [];
    const unsupportedModes = [];
    const certificationFailures = [];

    if (!SUPPORTED_POSTURE_MODES.includes(normalized.posture)) {
        unsupportedModes.push(`posture "${normalized.posture}" is not authorable yet (only ${SUPPORTED_POSTURE_MODES.join(', ')})`);
    }

    // Authored-channel checks run over the RAW keyframes: a channel the runtime
    // cannot consume is a property of what was written, not of what samples out.
    // These also run when validation already failed, so an author fixing one
    // problem sees the rest of them in the same pass.
    for (const [role, track] of Object.entries(normalized.tracks)) {
        for (const frame of track.keyframes) {
            for (const channel of Object.keys(frame.transform ?? {})) {
                if (!RUNTIME_TRANSFORM_CHANNELS.includes(channel)) {
                    unsupportedStaging.push(`${role} @${frame.at}s authors transform.${channel}, which the runtime cannot consume`);
                }
            }
            for (const group of ['pose', 'transform']) {
                for (const [channel, value] of Object.entries(frame[group] ?? {})) {
                    // JSON draft transport turns NaN/Infinity into null, so a
                    // non-finite authored value arrives here as a null rather
                    // than as itself — both are caught by the same test.
                    if (!Number.isFinite(value)) nonFinite.push({ role, at: frame.at, group, channel, source: 'authored' });
                }
            }
        }
    }

    // Sampled checks run over the whole clip, INCLUDING BETWEEN KEYFRAMES —
    // the frames the live per-pose badge never looks at.
    if (validation.ok) {
        const compiled = compileClip(exportClip(normalized));
        for (const at of sampleTimes(normalized, grid)) {
            const sampled = sampleClip(compiled, at);
            for (const [role, state] of Object.entries(sampled.tracks)) {
                for (const group of ['pose', 'transform']) {
                    for (const [channel, value] of Object.entries(state[group] ?? {})) {
                        if (!Number.isFinite(value)) nonFinite.push({ role, at, group, channel, source: 'sampled' });
                    }
                }
            }
            if (certify) {
                const result = certify(at, sampled);
                for (const failure of result?.failures ?? []) certificationFailures.push({ at, ...failure });
            }
        }
    }

    // Contact drift. A snapped pair is exact at the keyframe it was baked on;
    // what the author cannot see is the pair separating between keyframes as
    // two independently interpolated bodies move apart. Report the worst gap so
    // they can add an intermediate keyframe — deliberately NOT a runtime
    // constraint solver, which stays out of this milestone.
    const contacts = [];
    for (const contact of normalized.contacts) {
        let maxGap = 0;
        let worstAt = contact.at;
        let measured = 0;
        if (measureContactGap) {
            for (const at of sampleTimes(normalized, grid)) {
                const gap = measureContactGap(at, contact);
                if (!Number.isFinite(gap)) continue;
                measured++;
                if (gap > maxGap) { maxGap = gap; worstAt = at; }
            }
        }
        contacts.push({ ...contact, maxGap, worstAt, measured, partner: contactPartner(contact.role) });
        if (!measureContactGap || !measured) {
            warnings.push(`${contact.role} ${contact.source} → ${contact.target}: contact gap could not be measured (no live rig)`);
        } else if (maxGap > 1) {
            warnings.push(`${contact.role} ${contact.source} → ${contact.target}: separates to ${maxGap.toFixed(2)} px at ${worstAt.toFixed(3)}s — add a keyframe there`);
        }
    }

    for (const entry of nonFinite) blocking.push(`${entry.role} ${entry.group}.${entry.channel} is not finite at ${entry.at.toFixed(3)}s (${entry.source})`);
    blocking.push(...unsupportedStaging, ...unsupportedModes);
    if (certificationFailures.length) {
        const worst = certificationFailures[0];
        blocking.push(`certification failed at ${worst.at.toFixed(3)}s: ${worst.detail ?? worst.kind ?? 'unspecified'} (${certificationFailures.length} total)`);
    }

    return {
        ok: blocking.length === 0,
        blocking,
        warnings,
        nonFinite,
        unsupportedStaging,
        unsupportedModes,
        certificationFailures,
        contacts,
        // What the runtime will actually take ownership of, so the author can
        // see at a glance whether their staging is live or inert.
        stagedRoles: Object.entries(normalized.tracks)
            .filter(([, track]) => track.keyframes.some(frame => Object.keys(frame.transform ?? {}).length > 0))
            .map(([role]) => role),
        sampledTimes: validation.ok ? sampleTimes(normalized, grid).length : 0,
    };
}

export function variantChoices(character, slot) {
    const variants = character?.textures?.variants ?? {};
    const families = {
        nearUpperArm: 'upperArm', farUpperArm: 'upperArm',
        nearForearm: 'forearm', farForearm: 'forearm',
        nearHand: 'hand', farHand: 'hand',
        nearThigh: 'thigh', farThigh: 'thigh',
        nearShin: 'shin', farShin: 'shin',
        nearBoot: 'boot', farBoot: 'boot',
    };
    return ['base', ...new Set([
        ...Object.keys(variants[families[slot]] ?? {}),
        ...Object.keys(variants[slot] ?? {}),
    ])];
}
