import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ankleLockClip } from '../src/animation/clips/ankleLock.js';
import { ankleLockV2Clip, ankleLockEntryClip, GRAB_GAP, LEAD_IN } from '../src/animation/clips/ankleLockV2.js';
import { compileClip, validateClip, sampleClip } from '../src/animation/AnimationClip.js';
import { clipLayerDepths } from '../src/animation/clipLayers.js';
import { gripTarget } from '../src/animation/lockup.js';
import { REGISTERED_MOVE_CLIPS } from '../src/animation/clips/index.js';

test('ankleLockV2 is a valid clip with the old clip\'s duration and events', () => {
    assert.deepEqual(validateClip(ankleLockV2Clip), { ok: true, errors: [] });
    assert.equal(ankleLockV2Clip.duration, ankleLockClip.duration);
    assert.deepEqual(ankleLockV2Clip.events, ankleLockClip.events);
    assert.equal(compileClip(ankleLockV2Clip).grips.length, 2);
});

test('both hands are declared on the defender\'s ankle (heel, then toes), the soles are planted', () => {
    const [heel, toes] = ankleLockV2Clip.grips;
    assert.deepEqual([heel.arm, heel.to.joint, heel.to.anchor, toes.arm, toes.to.joint, toes.to.anchor], ['l', 'Ankle', 'heel', 'r', 'Ankle', 'toe']);
    assert.deepEqual(ankleLockV2Clip.plants.map(p => p.leg).sort(), ['l', 'r']);
});

test('D3: the attacker owns his shins (no lKnee / rKnee keys) and no shin is folded the wrong way', () => {
    for (const k of ankleLockV2Clip.tracks.attacker.keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false, `attacker key ${k.at}`);
        for (const s of ['l', 'r']) assert.ok(Number.isFinite(k.pose[`${s}Shin`]), `${s}Shin at ${k.at}`);
    }
});

test('gripTarget `past` goes beyond the ankle along knee -> ankle; without it the joint', () => {
    const partner = { skeleton: { jointAttachmentPoints: { nearKnee: { x: 0, y: 0 }, nearAnkle: { x: 10, y: 20 } } } };
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'same' }, 'near'), { x: 10, y: 20 });
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'same', past: 0.5 }, 'near'), { x: 15, y: 30 });
});

test('flag off: the V2 clip is not in the registered move clips and the old ankleLock is untouched', () => {
    assert.equal(REGISTERED_MOVE_CLIPS.includes(ankleLockV2Clip), false);
    assert.equal(REGISTERED_MOVE_CLIPS.includes(ankleLockClip), true);
    assert.equal(ankleLockClip.grips, undefined);
});


test('painted boot anchors follow the requested side, with joint fallback for rigs without them', () => {
    const calls = [];
    const partner = { skeleton: {
        jointAttachmentPoints: { farAnkle: { x: 1, y: 2 } },
        partAnchorPoint(slot, anchor) { calls.push([slot, anchor]); return anchor === 'toe' ? { x: 30, y: 40 } : null; },
    } };
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'other', anchor: 'toe' }, 'near'), { x: 30, y: 40 });
    assert.deepEqual(calls, [['farShin', 'toe']]);
    assert.deepEqual(gripTarget({ partner, joint: 'Ankle', side: 'other', anchor: 'heel' }, 'near'), { x: 1, y: 2 });
    const compiled = compileClip(ankleLockV2Clip);
    assert.deepEqual(compiled.grips.map(g => [g.to.anchor, g.palm]), [['heel', 'clutch'], ['toe', 'clutch']]);
});

test('T2.2c: the attacker stands tall (bend <= .3), both men own their shins, the victim\'s knees bend the natural way', () => {
    for (const k of ankleLockV2Clip.tracks.attacker.keyframes.filter(k => k.at >= 0.6)) assert.ok((k.pose.bend ?? 0) <= 0.3, `attacker bend ${k.pose.bend} at ${k.at}`);
    for (const k of ankleLockV2Clip.tracks.defender.keyframes) {
        assert.equal('lKnee' in k.pose || 'rKnee' in k.pose, false, `defender key ${k.at}`);
        for (const s of ['l', 'r']) assert.ok(k.pose[`${s}Shin`] < k.pose[`${s}Leg`], `${s} shin is folded behind its thigh at ${k.at}`);
    }
});

test('T2.2c: the trapped leg is raised and drawn over his body, his arms over the boot; same events and damage', () => {
    const held = ankleLockV2Clip.tracks.defender.keyframes.filter(k => k.at >= 0.6 && k.at <= 2.8);
    for (const k of held) assert.ok(k.pose.lLeg >= 1.3 && k.pose.lift > -110, `trapped leg up and hips off the mat at ${k.at}`);
    const [win] = ankleLockV2Clip.layers;
    assert.deepEqual(win.order.map(([r, l]) => `${r}.${l}`), ['defender.rLeg', 'defender.farArm', 'defender.torso', 'defender.head', 'defender.nearArm', 'attacker.farArm', 'attacker.torso', 'attacker.head', 'attacker.farLeg', 'attacker.nearLeg', 'defender.lLeg', 'attacker.nearArm']);
    assert.equal(ankleLockV2Clip.events.filter(e => e.type === 'squeeze').length, 3);
});


test('pickup preserves the receiver position at different entry distances, before and after the grip', () => {
    for (const distance of [50, 70, 150, 210]) {
        const clip = compileClip(ankleLockEntryClip(distance));
        for (let t = 0; t <= clip.duration; t += 1 / 60) {
            const sample = sampleClip(clip, t).tracks;
            assert.equal(sample.defender.transform.x, distance, `receiver moved at ${t}`);
        }
        assert.equal(sampleClip(clip, 0).tracks.attacker.transform.x, 0, 'he starts where he stood');
        const grab = sampleClip(clip, 0.3).tracks, held = sampleClip(clip, 0.6).tracks;
        assert.equal(grab.defender.pose.lift, -110, 'receiver stays down until the grab');
        assert.ok(grab.defender.pose.lLeg < 0.1, 'trapped leg stays down until the grab');
        assert.ok(held.defender.pose.lift > grab.defender.pose.lift, 'lift follows the grab');
        assert.notEqual(grab.attacker.transform.x, held.attacker.transform.x, 'attacker follows the boot up');
    }
});


test('both near legs clear both torsos, including the receiver trunks, in either facing', () => {
    const names = ['torso', 'trunks', 'head', 'nearThigh', 'nearShin', 'farThigh', 'farShin', 'nearUpArm', 'nearForearm', 'farUpArm', 'farForearm'];
    for (const facing of [1, -1]) {
        const actor = f => ({ facing: f, skeleton: {
            lChannelSide: () => 'near',
            ...Object.fromEntries(names.map((n, i) => [n, { depth: 12 + i * 0.00001 }])),
        } });
        const actors = { attacker: actor(facing), defender: actor(-facing) };
        const depths = clipLayerDepths(ankleLockV2Clip, 1, actors);
        const d = (role, part) => depths.get(actors[role].skeleton[part]) ?? actors[role].skeleton[part].depth;
        for (const role of ['attacker', 'defender']) for (const part of ['nearThigh', 'nearShin']) {
            for (const torso of ['attacker', 'defender']) for (const image of ['torso', 'trunks']) {
                assert.ok(d(role, part) > d(torso, image), `${role}.${part} buried under ${torso}.${image}`);
            }
        }
    }
});


test('T2.2f: the downed man\'s far arm is behind his torso, his near arm in front, in either facing; the attacker keeps his own order', () => {
    const names = ['torso', 'trunks', 'head', 'nearThigh', 'nearShin', 'farThigh', 'farShin', 'nearUpArm', 'nearForearm', 'farUpArm', 'farForearm'];
    for (const facing of [1, -1]) for (const lSide of ['near', 'far']) {
        // a rig whose l channel is drawn far (lChannelSide) must still get the far-named art behind his torso
        const actor = f => ({ facing: f, skeleton: {
            lChannelSide: () => lSide,
            ...Object.fromEntries(names.map((n, i) => [n, { depth: 12 + i * 0.00001 }])),
        } });
        const actors = { attacker: actor(facing), defender: actor(-facing) };
        const depths = clipLayerDepths(ankleLockV2Clip, 1, actors);
        const d = (role, part) => depths.get(actors[role].skeleton[part]) ?? actors[role].skeleton[part].depth;
        for (const p of ['UpArm', 'Forearm']) {
            assert.ok(d('defender', `far${p}`) < d('defender', 'torso'), `defender far ${p} is in front of his torso (${facing}, l ${lSide})`);
            assert.ok(d('defender', `far${p}`) < d('defender', 'trunks'), `defender far ${p} is in front of his trunks (${facing}, l ${lSide})`);
            assert.ok(d('defender', `near${p}`) > d('defender', 'torso'), `defender near ${p} is behind his torso (${facing}, l ${lSide})`);
        }
        assert.ok(d('attacker', 'farUpArm') < d('attacker', 'torso'), 'attacker far arm behind his torso');
        assert.ok(d('attacker', 'nearForearm') > d('defender', 'nearShin'), 'attacker near forearm over the boot');
    }
});

test('T2.2f/T2.3: he is past the man\'s boots from the end of the lead-in to the last frame, at every entry separation (the lying man never moves)', () => {
    for (const distance of [50, 70, 150, 210]) {
        const clip = compileClip(ankleLockEntryClip(distance));
        const x = t => sampleClip(clip, t).tracks.attacker.transform.x;
        // hips-to-hips gap he stands at: at least the grab gap from the lead-in's end, at the grab and at the last frame; in close for the hold
        for (const t of [LEAD_IN, 0.3, clip.duration]) assert.ok(distance - x(t) >= GRAB_GAP - 1e-9, `hips gap ${distance - x(t)} at ${t} s with entry ${distance}`);
        assert.ok(distance - x(1.5) < 100, 'he is in close for the hold');
    }
});

test('T2.3: no frame moves his hips faster than the release does, even at the closest entry (no teleport on frame 1)', () => {
    const stepMax = (clip, from, to) => {
        let worst = 0;
        for (let t = from; t + 1 / 60 <= to + 1e-9; t += 1 / 60) worst = Math.max(worst, Math.abs(sampleClip(clip, t + 1 / 60).tracks.attacker.transform.x - sampleClip(clip, t).tracks.attacker.transform.x));
        return worst;
    };
    for (const distance of [50, 70, 150, 210]) {
        const clip = compileClip(ankleLockEntryClip(distance));
        const release = stepMax(clip, 2.7, clip.duration), lead = stepMax(clip, 0, 0.45);
        assert.ok(lead <= release + 1e-9, `entry ${distance}: lead-in step ${lead.toFixed(2)} px/frame vs the release's ${release.toFixed(2)}`);
        assert.ok(stepMax(clip, 0, clip.duration) <= release + 1e-9, `entry ${distance}: some frame steps faster than the release`);
    }
});

test('T2.3: the sell. Head up on each squeeze, the near arm reaches, slaps, reaches; the free knee only gains flex; rest at both ends of the hold; the hips and the held leg do not move', () => {
    const keys = ankleLockV2Clip.tracks.defender.keyframes;
    const at = t => sampleClip(compileClip(ankleLockV2Clip), t).tracks.defender.pose;
    const squeezes = ankleLockV2Clip.events.filter(e => e.type === 'squeeze').map(e => e.at);
    assert.equal(squeezes.length, 3);
    for (const sq of squeezes) {
        const peak = at(sq + 0.08), calm = at(sq - 0.3 < 0.6 ? 0.6 : sq - 0.3);
        assert.ok(peak.bend >= 0.3 && peak.bend > calm.bend + 0.25, `head up at squeeze ${sq}: bend ${peak.bend}`);
    }
    assert.ok(at(1.26).lArm > 2 && at(2.46).lArm > 2, 'the near arm reaches overhead for the rope on the first and third squeeze');
    assert.ok(at(1.96).lArm > 2.7 && at(1.8).lArm < 2 && at(1.8).lArm > 1.2, 'the near arm swings down past his head onto the mat on the second');
    for (const k of keys.filter(k => k.at >= 0.6 && k.at <= 2.8)) {
        const flex = k.pose.rLeg - k.pose.rShin;
        assert.ok(flex >= 0.1 && flex <= 2.4, `free knee flex ${flex.toFixed(2)} at ${k.at} stays bent the proper way and under its limit`);
        assert.equal(k.pose.lLeg, 1.45, 'the held leg stays up while the hands hold it');
        assert.equal(k.pose.lift, -70, 'his hips stay where they were');
    }
    for (const t of [0.6, 2.8]) assert.ok(at(t).bend === 0 && at(t).lArm < 0.1, `rest at ${t}`);
});

test('T2.6: the downed man\'s lShin wears ankleTwist from mid-lift to the foot falling, base at the ends; it resolves to the trapped (lLeg) shin', async () => {
    const { resolveSemanticSlots } = await import('../src/rig/partVariants.js');
    const keys = ankleLockV2Clip.tracks.defender.keyframes;
    const worn = keys.filter(k => k.parts?.lShin === 'ankleTwist').map(k => k.at);
    assert.ok(Math.min(...worn) === 0.45 && Math.max(...worn) >= 2.8 && Math.max(...worn) < 2.95, `worn keys ${worn}`);
    for (const k of keys.filter(k => k.at < 0.45 || k.at >= 2.95)) assert.equal(k.parts.lShin, 'base', `key ${k.at}`);
    assert.deepEqual(resolveSemanticSlots({ lShin: 'ankleTwist' }, 1, null, 'near'), { nearShin: 'ankleTwist' });
    assert.deepEqual(resolveSemanticSlots({ lShin: 'ankleTwist' }, -1, null, 'far'), { farShin: 'ankleTwist' });
});
