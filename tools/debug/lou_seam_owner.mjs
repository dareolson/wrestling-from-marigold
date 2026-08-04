// Identifies which source texture owns each dark "seam" pixel around Lou's neck
// and near/far shoulder, in both facings. For every screen pixel near the joint
// whose composited colour is dark (a painted outline stroke), it inverse-maps
// the point into EACH candidate part (head/torso/upperArm) and reports the
// FRONTMOST opaque owner + that part's local canvas (col,row). This tells us
// exactly which PNG (and which rows/cols) paints the visible bezel, so the
// cleanup is surgical.
//
//   node tools/debug/lou_seam_owner.mjs

import { launch } from './harness.mjs';

process.env.WFM_P1 = 'thesz';
process.env.WFM_P2 = 'george';
const h = await launch();
const page = h.page;
await page.waitForTimeout(500);

const out = await page.evaluate(async () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;
    const texturePixels = new Map();
    function pixelsFor(img) {
        const key = img.texture.key;
        if (texturePixels.has(key)) return texturePixels.get(key);
        const source = img.texture.getSourceImage();
        const cv = document.createElement('canvas');
        cv.width = source.width; cv.height = source.height;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0);
        const px = { data: ctx.getImageData(0, 0, cv.width, cv.height).data, width: cv.width, height: cv.height };
        texturePixels.set(key, px); return px;
    }
    // returns {a, r,g,b, col,row} of the part's texel under world (wx,wy), or null
    function sampleAt(img, wx, wy) {
        if (!img?.texture || img.texture.key === 'sk_pixel') return null;
        const dx = wx - img.x, dy = wy - img.y;
        const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        const lx = c * dx + s * dy, ly = -s * dx + c * dy;
        let u = lx / img.displayWidth + img.originX;
        const v = ly / img.displayHeight + img.originY;
        if (img.flipX) u = 1 - u;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
        const frame = img.frame;
        const col = Math.max(0, Math.min(frame.cutWidth - 1, Math.floor(u * frame.cutWidth)));
        const row = Math.max(0, Math.min(frame.cutHeight - 1, Math.floor(v * frame.cutHeight)));
        const px = pixelsFor(img);
        const i = ((frame.cutY + row) * px.width + (frame.cutX + col)) * 4;
        const a = px.data[i + 3];
        if (a < 32) return null;
        return { a, r: px.data[i], g: px.data[i + 1], b: px.data[i + 2], col, row };
    }

    const report = {};
    for (const facing of [1, -1]) {
        w.facing = facing; w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.walkPhase = 0;
        w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
        w.draw();
        const sk = w.skeleton;
        // frontmost order: parts drawn later are on top. Probe near->far explicitly.
        const layers = {
            neck: [['head', sk.head], ['torso', sk.torso]],
            nearShoulder: [['nearUpArm', sk.nearUpArm], ['torso', sk.torso]],
            farShoulder: [['farUpArm', sk.farUpArm], ['torso', sk.torso]],
        };
        for (const [joint, parts] of Object.entries(layers)) {
            const p = sk.jointAttachmentPoints[joint];
            const R = 22;
            const owners = {};
            for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
                const wx = p.x + dx + 0.5, wy = p.y + dy + 0.5;
                // frontmost opaque part
                let front = null;
                for (const [nm, img] of parts) { const sm = sampleAt(img, wx, wy); if (sm) { front = { nm, sm }; break; } }
                if (!front) continue;
                const { r, g, b } = front.sm;
                const isDark = Math.max(r, g, b) < 80; // outline stroke
                if (!isDark) continue;
                const key = front.nm;
                owners[key] = owners[key] || { count: 0, rows: {}, cols: {} };
                owners[key].count++;
                owners[key].rows[front.sm.row] = (owners[key].rows[front.sm.row] || 0) + 1;
                owners[key].cols[front.sm.col] = (owners[key].cols[front.sm.col] || 0) + 1;
            }
            report[`${joint}_${facing > 0 ? 'R' : 'L'}`] = owners;
        }
    }
    return report;
});
await h.close();

function summ(o) {
    const parts = Object.entries(o).map(([nm, v]) => {
        const rows = Object.keys(v.rows).map(Number).sort((a, b) => a - b);
        const cols = Object.keys(v.cols).map(Number).sort((a, b) => a - b);
        return `${nm}: ${v.count} dark px, rows ${rows[0]}..${rows[rows.length - 1]}, cols ${cols[0]}..${cols[cols.length - 1]}`;
    });
    return parts.length ? parts.join(' | ') : '(no dark seam pixels)';
}
for (const [k, o] of Object.entries(out)) console.log(`${k.padEnd(16)} ${summ(o)}`);
