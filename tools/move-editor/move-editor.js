import Skeleton from '/src/Skeleton.js';
import { george } from '/src/characters/george.js';
import { thesz } from '/src/characters/thesz.js';
import { enumerateCharacterAssets, RENDER_PART_SLOTS, SEMANTIC_PART_SLOTS, resolveSemanticSlots } from '/src/rig/partVariants.js';
import { createReferenceRigSkeleton, REFERENCE_RIG_ID } from '/src/rig/referenceRigRuntime.js';
import { certifyPose, classifyFinding, measureSample } from '/src/rig/certification.js';
import {
    CONTACT_SOURCES, CONTACT_TARGETS, EASES, POSE_CHANNELS, ROLES, addContact,
    addEvent, basePose, clipReadiness, contactPartner, createPairedDraft,
    draftValidation, exportModule, insertKeyframe, normalizeDraft,
    draftCompatibility, releaseContact, removeKeyframe, sampleDraft, variantChoices,
} from './model.js';
import { pickAnchorRole } from '/src/animation/clipStaging.js';

const CHARACTERS = { george, thesz };

// ONE shared tableau origin for every role — the editor's copy of the runtime's
// staging frame (src/animation/clipStaging.js). It used to be a base position
// PER ROLE (attacker x=355, defender x=665), which meant the preview and the
// runtime disagreed about what an authored transform MEANS: a draft with both
// roles at x:0 read as a 254-rig-unit tie-up on screen and staged the two
// wrestlers on top of each other in the ring. Under one origin, the offsets an
// author composes here are the offsets the runtime places the actors at, and
// the readiness report's entry tableau describes what is actually on screen.
const TABLEAU_ORIGIN = { x: 430, y: 555 };
const SCALE = 1.22;

// The role whose facing defines the staging axis, chosen by the SAME rule the
// runtime uses so a tableau mirrors here exactly as it does in the ring.
const ANCHOR_ROLE = pickAnchorRole(ROLES);
const stagingFacing = () => (actors[ANCHOR_ROLE]?.facing ?? 1) >= 0 ? 1 : -1;

// Screen delta → authored rig units, along the staging axis. Every gesture that
// moves an actor goes through this, so none of them can quietly author a
// screen-space offset that reads backwards when the tableau is mirrored.
const toRigUnitsX = dx => dx / (SCALE * stagingFacing());
const toRigUnitsY = dy => dy / SCALE;
const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = value => Math.round(value * 1000) / 1000;

let draft = createPairedDraft();
let selectedRole = 'attacker';
let selectedKey = 0;
let selectedEvent = -1;
// The contact pair the last snap solved, held until the author captures the
// keyframe that bakes it. Recording it on capture (rather than on snap) means
// the draft only ever declares contacts that were actually committed.
let pendingContact = null;
let playhead = 0;
let playing = false;
let scene;
let overlay;
let handleLayer;
let lastTick = 0;
let lastCertificationAt = 0;
// The most recent whole-clip sweep, kept so the timeline can colour each
// declared contact by what was actually measured rather than by what was
// asserted. Null until the author sweeps.
let lastReadiness = null;

const actors = {
    attacker: { character: REFERENCE_RIG_ID, runtimeCharacter: null, facing: 1, skeleton: null, pose: basePose(), transform: { x: 0, y: 0 }, parts: {} },
    defender: { character: REFERENCE_RIG_ID, runtimeCharacter: null, facing: -1, skeleton: null, pose: basePose(), transform: { x: 0, y: 0 }, parts: {} },
};

const POSE_UI = {
    lArm:   { label: 'Near shoulder', min: -3.1, max: 3.1, step: 0.01 },
    lElbow: { label: 'Near elbow', min: -0.12, max: 2.75, step: 0.01 },
    rArm:   { label: 'Far shoulder', min: -3.1, max: 3.1, step: 0.01 },
    rElbow: { label: 'Far elbow', min: -0.12, max: 2.75, step: 0.01 },
    lLeg:   { label: 'Near hip', min: -2.8, max: 2.8, step: 0.01 },
    lKnee:  { label: 'Near knee', min: -0.1, max: 2.55, step: 0.01 },
    rLeg:   { label: 'Far hip', min: -2.8, max: 2.8, step: 0.01 },
    rKnee:  { label: 'Far knee', min: -0.1, max: 2.55, step: 0.01 },
    lean:   { label: 'Lean', min: -0.8, max: 0.8, step: 0.01 },
    crouch: { label: 'Crouch', min: 0, max: 1, step: 0.01 },
};

// Draft `transform` is stored in RIG UNITS (unscaled body space), never in
// stage pixels — that is the unit the gameplay runtime consumes (see
// src/animation/clipStaging.js). The preview multiplies by its own SCALE here,
// and every authoring gesture divides by it on the way back in, so an offset
// authored in the editor means the same body distance in the ring no matter
// what either view is zoomed to.
function actorRoot(role) {
    const actor = actors[role];
    return {
        x: TABLEAU_ORIGIN.x + stagingFacing() * (actor.transform.x ?? 0) * SCALE,
        y: TABLEAU_ORIGIN.y + (actor.transform.y ?? 0) * SCALE,
    };
}

function anatomicalSide(actor, visualSide) {
    if (visualSide === 'near') return actor.facing >= 0 ? 'l' : 'r';
    return actor.facing >= 0 ? 'r' : 'l';
}

function renderActor(role) {
    const actor = actors[role];
    if (!actor.skeleton) return;
    const root = actorRoot(role);
    actor.skeleton.setVisible(true);
    // Semantic slots (strikingForearm, workingHand) resolve through the SAME
    // table Wrestler.applyAnimationSample uses, so the art an author sees here
    // is the art the game puts on screen — including facing left, where the
    // role-bearing limb is the far one.
    actor.skeleton.setPartVariants(resolveSemanticSlots(actor.parts, actor.facing));
    actor.skeleton.updateUpright(root.x, root.y, SCALE, actor.facing, actor.pose, 0, 0, actor.facing * (actor.pose.lean ?? 0), 0, 0.5, 0);
}

function loadSample(at = playhead) {
    const sampled = sampleDraft(draft, at);
    for (const role of ROLES) {
        const state = sampled.tracks[role];
        actors[role].pose = { ...basePose(), ...state.pose };
        actors[role].transform = { x: 0, y: 0, ...state.transform };
        actors[role].parts = { ...state.parts };
    }
    syncControls();
    refreshOnionSkins();
}

function setPlayhead(value, { sample = true } = {}) {
    playhead = clamp(Number(value) || 0, 0, draft.duration);
    $('scrubber').value = playhead;
    $('time').value = playhead.toFixed(3);
    if (sample) loadSample(playhead);
    renderTimeline();
}

function rebuildActor(role) {
    const actor = actors[role];
    actor.skeleton?.destroy?.();
    const depth = role === 'attacker' ? 20 : 10;
    if (actor.character === REFERENCE_RIG_ID) {
        const built = createReferenceRigSkeleton(scene, { keyPrefix: `${REFERENCE_RIG_ID}-${role}`, depth });
        actor.skeleton = built.skeleton;
        actor.runtimeCharacter = built.character;
    } else {
        actor.runtimeCharacter = CHARACTERS[actor.character];
        actor.skeleton = new Skeleton(scene, actor.runtimeCharacter.skinCol, actor.runtimeCharacter.trunksCol, actor.runtimeCharacter.textures);
        actor.skeleton.setDepth(depth);
    }
    renderActor(role);
}

const CERT_SLOTS = [
    'torso', 'head', 'pelvisUnderlay', 'pelvisMask', 'pelvisOverlay',
    'nearUpArm', 'farUpArm', 'nearForearm', 'farForearm', 'nearHand', 'farHand',
    'nearThigh', 'farThigh', 'nearShin', 'farShin', 'nearBoot', 'farBoot',
];

function renderedTransform(image) {
    if (!image) return null;
    return {
        visible: image.visible !== false,
        x: image.x, y: image.y, rotation: image.rotation,
        originX: image.originX, originY: image.originY,
        displayWidth: image.displayWidth, displayHeight: image.displayHeight,
        flipX: !!image.flipX, depth: image.depth,
        anchors: image._binding
            ? { proximal: image._binding.proximal, distal: image._binding.distal }
            : null,
    };
}

function certificationSample(skeleton) {
    const parts = {};
    for (const slot of CERT_SLOTS) {
        const transform = renderedTransform(skeleton[slot]);
        if (transform) parts[slot] = transform;
    }
    if (parts.torso && skeleton._torsoSockets) parts.torso.sockets = { ...skeleton._torsoSockets };
    if (parts.head && skeleton._headAnchorFrac) parts.head.anchors = { proximal: skeleton._headAnchorFrac };
    const flex = {};
    for (const channel of ['lElbow', 'rElbow', 'lKnee', 'rKnee']) {
        const value = skeleton.currentPoseChannel(channel);
        if (value !== undefined) flex[channel] = value;
    }
    return {
        parts, flex,
        joints: clone(skeleton.jointAttachmentPoints ?? {}),
        semanticAnchors: clone(skeleton.semanticAnchors ?? {}),
    };
}

function updateCertification() {
    const messages = [];
    let warning = false;
    for (const role of ROLES) {
        const actor = actors[role];
        const sample = certificationSample(actor.skeleton);
        const findings = certifyPose(sample);
        const unmeasurable = measureSample(sample).filter(item => item.status !== 'measured');
        if (findings.length) {
            warning = true;
            messages.push(`${role}: FAIL — ${findings.map(item => item.kind).join(', ')}`);
        } else if (unmeasurable.length) {
            messages.push(`${role}: UNVERIFIED — ${unmeasurable.length} structural chains are not measurable on ${actor.character}.`);
        } else {
            messages.push(`${role}: PASS — rendered anchors and pelvis depth are inside the production budget.`);
        }
    }
    $('certification').textContent = messages.join(' ');
    $('certification').classList.toggle('warning', warning);
}

function status(message, warning = false) {
    $('status').textContent = message;
    $('status').classList.toggle('warning', warning);
}

function syncControls() {
    const actor = actors[selectedRole];
    $('role').value = selectedRole;
    $('character').value = actor.character;
    $('facing').value = actor.facing;
    const frame = draft.tracks[selectedRole].keyframes[selectedKey];
    $('ease').value = frame?.ease ?? 'linear';
    for (const channel of POSE_CHANNELS) {
        const input = $(`pose-${channel}`);
        if (!input) continue;
        input.value = actor.pose[channel] ?? basePose()[channel] ?? 0;
        $(`out-${channel}`).value = Number(input.value).toFixed(2);
    }
    for (const axis of ['x', 'y']) {
        $(`root-${axis}`).value = actor.transform[axis] ?? 0;
        $(`out-root-${axis}`).value = round(actor.transform[axis] ?? 0);
    }
    buildVariantControls();
}

function buildPoseControls() {
    const host = $('poseControls');
    host.innerHTML = '';
    for (const [channel, spec] of Object.entries(POSE_UI)) {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<label>${spec.label}</label><input id="pose-${channel}" type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}"><output id="out-${channel}"></output>`;
        host.append(row);
        row.querySelector('input').addEventListener('input', event => {
            playing = false;
            mutate(`${spec.label}`, () => {
                actors[selectedRole].pose[channel] = Number(event.target.value);
                row.querySelector('output').value = Number(event.target.value).toFixed(2);
            }, { coalesce: `pose:${selectedRole}:${channel}` });
        });
    }
    for (const axis of ['x', 'y']) {
        const row = document.createElement('div');
        row.className = 'row';
        // Range is rig units: ±240 covers the full ring width at the near rope
        // without letting a slider author an offset no ring position can honour.
        row.innerHTML = `<label>Actor ${axis.toUpperCase()} (rig units)</label><input id="root-${axis}" type="range" min="-240" max="240" step="0.5"><output id="out-root-${axis}"></output>`;
        host.append(row);
        row.querySelector('input').addEventListener('input', event => {
            playing = false;
            mutate(`actor ${axis.toUpperCase()}`, () => {
                actors[selectedRole].transform[axis] = Number(event.target.value);
                row.querySelector('output').value = event.target.value;
            }, { coalesce: `transform:${selectedRole}:${axis}` });
        });
    }
}

function buildVariantControls() {
    const host = $('variantControls');
    host.innerHTML = '';
    const actor = actors[selectedRole];
    const character = actor.runtimeCharacter;
    let useful = 0;
    // Semantic slots first: authoring the ROLE ("the working hand") is what
    // keeps the art on the correct limb when the move runs facing left, so it
    // is the choice an author should reach for before a literal near/far slot.
    // Their choices come from the render slot the role currently maps to.
    const slots = [
        ...Object.keys(SEMANTIC_PART_SLOTS).map(slot => ({
            slot,
            label: `${slot} (role)`,
            family: SEMANTIC_PART_SLOTS[slot][actor.facing >= 0 ? 'near' : 'far'],
        })),
        ...RENDER_PART_SLOTS.map(slot => ({ slot, label: slot, family: slot })),
    ];
    for (const { slot, label, family } of slots) {
        const choices = variantChoices(character, family);
        if (choices.length === 1 && !(slot in actor.parts)) continue;
        useful++;
        const row = document.createElement('div');
        row.className = 'row wide';
        const options = choices.map(choice => `<option${(actor.parts[slot] ?? 'base') === choice ? ' selected' : ''}>${choice}</option>`).join('');
        row.innerHTML = `<label>${label}</label><select>${options}</select>`;
        row.querySelector('select').addEventListener('change', event => {
            mutate(`${label} variant`, () => {
                if (event.target.value === 'base') delete actor.parts[slot];
                else actor.parts[slot] = event.target.value;
            });
        });
        host.append(row);
    }
    if (!useful) host.innerHTML = '<p class="hint">This character has no authored variants yet. Variant families will appear here automatically when added to its character config.</p>';
}

function capture() {
    return mutate('capture', captureNow);
}

function captureNow() {
    const actor = actors[selectedRole];
    selectedKey = insertKeyframe(draft, selectedRole, playhead, {
        ease: $('ease').value,
        pose: Object.fromEntries(POSE_CHANNELS.map(channel => [channel, round(actor.pose[channel] ?? 0)])),
        transform: { x: round(actor.transform.x ?? 0), y: round(actor.transform.y ?? 0) },
        parts: actor.parts,
    });
    let contactNote = '';
    if (pendingContact && pendingContact.role === selectedRole) {
        // Acquired here, held to the end of the clip until the author releases
        // it at a chosen frame. The readiness sweep grades only that window.
        const result = addContact(draft, { from: playhead, ...pendingContact });
        // A refusal is reported, never swallowed: the author asked for this pair
        // to be graded, and needs to know if it was not recorded.
        if (result.ok) contactNote = ` Contact ${pendingContact.source} → ${pendingContact.target} acquired, held to end.`;
        else contactNote = ` CONTACT NOT RECORDED — ${result.reason}`;
        pendingContact = null;
    }
    renderTimeline();
    validate();
    const message = `Captured ${selectedRole} keyframe at ${playhead.toFixed(3)}s.${contactNote}`;
    if (contactNote.includes('NOT RECORDED')) status(message, true);
    else status(message);
}

// ── Onion skinning ───────────────────────────────────────────────────────────
//
// The adjacent keyframes of the SELECTED actor, drawn as thin joint chains
// behind the live rig. Deliberately drawn as lines rather than as ghosted
// copies of the skeleton: a translucent second body reads as a real wrestler
// you can grab, and this editor's whole interaction model is "drag the thing
// you can see". A wire chain cannot be mistaken for a live part and cannot be
// clicked — it lives on the same non-interactive Graphics layer as the chain
// overlay, so there is no hit target to hit.
//
// Previous is cool, next is warm, both well under the live rig's contrast.
const ONION = Object.freeze({
    previous: { color: 0x5fa8ff, alpha: 0.30 },
    next: { color: 0xffb45f, alpha: 0.30 },
});
const ONION_CHAINS = [
    ['nearShoulder', 'nearElbow', 'nearWrist'],
    ['farShoulder', 'farElbow', 'farWrist'],
    ['nearHip', 'nearKnee', 'nearAnkle'],
    ['farHip', 'farKnee', 'farAnkle'],
    ['neck', 'nearShoulder'],
    ['neck', 'farShoulder'],
    ['nearHip', 'farHip'],
];
let onionSkins = { previous: null, next: null };

// Render `role` at an arbitrary sampled state and read back the joints the real
// renderer published, restoring what was on screen. Same technique the readiness
// sweep uses to measure a contact at a time the author is not looking at.
function jointsAtKeyframe(role, frame) {
    const actor = actors[role];
    const saved = { pose: { ...actor.pose }, transform: { ...actor.transform }, parts: { ...actor.parts } };
    try {
        const sampled = sampleDraft(draft, frame.at).tracks[role];
        actor.pose = { ...basePose(), ...sampled.pose };
        actor.transform = { x: 0, y: 0, ...sampled.transform };
        actor.parts = { ...sampled.parts };
        renderActor(role);
        return clone(actor.skeleton.jointAttachmentPoints ?? {});
    } finally {
        Object.assign(actors[role], saved);
        renderActor(role);
    }
}

// Recomputed only when the frame in view or the draft changes — an onion skin
// is a property of the neighbouring KEYFRAMES, not of the pose being edited, so
// re-solving it every rendered frame would be pure waste.
function refreshOnionSkins() {
    onionSkins = { previous: null, next: null };
    if (!$('onionSkin')?.checked) return;
    const frames = draft.tracks[selectedRole]?.keyframes ?? [];
    if (frames.length < 2) return;
    const previous = [...frames].reverse().find(frame => frame.at < playhead - 1e-6);
    const next = frames.find(frame => frame.at > playhead + 1e-6);
    if (previous) onionSkins.previous = { at: previous.at, joints: jointsAtKeyframe(selectedRole, previous) };
    if (next) onionSkins.next = { at: next.at, joints: jointsAtKeyframe(selectedRole, next) };
}

function drawOnionSkins() {
    for (const [which, skin] of Object.entries(onionSkins)) {
        if (!skin) continue;
        const style = ONION[which];
        overlay.lineStyle(1.5, style.color, style.alpha);
        for (const chain of ONION_CHAINS) {
            const points = chain.map(joint => skin.joints[joint]).filter(Boolean);
            if (points.length !== chain.length) continue;
            overlay.beginPath();
            overlay.moveTo(points[0].x, points[0].y);
            for (const point of points.slice(1)) overlay.lineTo(point.x, point.y);
            overlay.strokePath();
        }
        overlay.fillStyle(style.color, style.alpha);
        for (const joint of new Set(ONION_CHAINS.flat())) {
            const point = skin.joints[joint];
            if (point) overlay.fillCircle(point.x, point.y, 2.5);
        }
    }
}

// ── Production readiness sweep ───────────────────────────────────────────────

// Measure a declared contact pair at an arbitrary clip time by rendering BOTH
// actors at that time and reading the real jointAttachmentPoints — the same
// forward kinematics the snap used, so a gap reported here is the gap the
// author would see if they scrubbed to that frame. The live actor state is
// saved and restored so a sweep never disturbs what is on screen.
function measureContactGapAt(at, contact, source = draft) {
    const saved = Object.fromEntries(ROLES.map(role => [role, {
        pose: { ...actors[role].pose },
        transform: { ...actors[role].transform },
        parts: { ...actors[role].parts },
    }]));
    try {
        const sampled = sampleDraft(source, at);
        for (const role of ROLES) {
            const state = sampled.tracks[role];
            actors[role].pose = { ...basePose(), ...state.pose };
            actors[role].transform = { x: 0, y: 0, ...state.transform };
            actors[role].parts = { ...state.parts };
            renderActor(role);
        }
        const from = actors[contact.role].skeleton?.jointAttachmentPoints?.[contact.source];
        const target = actors[contactPartner(contact.role)].skeleton?.jointAttachmentPoints?.[contact.target];
        if (!from || !target) return null;
        return Math.hypot(from.x - target.x, from.y - target.y);
    } finally {
        for (const role of ROLES) Object.assign(actors[role], saved[role]);
        for (const role of ROLES) renderActor(role);
    }
}

// Certification at an arbitrary clip time, for the whole-clip sweep. The live
// badge only ever certifies the frame on screen; this drives every sampled
// frame through the same pure invariant kernel as `npm run rig:certify`.
//
// The sampled PART VARIANTS are applied before measuring, not just the pose. A
// variant swap moves painted joint anchors — that is what certifyVariantDrift
// exists to catch — so certifying a variant frame against base art certifies a
// rig the clip never renders, and would pass a clip whose fist or grip breaks
// the chain at exactly the contact frame.
function certifyAt(at) {
    const failures = [];
    const saved = Object.fromEntries(ROLES.map(role => [role, {
        pose: { ...actors[role].pose },
        transform: { ...actors[role].transform },
        parts: { ...actors[role].parts },
    }]));
    try {
        const sampled = sampleDraft(draft, at);
        for (const role of ROLES) {
            actors[role].pose = { ...basePose(), ...sampled.tracks[role].pose };
            actors[role].transform = { x: 0, y: 0, ...sampled.tracks[role].transform };
            actors[role].parts = { ...sampled.tracks[role].parts };
            renderActor(role);
            for (const finding of certifyPose(certificationSample(actors[role].skeleton))) {
                const variants = Object.entries(actors[role].parts).map(([slot, name]) => `${slot}=${name}`).join(' ');
                // Attributed by the certifier's own rule, not guessed here: on
                // the reference rig a geometry failure is architectural (its
                // anchors and its ink are generated from each other, so no
                // artwork is left to blame), while the same finding on a legacy
                // character is that character's art.
                const isReference = actors[role].character === REFERENCE_RIG_ID;
                const layer = classifyFinding({
                    finding,
                    referenceFailed: false,
                    characterIsCompliant: isReference,
                    renderPath: 'upright',
                    isReference,
                });
                failures.push({ role, kind: finding.kind, layer, detail: `${role} ${finding.kind} on ${actors[role].character}${variants ? ` [${variants}]` : ''}` });
            }
        }
    } finally {
        for (const role of ROLES) Object.assign(actors[role], saved[role]);
        for (const role of ROLES) renderActor(role);
    }
    return { ok: failures.length === 0, failures };
}

// The reach of the limb a contact is declared on, measured on the live rig:
// shoulder→elbow→wrist (or hip→knee→ankle) laid out straight. clipReadiness
// uses it to tell "this hold drifts apart between keyframes" (fixable by
// posing) from "these two bodies were never staged close enough to touch"
// (fixable only by changing the tableau or the choreography).
function measureContactReachAt(contact) {
    const joints = actors[contact.role]?.skeleton?.jointAttachmentPoints ?? {};
    const side = contact.source.startsWith('near') ? 'near' : 'far';
    const chain = contact.source.endsWith('Wrist')
        ? [`${side}Shoulder`, `${side}Elbow`, `${side}Wrist`]
        : [`${side}Hip`, `${side}Knee`, `${side}Ankle`];
    const [a, b, c] = chain.map(joint => joints[joint]);
    if (!a || !b || !c) return null;
    return Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y);
}

// Sweep an ARBITRARY draft against the live rigs, without adopting it as the
// editing session. The readiness panel always reports the draft on screen; a
// tool (or a test) sometimes needs to ask "what would this other draft grade
// as?" and must not have to overwrite the author's work to find out.
function readinessFor(candidate) {
    return clipReadiness(candidate, {
        measureContactGap: (at, contact) => measureContactGapAt(at, contact, candidate),
        measureContactReach: measureContactReachAt,
        certify: null,
    });
}

function runReadiness() {
    playing = false;
    const report = clipReadiness(draft, {
        measureContactGap: measureContactGapAt,
        measureContactReach: measureContactReachAt,
        certify: certifyAt,
    });
    lastReadiness = report;
    const lines = [];
    lines.push(report.ok
        ? `READY — swept ${report.sampledTimes} frames across the whole clip.`
        : `NOT READY — ${report.blocking.length} blocking issue(s) across ${report.sampledTimes} swept frames.`);
    lines.push(report.stagedRoles.length
        ? `Runtime will own position for: ${report.stagedRoles.join(', ')} (transform is live).`
        : 'No authored staging — the move executor keeps ownership of position.');
    for (const issue of report.blocking) lines.push(`✗ ${issue}`);
    for (const warning of report.warnings) lines.push(`! ${warning}`);
    for (const contact of report.contacts) {
        if (!contact.measured) continue;
        const held = contact.to >= draft.duration ? 'held to end' : `released ${contact.to.toFixed(3)}s`;
        lines.push(`· ${contact.role} ${contact.source} → ${contact.target} (${contact.from.toFixed(3)}s, ${held}): ${contact.severity.toUpperCase()} — worst gap ${contact.maxGap.toFixed(2)} px at ${contact.worstAt.toFixed(3)}s over ${contact.graded} graded frames${Number.isFinite(contact.reachPx) ? `, limb reach ${contact.reachPx.toFixed(2)} px` : ''}`);
    }
    // Rejected contacts are already listed in `blocking` above (that is what
    // makes the report NOT READY) — no second copy here.
    if (!report.contacts.length && !report.rejectedContacts.length) {
        lines.push('· No contact pairs declared. Snap a limb and capture the keyframe to track one.');
    }
    // The entry tableau is load-bearing under the shared-origin contract: these
    // offsets are where the runtime PLACES the actors at t=0, from the anchor's
    // position, regardless of how far apart they were when the move fired.
    if (report.entryTableau) {
        const entries = Object.entries(report.entryTableau).map(([role, offset]) => `${role} x${offset.x >= 0 ? '+' : ''}${offset.x}/y${offset.y >= 0 ? '+' : ''}${offset.y}`);
        lines.push(`· Entry tableau (rig units from the ${report.anchorRole} at t=0): ${entries.join(', ')}`);
    }
    $('readiness').textContent = lines.join('\n');
    $('readiness').classList.toggle('warning', !report.ok);
    // Re-render the rails so each declared contact is coloured by what this
    // sweep measured, not by what it was asserted to be.
    renderTimeline();
    // Restore what the author was looking at — the sweep re-rendered both
    // actors many times to measure.
    loadSample();
    return report;
}

function validate() {
    const result = draftValidation(draft);
    if (!result.ok) status(result.errors.join(' · '), true);
    return result.ok;
}

function selectKey(role, index) {
    selectedRole = role;
    selectedKey = index;
    selectedEvent = -1;
    const frame = draft.tracks[role].keyframes[index];
    setPlayhead(frame.at);
    syncControls();
    refreshOnionSkins();
}

// Contact spans on the role's rail: acquisition, the maintained window, and
// release, drawn where the author is already looking at time. A contact is an
// INTERVAL — the panel could only ever say "there is one" — and the three
// phases of a hold are exactly what a timeline is for.
//
// Discarded captures are drawn too, hatched and in the failure colour. A
// capture that could not be recorded is the one thing that must never be
// invisible: it is already blocking in the readiness sweep, and this is the
// second place it cannot hide.
function renderContactSpans(rail, role) {
    const duration = draft.duration || 1;
    const spans = [
        ...(draft.contacts ?? []).filter(contact => contact.role === role).map(contact => ({ contact, rejected: false })),
        ...(draft.rejectedContacts ?? []).filter(contact => contact.role === role).map(contact => ({ contact, rejected: true })),
    ];
    for (const { contact, rejected } of spans) {
        const span = document.createElement('div');
        span.className = `contact${rejected ? ' rejected' : ''}`;
        span.style.left = `${(contact.from / duration) * 100}%`;
        span.style.width = `${Math.max(0.6, ((contact.to - contact.from) / duration) * 100)}%`;
        const graded = lastReadiness?.contacts?.find(entry => entry.role === contact.role
            && entry.source === contact.source && entry.target === contact.target && entry.from === contact.from);
        if (graded) span.dataset.severity = graded.severity;
        span.title = rejected
            ? `DISCARDED ${contact.source} → ${contact.target}: ${contact.reason}`
            : `${contact.source} → ${contact.target} held ${contact.from.toFixed(3)}–${contact.to.toFixed(3)}s`
                + (graded ? ` · worst gap ${graded.maxGap.toFixed(1)} px (${graded.severity})` : ' · sweep readiness to measure it');
        span.innerHTML = `<b class="acquire"></b><span class="label">${contact.source}→${contact.target}</span><b class="release"></b>`;
        rail.append(span);
    }
}

function renderTimeline() {
    const tracks = $('tracks');
    tracks.querySelectorAll('.track').forEach(node => node.remove());
    $('playhead').style.left = `calc(82px + (100% - 82px) * ${draft.duration ? playhead / draft.duration : 0})`;
    for (const role of ROLES) {
        const track = document.createElement('div');
        track.className = 'track';
        track.innerHTML = `<div class="track-label">${role}</div><div class="rail"></div>`;
        const rail = track.querySelector('.rail');
        renderContactSpans(rail, role);
        rail.addEventListener('pointerdown', event => {
            if (event.target !== rail) return;
            const rect = rail.getBoundingClientRect();
            setPlayhead(((event.clientX - rect.left) / rect.width) * draft.duration);
        });
        draft.tracks[role].keyframes.forEach((frame, index) => {
            const key = document.createElement('button');
            key.className = `key${role === selectedRole && index === selectedKey ? ' selected' : ''}`;
            key.style.left = `${frame.at / draft.duration * 100}%`;
            key.title = `${role} ${frame.at.toFixed(3)}s`;
            key.addEventListener('click', event => { event.stopPropagation(); selectKey(role, index); });
            rail.append(key);
        });
        tracks.append(track);
    }
    const eventTrack = document.createElement('div');
    eventTrack.className = 'track';
    eventTrack.innerHTML = '<div class="track-label">events</div><div class="rail"></div>';
    draft.events.forEach((marker, index) => {
        const event = document.createElement('button');
        event.className = `event${selectedEvent === index ? ' selected' : ''}`;
        event.style.left = `${marker.at / draft.duration * 100}%`;
        event.title = `${marker.type} ${marker.at.toFixed(3)}s`;
        event.addEventListener('click', () => {
            selectedEvent = index;
            setPlayhead(marker.at);
            $('eventType').value = marker.type;
        });
        eventTrack.querySelector('.rail').append(event);
    });
    tracks.append(eventTrack);
}

function pointAngle(from, to) {
    return Math.atan2(to.x - from.x, to.y - from.y);
}

function solveTwoBone(root, target, upperLength, lowerLength, bendSign) {
    const dx = target.x - root.x;
    const dy = target.y - root.y;
    const distance = clamp(Math.hypot(dx, dy), Math.abs(upperLength - lowerLength) + 0.001, upperLength + lowerLength - 0.001);
    const direction = Math.atan2(dx, dy);
    const shoulderOffset = Math.acos(clamp((upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * upperLength * distance), -1, 1));
    const upper = direction - bendSign * shoulderOffset;
    const elbow = { x: root.x + Math.sin(upper) * upperLength, y: root.y + Math.cos(upper) * upperLength };
    const lower = pointAngle(elbow, target);
    return { upper, lower };
}

function applyChainDrag(role, visualSide, kind, target) {
    return mutate(`${role} ${visualSide} ${kind} drag`, () => applyChainDragNow(role, visualSide, kind, target),
        { coalesce: `chain:${role}:${visualSide}:${kind}` });
}

function applyChainDragNow(role, visualSide, kind, target) {
    const actor = actors[role];
    const sk = actor.skeleton;
    const side = anatomicalSide(actor, visualSide);
    const points = sk.jointAttachmentPoints ?? {};
    const isArm = kind === 'wrist';
    const proximal = points[`${visualSide}${isArm ? 'Shoulder' : 'Hip'}`];
    const middle = points[`${visualSide}${isArm ? 'Elbow' : 'Knee'}`];
    const distal = points[`${visualSide}${isArm ? 'Wrist' : 'Ankle'}`];
    if (!proximal || !middle || !distal) return;
    const upperLength = Math.hypot(middle.x - proximal.x, middle.y - proximal.y);
    const lowerLength = Math.hypot(distal.x - middle.x, distal.y - middle.y);
    const cross = (middle.x - proximal.x) * (distal.y - middle.y) - (middle.y - proximal.y) * (distal.x - middle.x);
    const solved = solveTwoBone(proximal, target, upperLength, lowerLength, cross >= 0 ? 1 : -1);
    const upperChannel = `${side}${isArm ? 'Arm' : 'Leg'}`;
    const flexChannel = `${side}${isArm ? 'Elbow' : 'Knee'}`;
    const currentUpper = pointAngle(proximal, middle);
    actor.pose[upperChannel] = clamp((actor.pose[upperChannel] ?? 0) + actor.facing * (solved.upper - currentUpper), -3.1, 3.1);
    actor.pose[flexChannel] = clamp((solved.lower - solved.upper) * actor.facing, isArm ? -0.12 : -0.1, isArm ? 2.75 : 2.55);
    syncControls();
}

function snapContact() {
    playing = false;
    return mutate('contact snap', snapContactNow);
}

function snapContactNow() {
    const role = selectedRole;
    const otherRole = role === 'attacker' ? 'defender' : 'attacker';
    const sourceName = $('contactSource').value;
    const targetName = $('contactTarget').value;
    const visualSide = sourceName.startsWith('near') ? 'near' : 'far';
    const kind = sourceName.endsWith('Wrist') ? 'wrist' : 'ankle';
    const sourceActor = actors[role];
    const target = actors[otherRole].skeleton?.jointAttachmentPoints?.[targetName];
    if (!target) { status(`The other wrestler has no ${targetName} anchor in this render.`, true); return; }

    // Bring the selected actor's root into a solvable range before IK. This is
    // a one-click authoring aid, not a persistent runtime constraint: capture
    // the resulting root transform and pose into the keyframe.
    let points = sourceActor.skeleton.jointAttachmentPoints ?? {};
    const proximalName = `${visualSide}${kind === 'wrist' ? 'Shoulder' : 'Hip'}`;
    const middleName = `${visualSide}${kind === 'wrist' ? 'Elbow' : 'Knee'}`;
    let proximal = points[proximalName];
    const middle = points[middleName];
    const distal = points[sourceName];
    if (!proximal || !middle || !distal) { status('The selected limb is unavailable.', true); return; }
    const upper = Math.hypot(middle.x - proximal.x, middle.y - proximal.y);
    const lower = Math.hypot(distal.x - middle.x, distal.y - middle.y);
    const dx = target.x - proximal.x, dy = target.y - proximal.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const wanted = clamp(distance, Math.abs(upper - lower) + 2, upper + lower - 2);
    if (Math.abs(wanted - distance) > 0.01) {
        sourceActor.transform.x += toRigUnitsX(target.x - dx / distance * wanted - proximal.x);
        sourceActor.transform.y += toRigUnitsY(target.y - dy / distance * wanted - proximal.y);
        renderActor(role);
        points = sourceActor.skeleton.jointAttachmentPoints;
        proximal = points[proximalName];
    }
    // Re-solving against the newly rendered chain absorbs character-specific
    // shoulder/hip socket and display-angle biases. A final actor translation
    // removes any residual without detaching or distorting the limb.
    for (let pass = 0; pass < 4; pass++) {
        applyChainDragNow(role, visualSide, kind, target);
        renderActor(role);
    }
    let landed = sourceActor.skeleton.jointAttachmentPoints[sourceName];
    sourceActor.transform.x += toRigUnitsX(target.x - landed.x);
    sourceActor.transform.y += toRigUnitsY(target.y - landed.y);
    renderActor(role);
    landed = sourceActor.skeleton.jointAttachmentPoints[sourceName];
    const gap = Math.hypot(landed.x - target.x, landed.y - target.y);
    // Record the pair declaratively so the readiness sweep can re-measure it at
    // every sampled time, not just the keyframe it was baked on. This is
    // authoring metadata only — stripped from the exported clip, never read by
    // gameplay (see model.js normalizeContacts).
    pendingContact = { role, source: sourceName, target: targetName };
    $('contactGap').textContent = `${role} ${sourceName} → ${otherRole} ${targetName}: ${gap.toFixed(2)} px gap. Capture the keyframe to bake it.`;
    status(gap <= 1 ? 'Contact aligned.' : `Contact is ${gap.toFixed(2)} px apart; refine the actor root or pose.`, gap > 1);
    syncControls();
}

function makeHandle(role, name, color, onDrag) {
    const circle = scene.add.circle(0, 0, 7, color, 0.92).setStrokeStyle(2, 0xffffff, 0.8).setDepth(100).setInteractive({ draggable: true, useHandCursor: true });
    circle._moveHandle = { role, name };
    scene.input.setDraggable(circle);
    circle.on('dragstart', () => { playing = false; selectedRole = role; syncControls(); });
    circle.on('drag', (_pointer, x, y) => onDrag({ x, y }));
    handleLayer.push(circle);
    return circle;
}

function rebuildHandles() {
    for (const handle of handleLayer) handle.destroy();
    handleLayer = [];
    for (const role of ROLES) {
        for (const side of ['near', 'far']) {
            makeHandle(role, `${side}Wrist`, side === 'near' ? 0x4ed6ff : 0x247ca1, target => applyChainDrag(role, side, 'wrist', target));
            makeHandle(role, `${side}Ankle`, side === 'near' ? 0xffca58 : 0xa77c25, target => applyChainDrag(role, side, 'ankle', target));
        }
        makeHandle(role, 'root', role === 'attacker' ? 0x74ec8b : 0xf0788a, target => {
            mutate(`${role} staging drag`, () => {
                const root = actorRoot(role);
                actors[role].transform.x += toRigUnitsX(target.x - root.x);
                actors[role].transform.y += toRigUnitsY(target.y - root.y);
                syncControls();
            }, { coalesce: `root:${role}` });
        });
    }
}

function updateHandles() {
    overlay.clear();
    // Behind the live chain overlay and the handles, so the frame being edited
    // always reads as the foreground one.
    drawOnionSkins();
    for (const handle of handleLayer) {
        const { role, name } = handle._moveHandle;
        const sk = actors[role].skeleton;
        let point;
        if (name === 'root') point = actorRoot(role);
        else point = sk?.jointAttachmentPoints?.[name];
        if (point) handle.setPosition(point.x, point.y).setVisible(true);
        else handle.setVisible(false);
    }
    for (const role of ROLES) {
        const points = actors[role].skeleton?.jointAttachmentPoints ?? {};
        overlay.lineStyle(2, role === selectedRole ? 0x76dfff : 0x667080, 0.65);
        for (const side of ['near', 'far']) {
            for (const chain of [['Shoulder', 'Elbow', 'Wrist'], ['Hip', 'Knee', 'Ankle']]) {
                const values = chain.map(joint => points[`${side}${joint}`]).filter(Boolean);
                if (values.length !== 3) continue;
                overlay.beginPath(); overlay.moveTo(values[0].x, values[0].y); overlay.lineTo(values[1].x, values[1].y); overlay.lineTo(values[2].x, values[2].y); overlay.strokePath();
            }
        }
    }
}

// Build the contact dropdowns from the model constants, which are derived from
// the rig's STRUCTURAL_CHAINS. The markup deliberately declares empty selects:
// every joint the model accepts is reachable here by construction, and a joint
// it does not accept cannot be offered. Defaults pick a wrist source and the
// opposite wrestler's near shoulder — a plausible collar tie rather than the
// degenerate wrist→wrist self-reference the old markup defaulted to.
function buildContactControls() {
    for (const [id, options, preferred] of [
        ['contactSource', CONTACT_SOURCES, 'nearWrist'],
        ['contactTarget', CONTACT_TARGETS, 'nearShoulder'],
    ]) {
        const select = $(id);
        select.innerHTML = options.map(joint => `<option>${joint}</option>`).join('');
        select.value = options.includes(preferred) ? preferred : options[0];
    }
}

// ── Undo / redo ──────────────────────────────────────────────────────────────
//
// History is SNAPSHOT-based, not command-based: every entry is the whole
// authoring state — the draft plus the live actor state that has not been
// captured into a keyframe yet plus the selection. A command log would have to
// know how to invert a two-bone IK solve, a contact snap that also moved the
// actor root, and a duration change that re-clamps every keyframe; a snapshot
// restores all of it by construction, and "undo leaves a coherent state" stops
// being something each new gesture has to remember to preserve.
//
// The uncaptured actor state is deliberately part of it. Posing an arm and then
// undoing must put the arm back even though nothing was captured — otherwise
// undo silently means "undo the last CAPTURE", which is not what an author
// pressing ⌘Z is asking for.
const HISTORY_LIMIT = 120;
const history = { past: [], future: [], gesture: null, gestureAt: 0 };

function snapshot() {
    return JSON.stringify({
        draft,
        actors: Object.fromEntries(ROLES.map(role => [role, {
            pose: actors[role].pose,
            transform: actors[role].transform,
            parts: actors[role].parts,
            facing: actors[role].facing,
            character: actors[role].character,
        }])),
        selectedRole, selectedKey, selectedEvent, pendingContact, playhead,
    });
}

function restore(serialized) {
    const state = JSON.parse(serialized);
    draft = state.draft;
    for (const role of ROLES) {
        const saved = state.actors[role];
        // A character change rebuilds a Skeleton, so only do it when it actually
        // changed — rebuilding on every undo step would thrash the textures.
        if (actors[role].character !== saved.character) {
            actors[role].character = saved.character;
            rebuildActor(role);
        }
        Object.assign(actors[role], {
            pose: saved.pose, transform: saved.transform, parts: saved.parts, facing: saved.facing,
        });
    }
    selectedRole = state.selectedRole;
    selectedKey = state.selectedKey;
    selectedEvent = state.selectedEvent;
    pendingContact = state.pendingContact;
    playing = false;
    playhead = state.playhead;
    $('moveId').value = draft.id;
    $('duration').value = draft.duration;
    $('scrubber').max = draft.duration;
    $('time').max = draft.duration;
    $('scrubber').value = playhead;
    $('time').value = playhead.toFixed(3);
    syncControls();
    renderTimeline();
    for (const role of ROLES) renderActor(role);
    scheduleAutosave();
}

/**
 * Run an authoring mutation with an undo point in front of it.
 *
 * `coalesce` groups a continuous gesture — a slider being dragged, a limb being
 * pulled around — into ONE undo step. Without it a single drag would push a
 * hundred entries and ⌘Z would crawl backwards a pixel at a time.
 */
function mutate(label, apply, { coalesce = null } = {}) {
    const now = performance.now();
    const continuing = coalesce && history.gesture === coalesce && now - history.gestureAt < 700;
    if (!continuing) {
        history.past.push(snapshot());
        if (history.past.length > HISTORY_LIMIT) history.past.shift();
        history.future.length = 0;
    }
    history.gesture = coalesce;
    history.gestureAt = now;
    const result = apply();
    refreshOnionSkins();
    lastMutation = label;
    scheduleAutosave();
    return result;
}

function undo() {
    if (!history.past.length) { status('Nothing to undo.'); return; }
    history.future.push(snapshot());
    history.gesture = null;
    restore(history.past.pop());
    status(`Undid ${lastMutation ?? 'the last change'}. ${history.past.length} step(s) left.`);
}

function redo() {
    if (!history.future.length) { status('Nothing to redo.'); return; }
    history.past.push(snapshot());
    history.gesture = null;
    restore(history.future.pop());
    status(`Redid a change. ${history.future.length} step(s) ahead.`);
}

// ── Draft autosave and recovery ──────────────────────────────────────────────
//
// The editor holds hours of work in a tab. Autosave writes the draft to
// localStorage under a versioned envelope, and a reload OFFERS it back rather
// than loading it silently: an author who reopened the tool to start something
// else must not find themselves editing yesterday's move without being told,
// and an autosave this build cannot read must not be quietly replaced by an
// empty one. Autosave is therefore SUSPENDED until the offer is resolved.
const AUTOSAVE_KEY = 'wfm.move-editor.autosave';
const AUTOSAVE_DEBOUNCE_MS = 500;
let autosaveTimer = null;
let autosaveSuspended = false;
let lastMutation = null;
let pendingRecovery = null;

function scheduleAutosave() {
    if (autosaveSuspended) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(writeAutosave, AUTOSAVE_DEBOUNCE_MS);
}

function writeAutosave() {
    // The suspension is enforced HERE, not only in the scheduler: while a
    // recovery decision is pending, storage holds the only copy of the author's
    // previous session and no path may overwrite it — including a direct call.
    if (autosaveSuspended) return;
    try {
        // normalizeDraft stamps schema/version, so what lands in storage always
        // identifies itself — including a draft that arrived unstamped.
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
            savedAt: new Date().toISOString(),
            draft: normalizeDraft(draft),
        }));
    } catch (error) {
        // A full or disabled storage must not take the editor down, but the
        // author has to know their work is not being saved.
        autosaveSuspended = true;
        status(`Autosave is OFF — ${error.message}. Export before you close the tab.`, true);
    }
}

function offerRecovery() {
    let stored;
    try {
        stored = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) ?? 'null');
    } catch (error) {
        stored = { corrupt: error.message };
    }
    if (!stored) return;
    const compatibility = stored.corrupt
        ? { ok: false, reason: `stored draft is unreadable (${stored.corrupt})` }
        : draftCompatibility(stored.draft);
    pendingRecovery = { stored, compatibility };
    // Until the author answers, nothing may overwrite what is in storage —
    // silently replacing an unreadable or newer draft is how work disappears.
    autosaveSuspended = true;
    $('recovery').hidden = false;
    $('recoveryText').textContent = compatibility.ok
        ? `Recovered "${stored.draft?.id ?? 'untitled'}" autosaved ${new Date(stored.savedAt).toLocaleString()}.`
        : `An autosaved draft was found but CANNOT be loaded by this build: ${compatibility.reason}. It is left untouched until you discard it; autosave stays off meanwhile.`;
    $('recoveryText').classList.toggle('warning', !compatibility.ok);
    $('restoreDraftBtn').disabled = !compatibility.ok;
}

function resolveRecovery(action) {
    if (!pendingRecovery) return;
    if (action === 'restore') {
        if (!adoptDraft(pendingRecovery.stored.draft, { label: 'Autosaved draft' })) return;
        status(`Restored the autosaved draft "${draft.id}".`);
    } else if (action === 'discard') {
        localStorage.removeItem(AUTOSAVE_KEY);
        status('Discarded the autosaved draft. Autosave is on again.');
    }
    pendingRecovery = null;
    autosaveSuspended = false;
    $('recovery').hidden = true;
    if (action === 'restore') scheduleAutosave();
}

// ── Draft library ────────────────────────────────────────────────────────────
//
// Drafts committed beside the clips they generate (tools/move-editor/drafts/).
// Loading one is the entry point of the authoring path this editor exists to
// serve: open the shipped move, edit it, preview it, export it, and have the
// result be the move the game plays. Without this an author can only ever
// create new moves and never revisit one.
const DRAFT_LIBRARY = [
    { id: 'hammerlock', label: 'hammerlock (paired hold)', file: './drafts/hammerlock.json' },
];

// Adopt a loaded draft as the editing session. Shared by the library, the file
// importer and autosave recovery so all three land in exactly the same state —
// three subtly different load paths is how an editor grows a bug that only
// reproduces "after opening a file".
function adoptDraft(source, { label = 'draft' } = {}) {
    const compatibility = draftCompatibility(source);
    if (!compatibility.ok) {
        status(`${label} was NOT loaded — ${compatibility.reason}`, true);
        return false;
    }
    // Undoable: opening the wrong move is exactly the mistake ⌘Z should fix.
    history.past.push(snapshot());
    history.future.length = 0;
    history.gesture = null;
    draft = normalizeDraft(source);
    // The arrangement the executor will build, not the editor's default: a
    // behind-the-back hold previews against a defender turned the attacker's
    // way, which is what decides whether a contact is even reachable.
    for (const role of ROLES) actors[role].facing = draft.preview.facing[role];
    $('moveId').value = draft.id;
    $('duration').value = draft.duration;
    $('scrubber').max = draft.duration;
    $('time').max = draft.duration;
    selectedKey = 0;
    selectedEvent = -1;
    pendingContact = null;
    setPlayhead(0);
    renderTimeline();
    validate();
    scheduleAutosave();
    return true;
}

async function loadLibraryDraft(id) {
    const entry = DRAFT_LIBRARY.find(candidate => candidate.id === id);
    if (!entry) return;
    playing = false;
    try {
        const response = await fetch(new URL(entry.file, import.meta.url));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (adoptDraft(await response.json(), { label: entry.label })) {
            status(`Loaded ${entry.label}. Sweep readiness to re-measure it against the live rig.`);
        }
    } catch (error) {
        status(`Could not load ${entry.label}: ${error.message}`, true);
    }
}

function installUI() {
    buildPoseControls();
    buildContactControls();
    $('role').addEventListener('change', event => { selectedRole = event.target.value; selectedKey = 0; syncControls(); renderTimeline(); refreshOnionSkins(); });
    $('onionSkin').addEventListener('change', refreshOnionSkins);
    $('character').addEventListener('change', event => {
        mutate('preview character', () => {
            actors[selectedRole].character = event.target.value;
            rebuildActor(selectedRole);
            buildVariantControls();
        });
    });
    $('facing').addEventListener('change', event => {
        mutate('facing', () => {
        actors[selectedRole].facing = Number(event.target.value);
        // Persisted on the draft so the arrangement survives save/reload.
        draft.preview.facing[selectedRole] = actors[selectedRole].facing;
        buildVariantControls(); // semantic slots resolve to the other side now
        });
    });
    $('ease').addEventListener('change', event => {
        mutate('easing', () => {
            const frame = draft.tracks[selectedRole].keyframes[selectedKey];
            if (frame) frame.ease = EASES.includes(event.target.value) ? event.target.value : 'linear';
        });
    });
    $('moveId').addEventListener('change', event => {
        mutate('move id', () => { draft.id = event.target.value.trim() || 'untitled_move'; validate(); });
    });
    $('duration').addEventListener('change', event => {
        mutate('duration', () => {
            draft.duration = Math.max(0.05, Number(event.target.value) || 1.2);
            draft = normalizeDraft(draft);
            $('scrubber').max = draft.duration; $('time').max = draft.duration;
            setPlayhead(Math.min(playhead, draft.duration));
        });
    });
    $('scrubber').addEventListener('input', event => { playing = false; setPlayhead(event.target.value); });
    $('time').addEventListener('change', event => { playing = false; setPlayhead(event.target.value); });
    $('playBtn').addEventListener('click', () => { playing = !playing; lastTick = performance.now(); $('playBtn').textContent = playing ? '❚❚' : '▶'; });
    $('stopBtn').addEventListener('click', () => { playing = false; $('playBtn').textContent = '▶'; setPlayhead(0); });
    $('captureBtn').addEventListener('click', capture);
    $('duplicateBtn').addEventListener('click', () => { setPlayhead(Math.min(draft.duration, playhead + 0.1), { sample: false }); capture(); });
    $('deleteBtn').addEventListener('click', () => {
        mutate('delete keyframe', () => {
            if (removeKeyframe(draft, selectedRole, selectedKey)) {
                selectedKey = Math.max(0, selectedKey - 1); renderTimeline(); loadSample(); validate();
            } else status('Every role must retain at least one keyframe.', true);
        });
    });
    $('addEventBtn').addEventListener('click', () => {
        mutate('add event', () => {
            addEvent(draft, playhead, $('eventType').value.trim());
            selectedEvent = draft.events.findIndex(event => event.at === round(playhead));
            renderTimeline(); validate();
        });
    });
    $('deleteEventBtn').addEventListener('click', () => {
        mutate('delete event', () => {
            if (selectedEvent >= 0) draft.events.splice(selectedEvent, 1);
            selectedEvent = -1; renderTimeline(); validate();
        });
    });
    $('snapContactBtn').addEventListener('click', snapContact);
    $('releaseContactBtn').addEventListener('click', () => {
        mutate('release contact', () => {
            const released = releaseContact(draft, selectedRole, playhead);
            if (released) status(`Released ${released.role} ${released.source} → ${released.target} at ${released.to.toFixed(3)}s; graded ${released.from.toFixed(3)}–${released.to.toFixed(3)}s.`);
            else status(`No open ${selectedRole} contact acquired at or before ${playhead.toFixed(3)}s.`, true);
            renderTimeline();
        });
    });
    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);
    $('restoreDraftBtn').addEventListener('click', () => resolveRecovery('restore'));
    $('discardDraftBtn').addEventListener('click', () => resolveRecovery('discard'));
    // Conventional shortcuts. Ignored while a text field has focus so typing a
    // move name cannot be swallowed by the history.
    window.addEventListener('keydown', event => {
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
        if (typing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z' && event.key.toLowerCase() !== 'y') return;
        event.preventDefault();
        const wantsRedo = event.key.toLowerCase() === 'y' || event.shiftKey;
        wantsRedo ? redo() : undo();
    });
    $('readinessBtn').addEventListener('click', runReadiness);
    $('exportBtn').addEventListener('click', () => { if (!validate()) return; $('exportText').value = exportModule(draft); $('exportDialog').showModal(); });
    $('copyExport').addEventListener('click', async () => { await navigator.clipboard.writeText($('exportText').value); status('Clip module copied.'); });
    $('downloadExport').addEventListener('click', () => {
        const blob = new Blob([$('exportText').value], { type: 'text/javascript' });
        const anchor = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${draft.id}.js` });
        anchor.click(); URL.revokeObjectURL(anchor.href);
    });
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', async event => {
        try {
            // Same adoption path as the library and autosave recovery, so an
            // imported draft is checked against the schema envelope rather than
            // half-loaded and silently stripped of fields this build cannot read.
            if (adoptDraft(JSON.parse(await event.target.files[0].text()), { label: 'Imported draft' })) {
                status(`Imported ${draft.id}.`);
            }
        } catch (error) { status(`Import failed: ${error.message}`, true); }
    });
    const library = $('draftLibrary');
    library.innerHTML = ['<option value="">Load draft…</option>', ...DRAFT_LIBRARY.map(entry => `<option value="${entry.id}">${entry.label}</option>`)].join('');
    library.addEventListener('change', async event => {
        const id = event.target.value;
        event.target.value = '';
        if (id) await loadLibraryDraft(id);
    });
    window.__MOVE_EDITOR_MEASURE = measureContactGapAt;
    window.__MOVE_EDITOR = {
        get draft() { return draft; },
        actors, setPlayhead, capture,
        exportModule: () => exportModule(draft),
        readiness: runReadiness,
        readinessFor,
        SCALE,
        // The preview's staging frame, published so a test can check it against
        // src/animation/clipStaging.js's resolver instead of restating the math.
        loadLibraryDraft,
        // The same solve the wrist/ankle drag handle performs, exposed so an
        // authoring pass can drive it directly instead of synthesising pointer
        // events. It is the real gesture, not a parallel implementation.
        applyChainDrag,
        // The per-frame render the editor's own loop calls. An authoring pass
        // has to drive it explicitly between solves: jointAttachmentPoints are
        // published BY the render, so a solve that reads them without
        // re-rendering is solving against the previous frame.
        renderActor,
        adoptDraft,
        undo, redo, mutate,
        get onionSkins() { return onionSkins; },
        get scene() { return scene; },
        get handleLayer() { return handleLayer; },
        get lastReadiness() { return lastReadiness; },
        refreshOnionSkins,
        history,
        AUTOSAVE_KEY,
        offerRecovery,
        resolveRecovery,
        writeAutosave,
        DRAFT_LIBRARY,
        actorRoot,
        TABLEAU_ORIGIN,
        ANCHOR_ROLE,
        stagingFacing,
    };
}

class EditorScene extends Phaser.Scene {
    constructor() { super('MoveEditor'); }
    preload() {
        const seen = new Set();
        for (const character of [george, thesz]) {
            for (const asset of enumerateCharacterAssets(character)) {
                if (!seen.has(asset.key)) this.load.image(asset.key, `/${asset.file}`);
                seen.add(asset.key);
            }
        }
    }
    create() {
        scene = this;
        overlay = this.add.graphics().setDepth(90);
        handleLayer = [];
        for (const role of ROLES) rebuildActor(role);
        rebuildHandles();
        installUI();
        $('scrubber').max = draft.duration; $('time').max = draft.duration;
        syncControls(); renderTimeline(); loadSample(0); validate();
        offerRecovery();
    }
    update(_time, delta) {
        if (playing) {
            let next = playhead + delta / 1000;
            if (next > draft.duration) {
                if ($('loop').checked) next %= draft.duration;
                else { next = draft.duration; playing = false; $('playBtn').textContent = '▶'; }
            }
            setPlayhead(next);
        }
        for (const role of ROLES) renderActor(role);
        updateHandles();
        if (_time - lastCertificationAt > 200) {
            updateCertification();
            lastCertificationAt = _time;
        }
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'stage',
    width: 1020,
    height: 620,
    transparent: true,
    scene: EditorScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
});
