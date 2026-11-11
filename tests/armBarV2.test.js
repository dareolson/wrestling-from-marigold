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
        for (let t = 0; t <= source.duration; t += 1 / 60) {
            const tracks = sampleClip(clip, t).tracks;
            assert.equal(tracks.defender.transform.x, gap);
            assert.equal(tracks.defender.transform.y, 0);
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

test('the grip sits above Lou’s baked hand when Lou is held; other men keep the wrist', () => {
    const onLou = compileClip(armBarEntryClip(70, 'thesz-procreate-v1'));
    const onGeorge = compileClip(armBarEntryClip(70, 'george-roster-v1'));
    const target = onLou.grips.find(g => g.arm === 'l').to;
    assert.equal(target.joint, 'Elbow');
    assert.equal(target.fore, .82);
    assert.equal(onGeorge.grips.find(g => g.arm === 'l').to.joint, 'Wrist');
    const partner = { skeleton: { jointAttachmentPoints: {
        nearElbow: { x: 0, y: 0 }, nearWrist: { x: 100, y: 50 },
    } } };
    assert.deepEqual(gripTarget({ ...target, partner }, 'near'), { x: 82, y: 41 });
    assert.deepEqual(onLou.events, onGeorge.events);
    assert.deepEqual(onLou.layers, onGeorge.layers);
});
