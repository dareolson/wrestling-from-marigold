import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backBodyDropV2Clip, RUN_SPEED_UNITS } from '../src/animation/clips/backBodyDropV2.js';
import { runnerEntryClip } from '../src/animation/clips/runnerEntry.js';
import { hipTossClip } from '../src/animation/clips/hipToss.js';
import { validateClip } from '../src/animation/AnimationClip.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';

test('backBodyDropV2 is valid at every entry distance, with the contact timed by the runner\'s speed', () => {
    let last = 0;
    for (const d of [60, 90, 120, 160]) {
        const c = backBodyDropV2Clip(d);
        assert.deepEqual(validateClip(c), { ok: true, errors: [] }, `distance ${d}`);
        const run = c.tracks.defender.keyframes, contact = run.find(k => k.transform.x === 12);
        assert.ok(contact, 'the runner reaches 12 units from the attacker at the contact key');
        assert.ok(Math.abs((d - 12) / contact.at - RUN_SPEED_UNITS) < RUN_SPEED_UNITS * 0.4 || contact.at <= 0.16 || contact.at >= 0.55, 'speed into the contact is his run speed unless clamped');
        assert.ok(c.duration > last - 1e-9 || d === 60); last = c.duration;
    }
});

test('the runner never stops before the contact: his x falls monotonically to the attacker', () => {
    const xs = backBodyDropV2Clip(150).tracks.defender.keyframes.filter(k => k.at <= 0.5).map(k => k.transform.x);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] <= xs[i - 1], 'x never rises on the way in');
});

test('D3: no lKnee/rKnee keys in the new clips', () => {
    for (const c of [backBodyDropV2Clip(150)]) for (const role of ['attacker', 'defender']) for (const k of c.tracks[role].keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false);
        assert.ok(Number.isFinite(k.pose.lShin) && Number.isFinite(k.pose.rShin));
    }
});

test('runnerEntryClip leads the clip in by the run, plays it unchanged and shifted, and leaves the original alone', () => {
    const before = JSON.stringify(hipTossClip);
    const c = runnerEntryClip(hipTossClip, 200, 'hipTossRunner');
    assert.deepEqual(validateClip(c), { ok: true, errors: [] });
    const lead = c.events[0].at - hipTossClip.events[0].at;
    assert.ok(Math.abs(lead - (200 - 70) / RUN_SPEED_UNITS) < 0.002);
    assert.equal(c.tracks.defender.keyframes[0].transform.x, 200);
    assert.equal(c.tracks.defender.keyframes.find(k => Math.abs(k.at - lead) < 1e-6).transform.x, 70);
    assert.equal(c.duration, +(hipTossClip.duration + lead).toFixed(3));
    assert.equal(JSON.stringify(hipTossClip), before);
    assert.equal(runnerEntryClip(hipTossClip, 60, 'x').tracks.defender.keyframes[2].at, 0.12, 'a close runner still gets the minimum lead');
});

test('flag off: the new clips are not statically registered', () => {
    assert.equal(REGISTERED_MOVE_CLIPS.some(c => ['backBodyDropV2', 'hipTossRunner'].includes(c.id)), false);
});


test('the running hip toss gains height without changing the standing toss or its landing', async () => {
    const { runnerHipTossClip } = await import('../src/animation/clips/runnerHipToss.js');
    const before = JSON.stringify(hipTossClip), c = runnerHipTossClip(150);
    assert.deepEqual(validateClip(c), { ok: true, errors: [] });
    const lead = c.events[0].at - .62;
    const peak = c.tracks.defender.keyframes.find(k => Math.abs(k.at - (lead + .42)) < .002);
    assert.ok(peak.pose.lift > hipTossClip.tracks.defender.keyframes.find(k => k.at === .42).pose.lift + 40);
    const impact = c.tracks.defender.keyframes.find(k => k.at === c.events[0].at);
    assert.equal(impact.pose.lift, -110);
    assert.equal(impact.transform.x, -160);
    assert.equal(JSON.stringify(hipTossClip), before);
    for (const track of Object.values(c.tracks)) for (const k of track.keyframes) assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false);
});

test('runner arm drag catches the arm, retains the running entry, releases before impact and lands on the mat', async () => {
    const { runnerArmDragClip } = await import('../src/animation/clips/runnerArmDrag.js');
    for (const d of [60, 90, 150, 200]) {
        const c = runnerArmDragClip(d);
        assert.deepEqual(validateClip(c), { ok: true, errors: [] });
        const catchKey = c.tracks.defender.keyframes[1];
        assert.equal(catchKey.transform.x, 68);
        assert.ok(c.grips.some(g => g.to.joint === 'Wrist'));
        assert.ok(c.grips.some(g => g.to.joint === 'Elbow'));
        assert.ok(c.grips.every(g => g.out[1] < c.events[0].at));
        const impact = c.tracks.defender.keyframes.find(k => k.at === c.events[0].at);
        assert.equal(impact.pose.lift, -110);
        assert.equal(impact.transform.x, -150);
        for (const track of Object.values(c.tracks)) for (const k of track.keyframes) assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false);
    }
});
