// Dense ink-gap sweep for knees (cohesive-body-rig-binding Phase B — see
// COHESIVE_BODY_RIG_BLUEPRINT.md), mirroring what elbow_anchor_sweep.mjs did
// for elbows -- but using the ink-GAP metric (parent/child painted-pixel
// proximity), not a single-anchor-point metric. Reason: an exploratory
// per-row anchor search found the thigh's ink has no single row that
// cleanly coincides with the true knee even at its best fit (~3-10px, vs.
// the elbow fix's 0.001px) -- because thighs are authored with deliberate
// overlap slack past the joint (the shin's own overlap covers it), unlike
// the upper arm which ends flush at the elbow. That means the two-anchor
// "one clean row = the joint" model doesn't apply to knees the way it did
// to elbows -- the right acceptance test for an overlap-style joint is
// ink-gap coverage, not anchor-point coincidence. This checks whether the
// *existing* mechanism already holds that up across a dense sweep (the
// elbow bug was invisible in the sparse named-pose audit too, so it's worth
// actually checking here rather than assuming). As of 2026-07-25 it passes
// at 0.00px for both characters -- no fix needed or made.
//
//   node tools/debug/knee_ink_gap_sweep.mjs [george|thesz]

import { launch } from './harness.mjs';

const CHAR = process.argv[2] || 'george';
const MAX_INK_GAP = 2.5;
const ANGLES = [];
for (let a = -1.5; a <= 1.5; a += 0.15) ANGLES.push(Math.round(a * 1000) / 1000);

process.env.WFM_P1 = CHAR;
process.env.WFM_P2 = CHAR === 'george' ? 'thesz' : 'george';
const h = await launch();
await h.page.waitForTimeout(300);

const result = await h.page.evaluate(async ({ angles }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;
    const texturePixels = new Map();

    function pixelsFor(img) {
        const key = img.texture.key;
        if (texturePixels.has(key)) return texturePixels.get(key);
        const source = img.texture.getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = source.width; canvas.height = source.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0);
        const pixels = { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
        texturePixels.set(key, pixels);
        return pixels;
    }
    function opaqueAt(img, wx, wy) {
        if (!img?.texture || img.texture.key === 'sk_pixel') return true;
        const dx = wx - img.x, dy = wy - img.y;
        const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        const lx = c * dx + s * dy, ly = -s * dx + c * dy;
        let u = lx / img.displayWidth + img.originX;
        const v = ly / img.displayHeight + img.originY;
        if (img.flipX) u = 1 - u;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
        const frame = img.frame;
        const px = Math.max(0, Math.min(frame.cutWidth - 1, Math.floor(u * frame.cutWidth)));
        const py = Math.max(0, Math.min(frame.cutHeight - 1, Math.floor(v * frame.cutHeight)));
        const pixels = pixelsFor(img);
        const sx = frame.cutX + px, sy = frame.cutY + py;
        return pixels.data[(sy * pixels.width + sx) * 4 + 3] >= 32;
    }
    function inkNear(img, joint, radius = 14) {
        const points = [];
        const x0 = Math.floor(joint.x - radius), x1 = Math.ceil(joint.x + radius);
        const y0 = Math.floor(joint.y - radius), y1 = Math.ceil(joint.y + radius);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            if ((x - joint.x) ** 2 + (y - joint.y) ** 2 > radius ** 2) continue;
            if (opaqueAt(img, x + 0.5, y + 0.5)) points.push([x, y]);
        }
        return points;
    }
    function gap(parentImg, childImg, joint) {
        const a = inkNear(parentImg, joint), b = inkNear(childImg, joint);
        let g = Infinity;
        for (const [ax, ay] of a) for (const [bx, by] of b) {
            const d = Math.hypot(ax - bx, ay - by);
            if (d < g) g = d;
        }
        return g;
    }

    const results = [];
    for (const facing of [1, -1]) {
        w.facing = facing;
        for (const a of angles) {
            w.state = 'standing';
            w.pose = { lLeg: a, rLeg: -a, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
            w.vx = 0; w.vy = 0; w.moveBlend = 0; // moveBlend=0 so pose-driven FK legs are used, not gait IK
            w.draw();
            const sk = w.skeleton;
            const nearGap = gap(sk.nearThigh, sk.nearShin, sk.jointAttachmentPoints.nearKnee);
            const farGap = gap(sk.farThigh, sk.farShin, sk.jointAttachmentPoints.farKnee);
            results.push({ facing, angle: a, nearGap, farGap });
        }
    }
    return results;
}, { angles: ANGLES });

await h.close();
console.log(`Character: ${CHAR}`);
let maxNear = -Infinity, maxFar = -Infinity, worst = null;
for (const r of result) {
    if (r.nearGap > maxNear) maxNear = r.nearGap;
    if (r.farGap > maxFar) maxFar = r.farGap;
    if (!worst || Math.max(r.nearGap, r.farGap) > Math.max(worst.nearGap, worst.farGap)) worst = r;
}
console.log(`near knee ink gap: max ${maxNear.toFixed(2)}px across ${result.length} samples`);
console.log(`far  knee ink gap: max ${maxFar.toFixed(2)}px`);
console.log(`worst: facing ${worst.facing}, angle ${worst.angle}, nearGap ${worst.nearGap.toFixed(2)}, farGap ${worst.farGap.toFixed(2)}`);
const pass = maxNear <= MAX_INK_GAP && maxFar <= MAX_INK_GAP;
console.log(pass ? `PASS -- within ${MAX_INK_GAP}px across the dense sweep.` : `FAIL -- exceeds ${MAX_INK_GAP}px somewhere in the dense sweep.`);
process.exit(pass ? 0 : 1);
