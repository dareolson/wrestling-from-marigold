import { compileClip, sampleClip, validateClip } from '../../src/animation/AnimationClip.js';
// The anchor rule is imported rather than restated: the editor must report the
// same entry tableau the runtime will actually build.
import { pickAnchorRole } from '../../src/animation/clipStaging.js';
// The rig's structural chains are the single source of truth for which joints
// exist as contact anchors — see CONTACT_TARGETS below.
import { STRUCTURAL_CHAINS } from '../../src/rig/certification.js';

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

// Joints a contact pair may name — DERIVED from the rig's own structural chain
// list, not restated. These are exactly the anchors Skeleton publishes in
// jointAttachmentPoints, so a declared contact can always be measured against a
// real rendered point.
//
// Derivation rather than a hand-kept list is the fix for a real drift bug: the
// editor's HTML offered `neck` (a genuine structural joint, the first chain in
// the list) while the model's hand-written array omitted it, so a captured neck
// contact was silently discarded — and in the other direction the HTML omitted
// nearElbow/farElbow/nearAnkle/farAnkle, which the model accepted but no author
// could reach. Two hand-maintained lists plus a third in markup drifted three
// ways. Now there is one source: add a chain to the rig and it becomes
// authorable; the dropdowns are built from these constants at runtime.
export const CONTACT_TARGETS = Object.freeze(STRUCTURAL_CHAINS.map(chain => chain.joint));

// Sources are the limb ENDS the editor can actually solve onto an anchor: the
// wrist closes a shoulder→elbow→wrist chain and the ankle a hip→knee→ankle one.
// A mid-limb joint has no two-bone chain to solve, so it is a valid target but
// never a source.
export const CONTACT_SOURCES = Object.freeze(CONTACT_TARGETS.filter(joint => /(?:Wrist|Ankle)$/.test(joint)));
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

// The separation a fresh PAIRED draft opens with, in rig units.
//
// Not an arbitrary "looks about right" number: Arena._tickLockup holds a tie-up
// at a gap of 100*s, and the hammerlock — the only paired move in the game —
// can only be triggered from inside that lockup. So 100 rig units IS the entry
// geometry a paired move is actually committed at, and a draft that opens there
// already stands where the runtime will PLACE the actors at t=0 (see
// src/animation/clipStaging.js's shared-origin contract).
//
// createDraft itself deliberately does NOT apply this: a bare draft starts both
// roles at x:0, which is the degenerate same-point case clipReadiness warns
// about, and that warning has to keep firing for an author who never separates
// their actors.
export const DEFAULT_ENTRY_SEPARATION = 100;

/**
 * A fresh draft whose non-anchor role already stands at a real tie-up distance
 * from the anchor. This is what the move editor opens with, so the very first
 * thing an author sees is a tableau the runtime can reproduce.
 */
export function createPairedDraft(id = 'untitled_move', duration = 1.2, separation = DEFAULT_ENTRY_SEPARATION) {
    const draft = createDraft(id, duration);
    const anchor = pickAnchorRole(ROLES);
    for (const role of ROLES) {
        if (role === anchor) continue;
        for (const frame of draft.tracks[role].keyframes) frame.transform = { x: separation, y: 0 };
    }
    return draft;
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
        // Captures that could not be recorded, kept so the readiness report can
        // name what was lost. Always present so callers never have to guard it.
        rejectedContacts: [],
    };
}

// Declared contact pairs are AUTHORING METADATA. They exist so the readiness
// report can measure whether interpolation pulls a baked contact apart between
// keyframes; they are deliberately stripped from the exported clip
// (exportClip), never sent to the runtime, and nothing about damage, legality,
// or hit detection may ever read them. Contact in gameplay stays snap-and-bake:
// this records what the author asserted, it does not re-solve it at runtime.
//
// A contact holds over an INTERVAL — `from` (acquisition) to `to` (release) —
// not at a single instant. Grading the gap outside that window is meaningless
// and actively misleading: before acquisition the hand has not arrived yet and
// after release it is deliberately leaving, so a whole-clip sweep would report
// the approach and the follow-through as contact failures and drown the one
// span the author actually asserted. An unreleased contact holds to the end of
// the clip, which is the common case for a working hold.
// Why a contact cannot be recorded, or null if it can. Named separately so the
// capture gesture can refuse loudly with a reason instead of the author finding
// out later — or never.
export function contactRejectionReason(contact) {
    if (!ROLES.includes(contact?.role)) return `unknown role "${contact?.role}"`;
    if (!CONTACT_SOURCES.includes(contact?.source)) {
        return `"${contact?.source}" is not a solvable limb end (expected one of ${CONTACT_SOURCES.join(', ')})`;
    }
    if (!CONTACT_TARGETS.includes(contact?.target)) {
        return `"${contact?.target}" is not a structural anchor on the rig (expected one of ${CONTACT_TARGETS.join(', ')})`;
    }
    return null;
}

// Split declared contacts into what can be graded and what cannot.
//
// Invalid entries are still REMOVED — a contact naming a joint the rig does not
// publish can never be measured, and keeping it would put an ungradeable
// assertion in the draft. But they are no longer dropped on the floor: they are
// returned as `rejected` so the capture gesture, the status line, and the
// readiness report can all say what was lost and why. A silently discarded
// contact is exactly the "green but nothing was actually verified" pattern this
// whole layer exists to prevent, and it is how the neck-target drift survived.
function partitionContacts(source, duration) {
    const contacts = [];
    const rejected = [];
    for (const entry of Array.isArray(source) ? source : []) {
        // `at` is accepted as an alias for `from` so drafts written before
        // contacts carried an interval still load.
        const from = clampTime(entry?.from ?? entry?.at, duration, 0);
        const contact = {
            from,
            // An omitted release means "held to the end of the clip"; a release
            // earlier than acquisition is meaningless, so it collapses to an
            // instant rather than inverting the window.
            to: Math.max(from, clampTime(entry?.to, duration, duration)),
            role: entry?.role,
            source: entry?.source,
            target: entry?.target,
        };
        const reason = contactRejectionReason(contact);
        if (reason) rejected.push({ ...contact, reason });
        else contacts.push(contact);
    }
    contacts.sort((a, b) => a.from - b.from || a.to - b.to);
    rejected.sort((a, b) => a.from - b.from);
    return { contacts, rejected };
}

function clampTime(value, duration, fallback) {
    const time = Number(value);
    if (!Number.isFinite(time)) return fallback;
    return Math.max(0, Math.min(duration, time));
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
    // Rejected entries are carried on the draft (not thrown away) so an
    // imported draft naming a joint the rig does not publish reports the loss
    // in the readiness panel instead of quietly grading nothing.
    //
    // Already-rejected entries are fed back through the partition, which is what
    // makes normalization IDEMPOTENT: without this, a second normalize (and
    // clipReadiness always normalizes again) would rebuild `rejected` from
    // `contacts` alone, find nothing wrong, and quietly report a clean sweep —
    // reintroducing the exact silent-discard bug one layer up. Re-partitioning
    // also means an entry that becomes valid later (a joint added to the rig) is
    // promoted back into `contacts` rather than staying rejected forever.
    const partitioned = partitionContacts(
        [...(draft.contacts ?? []), ...(draft.rejectedContacts ?? [])],
        draft.duration,
    );
    draft.contacts = partitioned.contacts;
    draft.rejectedContacts = partitioned.rejected;
    // Declared posture is PRESERVED, not coerced. Silently rewriting an
    // imported `prone` draft to `upright` would hand the author a clip that
    // does something other than what it says; clipReadiness blocks on it
    // instead, and exportClip drops the field either way.
    draft.posture = typeof draft.posture === 'string' && draft.posture ? draft.posture : 'upright';
    return draft;
}

/**
 * Record a contact pair. Returns `{ ok, contact, reason }` — a refusal carries
 * the reason so the caller can tell the author their capture did not take,
 * rather than the entry disappearing between the gesture and the draft.
 */
export function addContact(draft, { from, at, to, role, source, target }) {
    const candidate = {
        from: round(from ?? at ?? 0),
        to: to === undefined ? undefined : round(to),
        role, source, target,
    };
    const reason = contactRejectionReason(candidate);
    if (reason) {
        // Still recorded as a rejection so the readiness sweep reports it even
        // if the author dismissed the status line.
        draft.rejectedContacts = [...(draft.rejectedContacts ?? []), { ...candidate, to: candidate.to ?? draft.duration, reason }];
        return { ok: false, contact: null, reason };
    }
    draft.contacts = [...(draft.contacts ?? []), candidate];
    const partitioned = partitionContacts(draft.contacts, draft.duration);
    draft.contacts = partitioned.contacts;
    return {
        ok: true,
        contact: draft.contacts.find(entry => entry.from === candidate.from && entry.source === source && entry.target === target) ?? null,
        reason: null,
    };
}

/**
 * Close the open contact a release gesture applies to: the latest one for
 * `role` that was acquired at or before `at` and is still held to the end of
 * the clip. Returns the closed contact, or null when there is nothing to
 * release — the editor reports that rather than silently doing nothing.
 */
export function releaseContact(draft, role, at) {
    const duration = draft.duration;
    const time = clampTime(at, duration, duration);
    const open = (draft.contacts ?? [])
        .filter(contact => contact.role === role && contact.from <= time && contact.to >= duration)
        .sort((a, b) => a.from - b.from)
        .at(-1);
    if (!open) return null;
    open.to = round(time);
    draft.contacts = partitionContacts(draft.contacts, duration).contacts;
    return open;
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
    const allTimes = sampleTimes(normalized, grid);
    for (const contact of normalized.contacts) {
        let maxGap = 0;
        let worstAt = contact.from;
        let measured = 0;
        // Only the held window is graded. The approach before acquisition and
        // the follow-through after release are not contact failures, and
        // grading them would bury the one span the author actually asserted.
        // The endpoints are always included even if the grid misses them.
        const window = [...new Set([contact.from, contact.to, ...allTimes.filter(at => at >= contact.from && at <= contact.to)])]
            .sort((a, b) => a - b);
        if (measureContactGap) {
            for (const at of window) {
                const gap = measureContactGap(at, contact);
                if (!Number.isFinite(gap)) continue;
                measured++;
                if (gap > maxGap) { maxGap = gap; worstAt = at; }
            }
        }
        contacts.push({ ...contact, maxGap, worstAt, measured, graded: window.length, partner: contactPartner(contact.role) });
        const span = `${contact.from.toFixed(3)}–${contact.to.toFixed(3)}s`;
        if (!measureContactGap || !measured) {
            warnings.push(`${contact.role} ${contact.source} → ${contact.target} (${span}): contact gap could not be measured (no live rig)`);
        } else if (maxGap > 1) {
            warnings.push(`${contact.role} ${contact.source} → ${contact.target} (${span}): separates to ${maxGap.toFixed(2)} px at ${worstAt.toFixed(3)}s — add a keyframe there`);
        }
    }

    // A contact the author asserted but that cannot be graded is BLOCKING, not a
    // warning: the whole point of declaring it is to have the gap measured, so
    // an unmeasurable one means the clip reports clean while proving nothing
    // about the thing the author cared most about.
    for (const entry of normalized.rejectedContacts ?? []) {
        blocking.push(`discarded contact ${entry.role} ${entry.source} → ${entry.target} at ${entry.from.toFixed(3)}s: ${entry.reason}`);
    }
    for (const entry of nonFinite) blocking.push(`${entry.role} ${entry.group}.${entry.channel} is not finite at ${entry.at.toFixed(3)}s (${entry.source})`);
    blocking.push(...unsupportedStaging, ...unsupportedModes);
    if (certificationFailures.length) {
        const worst = certificationFailures[0];
        blocking.push(`certification failed at ${worst.at.toFixed(3)}s: ${worst.detail ?? worst.kind ?? 'unspecified'} (${certificationFailures.length} total)`);
    }

    // What the runtime will actually take ownership of, so the author can see at
    // a glance whether their staging is live or inert.
    const stagedRoles = Object.entries(normalized.tracks)
        .filter(([, track]) => track.keyframes.some(frame => Object.keys(frame.transform ?? {}).length > 0))
        .map(([role]) => role);
    const anchorRole = pickAnchorRole(Object.keys(normalized.tracks));

    // The entry tableau. Under the shared-origin contract every staged role is
    // PLACED at these offsets from the anchor at t=0, whatever the trigger
    // distance was — so frame 0 is not a starting hint, it is the committed
    // entry geometry, and it is worth showing the author explicitly.
    let entryTableau = null;
    if (validation.ok && stagedRoles.length) {
        const entry = sampleClip(compileClip(exportClip(normalized)), 0);
        entryTableau = Object.fromEntries(stagedRoles.map(role => [role, {
            x: round(entry.tracks[role].transform.x ?? 0),
            y: round(entry.tracks[role].transform.y ?? 0),
        }]));
        // Two actors authored to the same entry point land on top of each other
        // — the degenerate case of a shared origin, and an easy one to author by
        // accident since a fresh draft starts every role at x:0.
        for (const role of stagedRoles) {
            if (role === anchorRole) continue;
            const offset = entryTableau[role];
            const anchorOffset = entryTableau[anchorRole] ?? { x: 0, y: 0 };
            if (Math.hypot(offset.x - anchorOffset.x, offset.y - anchorOffset.y) < 1) {
                warnings.push(`${role} enters at the same point as ${anchorRole} — author a real entry separation, or the two wrestlers stage on top of each other`);
            }
        }
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
        rejectedContacts: normalized.rejectedContacts ?? [],
        stagedRoles,
        anchorRole,
        entryTableau,
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
