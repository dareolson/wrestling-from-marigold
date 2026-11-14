import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bodySlamClip } from '../src/animation/clips/bodySlam.js';
import { bodySlamV2Clip, bodySlamV2GeorgeClip, bodySlamV2For } from '../src/animation/clips/bodySlamV2.js';
import { validateClip, compileClip } from '../src/animation/AnimationClip.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { MOVE_SPECS } from '../src/moves/registry.js';

const both = [bodySlamV2Clip, bodySlamV2GeorgeClip];

test('bodySlamV2 clips are valid and keep the old impact marker, duration and events', () => {
    for (const c of both) {
        assert.deepEqual(validateClip(c), { ok: true, errors: [] });
        assert.equal(c.duration, bodySlamClip.duration);
        assert.deepEqual(c.events, bodySlamClip.events);
        assert.equal(compileClip(c).grips.length, 2);
    }
});

test('D5/D4: hand on his hip and shoulder, both soles planted until the slam', () => {
    for (const c of both) {
        assert.deepEqual(c.grips.map(g => [g.arm, g.to.joint]), [['l', 'Hip'], ['r', 'Shoulder']]);
        assert.deepEqual(c.plants.map(p => p.leg), ['l', 'r']);
        assert.ok(c.grips.every(g => g.out[1] <= 1.08) && c.plants.every(p => p.out[0] <= 1.0));
    }
});

test('D3: both men own their shins, no lKnee/rKnee keys, shins finite', () => {
    for (const c of both) for (const role of ['attacker', 'defender']) for (const k of c.tracks[role].keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false, `${role} ${k.at}`);
        assert.ok(Number.isFinite(k.pose.lShin) && Number.isFinite(k.pose.rShin));
    }
});

test('the lift is lower than the old one, slower than the drop, and the attacker holds still until the slam', () => {
    const lifts = c => c.tracks.defender.keyframes.filter(k => k.at < 1.08).map(k => k.pose.lift);
    assert.ok(Math.max(...lifts(bodySlamV2Clip)) <= 70 && Math.max(...lifts(bodySlamV2Clip)) < 0.45 * Math.max(...bodySlamClip.tracks.defender.keyframes.map(k => k.pose.lift)));
    assert.ok(Math.max(...lifts(bodySlamV2GeorgeClip)) < Math.max(...lifts(bodySlamV2Clip)));
    for (const k of bodySlamV2Clip.tracks.attacker.keyframes.filter(k => k.at < 1.0)) assert.equal(k.transform.x, 0);
    const d = bodySlamV2Clip.tracks.defender.keyframes, peak = d.find(k => k.pose.lift === Math.max(...lifts(bodySlamV2Clip)));
    assert.ok(peak.at / 1 > (1.08 - peak.at), 'time up (to the peak) is longer than time down (peak to impact)');
});

test('flag off: the V2 clips are not statically registered and the move is still bodySlam; the rig picks the clip', () => {
    for (const c of both) assert.equal(REGISTERED_MOVE_CLIPS.includes(c), false);
    assert.equal(MOVE_SPECS.bodySlam.clip, 'bodySlam');
    assert.equal(bodySlamV2For('george-roster-v1'), 'bodySlamV2George');
    assert.equal(bodySlamV2For('thesz-procreate-v1'), 'bodySlamV2');
});
