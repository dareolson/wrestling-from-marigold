import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateClip } from '../src/animation/AnimationClip.js';
import { georgeCrowdTauntClip, CROWD_TAUNT } from '../src/animation/clips/georgeCrowdTaunt.js';

const stance = { lLeg: -0.18, rLeg: 0.13, lArm: 0.10, rArm: 0.59, lean: 0.09, crouch: 0.22, lKnee: -0.1, rKnee: -0.1 };

test('crowd taunt: a valid clip with its beats in order', () => {
    const clip = georgeCrowdTauntClip(stance);
    assert.deepEqual(validateClip(clip), { ok: true, errors: [] });
    assert.deepEqual(clip.events.map(e => e.type), ['present', 'reject', 'dismiss', 'release']);
    assert.ok(CROWD_TAUNT.times.holdEnd - CROWD_TAUNT.times.present >= 0.6, 'the applause hold reads (>= 0.6 s)');
});

test('crowd taunt: the lower body holds the stance on every key (soles planted, no authored knee)', () => {
    const keys = georgeCrowdTauntClip(stance).tracks.attacker.keyframes;
    for (const k of keys) for (const c of ['lLeg', 'rLeg', 'crouch', 'lKnee', 'rKnee']) assert.equal(k.pose[c], stance[c], `${c} at ${k.at}`);
    assert.equal(keys[0].pose.lArm, stance.lArm, 'starts on the stance');
});

test('crowd taunt: no arm is raised overhead (the near hand stays below the face)', () => {
    for (const k of georgeCrowdTauntClip(stance).tracks.attacker.keyframes) assert.ok(k.pose.lArm <= 1.1 && k.pose.rArm <= 1.1, `${k.at}`);
});

test('superiority: a valid short clip, lower body held, the presenting hand at waist height', async () => {
    const { georgeSuperiorityClip, SUPERIORITY } = await import('../src/animation/clips/georgeCrowdTaunt.js');
    const clip = georgeSuperiorityClip(stance);
    assert.deepEqual(validateClip(clip), { ok: true, errors: [] });
    assert.ok(clip.duration >= 0.9 && clip.duration <= 1.2, `${clip.duration}`);
    for (const k of clip.tracks.attacker.keyframes) for (const c of ['lLeg', 'rLeg', 'crouch', 'lKnee', 'rKnee']) assert.equal(k.pose[c], stance[c]);
    assert.ok(SUPERIORITY.keys.present.lArm < 0.8, 'presenting at the waist, not raised');
});

test('gesture hands: the presenting arm wears the open palm through the presentation and the dismiss hand through the sweep, base at the ends; the rig has both', async () => {
    const { existsSync } = await import('node:fs');
    const { georgeRosterV1 } = await import('../src/characters/george_roster_v1.js');
    const { georgeSuperiorityClip } = await import('../src/animation/clips/georgeCrowdTaunt.js');
    for (const name of ['presentPalm', 'dismiss', 'chestTouch', 'hairSmooth', 'inspect']) {
        const v = georgeRosterV1.textures.variants.forearm[name];
        assert.ok(v && existsSync(`src/assets/wrestlers/george-roster-v1/${v.file}`), name);
    }
    const hand = (clip, at) => clip.tracks.attacker.keyframes.find(k => k.at === at).parts.nearForearm;
    const a = georgeCrowdTauntClip(stance, stance, { lSlot: 'nearForearm' }), t = CROWD_TAUNT.times;
    assert.equal(hand(a, 0), 'base');
    assert.equal(hand(a, t.present), 'presentPalm');
    assert.equal(hand(a, t.holdEnd), 'presentPalm');
    assert.equal(hand(a, t.recoil), 'chestTouch');
    assert.equal(hand(a, t.sweepMid), 'dismiss');
    assert.equal(hand(a, t.end), 'base');
    assert.deepEqual(validateClip(a), { ok: true, errors: [] });
    const b = georgeSuperiorityClip(stance, stance, { lSlot: 'farForearm' });
    assert.equal(b.tracks.attacker.keyframes.at(-1).parts.farForearm, 'base');
    assert.ok(!georgeCrowdTauntClip(stance).tracks.attacker.keyframes.some(k => k.parts), 'no slot given: no art swap');
});

test('hair check: valid at every wear stage, far hand smooths and near hand inspects, quicker when worn, battered breaks off, lower body held', async () => {
    const { georgeHairCheckClip } = await import('../src/animation/clips/georgeCrowdTaunt.js');
    const clips = [0, 1, 2].map(stage => georgeHairCheckClip(stance, stance, { lSlot: 'nearForearm', rSlot: 'farForearm', stage }));
    for (const c of clips) {
        assert.deepEqual(validateClip(c), { ok: true, errors: [] });
        for (const k of c.tracks.attacker.keyframes) for (const ch of ['lLeg', 'rLeg', 'crouch', 'lKnee', 'rKnee']) assert.equal(k.pose[ch], stance[ch]);
        const ks = c.tracks.attacker.keyframes;
        assert.equal(ks[1].parts.farForearm, 'hairSmooth');
        assert.deepEqual(ks.at(-1).parts, { nearForearm: 'base', farForearm: 'base' });
    }
    assert.ok(clips[0].duration >= 2.0 && clips[0].duration <= 2.6, `${clips[0].duration}`);
    // T-D1: the hand rests on the hair about half a second, and the clean stage strokes twice
    const ks0 = clips[0].tracks.attacker.keyframes, onHair = ks0.filter(k => k.parts.farForearm === 'hairSmooth');
    assert.ok(onHair.at(-1).at - ks0[2].at >= 1.0, 'hand stays on the hair');
    assert.equal(ks0.filter(k => k.pose.rElbow > 1.2 && k.parts.farForearm === 'hairSmooth').length, 2, 'two strokes');
    assert.ok(clips[1].duration < clips[0].duration, 'disheveled is quicker');
    assert.ok(clips[0].tracks.attacker.keyframes.some(k => k.parts.nearForearm === 'inspect'));
    assert.ok(!clips[2].tracks.attacker.keyframes.some(k => k.parts.nearForearm === 'inspect'), 'battered breaks off before looking at his hand');
    assert.ok(clips[2].events.some(e => e.type === 'abort'));
});

test('hair check on the near arm (T-D3): hairReach + hairFix on the l-channel arm through the touches, the far arm rests, fixes and battered stage keep the same art', async () => {
    const { georgeHairCheckClip } = await import('../src/animation/clips/georgeCrowdTaunt.js');
    const o = { lSlot: 'nearForearm', rSlot: 'farForearm', lUpSlot: 'nearUpperArm', nearArm: true };
    for (const [stage, fix] of [[0, null], [1, null], [2, null], [1, 'one'], [2, 'two']]) {
        const c = georgeHairCheckClip(stance, stance, { ...o, stage, fix });
        assert.deepEqual(validateClip(c), { ok: true, errors: [] });
        const ks = c.tracks.attacker.keyframes;
        assert.ok(c.duration <= 2.6, `${c.duration}`);
        assert.equal(ks[1].parts.nearUpperArm, 'hairReach');
        assert.equal(ks[1].parts.nearForearm, 'hairFix');
        assert.equal(ks[1].parts.farForearm, 'base', 'the far hand stays at rest');
        assert.deepEqual(ks.at(-1).parts, { nearForearm: 'base', farForearm: 'base', nearUpperArm: 'base' });
        for (const k of ks) for (const ch of ['lLeg', 'rLeg', 'crouch', 'lKnee', 'rKnee']) assert.equal(k.pose[ch], stance[ch]);
        // the hair art is only on while the hand is up: never with the inspecting hand
        for (const k of ks) assert.ok(k.parts.nearForearm !== 'hairFix' || k.parts.nearUpperArm === 'hairReach', 'the pair goes together');
    }
    const far = georgeHairCheckClip(stance, stance, { ...o, nearArm: false });
    assert.ok(!far.tracks.attacker.keyframes.some(k => k.parts.nearUpperArm === 'hairReach'), 'without the art: the far arm, as before');
    assert.equal(far.tracks.attacker.keyframes[1].parts.farForearm, 'hairSmooth');
});
