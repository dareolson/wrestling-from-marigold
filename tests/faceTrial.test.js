import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { faceAssets, FaceDriver } from '../src/animation/faceTrial.js';

test('faces: every listed expression head exists on disk, keys unique', () => {
    const assets = faceAssets();
    assert.equal(assets.length, 4 * 29, 'per wrestler: 27 expression cells + 2 worn resting heads');
    for (const a of assets) assert.ok(existsSync(a.file), a.file);
    assert.equal(new Set(assets.map(a => a.key)).size, assets.length);
});

const fakeWrestler = (rigId) => {
    const keys = new Set(faceAssets().map(a => a.key).concat('george_rv1_head', 'thesz_pv1_head', 'guido_rv1_head', 'kowalski_rv1_head'));
    const head = { key: null, setTexture(k) { this.key = k; } };
    return { rigId, state: 'standing', skeleton: { head }, scene: { textures: { exists: k => keys.has(k) } } };
};

test('faces: every roster rig gets a driver; a rig without heads gets none', () => {
    for (const rig of ['george-roster-v1', 'thesz-procreate-v1', 'guido-roster-v1', 'kowalski-roster-v1']) assert.ok(FaceDriver.for(fakeWrestler(rig)), rig);
    assert.equal(FaceDriver.for(fakeWrestler('thesz')), null);
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


test('authored pain stays visible through selling and releases cleanly without adding damage',()=>{
    const w=fakeWrestler('george-roster-v1'),other={state:'standing'},f=FaceDriver.for(w);
    w._damageTaken=8;f.tick(0,other);
    w.skeleton._partVariantState={head:'pain'};
    f.tick(4000,other);assert.equal(w.skeleton.head.key,'george_face_pain_0_2');
    w.skeleton.head.key='george_rv1_head';
    f.tick(4100,other);assert.equal(w.skeleton.head.key,'george_face_pain_0_2','repairs a body-art head reset even when the face cache has not changed');
    w.skeleton._partVariantState={head:'base'};
    f.tick(4200,other);assert.equal(w.skeleton.head.key,'george_rv1_head');assert.equal(w._damageTaken,8);
});
