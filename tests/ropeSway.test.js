import test from 'node:test';
import assert from 'node:assert/strict';
import { createSway, swayKick, swayStep, swayHops, swayWall, swayHardness, SWAY, SWAY_WALLS } from '../src/animation/ropeSway.js';

const run = (s, sec, dt = 1 / 60) => { const out = []; for (let t = 0; t < sec; t += dt) { swayStep(s, dt); out.push({ t, ...Object.fromEntries(SWAY_WALLS.map(w => [w, s.spring[w].val])) }); } return out; };
const peak = (rows, w) => Math.max(...rows.map(r => Math.abs(r[w])));
const settle = (rows, w, px = 0.5) => { let last = 0; for (const r of rows) if (Math.abs(r[w]) > px) last = r.t; return last; };

test('hops round the ring: same 0, neighbours 1, opposite 2', () => {
    assert.equal(swayHops('L', 'L'), 0); assert.equal(swayHops('near', 'R'), 1); assert.equal(swayHops('L', 'near'), 1); assert.equal(swayHops('near', 'far'), 2); assert.equal(swayHops('L', 'R'), 2);
});
test('a kick swings the contact wall by about its amp and rings out inside ~2 s', () => {
    const s = createSway(); swayKick(s, 'L', 12);
    const rows = run(s, 4);
    assert.ok(peak(rows, 'L') > 10 && peak(rows, 'L') < 13.5, `peak ${peak(rows, 'L')}`);
    assert.ok(settle(rows, 'L') < 2.2, `settle ${settle(rows, 'L')}`);
});
test('the swing reaches the opposite wall later and smaller (about 7 px of 12)', () => {
    const s = createSway(); swayKick(s, 'L', 12);
    const rows = run(s, 3);
    const first = w => rows.find(r => Math.abs(r[w]) > 0.5).t;
    assert.ok(first('L') < first('near') && first('near') < first('R'), 'delay grows with hops');
    assert.ok(peak(rows, 'R') > 5.5 && peak(rows, 'R') < 8.5, `far ${peak(rows, 'R')}`);
});
test('no kick, no motion; the springs come to rest at exactly 0', () => {
    const s = createSway(); const rows = run(s, 1);
    assert.ok(rows.every(r => SWAY_WALLS.every(w => r[w] === 0)));
    swayKick(s, 'far', 8); run(s, 6);
    assert.ok(SWAY_WALLS.every(w => s.spring[w].val === 0 && s.spring[w].vel === 0));
});
test('swayWall: side planes need ink at the strand height; near / far by ground band', () => {
    const base = { y: 350, bounds: { left: 100, right: 800 }, stripY: 300, nearY: 445, farY: 258 };
    assert.equal(swayWall({ ...base, ink: { minX: 90, maxX: 200, minY: 290, maxY: 340 } }), 'L');
    assert.equal(swayWall({ ...base, ink: { minX: 700, maxX: 810, minY: 290, maxY: 340 } }), 'R');
    assert.equal(swayWall({ ...base, ink: { minX: 90, maxX: 200, minY: 320, maxY: 400 } }), null, 'ink below the strand height');
    assert.equal(swayWall({ ...base, y: 440, ink: { minX: 300, maxX: 400, minY: 400, maxY: 440 } }), 'near');
    assert.equal(swayWall({ ...base, y: 265, ink: null }), 'far');
});
test('swayHardness: a landing scales with intensity and speed, a man already down kicks lightly', () => {
    assert.equal(swayHardness(null, 684), 0.35);
    assert.ok(swayHardness({ intensity: 1, vy: 684 }, 684) > swayHardness({ intensity: 0.4, vy: 684 }, 684));
    assert.ok(swayHardness({ intensity: 1, vy: 1200 }, 684) > swayHardness({ intensity: 1, vy: 300 }, 684));
    assert.ok(swayHardness({ intensity: 5, vy: 5000 }, 684) <= 1.5);
});
