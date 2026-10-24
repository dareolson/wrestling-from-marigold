// Reference sheet for bent-elbow art: Procreate Lou's near arm drawn by the real
// renderer at a ladder of elbow flexes, with measured joint points.
//
//   WFM_P1=thesz-procreate-v1 node tools/debug/elbow_reference.mjs <out-dir>
//
// Per flex: <out>/flex-<deg>.png (clean, 4x, arm + torso context, no guides),
// <out>/flex-<deg>-annotated.png (shoulder/elbow/wrist marked), and report.json
// with S/E/W in world px and the measured fold. Draws via updateUpright on the
// live Skeleton (no game state changes). Hurry-free: art-sample generation only.
import { launch } from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = process.argv[2] ?? 'research/animation/elbow-reference';
mkdirSync(OUT, { recursive: true });
const FLEX = [0.7, 1.2, 1.6, 2.0, 2.4, 2.75];
const ARM = Number(process.env.ARM ?? 0.9); // shoulder swing for the sample
const TEX = process.env.FOREARM_TEX; // optional: swap the near forearm texture key (e.g. thesz_pv1_forearm_grip)
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    await h.page.waitForTimeout(1500);
    const rows = [];
    for (const flex of FLEX) {
        const res = await h.page.evaluate(({ flex, ARM, TEX }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            sc.scene.pause();
            const w = sc.w1, sk = w.skeleton;
            sc.w2.skeleton.setVisible(false);
            for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false);
            w.gfx?.clear();
            const pose = { lLeg: -0.04, rLeg: 0.16, lArm: ARM, rArm: 0.2, lElbow: flex, rElbow: 0.7, lean: 0, crouch: 0 };
            if (TEX && sk.nearForearm) { sk.nearForearm._origKey ??= sk.nearForearm.texture.key; sk.nearForearm.setTexture(TEX); }
            sk.updateUpright(500, 380, w.s, 1, pose, 0, 0, 0, 0, 1, 0);
            const P = structuredClone(sk.jointAttachmentPoints);
            const S = P.nearShoulder, E = P.nearElbow, W = P.nearWrist;
            const a = Math.atan2(E.y - S.y, E.x - S.x), b = Math.atan2(W.y - E.y, W.x - E.x);
            const fold = Math.atan2(Math.sin(b - a), Math.cos(b - a));
            const K = 4, R = 90, cx = E.x, cy = (S.y + W.y) / 2;
            const parts = [...sk._parts].filter(i => i?.visible && i.texture).sort((p, q) => p.depth - q.depth);
            const draw = (annotate) => {
                const c = document.createElement('canvas'); c.width = 2 * R * K; c.height = 2 * R * K;
                const g = c.getContext('2d'); g.fillStyle = '#5a6672'; g.fillRect(0, 0, c.width, c.height);
                g.setTransform(K, 0, 0, K, R * K - cx * K, R * K - cy * K);
                for (const img of parts) {
                    const m = img.getWorldTransformMatrix(), f = img.frame;
                    g.save(); g.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
                    g.translate(-img.displayOriginX, -img.displayOriginY);
                    if (img.flipX) { g.translate(f.cutWidth, 0); g.scale(-1, 1); }
                    if (img.flipY) { g.translate(0, f.cutHeight); g.scale(1, -1); }
                    g.globalAlpha = img.alpha ?? 1;
                    g.drawImage(img.texture.getSourceImage(), f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
                    g.restore();
                }
                if (annotate) {
                    g.setTransform(1, 0, 0, 1, 0, 0);
                    const pt = (p, col) => { g.fillStyle = col; g.beginPath(); g.arc(R * K + (p.x - cx) * K, R * K + (p.y - cy) * K, 5, 0, 7); g.fill(); };
                    g.strokeStyle = '#ff0'; g.lineWidth = 2; g.beginPath();
                    for (const [i, p] of [S, E, W].entries()) { const X = R * K + (p.x - cx) * K, Y = R * K + (p.y - cy) * K; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
                    g.stroke(); pt(S, '#0f0'); pt(E, '#f0f'); pt(W, '#0ff');
                }
                return c.toDataURL('image/png');
            };
            return { flex, fold, S, E, W, lu: Math.hypot(E.x - S.x, E.y - S.y), lf: Math.hypot(W.x - E.x, W.y - E.y), clean: draw(false), ann: draw(true) };
        }, { flex, ARM, TEX });
        const deg = Math.round(Math.abs(res.fold) * 180 / Math.PI);
        const { writeFile } = await import('node:fs/promises');
        await writeFile(`${OUT}/flex-${deg}.png`, Buffer.from(res.clean.split(',')[1], 'base64'));
        await writeFile(`${OUT}/flex-${deg}-annotated.png`, Buffer.from(res.ann.split(',')[1], 'base64'));
        rows.push({ channel: flex, measuredFoldDeg: deg, S: res.S, E: res.E, W: res.W, upperArmPx: +res.lu.toFixed(2), forearmPx: +res.lf.toFixed(2) });
    }
    writeFileSync(`${OUT}/report.json`, JSON.stringify({ rig: 'thesz-procreate-v1', facing: 1, arm: 'near (lArm/lElbow)', shoulderSwing: ARM, rows }, null, 2) + '\n');
    console.log(JSON.stringify(rows.map(r => [r.channel, r.measuredFoldDeg, r.upperArmPx, r.forearmPx])));
} finally { await h.close(); }
