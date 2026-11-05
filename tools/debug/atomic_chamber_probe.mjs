// T4c.4m: where the atomic drop's near knee chambers (ATOMIC.chamber 'lift' | 'hitch'). Films the drop for both pairs and both facings and measures, per frame from the wrap to
// the end of the plant: both attacker soles (displacement from the wrap, not a plant-error or true mat height: height is scaled units = px / attacker s, x slide is raw game px), the receiver's pelvis vertical range over the hitch, the largest joint step at
// lift-end / chamber-end / impact, the chambered thigh's angle at T, the seat gap at impact, D12 per beat is the page tool's.
//   WFM_ATOMIC_CHAMBER=hitch WFM_URL=http://localhost:5173 node tools/debug/atomic_chamber_probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';
import { INSTALL_FARARM } from './far_arm_probe.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film } from './waistlock_throws.mjs';
import { ATOMIC } from '../../src/animation/waistlockThrows.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lg', LOU, GEORGE], ['gl', GEORGE, LOU]];
const r1 = (v) => +v.toFixed(1), r2 = (v) => +v.toFixed(2);
const L = ATOMIC.lift, T = L + ATOMIC.hitch, I = ATOMIC.impact, CH = L + 0.14;
const near = (rows, t) => rows.reduce((m, r) => (Math.abs(r.t.time - t) < Math.abs(m.t.time - t) ? r : m));
const pelvisY = (w) => (w.pts.nearHip.y + w.pts.farHip.y) / 2;
const step = (a, b) => Math.max(...Object.keys(a.pts).filter(k => b.pts[k]).map(k => Math.hypot(a.pts[k].x - b.pts[k].x, a.pts[k].y - b.pts[k].y)));

const out = { chamber: ATOMIC.chamber, runs: [] };
for (const [pid, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1' + (process.env.WFM_ATOMIC_CHAMBER ? '&atomicChamber=' + process.env.WFM_ATOMIC_CHAMBER : '') + (process.env.WFM_XQ ?? '');
    const h = await launch();
    try {
        const page = h.page; await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL); await page.evaluate(INSTALL_MASKS); await page.evaluate(INSTALL_FARARM);
        for (const facing of [-1, 1]) {
            const rows = await film(page, info, { facing, case: 'drop', mask: false }, null, { quiet: 8 });
            const clip = rows.filter(r => r.t.clip === 'atomicDrop');
            const w = clip.filter(r => r.t.time >= 0.14 && r.t.time <= I + 0.2);
            // mat = the lower of the attacker's soles at the wrap (both down); height = mat - sole y over the attacker's scale
            const s = clip[0].a.s;   // each sole's own height at the wrap (w[0]) is its mat: the two soles stand at different depths
            const sole = (k) => { const ser = w.map(r => ({ t: r.t.time, h: (w[0].soles[0][k].y - r.soles[0][k].y) / s, dx: Math.abs(r.soles[0][k].x - w[0].soles[0][k].x) })); return { name: k === 0 ? 'near (displacement from the wrap)' : 'far (displacement from the wrap)', maxHeightToL: r1(Math.max(...ser.filter(x => x.t <= L).map(x => x.h))), maxHeightToT: r1(Math.max(...ser.filter(x => x.t <= T).map(x => x.h))), firstOffMat: (ser.find(x => x.h > 2) ?? {}).t ?? null, maxSlideToL: r1(Math.max(...ser.filter(x => x.t <= L).map(x => x.dx))), maxSlideToImpact: r1(Math.max(...ser.filter(x => x.t <= I).map(x => x.dx))) }; };
            const hitch = clip.filter(r => r.t.time >= L && r.t.time <= T), pv = hitch.map(r => pelvisY(r.d) / r.d.s);
            const stepAt = (t) => { const i = clip.indexOf(near(clip, t)); return { t: r2(clip[i].t.time), attacker: r2(step(clip[i - 1].a, clip[i].a)), receiver: r2(step(clip[i - 1].d, clip[i].d)) }; };
            const at = near(clip, T), p = at.a.pts, f = at.a.facing, thigh = (n) => { const hp = p[`${n}Hip`], k = p[`${n}Knee`]; return Math.abs(Math.atan2(k.x - hp.x, k.y - hp.y) * f); };
            const gaps = clip.map(r => r.t.carry?.find(c => c.i === 1)).filter(Boolean), imp = near(clip, I).t.carry?.find(c => c.i === 1);
            out.runs.push({ series: clip.filter(r => r.t.time >= 0.1 && r.t.time <= T + 0.02).map(r => ({ t: r2(r.t.time), pelA: r1(pelvisY(r.a) / r.a.s), pelD: r1(pelvisY(r.d) / r.d.s), nearY: r1((w[0].soles[0][0].y - r.soles[0][0].y) / s), nearX: r1(r.soles[0][0].x - w[0].soles[0][0].x), farX: r1(r.soles[0][1].x - w[0].soles[0][1].x), farY: r1((w[0].soles[0][1].y - r.soles[0][1].y) / s), plant: (r.t.plant ?? []).map(p => `${p.side}:${p.err}`).join(' ') })), id: `${pid}-${facing < 0 ? 'l' : 'r'}`, soles: [sole(0), sole(1)], receiverPelvisRangeHitch: r2(Math.max(...pv) - Math.min(...pv)), attackerPelvisRangeHitch: r2(Math.max(...hitch.map(r => pelvisY(r.a) / r.a.s)) - Math.min(...hitch.map(r => pelvisY(r.a) / r.a.s))), attackerLiftPose: [r2(near(clip, L).t.lift[0]), r2(near(clip, CH).t.lift[0]), r2(near(clip, T).t.lift[0])], steps: { liftEnd: stepAt(L), chamberEnd: stepAt(CH), impact: stepAt(I) }, thighAtT: { near: r2(thigh('near')), far: r2(thigh('far')) }, seatGapAtImpact: imp ? r1(imp.gap) : null, supportSoleDrift: r1(Math.max(...w.map(r => Math.hypot(r.soles[0][1].x - w[0].soles[0][1].x, r.soles[0][1].y - w[0].soles[0][1].y)))) });
        }
    } finally { await h.close(); }
}
const file = process.argv[2]; if (file) writeFileSync(file, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
