// PLAN_ROPES T0.1: rope draw order and body penetration, measured on the game as it is (no src change, no flag).
// Every frame: the drawn core of each rope strand (captured from the graphics' own fillPoints calls, with that graphic's depth) is rasterised; every painted texel of every visible
// wrestler part (alpha >= 128, mapped through the part's world matrix, as scale_rope_body.mjs does) that lands on a strand is a crossing. For each crossing, which should be in front
// (the strand point's ground y vs the wrestler's ground y: `y`, or the corner matY on the ropes; larger = nearer the camera) against what is drawn (strand graphic depth vs the part's depth).
// Penetration (side walls): ink beyond a side strand's plane (its rest x at the wrestler's ground depth) within 3 px of that strand's drawn y there, root inside the ring.
// px = unique 1x1 world-px cells per (part, strand). Near/far walls cannot show penetration from ink alone (depth is not in the picture): they are crossings only.
//
//   WFM_URL=http://localhost:5173 node tools/debug/rope_order_probe.mjs [outDir=research/ropes-2026-11/r0] [runs=a,b,c,d] [--film]
// Runs: a far-edge walk into both far corners and back; b both side walls up and down (facing the rope); c moves taken against far corners and side walls; d AI soak 4 pairings x SEC s.
// Writes <outDir>/probe.json (summary + per-frame records), <outDir>/stills/*.png (pool of worst frames, with marks), <outDir>/film/<rig>/fNNNN.jpg (--film: run a at 30 fps).
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', KOW = 'kowalski-roster-v1', GUIDO = 'guido-roster-v1';
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const outDir = args[0] ?? 'research/ropes-2026-11/r0';
const RUNS = (args[1] ?? 'a,b,c,d').split(',');
const FILM = process.argv.includes('--film');
const SEC = Number(process.env.SEC ?? 60);
const NWRONG = 12, NPEN = 6;

// ---- in page ---------------------------------------------------------------------------------------------------------------
const INSTALL = ({ ai }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    if (ai) { for (const n of [1, 2]) if (sc[`w${n}`].input !== sc[`_p${n}AI`]) sc._togglePlayer(n); } else { sc._p1AI = null; sc._p2AI = null; }
    window.__T = sc.time.now;
    window.__idle = { ...sc.w1.pose };
    let a0 = 0x5eed1234;
    Math.random = () => { a0 = (a0 + 0x6D2B79F5) | 0; let t = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // capture each rope graphic's polygons per frame
    window.__seq = 0;
    const wrap = (g) => {
        const fp = g.fillPoints.bind(g), cl = g.clear.bind(g);
        g.__calls = [];
        g.fillPoints = (pts, ...r) => { const c = pts.map(p => ({ x: p.x, y: p.y })); c.seq = ++window.__seq; g.__calls.push(c); return fp(pts, ...r); };
        g.clear = () => { g.__calls = []; return cl(); };
    };
    [...sc.nearRopeBands, sc.farRopeGfx, ...sc.sideRopeBands, ...(sc.sideRopeSplit ?? [])].forEach(wrap);
    const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1200;
    const names = (w) => { const sk = w.skeleton, out = []; for (const [k, v] of Object.entries(sk)) { const i = sk._parts.indexOf(v); if (i >= 0 && !out[i]) out[i] = k; } return out.map((n, i) => n ?? `part${i}`); };
    window.__probe = { cv, cx: cv.getContext('2d', { willReadFrequently: true }), inkCache: new Map(), alphaCv: document.createElement('canvas'), names: { 1: names(sc.w1), 2: names(sc.w2) }, snaps: [] };
    const box = document.querySelector('canvas').getBoundingClientRect(), g = game.scale.gameSize;
    return { box: { x: box.x, y: box.y, w: box.width, h: box.height, gw: g.width, gh: g.height }, rigs: [sc.w1.rigId, sc.w2.rigId] };
};

// Strand ids: 1-3 near (bottom, middle, top), 4-6 far, 7-9 side L, 10-12 side R.
const STRANDS = [null, ...['near', 'far', 'L', 'R'].flatMap(wall => [0, 1, 2].map(ri => ({ wall, ri })))];

const MEASURE = ({ cells }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], P = window.__probe, RING = window.__RING;
    const { cv, cx } = P;
    cx.clearRect(0, 0, 1920, 1200);
    const depthOf = { near: sc.nearRopeBands, far: [sc.farRopeGfx], L: sc.sideRopeBands, R: sc.sideRopeBands };
    const poly = (pts) => { cx.beginPath(); pts.forEach((p, i) => i ? cx.lineTo(p.x * 2, p.y * 2) : cx.moveTo(p.x * 2, p.y * 2)); cx.closePath(); cx.fill(); };
    const sideGeom = { L: [[], [], []], R: [[], [], []] };   // [ri][band] = [c_i, c_i+1] centreline of the core quad
    const paint = (id, band, pts) => { cx.fillStyle = `rgb(${id * 16},${(band + 1) * 8},0)`; poly(pts); };
    sc.nearRopeBands.forEach((g, i) => { for (let ri = 0; ri < 3; ri++) { const c = g.__calls[3 * ri + 1]; if (c) paint(1 + ri, i, c); } });
    { const c = sc.farRopeGfx.__calls; for (let ri = 0; ri < 3; ri++) if (c[3 * ri + 1]) paint(4 + ri, -1, c[3 * ri + 1]); }
    const sideQuad = (wall, ri, seg, c, depth, t0, t1) => {
        paint((wall === 'L' ? 7 : 10) + ri, seg, c);
        sideGeom[wall][ri][seg] = { c0: { x: (c[0].x + c[3].x) / 2, y: (c[0].y + c[3].y) / 2 }, c1: { x: (c[1].x + c[2].x) / 2, y: (c[1].y + c[2].y) / 2 }, depth, t0, t1 };
    };
    const planDbg = sc.sideRopeSplit ? sc._splitDebug : null;
    if (planDbg) {   // ?ropes=v1: the pieces were drawn in segment order per (rope, dir) across the split graphics; the call sequence number puts them back in order
        // T1.4: each wall has its own plan (press window), so the calls are decoded wall by wall: per rope, left then right, nseg segments each, 3 calls per segment
        const all = sc.sideRopeSplit.flatMap(g => g.__calls.map(c => ({ c, g }))).sort((p, q) => p.c.seq - q.c.seq);
        const wp = planDbg.wall ?? { '-1': planDbg, 1: planDbg };
        let idx = 0;
        for (let ri = 0; ri < 3; ri++) for (const [dir, wall] of [[-1, 'L'], [1, 'R']]) {
            const pl = wp[dir];
            for (let seg = 0; seg < pl.ts.length - 1; seg++, idx += 3) { const e = all[idx + 1]; if (e) sideQuad(wall, ri, seg, e.c, e.g.depth, pl.ts[seg], pl.ts[seg + 1]); }
        }
    } else sc.sideRopeBands.forEach((g, i) => { for (let ri = 0; ri < 3; ri++) for (const [k, wall] of [[0, 'L'], [1, 'R']]) {
        const c = g.__calls[3 * (ri * 2 + k) + 1]; if (c) sideQuad(wall, ri, i, c, g.depth, i / sc.sideRopeBands.length, (i + 1) / sc.sideRopeBands.length);
    } });
    const sp = sc._sidePtsDebug;
    const nBands = sc.sideRopeBands.length;
    const lerpPt = (arr, u) => { const i = Math.min(arr.length - 2, Math.max(0, Math.floor(u))), f = Math.min(1, Math.max(0, u - i)); return { x: arr[i].x + (arr[i + 1].x - arr[i].x) * f, y: arr[i].y + (arr[i + 1].y - arr[i].y) * f }; };
    const out = [];
    for (const [n, w] of [[1, sc.w1], [2, sc.w2]]) {
        const parts = w.skeleton._parts, names = P.names[n];
        const onRopes = !!w._onRopes();
        const gy = onRopes ? w._corner.matY : w.y;
        const b = { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * (RING.nearLeft.y - gy) / (RING.nearLeft.y - RING.farLeft.y), right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * (RING.nearLeft.y - gy) / (RING.nearLeft.y - RING.farLeft.y) };
        const tW = (RING.nearLeft.y - gy) / (RING.nearLeft.y - RING.farLeft.y);
        const inside = w.x > b.left && w.x < b.right;
        // T1.4: the press window on each side wall (either man's: the old rule lowered the strands for any press, and two men at one depth share a cut)
        //   (was: the press window this man holds on each side wall (strands under him by design), t range or null
        // RS: a spilled man's bottom strand draws over everyone within +-0.14 t of him (the rope lies across his chest): pieces there drawn over him are intended, their own row
        const owin = w.isSpilled?.() ? { [w._spill.wall]: [tW - 0.14, tW + 0.14] } : {};
        const pwin = sc.sideRopeSplit ? Object.fromEntries([['L', -1], ['R', 1]].map(([k, d]) => { return [k, sc._splitDebug?.wins?.[d]?.find(Boolean) ?? null]; })) : {};
        // penetration reference lines at his depth: per side wall and rope, the plane x (rest) and the drawn y there
        const pen = [];
        if (sp && inside) for (const [dir, wall] of [[-1, 'L'], [1, 'R']]) for (let ri = 0; ri < 3; ri++) {
            const ref = lerpPt(sp.ref[ri][dir], tW * nBands), pt = lerpPt(sp.pts[ri][dir], tW * nBands);
            pen.push({ wall, ri, dir, px: ref.x, y: pt.y });
        }
        const vis = [];
        parts.forEach((im, i) => {
            if (!im || !im.frame || !im.visible || !(im.alpha > 0) || !im.frame.source?.image) return;
            vis.push({ im, i, b: im.getBounds() });
        });
        if (!vis.length) { out.push(null); continue; }
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const v of vis) { x0 = Math.min(x0, v.b.left); y0 = Math.min(y0, v.b.top); x1 = Math.max(x1, v.b.right); y1 = Math.max(y1, v.b.bottom); }
        const rx0 = Math.max(0, Math.floor(x0) - 2), ry0 = Math.max(0, Math.floor(y0) - 2), rx1 = Math.min(960, Math.ceil(x1) + 2), ry1 = Math.min(600, Math.ceil(y1) + 2);
        const rw = rx1 - rx0, rh = ry1 - ry0;
        const rec = { who: n, fd: +(12 + gy * 0.03).toFixed(4), gd: +w.gfx.depth.toFixed(4), pd: +w.skeleton.torso.depth.toFixed(4), cuts: sc._splitDebug?.cuts?.map(c => [+c.t.toFixed(3), +c.depth.toFixed(3), +c.low.toFixed(3)]), rig: w.rigId, x: +w.x.toFixed(1), y: +w.y.toFixed(1), gy, st: w.state, mv: w._activeMove?.clip?.id ?? null, onRopes, inside, cross: 0, crossWall: {}, wrong: 0, wrongTally: {}, penPx: 0, penOver: 0, overCells: [], penTally: {}, wrongCells: [], penCells: [] };
        if (rw <= 0 || rh <= 0) { out.push(rec); continue; }
        const mask = cx.getImageData(rx0 * 2, ry0 * 2, rw * 2, rh * 2).data;
        const seen = new Set(), seenPen = new Set();
        for (const { im, i } of vis) {
            const f = im.frame;
            const m = im.getWorldTransformMatrix();
            // sample every k-th texel in both axes so the spacing on screen is <= 0.5 px (cells are 1 px: no cell is missed, a hairline feature may lose a cell)
            const k = Math.max(1, Math.round(0.5 / Math.max(1e-6, Math.hypot(m.a, m.b)))), ckey = (f.texture?.key ?? '') + '|' + f.name + '|' + f.cutX + ',' + f.cutY + ',' + f.cutWidth + '|' + k;
            let ink = P.inkCache.get(ckey);
            if (!ink) {
                const ac = P.alphaCv; ac.width = f.cutWidth; ac.height = f.cutHeight;
                const ax = ac.getContext('2d', { willReadFrequently: true }); ax.clearRect(0, 0, ac.width, ac.height);
                ax.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
                const d = ax.getImageData(0, 0, f.cutWidth, f.cutHeight).data, xs = [], ys = [];
                for (let j = 0; j < f.cutHeight; j += k) for (let kk = 0; kk < f.cutWidth; kk += k) if (d[(j * f.cutWidth + kk) * 4 + 3] >= 128) { xs.push(kk); ys.push(j); }
                ink = { xs: Int16Array.from(xs), ys: Int16Array.from(ys) }; P.inkCache.set(ckey, ink);
            }
            const ox = im.displayOriginX, oy = im.displayOriginY, rwid = f.realWidth, rhei = f.realHeight, ox0 = f.x ?? 0, oy0 = f.y ?? 0;
            const fx = im.flipX, fy = im.flipY, pname = names[i], pdepth = im.depth;
            for (let q = 0; q < ink.xs.length; q++) {
                const px = (fx ? rwid - (ink.xs[q] + 0.5 + ox0) : ink.xs[q] + 0.5 + ox0) - ox, py = (fy ? rhei - (ink.ys[q] + 0.5 + oy0) : ink.ys[q] + 0.5 + oy0) - oy;
                const X = m.a * px + m.c * py + m.tx, Y = m.b * px + m.d * py + m.ty;
                let hereS = null, hereDepth = 0;
                const mx = Math.floor(X * 2) - rx0 * 2, my = Math.floor(Y * 2) - ry0 * 2;
                if (mx >= 0 && my >= 0 && mx < rw * 2 && my < rh * 2) {
                    const o = (my * rw * 2 + mx) * 4;
                    hereS = null;
                    if (mask[o + 3] >= 128) {
                        const id = Math.round(mask[o] / 16), band = Math.round(mask[o + 1] / 8) - 1, S = window.__STRANDS[id];
                        const okBand = S && (S.wall === 'far' ? true : S.wall === 'near' ? !!sc.nearRopeBands[band] : !!sideGeom[S.wall][S.ri][band]);
                        hereS = okBand ? S : null; hereDepth = okBand && S.wall !== 'near' && S.wall !== 'far' ? sideGeom[S.wall][S.ri][band].depth : 0;   // a pixel blended from two strands at a crossing decodes to nothing real: skipped
                        if (okBand) {
                            const cell = ((Math.floor(Y) * 1000 + Math.floor(X)) * 64 + i) * 16 + id;
                            if (!seen.has(cell)) {
                                seen.add(cell); rec.cross++; rec.crossWall[S.wall] = (rec.crossWall[S.wall] ?? 0) + 1;
                                let sGround, sDepth;
                                if (S.wall === 'near') { sGround = RING.nearLeft.y; sDepth = sc.nearRopeBands[band].depth; }
                                else if (S.wall === 'far') { sGround = RING.farLeft.y; sDepth = sc.farRopeGfx.depth; }
                                else {
                                    const G = sideGeom[S.wall][S.ri][band], c0 = G.c0, c1 = G.c1, dx = c1.x - c0.x, dy = c1.y - c0.y;
                                    const fr = Math.min(1, Math.max(0, ((X - c0.x) * dx + (Y - c0.y) * dy) / (dx * dx + dy * dy || 1)));
                                    sGround = RING.nearLeft.y + (RING.farLeft.y - RING.nearLeft.y) * (G.t0 + fr * (G.t1 - G.t0)); sDepth = G.depth;
                                }
                                const shouldFront = sGround > gy + 0.5, shouldBehind = sGround < gy - 0.5;
                                const drawnFront = sDepth > pdepth;
                                const sT = (sGround - RING.nearLeft.y) / (RING.farLeft.y - RING.nearLeft.y), pw = pwin[S.wall];
                                const ow = S.ri === 0 ? owin[S.wall] : null;
                                if (ow && drawnFront && sT > ow[0] && sT < ow[1]) { rec.overPx = (rec.overPx ?? 0) + 1; }   // spilled man: the bottom strand over him by design
                                else if (pw && shouldFront && !drawnFront && sT > pw[0] && sT < pw[1]) { rec.pressPx = (rec.pressPx ?? 0) + 1; rec.pressWall = S.wall; }   // inside his press window, under him by design
                                else if ((shouldFront && !drawnFront) || (shouldBehind && drawnFront)) {
                                    rec.wrong++;
                                    const key = `${S.wall}${S.ri}|${pname}|${drawnFront ? 'strandOver' : 'strandUnder'}`;
                                    rec.wrongTally[key] = (rec.wrongTally[key] ?? 0) + 1;
                                    if (cells && rec.wrongCells.length < 400) rec.wrongCells.push([+X.toFixed(1), +Y.toFixed(1)]);
                                }
                            }
                        }
                    }
                }
                for (const p of pen) {
                    if (Math.abs(Y - p.y) > 3 || (p.dir < 0 ? X >= p.px : X <= p.px)) continue;
                    const cell = ((Math.floor(Y) * 1000 + Math.floor(X)) * 64 + i) * 16 + (p.dir < 0 ? 7 : 10) + p.ri;
                    if (seenPen.has(cell)) continue;
                    seenPen.add(cell); rec.penPx++;
                    if (hereS && hereDepth && hereDepth < pdepth) { rec.penOver++; if (cells && rec.overCells.length < 400) rec.overCells.push([+X.toFixed(1), +Y.toFixed(1)]); }
                    const key = `${p.wall}${p.ri}|${pname}`; const e = rec.penTally[key] ??= { px: 0, past: 0 };
                    e.px++; e.past = Math.max(e.past, Math.abs(X - p.px));
                    if (cells && rec.penCells.length < 400) rec.penCells.push([+X.toFixed(1), +Y.toFixed(1)]);
                }
            }
        }
        // ring region from the ground root: row by depth (far >= 0.6, near < 0.4), column by the ring's width at that depth
        const u = (w.x - b.left) / (b.right - b.left);
        rec.region = `${tW >= 0.6 ? 'far' : tW < 0.4 ? 'near' : 'mid'}-${u < 0.25 ? 'left' : u > 0.75 ? 'right' : 'mid'}`;
        out.push(rec);
    }
    return out.filter(Boolean);
};

// A run: INIT builds the scene state and a per-frame script; ONE steps a frame (keys from the script), then measures.
const INIT = (cfg) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2, RING = window.__RING;
    const bounds = (y) => { const t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y); return { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t }; };
    sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null; sc.pinText?.setAlpha(0); sc.matchOver = false;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null; w._corner = null; w._whip = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null; w.runPhase = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    const keys = { a: new Set(), ad: new Set() };
    const R = window.__run = { cfg, f: 0, keys, done: false, script: null, phase: 0, wait: 0, quiet: 0 };
    if (!cfg.ai) {
        a.input = { justDown: (k) => keys.a.has(k), isDown: (k) => keys.ad.has(k) };
        d.input = { justDown: () => false, isDown: () => false };
    }
    const s = a.s;
    const hold = (...ks) => { keys.ad = new Set(ks); keys.a = new Set(); };
    if (cfg.kind === 'ai') { a.x = 330; d.x = 630; a.y = d.y = 360; a.facing = 1; d.facing = -1; R.max = cfg.frames; R.script = () => {}; return; }
    if (cfg.kind === 'walkFar') {
        a.y = 280; a.x = 480; a.facing = 1; d.x = 700; d.y = 420; d.facing = -1;
        R.max = 1400;
        R.script = () => {
            const b = bounds(a.y);
            if (R.wait > 0) { R.wait--; hold('up'); return; }
            if (R.phase === 0) { hold('up', 'left'); if (a.x <= b.left + 22) { R.phase = 1; R.wait = 30; } }
            else if (R.phase === 1) { hold('up', 'right'); if (a.x >= b.right - 22) { R.phase = 2; R.wait = 30; } }
            else if (R.phase === 2) { hold('up', 'left'); if (a.x <= 480) { R.done = true; } }
        };
    } else if (cfg.kind === 'walkSide') {
        const dir = cfg.wall === 'L' ? -1 : 1, key = dir < 0 ? 'left' : 'right';
        a.y = 420; a.x = bounds(420)[dir < 0 ? 'left' : 'right'] - dir * 22; a.facing = dir; d.x = 480; d.y = 420; d.facing = -1;
        R.max = 1400;
        R.script = () => {
            if (R.wait > 0) { R.wait--; hold(key); return; }
            if (R.phase === 0) { hold(key, 'up'); if (a.y <= RING.farLeft.y + 8) { R.phase = 1; R.wait = 30; } }
            else if (R.phase === 1) { hold(key, 'down'); if (a.y >= 420) { R.phase = 2; R.wait = 20; } }
            else if (R.phase === 2) { R.done = true; }
        };
    } else if (cfg.kind === 'move') {
        // the attacker toward the ring centre of the defender, who has his back to the wall; wall = 'FL' | 'FR' (far corners) | 'L' | 'R' (side walls, mid depth)
        const dir = cfg.wall.endsWith('L') ? -1 : 1, y = cfg.wall === 'N' ? 432 : cfg.wall.startsWith('F') ? 272 : 350, b = bounds(y);
        d.y = y; d.x = cfg.wall === 'N' ? 480 : (dir < 0 ? b.left : b.right) - dir * 30; a.y = y; a.x = d.x - dir * 70 * s; a.facing = -dir; d.facing = dir;   // wall 'N' = beside the near wall (T1.6)
        if (cfg.move === 'suplex' && cfg.backToWall) { const pl = dir < 0 ? b.left : b.right; a.x = pl - dir * (cfg.aDist ?? 40) * s; d.x = a.x - dir * 70 * s; a.facing = -dir; d.facing = dir; }   // TS.6b: the attacker's back to the wall, the man he takes over lands behind him, beside it
        R.max = 480; R.called = false;
        R.script = () => {
            if (R.f === 3) {
                R.called = true;
                const m = cfg.move;
                if (m === 'bodySlam') a._doBodySlam(d); else if (m === 'suplex') a._doSuplex(d);
                else if (m === 'irishWhip') a._doIrishWhip(d, dir, cfg.wall.startsWith('F') ? -1 : 0);
                else if (m === 'clothesline') a._doClothesline(d);
                else a._doMatMove(m, d);
            }
            const idle = (w) => w.state === 'standing' && !w._activeMove && !w.runPhase;
            if (R.called && R.f > 60 && idle(a) && idle(d)) { R.quiet++; if (R.quiet > 25) R.done = true; } else R.quiet = 0;
        };
    }
};

const ONE = ({ cells }) => {
    const game = window.__WFM_GAME, R = window.__run;
    R.script();
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    R.f++;
    if (R.f >= R.max) R.done = true;
    const sc = game.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), gs = game.scale.gameSize;
    const recs = window.__MEASURE({ cells }).map(r => ({ ...r, f: R.f }));
    return { recs, done: R.done, scr: { ox: -cam.worldView.x * cam.zoom * box.width / gs.width, oy: -cam.worldView.y * cam.zoom * box.height / gs.height, kx: cam.zoom * box.width / gs.width, ky: cam.zoom * box.height / gs.height, w: box.width, h: box.height } };
};

// Run up to `n` frames in the page; frames that beat a pool threshold come back with a PNG and their marks.
const BATCH = ({ n, thrW, thrP }) => {
    const out = [], snaps = [];
    for (let i = 0; i < n; i++) {
        const r = window.__ONE({ cells: true });
        const keep = [];
        for (const rec of r.recs) {
            const slim = { ...rec, wrongCells: undefined, penCells: undefined, overCells: undefined };
            if (rec.cross > 0 || rec.penPx > 0) out.push(slim);
            if (rec.wrong >= thrW || (rec.penOver >= thrP && rec.inside && !['climbing', 'onTurnbuckle'].includes(rec.st))) keep.push(rec);
        }
        if (keep.length) {
            const wrong = Math.max(0, ...keep.map(k => k.wrong)), pen = Math.max(0, ...keep.map(k => k.penOver));
            // a PNG straight after the step, while the drawing buffer is still the frame just rendered
            snaps.push({ f: window.__run.f, wrong, pen, png: window.__WFM_GAME.canvas.toDataURL('image/png'), scr: r.scr, recs: keep });
            snaps.sort((p, q) => Math.max(q.wrong, q.pen) - Math.max(p.wrong, p.pen)); snaps.length = Math.min(snaps.length, 4);
        }
        if (r.done) return { out, snaps, done: true, f: window.__run.f };
    }
    return { out, snaps, done: false, f: window.__run.f };
};

// ---- node ------------------------------------------------------------------------------------------------------------------
const pools = { wrong: [], pen: [] };
let stillN = 0;
mkdirSync(join(outDir, 'stills'), { recursive: true });
const savePng = (png) => { const p = join('stills', `s${String(stillN++).padStart(3, '0')}.png`); writeFileSync(join(outDir, p), Buffer.from(png.split(',')[1], 'base64')); return p; };
const thr = () => ({ thrW: pools.wrong.length < NWRONG ? 1 : pools.wrong.at(-1).score + 1, thrP: pools.pen.length < NPEN ? 1 : pools.pen.at(-1).score + 1 });
const offer = (kind, run, s) => {
    const score = kind === 'wrong' ? s.wrong : s.pen, pool = pools[kind], cap = kind === 'wrong' ? NWRONG : NPEN;
    if (!score) return;
    const near = pool.find(e => e.run === run && Math.abs(e.f - s.f) < 45);   // one entry per event: frames of the same moment compete with each other
    if (near) { if (near.score >= score) return; rmSync(join(outDir, near.file)); pool.splice(pool.indexOf(near), 1); }
    else if (pool.length >= cap && pool.at(-1).score >= score) return;
    const file = savePng(s.png);
    pool.push({ kind, run, f: s.f, score, file, scr: s.scr, recs: s.recs });
    pool.sort((p, q) => q.score - p.score);
    while (pool.length > cap) rmSync(join(outDir, pool.pop().file));
};

const runOne = async (page, cfg, label) => {
    await page.evaluate(INIT, cfg);
    const recs = []; let frames = 0;
    for (;;) {
        const r = await page.evaluate(BATCH, { n: cfg.kind === 'ai' ? 120 : 30, ...thr() });
        for (const x of r.out) recs.push({ run: label, ...x });
        for (const s of r.snaps) { offer('wrong', label, s); offer('pen', label, s); }
        frames = r.f;
        if (r.done) break;
    }
    return { label, frames, recs };
};

const RING = { nearLeft: { x: 40, y: 445 }, nearRight: { x: 920, y: 445 }, farLeft: { x: 210, y: 258 }, farRight: { x: 750, y: 258 }, ropes: [{ nearY: 380, farY: 218 }, { nearY: 316, farY: 181 }, { nearY: 251, farY: 142 }] };

const launchWith = async (p1, p2, ai) => {
    process.env.WFM_P1 = p1; process.env.WFM_P2 = p2; process.env.WFM_QS = 'notitle=1' + '&ropes=' + (process.env.ROPES === 'v1' ? 'v1' : 'off') + (process.env.PAST === '1' ? '&ropesPast=1' : '') + '&ropeContact=' + (process.env.CONTACT === 'v1' ? 'v1' : 'off') + (process.env.SPILL === 'v1' ? '&ropeSpill=v1' : (process.env.SPILLQS || '&ropeSpill=off')) + (process.env.SWAYSCALE ? `&ropeSway=${process.env.SWAYSCALE}` : ''); process.env.WFM_INIT_SCRIPT = new URL('./no_hmr_init.js', import.meta.url).pathname;
    const h = await launch();
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 });
    await h.page.waitForTimeout(1500);
    h.page.on('framenavigated', fr => console.log('[ropes] NAVIGATED', fr.url()));
    h.page.on('crash', () => console.log('[ropes] PAGE CRASH'));
    await h.page.evaluate((R) => { window.__RING = R; }, RING);
    await h.page.evaluate(`window.__STRANDS=${JSON.stringify(STRANDS)};window.__MEASURE=${MEASURE.toString()};window.__ONE=${ONE.toString()};`);
    const info = await h.page.evaluate(INSTALL, { ai });
    return { h, info };
};

const results = [];
if (process.argv.includes('--profile')) {
    const { h } = await launchWith(LOU, GEORGE, false);
    const r = await h.page.evaluate(() => {
        window.__run = null; return 0;
    });
    await h.page.evaluate(INIT, { kind: 'move', move: 'wristlockHammerlock', wall: 'R' });
    const t = await h.page.evaluate(() => {
        const g = window.__WFM_GAME, sc = g.scene.scenes[0], out = [];
        for (let i = 0; i < 400; i++) { window.__run.script(); window.__T += 1000 / 60; g.step(window.__T, 1000 / 60);
            const w = window.__MEASURE({ cells: false }); if (w.some(r => r.wrong > 0) && out.length < 3 && i > 5) out.push({ i, men: [sc.w1, sc.w2].map(m => ({ y: m.y, x: m.x, st: m.state, formula: 12 + m.y * 0.03, gfx: m.gfx.depth, torso: m.skeleton.torso.depth })), plan: sc._splitDebug && { ts: sc._splitDebug.ts.map(v => +v.toFixed(3)), group: sc._splitDebug.group, depths: sc._splitDebug.depths, cuts: sc._splitDebug.cuts }, w: w.map(r => [r.who, r.wrong, r.gy, JSON.stringify(r.wrongTally).slice(0, 150)]) }); }
        return out;
    });
    console.log(JSON.stringify(t));
    await h.close(); process.exit(0);
}
// T1.4 --whip: normal-speed (30 fps) strips of the Irish whip into each side wall (L, R) and the far corners (FL, FR), both rigs as the whipper; frames in <outDir>/whip/<rig>-<wall>/
if (process.argv.includes('--whip')) {
    // MOVE=<irishWhip|bodySlam|walkFar> WALLS=L,R,FL,FR PEAKS=<dir of a previous run>: with ropeContact on, the frame of the largest bow is kept as peak-<rig>-<wall>.png; a later run (flag off) is shot at those frames
    const out = [], MOVE = process.env.MOVE ?? 'irishWhip', WALLS = (process.env.WALLS ?? 'L,R,FL,FR').split(','), peaksIn = process.env.PEAKS ? JSON.parse(readFileSync(join(process.env.PEAKS, 'whip', 'peaks.json'))) : null, peaks = {};
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h, info } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'lou' : 'george';
            for (const wall of WALLS) {
                const dir = join(outDir, 'whip', `${rig}-${wall}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
                await h.page.evaluate(INIT, MOVE === 'walkFar' ? { kind: 'walkFar' } : { kind: 'move', move: MOVE, wall });
                const clip = { x: info.box.x, y: info.box.y + info.box.h * (wall.startsWith('F') || wall === 'W' ? 0.15 : 0.3), width: info.box.w, height: info.box.h * 0.55 };
                let n = 0, best = 0, bestF = -1; const want = peaksIn?.[`${rig}-${wall}`];
                for (let f = 0; ; f++) {
                    const r = await h.page.evaluate(() => window.__ONE({ cells: false }));
                    const v = await h.page.evaluate(() => Math.max(0, ...(window.__WFM_GAME.scene.scenes[0]._contactDebug ?? []).map(a => Math.abs(a.val))));
                    if (f % 2 === 0) await h.page.screenshot({ path: join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 72, clip });
                    if (v > best + 0.05) { best = v; bestF = f; if (!peaksIn) await h.page.screenshot({ path: join(outDir, 'whip', `peak-${rig}-${wall}.png`), clip }); }
                    if (peaksIn && want && f === want.f) await h.page.screenshot({ path: join(outDir, 'whip', `peak-${rig}-${wall}.png`), clip });
                    if (r.done || f > 1500) break;
                }
                peaks[`${rig}-${wall}`] = { f: bestF, px: +best.toFixed(1) };
                out.push({ rig, wall, frames: n }); console.log(`[ropes] ${MOVE} ${rig} ${wall}: ${n} frames, peak bow ${best.toFixed(1)} px at f${bestF}`);
            }
        } finally { await h.close(); }
    }
    writeFileSync(join(outDir, 'whip', 'index.json'), JSON.stringify(out)); writeFileSync(join(outDir, 'whip', 'peaks.json'), JSON.stringify(peaks)); process.exit(0);
}
// T1.5 --stills: the R0 slam-at-side-wall spots (bodySlam at L f73, at FL f71, Lou) as a PNG each, named by STILLTAG (e.g. t14 / t15)
if (process.argv.includes('--stills')) {
    const { h, info } = await launchWith(LOU, GEORGE, false);
    try {
        mkdirSync(outDir, { recursive: true });
        for (const [wall, fr] of [['L', 73], ['FL', 71], ['R', 73], ['FR', 71]]) {
            await h.page.evaluate(INIT, { kind: 'move', move: 'bodySlam', wall });
            for (let f = 0; f < fr; f++) await h.page.evaluate(() => window.__ONE({ cells: false }));
            await h.page.screenshot({ path: join(outDir, `${process.env.STILLTAG ?? 'still'}-${wall}.png`), clip: { x: info.box.x, y: info.box.y, width: info.box.w, height: info.box.h } });
            console.log(`[ropes] still ${wall} f${fr}`);
        }
    } finally { await h.close(); }
    process.exit(0);
}
// T1.6 --sway: slam beside each side wall and the near wall (Lou and George as the slammer); per wall the bottom strand's swing (px) and settle time, plus strips with --shots into <outDir>/<rig>-<wall>/.
//   SWAYSCALE=<n> sets ?ropeSway. Needs ROPES=v1.
if (process.argv.includes('--sway')) {
    const rows = [];
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h, info } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'lou' : 'george';
            for (const wall of ['L', 'R', 'N']) {
                await h.page.evaluate(INIT, { kind: 'move', move: 'bodySlam', wall });
                const dir = join(outDir, `${rig}-${wall}`);
                if (process.argv.includes('--shots')) { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); }
                const clip = { x: info.box.x, y: info.box.y + info.box.h * 0.3, width: info.box.w, height: info.box.h * 0.6 };
                const tl = []; let n = 0;
                for (let f = 0; ; f++) {
                    const r = await h.page.evaluate(() => window.__ONE({ cells: false }));
                    const m = await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], s = sc._swayDebug; return { st: sc.w2.state, lg: s ? s.log.length : 0, tt: s ? +s.t.toFixed(3) : 0, v: s ? Object.fromEntries(Object.entries(s.spring).map(([k, q]) => [k, q.val])) : null }; });
                    tl.push({ f, ...m });
                    if (process.argv.includes('--shots') && f % 2 === 0) await h.page.screenshot({ path: join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 72, clip });
                    if (r.done && f > 60) break;
                    if (f > 520) break;
                }
                const walls = ['near', 'R', 'far', 'L'], per = {};
                const first = tl.findIndex(x => x.v && walls.some(w => Math.abs(x.v[w]) > 0.5));
                const lastKick = tl.reduce((a, x, i) => i && x.lg > tl[i - 1].lg ? i : a, -1);   // frame of the last kick (landing kick, then the top-ups while he lies on it)
                for (const w of walls) {
                    const ys = tl.map(x => Math.abs(x.v?.[w] ?? 0)), last = ys.reduce((a, v, i) => v > 0.5 ? i : a, -1);
                    per[w] = { maxPx: +Math.max(...ys).toFixed(1), settleS: first < 0 || last < 0 ? 0 : +((last - first) / 60).toFixed(2), settleAfterLastKickS: last < 0 ? 0 : +(Math.max(0, last - lastKick) / 60).toFixed(2), maxWhileGettingUp: +Math.max(0, ...tl.filter(x => x.st === 'gettingUp').map(x => Math.abs(x.v?.[w] ?? 0))).toFixed(1) };
                }
                rows.push({ rig, wall, scale: process.env.SWAYSCALE ?? '1', firstFrame: first, kicks: tl.at(-1).lg, lastKickFrame: lastKick, states: [...new Set(tl.map(x => x.st))], per, frames: n }); console.log(`[ropes] sway ${rig} ${wall}`, JSON.stringify(per));
            }
        } finally { await h.close(); }
    }
    mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, 'sway.json'), JSON.stringify(rows, null, 1)); process.exit(0);
}
// T2.2 --contact: the run-c moves, per run the largest bow (px) each wall / strand reaches and how long the spring takes to go quiet after the last contact. Needs CONTACT=v1 ROPES=v1.
if (process.argv.includes('--contact')) {
    const rows = [];
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'lou' : 'george';
            for (const wall of ['FL', 'FR', 'L', 'R', 'N']) for (const move of ['bodySlam', 'suplex', 'irishWhip', 'clothesline', 'wristlockHammerlock']) {
                await h.page.evaluate(INIT, { kind: 'move', move, wall });
                const tl = [];
                for (let f = 0; f < 520; f++) {
                    const r = await h.page.evaluate(() => window.__ONE({ cells: false }));
                    tl.push(await h.page.evaluate(() => (window.__WFM_GAME.scene.scenes[0]._contactDebug ?? []).map(a => [a.key, +a.val.toFixed(2), a.target ? 1 : 0])));
                    if (r.done && f > 60) break;
                }
                const max = {}; let lastTarget = -1, lastLoud = -1;
                tl.forEach((fr, i) => { for (const [k, v, t] of fr) { const kk = k.split('|').slice(1).join('|'); max[kk] = Math.max(max[kk] ?? 0, Math.abs(v)); if (t) lastTarget = i; if (Math.abs(v) > 0.5) lastLoud = i; } });
                const ranges = Object.fromEntries(Object.entries(max).map(([k, v]) => [k, +v.toFixed(1)]));
                rows.push({ rig, wall, move, frames: tl.length, max: ranges, maxAny: Math.max(0, ...Object.values(ranges)), settleAfterReleaseS: lastTarget < 0 ? 0 : +(Math.max(0, lastLoud - lastTarget) / 60).toFixed(2) });
                console.log(`[ropes] contact ${rig} ${move} ${wall}: max ${Math.max(0, ...Object.values(ranges))} px, settle ${rows.at(-1).settleAfterReleaseS} s`);
            }
        } finally { await h.close(); }
    }
    mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, 'contact.json'), JSON.stringify(rows, null, 1)); process.exit(0);
}
// TS.0 --spillscan: every knockdown (a man entering 'down' from another state): where, which fall, which way the head points, and how far his head / torso ink ends past the side plane
// 1.0 s later. Runs: bodySlam / suplex / clothesline / irishWhip at the L, R and near spots (both rigs), then the AI soak (SEC s per pairing). SPILLSCAN=v1 also sets ?ropeSpill=v1.
const SCAN = async (page) => page.evaluate(async () => {
    const { partInkX } = await import('/src/ropeInk.js'), sc = window.__WFM_GAME.scene.scenes[0], RING = window.__RING;
    const bounds = (y) => { const t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y); return { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t }; };
    window.__spills = []; window.__spillGame = { t: 0 }; const prev = new Map(), pend = [];
    sc.events.off('postupdate', window.__spillTick);
    window.__spillTick = (time, delta) => {
        window.__spillGame.t += delta / 1000 * sc.timeScale;
        const now = window.__spillGame.t;
        for (const [n, w] of [[1, sc.w1], [2, sc.w2]]) {
            const was = prev.get(n); prev.set(n, w.state);
            window.__fx ??= {};
            if (w.state === 'falling' && was !== 'falling') window.__fx[n] = w.x;   // TS.5: where the fall began (landing shift = landing x - this)
            if (w.state === 'down' && was !== 'down' && was !== undefined) {
                const b = bounds(w.y), dl = w.x - b.left, dr = b.right - w.x, wall = dl < dr ? 'L' : 'R', d = Math.min(dl, dr) / w.s;
                pend.push({ at: now + 1.0, n, w, rec: { n, run: window.__scanRun, t: +now.toFixed(2), prevState: was, fall: w._fallVariant ?? null, lying: w.lying, facing: w.facing, rig: w.rigId, wall, rootToPlane: +d.toFixed(0), s: +w.s.toFixed(2), x: +w.x.toFixed(0), y: +w.y.toFixed(0), rootToPlaneAtLanding: +d.toFixed(0), landX: +w.x.toFixed(1), fallStartX: window.__fx[n] != null && was === 'falling' ? +window.__fx[n].toFixed(1) : null } });
            }
        }
        window.__ups ??= []; window.__gu ??= {};
        for (const [n, w] of [[1, sc.w1], [2, sc.w2]]) {
            const b = bounds(w.y), g = window.__gu[n];
            if (w.state === 'gettingUp') {
                const past = (im) => { const k = im?.visible ? partInkX(im) : null; return k ? Math.max(b.left - k.minX, k.maxX - b.right) : -999; };
                const o = g ?? (window.__gu[n] = { run: window.__scanRun, t: +now.toFixed(2), head: -999, torso: -999, x0: w.x, wall: Math.min(w.x - b.left, b.right - w.x) === w.x - b.left ? 'L' : 'R' });
                o.head = Math.max(o.head, past(w.skeleton.head)); o.torso = Math.max(o.torso, past(w.skeleton.torso)); o.x1 = w.x;
                // TS.5: does the DRAWN bottom strand pass through his head or torso ink box during the rise? Dense samples of the polyline inside the box = px of strand crossing the part (0 = clear)
                const pa = sc._sidePtsDebug?.pts?.[0]?.[o.wall === 'L' ? -1 : 1], inBox = (k) => { if (!k || !pa) return 0; let n = 0; for (let i = 0; i < pa.length - 1; i++) { const a0 = pa[i], b0 = pa[i + 1], L = Math.max(1, Math.ceil(Math.hypot(b0.x - a0.x, b0.y - a0.y))); for (let q = 0; q < L; q++) { const x = a0.x + (b0.x - a0.x) * q / L, y = a0.y + (b0.y - a0.y) * q / L; if (x >= k.minX && x <= k.maxX && y >= k.minY && y <= k.maxY) n++; } } return n; };
                const hk = w.skeleton.head?.visible ? partInkX(w.skeleton.head) : null, tk = w.skeleton.torso?.visible ? partInkX(w.skeleton.torso) : null, ch = inBox(hk), ct = inBox(tk);
                o.headCross = Math.max(o.headCross ?? 0, ch); o.torsoCross = Math.max(o.torsoCross ?? 0, ct); o.rise = (o.rise ?? 0) + 1; if (ch > 0) o.headCrossFrames = (o.headCrossFrames ?? 0) + 1; if (ct > 0) o.torsoCrossFrames = (o.torsoCrossFrames ?? 0) + 1;
                if (o.rise === 1) { o.headCross0 = ch; o.torsoCross0 = ct; }
            } else if (g) { window.__ups.push({ ...g, head: Math.round(g.head), torso: Math.round(g.torso), }); delete window.__gu[n]; }
        }
        for (let i = pend.length - 1; i >= 0; i--) {
            const q = pend[i]; if (q.at > now) continue; pend.splice(i, 1);
            const w = q.w, b = bounds(w.y), r = q.rec, ink = (im) => im?.visible ? partInkX(im) : null, hd = ink(w.skeleton.head), tr = ink(w.skeleton.torso);
            const past = (k) => k ? +Math.max(b.left - k.minX, k.maxX - b.right).toFixed(0) : null;
            const wallDir = r.wall === 'L' ? -1 : 1, hc = hd ? (hd.minX + hd.maxX) / 2 : w.x;
            // TS.5: the drawn bottom strand (strand 0 of this wall) against his torso ink: where it crosses the torso's mid height, measured from the neck end of the torso along it (px at s = 1; + = on the body, - = outside the neck end)
            if (tr) {
                const ptsA = sc._sidePtsDebug?.pts?.[0]?.[wallDir], my = (tr.minY + tr.maxY) / 2; let xc = null;
                if (ptsA) for (let i = 0; i < ptsA.length - 1; i++) { const a0 = ptsA[i], b0 = ptsA[i + 1]; if ((a0.y - my) * (b0.y - my) <= 0 && a0.y !== b0.y) { xc = a0.x + (b0.x - a0.x) * (my - a0.y) / (b0.y - a0.y); break; } }
                const neckEnd = wallDir < 0 ? tr.minX : tr.maxX, hipEnd = wallDir < 0 ? tr.maxX : tr.minX;
                r.torsoLen = +((tr.maxX - tr.minX) / w.s).toFixed(0); r.torsoMidDy = +((my - w.y) / w.s).toFixed(0);
                r.strandFromNeck = xc == null ? null : +(-wallDir * (xc - neckEnd) / w.s).toFixed(0);   // + when the strand is on the body side of the neck end
                r.strandFrac = xc == null ? null : +((-wallDir * (xc - neckEnd)) / Math.abs(hipEnd - neckEnd)).toFixed(2);
                r.hipsMargin = r.rootToPlane1s;
            }
            if (hd) { r.headTopDy = +((hd.minY - w.y) / w.s).toFixed(0); r.headBotDy = +((hd.maxY - w.y) / w.s).toFixed(0); r.headExt = +(wallDir * (wallDir < 0 ? w.x - hd.minX : hd.maxX - w.x) * 1 / w.s).toFixed(0); }
            r.headToward = Math.sign(hc - w.x) === wallDir; r.headPast = past(hd); r.torsoPast = past(tr); r.rootX1s = +w.x.toFixed(0); r.rootToPlane1s = +(Math.min(w.x - b.left, b.right - w.x) / w.s).toFixed(0); r.stillDown = w.state === 'down';
            window.__spills.push(r);
        }
    };
    sc.events.on('postupdate', window.__spillTick);
    return true;
});
if (process.argv.includes('--spillscan')) {
    const rows = [];
    if (process.env.SPILLSCAN === 'v1') process.env.SPILLQS = '&ropeSpill=v1';
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'lou' : 'george';
            await SCAN(h.page);
            for (const wall of ['L', 'R', 'N']) for (const move of ['bodySlam', 'suplex', 'clothesline', 'irishWhip']) {
                await h.page.evaluate((l) => { window.__scanRun = l; }, `c:${rig}:${move}:${wall}`);
                await h.page.evaluate(INIT, { kind: 'move', move, wall });
                for (let f = 0; f < 520; f++) { const r = await h.page.evaluate(() => { const R = window.__run; R.script(); window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); R.f++; return R.f >= R.max; }); if (r) break; }
                await h.page.evaluate(() => { const g = window.__WFM_GAME; for (let i = 0; i < 90; i++) { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); } });   // let the last landing's 1 s read finish
            }
            rows.push(...await h.page.evaluate(() => window.__spills));
        } finally { await h.close(); }
    }
    const soak = [];
    for (const [p1, p2, tag] of [[LOU, GEORGE, 'lou-george'], [LOU, KOW, 'lou-kowalski'], [GEORGE, GUIDO, 'george-guido'], [KOW, GUIDO, 'kowalski-guido']]) {
        const { h } = await launchWith(p1, p2, true);
        try {
            await SCAN(h.page); await h.page.evaluate((l) => { window.__scanRun = l; }, `d:${tag}`);
            await h.page.evaluate(INIT, { kind: 'ai', ai: true, frames: SEC * 60 });
            await h.page.evaluate((n) => { const g = window.__WFM_GAME; for (let i = 0; i < n; i++) { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); } }, SEC * 60);
            const got = await h.page.evaluate(() => window.__spills); soak.push(...got); console.log(`[ropes] spillscan d ${tag}: ${got.length} knockdowns in ${SEC} s`);
        } finally { await h.close(); }
    }
    // strike knockdowns beside each side wall: he is hit by a jab-type blow (alwaysFall) at 30 / 70 / 110 px from the plane, back to the rope (head toward it) and facing it, fresh and tired
    const strikes = [], ups = [];
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'lou' : 'george';
            await SCAN(h.page);
            for (const wall of ['L', 'R']) for (const dist of [30, 70, 110]) for (const face of ['backToWall', 'facingWall']) for (const wear of [10, 70]) {
                const label = `s:${p2 === LOU ? 'lou' : 'george'}:${wall}:${dist}:${face}:w${wear}`;   // the man going down is p2 (not p1: the label used to name the attacker)
                await h.page.evaluate((l) => { window.__scanRun = l; }, label);
                await h.page.evaluate(INIT, { kind: 'ai' });
                await h.page.evaluate(({ wall, dist, face, wear }) => {
                    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, RING = window.__RING, y = 350, t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y);
                    const b = { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t };
                    const dir = wall === 'L' ? -1 : 1;                       // the wall's side
                    d.y = a.y = y; d.x = (dir < 0 ? b.left : b.right) - dir * dist * d.s;
                    d.facing = face === 'backToWall' ? -dir : dir;           // head toward the wall: on his back (hit from the front) when his back is to it; face down (hit from behind) when he faces it
                    a.x = face === 'backToWall' ? d.x + d.facing * 70 * d.s : d.x - d.facing * 70 * d.s;   // in front of him, or behind him
                    a.facing = d.x > a.x ? 1 : -1;
                    d.wear = wear; d.stamina = 40;
                    d._strikeReact(a, 'jab', 'sellHead', 150, true);
                }, { wall, dist, face, wear });
                await h.page.evaluate(() => { const g = window.__WFM_GAME; for (let i = 0; i < 60 * 9; i++) { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); } });
            }
            strikes.push(...await h.page.evaluate(() => window.__spills)); ups.push(...await h.page.evaluate(() => window.__ups ?? []));
        } finally { await h.close(); }
    }
    mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, 'spillscan.json'), JSON.stringify({ sec: SEC, c: rows, d: soak, strikes, ups }, null, 1)); console.log(`[ropes] spillscan: c ${rows.length} knockdowns, d ${soak.length}`); process.exit(0);
}
// TS.4 --spillfilm: frames (30 fps, every other game frame) of a strike knockdown, a body slam and a suplex beside each side wall, Lou and George as the man going down, into <outDir>/<name>/f####.jpg.
// Run it once with SPILL=v1 and once without; tools/debug/rope_spill_film.mjs puts the two side by side as mp4.
if (process.argv.includes('--spillfilm')) {
    const index = [];
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h, info } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'george' : 'lou';   // d (w2) is the man going down: p2's rig
            for (const move of ['strike', 'bodySlam', 'suplex']) for (const wall of ['L', 'R']) {
                const name = `${move}-${wall}-${rig}`, dir = join(outDir, name); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
                let max = 520;
                if (move === 'strike') {
                    await h.page.evaluate(INIT, { kind: 'ai' });
                    await h.page.evaluate(({ wall }) => {
                        const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, RING = window.__RING, y = 350, t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y);
                        const b = { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t }, dir = wall === 'L' ? -1 : 1;
                        d.y = a.y = y; d.x = (dir < 0 ? b.left : b.right) - dir * 50 * d.s; d.facing = -dir; a.x = d.x + d.facing * 70 * d.s; a.facing = d.x > a.x ? 1 : -1; d.wear = 70; d.stamina = 40;
                        d._strikeReact(a, 'jab', 'sellHead', 150, true);
                    }, { wall }); max = 480;
                } else await h.page.evaluate(INIT, { kind: 'move', move, wall, backToWall: true, aDist: Number(process.env.ADIST ?? 40) });
                const clip = { x: info.box.x + (wall === 'L' ? 0 : info.box.w * 0.4), y: info.box.y + info.box.h * 0.3, width: info.box.w * 0.6, height: info.box.h * 0.6 };
                let n = 0;
                for (let f = 0; f < max; f++) {
                    await h.page.evaluate(() => { const R = window.__run; R.script(); window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); R.f++; });
                    if (f % 2 === 0) await h.page.screenshot({ path: join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 80, clip });
                }
                index.push({ name, frames: n }); console.log(`[ropes] spillfilm ${name}: ${n} frames`);
            }
        } finally { await h.close(); }
    }
    mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, 'index.json'), JSON.stringify(index)); process.exit(0);
}
// TS.6 --catchscan (SPILL=v1): per man, per knockdown window (leaving his feet -> standing again): frames where the drawn bottom strand crosses his head or torso ink box (target 0), the catch frame,
// bounce distance and lift, and the margin inside the strand at the settle and through the get-up. Cases: the 12 --spillfilm cases (strike / bodySlam / suplex, L and R, both rigs), then an AI soak (SEC s per pairing).
const CATCHSCAN = async (page) => page.evaluate(async () => {
    const { partInkX } = await import('/src/ropeInk.js'), sc = window.__WFM_GAME.scene.scenes[0], RING = window.__RING;
    const bounds = (y) => { const t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y); return { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t }; };
    window.__catch = []; window.__trace = true; const cur = new Map(), LOW = new Set(['falling', 'down', 'possum', 'gettingUp', 'risingUp', 'pinned']); let f = 0;
    const strandOf = (wall) => sc._sidePtsDebug?.pts?.[0]?.[wall === 'L' ? -1 : 1];
    const inBox = (pa, k) => { if (!k || !pa) return 0; let n = 0; for (let i = 0; i < pa.length - 1; i++) { const a0 = pa[i], b0 = pa[i + 1], L = Math.max(1, Math.ceil(Math.hypot(b0.x - a0.x, b0.y - a0.y))); for (let q = 0; q < L; q++) { const x = a0.x + (b0.x - a0.x) * q / L, y = a0.y + (b0.y - a0.y) * q / L; if (x >= k.minX && x <= k.maxX && y >= k.minY && y <= k.maxY) n++; } } return n; };   // TS.6's metric, kept for comparison only
    // TS.6b metric: the bottom strand AT HIS DEPTH (the drawn strand between his root's ground row +- 18 s, the shadow's half height), against the part's INK PIXELS (alpha >= 128, through the world matrix).
    // A pixel crosses when it lies past the strand's drawn x at his depth (away from the ring) by > 1 px AND on the strand's rows there (its drawn row +- one body depth's slant +- 4 px). Upright, rising or lying inside it: 0; lying past it but below the strand's rows (under) or above them (over): 0.
    const BAND = 4, alphaCache = new Map();
    const alphaOf = (f) => { const k = (f.texture?.key ?? '') + '|' + f.name; let v = alphaCache.get(k); if (v) return v; const w = f.cutWidth, h = f.cutHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(f.source.image, f.cutX, f.cutY, w, h, 0, 0, w, h); v = { w, h, d: x.getImageData(0, 0, w, h).data }; alphaCache.set(k, v); return v; };
    const inkPx = (im, step) => { const f = im.frame, out = []; if (!f?.source?.image) return out; const A = alphaOf(f), m = im.getWorldTransformMatrix(), ox = im.displayOriginX, oy = im.displayOriginY, ox0 = f.x ?? 0, oy0 = f.y ?? 0;
        for (let j = 0; j < A.h; j += step) for (let i = 0; i < A.w; i += step) if (A.d[(j * A.w + i) * 4 + 3] >= 128) { const px = (im.flipX ? f.realWidth - (i + ox0) : i + ox0) - ox, py = (im.flipY ? f.realHeight - (j + oy0) : j + oy0) - oy; out.push([m.a * px + m.c * py + m.tx, m.b * px + m.d * py + m.ty]); }
        return out; };
    const polyAt = (pa, t) => { const k = Math.max(0, Math.min(1, t)) * (pa.length - 1), i = Math.min(pa.length - 2, Math.floor(k)), q = k - i; return { x: pa[i].x + (pa[i + 1].x - pa[i].x) * q, y: pa[i].y + (pa[i + 1].y - pa[i].y) * q }; };
    // the strand at his depth: { A, B } (drawn points at ground t -+ 18 s) and the line's x at a screen row
    const strandAt = (w, wall) => { const pa = strandOf(wall); if (!pa) return null; const span = RING.nearLeft.y - RING.farLeft.y, t = (RING.nearLeft.y - w.y) / span, dt = 18 * w.s / span, A = polyAt(pa, t - dt), B = polyAt(pa, t + dt); return { A, B, xs: polyAt(pa, t).x, ys: polyAt(pa, t).y, rows: Math.abs(B.y - A.y) / 2 + 4, xl: (y) => A.x + (B.x - A.x) * (y - A.y) / ((B.y - A.y) || 1) }; };
    const inkVs = (w, wall, parts, step) => {   // { cross: px count crossing, margin: min px inside the line (+ inside), n }
        const S = strandAt(w, wall), dir = wall === 'L' ? -1 : 1; if (!S) return { cross: 0, margin: null, n: 0 };
        let cross = 0, margin = Infinity, n = 0; const ex = S.B.x - S.A.x, ey = S.B.y - S.A.y, L2 = ex * ex + ey * ey || 1;
        for (const im of parts) { if (!im?.visible) continue; for (const [x, y] of inkPx(im, step)) { n++; const o = dir * (x - S.xs); margin = Math.min(margin, -o);   // o > 0: past the strand's x at his depth; margin: + inside
            if (o > 1 && Math.abs(y - S.ys) <= S.rows) cross++; } }
        return { cross, margin: n ? margin : null, n };
    };
    window.__inkVs = inkVs; window.__strandAt = strandAt;
    const allParts = (w) => (w.skeleton._parts ?? []);
    sc.events.off('postupdate', window.__catchTick);
    window.__catchTick = () => {
        f++;
        for (const [n, w] of [[1, sc.w1], [2, sc.w2]]) {
            const o = cur.get(n);
            if (LOW.has(w.state)) {
                const b = bounds(w.y), wall = w.x - b.left < b.right - w.x ? 'L' : 'R', near = Math.min(w.x - b.left, b.right - w.x) / w.s;
                const r = o ?? (() => { const q = { run: window.__scanRun, n, rig: w.rigId, wall, f0: f, x0: w.x, s: w.s, cross: 0, crossFrames: 0, caught: null, margin: null, minMarginRise: null, nearMin: 999 }; cur.set(n, q); return q; })();
                r.nearMin = Math.min(r.nearMin, near);
                if (w._catchLog && w._catchLog !== w._catchSeen && !r.caught) r.caught = { ...w._catchLog, frame: f - r.f0 }; if (w._catchLog && r.caught && w._catchLog !== w._catchSeen) { r.caught.stop = +w._catchLog.stop.toFixed(1); r.caught.late = +w._catchLog.late.toFixed(1); r.caught.hopFrame = w._catchLog.hopFrame; }
                const near2 = Math.min(w.x - b.left, b.right - w.x) / w.s, hk = w.skeleton.head?.visible ? partInkX(w.skeleton.head) : null, tk = w.skeleton.torso?.visible ? partInkX(w.skeleton.torso) : null, pa = strandOf(wall);
                const cb = inBox(pa, hk) + inBox(pa, tk); if (cb > 0) r.boxFrames = (r.boxFrames ?? 0) + 1;
                let c = 0, mg = 999;
                if (near2 < 230) { const v = inkVs(w, wall, [w.skeleton.head, w.skeleton.torso], 2); c = v.cross; const m = inkVs(w, wall, allParts(w), 4).margin; mg = m ?? 999; }
                if (window.__reach) {   // TS.6b rows: how far head / torso ink reaches from the root along the head's direction (px at s = 1), by phase; needs no wall (run mid-ring with the spill off)
                    const dW = (w.lying === 'prone' ? 1 : -1) * (w.facing || 1), ph = w.state === 'falling' || w.state === 'risingUp' ? 'fall' : w.state === 'gettingUp' ? 'rise' : 'down', R = (parts) => { let m = -999; for (const im of parts) if (im?.visible) for (const [x] of inkPx(im, 3)) m = Math.max(m, dW * (x - w.x) / w.s); return m; };
                    const rt = R([w.skeleton.torso]), rh = R([w.skeleton.head]); r.reach ??= { fall: -999, down: -999, rise: -999, head: -999, torso: -999, landed: null }; r.reach.torso = Math.max(r.reach.torso, rt);
                    r.reach[ph] = Math.max(r.reach[ph], Math.max(rt, rh)); r.reach.head = Math.max(r.reach.head, rh); if (ph === 'down' && r.reach.landed == null) r.reach.landed = +Math.max(rt, rh).toFixed(1); r.lying = w.lying;
                }
                if (c > 0) { r.crossFrames++; r.cross = Math.max(r.cross, c); (r.crossAt ??= []).push([f - r.f0, w.state]); }
                r.ph ??= {}; { const k = w.state === 'falling' || w.state === 'risingUp' ? 'fall' : w.state === 'gettingUp' ? 'rise' : 'down'; r.ph[k] = (r.ph[k] ?? 0) + (c > 0 ? 1 : 0); }
                if (window.__trace && (f - r.f0) % 6 === 0 && (f - r.f0) < 400) (r.trace ??= []).push([f - r.f0, w.state, +w.x.toFixed(0), w._catch ? +w._catch.t.toFixed(2) : null, +(w._catchLift || 0).toFixed(1), +mg.toFixed(0), c]);
                if (w.state === 'down' && !w._catch && !w._landing) r.margin = r.margin == null ? +mg.toFixed(1) : Math.min(r.margin, +mg.toFixed(1));
                if (w.state === 'gettingUp') r.minMarginRise = r.minMarginRise == null ? +mg.toFixed(1) : Math.min(r.minMarginRise, +mg.toFixed(1));
            } else if (o) { o.frames = f - o.f0; window.__catch.push(o); cur.delete(n); w._catchSeen = w._catchLog; }
        }
    };
    sc.events.on('postupdate', window.__catchTick);
    return true;
});
if (process.argv.includes('--catchscan')) {
    const rows = [];
    process.env.SPILLQS = process.env.SPILL === 'v1' ? '&ropeSpill=v1' : '&ropeSpill=off';   // ropeSpill is default-on since 2026-11-25: the old side says off
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'george' : 'lou';
            await CATCHSCAN(h.page); if (process.env.REACH) await h.page.evaluate(() => { window.__reach = true; });
            for (const move of (process.env.MOVES ?? 'strike,bodySlam,suplex').split(',')) for (const wall of ['L', 'R']) {
                await h.page.evaluate((l) => { window.__scanRun = l; window.__catch.length = 0; }, `${move}-${wall}-${rig}`);
                let max = 520;
                if (move === 'strike') {
                    await h.page.evaluate(INIT, { kind: 'ai' });
                    await h.page.evaluate(({ wall, prone }) => {
                        const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, RING = window.__RING, y = 350, t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y);
                        const b = { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t }, dir = wall === 'L' ? -1 : 1;
                        d.y = a.y = y; d.x = (dir < 0 ? b.left : b.right) - dir * 50 * d.s; d.facing = prone ? dir : -dir; a.x = d.x + (prone ? -d.facing : d.facing) * 70 * d.s; a.facing = d.x > a.x ? 1 : -1; d.wear = 70; d.stamina = 40;
                        d._strikeReact(a, 'jab', 'sellHead', 150, true);
                    }, { wall, prone: process.env.PRONE === '1' }); max = 480;
                } else await h.page.evaluate(INIT, { kind: 'move', move, wall, backToWall: true, aDist: Number(process.env.ADIST ?? 40) });
                for (let f = 0; f < max; f++) await h.page.evaluate(() => { const R = window.__run; R.script(); window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); R.f++; });
                const got = await h.page.evaluate(() => window.__catch.filter(r => r.n === 2)); rows.push(...got);
                if (process.env.TRACE) console.log(JSON.stringify(got[0]?.trace));
                console.log(`[ropes] catchscan ${move}-${wall}-${rig}:`, JSON.stringify(got.map(g => ({ ph: g.ph, cross: g.crossFrames, caught: g.caught, margin: g.margin, rise: g.minMarginRise }))));
            }
        } finally { await h.close(); }
    }
    const soak = [];
    for (const [p1, p2, tag] of [[LOU, GEORGE, 'lou-george'], [LOU, KOW, 'lou-kowalski'], [GEORGE, GUIDO, 'george-guido'], [KOW, GUIDO, 'kowalski-guido']].slice(0, Number(process.env.PAIRS ?? 1))) {
        const { h } = await launchWith(p1, p2, true);
        try {
            await CATCHSCAN(h.page); await h.page.evaluate((l) => { window.__scanRun = 'soak:' + l; }, tag);
            await h.page.evaluate(INIT, { kind: 'ai', ai: true, frames: SEC * 60 });
            await h.page.evaluate((n) => { const g = window.__WFM_GAME; for (let i = 0; i < n; i++) { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); } }, SEC * 60);
            const got = await h.page.evaluate(() => window.__catch); soak.push(...got); console.log(`[ropes] catchscan soak ${tag}: ${got.length} windows, ${got.filter(g => g.nearMin < 130).length} near a wall, crossing frames ${got.reduce((a, g) => a + g.crossFrames, 0)}`);
        } finally { await h.close(); }
    }
    mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, 'catchscan.json'), JSON.stringify({ sec: SEC, cases: rows, soak }, null, 1)); process.exit(0);
}
// TS.6b --catchcontrol: the metric's two controls, each beside both side walls, both rigs: (1) a man standing upright with his root 22 s inside the plane (the clamp's margin), (2) a man rising there
// (knocked down mid-ring by a jab, then, through the whole get-up, shifted each frame so his whole ink sits 4 px inside the strand: the tightest inside). Both must read 0 crossing px. A frame of each with the strand AT HIS DEPTH marked (red) goes to <outDir>/control/.
if (process.argv.includes('--catchcontrol')) {
    const rows = [];
    process.env.SPILLQS = process.env.SPILL === 'v1' ? '&ropeSpill=v1' : '';
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h, info } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'george' : 'lou';
            await CATCHSCAN(h.page);
            await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; window.__mark = sc.add.graphics().setDepth(1000); });
            const step = (n) => h.page.evaluate((n) => { for (let i = 0; i < n; i++) { const R = window.__run; R.script(); window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); R.f++; } }, n);
            const place = (wall) => h.page.evaluate(({ wall }) => { const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, RING = window.__RING, y = 350, t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y), dir = wall === 'L' ? -1 : 1;
                const b = { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t }; d.y = a.y = y; d.x = (dir < 0 ? b.left : b.right) - dir * 22 * d.s; return true; }, { wall });
            const hold = (wall) => h.page.evaluate(({ wall }) => { const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2, dir = wall === 'L' ? -1 : 1, m = window.__inkVs(d, wall, d.skeleton._parts, 4).margin; if (m != null) d.x += dir * (m - 4); d.y = sc.w1.y = 350; return true; }, { wall });   // the rise held with his whole ink 4 px inside the strand
            const read = (wall) => h.page.evaluate(({ wall }) => { const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2, v = window.__inkVs(d, wall, [d.skeleton.head, d.skeleton.torso], 1), S = window.__strandAt(d, wall); const g = window.__mark; g.clear(); g.lineStyle(3, 0xff2020, 1); g.beginPath(); g.moveTo(S.A.x, S.A.y); g.lineTo(S.B.x, S.B.y); g.strokePath(); g.fillStyle(0xffe000, 1); g.fillCircle(S.xs, S.ys, 4); g.lineStyle(1, 0xffe000, 1); g.beginPath(); g.moveTo(S.xs, S.ys - 120); g.lineTo(S.xs, S.ys + 120); g.strokePath(); return { state: d.state, cross: v.cross, n: v.n, margin: v.margin == null ? null : +v.margin.toFixed(1) }; }, { wall });
            const shot = async (name, wall) => { await h.page.evaluate(() => { window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); }); const clip = { x: info.box.x + (wall === 'L' ? 0 : info.box.w * 0.4), y: info.box.y + info.box.h * 0.3, width: info.box.w * 0.6, height: info.box.h * 0.6 }; mkdirSync(join(outDir, 'control'), { recursive: true }); await h.page.screenshot({ path: join(outDir, 'control', name + '.png'), clip }); };
            for (const wall of ['L', 'R']) {
                for (const face of ['backToWall', 'facingWall']) {
                    await h.page.evaluate(INIT, { kind: 'ai' }); await place(wall);
                    await h.page.evaluate(({ wall, face }) => { const d = window.__WFM_GAME.scene.scenes[0].w2, dir = wall === 'L' ? -1 : 1; d.facing = face === 'backToWall' ? -dir : dir; }, { wall, face });
                    let mx = 0, mn = 999; for (let i = 0; i < 90; i++) { await step(1); await place(wall); const r = await read(wall); mx = Math.max(mx, r.cross); if (r.margin != null) mn = Math.min(mn, r.margin); if (i === 45) await shot(`upright-${wall}-${rig}-${face}`, wall); }
                    rows.push({ control: 'upright', wall, rig, face, maxCross: mx, minMargin: mn }); console.log(`[ropes] control upright ${wall} ${rig} ${face}: max crossing px ${mx}, min margin ${mn}`);
                }
                for (const face of ['backToWall', 'facingWall']) {
                    await h.page.evaluate(INIT, { kind: 'ai' });
                    await h.page.evaluate(({ wall, face }) => { const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, RING = window.__RING, y = 350, t = (RING.nearLeft.y - y) / (RING.nearLeft.y - RING.farLeft.y), dir = wall === 'L' ? -1 : 1;
                        const b = { left: RING.nearLeft.x + (RING.farLeft.x - RING.nearLeft.x) * t, right: RING.nearRight.x + (RING.farRight.x - RING.nearRight.x) * t }; d.y = a.y = y; d.x = (dir < 0 ? b.left : b.right) - dir * 260 * d.s; d.facing = face === 'backToWall' ? -dir : dir; a.x = d.x + d.facing * 70 * d.s; a.facing = d.x > a.x ? 1 : -1; d.wear = 70; d.stamina = 40; d._strikeReact(a, 'jab', 'sellHead', 150, true); }, { wall, face });
                    let mx = 0, mn = 999, frames = 0, shotDone = false;
                    for (let i = 0; i < 900; i++) { await step(1); const st = await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].w2.state); if (st === 'gettingUp' || st === 'risingUp') { await hold(wall); frames++; const r = await read(wall); mx = Math.max(mx, r.cross); if (r.margin != null) mn = Math.min(mn, r.margin); if (!shotDone && frames === 12) { await shot(`rising-${wall}-${rig}-${face}`, wall); shotDone = true; } } else if (frames) break; }
                    rows.push({ control: 'rising', wall, rig, face, frames, maxCross: mx, minMargin: mn }); console.log(`[ropes] control rising ${wall} ${rig} ${face}: ${frames} frames, max crossing px ${mx}, min margin ${mn}`);
                }
            }
        } finally { await h.close(); }
    }
    mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, 'catchcontrol.json'), JSON.stringify(rows, null, 1)); process.exit(0);
}
const filmRun = async (page, info, rig) => {   // run a again, one frame at a time, a clip of the far half at 30 fps (every other frame)
    const dir = join(outDir, 'film', rig); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    await page.evaluate(INIT, { kind: 'walkFar' });
    const clip = { x: info.box.x, y: info.box.y + info.box.h * 0.17, width: info.box.w, height: info.box.h * 0.5 };
    let n = 0;
    for (let f = 0; ; f++) {
        const r = await page.evaluate(() => window.__ONE({ cells: false }));
        if (f % 2 === 0) await page.screenshot({ path: join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 72, clip });
        if (r.done) break;
    }
    return { rig, frames: n, clip };
};

const film = [];
for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
    if (!RUNS.some(r => 'abc'.includes(r))) break;
    const { h, info } = await launchWith(p1, p2, false);
    try {
        const rigTag = p1 === LOU ? 'lou' : 'george';
        if (RUNS.includes('a')) { console.log(`[ropes] a walk far (${rigTag})`); results.push(await runOne(h.page, { kind: 'walkFar' }, `a:${rigTag}`)); if (FILM) film.push(await filmRun(h.page, info, rigTag)); }
        if (RUNS.includes('b')) for (const wall of ['L', 'R']) { console.log(`[ropes] b walk side ${wall} (${rigTag})`); results.push(await runOne(h.page, { kind: 'walkSide', wall }, `b:${rigTag}:${wall}`)); }
        if (RUNS.includes('c')) for (const wall of ['FL', 'FR', 'L', 'R']) for (const move of ['bodySlam', 'suplex', 'irishWhip', 'clothesline', 'wristlockHammerlock']) {
            console.log(`[ropes] c ${move} at ${wall} (${rigTag})`);
            results.push(await runOne(h.page, { kind: 'move', move, wall }, `c:${rigTag}:${move}:${wall}`));
        }
    } finally { await h.close(); }
}
if (RUNS.includes('d')) for (const [p1, p2, tag] of [[LOU, GEORGE, 'lou-george'], [LOU, KOW, 'lou-kowalski'], [GEORGE, GUIDO, 'george-guido'], [KOW, GUIDO, 'kowalski-guido']]) {
    const { h } = await launchWith(p1, p2, true);
    try { console.log(`[ropes] d AI ${tag} ${SEC} s`); results.push(await runOne(h.page, { kind: 'ai', ai: true, frames: SEC * 60 }, `d:${tag}`)); } finally { await h.close(); }
}

// ---- summary ---------------------------------------------------------------------------------------------------------------
const all = results.flatMap(r => r.recs);
const tally = (rows, keyOf) => {
    const m = new Map();
    for (const r of rows) for (const [k, px, frameKey] of keyOf(r)) { const e = m.get(k) ?? { wrongFrames: new Set(), maxPx: 0, sumPx: 0 }; e.wrongFrames.add(frameKey); e.maxPx = Math.max(e.maxPx, px); e.sumPx += px; m.set(k, e); }
    return [...m].map(([k, e]) => ({ key: k, frames: e.wrongFrames.size, maxPx: e.maxPx, sumPx: e.sumPx })).sort((a, b) => b.frames - a.frames);
};
const fk = (r) => `${r.run}#${r.f}#${r.who}`;
const wrongRows = all.filter(r => r.wrong > 0);
const wallOf = (k) => k.split('|')[0].replace(/\d/, '');
const agg = (r, i) => Object.entries(Object.entries(r.wrongTally).reduce((m, [k, v]) => { const c = k.split('|')[i]; m[c] = (m[c] ?? 0) + v; return m; }, {})).map(([k, v]) => [k, v, fk(r)]);
const summary = {
    frames: Object.fromEntries(results.map(r => [r.label, r.frames])),
    totalManFrames: results.reduce((s, r) => s + r.frames * 2, 0),
    crossingManFrames: all.filter(r => r.cross > 0).length, wrongManFrames: wrongRows.length,
    wrongByWall: tally(wrongRows, r => { const w = {}; for (const [k, v] of Object.entries(r.wrongTally)) w[wallOf(k)] = (w[wallOf(k)] ?? 0) + v; return Object.entries(w).map(([k, v]) => [k, v, fk(r)]); }),
    crossingPxByWall: all.reduce((m, r) => { for (const [k, v] of Object.entries(r.crossWall)) m[k] = (m[k] ?? 0) + v; return m; }, {}),
    wrongByStrand: tally(wrongRows, r => agg(r, 0)),
    wrongByRegion: tally(wrongRows, r => [[`${r.region} (${r.rig.slice(0, 5)})`, r.wrong, fk(r)]]),
    wrongByRegionAll: tally(wrongRows, r => [[r.region, r.wrong, fk(r)]]),
    wrongByPart: tally(wrongRows, r => agg(r, 1)),
    wrongByState: tally(wrongRows, r => [[r.mv ? `move:${r.mv}` : `state:${r.st}`, r.wrong, fk(r)]]),
    wrongByOrder: tally(wrongRows, r => agg(r, 2)),
};
const penRows = all.filter(r => r.penPx > 0 && r.inside && !['climbing', 'onTurnbuckle'].includes(r.st));
summary.penetrationManFrames = penRows.length;
summary.penByRun = tally(penRows, r => [[r.run.split(':').slice(0, 1)[0] === 'c' ? r.run.split(':').slice(2, 3)[0] : r.run.split(':')[0] === 'd' ? 'AI soak' : r.run.split(':')[0] === 'a' ? 'walk far' : 'walk side', r.penPx, fk(r)]]);
summary.penByState = tally(penRows, r => [[r.mv ? `move:${r.mv}` : `state:${r.st}`, r.penPx, fk(r)]]);
summary.penByPart = tally(penRows, r => Object.entries(r.penTally).map(([k, v]) => [k.split('|')[1], v.px, fk(r)]));
summary.penByStrand = tally(penRows, r => Object.entries(r.penTally).map(([k, v]) => [k.split('|')[0], v.px, fk(r)]));
summary.spillOverManFrames = all.filter(r => r.overPx > 0).length; summary.spillOverPx = all.reduce((a, r) => a + (r.overPx ?? 0), 0);
summary.pressByState = {}; for (const r of all) if (r.pressPx > 0) summary.pressByState[r.st] = (summary.pressByState[r.st] ?? 0) + 1;
summary.pressManFrames = all.filter(r => r.pressPx > 0).length; summary.pressPx = all.reduce((a, r) => a + (r.pressPx ?? 0), 0);
summary.penOverManFrames = penRows.filter(r => r.penOver > 0).length; summary.penOverPx = penRows.reduce((a, r) => a + r.penOver, 0); summary.penOverMax = Math.max(0, ...penRows.map(r => r.penOver));
summary.penMaxPast = Math.max(0, ...penRows.flatMap(r => Object.values(r.penTally).map(v => v.past)));
const perRun = results.map(r => ({ run: r.label, frames: r.frames, wrongFrames: r.recs.filter(x => x.wrong > 0).length, maxWrongPx: Math.max(0, ...r.recs.map(x => x.wrong)), penFrames: r.recs.filter(x => x.penPx > 0 && x.inside && !['climbing', 'onTurnbuckle'].includes(x.st)).length, maxPenPx: Math.max(0, ...r.recs.map(x => x.penPx)) }));
writeFileSync(join(outDir, 'probe.json'), JSON.stringify({ made: new Date().toISOString(), sec: SEC, summary, perRun, pools: { wrong: pools.wrong, pen: pools.pen }, film, recs: all }, null, 1));
const show = (t, rows) => { console.log(`\n${t}`); console.table(rows.slice(0, 14)); };
console.log(`\n[ropes] man-frames ${summary.totalManFrames}, with a strand crossing ${summary.crossingManFrames}, wrong-order ${summary.wrongManFrames}, penetrating ${summary.penetrationManFrames} (of which ink past the plane drawn OVER a side strand: ${summary.penOverManFrames} man-frames, max ${summary.penOverMax} px) (max past plane ${summary.penMaxPast.toFixed(1)} px)`);
console.log(`[ropes] spilled-man over window (intended): ${summary.spillOverManFrames} man-frames, ${summary.spillOverPx} px`);
console.log('[ropes] press-window frames by state', JSON.stringify(summary.pressByState));
console.log(`[ropes] press window (intended, strand under him inside his window): ${summary.pressManFrames} man-frames, ${summary.pressPx} px`);
console.log("crossing px by wall", JSON.stringify(summary.crossingPxByWall)); show("wrong-order by wall", summary.wrongByWall); show('by strand (wall+rope index 0 bottom..2 top)', summary.wrongByStrand); show('by ring region', summary.wrongByRegionAll);
show('by part', summary.wrongByPart); show('by state / move', summary.wrongByState); show('by drawn order', summary.wrongByOrder);
show('penetration by run', summary.penByRun); show('penetration by state/move', summary.penByState); show('penetration by part', summary.penByPart); show('per run', perRun.filter(r => r.wrongFrames || r.penFrames));
process.exit(0);
