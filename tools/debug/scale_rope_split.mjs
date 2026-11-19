// PLAN_SCALE T2.5: split (back - front) of the rope-crossing fraction into its causes, from scale_rope_body.mjs's rope-body.json.
//   frac = (ink bottom - rope y) / ink height.  Back man crossed by the FAR top rope (plane at mat y 258), front man by the NEAR one (plane 445).
//   hF/hN = rope height above its own mat plane, pF/pN = ink bottom minus that plane's mat y (parallax: + is in front of the plane), I = painted ink height, ds = drawScale,
//   r = I_b/I_f, r_ds = ds_b/ds_f, r_p = perspective scale at the far plane (what the ring's own width implies for the far rope height vs the near one).
//   (a) parallax = [pF - r_ds*pN + (r_p - r_ds)*hN] / I_b   (feet off the rope plane, and the body's row scale vs the plane's)
//   (b) ink vs drawScale = (r_ds - r)*(hN + pN) / I_b       (0 if the painted height scales exactly with drawScale)
//   (c) ring rope heights vs perspective at the post line = (hF - r_p*hN) / I_b
//   (a)+(b)+(c) = frac_back - frac_front exactly.
//   node tools/debug/scale_rope_split.mjs [rope-body.json] [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2] ?? 'research/scale-2026-11/g2/rope-body.json'));
const rP = (flag) => flag ? (258 + 39.0) / (445 + 39.0) : 0.58;   // perspectiveScale(258): flag on (y - HORIZON_Y)/(445 - HORIZON_Y), off 0.58
const out = [];
for (const flag of [0, 1]) for (const rig of ['thesz-procreate-v1', 'george-roster-v1']) for (const [bn, fn] of [['back', 'front'], ['farBound', 'nearBound']]) {
    const B = rows.find(r => r.flag === flag && r.rig === rig && r.row === bn), F = rows.find(r => r.flag === flag && r.rig === rig && r.row === fn);
    const hF = 258 - B.ropes.far, pF = B.inkBottom - 258, hN = 445 - F.ropes.near, pN = F.inkBottom - 445;
    const fB = (B.inkBottom - B.ropes.far) / B.ink, fF = (F.inkBottom - F.ropes.near) / F.ink;
    const r = B.ink / F.ink, rds = B.drawScale / F.drawScale, rp = rP(flag);
    const a = (pF - rds * pN + (rp - rds) * hN) / B.ink, b = (rds - r) * (hN + pN) / B.ink, c = (hF - rp * hN) / B.ink;
    out.push({ flag, rig: rig.slice(0, 5), rows: `${bn}/${fn}`, fracBack: +fB.toFixed(4), fracFront: +fF.toFixed(4), diffPp: +((fB - fF) * 100).toFixed(2), parallaxPp: +(a * 100).toFixed(2), inkVsDrawScalePp: +(b * 100).toFixed(2), ringRopePp: +(c * 100).toFixed(2), sumPp: +((a + b + c) * 100).toFixed(2),
        inkPerDs: [+(B.ink / B.drawScale).toFixed(1), +(F.ink / F.drawScale).toFixed(1)], hF: +hF.toFixed(1), hN: +hN.toFixed(1), ropeHeightRatio: +(hF / hN).toFixed(4), pF: +pF.toFixed(1), pN: +pN.toFixed(1), inkRatio: +r.toFixed(4), dsRatio: +rds.toFixed(4), rP: +rp.toFixed(4) });
}
writeFileSync(process.argv[3] ?? 'research/scale-2026-11/g2/rope-split.json', JSON.stringify(out, null, 1));
console.table(out.map(({ flag, rig, rows, fracBack, fracFront, diffPp, parallaxPp, inkVsDrawScalePp, ringRopePp, sumPp }) => ({ flag, rig, rows, fracBack, fracFront, diffPp, parallaxPp, inkVsDrawScalePp, ringRopePp, sumPp })));
console.table(out.map(({ flag, rig, rows, inkPerDs, hF, hN, ropeHeightRatio, pF, pN, inkRatio, dsRatio, rP }) => ({ flag, rig, rows, inkPerDs: inkPerDs.join(' / '), hF, hN, ropeHeightRatio, pF, pN, inkRatio, dsRatio, rP })));
