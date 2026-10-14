// Throws posed in the move editor against the WWF Raw sheet with the body
// tilt/lift channels (tools/move-editor/author_piledriver.mjs,
// author_bodyslam.mjs). Played by Wrestler._playPairedThrow.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { piledriverClip } from '../src/animation/clips/piledriver.js';
import { bodySlamClip } from '../src/animation/clips/bodySlam.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import { exportClip } from '../tools/move-editor/model.js';

const readDraft = file => JSON.parse(readFileSync(new URL(`../tools/move-editor/drafts/${file}`, import.meta.url), 'utf8'));
const fakeActor = () => ({ pose: {}, skeleton: { setPartVariants() {} } });

const THROWS = [
    { move: 'piledriver', clip: piledriverClip, draft: readDraft('piledriver.json') },
    { move: 'bodySlam', clip: bodySlamClip, draft: readDraft('bodyslam.json') },
];

for (const { move, clip, draft } of THROWS) {
    test(`${move}: registered under the registry id and valid`, () => {
        assert.equal(MOVE_SPECS[move].clip, clip.id);
        assert.ok(REGISTERED_MOVE_CLIPS.includes(clip));
        const result = validateClip(clip);
        assert.equal(result.ok, true, result.errors.join('; '));
    });

    test(`${move}: the committed clip is exactly what its draft exports`, () => {
        assert.deepEqual(exportClip(draft), JSON.parse(JSON.stringify(clip)));
    });

    test(`${move}: the draft carries its sprite references, the clip never does`, () => {
        assert.ok(draft.references.length > 0);
        assert.equal('references' in clip, false);
    });

    // _playPairedThrow's damage keys on this one marker.
    for (const hz of [30, 60, 120]) {
        test(`${move}: impact fires exactly once at ${hz} Hz`, () => {
            const seen = [];
            const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
            runtime.register(clip);
            runtime.play(clip.id, { attacker: fakeActor(), defender: fakeActor() });
            for (let t = 0; t < clip.duration + 0.1; t += 1 / hz) runtime.update(1 / hz);
            assert.deepEqual(seen, ['impact']);
        });
    }

    // The executor hands the victim to the grounded supine pose; the clip's
    // last frame must already be lying back (tilt a quarter turn backward,
    // hips down at the mat) or the handoff pops.
    test(`${move}: the victim ends lying on his back`, () => {
        const end = sampleClip(compileClip(clip), clip.duration).tracks.defender.pose;
        const backward = ((end.tilt % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        assert.ok(Math.abs(backward - (2 * Math.PI - 1.52)) < 0.15, `end tilt ${end.tilt}`);
        assert.ok(end.lift < -100, `end lift ${end.lift}`);
    });
}

test('piledriver: held upside down, then driven head-first into the mat', () => {
    const compiled = compileClip(piledriverClip);
    const impactAt = piledriverClip.events.find(e => e.type === 'impact').at;
    const held = sampleClip(compiled, 0.9).tracks.defender.pose;
    assert.ok(Math.abs(held.tilt - Math.PI) < 0.05, `held tilt ${held.tilt}`);
    assert.ok(held.lift > 80, `held lift ${held.lift}`);
    const impact = sampleClip(compiled, impactAt).tracks.defender.pose;
    assert.ok(Math.abs(impact.tilt - Math.PI) < 0.05);
    assert.ok(impact.lift < held.lift / 2, 'lowered to the mat at impact');
});

test('body slam: lifted to the shoulders, then flat on his back in front', () => {
    const compiled = compileClip(bodySlamClip);
    const impactAt = bodySlamClip.events.find(e => e.type === 'impact').at;
    const peak = sampleClip(compiled, impactAt - 0.2).tracks.defender;
    assert.ok(peak.pose.lift > 50, `peak lift ${peak.pose.lift}`);
    const impact = sampleClip(compiled, impactAt).tracks.defender;
    assert.ok(impact.pose.lift < -100, 'on the mat at impact');
    assert.ok(impact.transform.x > 120, `lands in front, x=${impact.transform.x}`);
});
