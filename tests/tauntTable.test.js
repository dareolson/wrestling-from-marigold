import test from 'node:test';
import assert from 'node:assert/strict';
import { TAUNT_SLOTS, TAUNT_KITS, tauntKitKey, readTauntSlot, tauntSlotKey, tauntIdFor, tauntSlotsOf, aiTauntSlot } from '../src/animation/tauntTable.js';
import { TAUNT_GESTURES, tauntGestureClip } from '../src/animation/clips/tauntGestures.js';
import { validateClip } from '../src/animation/AnimationClip.js';

const held = (...keys) => ({ isDown: k => keys.includes(k) });
const IDS = new Set(['strut', 'armsWide', 'crowd', 'hairCheck', 'superiority', ...Object.keys(TAUNT_GESTURES)]);

test('every character has at least two distinct taunts and every slot resolves to a known id', () => {
    for (const [name, kit] of Object.entries(TAUNT_KITS)) {
        assert.ok(kit.neutral, `${name} has a neutral taunt`);
        assert.ok(new Set(Object.values(kit)).size >= 2, `${name} has two distinct taunts`);
        for (const slot of TAUNT_SLOTS) assert.ok(IDS.has(tauntIdFor(kit, slot)), `${name}.${slot} -> ${tauntIdFor(kit, slot)}`);
        for (const slot of Object.keys(kit)) assert.ok(TAUNT_SLOTS.includes(slot), `${name}: ${slot} is a slot`);
    }
});

test('the defaults of the plan: George, Lou, Guido, Kowalski', () => {
    assert.deepEqual(TAUNT_KITS.george, { neutral: 'strut', up: 'hairCheck', forward: 'crowd', down: 'superiority' });
    assert.equal(TAUNT_KITS.lou.neutral, 'armsWide');
    assert.equal(TAUNT_KITS.guido.neutral, 'fistPump');
    assert.equal(TAUNT_KITS.guido.up, TAUNT_KITS.lou.up);
    assert.equal(TAUNT_KITS.kowalski.neutral, 'armsWide');
    assert.ok(!Object.values(TAUNT_KITS.guido).includes('strut'), 'Guido no longer inherits George\'s strut');
});

test('rig ids map to a kit; the old Lou rigs share Lou\'s', () => {
    assert.equal(tauntKitKey('george-roster-v1'), 'george');
    assert.equal(tauntKitKey('guido-roster-v1'), 'guido');
    assert.equal(tauntKitKey('kowalski-roster-v1'), 'kowalski');
    for (const r of ['thesz-procreate-v1', 'thesz', 'thesz-front3q-r1', 'thesz-roster-v1']) assert.equal(tauntKitKey(r), 'lou');
    assert.equal(tauntKitKey(undefined), null);
});

test('direction routes by facing: up and down win, left/right become forward/back', () => {
    for (const facing of [1, -1]) {
        const fwd = facing > 0 ? 'right' : 'left', back = facing > 0 ? 'left' : 'right';
        assert.equal(readTauntSlot(held(), facing), 'neutral');
        assert.equal(readTauntSlot(held('up'), facing), 'up');
        assert.equal(readTauntSlot(held('down'), facing), 'down');
        assert.equal(readTauntSlot(held('up', fwd), facing), 'up');
        assert.equal(readTauntSlot(held(fwd), facing), 'forward');
        assert.equal(readTauntSlot(held(back), facing), 'back');
        assert.equal(readTauntSlot(held('left', 'right'), facing), 'neutral');
        assert.equal(tauntSlotKey('forward', facing), fwd);
        assert.equal(tauntSlotKey('back', facing), back);
        assert.equal(readTauntSlot(held(tauntSlotKey('forward', facing)), facing), 'forward');
    }
});

test('a slot the kit lacks falls back to neutral', () => {
    assert.equal(tauntIdFor(TAUNT_KITS.guido, 'forward'), 'fistPump');
    assert.equal(tauntIdFor(TAUNT_KITS.lou, 'back'), 'armsWide');
    assert.equal(tauntIdFor(TAUNT_KITS.lou, 'forward'), 'pointFist');
});

test('the AI only picks a slot the wrestler has, and reaches each of them', () => {
    for (const [name, kit] of Object.entries(TAUNT_KITS)) {
        const seen = new Set();
        for (let i = 0; i < 200; i++) { const s = aiTauntSlot(kit, i / 200); assert.ok(kit[s], `${name} has ${s}`); seen.add(s); }
        assert.deepEqual([...seen].sort(), tauntSlotsOf(kit).sort());
    }
});

test('gesture clips: valid, lower body held from the stance, no knee channel authored, ends on the idle upper body', () => {
    const stance = { lLeg: 0.1, rLeg: -0.1, crouch: 0.05, lKnee: 0.2, rKnee: 0.2, lArm: 0.3, rArm: 0.1, lElbow: 0.8, rElbow: 0.8, lean: 0, bend: 0 };
    const idle = { ...stance, lArm: 0.2 };
    for (const name of Object.keys(TAUNT_GESTURES)) {
        const clip = tauntGestureClip(name, stance, idle);
        assert.deepEqual(validateClip(clip), { ok: true, errors: [] }, name);
        const kf = clip.tracks.attacker.keyframes;
        assert.equal(kf[0].at, 0);
        assert.equal(kf.at(-1).at, clip.duration);
        assert.equal(kf.at(-1).pose.lArm, 0.2);
        for (const k of kf) { assert.equal(k.pose.lLeg, 0.1); assert.equal(k.pose.crouch, 0.05); assert.equal(k.pose.lKnee, 0.2); assert.ok(!(k.pose.lKnee > 0.2)); }
        assert.ok(clip.events.some(e => e.type === 'release'), `${name} releases the face`);
        assert.ok(clip.duration >= 1.3 && clip.duration <= 2.2, `${name} ${clip.duration}s`);
    }
});
