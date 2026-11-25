// PLAN_SCALE T3.4: the ?scaleDebug=1 overlay's maths and its render-only promise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ScaleDebug, { expectedInkHeight, popAmount, isPop, POP_BAR, FLASH_FRAMES } from '../src/scaleDebug.js';
import { scaleDebugCandidate } from '../src/constants.js';

const fakeScene = () => { const calls = []; const g = new Proxy({}, { get: (_, k) => k === 'setDepth' ? () => g : (...a) => { calls.push([k, ...a]); return g; } }); return { calls, scene: { add: { graphics: () => g } } }; };

test('T3.4: expected height is the ladder\'s ink per draw scale x drawScale; unknown rigs get none', () => {
    assert.ok(Math.abs(expectedInkHeight('thesz-procreate-v1', 1.0696) - 242.9) < 0.1);   // 2026-11-24 Lou2 body (was 0.7793 -> 245.9)
    assert.ok(Math.abs(expectedInkHeight('george-roster-v1', 0.9974) - 234.7) < 0.1);
    assert.equal(expectedInkHeight('thesz', 0.8), null);
});

test('T3.4: the pop amount is normalised to a 60 fps frame and uses the pop check\'s bar', () => {
    assert.equal(POP_BAR, 0.02);
    assert.ok(Math.abs(popAmount(1, 1.03, 1 / 60) - 0.03) < 1e-12);
    assert.ok(Math.abs(popAmount(1, 1.03, 1 / 30) - 0.015) < 1e-12);   // a 30 fps frame carries twice the time
    assert.equal(popAmount(0, 1, 1 / 60), 0);
    assert.equal(popAmount(1, 2, 0), 0);
    assert.ok(isPop(1, 1.021, 1 / 60) && isPop(1, 0.979, 1 / 60) && !isPop(1, 1.019, 1 / 60));
});

test('T3.4: off by default (no location, no param)', () => {
    assert.equal(scaleDebugCandidate(), false);
    globalThis.location = { search: '?scale=v1' }; assert.equal(scaleDebugCandidate(), false);
    globalThis.location = { search: '?scaleDebug=1' }; assert.equal(scaleDebugCandidate(), true);
    delete globalThis.location;
});

test('T3.4: a bar per ladder rig every frame, a red flash for FLASH_FRAMES after a pop, and the wrestler is never written', () => {
    const { calls, scene } = fakeScene(), dbg = new ScaleDebug(scene);
    const w = { rigId: 'thesz-procreate-v1', x: 400, y: 380, ds: 0.6, drawScale() { return this.ds; } };
    const before = JSON.stringify({ rigId: w.rigId, x: w.x, y: w.y });
    dbg.update([w], 1 / 60);
    assert.ok(calls.some(c => c[0] === 'lineBetween') && !calls.some(c => c[0] === 'strokeCircle'));
    w.ds = 0.64;   // +6.7% in one frame
    calls.length = 0; dbg.update([w], 1 / 60);
    assert.ok(calls.some(c => c[0] === 'strokeCircle'), 'flash on the pop frame');
    for (let i = 1; i < FLASH_FRAMES; i++) { calls.length = 0; dbg.update([w], 1 / 60); }
    assert.ok(calls.some(c => c[0] === 'strokeCircle'), 'still flashing on the last frame');
    calls.length = 0; dbg.update([w], 1 / 60);
    assert.ok(!calls.some(c => c[0] === 'strokeCircle'), 'flash over');
    assert.equal(JSON.stringify({ rigId: w.rigId, x: w.x, y: w.y }), before);
});
