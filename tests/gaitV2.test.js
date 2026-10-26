// ?gait=v2 (PLAN_GAIT Stage 2): foot lock (T2.1) and lean through bend (T2.2). Flag-off identity is tests/gaitFlagOff.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { footGait, GAIT } from '../src/Skeleton.js';
import Wrestler, { gaitV2Config, GAIT_LEAN } from '../src/Wrestler.js';

const noop = () => {};
const TAU = Math.PI * 2;
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05 };
const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };

function walker(search, extra = {}) {
    return withFlag(search, () => {
        const keys = new Set();
        const w = Object.assign(Object.create(Wrestler.prototype), {
            scene: { time: { now: 1000 } }, x: 300, y: 360, _heightScale: 0.79, facing: 1, state: 'standing', vx: 0, vy: 0,
            walkPhase: 0, moveBlend: 0, _walkPhaseDir: 1, stamina: 100, pose: { ...IDLE }, idlePose: 'idle', combatBlend: 0,
            input: { isDown: k => keys.has(k), justDown: () => false }, _clamp: noop,
            _gaitV2: gaitV2Config(), _gaitLift: 1, _gaitLeanExtra: 0, ...extra,
        });
        return { w, keys };
    });
}
const OTHER = { x: 900, y: 150, state: 'standing' };

test('config: null without the flag, defaults and URL knobs with it', () => {
    assert.equal(gaitV2Config(), null);
    assert.equal(withFlag('?gait=v1', gaitV2Config), null);
    const c = withFlag('?gait=v2', gaitV2Config);
    assert.equal(c.leanWalk, GAIT_LEAN.walk); assert.equal(c.leanRun, GAIT_LEAN.run); assert.equal(c.knee, 0); assert.equal(c.stride, 1);
    const k = withFlag('?gait=v2&gaitStride=1.3&gaitKnee=0.1&leanWalk=0.2&leanRun=0.3', gaitV2Config);
    assert.equal(k.params.STRIDE, GAIT.STRIDE * 1.3);
    assert.ok(Math.abs(k.freq - GAIT.STANCE * TAU / (GAIT.STRIDE * 1.3)) < 1e-12, 'WALK_FREQ re-derived from the stride');
    assert.equal(k.knee, 0.1); assert.equal(k.leanWalk, 0.2); assert.equal(k.leanRun, 0.3);
});

// A planted foot's world x = body x + facing * fx * s_draw; over a stance it must not move.
test('walk: the planted foot stays put at the draw scale (hs 0.79 and 1.01), stride knob included', () => {
    for (const search of ['?gait=v2', '?gait=v2&gaitStride=1.3']) for (const hs of [0.79, 1.012]) {
        const { w, keys } = walker(search, { _heightScale: hs });
        keys.add('right');
        const g = w._gaitV2.params, sDraw = () => w.s * hs;
        for (let i = 0; i < 40; i++) w.move(1 / 60, OTHER); // reach full speed
        let prev = null, worst = 0;
        for (let i = 0; i < 120; i++) {
            w.move(1 / 60, OTHER);
            const f = footGait(w.walkPhase, g);
            const world = w.x + f.fx * sDraw();
            if (prev && f.lift === 0 && prev.lift === 0) worst = Math.max(worst, Math.abs(world - prev.world));
            prev = { world, lift: f.lift };
        }
        assert.ok(worst < 1e-6, `${search} hs ${hs}: planted foot moved ${worst}`);
    }
});

test('run: no 0.8, the planted foot stays put, direction follows travel against facing', () => {
    for (const hs of [0.79, 1.012]) for (const facing of [1, -1]) {
        const { w } = walker('?gait=v2', { _heightScale: hs, state: 'running', runPhase: 'toRope', runTarget: facing > 0 ? 800 : 0, runFacing: facing, facing,
            scene: { time: { now: 1000 }, triggerRopeBounce: noop }, x: 400 });
        const g = w._gaitV2.params;
        let prev = null, worst = 0;
        for (let i = 0; i < 60; i++) {
            w.tickRun(1 / 60);
            const f = footGait(w.walkPhase, g);
            const world = w.x + facing * f.fx * w.s * hs;
            if (prev && f.lift === 0 && prev.lift === 0) worst = Math.max(worst, Math.abs(world - prev.world));
            prev = { world, lift: f.lift };
        }
        assert.ok(worst < 1e-6, `hs ${hs} facing ${facing}: planted foot moved ${worst}`);
    }
});

test('stop: the phase freezes (no decay), the swing foot lift eases to 0, and it comes back when walking resumes', () => {
    const { w, keys } = walker('?gait=v2');
    keys.add('right');
    for (let i = 0; i < 70; i++) w.move(1 / 60, OTHER);
    keys.clear();
    for (let i = 0; i < 60 && Math.abs(w.vx) > 0; i++) w.move(1 / 60, OTHER);
    const frozen = w.walkPhase;
    for (let i = 0; i < 90; i++) w.move(1 / 60, OTHER);
    assert.equal(w.walkPhase, frozen, 'phase must not move while still');
    assert.ok(w._gaitLift < 0.01, `lift ${w._gaitLift}`);
    keys.add('right');
    for (let i = 0; i < 30; i++) w.move(1 / 60, OTHER);
    assert.ok(w._gaitLift > 0.9);
});

function drawn(search, extra = {}) {
    const out = [];
    const { w } = walker(search, { facing: 1, lying: 'supine', skinCol: 0, trunksCol: 0, _activeMove: null, _choreoUntil: 0, _floorContacts: null,
        _sell: null, _groundHandoff: null, _hold: null, _gripLatch: null, _pain: null, stateTimer: 0,
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: { setPartVariants: noop, setDepth: noop, invalidatePoseChannels: noop, setVisible: noop, updateUpright: (...a) => out.push(a) }, ...extra });
    return { w, out };
}

test('lean: walk bend = leanWalk x moveBlend, run bend = leanRun, knee adds crouch; this.pose is never touched', () => {
    const q = '?gait=v2&gaitKnee=0.1';
    const { w, out } = drawn(q, { moveBlend: 1 });
    const before = structuredClone(w.pose);
    w.draw();
    let [, , , , pose, , , lean, , liftScale, runBlend] = out.at(-1);
    assert.ok(Math.abs(pose.bend - GAIT_LEAN.walk) < 1e-12);
    assert.ok(Math.abs(pose.crouch - (IDLE.crouch + 0.1)) < 1e-12);
    assert.equal(runBlend, 0); assert.equal(liftScale, 0.5);
    assert.deepEqual(w.pose, before);
    assert.equal(lean, 0.07 + IDLE.lean, 'the old lean argument is left alone');

    const r = drawn(q, { moveBlend: 1, state: 'running' });
    r.w.draw();
    [, , , , pose, , , , , , runBlend] = r.out.at(-1);
    assert.ok(Math.abs(pose.bend - GAIT_LEAN.run) < 1e-12 && runBlend === 1);

    const half = drawn(q, { moveBlend: 0.5 });
    half.w.draw();
    assert.ok(Math.abs(half.out.at(-1)[4].bend - GAIT_LEAN.walk * 0.5) < 1e-12);

    const idle = drawn(q, { moveBlend: 0 });
    idle.w.draw();
    assert.equal(idle.out.at(-1)[4], idle.w.pose, 'standing still passes the pose itself');
});

test('lean: accel and brake add at most +-0.06 in the travel direction, smoothed', () => {
    const { w, keys } = walker('?gait=v2');
    keys.add('right');
    let lo = 0, hi = 0;
    for (let i = 0; i < 80; i++) { w.move(1 / 60, OTHER); lo = Math.min(lo, w._gaitLeanExtra); hi = Math.max(hi, w._gaitLeanExtra); }
    assert.ok(hi > 0.03 && hi <= 0.06 + 1e-9, `accel extra ${hi}`);
    assert.ok(Math.abs(w._gaitLeanExtra) < 0.01, 'back to 0 at steady speed');
    keys.clear();
    for (let i = 0; i < 40; i++) { w.move(1 / 60, OTHER); lo = Math.min(lo, w._gaitLeanExtra); }
    assert.ok(lo < -0.03 && lo >= -0.06 - 1e-9, `brake extra ${lo}`);
});

test('flag off: no v2 state is read or written', () => {
    const { w } = drawn(undefined, { moveBlend: 1, _gaitV2: null });
    const sk = w.skeleton;
    w.draw();
    assert.equal(sk._gaitParams, undefined);
    assert.equal(w.skeleton && (w.pose.bend ?? undefined), undefined);
});
