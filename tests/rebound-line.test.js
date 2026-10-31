// PLAN_GRAPPLES T3c.4: the rebound aims at the attacker's depth; up/down aims a self-started run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { ringBoundsAtY } from '../src/constants.js';

globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };
const withFlag = (on, fn) => {
    if (on) globalThis.location = { search: '?grapples=v1' };
    try { return fn(); } finally { delete globalThis.location; }
};
const base = (o) => Object.assign(Object.create(Wrestler.prototype), {
    scene: { triggerRopeBounce: () => {}, time: { delayedCall: () => {} }, tweens: { add: () => {} }, _logEvent: () => {} },
    _runStaggerSteps() {}, facing: 1, walkPhase: 0, moveBlend: 1, _heightScale: 1, _gaitV2: null, runTargetY: null, ...o });

test('flag on: the clothesline connects on the return when the attacker is 60 px off in depth', () => {
    withFlag(true, () => {
        const att = base({ x: 300, y: 410, state: 'standing', input: { justDown: k => k === 'action', isDown: () => false }, moveSet: ['clothesline'], _runPoseSequence() {}, _hurt() {} });
        const r = base({ x: 450, y: 350, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: att, _hurt() {}, _doSell() {} });
        r.runTarget = ringBoundsAtY(350).right - 20;
        let hit = null;
        for (let i = 0; i < 900 && !hit; i++) {
            r.tickRun(1 / 60);
            if (r.runPhase === 'returning' && Math.abs(r.x - att.x) < 120) hit = att.tryAction(r);
        }
        assert.equal(hit, 'clothesline');
    });
});
test('flag off: the return is flat, so a runner across the lane keeps his own y', () => {
    const att = base({ x: 300, y: 410, state: 'standing' });
    const r = base({ x: 450, y: 350, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: att });
    r.runTarget = ringBoundsAtY(350).right - 20;
    for (let i = 0; i < 900 && r.state === 'running'; i++) r.tickRun(1 / 60);
    assert.equal(r.y, 350);
});
test('same depth: the flag-on return is the flat line it always was', () => {
    withFlag(true, () => {
        const att = base({ x: 300, y: 350, state: 'standing' });
        const r = base({ x: 450, y: 350, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: att });
        r.runTarget = ringBoundsAtY(350).right - 20;
        for (let i = 0; i < 900 && r.state === 'running'; i++) { r.tickRun(1 / 60); assert.equal(r.y, 350); }
    });
});
test('tryRun: up or down held aims the rope point 70 px up or down, clamped; none keeps it flat; flag off ignores it', () => {
    const mk = (held) => base({ x: 500, y: 350, state: 'standing', input: { justDown: k => k === 'run', isDown: k => k === held } });
    withFlag(true, () => {
        const up = mk('up'); up.tryRun();
        assert.equal(up.runTargetY, 350 - 70 * up.s);
        const down = mk('down'); down.tryRun();
        assert.equal(down.runTargetY, 350 + 70 * down.s);
        const none = mk(null); none.tryRun();
        assert.equal(none.runTargetY, null);
        const edge = base({ x: 500, y: 262, state: 'standing', input: { justDown: k => k === 'run', isDown: k => k === 'up' } });
        edge.tryRun();
        assert.equal(edge.runTargetY, 264);
    });
    const off = mk('up'); off.tryRun();
    assert.equal(off.runTargetY, null);
});

// T3c.4b: what this proves is the run's own path: at the frame the runner crosses the attacker's x, his y is the attacker's y
// (the slope-limited y where 0.5 x slope cannot reach it), whatever the rope depth. Not an attack window, not the endpoint.
const RUN_G2 = { params: { STRIDE: 60, STANCE: 0.6, LIFT: 1 }, freq: 6, run: { on: true, speed: 520, stance: 0.6, cadence: 3, stride: 1, lift: 1 } };
test('T3c.4b: the return crosses the attacker\'s x at the attacker\'s y; slope-limited cases land on the 0.5 line', () => {
    let worst = 0, limited = 0, n = 0, missMax = 0;
    withFlag(true, () => {
        for (const g2 of [null, RUN_G2]) for (const dir of [1, -1]) for (const ry of [300, 350, 420]) for (const oy of [270, 330, 380, 435]) for (const gap of [90, 200, 330, 500]) {
            const hitY = ry;
            const b = ringBoundsAtY(hitY);
            const att = { x: 0, y: oy };
            const r = base({ x: dir > 0 ? b.right - 20 : b.left + 20, y: hitY, state: 'running', runPhase: 'toRope', runFacing: dir, _lastOther: att, _gaitV2: g2 });
            att.x = r.x - dir * gap * r.s;
            r._flipAtRope(dir);
            const want = Math.abs(oy - hitY) <= 0.5 * Math.abs(att.x - r.x) ? oy : hitY + Math.sign(oy - hitY) * 0.5 * Math.abs(att.x - r.x);
            const wantC = Math.max(264, Math.min(439, want));
            let cross = null;
            for (let i = 0; i < 1500 && r.runPhase === 'returning' && r.state === 'running'; i++) {
                const px = r.x; r.tickRun(1 / 60);
                if (cross === null && (px - att.x) * (r.x - att.x) <= 0) cross = r.y;
            }
            n++;
            if (gap * r.s < 60 * r.s) continue;   // within 60: the one line, covered below
            assert.notEqual(cross, null, 'crossed him');
            const err = Math.abs(cross - wantC);
            worst = Math.max(worst, err);
            if (Math.abs(oy - hitY) > 0.5 * gap * r.s) { limited++; missMax = Math.max(missMax, Math.abs(cross - oy)); }
            assert.ok(err < 3, `g2 ${!!g2} dir ${dir} ry ${ry} oy ${oy} gap ${gap}: crossed at y ${cross}, want ${wantC}`);
        }
    });
    console.log(`T3c.4b crossing: ${n} cases, worst y error ${worst.toFixed(3)} px, ${limited} slope-limited (miss his y by up to ${missMax.toFixed(1)} px)`);
});
test('T3c.4b: a sidestep after launch is not followed (snapshot, not homing)', () => {
    withFlag(true, () => {
        const att = { x: 300, y: 300 };
        const r = base({ x: 800, y: 400, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: att });
        r._flipAtRope(1);
        att.y = 430; att.x = 250;
        let cross = null;
        for (let i = 0; i < 1500 && r.state === 'running'; i++) { const px = r.x; r.tickRun(1 / 60); if (cross === null && (px - 300) * (r.x - 300) <= 0) cross = r.y; }
        assert.ok(Math.abs(cross - 300) < 3, `crossed x 300 at y ${cross}`);
    });
});
test('T3c.4b: attacker behind the runner, within 60 px, or at his depth: no waypoint', () => {
    withFlag(true, () => {
        for (const [ax, ay] of [[900, 300], [760, 300], [500, 400]]) {
            const r = base({ x: 800, y: 400, state: 'running', runPhase: 'toRope', runFacing: 1, _lastOther: { x: ax, y: ay } });
            r._flipAtRope(1);
            assert.equal(r._returnVia, null);
        }
    });
});
