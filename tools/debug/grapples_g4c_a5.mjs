// G4c-a r5 (PLAN_GRAPPLES T4c.4k): the proof loops for the fixed snapmare (the thrower's forward foot planted, T4c.4i) and the atomic drop that lands on a bent knee (T4c.4j).
// Films both pairs (Lou on George = lg, George on Lou = gl), both facings, the drop and the snapmare reversal at 1/60 s, keeps the frames of the loop window only, measures them
// and writes film.json (the page tool reads it). The knee audit and the fold sweep are run by the page tool's caller (see below).
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_g4c_a5.mjs [outRoot=research/animation/grapples-2026-10/g4c-a5]
//   WFM_URL=... node tools/debug/knee_fold_sweep.mjs > <outRoot>/sweep.txt; WFM_URL=... node tools/debug/clip_knee_audit.mjs > <outRoot>/knee-audit.txt; node tools/debug/grapples_g4c_a5_page.mjs
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';
import { INSTALL_FARARM } from './far_arm_probe.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film, lastShot } from './waistlock_throws.mjs';
import { ATOMIC, SNAPMARE } from '../../src/animation/waistlockThrows.js';
import { snapmareClip } from '../../src/animation/clips/snapmare.js';

const outRoot = process.argv[2] ?? 'research/animation/grapples-2026-10/g4c-a5';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lg', 'Lou on George', LOU, GEORGE], ['gl', 'George on Lou', GEORGE, LOU]];
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const r1 = (v) => +v.toFixed(1), r2 = (v) => +v.toFixed(2);
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const T = ATOMIC.lift + ATOMIC.hitch, CONTACT = 3;

// the loop window in clip time: the drop from a little before the hitch ends to the clip's end (the first recovery step); the snapmare the whole clip
const WINDOW = { drop: [ATOMIC.lift - 0.06, ATOMIC.duration], snapmare: [0, SNAPMARE.duration] };

function measure(rows, kind, thrower) {
    const clipId = kind === 'drop' ? 'atomicDrop' : 'snapmare';
    const clip = rows.filter(r => r.t.clip === clipId);
    const [t0, t1] = WINDOW[kind];
    const inWin = rows.filter(r => r.t.clip === clipId && r.t.time >= t0 && r.t.time <= t1);
    const first = Math.max(0, inWin[0].i - 6), last = Math.min(rows.length - 1, inWin.at(-1).i + 6);
    const beat = (t) => kind === 'drop' ? (t < ATOMIC.lift ? 'lift' : t < ATOMIC.impact ? 'drop' : 'sell')
        : (t < SNAPMARE.reach ? 'reach' : t < SNAPMARE.reach + SNAPMARE.pull ? 'pull' : t < SNAPMARE.land ? 'flip' : 'landing');
    const out = { first, last, frames: last - first + 1, clipFrames: [inWin[0].i, inWin.at(-1).i] };
    // D12 raw per beat (the max over the beat's frames; the number of frames with any torso-on-torso overlap)
    out.mask = {};
    for (const r of clip) if (r.mask) {
        const m = out.mask[beat(r.t.time)] ??= { belowBody: 0, torso: 0, total: 0, n: 0, torsoFrames: 0 };
        m.belowBody = Math.max(m.belowBody, r.mask.belowBody); m.torso = Math.max(m.torso, r.mask.torso); m.total = Math.max(m.total, r.mask.total); m.n++;
        if (r.mask.torso > 0) m.torsoFrames++;
    }
    const shot = lastShot;
    const px = (p) => ({ x: r1(shot.x0 + p.x * shot.kx), y: r1(shot.y0 + p.y * shot.ky) });
    out.shot = shot;
    if (kind === 'drop') {
        // seat-to-knee gap, from the carry's own log
        const gaps = clip.map(r => ({ i: r.i, t: r.t.time, c: r.t.carry?.find(c => c.i === 1) })).filter(x => x.c);
        const firstC = gaps.find(x => x.c.gap < CONTACT);
        const after = firstC ? gaps.filter(x => x.t >= firstC.t && x.t <= ATOMIC.impact + 0.10) : [];
        out.contact = {
            firstContactTime: firstC ? r2(firstC.t) : null, impactConst: ATOMIC.impact, offFrames: firstC ? Math.round((firstC.t - ATOMIC.impact) * 60) : null,
            gapAtContactToRecoil: after.map(x => r1(x.c.gap)), gapMax: after.length ? r1(Math.max(...after.map(x => x.c.gap))) : null,
            gapSeries: gaps.filter(x => x.t >= T - 0.1 && x.t <= ATOMIC.impact + 0.3).map(x => ({ i: x.i, t: r2(x.t), gap: r1(x.c.gap) })),
        };
        // the raised thigh at contact (drawn joints), the shin and the fold; the attacker is w1 = a
        const at = firstC ? rows[firstC.i] : null;
        if (at) {
            const p = at.a.pts, f = at.a.facing;
            const leg = (s) => { const hip = p[`${s}Hip`], k = p[`${s}Knee`], an = p[`${s}Ankle`]; return { s, th: Math.atan2(k.x - hip.x, k.y - hip.y) * f, sh: Math.atan2(an.x - k.x, an.y - k.y) * f }; };
            const L = ['near', 'far'].map(leg).reduce((m, l) => (Math.abs(l.th) > Math.abs(m.th) ? l : m));
            out.contact.thighFromVertical = r2(Math.abs(L.th)); out.contact.shinFromVertical = r2(L.sh); out.contact.fold = r2(L.th - L.sh);
        }
        // support sole (the r foot's plant side) drift and worst step from the wrap to the end of the plant
        const pl = clip.find(r => r.t.plant?.length);
        const side = pl ? pl.t.plant[0].side : 'far', k = side === 'near' ? 0 : 1;
        const win = clip.filter(r => r.t.time >= 0.14 && r.t.time <= ATOMIC.impact + 0.2);
        out.support = {
            side, drift: r1(Math.max(...win.map(r => dist(r.soles[0][k], win[0].soles[0][k])))),
            maxStep: r2(Math.max(...win.slice(1).map((r, i) => dist(r.soles[0][k], win[i].soles[0][k])))), solveResidual: r2(Math.max(...clip.flatMap(r => (r.t.plant ?? []).map(p => p.err)))),
        };
        // marks for the loop: seat and contact (game px -> shot px) per frame in the window
        out.marks = gaps.filter(x => x.i >= first && x.i <= last).map(x => ({ i: x.i, seat: px(x.c.seat), contact: px(x.c.contact), gap: r1(x.c.gap) }));
    } else {
        // the thrower is w2 = d; the forward foot's plant: its side from the plant log, the sole after each step
        const pl = clip.find(r => r.t.plant?.length);
        const side = pl ? pl.t.plant[0].side : 'near', k = side === 'near' ? 0 : 1;
        const plantRows = clip.filter(r => r.t.plant?.length);
        const held = plantRows[0].soles[1][k];
        const [rel0, rel1] = snapmareClip.plants[0].out;
        const win = clip.filter(r => r.t.time >= SNAPMARE.reach + 0.03 && r.t.time <= rel0), after = clip.filter(r => r.t.time >= rel0 && r.t.time <= rel1 + 0.15);
        out.plant = {
            side, target: r1(held.x) + ',' + r1(held.y), driftHeld: r1(Math.max(...win.map(r => dist(r.soles[1][k], held)))), maxStepHeld: r2(Math.max(...win.slice(1).map((r, i) => dist(r.soles[1][k], win[i].soles[1][k])))),
            heldFrames: win.length, solveResidual: r2(Math.max(...plantRows.flatMap(r => r.t.plant.map(p => p.err)))), onMatAtCapture: plantRows[0].t.plant[0].onMat, releaseWindow: [rel0, rel1],
            stepOutAfterRelease: r1(Math.max(...after.map(r => dist(r.soles[1][k], held)))), maxStepInRelease: r2(Math.max(...after.slice(1).map((r, i) => dist(r.soles[1][k], after[i].soles[1][k])))),
            targetShot: px(held),
        };
        const free = k === 0 ? 1 : 0, wf = clip.filter(r => r.t.time >= SNAPMARE.reach + 0.03 && r.t.time <= SNAPMARE.land);
        out.plant.otherSole = { excursion: r1(Math.max(...wf.map(r => dist(r.soles[1][free], wf[0].soles[1][free])))), maxStep: r2(Math.max(...wf.slice(1).map((r, i) => dist(r.soles[1][free], wf[i].soles[1][free])))), note: 'the kneeling foot is free by design' };
        // the lower knee over the mat at the impact (mat = the held sole's height), and its height per frame for the marks (the knee within 8 px counts as down)
        const mat = held.y, imp = clip.reduce((m, r) => (Math.abs(r.t.time - SNAPMARE.land) < Math.abs(m.t.time - SNAPMARE.land) ? r : m));
        const kneeH = (r) => ['nearKnee', 'farKnee'].map(j => (mat - r.d.pts[j].y) / r.d.s);
        out.knee = { lowerKneeOverMatAtImpact: r1(Math.min(...kneeH(imp))), otherKneeAtImpact: r1(Math.max(...kneeH(imp))), lowest: r1(Math.min(...clip.flatMap(kneeH))), touchFrames: clip.filter(r => Math.min(...kneeH(r)) < 8).map(r => r.i) };
        out.marks = rows.filter(r => r.i >= first && r.i <= last && r.d?.pts?.nearKnee).map(r => ({ i: r.i, sole: px(r.soles[1][k]), nearKnee: px(r.d.pts.nearKnee), farKnee: px(r.d.pts.farKnee), kneeDown: r.t.clip === clipId && Math.min(...kneeH(r)) < 8 }));
        out.land = { frame: imp.i, time: r2(imp.t.time) };
    }
    out.stillTimes = kind === 'drop'
        ? [['hitch (knee chambered)', T], ['first contact', out.contact.firstContactTime ?? ATOMIC.impact], ['compression', ATOMIC.impact + 0.04], ['recoil', ATOMIC.impact + 0.12], ['recovery step', ATOMIC.impact + 0.26]]
        : [['feet down, reach', SNAPMARE.reach], ['pull', SNAPMARE.reach + SNAPMARE.pull], ['flip, half way', SNAPMARE.reach + SNAPMARE.pull + 0.5 * SNAPMARE.flip], ['impact', SNAPMARE.land], ['forward foot released', snapmareClip.plants[0].out[1]]];
    out.stills = out.stillTimes.map(([label, tt]) => { const r = clip.reduce((m, x) => (Math.abs(x.t.time - tt) < Math.abs(m.t.time - tt) ? x : m)); return { label, time: r2(r.t.time), frame: r.i }; });
    out.endStates = rows.at(-1).t.states;
    return out;
}

mkdirSync(outRoot, { recursive: true });
const runs = [];
for (const [pid, label, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1' + (process.env.WFM_ATOMIC_CHAMBER ? '&atomicChamber=' + process.env.WFM_ATOMIC_CHAMBER : '');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL);
        await page.evaluate(INSTALL_MASKS);
        await page.evaluate(INSTALL_FARARM);
        for (const [kind, cs] of [['drop', 'drop'], ['snapmare', 'reverse']]) for (const facing of [-1, 1]) {
            const id = `${kind}-${pid}-${facing < 0 ? 'l' : 'r'}`, dir = join(outRoot, 'frames', id);
            const rows = await film(page, info, { facing, case: cs, rev: 6, mask: true }, dir, { quiet: 8 });
            for (const r of rows) if (r.mask) delete r.mask.image;
            const m = measure(rows, kind);
            // keep only the loop's frames, renumbered nowhere: the page loops first..last
            for (const f of readdirSync(dir)) { const n = +f.slice(1, 5); if (n < m.first || n > m.last) rmSync(join(dir, f)); }
            runs.push({ id, kind, pair: pid, label, attacker: att === LOU ? 'Lou' : 'George', facing, ...m });
            console.log(`[g4c-a5] ${id}: ${rows.length} frames, loop ${m.first}-${m.last}`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(outRoot, 'film.json'), JSON.stringify({ tool: 'tools/debug/grapples_g4c_a5.mjs', commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain -- src tools tests').length > 0, snapmareSpeed: SNAPMARE.speed, runs }, null, 1));
console.log('wrote', join(outRoot, 'film.json'));
