// Dense diagnostic for cohesive-body-rig-binding Phase C (torso sockets —
// see COHESIVE_BODY_RIG_BLUEPRINT.md). Unlike limbs, the torso doesn't
// rotate in upright mode (angle fixed at 0), so there's no angle dimension
// to sweep there -- but it DOES rotate through the get-up sequence
// (g.torso varies 1.62..PI). This sweeps that continuously (not just the 4
// named samples joint_attachment_audit.mjs checks) to see whether
// neck/shoulder/hip ink-gap coverage holds up, the same way a dense sweep
// caught the elbow bug and confirmed the knee wasn't one. As of 2026-07-25
// this passes comfortably for both characters (worst case George's neck at
// 1.00px) -- confirms the existing torso attachment has no hidden
// pose-dependent drift, independent of whether shoulders/neck are rooted
// via the formula chain or the rigProfile.sockets mechanism (both produce
// identical output -- see AI_HANDOFF.md's Phase C entry).
//
//   node tools/debug/torso_socket_sweep.mjs [george|thesz]

import { launch } from './harness.mjs';

const CHAR = process.argv[2] || 'george';
const MAX_INK_GAP = 2.5;
const TS = [];
for (let t = 0; t <= 1.001; t += 0.02) TS.push(Math.round(t * 1000) / 1000);

process.env.WFM_P1 = CHAR;
process.env.WFM_P2 = CHAR === 'george' ? 'thesz' : 'george';
const h = await launch();
await h.page.waitForTimeout(300);

const result = await h.page.evaluate(async ({ ts }) => {
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

    const JOINTS = {
        neck:         ['torso', 'head'],
        farShoulder:  ['torso', 'farUpArm'],
        nearShoulder: ['torso', 'nearUpArm'],
        farHip:       ['torso', 'farThigh'],
        nearHip:      ['torso', 'nearThigh'],
    };

    const out = [];
    for (const facing of [1, -1]) {
        w.facing = facing;
        for (const t of ts) {
            w.state = 'gettingUp';
            w.riseT = t;
            w.draw();
            const sk = w.skeleton;
            const row = { facing, t };
            for (const [name, [pName, cName]] of Object.entries(JOINTS)) {
                const joint = sk.jointAttachmentPoints[name];
                row[name] = joint ? gap(sk[pName], sk[cName], joint) : null;
            }
            out.push(row);
        }
    }
    return out;
}, { ts: TS });

await h.close();
console.log(`Character: ${CHAR}`);
const names = ['neck', 'farShoulder', 'nearShoulder', 'farHip', 'nearHip'];
const maxes = {};
let worst = null;
for (const name of names) maxes[name] = -Infinity;
for (const r of result) {
    for (const name of names) {
        if (r[name] > maxes[name]) maxes[name] = r[name];
    }
    const rowMax = Math.max(...names.map(n => r[n]));
    if (!worst || rowMax > worst.max) worst = { ...r, max: rowMax };
}
for (const name of names) console.log(`${name}: max ink gap ${maxes[name].toFixed(2)}px`);
console.log(`worst sample: facing ${worst.facing}, t ${worst.t}, max ${worst.max.toFixed(2)}px`);
const pass = names.every(n => maxes[n] <= MAX_INK_GAP);
console.log(pass ? `PASS -- within ${MAX_INK_GAP}px across the dense get-up sweep.` : `FAIL -- exceeds ${MAX_INK_GAP}px somewhere.`);
process.exit(pass ? 0 : 1);
