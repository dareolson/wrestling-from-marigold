// Phase A diagnostic for the cohesive-body-rig-binding active assignment
// (COHESIVE_BODY_RIG_BLUEPRINT.md). Measures whether George's upper-arm
// PAINTED elbow anchor — the actual opaque ink content of upper_arm.png,
// not the display box it's rendered into — coincides with the true bone
// joint (Skeleton.jointAttachmentPoints.*Elbow) across a dense shoulder-
// angle sweep, both facings, near and far arm.
//
// This does not change rendering. It reports the mapping error the
// blueprint's acceptance criteria (<=0.5 world px, stable across rotation)
// require before any elbow binding code is written.
//
//   node tools/debug/elbow_anchor_sweep.mjs
//
// Method: find the upper-arm texture's own bottom-most run of opaque pixels
// (the artist's painted elbow edge) once, as a local (u, v) anchor. For each
// swept pose, read the Image's actual world transform (position, rotation,
// display size, origin, flip) Phaser used to render it this frame, map the
// fixed local anchor through that same transform, and compare against the
// true joint Skeleton.js already computes for the elbow.

import { launch } from './harness.mjs';

const MAX_MAPPING_ERROR = 0.5;
// Shoulder angle sweep — spans well past the widest authored pose (taunt
// overhead ~2.0) in both directions so the far end of the authored range is
// covered, not just idle.
const ANGLES = [];
for (let a = -1.8; a <= 2.4; a += 0.15) ANGLES.push(Math.round(a * 1000) / 1000);

process.env.WFM_P1 = 'george';
process.env.WFM_P2 = 'thesz';
const h = await launch();
await h.page.waitForTimeout(300);

const result = await h.page.evaluate(async ({ angles }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;

    function pixelsFor(img) {
        const source = img.texture.getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0);
        return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
    }

    // Bottom-most opaque row (the artist's painted elbow edge), and the
    // opacity-weighted x-centroid of that row's run — same alpha threshold
    // convention as joint_attachment_audit.mjs's opaqueAt.
    function findDistalAnchor(img) {
        const px = pixelsFor(img);
        for (let y = px.height - 1; y >= 0; y--) {
            let sumX = 0, sumA = 0;
            for (let x = 0; x < px.width; x++) {
                const a = px.data[(y * px.width + x) * 4 + 3];
                if (a >= 32) { sumX += x; sumA++; }
            }
            if (sumA > 0) {
                return { u: (sumX / sumA + 0.5) / px.width, v: (y + 0.5) / px.height };
            }
        }
        return { u: 0.5, v: 1 };
    }

    // Map a local (u, v) frame-fraction point (unflipped source convention)
    // through an Image's current world transform, matching Phaser's own
    // origin/rotation/flip application (inverse of joint_attachment_audit's
    // opaqueAt world->local transform).
    function localToWorld(img, u, v) {
        let uu = u;
        if (img.flipX) uu = 1 - uu;
        const lx = (uu - img.originX) * img.displayWidth;
        const ly = (v - img.originY) * img.displayHeight;
        const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        return { x: img.x + c * lx - s * ly, y: img.y + s * lx + c * ly };
    }

    w.state = 'standing';
    w.vx = 0; w.vy = 0; w.moveBlend = 1;

    const anchorNear = findDistalAnchor(w.skeleton.nearUpArm);
    const anchorFar = findDistalAnchor(w.skeleton.farUpArm);

    const samples = [];
    for (const facing of [1, -1]) {
        w.facing = facing;
        for (const a of angles) {
            w.pose = { lLeg: 0, rLeg: 0, lArm: a, rArm: a, lean: 0, crouch: 0 };
            w.draw();
            const sk = w.skeleton;
            const nearWorld = localToWorld(sk.nearUpArm, anchorNear.u, anchorNear.v);
            const farWorld = localToWorld(sk.farUpArm, anchorFar.u, anchorFar.v);
            const nearJoint = sk.jointAttachmentPoints.nearElbow;
            const farJoint = sk.jointAttachmentPoints.farElbow;
            samples.push({
                facing, angle: a,
                nearErr: Math.hypot(nearWorld.x - nearJoint.x, nearWorld.y - nearJoint.y),
                farErr: Math.hypot(farWorld.x - farJoint.x, farWorld.y - farJoint.y),
            });
        }
    }
    return { anchorNear, anchorFar, samples };
}, { angles: ANGLES });

await h.close();
delete process.env.WFM_P1;
delete process.env.WFM_P2;

console.log(`Measured painted elbow anchor (local frame fraction): near u=${result.anchorNear.u.toFixed(4)} v=${result.anchorNear.v.toFixed(4)}, far u=${result.anchorFar.u.toFixed(4)} v=${result.anchorFar.v.toFixed(4)}`);
console.log(`(v=1.0 would mean the current box-edge-is-the-joint assumption is exact)`);
console.log('');

let maxNear = -Infinity, maxFar = -Infinity, minNear = Infinity, minFar = Infinity;
for (const s of result.samples) {
    maxNear = Math.max(maxNear, s.nearErr);
    maxFar = Math.max(maxFar, s.farErr);
    minNear = Math.min(minNear, s.nearErr);
    minFar = Math.min(minFar, s.farErr);
}
console.log(`near elbow mapping error: min ${minNear.toFixed(3)}px  max ${maxNear.toFixed(3)}px  (${result.samples.length / 2} samples x2 facings)`);
console.log(`far  elbow mapping error: min ${minFar.toFixed(3)}px  max ${maxFar.toFixed(3)}px`);

const worst = result.samples.reduce((w, s) => Math.max(s.nearErr, s.farErr) > Math.max(w.nearErr, w.farErr) ? s : w);
console.log(`worst sample: facing ${worst.facing}, angle ${worst.angle}, nearErr ${worst.nearErr.toFixed(3)}px, farErr ${worst.farErr.toFixed(3)}px`);

const pass = maxNear <= MAX_MAPPING_ERROR && maxFar <= MAX_MAPPING_ERROR;
console.log('');
console.log(pass
    ? `PASS — both elbows stay within the blueprint's ${MAX_MAPPING_ERROR}px mapping-error acceptance criterion across the full sweep.`
    : `FAIL — mapping error exceeds the blueprint's ${MAX_MAPPING_ERROR}px acceptance criterion; a distal-anchor binding fix is needed.`);
process.exit(pass ? 0 : 1);
