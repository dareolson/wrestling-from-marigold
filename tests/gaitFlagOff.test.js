// ?gait=v2 flag-off snapshot (PLAN_GAIT T2.1). Committed BEFORE any v2 change: with the flag absent the walk
// and run gait must stay byte for byte what it was. Node has no Phaser parts, so the claim is bounded to what
// runs here: footGait over one cycle, the walk/stop phase advance in Wrestler.move, the run phase advance in
// tickRun, and the arguments Wrestler.draw hands updateUpright (pose, phase, blends, lift). Hip height and the
// arm angles live in _updateUprightCore and are checked in the browser: tools/debug/gait_film.mjs --compare
// against research/animation/gait-2026-10/g1 (flag off, fixed seed). Regenerate deliberately with WFM_UPDATE_FIXTURE=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { footGait, GAIT } from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';

const FIXTURE = new URL('./fixtures/gaitFlagOff.json', import.meta.url);
const TOL = 1e-9;
const noop = () => {};
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05, lElbow: 0.7, rElbow: 0.7, lShin: -0.11, rShin: -0.06 };

function gaitCycle() {
    const rows = [];
    for (let i = 0; i <= 24; i++) rows.push({ phase: i / 24 * Math.PI * 2, ...footGait(i / 24 * Math.PI * 2) });
    return { GAIT: { STRIDE: GAIT.STRIDE, STANCE: GAIT.STANCE, LIFT: GAIT.LIFT, WALK_FREQ: GAIT.WALK_FREQ }, rows };
}

function walker(extra = {}) {
    const keys = new Set();
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now: 1000 } }, x: 300, y: 360, _heightScale: 0.79, facing: 1, state: 'standing', vx: 0, vy: 0,
        walkPhase: 0, moveBlend: 0, _walkPhaseDir: 1, stamina: 100, pose: { ...IDLE }, idlePose: 'idle',
        input: { isDown: k => keys.has(k), justDown: () => false }, _clamp: noop, ...extra,
    });
    return { w, keys };
}

// walk right, brake to a stop, back-pedal, brake: the phase and travel each frame
function walkRun() {
    const { w, keys } = walker();
    const other = { x: 900, y: 150, state: 'standing' }; // far in depth: skips the Phaser overlap branch
    const rows = [];
    const script = [['right', 90], [null, 50], ['left', 70], [null, 50]];
    let n = 0;
    for (const [key, frames] of script) {
        keys.clear(); if (key) keys.add(key);
        for (let i = 0; i < frames; i++, n++) {
            w.move(1 / 60, other);
            if (n % 5 === 0) rows.push({ n, x: w.x, vx: w.vx, walkPhase: w.walkPhase, moveBlend: w.moveBlend, dir: w._walkPhaseDir, facing: w.facing });
        }
    }
    return rows;
}

function runRun() {
    const { w } = walker({ state: 'running', runPhase: 'toRope', runTarget: 800, runFacing: 1, scene: { time: { now: 1000 }, triggerRopeBounce: noop }, y: 360 });
    const rows = [];
    for (let i = 0; i < 90; i++) {
        w.tickRun(1 / 60);
        if (i % 5 === 0) rows.push({ i, x: w.x, walkPhase: w.walkPhase, moveBlend: w.moveBlend });
    }
    return rows;
}

function drawArgs() {
    const out = [];
    for (const state of ['standing', 'running']) for (const facing of [1, -1]) for (const phase of [0, 1.1, 2.9, 4.4, 6]) for (const moveBlend of [0, 0.6, 1]) {
        const drawn = [];
        const { w } = walker({ state, facing, walkPhase: phase, moveBlend, combatBlend: 0.3, lying: 'supine', skinCol: 0, trunksCol: 0,
            _activeMove: null, _choreoUntil: 0, _floorContacts: null, _sell: null, _groundHandoff: null, _hold: null, _gripLatch: null, _pain: null, stateTimer: 0,
            gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
            skeleton: { setPartVariants: noop, setDepth: noop, invalidatePoseChannels: noop, setVisible: noop, updateUpright: (...a) => drawn.push(a.slice(4)) } });
        w.draw();
        out.push({ state, facing, phase, moveBlend, args: drawn.at(-1) ?? null });
    }
    return out;
}

const snapshot = () => JSON.parse(JSON.stringify({ gaitCycle: gaitCycle(), walkRun: walkRun(), runRun: runRun(), drawArgs: drawArgs() }));

function compare(a, b, path = '') {
    if (typeof a === 'number' && typeof b === 'number') { assert.ok(Math.abs(a - b) <= TOL, `${path}: ${a} vs ${b}`); return; }
    if (a && typeof a === 'object') {
        assert.deepEqual(Object.keys(a), Object.keys(b), `${path} keys`);
        for (const k of Object.keys(a)) compare(a[k], b[k], `${path}/${k}`);
        return;
    }
    assert.equal(a, b, path);
}

test('flag-off gait (footGait, move/tickRun phase advance, draw arguments) matches the pre-v2 snapshot', () => {
    assert.equal(typeof location, 'undefined', 'no ?gait flag in Node');
    if (process.env.WFM_UPDATE_FIXTURE) writeFileSync(FIXTURE, JSON.stringify(snapshot(), null, 1) + '\n');
    compare(snapshot(), JSON.parse(readFileSync(FIXTURE, 'utf8')));
});
