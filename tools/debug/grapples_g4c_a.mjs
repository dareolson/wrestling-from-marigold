// G4c-a (PLAN_GRAPPLES T4c.4): films Lou on George, both facings, the atomic drop and the snapmare reversal, measures them, writes the page.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_g4c_a.mjs [outRoot=research/animation/grapples-2026-10/g4c-a]
// Each strip runs from the tie-up through the go-behind, the move, and 8 frames after the man is back up (drop) or down (snapmare).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film, PRESS_AT, DROP_AT } from './waistlock_throws.mjs';
import { partSteps } from './rise_handoff_probe.mjs';
import { ATOMIC, SNAPMARE, snapmareHeadGrip } from '../../src/animation/waistlockThrows.js';
import { WAISTLOCK } from '../../src/animation/waistlock.js';
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

const runs = [];
process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
const h = await launch();
try {
    const page = h.page;
    await page.waitForTimeout(2500);
    const info = await page.evaluate(INSTALL);
    await page.evaluate(INSTALL_MASKS);
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
