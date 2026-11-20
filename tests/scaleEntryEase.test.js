// PLAN_SCALE T1.2: under ?scale=v1 a non-anchor actor's entry into a staged clip eases in y (no one-frame size pop) and is on the authored
// staging from the end of the entry window. x is never touched. Flag off: the old snap. Real Wrestlers, as tests/clipStaging.test.js does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { stagingProofClip } from '../src/animation/clips/stagingProof.js';
import { ENTRY_EASE_SEC } from '../src/animation/clipStaging.js';
import Wrestler from '../src/Wrestler.js';
import { perspectiveScale } from '../src/constants.js';

const withFlag = (search, fn) => { globalThis.location = { search }; try { return fn(); } finally { delete globalThis.location; } };
function wrestler(scene, { facing, x, y }) {
    return Object.assign(Object.create(Wrestler.prototype), { scene, state: 'holding', facing, x, y, vx: 0, vy: 0, stamina: 100, pose: {}, idlePose: 'idle', skeleton: { setPartVariants() {} }, _activeMove: null });
}
// the defender starts `dyStart` px deeper than the attacker; returns the defender's per-frame {x, y} from the play() frame on
function run(search, { facing = 1, dyStart = 40, y = 340 } = {}) {
    const runtime = new MoveRuntime(); runtime.register(stagingProofClip);
    const scene = { moveRuntime: runtime, time: { now: 0, delayedCall() {} }, tweens: { add: () => ({ stop() {} }), killTweensOf() {} }, _logEvent() {} };
    const atk = wrestler(scene, { facing, x: 470, y }), def = wrestler(scene, { facing: -facing, x: 540, y: y + dyStart });
    return withFlag(search, () => {
        runtime.play(stagingProofClip.id, { attacker: atk, defender: def });
        const out = [];
        for (let i = 0; i < 60; i++) { runtime.update(1 / 60); out.push({ t: (i + 1) / 60, x: def.x, y: def.y }); }
        return out;
    });
}

test('T1.2: flag off: the defender is on the authored y from the first frame (the old snap)', () => {
    const off = run('?scale=off');
    assert.ok(Math.abs(off[0].y - off[off.length - 1].y) < 200);
    const on = run('?scale=v1');
    // the first frame differs under the flag: it starts from the real y
    assert.notEqual(on[0].y, off[0].y);
});

test('T1.2: no frame in the entry window steps y more than the 2% size bar, both facings, near and far starts', () => {
    for (const facing of [1, -1]) for (const dyStart of [-20, -10, 10, 20]) {
        const on = run('?scale=v1', { facing, dyStart });
        let prev = 340 + dyStart;
        for (const f of on.filter(f => f.t <= ENTRY_EASE_SEC + 1e-9)) { assert.ok(Math.abs(perspectiveScale(f.y) / perspectiveScale(prev) - 1) < 0.02, `facing ${facing} dy ${dyStart} t ${f.t}`); prev = f.y; }
    }
});

test('T1.2: from the end of the window every x and y equals flag off; x equals flag off in the window too', () => {
    for (const facing of [1, -1]) for (const dyStart of [-50, 0, 50]) {
        // anchor on the front row (445), where the old and the T2.1 perspective agree (1.000): this test is about the entry ease, not the scale formula
        const on = run('?scale=v1', { facing, dyStart, y: 445 }), off = run('?scale=off', { facing, dyStart, y: 445 });
        for (let i = 0; i < on.length; i++) {
            assert.equal(on[i].x, off[i].x);
            if (on[i].t > ENTRY_EASE_SEC + 1e-9) assert.equal(on[i].y, off[i].y, `t ${on[i].t}`);
        }
    }
});

test('T1.2: the anchor is never offset', () => {
    const runtime = new MoveRuntime(); runtime.register(stagingProofClip);
    const mk = (search) => { const scene = { moveRuntime: runtime, time: { now: 0, delayedCall() {} }, tweens: { add: () => ({ stop() {} }), killTweensOf() {} }, _logEvent() {} };
        const a = wrestler(scene, { facing: 1, x: 470, y: 340 }), d = wrestler(scene, { facing: -1, x: 540, y: 380 });
        withFlag(search, () => { runtime.play(stagingProofClip.id, { attacker: a, defender: d }); runtime.update(1 / 60); }); return a.y; };
    assert.equal(mk('?scale=v1'), mk('?scale=off'));
});
