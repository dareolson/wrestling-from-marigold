import test from 'node:test';
import assert from 'node:assert/strict';
import { kneeDropV2Clip, KNEE_DROP_V2_SPEC } from '../src/animation/clips/kneeDropV2.js';
import { validateClip } from '../src/animation/AnimationClip.js';

const RIGS = ['thesz-procreate-v1', 'george-roster-v1', 'kowalski-roster-v1', 'guido-roster-v1', undefined];
const T = KNEE_DROP_V2_SPEC.times;

test('the knee drop clip builds for every rig and hip height: valid, finite, no positive knee channels, impact at the contact key', () => {
    for (const rig of RIGS) for (const hipHeight of [90, 125, 160]) {
        const clip = kneeDropV2Clip(KNEE_DROP_V2_SPEC, rig, { hipHeight, walk: { x: 30, y: -4 } });
        assert.ok(validateClip(clip).ok, `${rig} ${hipHeight}`);
        assert.equal(clip.events.find(e => e.type === 'impact').at, T.contact);
        for (const k of clip.tracks.attacker.keyframes) {
            for (const [n, v] of Object.entries(k.pose)) assert.ok(Number.isFinite(v), `${n}`);
            assert.equal(k.pose.lKnee, undefined); assert.equal(k.pose.rKnee, undefined);
        }
    }
});

test('the leap is body-relative: the apex lift is apexFrac of his hip height, and he is back on the mat by the end', () => {
    for (const hipHeight of [90, 125, 160]) {
        const keys = kneeDropV2Clip(KNEE_DROP_V2_SPEC, undefined, { hipHeight }).tracks.attacker.keyframes;
        const peak = Math.max(...keys.map(k => k.pose.lift));
        // lift is in reference units (his hip height over 124 scales it back to px): apex px = apexFrac x hipHeight
        const px = peak * hipHeight / 124;
        assert.ok(Math.abs(px - KNEE_DROP_V2_SPEC.apexFrac * hipHeight) < 1e-9);
        assert.ok(px / hipHeight >= 0.5, 'a clear leap: at least half his hip height');
        assert.equal(keys.at(-1).pose.lift, 0);
    }
});

test('the descent is gravity: lift falls faster every step from the apex to the contact, and the contact is the lowest point before the hold', () => {
    const keys = kneeDropV2Clip(KNEE_DROP_V2_SPEC, undefined, { hipHeight: 125 }).tracks.attacker.keyframes.filter(k => k.at >= T.apex && k.at <= T.contact);
    const drops = keys.slice(1).map((k, i) => (keys[i].pose.lift - k.pose.lift) / (k.at - keys[i].at));
    for (let i = 1; i < drops.length; i++) assert.ok(drops[i] > drops[i - 1], `speed rises into the contact (${drops.map(d => d.toFixed(0))})`);
});

test('the contact has no lift: he steps in across the depth (land) so the knee is on the chest with his body down, and stands beside the man before and after', () => {
    const keys = kneeDropV2Clip(KNEE_DROP_V2_SPEC, undefined, { hipHeight: 124, walk: { x: 30, y: 50 }, land: { y: 12 } }).tracks.attacker.keyframes;
    const c = keys.find(k => k.at === T.contact);
    assert.equal(c.pose.lift, 0); assert.equal(c.transform.y, 12);
    assert.equal(keys.find(k => k.at === T.set).transform.y, 50, 'beside him in depth at the set');
    assert.equal(keys.at(-1).transform.y, 50, 'and at the finish');
});
