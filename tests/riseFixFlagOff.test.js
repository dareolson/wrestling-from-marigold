// ?risefix=1 off (PLAN_RISE_HANDOFF T2.1): without the flag the rise, the quick rise and the swap to
// standing are exactly what they were. Committed BEFORE any src change for the fix, so the fixture is the
// pre-fix behaviour. Node has no Phaser parts: the claim is bounded to the pose each renderer is handed
// (the _applyGrounded input of updateGetUp / updateFall) and to what the swap does to the Wrestler
// (state, this.pose, moveBlend, the tweens it starts). A browser-side world-part check is taken by
// tools/debug/rise_handoff_probe.mjs. Regenerate deliberately with WFM_UPDATE_FIXTURE=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import Skeleton from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';

const FIXTURE = new URL('./fixtures/riseFixFlagOff.json', import.meta.url);
const TOL = 1e-9;
const STEPS = [0, 0.1, 0.3, 0.5, 0.7, 0.75, 0.8, 0.9, 0.95, 0.99, 1];

function rises() {
    const out = {};
    for (const lock of [false, true]) for (const lying of ['supine', 'prone']) for (const facing of [1, -1]) {
        const key = `lock=${lock}/${lying}/${facing}`; out[key] = [];
        for (const t of STEPS) {
            const calls = [];
            const sk = { _lockLimbJoints: lock, standingHipHeight: 131.5,
                _applyGrounded: (...a) => calls.push({ fn: '_applyGrounded', args: a.slice(0, 4), pose: { ...a[4] } }),
                updateGroundedReach: () => calls.push({ fn: 'reach' }) };
            Skeleton.prototype.updateGetUp.call(sk, 100, 300, 1, facing, t, lying, null);
            out[key].push({ t, calls });
        }
    }
    return out;
}

function falls() {
    const out = {};
    for (const variant of Object.keys(Skeleton.FALLS)) {
        out[variant] = [];
        for (const p of [0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 1]) {
            const calls = [];
            Skeleton.prototype.updateFall.call({ _applyGrounded: (...a) => calls.push({ args: a.slice(0, 4), pose: { ...a[4] } }) }, 100, 300, 1, -1, variant, p);
            out[variant].push({ p, calls });
        }
    }
    return out;
}

// The swap, through the real _startRiseUp / _startQuickRise with the scene stubbed out.
function swap(kind, lying) {
    const calls = [];
    const w = Object.assign(Object.create(Wrestler.prototype), {
        scene: { tweens: { add: cfg => { w._cfg = cfg; calls.push({ fn: 'tween', targets: cfg.targets === w ? 'wrestler' : 'other', riseT: cfg.riseT, fallProgress: cfg.fallProgress, duration: cfg.duration, ease: cfg.ease }); }, killTweensOf() {} },
            time: { now: 0 } },
        stamina: 60, lying, state: 'down', riseT: 0.4, fallProgress: 0, facing: -1, moveBlend: 0.7, walkPhase: 1.3,
        pose: { lLeg: 0.1, rLeg: 0.35, lArm: 0.05, rArm: 0.12, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.1, rElbow: 0.2, lKnee: 0.15, rKnee: 0.6 },
        _lyingHold: () => null, _syncSellAppearance() {}, _painRising() {}, _painRecovering() {}, _carriedRiseEnd: () => null,
        tweenPose: (target, duration, ease) => calls.push({ fn: 'tweenPose', target, duration, ease }),
    });
    kind === 'quick' ? w._startQuickRise() : w._startRiseUp();
    const before = { state: w.state, pose: { ...w.pose }, moveBlend: w.moveBlend, walkPhase: w.walkPhase };
    w._cfg.onComplete();
    return { before, after: { state: w.state, pose: { ...w.pose }, moveBlend: w.moveBlend, walkPhase: w.walkPhase }, calls };
}
const swaps = () => Object.fromEntries(['rise', 'quick'].flatMap(k => ['supine', 'prone'].map(l => [`${k}/${l}`, swap(k, l)])));

const snapshot = () => JSON.parse(JSON.stringify({ rises: rises(), falls: falls(), swaps: swaps() }));

function compare(a, b, path = '') {
    if (typeof a === 'number' && typeof b === 'number') {
        assert.ok(Math.abs(a - b) <= TOL, `${path}: ${a} vs ${b}`); return;
    }
    if (a && typeof a === 'object') {
        assert.deepEqual(Object.keys(a), Object.keys(b), `${path} keys`);
        for (const k of Object.keys(a)) compare(a[k], b[k], `${path}/${k}`);
        return;
    }
    assert.equal(a, b, path);
}

test('without ?risefix the rise, quick rise and the swap to standing match the pre-fix snapshot', () => {
    if (process.env.WFM_UPDATE_FIXTURE) writeFileSync(FIXTURE, JSON.stringify(snapshot(), null, 1) + '\n');
    compare(snapshot(), JSON.parse(readFileSync(FIXTURE, 'utf8')));
});

test('the swap leaves this.pose and moveBlend to the existing 150 ms / 120 ms idle tween', () => {
    const r = swap('rise', 'supine'), q = swap('quick', 'prone');
    assert.deepEqual(r.after.pose, r.before.pose);
    assert.equal(r.after.moveBlend, 0.7);
    assert.deepEqual(r.calls.filter(c => c.fn === 'tweenPose'), [{ fn: 'tweenPose', target: 'idle', duration: 150, ease: 'Linear' }]);
    assert.deepEqual(q.calls.filter(c => c.fn === 'tweenPose'), [{ fn: 'tweenPose', target: 'idle', duration: 120, ease: 'Linear' }]);
});
