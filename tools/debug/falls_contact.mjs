// PLAN_FALLS T4.5: the body-overlap measure for ground attacks. Both men's painted silhouettes (every visible part's texture drawn through its world transform, alpha >= 128, the way
// grapples_legs.mjs masks the trunks), and how many px the two overlap.
//
//   in page: await page.evaluate(INSTALL_CONTACT); then window.__contact(attackerWrestler, receiverWrestler) -> one record
//   { over, limb, miss, a, b, side, chest }
//     over   px where attacker and receiver both paint
//     limb   of those, px under the attacker's STRIKING ARM (upper arm + forearm + hand of the arm whose elbow is nearer the receiver's chest): allowed
//     miss   over - limb: the rest of his body inside the receiver's (the miss; 0 is a pass)
//     a, b   each silhouette's size in px (context: a miss of 300 px of a 9000 px body)
//     bodyBehind  true when every drawn part of the attacker outside the striking arm has a lower depth than every part of the receiver (he is wholly behind him, the receiver's
//            body occludes his: the overlap is occlusion, not one body drawn through the other); `limbOver` true when the striking arm's parts are all above the receiver's. `front`:
//            the overlap that is a real conflict, = miss unless bodyBehind, then 0. Report `miss` (raw 2D) and `front` side by side; `front` alone would let a depth swap hide an overlap.
//     chest  the contact point read off the receiver's drawn pose: 35% of the way from his neck to his hip midpoint (world px)
// px are screen px at the game's scale (s ~ 1). Overlap is 2D region intersection, not depth order: two bodies side by side at different depths do not count.
export const INSTALL_CONTACT = () => {
    const W = 1000, H = 560, cv = [0, 1, 2].map(() => document.createElement('canvas'));
    const draw = (ctx, img, ox, oy) => {
        const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
        ctx.save();
        ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - ox, m.ty - oy);
        ctx.translate(-img.originX * fw, -img.originY * fh);
        if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
        ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        ctx.restore();
    };
    const shown = (p) => { if (!p?.frame || !p.texture || !p.visible || !(p.alpha > 0)) return false; for (let c = p.parentContainer; c; c = c.parentContainer) if (!c.visible) return false; return true; };
    const mask = (i, imgs, ox, oy) => {
        const c = cv[i]; c.width = W; c.height = H;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, W, H);
        for (const img of imgs) if (shown(img)) draw(ctx, img, ox, oy);
        const px = ctx.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H);
        for (let k = 0; k < out.length; k++) out[k] = px[k * 4 + 3] >= 128 ? 1 : 0;
        return out;
    };
    const count = (m) => { let n = 0; for (let k = 0; k < m.length; k++) n += m[k]; return n; };
    const chestOf = (d) => {
        const p = d.skeleton.jointAttachmentPoints ?? {};
        const hip = p.nearHip && p.farHip ? { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 } : (p.nearHip ?? p.farHip);
        return p.neck && hip ? { x: p.neck.x + 0.35 * (hip.x - p.neck.x), y: p.neck.y + 0.35 * (hip.y - p.neck.y) } : { x: d.x, y: d.y };
    };
    window.__chestOf = chestOf;
    window.__contact = (a, d) => {
        const ska = a.skeleton, skd = d.skeleton, chest = chestOf(d);
        const ox = Math.floor(chest.x - W / 2), oy = Math.floor(Math.max(a.y, d.y) - H + 80);
        const pa = ska.jointAttachmentPoints ?? {};
        const dist = (side) => { const e = pa[`${side}Elbow`]; return e ? Math.hypot(e.x - chest.x, e.y - chest.y) : Infinity; };
        const side = dist('near') <= dist('far') ? 'near' : 'far';
        const A = mask(0, ska._parts, ox, oy), B = mask(1, skd._parts, ox, oy), L = mask(2, [ska[`${side}UpArm`], ska[`${side}Forearm`], ska[`${side}Hand`]].filter(Boolean), ox, oy);
        let over = 0, limb = 0;
        for (let k = 0; k < A.length; k++) if (A[k] && B[k]) { over++; if (L[k]) limb++; }
        // the silhouettes, for the page: attacker only red, receiver only blue, the striking arm on him green, the rest of him on the receiver white
        const im = document.createElement('canvas'); im.width = W; im.height = H;
        const ictx = im.getContext('2d'), id = ictx.createImageData(W, H);
        for (let k = 0; k < A.length; k++) {
            const o = k * 4; let c = null;
            if (A[k] && B[k]) c = L[k] ? [60, 220, 90] : [255, 255, 255]; else if (A[k]) c = [230, 70, 60]; else if (B[k]) c = [70, 120, 240];
            if (c) { id.data[o] = c[0]; id.data[o + 1] = c[1]; id.data[o + 2] = c[2]; id.data[o + 3] = 255; } else id.data[o + 3] = 255;
        }
        ictx.putImageData(id, 0, 0);
        const limbParts = [ska[`${side}UpArm`], ska[`${side}Forearm`], ska[`${side}Hand`]].filter(Boolean), dep = (imgs) => imgs.filter(shown).map(p => p.depth);
        const bodyDepths = dep(ska._parts.filter(p => !limbParts.includes(p))), recvDepths = dep(skd._parts), limbDepths = dep(limbParts);
        const bodyBehind = Math.max(...bodyDepths) < Math.min(...recvDepths), limbOver = limbDepths.length > 0 && Math.min(...limbDepths) > Math.max(...recvDepths);
        window.__contactBox = { ox, oy, W, H };
        window.__contactImage = () => im.toDataURL('image/png');
        return { over, limb, miss: over - limb, front: bodyBehind ? 0 : over - limb, bodyBehind, limbOver, a: count(A), b: count(B), side, chest: { x: +chest.x.toFixed(1), y: +chest.y.toFixed(1) } };
    };
};
