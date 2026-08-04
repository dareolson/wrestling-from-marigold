// Measures, for Lou's near+far upper arm across several arm angles and both
// facings, which upper-arm texels are INTERNAL (torso ink directly behind the
// frontmost arm pixel) vs silhouette (background behind). Reports the internal
// row span and, among the arm's DARK outline texels, which are internal (the
// circular-pad ring) vs true silhouette. This bounds the proximal band whose
// dark outline must be recoloured to skin so the deltoid merges into the torso.

import { launch } from './harness.mjs';

process.env.WFM_P1 = 'thesz';
process.env.WFM_P2 = 'george';
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
    function sample(img, wx, wy) {
        if (!img?.texture || img.texture.key === 'sk_pixel') return null;
        const dx = wx - img.x, dy = wy - img.y;
        const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        const lx = c * dx + s * dy, ly = -s * dx + c * dy;
        let u = lx / img.displayWidth + img.originX;
        const v = ly / img.displayHeight + img.originY;
        if (img.flipX) u = 1 - u;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
        const f = img.frame;
        const col = Math.max(0, Math.min(f.cutWidth - 1, Math.floor(u * f.cutWidth)));
        const row = Math.max(0, Math.min(f.cutHeight - 1, Math.floor(v * f.cutHeight)));
        const p = px(img); const i = ((f.cutY + row) * p.width + (f.cutX + col)) * 4;
        return { a: p.data[i + 3], r: p.data[i], g: p.data[i + 1], b: p.data[i + 2], col, row };
    }
    function opaque(img, wx, wy) { const s = sample(img, wx, wy); return s && s.a >= 32; }

    const out = {};
    const ANGLES = { lowered: 0, forward: 0.9, horizontal: 1.4, overhead: 2.2 };
    for (const facing of [1, -1]) {
        for (const [tag, arm] of Object.entries(ANGLES)) {
            w.facing = facing; w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.walkPhase = 0;
            w.pose = { lLeg: 0, rLeg: 0, lArm: arm, rArm: arm, lean: 0, crouch: 0 };
            w.draw();
            const sk = w.skeleton;
            for (const side of ['near', 'far']) {
                const arm3 = side === 'near' ? sk.nearUpArm : sk.farUpArm;
                if (!arm3) continue;
                // scan the arm's world bbox
                const cN = Math.cos(arm3.rotation), sN = Math.sin(arm3.rotation);
                const halfW = arm3.displayWidth, halfH = arm3.displayHeight;
                let internalRows = [], darkInternal = [], darkSil = [];
                // iterate over arm texels by sampling a grid in world space around arm
                const R = Math.ceil(Math.hypot(halfW, halfH));
                for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
                    const wx = arm3.x + dx + 0.5, wy = arm3.y + dy + 0.5;
                    const sm = sample(arm3, wx, wy);
                    if (!sm || sm.a < 32) continue;
                    const behindTorso = opaque(sk.torso, wx, wy);
                    const isDark = Math.max(sm.r, sm.g, sm.b) < 80;
                    if (behindTorso) internalRows.push(sm.row);
                    if (isDark && behindTorso) darkInternal.push(sm.row);
                    if (isDark && !behindTorso) darkSil.push(sm.row);
                }
                const span = a => a.length ? [Math.min(...a), Math.max(...a)] : null;
                out[`${side}_${facing > 0 ? 'R' : 'L'}_${tag}`] = {
                    internalSpan: span(internalRows), internalCount: internalRows.length,
                    darkInternalSpan: span(darkInternal), darkInternalCount: darkInternal.length,
                    darkSilCount: darkSil.length,
                };
            }
        }
    }
    return out;
});
await h.close();
for (const [k, v] of Object.entries(res)) {
    console.log(`${k.padEnd(20)} internal rows ${JSON.stringify(v.internalSpan)} (${v.internalCount}) | dark-internal rows ${JSON.stringify(v.darkInternalSpan)} (${v.darkInternalCount}) | dark-silhouette ${v.darkSilCount}`);
}
