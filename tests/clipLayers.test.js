import test from 'node:test';
import assert from 'node:assert/strict';

import Skeleton from '../src/Skeleton.js';
import { compileClip, validateClip } from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import { limbParts, LAYER_TIE_STEP } from '../src/animation/clipLayers.js';
import { suplexClip } from '../src/animation/clips/suplex.js';

const image = () => ({ depth: null, setDepth(value) { this.depth = value; return this; } });
const PARTS = [
    'farForearm', 'farHand', 'farUpArm', 'farThigh', 'farShin', 'farBoot',
    'pelvisUnderlay', 'head', 'torso', 'trunks', 'pelvisOverlay',
    'nearThigh', 'nearShin', 'nearBoot', 'pelvisMask', 'nearHand', 'nearForearm', 'nearUpArm',
];

// Two rig kinds (Skeleton.lChannelSide): shipped rigs swap the l-channels to
// the far limbs facing left; authored-leg rigs stay near. The stay-near rig
// also takes _shinUnderThigh so limbs carry non-trivial internal offsets.
function skeleton(kind) {
    const sk = Object.fromEntries(PARTS.map(n => [n, image()]));
    if (kind === 'swap') sk._faceLeftOverrides = true;
    else { sk._authoredLegRig = true; sk._shinUnderThigh = true; }
    sk.lChannelSide = Skeleton.prototype.lChannelSide;
    sk.setPartVariants = () => {};
    return sk;
}

// A Wrestler stand-in whose draw() runs the real Skeleton.setDepth.
function wrestler(kind, facing, y = 360) {
    return {
        facing, x: 0, y, pose: {},
        skeleton: skeleton(kind),
        draw() { Skeleton.prototype.setDepth.call(this.skeleton, 12 + this.y * 0.03); },
    };
}

const snapshot = w => Object.fromEntries(PARTS.map(n => [n, w.skeleton[n].depth]));
const CHAIN = [['defender', 'rLeg'], ['attacker', 'lLeg'], ['defender', 'lLeg']];

function clip(extra = {}, id = 'layerProbe') {
    return {
        id, duration: 2,
        tracks: { attacker: { keyframes: [{ at: 0, pose: {} }] }, defender: { keyframes: [{ at: 0, pose: {} }] } },
        ...extra,
    };
}

function frame(runtime, a, d, dt = 0) {
    runtime.update(dt);
    a.draw();
    d.draw();
    runtime.afterDraw();
}

const CASES = [];
for (const aKind of ['swap', 'near']) for (const dKind of ['swap', 'near']) for (const aFacing of [1, -1]) {
    CASES.push({ aKind, dKind, aFacing });
}

test('a declared chain holds in both facings and on both rig kinds; limbs keep their internal offsets', () => {
    for (const { aKind, dKind, aFacing } of CASES) {
        const label = `${aKind}/${dKind} attacker facing ${aFacing}`;
        const a = wrestler(aKind, aFacing), d = wrestler(dKind, -aFacing);
        const actors = { attacker: a, defender: d };
        a.draw(); d.draw();
        const before = new Map(CHAIN.flatMap(([role, limb]) => limbParts(actors[role], limb).map(img => [img, img.depth])));

        const runtime = new MoveRuntime();
        runtime.register(clip({ layers: [{ from: 0.5, to: 1.5, order: CHAIN }] }));
        runtime.play('layerProbe', { attacker: a, defender: d });
        frame(runtime, a, d, 1.0);

        let previousTop = -Infinity;
        for (const [role, limb] of CHAIN) {
            const parts = limbParts(actors[role], limb);
            assert.equal(parts.length, 3, `${label}: ${role}.${limb} resolves to thigh, shin, boot`);
            const depths = parts.map(img => img.depth);
            assert.ok(Math.min(...depths) > previousTop, `${label}: ${role}.${limb} draws in front of the previous limb`);
            previousTop = Math.max(...depths);
            const low = Math.min(...parts.map(img => before.get(img)));
            const newLow = Math.min(...depths);
            for (const img of parts) {
                assert.ok(Math.abs((img.depth - newLow) - (before.get(img) - low)) < 1e-12, `${label}: ${role}.${limb} internal offset kept`);
            }
        }
    }
});

test('limbs resolve through lChannelSide: lLeg is far facing left only on a swapping rig', () => {
    const swapLeft = wrestler('swap', -1), nearLeft = wrestler('near', -1), right = wrestler('swap', 1);
    for (const w of [swapLeft, nearLeft, right]) w.draw();
    assert.deepEqual(limbParts(right, 'lLeg'), [right.skeleton.nearThigh, right.skeleton.nearShin, right.skeleton.nearBoot]);
    assert.deepEqual(limbParts(swapLeft, 'lLeg'), [swapLeft.skeleton.farThigh, swapLeft.skeleton.farShin, swapLeft.skeleton.farBoot]);
    assert.deepEqual(limbParts(swapLeft, 'rArm'), [swapLeft.skeleton.nearUpArm, swapLeft.skeleton.nearForearm, swapLeft.skeleton.nearHand]);
    assert.deepEqual(limbParts(nearLeft, 'lLeg'), [nearLeft.skeleton.nearThigh, nearLeft.skeleton.nearShin, nearLeft.skeleton.nearBoot]);
    assert.equal(limbParts(right, 'torso').length, 5);
});

test('unlisted parts keep their default depths', () => {
    for (const { aKind, dKind, aFacing } of CASES) {
        const a = wrestler(aKind, aFacing), d = wrestler(dKind, -aFacing);
        a.draw(); d.draw();
        const defaults = { attacker: snapshot(a), defender: snapshot(d) };
        const runtime = new MoveRuntime();
        runtime.register(clip({ layers: [{ from: 0, to: 2, order: CHAIN }] }));
        runtime.play('layerProbe', { attacker: a, defender: d });
        frame(runtime, a, d, 0.1);
        const listed = new Set(CHAIN.flatMap(([role, limb]) => limbParts({ attacker: a, defender: d }[role], limb)));
        let untouched = 0;
        for (const [role, w] of [['attacker', a], ['defender', d]]) {
            for (const n of PARTS) {
                if (listed.has(w.skeleton[n])) continue;
                assert.equal(w.skeleton[n].depth, defaults[role][n], `${role}.${n}`);
                untouched++;
            }
        }
        assert.equal(untouched, PARTS.length * 2 - 9);
    }
});

test('validation rejects a contradictory overlap, an unknown limb, a role without a track and a bad window', () => {
    const errorsOf = extra => validateClip(clip(extra)).errors.join('\n');
    assert.match(errorsOf({ layers: [
        { from: 0, to: 1, order: [['attacker', 'lLeg'], ['defender', 'torso']] },
        { from: 0.5, to: 1.5, order: [['defender', 'torso'], ['attacker', 'lLeg']] },
    ] }), /contradict/);
    // Three windows that only contradict together.
    assert.match(errorsOf({ layers: [
        { from: 0, to: 2, order: [['attacker', 'lLeg'], ['defender', 'torso']] },
        { from: 0.2, to: 2, order: [['defender', 'torso'], ['defender', 'head']] },
        { from: 0.4, to: 2, order: [['defender', 'head'], ['attacker', 'lLeg']] },
    ] }), /contradict/);
    // The same pair reversed in windows that never overlap is fine.
    assert.deepEqual(validateClip(clip({ layers: [
        { from: 0, to: 1, order: [['attacker', 'lLeg'], ['defender', 'torso']] },
        { from: 1, to: 2, order: [['defender', 'torso'], ['attacker', 'lLeg']] },
    ] })).errors, []);
    assert.match(errorsOf({ layers: [{ from: 0, to: 1, order: [['attacker', 'leftLeg'], ['defender', 'torso']] }] }), /limb "leftLeg"/);
    assert.match(errorsOf({ layers: [{ from: 0, to: 1, order: [['referee', 'lLeg'], ['defender', 'torso']] }] }), /role "referee" has no track/);
    assert.match(errorsOf({ layers: [{ from: 0, to: 3, order: [['attacker', 'lLeg'], ['defender', 'torso']] }] }), /from < to <= duration/);
    assert.match(errorsOf({ layers: [{ from: 0, to: 1, order: [['attacker', 'lLeg'], ['attacker', 'lLeg']] }] }), /twice/);
    assert.match(errorsOf({ layerTie: ['defender', 'referee'] }), /layerTie role "referee"/);
    assert.throws(() => compileClip(clip({ layers: [{ from: 0, to: 1, order: [['attacker', 'tail'], ['defender', 'torso']] }] })), /tail/);
});

test('layerTie resolves exact ties only', () => {
    for (const { aKind, dKind, aFacing } of CASES) {
        const label = `${aKind}/${dKind} attacker facing ${aFacing}`;
        const a = wrestler(aKind, aFacing), d = wrestler(dKind, -aFacing);
        a.draw(); d.draw();
        const defaults = { a: snapshot(a), d: snapshot(d) };
        const runtime = new MoveRuntime();
        runtime.register(clip({ layerTie: ['defender', 'attacker'] }));
        runtime.play('layerProbe', { attacker: a, defender: d });
        frame(runtime, a, d, 0.1);
        let ties = 0;
        for (const an of PARTS) for (const dn of PARTS) {
            const was = Math.sign(defaults.a[an] - defaults.d[dn]);
            const now = Math.sign(a.skeleton[an].depth - d.skeleton[dn].depth);
            if (was === 0) { ties++; assert.equal(now, 1, `${label}: tie ${an}/${dn} goes to the attacker`); }
            else assert.equal(now, was, `${label}: ${an}/${dn} order unchanged`);
        }
        assert.ok(ties > 0, `${label}: the probe has ties to break`);
        // The defender (index 0) is untouched; the attacker shifts by one tie step.
        assert.deepEqual(snapshot(d), defaults.d);
        for (const n of PARTS) assert.ok(Math.abs(a.skeleton[n].depth - defaults.a[n] - LAYER_TIE_STEP) < 1e-12);
    }
});

test('after cancel and after complete, the next draw restores default depths', () => {
    for (const ending of ['cancel', 'complete']) {
        const a = wrestler('swap', 1), d = wrestler('near', -1);
        a.draw(); d.draw();
        const defaults = { a: snapshot(a), d: snapshot(d) };
        const runtime = new MoveRuntime();
        runtime.register(clip({ layers: [{ from: 0, to: 2, order: CHAIN }], layerTie: ['defender', 'attacker'] }));
        const handle = runtime.play('layerProbe', { attacker: a, defender: d });
        frame(runtime, a, d, 1.0);
        assert.notDeepEqual(snapshot(a), defaults.a, 'layers applied while active');
        if (ending === 'cancel') runtime.cancel(handle);
        else frame(runtime, a, d, 5);
        frame(runtime, a, d, 0.016);
        assert.deepEqual(snapshot(a), defaults.a, `${ending}: attacker restored`);
        assert.deepEqual(snapshot(d), defaults.d, `${ending}: defender restored`);
    }
});

test('a clip without layers is byte-identical: the suplex keeps its depths', () => {
    const compiled = compileClip(suplexClip);
    assert.equal(compiled.layers, undefined);
    assert.equal(compiled.layerTie, undefined);
    const a = wrestler('swap', 1, 360), d = wrestler('near', -1, 360);
    const runtime = new MoveRuntime();
    runtime.register(compiled);
    runtime.play(compiled.id, { attacker: a, defender: d });
    for (let i = 0; i < 120; i++) {
        runtime.update(1 / 60);
        a.draw(); d.draw();
        const drawn = { a: snapshot(a), d: snapshot(d) };
        runtime.afterDraw();
        assert.deepEqual(snapshot(a), drawn.a);
        assert.deepEqual(snapshot(d), drawn.d);
    }
});
