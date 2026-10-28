// T2.5 (PLAN_GETUPS): George's hand leaving the back with the elbow out, not the hand low. Candidates are runtime patches of
// textures.backSell.aroundVia on the live rig (nothing under src/ changes until Derek picks at G1-rev):
//   B  today (G8a candidate B: via 1.5 hand lengths BELOW and outboard of backWaist; recoveryArm -0.6 / recoveryElbow -0.4)
//   C1 C2 C3  via at backWaist height, outboard 1.0 / 1.25 / 1.5 hand lengths; the upper arm swung back (elbow out)
//             0.4 / 0.6 / 0.8 rad; recoveryElbow solved so the standing wrist sits on the via point on BOTH facings
// (recoveryArm / recoveryElbow already are the rig's "elbow out" offset pose: no new schema field).
//
//   node tools/debug/getups_elbowout.mjs [outRoot=research/animation/getups-2026-10/g1-rev]
// Writes <outRoot>/elbowout/{candidates.json, measure.json, frames/<cand>/<facing>-<opp>/sNNNN.jpg}.
// Per frame (the G1 get-up with back pain, then the standing recovery, 2.5 s after standing): the hand's lowest sampled point
// along the body relative to the trunks' lower edge (<= 0 is above it), and the hand's distance outside the torso and thigh art.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP } from './rise_handoff_probe.mjs';
import { JOINT_LIMITS } from '../../src/rig/articulation.js';
import { AROUND } from '../../src/rig/backSell.js';

const outRoot = join(process.argv[2] ?? 'research/animation/getups-2026-10/g1-rev', 'elbowout');
mkdirSync(outRoot, { recursive: true });
const RIG = 'george-roster-v1';
const SPEC = [{ id: 'C1', fists: 1.0, dArm: -0.4 }, { id: 'C2', fists: 1.25, dArm: -0.6 }, { id: 'C3', fists: 1.5, dArm: -0.8 }];

// ── 1. solve the candidates ───────────────────────────────────────────────────────────────────────
async function solve() {
    process.env.WFM_P1 = RIG; process.env.WFM_P2 = RIG; process.env.WFM_QS = 'notitle=1&getups=v1';
    const h = await launch();
    try {
        await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.torso, null, { timeout: 30000 });
        const settle = await h.page.evaluate(async () => {
            const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1;
            const { POSES } = await import('/src/Wrestler.js');
            w.state = 'standing'; w.tweenPose('idle', 0, 'Linear');
            const target = POSES[w.idlePose] ?? POSES.idle;
            for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) w.pose[k] = target[k] ?? 0;
            return JSON.parse(JSON.stringify(w.pose));
        });
        return await h.page.evaluate(({ settled, limits, standW, SPEC }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            sc.scene.pause(); sc.tweens.pauseAll();
            const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
            w.state = 'standing'; w.x = 400; w.y = 430;
            const base = { ...settled }, s = w.s * (w._heightScale ?? 1);
            const chan = f => (sk.lChannelSide(f) === 'far' ? 'r' : 'l');
            const bs = sk._textureConfig.backSell, today = JSON.parse(JSON.stringify(bs.aroundVia));
            const wa = Sk.imageAnchorPoint; void wa;
            const anchor = sk.torso._semanticAnchors.backWaist;
            const drawStand = (facing, dArm, dElbow) => {
                const n = chan(facing);
                const pose = { ...base, bend: (base.bend ?? 0) + 0.12 * standW, [`${n}Arm`]: (base[`${n}Arm`] ?? 0) + dArm, [`${n}Elbow`]: base[`${n}Elbow`] + dElbow };
                sk.updateUpright(400, 430, s, facing, pose, 0, 0, facing * (pose.lean ?? 0), 0, 0.5, 0);
            };
            drawStand(1, 0, 0);
            const smp = sk.nearHandSamples(), fist = Math.hypot(smp.handEnd.x - smp.wrist.x, smp.handEnd.y - smp.wrist.y), tw = sk.torso.displayWidth;
            const out = { fistPx: +fist.toFixed(2), torsoDisplayW: +tw.toFixed(2), backWaist: anchor, today, candidates: [] };
            const e0 = Math.min(...[1, -1].map(f => base[`${chan(f)}Elbow`])), e1 = Math.max(...[1, -1].map(f => base[`${chan(f)}Elbow`]));
            for (const c of SPEC) {
                const via = { u: +(anchor.u - c.fists * fist / tw).toFixed(4), v: anchor.v, approach: today.approach };
                bs.aroundVia = via;
                // the via may be out of reach for the asked upper-arm swing: search the swing too and report both
                const eval_ = (a, b) => { const d = [1, -1].map(f => { drawStand(f, a, b); const V = sk.aroundViaPoint(), W = sk.jointAttachmentPoints.nearWrist; return Math.hypot(W.x - V.x, W.y - V.y); }); return { dArm: +a.toFixed(2), dElbow: +b.toFixed(2), worst: +Math.max(...d).toFixed(2), d1: +d[0].toFixed(2), dM1: +d[1].toFixed(2) }; };
                let asked = null, free = null;
                for (let a = -1.6; a <= 0.3001; a += 0.05) for (let b = -2.0; b <= 3.0001; b += 0.05) {
                    if (e1 + b > limits.max || e0 + b < limits.min) continue;
                    const r = eval_(a, b);
                    if (!free || r.worst < free.worst) free = r;
                    if (Math.abs(a - c.dArm) < 0.026 && (!asked || r.worst < asked.worst)) asked = r;
                }
                // the pick: the asked swing if it reaches within 10 px, else the nearest swing to it that does (never past the best reachable)
                let pick = asked.worst <= 10 ? asked : null;
                if (!pick) {
                    const ok = [];
                    for (let a = -1.6; a <= 0.3001; a += 0.05) for (let b = -2.0; b <= 3.0001; b += 0.05) {
                        if (e1 + b > limits.max || e0 + b < limits.min) continue;
                        const r = eval_(a, b); if (r.worst <= Math.max(10, free.worst + 1.5)) ok.push(r);
                    }
                    ok.sort((p, q) => Math.abs(p.dArm - c.dArm) - Math.abs(q.dArm - c.dArm) || p.worst - q.worst);
                    pick = ok[0] ?? free;
                }
                const best = pick;
                out.candidates.push({ id: c.id, fists: c.fists, via: { ...via, recoveryArm: best.dArm, recoveryElbow: best.dElbow }, asked: { dArm: c.dArm, ...asked }, bestReachable: free, solved: best });
            }
            bs.aroundVia = today;
            return out;
        }, { settled: settle, limits: JOINT_LIMITS.elbow, standW: AROUND.standW, SPEC });
    } finally { await h.close(); }
}

// ── 2. film + measure ─────────────────────────────────────────────────────────────────────────────
const MEASURE = async () => {
    const w = window.__rw, sk = w.skeleton, { handClearance, silhouetteOf } = await import('/src/rig/silhouette.js');
    const smp = sk.nearHandSamples(), p = sk.jointAttachmentPoints, hipMid = p.nearHip && p.farHip ? { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 } : p.nearHip;
    if (!smp || !hipMid || !p.neck) return null;
    let ax = p.neck.x - hipMid.x, ay = p.neck.y - hipMid.y; const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;     // up the body
    const along = (q) => -((q.x - hipMid.x) * ax + (q.y - hipMid.y) * ay);                                        // down the body
    // George has no trunks part: they are painted on the torso art. Their lower edge is the torso's last opaque row (the hem).
    const t = sk.torso, Sk = sk.constructor;
    if (!window.__hem) {
        const src = t.texture.getSourceImage(), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let row = -1, x0 = c.width, x1 = 0;
        for (let y = c.height - 1; y >= 0 && row < 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { row = y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
        window.__hem = { v: (row + 1) / c.height, u0: x0 / c.width, u1: (x1 + 1) / c.width };
    }
    const trunksBottom = Math.max(...[window.__hem.u0, (window.__hem.u0 + window.__hem.u1) / 2, window.__hem.u1].map(u => along(Sk.imageAnchorPoint(t, { u, v: window.__hem.v }))));
    const pts = Object.entries(smp).filter(([, q]) => q);
    const low = pts.map(([k, q]) => [k, along(q)]).sort((a, b) => b[1] - a[1])[0];
    const dist = (part) => { const sil = silhouetteOf(part); return sil ? handClearance(part, smp, sil, 1).min : null; };
    const torso = dist(sk.torso), nt = dist(sk.nearThigh), ft = dist(sk.farThigh);
    const outside = [torso, nt, ft].filter(v => v !== null);
    return { lowestPart: low[0], lowestBelowTrunks: +(low[1] - trunksBottom).toFixed(2), trunksBottom: +trunksBottom.toFixed(2),
        torsoClear: torso === null ? null : +torso.toFixed(2), nearThighClear: nt === null ? null : +nt.toFixed(2), farThighClear: ft === null ? null : +ft.toFixed(2),
        outsideUnion: outside.length ? +Math.min(...outside).toFixed(2) : null, handUnder: !!sk._handUnder,
        hw: +(w._recoveryHandWeight?.() ?? 0).toFixed(3), reachW: +(sk._backReachW ?? 0).toFixed(3) };
};

async function film(cands) {
    const rows = [];
    process.env.WFM_P1 = RIG; process.env.WFM_P2 = 'george'; process.env.WFM_QS = 'notitle=1&getups=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400); await page.evaluate(INSTALL);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
        for (const cand of cands) {
            await page.evaluate((c) => { const bs = window.__rw.skeleton._textureConfig.backSell; window.__todayVia ??= JSON.parse(JSON.stringify(bs.aroundVia)); bs.aroundVia = c ? { ...c } : JSON.parse(JSON.stringify(window.__todayVia)); }, cand.via ?? null);
            for (const facing of [-1, 1]) for (const opp of ['behind']) {
                const id = `${facing < 0 ? 'l' : 'r'}-${opp}`, dir = join(outRoot, 'frames', cand.id, id);
                rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
                await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing, pose: 'stale', opp });
                const fr = []; let standAt = null, prevUnder = null;
                for (let i = 0; i < 400; i++) {
                    const f = await page.evaluate(STEP), m = await page.evaluate(MEASURE);
                    const swap = m && prevUnder !== null && m.handUnder !== prevUnder; if (m) prevUnder = m.handUnder;
                    fr.push({ i, now: f.now, state: f.state, riseT: f.riseT, facing: f.facing, backDist: f.backDist, ...m, swap: !!swap });
                    await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip });
                    if (standAt === null && f.state === 'standing') standAt = f.now;
                    if (standAt !== null && f.now - standAt >= 2500) break;
                }
                const ms = fr.filter(x => x.lowestBelowTrunks !== undefined && x.lowestBelowTrunks !== null);
                const mx = (a, k) => (a.length ? +Math.max(...a.map(x => x[k])).toFixed(2) : null);
                const standing = ms.filter(x => x.state === 'standing'), rising = ms.filter(x => x.state === 'gettingUp');
                const swaps = ms.filter(x => x.swap);
                // the route: the hand between rest and the waist (reach weight in the rise, recovery hand weight standing). At the
                // waist the fingers hang past the hem by art, and at rest the arm hangs below it; neither is the route.
                const routeRise = rising.filter(x => x.reachW > 0.02 && x.reachW < 0.98), routeStand = standing.filter(x => x.hw > 0.02 && x.hw < 0.98);
                rows.push({ cand: cand.id, facing, opp, frames: fr.length, getUp: null,
                    lowestBelowTrunksRise: mx(rising, 'lowestBelowTrunks'), lowestBelowTrunksStanding: mx(standing, 'lowestBelowTrunks'),
                    routeLowestRise: mx(routeRise, 'lowestBelowTrunks'), routeLowestStanding: mx(routeStand, 'lowestBelowTrunks'), routeFrames: [routeRise.length, routeStand.length],
                    routeLowestStandingMid: mx(standing.filter(x => x.hw >= 0.1 && x.hw <= 0.9), 'lowestBelowTrunks'),
                    swaps: swaps.map(x => ({ i: x.i, state: x.state, riseT: x.riseT, handUnder: x.handUnder, outsideUnion: x.outsideUnion, torsoClear: x.torsoClear, nearThighClear: x.nearThighClear, farThighClear: x.farThighClear })),
                    minOutsideAtSwap: swaps.length ? +Math.min(...swaps.map(x => x.outsideUnion)).toFixed(2) : null, series: fr });
                console.log(`[elbow] ${cand.id}/${id}: ${fr.length} fr, lowest below trunks rise ${rows.at(-1).lowestBelowTrunksRise} standing ${rows.at(-1).lowestBelowTrunksStanding}, ROUTE rise ${rows.at(-1).routeLowestRise} standing ${rows.at(-1).routeLowestStanding} (${rows.at(-1).routeFrames}), swaps ${swaps.length} min outside ${rows.at(-1).minOutsideAtSwap}`);
            }
        }
    } finally { await h.close(); }
    return rows;
}

const solved = await solve();
writeFileSync(join(outRoot, 'candidates.json'), JSON.stringify(solved, null, 1));
console.log('fist', solved.fistPx, 'torso w', solved.torsoDisplayW, 'today', JSON.stringify(solved.today));
for (const c of solved.candidates) console.log(c.id, JSON.stringify(c.via), 'asked', JSON.stringify(c.asked), 'best reachable', JSON.stringify(c.bestReachable));
// P1-P3: the same via and swing as C1-C3 with the arm moving first and the elbow following (aroundVia.phase)
const PHASE = { arm: [0, 0.55], elbow: [0.35, 1] };
const rows = await film([{ id: 'B' }, ...solved.candidates.map(c => ({ id: c.id, via: c.via })),
    ...solved.candidates.map(c => ({ id: c.id.replace('C', 'P'), via: { ...c.via, phase: PHASE } }))]);
writeFileSync(join(outRoot, 'measure.json'), JSON.stringify(rows));
process.exit(0);
