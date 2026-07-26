import test from 'node:test';
import assert from 'node:assert/strict';

import { georgeAiPilotV2 } from '../src/characters/george_ai_pilot_v2.js';

const EFFECTIVE_SCALE = 0.24861350162554982;
const LIMBS = {
    upperArm: { canvas: [178, 392] },
    forearm: { canvas: [190, 379] },
    thigh: { canvas: [294, 418] },
    nearShin: { canvas: [292, 509] },
    farShin: { canvas: [364, 452] },
};

test('George v2 limbs render at one uniform source-pixel scale on both axes', () => {
    for (const [name, { canvas }] of Object.entries(LIMBS)) {
        const part = georgeAiPilotV2.textures[name];
        const growth = 1 / (1 - part.jointPivotFrac);
        const displayedW = part.box.w * growth;
        const displayedH = part.box.h * growth;
        assert.ok(Math.abs(displayedW / canvas[0] - EFFECTIVE_SCALE) < 1e-12, `${name} X scale`);
        assert.ok(Math.abs(displayedH / canvas[1] - EFFECTIVE_SCALE) < 1e-12, `${name} Y scale`);
    }
});

test('George v2 pelvis overlay shares the torso box and distinct shins stay distinct', () => {
    assert.deepEqual(georgeAiPilotV2.textures.pelvisOverlay.box, georgeAiPilotV2.textures.torso.box);
    assert.notEqual(georgeAiPilotV2.textures.nearShin.key, georgeAiPilotV2.textures.farShin.key);
});

test('George v2 adds no screen-space limb repair offsets', () => {
    const forbidden = [
        'legOffsetX', 'legOffsetY', 'nearLegOffsetY', 'nearLegTilt',
        'nearShinOffsetX', 'nearShinOffsetY', 'nearShinTilt',
        'farLegOffsetX', 'farLegOffsetY', 'farLegTilt',
        'farShinOffsetX', 'farShinOffsetY',
    ];
    for (const key of forbidden) assert.equal(Object.hasOwn(georgeAiPilotV2.textures, key), false, key);
});
