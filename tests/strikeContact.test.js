import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateClip } from '../src/animation/AnimationClip.js';
import { jabClip, JAB_IMPACT_AT } from '../src/animation/clips/jab.js';
import { JAB_V2_CLIPS, jabV2For } from '../src/animation/clips/jabV2.js';
import { clotheslineV2For, CLOTHESLINE_ARRIVE_MS, CLOTHESLINE_SWING_MS } from '../src/animation/clips/clotheslineV2.js';

const ROSTER = ['thesz-procreate-v1', 'george-roster-v1', 'guido-roster-v1', 'kowalski-roster-v1'];

test('jabV2: one valid clip per roster rig, with the old jab\'s timing, impact and rear guard', () => {
    assert.equal(JAB_V2_CLIPS.length, ROSTER.length);
    for (const rig of ROSTER) {
        const clip = jabV2For(rig);
        assert.notEqual(clip, jabClip, rig);
        assert.deepEqual(validateClip(clip), { ok: true, errors: [] }, rig);
        assert.equal(clip.duration, jabClip.duration);
        assert.deepEqual(clip.events, jabClip.events);
        const keys = clip.tracks.attacker.keyframes, old = jabClip.tracks.attacker.keyframes;
        assert.deepEqual(keys.map(k => k.at), old.map(k => k.at));
        for (const [i, k] of keys.entries()) {
            for (const c of ['rArm', 'rElbow', 'lLeg', 'rLeg', 'crouch']) assert.equal(k.pose[c], old[i].pose[c], `${rig} ${c} at ${k.at}`);
        }
    }
    assert.equal(new Set(JAB_V2_CLIPS.map(c => c.id)).size, JAB_V2_CLIPS.length);
    assert.equal(jabV2For('thesz'), jabClip, 'an unsolved rig keeps the old jab');
});

test('jabV2: the lead arm reaches farther at the impact key than the old in-fighting punch (straighter elbow or higher arm)', () => {
    const oldHit = jabClip.tracks.attacker.keyframes.find(k => k.at === JAB_IMPACT_AT).pose;
    for (const clip of JAB_V2_CLIPS) {
        const hit = clip.tracks.attacker.keyframes.find(k => k.at === JAB_IMPACT_AT).pose;
        assert.ok(hit.lElbow < oldHit.lElbow, `${clip.id} elbow ${hit.lElbow}`);
    }
});

test('clotheslineV2: every roster rig has a straight arm raised past the old 1.18 and a contact distance inside the 80-unit separation', () => {
    for (const rig of ROSTER) {
        const v = clotheslineV2For(rig);
        assert.equal(v.swing.lElbow, 0, rig);
        assert.ok(v.swing.lArm > 1.18, rig);
        assert.ok(v.contact > 40 && v.contact < 80, `${rig} contact ${v.contact}`);
        assert.ok(v.follow.lArm < v.swing.lArm, 'the arm carries through and down');
    }
    assert.deepEqual(clotheslineV2For('thesz'), clotheslineV2For('george-roster-v1'), 'an unsolved rig takes the default arm');
    assert.ok(CLOTHESLINE_ARRIVE_MS.min > CLOTHESLINE_SWING_MS, 'the cock always has time left before the swing');
});
