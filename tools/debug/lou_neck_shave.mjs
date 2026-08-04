// Finds the torso neck-stump pixels that are VISIBLE (frontmost torso, i.e. the
// head does NOT cover them) in the neck region, in BOTH facings, and maps them
// back to torso.png canvas coords. Prints the union bounding box + writes a mask
// image, so the torso stump can be shaved (the part that pokes out past the
// head's neck = the bezel + the extra neck length) without touching the head.
import { launch } from './harness.mjs';
import { writeFileSync } from 'node:fs';

process.env.WFM_P1 = 'thesz'; process.env.WFM_P2 = 'george';
const h = await launch();
await h.page.waitForTimeout(500);

const out = await h.page.evaluate(async () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;
    const tp = new Map();
    function px(img) { const k = img.texture.key; if (tp.has(k)) return tp.get(k); const s = img.texture.getSourceImage(); const cv = document.createElement('canvas'); cv.width = s.width; cv.height = s.height; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(s, 0, 0); const o = { data: c.getImageData(0, 0, cv.width, cv.height).data, width: cv.width, height: cv.height }; tp.set(k, o); return o; }
    function sample(img, wx, wy) { if (!img?.texture) return null; const dx = wx - img.x, dy = wy - img.y; const c = Math.cos(img.rotation), s = Math.sin(img.rotation); const lx = c * dx + s * dy, ly = -s * dx + c * dy; let u = lx / img.displayWidth + img.originX; const v = ly / img.displayHeight + img.originY; if (img.flipX) u = 1 - u; if (u < 0 || u >= 1 || v < 0 || v >= 1) return null; const f = img.frame; const col = Math.max(0, Math.min(f.cutWidth - 1, Math.floor(u * f.cutWidth))); const row = Math.max(0, Math.min(f.cutHeight - 1, Math.floor(v * f.cutHeight))); const p = px(img); const a = p.data[((f.cutY + row) * p.width + (f.cutX + col)) * 4 + 3]; return a >= 32 ? { col, row } : null; }
    function opaque(img, wx, wy) { return !!sample(img, wx, wy); }

    const W = 190, H = 260;
    const mask = new Uint8Array(W * H);
    let minR = 999, maxR = -1, minC = 999, maxC = -1, n = 0;
    for (const facing of [1, -1]) {
        w.facing = facing; w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.walkPhase = 0;
        w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 }; w.draw();
        const sk = w.skeleton;
        const neck = sk.jointAttachmentPoints.neck;
        // scan a box around the neck, DOWN to just below the neck joint (shoulder line ~ neck.y + 10)
        const R = 46;
        for (let dy = -R; dy <= 14; dy++) for (let dx = -R; dx <= R; dx++) {
            const wx = neck.x + dx + 0.5, wy = neck.y + dy + 0.5;
            const t = sample(sk.torso, wx, wy);
            if (!t) continue;
            if (opaque(sk.head, wx, wy)) continue; // covered by head → not visible → keep
            // visible torso pixel in the neck region → candidate to shave
            if (!mask[t.row * W + t.col]) { mask[t.row * W + t.col] = 1; n++; }
            minR = Math.min(minR, t.row); maxR = Math.max(maxR, t.row);
            minC = Math.min(minC, t.col); maxC = Math.max(maxC, t.col);
        }
    }
    // per-row col span of the mask (so we can see the shape)
    const rows = [];
    for (let r = minR; r <= maxR; r++) { let lo = 999, hi = -1, c = 0; for (let col = 0; col < W; col++) if (mask[r * W + col]) { lo = Math.min(lo, col); hi = Math.max(hi, col); c++; } if (c) rows.push([r, lo, hi, c]); }
    return { n, minR, maxR, minC, maxC, rows, mask: Array.from(mask) };
});
await h.close();

console.log(`visible torso neck-stump pixels (union both facings): ${out.n}`);
console.log(`canvas rows ${out.minR}..${out.maxR}, cols ${out.minC}..${out.maxC}`);
console.log('per-row [row lo hi count]:');
for (const r of out.rows) console.log('  ', r.join(' '));
writeFileSync(process.env.WFM_MASK || '/tmp/neckmask.json', JSON.stringify({ w: 190, h: 260, mask: out.mask }));
console.log('mask ->', process.env.WFM_MASK || '/tmp/neckmask.json');
