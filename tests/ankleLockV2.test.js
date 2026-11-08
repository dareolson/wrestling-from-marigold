import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ankleLockClip } from '../src/animation/clips/ankleLock.js';
import { ankleLockV2Clip, ankleLockEntryClip } from '../src/animation/clips/ankleLockV2.js';
import { compileClip, validateClip, sampleClip } from '../src/animation/AnimationClip.js';
import { clipLayerDepths } from '../src/animation/clipLayers.js';
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

test('T2.2c: the attacker stands tall (bend <= .3), both men own their shins, the victim\'s knees bend the natural way', () => {
    for (const k of ankleLockV2Clip.tracks.attacker.keyframes.filter(k => k.at >= 0.6)) assert.ok((k.pose.bend ?? 0) <= 0.3, `attacker bend ${k.pose.bend} at ${k.at}`);
    for (const k of ankleLockV2Clip.tracks.defender.keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false, `defender key ${k.at}`);
        for (const s of ['l', 'r']) assert.ok(k.pose[`${s}Shin`] < k.pose[`${s}Leg`], `${s} shin is folded behind its thigh at ${k.at}`);
    }
});

test('T2.2c: the trapped leg is raised and drawn over his body, his arms over the boot; same events and damage', () => {
    const held = ankleLockV2Clip.tracks.defender.keyframes.filter(k => k.at >= 0.6 && k.at <= 2.8);
    for (const k of held) assert.ok(k.pose.lLeg >= 1.3 && k.pose.lift > -110, `trapped leg up and hips off the mat at ${k.at}`);
    const [win] = ankleLockV2Clip.layers;
    assert.deepEqual(win.order.map(([r, l]) => `${r}.${l}`), ['defender.rLeg', 'defender.torso', 'defender.head', 'defender.rArm', 'defender.lArm', 'attacker.farArm', 'attacker.torso', 'attacker.head', 'attacker.farLeg', 'attacker.nearLeg', 'defender.lLeg', 'attacker.nearArm']);
    assert.equal(ankleLockV2Clip.events.filter(e => e.type === 'squeeze').length, 3);
});


test('pickup preserves the receiver position at different entry distances, before and after the grip', () => {
    for (const distance of [50, 70, 150, 210]) {
        const clip = compileClip(ankleLockEntryClip(distance));
        for (let t = 0; t <= clip.duration; t += 1 / 60) {
            const sample = sampleClip(clip, t).tracks;
            assert.equal(sample.defender.transform.x, distance, `receiver moved at ${t}`);
        }
        assert.equal(sampleClip(clip, 0).tracks.attacker.transform.x, 0);
        const grab = sampleClip(clip, 0.3).tracks, held = sampleClip(clip, 0.6).tracks;
        assert.equal(grab.defender.pose.lift, -110, 'receiver stays down until the grab');
        assert.ok(grab.defender.pose.lLeg < 0.1, 'trapped leg stays down until the grab');
        assert.ok(held.defender.pose.lift > grab.defender.pose.lift, 'lift follows the grab');
        assert.notEqual(grab.attacker.transform.x, held.attacker.transform.x, 'attacker follows the boot up');
    }
});


test('both near legs clear both torsos, including the receiver trunks, in either facing', () => {
    const names = ['torso', 'trunks', 'head', 'nearThigh', 'nearShin', 'farThigh', 'farShin', 'nearUpArm', 'nearForearm', 'farUpArm', 'farForearm'];
    for (const facing of [1, -1]) {
        const actor = f => ({ facing: f, skeleton: {
            lChannelSide: () => 'near',
            ...Object.fromEntries(names.map((n, i) => [n, { depth: 12 + i * 0.00001 }])),
        } });
        const actors = { attacker: actor(facing), defender: actor(-facing) };
        const depths = clipLayerDepths(ankleLockV2Clip, 1, actors);
        const d = (role, part) => depths.get(actors[role].skeleton[part]) ?? actors[role].skeleton[part].depth;
        for (const role of ['attacker', 'defender']) for (const part of ['nearThigh', 'nearShin']) {
            for (const torso of ['attacker', 'defender']) for (const image of ['torso', 'trunks']) {
                assert.ok(d(role, part) > d(torso, image), `${role}.${part} buried under ${torso}.${image}`);
            }
        }
    }
});
