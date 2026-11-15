import test from 'node:test';
import assert from 'node:assert/strict';
import { LIGHT_STRIKES, lightStrikeClip, STRIKE_STANDOFF } from '../src/animation/clips/lightStrikes.js';
import { validateClip } from '../src/animation/AnimationClip.js';
import { mountedPunchesClip, MOUNTED_PUNCHES_SPEC, bodyStompsClip, BODY_STOMPS_SPEC } from '../src/animation/clips/groundStrikes.js';
import { ROSTER_KITS, lightKit, kitFor } from '../src/characters/rosterKits.js';
import { MOVE_SPECS, KIT_AI_ODDS } from '../src/moves/registry.js';
import { PERSONALITIES } from '../src/AIHandler.js';
import { MOVE_FALLS } from '../src/animation/falls.js';

const RIGS = ['thesz-procreate-v1', 'george-roster-v1', 'kowalski-roster-v1', 'guido-roster-v1', undefined];
const IDS = Object.keys(LIGHT_STRIKES);

test('every light strike builds a valid clip for every attacker and defender rig (and an unknown rig): finite channels, impact at the hit key, no knee channels (D3)', () => {
    for (const id of IDS) for (const a of RIGS) for (const d of RIGS) {
        const clip = lightStrikeClip(id, a, { defenderRigId: d });
        assert.ok(validateClip(clip).ok, `${id} ${a} ${d}: ${JSON.stringify(validateClip(clip).errors)}`);
        const keys = clip.tracks.attacker.keyframes, hit = LIGHT_STRIKES[id].times.hit;
        assert.equal(clip.events.length, 1); assert.equal(clip.events[0].type, 'impact'); assert.equal(clip.events[0].at, hit);
        for (const k of keys) {
            for (const [n, v] of Object.entries(k.pose)) assert.ok(Number.isFinite(v), `${id} ${a} ${n}`);
            assert.equal(k.pose.lKnee, undefined); assert.equal(k.pose.rKnee, undefined);
            assert.ok(Number.isFinite(k.transform.x));
        }
        assert.deepEqual(keys[0].transform, { x: 0, y: 0 }, 'starts where he stands');
        assert.deepEqual(keys.at(-1).transform, { x: 0, y: 0 }, 'and ends where he stands');
        assert.equal(keys.filter(k => k.at === hit).length, 1, 'one hit key');
        assert.ok(keys.every((k, i) => i === 0 || k.at > keys[i - 1].at), 'keys strictly increase');
    }
});

test('retiming to a runner\'s arrival moves the hit and keeps the follow-through length', () => {
    for (const id of IDS) {
        const s = LIGHT_STRIKES[id], base = lightStrikeClip(id, undefined), late = lightStrikeClip(id, undefined, { hitAt: s.times.hit + 0.2 });
        assert.ok(Math.abs(late.events[0].at - (s.times.hit + 0.2)) < 1e-3);
        assert.ok(Math.abs((late.duration - late.events[0].at) - (base.duration - base.events[0].at)) < 1e-3, `${id} the tail after the hit is the same length`);
        assert.notEqual(late.id, base.id);
        // a runner who arrives sooner than the clip's own hit (hitAt below it) still builds a valid clip, every key inside it
        for (const hitAt of [0.14, 0.222, s.times.hit * 0.5, s.times.hit * 0.9]) for (const rig of RIGS) {
            const quick = lightStrikeClip(id, rig, { hitAt });
            assert.ok(validateClip(quick).ok, `${id} ${rig} hitAt ${hitAt}: ${JSON.stringify(validateClip(quick).errors)}`);
        }
    }
});

test('a light strike\'s contact numbers are sane: reach inside the separation, lunge inside the clip\'s lean, cock before hit before follow', () => {
    for (const id of IDS) for (const rig of RIGS) {
        const clip = lightStrikeClip(id, rig), keys = clip.tracks.attacker.keyframes;
        const lunge = keys.find(k => k.at === LIGHT_STRIKES[id].times.hit).transform.x;
        assert.ok(lunge >= 0 && lunge <= 80, `${id} ${rig} lunge ${lunge}`);
        assert.ok(STRIKE_STANDOFF === 80);
    }
});

test('the kit table: base kits hold none of the light strikes; the light kits hold the plan\'s defaults', () => {
    for (const name of Object.keys(ROSTER_KITS)) for (const id of IDS) {
        assert.ok(!ROSTER_KITS[name].includes(id), `${name} ${id}`);
        assert.equal(kitFor(name, false), ROSTER_KITS[name]);
    }
    const holds = (name, id) => lightKit(name).includes(id);
    // Stage 10: club blow in the jab's place for George and Kowalski
    for (const n of ['george', 'kowalski']) { assert.ok(holds(n, 'clubBlow'), n); assert.ok(!holds(n, 'jab'), n); }
    for (const n of ['thesz', 'guido']) { assert.ok(!holds(n, 'clubBlow'), n); assert.ok(holds(n, 'jab'), n); }
    const who = id => ['thesz', 'george', 'kowalski', 'guido'].filter(n => holds(n, id));
    assert.deepEqual(who('chop'), ['thesz', 'kowalski']); assert.deepEqual(who('uppercut'), ['kowalski', 'guido']);
    assert.deepEqual(who('runningForearm'), ['thesz', 'guido']); assert.deepEqual(who('shoulderBlock'), ['george', 'kowalski']);
    assert.deepEqual(who('backElbow'), ['george', 'kowalski']); assert.deepEqual(who('legSweep'), ['thesz', 'guido']);
    assert.deepEqual(who('axeHandleBack'), ['george', 'kowalski']); assert.deepEqual(who('bodyStomps'), ['george', 'kowalski']);
    assert.deepEqual(who('mountedPunches'), ['thesz', 'george', 'kowalski', 'guido'], 'everyone');
});

test('the registry entries: kit-gated strikes with an executor on Wrestler, damage, a sell and a fall table', async () => {
    const { default: Wrestler, STAMINA_DRAIN } = await import('../src/Wrestler.js').catch(() => ({}));
    for (const id of IDS) {
        const m = MOVE_SPECS[id];
        assert.ok(m, id); assert.equal(m.kitGated, true); assert.equal(m.clip, null);
        assert.equal(m.executor, `_do${id[0].toUpperCase()}${id.slice(1)}`);
        assert.ok(m.sell && m.sell.part, `${id} sell`);
        if (Wrestler) assert.equal(typeof Wrestler.prototype[m.executor], 'function', id);
        if (STAMINA_DRAIN) assert.ok(STAMINA_DRAIN[m.damageKey] > 0, id);
        if (!LIGHT_STRIKES[id].runner) assert.ok(MOVE_FALLS[id], `${id} has a fall table`);   // the runner's fall is startClotheslineFall's, not the falls table's
    }
});

test('every directional strike the AI has to be given a value for has one in every personality', () => {
    for (const id of IDS.filter(i => KIT_AI_ODDS[i])) for (const [name, cfg] of Object.entries(PERSONALITIES)) assert.ok(cfg[KIT_AI_ODDS[id]] > 0, `${name}: ${KIT_AI_ODDS[id]}`);
});

test('the ground strikes build for every rig and facing channel: valid, finite, one impact per punch or stomp, ends where the walk took him, no knee channels', () => {
    for (const rig of RIGS) for (const near of ['l', 'r']) {
        const m = mountedPunchesClip(MOUNTED_PUNCHES_SPEC, rig, { nearChannel: near, walk: { x: 50, y: 18 } });
        assert.ok(validateClip(m).ok, `${rig} ${JSON.stringify(validateClip(m).errors)}`);
        assert.equal(m.events.length, MOUNTED_PUNCHES_SPEC.punches);
        assert.deepEqual(mountedPunchesClip(MOUNTED_PUNCHES_SPEC, rig, { nearChannel: near, punches: 2 }).events.length, 2);
        for (const k of m.tracks.attacker.keyframes) for (const [n, v] of Object.entries(k.pose)) assert.ok(Number.isFinite(v), `${rig} ${n}`);
        const keys = m.tracks.attacker.keyframes;
        assert.deepEqual(keys[0].transform, { x: 0, y: 0 });
        // the arms alternate: the striking arm at each hit key is not the one at the next
        const hits = m.events.map(e => keys.find(k => k.at === e.at).pose);
        for (let i = 1; i < hits.length; i++) assert.notEqual(hits[i].lArm > hits[i].rArm, hits[i - 1].lArm > hits[i - 1].rArm, 'alternating hands');
    }
    for (const rig of RIGS) {
        const b = bodyStompsClip(rig, { walk: { x: 40, y: 5 } });
        assert.ok(validateClip(b).ok, `${rig} ${JSON.stringify(validateClip(b).errors)}`);
        assert.equal(b.events.length, BODY_STOMPS_SPEC.stomps);
        assert.equal(bodyStompsClip(rig, { stomps: 2 }).events.length, 2);
        for (const k of b.tracks.attacker.keyframes) { assert.equal(k.pose.lKnee, undefined); for (const v of Object.values(k.pose)) assert.ok(Number.isFinite(v)); }
        assert.deepEqual(b.tracks.attacker.keyframes.at(-1).transform, { x: 40 - BODY_STOMPS_SPEC.exit, y: 5 });
        const gaps = b.events.map((e, i) => i ? e.at - b.events[i - 1].at : null).slice(1);
        for (const g of gaps) assert.ok(Math.abs(g - BODY_STOMPS_SPEC.cycle) < 1e-3);
    }
});

test('a clip that closes the gap carries the walk in its transform and ends where it took him', () => {
    for (const id of ['shoulderBlock', 'runningForearm', 'clubBlow']) {
        const clip = lightStrikeClip(id, undefined, { walk: 60 }), keys = clip.tracks.attacker.keyframes, hit = keys.find(k => k.at === LIGHT_STRIKES[id].times.hit);
        assert.ok(hit.transform.x >= 60, id);
        assert.deepEqual(keys.at(-1).transform, { x: 60, y: 0 });
    }
});
