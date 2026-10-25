// The down-state sell library (src/animation/sells.js) and its playback on a
// real Wrestler (_hurt → _tickSell → _sellPose). The promises that matter:
// a sell starts and ends on the lying pose (so the get-up never pops), fits
// inside the down timer (it never changes how long he stays down), turns a
// roll over consistently, and never plays for a move that did not land.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SELLS, SELL_STYLES, clutchSell, sampleSell, planSells, groundedSlot, sideSwap, limitKnees } from '../src/animation/sells.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import Wrestler from '../src/Wrestler.js';
import { onlyListed } from './support/promotedFlags.js';

const PARTS = ['knee', 'head', 'arm', 'back', 'chest'];
const playable = () => {
    const out = [];
    for (const lying of ['supine', 'prone']) {
        for (const [name, def] of Object.entries(SELLS[lying])) {
            if (name === 'clutch') for (const part of PARTS) out.push([`${lying} clutch ${part}`, clutchSell(lying, part, 1)]);
            else out.push([`${lying} ${name}`, def]);
        }
    }
    return out;
};
const zero = ({ d, reach }) => Object.values(d).every(v => v === 0) && Object.values(reach).every(v => v === 0);

for (const [label, def] of playable()) {
    test(`${label}: starts and ends on the lying pose`, () => {
        assert.ok(zero(sampleSell(def.keys, 0)), 'first frame');
        assert.ok(zero(sampleSell(def.after ?? def.keys, 1)), 'last frame');
    });
}

for (const lying of ['supine', 'prone']) {
    test(`${lying} roll: the two halves meet at the turnover`, () => {
        const roll = SELLS[lying].roll;
        const before = sampleSell(roll.keys, roll.swapAt).d;
        const after = sampleSell(roll.after, roll.swapAt).d;
        // Supine P facing f draws where prone −P facing −f does: the offsets
        // negate, except hip height.
        for (const [c, v] of Object.entries(before)) assert.equal(after[c], c === 'hip' ? v : -v, c);
    });
}

test('every sell tag names a body part with a clutch on both lyings', () => {
    for (const [id, spec] of Object.entries(MOVE_SPECS)) {
        if (!spec.sell) continue;
        assert.ok(SELLS.supine.clutch[spec.sell.part] && SELLS.prone.clutch[spec.sell.part], `${id}: ${spec.sell.part}`);
        assert.ok(spec.sell.intensity > 0 && spec.sell.intensity <= 1, id);
    }
});

test('a plan always fits the down timer; no room means no sell', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const style of Object.keys(SELL_STYLES)) {
        for (const lying of ['supine', 'prone']) {
            for (const budget of [0.5, 1.2, 2.5, 3.85]) {
                for (let i = 0; i < 40; i++) {
                    const plan = planSells({ style, lying, part: 'back', budget, rand });
                    assert.ok(plan.reduce((t, p) => t + p.duration, 0) <= budget + 1e-9, `${style} ${lying} ${budget}`);
                }
            }
            assert.deepEqual(planSells({ style, lying, budget: 0.2, rand }), []);
        }
    }
});

test('Lou sells economically: one short clutch or nothing; George may chain and kick', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const names = (style, lying) => {
        const seen = new Set();
        for (let i = 0; i < 300; i++) {
            const plan = planSells({ style, lying, part: 'knee', budget: 3.85, rand });
            if (style === 'economical') assert.ok(plan.length <= 1);
            plan.forEach(p => seen.add(p.name));
        }
        return seen;
    };
    assert.deepEqual([...names('economical', 'supine')], ['clutch']);
    const george = names('theatrical', 'supine');
    for (const name of ['clutch', 'writhe', 'kick', 'roll']) assert.ok(george.has(name), name);
    const proneGeorge = names('theatrical', 'prone');
    assert.ok(!proneGeorge.has('kick') && !proneGeorge.has('writhe'), 'no kicking or writhing face down');
});

// ── On a real Wrestler ─────────────────────────────────────────────────────
function downed({ style = 'theatrical', lying = 'supine', timer = 4.5, facing = 1 } = {}) {
    return Object.assign(Object.create(Wrestler.prototype), {
        scene: { time: { now: 0 }, tweens: { add: () => ({ stop() {} }) } },
        state: 'down', lying, facing, stateTimer: timer, stamina: 50,
        sellStyle: style, _pain: null, _sell: null, input: { isDown: () => false },
    });
}

test('a confirmed hit sells on the mat and is finished before the get-up', () => {
    const w = downed();
    w._hurt(10, 'piledriver');
    assert.equal(w.stamina, 40);
    let sold = false;
    while (w.state === 'down' && w.stateTimer > 0) {
        w.tickDown(1 / 60);
        if (w._sellPose()) sold = true;
        if (w.stateTimer <= 0.3 - 1 / 60) assert.equal(w._sellPose(), null, 'still selling inside the tail');
    }
    assert.ok(sold);
});

test('no confirmed hit, no sell (an interrupted move lays him down untagged)', () => {
    const w = downed();
    for (let i = 0; i < 120; i++) w.tickDown(1 / 60);
    assert.equal(w._sell, null);
});

test('being picked up or pinned mid-sell stops it', () => {
    const w = downed();
    w._hurt(10, 'suplex');
    for (let i = 0; i < 40; i++) w.tickDown(1 / 60);
    assert.ok(w._sell);
    w.state = 'pinned';
    w.tickDown(1 / 60);
    assert.equal(w._sell, null);
});

test('a roll turns him over for the get-up, head staying put', () => {
    const w = downed({ lying: 'supine', facing: 1 });
    w._sell = { plan: [{ name: 'roll', lying: 'supine', part: 'back', duration: 0.9, amp: 1 }], i: 0, t: 0 };
    for (let i = 0; i < 70; i++) w.tickDown(1 / 60);
    assert.equal(w.lying, 'prone');
    // Supine lies head away from facing, prone head toward it: flipping
    // facing keeps the head on the same side.
    assert.equal(w.facing, -1);
});

// ── Pain context (PLAN_MOVE_PERFORMANCE.md D3) ─────────────────────────────
// A scene whose tweens can be finished by hand, so the rise completes.
function risable(opts) {
    const w = downed(opts);
    const tweens = [];
    w.scene = { time: { now: 0 }, tweens: { add: cfg => { tweens.push(cfg); return { stop() {} }; } } };
    w.tweenPose = () => {};
    w.finishTweens = () => { while (tweens.length) tweens.shift().onComplete?.(); };
    return w;
}

test('a confirmed hit sets a mat pain context from the registry', () => {
    const w = downed();
    w._hurt(10, 'figureFour');
    assert.deepEqual(
        { source: w._pain.source, part: w._pain.part, severity: w._pain.severity, phase: w._pain.phase },
        { source: 'figureFour', part: 'knee', severity: MOVE_SPECS.figureFour.sell.intensity, phase: 'mat' },
    );
    assert.equal(w._pain.limb, MOVE_SPECS.figureFour.sell.limb ?? null);
    w._hurt(10, 'figureFour', { limb: 'rLeg' });
    assert.equal(w._pain.limb, 'rLeg', 'the executor can name the limb');
});

test('the rise carries pain: rise, then recover until severity x 2.5 s, then it expires', () => {
    for (const quick of [false, true]) {
        const w = risable();
        w._hurt(10, 'suplex');
        w.tickDown(1 / 60);
        assert.equal(w._pain.phase, 'mat');
        if (quick) { w.state = 'possum'; w.tickDown(1 / 60); w._startQuickRise(); }
        else { while (w.state === 'down') w.tickDown(1 / 60); }
        assert.equal(w.state, quick ? 'risingUp' : 'gettingUp');
        assert.equal(w._pain.phase, 'rise');
        w.tickDown(1 / 60);
        assert.equal(w._pain?.phase, 'rise', 'rising does not clear it');
        w.scene.time.now = 1000;
        w.finishTweens();
        assert.equal(w.state, 'standing');
        assert.equal(w._pain.phase, 'recover');
        const until = 1000 + 2500 * MOVE_SPECS.suplex.sell.intensity;
        assert.equal(w._pain.until, until);
        w.scene.time.now = until - 1;
        w.tickDown(1 / 60);
        assert.ok(w._pain, 'still recovering just before until');
        w.scene.time.now = until;
        w.tickDown(1 / 60);
        assert.equal(w._pain, null, 'expired');
    }
});

test('a new hit replaces the pain context and sells again', () => {
    const w = downed();
    w._hurt(10, 'suplex');
    for (let i = 0; i < 30; i++) w.tickDown(1 / 60);
    assert.ok(w._pain.planned);
    w._hurt(5, 'elbowDrop');
    assert.equal(w._pain.source, 'elbowDrop');
    assert.equal(w._pain.planned, false);
});

test('a pin or a pickup clears the pain context', () => {
    const pinned = downed();
    pinned._hurt(10, 'suplex');
    pinned.state = 'pinned';
    pinned.tickDown(1 / 60);
    assert.equal(pinned._pain, null, 'pinned');
    const pinnedAtOnce = downed();
    pinnedAtOnce._hurt(10, 'theszPress');
    pinnedAtOnce.state = 'pinned';
    pinnedAtOnce.tickDown(1 / 60);
    assert.equal(pinnedAtOnce._pain, null, 'pinned before the sell was planned');
    const lifted = downed();
    lifted._hurt(10, 'suplex');
    lifted.tickDown(1 / 60);
    lifted.state = 'holding';
    lifted.tickDown(1 / 60);
    assert.equal(lifted._pain, null, 'picked up into a hold');
});

test('an interrupted move leaves no pain context', () => {
    const w = downed();
    w._hurt(10, 'suplex');
    w.tickDown(1 / 60);
    // Picked up into a hold that never lands its squeeze, then laid back down.
    w.state = 'holding';
    w.tickDown(1 / 60);
    w.pose = {};
    w._layOnBack(4.5);
    for (let i = 0; i < 120; i++) w.tickDown(1 / 60);
    assert.equal(w._pain, null);
    assert.equal(w._sell, null);
});

// ── Limb-aware clutch (T4.2) ───────────────────────────────────────────────
// The measured truth table (tools/debug/grounded_slot_probe.mjs): the slot an
// anatomical limb occupies on the grounded rig. The rig families differ only in
// Skeleton.lChannelSide: george-style rigs swap at facing -1, the others stay near.
const swapRig = { lChannelSide: f => (f >= 0 ? 'near' : 'far') };
const stayRig = { lChannelSide: () => 'near' };

test('groundedSlot: the measured table, both facings, both lyings, before and after a roll', () => {
    for (const lying of ['supine', 'prone']) {
        // swapping rigs: george, thesz-roster-v1, front3q-r1
        assert.equal(groundedSlot('lLeg', 1, lying, swapRig), 'near');
        assert.equal(groundedSlot('rLeg', 1, lying, swapRig), 'far');
        assert.equal(groundedSlot('lLeg', -1, lying, swapRig), 'far');
        assert.equal(groundedSlot('rLeg', -1, lying, swapRig), 'near');
        // staying rigs: thesz, procreate Lou, george/kowalski/guido-roster
        for (const f of [1, -1]) {
            assert.equal(groundedSlot('lArm', f, lying, stayRig), 'near');
            assert.equal(groundedSlot('rArm', f, lying, stayRig), 'far');
        }
        // every roll puts the injured limb on the other slot
        assert.equal(groundedSlot('rLeg', 1, lying, swapRig, 1), 'near');
        assert.equal(groundedSlot('rLeg', 1, lying, swapRig, 2), 'far');
        assert.equal(groundedSlot('lLeg', -1, lying, stayRig, 1), 'far');
    }
    assert.equal(groundedSlot(null, 1, 'supine', swapRig), null);
});

test('sideSwap mirrors near/far in offsets, hands and targets, and swaps back', () => {
    for (const lying of ['supine', 'prone']) for (const spec of Object.values(SELLS[lying].clutch)) {
        const swapped = sideSwap(spec);
        assert.deepEqual(sideSwap(swapped), spec);
        assert.equal(Object.keys(swapped.d).length, Object.keys(spec.d).length);
    }
    const knee = sideSwap(SELLS.supine.clutch.knee);
    assert.equal(knee.d.farThigh, 1.0);
    assert.equal(knee.d.nearThigh, 0.15);
    assert.deepEqual(knee.hands, { far: 'farKnee', near: 'farKnee' });
    assert.deepEqual(sideSwap(SELLS.prone.clutch.knee).hands, { far: 'farHip' });
});

test('clutchSell: near is today\'s clutch exactly; far is the swapped one', () => {
    for (const lying of ['supine', 'prone']) for (const part of PARTS) {
        assert.deepEqual(clutchSell(lying, part, 1.2), clutchSell(lying, part, 1.2, 'near'));
        assert.deepEqual(clutchSell(lying, part, 1.2, 'far').hands, sideSwap(SELLS[lying].clutch[part]).hands);
    }
});

// The figure four's trapped leg (registry sell.limb rLeg) is the clutched leg.
function sellingRig(skeleton, { facing, lying = 'supine', limb = 'rLeg' }) {
    const w = downed({ style: 'economical', lying, facing });
    w.skeleton = skeleton;
    w._pain = { source: 'x', part: 'knee', limb, severity: 1, phase: 'mat', until: null, planned: false };
    w._tickSell(0);
    return w;
}
const handTarget = (w) => { w._sell.t = 0.6; return Object.values(w._sellPose().reach).map(r => r.to); };

test('the trapped leg is the clutched leg in both facings, on both rig families', () => {
    const rand0 = Math.random;
    Math.random = () => 0.99; // economical: always clutch
    try {
        for (const [rig, expect] of [[swapRig, { 1: 'farKnee', '-1': 'nearKnee' }], [stayRig, { 1: 'farKnee', '-1': 'farKnee' }]]) {
            for (const facing of [1, -1]) {
                const w = sellingRig(rig, { facing });
                assert.deepEqual([...new Set(handTarget(w))], [expect[facing]], `${facing}`);
            }
        }
    } finally { Math.random = rand0; }
});

test('after a roll the clutch follows the leg to the other slot', () => {
    const rand0 = Math.random;
    Math.random = () => 0.99;
    try {
        const w = sellingRig(stayRig, { facing: 1 });
        // hand-build a roll then a clutch the way planSells records it
        w._sell = { facing0: 1, t: 0.6, i: 1, plan: [
            { name: 'roll', lying: 'supine', part: 'knee', duration: 1, amp: 1, limb: 'rLeg', rolls: 0, turned: true },
            { name: 'clutch', lying: 'prone', part: 'knee', duration: 1, amp: 1, limb: 'rLeg', rolls: 1 },
        ] };
        assert.deepEqual([...new Set(handTarget(w))], ['nearHip']);
    } finally { Math.random = rand0; }
});

test('limb null behaves exactly as today', () => {
    for (const lying of ['supine', 'prone']) for (const style of Object.keys(SELL_STYLES)) {
        for (let seed = 1; seed < 40; seed++) {
            const mk = () => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
            const a = planSells({ style, lying, part: 'knee', budget: 3.85, rand: mk() });
            const b = planSells({ style, lying, part: 'knee', budget: 3.85, rand: mk(), limb: null });
            assert.deepEqual(a, b);
        }
    }
    const rand0 = Math.random; Math.random = () => 0.99;
    try {
        const w = sellingRig(swapRig, { facing: -1, limb: null });
        assert.deepEqual([...new Set(handTarget(w))], ['nearKnee']); // the near clutch, as before the limb existed
    } finally { Math.random = rand0; }
});

// ── Compact fallback (T4.3, ?aftermath=v2) ─────────────────────────────────
// Derek's Q2 is final: economical may skip a reaction only below severity 0.6.
const noneRand = (style) => (style === 'economical' ? () => 0.1 : () => 0.99); // economical: 'none' band; theatrical: roll (never fits a tiny budget)

test('compact: severity >= 0.6 and an empty plan gives one compact clutch, both styles', () => {
    for (const style of Object.keys(SELL_STYLES)) for (const lying of ['supine', 'prone']) {
        for (const intensity of [0.6, 0.8, 1]) {
            // economical forced to `none`; theatrical's budget too small for any full sell
            const budget = style === 'economical' ? 3.85 : 0.7;
            const plan = planSells({ style, lying, part: 'back', intensity, budget, rand: noneRand(style), compact: true });
            assert.equal(plan.length, 1, `${style} ${lying} ${intensity}`);
            assert.equal(plan[0].name, 'clutch');
            assert.equal(plan[0].compact, true);
            assert.ok(Math.abs(plan[0].duration - 0.55 * SELL_STYLES[style].pace) < 1e-9);
        }
    }
});

test('compact: below severity 0.6 economical may still skip, flag or not', () => {
    for (const intensity of [0.3, 0.5, 0.59]) {
        assert.deepEqual(planSells({ style: 'economical', lying: 'supine', part: 'chest', intensity, budget: 3.85, rand: noneRand('economical'), compact: true }), []);
    }
});

test('compact: never exceeds the budget; a budget smaller than the compact sell gives nothing', () => {
    for (const style of Object.keys(SELL_STYLES)) {
        const need = 0.55 * SELL_STYLES[style].pace;
        assert.deepEqual(planSells({ style, lying: 'supine', part: 'back', intensity: 1, budget: need - 0.01, rand: noneRand(style), compact: true }), []);
        let seed = 3;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (const budget of [0.2, 0.5, 0.6, 0.7, 1.2, 3.85]) for (let i = 0; i < 60; i++) {
            const plan = planSells({ style, lying: 'prone', part: 'back', intensity: 1, budget, rand, compact: true });
            assert.ok(plan.reduce((t, p) => t + p.duration, 0) <= budget + 1e-9);
        }
    }
});

test('compact off: the plan is identical to today\'s for the same rand sequence', () => {
    for (const style of Object.keys(SELL_STYLES)) for (const lying of ['supine', 'prone']) {
        for (const budget of [0.4, 0.7, 1.5, 3.85]) for (let seed = 1; seed < 30; seed++) {
            const mk = () => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
            const args = { style, lying, part: 'back', intensity: 1, budget };
            assert.deepEqual(planSells({ ...args, rand: mk() }), planSells({ ...args, rand: mk(), compact: false }));
        }
    }
    // and with the flag, a plan that was non-empty is untouched
    const mk = () => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
    const args = { style: 'theatrical', lying: 'supine', part: 'back', intensity: 1, budget: 3.85 };
    assert.deepEqual(planSells({ ...args, rand: mk() }), planSells({ ...args, rand: mk(), compact: true }));
});

test('compact on a Wrestler follows ?aftermath=v2 and nothing else', () => {
    const run = (search) => {
        globalThis.location = { search: onlyListed(search) };
        const w = downed({ style: 'economical' });
        w._hurt(10, 'suplex'); // registry intensity 1.0, part back
        const rand0 = Math.random; Math.random = () => 0.1; // economical: none
        try { w.tickDown(1 / 60); } finally { Math.random = rand0; }
        return w._sell?.plan ?? [];
    };
    try {
        assert.deepEqual(run(''), []);
        assert.deepEqual(run('?aftermath=v1'), []);
        const on = run('?aftermath=v2');
        assert.equal(on.length, 1);
        assert.equal(on[0].compact, true);
    } finally { delete globalThis.location; }
});

// ── Joint limits (tools/debug/limb_limits_audit.mjs) ───────────────────────
test('limitKnees: no sell, at any amp, folds a knee past its limit or bends it backward', () => {
    const base = { supine: { nearThigh: 1.40, nearShin: 1.55, farThigh: 1.45, farShin: 1.60 }, prone: { nearThigh: -1.40, nearShin: -1.55, farThigh: -1.45, farShin: -1.60 } };
    for (const lying of ['supine', 'prone']) {
        const defs = [...Object.values(SELLS[lying]).filter(d => d.keys), ...PARTS.map(p => clutchSell(lying, p, 1))];
        for (const def of defs) for (const slot of ['near', 'far']) for (const amp of [0.6, 1, 1.3, 1.6]) for (let i = 0; i <= 20; i++) {
            const { d } = sampleSell(def.keys, i / 20, amp);
            const g = { ...base[lying] };
            for (const [c, v] of Object.entries(d)) if (c in g) g[c] += v;
            if (def.to) continue; // a roll keeps its turnover pose exactly
            limitKnees(g);
            const flex = g[`${slot}Thigh`] - g[`${slot}Shin`];
            assert.ok(flex <= 2.55 + 1e-9 && flex >= -0.25 - 1e-9, `${lying} ${slot} ${amp}: ${flex}`);
        }
    }
});

test('limitKnees leaves a pose already inside the limits untouched', () => {
    const g = { nearThigh: 1.4, nearShin: 0.9, farThigh: 1.45, farShin: 1.6 };
    assert.deepEqual(limitKnees({ ...g }), g);
});

// ── Clutch IK keeps the bones' lengths and the elbow's limit ───────────────
test('solveReachArm: too-close, reachable and too-far goals never overfold the elbow or stretch a bone', async () => {
    const { default: Skeleton } = await import('../src/Skeleton.js');
    const { JOINT_LIMITS } = await import('../src/rig/articulation.js');
    const S = { x: 10, y: -4 };
    const cases = [[50, 50], [40, 60], [60, 35]];
    const goals = [0, 5, 19, 30, 60, 99, 140].flatMap(r => [0, 1.1, 2.6, 4.0, 5.5].map(a => ({ x: S.x + Math.cos(a) * r, y: S.y + Math.sin(a) * r })));
    for (const [lu, lf] of cases) for (const goal of goals) for (const front of [null, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }]) {
        const { elbow, hand } = Skeleton.solveReachArm(S, lu, lf, goal, front);
        assert.ok(Math.abs(Math.hypot(elbow.x - S.x, elbow.y - S.y) - lu) < 1e-6, 'upper arm length');
        assert.ok(Math.abs(Math.hypot(hand.x - elbow.x, hand.y - elbow.y) - lf) < 1e-6, 'forearm length');
        const a1 = Math.atan2(elbow.y - S.y, elbow.x - S.x), a2 = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
        const flex = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
        assert.ok(flex <= JOINT_LIMITS.elbow.max + 1e-6, `flex ${flex} for ${lu}/${lf} goal ${goal.x},${goal.y}`);
    }
});

test('solveReachArm: a reachable goal is met exactly, and one past full extension stops short', async () => {
    const { default: Skeleton } = await import('../src/Skeleton.js');
    const S = { x: 0, y: 0 };
    const near = Skeleton.solveReachArm(S, 50, 50, { x: 60, y: 30 });
    assert.ok(Math.hypot(near.hand.x - 60, near.hand.y - 30) < 1e-6);
    const far = Skeleton.solveReachArm(S, 50, 50, { x: 300, y: 0 });
    assert.ok(Math.hypot(far.hand.x, far.hand.y) <= 100 * 0.999 + 1e-6);
});
