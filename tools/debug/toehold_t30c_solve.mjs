// T3.0c solver: turns the four saved still poses (t3-knee-capture/<case>/report.json) into a dense, solved timeline for the two-knee toe hold:
// grab -> step-over -> turn (mirrored at a symmetric instant) -> knee drop -> victim roll -> three wrenches. Each waypoint (every 3 frames) is hill-climbed so the hands
// stay on the foot (grip <= ~1.5 px) with the knees on the schedule; output: <outDir>/<case>/waypoints.json (REPLAY=1 in the video script reads it, no search).
//   node tools/debug/toehold_t30c_solve.mjs <seedDir> <outDir>     env: ONLY=<pair prefix>, FACE=1|-1, ITERS=n, SEED=n
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { PAIRS, SETUP, STEPF, GRIPPX, READ, MASKS, METRICS } from './toehold_t30_lib.mjs';
import { EVALW, MEASURE, installPage, T, FPS } from './toehold_t30c_lib.mjs';

const [seedDir, outDir] = process.argv.slice(2);
let rs = (+(process.env.SEED ?? 1)) >>> 0;
const rng = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clone = o => JSON.parse(JSON.stringify(o));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => (k = Math.max(0, Math.min(1, k)), k * k * (3 - 2 * k));
const mixObj = (a, b, k) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(key => [key, typeof (a[key] ?? b[key]) === 'number' ? lerp(a[key] ?? 0, b[key] ?? 0, k) : (b[key] ?? a[key])]));
const pen = (v, lo, hi) => (v < lo ? lo - v : v > hi ? v - hi : 0);

// a state = { att, gap, attY } for the attacker; the man is { def, defSign, twist } from his own schedule
const mixState = (A, B, k) => ({ att: mixObj(A.att, B.att, k), gap: lerp(A.gap, B.gap, k), attY: lerp(A.attY ?? 0, B.attY ?? 0, k) });
const MIRROR_KEYS = ['tilt', 'lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'bend'];
export const mirrorDef = d => { const m = { ...d }; for (const k of MIRROR_KEYS) if (typeof m[k] === 'number') m[k] = -m[k]; return m; };

const PARAMS = [['gap', 0, 170], ['attY', 0, 45], ['att.crouch', .3, 2.2], ['att.bend', -.3, 1.5], ['att.lean', -.9, .6], ['att.lLeg', -1.1, 1.4], ['att.rLeg', -1.1, 1.4], ['att.lFold', 0, 2.45], ['att.rFold', 0, 2.45]];
const getP = (w, path) => path.split('.').reduce((o, k) => o[k], w);
const setP = (w, path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], w)[last] = v; };

for (const [pair, att, def] of PAIRS) {
    if (process.env.ONLY && !pair.startsWith(process.env.ONLY)) continue;
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&light=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL); await h.page.evaluate(MASKS);
        await installPage(h.page, { SETUP, STEPF, GRIPPX, READ, METRICS, MEASURE, EVALW });
        for (const facing of [1, -1]) {
            if (process.env.FACE && +process.env.FACE !== facing) continue;
            const side = facing > 0 ? 'right' : 'left', caseDir = `${outDir}/${pair}-${side}`;
            mkdirSync(caseDir, { recursive: true });
            const rep = JSON.parse(readFileSync(`${seedDir}/${pair}-${side}/report.json`)), P = Object.fromEntries(Object.entries(rep).map(([k, v]) => [k, v.authored]));
            const [p1, p2, p3] = [P['1-grab'], P['2-step-over'], P['3-kneel']];
            // the ease (before each pull) holds the leg less bent than the saved kneel: the pull then has room to travel
            p3.def = { ...p3.def, lLeg: p3.def.lLeg + .2, lFold: p3.def.lFold - .5 };
            const orders = { p1: p1.order, p2: p2.order, cap: p3.order };
            const stateOf = p => ({ att: p.att, gap: p.gap, attY: p.attY ?? 0 });
            // ---- designed key states ----
            const TURN = { att: { ...p2.att, crouch: 1.1, bend: .3, lean: 0, lLeg: .4, rLeg: -.4, lFold: .8, rFold: .8 }, gap: 60, attY: 0 };
            const DSTART = mixState(TURN, stateOf(p3), .3);
            // ---- the man's schedule ----
            const S = { ...p2.def, lFold: 0, rFold: 0, lElbow: 0, rElbow: 0 }, Sm = mirrorDef(S);   // straight limbs at the roll's mirror instant
            const defAt = t => {
                if (t < T.rollStart) return { def: mixObj(p1.def, p2.def, smooth((t - T.hold) / (T.stepEnd - T.hold))), defSign: -1, twist: false };
                if (t < T.rollFlip) return { def: mixObj(p2.def, S, smooth((t - T.rollStart) / (T.rollFlip - T.rollStart))), defSign: -1, twist: false };
                return { def: mixObj(Sm, p3.def, smooth((t - T.rollFlip) / (T.rollEnd - T.rollFlip))), defSign: 1, twist: true };
            };
            const orderAt = t => (t < .85 ? 'p1' : t < T.turnFlip ? 'p2' : 'cap');
            // seeds for the attacker before the wrench
            const seedAt = t => {
                if (t <= T.hold) return stateOf(p1);
                if (t <= T.stepEnd) return mixState(stateOf(p1), stateOf(p2), smooth((t - T.hold) / (T.stepEnd - T.hold)));
                if (t <= T.turnFlip) return mixState(stateOf(p2), TURN, smooth((t - T.stepEnd) / (T.turnFlip - T.stepEnd)));
                if (t <= T.dropStart) return mixState(TURN, DSTART, smooth((t - T.turnFlip) / (T.dropStart - T.turnFlip)));
                if (t <= T.land) return mixState(DSTART, stateOf(p3), ((t - T.dropStart) / (T.land - T.dropStart)) ** 1.7);
                return stateOf(p3);
            };
            // ---- evaluation + hill climb ----
            // variants(w) = the states one pose must satisfy at once (the mirror instants hold the same pose in both facings); hard.cost(ms, w) reads one measurement per variant
            const ev = async (w, order, metrics = false) => h.page.evaluate(a => window.__EVALW(a), { w, f: facing, order: orders[order], metrics });
            const wOf = (st, t, extra = {}) => ({ att: st.att, gap: st.gap, attY: st.attY, ...defAt(t), attSign: t < T.turnFlip ? 1 : -1, ...extra });
            const climb = async (w0, order, hard, reg, { iters = +(process.env.ITERS || 140), params = PARAMS, stopAt = .01, variants = w => [w] } = {}) => {
                const score = async w => { const ms = []; for (const v of variants(w)) ms.push(await ev(v, order, hard.metrics)); const hc = hard.cost(ms, w); return { m: ms[0], ms, hc, cost: hc + reg(w) }; };
                let best = { w: w0, ...(await score(w0)) }, sigma = 1;
                for (let it = 0; it < iters; it++) {
                    if (best.hc < stopAt && it >= 12) break;
                    if (it % 45 === 44) sigma *= .6;
                    const w = clone(best.w);
                    for (const [path, lo, hi] of params) { if (rng() > .4) continue; setP(w, path, Math.max(lo, Math.min(hi, getP(w, path) + (rng() - .5) * 2 * sigma * (hi - lo) * .12))); }
                    const e = await score(w);
                    if (e.cost < best.cost) best = { w, ...e };
                }
                return best;
            };
            const gripOf = m => Math.max(m.grip.heel ?? 60, m.grip.toe ?? 60);
            const baseHard = m => Math.max(0, gripOf(m) - 1.2) * 6 + m.pinned.length * 40;
            const regFor = (seed, prev, wt = 2.5, wtPrev = wt) => w => {
                let s = 0; for (const [path, lo, hi] of PARAMS) { const v = getP(w, path); s += Math.abs(v - getP(seed, path)) / (hi - lo) * wt + (prev ? Math.abs(v - getP(prev, path)) / (hi - lo) * wtPrev : 0); }
                return s;
            };
            // the mirror axis is the attacker's root x: a stance that mirrors onto itself has its hips, knees and ankles centred on it
            const asymOf = m => { const P = m.pts.att; return Math.abs((P.nearKnee.x + P.farKnee.x) / 2 - m.attX) + Math.abs((P.nearAnkle.x + P.farAnkle.x) / 2 - m.attX) + Math.abs(m.hip.x - m.attX); };
            const dd = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
            // standing: both feet on the mat, knees well up (the turn is a straddle over the man's leg, the drop has somewhere to fall from)
            const standOf = m => m.knees.reduce((s, v) => s + pen(v, 28, 1e9) * 2, 0) + ['nearAnkle', 'farAnkle'].reduce((s, k) => s + pen(400 - m.pts.att[k].y, -4, 8) * 2, 0);
            const snapOf = (m0, m1) => Math.max(...['Hip', 'Knee', 'Ankle', 'Wrist'].map(k => { const A = m0.pts.att, B = m1.pts.att; return Math.min(Math.max(dd(A['near' + k], B['near' + k]), dd(A['far' + k], B['far' + k])), Math.max(dd(A['near' + k], B['far' + k]), dd(A['far' + k], B['near' + k]))); }));
            // symmetry ramps in toward the turn's mirror instant and back out after it (the turn is one continuous motion, not a snap)
            const symWeight = t => (t < T.stepEnd || t > T.turnEnd ? 0 : t <= T.turnFlip ? smooth((t - T.stepEnd) / (T.turnFlip - T.stepEnd)) : 1 - smooth((t - T.turnFlip) / (T.turnEnd - T.turnFlip)));
            const out = [];   // waypoints: { t, order, att, gap, attY, def, defSign, twist, attSign, grip, knees, ... }
            const push = (t, w, order, m, extra = {}) => out.push({ t: +t.toFixed(4), order, att: w.att, gap: w.gap, attY: w.attY, def: w.def, defSign: w.defSign, twist: w.twist, attSign: w.attSign, grip: m.grip, knees: m.knees, kneeX: m.kneeX, foot: m.foot, hip: m.hip, pinned: m.pinned, ...extra });
            let landKneeX = null;
            const fEnd = Math.round(T.rollEnd * FPS), fLandF = Math.round(T.land * FPS);
            const grid = [];
            for (let k = 30; k < 60; k += 2) grid.push(k);
            for (let k = 60; k < fEnd; k += 2) grid.push(k);
            grid.push(fEnd);
            const runPhase1 = async (upTo, pass) => {
                out.length = 0;
                let prev = null, prevT = null, standH = null, turnKneeX = null;
                const items = grid.filter(k => k / FPS <= upTo + 1e-9).map(k => ({ t: k / FPS, kind: 'norm' }));
                if (upTo >= T.turnFlip) items.push({ t: T.turnFlip, kind: 'turnFlip' });
                if (upTo >= T.rollFlip) items.push({ t: T.rollFlip, kind: 'rollFlip' });
                items.sort((x, y) => x.t - y.t);
                // follow(): the previous solved pose plus the designed change since then (continuity first, the design's direction second)
                const follow = (t, tw) => {
                    const sd = seedAt(t), base = prev ? { att: mixObj(prev.att, prev.att, 0), gap: prev.gap, attY: prev.attY } : sd;
                    if (!prev) return wOf(sd, tw ?? t);
                    const sp = seedAt(prevT), att = clone(prev.att);
                    for (const key of Object.keys(att)) if (typeof att[key] === 'number') att[key] += (sd.att[key] ?? 0) - (sp.att[key] ?? 0);
                    return wOf({ att, gap: prev.gap + sd.gap - sp.gap, attY: Math.max(0, prev.attY + sd.attY - sp.attY) }, tw ?? t);
                };
                for (const it of items) {
                    const { t, kind } = it, order = orderAt(t);
                    const turnWin = t > T.stepEnd - .1 && t < T.turnEnd + .1, wPrev = turnWin ? 7 : 2.5;
                    if (kind === 'norm') {
                        const w0 = follow(t), sw = symWeight(t);
                        const kx = (lo, i, v) => Math.max(0, Math.abs(v - landKneeX[i]) - lo);
                        const kneeXAt = tt => turnKneeX.map((v, i) => lerp(v, landKneeX[i], smooth((tt - T.turnFlip) / (T.land - T.turnFlip))));
                        let hard = { cost: ms => baseHard(ms[0]) + sw * 1 * asymOf(ms[0]) + (t > T.stepEnd + .05 && t <= T.dropStart + 1e-6 ? standOf(ms[0]) : 0) + (pass === 2 && turnKneeX && t > T.turnFlip ? ms[0].kneeX.reduce((s, v, i) => s + Math.max(0, Math.abs(v - kneeXAt(t)[i]) - 3) * 1.5, 0) : 0) };
                        if (t > T.dropStart + 1e-6 && t <= T.land + 1e-6) {   // the drop: both knees follow one gravity schedule from the standing height to the mat, and come straight down onto where they land
                            const u = (t - T.dropStart) / (T.land - T.dropStart), target = t >= T.land - 1e-6 ? 1.5 : lerp(standH, 1.5, u ** 1.7);
                            hard = { cost: ms => baseHard(ms[0]) + (Math.abs(ms[0].knees[0] - target) + Math.abs(ms[0].knees[1] - target)) * 1.5 + (pass === 2 ? ms[0].kneeX.reduce((s, v, i) => s + Math.max(0, Math.abs(v - kneeXAt(t)[i]) - 3) * 1.5, 0) : 0) };
                        } else if (t > T.land + 1e-6) {   // kneeling base: knees stay on the mat, where they landed; and less of the trapped boot hidden
                            hard = { metrics: true, cost: ms => baseHard(ms[0]) + ms[0].knees.reduce((s, v) => s + pen(v, -2, 4) * 3, 0) + ms[0].kneeX.reduce((s, v, i) => s + kx(1.5, i, v) * 2, 0) + ms[0].boot.bootCoveredPx * .04 };
                        }
                        const best = await climb(w0, order, hard, regFor(w0, prev, 2.5, wPrev), { iters: pass === 1 ? 80 : undefined });
                        if (Math.abs(t - T.dropStart) < 1e-6) standH = (best.m.knees[0] + best.m.knees[1]) / 2;
                        if (Math.abs(t - T.land) < 1e-6 && pass === 1) landKneeX = best.m.kneeX;
                        prev = best.w; prevT = t;
                        push(t, best.w, order, best.m);
                        if (pass === 2) console.log(`${pair}-${side} t=${t.toFixed(3)} grip ${best.m.grip.heel}/${best.m.grip.toe} knees ${best.m.knees.map(v => v.toFixed(1))} kneeX ${best.m.kneeX.map(v => v.toFixed(0))} pinned ${best.m.pinned.length} cost ${best.cost.toFixed(1)}`);
                    } else if (kind === 'turnFlip') {
                        // the attacker's turn: one symmetric pose (thighs and folds mirror each other), held under both facings; the man is still supine
                        const w0 = follow(t, t - .001), variants = w => [{ ...w, attSign: 1 }, { ...w, attSign: -1 }];
                        const hard = { cost: ms => Math.max(baseHard(ms[0]), baseHard(ms[1])) + snapOf(ms[0], ms[1]) * 3 + (asymOf(ms[0]) + asymOf(ms[1])) * 1.5 + standOf(ms[0]) + standOf(ms[1]) };
                        const best = await climb(w0, order, hard, regFor(w0, prev, 2.5, 7), { variants, iters: pass === 1 ? 100 : 260 });
                        prev = best.w; prevT = t; turnKneeX = best.ms[1].kneeX;
                        push(t - .001, { ...best.w, attSign: 1 }, order, best.ms[0]); push(t + .001, { ...best.w, attSign: -1 }, 'cap', best.ms[1]);
                        if (pass === 2) console.log(`${pair}-${side} TURN FLIP grip ${best.ms[0].grip.heel}/${best.ms[0].grip.toe} | ${best.ms[1].grip.heel}/${best.ms[1].grip.toe} snap ${snapOf(best.ms[0], best.ms[1]).toFixed(1)} asym ${asymOf(best.ms[0]).toFixed(1)} cost ${best.cost.toFixed(1)}`);
                    } else {   // rollFlip: the man's straight-limbed instant under both facings; the kneeling attacker holds one pose
                        const w0 = follow(t, t - .001);
                        const variants = w => [{ ...w, def: S, defSign: -1, twist: false }, { ...w, def: Sm, defSign: 1, twist: true }];
                        const hard = { cost: ms => Math.max(baseHard(ms[0]), baseHard(ms[1])) + ms[0].knees.reduce((s, v) => s + pen(v, -2, 4) * 3, 0) + ms[0].kneeX.reduce((s, v, i) => s + Math.max(0, Math.abs(v - landKneeX[i]) - 1.5) * 2, 0) };
                        const best = await climb(w0, order, hard, regFor(w0, prev, 2.5, 7), { variants, iters: 260 });
                        prev = best.w; prevT = t;
                        push(t - .001, { ...best.w, def: S, defSign: -1, twist: false }, order, best.ms[0]); push(t + .001, { ...best.w, def: Sm, defSign: 1, twist: true }, order, best.ms[1]);
                        if (pass === 2) console.log(`${pair}-${side} ROLL FLIP grip ${best.ms[0].grip.heel}/${best.ms[0].grip.toe} | ${best.ms[1].grip.heel}/${best.ms[1].grip.toe} cost ${best.cost.toFixed(1)}`);
                    }
                }
                return prev;
            };
            await runPhase1(T.land, 1);   // pass 1: down to the landing, to learn where the knees end up
            console.log(`${pair}-${side} landing knee x ${landKneeX.map(v => v.toFixed(1))}`);
            let prev = await runPhase1(T.rollEnd, 2);   // pass 2: the whole entry, the drop coming straight down onto those knees
            // ---- phase 2: three wrenches. E = the kneeling ease (the roll's end pose), Q = the pull: hips back toward the heels, the foot dragged toward his chest ----
            const E = out[out.length - 1], Ew = { att: E.att, gap: E.gap, attY: E.attY, def: E.def, defSign: 1, twist: true, attSign: -1 };
            const kneeHard = m => baseHard(m) + m.knees.reduce((s, v) => s + pen(v, -2, 4) * 3, 0) + m.kneeX.reduce((s, v, i) => s + Math.max(0, Math.abs(v - landKneeX[i]) - 1.5) * 2, 0);
            const DEFP = [['def.lLeg', -1.7, .3], ['def.lFold', 1.2, 2.45]];
            const hipBackOf = m => (m.hip.x - E.hip.x) * facing, travelOf = m => Math.hypot(m.foot.x - E.foot.x, m.foot.y - E.foot.y);
            const MINTRAVEL = +(process.env.MINTRAVEL || 36), MINBACK = +(process.env.MINBACK || 14);
            const qSeed = clone(Ew); qSeed.att.lean -= .25; qSeed.att.bend = Math.max(0, qSeed.att.bend - .3); qSeed.def.lFold = 2.4; qSeed.def.lLeg -= .5; qSeed.att.lLeg -= .3; qSeed.att.rLeg -= .3; qSeed.att.lFold = Math.min(2.4, qSeed.att.lFold + .3); qSeed.att.rFold = Math.min(2.4, qSeed.att.rFold + .3); qSeed.gap += 12;
            const qHard = { metrics: true, cost: ms => kneeHard(ms[0]) + pen(travelOf(ms[0]), MINTRAVEL, 1e9) * 2 + pen(hipBackOf(ms[0]), MINBACK, 1e9) * 2 + ms[0].boot.bootCoveredPx * .04 };
            let Q = null;
            for (let r = 0; r < 4 && (!Q || Q.hc > 1); r++) { const q = await climb(r && Q ? Q.w : qSeed, 'cap', qHard, regFor(qSeed, null, .5), { params: [...PARAMS, ...DEFP], iters: +(process.env.QITERS || 700), stopAt: .3 }); if (!Q || q.hc < Q.hc) Q = q; }
            console.log(`${pair}-${side} PULL Q grip ${Q.m.grip.heel}/${Q.m.grip.toe} travel ${travelOf(Q.m).toFixed(1)} hipBack ${hipBackOf(Q.m).toFixed(1)} knees ${Q.m.knees.map(v => v.toFixed(1))} boot ${Q.m.boot.bootCoveredPx}/${Q.m.boot.bootPx} cost ${Q.cost.toFixed(1)} hard ${Q.hc.toFixed(2)}`);
            // pull intensity u(t): up over 0.3 s into each peak, held 0.08 s, then eased off over 0.52 s
            const uAt = t => { let u = 0; for (const p of T.peaks) { if (t >= p - .3 && t <= p) u = Math.max(u, smooth((t - (p - .3)) / .3)); else if (t > p && t <= p + .08) u = 1; else if (t > p + .08 && t < p + .6) u = Math.max(u, 1 - smooth((t - p - .08) / .52)); } return u; };
            const mixW = (u) => ({ att: mixObj(Ew.att, Q.w.att, u), gap: lerp(Ew.gap, Q.w.gap, u), attY: lerp(Ew.attY, Q.w.attY, u), def: { ...Ew.def, lLeg: lerp(Ew.def.lLeg, Q.w.def.lLeg, u), lFold: lerp(Ew.def.lFold, Q.w.def.lFold, u) }, defSign: 1, twist: true, attSign: -1 });
            for (let k = Math.round(T.rollEnd * FPS) + 3; k <= Math.round(T.end * FPS); k += 3) {
                const t = k / FPS, u = uAt(t);
                if (u === 0) { push(t, Ew, 'cap', { grip: E.grip, knees: E.knees, kneeX: E.kneeX, foot: E.foot, hip: E.hip, pinned: [] }); continue; }
                const w0 = mixW(u);
                if (u === 1) { push(t, Q.w, 'cap', Q.m); continue; }
                const best = await climb(w0, 'cap', { metrics: false, cost: ms => kneeHard(ms[0]) }, regFor(w0, prev), { params: [...PARAMS, ...DEFP], iters: 100 });
                prev = best.w; push(t, best.w, 'cap', best.m, { u });
                console.log(`${pair}-${side} t=${t.toFixed(3)} u ${u.toFixed(2)} grip ${best.m.grip.heel}/${best.m.grip.toe} knees ${best.m.knees.map(v => v.toFixed(1))} travel ${travelOf(best.m).toFixed(1)} cost ${best.cost.toFixed(1)}`);
            }
            writeFileSync(`${caseDir}/waypoints.json`, JSON.stringify({ facing, peaks: T.peaks, waypoints: out }, null, 1));
        }
    } finally { await h.close(); }
}
