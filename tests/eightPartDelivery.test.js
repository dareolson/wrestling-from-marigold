import assert from 'node:assert/strict';
import test from 'node:test';

import {
    JOINTS,
    SHARED_SOURCE,
    jointsFor,
    resolveDelivery,
    sourceFor,
} from '../tools/wrestler-cutter/measure-joint-articulation.mjs';
import {
    FRONT3Q_DEPTH_ORDER,
    assemble,
    chainsFor,
    pivotOf,
} from '../tools/wrestler-cutter/render-articulation-proofs.mjs';

// THE EIGHT-PART DELIVERY, which is what the shipped rig can actually consume
// and what requirement 9 of Derek's 2026-09-15 brief specifies:
//
//   head  torso  upper_arm  thigh  near/far_forearm  near/far_shin
//
// Every measurement tool here was written against the TWELVE-part spelling, and
// a tool that cannot read a delivery does not say so in those words -- it says
// "missing landmarks", or silently places nothing, or counts 10/12 and names the
// two absent pelvis layers as missing files. All three of those describe a
// complete delivery as a broken one, and this notebook is full of sessions spent
// chasing a non-problem that a tool reported confidently.
//
// Two changed paths were proven only by a scratch synthetic landmark file before
// these tests existed. Both are pinned here against a fixture built to the real
// schema -- head with only headAnchorFrac, torso with only sockets, forearms and
// shins declaring a pivot and no distal anchor:
//
//   1. THE HIP FALLBACK. With no pelvis layer the thighs root on the torso's own
//      hip sockets. Rooting them on a layer that was not delivered leaves both
//      whole legs unplaced, and the renderer would not have complained.
//   2. SHARED-PAINTING RESOLUTION. One `upper_arm.png` fills both upper arms and
//      one `thigh.png` fills both thighs, which is how shipped Lou works: the
//      rig paints each once and places it twice with its own offsets.

function solidPart(w, h) {
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        rgba[i * 4] = 180;
        rgba[i * 4 + 1] = 150;
        rgba[i * 4 + 2] = 140;
        rgba[i * 4 + 3] = 255;
    }
    const alpha = new Uint8Array(w * h).fill(255);
    return { w, h, rgba, alpha };
}

/**
 * A real-schema EIGHT-part candidate: two shared paintings, no pelvis layer.
 *
 * Canvas sizes and landmark fractions are carried over from the twelve-part
 * fixture in articulationProofs.test.js so the two sets are comparable; what
 * differs is only the decomposition, which is the thing under test.
 */
function eightPartSet() {
    const parts = {
        head: solidPart(211, 279),
        torso: solidPart(266, 418),
        upper_arm: solidPart(167, 296),
        thigh: solidPart(148, 408),
        near_forearm: solidPart(179, 293),
        far_forearm: solidPart(181, 290),
        near_shin: solidPart(150, 300),
        far_shin: solidPart(152, 298),
    };
    const landmarks = {
        head: { headAnchorFrac: { u: 0.56872, v: 0.946237 }, headScale: 1 },
        torso: {
            sockets: {
                neck: { u: 0.567669, v: 0.107656 },
                nearShoulder: { u: 0.236842, v: 0.27512 },
                farShoulder: { u: 0.81203, v: 0.251196 },
                nearHip: { u: 0.315789, v: 0.889952 },
                farHip: { u: 0.793233, v: 0.866029 },
            },
        },
        upper_arm: {
            jointPivotFrac: { u: 0.670659, v: 0.155405 },
            distalAnchorFrac: { u: 0.347305, v: 0.918919 },
            sockets: { elbow: { u: 0.347305, v: 0.918919 } },
        },
        thigh: {
            jointPivotFrac: { u: 0.466216, v: 0.10049 },
            distalAnchorFrac: { u: 0.391892, v: 0.938725 },
            sockets: { knee: { u: 0.391892, v: 0.938725 } },
        },
        near_forearm: { jointPivotFrac: { u: 0.290503, v: 0.156997 } },
        far_forearm: { jointPivotFrac: { u: 0.292818, v: 0.158621 } },
        near_shin: { jointPivotFrac: { u: 0.395, v: 0.084706 } },
        far_shin: { jointPivotFrac: { u: 0.397, v: 0.085235 } },
    };
    return { parts, landmarks };
}

const deliveredNames = () => new Set(Object.keys(eightPartSet().parts));

// ── shared-painting resolution ──────────────────────────────────────────────

test('one painting fills both of its sides', () => {
    const { landmarks } = eightPartSet();
    const resolved = resolveDelivery(landmarks);

    for (const [slot, shared] of Object.entries(SHARED_SOURCE)) {
        assert.ok(resolved[slot], `${slot} is filled from ${shared}`);
        assert.equal(resolved[slot], landmarks[shared],
            `${slot} must BE the shared entry, not a copy that can drift from it`);
    }
    // Four logical slots, two delivered files.
    assert.deepEqual(
        ['near_upper_arm', 'far_upper_arm', 'near_thigh', 'far_thigh']
            .map((s) => Boolean(resolved[s])),
        [true, true, true, true]);
});

test('a split delivery keeps its own sides and is not overwritten', () => {
    // The fallback is `textures.farForearm ?? textures.forearm`, the runtime's
    // own idiom: a side-specific entry WINS. A twelve-part set that also happens
    // to ship a shared painting must keep its separately authored near and far,
    // or the resolver would quietly discard half the delivery.
    const split = {
        near_upper_arm: { jointPivotFrac: { u: 0.1, v: 0.1 } },
        far_upper_arm: { jointPivotFrac: { u: 0.9, v: 0.1 } },
        upper_arm: { jointPivotFrac: { u: 0.5, v: 0.5 } },
    };
    const resolved = resolveDelivery(split);
    assert.equal(resolved.near_upper_arm, split.near_upper_arm);
    assert.equal(resolved.far_upper_arm, split.far_upper_arm);
    assert.notEqual(resolved.near_upper_arm, split.upper_arm);
});

test('sourceFor names the file a logical slot is actually backed by', () => {
    const names = deliveredNames();
    assert.equal(sourceFor(names, 'near_upper_arm'), 'upper_arm');
    assert.equal(sourceFor(names, 'far_thigh'), 'thigh');
    assert.equal(sourceFor(names, 'near_forearm'), 'near_forearm',
        'a separately authored part backs itself');
    assert.equal(sourceFor(names, 'pelvis_underlay'), null,
        'a part nobody delivered has no source, and must say so rather than guess');
});

test('resolveDelivery does not invent a side that has no source at all', () => {
    // An empty delivery must stay empty. A resolver that manufactures entries
    // would turn "nothing was shipped" into "everything mapped".
    assert.deepEqual(resolveDelivery({}), {});
});

// ── the hip fallback ────────────────────────────────────────────────────────

test('with no pelvis layer the thighs hang from the torso', () => {
    const joints = jointsFor(deliveredNames());
    const hips = joints.filter((j) => j.joint === 'hip');
    assert.equal(hips.length, 2);
    for (const hip of hips) {
        assert.equal(hip.parent, 'torso',
            'shipped Lou has no pelvis layer; his trunks are painted into the torso');
    }
    // And the torso really does declare the sockets that decision depends on.
    const { landmarks } = eightPartSet();
    assert.ok(landmarks.torso.sockets.nearHip);
    assert.ok(landmarks.torso.sockets.farHip);
});

test('a delivered pelvis layer is still preferred over the torso', () => {
    // The twelve-part path must not regress: where a pelvis underlay exists it
    // is the more specific parent and stays the parent.
    const joints = jointsFor(new Set([...deliveredNames(), 'pelvis_underlay']));
    for (const hip of joints.filter((j) => j.joint === 'hip')) {
        assert.equal(hip.parent, 'pelvis_underlay');
    }
});

test('only the hips move; every other joint is untouched by the delivery', () => {
    const eight = jointsFor(deliveredNames());
    assert.equal(eight.length, JOINTS.length);
    for (const [i, spec] of JOINTS.entries()) {
        if (spec.joint === 'hip') continue;
        assert.deepEqual(eight[i], spec, `${spec.name} must not vary with the decomposition`);
    }
});

test('chainsFor makes the same decision the joint table does', () => {
    // Two modules, one rule. They were written separately and can drift apart
    // silently, because each produces a plausible figure on its own.
    const { parts } = eightPartSet();
    const chains = chainsFor(resolveDelivery(parts));
    assert.equal(chains.near_thigh.parent, 'torso');
    assert.equal(chains.far_thigh.parent, 'torso');

    const withPelvis = chainsFor(resolveDelivery({ ...parts, pelvis_underlay: solidPart(260, 216) }));
    assert.equal(withPelvis.near_thigh.parent, 'pelvis_underlay');
    assert.equal(withPelvis.far_thigh.parent, 'pelvis_underlay');

    // The arms never depended on a pelvis and must not start.
    assert.equal(chains.near_upper_arm.parent, 'torso');
    assert.equal(chains.near_forearm.parent, 'near_upper_arm');
});

// ── the two paths together, through the real assembler ──────────────────────

test('an eight-part set assembles a whole figure: both arms, both legs', () => {
    // The end-to-end claim. Before the shared-painting resolution this produced
    // a torso and a head and said nothing about the four limbs it had silently
    // dropped, because a part with no entry simply gets no placement.
    const { parts, landmarks } = eightPartSet();
    const { placements, unregistered } = assemble({ parts, landmarks });

    for (const slot of ['head', 'torso',
        'near_upper_arm', 'far_upper_arm', 'near_forearm', 'far_forearm',
        'near_thigh', 'far_thigh', 'near_shin', 'far_shin']) {
        assert.ok(placements[slot], `${slot} reached the canvas`);
    }
    assert.deepEqual(unregistered, [],
        'nothing in an eight-part delivery should lack a registration landmark');
});

test('the two legs are placed apart, not stacked on one hip', () => {
    // Both thighs come from ONE painting, so the only thing separating them is
    // that each registers to its own torso socket. If the shared resolution were
    // wired to a single hip they would render exactly on top of each other --
    // which looks like a one-legged figure, the same defect the profile view hit
    // in 2026-08-26 and spent three sessions on.
    const { parts, landmarks } = eightPartSet();
    const { placements } = assemble({ parts, landmarks });
    const gap = Math.abs(placements.near_thigh.x - placements.far_thigh.x);
    const torsoHipGap = Math.abs(
        landmarks.torso.sockets.nearHip.u - landmarks.torso.sockets.farHip.u) * parts.torso.w;
    assert.ok(gap > 1, `the thighs are ${gap.toFixed(1)}px apart, not stacked`);
    assert.ok(Math.abs(gap - torsoHipGap) < 2,
        `the gap (${gap.toFixed(1)}) is the torso's own hip span (${torsoHipGap.toFixed(1)})`);

    // Same for the shoulders, for the same reason.
    const armGap = Math.abs(placements.near_upper_arm.x - placements.far_upper_arm.x);
    assert.ok(armGap > 1, `the upper arms are ${armGap.toFixed(1)}px apart, not stacked`);
});

test('the shared thigh is placed twice from ONE image, not copied', () => {
    // Both sides must resolve to the same decoded buffer. A resolver that cloned
    // the image would double the memory and, worse, let the two sides diverge
    // under any later per-side edit -- which is precisely the split delivery the
    // rig cannot consume, arrived at by accident.
    //
    // Compared with `===` inside assert.ok rather than assert.equal: these are
    // multi-megabyte pixel buffers, and a failed assert.equal would try to
    // render a diff of them. The first draft of this test did exactly that and
    // the runner died of memory exhaustion instead of naming the defect.
    const { parts } = eightPartSet();
    const resolved = resolveDelivery(parts);
    assert.ok(resolved.near_thigh === resolved.far_thigh,
        'both thighs are the same painting');
    assert.ok(resolved.near_thigh === parts.thigh,
        'and that painting is the delivered thigh.png, not a copy of it');
    assert.ok(resolved.near_upper_arm === parts.upper_arm,
        'the upper arm likewise');
});

test('a shared painting keeps its own pivot on both sides', () => {
    const { parts, landmarks } = eightPartSet();
    const { placements } = assemble({ parts, landmarks });
    for (const side of ['near_thigh', 'far_thigh']) {
        assert.deepEqual(placements[side].pivot, landmarks.thigh.jointPivotFrac,
            `${side} pivots on the shared painting's own declared joint`);
    }
});

test('the shins hang off the knees of a shared thigh', () => {
    // The chain below a shared painting has to keep working: the knee socket is
    // declared once and serves both legs, so a shin registering to "the thigh"
    // rather than to "its own thigh's placement" would put both shins in one
    // place while the thighs correctly sat apart.
    const { parts, landmarks } = eightPartSet();
    const { placements } = assemble({ parts, landmarks });
    const shinGap = Math.abs(placements.near_shin.x - placements.far_shin.x);
    const thighGap = Math.abs(placements.near_thigh.x - placements.far_thigh.x);
    assert.ok(Math.abs(shinGap - thighGap) < 2,
        `the shins (${shinGap.toFixed(1)}px apart) follow their own thighs (${thighGap.toFixed(1)})`);
});

test('an eight-part figure is not reported as a short twelve-part one', () => {
    // The count a human reads. Every logical slot the depth order draws, except
    // the pelvis layers this decomposition correctly does not ship, must be
    // positioned -- so the honest denominator is ten, not twelve.
    const { parts, landmarks } = eightPartSet();
    const { placements } = assemble({ parts, landmarks });
    const expected = FRONT3Q_DEPTH_ORDER.filter((n) => !n.startsWith('pelvis'));
    const positioned = expected.filter((n) => placements[n]);
    assert.equal(positioned.length, expected.length,
        `${positioned.length}/${expected.length} positioned; an eight-part delivery is complete`);
});

test('a genuinely incomplete delivery is still reported as incomplete', () => {
    // The guard on all of the above: none of this may turn a real omission into
    // a pass. Drop the shared thigh and both legs must go unplaced.
    const { parts, landmarks } = eightPartSet();
    delete parts.thigh;
    delete landmarks.thigh;
    const { placements } = assemble({ parts, landmarks });
    assert.ok(!placements.near_thigh, 'no thigh painting means no near thigh');
    assert.ok(!placements.far_thigh, 'and no far thigh');
    assert.ok(!placements.near_shin, 'and the shins have nothing to hang from');
    assert.ok(placements.torso, 'while the rest of the figure still assembles');

    assert.equal(sourceFor(new Set(Object.keys(parts)), 'near_thigh'), null);
});
