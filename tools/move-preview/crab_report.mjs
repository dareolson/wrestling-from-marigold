// Numbers from crab_measure.mjs output: node tools/move-preview/crab_report.mjs crab.json
import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.argv[2]));
const hip = o => [(o.j.nearHip[0] + o.j.farHip[0]) / 2, (o.j.nearHip[1] + o.j.farHip[1]) / 2];
for (const [tag, rows] of Object.entries(R)) {
  const hold = rows.filter(r => r.t >= 1.2);
  const stand = rows[0].a.y - hip(rows[0].a)[1];
  const hh = hold.map(r => r.a.y - hip(r.a)[1]);
  const dx = hold.map(r => hip(r.a)[0] - hip(r.d)[0]);
  // part step across the flip: max per-frame part displacement, and max over whole clip
  const step = (a, b) => Math.max(...a.map((p, i) => p && b[i] ? Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) : 0));
  let maxAll = 0, flip = [];
  for (let i = 1; i < rows.length; i++) { const s = Math.max(step(rows[i - 1].a.parts, rows[i].a.parts), step(rows[i - 1].d.parts, rows[i].d.parts)); if (s > maxAll) maxAll = s; if (rows[i].a.facing !== rows[i - 1].a.facing || rows[i].d.facing !== rows[i - 1].d.facing) flip.push([+rows[i].t.toFixed(3), +s.toFixed(1), rows[i].a.facing]); }
  // trapped boot travel per pull: defender's ankle on the grip-held leg; use attacker-minus nothing: take defender far/near ankle with greater height
  const boot = r => { const a = r.d.j.nearAnkle, b = r.d.j.farAnkle; return a[1] < b[1] ? a : b; }; // higher on screen (smaller y)
  const pulls = [[1.6, 2.0], [2.5, 2.9], [3.4, 3.8]].map(([p, q]) => { const f = x => rows.reduce((m, r) => Math.abs(r.t - x) < Math.abs(m.t - x) ? r : m); const A = boot(f(p)), B = boot(f(q)); return +Math.hypot(A[0] - B[0], A[1] - B[1]).toFixed(1); });
  const lean = [1.6, 2.0, 2.5, 2.9, 3.4, 3.8].map(x => { const r = rows.reduce((m, r) => Math.abs(r.t - x) < Math.abs(m.t - x) ? r : m); return +(Math.atan2(r.a.j.neck[0] - hip(r.a)[0], hip(r.a)[1] - r.a.j.neck[1]) * 57.3).toFixed(1); });
  const f = n => +n.toFixed(2);
  const mk = rows.filter(r => r.mask && r.t >= 1.2).map(r => r.mask);
  const mm = k => mk.length ? [Math.min(...mk.map(m => m[k])), Math.max(...mk.map(m => m[k]))] : null;
  const pins = [...new Set(rows.flatMap(r => [...r.pin.att.map(x => 'att ' + x), ...r.pin.def.map(x => 'def ' + x)]))];
  console.log(tag, JSON.stringify({ standPelvis: f(stand), holdPelvisMin: f(Math.min(...hh)), holdPelvisMax: f(Math.max(...hh)), holdFrac: f(Math.min(...hh) / stand) + '..' + f(Math.max(...hh) / stand),
    attMinusVictimHipX: [f(Math.min(...dx)), f(Math.max(...dx))], maxPartStepClip: f(maxAll), flips: flip, bootTravelPerPull: pulls, torsoLeanDeg1_6to3_8: lean, overlapLegsPx: mm('overlapLegsPx'), trappedPx: mm('trappedPx'), bootVisiblePx: mm('bootVisiblePx'), bootPx: mm('bootPx'), pinnedJoints: pins }));
}
