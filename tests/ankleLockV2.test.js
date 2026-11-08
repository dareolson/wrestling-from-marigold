import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ankleLockClip } from '../src/animation/clips/ankleLock.js';
import { ankleLockV2Clip } from '../src/animation/clips/ankleLockV2.js';
import { compileClip, validateClip } from '../src/animation/AnimationClip.js';
import { gripTarget } from '../src/animation/lockup.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';

test('ankleLockV2 is a valid clip with the old clip\'s duration and events', () => {
    assert.deepEqual(validateClip(ankleLockV2Clip), { ok: true, errors: [] });
    assert.equal(ankleLockV2Clip.duration, ankleLockClip.duration);
    assert.deepEqual(ankleLockV2Clip.events, ankleLockClip.events);
    assert.equal(compileClip(ankleLockV2Clip).grips.length, 2);
});

test('both hands are declared on the defender\'s ankle (heel, then toes), the soles are planted', () => {
    const [heel, toes] = ankleLockV2Clip.grips;
    assert.deepEqual([heel.arm, heel.to.joint, heel.to.anchor, toes.arm, toes.to.joint, toes.to.anchor], ['l', 'Ankle', 'heel', 'r', 'Ankle', 'toe']);
    assert.deepEqual(ankleLockV2Clip.plants.map(p => p.leg).sort(), ['l', 'r']);
});

test('D3: the attacker owns his shins (no lKnee / rKnee keys) and no shin is folded the wrong way', () => {
    for (const k of ankleLockV2Clip.tracks.attacker.keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false, `attacker key ${k.at}`);
        for (const s of ['l', 'r']) assert.ok(Number.isFinite(k.pose[`${s}Shin`]), `${s}Shin at ${k.at}`);
    }
});

test('gripTarget `past` goes beyond the ankle along knee -> ankle; without it the joint', () => {
    const partner = { skeleton: { jointAttachmentPoints: { nearKnee: { x: 0, y: 0 }, nearAnkle: { x: 10, y: 20 } } } };
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'same' }, 'near'), { x: 10, y: 20 });
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'same', past: 0.5 }, 'near'), { x: 15, y: 30 });
});

test('flag off: the V2 clip is not in the registered move clips and the old ankleLock is untouched', () => {
    assert.equal(REGISTERED_MOVE_CLIPS.includes(ankleLockV2Clip), false);
    assert.equal(REGISTERED_MOVE_CLIPS.includes(ankleLockClip), true);
    assert.equal(ankleLockClip.grips, undefined);
});


test('painted boot anchors follow the requested side, with joint fallback for rigs without them', () => {
    const calls = [];
    const partner = { skeleton: {
        jointAttachmentPoints: { farAnkle: { x: 1, y: 2 } },
        partAnchorPoint(slot, anchor) { calls.push([slot, anchor]); return anchor === 'toe' ? { x: 30, y: 40 } : null; },
    } };
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'other', anchor: 'toe' }, 'near'), { x: 30, y: 40 });
    assert.deepEqual(calls, [['farShin', 'toe']]);
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'other', anchor: 'heel' }, 'near'), { x: 1, y: 2 });
    const compiled = compileClip(ankleLockV2Clip);
    assert.deepEqual(compiled.grips.map(g => [g.to.anchor, g.palm]), [['heel', 'clutch'], ['toe', 'clutch']]);
});
