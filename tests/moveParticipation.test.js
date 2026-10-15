import test from 'node:test';
import assert from 'node:assert/strict';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import Wrestler, { POSES } from '../src/Wrestler.js';

const clip = (id, roles = ['attacker']) => ({ id, duration: 1,
    tracks: Object.fromEntries(roles.map(role => [role, { keyframes: [
        { at: 0, pose: { lArm: 0, tilt: 0, lift: 0 } },
        { at: 1, pose: { lArm: 1, tilt: 0, lift: 0 } },
    ] }])), events: [{ at: 0.8, type: 'impact' }] });

function setup() {
    const runtime = new MoveRuntime();
    runtime.register(clip('one')); runtime.register(clip('two', ['attacker', 'defender']));
    const killed = [];
    const scene = { moveRuntime: runtime, time: { now: 0 }, tweens: {
        killTweensOf(target) { killed.push(target); },
        add() { return { stop() {} }; },
    } };
    const actor = () => Object.assign(Object.create(Wrestler.prototype), {
        scene, pose: { lElbow: -3, rKnee: 2.5, tilt: 4, lift: 200 },
        state: 'standing', idlePose: 'idle', x: 450, y: 350, facing: 1,
        skeleton: { setPartVariants() {} }, _activeMove: null,
    });
    return { runtime, killed, actor };
}

test('a paired clip takes exclusive ownership of a participating defender', () => {
    const { runtime, actor } = setup();
    const a = actor(), b = actor(); let oldImpacts = 0, cancellations = 0;
    const old = runtime.play('one', { attacker: b }, {
        onEvent() { oldImpacts++; }, onCancel() { cancellations++; },
    });
    const next = runtime.play('two', { attacker: a, defender: b });
    assert.equal(old.cancelled, true);
    assert.equal(cancellations, 1);
    runtime.update(0.9);
    assert.equal(oldImpacts, 0);
    assert.equal(runtime._active.size, 1);
    assert.equal(runtime._active.has(next.id), true);
});

test('clip entry stops the defender recovery tween and drops stale unowned articulation', () => {
    const { runtime, actor, killed } = setup();
    const a = actor(), b = actor();
    runtime.play('two', { attacker: a, defender: b });
    assert.ok(killed.includes(a.pose));
    assert.ok(killed.includes(b.pose));
    assert.equal(b.pose.lElbow, undefined, 'a previous hammerlock must not bend the next jab');
    assert.equal(b.pose.rKnee, undefined);
    assert.equal(b.pose.tilt, 0);
});

test('omitted articulation initializes from the character idle, not previous move history', () => {
    const { runtime, actor } = setup(); const a = actor(); a.idlePose = 'theszIdle';
    runtime.play('one', { attacker: a });
    assert.equal(a.pose.lForearm, POSES.theszIdle.lForearm);
    assert.equal(a.pose.lElbow, undefined);
});

test('cancelling a flight stops its travel tween before it can drag a recovered actor', () => {
    const { runtime, actor } = setup(); const a = actor();
    let stopped = 0;
    a.scene.tweens.add = () => ({ stop() { stopped++; } });
    a._standBackUp = () => { a.state = 'standing'; };
    a._playFlight(clip('one'), { x: 700 }, () => {});
    runtime.cancel(a._activeMove);
    assert.equal(stopped, 1);
});

test('a held receiver renders authored limbs without a frozen walking or guard blend', () => {
    const { actor } = setup(); const a = actor(); let rendered;
    const gfx = { clear() {}, setDepth() {}, fillStyle() {}, fillEllipse() {} };
    Object.assign(a, { gfx, _heightScale: 1, stamina: 100, state: 'holding',
        walkPhase: Math.PI / 2, moveBlend: 1, combatBlend: 1, _activeMove: {},
        skeleton: { setDepth() {}, invalidatePoseChannels() {}, setVisible() {},
            updateUpright(...args) { rendered = args; } },
    });
    a.draw();
    assert.equal(rendered[5], 0, 'no walk arm swing');
    assert.equal(rendered[6], 0, 'no guard overriding the clip');
    assert.equal(rendered[8], 0, 'no walking IK overriding clip legs');
    a.state = 'standing'; a._activeMove = null; a._choreoUntil = 0;
    a.draw();
    assert.equal(rendered[5], Math.PI / 2, 'ordinary locomotion still renders');
    assert.equal(rendered[8], 1);
});

test('returning George to neutral unwinds a hold instead of retaining its folded joints', () => {
    const { actor } = setup(); const a = actor(); let config;
    a.scene.tweens.add = c => { config = c; };
    a.tweenPose('idle', 200);
    assert.equal(config.lElbow, 0.70);
    assert.equal(Math.abs(config.rKnee), 0);
});
