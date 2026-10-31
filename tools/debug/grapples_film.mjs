// G1 film (PLAN_GRAPPLES T1.4): the lockup today (flag off) next to `?grapples=v1`, forced lockups, 1/60 s steps, deterministic
// (loop asleep, seeded Math.random, fixed tween delta, AIs nulled, input scripted).
//
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_film.mjs [outRoot=research/animation/grapples-2026-10/g1] [cases=a,b,c,d,e] [pairs=lg,gl]
//
// Cases (each in both facings, for Lou attacker vs George (lg) and George attacker vs Lou (gl)):
//   a even/drive from mid-ring, no input to the timeout and the break   b the same from the attacker's rope side, so the drive has the room
//   c the defender presses grapple at 0.7 s (the steal)                 d the defender starts 60*s px from the rope behind him
//   e every exit the attacker's kit has, pressed at 0.8 s (new only)    b also runs a third column `alt` (&grapplesLayer=alt)
// Writes <outRoot>/frames/<column>/<id>/sNNNN.jpg (raw film, not committed: .git/info/exclude) and <outRoot>/film.json (one run per id).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { partSteps } from './rise_handoff_probe.mjs';
import { INSTALL_MASKS, worstMask } from './grapples_masks.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = { lg: { id: 'lou-george', att: LOU, def: GEORGE }, gl: { id: 'george-lou', att: GEORGE, def: LOU } };
const EXITS = [
    { id: 'headlock', move: 'headlock', keys: ['down', 'action'] }, { id: 'suplex', move: 'suplex', keys: ['up', 'action'] },
    { id: 'whip', move: 'irishWhip', keys: ['action'], dir: 'facing' }, { id: 'piledriver', move: 'piledriver', keys: ['action'] },
    { id: 'bodySlam', move: 'bodySlam', keys: ['action'], needsNo: 'piledriver' }, { id: 'hipToss', move: 'hipToss', keys: ['power'] },
    { id: 'armDrag', move: 'armDrag', keys: ['power'], needsNo: 'hipToss' }, { id: 'hammerlock', move: 'hammerlock', keys: ['finisher'] },
];

// ---- in page ---------------------------------------------------------------------------------------------------------------
const INSTALL = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    sc._p1AI = null; sc._p2AI = null;
    window.__T = sc.time.now;
    window.__idle = { ...sc.w1.pose };
    const names = (w) => { const sk = w.skeleton, out = []; for (const [k, v] of Object.entries(sk)) { const i = sk._parts.indexOf(v); if (i >= 0 && !out[i]) out[i] = k; } return out.map((n, i) => n ?? `part${i}`); };
    window.__names = { a: names(sc.w1), d: names(sc.w2) };
    const box = document.querySelector('canvas').getBoundingClientRect(), g = game.scale.gameSize;
    return { box: { x: box.x, y: box.y, w: box.width, h: box.height, gw: g.width, gh: g.height }, moveSets: { a: sc.w1.moveSet, d: sc.w2.moveSet } };
};

const SETUP = async ({ facing, midX, startGap, defRope, flag, layer, seed }) => {
    const { ringBoundsAtY } = await import('/src/constants.js');
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    let a0 = 0x5eed1234;
    Math.random = () => { a0 = (a0 + 0x6D2B79F5) | 0; let t = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null;
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    const s = a.s;
    a.y = d.y = 400; a.facing = facing; d.facing = -facing;
    const b = ringBoundsAtY(400);
    let mid = midX;
    if (defRope) { const dx = facing > 0 ? b.right - defRope * s : b.left + defRope * s; mid = dx - facing * startGap * s / 2; }
    a.x = mid - facing * startGap * s / 2; d.x = mid + facing * startGap * s / 2;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };   // a/d: justDown this frame; ad/dd: held
    a.input = { justDown: (k) => window.__keys.a.has(k), isDown: (k) => window.__keys.ad.has(k) };
    d.input = { justDown: (k) => window.__keys.d.has(k), isDown: (k) => window.__keys.dd.has(k) };
    a.state = d.state = 'lockup';
    a.tweenPose('lockup', 180, 'Cubic.easeOut'); d.tweenPose('lockup', 180, 'Cubic.easeOut');
    sc.lockupState = { attacker: a, defender: d, timer: 0 };
    if (flag) sc.lockupState.grapple = { seed, t: 0, stealAt: null, breakAt: null, grips: null };
    window.__film = { n: 0, ranges: b };
    return { x0: [a.x, d.x], s, bounds: b };
};

const STEP = async ({ press, hold, mask }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    window.__keys.a = new Set(press?.a ?? []); window.__keys.d = new Set(press?.d ?? []);
    window.__keys.ad = new Set(hold?.a ?? []); window.__keys.dd = new Set(hold?.d ?? []);
    window.__T += 1000 / 60;
    const t0 = performance.now();
    game.step(window.__T, 1000 / 60);
    const ms = performance.now() - t0;
    const mk = (w, names) => ({
        x: w.x, y: w.y, facing: w.facing, state: w.state, s: w.s,
        pose: Object.fromEntries(Object.entries(w.pose).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, +v.toFixed(4)])),
        parts: w.skeleton._parts.map((img, i) => {
            const m = img.getWorldTransformMatrix(), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
            const c = [[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([x, y]) => [+(m.a * x + m.c * y + m.tx).toFixed(2), +(m.b * x + m.d * y + m.ty).toFixed(2)]);
            return { n: names[i], vis: !!img.visible, c };
        }),
        pts: Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints ?? {}).filter(([, p]) => p).map(([k, p]) => [k, { x: +p.x.toFixed(2), y: +p.y.toFixed(2) }])),
        head: w.skeleton.head ? { x: +w.skeleton.head.x.toFixed(2), y: +w.skeleton.head.y.toFixed(2) } : null,
    });
    const ls = sc.lockupState, g = ls?.grapple ?? null;
    const row = { ms, mask: mask && ls ? window.__maskOverlap(a, d, true) : null, locked: !!ls, a: mk(a, window.__names.a), d: mk(d, window.__names.d), who: ls ? (ls.attacker === a ? 'a' : 'd') : null };
    if (g) {
        row.g = { t: g.t, phase: g.phase ?? null, grips: g.grips ?? null, step: g.step ?? null, stealAt: g.stealAt, breakAt: g.breakAt, holdGap: g.holdGap ?? null };
        if (g.grips && g.grabber) {
            const { lockupGrips } = await import('/src/animation/lockup.js');
            const lists = lockupGrips(g.grabber, g.grabbed, g.grips);
            const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
            const errs = {};
            for (const [role, actor] of [['attacker', g.grabber], ['defender', g.grabbed]]) {
                const pts = actor.skeleton.jointAttachmentPoints, lSide = actor.skeleton.lChannelSide(actor.facing);
                for (const it of lists[role]) {
                    const handSide = it.arm === 'l' ? lSide : (lSide === 'near' ? 'far' : 'near');
                    const target = it.at ?? it.partner.skeleton.jointAttachmentPoints[`${handSide}${it.joint}`];
                    const S = pts[`${handSide}Shoulder`], E = pts[`${handSide}Elbow`], W = pts[`${handSide}Wrist`], lu = dist(S, E), lf = dist(E, W);
                    // reach: the target against the arm's reachable range (T1.6): `over` > 0 = out of reach, whatever the hand did.
                    errs[`${role}.${it.joint === 'Neck' ? 'collar' : 'elbow'}`] = { err: +(dist(W, target)).toFixed(3), w: +it.w.toFixed(3), over: +(dist(S, target) - (lu + lf)).toFixed(2) };
                }
            }
            const p = g.grabber.skeleton.jointAttachmentPoints, S = p.nearShoulder, E = p.nearElbow, Wr = p.nearWrist;
            const ang = (u, v) => Math.atan2(v.y - u.y, v.x - u.x), wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
            row.g.errs = errs; row.g.flex = +Math.abs(wrap(ang(E, Wr) - ang(S, E))).toFixed(3);
            const hc = (w) => (w.skeleton.head ? { x: w.skeleton.head.x, y: w.skeleton.head.y } : w.skeleton.jointAttachmentPoints.neck);
            row.g.headGap = +(dist(hc(g.grabber), hc(g.grabbed)) / g.grabber.s).toFixed(2);
        }
    }
    return row;
};

// ---- node ------------------------------------------------------------------------------------------------------------------
const FPS_MS = 1000 / 60;
const maxPart = (p, c) => Math.max(0, ...Object.values(partSteps(p, c)));

// Planted foot slide (px/frame at s=1): ankle x movement of the foot that is not stepping. Today: both always planted.
function plantedSlide(rows, from) {
    let worst = 0;
    for (let i = Math.max(1, from); i < rows.length; i++) {
        const p = rows[i - 1], c = rows[i];
        if (!c.locked || !p.locked) continue;
        const g = c.g, step = g?.step, moving = g && (g.phase === 'drive' || g.phase === 'break') && step && step.u !== null;
        for (const side of ['a', 'd']) {
            for (const foot of ['nearAnkle', 'farAnkle']) {
                const stepping = moving && (g.phase === 'break' || (step.index % 2 === 0 ? foot === 'nearAnkle' : foot === 'farAnkle'));
                if (stepping) continue;
                const pa = p[side].pts[foot], ca = c[side].pts[foot];
                if (pa && ca) worst = Math.max(worst, Math.abs(ca.x - pa.x) / c[side].s);
            }
        }
    }
    return +worst.toFixed(2);
}

function summarize(rows, kind) {
    const locked = rows.filter(r => r.locked), n = locked.length;
    const endLock = rows.findIndex(r => !r.locked);
    const last = endLock < 0 ? rows.length - 1 : endLock - 1;
    const out = { frames: rows.length, lockedFrames: n, lockMs: +(n * FPS_MS).toFixed(0) };
    const wm = worstMask(rows);
    if (wm) { const { image, ...rest } = wm; out.silhouette = rest; }
    const mid = (r) => (r.a.x + r.d.x) / 2;
    // phases
    const engEnd = rows.findIndex(r => r.g && r.g.t >= 0.22);
    out.travel = { total: +(mid(rows[last]) - mid(rows[0])).toFixed(1), afterEngage: engEnd < 0 ? null : +(mid(rows[last]) - mid(rows[engEnd])).toFixed(1) };
    out.gapStart = +(Math.abs(rows[0].d.x - rows[0].a.x) / rows[0].a.s).toFixed(1);
    out.gapHeld = +(Math.abs(rows[Math.max(0, last)].d.x - rows[Math.max(0, last)].a.x) / rows[0].a.s).toFixed(1);
    out.plantedSlide = plantedSlide(rows, engEnd < 0 ? 0 : engEnd);
    // Feet crossing: how far each man's front-most ankle reaches past the other's (px at s=1, along the facing); > 0 = the feet pass each other.
    let over = -1e9;
    for (const r of locked) {
        const f = Math.sign(r.d.x - r.a.x) || 1, sep = (r.d.x - r.a.x) * f;
        const reach = (side, dir) => Math.max(...['nearAnkle', 'farAnkle'].map(k => (r[side].pts[k]?.x - r[side].x) * dir));
        over = Math.max(over, (reach('a', f) + reach('d', -f) - sep) / r.a.s);
    }
    out.footOverlap = +over.toFixed(1);
    out.ankleDaylight = +(-over).toFixed(1);   // worst locked frame; positive = clear
    const stepOver = (name, pred) => {
        let m = 0;
        for (let i = 1; i < rows.length; i++) if (pred(rows[i], i)) m = Math.max(m, maxPart({ parts: rows[i - 1].a.parts }, { parts: rows[i].a.parts }), maxPart({ parts: rows[i - 1].d.parts }, { parts: rows[i].d.parts }));
        out[name] = +m.toFixed(2);
    };
    if (kind === 'new') {
        stepOver('stepEngage', (r) => r.g && r.g.t <= 0.30 && r.locked);
        stepOver('stepSteal', (r) => r.g && r.g.stealAt !== null && r.g.t <= r.g.stealAt + 0.12 + 0.20 + 0.05);
        stepOver('stepBreak', (r) => r.g && r.g.breakAt !== null);
        const first = (key) => locked.find(r => r.g?.errs?.[key]?.w >= 0.99);
        out.grabMs = Object.fromEntries(['attacker.collar', 'attacker.elbow', 'defender.collar', 'defender.elbow'].map(k => { const f = first(k); return [k, f ? +(f.g.t * 1000).toFixed(0) : null]; }));
        const held = locked.filter(r => r.g?.errs);
        out.handErr = {}; out.contactMisses = {}; out.outOfReach = {};
        for (const k of ['attacker.collar', 'attacker.elbow', 'defender.collar', 'defender.elbow']) {
            const e = held.map(r => r.g.errs[k]).filter(x => x && x.w >= 0.99).map(x => x.err);
            out.handErr[k] = e.length ? +Math.max(...e).toFixed(2) : null; out.contactMisses[k] = e.filter(x => x > 3).length;
            out.outOfReach[k] = held.map(r => r.g.errs[k]).filter(x => x && x.w >= 0.99 && x.over > 0).length;
        }
        const flex = held.filter(r => r.g.errs['attacker.collar']?.w >= 0.99).map(r => r.g.flex);
        out.flex = flex.length ? { min: +Math.min(...flex).toFixed(2), max: +Math.max(...flex).toFixed(2) } : null;
        const hg = held.filter(r => r.g.errs['attacker.collar']?.w >= 0.99).map(r => r.g.headGap);
        out.headGap = hg.length ? { min: +Math.min(...hg).toFixed(1), max: +Math.max(...hg).toFixed(1) } : null;
        out.phases = [...new Set(rows.filter(r => r.g).map(r => r.g.phase))];
        out.holdGap = rows.find(r => r.g?.holdGap)?.g.holdGap ?? null;
    } else {
        let m = 0; for (let i = 1; i < rows.length; i++) if (rows[i].locked) m = Math.max(m, maxPart({ parts: rows[i - 1].a.parts }, { parts: rows[i].a.parts }), maxPart({ parts: rows[i - 1].d.parts }, { parts: rows[i].d.parts }));
        out.stepEngage = +m.toFixed(2);
    }
    // x clamped into the ropes? report the closest approach of either man to the bound
    return out;
}

async function runCase(page, ctx, spec, shotDir, clipAt) {
    const { flag, layer = false } = spec;
    const set = await page.evaluate(SETUP, { facing: spec.facing, midX: spec.midX, startGap: 90, defRope: spec.defRope ?? null, flag, layer, seed: 11 });
    const clip = clipAt ? clipAt((set.x0[0] + set.x0[1]) / 2) : null;
    if (shotDir) { rmSync(shotDir, { recursive: true, force: true }); mkdirSync(shotDir, { recursive: true }); }
    const rows = []; let endAt = null;
    for (let i = 0; i < 260; i++) {
        const press = { a: [], d: [] }, hold = { a: [], d: [] };
        if (spec.steal && i === spec.steal) press.d.push('action');
        if (spec.exit && i === spec.exit.frame) {
            // direction keys are held on the exit frame, the grapple/power/finisher keys are pressed
            for (const k of spec.exit.keys) (['up', 'down', 'left', 'right'].includes(k) ? hold : press).a.push(k);
            if (spec.exit.dir) hold.a.push(spec.facing > 0 ? 'right' : 'left');
        }
        // direction keys stay held through the exit frame only
        const row = await page.evaluate(STEP, { press, hold, mask: !!shotDir && i % 3 === 0 });
        row.i = i;
        rows.push(row);
        if (row.mask?.image && spec.keepMasks === false) delete row.mask.image;
        if (shotDir) await page.screenshot({ path: join(shotDir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 82, clip });
        if (!row.locked && endAt === null) endAt = i;
        if (endAt !== null && i - endAt >= (spec.tail ?? 24)) break;
    }
    return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [outRoot = 'research/animation/grapples-2026-10/g1', casesArg = 'a,b,c,d,e', pairsArg = 'lg,gl'] = process.argv.slice(2);
    const cases = casesArg.split(','), pairs = pairsArg.split(',').map(k => PAIRS[k]);
    const results = [], timing = {};
    for (const pair of pairs) {
        for (const column of ['today', 'new']) {
            process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = column === 'new' ? 'notitle=1&grapples=v1' : 'notitle=1';
            const h = await launch();
            try {
                const page = h.page;
                await page.waitForTimeout(2500);
                const info = await page.evaluate(INSTALL);
                await page.evaluate(INSTALL_MASKS);
                const bx = info.box, mX = (x) => bx.x + x * bx.w / bx.gw, mY = (y) => bx.y + y * bx.h / bx.gh;
                const clipAt = (x) => ({ width: 380, height: 330, x: Math.max(0, Math.round(mX(x) - 190)), y: Math.round(mY(400 + 30) - 330) });
                const bounds = (await page.evaluate(async () => { const { ringBoundsAtY } = await import('/src/constants.js'); return ringBoundsAtY(400); }));
                for (const facing of [-1, 1]) {
                    const F = facing < 0 ? 'l' : 'r';
                    const defs = [];
                    const mid = 520;
                    if (cases.includes('a')) defs.push({ id: 'a', midX: mid, facing });
                    if (cases.includes('b')) defs.push({ id: 'b', midX: facing > 0 ? bounds.left + 150 + 100 : bounds.right - 150 - 100, facing });
                    if (cases.includes('c')) defs.push({ id: 'c', midX: mid, facing, steal: 42 });
                    if (cases.includes('d')) defs.push({ id: 'd', defRope: 60, facing });
                    if (cases.includes('d2')) defs.push({ id: 'd2', defRope: 40, facing });   // inside reach of the 34*s stall zone after a few px of drive
                    for (const spec of defs) {
                        const id = `${spec.id}-${pair.id}-${F}`;
                        const cols = spec.id === 'b' && column === 'new' ? [['new', false], ['alt', true]] : [[column, false]];
                        for (const [col, alt] of cols) {
                            if (alt) { await page.evaluate(() => { history.replaceState(null, '', location.pathname + location.search + '&grapplesLayer=alt'); }); }
                            const rows = await runCase(page, info, { ...spec, flag: column === 'new', layer: alt }, join(outRoot, 'frames', col, id), clipAt);
                            if (alt) { await page.evaluate(() => { history.replaceState(null, '', location.pathname + location.search.replace('&grapplesLayer=alt', '')); }); }
                            const r = { id, case: spec.id, pair: pair.id, facing, column: col, ...summarize(rows, column === 'new' ? 'new' : 'today'), rows: undefined };
                            const wm = worstMask(rows);
                            if (wm?.image) writeFileSync(join(outRoot, 'frames', col, `${id}-mask.png`), Buffer.from(wm.image.split(',')[1], 'base64'));
                            results.push({ ...r, series: rows.map((x, k) => ({ i: x.i, step: k ? +Math.max(maxPart({ parts: rows[k - 1].a.parts }, { parts: x.a.parts }), maxPart({ parts: rows[k - 1].d.parts }, { parts: x.d.parts })).toFixed(1) : 0, state: x.a.state, locked: x.locked, who: x.who, ax: +x.a.x.toFixed(2), dx: +x.d.x.toFixed(2), phase: x.g?.phase ?? null, t: x.g?.t ?? null })) });
                            console.log(`[film] ${col}/${id}: ${r.frames} frames, locked ${r.lockMs} ms, travel ${r.travel.total}, planted slide ${r.plantedSlide}, ankle daylight ${r.ankleDaylight}, silhouette below ${r.silhouette?.below} torso ${r.silhouette?.torso} above ${r.silhouette?.above}, engage step ${r.stepEngage}${r.stepSteal !== undefined ? `, steal ${r.stepSteal}, break ${r.stepBreak}` : ''}`);
                        }
                    }
                }
                // timing: +ms per frame, case a, no screenshots
                const ts = [];
                for (let k = 0; k < 3; k++) { const rows = await runCase(page, info, { id: 'a', midX: 520, facing: 1, flag: column === 'new', tail: 4 }, null, null); ts.push(...rows.map(r => r.ms)); }
                ts.sort((x, y) => x - y); timing[`${pair.id}/${column}`] = { medianMs: +ts[ts.length >> 1].toFixed(3), meanMs: +(ts.reduce((s, x) => s + x, 0) / ts.length).toFixed(3), n: ts.length };
            } finally { await h.close(); }
        }
    }
    // (e) exits, new only. A move leaves clips, holds and positions behind (and a page reload was measured to start the next lockup
    // wrong), so every exit gets a fresh launch.
    if (cases.includes('e')) for (const pair of pairs) {
        const hq = async () => { process.env.WFM_P1 = pair.att; process.env.WFM_P2 = pair.def; process.env.WFM_QS = 'notitle=1&grapples=v1'; const h = await launch(); await h.page.waitForTimeout(2500); return h; };
        let h0 = await hq(); const ms = (await h0.page.evaluate(INSTALL)).moveSets.a; await h0.close();
        for (const ex of EXITS) {
            if (!ms.includes(ex.move) || (ex.needsNo && ms.includes(ex.needsNo))) continue;
            for (const facing of [-1, 1]) {
                const F = facing < 0 ? 'l' : 'r', h = await hq();
                try {
                    const page = h.page; const info = await page.evaluate(INSTALL);
                    const id = `e-${ex.id}-${pair.id}-${F}`;
                    const rows = await runCase(page, info, { id: 'e', midX: 520, facing, flag: true, exit: { frame: 48, keys: ex.keys, dir: ex.dir }, tail: 14 }, null, null);
                    const ei = rows.findIndex(r => !r.locked);
                    const stepsOf = (k) => (ei > 0 ? maxPart({ parts: rows[ei - 1 + k].a.parts }, { parts: rows[ei + k].a.parts }) : null);
                    const stepsD = (k) => (ei > 0 ? maxPart({ parts: rows[ei - 1 + k].d.parts }, { parts: rows[ei + k].d.parts }) : null);
                    const first3 = [0, 1, 2].map(k => (ei > 0 && rows[ei + k] ? Math.max(stepsOf(k), stepsD(k)) : null));
                    const firstA = ei > 0 ? stepsOf(0) : null, firstD = ei > 0 ? stepsD(0) : null;
                    results.push({ id, case: 'e', exit: ex.id, move: ex.move, pair: pair.id, facing, column: 'new', exitFrame: ei, exitMs: ei < 0 ? null : Math.round((rows[ei - 1].g?.t ?? ei / 60) * 1000),
                        firstFrameStep: ei > 0 ? +Math.max(firstA, firstD).toFixed(2) : null, firstFrameStepAttacker: firstA === null ? null : +firstA.toFixed(2), firstFrameStepDefender: firstD === null ? null : +firstD.toFixed(2),
                        first3: first3.map(x => (x === null ? null : +x.toFixed(2))), stateAfter: ei > 0 ? [rows[ei].a.state, rows[ei].d.state] : null });
                    const r = results.at(-1);
                    console.log(`[film] new/${id}: exit at frame ${ei}, first-frame step ${r.firstFrameStep} (a ${r.firstFrameStepAttacker}, d ${r.firstFrameStepDefender}), states ${r.stateAfter}`);
                } finally { await h.close(); }
            }
        }
    }
    mkdirSync(outRoot, { recursive: true });
    writeFileSync(join(outRoot, 'film.json'), JSON.stringify({ tool: 'tools/debug/grapples_film.mjs', timing, runs: results }, null, 1));
    console.log('wrote', join(outRoot, 'film.json'), results.length, 'runs');
}
