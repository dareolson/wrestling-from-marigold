// PLAN_GRAPPLES T4c.4c: how many pixels of a man's FAR arm are drawn over his OWN torso right now (want 0). Rendered, not computed: the far arm's three
// parts (upper arm, forearm, hand) are each redrawn alone from their world matrices, ANDed with the torso's opaque mask, and counted only for a part whose
// draw depth is above the torso's (a part behind the torso is hidden there, so it isn't a miss). Game px.
//   await page.evaluate(INSTALL_FARARM); then in the page: window.__farArmOverTorso(w) -> { px, parts: { farUpArm, ... } }
export const INSTALL_FARARM = () => {
    const mask = (img, ox0, oy0, cw, ch) => {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (img.visible && img.alpha > 0 && img.frame) {
            const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
            ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - ox0, m.ty - oy0);
            ctx.translate(-img.originX * fw, -img.originY * fh);
            if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
            if (img.flipY) { ctx.translate(0, fh); ctx.scale(1, -1); }
            ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        }
        return ctx.getImageData(0, 0, cw, ch).data;
    };
    window.__farArmOverTorso = (w) => {
        const sk = w.skeleton, R = 260, cw = 2 * R, ch = 2 * R;
        // the far arm is the far-side parts (`far*`), whichever pose channel drives them in this facing
        const parts = ['farUpArm', 'farForearm', 'farHand'].map(n => [n, sk[n]]).filter(([, i]) => i);
        // centred on the torso, so a man flipped or lifted off his standing line is still inside the window
        const t = sk.torso, tm = t.getWorldTransformMatrix();
        const cx = Math.floor(tm.tx - R), cy = Math.floor(tm.ty - R);
        const T = mask(t, cx, cy, cw, ch), out = { px: 0, parts: {} };
        for (const [n, img] of parts) {
            if (!(img.depth > t.depth)) { out.parts[n] = 0; continue; }
            const A = mask(img, cx, cy, cw, ch); let k = 0;
            for (let i = 3; i < A.length; i += 4) if (A[i] > 128 && T[i] > 128) k++;
            out.parts[n] = k; out.px += k;
        }
        return out;
    };
};
