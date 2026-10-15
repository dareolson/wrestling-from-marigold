// Throws posed in the move editor against the Royal Rumble sheet with the body
// tilt/lift channels (tools/move-editor/author_piledriver.mjs,
// author_bodyslam.mjs, author_suplex.mjs). Played by Wrestler._playPairedThrow.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileClip, sampleClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';
import { piledriverClip } from '../src/animation/clips/piledriver.js';
import { figureFourClip } from '../src/animation/clips/figureFour.js';
import { bodySlamClip } from '../src/animation/clips/bodySlam.js';
import { suplexClip } from '../src/animation/clips/suplex.js';
import { MOVE_SPECS } from '../src/moves/registry.js';
import { exportClip } from '../tools/move-editor/model.js';
import { dropkickClip } from '../src/animation/clips/dropkick.js';
import { soloClip } from '../tools/move-editor/authoring.mjs';
import { elbowDropClip } from '../src/animation/clips/elbowDrop.js';
import { kneeDropClip, KNEE_DROP_HOP } from '../src/animation/clips/kneeDrop.js';
import { divingElbowClip } from '../src/animation/clips/divingElbow.js';
import { topDiveClip } from '../src/animation/clips/topDive.js';
import { theszPressClip } from '../src/animation/clips/theszPress.js';
import { POSES } from '../src/Wrestler.js';

const readDraft = file => JSON.parse(readFileSync(new URL(`../tools/move-editor/drafts/${file}`, import.meta.url), 'utf8'));
const fakeActor = () => ({ pose: {}, skeleton: { setPartVariants() {} } });

const THROWS = [
    { move: 'piledriver', clip: piledriverClip, draft: readDraft('piledriver.json') },
    { move: 'bodySlam', clip: bodySlamClip, draft: readDraft('bodyslam.json') },
    { move: 'suplex', clip: suplexClip, draft: readDraft('suplex.json') },
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

test('suplex: stood straight up overhead, then over onto his back behind', () => {
    const compiled = compileClip(suplexClip);
    const impactAt = suplexClip.events.find(e => e.type === 'impact').at;
    const up = sampleClip(compiled, 0.8).tracks.defender.pose;
    assert.ok(Math.abs(up.tilt - Math.PI) < 0.1, `held tilt ${up.tilt}`);
    assert.ok(up.lift > 150, `held lift ${up.lift}`);
    const impact = sampleClip(compiled, impactAt).tracks;
    assert.ok(impact.defender.transform.x < -150, `lands behind, x=${impact.defender.transform.x}`);
    assert.ok(impact.attacker.pose.tilt < -1.3, 'the attacker goes over backward too');
});

// ── Dropkick: a one-wrestler clip (authoring.mjs soloClip) ───────────────────
test('dropkick: registered, valid, and exactly the solo export of its draft', () => {
    assert.equal(MOVE_SPECS.dropkick.clip, dropkickClip.id);
    assert.ok(REGISTERED_MOVE_CLIPS.includes(dropkickClip));
    const result = validateClip(dropkickClip);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.deepEqual(soloClip(readDraft('dropkick.json')), JSON.parse(JSON.stringify(dropkickClip)));
});

// The executor moves him across and the runtime applies every track to a
// bound actor, so the clip must pose only the attacker and never place him.
test('dropkick: attacker only, and no transform', () => {
    assert.deepEqual(Object.keys(dropkickClip.tracks), ['attacker']);
    assert.ok(dropkickClip.tracks.attacker.keyframes.every(frame => !('transform' in frame)));
    assert.equal(compileClip(dropkickClip).authorsTransform, false);
});

for (const hz of [30, 60, 120]) {
    test(`dropkick: impact fires exactly once at ${hz} Hz`, () => {
        const seen = [];
        const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
        runtime.register(dropkickClip);
        runtime.play('dropkick', { attacker: fakeActor() });
        for (let t = 0; t < dropkickClip.duration + 0.1; t += 1 / hz) runtime.update(1 / hz);
        assert.deepEqual(seen, ['impact']);
    });
}

test('dropkick: feet out at the impact, flat on his back at the end', () => {
    const compiled = compileClip(dropkickClip);
    const kick = sampleClip(compiled, dropkickClip.events[0].at).tracks.attacker.pose;
    assert.ok(kick.tilt < -1 && kick.lift > 40, `kick tilt ${kick.tilt} lift ${kick.lift}`);
    const end = sampleClip(compiled, dropkickClip.duration).tracks.attacker.pose;
    assert.ok(Math.abs(end.tilt + 1.52) < 0.1 && end.lift < -100, `end tilt ${end.tilt} lift ${end.lift}`);
});

// ── Flights: elbow drop, knee drop, dives (Wrestler._playFlight) ─────────────

const FLIGHTS = [
    { move: 'elbowDrop', clip: elbowDropClip, draft: 'elbowdrop.json' },
    { move: 'kneeDrop', clip: kneeDropClip, draft: null },
    { move: 'divingElbow', clip: divingElbowClip, draft: 'dive.json' },
    { move: 'topDive', clip: topDiveClip, draft: null },
    { move: 'theszPress', clip: theszPressClip, draft: 'theszpress.json' },
];

for (const { move, clip, draft } of FLIGHTS) {
    test(`${move}: a registered, valid one-wrestler clip with no transform`, () => {
        assert.equal(MOVE_SPECS[move].clip, clip.id);
        assert.ok(REGISTERED_MOVE_CLIPS.includes(clip));
        const result = validateClip(clip);
        assert.equal(result.ok, true, result.errors.join('; '));
        assert.deepEqual(Object.keys(clip.tracks), ['attacker']);
        assert.equal(compileClip(clip).authorsTransform, false);
    });
    if (draft) {
        test(`${move}: exactly the solo export of its draft`, () => {
            assert.deepEqual(soloClip(readDraft(draft)), JSON.parse(JSON.stringify(clip)));
        });
    }
    test(`${move}: lands tilt/lift-consistent with what the executor hands him to`, () => {
        const end = sampleClip(compileClip(clip), clip.duration).tracks.attacker.pose;
        if (move === 'kneeDrop') assert.equal(end.lift, 0, 'lands on his knees, upright');
        else assert.ok(end.tilt > 1.3 && end.lift < -80, `${move} ends flat face down: tilt ${end.tilt} lift ${end.lift}`);
    });
}

test('kneeDrop: the hop poses are exactly POSES.kneeDropLeap and kneeDropTuck', () => {
    assert.deepEqual(KNEE_DROP_HOP.leap, POSES.kneeDropLeap);
    assert.deepEqual(KNEE_DROP_HOP.tuck, POSES.kneeDropTuck);
});

test('topDive: the diving elbow\'s flight under its own id', () => {
    assert.equal(topDiveClip.id, 'topDive');
    assert.deepEqual({ ...topDiveClip, id: divingElbowClip.id }, divingElbowClip);
});

// ── Figure-four (George's, from Ric Flair's sheet) ───────────────────────────

test('figureFour: registered, valid, exactly its draft export, references on two sheets', () => {
    assert.equal(MOVE_SPECS.figureFour.clip, figureFourClip.id);
    assert.ok(REGISTERED_MOVE_CLIPS.includes(figureFourClip));
    const result = validateClip(figureFourClip);
    assert.equal(result.ok, true, result.errors.join('; '));
    const draft = readDraft('figurefour.json');
    assert.deepEqual(exportClip(draft), JSON.parse(JSON.stringify(figureFourClip)));
    assert.deepEqual([...new Set(draft.references.map(ref => ref.sheet))].sort(),
        ['wwf-royal-rumble-snes/44459-bret-hart', 'wwf-royal-rumble-snes/44464-ric-flair']);
});

for (const hz of [30, 60, 120]) {
    test(`figureFour: three squeezes, once each, at ${hz} Hz`, () => {
        const seen = [];
        const runtime = new MoveRuntime({ onEvent: e => seen.push(e.type) });
        runtime.register(figureFourClip);
        runtime.play('figureFour', { attacker: fakeActor(), defender: fakeActor() });
        for (let t = 0; t < figureFourClip.duration + 0.1; t += 1 / hz) runtime.update(1 / hz);
        assert.deepEqual(seen, ['squeeze', 'squeeze', 'squeeze']);
    });
}

test('figureFour: the victim lies on his back throughout; George ends on his feet', () => {
    const compiled = compileClip(figureFourClip);
    for (const at of [0, 1, 2, 3, figureFourClip.duration]) {
        const pose = sampleClip(compiled, at).tracks.defender.pose;
        assert.ok(Math.abs(pose.tilt + 1.52) < 0.3 && pose.lift < -100, `victim at ${at}s: tilt ${pose.tilt} lift ${pose.lift}`);
    }
    const end = sampleClip(compiled, figureFourClip.duration).tracks.attacker.pose;
    assert.equal(end.tilt, 0);
    assert.equal(end.lift, 0);
});
