// 3x crops of Lou's planted far wrist (PLAN_SUPLEX_RISE T2.3): base rise (left) vs ?sellart=v1
// planted rise (right) at t0, mid-plant and tLift, both facings. Exact paused poses; the wrist is
// marked, the palm/fist art is NOT claimed to touch the mat.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/sell_art_plant_crops.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const OUT = process.argv[2] ?? 'research/animation/suplex-rise-2026-10/plant/crops';
mkdirSync(OUT, { recursive: true });

const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const visibility = [];
    for (const facing of [1, -1]) {
        const shots = await h.page.evaluate(async facing => {
            const { PLANT } = await import('/src/animation/backRisePerformance.js');
            const sc = window.__WFM_GAME.scene.scenes[0];
            sc.scene.pause(); sc.tweens.pauseAll();
            const w = sc.w1, FLOOR = 430, X = 400, K = 3;
            const setFlag = on => {
                const url = new URL(location.href);
                if (on) url.searchParams.set('sellart', 'v1'); else url.searchParams.set('sellart', 'off');
                history.replaceState(null, '', url);
            };
            const s = w.s * w._heightScale, sk = w.skeleton;
            const plan = sk._plantPlan(s, sk.constructor.GETUP_SUPINE_POSES);
            const times = [['t0', PLANT.t0], ['mid', (PLANT.t0 + PLANT.inSpan + plan.tLift) / 2], ['tLift', plan.tLift]];
            const prep = (t, planted) => {
                w.x = X; w.y = FLOOR; w.facing = facing; w.lying = 'supine';
                w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null; w._sell = null;
                w._sellArtInterrupted = null; w._sellArtSelection = null; sk.setPartVariants({});
                w.state = 'gettingUp'; w.riseT = t; w.gfx.clear();
                w._pain = planted ? { source: 'suplex', part: 'back', severity: 1, limb: null, phase: 'rise', planned: true, until: null } : null;
                setFlag(planted);
                if (planted) w.draw(); else { sk.setVisible(true); sk.updateGetUp(X, FLOOR, s, facing, t, 'supine', null); }
            };
            const snap = () => {
                const pts = structuredClone(sk.jointAttachmentPoints);
                const parts = [...sk._parts].filter(i => i?.visible && i.texture).sort((a, b) => a.depth - b.depth).map(img => {
                    const m = img.getWorldTransformMatrix(), f = img.frame;
                    return { name: Object.keys(sk).find(k => sk[k] === img) ?? null, m: [m.a, m.b, m.c, m.d, m.tx, m.ty], ox: img.displayOriginX, oy: img.displayOriginY, fx: img.flipX, fy: img.flipY,
                        alpha: img.alpha ?? 1, src: img.texture.getSourceImage(), cut: [f.cutX, f.cutY, f.cutWidth, f.cutHeight],
                        b: (b => ({ l: b.left, r: b.right, t: b.top, b: b.bottom }))(img.getBounds()) };
                });
                return { pts, parts };
            };
            // Pixels the far arm adds to the finished picture: render all parts, then all but the far arm.
            const FAR_ARM = new Set(['farUpArm', 'farForearm', 'farHand']);
            const farArmPx = (frame, X0, Y0, W, H) => {
                const draw = skip => {
                    const c = document.createElement('canvas'); c.width = W; c.height = H;
                    const g = c.getContext('2d');
                    for (const p of frame.parts) {
                        if (skip && FAR_ARM.has(p.name)) continue;
                        g.save(); g.setTransform(1, 0, 0, 1, -X0, -Y0); g.transform(...p.m); g.translate(-p.ox, -p.oy);
                        if (p.fx) { g.translate(p.cut[2], 0); g.scale(-1, 1); }
                        if (p.fy) { g.translate(0, p.cut[3]); g.scale(1, -1); }
                        g.globalAlpha = p.alpha; g.drawImage(p.src, ...p.cut, 0, 0, p.cut[2], p.cut[3]); g.restore();
                    }
                    return g.getImageData(0, 0, W, H).data;
                };
                const a = draw(false), b = draw(true); let n = 0;
                for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) > 24) n++;
                return n;
            };
            const out = [];
            for (const [name, t] of times) {
                prep(t, false); const base = snap();
                prep(t, true); const planted = snap();
                const bounds = [...base.parts, ...planted.parts].map(p => p.b);
                const minX = Math.min(...bounds.map(b => b.l)) - 20, maxX = Math.max(...bounds.map(b => b.r)) + 20;
                const Y0 = Math.floor(Math.min(FLOOR, ...bounds.map(b => b.t)) - 20), Y1 = Math.ceil(Math.max(FLOOR, ...bounds.map(b => b.b)) + 25);
                const WIDTH = Math.ceil(maxX - minX), HEIGHT = Y1 - Y0, HEADER = 54;
                const canvas = document.createElement('canvas');
                canvas.width = WIDTH * K * 2; canvas.height = HEIGHT * K + HEADER;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#56616d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                const plantPoint = { x: X + (facing >= 0 ? 1 : -1) * plan.dx, y: FLOOR + plan.dy };
                [base, planted].forEach((frame, panel) => {
                    const left = panel * WIDTH * K;
                    ctx.save(); ctx.beginPath(); ctx.rect(left, HEADER, WIDTH * K, HEIGHT * K); ctx.clip();
                    ctx.setTransform(K, 0, 0, K, left - minX * K, HEADER - Y0 * K);
                    for (const p of frame.parts) {
                        ctx.save(); ctx.transform(...p.m); ctx.translate(-p.ox, -p.oy);
                        if (p.fx) { ctx.translate(p.cut[2], 0); ctx.scale(-1, 1); }
                        if (p.fy) { ctx.translate(0, p.cut[3]); ctx.scale(1, -1); }
                        ctx.globalAlpha = p.alpha; ctx.drawImage(p.src, ...p.cut, 0, 0, p.cut[2], p.cut[3]); ctx.restore();
                    }
                    ctx.restore();
                    const P = q => ({ x: left + (q.x - minX) * K, y: HEADER + (q.y - Y0) * K });
                    ctx.strokeStyle = '#c3cbd1'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(left, P({ x: 0, y: FLOOR }).y); ctx.lineTo(left + WIDTH * K, P({ x: 0, y: FLOOR }).y); ctx.stroke(); ctx.setLineDash([]);
                    ctx.strokeStyle = '#e7a1fa'; ctx.lineWidth = 2; ctx.beginPath();
                    ['farShoulder', 'farElbow', 'farWrist'].forEach((k, i) => { const q = P(frame.pts[k]); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
                    ctx.stroke();
                    const wr = P(frame.pts.farWrist); ctx.fillStyle = '#ff826d'; ctx.beginPath(); ctx.arc(wr.x, wr.y, 5, 0, 6.3); ctx.fill();
                    const pp = P(plantPoint); ctx.strokeStyle = '#73fa9f'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(pp.x - 8, pp.y - 8); ctx.lineTo(pp.x + 8, pp.y + 8); ctx.moveTo(pp.x + 8, pp.y - 8); ctx.lineTo(pp.x - 8, pp.y + 8); ctx.stroke();
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif';
                    ctx.fillText(panel ? 'sellart=v1 (planted)' : 'base (flag off)', left + 12, 22);
                    ctx.font = '14px sans-serif';
                    ctx.fillText(`${name} t=${t.toFixed(3)} · facing ${facing > 0 ? 'right' : 'left'} · red=far wrist, green x=plant point, dashed=mat line`, left + 12, 44);
                });
                ctx.strokeStyle = '#d2d8dd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(WIDTH * K, 0); ctx.lineTo(WIDTH * K, canvas.height); ctx.stroke();
                const px = f => farArmPx(f, Math.floor(minX), Y0, Math.ceil(WIDTH), HEIGHT);
                const names = planted.parts.map(p => p.name).filter(Boolean);
                out.push({ name, t, png: canvas.toDataURL('image/png'), farArmVisiblePx: { base: px(base), planted: px(planted) },
                    plantPoint, partNames: names });
            }
            w.state = 'standing'; w._pain = null; setFlag(false);
            return out;
        }, facing);
        for (const s of shots) {
            const file = join(OUT, `plant-${s.name}-f${facing > 0 ? 'right' : 'left'}-3x.png`);
            writeFileSync(file, Buffer.from(s.png.split(',')[1], 'base64'));
            console.log(`${file} t=${s.t.toFixed(3)} far-arm pixels visible base ${s.farArmVisiblePx.base} planted ${s.farArmVisiblePx.planted}`);
            visibility.push({ facing, name: s.name, t: s.t, farArmVisiblePx: s.farArmVisiblePx, plantPoint: s.plantPoint });
        }
    }
    // Game-scale (1x, the live canvas) stills of the planted rise, plus where the far forearm's elbow
    // and wrist land in its own 117x351 image space (inverse of the part's world transform).
    const stills = [];
    for (const facing of [1, -1]) for (const name of ['t0', 'mid']) {
        const info = await h.page.evaluate(async ({ facing, name }) => {
            const { PLANT } = await import('/src/animation/backRisePerformance.js');
            const sc = window.__WFM_GAME.scene.scenes[0];
            sc.scene.pause(); sc.tweens.pauseAll();
            const w = sc.w1, sk = w.skeleton, FLOOR = 430, X = 400, s = w.s * w._heightScale;
            const plan = sk._plantPlan(s, sk.constructor.GETUP_SUPINE_POSES);
            const t = name === 't0' ? PLANT.t0 : (PLANT.t0 + PLANT.inSpan + plan.tLift) / 2;
            const url = new URL(location.href); url.searchParams.set('sellart', 'v1'); history.replaceState(null, '', url);
            w.x = X; w.y = FLOOR; w.facing = facing; w.lying = 'supine';
            w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null; w._sell = null;
            w._sellArtInterrupted = null; w._sellArtSelection = null; sk.setPartVariants({});
            w.state = 'gettingUp'; w.riseT = t; w.gfx.clear();
            w._pain = { source: 'suplex', part: 'back', severity: 1, limb: null, phase: 'rise', planned: true, until: null };
            w.draw();
            const img = sk.farForearm, m = img.getWorldTransformMatrix(), f = img.frame;
            const det = m.a * m.d - m.b * m.c, p = sk.jointAttachmentPoints;
            const toUV = q => {
                const dx = q.x - m.tx, dy = q.y - m.ty;
                let lx = (m.d * dx - m.c * dy) / det + img.displayOriginX, ly = (-m.b * dx + m.a * dy) / det + img.displayOriginY;
                if (img.flipX) lx = f.realWidth - lx;
                if (img.flipY) ly = f.realHeight - ly;
                return { u: +(lx / f.realWidth).toFixed(4), v: +(ly / f.realHeight).toFixed(4) };
            };
            const bounds = sk._parts.filter(i => i?.visible && i.texture).map(i => i.getBounds());
            const L = Math.min(...bounds.map(b => b.left)) - 12, R = Math.max(...bounds.map(b => b.right)) + 12;
            const T = Math.min(...bounds.map(b => b.top)) - 12, B = Math.max(...bounds.map(b => b.bottom)) + 12;
            const canvas = window.__WFM_GAME.canvas.getBoundingClientRect(), k = canvas.width / window.__WFM_GAME.scale.gameSize.width;
            const info = { t, scale: s, farForearmTexture: img.texture.key, flipX: !!img.flipX, flipY: !!img.flipY,
                elbowUV: toUV(p.farElbow), wristUV: toUV(p.farWrist), forearmPx: Math.hypot(p.farWrist.x - p.farElbow.x, p.farWrist.y - p.farElbow.y),
                clip: { x: canvas.left + L * k, y: canvas.top + T * k, width: (R - L) * k, height: (B - T) * k } };
            return info;
        }, { facing, name });
        const file = join(OUT, `plant-${name}-f${facing > 0 ? 'right' : 'left'}-1x-game.png`);
        await h.page.screenshot({ path: file, clip: info.clip });
        stills.push({ facing, name, file, ...info });
        console.log(`${file} wristUV ${JSON.stringify(info.wristUV)} elbowUV ${JSON.stringify(info.elbowUV)}`);
    }
    await h.page.evaluate(() => { const u = new URL(location.href); u.searchParams.set('sellart', 'off'); history.replaceState(null, '', u); });
    writeFileSync(join(OUT, 'far-forearm-registration.json'), JSON.stringify({
        note: 'Where the logical elbow/wrist joints fall in the far forearm texture (normalized to its 117x351 canvas), measured at the planted poses.', stills }, null, 1) + '\n');
    writeFileSync(join(OUT, 'far-arm-visibility.json'), JSON.stringify({
        note: 'Pixels (1x, canvas composite of the skeleton parts only) that change when farUpArm/farForearm/farHand are left out. Geometry-level occlusion check, not an art judgment.',
        rows: visibility }, null, 1) + '\n');
} finally {
    await h.close();
}
