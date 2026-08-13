import test from 'node:test';
import assert from 'node:assert/strict';

import Skeleton from '../src/Skeleton.js';

const image = () => ({ depth: null, setDepth(value) { this.depth = value; return this; } });

test('future pelvis underlay and front mask have unambiguous thigh depth', () => {
    const skeleton = {
        farForearm: image(), farHand: image(), farUpArm: image(), farThigh: image(), farShin: image(), farBoot: image(),
        pelvisUnderlay: image(), head: image(), torso: image(), trunks: image(), pelvisOverlay: image(),
        nearThigh: image(), nearShin: image(), nearBoot: image(), pelvisMask: image(), nearHand: image(), nearForearm: image(), nearUpArm: image(),
    };
    Skeleton.prototype.setDepth.call(skeleton, 10);
    assert.ok(skeleton.pelvisUnderlay.depth < skeleton.farThigh.depth, 'underbody behind far thigh');
    assert.ok(skeleton.pelvisUnderlay.depth < skeleton.nearThigh.depth, 'underbody behind near thigh');
    assert.ok(skeleton.pelvisMask.depth > skeleton.farThigh.depth, 'front mask above far thigh');
    assert.ok(skeleton.pelvisMask.depth > skeleton.nearThigh.depth, 'front mask above near thigh');
    assert.equal(skeleton.pelvisOverlay.depth, 10.0025, 'legacy ambiguous overlay depth preserved');
});
