// Renders a tinted "who owns this pixel" map of Lou's neck: head-owned pixels
// GREEN, torso-owned pixels RED, everything else the real art — so we can see
// exactly which part paints the visible neck + the bezel, and where the torso
// neck stump is (to shave it without touching the head).
import { launch } from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUTDIR = process.env.WFM_OUTDIR || './tools/debug/shots/neckowner';
mkdirSync(OUTDIR, { recursive: true });
process.env.WFM_P1 = 'thesz'; process.env.WFM_P2 = 'george';
const h = await launch();
const page = h.page;
await page.waitForTimeout(500);

for (const facing of [1, -1]) {
    const clip = await page.evaluate((facing) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = sc.w1, other = sc.w2;
        if (other) { other.update = () => {}; other.x = w.x + 900; other.draw?.(); }
        w.update = () => {};
        try { const cam = sc.cameras.main; if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); } } catch {}
        for (const k of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[k]?.setVisible(false);
        for (const o of sc.children.list) if (o.texture && o.texture.key === 'scanlines') o.setVisible(false);
        w.facing = facing; w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.walkPhase = 0;
        w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
        w.draw();
        const sk = w.skeleton;
        const tp = new Map();
        function px(img) { const k = img.texture.key; if (tp.has(k)) return tp.get(k); const s = img.texture.getSourceImage(); const cv = document.createElement('canvas'); cv.width = s.width; cv.height = s.height; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(s, 0, 0); const o = { data: c.getImageData(0, 0, cv.width, cv.height).data, width: cv.width, height: cv.height }; tp.set(k, o); return o; }
        function op(img, wx, wy) { if (!img?.texture || img.texture.key === 'sk_pixel') return false; const dx = wx - img.x, dy = wy - img.y; const c = Math.cos(img.rotation), s = Math.sin(img.rotation); const lx = c * dx + s * dy, ly = -s * dx + c * dy; let u = lx / img.displayWidth + img.originX; const v = ly / img.displayHeight + img.originY; if (img.flipX) u = 1 - u; if (u < 0 || u >= 1 || v < 0 || v >= 1) return false; const f = img.frame; const cx = Math.max(0, Math.min(f.cutWidth - 1, Math.floor(u * f.cutWidth))); const cy = Math.max(0, Math.min(f.cutHeight - 1, Math.floor(v * f.cutHeight))); const p = px(img); return p.data[((f.cutY + cy) * p.width + (f.cutX + cx)) * 4 + 3] >= 32; }
        const g = sc.add.graphics().setDepth(99999);
        const neck = sk.jointAttachmentPoints.neck;
        const R = 40;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
            const wx = neck.x + dx + 0.5, wy = neck.y + dy + 0.5;
            const head = op(sk.head, wx, wy), torso = op(sk.torso, wx, wy);
            if (!head && !torso) continue;
            // frontmost: head draws over torso
            if (head) g.fillStyle(0x00ff66, 0.55); else g.fillStyle(0xff2222, 0.55);
            g.fillRect(wx - 0.5, wy - 0.5, 1, 1);
        }
        const cam = sc.cameras.main, wv = cam.worldView, cv = sc.game.canvas, r = cv.getBoundingClientRect();
        const sxr = r.width / wv.width, syr = r.height / wv.height;
        const x = r.left + (neck.x - 44 - wv.x) * sxr, y = r.top + (neck.y - 44 - wv.y) * syr;
        return { x: Math.max(0, x), y: Math.max(0, y), width: 88 * sxr, height: 88 * syr };
    }, facing);
    await page.waitForTimeout(30);
    await page.screenshot({ path: `${OUTDIR}/neck_${facing > 0 ? 'R' : 'L'}.png`, clip });
}
await h.close();
console.log('DONE', OUTDIR);
