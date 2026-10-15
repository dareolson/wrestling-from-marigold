import { test } from 'node:test';
import assert from 'node:assert/strict';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { elbowDropClip } from '../src/animation/clips/elbowDrop.js';
import Wrestler from '../src/Wrestler.js';

// The elbow drop's damage belongs to the landing, not the wind-up: the
// defender loses nothing until the elbow arrives, and nothing at all if the
// flight is cut short. Real Wrestler executors; the Phaser surface is stubbed
// and pose tweens complete instantly.
function setup() {
    const runtime = new MoveRuntime();
    runtime.register(elbowDropClip);
    const scene = {
        moveRuntime: runtime,
        time: { now: 0, delayedCall: () => {} },
        tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} },
        cameras: { main: { shake: () => {} } },
        _logEvent: () => {},
    };
    const make = (x, facing) => Object.assign(Object.create(Wrestler.prototype), {
        scene, x, y: 360, facing, state: 'standing', stamina: 100, pose: {},
        idlePose: 'idle', skeleton: { setPartVariants() {} }, _activeMove: null,
        tweenPose(_pose, _dur, _ease, onDone) { if (onDone) onDone(); },
        _standBackUp() { this.state = 'standing'; },
    });
    const atk = make(470, 1);
    const def = make(540, -1);
    def.state = 'down';
    def.drains = [];
    def._drain = amount => def.drains.push(amount);
    return { runtime, atk, def };
}

test('elbow drop drains the defender once, at landing', () => {
    const { runtime, atk, def } = setup();
    atk._doElbowDrop(def);
    assert.equal(atk.state, 'elbowDropping');
    assert.deepEqual(def.drains, [], 'no damage during wind-up or takeoff');
    runtime.update(elbowDropClip.duration * 0.5);
    assert.deepEqual(def.drains, [], 'no damage mid-flight');
    runtime.update(elbowDropClip.duration);
    assert.equal(def.drains.length, 1);
    runtime.update(1);
    assert.equal(def.drains.length, 1, 'never applied twice');
});

test('an interrupted elbow drop costs the defender nothing', () => {
    const { runtime, atk, def } = setup();
    atk._doElbowDrop(def);
    runtime.update(elbowDropClip.duration * 0.5);
    runtime.cancel(atk._activeMove);
    runtime.update(1);
    assert.deepEqual(def.drains, []);
    assert.equal(atk.state, 'standing');
});
