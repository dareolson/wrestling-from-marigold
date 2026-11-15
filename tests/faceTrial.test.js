import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { faceAssets, FaceDriver } from '../src/animation/faceTrial.js';

test('faces: every listed expression head exists on disk, keys unique', () => {
    const assets = faceAssets();
    assert.equal(assets.length, 29, '27 expression cells + 2 worn resting heads');
    for (const a of assets) assert.ok(existsSync(a.file), a.file);
    assert.equal(new Set(assets.map(a => a.key)).size, assets.length);
});

const fakeWrestler = (rigId) => {
    const keys = new Set(faceAssets().map(a => a.key).concat('george_rv1_head'));
    const head = { key: null, setTexture(k) { this.key = k; } };
    return { rigId, state: 'standing', skeleton: { head }, scene: { textures: { exists: k => keys.has(k) } } };
};

test('faces: a rig without heads gets no driver', () => {
    assert.equal(FaceDriver.for(fakeWrestler('thesz-procreate-v1')), null);
});

test('faces: at rest George wears his own head clean, then the worn resting heads as damage adds up; a hit shows pain', () => {
    const w = fakeWrestler('george-roster-v1'), other = { state: 'standing' };
    const f = FaceDriver.for(w);
    f.tick(0, other);
    assert.equal(w.skeleton.head.key, 'george_rv1_head');
    w._damageTaken = 30;
    f.tick(100, other);
    assert.match(w.skeleton.head.key, /^george_face_pain_1_/);
    f.tick(5000, other);
    assert.equal(w.skeleton.head.key, 'george_face_rest_1');
    w._damageTaken = 80;
    f.tick(5100, other);
    f.tick(10000, other);
    assert.equal(w.skeleton.head.key, 'george_face_rest_2');
});
