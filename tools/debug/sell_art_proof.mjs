// Paired authored-pose proof, not a live-play film. Draws both wrestlers in one
// paused scene: sellart OFF on the left, sellart=v1 on the right. No damage,
// down timers, or move timing are exercised or changed by the comparison.
//
// WFM_URL=http://127.0.0.1:5198 node tools/debug/sell_art_proof.mjs [output-dir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const OUT = process.argv[2] ?? 'research/animation/sell-art-pilot-2026-10-24/proof';
mkdirSync(OUT, { recursive: true });

const phases = [
    ...[0.15, 0.35, 0.55, 0.8].map(u => ({ kind: 'clutch', part: 'back', u, facing: 1 })),
    { kind: 'clutch', part: 'head', u: 0.35, facing: 1, diagnostic: true },
    { kind: 'clutch', part: 'back', u: 0.35, facing: -1 },
    ...[1, -1].flatMap(facing => [0, 0.2, 0.34, 0.55, 0.7, 0.85, 1]
        .map(u => ({ kind: 'rise', part: 'back', u, facing }))),
];
const report = {
    scope: 'Exact paired authored phase poses through Wrestler.draw in a paused scene; not live film or gameplay validation.',
    rig: { base: process.env.WFM_P1, candidate: process.env.WFM_P2 },
    candidate: '?sellart=v1',
    lying: 'supine',
    contactProbe: { image: 'nearForearm', u: 57 / 117, v: 279 / 351,
        note: 'Same source-image point sampled on each texture; it is the grip hand inner contour, not a palm pad or a calibrated contact point on the base fist.' },
    backContactProbe: { image: 'torso', anchor: 'semanticAnchors.backWaist',
        note: 'Authored lower-back/waist contour above the trunks. Hip residual is retained as a separate historical measurement.' },
    rows: [],
};

const h = await launch();
try {
    // Concurrent authoring can otherwise trigger a Vite navigation halfway
    // through a paused comparison. Freeze HMR for this proof tab only; the
    // normal game and other browser tabs retain their usual update behavior.
    await h.page.addInitScript(() => {
        const add = WebSocket.prototype.addEventListener;
        WebSocket.prototype.addEventListener = function (type, listener, options) {
            if (type !== 'message' || !listener) return add.call(this, type, listener, options);
            return add.call(this, type, event => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'update' || message.type === 'full-reload') return;
                } catch { /* Non-Vite messages pass through. */ }
                if (typeof listener === 'function') listener.call(this, event);
                else listener.handleEvent(event);
            }, options);
        };
    });
    await h.page.reload({ waitUntil: 'load' });
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton
        && window.__WFM_GAME.scene.scenes[0].w2?.skeleton, null, { timeout: 30000 });
    await h.page.evaluate(() => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause();
        sc.tweens.pauseAll();
        const label = document.createElement('div');
        label.id = 'sell-art-proof-label';
        Object.assign(label.style, { position: 'fixed', left: '12px', bottom: '12px', zIndex: 100000,
            padding: '8px 12px', color: '#fff', background: '#17212de8',
            font: '14px sans-serif', pointerEvents: 'none' });
        document.body.append(label);
    });

    for (const phase of phases) {
        const tag = `${phase.kind}-${phase.part}-${Math.round(phase.u * 100).toString().padStart(3, '0')}-f${phase.facing > 0 ? 'right' : 'left'}`;
        const result = await h.page.evaluate(phase => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            const FLOOR = 430, X = [325, 760];
            const toggle = enabled => {
                const url = new URL(location.href);
                if (enabled) url.searchParams.set('sellart', 'v1');
                else url.searchParams.set('sellart', 'off');
                history.replaceState(null, '', url);
            };
            const prepare = (w, x) => {
                w.x = x; w.y = FLOOR; w.facing = phase.facing; w.lying = 'supine';
                w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null;
                w._sellArtInterrupted = null; w._sellArtSelection = null;
                w.skeleton.setPartVariants({});
                w._pain = { source: 'suplex', part: phase.part, severity: 1, limb: null,
                    phase: phase.kind === 'rise' ? 'rise' : 'mat', planned: true, until: null };
                w._sell = phase.kind === 'clutch' ? {
                    plan: [{ name: 'clutch', lying: 'supine', part: phase.part, duration: 1,
                        amp: 1, limb: null, rolls: 0 }],
                    i: 0, t: phase.u, facing0: phase.facing,
                } : null;
                w.state = phase.kind === 'rise' ? 'gettingUp' : 'down';
                w.riseT = phase.u;
                w.gfx.clear();
            };
            prepare(sc.w1, X[0]); prepare(sc.w2, X[1]);
            toggle(true); sc.w2.draw();
            toggle(false); sc.w1.draw();

            const measure = w => {
                const sk = w.skeleton, points = structuredClone(sk.jointAttachmentPoints);
                const contact = sk.constructor.imageAnchorPoint(sk.nearForearm, { u: 57 / 117, v: 279 / 351 });
                const hip = points.nearHip;
                const backWaistPoint = sk.torso._semanticAnchors?.backWaist
                    ? sk.constructor.imageAnchorPoint(sk.torso, sk.torso._semanticAnchors.backWaist) : null;
                const selected = w._sellArtSelection ? JSON.parse(w._sellArtSelection) : {};
                const elbow = side => {
                    const S = points[`${side}Shoulder`], E = points[`${side}Elbow`], W = points[`${side}Wrist`];
                    const a = Math.atan2(E.y - S.y, E.x - S.x), b = Math.atan2(W.y - E.y, W.x - E.x);
                    return Math.atan2(Math.sin(b - a), Math.cos(b - a)) * 180 / Math.PI;
                };
                return {
                    position: { x: w.x, y: w.y }, scale: w.s * w._heightScale,
                    artSelection: selected,
                    textures: { nearForearm: sk.nearForearm.texture.key, farForearm: sk.farForearm.texture.key },
                    nearPaintedContact: contact,
                    nearPaintedContactToHipPx: contact && hip ? Math.hypot(contact.x - hip.x, contact.y - hip.y) : null,
                    backWaistPoint,
                    nearPaintedContactToBackWaistPx: contact && backWaistPoint
                        ? Math.hypot(contact.x - backWaistPoint.x, contact.y - backWaistPoint.y) : null,
                    nearWristFloorErrorPx: points.nearWrist.y - FLOOR,
                    farWristFloorErrorPx: points.farWrist.y - FLOOR,
                    signedElbowFoldDeg: { near: elbow('near'), far: elbow('far') },
                    points,
                };
            };
            const measurements = [measure(sc.w1), measure(sc.w2)];
            const label = `${phase.kind} ${phase.part}${phase.diagnostic ? ' (diagnostic)' : ''} ${phase.u.toFixed(2)} · facing ${phase.facing > 0 ? 'right' : 'left'}`;
            document.getElementById('sell-art-proof-label').textContent = `BASE / OFF (left) · CANDIDATE / ON (right) · ${label} · exact paused poses`;

            const draw = annotated => {
                const bounds = [sc.w1, sc.w2].flatMap(w => w.skeleton._parts
                    .filter(img => img?.visible && img.texture)
                    .map(img => { const b = img.getBounds(); return {
                        left: b.left - w.x, right: b.right - w.x,
                        top: b.top, bottom: b.bottom,
                    }; }));
                // Both panels share the union of their local body bounds, so
                // different arm paths remain comparable without empty headroom.
                const minX = Math.min(...bounds.map(b => b.left)) - 20;
                const maxX = Math.max(...bounds.map(b => b.right)) + 20;
                const Y0 = Math.floor(Math.min(FLOOR, ...bounds.map(b => b.top)) - 20);
                const Y1 = Math.ceil(Math.max(FLOOR, ...bounds.map(b => b.bottom)) + 25);
                const K = 2, WIDTH = Math.ceil(Math.max(360, maxX - minX)), HEIGHT = Math.ceil(Y1 - Y0), HEADER = 60;
                const localX0 = (minX + maxX - WIDTH) / 2;
                const canvas = document.createElement('canvas');
                canvas.width = WIDTH * K * 2; canvas.height = HEIGHT * K + HEADER;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#56616d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                [sc.w1, sc.w2].forEach((w, panel) => {
                    const left = panel * WIDTH * K, X0 = w.x + localX0;
                    const point = p => ({ x: left + (p.x - X0) * K, y: HEADER + (p.y - Y0) * K });
                    ctx.save(); ctx.beginPath(); ctx.rect(left, HEADER, WIDTH * K, HEIGHT * K); ctx.clip();
                    ctx.setTransform(K, 0, 0, K, left - X0 * K, HEADER - Y0 * K);
                    const parts = [...w.skeleton._parts].filter(img => img?.visible && img.texture)
                        .sort((a, b) => a.depth - b.depth);
                    for (const img of parts) {
                        const matrix = img.getWorldTransformMatrix(), frame = img.frame;
                        ctx.save(); ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
                        ctx.translate(-img.displayOriginX, -img.displayOriginY);
                        if (img.flipX) { ctx.translate(frame.cutWidth, 0); ctx.scale(-1, 1); }
                        if (img.flipY) { ctx.translate(0, frame.cutHeight); ctx.scale(1, -1); }
                        ctx.globalAlpha = img.alpha ?? 1;
                        ctx.drawImage(img.texture.getSourceImage(), frame.cutX, frame.cutY,
                            frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
                        ctx.restore();
                    }
                    ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
                    const floorY = HEADER + (FLOOR - Y0) * K;
                    ctx.strokeStyle = '#c3cbd1'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
                    ctx.beginPath(); ctx.moveTo(left, floorY); ctx.lineTo(left + WIDTH * K, floorY); ctx.stroke(); ctx.setLineDash([]);
                    if (annotated) {
                        const m = measurements[panel], pts = m.points;
                        for (const [side, color] of [['near', '#fff18b'], ['far', '#e7a1fa']]) {
                            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
                            [`${side}Shoulder`, `${side}Elbow`, `${side}Wrist`].forEach((key, i) => {
                                const p = point(pts[key]); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
                            }); ctx.stroke();
                        }
                        for (const [p, color] of [[pts.nearHip, '#82bfff'], [m.backWaistPoint, '#73fa9f'], [m.nearPaintedContact, '#ff826d']]) {
                            if (!p) continue; const q = point(p);
                            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, 2 * Math.PI); ctx.fill();
                        }
                    }
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 19px sans-serif';
                    ctx.fillText(panel === 0 ? 'BASE · sellart OFF' : 'CANDIDATE · sellart=v1', left + 15, 25);
                    ctx.font = '15px sans-serif'; ctx.fillText(label, left + 15, 48);
                });
                ctx.strokeStyle = '#d2d8dd'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(WIDTH * K, 0); ctx.lineTo(WIDTH * K, canvas.height); ctx.stroke();
                return canvas.toDataURL('image/png');
            };
            return { base: measurements[0], candidate: measurements[1], paired: draw(false), annotated: draw(true) };
        }, phase);
        writeFileSync(join(OUT, `${tag}-paired.png`), Buffer.from(result.paired.split(',')[1], 'base64'));
        writeFileSync(join(OUT, `${tag}-annotated.png`), Buffer.from(result.annotated.split(',')[1], 'base64'));
        await h.page.screenshot({ path: join(OUT, `${tag}-game.png`) });
        const row = { tag, ...phase, base: result.base, candidate: result.candidate };
        writeFileSync(join(OUT, `${tag}.json`), JSON.stringify(row, null, 2) + '\n');
        report.rows.push(row);
        console.log(`${tag}: inner contour/back waist base ${row.base.nearPaintedContactToBackWaistPx?.toFixed(2)} px, candidate ${row.candidate.nearPaintedContactToBackWaistPx?.toFixed(2)} px`);
    }
    writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`Wrote ${report.rows.length} paired authored phase proofs to ${OUT}`);
} finally {
    await h.close();
}
