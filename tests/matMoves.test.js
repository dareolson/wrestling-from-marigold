// PLAN_LIGHT_MOVES Stage 12: the ten mat and lockup moves (clips/matMoves.js). Rough hand-posed clips: these check they build and wire up, not how they look.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAT_MOVES, matMoveClip } from '../src/animation/clips/matMoves.js';
import { validateClip } from '../src/animation/AnimationClip.js';
import { ROSTER_KITS, lightKit, kitFor } from '../src/characters/rosterKits.js';
import { MOVE_SPECS, KIT_AI_ODDS } from '../src/moves/registry.js';
import { PERSONALITIES } from '../src/AIHandler.js';

const RIGS = ['thesz-procreate-v1', 'george-roster-v1', 'kowalski-roster-v1', 'guido-roster-v1', undefined];
const IDS = Object.keys(MAT_MOVES);

test('Stage 12 moves and wristlock variant, each in the registry with an executor and in the plan\'s default kits', () => {
    assert.equal(IDS.length, 11);
    for (const id of IDS) {
        assert.ok(MOVE_SPECS[id], `${id}: registry entry`);
        assert.equal(MOVE_SPECS[id].executor, `_do${id[0].toUpperCase()}${id.slice(1)}`);
        assert.equal(MOVE_SPECS[id].kitGated, true);
        assert.ok(['thesz', 'george', 'kowalski', 'guido'].some(k => lightKit(k).includes(id)), `${id} is in some light kit`);
        for (const name of Object.keys(ROSTER_KITS)) { assert.ok(!ROSTER_KITS[name].includes(id)); assert.equal(kitFor(name, false), ROSTER_KITS[name]); }
    }
    const holds = (name, id) => lightKit(name).includes(id);
    for (const [id, who] of Object.entries({
        wristlock: ['guido'], wristlockHammerlock:['thesz'], headlockTakeover: ['thesz', 'george'], flyingMare: ['guido', 'thesz'], testOfStrength: ['kowalski', 'thesz'], leapfrog: ['guido', 'george'],
        backwardRoll: ['george', 'guido'], abdominalStretch: ['kowalski', 'george'], bodyScissors: ['thesz', 'kowalski'], indianDeathlock: ['george', 'kowalski'], backdropSuplex: ['thesz', 'kowalski'],
    })) for (const name of ['thesz', 'george', 'kowalski', 'guido']) assert.equal(holds(name, id), who.includes(name), `${name} ${id}`);
});

test('every move builds a valid clip for every attacker / defender rig and a few standoffs: finite channels, no knee channels, strictly increasing keys, events inside the clip', () => {
    for (const id of IDS) for (const a of RIGS) for (const d of RIGS) for (const D of [62, 100, 130]) {
        const clip = matMoveClip(id, D, { attackerRigId: a, defenderRigId: d });
        assert.ok(validateClip(clip).ok, `${id} ${a} ${d} ${D}: ${JSON.stringify(validateClip(clip).errors)}`);
        for (const role of Object.keys(clip.tracks)) {
            const keys = clip.tracks[role].keyframes;
            assert.ok(keys.every((k, i) => i === 0 || k.at > keys[i - 1].at), `${id} ${role}: keys strictly increase`);
            assert.ok(keys.at(-1).at <= clip.duration + 1e-9, `${id} ${role}: no key past the end`);
            for (const k of keys) {
                for (const [n, v] of Object.entries(k.pose)) assert.ok(Number.isFinite(v), `${id} ${role} ${n}`);
                assert.equal(k.pose.lKnee, undefined); assert.equal(k.pose.rKnee, undefined);
                assert.ok(Number.isFinite(k.transform.x) && Number.isFinite(k.transform.y));
            }
        }
        for (const e of clip.events) assert.ok(e.at > 0 && e.at <= clip.duration, `${id} event ${e.type}`);
    }
});

test('a paired move has an attacker and a defender track and the drain event the executor listens for; a solo move has the attacker only', () => {
    for (const id of IDS) {
        const def = MAT_MOVES[id], clip = matMoveClip(id, 100);
        if (def.kind === 'solo') { assert.deepEqual(Object.keys(clip.tracks), ['attacker'], id); continue; }
        assert.deepEqual(Object.keys(clip.tracks).sort(), ['attacker', 'defender'], id);
        const hits = clip.events.filter(e => e.type === def.hitEvent);
        assert.ok(hits.length >= 1, `${id}: ${def.hitEvent} events`);
        if (def.hold) assert.equal(hits.length, 3, `${id}: a hold pulls three times`);
    }
});

test('the AI works the mat holds, the stagger hold and the leapfrog (matMoveOdds), and no kit move is left with no AI value that the check can see', () => {
    for (const id of ['abdominalStretch', 'bodyScissors', 'indianDeathlock', 'leapfrog']) {
        assert.equal(KIT_AI_ODDS[id], 'matMoveOdds');
        for (const cfg of Object.values(PERSONALITIES)) assert.ok(cfg.matMoveOdds > 0, `${id}`);
    }
});


test('Lou keeps the original wristlock entry before the behind-back variant and Guido keeps the original move',()=>{
    const original=matMoveClip('wristlock'),variant=matMoveClip('wristlockHammerlock');
    assert.deepEqual(variant.events,original.events,'same single damage event');
    assert.deepEqual(variant.tracks.attacker.keyframes.filter(k=>k.at<=1.5),original.tracks.attacker.keyframes.filter(k=>k.at<=1.5));
    assert.ok(lightKit('thesz').includes('wristlockHammerlock'));
    assert.ok(!lightKit('thesz').includes('wristlock'));
    assert.ok(lightKit('guido').includes('wristlock'));
    assert.ok(!lightKit('guido').includes('wristlockHammerlock'));
    assert.ok(variant.grips.filter(g=>g.role==='defender'&&g.to.role==='attacker').every(g=>g.arm==='near'),'same worked arm throughout');
    const hold=variant.tracks.defender.keyframes.find(k=>k.at===2.7);
    assert.ok(hold.pose.nearElbow< -2);
    assert.equal(variant.tracks.attacker.keyframes.find(k=>k.at===2.7).facing,undefined,'facing inherited from the turn key');
});


test('hammerlock handoff rejects invalid offsets and grip options',()=>{
    const source=matMoveClip('wristlockHammerlock');
    for(const change of [{to:{...source.grips[1].to,offset:{x:NaN,y:0}}},{blendFromHand:'yes'},{reverseElbow:1}]){
        assert.equal(validateClip({...source,grips:[{...source.grips[1],...change}]}).ok,false);
    }
});
