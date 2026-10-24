// In-situ reference for the suplex-aftermath head clutch on one rig: the real
// grounded sell pose at chosen sell times, clean + annotated, with measured
// elbow folds and S/E/W world coordinates for both arms.
//   WFM_P1=thesz-procreate-v1 node tools/debug/clutch_pose_reference.mjs <out-dir> [lying] [part]
import { launch } from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const [OUT = 'research/animation/elbow-reference/clutch', LYING = 'supine', PART = 'head'] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    await h.page.waitForTimeout(1500);
    const rows = [];
    for (const u of [0.15, 0.35, 0.55, 0.8]) {
        const res = await h.page.evaluate(({ u, LYING, PART }) => {
            const sc = window.__WFM_GAME.scene.scenes[0]; sc.scene.pause();
            const w = sc.w1, sk = w.skeleton;
            sc.w2.skeleton.setVisible(false); sc.w2.gfx?.clear();
            for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false);
            w.lying = LYING; w.facing = 1;
            w._sell = { plan: [{ name: 'clutch', lying: LYING, part: PART, duration: 1, amp: 1, limb: 'lLeg', rolls: 0 }], i: 0, t: u, facing0: 1 };
            const sold = w._sellPose();
            w.gfx.clear(); sk.setVisible(true);
            sk.updateGroundedReach(500, 380, w.s, 1, sold.g, sold.reach);
            const P = structuredClone(sk.jointAttachmentPoints);
            const fold = side => { const S = P[`${side}Shoulder`], E = P[`${side}Elbow`], W = P[`${side}Wrist`];
                const a = Math.atan2(E.y - S.y, E.x - S.x), b = Math.atan2(W.y - E.y, W.x - E.x);
                return { deg: Math.round(Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) * 180 / Math.PI), S, E, W, reach: sold.reach?.[side] ?? null }; };
            const info = { near: fold('near'), far: fold('far') };
            const cx = (P.nearShoulder.x + P.nearWrist.x) / 2, cy = (P.nearShoulder.y + P.nearWrist.y) / 2 - 10, K = 4, R = 100;
            const parts = [...sk._parts].filter(i => i?.visible && i.texture).sort((p, q) => p.depth - q.depth);
            const draw = ann => {
                const c = document.createElement('canvas'); c.width = c.height = 2 * R * K;
                const g = c.getContext('2d'); g.fillStyle = '#5a6672'; g.fillRect(0, 0, c.width, c.height);
                g.setTransform(K, 0, 0, K, R * K - cx * K, R * K - cy * K);
                for (const img of parts) { const m = img.getWorldTransformMatrix(), f = img.frame;
                    g.save(); g.transform(m.a, m.b, m.c, m.d, m.tx, m.ty); g.translate(-img.displayOriginX, -img.displayOriginY);
                    if (img.flipX) { g.translate(f.cutWidth, 0); g.scale(-1, 1); } if (img.flipY) { g.translate(0, f.cutHeight); g.scale(1, -1); }
                    g.globalAlpha = img.alpha ?? 1; g.drawImage(img.texture.getSourceImage(), f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight); g.restore(); }
                if (ann) { g.setTransform(1, 0, 0, 1, 0, 0);
                    for (const [side, col] of [['near', '#ff0'], ['far', '#f80']]) { const { S, E, W } = info[side];
                        const X = p => R * K + (p.x - cx) * K, Y = p => R * K + (p.y - cy) * K;
                        g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(X(S), Y(S)); g.lineTo(X(E), Y(E)); g.lineTo(X(W), Y(W)); g.stroke();
                        for (const [p, c2] of [[S, '#0f0'], [E, '#f0f'], [W, '#0ff']]) { g.fillStyle = c2; g.beginPath(); g.arc(X(p), Y(p), 5, 0, 7); g.fill(); } } }
                return c.toDataURL('image/png'); };
            return { info, clean: draw(false), ann: draw(true) };
        }, { u, LYING, PART });
        const { writeFile } = await import('node:fs/promises');
        const tag = `${LYING}-${PART}-u${Math.round(u * 100)}`;
        await writeFile(`${OUT}/${tag}.png`, Buffer.from(res.clean.split(',')[1], 'base64'));
        await writeFile(`${OUT}/${tag}-annotated.png`, Buffer.from(res.ann.split(',')[1], 'base64'));
        rows.push({ tag, u, nearFoldDeg: res.info.near.deg, farFoldDeg: res.info.far.deg, near: res.info.near, far: res.info.far });
    }
    writeFileSync(`${OUT}/${LYING}-${PART}.json`, JSON.stringify({ rig: process.env.WFM_P1, lying: LYING, part: PART, facing: 1, rows }, null, 2) + '\n');
    console.log(rows.map(r => `${r.tag} near ${r.nearFoldDeg}° far ${r.farFoldDeg}°`).join('\n'));
} finally { await h.close(); }
