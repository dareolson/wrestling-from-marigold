// node tools/debug/slam_report.mjs slam.json
import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.argv[2]));
const f = (n, d = 1) => +n.toFixed(d);
for (const [tag, { stand, out, clip, errors }] of Object.entries(R)) {
  const held = out.filter(r => r.hold), carried = held.filter(r => r.t >= 0.5 && r.t <= 1.08);   // the carry: after the pick-up (he is still on his feet before 0.5 s)
  const mat = stand.mat, neck0 = mat - stand.a.neck[1];            // attacker's standing shoulder height (neck joint)
  const top = r => { const pts = Object.values(r.d); return mat - Math.min(...pts.map(p => p[1])); };
  const heights = carried.map(top), peak = Math.max(...heights), pi = heights.indexOf(peak);
  const hang = heights.filter(h => h >= peak - 10).length;
  const hipY = r => (r.d.nearHip[1] + r.d.farHip[1]) / 2, hipX = r => (r.d.nearHip[0] + r.d.farHip[0]) / 2;
  const vy = held.slice(1).map((r, i) => hipY(r) - hipY(held[i])); // + is down
  const ang = r => Math.abs(Math.atan2(r.d.neck[1] - hipY(r), r.d.neck[0] - hipX(r)) * 180 / Math.PI), horiz = a => Math.min(a, 180 - a);
  const last = held.at(-1);
  const fx = out[0] ? Math.sign(held[0].ax < held[0].dx ? 1 : -1) : 1;
  const land = out.find(r => !r.hold && r.dst === 'down') ?? out.at(-1);
  const slideIn = (t0, t1) => ['nearAnkle', 'farAnkle'].map(k => { const w = held.filter(r => r.t >= t0 && r.t <= t1); return f(Math.max(0, ...w.slice(1).map((r, i) => Math.hypot(r.a[k][0] - w[i].a[k][0], r.a[k][1] - w[i].a[k][1])))); });
  const slide = slideIn(0.55, 0.95), slidePick = slideIn(0.0, 0.5);
  const pinAt = Object.fromEntries([...new Set(out.flatMap(r => r.pin))].map(p => [p, out.filter(r => r.pin.includes(p)).map(r => +r.t.toFixed(2)).filter((_, i, a) => i === 0 || i === a.length - 1)]));
  const pins = [...new Set(out.flatMap(r => r.pin))];
  console.log(tag, JSON.stringify({ clip, heldSec: f(held.length / 60, 2), standShoulderPx: f(neck0), peakAboveMatPx: f(peak), peakVsShoulderPct: f(peak / neck0 * 100, 0), peakAt: f(carried[pi].t, 2), hangFramesWithin10px: hang,
    maxDropPxPerFrame: f(Math.max(...vy)), maxLiftPxPerFrame: f(-Math.min(...vy)), angleFromHorizontalAtPeakDeg: f(horiz(ang(carried[pi]))), angleAtLastHeldFrameDeg: f(horiz(ang(last))),
    victimHipOverAttackerHipAtEndPx: f((hipX(last) - (last.a.nearHip[0] + last.a.farHip[0]) / 2) * fx), attackerAnkleStepPxPerFrame_lift0_55to0_95: slide, attackerAnkleStepPxPerFrame_pickup0to0_5: slidePick, pinned: pinAt, errors }));
}
