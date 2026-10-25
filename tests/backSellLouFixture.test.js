// The back sell on Procreate Lou, snapshotted BEFORE any of it is moved out of the shared code and into
// per-rig data (PLAN_GEORGE_TRANSFER T1.2). Committed first, with no src change behind it: the JSON is
// what Lou does today. Every later task must leave it byte-identical. Tolerance 1e-9.
//   holdWeight over 0-3.2 s; backRiseWeight over t for from/peak/carry; carriedHandTarget over 0-400 ms;
//   _recoveryPose (back) for both facings, both l-channel owners, several weights, plain and carried;
//   the grip latch over a distance sweep; and the Lou values themselves (hold, recovery offsets, settled arm).
// Regenerate deliberately with WFM_UPDATE_FIXTURE=1 (never to make a failing run pass).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import Wrestler, { POSES } from '../src/Wrestler.js';
import * as perf from '../src/animation/backRisePerformance.js';
import * as appearance from '../src/animation/sellAppearance.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { onlyListed } from './support/promotedFlags.js';

const FIXTURE = new URL('./fixtures/backSellLou.json', import.meta.url);
const TOL = 1e-9;
const BOTH = '?sellart=v1&aftermath=v2';
const noop = () => {};
const withFlag = (search, fn) => { globalThis.location = { search: onlyListed(search) }; try { return fn(); } finally { delete globalThis.location; } };
// the live settled pose (film dbg.pose): local elbow flex, no legacy forearm
const IDLE = { lLeg: -0.05, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05, lElbow: 0.7, rElbow: 0.7, lShin: -0.11, rShin: -0.06 };
const range = (a, b, step) => { const out = []; for (let i = 0; a + i * step <= b + 1e-9; i++) out.push(+(a + i * step).toFixed(6)); return out; };

// ── the calls the back sell makes, in one place, so a refactor of their signatures edits this block only ──
// (T1.3 moved Lou's numbers from module constants into textures.backSell; the stored shape below is the old one.)
const lou = { textures: theszProcreateV1.textures, bs: theszProcreateV1.textures.backSell, idle: POSES[theszProcreateV1.idlePose] };
const hold = sec => perf.holdWeight(sec, lou.bs.holdW);
const rise = (t, from, peak, carry) => perf.backRiseWeight(t, from, peak, carry);
const handTarget = (riseEnd, ms) => perf.carriedHandTarget(riseEnd, ms, perf.settledBackHand(lou.bs, lou.idle));
const latchStep = (state, dist, now) => appearance.stepGripLatch(state, dist, now, lou.bs.contactPx);
const louValues = () => ({ hold: { w: lou.bs.holdW, ...perf.HOLD_BREATH }, recoveryBackHand: { arm: lou.bs.recoveryArm, elbow: lou.bs.recoveryElbow },
    recoveryBackHandAbs: { ...perf.settledBackHand(lou.bs, lou.idle) }, armSettleMs: perf.ARM_SETTLE_MS, gripContactPx: lou.bs.contactPx });

function standing({ facing = 1, side = 'near', now = 1000, since = 1000, until = 3500, pose = IDLE } = {}) {
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now }, tweens: { add: () => ({ stop() {} }) } },
        x: 400, y: 380, _heightScale: 1, facing, state: 'standing', lying: 'supine', idlePose: theszProcreateV1.idlePose,
        skinCol: 0, trunksCol: 0, stamina: 100, moveBlend: 0, walkPhase: 0, combatBlend: 0, pose: { ...pose },
        _activeMove: null, _choreoUntil: 0, _floorContacts: null, _sell: null, _groundHandoff: null, _hold: null, _riseFrom: 0, _gripLatch: null,
        stateTimer: 0, input: { isDown: () => false, justDown: () => false },
        gfx: { clear: noop, setDepth: noop, fillStyle: noop, fillEllipse: noop },
        skeleton: { _textureConfig: lou.textures, lChannelSide: () => side, setPartVariants: noop,
            torso: { _semanticAnchors: theszProcreateV1.textures.torso.semanticAnchors }, backContactDistance: () => 5 },
    });
    w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since, until, planned: true };
    return w;
}

function snapshot() {
    const out = { values: louValues() };
    out.holdWeight = range(0, 3.2, 0.05).map(t => [t, hold(t)]).concat([[-0.5, hold(-0.5)], [NaN, hold(NaN)]].map(([t, v]) => [String(t), v]));
    out.backRiseWeight = {};
    for (const carry of [false, true]) for (const peak of [0.6, 1]) for (const from of [0, 0.4, 0.8]) {
        if (from > peak) continue;
        out.backRiseWeight[`carry=${carry}/peak=${peak}/from=${from}`] = range(0, 1.1, 0.025).concat([0.18, 0.7, 0.85]).map(t => [t, rise(t, from, peak, carry)]);
    }
    out.carriedHandTarget = {};
    for (const [name, riseEnd] of Object.entries({ a: { arm: 0.9, elbow: 1.2 }, b: { arm: -0.3, elbow: 0.2 }, atTarget: { arm: 0.04 - 1.2, elbow: 0.70 + 1.5 } }))
        out.carriedHandTarget[name] = range(-50, 400, 12.5).map(ms => [ms, handTarget(riseEnd, ms)]);
    out.recoveryPose = {};
    withFlag(BOTH, () => {
        for (const facing of [1, -1]) for (const side of ['near', 'far']) for (const legacy of [false, true]) {
            const pose = legacy ? (({ lElbow, rElbow, ...p }) => ({ ...p, lForearm: 0.8 }))(IDLE) : IDLE;
            for (const mode of ['plain', 'carried']) {
                const key = `facing=${facing}/l=${side}/${legacy ? 'legacy' : 'elbow'}/${mode}`;
                out.recoveryPose[key] = [1050, 1200, 1600, 2300, 3000, 3400, 3499].map(now => {
                    const w = standing({ facing, side, now, pose });
                    if (mode === 'carried') { w._pain.carried = 0.8; w._pain.riseEnd = { arm: 0.9, elbow: 1.2 }; }
                    return { now, weight: w._recoveryWeight(), handWeight: w._recoveryHandWeight(), pose: w._recoveryPose() };
                });
            }
        }
    });
    // the latch: a distance that sweeps across the threshold and back, sampled every 20 ms
    const trace = []; let st = appearance.newGripLatch(false, 0);
    for (let i = 0; i <= 200; i++) {
        const dist = 5 + 20 * Math.abs(Math.sin(i / 25)), now = i * 20;
        st = latchStep(st, dist, now); trace.push([now, +dist.toFixed(6), st.on]);
    }
    out.gripLatch = trace;
    return out;
}

function compare(a, b, path = '') {
    if (typeof a === 'number' && typeof b === 'number') return assert.ok(Math.abs(a - b) <= TOL, `${path}: ${a} vs ${b}`);
    if (Array.isArray(a)) { assert.equal(a.length, b.length, `${path} length`); a.forEach((v, i) => compare(v, b[i], `${path}[${i}]`)); return; }
    if (a && typeof a === 'object') {
        assert.deepEqual(Object.keys(a), Object.keys(b), `${path} keys`);
        for (const k of Object.keys(a)) compare(a[k], b[k], `${path}/${k}`);
        return;
    }
    assert.equal(a, b, path);
}

test('the back sell on Procreate Lou matches the pre-refactor snapshot', () => {
    const now = JSON.parse(JSON.stringify(snapshot()));   // JSON round trip: NaN/undefined behave as the stored file does
    if (process.env.WFM_UPDATE_FIXTURE) writeFileSync(FIXTURE, JSON.stringify(now, null, 1) + '\n');
    compare(now, JSON.parse(readFileSync(FIXTURE, 'utf8')));
});

test('the snapshot is not vacuous: the hand moves, the hold breathes, the carried target travels', () => {
    const s = snapshot();
    const w = s.recoveryPose['facing=1/l=near/elbow/plain'].at(2);
    assert.ok(w.handWeight > 0.1 && Math.abs(w.pose.lArm - IDLE.lArm) > 0.05);
    assert.ok(s.recoveryPose['facing=-1/l=far/elbow/plain'].at(2).pose.rArm !== IDLE.rArm);
    const h = s.holdWeight.map(([, v]) => v);
    assert.ok(Math.max(...h) - Math.min(...h) > 0.1);
    const c = s.carriedHandTarget.a;
    assert.ok(Math.abs(c.at(-1)[1].arm - perf.settledBackHand(lou.bs, lou.idle).arm) < 1e-9);
    assert.ok(s.gripLatch.some(r => r[2]) && s.gripLatch.some(r => !r[2]));
});
