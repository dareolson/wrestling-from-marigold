// Plant-window metrics from stepped films (PLAN_SUPLEX_RISE T2.3). Geometry prototype numbers only:
// they measure the far WRIST, not painted palm pixels, and prove nothing about weight-bearing.
//
//   node tools/debug/plant_metrics.mjs [filmRoot] [sweep.json] [out.json]
// For each Lou-receiving scenario in <filmRoot>/on/, over samples with riseT in
// [t0 + inSpan, tLift] (tLift from the sweep's `plan`): max wrist slide (largest distance between any
// two samples), elbow flex min/max (articulation.js convention: + anatomical), min/max shoulder-wrist
// distance vs lu+lf, and whether every sampled flex is positive. Also the same on the exact paused sweep.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PLANT } from '../../src/animation/backRisePerformance.js';

const root = process.argv[2] ?? 'research/animation/suplex-rise-2026-10/plant/film';
const sweepFile = process.argv[3] ?? 'research/animation/suplex-rise-2026-10/plant/rise-planted-sweep.json';
const outFile = process.argv[4] ?? 'research/animation/suplex-rise-2026-10/plant/plant-metrics.json';
const sweep = JSON.parse(readFileSync(sweepFile, 'utf8'));
const lo = PLANT.t0 + PLANT.inSpan, hi = sweep.plan.tLift;
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const flex = (S, E, W, f) => {
    const a = Math.atan2(E.x - S.x, E.y - S.y), b = Math.atan2(W.x - E.x, W.y - E.y);
    return Math.atan2(Math.sin(b - a), Math.cos(b - a)) * f * 180 / Math.PI;
};
const maxSlide = pts => pts.reduce((m, p, i) => pts.slice(i + 1).reduce((mm, q) => Math.max(mm, d(p, q)), m), 0);
function summarize(rows, facing) {
    if (!rows.length) return null;
    const flexes = rows.map(r => flex(r.S, r.E, r.W, facing));
    const L = rows.map(r => d(r.S, r.E) + d(r.E, r.W)), reach = rows.map((r, i) => d(r.S, r.W));
    return {
        samples: rows.length, riseT: [rows[0].t, rows.at(-1).t],
        maxWristSlidePx: +maxSlide(rows.map(r => r.W)).toFixed(3),
        wristAboveMatPx: [+Math.min(...rows.map(r => r.matY - r.W.y)).toFixed(3), +Math.max(...rows.map(r => r.matY - r.W.y)).toFixed(3)],
        elbowFlexDeg: { min: +Math.min(...flexes).toFixed(2), max: +Math.max(...flexes).toFixed(2) },
        hingeAnatomicalEverySample: flexes.every(x => x > 0),
        reachPx: { min: +Math.min(...reach).toFixed(3), max: +Math.max(...reach).toFixed(3) },
        armLengthPx: { min: +Math.min(...L).toFixed(3), max: +Math.max(...L).toFixed(3) },
        minReachOverArm: +Math.min(...reach.map((r, i) => r / L[i])).toFixed(4),
        maxReachOverArm: +Math.max(...reach.map((r, i) => r / L[i])).toFixed(4),
        minArmMinusReachPx: +Math.min(...reach.map((r, i) => L[i] - r)).toFixed(3),
    };
}
const out = { note: 'Geometry prototype: far wrist only. Not palm contact, not weight-bearing.', window: { t0: PLANT.t0, inSpan: PLANT.inSpan, from: lo, tLift: hi }, film: {}, paused: {} };
for (const sc of ['suplexReverse', 'suplexReverseFlip']) {
    const p = join(root, 'on', sc, 'manifest.json');
    if (!existsSync(p)) continue;
    const m = JSON.parse(readFileSync(p, 'utf8'));
    const rows = m.samples.filter(s => s.state === 'gettingUp' && s.riseT >= lo - 1e-9 && s.riseT <= hi + 1e-9 && s.farWrist && s.farShoulder)
        .map(s => ({ t: s.riseT, S: s.farShoulder, E: s.farElbow, W: s.farWrist, matY: s.rootY }));
    const facing = m.receiverFacing.atImpact;
    // the whole plant+release story, per 1/60 s step: wrist x/y while riseT in [t0, tLift + outSpan]
    const trace = m.samples.filter(s => s.state === 'gettingUp' && s.riseT >= PLANT.t0 - 0.02 && s.riseT <= hi + PLANT.outSpan + 0.02)
        .map(s => ({ t: s.riseT, x: s.farWrist.x, y: s.farWrist.y }));
    const step = trace.slice(1).map((q, i) => d(q, trace[i]));
    out.film[sc] = { rig: m.receiver.rig, facing, commit: m.git, summary: summarize(rows, facing),
        wristStepPx: { arrival: +Math.max(...step.slice(0, 6)).toFixed(2), maxEveryStep: +Math.max(...step).toFixed(2) }, trace };
}
for (const [f, rows] of Object.entries(sweep.facings)) {
    const sel = rows.filter(r => r.t >= lo - 1e-9 && r.t <= hi + 1e-9)
        .map(r => ({ t: r.t, S: r.farShoulder, E: r.farElbow, W: r.farWrist, matY: sweep.floor }));
    out.paused[f] = summarize(sel, Number(f));
}
writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ window: out.window, film: Object.fromEntries(Object.entries(out.film).map(([k, v]) => [k, { facing: v.facing, ...v.summary, wristStepPx: v.wristStepPx }])), paused: out.paused }, null, 1));
