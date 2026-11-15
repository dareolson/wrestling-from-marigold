import test from 'node:test';
import assert from 'node:assert/strict';
import { handStompClip, HAND_STOMP_SPEC } from '../src/animation/clips/handStomp.js';
import { validateClip } from '../src/animation/AnimationClip.js';
import { handHitSell, handHitSellDuration, HAND_SELL } from '../src/animation/falls.js';
import { ROSTER_KITS, lightKit, kitFor } from '../src/characters/rosterKits.js';
import { MOVE_SPECS } from '../src/moves/registry.js';

const RIGS = ['thesz-procreate-v1', 'george-roster-v1', 'kowalski-roster-v1', 'guido-roster-v1', undefined];

test('the hand stomp clip builds for every rig: valid, finite, the impact at the contact key, no positive knee channels (D3)', () => {
    for (const rig of RIGS) {
        const clip = handStompClip(HAND_STOMP_SPEC, rig, { x: 40, y: 5 });
        assert.ok(validateClip(clip).ok, `${rig}`);
        assert.equal(clip.events.find(e => e.type === 'impact').at, HAND_STOMP_SPEC.times.contact);
        for (const k of clip.tracks.attacker.keyframes) {
            for (const [n, v] of Object.entries(k.pose)) assert.ok(Number.isFinite(v), `${rig} ${n}`);
            assert.equal(k.pose.lKnee, undefined); assert.equal(k.pose.rKnee, undefined);
        }
        const keys = clip.tracks.attacker.keyframes;
        assert.deepEqual(keys[0].transform, { x: 0, y: 0 }, 'starts where he stands');
        assert.deepEqual(keys.at(-1).transform, { x: 40 - HAND_STOMP_SPEC.exit, y: 5 }, 'ends where the walk took him, less the step back from the man');
    }
});

test('the hand sell: exactly 0 at the end, the hand rests before the hit, the legs kick alternately and fade, shins only lift the heel', () => {
    for (const i of [0.5, 1]) {
        const end = handHitSellDuration();
        assert.ok(handHitSell(i, end).done);
        for (const k of Object.values(handHitSell(i, end - 0.001).d)) assert.ok(Math.abs(k) < 0.05, 'nearly 0 just before the end');
        for (const t of [-1, -0.3, -0.15, 0]) {
            assert.ok(Object.values(handHitSell(i, t).d).every(v => v === 0), 'no anticipatory reach or reaction before contact');
        }
        assert.ok(handHitSell(i, 0.25).d.nearFore > 0, 'hand pulls in after contact');
        const near = [], far = [];
        for (let t = 0; t < end; t += 1 / 60) { const d = handHitSell(i, t).d; near.push(d.nearShin); far.push(d.farShin); assert.ok(d.nearShin <= 0 && d.farShin <= 0, 'prone shin - only'); assert.ok(d.torso >= 0); }
        const peaks = a => a.filter((v, n) => n && n < a.length - 1 && v < a[n - 1] && v <= a[n + 1] && v < -0.15);
        assert.ok(peaks(near).length >= 2 && peaks(far).length >= 2, 'both legs kick');
        assert.ok(Math.min(...near) < Math.min(...near.slice(near.length >> 1)), 'the kicks fade');
    }
});

test('the style knobs: the kit can change the number of kicks and the length, the defaults are the approved version', () => {
    assert.equal(handHitSellDuration(), 1.8);
    assert.equal(handHitSellDuration({ seconds: 1.5 }), 1.5);
    const work = n => { let w = 0; for (let t = 0; t < 1.8; t += 1 / 120) { const d = handHitSell(1, t, { kicks: n }).d; w -= d.nearShin + d.farShin; } return w; };
    assert.ok(work(2) < work(4) && work(4) < work(6), 'more kicks, more leg work');
});

test('every kit that holds the knee drop holds the hand stomp under ?light=v1, and no base kit does', () => {
    for (const name of Object.keys(ROSTER_KITS)) {
        assert.ok(!ROSTER_KITS[name].includes('handStomp'), name);
        if (ROSTER_KITS[name].includes('kneeDrop')) assert.ok(lightKit(name).includes('handStomp') && lightKit(name).includes('kneeDrop'), name);
        assert.equal(kitFor(name, false), ROSTER_KITS[name]);
    }
});

test('the registry entry: a kit-gated strike with the hand sell, damage below the knee drop', () => {
    const m = MOVE_SPECS.handStomp;
    assert.equal(m.executor, '_doHandStomp'); assert.equal(m.kitGated, true); assert.deepEqual(m.sell, { part: 'hand', intensity: 1.0 });
});

test('T8.5: under ?light=v1 the prone man lies with his near arm out from the shoulder, along the mat toward the camera and back from the face; other rests are unchanged', async () => {
    const Skeleton = (await import('../src/Skeleton.js')).default;
    const plain = Skeleton.lyingBase('prone', true);
    Skeleton.setLightRest(true);
    try {
        const lit = Skeleton.lyingBase('prone', true);
        assert.notEqual(lit, plain);
        assert.ok(lit.nearArm < plain.nearArm && lit.nearFore < 0, 'the arm swings back from the head');
        assert.equal(lit.torso, plain.torso); assert.equal(lit.farArm, plain.farArm);
        assert.equal(Skeleton.lyingBase('supine', true), Skeleton.REST_POSES.supine);
        assert.equal(Skeleton.lyingBase('prone', false), Skeleton.GROUNDED_POSES.prone, 'falls off: the missile pose');
    } finally { Skeleton.setLightRest(false); }
    assert.equal(Skeleton.lyingBase('prone', true), plain, 'flag off: the ordinary rest pose');
});
