// PLAN_GRAPPLES T5.1: the AI's open-ring whip (headlock-style personalities) sometimes holds up or down too, toward the corner nearer
// the receiver (grapples=v1). The ropes-escape whip stays flat. Flag off: no extra random roll, no up/down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AIHandler from '../src/AIHandler.js';
import { RING } from '../src/constants.js';

const withFlag = (on, fn) => {
    if (on) globalThis.location = { search: '?grapples=v1' };
    try { return fn(); } finally { delete globalThis.location; }
};
const midY = (RING.farLeft.y + RING.nearLeft.y) / 2;
function lockup(personality, { oppY = 400, oppX = 600, facing = 1, stamina = 100 } = {}) {
    const h = new AIHandler(personality);
    const self = { x: 500, y: oppY, s: 1, facing, state: 'grabbed', stamina: 100, moveSet: ['irishWhip', 'headlock'] };
    const opp = { x: oppX, y: oppY, s: 1, state: 'grabbed', stamina };
    h.setWrestlers(self, opp);
    self.scene = { lockupState: { attacker: self, defender: opp } };
    h._lockupBeat = 0; h._contested = true;
    return h;
}
// rolls in order (a healthy receiver skips the slam-window roll): hold odds (>= holdOdds -> whip), corner odds
const seq = (...v) => { const r = Math.random; let i = 0; Math.random = () => v[Math.min(i++, v.length - 1)]; return () => { Math.random = r; }; };
const press = (h) => { h._justPressed = {}; h._keys = {}; h._handleLockup(1 / 60); return { keys: { ...h._keys }, pressed: { ...h._justPressed } }; };

test('corner roll hits: holds up for a receiver nearer the far rope, down for the near rope, plus the facing direction', () => {
    withFlag(true, () => {
        for (const p of ['george', 'thesz', 'kowalski']) {
            const restore = seq(0.99, 0.1);
            const far = press(lockup(p, { oppY: midY - 40 })); restore();
            assert.ok(far.keys.right && far.keys.up && !far.keys.down, p);
            assert.ok(far.pressed.action);
            const r2 = seq(0.99, 0.1);
            const near = press(lockup(p, { oppY: midY + 40, facing: -1 })); r2();
            assert.ok(near.keys.left && near.keys.down && !near.keys.up, p);
        }
    });
});

test('corner roll misses: a flat whip', () => {
    withFlag(true, () => {
        const restore = seq(0.99, 0.6);
        const k = press(lockup('george', { oppY: midY - 40 })); restore();
        assert.ok(k.keys.right && !k.keys.up && !k.keys.down);
    });
});

test('rate: about 35% of the open-ring whips; the brawler and Guido never', () => {
    withFlag(true, () => {
        const real = Math.random;
        const rate = (p) => {
            let c = 0, n = 4000;
            for (let i = 0; i < n; i++) {
                const h = lockup(p, { oppY: midY - 40 });
                let j = 0; Math.random = () => (j++ < 1 ? 0.99 : real());
                const k = press(h); Math.random = real;
                if (k.keys.up) c++;
            }
            return c / n;
        };
        assert.ok(Math.abs(rate('thesz') - 0.35) < 0.04);
        assert.ok(Math.abs(rate('george') - 0.35) < 0.04);
        assert.equal(rate('guido'), 0);
    });
});

test('the ropes-escape whip stays flat', () => {
    withFlag(true, () => {
        const h = lockup('george', { oppX: 100, oppY: midY - 40 });
        h._opp.x = ringXLeft(h._opp.y) + 5;
        const restore = seq(0.0); const k = press(h); restore();
        assert.ok(k.keys.right || k.keys.left);
        assert.ok(!k.keys.up && !k.keys.down);
    });
});
import { ringBoundsAtY } from '../src/constants.js';
function ringXLeft(y) { return ringBoundsAtY(y).left; }

test('flag off: no up or down and no extra roll', () => {
    withFlag(false, () => {
        const h = lockup('george', { oppY: midY - 40 });
        let rolls = 0; const r = Math.random;
        Math.random = () => { rolls++; return 0.99; };
        const k = press(h); Math.random = r;
        assert.ok(k.keys.right && !k.keys.up && !k.keys.down);
        assert.equal(rolls, 2, 'hold odds and the offense beat, as before T5.1');
    });
});
