import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { frontKickClip } from '../src/animation/clips/frontKick.js';
import { ROSTER_KITS } from '../src/characters/rosterKits.js';
import { validateKit } from '../src/moves/registry.js';
import Wrestler from '../src/Wrestler.js';

test('front kick clip validates, compiles, and is solo (the executor owns position)', () => {
    const result = validateClip(frontKickClip);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.doesNotThrow(() => compileClip(frontKickClip));
    for (const frame of frontKickClip.tracks.attacker.keyframes) assert.equal(frame.transform, undefined);
});

for (const hz of [30, 60, 120]) {
    test(`front kick impact fires exactly once at ${hz} Hz`, () => {
        let impacts = 0;
        const runtime = new MoveRuntime({ onEvent: e => { if (e.type === 'impact') impacts++; } });
        runtime.register(frontKickClip);
        runtime.play('frontKick', { attacker: { pose: {}, skeleton: { setPartVariants() {} } } });
        const dt = 1 / hz;
        for (let t = 0; t < frontKickClip.duration + dt; t += dt) runtime.update(dt);
        assert.equal(impacts, 1);
    });
}

test('front kick starts and ends on the neutral stance (no pop into or out of the clip)', () => {
    const clip = compileClip(frontKickClip);
    const start = sampleClip(clip, 0).tracks.attacker.pose;
    const end = sampleClip(clip, frontKickClip.duration).tracks.attacker.pose;
    assert.deepEqual(end, start);
    assert.equal(start.bend, 0);
    assert.equal(start.crouch, 0);
});

test('the kick leg is out at the impact frame and folded in the chamber', () => {
    const clip = compileClip(frontKickClip);
    const impactAt = frontKickClip.events.find(e => e.type === 'impact').at;
    const at = t => sampleClip(clip, t).tracks.attacker.pose;
    assert.ok(at(impactAt).lLeg > 1.4 && at(impactAt).lKnee < 0.2, 'leg extended into the target');
    assert.ok(at(0.22).lKnee > 1.2, 'chambered before it fires');
});

// tryPower measures distance with Phaser's helper; Node has no Phaser.
globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };

// tryPower's directional override, tested on the real prototype without a Scene.
function powerPress({ down, otherState = 'standing', dx = 100, moveSet = ['jab', 'dropkick', 'frontKick'] }) {
    const calls = [];
    // A plain object: `s` is a getter on the real class (perspective scale).
    const self = {
        state: 'standing', s: 1, x: 0, y: 0, moveSet,
        input: { justDown: k => k === 'power', isDown: k => down && k === 'down' },
        _doFrontKick: () => calls.push('frontKick'),
        _doJab: () => calls.push('jab'),
        _doDropkick: () => calls.push('dropkick'),
    };
    const result = Wrestler.prototype.tryPower.call(self, { state: otherState, x: dx, y: 0 });
    return { result, calls };
}

test('down + power fires the front kick at jab range and a stride away, ahead of the jab', () => {
    assert.deepEqual(powerPress({ down: true, dx: 60 }), { result: 'frontKick', calls: ['frontKick'] });
    assert.deepEqual(powerPress({ down: true, dx: 125 }), { result: 'frontKick', calls: ['frontKick'] });
});

test('plain power still jabs and dropkicks; front kick is not reachable without the direction', () => {
    assert.equal(powerPress({ down: false, dx: 60 }).result, 'jab');
    assert.equal(powerPress({ down: false, dx: 150 }).result, 'dropkick');
});

test('front kick needs it in the kit, a standing/blocking target, and range', () => {
    assert.notEqual(powerPress({ down: true, dx: 60, moveSet: ['jab'] }).result, 'frontKick');
    assert.notEqual(powerPress({ down: true, dx: 60, otherState: 'staggered' }).result, 'frontKick');
    assert.equal(powerPress({ down: true, dx: 60, otherState: 'blocking' }).result, 'frontKick');
    assert.notEqual(powerPress({ down: true, dx: 140 }).result, 'frontKick');
});

test('roster kits are valid and only the new rigs carry the front kick', () => {
    for (const [name, kit] of Object.entries(ROSTER_KITS)) assert.deepEqual(validateKit(kit, name), []);
    assert.ok(ROSTER_KITS.kowalski.includes('frontKick') && ROSTER_KITS.guido.includes('frontKick'));
    assert.ok(!ROSTER_KITS.thesz.includes('frontKick') && !ROSTER_KITS.george.includes('frontKick'));
});

// Executor: the impact callback, driven on the real prototype with a stub scene.
function kickImpact({ dy = 0, dx = 84, otherState = 'standing' } = {}) {
    const tweens = [], sells = [], hurts = [];
    let onEvent;
    const self = {
        x: 500, y: 300, s: 1, facing: 1, scene: {
            moveRuntime: { play: (_id, _ctx, cbs) => { onEvent = cbs.onEvent; return {}; } },
            tweens: { add: t => { tweens.push(t); return { stop() {} }; } },
            _logEvent() {},
        },
        _cancelActiveMove() {},
    };
    const other = {
        x: 500 + dx, y: 300 + dy, state: otherState,
        _hurt: (...a) => hurts.push(a),
        _doSell: (...a) => sells.push(a),
    };
    Wrestler.prototype._doFrontKick.call(self, other);
    onEvent({ type: 'impact' });
    return { hurts, sells, pushes: tweens.filter(t => t.targets === other) };
}

test('front kick lands: hurts, sells, and pushes the defender', () => {
    const { hurts, sells, pushes } = kickImpact();
    assert.equal(hurts.length, 1);
    assert.equal(sells.length, 1);
    assert.equal(pushes.length, 1);
});

test('front kick misses a target who stepped off the row in ring depth', () => {
    const { hurts, sells, pushes } = kickImpact({ dy: 40 });
    assert.deepEqual([hurts.length, sells.length, pushes.length], [0, 0, 0]);
});

test('front kick misses a target who backed out of range during the wind-up', () => {
    assert.equal(kickImpact({ dx: 160 }).hurts.length, 0);
});

test('the push finishes before the stagger starts moving the defender', () => {
    const { sells, pushes } = kickImpact();
    assert.ok(pushes[0].duration <= sells[0][1], 'push must not overlap the stagger travel');
});
