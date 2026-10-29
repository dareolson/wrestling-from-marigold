// T3.6 (PLAN_GETUPS): the G2 measuring pass + film. Everything is measured from the DRAWN frames (Skeleton.jointAttachmentPoints and
// the part corners after IK, limits, masks and contact state), 1/60 s stepping, forced rises (B1b rise-only: same starting pose, pain
// and stamina), today (flag off) | new (?getups=v1&getup=<family>).
//
//   WFM_URL=http://localhost:5173 node tools/debug/getups_g2.mjs [outDir=research/animation/getups-2026-10/g2] [rig,rig] [--nofilm]
//
// Scenarios (kind rise = BEGIN rise-only forced; kind land = a lying hold of 1.3 s first, then the game's own rise start, so the
// hold -> rise step exists):
//   fk-turn / fk-straight   prone, opponent behind / in front          frontKnee / frontKneeStraight
//   fkb-turn / fkb-straight prone + back pain (rise phase)             frontKneeBack / frontKneeBackStraight (E5: near hand follows the keys)
//   bt                      supine, opponent in front                  backTuck (no turn)
//   land-fk / land-fkb      direct face-down landing, hold then rise   opponent behind, pain off / on
//   land-bt                 direct back landing, hold then rise        opponent in front
// Output: <out>/frames/<col>/<scn>/<rig>-<l|r>/sNNNN.jpg (raw, not committed), <out>/g2-<rigs>.json (all numbers).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP, partSteps } from './rise_handoff_probe.mjs';

const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const SCN = {
    'fk-turn': { family: 'frontKnee', kind: 'rise', lying: 'prone', opp: 'behind', pain: false },
    'fk-straight': { family: 'frontKnee', kind: 'rise', lying: 'prone', opp: 'front', pain: false },
    'fkb-turn': { family: 'frontKnee', kind: 'rise', lying: 'prone', opp: 'behind', pain: true },
    'fkb-straight': { family: 'frontKnee', kind: 'rise', lying: 'prone', opp: 'front', pain: true },
    'bt': { family: 'backTuck', kind: 'rise', lying: 'supine', opp: 'front', pain: false },
    'land-fk': { family: 'frontKnee', kind: 'land', lying: 'prone', opp: 'behind', pain: false },
    'land-fkb': { family: 'frontKnee', kind: 'land', lying: 'prone', opp: 'behind', pain: true },
    'land-bt': { family: 'backTuck', kind: 'land', lying: 'supine', opp: 'front', pain: false },
};
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const NOFILM = process.argv.includes('--nofilm');
const out = args[0] ?? 'research/animation/getups-2026-10/g2';
const rigList = (args[1] ?? 'lou,george').split(',');
const HOLD_SEC = 1.3, ELBOW_MAX = 2.75;
const r2 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(2));
const d = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
const maxBy = (a, f) => a.reduce((m, x) => { const v = f(x); return v !== null && v !== undefined && (m === null || v > m.v) ? { v, x } : m; }, null);

// in-page: begin a lying hold (the hold_rise_probe way); the rise starts later with the game's own calls
const BEGIN_LAND = ({ facing, lying, opp, pain }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w = window.__rw;
    w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
    w.x = 520; w.y = 355; w.facing = facing; w.lying = lying;
    sc.w2.x = w.x + (opp === 'front' ? facing : -facing) * 200; sc.w2.y = w.y; sc.w2.state = 'standing'; sc.w2.vx = 0; sc.w2.vy = 0;
    w._activeMove = null; w._choreoUntil = 0; w._groundHandoff = null; w._sell = null; w._hold = null;
    w._sellArtInterrupted = null; w._sellArtSelection = null; w.skeleton.setPartVariants?.({}); w._gripLatch = null;
    w._riseFrom = 0; w._riseHold = null; w._getUp = null; w._riseFlip = null; w.skeleton.clearGetUpHands?.();
    w._pain = null; w.stamina = 100; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0;
    Object.assign(w.pose, { lLeg: 0.1, rLeg: 0.35, lArm: 0.05, rArm: 0.12, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.1, rElbow: 0.2, lKnee: 0.15, rKnee: 0.6 });
    if (pain) { w._hurt(8, 'suplex'); w._pain.phase = 'mat'; w._pain.planned = true; }
    w.state = 'down'; w.stateTimer = 99; w.fallProgress = 1;
    w._hold = { t: 0, lying };
    window.__film = { n: 0 };
    return true;
};
const START_LAND_RISE = () => { const w = window.__rw; w._tickSell(1 / 60); w._startRiseUp(); return w._getUp?.id ?? null; };
// in-page: one step + the entry's hold and flip bookkeeping
const STEP_X = () => {
    const f = window.__STEP(), w = window.__rw, h = w.skeleton._getUpHold, rf = w._riseFlip;
    f.hold = { id: w._getUp?.id ?? null, hands: w._getUp?.hands ?? null, pivot: w._getUp?.pivot ?? null, flipAt: w._getUp?.flipAt ?? null,
        pts: h ? JSON.parse(JSON.stringify(h.pts)) : {}, lift: h?.lift ? { ...h.lift } : {} };
    f.flip = rf ? { dx: rf.dx, clamped: !!rf.clamped } : null;
    return f;
};

async function runScenario(page, scn, facing, filmDir, clip) {
    const S = SCN[scn];
    if (filmDir) { rmSync(filmDir, { recursive: true, force: true }); mkdirSync(filmDir, { recursive: true }); }
    let id = null;
    const fr = []; let prev = null, standAt = null, i = 0;
    const tailMs = S.pain ? 2600 : 1000;
    const record = async () => {
        const f = await page.evaluate(STEP_X);
        const turned = !!(prev && prev.facing !== f.facing && prev.state === 'gettingUp' && f.state === 'gettingUp');
        const pk = prev?.hold.pivot;
        const mx = turned ? (pk && prev.pts[pk] ? prev.pts[pk].x : prev.x) : null;
        let step = null, stepRaw = null;
        if (prev) {
            const s = partSteps(prev, f, mx), sr = partSteps(prev, f);
            const m = maxBy(Object.entries(s), ([, v]) => v), mr = maxBy(Object.entries(sr), ([, v]) => v);
            step = { v: m.v, part: m.x[0], all: s }; stepRaw = { v: mr.v, part: mr.x[0] };
        }
        const rec = { i, now: f.now, state: f.state, facing: f.facing, t: f.riseT, x: f.x, pts: f.pts, hold: f.hold, flip: f.flip, turned, step, stepRaw };
        prev = { ...rec, parts: f.parts };
        fr.push(rec);
        if (filmDir) await page.screenshot({ path: join(filmDir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 80, clip });
        i++;
        return f;
    };
    if (S.kind === 'land') {
        await page.evaluate(BEGIN_LAND, { facing, lying: S.lying, opp: S.opp, pain: S.pain });
        for (let k = 0; k < Math.round(HOLD_SEC * 60); k++) await record();
        id = await page.evaluate(START_LAND_RISE);
    } else {
        await page.evaluate(BEGIN, { kind: 'gettingUp', lying: S.lying, pain: S.pain, facing, pose: 'stale', opp: S.opp });
        id = await page.evaluate(() => window.__rw._getUp?.id ?? null);
    }
    for (let k = 0; k < 700; k++) {
        const f = await record();
        if (standAt === null && f.state === 'standing') standAt = f.now;
        if (standAt !== null && f.now - standAt >= tailMs) break;
    }
    return { id, fr };
}

function measure(fr) {
    const rise = fr.filter(x => x.state === 'gettingUp');
    const iFirst = fr.indexOf(rise[0]), iStand = fr.findIndex(x => x.state === 'standing');
    const t0 = rise[0].now;
    const row = { entry: rise[0].hold.id, riseMs: iStand >= 0 ? r2(fr[iStand].now - t0) : null, riseFrames: rise.length };
    const msAt = (t) => { const x = rise.find(q => q.t >= t - 1e-9); return x ? r2(x.now - t0) : null; };
    const hands = rise.find(x => x.hold.hands)?.hold.hands ?? null;
    const flipAt = rise[0].hold.flipAt;
    row.flipAt = flipAt; row.flipMs = flipAt ? msAt(flipAt) : null; row.pivot = rise[0].hold.pivot;
    row.usesNearHand = !!hands?.near;

    // 6. real ms of each phase
    row.phases = [];
    for (const side of ['near', 'far']) for (const [pi, ph] of [].concat(hands?.[side] ?? []).entries()) {
        const key = `${side}${pi}`, lifted = rise.find(x => x.hold.lift[key] !== undefined);
        row.phases.push({ side, phase: pi, space: ph.space, target: ph.target, push: ph.push, release: ph.release,
            pushMs: [msAt(ph.push[0]), msAt(ph.push[1])], releaseEndMs: msAt(ph.release[1]),
            tLift: lifted ? r2(lifted.hold.lift[key]) : null, liftMs: lifted ? msAt(lifted.hold.lift[key]) : null });
    }
    // 3. steps: hold -> first rise frame, last rise frame -> first standing frame, whole rise (the flip frame mirrored about the pivot)
    const stepAt = (b) => { const x = fr[b]?.step; return x ? { v: r2(x.v), part: x.part, nearForearm: r2(x.all.nearForearm), farForearm: r2(x.all.farForearm) } : null; };
    row.holdToRise = iFirst > 0 && fr[iFirst - 1].state === 'down' ? stepAt(iFirst) : null;
    row.lastRiseToStand = iStand > 0 ? stepAt(iStand) : null;
    const riseSteps = rise.filter(x => x.step && x.i !== iFirst);
    const wm = maxBy(riseSteps.filter(x => !x.turned), x => x.step.v), wmFlip = riseSteps.find(x => x.turned);
    row.maxRiseStep = wm ? { v: r2(wm.v), part: wm.x.step.part, t: r2(wm.x.t), ms: r2(wm.x.now - t0) } : null;
    row.flipFrameStep = wmFlip ? { mirrored: r2(wmFlip.step.v), mirroredPart: wmFlip.step.part, raw: r2(wmFlip.stepRaw.v), rawPart: wmFlip.stepRaw.part } : null;

    row.handOvers = [];
    for (const side of ['near', 'far']) {
        const ph = [].concat(hands?.[side] ?? []);
        for (let k = 1; k < ph.length; k++) {
            const lo = ph[k].push[0] - (ph[k].lead ?? 0.10), hi = ph[k - 1].release[1];
            const win = rise.filter(x => x.step && x.t >= lo - 1e-9 && x.t <= hi + 1e-9 && !x.turned);
            const m = maxBy(win, x => x.step.v);
            const wr = maxBy(win, x => d(x.pts[`${side}Wrist`], fr[x.i - 1].pts[`${side}Wrist`]));
            row.handOvers.push({ side, window: [r2(lo), r2(hi)], frames: win.length, maxPartStep: m ? { v: r2(m.v), part: m.x.step.part } : null, wristStep: wr ? r2(wr.v) : null });
        }
    }

    // 1+2. slip in world space during each mat contact; wrist-to-knee during the knee contact; elbow flex vs the limit
    row.hands = [];
    for (const side of ['near', 'far']) for (const [pi, ph] of [].concat(hands?.[side] ?? []).entries()) {
        const key = `${side}${pi}`, lead = ph.lead ?? 0.10;
        const W = (x) => x.pts[`${side}Wrist`];
        const lifted = rise.find(x => x.hold.lift[key] !== undefined), tLift = lifted ? lifted.hold.lift[key] : null;
        const h = { side, phase: pi, space: ph.space };
        if (ph.space === 'world') {
            const endPlant = tLift ?? ph.push[1];
            const planted = rise.filter(x => x.t >= ph.push[0] - 1e-9 && x.t < endPlant && x.hold.pts[key] && W(x));
            const segs = [...new Set(planted.map(x => x.facing))];
            const slipT = planted.map(x => d(W(x), x.hold.pts[key]));
            let travel = 0;
            for (const f of segs) { const s = planted.filter(x => x.facing === f); travel = Math.max(travel, ...s.map(x => d(W(x), W(s[0])))); }
            h.plantedFrames = planted.length; h.slipVsTargetMax = r2(Math.max(...slipT, 0));
            h.worldTravelMax = r2(travel); h.neverPlants = planted.length <= 1; h.lifted = tLift !== null; h.tLift = r2(tLift);
            h.liftMs = lifted ? msAt(tLift) : null;
            const lw = tLift === null ? [] : rise.filter(x => x.t >= tLift && x.t <= ph.release[1] && x.i > iFirst && !x.turned);
            const ls = maxBy(lw, x => d(W(x), W(fr[x.i - 1])));
            h.liftWristStepMax = ls ? r2(ls.v) : null;
        } else {
            const kw = rise.filter(x => x.t >= ph.push[0] && x.t <= ph.push[1] && W(x) && x.pts[ph.target]);
            const dist = kw.map(x => d(W(x), x.pts[ph.target]));
            h.kneeFrames = kw.length; h.wristToKneeMax = r2(Math.max(...dist)); h.wristToKneeMin = r2(Math.min(...dist));
        }
        const ew = rise.filter(x => x.t >= ph.push[0] - lead && x.t <= ph.release[1] && x.pts[`${side}Shoulder`] && x.pts[`${side}Elbow`] && W(x));
        const flex = ew.map(x => { const S_ = x.pts[`${side}Shoulder`], E = x.pts[`${side}Elbow`], Wr = W(x);
            const a = Math.atan2(S_.y - E.y, S_.x - E.x), b = Math.atan2(Wr.y - E.y, Wr.x - E.x);
            let dd = Math.abs(a - b); if (dd > Math.PI) dd = 2 * Math.PI - dd; return Math.PI - dd; });
        h.elbowFlexMax = r2(Math.max(...flex)); h.elbowFlexMin = r2(Math.min(...flex));
        h.elbowFramesAtLimit = flex.filter(v => v >= ELBOW_MAX - 0.03).length; h.elbowFrames = flex.length;
        const lu = ew.map(x => d(x.pts[`${side}Shoulder`], x.pts[`${side}Elbow`])), lf = ew.map(x => d(x.pts[`${side}Elbow`], W(x)));
        h.upperLenRange = r2(Math.max(...lu) - Math.min(...lu)); h.foreLenRange = r2(Math.max(...lf) - Math.min(...lf));
        row.hands.push(h);
    }

    // 4. the flip: raw world jump of each planted contact between the last frame before and the flip frame
    const flipF = rise.find(x => x.turned);
    if (flipF) {
        const p = fr[flipF.i - 1];
        const jump = (k) => (p.pts[k] && flipF.pts[k] ? d(p.pts[k], flipF.pts[k]) : null);
        const drift = (k) => { const s = rise.filter(x => x.i >= flipF.i && x.t <= flipF.t + 0.12 && x.pts[k]); return r2(Math.max(...s.map(x => d(x.pts[k], s[0].pts[k])))); };
        row.flip = { frame: flipF.i, ms: r2(flipF.now - t0), xShift: r2(flipF.x - p.x), clamped: flipF.flip?.clamped ?? null, pivot: row.pivot,
            jump: Object.fromEntries(['nearKnee', 'farKnee', 'nearAnkle', 'farAnkle', 'nearHip', 'farHip'].map(k => [k, r2(jump(k))])),
            driftNext120t: Object.fromEntries(['nearKnee', 'farAnkle', 'nearAnkle', 'farKnee'].map(k => [k, drift(k)])), facing: [p.facing, flipF.facing] };
    } else row.flip = null;
    row.facingStart = fr[0].facing; row.facingStand = iStand >= 0 ? fr[iStand].facing : null;

    // 5. E4: the near arm through the rise and after standing (wrist / elbow joint steps, 1/60 s)
    const nearSteps = fr.map((x, i) => (i > iFirst && i && x.pts.nearWrist && fr[i - 1].pts.nearWrist && !x.turned
        ? { i, w: d(x.pts.nearWrist, fr[i - 1].pts.nearWrist), e: d(x.pts.nearElbow, fr[i - 1].pts.nearElbow), state: x.state, ms: x.now - t0 } : null)).filter(Boolean);
    const mw = maxBy(nearSteps, x => x.w), me = maxBy(nearSteps, x => x.e), fs = nearSteps.find(x => x.i === iStand);
    row.e4 = { wristFirstStanding: fs ? r2(fs.w) : null, elbowFirstStanding: fs ? r2(fs.e) : null,
        wristMax: mw ? { v: r2(mw.v), state: mw.x.state, ms: r2(mw.x.ms) } : null, elbowMax: me ? { v: r2(me.v), state: me.x.state, ms: r2(me.x.ms) } : null,
        postStandFrames: iStand >= 0 ? fr.length - iStand : 0 };
    return row;
}

mkdirSync(out, { recursive: true });
const results = [];
for (const rigName of rigList) {
    for (const column of ['today', 'new']) {
        for (const fam of column === 'today' ? [null] : ['frontKnee', 'backTuck']) {
            process.env.WFM_P1 = RIGS[rigName]; process.env.WFM_P2 = 'george';
            process.env.WFM_QS = `notitle=1${column === 'new' ? `&getups=v1&getup=${fam}` : ''}`;
            const h = await launch();
            try {
                const page = h.page;
                await page.waitForTimeout(400);
                await page.evaluate(INSTALL);
                await page.evaluate(`window.__STEP = ${STEP.toString()}`);
                const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
                    const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
                const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
                for (const [scn, S] of Object.entries(SCN)) {
                    if (fam && S.family !== fam) continue;
                    for (const facing of [-1, 1]) {
                        const L = facing < 0 ? 'l' : 'r';
                        const dir = NOFILM ? null : join(out, 'frames', column, scn, `${rigName}-${L}`);
                        const { id, fr } = await runScenario(page, scn, facing, dir, clip);
                        const row = { rig: rigName, column, scn, facing, played: id, frames: fr.length, ...measure(fr) };
                        results.push(row);
                        console.log(`[g2] ${column}/${scn}/${rigName}-${L}: ${row.played ?? 'legacy'} rise ${row.riseMs} ms, max step ${row.maxRiseStep?.v} (${row.maxRiseStep?.part}), hold->rise ${row.holdToRise?.v ?? '-'} (nearForearm ${row.holdToRise?.nearForearm ?? '-'}), last->stand ${row.lastRiseToStand?.v}`);
                    }
                }
            } finally { await h.close(); }
        }
    }
}
writeFileSync(join(out, `g2-${rigList.join('-')}.json`), JSON.stringify(results, null, 1));
process.exit(0);
