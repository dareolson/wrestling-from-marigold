import test from 'node:test';
import assert from 'node:assert/strict';
import { contacts, resolveJointName, DEFAULT_TOL } from '../tools/move-critic/metrics.mjs';

// Hand-built trace: two 100px-tall actors, one frame per 0.5 s. The defender's
// shin runs (0,0)→(100,0) on whichever slot `lSide` makes `l`.
const actor = (joints, lSide, top = 0) => ({
    floorY: 100, facing: 1, lSide, joints,
    outline: { torso: [[0, top], [10, 100]] },
});
const trace = (attackerJoints, defenderLSide = 'near') => ({
    meta: { contacts: [], fps: 2 },
    frames: [0, 0.5, 1].map(at => ({
        at,
        actors: {
            attacker: actor(attackerJoints(at), 'near'),
            defender: actor({
                nearKnee: { x: 0, y: 0 }, nearAnkle: { x: 100, y: 0 },
                farKnee: { x: 0, y: 50 }, farAnkle: { x: 100, y: 50 },
            }, defenderLSide),
        },
    })),
});
const spec = extra => [{ role: 'attacker', source: 'lWrist', target: 'seg:lKnee-lAnkle', from: 0, to: 1, ...extra }];

test('seg: target measures to the nearest point of the segment, not a joint', () => {
    // 50px along the shin, 6px above it: 6px from the segment, 50px from either joint.
    const t = trace(() => ({ nearWrist: { x: 50, y: 6 } }));
    const [c] = contacts(t, spec());
    assert.equal(c.worstPx, 6);
    assert.equal(c.worstAt, 0);
    // Past the end of the segment it clamps to the endpoint.
    const past = trace(() => ({ nearWrist: { x: 130, y: 40 } }));
    assert.equal(contacts(past, spec())[0].worstPx, 50);
});

test('lAnkle resolves to nearAnkle when lSide is near, farAnkle otherwise', () => {
    assert.equal(resolveJointName('lAnkle', 'near'), 'nearAnkle');
    assert.equal(resolveJointName('lAnkle', 'far'), 'farAnkle');
    assert.equal(resolveJointName('rKnee', 'near'), 'farKnee');
    assert.equal(resolveJointName('rKnee', 'far'), 'nearKnee');
    assert.equal(resolveJointName('nearKnee', 'far'), 'nearKnee');
    assert.equal(resolveJointName('part:torso', 'far'), 'part:torso');

    const t = (lSide) => trace(() => ({ nearWrist: { x: 50, y: 6 }, farWrist: { x: 50, y: 56 } }), lSide);
    const onL = (lSide) => contacts(t(lSide), [{ role: 'attacker', source: 'lWrist', target: 'seg:lKnee-lAnkle', from: 0, to: 1 }])[0];
    assert.equal(onL('near').worstPx, 6);
    // Defender's l channel is far: its shin is at y=50, so the attacker's near wrist is 44 away.
    assert.equal(onL('far').worstPx, 44);
});

test('tol decides pass/fail and defaults to 8% of height; kind is reported', () => {
    const t = trace(() => ({ nearWrist: { x: 50, y: 6 } }));
    const loose = contacts(t, spec({ kind: 'purchase' }))[0];
    assert.equal(loose.tol, DEFAULT_TOL);
    assert.equal(loose.kind, 'purchase');
    const tight = contacts(t, spec({ tol: 0.05, kind: 'trap' }))[0];
    assert.equal(tight.pass, tight.worstFrac <= 0.05);
    assert.equal(tight.tol, 0.05);
    const far = trace(() => ({ nearWrist: { x: 50, y: 30 } }));
    assert.equal(contacts(far, spec({ tol: 0.05 }))[0].pass, false);
    assert.equal(contacts(far, spec({ tol: 0.5 }))[0].pass, true);
});
