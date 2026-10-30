// PLAN_GETUPS Rev 7 T4.2: a rise that ends on top of an opponent who is not standing (mid-move) used to be snapped out to 80 * s
// on the first standing frame (move() cannot separate a wrestler who is not standing). Under ?getups=v1 the snap eases for 250 ms.
// Flag off is the old snap. The real move() runs here with the scene and input stubbed, as tests/gaitV2.test.js does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';

// move() reads the Phaser global; only these two are used on the separation path (Phaser's own definitions)
globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) }, Angle: { Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1) } } };
const noop = () => {};
const DT = 1 / 60;
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05 };
const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };

// a standing wrestler `gap` px from an opponent in `oState`, stamped as having reached standing at t = 0 (or never)
function setup({ gap, oState = 'elbowDropping', stampedAt = 0, facing = 1 }) {
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now: 0 } }, x: 500, y: 355, _heightScale: 0.79, facing, state: 'standing', vx: 0, vy: 0,
        walkPhase: 0, moveBlend: 0, _walkPhaseDir: 1, stamina: 100, pose: { ...IDLE }, idlePose: 'idle', combatBlend: 0,
        input: { isDown: () => false, justDown: () => false }, _clamp: noop, _riseStandAt: stampedAt,
    });
    const other = { x: 500 + facing * gap, y: 355, state: oState };
    return { w, other };
}

// run `frames` frames of move() at 60 fps, the clock advancing; returns the root positions and the per-frame steps
function run(w, other, frames, search) {
    const xs = [{ x: w.x, y: w.y }], steps = [];
    for (let i = 0; i < frames; i++) {
        w.scene.time.now += 1000 / 60;
        const p = { x: w.x, y: w.y };
        withFlag(search, () => w.move(DT, other));
        steps.push(Math.hypot(w.x - p.x, w.y - p.y)); xs.push({ x: w.x, y: w.y });
    }
    return { xs, steps };
}

test('T4.2: overlap on top of a busy opponent eases out: no step above 6 * s, 80 * s apart by the end of the window', () => {
    for (const gap of [0, 30]) for (const facing of [1, -1]) {
        const { w, other } = setup({ gap, facing });
        const s = w.s, { steps } = run(w, other, 15, '?getups=v1'); // 250 ms
        assert.ok(Math.max(...steps) <= 6 * s + 1e-9, `gap ${gap} facing ${facing}: step ${Math.max(...steps)} > ${6 * s}`);
        assert.ok(Math.max(...steps) > 5 * s, 'it does move at the cap, not crawl');
        assert.ok(Math.hypot(w.x - other.x, w.y - other.y) >= 80 * s - 1e-6, `gap ${gap}: ended ${Math.hypot(w.x - other.x, w.y - other.y)} apart`);
    }
});

test('T4.2: the cap is per 1/60 s (a longer frame moves further, a shorter one less)', () => {
    const { w, other } = setup({ gap: 0 });
    withFlag('?getups=v1', () => w.move(DT * 2, other));
    assert.ok(Math.abs(Math.hypot(w.x - 500, w.y - 355) - 12 * w.s) < 1e-9);
});

test('T4.2: control, 150 px clear: nothing moves', () => {
    const { w, other } = setup({ gap: 150 });
    const { steps } = run(w, other, 20, '?getups=v1');
    assert.equal(Math.max(...steps), 0);
});

test('T4.2: past the 250 ms window the old hard snap is back; without a stamp it is never eased', () => {
    const late = setup({ gap: 30 });
    late.w.scene.time.now = 400;
    withFlag('?getups=v1', () => late.w.move(DT, late.other));
    assert.ok(Math.abs(Math.hypot(late.w.x - late.other.x, late.w.y - late.other.y) - 80 * late.w.s) < 1e-9, 'snapped');
    const unstamped = setup({ gap: 30, stampedAt: undefined });
    delete unstamped.w._riseStandAt;
    withFlag('?getups=v1', () => unstamped.w.move(DT, unstamped.other));
    assert.ok(Math.abs(Math.hypot(unstamped.w.x - unstamped.other.x, unstamped.w.y - unstamped.other.y) - 80 * unstamped.w.s) < 1e-9, 'snapped');
});

test('T4.2: flag off is the old snap, even inside the window', () => {
    for (const gap of [0, 30]) {
        const { w, other } = setup({ gap });
        const { steps } = run(w, other, 1, '?getups=off');
        assert.ok(Math.abs(steps[0] - (80 * w.s - gap)) < 1e-9, `gap ${gap}: step ${steps[0]}`);
        assert.ok(Math.abs(Math.hypot(w.x - other.x, w.y - other.y) - 80 * w.s) < 1e-9);
    }
});

test('T4.2: the rise end stamps the clock under the flag only (full and quick rise)', () => {
    for (const [fn, key] of [['_startRiseUp', 'riseT'], ['_startQuickRise', 'fallProgress']]) for (const [search, stamped] of [['?getups=v1', true], ['?getups=off', false]]) {
        let cfg = null;
        const w = Object.assign(Object.create(Wrestler.prototype), {
            scene: { tweens: { add: c => { cfg = c; return { stop() {} }; }, killTweensOf() {} }, time: { now: 777 } },
            tweenPose() {}, stamina: 100, lying: 'supine', pose: { ...IDLE }, _syncSellAppearance: noop, _painRising: noop, _painRecovering: noop,
            _lyingHold: () => null, _backSellRiseState: () => ({ ok: false }), _riseNeedsTurn: () => false, _pickGetUp: () => null, skeleton: null,
        });
        withFlag(search, () => w[fn]());
        assert.equal(cfg[key] !== undefined, true);
        withFlag(search, () => cfg.onComplete());
        assert.equal(w.state, 'standing');
        assert.equal(w._riseStandAt, stamped ? 777 : undefined, `${fn} ${search}`);
    }
});
