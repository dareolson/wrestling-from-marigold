import test from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';

test('joint-locked get-ups finish at the actual body height without moving the grounded start', () => {
    for (const height of [124, 132.19]) for (const lying of ['prone', 'supine']) {
        let rendered;
        const rig = { _lockLimbJoints: true, standingHipHeight: height,
            _applyGrounded(...args) { rendered = args.at(-1); } };
        const start = lying === 'prone' ? Skeleton.GROUNDED_FLAT : Skeleton.GROUNDED_SUPINE;
        Skeleton.prototype.updateGetUp.call(rig, 0, 0, 1, 1, 0, lying);
        assert.equal(rendered.hip, start.hip);
        let last = rendered.hip;
        for (let i = 1; i <= 48; i++) {
            Skeleton.prototype.updateGetUp.call(rig, 0, 0, 1, 1, i / 48, lying);
            assert.ok(rendered.hip >= last, 'rise stays continuous and monotonic');
            last = rendered.hip;
        }
        assert.ok(Math.abs(rendered.hip - height) < 1e-9);
        assert.equal(Skeleton.GETUP_POSES.at(-1).hip, 88, 'no global pose mutation');
    }
});

test('reference and unmigrated rigs retain their existing get-up geometry', () => {
    let rendered;
    const rig = { _lockLimbJoints: false, standingHipHeight: 124,
        _applyGrounded(...args) { rendered = args.at(-1); } };
    Skeleton.prototype.updateGetUp.call(rig, 0, 0, 1, 1, 1);
    assert.equal(rendered.hip, 88);
});
