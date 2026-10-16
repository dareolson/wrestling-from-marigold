import test from 'node:test';
import assert from 'node:assert/strict';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { suplexClip } from '../src/animation/clips/suplex.js';
import { jabClip } from '../src/animation/clips/jab.js';
import Wrestler from '../src/Wrestler.js';

// Contact foley (CrowdAudio.impact) belongs to the confirmed gameplay hit:
// exactly once on a landed move, never for an interrupted or dodged one.
function setup(clips) {
    const runtime = new MoveRuntime();
    for (const clip of clips) runtime.register(clip);
    const sounds = [];
    const scene = {
        moveRuntime: runtime,
        time: { now: 0, delayedCall: () => {} },
        tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} },
        cameras: { main: { shake: () => {} } },
        crowd: { impact: (kind, size) => sounds.push([kind, size]) },
        _logEvent: () => {},
    };
    const make = (x, facing) => Object.assign(Object.create(Wrestler.prototype), {
        scene, x, y: 360, facing, state: 'standing', stamina: 100, pose: {},
        idlePose: 'idle', skeleton: { setPartVariants() {} }, _activeMove: null,
        tweenPose(_p, _d, _e, done) { done?.(); }, _drain() {}, _doSell() {},
    });
    return { runtime, sounds, atk: make(470, 1), def: make(540, -1) };
}

test('a landed suplex hits the mat exactly once', () => {
    const { runtime, sounds, atk, def } = setup([suplexClip]);
    atk._doSuplex(def);
    for (let t = 0; t < suplexClip.duration + 0.5; t += 1 / 60) runtime.update(1 / 60);
    assert.deepEqual(sounds, [['mat', 1.0]]);
});

test('an interrupted suplex makes no impact sound', () => {
    const { runtime, sounds, atk, def } = setup([suplexClip]);
    atk._doSuplex(def);
    const impactAt = suplexClip.events.find(e => e.type === 'impact').at;
    runtime.update(impactAt * 0.6);
    runtime.cancel(atk._activeMove);
    runtime.update(1);
    assert.deepEqual(sounds, []);
});

test('a jab sounds on a hit, not on a dodge', () => {
    for (const [defState, expected] of [['standing', [['strike', 0.6]]], ['evading', []]]) {
        const { runtime, sounds, atk, def } = setup([jabClip]);
        def.state = defState;
        atk._doJab(def);
        runtime.update(0.2);
        assert.deepEqual(sounds, expected, defState);
    }
});
