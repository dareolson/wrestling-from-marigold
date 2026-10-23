import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildTableau, GEORGE, RECEIVER, DURATION } from '../tools/move-editor/author_figurefour_tableau.mjs';
import { JOINT_LIMITS } from '../src/rig/articulation.js';
import { specFor } from '../tools/move-critic/specs.mjs';

const committed = JSON.parse(readFileSync(new URL('../tools/move-editor/drafts/figurefour-tableau.json', import.meta.url), 'utf8'));

test('tableau is a static locked hold: two identical keys, bend not lean', () => {
    const draft = buildTableau();
    assert.equal(draft.duration, DURATION);
    for (const role of ['attacker', 'defender']) {
        const [a, b] = draft.tracks[role].keyframes;
        assert.deepEqual(a.pose, b.pose, `${role} holds one pose`);
        assert.ok(!a.pose.lean, `${role} must not use inert lean`);
    }
});

test('every authored knee and elbow is inside JOINT_LIMITS', () => {
    for (const [name, p] of [['George', GEORGE], ['receiver', RECEIVER]]) {
        for (const k of ['lKnee', 'rKnee']) assert.ok(p[k] >= JOINT_LIMITS.knee.min && p[k] <= JOINT_LIMITS.knee.max, `${name} ${k} ${p[k]}`);
        for (const k of ['lElbow', 'rElbow']) assert.ok(p[k] >= JOINT_LIMITS.elbow.min && p[k] <= JOINT_LIMITS.elbow.max, `${name} ${k} ${p[k]}`);
    }
});

test('the committed staged draft keeps the authored channels (staging only moves x and lift)', () => {
    const draft = buildTableau();
    for (const role of ['attacker', 'defender']) {
        const authored = draft.tracks[role].keyframes[0].pose, staged = committed.tracks[role].keyframes[0].pose;
        for (const [ch, v] of Object.entries(authored)) {
            if (ch === 'lift') continue;
            assert.equal(staged[ch], v, `${role} ${ch}`);
        }
    }
});

test('the critic spec names the ledger contacts by channel with kind and tol', () => {
    const { contacts } = specFor('figureFourTableau');
    assert.deepEqual(contacts.map(c => c.kind), ['trap', 'brace']);
    assert.ok(contacts.every(c => Number.isFinite(c.tol) && /^[lr]/.test(c.source)));
    assert.match(contacts[0].target, /^seg:rKnee-rAnkle$/);
});

test('the tableau is a draft only: no clip is exported to src/', () => {
    assert.ok(!existsSync(new URL('../src/animation/clips/figureFourTableau.js', import.meta.url)));
});
