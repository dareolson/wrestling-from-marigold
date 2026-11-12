// T3.0 page: the five posed stills per facing for both pairings, grip px, knee flex and joints near their cap beside each, layer order and art notes.
//   node tools/debug/toehold_t30_page.mjs research/animation/light-moves-2026-11/t3-0
import { readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const prone = dir.includes('prone');
const NAMES = { '1-grab': '1 ankle grab', '2-step-over': '2 mid step-over', '3-kneel': '3 kneeling, leg bent', '4a-heels': '4a sit back on heels', '4b-mat': '4b sit back on the mat' };
const LAYER = { '1-grab': 'back to front: his free leg, his far arm, torso, head, near arm | Lou far arm, torso, head, far leg, near leg | trapped leg | Lou near arm',
    '2-step-over': 'Lou\'s near leg drawn over the raised shin (his near arm and leg over the trapped leg)',
    '3-kneel': 'trapped leg behind Lou\'s near leg and his arms/torso; whole-leg granularity, so shin and boot are behind the thigh too (misses)',
    '4a-heels': 'as still 3', '4b-mat': 'as still 3' };
const CASES = [['lou-george-right', 'Lou on George, facing right'], ['lou-george-left', 'Lou on George, facing left'], ['george-lou-right', 'George on Lou, facing right'], ['george-lou-left', 'George on Lou, facing left']];
const f = v => v === null ? 'n/a' : (+v).toFixed(1).replace(/\.0$/, '');
const sec = ([id, title]) => {
    const r = JSON.parse(readFileSync(`${dir}/${id}/report.json`));
    const trappedIsLou = id.startsWith('george-lou'), lock = Object.keys(NAMES).map(k => {
        const v = r[k], cap = [...v.att.pinned.map(p => 'attacker ' + p), ...v.def.pinned.map(p => 'man ' + p)];
        const boot = k === '1-grab' || k === '2-step-over' ? 'base shin (foot not yet bent)' : trappedIsLou ? 'Lou\'s ankleTwist worn; drawn for a shin hanging straight down, here the shin is folded back (judge the fit)' : 'George has no ankleTwist: base shin';
        return `<tr><td><a href="${id}/${k}.png"><img ${prone && !['1-grab', '2-step-over'].includes(k) ? `data-sell="${id}/${k}"` : ''} src="${id}/${k}.png" alt="${NAMES[k]}"></a><br><b>${NAMES[k]}</b></td><td>
<p>palm to heel ${f(v.gripPx.heel)} px, to toe ${f(v.gripPx.toe)} px (bar 6)</p>
<p>knee flex: attacker near ${v.att.knees.near} / far ${v.att.knees.far}; man's trapped ${v.def.knees[v.def.lSide]} (cap 2.545)</p>
<p>near a cap: ${cap.length ? cap.join(', ') : 'none (pinned list empty)'}</p>
${v.metrics ? `<p>held foot minus attacker hip y: ${f(v.metrics.footMinusHip)} px (0 = hip height, + = below); attacker's body covers ${v.metrics.bootCoveredPx} of ${v.metrics.bootPx} px of the foot</p>
<p>mat line (400): attacker knees ${v.metrics.kneeToMat.map(f).join(' / ')} px above, ankles ${v.metrics.ankleToMat.map(f).join(' / ')} px above, knee above ankle ${v.metrics.kneeAboveAnkle.map(f).join(' / ')}, seat ${f(v.metrics.seatToMat)} px above</p>` : ''}${v.fists && v.fists.length ? `<p>fists, lowest drawn pixel minus the mat line (neg = above), at each strike (0.30 / 0.60 / 0.90 s), near | far: ${[0.30, 0.60, 0.90].map(t => { const rows = v.fists.filter(x => Math.abs(x.t - t) < .06); const lo = h => Math.max(...rows.map(x => x[h] ?? -999)); return f(lo('near')) + ' | ' + f(lo('far')); }).join(' ; ')} ; deepest over the preview ${f(Math.max(...v.fists.map(x => Math.max(x.near ?? -999, x.far ?? -999))))}</p>` : ''}
<p>layers: ${LAYER[k]}</p>${prone && v.authored ? `<p>Receiver: ${v.authored.prone ? 'stomach down' : 'on back'}; hip lift ${v.authored.def.lift}, attacker crouch ${f(v.authored.att.crouch)}, hip spacing ${f(v.authored.gap)} px.</p>` : ''}<p>bent boot: ${boot}</p></td></tr>`;
    }).join('');
    return `<section><h2>${title}</h2><table>${lock}</table></section>`;
};
writeFileSync(`${dir}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>T3.0 toehold stills</title>
<style>body{font:15px/1.4 system-ui;margin:16px auto;max-width:1000px;padding:0 16px;background:#f4f1ea;color:#1d1b17}img{width:380px;max-width:100%;border:1px solid #bbb}td{vertical-align:top;padding:6px;border-bottom:1px solid #ccc}p{margin:2px 0}h2{border-top:2px solid #999;padding-top:8px}@media(prefers-color-scheme:dark){body{background:#161512;color:#ece7da}}</style></head><body>
<h1>T3.0: step-over toehold, posed stills (hands on the foot via the clip grip channel)</h1>
${prone ? '<p><b>Revised direction:</b> receiver turns onto his stomach as the hold cinches, then alternates raised fists and downward strikes. Held poses animate at normal speed with closed-hand forearm variants where available; entry/roll transition is still to be built. Whole-leg layering and boot-art limitations remain. Judge fist contact and grip reach below.</p>' : ''}
<p>Static one-pose clips through the real runtime (tools/debug/toehold_t30_stills.mjs, poses in toehold_t30_poses.mjs). Hip lift, crouch and gap per still come from a small search that minimises grip px with a penalty for lifting the man off the mat. Known limits: layers are whole-leg, so "shin behind Lou's thigh, foot in front of his hip" cannot be split; the man's hips are lifted 0-40 px in several stills. Derek judges every visual.</p>
${CASES.map(sec).join('')}
${prone ? `<script>let frame=0;setInterval(()=>{document.querySelectorAll('[data-sell]').forEach(img=>img.src=img.dataset.sell+'-sell-'+frame+'.png');frame=(frame+1)%20},50)</script>` : ''}</body></html>`);
