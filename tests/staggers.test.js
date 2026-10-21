import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGGER_TYPES, staggerFor, stepMs } from '../src/animation/staggers.js';

const peak = (type, ch) => Math.max(...type.steps.map(s => Math.abs(s.pose[ch] ?? 0)));
const travel = type => type.steps.reduce((sum, s) => sum + s.dx, 0);

test('staggers get progressively worse: longer, lower, more folded', () => {
    for (let i = 1; i < STAGGER_TYPES.length; i++) {
        const a = STAGGER_TYPES[i - 1], b = STAGGER_TYPES[i];
        assert.ok(b.seconds > a.seconds, `${b.id} lasts longer than ${a.id}`);
        assert.ok(peak(b, 'crouch') > peak(a, 'crouch'), `${b.id} sags lower than ${a.id}`);
        assert.ok(peak(b, 'bend') >= peak(a, 'bend'), `${b.id} folds at least as far as ${a.id}`);
        assert.ok(stepMs(b) > stepMs(a), `${b.id} takes longer to play than ${a.id}`);
    }
});

test('stamina picks the type, hurt more is worse', () => {
    assert.equal(staggerFor(100).id, 'rock');
    assert.equal(staggerFor(66).id, 'rock');
    assert.equal(staggerFor(50).id, 'stumble');
    assert.equal(staggerFor(30).id, 'reel');
    assert.equal(staggerFor(20).id, 'buckle');
    assert.equal(staggerFor(5).id, 'outOnFeet');
    assert.equal(staggerFor(0).id, 'outOnFeet');
});

test('every step is playable and the sequence ends back at neutral inside its timer', () => {
    for (const t of STAGGER_TYPES) {
        for (const s of t.steps) {
            assert.ok(s.dur > 0 && Number.isFinite(s.dx) && s.dx >= 0, `${t.id} step timing`);
            for (const [k, v] of Object.entries(s.pose)) assert.ok(Number.isFinite(v), `${t.id}.${k} finite`);
        }
        const last = t.steps[t.steps.length - 1].pose;
        assert.equal(last.crouch, 0); assert.equal(last.bend, 0);
        assert.ok(stepMs(t) <= t.seconds * 1000 + 1, `${t.id} finishes inside the stagger window`);
        assert.ok(travel(t) > 0, `${t.id} steps back`);
    }
});
