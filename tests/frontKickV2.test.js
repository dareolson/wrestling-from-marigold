import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontKickClip } from '../src/animation/clips/frontKick.js';
import { frontKickV2Clip } from '../src/animation/clips/frontKickV2.js';
import { compileClip, validateClip } from '../src/animation/AnimationClip.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';

test('frontKickV2 is a valid clip with the old clip\'s duration, impact frame and untouched arms', () => {
    assert.deepEqual(validateClip(frontKickV2Clip), { ok: true, errors: [] });
    assert.equal(frontKickV2Clip.duration, frontKickClip.duration);
    assert.deepEqual(frontKickV2Clip.events, frontKickClip.events);
    assert.equal(frontKickV2Clip.events.find(e => e.type === 'impact').at, 0.3);
    const old = new Map(frontKickClip.tracks.attacker.keyframes.map(k => [k.at, k.pose]));
    for (const k of frontKickV2Clip.tracks.attacker.keyframes.filter(k => old.has(k.at))) {
        for (const c of ['lArm', 'rArm', 'lElbow', 'rElbow', 'lean', 'bend']) assert.equal(k.pose[c], old.get(k.at)[c], `${c} at ${k.at}`);
    }
});

test('D3: no lKnee / rKnee key (the old clip folded the knee backward with a positive lKnee); both shins are absolute and none hyperextends against its thigh', () => {
    assert.ok(frontKickClip.tracks.attacker.keyframes.some(k => k.pose.lKnee > 1), 'the old clip is the positive-knee one');
    for (const k of frontKickV2Clip.tracks.attacker.keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false, `key ${k.at}`);
        for (const s of ['l', 'r']) {
            const thigh = k.pose[`${s}Leg`] + 0.85 * k.pose.crouch;
            assert.ok(k.pose[`${s}Shin`] <= thigh + 1e-9, `${s}Shin ${k.pose[`${s}Shin`]} past its thigh ${thigh} at ${k.at}`);
        }
    }
});

test('the kick chambers with the shin hanging and then extends into the impact; the kicking shin is behind the knee at the chamber', () => {
    const at = (t) => frontKickV2Clip.tracks.attacker.keyframes.find(k => k.at === t).pose;
    assert.ok(at(0.22).lShin < at(0.22).lLeg - 1, 'chamber folds the heel');
    assert.ok(at(0.3).lShin > at(0.3).lLeg - 0.3, 'at the impact the leg is out nearly straight');
    assert.ok(at(0.3).lLeg > 1.4, 'thigh at least level at the impact');
});

test('the support (r) sole is planted from the start to the set-down', () => {
    const c = compileClip(frontKickV2Clip);
    assert.equal(c.plants.length, 1);
    const [p] = c.plants;
    assert.deepEqual([p.role, p.leg], ['attacker', 'r']);
    assert.ok(p.in[1] <= 0.1 && p.out[0] >= 0.6);
});

test('flag off: the V2 clip is not registered and the old frontKick is untouched', () => {
    assert.equal(REGISTERED_MOVE_CLIPS.includes(frontKickV2Clip), false);
    assert.equal(REGISTERED_MOVE_CLIPS.includes(frontKickClip), true);
    assert.equal(frontKickClip.plants, undefined);
});

test('the plant keeps its kneeRestart flag through compile (the runtime reads it); no other clip sets it', async () => {
    assert.equal(compileClip(frontKickV2Clip).plants[0].kneeRestart, true);
    for (const c of REGISTERED_MOVE_CLIPS) for (const p of c.plants ?? []) assert.equal(p.kneeRestart, undefined, c.id);
});
