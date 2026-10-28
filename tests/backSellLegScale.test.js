// backSell.legScale (PLAN_GEORGE_TRANSFER T10.2, Rev 4 D12): optional, 0 < x <= 1, scales only leg and hip offsets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backSellSupport } from '../src/rig/backSell.js';
import { scaleLegs, LEG_CHANNELS, SELLS, sampleSell } from '../src/animation/sells.js';
import { holdOffsets } from '../src/animation/backRisePerformance.js';
import { theszProcreateV1 } from '../src/characters/thesz_procreate_v1.js';
import { georgeRosterV1 } from '../src/characters/george_roster_v1.js';

const view = (c, patch) => ({ _textureConfig: { ...c.textures, backSell: { ...c.textures.backSell, ...patch } },
    torso: { _semanticAnchors: c.textures.torso.semanticAnchors } });

test('scale 1 and no scale hand back the same offsets', () => {
    const d = { torso: 0.2, nearThigh: 0.6, nearShin: -0.5, hip: 8 };
    assert.equal(scaleLegs(d, undefined), d);
    assert.equal(scaleLegs(d, 1), d);
});

test('the scale touches only the leg and hip channels', () => {
    const d = { torso: 0.2, nearArm: 0.4, nearFore: 0.1, farArm: 0.3, nearThigh: 0.6, nearShin: -0.5, farThigh: 0.5, farShin: -0.45, hip: 8 };
    const out = scaleLegs(d, 0.5);
    for (const [c, v] of Object.entries(d)) assert.equal(out[c], LEG_CHANNELS.includes(c) ? v * 0.5 : v, c);
    assert.equal(d.nearThigh, 0.6, 'input not mutated');
});

test('scaling every roll key by k keeps the swap symmetry (supine end = prone start, negated)', () => {
    const roll = SELLS.supine.roll, k = 0.55;
    const a = scaleLegs(sampleSell(roll.keys, 1).d, k), b = scaleLegs(sampleSell(roll.after, 0).d, k);
    for (const c of LEG_CHANNELS) assert.ok(Math.abs((c === 'hip' ? a[c] - b[c] : a[c] + b[c])) < 1e-9, c);
});

test('hold offsets scale in the legs only', () => {
    const h = holdOffsets(1.0), s = scaleLegs(h, 0.4);
    assert.equal(s.torso, h.torso);
    for (const c of LEG_CHANNELS) assert.ok(Math.abs(s[c] - h[c] * 0.4) < 1e-12, c);
});

test('legScale validates: absent or in (0, 1] is fine, anything else unsupports the rig', () => {
    for (const c of [theszProcreateV1, georgeRosterV1]) {
        assert.equal(backSellSupport(view(c, {})).ok, true);
        for (const v of [1, 0.7, 0.4, 0.01]) assert.equal(backSellSupport(view(c, { legScale: v })).ok, true, String(v));
        for (const v of [0, -0.5, 1.01, NaN, Infinity, '0.5', null]) {
            const s = backSellSupport(view(c, { legScale: v }));
            assert.equal(s.ok, false, String(v));
            assert.equal(s.reason, 'invalid backSell data: legScale');
        }
    }
});

test('Lou has no legScale; no rig carries one before G10a', () => {
    assert.equal('legScale' in theszProcreateV1.textures.backSell, false);
    assert.equal('legScale' in georgeRosterV1.textures.backSell, false);
});
