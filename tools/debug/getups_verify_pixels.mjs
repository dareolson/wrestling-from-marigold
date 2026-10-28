// T2.8 (PLAN_GETUPS) items 1, 2 and 5: painted-pixel measurements, the union-mask control, the cost, the 36.5 px jump's cause.
// Run getups_verify.mjs first (it writes verify-series.json, which picks the worst frames).
//
//   node tools/debug/getups_verify_pixels.mjs [outRoot=research/animation/getups-2026-10/g1-rev2] [parts=1,2,5]
//
// How a "painted" pixel is found (lossless, no JPEG, no film grain): the part is shown ALONE (every other display object hidden)
// and the frame is drawn twice, over a black and over a white camera background; the pixels that look the same on both are
// painted (alpha >= .5), the ones that follow the background are not. The hand's VISIBLE pixels are the ones that change when
// the hand is hidden in the full scene (two shots of the full scene, to drop the film grain's own speckle). Pixels map back to
// world space through the camera and to "px below the hem" along the torso axis, as getups_route.mjs does for its samples.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP, RIGS } from './rise_handoff_probe.mjs';
import { AROUND } from '../../src/rig/backSell.js';

const [outRoot = 'research/animation/getups-2026-10/g1-rev2', partsArg = '1,2,5'] = process.argv.slice(2);
const PARTS = new Set(partsArg.split(',').map(Number));
const RIG = 'george-roster-v1';
const sol = JSON.parse(readFileSync(join(outRoot, 'route.json'), 'utf8'));
const SER = JSON.parse(readFileSync(join(outRoot, 'verify-series.json'), 'utf8')).series;
const outFile = join(outRoot, 'verify.json');
const out = JSON.parse(readFileSync(outFile, 'utf8'));
const framesDir = join(outRoot, 'verify-frames'); mkdirSync(framesDir, { recursive: true });
const COLS = { B: { qs: 'handUnion=off', path: false }, R: { qs: 'handUnion=off', path: true }, RU: { qs: '', path: true } };
const r2 = v => (v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(2));

async function open(qs, rig = RIG, { getups = 'v1' } = {}) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george'; process.env.WFM_QS = ['notitle=1', 'lighting=0', getups && `getups=${getups}`, qs].filter(Boolean).join('&');
    const h = await launch();
    await h.page.waitForTimeout(400); await h.page.evaluate(INSTALL);
    const box = await h.page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
    const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
    await h.page.addScriptTag({ type: 'module', content: `import { pathPoint } from '/src/rig/backSell.js'; window.__pathPoint = pathPoint;` });
    await h.page.waitForFunction(() => window.__pathPoint);
    return { h, page: h.page, clip };
}
const setPath = (page, path) => page.evaluate(({ path, sol }) => {
    const bs = window.__rw.skeleton._textureConfig.backSell; window.__todayVia ??= JSON.parse(JSON.stringify(bs.aroundVia));
    bs.aroundVia = path === false ? JSON.parse(JSON.stringify(window.__todayVia)) : { ...sol.today, ...sol.via, ...sol.viaPose, path: path ?? [sol.via] };
}, { path, sol });

// ---------------------------------------------------------------- in-page helpers
// redraw the frame as it stands (no update: nothing moves), the way forearm_count.mjs does
const RENDER = () => { const g = window.__WFM_GAME, r = g.renderer; r.preRender(); g.events.emit('prerender', r, 0, 0); g.scene.render(r); r.postRender(); g.events.emit('postrender', r, 0, 0); };
// what to show: 'all' | 'noHand' | { only: [objects] }; bg: a CSS colour or null (leave the camera alone)
const SHOW = ({ mode, parts, bg }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], sk = window.__rw.skeleton, cam = sc.cameras.main;
    const saved = window.__saved ??= { vis: [], cam: null, masks: [] };
    const restore = () => {
        saved.vis.forEach(([o, v]) => { o.visible = v; }); saved.vis = [];
        saved.masks.forEach(([m, a]) => m.setActive(a)); saved.masks = [];
        if (saved.cam) { cam.transparent = saved.cam.transparent; cam.setBackgroundColor(saved.cam.color); saved.cam = null; }
        window.__rw.skeleton.nearForearm.alpha = 1;
    };
    restore();
    if (mode === 'all') return;
    const hand = [sk.nearForearm, sk.nearHand].filter(Boolean);
    const pick = { hand, nearThigh: [sk.nearThigh], farThigh: [sk.farThigh], torso: [sk.torso] };
    if (mode === 'noHand') { hand.forEach(o => { saved.vis.push([o, o.visible]); o.visible = false; }); return; }
    // only: hide every display object, show the chosen parts; the hand's masks off (its own painted pixels, not the visible ones)
    const keep = new Set(parts.flatMap(p => pick[p]));
    for (const o of sc.children.list) { if (o.visible && !keep.has(o)) { saved.vis.push([o, true]); o.visible = false; } }
    for (const o of keep) if (!o.visible) { saved.vis.push([o, false]); o.visible = true; }
    if (parts.includes('hand')) for (const o of hand) for (const k of ['_torsoMask', '_unionMask']) if (o[k]) { saved.masks.push([o[k], o[k].active]); o[k].setActive(false); }
    saved.cam = { transparent: cam.transparent, color: cam.backgroundColor?.rgba ?? '#080808' };
    cam.transparent = false; cam.setBackgroundColor(bg);
};

// the analysis, given the lossless shots as base64 (keys: A1, A2, B, then <part>_k / <part>_w for each part)
const ANALYSE = async ({ shots, clip, parts }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, g = window.__WFM_GAME.scale.gameSize;
    const box = document.querySelector('canvas').getBoundingClientRect();
    const load = async b64 => { const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
    const D = {}; for (const [k, v] of Object.entries(shots)) D[k] = await load(v);
    const W = clip.width, H = clip.height, N = W * H, lum = (d, i) => d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
    const ax = window.__axis; if (!ax) return null;
    const along = (px, py) => { const q = cam.getWorldPoint((clip.x + px + 0.5 - box.x) * g.width / box.width, (clip.y + py + 0.5 - box.y) * g.height / box.height);
        return -((q.x - ax.hipMid.x) * ax.ax + (q.y - ax.hipMid.y) * ax.ay) - ax.hem; };
    const painted = {};
    // alpha per pixel = 1 - (w - k) / (w0 - k0), the bare background's own black/white pair taking out the screen-space gradient; painted = alpha >= .5
    for (const p of parts) { const a = new Uint8Array(N); for (let i = 0; i < N; i++) { const span = lum(D.bare_w, i) - lum(D.bare_k, i); a[i] = span > 20 && 1 - (lum(D[p + '_w'], i) - lum(D[p + '_k'], i)) / span >= 0.5 ? 1 : 0; } painted[p] = a; }
    const vis = new Uint8Array(N); let noisy = 0;
    for (let i = 0; i < N; i++) { if (Math.abs(lum(D.A1, i) - lum(D.A2, i)) > 25) { noisy++; continue; } if (Math.abs(lum(D.A1, i) - lum(D.B, i)) > 25) vis[i] = 1; }
    const r = { noisy, handPainted: 0, handBelowHem: 0, lowestPainted: -Infinity, visible: 0, visibleBelowHem: 0, lowestVisible: -Infinity, paintedOver: {}, visibleOver: {} };
    for (const p of parts) if (p !== 'hand') { r.paintedOver[p] = 0; r.visibleOver[p] = 0; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, hp = painted.hand[i], vs = vis[i];
        if (!hp && !vs) continue;
        const al = along(x, y);
        if (hp) { r.handPainted++; if (al > 0) r.handBelowHem++; if (al > r.lowestPainted) r.lowestPainted = al; for (const p in r.paintedOver) if (painted[p][i]) r.paintedOver[p]++; }
        if (vs) { r.visible++; if (al > 0) r.visibleBelowHem++; if (al > r.lowestVisible) r.lowestVisible = al; for (const p in r.visibleOver) if (painted[p][i]) r.visibleOver[p]++; }
    }
    return r;
};

// the capture of one frame (Node side): returns the analysis
async function capture(page, clip, tag, { save = null } = {}) {
    const parts = ['hand', 'nearThigh', 'farThigh', 'torso'];
    const shots = {}; const shoot = async (mode, ps, bg) => { await page.evaluate(SHOW, { mode, parts: ps, bg }); await page.evaluate(RENDER); return (await page.screenshot({ clip, type: 'png' })); };
    const put = (k, buf) => { shots[k] = buf.toString('base64'); };
    put('A1', await shoot('all')); put('A2', await shoot('all'));
    if (save) writeFileSync(join(framesDir, `${tag}-shown.png`), Buffer.from(shots.A1, 'base64'));
    put('B', await shoot('noHand'));
    put('bare_k', await shoot('only', [], '#000000')); put('bare_w', await shoot('only', [], '#ffffff'));
    for (const p of parts) { put(p + '_k', await shoot('only', [p], '#000000')); put(p + '_w', await shoot('only', [p], '#ffffff')); }
    if (save) { writeFileSync(join(framesDir, `${tag}-hand-k.png`), Buffer.from(shots.hand_k, 'base64')); writeFileSync(join(framesDir, `${tag}-hand-w.png`), Buffer.from(shots.hand_w, 'base64')); }
    await page.evaluate(SHOW, { mode: 'all' }); await page.evaluate(RENDER);
    return page.evaluate(ANALYSE, { shots, clip, parts });
}

// ---------------------------------------------------------------- in-page: per-frame measure shared with part 1's axis (hem along the torso axis)
const AXIS = () => {
    const sk = window.__rw.skeleton, Sk = sk.constructor, p = sk.jointAttachmentPoints;
    const hipMid = p.nearHip && p.farHip ? { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 } : p.nearHip;
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
    window.__axis = { hipMid, ax, ay, hem };
    // the sampled-geometry lowest point (the old numbers), for the replay check
    const smp = sk.nearHandSamples();
    return smp ? Math.max(...Object.values(smp).filter(Boolean).map(along)) - hem : null;
};

async function replay(page, facing, opp, wanted, onFrame, { steps = 400, tail = 2500 } = {}) {
    await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing, pose: 'stale', opp });
    let standAt = null; const outRows = [];
    for (let i = 0; i < steps; i++) {
        const s = await page.evaluate(STEP);
        if (wanted === null || wanted.has(i)) { const r = await onFrame(i, s); if (r) outRows.push(r); }
        if (standAt === null && s.state === 'standing') standAt = s.now;
        if (standAt !== null && s.now - standAt >= tail) break;
    }
    return outRows;
}

const worst = (fr, n = 10) => {
    const behind = fr.filter(f => f.handUnder && f.sampledLowest !== undefined);
    const byHem = [...behind].sort((a, b) => b.sampledLowest - a.sampledLowest).slice(0, n).map(f => f.i);
    const minThigh = f => Math.min(f.clear.nearThigh ?? Infinity, f.clear.farThigh ?? Infinity);
    const byThigh = [...behind].sort((a, b) => minThigh(a) - minThigh(b)).slice(0, n).map(f => f.i);
    return { byHem, byThigh, all: [...new Set([...byHem, ...byThigh])].sort((a, b) => a - b) };
};

// ================================================================ part 1: painted pixels on the worst frames
if (PARTS.has(1)) {
    out.painted = {};
    for (const col of ['B', 'R', 'RU']) {
        const { h, page, clip } = await open(COLS[col].qs);
        try {
            await setPath(page, COLS[col].path ? undefined : false);
            for (const facing of [-1, 1]) {
                const id = `${col}/${facing < 0 ? 'l' : 'r'}-behind`, fr = SER[id], pick = worst(fr);
                const rows = await replay(page, facing, 'behind', new Set(pick.all), async (i) => {
                    const sampled = await page.evaluate(AXIS);
                    const ref = fr[i];
                    const a = await capture(page, clip, `${col}-${facing < 0 ? 'l' : 'r'}-${i}`, { save: true });
                    return { i, hw: r2(ref.hw), handUnder: ref.handUnder, sampledLowest: r2(sampled), replayMatches: Math.abs((sampled ?? 0) - (ref.sampledLowest ?? 0)) < 0.01,
                        noisyPx: a.noisy, handPaintedPx: a.handPainted, paintedLowestVsHem: r2(a.lowestPainted), paintedBelowHemPx: a.handBelowHem,
                        paintedOverNearThigh: a.paintedOver.nearThigh, paintedOverFarThigh: a.paintedOver.farThigh, paintedOverTorso: a.paintedOver.torso,
                        visiblePx: a.visible, visibleLowestVsHem: r2(a.lowestVisible), visibleBelowHemPx: a.visibleBelowHem,
                        visibleOverNearThigh: a.visibleOver.nearThigh, visibleOverFarThigh: a.visibleOver.farThigh, visibleOverTorso: a.visibleOver.torso,
                        sampledNearThighClear: r2(ref.clear.nearThigh), sampledFarThighClear: r2(ref.clear.farThigh) };
                });
                out.painted[id] = { worstByHem: pick.byHem, worstByThigh: pick.byThigh, rows };
                const mx = k => Math.max(...rows.map(r => r[k] ?? -Infinity));
                console.log(`[item1] ${id}: ${rows.length} frames; painted lowest ${mx('paintedLowestVsHem')} (sampled ${mx('sampledLowest')}), painted below hem px max ${mx('paintedBelowHemPx')}, painted over thighs near/far max ${mx('paintedOverNearThigh')}/${mx('paintedOverFarThigh')}, VISIBLE over thighs near/far max ${mx('visibleOverNearThigh')}/${mx('visibleOverFarThigh')}, visible below hem ${mx('visibleBelowHemPx')}, replay ok ${rows.every(r => r.replayMatches)}`);
            }
        } finally { await h.close(); }
    }
    writeFileSync(outFile, JSON.stringify(out, null, 1));
}

// ================================================================ part 2: the union mask
if (PARTS.has(2)) {
    out.union = {};
    // 2a: parents of the mask-source parts, on every rig
    out.union.parents = {};
    for (const rig of RIGS) {
        const { h, page } = await open('', rig);
        try {
            out.union.parents[rig] = await page.evaluate(() => {
                const sc = window.__WFM_GAME.scene.scenes[0], res = {};
                for (const [wn, w] of [['w1', sc.w1], ['w2', sc.w2]]) { const sk = w.skeleton; res[wn] = {};
                    for (const n of ['torso', 'nearThigh', 'farThigh']) { const o = sk[n]; if (!o) { res[wn][n] = 'missing'; continue; }
                        const m = o.getWorldTransformMatrix(), local = o.getLocalTransformMatrix();
                        res[wn][n] = { parentContainer: !!o.parentContainer, worldEqualsLocal: Math.abs(m.a - local.a) + Math.abs(m.b - local.b) + Math.abs(m.c - local.c) + Math.abs(m.d - local.d) + Math.abs(m.tx - local.tx) + Math.abs(m.ty - local.ty) < 1e-6, alpha: o.alpha, scale: [o.scaleX, o.scaleY], inList: sc.children.list.includes(o) }; } }
                return res;
            });
        } finally { await h.close(); }
        const bad = Object.entries(out.union.parents[rig]).flatMap(([wn, o]) => Object.entries(o).filter(([, v]) => v === 'missing' || v.parentContainer || !v.worldEqualsLocal).map(([n]) => `${wn}.${n}`));
        console.log(`[item2a] ${rig}: parents ${bad.length ? 'NOT identity: ' + bad.join(', ') : 'identity (no parent container) on w1 and w2'}`);
    }
    // 2c: a FORCED hand-over-thigh route: the path point is moved below the hem, so the hand crosses the thighs' art; the same
    // frames are shot with the torso-only mask and with the union. Frames are picked from the torso-only run (a sampled point inside
    // a thigh), up to 8 per thigh per facing; both columns are shot on the same frame indices, and a frame counts only when the hand
    // is behind the body in BOTH (handUnder is gated by the clearance, which differs between the two).
    out.union.forced = {};
    const CLEARS = () => { const w = window.__rw, sk = w.skeleton; const S = window.__sil; const smp = sk.nearHandSamples(); if (!smp) return null;
        const d = part => { const sil = part ? S.silhouetteOf(part) : null; return sil ? S.handClearance(part, smp, sil, 1).min : null; };
        return { near: d(sk.nearThigh), far: d(sk.farThigh), under: !!sk._handUnder }; };
    const variants = { 'below-outboard': { u: sol.via.u, v: sol.hemV + 0.22 }, 'below-middle': { u: 0.5, v: sol.hemV + 0.22 }, 'below-inboard': { u: 0.2, v: sol.hemV + 0.3 } };
    for (const [vn, pt] of Object.entries(variants)) for (const facing of [-1, 1]) {
        const id = `${vn}/${facing < 0 ? 'l' : 'r'}`; let picks = { near: [], far: [] };
        for (const col of ['R', 'RU']) {
            const { h, page, clip } = await open(COLS[col].qs);
            try {
                await page.evaluate(async () => { window.__sil = await import('/src/rig/silhouette.js'); });
                await setPath(page, [pt]);
                if (col === 'R') {
                    const cand = { near: [], far: [] };
                    await replay(page, facing, 'behind', null, async (i) => { const c = await page.evaluate(CLEARS); if (c?.under && c.near !== null && c.near <= 0) cand.near.push(i); if (c?.under && c.far !== null && c.far <= 0) cand.far.push(i); return null; });
                    const spread = a => (a.length <= 8 ? a : Array.from({ length: 8 }, (_, k) => a[Math.floor(k * (a.length - 1) / 7)]));
                    picks = { near: spread(cand.near), far: spread(cand.far), nearFrames: cand.near.length, farFrames: cand.far.length };
                }
                const want = new Set([...picks.near, ...picks.far]);
                const rows = await replay(page, facing, 'behind', want, async (i) => {
                    await page.evaluate(AXIS); const c = await page.evaluate(CLEARS);
                    const a = await capture(page, clip, `forced-${vn.replace(/\W/g, '')}-${facing < 0 ? 'l' : 'r'}-${col}-${i}`);
                    return { i, under: c.under, paintedOverNear: a.paintedOver.nearThigh, paintedOverFar: a.paintedOver.farThigh, visibleOverNear: a.visibleOver.nearThigh, visibleOverFar: a.visibleOver.farThigh, visiblePx: a.visible, handPaintedPx: a.handPainted };
                });
                (out.union.forced[id] ??= { picks: { near: picks.near, far: picks.far, nearFrames: picks.nearFrames, farFrames: picks.farFrames } })[col] = rows;
            } finally { await h.close(); }
        }
        const f = out.union.forced[id], both = f.R.filter(r => f.RU.find(q => q.i === r.i && q.under) && r.under);
        const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
        const ru = both.map(r => f.RU.find(q => q.i === r.i));
        f.summary = { frames: both.length, torsoOnlyVisibleOverNear: sum(both, 'visibleOverNear'), unionVisibleOverNear: sum(ru, 'visibleOverNear'), torsoOnlyVisibleOverFar: sum(both, 'visibleOverFar'), unionVisibleOverFar: sum(ru, 'visibleOverFar'),
            paintedOverNear: sum(both, 'paintedOverNear'), paintedOverFar: sum(both, 'paintedOverFar'), sampledInsideFrames: { near: picks.nearFrames, far: picks.farFrames } };
        console.log(`[item2c] ${id}: ${JSON.stringify(f.summary)}`);
    }
    // 2d: what the masks and the IK cost: ms per game.step (update + render), median / p95, after a warmup rise
    out.union.cost = {};
    const TIMED = () => { const g = window.__WFM_GAME, w = window.__rw; window.__T += 1000 / 60; const t0 = performance.now(); g.step(window.__T, 1000 / 60); const ms = performance.now() - t0;
        return { ms, state: w.state, hw: w._recoveryHandWeight?.() ?? 0, solves: (window.__solveMs ?? []).length }; };
    const TIME_SOLVE = () => { const sk = window.__rw.skeleton, orig = sk.solveRouteHand.bind(sk); window.__solveMs = []; window.__updUp = 0; const u = sk.updateUpright.bind(sk);
        sk.updateUpright = (...a) => { window.__updUp++; return u(...a); };
        sk.solveRouteHand = (...a) => { const t0 = performance.now(), r = orig(...a); window.__solveMs.push(performance.now() - t0); return r; }; };
    const pct = (a, q) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(q * (b.length - 1)))].toFixed(3); };
    for (const [label, qs, pathOn, getups] of [['legacy (getups off)', '', false, null], ['B  getups=v1, today route, torso mask', 'handUnion=off', false, 'v1'], ['R  path IK, torso mask', 'handUnion=off', true, 'v1'], ['RU path IK, union mask', '', true, 'v1']]) {
        const { h, page } = await open(qs, RIG, { getups });
        try {
            await setPath(page, pathOn ? undefined : false); await page.evaluate(TIME_SOLVE);
            const all = [], route = [], solve = []; let upd = 0, routeFrames = 0;
            for (let rep = 0; rep < 6; rep++) {              // rep 0 is the warmup (a whole rise + the release, > 2 s)
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing: -1, pose: 'stale', opp: 'behind' });
                await page.evaluate(() => { window.__solveMs.length = 0; window.__updUp = 0; });
                let standAt = null;
                for (let i = 0; i < 400; i++) {
                    const t = await page.evaluate(TIMED);
                    if (rep > 0) { all.push(t.ms); if (t.state === 'standing' && t.hw > AROUND.standW) { route.push(t.ms); routeFrames++; } }
                    if (standAt === null && t.state === 'standing') standAt = i;
                    if (standAt !== null && i - standAt > 150) break;
                }
                if (rep > 0) { solve.push(...await page.evaluate(() => window.__solveMs)); upd += await page.evaluate(() => window.__updUp); }
            }
            out.union.cost[label] = { frames: all.length, allMedian: pct(all, 0.5), allP95: pct(all, 0.95), routeFrames: route.length, routeMedian: pct(route, 0.5), routeP95: pct(route, 0.95), solveCalls: solve.length, solveMedian: pct(solve, 0.5), solveP95: pct(solve, 0.95), updateUprightCallsPerFrame: +(upd / all.length).toFixed(2) };
            console.log(`[item2d] ${label}: ${JSON.stringify(out.union.cost[label])}`);
        } finally { await h.close(); }
    }
    writeFileSync(outFile, JSON.stringify(out, null, 1));
}

// ================================================================ part 6: the union mask source's copies vs the real parts (A3)
// The mask source is a Container of render-only copies of the torso and both thighs. Rendering that container alone is not possible
// with the page's own tools (the mask filter draws it into its own texture), so the copies are compared with the parts directly,
// after the prerender sync: visibility, texture and frame, origin, position, scale, rotation, flip and alpha, in WORLD terms.
// Cases: as drawn; the near thigh at alpha .5 and 0; the near thigh under a parent Container (offset, scaled, alpha .5).
if (PARTS.has(6)) {
    out.union ??= {};
    const { h, page } = await open('');
    try {
        await setPath(page, undefined);
        await replay(page, -1, 'behind', new Set([SER['RU/l-behind'].filter(f => f.handUnder).map(f => f.i)[40]]), async () => {
            out.union.copies = await page.evaluate(() => {
                const g = window.__WFM_GAME, sc = g.scene.scenes[0], sk = window.__rw.skeleton, r = g.renderer;
                const parts = [['torso', sk.torso], ['nearThigh', sk.nearThigh], ['farThigh', sk.farThigh]];
                const sync = () => { r.preRender(); g.events.emit('prerender', r, 0, 0); g.scene.render(r); r.postRender(); };
                const check = () => { sync(); const src = sk._handUnionParts, bad = [];
                    parts.forEach(([n, part], i) => { const c = src.copies[i], m = part.getWorldTransformMatrix(), d = m.decomposeMatrix(), cm = c.getWorldTransformMatrix(), cd = cm.decomposeMatrix();
                        let wa = part.alpha; for (let p = part.parentContainer; p; p = p.parentContainer) wa *= p.alpha;
                        const diff = (k, a, b) => { if (!(Math.abs(a - b) < 1e-4)) bad.push(`${n}.${k}: part ${+a.toFixed(4)} copy ${+b.toFixed(4)}`); };
                        if (!c.visible) bad.push(`${n}: copy hidden`);
                        if (c.texture.key !== part.texture.key || c.frame.name !== part.frame.name) bad.push(`${n}: texture`);
                        diff('worldX', d.translateX, cd.translateX); diff('worldY', d.translateY, cd.translateY); diff('worldScaleX', d.scaleX, cd.scaleX); diff('worldScaleY', d.scaleY, cd.scaleY); diff('worldRotation', d.rotation, cd.rotation);
                        diff('originX', part.originX, c.originX); diff('originY', part.originY, c.originY); diff('worldAlpha', wa, c.alpha * 1);
                        if (part.flipX !== c.flipX || part.flipY !== c.flipY) bad.push(`${n}: flip`); });
                    return bad; };
                const res = { asDrawn: check() };
                sk.nearThigh.alpha = 0.5; res.nearThighAlpha05 = check();
                sk.nearThigh.alpha = 0; res.nearThighAlpha0 = check();
                sk.nearThigh.alpha = 1;
                // a parent: offset, scaled, half alpha (the part leaves the display list for the container and comes back)
                const part = sk.nearThigh, ctr = sc.add.container(12, -7);
                ctr.setScale(1.5); ctr.setAlpha(0.5); sc.children.remove(part); ctr.add(part);
                res.nearThighUnderParent = check();
                ctr.remove(part); sc.add.existing(part); ctr.destroy();
                res.after = check();
                return res; });
        }, { tail: 0 });
        for (const [k, v] of Object.entries(out.union.copies)) console.log(`[item2 copies] ${k}: ${v.length ? v.join('; ') : 'copies match the parts'}`);
    } finally { await h.close(); }
    writeFileSync(outFile, JSON.stringify(out, null, 1));
}

// ================================================================ part 7: EVERY hand-behind-the-body frame (not only the worst ones), facing left, R and RU
// painted hand pixels over each thigh's painted pixels, and the visible ones; the same capture as part 1 on all frames.
if (PARTS.has(7)) {
    out.sweep = {};
    for (const col of ['R', 'RU']) {
        const { h, page, clip } = await open(COLS[col].qs);
        try {
            await setPath(page, undefined);
            const fr = SER[`${col}/l-behind`], want = new Set(fr.filter(f => f.handUnder).map(f => f.i));
            const rows = await replay(page, -1, 'behind', want, async (i) => {
                await page.evaluate(AXIS); const a = await capture(page, clip, `sweep-${col}-${i}`);
                return { i, hw: r2(fr[i].hw), paintedOverNear: a.paintedOver.nearThigh, paintedOverFar: a.paintedOver.farThigh, visibleOverNear: a.visibleOver.nearThigh, visibleOverFar: a.visibleOver.farThigh, visiblePx: a.visible, paintedLowest: r2(a.lowestPainted), visibleLowest: r2(a.lowestVisible), belowHemPx: a.handBelowHem };
            });
            const mx = k => Math.max(...rows.map(r => r[k] ?? -1e9)), cnt = k => rows.filter(r => (r[k] ?? 0) > 0).length;
            out.sweep[col] = { frames: rows.length, maxPaintedOverNear: mx('paintedOverNear'), maxPaintedOverFar: mx('paintedOverFar'), maxVisibleOverNear: mx('visibleOverNear'), maxVisibleOverFar: mx('visibleOverFar'),
                framesWithVisibleOverNear: cnt('visibleOverNear'), framesWithVisibleOverFar: cnt('visibleOverFar'), framesWithPaintedOverNear: cnt('paintedOverNear'), lowestPainted: mx('paintedLowest'), maxBelowHemPx: mx('belowHemPx'), rows };
            const { rows: _r, ...brief } = out.sweep[col]; console.log(`[item1 sweep] ${col} facing left: ${JSON.stringify(brief)}`);
        } finally { await h.close(); }
    }
    writeFileSync(outFile, JSON.stringify(out, null, 1));
}

// ================================================================ part 5: what moves at the 36.5 px frame (R, frame 138 -> 139)
// The series says the forearm texture and handUnder do NOT change on that frame while the ELBOW moves 36 px with the wrist still.
// This part logs the IK's two elbow branches on frames 136-141 (pass 0 of solveRouteHand) and re-runs the rise with each suspect frozen
// from frame 138 on: the art (setPartVariants), the depth state (_handUnder), the elbow branch (solveReachArm's bend sign).
const PROBE_SOLVE = () => {
    const sk = window.__rw.skeleton, w = window.__rw, Sk = sk.constructor, orig = sk.solveRouteHand.bind(sk);
    window.__branch = [];
    sk.solveRouteHand = (args, pose, chan, t) => {
        const [x, y, s, facing, , ...rest] = args, f = facing >= 0 ? 1 : -1, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        sk.updateUpright(x, y, s, facing, { ...pose }, ...rest);
        const P = sk.jointAttachmentPoints, S = P.nearShoulder, E = P.nearElbow, Wr = P.nearWrist, wa = sk.backWaistPoint?.(), via = sk.aroundPathPoints();
        if (S && E && Wr && wa && via) {
            const G = window.__pathPoint(wa, via, t), lu = Math.hypot(E.x - S.x, E.y - S.y), lf = Math.hypot(Wr.x - E.x, Wr.y - E.y);
            const armCur = Math.atan2(E.x - S.x, E.y - S.y), foreCur = Math.atan2(Wr.x - E.x, Wr.y - E.y), flexCur = wrap((foreCur - armCur) * f);
            const cands = [-1, 1].map(sign => { const { elbow, hand } = Sk.solveReachArm(S, lu, lf, G, null, sign, window.__elbowMax);
                const armNew = Math.atan2(elbow.x - S.x, elbow.y - S.y), foreNew = Math.atan2(hand.x - elbow.x, hand.y - elbow.y), flex = wrap((foreNew - armNew) * f);
                return { sign, flex: +flex.toFixed(3), cost: +Math.abs(wrap(flex - flexCur)).toFixed(3), elbow: { x: +elbow.x.toFixed(1), y: +elbow.y.toFixed(1) } }; });
            window.__branch.push({ t: +t.toFixed(3), hw: +w._recoveryHandWeight().toFixed(3), flexCur: +flexCur.toFixed(3), dToGoal: +Math.hypot(G.x - S.x, G.y - S.y).toFixed(1), reach: +(lu + lf).toFixed(1), cands, picked: cands[0].cost <= cands[1].cost ? cands[0].sign : cands[1].sign });
        }
        return orig(args, pose, chan, t);
    };
};
if (PARTS.has(5)) {
    out.jump = {};
    const { JOINT_LIMITS } = await import('../../src/rig/articulation.js');
    const FACING = -1, JUMP = 139;
    const run = async (label, setup) => {
        const { h, page } = await open(COLS.R.qs);
        try {
            await setPath(page, undefined);
            await page.evaluate(({ max }) => { window.__elbowMax = max; }, { max: JOINT_LIMITS.elbow.max });
            await page.evaluate(PROBE_SOLVE);
            await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing: FACING, pose: 'stale', opp: 'behind' });
            const rows = []; let signAt138 = null;
            for (let i = 0; i < 175; i++) {
                if (i === JUMP) await page.evaluate(setup, { signAt138 });
                const before = await page.evaluate(() => window.__branch.length);
                const s = await page.evaluate(STEP);
                if (i >= 136 && i <= 141) {
                    const m = await page.evaluate(() => { const sk = window.__rw.skeleton, P = sk.jointAttachmentPoints, smp = sk.nearHandSamples(), b = window.__branch.at(-1);
                        return { elbow: { x: +P.nearElbow.x.toFixed(2), y: +P.nearElbow.y.toFixed(2) }, wrist: { x: +P.nearWrist.x.toFixed(2), y: +P.nearWrist.y.toFixed(2) }, tip: smp.handEnd, tex: sk.nearForearm.texture.key, under: !!sk._handUnder, branch: b }; });
                    rows.push({ i, ...m });
                }
                if (i === JUMP - 1) signAt138 = (await page.evaluate(() => window.__branch.at(-1)))?.picked ?? null;
            }
            const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), at = i => rows.find(r => r.i === i);
            const res = { label, signAt138, elbowStep139: r2(d(at(139).elbow, at(138).elbow)), wristStep139: r2(d(at(139).wrist, at(138).wrist)), tipStep139: r2(d(at(139).tip, at(138).tip)), rows };
            out.jump[label] = res;
            console.log(`[item5] ${label}: elbow step ${res.elbowStep139}, wrist step ${res.wristStep139}, hand-end step ${res.tipStep139}`);
            return res;
        } finally { await h.close(); }
    };
    await run('as filmed', () => {});
    await run('art frozen from 139', () => { const sk = window.__rw.skeleton; sk.setPartVariants = () => {}; });
    await run('depth frozen from 139', () => { const w = window.__rw, v = !!w.skeleton._handUnder; w._handUnder = () => v; });
    await run('elbow branch frozen from 139', ({ signAt138 }) => {
        const Sk = window.__rw.skeleton.constructor, orig = Sk.solveReachArm.bind(Sk);
        Sk.solveReachArm = (S, lu, lf, g, front, sign, max) => orig(S, lu, lf, g, front, signAt138 ?? sign, max);
    });
    writeFileSync(outFile, JSON.stringify(out, null, 1));
}
process.exit(0);
