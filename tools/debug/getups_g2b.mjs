// T3b.2 (PLAN_GETUPS): the fatigue-stall film + numbers for G2b. Drawn frames, 1/60 s stepping, forced rises (B1b), 1x.
//
//   WFM_URL=http://localhost:5173 node tools/debug/getups_g2b.mjs [outDir=research/animation/getups-2026-10/g2b] [rig,rig] [--nofilm]
//
// Scenarios (turn variants, opponent behind): bkh = backKneeHurt (supine), fk = frontKnee (prone), fkb = frontKnee + back pain
// (prone, plays frontKneeBack). Stamina 100 / 25 / 5, set right before _startRiseUp (the stall length is read there).
// Output: <out>/frames/s<stamina>/<scn>/<rig>-<l|r>/sNNNN.jpg (raw, not committed), <out>/g2b-<rigs>.json (all numbers).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, STEP, partSteps } from './rise_handoff_probe.mjs';
import Skeleton from '../../src/Skeleton.js';
import { stallMs } from '../../src/animation/getUps.js';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const SCN = {
    bkh: { family: 'backKneeHurt', lying: 'supine', pain: false },
    fk: { family: 'frontKnee', lying: 'prone', pain: false },
    fkb: { family: 'frontKnee', lying: 'prone', pain: true },
};
const STAMINAS = [100, 25, 5];
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const NOFILM = process.argv.includes('--nofilm');
const out = args[0] ?? 'research/animation/getups-2026-10/g2b';
const rigList = (args[1] ?? 'lou,george').split(',');
const FRAME_MS = 1000 / 60;
const r2 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(2));
const d = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
const maxBy = (a, f) => a.reduce((m, x) => { const v = f(x); return v !== null && v !== undefined && (m === null || v > m.v) ? { v, x } : m; }, null);
const ss = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };

// in-page: the g2 BEGIN with the stamina set right before the rise starts
const BEGIN_S = ({ facing, lying, pain, stamina, family }) => {
    const q = new URLSearchParams(location.search); q.set('getup', family); history.replaceState(null, '', `?${q}`); // _pickGetUp reads it at rise start
    const sc = window.__WFM_GAME.scene.scenes[0], w = window.__rw;
    w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
    w.x = 520; w.y = 355; w.facing = facing; w.lying = lying;
    sc.w2.x = w.x - facing * 200; sc.w2.y = w.y; sc.w2.state = 'standing'; sc.w2.vx = 0; sc.w2.vy = 0; // opponent behind: the rise turns
    w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null; w._sell = null; w._hold = null;
    w._sellArtInterrupted = null; w._sellArtSelection = null; w.skeleton.setPartVariants?.({}); w._gripLatch = null;
    w._pain = null; w.stamina = 100; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0;
    Object.assign(w.pose, { lLeg: 0.1, rLeg: 0.35, lArm: 0.05, rArm: 0.12, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.1, rElbow: 0.2, lKnee: 0.15, rKnee: 0.6 });
    if (pain) { w._hurt(8, 'suplex'); w._pain.phase = 'mat'; w._pain.planned = true; }
    w.stamina = stamina;
    w.state = 'down'; w.stateTimer = 99; w.fallProgress = 1;
    window.__film = { n: 0 };
    w._startRiseUp();
    const st = w._riseStall;
    return { id: w._getUp?.id ?? null, stall: w._getUp?.stall ?? null, stallMs: st ? st.ms : 0, totalMs: st ? st.tl.totalMs : null, startMs: st ? st.tl.startMs : null };
};
const STEP_X = () => {
    const f = window.__STEP(), w = window.__rw, h = w.skeleton._getUpHold, rf = w._riseFlip;
    f.hold = { id: w._getUp?.id ?? null, hands: w._getUp?.hands ?? null, pivot: w._getUp?.pivot ?? null,
        pts: h ? JSON.parse(JSON.stringify(h.pts)) : {}, lift: h?.lift ? { ...h.lift } : {} };
    f.k = w._riseK ?? null; f.inStall = w._stallDraw ? !!w._stallDraw() : false;
    f.flip = rf ? { dx: rf.dx } : null;
    return f;
};

async function runOne(page, scn, facing, stamina, filmDir, clip) {
    const S = SCN[scn];
    if (filmDir) { rmSync(filmDir, { recursive: true, force: true }); mkdirSync(filmDir, { recursive: true }); }
    const begin = await page.evaluate(BEGIN_S, { facing, lying: S.lying, pain: S.pain, stamina, family: S.family });
    const fr = []; let prev = null, standAt = null, i = 0;
    for (let k = 0; k < 700; k++) {
        const f = await page.evaluate(STEP_X);
        const turned = !!(prev && prev.facing !== f.facing && prev.state === 'gettingUp' && f.state === 'gettingUp');
        const pk = prev?.hold.pivot;
        const mx = turned ? (pk && prev.pts[pk] ? prev.pts[pk].x : prev.x) : null;
        let step = null;
        if (prev) { const s = partSteps(prev, f, mx); const m = maxBy(Object.entries(s), ([, v]) => v); step = { v: m.v, part: m.x[0] }; }
        const rec = { i, now: f.now, state: f.state, facing: f.facing, t: f.riseT, x: f.x, pts: f.pts, hold: f.hold, k: f.k, inStall: f.inStall, turned, step };
        prev = { ...rec, parts: f.parts };
        fr.push(rec);
        if (filmDir) await page.screenshot({ path: join(filmDir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 80, clip });
        i++;
        if (standAt === null && f.state === 'standing') standAt = f.now;
        if (standAt !== null && f.now - standAt >= (S.pain ? 2600 : 1000)) break;
    }
    return { begin, fr };
}

// the weight a hand phase has at t (schedule x the lift factor recorded in the hold), like Skeleton.updateGetUp
const weightAt = (ph, key, t, lift) => {
    let w = Skeleton.getUpHandWeight(ph, t);
    if (ph.space === 'world' && lift[key] !== undefined) {
        const span = ph.release ? ph.release[1] - ph.release[0] : 0;
        const u = span > 1e-9 ? Math.min(1, Math.max(0, (t - lift[key]) / span)) : (t > lift[key] ? 1 : 0);
        w *= 1 - ss(u);
    }
    return w;
};

function measure(begin, fr, stamina) {
    const rise = fr.filter(x => x.state === 'gettingUp');
    const iStand = fr.findIndex(x => x.state === 'standing');
    const t0 = rise[0].now, dur = 850 + 750 * (1 - stamina / 100);
    const row = { entry: rise[0].hold.id, stamina, stallT: begin.stall, stallMsAsked: begin.stallMs, expectedTotalMs: r2(dur + stallMs(stamina)), todayMs: dur,
        totalMs: iStand >= 0 ? r2(fr[iStand].now - t0) : null };
    const stallF = begin.stallMs > 0 ? rise.filter(x => Math.abs(x.t - begin.stall) < 1e-9) : [];
    const first = stallF[0], last = stallF.at(-1);
    row.stall = null;
    if (first) {
        const heldMs = last.now - first.now + FRAME_MS;
        row.stall = { frames: stallF.length, beforeMs: r2(first.now - t0), stallMs: r2(heldMs), afterMs: iStand >= 0 ? r2(fr[iStand].now - (last.now + FRAME_MS)) : null };
        const win = (a, b) => maxBy(fr.filter(x => x.step && x.i >= a && x.i <= b), x => x.step.v);
        const px = (m) => (m ? { perFrame: r2(m.v), perSec: r2(m.v * 60), part: m.x.step.part, i: m.x.i, turned: m.x.turned } : null);
        row.stall.enter = px(win(first.i - 3, first.i + 12));       // 3 frames before to the end of the 200 ms ease-in
        row.stall.leave = px(win(last.i - 12, last.i + 3));          // the ease-out to 3 frames after
        row.stall.inside = px(win(first.i + 13, last.i - 13));       // the breath alone
        row.stall.enterAtStartFrame = px(win(first.i, first.i + 1));  // the single frame step onto the key (the flip frame on backKneeHurt)
        row.stall.flipAtStall = !!(first.turned || rise.find(x => x.turned && x.i >= first.i - 1 && x.i <= first.i + 1));
        // each hand through the stall: weight / state at the start, middle and end, and the reach ratio at the breath's extremes
        const hands = rise[0].hold.hands ?? {};
        row.stall.hands = [];
        for (const side of ['near', 'far']) for (const [pi, ph] of [].concat(hands[side] ?? []).entries()) {
            const key = `${side}${pi}`;
            const at = (x) => { const w = weightAt(ph, key, x.t, x.hold.lift); return { w: r2(w) }; };
            const w0 = weightAt(ph, key, first.t, first.hold.lift), tLift = last.hold.lift[key];
            const state = !(w0 > 0.001) ? (first.t < ph.push[0] ? 'not yet' : 'released')
                : ph.space === 'thighLocal' ? 'on the knee'
                : tLift !== undefined && tLift <= first.t + 1e-9 ? (w0 > 0.999 ? 'lift just began' : 'lifting') : 'planted';
            const h = { side, phase: pi, space: ph.space, target: ph.target, state, w: r2(w0), tLift: tLift !== undefined ? r2(tLift) : null, wStart: at(first).w, wEnd: at(last).w };
            if (ph.space === 'world' && w0 > 0.001) {
                const ratios = stallF.map((x) => {
                    const S_ = x.pts[`${side}Shoulder`], E = x.pts[`${side}Elbow`], W = x.pts[`${side}Wrist`], T = x.hold.pts[key];
                    if (!S_ || !E || !W || !T) return null;
                    return d(S_, T) / (d(S_, E) + d(E, W));
                }).filter(v => v !== null);
                h.reachRatioMin = r2(Math.min(...ratios)); h.reachRatioMax = r2(Math.max(...ratios));
                h.reachVerdict = h.reachRatioMax > 1 ? 'cannot reach' : h.reachRatioMax > 0.97 ? 'would lift if checked' : 'within reach';
            }
            row.stall.hands.push(h);
        }
    } else {
        const m = maxBy(rise.filter(x => x.step), x => x.step.v);
        row.maxRiseStep = m ? { perFrame: r2(m.v), part: m.x.step.part } : null;
    }
    // what the same entry does without a stall at the same place: the largest step within +-.04 t of the stall key
    const near = rise.filter(x => x.step && begin.stall !== null && Math.abs(x.t - begin.stall) <= 0.04 && !x.turned);
    const nm = maxBy(near, x => x.step.v);
    row.keyWindowStep = nm ? { perFrame: r2(nm.v), part: nm.x.step.part } : null;
    row.facingStart = fr[0].facing; row.facingStand = iStand >= 0 ? fr[iStand].facing : null;
    return row;
}

mkdirSync(out, { recursive: true });
const results = [];
for (const rigName of rigList) {
    process.env.WFM_P1 = RIGS[rigName]; process.env.WFM_P2 = 'george';
    process.env.WFM_QS = 'notitle=1&getups=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400);
        await page.evaluate(INSTALL);
        await page.evaluate(`window.__STEP = ${STEP.toString()}`);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
            const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
        for (const stamina of STAMINAS) for (const scn of Object.keys(SCN)) for (const facing of [-1, 1]) {
            const L = facing < 0 ? 'l' : 'r';
            const dir = NOFILM ? null : join(out, 'frames', `s${stamina}`, scn, `${rigName}-${L}`);
            const { begin, fr } = await runOne(page, scn, facing, stamina, dir, clip);
            const row = { rig: rigName, scn, facing, frames: fr.length, ...measure(begin, fr, stamina) };
            results.push(row);
            console.log(`[g2b] s${stamina}/${scn}/${rigName}-${L}: ${row.entry} total ${row.totalMs} ms (expect ${row.expectedTotalMs}), stall ${row.stall ? `${row.stall.stallMs} ms, enter ${row.stall.enter?.perFrame} leave ${row.stall.leave?.perFrame} px/frame` : 'none'}`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(out, `g2b-${rigList.join('-')}.json`), JSON.stringify(results, null, 1));
process.exit(0);
