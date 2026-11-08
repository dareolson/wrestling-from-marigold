// PLAN_LIGHT_MOVES T2.2c: motion and art-break audit of the ankle lock under ?light=v1. Lou on George and George on Lou, both facings, the real
// `_doAnkleLock` on a downed man, 1/60 s steps (loop asleep). Per frame, both men:
//   - ink gap (joint_attachment_audit.mjs: px between the nearest opaque pixels of parent and child art round the drawn joint) at neck, shoulders,
//     elbows, hips, knees, against each man's own idle pose (same rig, same facing). Ankle: the boot is baked into the shin, so no ankle seam exists.
//   - saturation: pose elbow / knee channels outside or within 0.005 of JOINT_LIMITS, and the drawn knee flex (clip_knee_audit.mjs reading) at its limit.
//   - below-belt silhouette overlap (grapples_masks.mjs), the trapped leg's overlap with the attacker's legs and torso, and the depth order of the
//     trapped shin against the attacker's torso, legs and near forearm.
//   - painted palm to painted heel / toe (the l hand to the heel, the r hand to the toe), attacker ankle slide.
// A frame is "broken" when an ink gap exceeds max(idle, 0) + 0.5 px, or a joint is pinned.
//   WFM_URL=http://127.0.0.1:5173 LIGHT=1 node tools/debug/ankle_lock_audit.mjs <out.json> [framesDir]
// With framesDir: a 30 fps crop of every second game frame (<framesDir>/<case>/sNNNN.jpg, normal speed) and 6 tight stills (still-<t>.png).
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, STEP } from './grapples_film.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const HELD = [0.6, 2.7];
const STILLS = [0.5, 0.9, 1.4, 1.95, 2.4, 2.7];
const MAX_EXTRA_GAP = 0.5;
const out = process.argv[2], framesDir = process.argv[3];

const SETUP = async ({ facing }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234;
    Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing; a.x = 520; d.x = 520 + facing * 70 * a.s;
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    // each man's own idle seams first (standing, idle pose, this facing), then the lock
    for (const w of [a, d]) w.draw();
    const idle = { a: window.__inkGaps(a.skeleton), d: window.__inkGaps(d.skeleton) };
    d.state = 'down'; d.lying = 'supine'; d.stateTimer = 99;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
    a._doAnkleLock(d);
    return { idle, x: [a.x, d.x], clipDur: a._activeMove?.clip?.duration ?? null };
};

const INSTALL_AUDIT = ({ LIM, NOINK }) => {
    const JOINT_PARTS = {
        neck: ['torso', 'head'], farShoulder: ['torso', 'farUpArm'], nearShoulder: ['torso', 'nearUpArm'], farElbow: ['farUpArm', 'farForearm'], nearElbow: ['nearUpArm', 'nearForearm'],
        farHip: ['torso', 'farThigh'], nearHip: ['torso', 'nearThigh'], farKnee: ['farThigh', 'farShin'], nearKnee: ['nearThigh', 'nearShin'],
    };
    const cache = new Map();
    const pixelsFor = (img) => {
        const key = img.texture.key;
        if (cache.has(key)) return cache.get(key);
        const src = img.texture.getSourceImage(), cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
        const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(src, 0, 0);
        const p = { data: c.getImageData(0, 0, cv.width, cv.height).data, width: cv.width }; cache.set(key, p); return p;
    };
    const opaqueAt = (img, wx, wy) => {
        if (!img?.texture || img.texture.key === 'sk_pixel') return true;
        const dx = wx - img.x, dy = wy - img.y, c = Math.cos(img.rotation), s = Math.sin(img.rotation);
        const lx = c * dx + s * dy, ly = -s * dx + c * dy;
        let u = lx / img.displayWidth + img.originX, v = ly / img.displayHeight + img.originY;
        if (img.flipX) u = 1 - u; if (img.flipY) v = 1 - v;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
        const f = img.frame, px = Math.max(0, Math.min(f.cutWidth - 1, Math.floor(u * f.cutWidth))), py = Math.max(0, Math.min(f.cutHeight - 1, Math.floor(v * f.cutHeight)));
        const P = pixelsFor(img); return P.data[((f.cutY + py) * P.width + f.cutX + px) * 4 + 3] >= 32;
    };
    const inkNear = (img, j, r = 14) => {
        const pts = [];
        for (let y = Math.floor(j.y - r); y <= Math.ceil(j.y + r); y++) for (let x = Math.floor(j.x - r); x <= Math.ceil(j.x + r); x++) {
            if ((x - j.x) ** 2 + (y - j.y) ** 2 > r * r) continue;
            if (opaqueAt(img, x + 0.5, y + 0.5)) pts.push([x, y]);
        }
        return pts;
    };
    window.__inkGaps = (sk) => {
        const res = {};
        for (const [name, [pn, cn]] of Object.entries(JOINT_PARTS)) {
            const j = sk.jointAttachmentPoints?.[name]; if (!j || !sk[pn]?.visible || !sk[cn]?.visible) continue;
            const A = inkNear(sk[pn], j), B = inkNear(sk[cn], j); let gap = Infinity;
            for (const [ax, ay] of A) { for (const [bx, by] of B) { const d = Math.hypot(ax - bx, ay - by); if (d < gap) gap = d; if (gap === 0) break; } if (gap === 0) break; }
            res[name] = Number.isFinite(gap) ? +gap.toFixed(2) : 999;
        }
        return res;
    };
    // silhouette overlap of two part sets, px
    const cv = [document.createElement('canvas'), document.createElement('canvas')];
    const mask = (i, parts, ox, oy, cw, ch) => {
        const c = cv[i]; c.width = cw; c.height = ch; const ctx = c.getContext('2d', { willReadFrequently: true });
        for (const img of parts) {
            if (!img?.visible || img.alpha <= 0 || !img.frame) continue;
            const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
            ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - ox, m.ty - oy); ctx.translate(-img.originX * fw, -img.originY * fh);
            if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
            ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        }
        const px = ctx.getImageData(0, 0, cw, ch).data, o = new Uint8Array(cw * ch); for (let k = 0; k < o.length; k++) o[k] = px[k * 4 + 3] > 128 ? 1 : 0; return o;
    };
    window.__overlap = (partsA, partsB, a, d) => {
        const ox = Math.floor(Math.min(a.x, d.x) - 240), oy = Math.floor(Math.min(a.y, d.y) - 340), cw = Math.ceil(Math.abs(a.x - d.x) + 480), ch = 410;
        const A = mask(0, partsA, ox, oy, cw, ch), B = mask(1, partsB, ox, oy, cw, ch); let n = 0; for (let k = 0; k < A.length; k++) if (A[k] && B[k]) n++; return n;
    };
    window.__LIM = LIM; window.__NOINK = NOINK;
};

const READ = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, hnd = a._activeMove, LIM = window.__LIM;
    const ask = a.skeleton, dsk = d.skeleton, ap = ask.jointAttachmentPoints, dp = dsk.jointAttachmentPoints;
    const side = dsk.lChannelSide(d.facing);   // the trapped leg is the defender's lLeg channel
    const dist = (p, q) => (p && q ? Math.hypot(p.x - q.x, p.y - q.y) : null);
    const r = { t: hnd ? +hnd.time.toFixed(4) : null };
    const heel = dsk.partAnchorPoint?.(`${side}Shin`, 'heel'), toe = dsk.partAnchorPoint?.(`${side}Shin`, 'toe');
    r.palm = { heel: dist(ask.partAnchorPoint?.('nearForearm', 'clutch'), heel), toe: dist(ask.partAnchorPoint?.('farForearm', 'clutch'), toe) };
    r.ankle = { near: ap.nearAnkle && { x: ap.nearAnkle.x, y: ap.nearAnkle.y }, far: ap.farAnkle && { x: ap.farAnkle.x, y: ap.farAnkle.y } };
    r.ink = window.__NOINK ? { a: {}, d: {} } : { a: window.__inkGaps(ask), d: window.__inkGaps(dsk) };
    // pinned joints: pose channels outside / within .005 of the limit, and drawn knee flex at its limit
    const pinned = [];
    for (const [who, w] of [['a', a], ['d', d]]) {
        for (const ch of ['lElbow', 'rElbow', 'lKnee', 'rKnee']) {
            const v = w.pose[ch], lim = LIM[ch.endsWith('Elbow') ? 'elbow' : 'knee']; if (!Number.isFinite(v)) continue;
            if (v < lim.min + 0.005 || v > lim.max - 0.005) pinned.push(`${who}.${ch}=${v.toFixed(3)}`);
        }
    }
    const flexOf = (w) => {
        const p = w.skeleton.jointAttachmentPoints, hand = w.facing >= 0 ? 1 : -1, o = {};
        for (const sd of ['near', 'far']) {
            const u = { x: p[`${sd}Knee`].x - p[`${sd}Hip`].x, y: p[`${sd}Knee`].y - p[`${sd}Hip`].y }, l = { x: p[`${sd}Ankle`].x - p[`${sd}Knee`].x, y: p[`${sd}Ankle`].y - p[`${sd}Knee`].y };
            const q = hand > 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x };
            let v = -Math.atan2(l.x * q.x + l.y * q.y, l.x * u.x + l.y * u.y); if (v < -2.6) v += 2 * Math.PI; o[sd] = +v.toFixed(3);
        }
        return o;
    };
    r.knee = { a: flexOf(a), d: flexOf(d) };
    for (const [who, k] of [['a', r.knee.a], ['d', r.knee.d]]) for (const sd of ['near', 'far']) if (k[sd] <= LIM.knee.min + 0.005 || k[sd] >= LIM.knee.max - 0.005) pinned.push(`${who}.${sd}Knee drawn ${k[sd]}`);
    r.pinned = pinned;
    // overlaps
    const m = window.__maskOverlap(a, d, false);
    r.belowBody = m.belowBody; r.torso = m.torso;
    const shin = dsk[`${side}Shin`], thigh = dsk[`${side}Thigh`];
    r.trappedVsLegs = window.__overlap([shin, thigh], [ask.nearThigh, ask.farThigh, ask.nearShin, ask.farShin], a, d);
    r.trappedVsTorso = window.__overlap([shin], [ask.torso], a, d);
    r.depth = { shin: shin.depth, torso: ask.torso.depth, nearThigh: ask.nearThigh.depth, farThigh: ask.farThigh.depth, nearForearm: ask.nearForearm.depth, farForearm: ask.farForearm.depth };
    r.bootInFrontOfTorso = shin.depth > ask.torso.depth;
    // T2.2d: his far upper arm behind his torso, both his thighs (and shins) in front of it, his near arm in front of the boot
    r.order = { farArmBehindTorso: ask.farUpArm.depth < ask.torso.depth, thighsOverTorso: ask.nearThigh.depth > ask.torso.depth && ask.farThigh.depth > ask.torso.depth, shinsOverTorso: ask.nearShin.depth > ask.torso.depth && ask.farShin.depth > ask.torso.depth, nearArmOverBoot: ask.nearForearm.depth > shin.depth };
    r.bootCenter = (() => { const mm = shin.getWorldTransformMatrix(); return { x: Math.round(mm.tx), y: Math.round(mm.ty) }; })();
    const rd = (q) => (q ? [Math.round(q.x - a.x), Math.round(a.y - q.y)] : null);   // x from the attacker (+ toward the downed man when facing right), y above the mat
    const f = a.facing;
    const fx = (q) => (q ? [Math.round((q.x - a.x) * f), Math.round(a.y - q.y)] : null);
    r.geo = { neck: fx(ap.neck), shN: fx(ap.nearShoulder), shF: fx(ap.farShoulder), heel: fx(heel), toe: fx(toe), dHip: fx(dp[`${side}Hip`]), dKnee: fx(dp[`${side}Knee`]), dAnk: fx(dp[`${side}Ankle`]), aHipN: fx(ap.nearHip), aKneeN: fx(ap.nearKnee), aAnkN: fx(ap.nearAnkle), aAnkF: fx(ap.farAnkle), dHead: fx(dp.neck), wristN: fx(ap.nearWrist), wristF: fx(ap.farWrist) };
    r.torsoBend = a.pose.bend; r.attackerLean = a.pose.lean;
    return r;
};

const round = (v, n = 2) => (typeof v === 'number' ? +v.toFixed(n) : v);
const stat = (arr) => (arr.length ? { min: round(Math.min(...arr)), max: round(Math.max(...arr)), mean: round(arr.reduce((p, q) => p + q, 0) / arr.length) } : null);
const results = {};
const { JOINT_LIMITS } = await import('../../src/rig/articulation.js');
for (const [pair, att, def] of PAIRS.filter(p => !process.env.ONLY || process.env.ONLY.split(',').includes(p[0]))) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = process.env.LIGHT ? 'notitle=1&light=v1' : 'notitle=1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL); await h.page.evaluate(INSTALL_MASKS);
        await h.page.evaluate(INSTALL_AUDIT, { LIM: JOINT_LIMITS, NOINK: !!process.env.NOINK });
        for (const facing of (process.env.ONE_FACING ? [1] : [1, -1])) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`;
            const setup = await h.page.evaluate(SETUP, { facing });
            let clip = null; const rows = []; const stills = new Set(); let n = 0;
            if (framesDir) mkdirSync(`${framesDir}/${id}`, { recursive: true });
            for (let i = 0; i < 230; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                const r = await h.page.evaluate(READ);
                if (r.t === null && rows.length) break;
                if (r.t === null) continue;
                rows.push(r);
                if (framesDir) {
                    if (!clip) { const c = await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width; const x = (sc.w1.x + sc.w2.x) / 2, y = (sc.w1.y + sc.w2.y) / 2; return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k }; }); clip = { x: Math.max(0, c.x - 270), y: Math.max(0, c.y - 285), width: 540, height: 350 }; }
                    if (i % 2 === 0) await h.page.screenshot({ path: `${framesDir}/${id}/s${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
                    const st = STILLS.find(t => r.t >= t && !stills.has(t));
                    if (st !== undefined) { stills.add(st); await h.page.screenshot({ path: `${framesDir}/${id}/still-${st}.png`, clip: { x: clip.x + 90, y: clip.y + 10, width: 360, height: 330 } }); }
                }
            }
            const held = rows.filter(r => r.t >= HELD[0] && r.t <= HELD[1]);
            const joints = Object.keys(rows[0].ink.a);
            const idle = setup.idle, broken = [];
            const worstGap = { a: {}, d: {} };
            for (const [i, r] of rows.entries()) {
                const bad = [];
                for (const who of ['a', 'd']) for (const j of joints) {
                    const g = r.ink[who][j]; if (g === undefined) continue;
                    worstGap[who][j] = Math.max(worstGap[who][j] ?? 0, g);
                    if (g > Math.max(idle[who][j] ?? 0, 0) + MAX_EXTRA_GAP) bad.push(`${who}.${j} ${g} (idle ${idle[who][j] ?? 'n/a'})`);
                }
                for (const p of r.pinned) bad.push(`pinned ${p}`);
                if (bad.length) broken.push({ t: r.t, bad });
            }
            const slide = (k) => rows.slice(1).map((r, i) => Math.hypot(r.ankle[k].x - rows[i].ankle[k].x, r.ankle[k].y - rows[i].ankle[k].y));
            const plantedSlide = (k) => rows.slice(1).map((r, i) => [r.t, Math.hypot(r.ankle[k].x - rows[i].ankle[k].x, r.ankle[k].y - rows[i].ankle[k].y)]).filter(([t]) => t >= 0.4 && t <= 2.7).map(([, v]) => v);
            results[id] = {
                frames: rows.length, idleGap: idle,
                palmHeld: { heel: stat(held.map(r => r.palm.heel)), toe: stat(held.map(r => r.palm.toe)), framesOver6: held.filter(r => r.palm.heel > 6 || r.palm.toe > 6).length },
                worstInkGap: worstGap,
                brokenFrames: broken.length, brokenList: broken,
                pinnedFrames: rows.filter(r => r.pinned.length).length, pinnedKinds: [...new Set(rows.flatMap(r => r.pinned.map(p => p.replace(/=.*| drawn.*/, ''))))],
                belowBodyPx: stat(rows.map(r => r.belowBody)), torsoPx: stat(rows.map(r => r.torso)),
                trappedVsLegsPx: stat(rows.map(r => r.trappedVsLegs)), trappedVsLegsFrames: rows.filter(r => r.trappedVsLegs > 0).length,
                trappedVsTorsoPx: stat(rows.map(r => r.trappedVsTorso)), bootInFrontOfTorsoFramesHeld: held.filter(r => r.bootInFrontOfTorso).length + '/' + held.length,
                orderHeld: Object.fromEntries(['farArmBehindTorso', 'thighsOverTorso', 'shinsOverTorso', 'nearArmOverBoot'].map(k => [k, held.filter(r => r.order[k]).length + '/' + held.length])),
                depthHeld: held[Math.floor(held.length / 2)]?.depth, bootCenterHeld: held[Math.floor(held.length / 2)]?.bootCenter,
                plantedSlideMax: { near: round(Math.max(...plantedSlide('near'))), far: round(Math.max(...plantedSlide('far'))) }, wholeSlideMax: { near: round(Math.max(...slide('near'))), far: round(Math.max(...slide('far'))) },
                trappedVsLegsAt: rows.filter(r => r.trappedVsLegs > 0).map(r => [r.t, r.trappedVsLegs]).filter((x, i) => i % 3 === 0),
                belowBodyAt: rows.filter((r, i) => i % 10 === 0).map(r => [r.t, r.belowBody]),
                plantedSlideOver15: rows.slice(1).map((r, i) => [r.t, Math.max(...['near', 'far'].map(k => Math.hypot(r.ankle[k].x - rows[i].ankle[k].x, r.ankle[k].y - rows[i].ankle[k].y)))]).filter(([t, v]) => t >= 0.4 && t <= 2.7 && v > 1.5).map(([t, v]) => [t, round(v)]),
                kneeDrawn: { a: stat(rows.flatMap(r => [r.knee.a.near, r.knee.a.far])), d: stat(rows.flatMap(r => [r.knee.d.near, r.knee.d.far])) },
                torsoBend: stat(held.map(r => r.torsoBend ?? 0)),
            };
            const R = results[id];
            if (process.env.TRACE) for (const r of rows.filter(r => [0.6, 1.0, 1.5, 2.0, 2.6].some(t => Math.abs(r.t - t) < 0.009))) console.log('  ', r.t, JSON.stringify(r.geo), 'palm', round(r.palm.heel, 1), round(r.palm.toe, 1), 'pinned', r.pinned.join(','));
            if (process.env.TRACE) console.log('  legs', JSON.stringify(results[id].trappedVsLegsAt), 'slide', JSON.stringify(results[id].plantedSlideOver15), 'below', JSON.stringify(results[id].belowBodyAt));
            console.log(id, `palm held heel ${R.palmHeld.heel?.max} toe ${R.palmHeld.toe?.max} over6 ${R.palmHeld.framesOver6} | broken ${R.brokenFrames}/${R.frames} pinned ${R.pinnedFrames} | belowBody max ${R.belowBodyPx.max} | trapped∩legs ${R.trappedVsLegsFrames}f max ${R.trappedVsLegsPx.max} | boot>torso ${R.bootInFrontOfTorsoFramesHeld} | planted slide ${R.plantedSlideMax.near}/${R.plantedSlideMax.far}`);
        }
    } finally { await h.close(); }
}
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
