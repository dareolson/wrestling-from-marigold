// Ground-truth sole probe: for thesz and george, standing idle and mid-gait,
// reports w.y (the sweep's matY), the ACTUAL lowest opaque leg pixel worldY
// (the visual sole), and the soleAnchorFrac-mapped point y. Tells us whether
// the feet visually sink below w.y (real grounding bug) or w.y is simply not
// the true mat line (reference bug).

import { launch } from './harness.mjs';

const CHAR = process.argv[2] || 'thesz';
process.env.WFM_P1 = CHAR;
process.env.WFM_P2 = CHAR === 'george' ? 'thesz' : 'george';
const h = await launch();
await h.page.waitForTimeout(400);

const res = await h.page.evaluate(async () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;
    const tp = new Map();
    function px(img) {
        const k = img.texture.key;
        if (tp.has(k)) return tp.get(k);
        const src = img.texture.getSourceImage();
        const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
        const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(src, 0, 0);
        const o = { data: c.getImageData(0, 0, cv.width, cv.height).data, width: cv.width, height: cv.height };
        tp.set(k, o); return o;
    }
    function opaque(img, wx, wy) {
        if (!img?.texture || img.texture.key === 'sk_pixel') return false;
        const dx = wx - img.x, dy = wy - img.y;
        const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        const lx = c * dx + s * dy, ly = -s * dx + c * dy;
        let u = lx / img.displayWidth + img.originX;
        const v = ly / img.displayHeight + img.originY;
        if (img.flipX) u = 1 - u;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
        const f = img.frame;
        const cx = Math.max(0, Math.min(f.cutWidth - 1, Math.floor(u * f.cutWidth)));
        const cy = Math.max(0, Math.min(f.cutHeight - 1, Math.floor(v * f.cutHeight)));
        const p = px(img); return p.data[((f.cutY + cy) * p.width + (f.cutX + cx)) * 4 + 3] >= 32;
    }
    function lowestPixel(imgs) {
        let maxY = -Infinity, atX = 0;
        for (const img of imgs) {
            if (!img?.visible || !img.texture || img.texture.key === 'sk_pixel') continue;
            // scan world bbox bottom-up
            const R = Math.ceil(Math.hypot(img.displayWidth, img.displayHeight));
            for (let dy = R; dy >= -R; dy--) {
                let found = false;
                for (let dx = -R; dx <= R; dx++) {
                    if (opaque(img, img.x + dx + 0.5, img.y + dy + 0.5)) { const wy = img.y + dy; if (wy > maxY) { maxY = wy; atX = img.x + dx; } found = true; }
                }
                if (found) break;
            }
        }
        return { maxY, atX };
    }

    const out = [];
    for (const [tag, moveBlend, phase] of [['idle', 0, 0], ['gait', 1, 2.304]]) {
        for (const facing of [1, -1]) {
            w.facing = facing; w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = moveBlend; w.walkPhase = phase;
            w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
            w.draw();
            const sk = w.skeleton;
            const legs = [sk.nearThigh, sk.farThigh, sk.nearShin, sk.farShin, sk.nearBoot, sk.farBoot].filter(Boolean);
            const low = lowestPixel(legs);
            let soleMap = null;
            const na = sk.nearShin?._soleAnchorFrac;
            if (na && sk.nearShinRenderDebug) {
                const rd = sk.nearShinRenderDebug;
                const p = sk._socketPoint(sk.nearShin, na.u, na.v, rd.x, rd.y, rd.angle, rd.s, rd.facing);
                soleMap = p.y;
            }
            out.push({ tag, facing, wy: w.y, lowestVisualSoleY: low.maxY, visualBelowWy: low.maxY - w.y, soleAnchorMappedY: soleMap, soleAnchorBelowWy: soleMap != null ? soleMap - w.y : null,
                shinBoxH: sk.nearShin?._texDims?.h, nearShinRD: sk.nearShinRenderDebug ? { s: sk.nearShinRenderDebug.s } : null });
        }
    }
    return { s: w.s, out };
});
await h.close();
console.log(`Character: ${CHAR}   w.s=${res.s}`);
for (const r of res.out) {
    console.log(`${r.tag} f${r.facing}: w.y=${r.wy.toFixed(1)} | visualSole ${r.visualBelowWy>=0?'+':''}${r.visualBelowWy.toFixed(2)} below w.y | soleAnchorMapped ${r.soleAnchorBelowWy!=null?(r.soleAnchorBelowWy>=0?'+':'')+r.soleAnchorBelowWy.toFixed(2):'n/a'} below w.y | shinBoxH=${r.shinBoxH}`);
}
