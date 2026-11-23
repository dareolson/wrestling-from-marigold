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
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
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
                                if (pw && shouldFront && !drawnFront && sT > pw[0] && sT < pw[1]) { rec.pressPx = (rec.pressPx ?? 0) + 1; rec.pressWall = S.wall; }   // inside his press window, under him by design
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
    process.env.WFM_P1 = p1; process.env.WFM_P2 = p2; process.env.WFM_QS = 'notitle=1' + (process.env.ROPES === 'v1' ? '&ropes=v1' : '') + (process.env.PAST === '1' ? '&ropesPast=1' : '') + (process.env.SWAYSCALE ? `&ropeSway=${process.env.SWAYSCALE}` : ''); process.env.WFM_INIT_SCRIPT = new URL('./no_hmr_init.js', import.meta.url).pathname;
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
    const out = [];
    for (const [p1, p2] of [[LOU, GEORGE], [GEORGE, LOU]]) {
        const { h, info } = await launchWith(p1, p2, false);
        try {
            const rig = p1 === LOU ? 'lou' : 'george';
            for (const wall of ['L', 'R', 'FL', 'FR']) {
                const dir = join(outDir, 'whip', `${rig}-${wall}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
                await h.page.evaluate(INIT, { kind: 'move', move: 'irishWhip', wall });
                const clip = { x: info.box.x, y: info.box.y + info.box.h * (wall.startsWith('F') ? 0.2 : 0.3), width: info.box.w, height: info.box.h * 0.5 };
                let n = 0;
                for (let f = 0; ; f++) {
                    const r = await h.page.evaluate(() => window.__ONE({ cells: false }));
                    if (f % 2 === 0) await h.page.screenshot({ path: join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 72, clip });
                    if (r.done) break;
                }
                out.push({ rig, wall, frames: n }); console.log(`[ropes] whip ${rig} ${wall}: ${n} frames`);
            }
        } finally { await h.close(); }
    }
    writeFileSync(join(outDir, 'whip', 'index.json'), JSON.stringify(out)); process.exit(0);
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
summary.pressByState = {}; for (const r of all) if (r.pressPx > 0) summary.pressByState[r.st] = (summary.pressByState[r.st] ?? 0) + 1;
summary.pressManFrames = all.filter(r => r.pressPx > 0).length; summary.pressPx = all.reduce((a, r) => a + (r.pressPx ?? 0), 0);
summary.penOverManFrames = penRows.filter(r => r.penOver > 0).length; summary.penOverPx = penRows.reduce((a, r) => a + r.penOver, 0); summary.penOverMax = Math.max(0, ...penRows.map(r => r.penOver));
summary.penMaxPast = Math.max(0, ...penRows.flatMap(r => Object.values(r.penTally).map(v => v.past)));
const perRun = results.map(r => ({ run: r.label, frames: r.frames, wrongFrames: r.recs.filter(x => x.wrong > 0).length, maxWrongPx: Math.max(0, ...r.recs.map(x => x.wrong)), penFrames: r.recs.filter(x => x.penPx > 0 && x.inside && !['climbing', 'onTurnbuckle'].includes(x.st)).length, maxPenPx: Math.max(0, ...r.recs.map(x => x.penPx)) }));
writeFileSync(join(outDir, 'probe.json'), JSON.stringify({ made: new Date().toISOString(), sec: SEC, summary, perRun, pools: { wrong: pools.wrong, pen: pools.pen }, film, recs: all }, null, 1));
const show = (t, rows) => { console.log(`\n${t}`); console.table(rows.slice(0, 14)); };
console.log(`\n[ropes] man-frames ${summary.totalManFrames}, with a strand crossing ${summary.crossingManFrames}, wrong-order ${summary.wrongManFrames}, penetrating ${summary.penetrationManFrames} (of which ink past the plane drawn OVER a side strand: ${summary.penOverManFrames} man-frames, max ${summary.penOverMax} px) (max past plane ${summary.penMaxPast.toFixed(1)} px)`);
console.log('[ropes] press-window frames by state', JSON.stringify(summary.pressByState));
console.log(`[ropes] press window (intended, strand under him inside his window): ${summary.pressManFrames} man-frames, ${summary.pressPx} px`);
console.log("crossing px by wall", JSON.stringify(summary.crossingPxByWall)); show("wrong-order by wall", summary.wrongByWall); show('by strand (wall+rope index 0 bottom..2 top)', summary.wrongByStrand); show('by ring region', summary.wrongByRegionAll);
show('by part', summary.wrongByPart); show('by state / move', summary.wrongByState); show('by drawn order', summary.wrongByOrder);
show('penetration by run', summary.penByRun); show('penetration by state/move', summary.penByState); show('penetration by part', summary.penByPart); show('per run', perRun.filter(r => r.wrongFrames || r.penFrames));
process.exit(0);
