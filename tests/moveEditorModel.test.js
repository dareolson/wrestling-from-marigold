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

test('variant choices combine shared families and side-specific overrides', () => {
    const character = { textures: { variants: {
        hand: { fist: {} }, nearHand: { grip: {} },
    } } };
    assert.deepEqual(model.variantChoices(character, 'nearHand'), ['base', 'fist', 'grip']);
    assert.deepEqual(model.variantChoices(character, 'farHand'), ['base', 'fist']);
});
