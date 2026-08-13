import test from 'node:test';
import assert from 'node:assert/strict';

import {
    authoredArticulationChannels,
    mergeArticulatedPose,
} from '../src/rig/articulation.js';

test('seekable samples use canonical local flex when both representations are present', () => {
    const pose = { lForearm: 0.8, lArm: 0.1 };
    mergeArticulatedPose(pose, { lElbow: 1.2, lForearm: -2.0, lArm: 0.4 });

    assert.deepEqual(pose, { lElbow: 1.2, lArm: 0.4 });
});

test('seekable samples switch representations instead of leaving an invisible competitor', () => {
    const pose = { lElbow: 1.2, lArm: 0.1 };
    mergeArticulatedPose(pose, { lForearm: 0.8 });

    assert.deepEqual(pose, { lForearm: 0.8, lArm: 0.1 });
});

test('omitted articulation remains untouched while ordinary pose channels merge', () => {
    const pose = { lKnee: 1.4, lLeg: 0.1 };
    mergeArticulatedPose(pose, { lLeg: 0.5, lean: 0.2 });

    assert.deepEqual(pose, { lKnee: 1.4, lLeg: 0.5, lean: 0.2 });
});

test('authored channel selection exposes one owner per joint', () => {
    assert.deepEqual(
        authoredArticulationChannels({ lElbow: 1, lForearm: 2, rShin: -0.1 }),
        [
            { channel: 'lElbow', counterpart: 'lForearm', mode: 'local' },
            { channel: 'rShin', counterpart: 'rKnee', mode: 'legacy' },
        ],
    );
});
