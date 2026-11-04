import test from 'node:test';
import assert from 'node:assert/strict';
import { SLEEPER, SLEEPER_POSES, SLEEPER_ARMS, sleeperStage, stageRestartTime, sleeperSink, sleeperChannels, flailSwings, seeded, SNAPMARE_SMALL, snapmareFlipAngle, smallSnapmareOpen } from '../src/animation/sleeper.js';

test('stages follow the old timings: z under 1.4 s, zz under 2.8 s, zzz after, the KO at 4.0', () => {
    assert.deepEqual([0, 1.39, 1.4, 2.79, 2.8, 3.99, 5].map(t => sleeperStage(t).z), ['z', 'z', 'zz', 'zz', 'zzz', 'zzz', 'zzz']);
    assert.equal(SLEEPER.ko, 4.0);
    assert.equal(SLEEPER.stages[2].until, SLEEPER.ko);
});

test('no knee in a sleeper pose bends backward: every lKnee/rKnee is zero or negative', () => {
    for (const role of Object.values(SLEEPER_POSES)) for (const pose of Object.values(role)) for (const k of ['lKnee', 'rKnee']) if (k in pose) assert.ok(pose[k] <= 0, k);
});

test('the sink deepens by stage and never pops: continuous across each stage change, both directions of time', () => {
    const at = (t) => sleeperSink(t).crouch;
    assert.ok(at(0.5) < at(2.0) && at(2.0) < at(3.6));
    for (const edge of SLEEPER.stages.slice(0, 2).map(s => s.until)) assert.ok(Math.abs(at(edge + 1e-4) - at(edge - 1e-4)) < 0.02, `step at ${edge}`);
    assert.ok(Math.abs(sleeperSink(0).crouch - SLEEPER_POSES.defender.fight.crouch) < 1e-9);
});

test('the attacker follows him down into a crouch, and his hips stay behind: upstage is the waistlock\'s', () => {
    assert.ok(sleeperSink(3.6, 'attacker').crouch > sleeperSink(0.2, 'attacker').crouch);
    assert.equal(SLEEPER.upstage, 12);
    assert.ok(SLEEPER.behind < 82, 'nearer than the waist hold');
});

test('the flail is seeded: the same seed gives the same swings, another seed does not; swings fill the stage and get smaller', () => {
    const a = flailSwings(7), b = flailSwings(7), c = flailSwings(8);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.ok(a.length >= 3 && a[0].at === SLEEPER.stages[0].until);
    assert.ok(a.at(-1).at < SLEEPER.stages[1].until);
    assert.ok(a.at(-1).dur >= a[0].dur * 0.9, 'later swings are slower');
    assert.ok(a.every(s => s.side === 'near' || s.side === 'far'));
    const r = seeded(1); const v = [r(), r(), r()];
    assert.ok(v.every(x => x >= 0 && x < 1) && new Set(v).size === 3);
});

test('limp arms hang and fight arms are up; the far arm is never asked to fold into the torso (elbow within 0 to 2.75)', () => {
    assert.ok(SLEEPER_ARMS.limp.near.arm < 0.3 && SLEEPER_ARMS.fight.near.arm > 1.2);
    for (const a of [SLEEPER_ARMS.fight.near, SLEEPER_ARMS.fight.far, SLEEPER_ARMS.limp.near, SLEEPER_ARMS.limp.far]) assert.ok(a.elbow >= 0 && a.elbow <= 2.75);
});

test('the small snapmare is the same clip with one option: half a turn, seated 0.8 s; only in z and zz', () => {
    assert.equal(snapmareFlipAngle('small'), Math.PI);
    assert.equal(snapmareFlipAngle('full'), 1.5 * Math.PI);
    assert.equal(snapmareFlipAngle(), 1.5 * Math.PI);
    assert.throws(() => snapmareFlipAngle('double'));
    assert.equal(SNAPMARE_SMALL.seat, 0.8);
    assert.deepEqual([0.5, 2.0, 3.5].map(smallSnapmareOpen), [true, true, false]);
});

test('an escape tick restarts one stage up: limp -> the flail\'s start, flail and fight -> 0', () => {
    assert.equal(stageRestartTime('limp'), SLEEPER.stages[0].until);
    assert.equal(stageRestartTime('flail'), 0);
    assert.equal(stageRestartTime('fight'), 0);
    assert.equal(sleeperStage(stageRestartTime('limp')).id, 'flail');
});

test('sleeperChannels: arms by stage, near/far channels follow lChannelSide, knees never positive, same seed same flail', () => {
    for (const side of ['near', 'far']) {
        const nearCh = side === 'far' ? 'r' : 'l', farCh = nearCh === 'l' ? 'r' : 'l';
        const fight = sleeperChannels('defender', side, 0.5), limp = sleeperChannels('defender', side, 3.5);
        assert.ok(fight[`${nearCh}Arm`] > 1.3 && fight[`${farCh}Arm`] > 1.3, 'both hands up at the forearm');
        assert.ok(limp[`${nearCh}Arm`] < 0.3 && limp[`${farCh}Arm`] < 0.3, 'hanging when limp');
        for (const t of [0, 0.5, 2.0, 3.5]) for (const role of ['attacker', 'defender']) { const c = sleeperChannels(role, side, t); assert.ok(c.lKnee <= 0 && c.rKnee <= 0, `${role} ${t}`); }
    }
    assert.deepEqual(sleeperChannels('defender', 'near', 2.0, 5), sleeperChannels('defender', 'near', 2.0, 5));
    assert.notDeepEqual(sleeperChannels('defender', 'near', 2.0, 5), sleeperChannels('defender', 'near', 2.0, 6));
    assert.ok(sleeperChannels('attacker', 'near', 3.5).crouch > sleeperChannels('attacker', 'near', 0.1).crouch);
});
