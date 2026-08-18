import test from 'node:test';
import assert from 'node:assert/strict';

import * as model from '../tools/move-editor/model.js';

test('new move drafts are valid synchronized two-role clips', () => {
    const draft = model.createDraft('armbar', 1.5);
    assert.equal(model.draftValidation(draft).ok, true);
    assert.deepEqual(Object.keys(draft.tracks), ['attacker', 'defender']);
});

test('capturing at an occupied time replaces rather than duplicates a keyframe', () => {
    const draft = model.createDraft();
    model.insertKeyframe(draft, 'attacker', 0, { pose: { lArm: 1 }, parts: { head: 'pain' } });
    assert.equal(draft.tracks.attacker.keyframes.length, 1);
    assert.equal(draft.tracks.attacker.keyframes[0].pose.lArm, 1);
    assert.equal(draft.tracks.attacker.keyframes[0].parts.head, 'pain');
});

test('part swaps remain discrete while connected pose channels interpolate', () => {
    const draft = model.createDraft('jab', 1);
    model.insertKeyframe(draft, 'attacker', 1, {
        ease: 'linear', pose: { ...model.basePose(), lArm: 1 }, parts: { nearHand: 'fist' },
    });
    const midway = model.sampleDraft(draft, 0.5).tracks.attacker;
    assert.equal(midway.pose.lArm, 0.5);
    assert.deepEqual(midway.parts, {});
    assert.equal(model.sampleDraft(draft, 1).tracks.attacker.parts.nearHand, 'fist');
});

test('export produces a reviewable clip module with pose, transforms, parts, and events', () => {
    const draft = model.createDraft('arm_bar', 1.2);
    draft.tracks.defender.keyframes[0].parts.head = 'pain';
    model.addEvent(draft, 0.8, 'apply-damage');
    const output = model.exportModule(draft);
    assert.match(output, /export const arm_barClip/);
    assert.match(output, /head: "pain"/);
    assert.match(output, /type: "apply-damage"/);
});

// ── Editor-only contact metadata ─────────────────────────────────────────────

test('declared contacts are normalized, sorted, and never reach the exported clip', () => {
    const draft = model.createDraft('collar_tie', 1);
    model.addContact(draft, { from: 0.6, role: 'attacker', source: 'nearWrist', target: 'farShoulder' });
    model.addContact(draft, { from: 0.2, role: 'defender', source: 'nearAnkle', target: 'nearKnee' });
    assert.deepEqual(draft.contacts.map(contact => contact.from), [0.2, 0.6], 'sorted by acquisition');

    // Gameplay data must not carry authoring metadata: the exported clip is
    // exactly what AnimationClip compiles, and nothing more.
    assert.deepEqual(Object.keys(model.exportClip(draft)).sort(), ['duration', 'events', 'id', 'tracks']);
    assert.doesNotMatch(model.exportModule(draft), /contacts/);
    assert.doesNotMatch(model.exportModule(draft), /posture/);
});

test('contacts naming joints the rig does not publish are dropped, not trusted', () => {
    const draft = model.normalizeDraft({
        ...model.createDraft('bad_contact', 1),
        contacts: [
            { from: 0.5, role: 'attacker', source: 'nose', target: 'farShoulder' },
            { from: 0.5, role: 'attacker', source: 'nearWrist', target: 'elbowish' },
            { from: 0.5, role: 'attacker', source: 'nearWrist', target: 'farShoulder' },
        ],
    });
    assert.equal(draft.contacts.length, 1);
    assert.equal(draft.contacts[0].source, 'nearWrist');
});

// ── Contact acquisition/release interval ─────────────────────────────────────

test('a contact holds from acquisition to the end of the clip until it is released', () => {
    const draft = model.createDraft('hold', 1.2);
    model.addContact(draft, { from: 0.3, role: 'attacker', source: 'nearWrist', target: 'farShoulder' });
    assert.equal(draft.contacts[0].from, 0.3);
    assert.equal(draft.contacts[0].to, 1.2, 'an unreleased contact is held to the end');

    const released = model.releaseContact(draft, 'attacker', 0.8);
    assert.equal(released.to, 0.8);
    assert.equal(model.releaseContact(draft, 'attacker', 0.9), null, 'nothing left open to release');
    assert.equal(model.releaseContact(draft, 'defender', 0.9), null, 'never closes another role\'s contact');
});

test('a release earlier than acquisition collapses instead of inverting the window', () => {
    const draft = model.normalizeDraft({
        ...model.createDraft('inverted', 1),
        contacts: [{ from: 0.7, to: 0.2, role: 'attacker', source: 'nearWrist', target: 'farShoulder' }],
    });
    assert.equal(draft.contacts[0].from, 0.7);
    assert.equal(draft.contacts[0].to, 0.7);
});

test('legacy `at` drafts still load as an acquisition time', () => {
    const draft = model.normalizeDraft({
        ...model.createDraft('legacy', 1),
        contacts: [{ at: 0.4, role: 'attacker', source: 'nearWrist', target: 'farShoulder' }],
    });
    assert.equal(draft.contacts[0].from, 0.4);
    assert.equal(draft.contacts[0].to, 1);
});

test('the gap is graded only inside the held window, never on approach or follow-through', () => {
    const draft = model.createDraft('window', 1);
    model.addContact(draft, { from: 0.4, to: 0.6, role: 'attacker', source: 'nearWrist', target: 'farShoulder' });
    const sampled = [];
    // Huge separation everywhere except the held window: the limb is travelling
    // to the anchor before 0.4 and leaving after 0.6, which is not a failure.
    const measureContactGap = at => { sampled.push(at); return at >= 0.4 && at <= 0.6 ? 0.2 : 500; };
    const report = model.clipReadiness(draft, { measureContactGap });

    assert.ok(Math.min(...sampled) >= 0.4 && Math.max(...sampled) <= 0.6, `graded outside the window: ${Math.min(...sampled)}–${Math.max(...sampled)}`);
    assert.ok(report.contacts[0].maxGap < 1, `approach/follow-through leaked into the grade: ${report.contacts[0].maxGap}`);
    assert.equal(report.warnings.some(warning => /separates to/.test(warning)), false);
});

test('the window endpoints are always graded even when the grid misses them', () => {
    const draft = model.createDraft('endpoints', 1);
    model.addContact(draft, { from: 0.4137, to: 0.5813, role: 'attacker', source: 'nearWrist', target: 'farShoulder' });
    const sampled = [];
    model.clipReadiness(draft, { measureContactGap: at => { sampled.push(at); return 0; } });
    assert.ok(sampled.includes(0.4137) && sampled.includes(0.5813));
});

// ── Production readiness sweep ───────────────────────────────────────────────

test('a clean draft reports ready and names which roles the runtime will stage', () => {
    const draft = model.createDraft('clean', 1);
    model.insertKeyframe(draft, 'attacker', 1, { pose: { ...model.basePose(), lArm: 1 }, transform: { x: 20, y: 0 } });
    const report = model.clipReadiness(draft);
    assert.equal(report.ok, true, report.blocking.join('; '));
    assert.deepEqual(report.stagedRoles, ['attacker', 'defender']);
    assert.ok(report.sampledTimes > model.READINESS_GRID, 'keyframe and midpoint times are swept on top of the grid');
});

test('non-finite pose and transform channels block readiness and are named per channel', () => {
    const draft = model.createDraft('nonfinite', 1);
    model.insertKeyframe(draft, 'attacker', 1, { pose: { ...model.basePose(), lArm: 0 }, transform: { x: 0, y: 0 } });
    draft.tracks.attacker.keyframes[1].pose.lArm = Number.POSITIVE_INFINITY;
    draft.tracks.attacker.keyframes[1].transform.y = Number.NaN;

    const report = model.clipReadiness(draft);
    assert.equal(report.ok, false);
    // Both the pose channel and the staging channel are named individually,
    // rather than one generic "invalid clip".
    assert.ok(report.nonFinite.some(entry => entry.group === 'pose' && entry.channel === 'lArm'));
    assert.ok(report.nonFinite.some(entry => entry.group === 'transform' && entry.channel === 'y'));
    assert.ok(report.blocking.some(issue => /pose\.lArm is not finite/.test(issue)));
});

test('staging channels the runtime cannot consume are reported, not silently exported', () => {
    const draft = model.createDraft('bad_staging', 1);
    // `rotation` previews as nothing and reaches nothing — exactly the class of
    // silent failure this milestone closed for x/y.
    draft.tracks.attacker.keyframes[0].transform.rotation = 0.4;
    const report = model.clipReadiness(draft);
    assert.equal(report.ok, false);
    assert.ok(report.unsupportedStaging.some(issue => /transform\.rotation/.test(issue)));
});

test('a grounded posture mode blocks readiness rather than being silently coerced', () => {
    const draft = { ...model.createDraft('grounded', 1), posture: 'prone' };
    // Preserved, so the author is told — not rewritten to upright behind their
    // back. Grounded authoring stays closed: down/pinned/possum reach the
    // modular rig in game, but only as one fixed flat pose.
    assert.equal(model.normalizeDraft(draft).posture, 'prone');
    const report = model.clipReadiness(draft);
    assert.equal(report.ok, false);
    assert.ok(report.unsupportedModes.some(issue => /prone/.test(issue)));
    // It still never leaves the editor as clip data.
    assert.equal('posture' in model.exportClip(draft), false);
});

test('a draft with no declared posture defaults to upright and stays ready', () => {
    assert.equal(model.clipReadiness(model.createDraft('plain', 1)).ok, true);
});

test('contact drift between keyframes is measured and reported, not solved', () => {
    const draft = model.createDraft('drift', 1);
    model.addContact(draft, { from: 0, role: 'attacker', source: 'nearWrist', target: 'farShoulder' });
    // Exact at both authored keyframes, 8 px apart halfway between them — the
    // failure a per-keyframe check cannot see.
    const measureContactGap = at => (at === 0 || at === 1 ? 0 : 8 * Math.sin(Math.PI * at));
    const report = model.clipReadiness(draft, { measureContactGap });
    assert.equal(report.contacts[0].maxGap.toFixed(2), '8.00');
    assert.ok(Math.abs(report.contacts[0].worstAt - 0.5) < 0.02);
    assert.ok(report.warnings.some(warning => /separates to 8\.00 px/.test(warning)));
    // A drifting contact is a WARNING, not a blocker: snap-and-bake is still a
    // legitimate authoring choice, the author just has to know.
    assert.equal(report.ok, true);
});

test('an unmeasurable contact warns instead of silently reporting a zero gap', () => {
    const draft = model.createDraft('unmeasurable', 1);
    model.addContact(draft, { from: 0, role: 'attacker', source: 'nearWrist', target: 'farShoulder' });
    const report = model.clipReadiness(draft, { measureContactGap: () => null });
    assert.equal(report.contacts[0].measured, 0);
    assert.ok(report.warnings.some(warning => /could not be measured/.test(warning)));
});

// ── Entry tableau (shared-origin contract) ───────────────────────────────────

test('the entry tableau reports where the runtime will place each staged role', () => {
    const draft = model.createDraft('tie_up', 1);
    draft.tracks.defender.keyframes[0].transform = { x: 42, y: 0 };
    const report = model.clipReadiness(draft);
    assert.equal(report.anchorRole, 'attacker');
    assert.deepEqual(report.entryTableau, { attacker: { x: 0, y: 0 }, defender: { x: 42, y: 0 } });
});

test('a fresh paired draft opens at the real tie-up separation, on ONE shared origin', () => {
    const draft = model.createPairedDraft('tie_up', 1);
    const report = model.clipReadiness(draft);
    // The anchor stays at the origin and the partner is offset from IT — not
    // from a base position of its own. This is the contract the editor preview
    // used to contradict: with per-role bases, x:0/x:0 looked like a tie-up on
    // screen and staged both wrestlers on the same point in the ring.
    assert.deepEqual(report.entryTableau, {
        attacker: { x: 0, y: 0 },
        defender: { x: model.DEFAULT_ENTRY_SEPARATION, y: 0 },
    });
    // And it is a real separation, so the degenerate-entry warning is silent.
    assert.ok(!report.warnings.some(warning => /same point/.test(warning)), report.warnings.join('; '));
    assert.equal(report.ok, true, report.blocking.join('; '));
});

test('two actors entering at the same point are flagged, not staged on top of each other', () => {
    // A fresh draft starts every role at x:0 — under a shared origin that means
    // both wrestlers land on the anchor, which is easy to author by accident.
    const report = model.clipReadiness(model.createDraft('degenerate', 1));
    assert.ok(report.warnings.some(warning => /same point as attacker/.test(warning)), report.warnings.join('; '));
});

test('certification failures anywhere in the clip block readiness', () => {
    const draft = model.createDraft('uncertified', 1);
    const certify = at => ({ ok: at < 0.5, failures: at < 0.5 ? [] : [{ kind: 'chain-break', detail: 'attacker chain-break' }] });
    const report = model.clipReadiness(draft, { certify });
    assert.equal(report.ok, false);
    assert.ok(report.blocking.some(issue => /certification failed/.test(issue)));
    assert.ok(report.certificationFailures.length > 0);
});

test('variant choices combine shared families and side-specific overrides', () => {
    const character = { textures: { variants: {
        hand: { fist: {} }, nearHand: { grip: {} },
    } } };
    assert.deepEqual(model.variantChoices(character, 'nearHand'), ['base', 'fist', 'grip']);
    assert.deepEqual(model.variantChoices(character, 'farHand'), ['base', 'fist']);
});

// ── Failure attribution and contact severity ─────────────────────────────────

test('every readiness finding names the layer responsible', () => {
    const draft = {
        ...model.createDraft('attributed', 1),
        posture: 'prone', // nothing draws this yet -> coverage gap
    };
    // Authored fine, but the runtime has no way to carry it -> transport.
    draft.tracks.attacker.keyframes[0].transform.rotation = 0.4;
    // Not finite -> the author's data.
    draft.tracks.defender.keyframes[0].pose.lArm = Number.NaN;
    const report = model.clipReadiness(draft);

    const layers = Object.fromEntries(report.findings.map(finding => [finding.message, finding.layer]));
    assert.ok(Object.entries(layers).some(([message, layer]) =>
        /transform\.rotation/.test(message) && layer === model.READINESS_LAYERS.TRANSPORT));
    assert.ok(Object.entries(layers).some(([message, layer]) =>
        /not finite/.test(message) && layer === model.READINESS_LAYERS.AUTHORING));
    assert.ok(Object.entries(layers).some(([message, layer]) =>
        /posture "prone"/.test(message) && layer === model.READINESS_LAYERS.COVERAGE));
    // The rendered strings carry the same attribution, so a reader of either
    // sees the same place to look.
    assert.ok(report.blocking.every(issue => /^\[[a-z-]+\] /.test(issue)), report.blocking.join(' | '));
});

test('a contact is graded against the reach of the limb that must close it', () => {
    const draft = model.createDraft('graded', 1);
    draft.contacts = [{ from: 0, to: 1, role: 'attacker', source: 'nearWrist', target: 'nearWrist' }];

    // Within the limb's reach: an authorable problem — pose it, or add a
    // keyframe where it drifts.
    const drifting = model.clipReadiness(draft, {
        measureContactGap: () => 30,
        measureContactReach: () => 90,
    });
    assert.equal(drifting.contacts[0].severity, 'drifting');
    assert.ok(drifting.warnings.some(warning => /add a keyframe/.test(warning)));

    // Wider than the limb is long: no pose of that limb can close it, so
    // telling the author to add a keyframe would be actively wrong.
    const unreachable = model.clipReadiness(draft, {
        measureContactGap: () => 200,
        measureContactReach: () => 90,
    });
    assert.equal(unreachable.contacts[0].severity, 'unreachable');
    assert.ok(unreachable.warnings.some(warning => /beyond the 90.00 px reach/.test(warning)));
    assert.ok(!unreachable.warnings.some(warning => /add a keyframe/.test(warning)));

    // Exact contact is held, and neither case blocks: snap-and-bake stays a
    // legal authoring choice and an implied hold is a real one.
    const held = model.clipReadiness(draft, {
        measureContactGap: () => 0.4,
        measureContactReach: () => 90,
    });
    assert.equal(held.contacts[0].severity, 'held');
    assert.equal(held.ok, true);
    assert.equal(unreachable.ok, true);
});
