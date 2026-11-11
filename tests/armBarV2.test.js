import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armBarEntryClip } from '../src/animation/clips/armBarV2.js';
import { armBarClip } from '../src/animation/clips/armBar.js';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { gripTarget } from '../src/animation/lockup.js';

test('kneeling arm bar preserves timing/events and the receiver position across entries', () => {
    for (const gap of [50, 70, 150, 210]) {
        const source = armBarEntryClip(gap);
        assert.deepEqual(validateClip(source), { ok: true, errors: [] });
        assert.equal(source.duration, armBarClip.duration);
        assert.deepEqual(source.events, armBarClip.events);
        const clip = compileClip(source);
        assert.equal(sampleClip(clip, 0).tracks.attacker.transform.x, 0);
        for (const [t, y] of [[0, 0], [2, -30], [source.duration, 0]]) assert.equal(sampleClip(clip, t).tracks.defender.transform.y, y, 'the man is eased 30 px back for the hold, home at both ends');
        for (let t = 0; t <= source.duration; t += 1 / 60) {
            const tracks = sampleClip(clip, t).tracks;
            assert.equal(tracks.defender.transform.x, gap);
            assert.ok(tracks.defender.transform.y <= 0 && tracks.defender.transform.y >= -30, 'the man is only eased back, never past 30');
            assert.equal(tracks.attacker.pose.tilt, 0);
            for (const role of ['attacker', 'defender']) {
                assert.equal('lKnee' in tracks[role].pose || 'rKnee' in tracks[role].pose, false);
            }
        }
    }
    assert.equal(armBarClip.grips, undefined, 'legacy arm bar remains unchanged');
});

test('runtime delivers the forearm offset to the grip solver on the trapped arm', () => {
    const source = armBarEntryClip(), runtime = new MoveRuntime();
    runtime.register(source);
    let grips;
    const attacker = { pose: {}, skeleton: { setPartVariants() {} }, holdGrips(list) { grips = list; } };
    const defender = { pose: {}, skeleton: { setPartVariants() {}, jointAttachmentPoints: {
        nearElbow: { x: 10, y: 20 }, nearWrist: { x: 50, y: 40 },
    } } };
    // Plants need a rendered skeleton; this test isolates the grip transport.
    runtime.register({ ...source, plants: [], layers: [] });
    runtime.play(source.id, { attacker, defender });
    runtime.update(1.4);
    runtime.afterDraw();
    const grip = grips.find(g => g.arm === 'r');
    assert.equal(grip.fore, .55);
    assert.deepEqual(gripTarget(grip, 'far'), { x: 32, y: 31 });
});
