// Flag-off pose snapshot (PLAN_SUPLEX_RISE.md T2.0). Node has no Phaser parts, so
// the claim is bounded: the full pose-channel input that updateGetUp hands to
// _applyGrounded (which owns every part's world x,y,rotation), plus the
// _recoveryPose back overlay. Committed BEFORE any Stage 2 change; a browser-side
// world-part check is taken separately in tools/debug/sell_art_rise_measure.mjs.
// Regenerate deliberately with WFM_UPDATE_FIXTURE=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import Skeleton from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';

const FIXTURE = new URL('./fixtures/sellArtFlagOff.json', import.meta.url);
const TOL = 1e-9;
const STEPS = Array.from({ length: 11 }, (_, i) => i / 10);

function rises() {
    const out = {};
    for (const lying of ['supine', 'prone']) for (const facing of [1, -1]) {
        const key = `${lying}/${facing}`; out[key] = [];
        for (const t of STEPS) {
            const calls = [];
            const sk = { _lockLimbJoints: false, standingHipHeight: 124,
                _applyGrounded: (...a) => calls.push({ fn: '_applyGrounded', args: a.slice(0, 4), pose: { ...a[4] } }),
                updateGroundedReach: (...a) => calls.push({ fn: 'reach' }) };
            Skeleton.prototype.updateGetUp.call(sk, 100, 300, 1, facing, t, lying, null);
            out[key].push({ t, calls });
        }
    }
    return out;
}
function recoveries() {
    const out = {};
    for (const w of [0.5, 1]) {
        const self = Object.assign(Object.create(Wrestler.prototype), {
            _recoveryWeight: () => w,
            pose: { lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lean: 0, crouch: 0 },
            _pain: { part: 'back', phase: 'recover' },
        });
        out[w] = self._recoveryPose();
    }
    return out;
}
const snapshot = () => JSON.parse(JSON.stringify({ rises: rises(), recoveries: recoveries() }));

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

test('flag-off rise and back-recovery poses match the pre-Stage-2 snapshot', () => {
    if (process.env.WFM_UPDATE_FIXTURE) writeFileSync(FIXTURE, JSON.stringify(snapshot(), null, 1) + '\n');
    compare(snapshot(), JSON.parse(readFileSync(FIXTURE, 'utf8')));
});

test('a null pain context never takes the reach path, at any rise progress', () => {
    for (const [key, rows] of Object.entries(rises()))
        for (const { t, calls } of rows) assert.deepEqual(calls.map(c => c.fn), ['_applyGrounded'], `${key} t=${t}`);
});
