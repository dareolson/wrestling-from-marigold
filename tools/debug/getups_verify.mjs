// T2.8 (PLAN_GETUPS): the evidence pass for George's hand route (G1-rev2). No candidate is changed here; this only measures.
//
//   node tools/debug/getups_verify.mjs [outRoot=research/animation/getups-2026-10/g1-rev2]
//   (Node 22; spawns its own dev server unless WFM_URL is set; needs g1-rev2/route.json from getups_route.mjs)
//
// Parts (the plan's items):
//   1 painted pixels: on the worst frames per facing, the near hand + forearm rendered alone (PNG, lossless, over black and
//     over white so the painted alpha is exact), against the hem and against each thigh's painted pixels; plus the visible
//     hand pixels (hand shown vs hidden, the film grain's own speckle excluded) over each thigh, after masks.
//   2 union mask control: the mask source alone; a forced hand-over-thigh route with the torso-only vs the union mask, both
//     facings; parents of the mask-source parts on every rig; the active-mask cost (median / p95 ms per frame).
//   3 the IK residual of the pose solveRouteHand RETURNS (re-drawn and re-measured), and of the pose finally drawn.
//   4 world displacement of every consecutive frame (wrist, hand end, knees, ankles), body-relative separately, missing
//     values counted and never filled with 0; the turn's feet jump and knee drift.
//   5 the hand-end jump at the grip latch: variant key, handUnder, contact anchor, wrist and tip on both frames; art frozen,
//     then depth frozen.
// Writes verify.json (+ lossless frames under verify-frames/, excluded from git) into outRoot.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP } from './rise_handoff_probe.mjs';
import { AROUND } from '../../src/rig/backSell.js';

const [outRoot = 'research/animation/getups-2026-10/g1-rev2'] = process.argv.slice(2);
const RIG = 'george-roster-v1';
const sol = JSON.parse(readFileSync(join(outRoot, 'route.json'), 'utf8'));
mkdirSync(outRoot, { recursive: true });
const out = { commit: null, rig: RIG, standW: AROUND.standW };

// B = today's route (aroundVia without a path); R = T2.6 path, torso-only mask (handUnion=off); RU = R with the union (T2.7)
const COLS = { B: { qs: 'handUnion=off', path: false }, R: { qs: 'handUnion=off', path: true }, RU: { qs: '', path: true } };
const clipOf = box => ({ width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) });

async function open(qs, rig = RIG) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george'; process.env.WFM_QS = ['notitle=1', 'getups=v1', qs].filter(Boolean).join('&');
    const h = await launch();
    await h.page.waitForTimeout(400); await h.page.evaluate(INSTALL);
    const box = await h.page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
    return { h, page: h.page, clip: clipOf(box) };
}
const setPath = (page, col) => page.evaluate(({ path, sol }) => {
    const bs = window.__rw.skeleton._textureConfig.backSell; window.__todayVia ??= JSON.parse(JSON.stringify(bs.aroundVia));
    bs.aroundVia = path ? { ...sol.today, ...sol.via, ...sol.viaPose, path: [sol.via] } : JSON.parse(JSON.stringify(window.__todayVia));
}, { path: COLS[col].path, sol });

// ---- in page: everything measured on a frame (no pixels)
const FRAME = async () => {
    const w = window.__rw, sk = w.skeleton, Sk = sk.constructor, p = sk.jointAttachmentPoints, smp = sk.nearHandSamples();
    const { handClearance, silhouetteOf } = await import('/src/rig/silhouette.js'), { pathPoint, AROUND } = await import('/src/rig/backSell.js');
    const pt = q => q ? { x: q.x, y: q.y } : null, keys = ['nearWrist', 'nearElbow', 'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle', 'nearHip', 'farHip', 'neck'];
    const fr = { x: w.x, state: w.state, facing: w.facing, hw: w._recoveryHandWeight?.() ?? 0, handUnder: !!sk._handUnder, pts: {} };
    for (const k of keys) fr.pts[k] = pt(p[k]);
    fr.tip = smp ? pt(smp.handEnd) : null; fr.contact = smp ? pt(smp.contact) : null;
    for (const [n, part] of [['forearm', sk.nearForearm], ['hand', sk.nearHand]]) fr[n + 'Tex'] = part ? `${part.texture.key}:${part.frame.name}` : null;
    fr.latch = w._gripLatch ? { on: !!w._gripLatch.on } : null;
    fr.backDist = sk.backContactDistance?.() ?? null; fr.contactKind = sk.backContact?.()?.contact ?? null;
    fr.pending = !!w._handPending;
    const dist = part => { const sil = part ? silhouetteOf(part) : null; return sil && smp ? handClearance(part, smp, sil, 1).min : null; };
    fr.clear = { torso: dist(sk.torso), nearThigh: dist(sk.nearThigh), farThigh: dist(sk.farThigh) };
    // the lowest sampled point vs the hem (the old numbers, relabelled "sampled geometry")
    const hipMid = p.nearHip && p.farHip ? { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 } : p.nearHip;
    if (smp && hipMid && p.neck) {
        let ax = p.neck.x - hipMid.x, ay = p.neck.y - hipMid.y; const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
        const along = q => -((q.x - hipMid.x) * ax + (q.y - hipMid.y) * ay);
        if (!window.__hem) {
            const src = sk.torso.texture.getSourceImage(), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
            const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
            const d = g.getImageData(0, 0, c.width, c.height).data; let row = -1, x0 = c.width, x1 = 0;
            for (let y = c.height - 1; y >= 0 && row < 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { row = y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
            window.__hem = { v: (row + 1) / c.height, u0: x0 / c.width, u1: (x1 + 1) / c.width };
        }
        const hem = Math.max(...[window.__hem.u0, (window.__hem.u0 + window.__hem.u1) / 2, window.__hem.u1].map(u => along(Sk.imageAnchorPoint(sk.torso, { u, v: window.__hem.v }))));
        fr.sampledLowest = Math.max(...Object.values(smp).filter(Boolean).map(along)) - hem;
        fr.axis = { hipMid, ax, ay, hem };
    }
    // item 3: the residual of the pose finally drawn against the route point of its own progress
    const hw = fr.hw, bs = w._backSell?.();
    if (w.state === 'standing' && hw > AROUND.standW && bs?.ok && bs.data.aroundVia?.path && p.nearWrist) {
        const t = Math.min(1, Math.max(0, (1 - hw) / (1 - AROUND.standW))), G = (() => { const wa = sk.backWaistPoint?.(), via = sk.aroundPathPoints?.(); return wa && via ? pathPoint(wa, via, t) : null; })();
        if (G) fr.drawnErr = Math.hypot(p.nearWrist.x - G.x, p.nearWrist.y - G.y);
        fr.routeT = t; fr.blendK = Math.min(1, (hw - AROUND.standW) / 0.1);
    }
    fr.routeErr = w._routeErr ?? null; fr.solvedErr = w._solvedErr ?? null; fr.solvedErrs = w._solvedErrs ?? null;
    return fr;
};

// ---- in page: patch solveRouteHand so it re-draws and re-measures the pose it returns (item 3), and times itself (item 2)
const PATCH_SOLVE = () => {
    const sk = window.__rw.skeleton, w = window.__rw;
    if (sk.__solvePatched) return; sk.__solvePatched = true;
    const orig = sk.solveRouteHand.bind(sk);
    window.__solveMs = [];
    sk.solveRouteHand = (args, pose, chan, t) => {
        const t0 = performance.now(), r = orig(args, pose, chan, t);
        window.__solveMs.push(performance.now() - t0);
        w._solvedErr = null;
        if (r) {
            const [x, y, s, facing, , ...rest] = args;
            sk.updateUpright(x, y, s, facing, r.pose, ...rest);                      // draw what it returned
            const P = sk.jointAttachmentPoints, wa = sk.backWaistPoint?.(), via = sk.aroundPathPoints();
            if (P?.nearWrist && wa && via) {
                const G = window.__pathPoint(wa, via, t);
                w._solvedErr = Math.hypot(P.nearWrist.x - G.x, P.nearWrist.y - G.y);
            }
            r.drawnErr = w._solvedErr;
        }
        return r;
    };
};

// ---- Node: run one rise, return the per-frame series
async function runRise(page, col, facing, opp, { lying = 'supine', pain = true, steps = 400, tail = 2500, hook = null, clip = null, after = null } = {}) {
    await page.evaluate(BEGIN, { kind: 'gettingUp', lying, pain, facing, pose: 'stale', opp });
    if (hook) await page.evaluate(hook.init, hook.arg);
    const fr = []; let standAt = null;
    for (let i = 0; i < steps; i++) {
        if (hook?.before) await page.evaluate(hook.before, { i, ...hook.arg });
        const s = await page.evaluate(STEP), m = await page.evaluate(FRAME);
        fr.push({ i, now: s.now, riseT: s.riseT, ...m });
        if (after) await after(i, fr);
        if (standAt === null && s.state === 'standing') standAt = s.now;
        if (standAt !== null && s.now - standAt >= tail) break;
    }
    return fr;
}

const dist = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
// item 4: world step of every consecutive frame; body-relative = the same minus the wrestler's own x move (the pivot hold writes x)
function steps(fr, key) {
    const get = f => (key === 'tip' ? f.tip : f.pts[key]);
    const world = [], rel = []; let missing = 0;
    for (let i = 1; i < fr.length; i++) {
        const a = get(fr[i - 1]), b = get(fr[i]);
        if (!a || !b) { missing++; world.push(null); rel.push(null); continue; }
        world.push(+dist(a, b).toFixed(2));
        rel.push(+Math.hypot(b.x - a.x - (fr[i].x - fr[i - 1].x), b.y - a.y).toFixed(2));
    }
    const mx = arr => { let m = -1, at = -1; arr.forEach((v, i) => { if (v !== null && v > m) { m = v; at = i + 1; } }); return { max: m, frame: at }; };
    return { missing, worldMax: mx(world), relMax: mx(rel), world, rel };
}

// =============================================================== part 4 + 3 (series) and part 5 (the jump), one launch per column
const series = {};
async function collect() {
    for (const col of ['B', 'R', 'RU']) {
        const { h, page } = await open(COLS[col].qs);
        try {
            await page.evaluate(() => { window.__pathPoint = null; });
            await page.addScriptTag({ type: 'module', content: `import { pathPoint } from '/src/rig/backSell.js'; window.__pathPoint = pathPoint;` });
            await page.waitForFunction(() => window.__pathPoint);
            await page.evaluate(PATCH_SOLVE);
            await setPath(page, col);
            for (const opp of ['behind', 'front']) for (const facing of [-1, 1]) {
                const fr = await runRise(page, col, facing, opp);
                series[`${col}/${facing < 0 ? 'l' : 'r'}-${opp}`] = fr;
                console.log(`[series] ${col} ${facing} ${opp}: ${fr.length} frames`);
            }
        } finally { await h.close(); }
    }
}
await collect();

// ---- summary of items 3 and 4 from the series
const itemKeys = ['nearWrist', 'tip', 'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle'];
out.series = {};
for (const [id, fr] of Object.entries(series)) {
    const s = { frames: fr.length, flipFrame: null, steps: {} };
    // the flip: the frame the facing changes
    for (let i = 1; i < fr.length; i++) if (fr[i].facing !== fr[i - 1].facing) { s.flipFrame = i; break; }
    for (const k of itemKeys) { const r = steps(fr, k); s.steps[k] = { missing: r.missing, worldMax: r.worldMax, relMax: r.relMax }; if (s.flipFrame) s.steps[k].atFlip = { world: r.world[s.flipFrame - 1], rel: r.rel[s.flipFrame - 1] }; }
    // planted contacts, the same windows as getups_t22.mjs: the near knee's x over riseT .46-.72, the far ankle's x from the flip to .72,
    // each against its first frame in the window (x only: the contacts are on the mat); and the contacts' jump on the flip frame
    const rising = fr.filter(f => f.state === 'gettingUp'), win = (a, b) => rising.filter(f => f.riseT >= a && f.riseT <= b);
    const drift = (key, a, b) => { const w = win(a, b).filter(f => f.pts[key]); return w.length < 2 ? null : +Math.max(...w.map(f => Math.abs(f.pts[key].x - w[0].pts[key].x))).toFixed(2); };
    s.drift = { nearKneeX: drift('nearKnee', 0.46, 0.72), farAnkleXAfterFlip: s.flipFrame ? drift('farAnkle', fr[s.flipFrame].riseT + 0.001, 0.72) : null };
    s.xShiftAtFlip = s.flipFrame ? +(fr[s.flipFrame].x - fr[s.flipFrame - 1].x).toFixed(2) : null;
    // item 3: route frames (hw above standW), IK residuals
    const route = fr.filter(f => f.routeErr !== null && f.routeT !== undefined);
    const e = key => route.map(f => f[key]).filter(v => v !== null && v !== undefined && Number.isFinite(v));
    s.route = { frames: route.length, routeErrReportedMax: e('routeErr').length ? +Math.max(...e('routeErr')).toFixed(3) : null,
        solvedErrMax: e('solvedErr').length ? +Math.max(...e('solvedErr')).toFixed(3) : null, drawnErrMax: e('drawnErr').length ? +Math.max(...e('drawnErr')).toFixed(3) : null,
        drawnErrFullBlendMax: (() => { const v = route.filter(f => f.blendK >= 1).map(f => f.drawnErr).filter(Number.isFinite); return v.length ? +Math.max(...v).toFixed(3) : null; })(),
        blendFrames: route.filter(f => f.blendK < 1).length, blendDrawnErrMax: (() => { const v = route.filter(f => f.blendK < 1).map(f => f.drawnErr).filter(Number.isFinite); return v.length ? +Math.max(...v).toFixed(3) : null; })(),
        missingSolved: route.filter(f => !Number.isFinite(f.solvedErr)).length, missingDrawn: route.filter(f => !Number.isFinite(f.drawnErr)).length };
    out.series[id] = s;
    console.log(`[item4/3] ${id}: flip ${s.flipFrame}, wrist ${JSON.stringify(s.steps.nearWrist.worldMax)}, tip ${JSON.stringify(s.steps.tip.worldMax)}, ankles ${JSON.stringify([s.steps.nearAnkle.atFlip, s.steps.farAnkle.atFlip])}, knees ${JSON.stringify([s.steps.nearKnee.atFlip, s.steps.farKnee.atFlip])}, xShift ${s.xShiftAtFlip}, drift ${JSON.stringify(s.drift)}, route ${JSON.stringify(s.route)}`);
}

// ---- item 5: the latch frame. Find, per column/series, the frame with the largest hand-end step (not the flip) and log both sides.
out.latch = {};
for (const [id, fr] of Object.entries(series)) {
    if (!id.includes('behind')) continue;
    const r = steps(fr, 'tip'), w = steps(fr, 'nearWrist');
    // the swap frames: the forearm texture changes
    const swaps = [];
    for (let i = 1; i < fr.length; i++) if (fr[i].forearmTex !== fr[i - 1].forearmTex || fr[i].handTex !== fr[i - 1].handTex || fr[i].handUnder !== fr[i - 1].handUnder)
        swaps.push({ i, tipStep: r.world[i - 1], wristStep: w.world[i - 1], from: { forearm: fr[i - 1].forearmTex, hand: fr[i - 1].handTex, handUnder: fr[i - 1].handUnder }, to: { forearm: fr[i].forearmTex, hand: fr[i].handTex, handUnder: fr[i].handUnder }, backDist: [fr[i - 1].backDist, fr[i].backDist], contactKind: [fr[i - 1].contactKind, fr[i].contactKind], latch: [fr[i - 1].latch, fr[i].latch], hw: fr[i].hw });
    const top = swaps.filter(s => s.tipStep !== null).sort((a, b) => b.tipStep - a.tipStep)[0] ?? null;
    out.latch[id] = { swaps, biggest: top, frames: top ? [top.i - 1, top.i].map(i => ({ i, forearmTex: fr[i].forearmTex, handTex: fr[i].handTex, handUnder: fr[i].handUnder, contact: fr[i].contact, wrist: fr[i].pts.nearWrist, tip: fr[i].tip, backDist: fr[i].backDist, contactKind: fr[i].contactKind, latch: fr[i].latch, hw: fr[i].hw })) : null };
    console.log(`[item5] ${id}: ${swaps.length} swaps; biggest ${top ? JSON.stringify([top.i, top.tipStep, top.wristStep, top.from, top.to]) : 'none'}`);
}
writeFileSync(join(outRoot, 'verify-series.json'), JSON.stringify({ series, summary: out.series, latch: out.latch }));
// the world-displacement series without the huge raw arrays
writeFileSync(join(outRoot, 'verify.json'), JSON.stringify(out, null, 1));
console.log('wrote verify.json (part 1) -- run getups_verify_pixels.mjs for the pixel parts');
process.exit(0);
