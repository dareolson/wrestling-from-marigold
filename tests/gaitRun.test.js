// ?gait=v2 Stage 3 (PLAN_GAIT): the run's own gait. Pure pieces only; cadence, flight and the rope turn are measured on film
// (tools/debug/gait_film.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { footGait, runStanceWeight } from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';

const TAU = Math.PI * 2;
const RUN = { STRIDE: 100, STANCE: 0.4, LIFT: 32 };

test('mirror at the rope turn: phase -> STANCE*2pi - phase negates both feet, lift unchanged', () => {
    for (let i = 0; i < 48; i++) {
        const p = i / 48 * TAU, q = (((RUN.STANCE * TAU - p) % TAU) + TAU) % TAU;
        for (const off of [0, Math.PI]) {
            const a = footGait(p + off, RUN), b = footGait(q + off, RUN);
            assert.ok(Math.abs(a.fx + b.fx) < 1e-9, `fx ${a.fx} vs ${b.fx} at ${i}`);
            assert.ok(Math.abs(a.lift - b.lift) < 1e-9);
        }
    }
});

test('STANCE < .5 gives a flight phase, the walk does not', () => {
    const air = g => Array.from({ length: 200 }, (_, i) => i / 200 * TAU).filter(p => footGait(p, g).lift > 0 && footGait(p + Math.PI, g).lift > 0 || (footGait(p, g).liftFrac > 0 && footGait(p + Math.PI, g).liftFrac > 0)).length / 200;
    assert.ok(Math.abs(air(RUN) - 0.2) < 0.02, `run flight ${air(RUN)}`);
    assert.equal(air({ ...RUN, STANCE: 0.55 }), 0);
});

test('run hip weight: 1 at mid-stance, 0 in flight', () => {
    assert.ok(Math.abs(runStanceWeight(RUN.STANCE / 2 * TAU, RUN.STANCE) - 1) < 1e-9);
    assert.ok(Math.abs(runStanceWeight((RUN.STANCE + 0.05) * TAU, RUN.STANCE)) < 1e-9);
});

test('derived run stride gives the target cadence (any height scale)', () => {
    for (const hs of [0.79, 1.012]) {
        const w = Object.assign(Object.create(Wrestler.prototype), { _heightScale: hs,
            _gaitV2: { params: { STRIDE: 72.8, STANCE: 0.55, LIFT: 22 }, freq: 0.55 * TAU / 72.8, run: { speed: 340, stance: 0.4, cadence: 3.25, stride: 1, lift: 32 } } });
        const p = w._gaitParamsAt(1);
        const stepsPerS = 2 * (340 / hs) * p.freq / TAU;
        assert.ok(Math.abs(stepsPerS - 3.25) < 1e-9, `${hs}: ${stepsPerS}`);
        assert.equal(w._gaitParamsAt(0).STRIDE, 72.8);
    }
});
