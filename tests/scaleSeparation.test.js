// PLAN_SCALE T1.1: under ?scale=v1 the separation push in move() writes x only: y never changes (a y step is a size pop).
// Flag off is the old behaviour (y moves). The real move() runs with the scene and input stubbed, as tests/riseSeparation.test.js does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';

globalThis.Phaser ??= { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) }, Angle: { Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1) } } };
const noop = () => {};
const DT = 1 / 60;
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05 };
const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };

function setup({ dx, dy, oState = 'standing', facing = 1, y = 355 }) {
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now: 0 } }, x: 500, y, _heightScale: 0.79, facing, state: 'standing', vx: 0, vy: 0,
        walkPhase: 0, moveBlend: 0, _walkPhaseDir: 1, stamina: 100, pose: { ...IDLE }, idlePose: 'idle', combatBlend: 0,
        input: { isDown: () => false, justDown: () => false }, _clamp: noop, _riseStandAt: null,
    });
    return { w, other: { x: 500 + dx, y: y + dy, state: oState } };
}
const frames = (w, other, n, search) => { for (let i = 0; i < n; i++) { w.scene.time.now += 1000 / 60; withFlag(search, () => w.move(DT, other)); } };

test('T1.1: standers at dx 0-40, dy 0-47, both facings: y is never written under ?scale=v1', () => {
    for (const dx of [0, 10, 25, 40]) for (const dy of [0, 10, 25, 30, 47]) for (const facing of [1, -1]) for (const side of [1, -1]) {
        const { w, other } = setup({ dx: dx * side, dy: dy * side, facing });
        const y0 = w.y;
        for (let i = 0; i < 120; i++) { frames(w, other, 1, '?scale=v1'); assert.equal(w.y, y0, `dx ${dx} dy ${dy} facing ${facing}: y moved at frame ${i}`); }
    }
});

test('T1.1/T1.5: a stander inside 26 px of depth is eased out (<= 6 * s per frame) and ends 80 * s clear of the other, in x', () => {
    for (const dx of [0, 15, 40]) for (const dy of [0, 20]) for (const facing of [1, -1]) {
        const { w, other } = setup({ dx, dy, facing });
        let prev = w.x;
        const S = withFlag('?scale=v1', () => w.s);   // the flag's own perspective (T2.1)
        for (let i = 0; i < 30; i++) { frames(w, other, 1, '?scale=v1'); assert.ok(Math.abs(w.x - prev) <= 6 * S + 1e-6, `dx ${dx} dy ${dy}: step ${w.x - prev}`); prev = w.x; }
        assert.ok(Math.hypot(w.x - other.x, w.y - other.y) >= 80 * S - 1e-6, `dx ${dx} dy ${dy}: ${Math.hypot(w.x - other.x, w.y - other.y)}`);
    }
});

test('T1.1: dead-centred steps back opposite own facing', () => {
    for (const facing of [1, -1]) { const { w, other } = setup({ dx: 0, dy: 0, facing }); frames(w, other, 1, '?scale=v1'); assert.equal(Math.sign(w.x - 500), -facing); }
});

test('T1.1: over a down body the push is eased (<= 6 * s per frame), y untouched, clear by the end', () => {
    for (const oState of ['down', 'gettingUp', 'falling']) for (const dx of [0, 30]) for (const facing of [1, -1]) {
        const { w, other } = setup({ dx, dy: 5, oState, facing });
        let prev = w.x, worst = 0;
        for (let i = 0; i < 30; i++) { frames(w, other, 1, '?scale=v1'); worst = Math.max(worst, Math.abs(w.x - prev)); prev = w.x; assert.equal(w.y, 355); }
        const S = withFlag('?scale=v1', () => w.s);
        assert.ok(worst <= 6 * S + 1e-9, `step ${worst}`);
        assert.ok(Math.hypot(w.x - other.x, w.y - other.y) >= 80 * S - 1e-6);
    }
});

test('T1.1: the 26-48 band nudges x apart (gate 60 * s) and leaves y alone; outside the gate nothing moves', () => {
    for (const facing of [1, -1]) {
        const { w, other } = setup({ dx: 20, dy: 35, facing });
        const x0 = w.x; frames(w, other, 30, '?scale=v1');
        assert.equal(w.y, 355); assert.ok(w.x < x0, 'pushed away from the other (other is at +x)');
        const far = setup({ dx: 70, dy: 35, facing }); frames(far.w, far.other, 30, '?scale=v1');
        assert.equal(far.w.x, 500); assert.equal(far.w.y, 355);
    }
});

test('T1.1: flag off is the old push: along the line between them, y moves', () => {
    const { w, other } = setup({ dx: 10, dy: 20 });
    frames(w, other, 1, '?scale=off');
    assert.notEqual(w.y, 355);
});

test('T1.1: light ground clearance and the strike lunge are still honoured under the flag', () => {
    const a = setup({ dx: 10, dy: 5, oState: 'down' }); a.w._lightContactOther = a.other;
    withFlag('?scale=v1&light=v1', () => a.w.move(DT, a.other)); assert.equal(a.w.x, 500);
    const b = setup({ dx: 10, dy: 5 }); b.other._lungeUntil = 1e9;
    frames(b.w, b.other, 1, '?scale=v1'); assert.equal(b.w.x, 500);
});
