import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { shoveClip } from '../src/animation/clips/shove.js';
import { resolvePowerMove } from '../src/logic/moveDecision.js';
import { ROSTER_KITS } from '../src/characters/rosterKits.js';
import { validateKit } from '../src/moves/registry.js';

test('shove clip validates, compiles, and is solo (the executor owns position)', () => {
    const result = validateClip(shoveClip);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.doesNotThrow(() => compileClip(shoveClip));
    for (const frame of shoveClip.tracks.attacker.keyframes) assert.equal(frame.transform, undefined);
});

for (const hz of [30, 60, 120]) {
    test(`shove impact fires exactly once at ${hz} Hz`, () => {
        let impacts = 0;
        const runtime = new MoveRuntime({ onEvent: e => { if (e.type === 'impact') impacts++; } });
        runtime.register(shoveClip);
        runtime.play('shove', { attacker: { pose: {}, skeleton: { setPartVariants() {} } } });
        const dt = 1 / hz;
        for (let t = 0; t < shoveClip.duration + dt; t += dt) runtime.update(dt);
        assert.equal(impacts, 1);
    });
}

test('shove starts and ends on the neutral stance, with the arms out at the impact frame', () => {
    const clip = compileClip(shoveClip);
    const at = t => sampleClip(clip, t).tracks.attacker.pose;
    assert.deepEqual(at(shoveClip.duration), at(0));
    const impactAt = shoveClip.events.find(e => e.type === 'impact').at;
    assert.ok(at(impactAt).lArm > 1.1 && at(impactAt).lElbow < 0.5, 'arm locked out into the chest');
    assert.ok(at(impactAt).bend > 0.2, 'leaning into it');
});

test('a blocking target at point-blank gets the shove instead of the jab, only with it in the kit', () => {
    const ctx = { dist: 60, scale: 1, otherState: 'blocking' };
    assert.equal(resolvePowerMove({ ...ctx, moveSet: ['jab', 'shove'] }), 'shove');
    assert.equal(resolvePowerMove({ ...ctx, moveSet: ['jab'] }), 'jab');
    assert.equal(resolvePowerMove({ ...ctx, otherState: 'standing', moveSet: ['jab', 'shove'] }), 'jab');
    assert.notEqual(resolvePowerMove({ ...ctx, dist: 100, moveSet: ['jab', 'shove'] }), 'shove');
});

test('only Kowalski carries the shove for now', () => {
    for (const [name, kit] of Object.entries(ROSTER_KITS)) assert.deepEqual(validateKit(kit, name), []);
    assert.ok(ROSTER_KITS.kowalski.includes('shove'));
    for (const n of ['thesz', 'george', 'guido']) assert.ok(!ROSTER_KITS[n].includes('shove'));
});

// ── Executors: drive _doFrontKick/_doShove with a fake scene and fire the impact.
import Wrestler from '../src/Wrestler.js';

function strike(method, { dx = 70, dy = 0, otherState = 'standing' } = {}) {
    let onEvent; const tweens = []; const log = { hurt: [], sell: 0 };
    const scene = {
        moveRuntime: { play: (id, actors, opts) => { onEvent = opts.onEvent; return {}; } },
        tweens: { add: t => { tweens.push(t); return { stop() {} }; } },
        _logEvent() {},
    };
    const self = { scene, x: 400, y: 300, s: 1, facing: 1, _cancelActiveMove() {} };
    const other = { x: 400 + dx, y: 300 + dy, state: otherState,
        _hurt: (...a) => log.hurt.push(a), _doSell: () => { log.sell++; }, startStagger() {} };
    Wrestler.prototype[method].call(self, other);
    onEvent({ type: 'impact' });
    return { tweens, log };
}

for (const method of ['_doFrontKick', '_doShove']) {
    test(`${method}: lands on a target in the lane`, () => {
        const { log } = strike(method);
        assert.equal(log.hurt.length, 1);
        assert.equal(log.sell, 1);
    });

    test(`${method}: misses a target who stepped off the row during the wind-up`, () => {
        const { log } = strike(method, { dy: 60 });
        assert.equal(log.hurt.length, 0);
    });

    test(`${method}: the push ends before the 110 ms sell hands position to the stagger`, () => {
        const { tweens } = strike(method);
        const push = tweens.find(t => t.targets && t.targets.state === 'standing');
        assert.ok(push, 'push tween on the defender');
        assert.ok(push.duration <= 110);
    });
}
