import test from 'node:test';
import assert from 'node:assert/strict';
import { splitPlan, SPLIT_STEP, pastPlane, pastPartDepth } from '../src/animation/ropeSplit.js';

const man = (y) => ({ t: (445 - y) / 187, depth: 12 + y * 0.03 });

test('no men: the uniform samples, one group above everything', () => {
    const p = splitPlan([]);
    assert.equal(p.ts.length, 9); assert.deepEqual(p.group, new Array(8).fill(0)); assert.ok(p.depths[0] > 12 + 445 * 0.03);
});

test('one man: cut at his t, pieces nearer above him, farther below', () => {
    const m = man(350), p = splitPlan([m]);
    assert.ok(p.ts.some(t => Math.abs(t - m.t) < 1e-9)); assert.equal(p.ts.length, 10);
    assert.equal(p.depths.length, 2); assert.ok(p.depths[0] > m.depth && p.depths[1] < m.depth);
    p.group.forEach((g, j) => assert.equal(g, p.ts[j] < m.t - 1e-9 ? 0 : 1));
});

test('two men at different depths: three groups ordered above near man, between, below far man', () => {
    const a = man(400), b = man(300), p = splitPlan([b, a]);
    assert.equal(p.depths.length, 3);
    assert.ok(p.depths[0] > a.depth && a.depth > p.depths[1] && p.depths[1] > b.depth && b.depth > p.depths[2]);
    assert.equal(p.group[0], 0); assert.equal(p.group.at(-1), 2);
    p.group.forEach((g, j) => { if (j) assert.ok(g >= p.group[j - 1]); });
    for (const [m, g] of [[a, 1], [b, 2]]) { const j = p.ts.findIndex(t => Math.abs(t - m.t) < 1e-9); assert.equal(p.group[j], g); assert.equal(p.group[j - 1], g - 1); }
});

test('two men at the same depth share one cut; nearly the same depth too', () => {
    for (const y of [350, 350.3]) { const p = splitPlan([man(350), man(y)]); assert.equal(p.depths.length, 2); assert.equal(p.cuts.length, 1); }
});

test('a merged cut still clears both men: above the nearer one, below the farther one', () => {
    const a = man(419.4), b = man(420), p = splitPlan([a, b]);
    assert.equal(p.cuts.length, 1); assert.ok(b.depth - a.depth < 0.02);
    assert.ok(p.depths[0] > b.depth && p.depths[1] < a.depth);
});

test('a man outside the wall clamps: nearer than the near corner puts every piece behind him, farther than the far corner in front', () => {
    const near = splitPlan([man(470)]); assert.ok(near.group.every(g => g === 1));
    const far = splitPlan([man(240)]); assert.ok(far.group.every(g => g === 0)); assert.ok(far.depths[0] > far.cuts[0].depth);
});

test('a strand piece sits within one step of the man it is next to', () => {
    const m = man(350), p = splitPlan([m]);
    assert.ok(Math.abs(p.depths[0] - m.depth - SPLIT_STEP) < 1e-12 && Math.abs(m.depth - p.depths[1] - SPLIT_STEP) < 1e-12);
});

test('parts drawn off the formula depth (a paired move) are cleared: above the highest, below the lowest', () => {
    const a = { t: 0.5, depth: 22.60, low: 22.47 }, p = splitPlan([a]);
    assert.ok(p.depths[0] > 22.60 && p.depths[1] < 22.47);
    const b = { t: 0.3, depth: 23.2, low: 23.2 }, q = splitPlan([b, { t: 0.5, depth: 22.60, low: 22.47 }]);
    assert.ok(q.depths[1] < 23.2 && q.depths[1] > 22.60);
});

test('pastPlane: only ink beyond a plane by more than the margin counts', () => {
    const b = { left: 100, right: 800 };
    assert.equal(pastPlane(101, 200, b), false); assert.equal(pastPlane(99, 200, b), false); assert.equal(pastPlane(96, 200, b), true);
    assert.equal(pastPlane(300, 801, b), false); assert.equal(pastPlane(300, 803, b), true);
});

test('pastPartDepth: under the pieces behind its man, above the next man back', () => {
    const near = { t: 0.2, depth: 24.0, low: 23.99 }, far = { t: 0.6, depth: 22.0, low: 21.99 }, p = splitPlan([far, near]);
    const dn = pastPartDepth(p, 1), df = pastPartDepth(p, 0);
    assert.ok(dn < near.low && dn > far.depth);                          // the near man's part: behind him, still in front of the far man
    assert.ok(df < far.low && df > far.low - 0.02);                       // the far man's part: just under him
});

// T1.4: the press window
import { pressWindow, PRESS_WINDOW } from '../src/animation/ropeSplit.js';
test('pressWindow: only a hard press (k >= 0.55) opens the old window', () => {
    assert.equal(pressWindow(null), null);
    assert.equal(pressWindow({ t: 0.5, k: 0.54 }), null);
    assert.deepEqual(pressWindow({ t: 0.5, k: 0.55 }), [0.5 - PRESS_WINDOW, 0.5 + PRESS_WINDOW]);
});
test('splitPlan: a pressing man puts every piece inside his window below him, outside is unchanged', () => {
    const men = [{ t: 0.5, depth: 20, low: 19.99, win: [0.2, 0.8] }];
    const p = splitPlan(men, 8), plain = splitPlan([{ t: 0.5, depth: 20, low: 19.99 }], 8);
    const gAt = (pl, t) => pl.group[pl.ts.findIndex((v, j) => v <= t + 1e-9 && pl.ts[j + 1] > t + 1e-9)];
    assert.equal(gAt(plain, 0.3), 0);                 // nearer than him: above him
    assert.equal(gAt(p, 0.3), 1);                     // in his window: below him
    assert.equal(gAt(p, 0.6), 1);
    assert.equal(gAt(p, 0.1), 0);                     // outside the window: unchanged
    assert.ok(p.ts.includes(0.2) && p.ts.includes(0.8));
    assert.ok(p.depths[1] < 19.99);
});
test('splitPlan: with no window the plan is identical to before', () => {
    const men = [{ t: 0.4, depth: 20, low: 19.99 }, { t: 0.7, depth: 19.5, low: 19.49 }];
    assert.deepEqual(splitPlan(men.map(m => ({ ...m, win: null }))), splitPlan(men));
});
test('splitPlan: a press window never pushes a piece under a nearer man it is still in front of', () => {
    const near = { t: 0.3, depth: 21, low: 20.99 }, far = { t: 0.6, depth: 19, low: 18.99, win: [0.3, 0.9] };
    const p = splitPlan([near, far], 8);
    const gAt = t => p.group[p.ts.findIndex((v, j) => v <= t + 1e-9 && p.ts[j + 1] > t + 1e-9)];
    assert.equal(gAt(0.2), 0);   // nearer than both: above both, outside the window anyway
    assert.equal(gAt(0.45), 2);  // behind the near man, inside the far man's window: under the far man
    assert.equal(gAt(0.35), 2);
});
test('splitPlan: a window piece in front of a nearer non-pressing man stays above him', () => {
    const near = { t: 0.5, depth: 21, low: 20.99 }, far = { t: 0.7, depth: 19, low: 18.99, win: [0.1, 0.9] };
    const p = splitPlan([near, far], 8);
    const gAt = t => p.group[p.ts.findIndex((v, j) => v <= t + 1e-9 && p.ts[j + 1] > t + 1e-9)];
    assert.equal(gAt(0.3), 0);   // in front of the near man: stays above him
    assert.equal(gAt(0.6), 2);
});
