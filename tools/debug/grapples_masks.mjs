// PLAN_GRAPPLES T1.6: silhouette overlap between the two men. Part quads have transparent margins, so each man is redrawn alone into a
// 2D canvas from the parts' world matrices (same maths as Phaser's sprite batch: flipX mirrors the pixels inside the quad) and the two
// opaque masks are ANDed. Pixels are game px.
//   await page.evaluate(INSTALL_MASKS); then in the page: window.__maskOverlap(sc.w1, sc.w2, wantImage)
// Returns { below, belowBody, torso, above, total, belt, image? }: `below` = overlap under the belt of either man (belt = that man's hip
// height); `belowBody` = the part of it with a leg or pelvis in it, which D12 forbids (the rest is hand on hand at belt height);
// `torso` = torso image on torso image at any height, `above` = the rest (arms, heads). image = red a, blue d, white overlap under the
// belt, yellow torso on torso, green above.
export const INSTALL_MASKS = () => {
    const PAD = 240, TOP = 340, BOTTOM = 70;
    const canvases = [0, 1].map(() => document.createElement('canvas'));
    const draw = (ctx, w, ox0, oy0, only) => {
        for (const img of w.skeleton._parts) {
            if (!img.visible || img.alpha <= 0 || !img.frame) continue;
            if (only && !only(img)) continue;
            const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
            ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - ox0, m.ty - oy0);
            ctx.translate(-img.originX * fw, -img.originY * fh);
            if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
            if (img.flipY) { ctx.translate(0, fh); ctx.scale(1, -1); }
            ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        }
    };
    const maskOf = (i, w, ox0, oy0, cw, ch, only) => {
        const c = canvases[i];
        if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch);
        draw(ctx, w, ox0, oy0, only);
        const px = ctx.getImageData(0, 0, cw, ch).data, out = new Uint8Array(cw * ch);
        for (let k = 0; k < out.length; k++) out[k] = px[k * 4 + 3] > 128 ? 1 : 0;
        return out;
    };
    window.__maskOverlap = (a, d, wantImage = false) => {
        const ox0 = Math.floor(Math.min(a.x, d.x) - PAD), oy0 = Math.floor(Math.min(a.y, d.y) - TOP);
        const cw = Math.ceil(Math.abs(a.x - d.x) + 2 * PAD), ch = TOP + BOTTOM;
        const A = maskOf(0, a, ox0, oy0, cw, ch), D = maskOf(1, d, ox0, oy0, cw, ch);
        const At = maskOf(0, a, ox0, oy0, cw, ch, (i) => i === a.skeleton.torso), Dt = maskOf(1, d, ox0, oy0, cw, ch, (i) => i === d.skeleton.torso);
        const bodyOf = (w) => { const sk = w.skeleton, arms = [sk.nearUpArm, sk.farUpArm, sk.nearForearm, sk.farForearm, sk.nearHand, sk.farHand, sk.head]; return (i) => !arms.includes(i); };
        const Ab = maskOf(0, a, ox0, oy0, cw, ch, bodyOf(a)), Db = maskOf(1, d, ox0, oy0, cw, ch, bodyOf(d));
        const hip = (w) => { const p = w.skeleton.jointAttachmentPoints; return (p.nearHip.y + p.farHip.y) / 2 - oy0; };
        const belt = Math.min(hip(a), hip(d));
        let below = 0, belowBody = 0, torso = 0, above = 0;
        const out = wantImage ? new ImageData(cw, ch) : null;
        for (let y = 0, k = 0; y < ch; y++) for (let x = 0; x < cw; x++, k++) {
            const both = A[k] && D[k], tt = At[k] && Dt[k], low = y >= belt;
            if (both && low) { below++; if (Ab[k] || Db[k]) belowBody++; }
            if (tt) torso++;
            if (both && !low && !tt) above++;
            if (out && (A[k] || D[k])) {
                const c = both ? (low ? [255, 255, 255] : tt ? [255, 230, 0] : [60, 220, 90]) : A[k] ? [190, 50, 50] : [50, 90, 200];
                out.data.set([c[0], c[1], c[2], 255], k * 4);
            }
        }
        const res = { below, belowBody, torso, above, total: below + torso + above, belt: +(belt + oy0).toFixed(1) };
        if (out) { const c = document.createElement('canvas'); c.width = cw; c.height = ch; c.getContext('2d').putImageData(out, 0, 0); res.image = c.toDataURL('image/png'); }
        return res;
    };
};

// The worst sample of a run (below + torso, then above) out of rows carrying `mask`; saveTo(dataUrl) writes its image.
export function worstMask(rows) {
    const s = rows.filter(r => r.mask);
    if (!s.length) return null;
    const key = (m) => (m.belowBody + m.torso) * 1e9 + m.below * 1e4 + m.above;
    const w = s.reduce((x, y) => (key(y.mask) > key(x.mask) ? y : x));
    const { image, ...rest } = w.mask;
    return { ...rest, frame: w.i, phase: w.g?.phase ?? null, samples: s.length, image };
}
