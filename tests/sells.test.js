// The down-state sell library (src/animation/sells.js) and its playback on a
// real Wrestler (_hurt → _tickSell → _sellPose). The promises that matter:
// a sell starts and ends on the lying pose (so the get-up never pops), fits
// inside the down timer (it never changes how long he stays down), turns a
// roll over consistently, and never plays for a move that did not land.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SELLS, SELL_STYLES, clutchSell, sampleSell, planSells } from '../src/animation/sells.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import Wrestler from '../src/Wrestler.js';

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
        sellStyle: style, _sellTag: null, _sell: null, input: { isDown: () => false },
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
