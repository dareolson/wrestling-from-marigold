import { test } from 'node:test';
import assert from 'node:assert/strict';
import Wrestler from '../src/Wrestler.js';
import { ringBoundsAtY } from '../src/constants.js';

function runner(x, y, g2 = null) {
    return Object.assign(Object.create(Wrestler.prototype), {
        scene: { triggerRopeBounce: () => {} }, x, y, facing: 1, runFacing: 1, state: 'running', runPhase: 'toRope',
        walkPhase: 0, moveBlend: 1, _heightScale: 1, _gaitV2: g2, runTargetY: null,
    });
}
function run(w, frames = 600) {
    const pts = [];
    for (let i = 0; i < frames && w.state === 'running' && w.runPhase === 'toRope'; i++) { w.tickRun(1 / 60); pts.push([w.x, w.y]); }
    return pts;
}
const RUN_G2 = { params: { STRIDE: 60, STANCE: 0.6, LIFT: 1 }, freq: 6, run: { on: true, speed: 520, stance: 0.6, cadence: 3, stride: 1, lift: 1 } };

test('runTargetY null: flat run, y untouched', () => {
    const w = runner(300, 350);
    w.runTarget = ringBoundsAtY(350).right - 20;
    run(w, 30);
    assert.equal(w.y, 350);
});
test('a run on a line reaches the rope x at the target y exactly, in a straight line', () => {
    for (const [dir, ty] of [[1, 290], [1, 420], [-1, 290], [-1, 420]]) {
        const w = runner(dir > 0 ? 300 : 500, 350);
        w._setRunLine(dir, ty);
        const b = ringBoundsAtY(ty);
        const [sx, sy] = [w.x, w.y], target = w.runTarget;
        assert.equal(target, dir > 0 ? b.right - 20 : b.left + 20, 'rope x read at the target y');
        const pts = run(w);
        const [ex, ey] = pts.at(-1);
        assert.equal(ex, target); assert.equal(ey, ty);
        for (const [x, y] of pts) assert.ok(Math.abs(y - (sy + (ty - sy) * (x - sx) / (target - sx))) < 1e-6, 'straight');
    }
});
test('steep line: y never moves faster than 0.5 x speed, x slows, line stays straight', () => {
    const w = runner(300, 260);
    w._setRunLine(1, 440);
    const target = w.runTarget;
    w.x = w._runStartX = target - 80;      // dx 80, dy 180: slope 2.25
    const pts = [[w.x, w.y]];
    for (let i = 0; i < 2000 && w.state === 'running' && w.runPhase === 'toRope'; i++) {
        const s = w.s;
        w.tickRun(1 / 60);
        const [px, py] = pts.at(-1);
        assert.ok(Math.abs(w.y - py) <= 0.5 * 340 * s / 60 + 0.5, 'y step within 0.5 x speed');
        pts.push([w.x, w.y]);
    }
    for (const [x, y] of pts) assert.ok(Math.abs(y - (260 + 180 * (x - pts[0][0]) / 80)) < 1e-6, 'straight');
    assert.equal(pts.at(-1)[0], target); assert.equal(pts.at(-1)[1], 440);
    assert.ok(pts.length > 80 / (340 * 1.3 / 60), 'x slowed below full speed');
});
test('both gaits: same end point', () => {
    for (const g2 of [null, RUN_G2]) {
        const w = runner(300, 350, g2);
        w._setRunLine(1, 300);
        const target = w.runTarget;
        const pts = run(w);
        assert.equal(pts.at(-1)[1], 300);
        assert.equal(pts.at(-1)[0], target);
    }
});
test('dx 0 reaches the target y at once', () => {
    const w = runner(300, 350);
    w._setRunLine(1, 300);
    w.runTarget = w.x;
    w.tickRun(1 / 60);
    assert.equal(w.y, 300);
});
test('toCorner arrival: logs cornerHit, shakes the rope on that side, staggers', () => {
    for (const [ty, side] of [[264, 'far'], [439, 'near']]) {
        const events = [], bounces = [];
        const w = runner(300, 350);
        w.scene = { triggerRopeBounce: s => bounces.push(s), _logEvent: (n, d) => events.push([n, d]), w1: w };
        let staggered = 0; w.startStagger = () => staggered++;
        w.runPhase = 'toCorner';
        w._setRunLine(1, ty);
        for (let i = 0; i < 600 && !staggered; i++) w.tickRun(1 / 60);
        assert.equal(w.y, ty);
        assert.deepEqual(bounces, [side]);
        assert.equal(events[0][0], 'cornerHit'); assert.equal(events[0][1].side, side);
        assert.equal(staggered, 1);
    }
});
