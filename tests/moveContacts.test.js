// Codex's 2026-10-15 review defects: rope-side throws keep their geometry
// (shared-origin ring fit), and clips can declare floor contacts and grips
// that the runtime holds on every cast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileClip, sampleClip, validateClip, windowWeight } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { stagingAt, transformExtents } from '../src/animation/clipStaging.js';
import { bodySlamClip } from '../src/animation/clips/bodySlam.js';
import { hipTossClip } from '../src/animation/clips/hipToss.js';
import { piledriverClip } from '../src/animation/clips/piledriver.js';
import Wrestler from '../src/Wrestler.js';
import { ringBoundsAtY } from '../src/constants.js';

function makeScene(clips) {
    const runtime = new MoveRuntime();
    for (const clip of clips) runtime.register(clip);
    return { moveRuntime: runtime, time: { now: 0, delayedCall: () => {} }, tweens: { add: () => ({ stop() {} }), killTweensOf: () => {} } };
}

function makeWrestler(scene, { facing, x, y }) {
    return Object.assign(Object.create(Wrestler.prototype), {
        scene, state: 'holding', facing, x, y, vx: 0, vy: 0, stamina: 100, pose: {}, idlePose: 'idle',
        skeleton: { setPartVariants: () => {} }, _activeMove: null,
    });
}

// Plays `clip` with the attacker at atkX and returns every frame's x pair.
function playAt(clip, atkX, facing, y = 410) {
    const scene = makeScene([clip]);
    const atk = makeWrestler(scene, { facing, x: atkX, y });
    const def = makeWrestler(scene, { facing: -facing, x: atkX + facing * 65, y });
    scene.moveRuntime.play(clip.id, { attacker: atk, defender: def });
    const frames = [[atk.x, def.x]];
    for (let t = 0; t < clip.duration; t += 1 / 60) {
        scene.moveRuntime.update(1 / 60);
        frames.push([atk.x, def.x]);
    }
    return frames;
}

for (const clip of [bodySlamClip, hipTossClip]) {
    test(`${clip.id} near either rope lands with the centre-ring separation`, () => {
        const b = ringBoundsAtY(410);
        const centre = playAt(clip, (b.left + b.right) / 2, 1).at(-1);
        const want = centre[1] - centre[0];
        for (const facing of [1, -1]) {
            for (const atkX of [b.left + 70, b.right - 70]) {
                const frames = playAt(clip, atkX, facing);
                const [a, d] = frames.at(-1);
                assert.ok(Math.abs((d - a) * facing - want) < 0.01,
                    `${clip.id} facing ${facing} at ${atkX}: separation ${(d - a).toFixed(1)}, centre ${want.toFixed(1)}`);
                for (const [ax, dx] of frames) {
                    for (const x of [ax, dx]) assert.ok(x >= b.left + 20 - 1e-6 && x <= b.right - 20 + 1e-6, `${x} outside the ropes`);
                }
            }
        }
    });
}

test('the ring fit eases in from the trigger position and is absent in the centre', () => {
    const b = ringBoundsAtY(410);
    const x0 = b.right - 70;
    const frames = playAt(bodySlamClip, x0, 1);
    const centre = playAt(bodySlamClip, x0 - 300, 1);
    // Frame 0 is the authored entry offset from where the move fired.
    assert.equal(frames[0][0], x0);
    // ...and the move is walked off the ropes, not snapped: the fit's own
    // share of each frame's travel stays small (this is the worst case: a
    // 184 px landing fired 70 px from the rope moves the pair ~134 px).
    const shift = frames.map((f, i) => f[0] - (centre[i][0] + 300));
    const steps = shift.slice(1).map((v, i) => Math.abs(v - shift[i]));
    assert.ok(Math.max(...steps) < 8, `largest per-frame fit slide ${Math.max(...steps).toFixed(1)} px`);
    assert.ok(Math.abs(shift.at(-1)) > 50, 'the pair was moved off the ropes');
    const staging = { originX: 0, fitShift: 0 };
    assert.equal(stagingAt(staging, 0.2), staging);
});

test('transformExtents covers every staged role between keys', () => {
    const clip = compileClip(bodySlamClip);
    const ext = transformExtents(clip, ['attacker', 'defender']);
    assert.ok(ext.maxX > 150, `defender lands ~184 px away; maxX ${ext.maxX}`);
});

test('floor contacts and grips validate their windows', () => {
    const base = { id: 'x', duration: 1, tracks: { attacker: { keyframes: [{ at: 0, pose: {} }] }, defender: { keyframes: [{ at: 0, pose: {} }] } } };
    assert.ok(validateClip({ ...base, floorContacts: [{ role: 'defender', point: 'crown', in: [0.1, 0.2], out: [0.5, 0.6] }] }).ok);
    assert.ok(!validateClip({ ...base, floorContacts: [{ role: 'defender', point: 'crown', in: [0.3, 0.2], out: [0.5, 0.6] }] }).ok);
    assert.ok(!validateClip({ ...base, floorContacts: [{ role: 'defender', point: 'toe', in: [0.1, 0.2], out: [0.5, 0.6] }] }).ok);
    assert.ok(validateClip({ ...base, grips: [{ role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Hip' }, in: [0, 0.1], out: [0.8, 1] }] }).ok);
    assert.ok(!validateClip({ ...base, grips: [{ role: 'attacker', arm: 'x', to: { role: 'defender', joint: 'Hip' }, in: [0, 0.1], out: [0.8, 1] }] }).ok);
    const w = { in: [0.1, 0.2], out: [0.5, 0.6] };
    assert.deepEqual([0.05, 0.15, 0.3, 0.55, 0.7].map(t => +windowWeight(w, t).toFixed(2)), [0, 0.5, 1, 0.5, 0]);
});

test('the piledriver holds the crown on the mat through the impact, and the waist grip', () => {
    const clip = compileClip(piledriverClip);
    const at = t => sampleClip(clip, t).tracks.defender.floorContacts ?? [];
    assert.deepEqual(at(1.24), [{ point: 'crown', w: 1 }]);
    assert.deepEqual(at(1.42), [{ point: 'crown', w: 1 }]);
    assert.deepEqual(at(0.8), []);
    assert.deepEqual(at(1.9), []);
    assert.deepEqual(clip.grips.map(g => [g.arm, g.to.joint, g.to.side]), [['l', 'Hip', 'same'], ['r', 'Hip', 'same']]);
});

test('afterDraw hands each gripping actor its grips, weighted, only inside the window', () => {
    const runtime = new MoveRuntime();
    runtime.register(piledriverClip);
    const calls = [];
    const atk = { pose: {}, skeleton: {}, holdGrips: list => calls.push(list) };
    const def = { pose: {}, skeleton: {} };
    const handle = runtime.play('piledriver', { attacker: atk, defender: def });
    runtime.seek(handle, 0.05);
    runtime.afterDraw();
    assert.equal(calls.length, 0);
    runtime.seek(handle, 1.0);
    runtime.afterDraw();
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].map(g => [g.arm, g.partner === def, g.joint, g.w]), [['l', true, 'Hip', 1], ['r', true, 'Hip', 1]]);
    runtime.cancel(handle);
    runtime.afterDraw();
    assert.equal(calls.length, 1, 'a cancelled move holds nothing');
});

test('a runner already on his rope target turns with a real facing (AI-vs-AI freeze)', () => {
    for (const runFacing of [1, -1]) {
        for (const runPhase of ['toRope', 'returning']) {
            const w = Object.assign(Object.create(Wrestler.prototype), {
                scene: { triggerRopeBounce: () => {} }, state: 'running', runPhase, runFacing, facing: runFacing,
                x: 600, y: 360, runTarget: 600, walkPhase: 0, moveBlend: 0,
            });
            w.tickRun(1 / 60);
            assert.ok(w.facing === 1 || w.facing === -1, `${runPhase} ${runFacing}: facing ${w.facing}`);
        }
    }
});
