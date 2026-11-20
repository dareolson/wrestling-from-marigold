import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { halfBostonCrabClip, HALF_CRAB_SPEC, HALF_CRAB_TIMES } from '../src/animation/clips/halfBostonCrab.js';
import { ankleLockV2Clip } from '../src/animation/clips/ankleLockV2.js';
import { validateClip, compileClip } from '../src/animation/AnimationClip.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { MOVE_SPECS as MOVES } from '../src/moves/registry.js';

const L = 'thesz-procreate-v1', G = 'george-roster-v1';
const clips = [['lou-george', L, G], ['george-lou', G, L]].map(([pair, attackerRigId, defenderRigId]) => [pair, halfBostonCrabClip(120, { attackerRigId, defenderRigId })]);

test('the clip is valid, three squeezes drain, the roll is declared, both pickup grips are on the ankle', () => {
    for (const [, c] of clips) {
        assert.deepEqual(validateClip(c), { ok: true, errors: [] });
        assert.deepEqual(c.events.filter(e => e.type === 'squeeze').map(e => e.at), HALF_CRAB_TIMES.pulls);
        assert.equal(c.events.filter(e => e.type === 'roll').length, 1);
        assert.deepEqual(compileClip(c).grips.map(g => [g.arm, g.to.anchor]), [['l', 'heel'], ['r', 'toe']]);
        assert.ok(c.grips.every(g => g.out[1] < HALF_CRAB_TIMES.turn), 'the hands are off before the turn');
    }
});

test('JSON the preview edits is the source file\'s own default spec', () => {
    assert.deepEqual(JSON.parse(readFileSync(new URL('../tools/move-preview/half-boston-crab.json', import.meta.url))), HALF_CRAB_SPEC);
});

test('D3: both men own their shins, no positive lKnee/rKnee, every shin finite', () => {
    for (const [, c] of clips) for (const role of ['attacker', 'defender']) for (const k of c.tracks[role].keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false, `${role} ${k.at}`);
        for (const s of ['l', 'r']) assert.ok(Number.isFinite(k.pose[`${s}Shin`]), `${role} ${s}Shin ${k.at}`);
    }
});

test('the pickup is ankleLockV2\'s, key for key, to 0.6 s', () => {
    const c = halfBostonCrabClip(120);
    for (const role of ['attacker', 'defender']) {
        const mine = c.tracks[role].keyframes.filter(k => k.at <= 0.6), theirs = ankleLockV2Clip.tracks[role].keyframes.filter(k => k.at <= 0.6);
        assert.deepEqual(mine.map(k => k.at), theirs.map(k => k.at));
    }
});

test('the turn flips the attacker\'s facing once, on a symmetric straight-legged pose, 0.01 s after the mirror image', () => {
    for (const [, c] of clips) {
        const keys = c.tracks.attacker.keyframes, flips = keys.filter((k, i) => i && k.facing !== keys[i - 1].facing);
        assert.equal(flips.length, 1);
        const before = keys[keys.indexOf(flips[0]) - 1], at = flips[0];
        assert.ok(Math.abs(at.at - HALF_CRAB_TIMES.turn) < 1e-9 && at.at - before.at < 0.0101);
        for (const ch of ['crouch', 'lLeg', 'rLeg', 'lElbow', 'rElbow', 'lShin', 'rShin']) assert.ok(Math.abs(at.pose[ch] - before.pose[ch]) < 1e-9, `${ch} is the same either side of the flip`);
        // the step round the leg lasts about 0.3 s: the key before the flip's first neighbour is the pickup's end
        assert.ok(HALF_CRAB_TIMES.turn - 0.6 >= 0.15 && HALF_CRAB_TIMES.turn - 0.6 <= 0.3);
    }
});

test('the receiver is stepped to his front at the roll and the hold ends with an exit, not on the pull', () => {
    for (const [, c] of clips) {
        const d = c.tracks.defender.keyframes;
        assert.equal(d.find(k => k.at === HALF_CRAB_TIMES.roll).ease, 'step');
        assert.ok(c.duration > HALF_CRAB_TIMES.end + 0.5);
        assert.ok(c.tracks.attacker.keyframes.at(-1).transform.x < c.tracks.attacker.keyframes.find(k => k.at === HALF_CRAB_TIMES.end).transform.x, 'he backs out');
    }
});

test('distance moves both men: the receiver lies at it, the attacker sits a gap short of him', () => {
    const near = halfBostonCrabClip(90), far = halfBostonCrabClip(150);
    const held = c => [c.tracks.attacker.keyframes.find(k => k.at === 2.0).transform.x, c.tracks.defender.keyframes.find(k => k.at === 2.0).transform.x];
    assert.equal(held(far)[0] - held(near)[0], 60);
    assert.equal(held(far)[1] - held(near)[1], 60);
});

test('flag off: the clip is not statically registered, and the registry move is kit-gated, a hold, run by _doHalfBostonCrab', () => {
    assert.equal(REGISTERED_MOVE_CLIPS.some(c => c.id === 'halfBostonCrab'), false);
    assert.equal(MOVES.halfBostonCrab.executor, '_doHalfBostonCrab');
    assert.equal(MOVES.halfBostonCrab.kitGated, true);
});

// the executor, on a stand-in `this` (no Phaser scene)
const { default: Wrestler } = await import('../src/Wrestler.js');
const exec = (search, rig = 'thesz-procreate-v1') => {
    globalThis.location = { search };
    const calls = [], other = { x: 700, state: 'holding', lying: 'supine', _layDown: (s, l) => calls.push(['layDown', l]) };
    const me = { x: 580, facing: 1, s: 1, rigId: rig, state: 'holding', scene: { moveRuntime: { register: c => calls.push(['register', c.id]) } },
        _doAnkleLock: () => calls.push(['ankleLock']), _standBackUp: () => calls.push(['stand']),
        _playPairedThrow: (o, id, opts) => { calls.push(['play', id, opts.hitEvent]); me.opts = opts; } };
    Wrestler.prototype._doHalfBostonCrab.call(me, other);
    return { calls, me, other };
};
test('flag off a kit that holds it plays the ankle lock; flag on it plays the crab with squeeze damage', () => {
    assert.deepEqual(exec('?light=off').calls, [['ankleLock']]);
    const { calls, me, other } = exec('?light=v1');
    assert.deepEqual(calls, [['register', 'halfBostonCrab'], ['play', 'halfBostonCrab', 'squeeze']]);
    me.opts.onClipEvent({ type: 'roll' }); assert.equal(other.lying, 'prone');
    me.opts.finish(); assert.deepEqual(calls.slice(-2), [['layDown', 'prone'], ['stand']]);
    delete globalThis.location;
});
