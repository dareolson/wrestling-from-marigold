// G4c-a (PLAN_GRAPPLES T4c.4): films Lou on George, both facings, the atomic drop and the snapmare reversal, measures them, writes the page.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_g4c_a.mjs [outRoot=research/animation/grapples-2026-10/g4c-a]
// Each strip runs from the tie-up through the go-behind, the move, and 8 frames after the man is back up (drop) or down (snapmare).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';
import { INSTALL_FARARM } from './far_arm_probe.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film, PRESS_AT, DROP_AT, lastShot } from './waistlock_throws.mjs';
import { partSteps } from './rise_handoff_probe.mjs';
import { ATOMIC, SNAPMARE, snapmareHeadGrip } from '../../src/animation/waistlockThrows.js';
import { WAISTLOCK } from '../../src/animation/waistlock.js';
import { torsoFrame, toFrame } from '../../src/animation/carry.js';
import { ringBoundsAtY } from '../../src/constants.js';

const outRoot = process.argv[2] ?? 'research/animation/grapples-2026-10/g4c-a';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const maxPart = (p, c) => Math.max(0, ...Object.values(partSteps(p, c)));
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const r1 = (v) => +v.toFixed(1), r2 = (v) => +v.toFixed(2);

function measure(rows, kind) {
    const out = { frames: rows.length };
    const clipId = kind === 'drop' ? 'atomicDrop' : 'snapmare';
    const isClip = r => r.t.clip === clipId;
    const i0 = rows.findIndex(isClip);                            // this move, not the drop before a reversal
    const step = (i) => Math.max(maxPart({ parts: rows[i - 1].a.parts }, { parts: rows[i].a.parts }), maxPart({ parts: rows[i - 1].d.parts }, { parts: rows[i].d.parts }));
    out.clipStart = i0;
    out.stepFirst = r1(step(i0));
    out.stepTieUpWorst = r1(Math.max(...rows.map((r, i) => (i >= 12 && i < PRESS_AT ? step(i) : 0))));
    out.stepHold = r1(Math.max(...rows.map((r, i) => (i > PRESS_AT + 40 && i < i0 ? step(i) : 0))));
    out.stepClipMax = r1(Math.max(...rows.map((r, i) => (i > i0 && isClip(r) ? step(i) : 0))));
    const end = rows.findIndex((r, i) => i > i0 && !isClip(r));
    out.stepAfter = r1(Math.max(0, ...rows.map((r, i) => i >= end && i < end+8 ? step(i) : 0)));
    // overlap per beat, flip separate
    const beat = (t) => kind === 'drop' ? (t < ATOMIC.lift ? 'lift' : t < ATOMIC.impact ? 'drop' : 'sell')
        : (t < SNAPMARE.reach ? 'reach' : t < SNAPMARE.reach + SNAPMARE.pull ? 'pull' : t < SNAPMARE.land ? 'flip' : 'landing');
    // T4c.4c: far-arm pixels drawn over his own torso, every clip frame, both men (a = w1 the attacker of the drop / thrown man of the snapmare)
    const clipRows = rows.filter(r => isClip(r) && r.far);
    out.farArm = { a: Math.max(0, ...clipRows.map(r => r.far[0])), d: Math.max(0, ...clipRows.map(r => r.far[1])), framesOver: clipRows.filter(r => r.far[0] > 0 || r.far[1] > 0).length, of: clipRows.length };
    const lastClip = rows.findLastIndex(isClip);
    out.farArmEnd = { lastClipFrame: rows[lastClip].far, firstAfter: rows[lastClip + 1]?.far ?? null };
    // T4c.4d: the knees through the clip, read off the drawn joints (the permanent guard is clip_knee_audit.mjs)
    out.knees = {};
    for (const [side, who] of [['a', 'w1'], ['d', 'w2']]) {
        const vals = rows.filter(isClip).map((r) => { const f = kneeFlex(r[side].pts, r.t.facing[side === 'a' ? 0 : 1]); return Math.min(f.nearKnee ?? 9, f.farKnee ?? 9); });
        out.knees[who] = { minFlex: r2(Math.min(...vals)), maxFlex: r2(Math.max(...rows.filter(isClip).map((r) => { const f = kneeFlex(r[side].pts, r.t.facing[side === 'a' ? 0 : 1]); return Math.max(f.nearKnee ?? -9, f.farKnee ?? -9); }))) };
    }
    out.mask = {}; out.maskFrames = {};
    for (const r of rows) if (r.mask && isClip(r)) {
        const b = beat(r.t.time), m = out.mask[b] ??= { belowBody: 0, torso: 0, total: 0, n: 0, overTorso: 0 };
        m.belowBody = Math.max(m.belowBody, r.mask.belowBody); m.torso = Math.max(m.torso, r.mask.torso); m.total = Math.max(m.total, r.mask.total); m.n++;
        if (r.mask.torso > 0) m.overTorso++;
    }
    // planted soles: ankle movement (px/frame at s = 1) of both men by beat, the standing man's separately
    out.ankle = {};
    for (let i = Math.max(1, i0); i < rows.length; i++) {
        const p = rows[i - 1], c = rows[i];
        if (!isClip(c) && !isClip(p)) continue;
        const t = c.t.time ?? SNAPMARE.duration;
        for (const [side, who] of [['a', 'att'], ['d', 'def']]) for (const foot of ['nearAnkle', 'farAnkle']) {
            const pa = p[side].pts[foot], ca = c[side].pts[foot];
            if (!pa || !ca) continue;
            const k = `${who}.${foot === 'nearAnkle' ? 'near' : 'far'}.${beat(t)}`;
            out.ankle[k] = Math.max(out.ankle[k] ?? 0, r2(Math.hypot(ca.x - pa.x, ca.y - pa.y) / c[side].s));
        }
    }
    if (kind === 'drop') {
        const imp = rows.find(r => isClip(r) && r.t.time >= ATOMIC.impact);
        const hip = { x: (imp.d.pts.nearHip.x + imp.d.pts.farHip.x) / 2, y: (imp.d.pts.nearHip.y + imp.d.pts.farHip.y) / 2 };
        out.pelvisToKnee = r1(Math.min(dist(hip, imp.a.pts.nearKnee), dist(hip, imp.a.pts.farKnee)) / imp.a.s);
        out.impactFrame = imp.i;
        // T4c.4b-1: at the top of the lift, the defender's pelvis over the attacker's pelvis, and the attacker's chest over his own pelvis (px at s = 1)
        const top = rows.find(r => isClip(r) && r.t.time >= ATOMIC.lift), mid = (r, a, b) => ({ x: (r.pts[a].x + r.pts[b].x) / 2, y: (r.pts[a].y + r.pts[b].y) / 2 });
        const ap = mid(top.a, 'nearHip', 'farHip'), dp = mid(top.d, 'nearHip', 'farHip'), ac = mid(top.a, 'nearShoulder', 'farShoulder');
        out.liftTop = { frame: top.i, pelvisOverAttackerPelvis: r1((ap.y - dp.y) / top.a.s), attackerChestOverPelvis: r1((ap.y - ac.y) / top.a.s) };
        // T4c.4f: the fridge lift. Attacker = a (w1), defender = d (w2).
        const lift = rows.filter(r => isClip(r) && r.t.time >= 0.14 && r.t.time <= ATOMIC.lift);
        const inOwnTorso = (r) => { const p = r.a.pts, hip = pmid(p, 'nearHip', 'farHip'), ax = { x: p.neck.x - hip.x, y: p.neck.y - hip.y }, len = Math.hypot(ax.x, ax.y), u = { x: ax.x / len, y: ax.y / len };
            return [p.nearWrist, p.farWrist].map(w => ({ along: ((w.x - hip.x) * u.x + (w.y - hip.y) * u.y) / r.a.s, across: ((w.x - hip.x) * -u.y + (w.y - hip.y) * u.x) / r.a.s })); };
        const hs = lift.map(inOwnTorso), span = (k, j) => r1(Math.max(...hs.map(h => h[k][j])) - Math.min(...hs.map(h => h[k][j])));
        out.armsInTorsoFrame = { nearAlongRange: span(0, 'along'), nearAcrossRange: span(0, 'across'), farAlongRange: span(1, 'along'), farAcrossRange: span(1, 'across'), frames: lift.length };
        const tops = rows.find(r => isClip(r) && r.t.time >= ATOMIC.lift), ph = pmid(tops.a.pts, 'nearHip', 'farHip'), pn = tops.a.pts.neck;
        const facing = tops.t.facing[0];
        out.attackerTorsoAtTop = { degreesFromVertical: r1(Math.atan2((pn.x - ph.x) * facing, ph.y - pn.y) * 180 / Math.PI), note: 'negative = leaning back, away from the facing' };
        const sh = (p) => pmid(p, 'nearShoulder', 'farShoulder'), wrap = rows.find(r => isClip(r) && r.t.time >= 0.14);
        out.chestToBack = { atWrap: r1(Math.abs(sh(wrap.a.pts).x - sh(wrap.d.pts).x) / wrap.a.s), atTop: r1(Math.abs(sh(tops.a.pts).x - sh(tops.d.pts).x) / tops.a.s) };
        const dd = tops.d.pts, thigh = (k) => Math.abs(Math.atan2(dd[`${k}Knee`].x - dd[`${k}Hip`].x, dd[`${k}Knee`].y - dd[`${k}Hip`].y) * 180 / Math.PI);
        const floorY = rows[Math.max(0, i0 - 1)].d.pts.nearAnkle.y;
        out.defenderLegsAtTop = { thighFromVerticalDeg: { near: r1(thigh('near')), far: r1(thigh('far')) }, feetOverMat: r1((floorY - Math.max(dd.nearAnkle.y, dd.farAnkle.y)) / tops.d.s), feetOverMatHighest: r1((floorY - Math.min(dd.nearAnkle.y, dd.farAnkle.y)) / tops.d.s) };
        // T4c.4g: the carry. The defender's pelvis path through the lift (game px, then drawn on a still by the page tool), his torso angle against the attacker's,
        // and the chest-to-back gap in the attacker's torso frame (shoulder mid to shoulder mid, across his torso).
        const carryRows = rows.filter(r => isClip(r) && r.t.time >= 0.14 && r.t.time <= ATOMIC.lift + ATOMIC.hitch);
        const lean = (p, f) => { const o = pmid(p, 'nearHip', 'farHip'); return Math.atan2((p.neck.x - o.x) * (f >= 0 ? 1 : -1), o.y - p.neck.y) * 180 / Math.PI; };
        out.carryTrace = carryRows.map(r => { const q = pmid(r.d.pts, 'nearHip', 'farHip'), a = pmid(r.a.pts, 'nearHip', 'farHip'); return { i: r.i, x: r1(q.x), y: r1(q.y), relX: r1((q.x - a.x) * r.t.facing[0] / r.a.s), relY: r1((a.y - q.y) / r.a.s) }; });
        const ys = out.carryTrace.map(p => p.relY), xs = out.carryTrace.map(p => p.relX);
        out.carryPath = { relXRange: [Math.min(...xs), Math.max(...xs)], relYRange: [Math.min(...ys), Math.max(...ys)], note: 'defender pelvis relative to the attacker pelvis, px at s = 1, x along the facing (negative = back over the attacker), y up' };
        out.carryAngles = carryRows.filter((r, k) => k % 6 === 0).map(r => ({ i: r.i, attacker: r1(lean(r.a.pts, r.t.facing[0])), defender: r1(lean(r.d.pts, r.t.facing[1])) }));
        const gap = (r) => { const fr = torsoFrame(r.a.pts, r.t.facing[0]), sa = toFrame(fr, pmid(r.a.pts, 'nearShoulder', 'farShoulder')), sd = toFrame(fr, pmid(r.d.pts, 'nearShoulder', 'farShoulder')); return Math.hypot(sd.along - sa.along, sd.across - sa.across) / r.a.s; };
        const gaps = carryRows.map(gap);
        out.carryGap = { min: r1(Math.min(...gaps)), max: r1(Math.max(...gaps)), atWrap: r1(gaps[0]), atTop: r1(gaps[gaps.length - 1]), note: 'defender shoulder-mid to attacker shoulder-mid, px at s = 1, through the carry' };
        out.carryAbsolute = { pelvisHeightOverMatAtTop: r1((rows[Math.max(0, i0 - 1)].d.pts.nearHip.y - pmid(carryRows[carryRows.length - 1].d.pts, 'nearHip', 'farHip').y) / tops.d.s) };
        out.shot = lastShot;
        const g = rows.filter(r => r.t.clip && r.t.time > 0.05 && r.t.time < ATOMIC.lift && r.wl === null);
        // hands (wrist) to the defender's hip while lifting: the clip's grips target the hip joint
        out.handsToHip = r1(Math.max(...g.map(r => Math.min(dist(r.a.pts.nearWrist, r.d.pts.nearHip), dist(r.a.pts.nearWrist, r.d.pts.farHip))) ) / g[0].a.s);
        const end = rows[rows.findIndex((r, i) => i > i0 && !r.t.clip)];
        out.endStates = end.t.states;
    } else {
        // the thrower is w2 (d), the thrown man w1 (a)
        const g = rows.filter(r => r.t.clip === 'snapmare' && snapmareHeadGrip(r.t.time) > 0.99);
        out.headGripFrames = g.length;
        out.handsToHead = g.length ? r1(Math.max(...g.map(r => Math.max(dist(r.d.pts.nearWrist, r.a.pts.neck), dist(r.d.pts.farWrist, r.a.pts.neck)))) / g[0].d.s) : null;   // worst hand, worst frame, at full weight
        out.handsToHeadReach = r1(Math.max(...rows.filter(r => r.t.clip === 'snapmare' && r.t.time < SNAPMARE.reach + SNAPMARE.pull).map(r => Math.max(dist(r.d.pts.nearWrist, r.a.pts.neck), dist(r.d.pts.farWrist, r.a.pts.neck)))) / rows[0].d.s);   // over the whole reach and pull, ramp included
        const land = rows.find(r => isClip(r) && r.t.time >= SNAPMARE.land);
        out.landFrame = land.i; out.flipTiltMax = r2(Math.max(...rows.map(r => Math.abs(r.t.tilt[0])))); out.landTilt = r2(land.t.tilt[0]);
        const b = ringBoundsAtY(land.t.xy[0][1]), x = land.t.xy[0][0];
        out.landX = Math.round(x); out.ringBounds = [Math.round(b.left), Math.round(b.right)]; out.landMargin = Math.round(Math.min(x - b.left, b.right - x));
        out.throwerX = Math.round(land.t.xy[1][0]); out.landDistance = Math.round(Math.abs(x - land.t.xy[1][0]));
        out.endStates = rows[rows.length - 1].t.states;
        // T4c.4b-2: the flip's rotation, peak and worst step (rad/frame); -3: the thrower's arms (wrist to own pelvis, px) after the landing; -5: his ankles to the fallen head
        const flipRows = rows.filter(r => isClip(r) && r.t.time >= SNAPMARE.reach + SNAPMARE.pull && r.t.time <= SNAPMARE.land);
        out.flip = { tiltEnd: r2(flipRows[flipRows.length - 1].t.tilt[0]), radPerFrameMax: r2(Math.max(...flipRows.slice(1).map((r, i) => Math.abs(r.t.tilt[0] - flipRows[i].t.tilt[0])))), degrees: Math.round(flipRows[flipRows.length - 1].t.tilt[0] * 180 / Math.PI) };
        const armAt = (dt) => { const r = rows.find(x => isClip(x) && x.t.time >= SNAPMARE.land + dt) ?? rows[rows.length - 1], hp = { x: (r.d.pts.nearHip.x + r.d.pts.farHip.x) / 2, y: (r.d.pts.nearHip.y + r.d.pts.farHip.y) / 2 }; return r1(Math.max(dist(r.d.pts.nearWrist, hp), dist(r.d.pts.farWrist, hp)) / r.d.s); };
        out.throwerArmsWristToPelvis = { landing: armAt(0), plus100ms: armAt(0.1), plus200ms: armAt(0.2), plus300ms: armAt(0.3) };
        const post = rows.filter(r => isClip(r) && r.t.time >= SNAPMARE.land);
        const bh = post.map(r => ({ i: r.i, d: Math.min(dist(r.d.pts.nearAnkle, r.a.pts.neck), dist(r.d.pts.farAnkle, r.a.pts.neck)) / r.d.s }));
        const bm = bh.reduce((m, x) => (x.d < m.d ? x : m));
        out.bootToHeadMin = { px: r1(bm.d), frame: bm.i, atLanding: r1(bh[0].d) };
        out.flipOverlapFrames = rows.filter(r => r.mask && isClip(r) && r.t.time >= SNAPMARE.reach + SNAPMARE.pull && r.t.time < SNAPMARE.land && (r.mask.torso > 0 || r.mask.belowBody > 0)).map(r => ({ i: r.i, t: r.t.time, torso: r.mask.torso, belowBody: r.mask.belowBody, total: r.mask.total }));
    }
    return out;
}

// a knee's flex from the drawn joints: > 0 = bent the proper way, < 0 = backward (same reading as clip_knee_audit.mjs)
function kneeFlex(p, facing) {
    const hip = { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 }, t = { x: p.neck.x - hip.x, y: p.neck.y - hip.y };
    const n = facing >= 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x }, dot = (a, b) => a.x * b.x + a.y * b.y, sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    const out = {};
    for (const sd of ['near', 'far']) {
        const u = sub(p[`${sd}Knee`], p[`${sd}Hip`]), l = sub(p[`${sd}Ankle`], p[`${sd}Knee`]);
        let q = { x: -u.y, y: u.x }; if (dot(q, n) < 0) q = { x: -q.x, y: -q.y };
        out[`${sd}Knee`] = -Math.atan2(dot(l, q), dot(l, u));
    }
    return out;
}
const pmid = (p, a, b) => ({ x: (p[a].x + p[b].x) / 2, y: (p[a].y + p[b].y) / 2 });

const runs = [];
process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = `notitle=1&grapples=v1&waistlock=v1${process.env.WFM_SNAPMARE_SPEED ? `&snapmareSpeed=${process.env.WFM_SNAPMARE_SPEED}` : ''}`;
const h = await launch();
try {
    const page = h.page;
    await page.waitForTimeout(2500);
    const info = await page.evaluate(INSTALL);
    await page.evaluate(INSTALL_MASKS);
    await page.evaluate(INSTALL_FARARM);
    for (const [kind, cs] of [['drop', 'drop'], ['snapmare', 'reverse']]) for (const facing of [-1, 1]) {
        const id = `${kind}-lou-george-${facing < 0 ? 'l' : 'r'}`;
        const rows = await film(page, info, { facing, case: cs, rev: 6, mask: true }, join(outRoot, 'frames', id), { quiet: 8 });
        for (const r of rows) if (r.mask) delete r.mask.image;
        mkdirSync(outRoot, { recursive: true });
        runs.push({ id, kind, facing, ...measure(rows, kind) });
        console.log(`[g4c-a] ${id}: ${rows.length} frames`);
    }
} finally { await h.close(); }
writeFileSync(join(outRoot, 'film.json'), JSON.stringify({ tool: 'tools/debug/grapples_g4c_a.mjs', commit: sh('git rev-parse --short HEAD'), runs }, null, 1));
console.log('wrote', join(outRoot, 'film.json'));
