// The Procreate-master comparison candidate: it must load, bind, and above all
// stay OPT-IN. Shipped Lou is the thing these tests protect.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { thesz } from '../src/characters/thesz.js';
import { POSES } from '../src/Wrestler.js';
import { theszProcreateV1, thesz_procreate_v1 } from '../src/characters/thesz_procreate_v1.js';
import { validateCharacterArt, enumerateCharacterAssets, BASE_PART_FILES, resolvePartSelection, resolveSemanticSlots } from '../src/rig/partVariants.js';

test('the candidate declares a valid rig contract', () => {
    const { ok, errors } = validateCharacterArt(theszProcreateV1);
    assert.ok(ok, `rig contract invalid: ${errors.join('; ')}`);
});

test('it delivers shipped Lou\'s six body parts, plus the two audition forearms', () => {
    const assets = enumerateCharacterAssets(theszProcreateV1);
    const body = assets.filter(a => a.variant === 'base' && a.slot !== 'farForearm').map(a => a.slot).sort();
    assert.deepEqual(body, ['forearm', 'head', 'shin', 'thigh', 'torso', 'upperArm'].sort());
    const shipped = enumerateCharacterAssets(thesz).map(a => a.slot).sort();
    assert.deepEqual(body, shipped, 'the six body slots must match shipped Lou exactly');
    // 2026-10-11 audition: palm-side far forearm and the hammerlock grip.
    const extra = assets.filter(a => a.slot === 'farForearm' || a.variant !== 'base')
        .map(a => `${a.slot}.${a.variant}`).sort();
    assert.deepEqual(extra, ['farForearm.base', 'forearm.grip']);
});

test('audition forearms keep the base forearm geometry exactly', () => {
    const t = theszProcreateV1.textures;
    const { key: _a, ...base } = t.forearm;
    const { key: _b, ...far } = t.farForearm;
    assert.deepEqual(far, base);
    const resolved = resolvePartSelection(t, { nearForearm: 'grip' }).nearForearm;
    assert.equal(resolved.key, 'thesz_pv1_forearm_grip');
    assert.deepEqual(resolved.box, t.forearm.box);
    assert.equal(resolved.jointPivotFrac, t.forearm.jointPivotFrac);
});

test('workingHand swaps the forearm for a hand-in-forearm character, by facing', () => {
    const t = theszProcreateV1.textures;
    assert.deepEqual(resolveSemanticSlots({ workingHand: 'grip' }, 1, t), { nearForearm: 'grip' });
    assert.deepEqual(resolveSemanticSlots({ workingHand: 'grip' }, -1, t), { farForearm: 'grip' });
    // Characters without the flag keep the hand slot, unchanged.
    assert.deepEqual(resolveSemanticSlots({ workingHand: 'grip' }, 1, thesz.textures), { nearHand: 'grip' });
    assert.deepEqual(resolveSemanticSlots({ workingHand: 'grip' }, 1), { nearHand: 'grip' });
});

// pelvisMask is the ONLY part not derived from a PSD layer of its own: it is the
// tights lifted out of Derek's torso art at the waistline and redrawn at
// base+0.0035, above both thigh roots. pelvisOverlay (+0.0025) sits BELOW the
// near thigh and cannot do this job -- picking the wrong one silently restores
// the seam it was added to fix.
test('the hip seam is closed in the art, not with a pelvis layer', () => {
    const t = theszProcreateV1.textures;
    assert.equal(t.pelvisMask, undefined, 'a torso-anchored mask stays put while the leg swings');
    assert.equal(t.pelvisOverlay, undefined, 'pelvisOverlay draws below the near thigh; wrong slot');
    assert.equal(t.pelvisUnderlay, undefined, 'no underlay is authored for this art');
});

test('every declared part file exists on disk', () => {
    for (const asset of enumerateCharacterAssets(theszProcreateV1)) {
        assert.ok(readFileSync(asset.file).length > 0, `${asset.file} missing or empty`);
        // Variant files are named explicitly in the config; only base parts
        // must use the loader's conventional filenames.
        if (asset.variant !== 'base') continue;
        assert.ok(Object.values(BASE_PART_FILES).includes(asset.file.split('/').pop()),
            `${asset.file} is not a filename the loader looks for`);
    }
});

// The NaN this caught cost a certification run: with headAnchorFrac declared and
// neckInTorso false, Skeleton computes head.y from an unassigned _headHidePx and
// every pose in both facings resolves non-finite (Skeleton.js:414-418, :1669).
test('head anchoring cannot regress into the NaN combination', () => {
    const t = theszProcreateV1.textures;
    assert.ok(t.headAnchorFrac, 'candidate must declare headAnchorFrac');
    assert.equal(t.neckInTorso, true,
        'headAnchorFrac without neckInTorso makes head.y NaN in every pose');
});

test('anchors are finite, in range, and not inherited from another candidate', () => {
    const t = theszProcreateV1.textures;
    const fracs = [t.headAnchorFrac, ...Object.values(t.rigProfile.sockets),
        t.upperArm.distalAnchorFrac, t.thigh.distalAnchorFrac, t.shin.soleAnchorFrac];
    for (const f of fracs) {
        assert.ok(Number.isFinite(f.u) && f.u >= 0 && f.u <= 1, `u out of range: ${JSON.stringify(f)}`);
        assert.ok(Number.isFinite(f.v) && f.v >= 0 && f.v <= 1, `v out of range: ${JSON.stringify(f)}`);
    }
    for (const part of ['upperArm', 'forearm', 'thigh', 'shin']) {
        const e = t[part];
        assert.ok(e.box.w > 0 && e.box.h > 0, `${part} box must be positive`);
        assert.notDeepEqual(e.box, thesz.textures[part]?.box,
            `${part} box equals shipped Lou's — it must be measured from this art, not inherited`);
    }
});

test('candidate-only screen offsets start at zero', () => {
    const t = theszProcreateV1.textures;
    for (const k of ['headOffsetX', 'headOffsetY', 'armOffsetX', 'armOffsetY']) {
        assert.equal(t[k], 0, `${k} must stay 0 until a measured registration error justifies it`);
    }
});

test('it reuses shipped Lou\'s kit, skin and trunks so the review isolates the art', () => {
    assert.deepEqual(theszProcreateV1.moveSet, thesz.moveSet);
    assert.equal(theszProcreateV1.skinCol, thesz.skinCol);
    assert.equal(theszProcreateV1.trunksCol, thesz.trunksCol);
    assert.equal(theszProcreateV1.tauntPose, thesz.tauntPose);
});

// Derek tunes this candidate's stance in the rig tuner, and the tuner exports a
// POSES line. theszIdle is SHIPPED Lou's idle; pasting an export over it would
// restance the shipped character to suit a candidate under review. The candidate
// therefore idles on its own entry.
test('the candidate does not idle on shipped Lou\'s pose', () => {
    assert.equal(thesz.idlePose, 'theszIdle', 'shipped Lou must keep theszIdle');
    assert.notEqual(theszProcreateV1.idlePose, thesz.idlePose,
        'a tuner export against this candidate must not land on shipped Lou\'s idle');
    assert.equal(theszProcreateV1.idlePose, 'theszProcreateIdle');
});

test('shipped Lou\'s idle pose values are exactly as shipped', () => {
    assert.deepEqual(POSES.theszIdle, {
        lLeg: 0.04, rLeg: 0.14, lArm: 0.04, rArm: 0.17, lean: 0.05,
        crouch: 0.05, lForearm: 0.8, lShin: -0.11, rShin: -0.06,
    });
});

test('it does not share asset paths with shipped Lou', () => {
    const mine = enumerateCharacterAssets(theszProcreateV1).map(a => a.file);
    const shipped = new Set(enumerateCharacterAssets(thesz).map(a => a.file));
    for (const f of mine) assert.ok(!shipped.has(f), `${f} would overwrite shipped Lou`);
    for (const f of mine) assert.ok(f.includes('thesz-procreate-v1'), `${f} outside the candidate folder`);
});

test('the snake_case alias rig:certify resolves is the same object', () => {
    assert.equal(thesz_procreate_v1, theszProcreateV1);
});

test('shipped Lou is untouched by this candidate existing', () => {
    assert.equal(thesz.id, 'thesz');
    assert.equal(enumerateCharacterAssets(thesz).length, 6);
    for (const a of enumerateCharacterAssets(thesz)) {
        assert.ok(a.file.startsWith('src/assets/wrestlers/thesz/'), `shipped Lou asset moved: ${a.file}`);
    }
});
