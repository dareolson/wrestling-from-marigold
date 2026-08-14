import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as model from '../tools/move-editor/model.js';
import { STRUCTURAL_CHAINS } from '../src/rig/certification.js';

// These tests exist because the contact contract drifted THREE ways at once:
// the editor's HTML offered `neck` while the model's hand-written array omitted
// it (so a captured neck contact was silently discarded), and the HTML omitted
// nearElbow/farElbow/nearAnkle/farAnkle (so four valid targets were unreachable).
// Three hand-maintained copies of one list cannot be kept in agreement by
// discipline, so the list is now derived and these tests pin the derivation.

const EDITOR_HTML = readFileSync(new URL('../tools/move-editor/index.html', import.meta.url), 'utf8');

function selectMarkup(id) {
    const match = EDITOR_HTML.match(new RegExp(`<select id="${id}"([^>]*)>([\\s\\S]*?)</select>`));
    assert.ok(match, `#${id} is missing from the editor markup`);
    return match[2];
}

// ── The model constants come from the rig, not from a hand-kept list ──────────

test('every contact target is a structural joint the rig actually publishes', () => {
    const joints = STRUCTURAL_CHAINS.map(chain => chain.joint);
    assert.deepEqual([...model.CONTACT_TARGETS], joints,
        'CONTACT_TARGETS must be derived from STRUCTURAL_CHAINS, in the same order');
    // The specific joint the drift lost.
    assert.ok(model.CONTACT_TARGETS.includes('neck'), 'neck is a structural joint and must be targetable');
});

test('contact sources are exactly the solvable limb ends, and all are valid targets', () => {
    assert.deepEqual([...model.CONTACT_SOURCES], ['nearWrist', 'farWrist', 'nearAnkle', 'farAnkle']);
    for (const source of model.CONTACT_SOURCES) {
        assert.ok(model.CONTACT_TARGETS.includes(source), `${source} must also be a valid target`);
    }
});

test('the previously unreachable targets are accepted by the model', () => {
    for (const target of ['nearElbow', 'farElbow', 'nearAnkle', 'farAnkle', 'neck']) {
        assert.equal(
            model.contactRejectionReason({ role: 'attacker', source: 'nearWrist', target }),
            null,
            `${target} must be an acceptable contact target`,
        );
    }
});

// ── The markup cannot restate the list ───────────────────────────────────────

test('the contact dropdowns declare no hand-written options', () => {
    for (const id of ['contactSource', 'contactTarget']) {
        const inner = selectMarkup(id);
        assert.equal(inner.includes('<option'), false,
            `#${id} hand-writes <option> entries; it must be built from the model constants instead`);
        assert.equal(inner.trim(), '', `#${id} should be empty in markup`);
    }
});

test('no joint name is hard-coded anywhere in the editor markup', () => {
    // A joint literal in the HTML is the shape the drift took. The comment
    // explaining why the selects are empty is allowed to name them, so strip
    // comments before checking.
    const withoutComments = EDITOR_HTML.replace(/<!--[\s\S]*?-->/g, '');
    for (const joint of model.CONTACT_TARGETS) {
        assert.equal(withoutComments.includes(joint), false,
            `"${joint}" is hard-coded in index.html; contact options must come from the model`);
    }
});

// ── Round trip: every offered option survives a capture ──────────────────────

test('every source/target pair the UI can offer round-trips through a draft', () => {
    for (const source of model.CONTACT_SOURCES) {
        for (const target of model.CONTACT_TARGETS) {
            const draft = model.createDraft('round_trip', 1);
            const result = model.addContact(draft, { from: 0.2, role: 'attacker', source, target });
            assert.equal(result.ok, true, `${source} → ${target} was refused: ${result.reason}`);
            assert.equal(draft.contacts.length, 1, `${source} → ${target} did not survive normalization`);
            assert.equal(draft.rejectedContacts.length, 0);
            assert.equal(model.clipReadiness(draft).rejectedContacts.length, 0);
        }
    }
});

test('a neck contact survives capture, normalization, and a draft round trip', () => {
    const draft = model.createDraft('collar_choke', 1);
    assert.equal(model.addContact(draft, { from: 0.3, role: 'attacker', source: 'nearWrist', target: 'neck' }).ok, true);
    // Through JSON, the way an imported draft arrives.
    const reloaded = model.normalizeDraft(JSON.parse(JSON.stringify(draft)));
    assert.equal(reloaded.contacts.length, 1);
    assert.equal(reloaded.contacts[0].target, 'neck');
    assert.equal(reloaded.rejectedContacts.length, 0);
});

// ── Discards are reported, never silent ──────────────────────────────────────

test('an unrecognised joint is refused with a reason instead of vanishing', () => {
    const draft = model.createDraft('bad', 1);
    const result = model.addContact(draft, { from: 0.2, role: 'attacker', source: 'nearWrist', target: 'sternum' });
    assert.equal(result.ok, false);
    assert.match(result.reason, /sternum/);
    assert.match(result.reason, /not a structural anchor/);
    assert.equal(draft.contacts.length, 0, 'an ungradeable contact is still not kept');
    assert.equal(draft.rejectedContacts.length, 1, 'but the loss is recorded');
});

test('a mid-limb joint is refused as a SOURCE while remaining a valid target', () => {
    const reason = model.contactRejectionReason({ role: 'attacker', source: 'nearElbow', target: 'neck' });
    assert.match(reason, /not a solvable limb end/);
    assert.equal(model.contactRejectionReason({ role: 'attacker', source: 'nearWrist', target: 'nearElbow' }), null);
});

test('discarded contacts block readiness rather than reporting a clean sweep', () => {
    const draft = model.normalizeDraft({
        ...model.createDraft('imported', 1),
        contacts: [{ from: 0.4, role: 'attacker', source: 'nearWrist', target: 'sternum' }],
    });
    const report = model.clipReadiness(draft);
    assert.equal(report.ok, false, 'a contact that can never be graded must not report ready');
    assert.equal(report.rejectedContacts.length, 1);
    assert.ok(report.blocking.some(issue => /discarded contact/.test(issue) && /sternum/.test(issue)), report.blocking.join('; '));
});

test('repeated normalization never loses the rejection record', () => {
    // Regression guard: clipReadiness normalizes again internally, so a
    // normalize that rebuilt `rejected` from `contacts` alone would find nothing
    // wrong on the second pass and quietly report a clean sweep — the same
    // silent discard, one layer up.
    let draft = model.normalizeDraft({
        ...model.createDraft('idempotent', 1),
        contacts: [{ from: 0.4, role: 'attacker', source: 'nearWrist', target: 'sternum' }],
    });
    for (let pass = 0; pass < 4; pass++) {
        draft = model.normalizeDraft(draft);
        assert.equal(draft.rejectedContacts.length, 1, `rejection lost on pass ${pass + 1}`);
        assert.equal(draft.contacts.length, 0);
    }
    assert.equal(model.clipReadiness(draft).ok, false);
});

test('a rejected entry is promoted back once its joint becomes valid', () => {
    const draft = model.normalizeDraft({
        ...model.createDraft('promote', 1),
        // Rejected only because it is not a solvable SOURCE; as a target it is
        // fine, so swapping the fields makes the same joint acceptable.
        rejectedContacts: [{ from: 0.4, to: 1, role: 'attacker', source: 'nearWrist', target: 'neck', reason: 'stale' }],
    });
    assert.equal(draft.contacts.length, 1, 'a now-valid entry rejoins the graded set');
    assert.equal(draft.contacts[0].target, 'neck');
    assert.equal(draft.rejectedContacts.length, 0);
});

test('an unknown role is refused too', () => {
    const reason = model.contactRejectionReason({ role: 'referee', source: 'nearWrist', target: 'neck' });
    assert.match(reason, /unknown role/);
});
