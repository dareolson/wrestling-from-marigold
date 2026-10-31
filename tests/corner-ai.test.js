// PLAN_GRAPPLES T3c.7: what the AI does with a cornered man (grapples=v1): far, run at him about 6 beats in 10; close, a strike;
// never back off from him. Flag off, a cornered man is ignored like any man mid-move.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AIHandler from '../src/AIHandler.js';

const withFlag = (on, fn) => {
    if (on) globalThis.location = { search: '?grapples=v1' };
    try { return fn(); } finally { delete globalThis.location; }
};
function ai(dist, { charge = true, personality = 'brawler' } = {}) {
    const h = new AIHandler(personality);
    const self = { x: 600, y: 400, s: 1, state: 'standing', stamina: 100, moveSet: ['cornerCharge', 'jab'], _evadeCooldown: 0, canCornerCharge: () => charge, input: null };
    const opp = { x: 600 - dist, y: 400, s: 1, state: 'cornered', stamina: 100 };
    h.setWrestlers(self, opp);
    h._offense = 0; h._cooldown = 0; h._stallTimer = 0;
    return { h, self, opp };
}
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const beat = (h) => { h._justPressed = {}; h._keys = {}; h._chooseAction(1 / 60); return { ...h._justPressed }; };

test('far: the run key at about 6 beats in 10, through the offense cooldown', () => {
    withFlag(true, () => {
        const a = ai(400);
        assert.deepEqual(withRandom(0.3, () => beat(a.h)), { run: true });
        assert.ok(a.h._offense > 1.3, 'an attack sets the offense cooldown');
        assert.ok(a.h._cooldown >= 1.0);
        const b = ai(400);
        assert.deepEqual(withRandom(0.8, () => beat(b.h)), {}, 'the other 4 beats in 10 wait');
        assert.ok(b.h._cooldown > 0);
        let runs = 0, n = 2000; for (let i = 0; i < n; i++) { const c = ai(400); if (beat(c.h).run) runs++; }
        assert.ok(Math.abs(runs / n - 0.6) < 0.05, `${runs / n}`);
    });
});

test('far but the charge cannot work (near-vertical run, not in his kit): no run key', () => {
    withFlag(true, () => {
        const a = ai(400, { charge: false });
        assert.deepEqual(withRandom(0.1, () => beat(a.h)), {});
    });
});

test('close: a strike, never the run key; between: nothing, the movement closes the gap', () => {
    withFlag(true, () => {
        assert.deepEqual(withRandom(0.1, () => beat(ai(60).h)), { power: true });
        assert.deepEqual(withRandom(0.1, () => beat(ai(100).h)), {}, 'between jab reach and 120 px');
    });
});

test('movement: never backs off from a cornered man, always closes; a standing man can still be backed away from', () => {
    withFlag(true, () => {
        const a = ai(150);
        a.h._cfg = { ...a.h._cfg, stallChance: 10 }; // would stall every frame
        const keys = (x) => { x.h._keys = {}; x.h._updateMovement(1 / 60); return x.h._keys; };
        const k = keys(a);
        assert.ok(k.left && !k.right, 'toward him (he is on the left)');
        assert.equal(a.h._stallTimer, 0);
        const s = ai(150); s.opp.state = 'standing'; s.h._cfg = { ...s.h._cfg, stallChance: 10 };
        keys(s);
        assert.ok(s.h._stallTimer > 0, 'the stall still happens against a standing man');
    });
});

test('flag off: a cornered man is ignored (the old rejection of anyone not standing or blocking)', () => {
    withFlag(false, () => {
        assert.deepEqual(withRandom(0.1, () => beat(ai(400).h)), {});
        assert.deepEqual(withRandom(0.1, () => beat(ai(60).h)), {});
    });
});
