import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT, sidePartPx, reachesY, coverWeight, createContact, contactStep } from '../src/animation/ropeContact.js';

test('sidePartPx: 0 inside the plane, grows with how far past, capped', () => {
    assert.equal(sidePartPx(0), 0); assert.equal(sidePartPx(-6), 0);
    assert.ok(sidePartPx(2) > CONTACT.pxBase - 0.01 && sidePartPx(10) > sidePartPx(2));
    assert.equal(sidePartPx(500), CONTACT.pxMax);
});
test('reachesY / coverWeight: a part reaches a strand when its ink spans that height', () => {
    const head = { minY: 100, maxY: 160 };
    assert.ok(reachesY(head, 130)); assert.ok(reachesY(head, 164)); assert.ok(!reachesY(head, 180)); assert.ok(!reachesY(null, 130));
    assert.equal(coverWeight([head], 130), 1); assert.equal(coverWeight([head], 300), CONTACT.uncovered); assert.equal(coverWeight([], 130), CONTACT.uncovered);
});
const run = (st, targets, sec, dt = 1 / 60) => { const rows = []; for (let t = 0; t < sec; t += dt) rows.push({ t, out: contactStep(st, targets, dt) }); return rows; };
test('a target pulls the bow to it; a released bow rings out inside ~0.4 s and is dropped', () => {
    const st = createContact(), tg = new Map([['0|L|0', { px: 10, pos: 0.4 }]]);
    const on = run(st, tg, 1.0), last = on.at(-1).out[0];
    assert.ok(Math.abs(last.val - 10) < 0.3, `held ${last.val}`);
    assert.equal(last.pos, 0.4);
    const off = run(st, new Map(), 1.0);
    const loud = off.filter(r => r.out.some(o => Math.abs(o.val) > 0.5)).map(r => r.t);
    assert.ok(Math.max(...loud) < 0.45, `quiet by ${Math.max(...loud)}`);
    assert.equal(st.size, 0, 'settled bows are dropped');
});
test('a released bow keeps its place while it eases out', () => {
    const st = createContact(); run(st, new Map([['1|R|2', { px: 8, pos: 0.7 }]]), 0.5);
    const out = contactStep(st, new Map(), 1 / 60);
    assert.equal(out[0].pos, 0.7);
});
test('no targets, no bows', () => { assert.deepEqual(contactStep(createContact(), new Map(), 1 / 60), []); });
