import test from 'node:test';
import assert from 'node:assert/strict';

import {
    certifyGetUpHandoff,
    DEFAULT_BUDGET,
    STRUCTURAL_CHAINS,
    anchorWorldPoint,
    certifyFacingSymmetry,
    certifyMotion,
    certifyPose,
    certifySoleGrounding,
    certifyVariantDrift,
    checkDepthOrder,
    classifyFinding,
    findNonFiniteTransforms,
    findReflectedParts,
    measureChain,
} from '../src/rig/certification.js';
import { solveAnchoredAttachment, solveTwoAnchorBinding } from '../src/rig/twoAnchorBinding.js';

const CANVAS = { w: 96, h: 96 };
const WRIST = { x: 48, y: 22 };
const WRIST_FRAC = { u: WRIST.x / CANVAS.w, v: WRIST.y / CANVAS.h };

function partFromBinding(binding, anchors) {
    return {
        visible: true,
        x: binding.x,
        y: binding.y,
        rotation: binding.rotation,
        originX: binding.originX,
        originY: binding.originY,
        displayWidth: binding.displayWidth,
        displayHeight: binding.displayHeight,
        flipX: binding.flipX,
        depth: 1,
        anchors,
    };
}

test('anchorWorldPoint inverts a real attachment binding back onto its world anchor', () => {
    for (const facing of [1, -1]) {
        for (const angle of [0, 0.6, -1.4, 2.9]) {
            const worldAnchor = { x: 310.5, y: 187.25 };
            const binding = solveAnchoredAttachment({
                canvas: CANVAS, anchor: WRIST, worldAnchor, angle, scale: 0.8, facing,
            });
            const recovered = anchorWorldPoint(partFromBinding(binding), WRIST_FRAC);
            assert.ok(Math.hypot(recovered.x - worldAnchor.x, recovered.y - worldAnchor.y) < 1e-9,
                `facing ${facing} angle ${angle} recovered ${JSON.stringify(recovered)}`);
        }
    }
});

test('anchorWorldPoint inverts a two-anchor limb binding at both of its anchors', () => {
    const canvas = { w: 110, h: 180 };
    const proximal = { x: 55, y: 24 };
    const distal = { x: 55, y: 154 };
    const worldProximal = { x: 200, y: 300 };
    const worldDistal = { x: 268, y: 361 };
    for (const facing of [1, -1]) {
        const binding = solveTwoAnchorBinding({ canvas, proximal, distal, worldProximal, worldDistal, facing });
        const part = partFromBinding(binding);
        const gotProximal = anchorWorldPoint(part, { u: proximal.x / canvas.w, v: proximal.y / canvas.h });
        const gotDistal = anchorWorldPoint(part, { u: distal.x / canvas.w, v: distal.y / canvas.h });
        assert.ok(Math.hypot(gotProximal.x - worldProximal.x, gotProximal.y - worldProximal.y) < 1e-9);
        assert.ok(Math.hypot(gotDistal.x - worldDistal.x, gotDistal.y - worldDistal.y) < 1e-9);
    }
});

// The regression this whole layer was built to catch. Centering an attachment
// on its quad instead of its authored anchor passed 205 unit tests, both
// validators and both rendered probes; it must never be silent again, and it
// must be catchable without launching a browser.
test('an attachment centred on its quad instead of its authored anchor is a measurable error', () => {
    const worldWrist = { x: 400, y: 250 };
    const honest = solveAnchoredAttachment({
        canvas: CANVAS, anchor: WRIST, worldAnchor: worldWrist, angle: 0.4, scale: 1, facing: 1,
    });
    const regressed = { ...honest, originX: 0.5, originY: 0.5 };

    const sample = joint => ({
        joints: { nearWrist: worldWrist },
        parts: {
            nearForearm: partFromBinding(honest, { distal: WRIST_FRAC }),
            nearHand: partFromBinding(joint, { proximal: WRIST_FRAC }),
        },
    });

    const chain = STRUCTURAL_CHAINS.find(entry => entry.joint === 'nearWrist');
    const good = measureChain(sample(honest), chain);
    assert.equal(good.status, 'measured');
    assert.ok(good.proximalErrorPx < DEFAULT_BUDGET.anchorErrorPx);

    const bad = measureChain(sample(regressed), chain);
    assert.equal(bad.status, 'measured');
    assert.ok(bad.proximalErrorPx > DEFAULT_BUDGET.anchorErrorPx,
        `expected a detectable anchor error, got ${bad.proximalErrorPx}`);
    assert.ok(certifyPose(sample(regressed)).some(finding => finding.kind === 'proximal-anchor-error'));
});

// flipY was load-bearing while grounded states rendered on the wrestler's back.
// That reflection is gone (2026-08-17) and findReflectedParts now rejects it
// outright, but anchorWorldPoint must still resolve a flipped part correctly:
// if it did not, an upside-down part would ALSO report a phantom anchor error
// and point the author at the wrong cause.
test('anchorWorldPoint mirrors v under flipY, exactly as it mirrors u under flipX', () => {
    const base = {
        visible: true, x: 100, y: 200, rotation: 0,
        originX: 0.5, originY: 0.25, displayWidth: 40, displayHeight: 80, depth: 1,
    };
    const frac = { u: 0.5, v: 0.75 };
    const upright = anchorWorldPoint({ ...base, flipY: false }, frac);
    const mirrored = anchorWorldPoint({ ...base, flipY: true }, frac);
    // v 0.75 sits 0.50 of the height below the 0.25 origin; mirrored to 0.25
    // it lands exactly on the origin row.
    assert.equal(upright.y, 200 + 0.5 * 80);
    assert.equal(mirrored.y, 200);
    // A vertical flip must not disturb the horizontal solve.
    assert.equal(upright.x, mirrored.x);
});

test('a chain the character cannot answer for is unmeasurable, never a pass', () => {
    const chain = STRUCTURAL_CHAINS.find(entry => entry.joint === 'nearWrist');
    const measurement = measureChain({
        joints: { nearWrist: { x: 1, y: 2 } },
        parts: {
            nearForearm: { visible: true, x: 0, y: 0, rotation: 0, originX: 0.5, originY: 0, displayWidth: 10, displayHeight: 10, anchors: null },
            nearHand: { visible: true, x: 0, y: 0, rotation: 0, originX: 0.5, originY: 0, displayWidth: 10, displayHeight: 10, anchors: null },
        },
    }, chain);
    assert.equal(measurement.status, 'unmeasurable');
    assert.match(measurement.reason, /no proximal binding anchor/);
    // And it must not manufacture a passing measurement out of nothing.
    assert.equal(measurement.proximalErrorPx, undefined);
});

test('every production joint including wrists and ankles has a structural chain', () => {
    const joints = STRUCTURAL_CHAINS.map(chain => chain.joint);
    for (const required of [
        'neck', 'nearShoulder', 'farShoulder', 'nearElbow', 'farElbow',
        'nearWrist', 'farWrist', 'nearHip', 'farHip',
        'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle',
    ]) {
        assert.ok(joints.includes(required), `${required} has no structural chain`);
    }
});

test('pelvis layers must bracket the thighs in depth', () => {
    const part = depth => ({ visible: true, depth });
    const ok = checkDepthOrder({
        parts: {
            pelvisUnderlay: part(1), farThigh: part(2), nearThigh: part(3), pelvisMask: part(4),
        },
    });
    assert.deepEqual(ok, []);

    // A middle-depth pelvis (the legacy overlay model) sits between the
    // thighs instead of bracketing them: the underlay is no longer behind
    // either thigh, and the mask no longer covers the near thigh root.
    const bad = checkDepthOrder({
        parts: {
            pelvisUnderlay: part(3.5), farThigh: part(2), nearThigh: part(3), pelvisMask: part(2.5),
        },
    });
    assert.deepEqual(
        bad.map(violation => `${violation.behind}<${violation.inFront}`).sort(),
        ['nearThigh<pelvisMask', 'pelvisUnderlay<farThigh', 'pelvisUnderlay<nearThigh'],
    );
});

test('non-finite rendered transforms are reported per slot', () => {
    const bad = findNonFiniteTransforms({
        parts: {
            nearShin: { visible: true, x: NaN, y: 10, rotation: 0, originX: 0.5, originY: 0, displayWidth: 4, displayHeight: 4 },
            farShin: { visible: true, x: 1, y: 2, rotation: Infinity, originX: 0.5, originY: 0, displayWidth: 4, displayHeight: 4 },
        },
        joints: { nearKnee: { x: 1, y: NaN } },
    });
    assert.ok(bad.includes('nearShin.x'));
    assert.ok(bad.includes('farShin.rotation'));
    assert.ok(bad.includes('joints.nearKnee'));
});

test('continuity finds a first-frame snap that finite endpoints would hide', () => {
    const series = values => values.map(value => ({ joints: {}, flex: { lElbow: value } }));
    // Seeded: travel spread across the tween.
    const seeded = certifyMotion(series([0, 0.2, 0.5, 0.9, 1.3, 1.6]));
    assert.deepEqual(seeded.findings, []);
    // Cold: the whole move lands on frame one, and every value is finite.
    const cold = certifyMotion(series([0, 1.6, 1.6, 1.6, 1.6, 1.6]));
    assert.ok(cold.findings.some(finding => finding.kind === 'first-frame-jump'));
});

test('continuity finds an endpoint that teleports between frames', () => {
    const { findings } = certifyMotion([
        { joints: { nearWrist: { x: 0, y: 0 } } },
        { joints: { nearWrist: { x: 400, y: 0 } } },
    ]);
    assert.ok(findings.some(finding => finding.kind === 'endpoint-discontinuity'));
});

test('facing symmetry catches an inverted bend without demanding a pixel mirror', () => {
    assert.deepEqual(certifyFacingSymmetry({ flex: { lElbow: 1.2 } }, { flex: { lElbow: 1.2 } }), []);
    const inverted = certifyFacingSymmetry({ flex: { lElbow: 1.2 } }, { flex: { lElbow: -1.2 } });
    assert.ok(inverted.some(finding => finding.kind === 'bend-inversion'));
});

test('a variant swap may move its contact point but never its structural anchor', () => {
    const sample = (wristX, contactX) => ({
        joints: { nearWrist: { x: wristX, y: 100 } },
        semanticAnchors: { 'nearHand.contact': { x: contactX, y: 120 } },
    });
    const options = { slot: 'nearHand', jointName: 'nearWrist', semanticName: 'nearHand.contact' };

    assert.deepEqual(
        certifyVariantDrift({ open: sample(200, 210), fist: sample(200, 224) }, options),
        [],
    );
    assert.ok(certifyVariantDrift({ open: sample(200, 210), fist: sample(203, 224) }, options)
        .some(finding => finding.kind === 'structural-anchor-drift'));
    // A swap where nothing moved at all never reached the screen — that is a
    // finding, not a clean pass.
    assert.ok(certifyVariantDrift({ open: sample(200, 210), fist: sample(200, 210) }, options)
        .some(finding => finding.kind === 'variant-inert'));
});

test('sole grounding asks for one planted foot, not two', () => {
    const sample = (near, far) => ({
        semanticAnchors: {
            'nearBoot.sole': { x: 10, y: near },
            'farBoot.sole': { x: 30, y: far },
        },
    });
    // Both planted.
    assert.deepEqual(certifySoleGrounding(sample(500, 500), { groundY: 500 }), []);
    // One planted, one chambered in the air — a knee lift, not a defect.
    assert.deepEqual(certifySoleGrounding(sample(500, 420), { groundY: 500 }), []);
    // Both floating.
    const floating = certifySoleGrounding(sample(460, 420), { groundY: 500 });
    assert.ok(floating.some(finding => finding.kind === 'no-planted-foot'));
    assert.equal(floating[0].aboveGroundPx, 40);
});

test('sole grounding catches a foot travelling through the mat', () => {
    const findings = certifySoleGrounding({
        semanticAnchors: { 'nearBoot.sole': { x: 10, y: 530 }, 'farBoot.sole': { x: 30, y: 500 } },
    }, { groundY: 500 });
    const penetration = findings.find(finding => finding.kind === 'sole-penetration');
    assert.ok(penetration);
    assert.equal(penetration.belowGroundPx, 30);
});

test('a character with no attachment-slot boots reports soles unmeasurable', () => {
    const findings = certifySoleGrounding({ semanticAnchors: {} }, { groundY: 500 });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].kind, 'sole-unmeasurable');
});

test('attribution routes each failure to the layer that owns it', () => {
    const geometry = { kind: 'proximal-anchor-error', joint: 'nearWrist' };
    // The compliant reference rig cannot have an art excuse.
    assert.equal(classifyFinding({ finding: geometry, isReference: true, renderPath: 'upright' }), 'architecture');
    // Reference fails too => nobody's art can fix it.
    assert.equal(classifyFinding({ finding: geometry, referenceFailed: true, characterIsCompliant: false, renderPath: 'upright' }), 'architecture');
    // Reference passes, character is legacy art => regenerate the art.
    assert.equal(classifyFinding({ finding: geometry, referenceFailed: false, characterIsCompliant: false, renderPath: 'upright' }), 'source-artwork');
    // Reference passes, character claims compliance => its anchors disagree with its ink.
    assert.equal(classifyFinding({ finding: geometry, referenceFailed: false, characterIsCompliant: true, renderPath: 'upright' }), 'binding-geometry');
    // Transport and animation-data failures are their own owners.
    assert.equal(classifyFinding({ finding: { kind: 'nonfinite-transform' }, referenceFailed: true, renderPath: 'upright' }), 'runtime-transport');
    assert.equal(classifyFinding({ finding: { kind: 'first-frame-jump' }, referenceFailed: true, renderPath: 'upright' }), 'animation-data');
    // A pose the rig never draws is a coverage gap, whatever else is true.
    assert.equal(classifyFinding({ finding: geometry, isReference: true, renderPath: 'unrigged' }), 'coverage-gap');
});

// ── Orientation: parts must not be reflected ─────────────────────────────────
//
// These pin the blind spot that let the grounded on-back render ship. That
// render reflected every assembled part across the mat axis AND mirrored the
// joint bookkeeping to match, so every anchor still coincided perfectly and
// certifyPose passed a body whose every PNG was upside down.

// A reflected part with its joints mirrored to match — exactly the shape of
// the defect. Anchors coincide; the artwork is upside down.
function reflectedSample() {
    const part = {
        visible: true, x: 100, y: 200, rotation: 0,
        originX: 0.5, originY: 0.5, displayWidth: 40, displayHeight: 80, depth: 1,
    };
    return {
        parts: {
            nearThigh: { ...part, flipY: true, originY: 0.5 },
            nearShin: { ...part, y: 280, flipY: true, originY: 0.5 },
            torso: { ...part, y: 120, flipY: false },
        },
        joints: {},
        semanticAnchors: {},
    };
}

test('a reflected part is reported even though its anchors are perfectly placed', () => {
    const sample = reflectedSample();
    // The precondition that made this invisible: nothing else in the kernel
    // objects. No non-finite values, no depth violation.
    assert.deepEqual(findNonFiniteTransforms(sample), []);
    assert.deepEqual(checkDepthOrder(sample), []);

    assert.deepEqual(findReflectedParts(sample).sort(), ['nearShin', 'nearThigh']);
    const findings = certifyPose(sample);
    const reflected = findings.filter(finding => finding.kind === 'reflected-part');
    assert.equal(reflected.length, 2);
    assert.ok(reflected.every(finding => /upside-down/.test(finding.detail)));
});

test('an unreflected sample reports nothing, and flipX is left alone', () => {
    const sample = reflectedSample();
    for (const part of Object.values(sample.parts)) { part.flipY = false; part.flipX = true; }
    assert.deepEqual(findReflectedParts(sample), [],
        'flipX is how facing is mirrored and must never be treated as a defect');
    assert.equal(certifyPose(sample).some(finding => finding.kind === 'reflected-part'), false);
});

test('invisible parts are not graded for orientation', () => {
    const sample = reflectedSample();
    for (const part of Object.values(sample.parts)) part.visible = false;
    assert.deepEqual(findReflectedParts(sample), []);
});

test('a reflected part is attributed to the render path, never to the artwork', () => {
    // No character's art can cause or fix a reflection, so it must not be
    // reported as source-artwork even on a legacy, non-compliant character.
    assert.equal(classifyFinding({
        finding: { kind: 'reflected-part' },
        referenceFailed: false,
        characterIsCompliant: false,
        renderPath: 'grounded',
    }), 'architecture');
});

// ── Get-up → upright handoff ─────────────────────────────────────────────────

test('the handoff gate measures the worst joint jump between the two render paths', () => {
    const last = { joints: { nearWrist: { x: 0, y: 0 }, nearAnkle: { x: 10, y: 0 } } };
    const first = { joints: { nearWrist: { x: 0, y: 30 }, nearAnkle: { x: 14, y: 0 } } };
    const result = certifyGetUpHandoff(last, first, { budgetPx: 40 });
    assert.equal(result.worst.joint, 'nearWrist');
    assert.equal(result.worst.jumpPx, 30);
    assert.deepEqual(result.findings, [], 'inside budget');
});

test('a handoff worse than its recorded baseline fails, naming joint, distance and budget', () => {
    const last = { joints: { nearAnkle: { x: 0, y: 0 } } };
    const first = { joints: { nearAnkle: { x: 0, y: 50 } } };
    const result = certifyGetUpHandoff(last, first, { budgetPx: 35.19, tolerancePx: 0.5 });
    assert.equal(result.findings.length, 1);
    assert.deepEqual(result.findings[0], {
        kind: 'getup-handoff-pop',
        joint: 'nearAnkle',
        jumpPx: 50,
        budgetPx: 35.19,
        tolerancePx: 0.5,
    });
    // The tolerance absorbs float noise and nothing more.
    assert.equal(certifyGetUpHandoff(last, { joints: { nearAnkle: { x: 0, y: 35.6 } } },
        { budgetPx: 35.19, tolerancePx: 0.5 }).findings.length, 0);
    assert.equal(certifyGetUpHandoff(last, { joints: { nearAnkle: { x: 0, y: 35.8 } } },
        { budgetPx: 35.19, tolerancePx: 0.5 }).findings.length, 1);
});

test('the handoff pop is animation data, never the character\'s artwork', () => {
    // Attribution matters more here than the number: the same art renders
    // cleanly on both sides of the seam, so blaming source art would send
    // someone to redraw a character that is not at fault.
    const finding = { kind: 'getup-handoff-pop', joint: 'nearWrist', jumpPx: 90, budgetPx: 45 };
    for (const characterIsCompliant of [true, false]) {
        assert.equal(classifyFinding({ finding, referenceFailed: false, characterIsCompliant, renderPath: 'getup' }), 'animation-data');
    }
});

test('a handoff with no comparable joint is a coverage gap, not a pass', () => {
    // The failure mode a budget check invites: nothing to measure, so nothing
    // fails, so the gate reports clean while asserting nothing.
    const result = certifyGetUpHandoff({ joints: {} }, { joints: {} }, { budgetPx: 10 });
    assert.equal(result.findings[0].kind, 'getup-handoff-unmeasurable');
    assert.equal(result.worst, null);
    assert.equal(classifyFinding({
        finding: result.findings[0], referenceFailed: false, characterIsCompliant: true, renderPath: 'getup',
    }), 'coverage-gap');
});
