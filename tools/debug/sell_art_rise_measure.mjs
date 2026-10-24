// Supine back-rise measurement for Lou (PLAN_SUPLEX_RISE T2.1 / T2.3 / T2.0 browser check).
// Exact paused poses through the real Skeleton, no match, no timers.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/sell_art_rise_measure.mjs base   [out.json]
//       Base rise (pain context null), t = 0..1 step .02, both facings: far wrist
//       world point, distance to the mat line (root y), shoulder-wrist vs lu+lf, elbow.
//   ... world-parts [out.json]      Every part's world transform at t = 0,.1..1 (flag off).
//   ... world-parts --check ref.json  Same, compared with a saved file (max abs diff).
//   ... planted [out.json]          Same sweep as `base` through Wrestler.draw with
//       ?sellart=v1 and a back-pain rise (the planted path), plus slide/elbow summary.
//
// Mat line = the wrestler's root y: the grounded rise places hips at root y - hip*s.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const args = process.argv.slice(2);
const mode = args.shift() ?? 'base';
const checkAt = args.indexOf('--check');
const checkFile = checkAt >= 0 ? args.splice(checkAt, 2)[1] : null;
const outFile = args[0] ?? `research/animation/suplex-rise-2026-10/plant/${mode}.json`;
const STEP = mode === 'world-parts' ? 0.1 : 0.02;

// D1 candidates from the base sweep: plant the far wrist where it is at t0 (y clamped to the
// mat line), and hold until the shoulder-to-plant distance first reaches 0.98 of lu+lf.
// `firstWithin3px` is the plan's literal t0 rule; `best` is the earliest t0 with the longest window.
function plantWindows(result, limit = 0.98, matTolPx = 3) {
    const out = {};
    for (const [facing, rows] of Object.entries(result.facings)) {
        const L = rows[0].armLengthPx, cands = [];
        rows.forEach((r, i) => {
            if (r.t > 0.7) return;
            const P = { x: r.farWrist.x, y: result.floor };
            const end = rows.slice(i + 1).find(q => Math.hypot(q.farShoulder.x - P.x, q.farShoulder.y - P.y) >= limit * L);
            cands.push({ t0: r.t, wristAboveMatPx: r.wristAboveMatPx, tLift: end?.t ?? null,
                window: end ? +(end.t - r.t).toFixed(4) : null });
        });
        const first = cands.find(c => Math.abs(c.wristAboveMatPx) <= matTolPx);
        const best = cands.reduce((b, c) => (c.window ?? 0) > (b.window ?? 0) + 1e-9 ? c : b, cands[0]);
        out[facing] = { limit, matTolPx, firstWithin3px: first, best, candidates: cands };
    }
    return out;
}

const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const result = await h.page.evaluate(({ mode, STEP }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const FLOOR = 430, X = 400;
        const w = sc.w1;
        const out = { mode, rig: new URLSearchParams(location.search).get('p1'), flags: location.search, floor: FLOOR, step: STEP, facings: {} };
        const setFlag = on => {
            const url = new URL(location.href);
            if (on) url.searchParams.set('sellart', 'v1'); else url.searchParams.delete('sellart');
            history.replaceState(null, '', url);
        };
        const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        // articulation.js convention (joint_direction_audit.mjs): x-first angles, times facing;
        // positive = forearm folds in front of the upper arm (anatomical), negative = behind.
        const flexDeg = (S, E, W, facing) => {
            const a = Math.atan2(E.x - S.x, E.y - S.y), b = Math.atan2(W.x - E.x, W.y - E.y);
            return Math.atan2(Math.sin(b - a), Math.cos(b - a)) * facing * 180 / Math.PI;
        };
        const elbowDeg = (S, E, W) => {
            const a = Math.atan2(E.y - S.y, E.x - S.x), b = Math.atan2(W.y - E.y, W.x - E.x);
            return Math.atan2(Math.sin(b - a), Math.cos(b - a)) * 180 / Math.PI;
        };
        for (const facing of [1, -1]) {
            const rows = [];
            for (let i = 0; i <= Math.round(1 / STEP); i++) {
                const t = Math.min(1, +(i * STEP).toFixed(4));
                w.x = X; w.y = FLOOR; w.facing = facing; w.lying = 'supine';
                w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null; w._sell = null;
                w._sellArtInterrupted = null; w._sellArtSelection = null; w.skeleton.setPartVariants({});
                w.state = 'gettingUp'; w.riseT = t; w.gfx.clear();
                if (mode === 'planted') {
                    w._pain = { source: 'suplex', part: 'back', severity: 1, limb: null, phase: 'rise', planned: true, until: null };
                    setFlag(true);
                } else { w._pain = null; setFlag(false); }
                if (mode === 'base') {
                    // pain context null, straight through the skeleton
                    const s = w.s * w._heightScale;
                    w.skeleton.setVisible(true);
                    w.skeleton.updateGetUp(X, FLOOR, s, facing, t, 'supine', null);
                } else w.draw();
                const sk = w.skeleton, p = sk.jointAttachmentPoints, s = w.s * w._heightScale;
                const row = { t };
                if (mode === 'world-parts') {
                    row.parts = sk._parts.map((img, k) => {
                        const m = img.getWorldTransformMatrix();
                        return [k, img.texture?.key ?? null, !!img.visible, m.tx, m.ty, m.a, m.b, m.c, m.d, img.flipX ? 1 : 0, img.flipY ? 1 : 0];
                    });
                    row.points = structuredClone(p);
                } else {
                    const S = p.farShoulder, E = p.farElbow, W = p.farWrist;
                    const lu = dist(S, E), lf = dist(E, W);
                    row.farWrist = { x: W.x, y: W.y };
                    row.wristAboveMatPx = FLOOR - W.y;           // + = above the mat line
                    row.shoulderToWristPx = dist(S, W);
                    row.armLengthPx = lu + lf; row.luPx = lu; row.lfPx = lf;
                    row.reachRatio = dist(S, W) / (lu + lf);
                    row.elbowFoldDeg = elbowDeg(S, E, W);
                    row.elbowFlexDeg = flexDeg(S, E, W, facing);
                    row.farShoulder = { x: S.x, y: S.y }; row.farElbow = { x: E.x, y: E.y };
                    const N = p.nearWrist; row.nearWrist = { x: N.x, y: N.y };
                    row.farForearmTexture = sk.farForearm?.texture?.key ?? null;
                }
                row.s = s;
                rows.push(row);
            }
            out.facings[facing] = rows;
        }
        w.state = 'standing'; w._pain = null; setFlag(false);
        return out;
    }, { mode, STEP });
    if (checkFile) {
        const ref = JSON.parse(readFileSync(checkFile, 'utf8'));
        let max = 0, where = null, mismatches = 0;
        for (const f of ['1', '-1']) result.facings[f].forEach((row, i) => {
            const r = ref.facings[f][i];
            if (row.parts.length !== r.parts.length) { mismatches++; return; }
            row.parts.forEach((p, k) => p.forEach((v, j) => {
                if (typeof v !== 'number') { if (v !== r.parts[k][j]) mismatches++; return; }
                const d = Math.abs(v - r.parts[k][j]);
                if (d > max) { max = d; where = `facing ${f} t=${row.t} part ${k} field ${j}`; }
            }));
        });
        console.log(`world-parts check vs ${checkFile}: max abs diff ${max.toExponential(3)} at ${where}; non-numeric/count mismatches ${mismatches}`);
        process.exitCode = max <= 1e-6 && mismatches === 0 ? 0 : 1;
    } else {
        if (mode === 'base') result.plantWindows = plantWindows(result);
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, JSON.stringify(result, null, 1) + '\n');
        console.log(`wrote ${outFile}`);
    }
} finally {
    await h.close();
}
