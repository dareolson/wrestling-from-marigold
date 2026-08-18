// The hammerlock's authoring round trip: editor draft → export → registry →
// runtime, compared against the shipped clip as the oracle.
//
// Why a SEMANTIC comparison and not a deep-equal on the exported object: key
// order, an omitted `ease: 'linear'`, an empty `parts: {}` and a keyframe that
// merely restates the running state are all formatting, and a byte comparison
// would fail on every one of them while proving nothing about behaviour. What
// actually matters is that the two describe the same MOVE: the same duration,
// the same sampled pose/transform/parts at every time, the same markers, and
// the same easing SHAPE between keyframes (which a dense sample sees — a wrong
// ease moves the curve between the endpoints even though both endpoints match).
//
// The draft is the authoring artifact and the clip is what ships. Neither is
// derived from the other at build time, on purpose: gameplay data stays plain
// reviewable source in src/. This test is what stops them drifting apart.
//
// This file deliberately stops at the runtime boundary — it proves the DATA
// survives the trip. That the resulting move reaches two rendered skeletons
// correctly is proved separately and through the real game, by
// tools/debug/hammerlock_authoring_proof.mjs (npm run proof:hammerlock);
// a test that only inspects exported JSON would not be evidence of that.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { captureStagingContext, stagedWorldPoint } from '../src/animation/clipStaging.js';
import {
    hammerlockClip,
    HAMMERLOCK_CLIP_ID,
    HAMMERLOCK_CONTACT_AT,
    HAMMERLOCK_DURATION,
    HAMMERLOCK_RELEASE_AT,
    HAMMERLOCK_STAGING,
} from '../src/animation/clips/hammerlock.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import { SEMANTIC_PART_SLOTS, resolveSemanticSlots } from '../src/rig/partVariants.js';
import * as model from '../tools/move-editor/model.js';

const DRAFT_PATH = new URL('../tools/move-editor/drafts/hammerlock.json', import.meta.url);
const readDraft = () => JSON.parse(readFileSync(DRAFT_PATH, 'utf8'));

// Dense enough to see between every pair of keyframes, and it always includes
// the exact keyframe and marker times — the two places a lazy comparison lands
// on by accident and then declares victory.
function sampleTimes(duration, steps = 280) {
    const times = new Set([0, duration]);
    for (let i = 0; i <= steps; i++) times.add(Math.round(duration * (i / steps) * 1e6) / 1e6);
    for (const track of Object.values(hammerlockClip.tracks)) {
        for (const frame of track.keyframes) times.add(frame.at);
    }
    for (const event of hammerlockClip.events) times.add(event.at);
    return [...times].sort((a, b) => a - b);
}

// Every channel either clip mentions anywhere — so a channel the OTHER one
// dropped entirely is compared (as missing) rather than skipped.
function channelsIn(clips, role, group) {
    const names = new Set();
    for (const clip of clips) {
        for (const frame of clip.tracks[role]?.keyframes ?? []) {
            for (const name of Object.keys(frame[group] ?? {})) names.add(name);
        }
    }
    return [...names];
}

function assertSameBehaviour(actual, expected, label) {
    assert.equal(actual.id, expected.id, `${label}: clip id`);
    assert.equal(actual.duration, expected.duration, `${label}: duration`);
    assert.deepEqual(Object.keys(actual.tracks).sort(), Object.keys(expected.tracks).sort(), `${label}: roles`);

    const a = compileClip(actual);
    const b = compileClip(expected);
    for (const at of sampleTimes(expected.duration)) {
        const sa = sampleClip(a, at);
        const sb = sampleClip(b, at);
        for (const role of Object.keys(expected.tracks)) {
            for (const group of ['pose', 'transform']) {
                for (const channel of channelsIn([actual, expected], role, group)) {
                    const x = sa.tracks[role][group][channel];
                    const y = sb.tracks[role][group][channel];
                    assert.equal(Number.isFinite(x), Number.isFinite(y),
                        `${label}: ${role}.${group}.${channel} exists in one clip and not the other at ${at}s`);
                    if (Number.isFinite(y)) {
                        assert.ok(Math.abs(x - y) < 1e-9,
                            `${label}: ${role}.${group}.${channel} at ${at}s — ${x} vs ${y}`);
                    }
                }
            }
            assert.deepEqual(sa.tracks[role].parts, sb.tracks[role].parts,
                `${label}: ${role} part variants at ${at}s`);
        }
    }

    assert.deepEqual(
        actual.events.map(event => ({ at: event.at, type: event.type })),
        expected.events.map(event => ({ at: event.at, type: event.type })),
        `${label}: events`,
    );
}

// ── The draft is a loadable, complete authoring artifact ─────────────────────

test('the committed hammerlock draft is a compatible, complete paired draft', () => {
    const raw = readDraft();
    const compatibility = model.draftCompatibility(raw);
    assert.equal(compatibility.ok, true, compatibility.reason ?? '');
    assert.equal(compatibility.schema, model.DRAFT_SCHEMA);
    assert.equal(compatibility.version, model.DRAFT_VERSION);

    const draft = model.normalizeDraft(raw);
    assert.deepEqual(Object.keys(draft.tracks), ['attacker', 'defender'], 'both actor tracks are authored');
    assert.equal(draft.posture, 'upright');
    assert.ok(draft.contacts.length > 0, 'the hold declares at least one contact');
    assert.deepEqual(draft.rejectedContacts, [], 'no capture was discarded');
});

test('the draft declares the hold as an interval — acquired at the reach, released at the end', () => {
    const draft = model.normalizeDraft(readDraft());
    const contact = draft.contacts.find(entry => entry.role === 'attacker' && entry.source === 'nearWrist');
    assert.ok(contact, 'the attacker s gripping wrist is declared');
    assert.equal(contact.from, HAMMERLOCK_CONTACT_AT, 'acquisition is the authored contact frame');
    assert.equal(contact.to, HAMMERLOCK_RELEASE_AT, 'the hold is maintained to the release');
    assert.equal(contact.target, 'nearWrist', 'onto the defender s trapped wrist');
    assert.equal(model.contactPartner(contact.role), 'defender');
});

test('the draft is READY: nothing blocks it leaving the editor', () => {
    // No live rig here, so contact gaps cannot be measured — that is asserted
    // as a warning by design, and measured for real in the browser proof.
    const report = model.clipReadiness(readDraft());
    assert.deepEqual(report.blocking, [], 'blocking issues');
    assert.deepEqual(report.stagedRoles, ['attacker', 'defender'], 'the runtime owns BOTH bodies');
    assert.equal(report.anchorRole, 'attacker');
    assert.deepEqual(report.entryTableau, {
        attacker: { ...HAMMERLOCK_STAGING.attackerEntry },
        defender: { ...HAMMERLOCK_STAGING.defenderEntry },
    });
    assert.equal(report.ok, true, report.blocking.join('; '));
});

// ── Round trip: draft → JSON → draft → exported clip ─────────────────────────

test('exporting the draft reproduces the shipped clip, channel for channel', () => {
    assertSameBehaviour(model.exportClip(readDraft()), hammerlockClip, 'draft export vs shipped clip');
});

test('a full save/reload round trip loses nothing', () => {
    // The trip an author actually takes: load, edit, save to disk, reload, edit
    // again, export. Every hop goes through the same normalize/serialize path
    // the editor uses.
    const loaded = model.normalizeDraft(readDraft());
    const reloaded = model.normalizeDraft(JSON.parse(JSON.stringify(loaded)));
    assert.deepEqual(reloaded, loaded, 'normalize is idempotent across a serialize hop');
    assertSameBehaviour(model.exportClip(reloaded), hammerlockClip, 'reloaded draft');

    // Authoring metadata survives the hop too — it is the reason to keep a draft
    // at all rather than only the exported clip.
    assert.deepEqual(reloaded.contacts, loaded.contacts);
    assert.equal(reloaded.posture, loaded.posture);
    assert.equal(reloaded.schema, model.DRAFT_SCHEMA);
});

test('the round trip is sensitive: dropping any authored dimension is caught', () => {
    // A comparison that cannot fail is not evidence. Each mutation below is a
    // real thing an export path could lose; every one must be detected.
    const mutations = {
        'a pose channel': draft => { delete draft.tracks.attacker.keyframes[4].pose.lArm; },
        'a joint (articulation) channel': draft => { draft.tracks.defender.keyframes[1].pose.rArm = 0; },
        'an actor transform': draft => { delete draft.tracks.defender.keyframes[0].transform; },
        'the staging of one role': draft => { for (const f of draft.tracks.attacker.keyframes) delete f.transform; },
        'a part variant': draft => { delete draft.tracks.attacker.keyframes[1].parts; },
        'an event': draft => { draft.events = draft.events.slice(0, -1); },
        'the duration': draft => { draft.duration = 1.2; },
        'an easing curve': draft => { draft.tracks.defender.keyframes[1].ease = 'linear'; },
        'a keyframe': draft => { draft.tracks.attacker.keyframes.splice(2, 1); },
    };
    for (const [what, mutate] of Object.entries(mutations)) {
        const draft = readDraft();
        mutate(draft);
        assert.throws(
            () => assertSameBehaviour(model.exportClip(draft), hammerlockClip, what),
            error => error instanceof assert.AssertionError,
            `losing ${what} was NOT detected by the round-trip comparison`,
        );
    }
});

test('editor-only authoring metadata never reaches gameplay data', () => {
    const exported = model.exportClip(readDraft());
    assert.deepEqual(Object.keys(exported).sort(), ['duration', 'events', 'id', 'tracks']);
    for (const key of ['contacts', 'rejectedContacts', 'posture', 'schema', 'version']) {
        assert.equal(key in exported, false, `${key} leaked into the exported clip`);
    }
});

test('the exported module is valid, registerable clip source', () => {
    const source = model.exportModule(readDraft());
    assert.match(source, /export const hammerlockClip = \{/);
    assert.match(source, /workingHand: "grip"/, 'the authored variant survives code generation');
    assert.match(source, /transform: \{/, 'the authored staging survives code generation');
});

// ── Registry and runtime ─────────────────────────────────────────────────────

test('the exported clip registers under the id the move registry expects', () => {
    assert.equal(MOVE_SPECS.hammerlock.clip, HAMMERLOCK_CLIP_ID);
    assert.ok(REGISTERED_MOVE_CLIPS.some(clip => clip.id === HAMMERLOCK_CLIP_ID),
        'the clip is in the single registration list Arena builds from');

    const runtime = new MoveRuntime();
    const registered = runtime.register(model.exportClip(readDraft()));
    assert.equal(registered.id, HAMMERLOCK_CLIP_ID);
    assert.equal(validateClip(model.exportClip(readDraft())).ok, true);
});

test('the authored tableau is what the runtime actually resolves, from one origin', () => {
    // The staging contract end to end, on plain targets: authored rig units →
    // captured frame → world points. Deliberately launched from a defender
    // position that has nothing to do with the authored one.
    const clip = compileClip(model.exportClip(readDraft()));
    const bindings = {
        attacker: { x: 500, y: 340, facing: 1, s: 1 },
        defender: { x: 900, y: 999, facing: -1, s: 1 },
    };
    const staging = captureStagingContext(clip, bindings);
    assert.ok(staging.roles.attacker && staging.roles.defender, 'both roles are staged');
    assert.equal(staging.anchorRole, 'attacker');

    const at = time => {
        const sample = sampleClip(clip, time);
        return Object.fromEntries(Object.entries(sample.tracks)
            .map(([role, track]) => [role, stagedWorldPoint(staging.roles[role], track.transform)]));
    };
    const entry = at(0);
    assert.deepEqual(entry.attacker, { x: 500, y: 340 }, 'the anchor stays put at t=0');
    assert.deepEqual(entry.defender, { x: 500 + HAMMERLOCK_STAGING.defenderEntry.x, y: 340 },
        'the defender is placed on the authored entry tableau, not left where it launched');

    const working = at(HAMMERLOCK_DURATION);
    assert.equal(working.attacker.x, 500 + HAMMERLOCK_STAGING.attackerWork.x);
    assert.equal(working.defender.x, 500 + HAMMERLOCK_STAGING.defenderWork.x);
});

test('the working hand variant resolves to the correct physical hand in both facings', () => {
    const clip = compileClip(model.exportClip(readDraft()));
    const held = sampleClip(clip, HAMMERLOCK_DURATION / 2).tracks.attacker.parts;
    assert.equal(held.workingHand, 'grip', 'the grip is worn for the length of the hold');
    assert.ok('workingHand' in SEMANTIC_PART_SLOTS, 'the slot is a declared semantic role, not an ad-hoc string');
    assert.deepEqual(resolveSemanticSlots(held, 1), { nearHand: 'grip' });
    assert.deepEqual(resolveSemanticSlots(held, -1), { farHand: 'grip' });

    // Acquired on the contact frame and returned to base on the release frame —
    // an authored INTERVAL, not a single decorated instant.
    assert.equal(sampleClip(clip, HAMMERLOCK_CONTACT_AT - 0.001).tracks.attacker.parts.workingHand, 'base');
    assert.equal(sampleClip(clip, HAMMERLOCK_CONTACT_AT).tracks.attacker.parts.workingHand, 'grip');
    assert.equal(sampleClip(clip, HAMMERLOCK_DURATION).tracks.attacker.parts.workingHand, 'base');
});
