// PLAN_SCALE T3.3: the roster's height line-up is pinned. research/scale-2026-11/height-ladder.json is written by tools/debug/scale_height_ladder.mjs (painted-ink standing
// heights at the front row). This fails when a rig's heightScale / bone numbers / body art change (the fingerprint) or the ratios to Lou, rebuilt from the current heightScale and
// the recorded ink per unit of draw scale, leave the pinned ratios by more than 1%. A deliberate change: re-run the tool, look at the ratios, commit the new file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LADDER_RIGS, rigFingerprint } from '../tools/debug/height_ladder_lib.mjs';

const ladder = JSON.parse(readFileSync(new URL('../research/scale-2026-11/height-ladder.json', import.meta.url)));
const PINNED = { 'thesz-procreate-v1': 1, 'george-roster-v1': 0.9618, 'kowalski-roster-v1': 0.9941, 'guido-roster-v1': 0.9634 };   // 2026-11-20 ratios to Lou, ink height at the front row

test('T3.3: the ladder covers every rig in the line-up, Lou first', () => {
    assert.deepEqual(ladder.rigs.map(r => r.id), LADDER_RIGS.map(r => r.id));
    assert.equal(ladder.rigs[0].id, 'thesz-procreate-v1');
});

test('T3.3: each rig\'s height fingerprint (heightScale, bone numbers, body art) matches the ladder', () => {
    for (const rig of LADDER_RIGS) {
        const rec = ladder.rigs.find(r => r.id === rig.id), now = rigFingerprint(rig);
        assert.deepEqual(now.numbers, rec.numbers, `${rig.id}: heightScale/bone numbers moved; re-run tools/debug/scale_height_ladder.mjs and judge the line-up`);
        assert.deepEqual(now.art, rec.art, `${rig.id}: body art (head/torso/thigh/shin) changed; re-run tools/debug/scale_height_ladder.mjs and judge the line-up`);
    }
});

test('T3.3: ratios to Lou, from the current heightScale, stay within 1% of the pinned ones', () => {
    const lou = ladder.rigs[0], louNow = LADDER_RIGS[0].textures.heightScale;
    for (const rig of LADDER_RIGS) {
        const rec = ladder.rigs.find(r => r.id === rig.id), ratio = (rec.inkPerDs * rig.textures.heightScale) / (lou.inkPerDs * louNow);
        assert.ok(Math.abs(ratio / PINNED[rig.id] - 1) <= 0.01, `${rig.id}: ratio ${ratio.toFixed(4)} vs pinned ${PINNED[rig.id]}`);
    }
});

test('T3.3: the recorded ratios agree with their own ink measurement (<= 0.5%)', () => {
    for (const r of ladder.rigs) assert.ok(Math.abs(r.ratioToLou / r.measuredRatioToLou - 1) <= 0.005, r.id);
});
