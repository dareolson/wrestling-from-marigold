import test from 'node:test';
import assert from 'node:assert/strict';
import { HairFixQueue, HAIR_FIX, HAIR_TAUNT_CHANCE } from '../src/animation/hairFixQueue.js';
import { georgeHairCheckClip } from '../src/animation/clips/georgeCrowdTaunt.js';
import { validateClip } from '../src/animation/AnimationClip.js';

const SAFE = true;

test('a stage rise queues one fix; no rise, no fix', () => {
    const q = new HairFixQueue(0);
    q.observe(0, 0);
    assert.equal(q.take(100, SAFE), null);
    q.observe(1, 200);
    assert.equal(q.take(300, SAFE), 1);
    assert.equal(q.take(400, SAFE), null, 'consumed');
});

test('safe-moment gate: busy or the man within 150 px holds the fix, a downed man or distance releases it', () => {
    const f = HairFixQueue.safe;
    assert.equal(f({ standing: false, otherState: 'down', dist: 500 }), false);
    assert.equal(f({ standing: true, otherState: 'standing', dist: 149 }), false);
    assert.equal(f({ standing: true, otherState: 'standing', dist: HAIR_FIX.farPx }), true);
    assert.equal(f({ standing: true, otherState: 'down', dist: 20 }), true);
    const q = new HairFixQueue(0);
    q.observe(1, 0);
    assert.equal(q.take(1000, false), null);
    assert.equal(q.take(2000, true), 1, 'waits, then plays at the safe moment');
});

test('the queued fix expires after 6 s', () => {
    const q = new HairFixQueue(0);
    q.observe(1, 0);
    assert.equal(q.take(HAIR_FIX.expireMs - 1, false), null);
    assert.equal(q.take(HAIR_FIX.expireMs, true), null);
    assert.equal(q.take(HAIR_FIX.expireMs + 1, true), null, 'gone for good');
});

test('8 s cooldown after a fix; a newer rise replaces the pending stage; wear dropping (new match) queues nothing', () => {
    const q = new HairFixQueue(0);
    q.observe(1, 0);
    assert.equal(q.take(10, SAFE), 1);
    q.observe(2, 5000);
    assert.equal(q.take(HAIR_FIX.cooldownMs, SAFE), null, 'cooling down');
    assert.equal(q.take(10 + HAIR_FIX.cooldownMs, SAFE), 2);
    q.observe(1, 20000);
    q.observe(0, 20001);
    assert.equal(q.take(40000, SAFE), null);
    const r = new HairFixQueue(0);
    r.observe(1, 0); r.observe(2, 50);
    assert.equal(r.take(100, SAFE), 2);
});

test('a taunt hair check also starts the cooldown; the taunt chance rises with wear', () => {
    const q = new HairFixQueue(0);
    q.noteFix(0);
    q.observe(1, 100);
    assert.equal(q.take(5000, SAFE), null);
    assert.deepEqual(HAIR_TAUNT_CHANCE, [0.35, 0.5, 0.6]);
});

test('fix clips: valid, one stroke irritated at stage 1, two hurried tries ending in abort at stage 2, a hit-cancel-safe lower body', () => {
    const stance = { lLeg: 0.1, rLeg: -0.1, crouch: 0.05, lKnee: 0.2, rKnee: 0.2, lArm: 0.3, rArm: 0.1, lElbow: 0.8, rElbow: 0.8, lean: 0, bend: 0 };
    const one = georgeHairCheckClip(stance, stance, { lSlot: 'nearForearm', rSlot: 'farForearm', stage: 1, fix: 'one' });
    const two = georgeHairCheckClip(stance, stance, { lSlot: 'nearForearm', rSlot: 'farForearm', stage: 2, fix: 'two' });
    for (const c of [one, two]) {
        assert.deepEqual(validateClip(c), { ok: true, errors: [] });
        assert.ok(c.duration <= 1.4, `${c.duration}`);
        for (const k of c.tracks.attacker.keyframes) for (const ch of ['lLeg', 'rLeg', 'crouch', 'lKnee', 'rKnee']) assert.equal(k.pose[ch], stance[ch]);
    }
    assert.ok(one.events.some(e => e.type === 'resent') && !one.events.some(e => e.type === 'abort'));
    assert.ok(two.events.some(e => e.type === 'abort'));
    assert.equal(two.tracks.attacker.keyframes.filter(k => k.parts.farForearm === 'hairSmooth' && k.pose.rArm > 3.2).length >= 3, true, 'two tries reach the hair');
    const clean = georgeHairCheckClip(stance, stance, { lSlot: 'nearForearm', rSlot: 'farForearm', stage: 0 });
    assert.ok(clean.duration > two.duration, 'the fixes are quicker than the taunt check');
});
