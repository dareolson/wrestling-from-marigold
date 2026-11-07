// PLAN_GRAPPLES T3c.5b: the rope hit's timeline (pure) and its run in tickRun (flag on).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { ringBoundsAtY } from '../src/constants.js';
import { ROPE_HIT, ropeHitAt, ropeHitPose, ropeHitTotalMs, stepRopeSpring } from '../src/animation/ropeHit.js';

globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };
const withFlag = (on, fn) => {
    if (on) globalThis.location = { search: '?grapples=v1' };
    try { return fn(); } finally { delete globalThis.location; }
};
const RUN_G2 = { params: { STRIDE: 60, STANCE: 0.6, LIFT: 1 }, freq: 6, run: { on: true, speed: 520, stance: 0.6, cadence: 3, stride: 1, lift: 1 } };
function rig(o = {}) {
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { triggerRopeBounce: () => {}, _logEvent: () => {}, time: { now: 1000 } }, pose: {},
        x: 450, y: 350, facing: 1, runFacing: 1, state: 'running', runPhase: 'toRope', stamina: 100,
        walkPhase: 0, moveBlend: 1, _heightScale: 1, _gaitV2: null, runTargetY: null, ...o });
    w.runTarget = ringBoundsAtY(w.y).right - 20;
    return w;
}
const tick = (w, n = 1) => { for (let i = 0; i < n; i++) { w.scene.time.now += 1000 / 60; w.tickRun(1 / 60); } };

test('timeline: 34 px past the rope point, tension 0 to 1 and back, phases in order, ~350 ms contact to launch', () => {
    assert.equal(ROPE_HIT.depth, 34);
    const seen = [], out = [];
    for (let ms = 0; ms < 400; ms += 1000 / 60) { const r = ropeHitAt(ms, 100); out.push(r); if (seen.at(-1) !== r.phase) seen.push(r.phase); }
    assert.deepEqual(seen, ['load', 'taut', 'spring', 'done']);
    assert.ok(Math.max(...out.map(r => r.offset)) >= 34 - 1e-9 && Math.max(...out.map(r => r.offset)) <= 34.6);
    assert.equal(Math.max(...out.map(r => r.tension)), 1);
    assert.equal(ropeHitTotalMs(100), 350);
    assert.equal(ropeHitTotalMs(20), 390);   // worn: a longer taut hold
    assert.equal(ropeHitAt(0, 100).offset, 0);
    assert.equal(ropeHitAt(350, 100).offset, 0);
    assert.ok(ropeHitAt(60, 100).offset > ropeHitAt(60, 100).tension * 34, 'load eases out: more than linear early');
});
test('pose: arched back and arms out at load, folded forward at the spring', () => {
    assert.ok(ropeHitPose(170, 100).bend < -0.3);
    assert.ok(ropeHitPose(349, 100).bend > 0.25);
    assert.equal(ropeHitPose(0, 100).bend, 0);
});
test('rope spring: bows 30+ px at full tension, overshoots inward about 10 px, rings out within about 400 ms of launch', () => {
    const s = { val: 0, vel: 0 };
    let max = 0, min = 0, last = 0;
    for (let ms = 0; ms < 1200; ms += 1000 / 240) {
        stepRopeSpring(s, ROPE_HIT.ropeBow * ropeHitAt(ms, 100).tension, 1 / 240);
        max = Math.max(max, s.val); min = Math.min(min, s.val);
        if (ms > 350 && Math.abs(s.val) > 1) last = ms;
    }
    assert.ok(max >= 30); assert.ok(min <= -8 && min >= -14, `overshoot ${min}`); assert.ok(last - 350 <= 450, `rings ${last - 350} ms`);
});
test('flag on, both gaits, both ropes: back to the rope 40 px short, 34 px past it, launch at the rope point on the return', () => {
    for (const g2 of [null, RUN_G2]) for (const dir of [1, -1]) withFlag(true, () => {
        const b = ringBoundsAtY(350);
        const w = rig({ x: dir > 0 ? b.right - 400 : b.left + 400, runFacing: dir, facing: dir, _gaitV2: g2, _lastOther: { x: 300, y: 350 } });
        w.runTarget = dir > 0 ? b.right - 20 : b.left + 20;
        const rope = w.runTarget;
        let turnedAt = null, maxPast = 0, phases = [];
        for (let i = 0; i < 2000 && w.runPhase !== 'returning'; i++) {
            tick(w);
            if (turnedAt === null && w.facing === -dir) turnedAt = Math.abs(rope - w.x);
            if (w.runPhase === 'ropeHit') maxPast = Math.max(maxPast, (w.x - rope) * dir);
            if (phases.at(-1) !== w.runPhase) phases.push(w.runPhase);
        }
        assert.deepEqual(phases, ['toRope', 'ropeHit', 'returning']);
        assert.ok(turnedAt <= 40 * w.s && turnedAt > 40 * w.s - 12 * w.s, `turned ${turnedAt} px short, one frame of travel from ${40 * w.s}`);
        assert.ok(Math.abs(maxPast - 34 * w.s) < 1, `past ${maxPast}`);
        assert.equal(w.x, rope); assert.equal(w.facing, -dir); assert.equal(w.moveBlend, 0.7);
        assert.ok(w._runBoost > 1);
    });
});
test('not returning during the hit, so a clothesline cannot catch him; tension only while it runs', () => {
    withFlag(true, () => {
        const w = rig(); w.runTarget = w.x + 30;
        while (w.runPhase !== 'ropeHit') tick(w);
        for (let i = 0; i < 10; i++) { tick(w); assert.equal(w.runPhase, 'ropeHit'); }
        assert.ok(w._ropeTension > 0);
    });
});
test('a hit during the rope hit leaves no stuck phase, tension or boost', () => {
    withFlag(true, () => {
        const w = rig(); w.runTarget = w.x + 30;
        while (w.runPhase !== 'ropeHit') tick(w);
        tick(w, 8);
        w.state = 'falling';
        tick(w);
        assert.equal(w.runPhase, null); assert.equal(w._ropeTension, 0); assert.equal(w._runBoost, 0);
    });
});
test('the return speed peaks at 1.7x run speed and settles to 1x', () => {
    withFlag(true, () => {
        const w = rig({ _lastOther: { x: 100, y: 350 } }); w.runTarget = w.x + 30;
        while (w.runPhase !== 'returning') tick(w);
        const steps = [];
        for (let i = 0; i < 60 && w.state === 'running'; i++) { const x0 = w.x; tick(w); steps.push(Math.abs(w.x - x0)); }
        const base = 340 * w.s / 60;
        assert.ok(Math.max(...steps) >= 1.6 * base, `peak ${(Math.max(...steps) / base).toFixed(2)}x`);
        assert.ok(Math.abs(steps.at(-1) - base) < 0.05 * base);
    });
});
test('the return line still passes through the attacker (snapshot at launch)', () => {
    withFlag(true, () => {
        const att = { x: 300, y: 300 };
        const w = rig({ _lastOther: att, y: 400 }); w.runTarget = ringBoundsAtY(400).right - 20; w.x = w.runTarget - 200;
        let cross = null;
        for (let i = 0; i < 3000 && w.state === 'running'; i++) { const px = w.x; tick(w); if (w.runPhase === 'returning' && cross === null && (px - 300) * (w.x - 300) <= 0) cross = w.y; }
        assert.ok(Math.abs(cross - 300) < 3, `crossed at y ${cross}`);
    });
});
test('flag off: flips on arrival, no hit, no early turn', () => {
    const w = rig(); w.runTarget = w.x + 30;
    let early = false;
    for (let i = 0; i < 200 && w.runPhase === 'toRope'; i++) { tick(w); if (w.facing === -1 && w.runPhase === 'toRope') early = true; }
    assert.equal(w.runPhase, 'returning'); assert.equal(w.facing, -1); assert.equal(early, false);
    assert.ok(!w._runBoost);
});

test('T3d.3: the load tucks the elbows and keeps the hands near the ribs, the spring lets them swing', () => {
    const load = ropeHitPose(170, 100), spring = ropeHitPose(349, 100);
    assert.ok(load.bend < -0.45, 'shoulders well back into the rope');
    assert.ok(load.lElbow > 1.5 && load.rElbow > 1.5, 'elbows bent');
    assert.ok(Math.abs(load.lArm) < 0.5 && Math.abs(load.rArm) < 0.5, 'upper arms near the sides, not flung out');
    assert.ok(spring.lElbow < load.lElbow && spring.lArm !== load.lArm);
});
