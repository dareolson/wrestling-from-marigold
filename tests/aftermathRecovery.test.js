// ?aftermath=v2 protective recovery (PLAN_MOVE_PERFORMANCE.md D4, T4.4): a
// pose overlay on a COPY, standing and not choreo-owned only, never a lock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { onlyListed } from './support/promotedFlags.js';

function standing({ part = 'knee', limb = 'rLeg', severity = 1, now = 1000 } = {}) {
    const drawn = [];
    const scene = { time: { now }, tweens: { add: () => ({ stop() {} }) } };
    const noop = () => {};
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene, x: 400, y: 380, _heightScale: 1, facing: 1, state: 'standing', lying: 'supine',
        skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0,
        pose: { lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lean: 0, crouch: 0 },
        _activeMove: null, _choreoUntil: 0, _floorContacts: null, _pain: null, _sell: null, _groundHandoff: null,
        stateTimer: 0, input: { isDown: () => false, justDown: () => false },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop, lineStyle: noop, lineBetween: noop },
        skeleton: {
            setDepth: noop, invalidatePoseChannels: noop, setVisible: noop,
            updateUpright: (...a) => drawn.push(a[4]),
        },
    });
    w._pain = { source: 'x', part, limb, severity, phase: 'recover', since: now - 1000, until: now + 1500, planned: true };
    return { w, drawn, scene };
}
const withFlag = (search, fn) => { globalThis.location = { search: onlyListed(search) }; try { return fn(); } finally { delete globalThis.location; } };
const ON = '?aftermath=v2';

test('flag off: draw hands the skeleton this.pose itself, byte for byte', () => {
    for (const search of ['', '?aftermath=v1', '?dropkick=v2']) withFlag(search, () => {
        const { w, drawn } = standing();
        w.draw();
        assert.equal(drawn.at(-1), w.pose);
    });
});

test('flag on, recovering: the skeleton gets a copy with the knee motif; this.pose is unchanged', () => {
    withFlag(ON, () => {
        const { w, drawn } = standing({ now: 1000 });
        const before = structuredClone(w.pose);
        w.draw();
        const got = drawn.at(-1);
        assert.notEqual(got, w.pose);
        assert.deepEqual(w.pose, before);
        assert.ok(got.crouch > before.crouch);
        assert.equal(got.rKnee, undefined, 'the gait path is not switched to a knee override');
        assert.ok(got.rLeg < before.rLeg && got.lLeg > before.lLeg, 'sound leg takes the weight');
        assert.equal(got.lKnee, undefined);
    });
});

test('back motif bends the torso; other parts have no overlay', () => {
    withFlag(ON, () => {
        const back = standing({ part: 'back', limb: null });
        back.w.draw();
        assert.ok(back.drawn.at(-1).bend > 0.1);
        for (const part of ['head', 'chest', 'arm']) {
            const { w, drawn } = standing({ part, limb: null });
            w.draw();
            assert.equal(drawn.at(-1), w.pose, part);
        }
    });
});

test('the knee never bends forward: lKnee only goes down to its floor, lShin only more negative', () => {
    withFlag(ON, () => {
        const k = standing({ limb: 'rLeg' });
        k.w.pose = { ...k.w.pose, rKnee: 0.05 };
        k.w.draw();
        assert.ok(k.drawn.at(-1).rKnee < 0.05 && k.drawn.at(-1).rKnee >= -0.10);
        const f = standing({ limb: 'rLeg' });
        f.w.pose = { ...f.w.pose, rKnee: -0.10 };
        f.w.draw();
        assert.equal(f.drawn.at(-1).rKnee, -0.10);
    });
});

test('a pose that sets lShin takes the flex on the shin; limb null still only crouches', () => {
    withFlag(ON, () => {
        const a = standing({ limb: 'lLeg' });
        a.w.pose = { ...a.w.pose, lShin: -0.11 };
        a.w.draw();
        assert.ok(a.drawn.at(-1).lShin < -0.11);
        const b = standing({ limb: null });
        b.w.draw();
        assert.ok(b.drawn.at(-1).crouch > 0 && b.drawn.at(-1).lKnee === undefined && b.drawn.at(-1).rKnee === undefined);
    });
});

test('weight is 0 while a move owns the pose, during choreography, and outside standing', () => {
    withFlag(ON, () => {
        const base = standing();
        assert.ok(base.w._recoveryWeight() > 0);
        const move = standing(); move.w._activeMove = { id: 'x' };
        assert.equal(move.w._recoveryWeight(), 0);
        const choreo = standing(); choreo.w._choreoUntil = choreo.scene.time.now + 500;
        assert.equal(choreo.w._recoveryWeight(), 0);
        for (const state of ['staggered', 'blocking', 'evading', 'running', 'down', 'gettingUp', 'grappling']) {
            const o = standing(); o.w.state = state;
            assert.equal(o.w._recoveryWeight(), 0, state);
        }
        for (const phase of ['mat', 'rise']) {
            const o = standing(); o.w._pain.phase = phase;
            assert.equal(o.w._recoveryWeight(), 0, phase);
        }
    });
});

test('weight ramps in over 0.2 s, decays, and is 0 at until', () => {
    withFlag(ON, () => {
        const { w, scene } = standing({ now: 5000 });
        w._pain.since = 5000; w._pain.until = 7500;
        const at = (t) => { scene.time.now = t; return w._recoveryWeight(); };
        assert.equal(at(5000), 0);
        assert.ok(at(5100) > 0 && at(5100) < at(5200));
        assert.ok(at(5200) > at(6500) && at(6500) > at(7400));
        assert.equal(at(7500), 0);
        assert.equal(at(9000), 0);
        w._pain.part = 'back';
        assert.equal(at(7500), 0);
        assert.ok(at(6500) > at(7400) && at(7400) > 0);
    });
});

test('never blocks input or extends a lockout: draw changes no timer, state or input', () => {
    withFlag(ON, () => {
        const { w, scene } = standing();
        const snap = () => JSON.stringify({ state: w.state, st: w.stateTimer, choreo: w._choreoUntil, am: w._activeMove, pain: w._pain, stamina: w.stamina });
        const before = snap();
        for (let i = 0; i < 30; i++) { scene.time.now += 16; w.draw(); w._recoveryWeight(); }
        assert.equal(snap(), before);
        // the frame after rise completes, he is plain 'standing' with no lock: the
        // gates tryStrike/tryPower read are state-only
        assert.equal(w.state, 'standing');
        assert.equal(w._choreoOwnsPose(), false);
    });
});

test('a move claiming the pose mid-recovery gets this.pose back on the very next draw', () => {
    withFlag(ON, () => {
        const { w, drawn } = standing();
        w.draw();
        assert.notEqual(drawn.at(-1), w.pose);
        w._activeMove = { id: 'jab' };
        w.draw();
        assert.equal(drawn.at(-1), w.pose);
    });
});
