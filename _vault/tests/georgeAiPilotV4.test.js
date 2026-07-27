import test from 'node:test';
import assert from 'node:assert/strict';

import { georgeAiPilotV4 } from '../src/characters/george_ai_pilot_v4.js';
import { georgeAiPilotV2 } from '../src/characters/george_ai_pilot_v2.js';

// v4 draws from three independently-generated source sheets (torso+upper arm,
// forearms, reused v3 thigh), each with its own derived EFFECTIVE_SCALE — so,
// unlike v1/v2 (one shared scale for every part), the uniform-scale guarantee
// only holds WITHIN a sheet's own parts, not across sheets.
const SCALE_GROUPS = {
    torsoArm: { scale: 0.1391383407251759, limbs: { upperArm: [350, 753] } },
    forearm: { scale: 0.1221920043548019, limbs: { nearForearm: [370, 876], farForearm: [322, 891] } },
    thigh: { scale: 0.06887886597938145, limbs: { thigh: [401, 861] } },
};

test('George v4 limbs render at one uniform source-pixel scale within each source sheet', () => {
    for (const { scale, limbs } of Object.values(SCALE_GROUPS)) {
        for (const [name, canvas] of Object.entries(limbs)) {
            const part = georgeAiPilotV4.textures[name];
            const growth = 1 / (1 - part.jointPivotFrac);
            const displayedW = part.box.w * growth;
            const displayedH = part.box.h * growth;
            assert.ok(Math.abs(displayedW / canvas[0] - scale) < 1e-9, `${name} X scale`);
            assert.ok(Math.abs(displayedH / canvas[1] - scale) < 1e-9, `${name} Y scale`);
        }
    }
});

test('George v4 pelvis overlay shares the torso box; near/far forearms are distinct textures', () => {
    assert.deepEqual(georgeAiPilotV4.textures.pelvisOverlay.box, georgeAiPilotV4.textures.torso.box);
    assert.notEqual(georgeAiPilotV4.textures.nearForearm.key, georgeAiPilotV4.textures.farForearm.key);
});

test('George v4 shares one upper arm for both sides, with a distalAnchorFrac both forearms attach through', () => {
    assert.ok(georgeAiPilotV4.textures.upperArm.distalAnchorFrac);
    assert.equal(georgeAiPilotV4.textures.upperArm.distalAnchorFrac.u, 0.5);
    // Terminal parts — no distalAnchorFrac needed downstream of the hand.
    assert.equal(georgeAiPilotV4.textures.nearForearm.distalAnchorFrac, undefined);
    assert.equal(georgeAiPilotV4.textures.farForearm.distalAnchorFrac, undefined);
});

test('George v4 clears the inherited legacy forearm/shin keys so Arena.js does not try to load nonexistent files', () => {
    assert.equal(georgeAiPilotV4.textures.forearm, undefined);
    assert.equal(georgeAiPilotV4.textures.shin, undefined);
});

test('George v4 reuses v2\'s near/far shin art + leg bone lengths + head anchor unchanged', () => {
    // head/nearShin/farShin get v4's own texture KEYS (own preload path under
    // this character's own asset folder — see PART_FILES), but are copies of
    // the exact same approved v2 pixels/measurements, not a re-measurement.
    assert.equal(georgeAiPilotV4.textures.thighH, georgeAiPilotV2.textures.thighH);
    assert.equal(georgeAiPilotV4.textures.shinH, georgeAiPilotV2.textures.shinH);
    assert.deepEqual(georgeAiPilotV4.textures.headAnchorFrac, georgeAiPilotV2.textures.headAnchorFrac);
    assert.equal(georgeAiPilotV4.textures.neckInTorso, georgeAiPilotV2.textures.neckInTorso);
    assert.deepEqual(georgeAiPilotV4.textures.nearShin.soleAnchorFrac, georgeAiPilotV2.textures.nearShin.soleAnchorFrac);
    assert.deepEqual(georgeAiPilotV4.textures.farShin.soleAnchorFrac, georgeAiPilotV2.textures.farShin.soleAnchorFrac);
});

test('George v4 has its own freshly-measured torso sockets, not v2\'s', () => {
    assert.notDeepEqual(georgeAiPilotV4.textures.rigProfile.sockets, georgeAiPilotV2.textures.rigProfile.sockets);
    const sockets = georgeAiPilotV4.textures.rigProfile.sockets;
    for (const key of ['neck', 'nearShoulder', 'farShoulder', 'nearHip', 'farHip']) {
        assert.ok(sockets[key], key);
    }
});

test('George v4 adds no screen-space limb repair offsets', () => {
    const forbidden = [
        'legOffsetX', 'legOffsetY', 'nearLegOffsetY', 'nearLegTilt',
        'nearShinOffsetX', 'nearShinOffsetY', 'nearShinTilt',
        'farLegOffsetX', 'farLegOffsetY', 'farLegTilt',
        'farShinOffsetX', 'farShinOffsetY',
        'armOffsetX', 'armOffsetY', 'nearArmTilt', 'farArmTilt',
        'nearForearmOffsetX', 'nearForearmOffsetY', 'farForearmOffsetX', 'farForearmOffsetY',
    ];
    for (const key of forbidden) assert.equal(Object.hasOwn(georgeAiPilotV4.textures, key), false, key);
});
