// G4c-a r6 page (PLAN_GRAPPLES T4c.4n): the atomic drop with the chamber in the lift (Codex, default) beside the chamber in the hitch, both pairs, both facings, normal speed, the peak frame held.
// Reads g4c-a6/{lift,hitch}/film.json (grapples_g4c_a5.mjs, once with WFM_ATOMIC_CHAMBER=hitch) and the two probe JSONs beside them (atomic_chamber_probe.mjs).
//   node tools/debug/atomic_chamber_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { ATOMIC } from '../../src/animation/waistlockThrows.js';

const root = 'research/animation/grapples-2026-11/g4c-a6';
const J = (f) => JSON.parse(readFileSync(`${root}/${f}`, 'utf8'));
const films = { lift: J('lift/film.json'), hitch: J('hitch/film.json') }, probe = { lift: J('probe-lift.json'), hitch: J('probe-hitch.json') };
const runs = (v) => films[v].runs.filter(r => r.kind === 'drop');
const pr = (v, id) => probe[v].runs.find(r => r.id === id.replace('drop-', ''));
const PAIR = { lg: 'Lou on George', gl: 'George on Lou' }, FACE = { l: 'attacker first facing left', r: 'attacker first facing right' };
const peak = (r) => r.stills[0].frame, pad = (n) => String(n).padStart(4, '0');
const f1 = (v) => (v == null ? '-' : v);
const rows = ['lg-l', 'gl-l'].map(k => {
    const a = pr('lift', k), b = pr('hitch', k), name = PAIR[k.slice(0, 2)];
    const sole = (p, i) => `${p.soles[i].maxHeightToL} high / ${p.soles[i].maxSlideToL} slid`;
    return `<tr><td>${name}</td><td>${sole(a, 0)}</td><td>${sole(b, 0)}</td><td>${sole(a, 1)}</td><td>${sole(b, 1)}</td><td>${a.receiverPelvisRangeHitch} / ${b.receiverPelvisRangeHitch}</td>
<td>${a.steps.chamberEnd.attacker} / ${b.steps.chamberEnd.attacker}; impact ${a.steps.impact.attacker} / ${b.steps.impact.attacker}</td><td>${a.thighAtT.near} / ${b.thighAtT.near}</td><td>${a.seatGapAtImpact} / ${b.seatGapAtImpact}</td><td>${a.supportSoleDrift} / ${b.supportSoleDrift}</td></tr>`;
}).join('\n');
const d12 = ['drop-lg-l', 'drop-gl-l'].map(id => ['lift', 'hitch'].map(v => { const r = runs(v).find(x => x.id === id); return `${PAIR[r.pair]}, ${v}: ` + Object.entries(r.mask).map(([b, m]) => `${b} ${m.belowBody} / ${m.torso} / ${m.total} (${m.torsoFrames} torso frames)`).join('; '); }).join('<br>')).join('<br>');
const cell = (v, r) => `<div><canvas data-dir="${v}/frames/${r.id}" data-from="${r.first}" data-to="${r.last}" width="620" height="360"></canvas><div class="cap"><b>${v === 'lift' ? 'chamber in the lift (Codex)' : 'chamber in the hitch'}</b>, ${PAIR[r.pair]}, ${FACE[r.id.slice(-1)]}</div></div>`;
const still = (v, r) => `<div><img class="g" src="${v}/frames/${r.id}/s${pad(peak(r))}.jpg"><div class="cap">${v}: peak ${r.stills[0].time} s</div></div>`;
const blocks = ['drop-lg-l', 'drop-lg-r', 'drop-gl-l', 'drop-gl-r'].map(id => { const a = runs('lift').find(r => r.id === id), b = runs('hitch').find(r => r.id === id); return `<div class="pairrow">${cell('lift', a)}${cell('hitch', b)}</div><div class="pairrow">${still('lift', a)}${still('hitch', b)}</div>`; }).join('\n');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>G4c-a r6: chamber</title>
<style>body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1320px;margin:0 auto;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:4px 6px;vertical-align:top;font-size:12px}.note{background:#222;padding:8px 12px;margin:10px 0}.pairrow{display:flex;gap:10px;margin:8px 0}.pairrow>div{flex:1}canvas,img{width:100%;background:#000}img.g{filter:grayscale(1)}.cap{font-size:12px;color:#aaa}h1,h2{font-weight:600}</style>
<h1>G4c-a, revision 6: where the near knee chambers (T4c.4l-T4c.4n)</h1>
<div class="note"><b>For Derek to judge.</b> Left: Codex's peak, the knee comes up during the lift (default, <code>ATOMIC.chamber='lift'</code>). Right: the thigh chambers over the first 0.14 s of the 0.24 s hitch (<code>?atomicChamber=hitch</code>). Same height, duration ${ATOMIC.duration} s, drop, damage ${ATOMIC.impact} s, landing folds, camera; only the chamber timing differs. Pick one, and say whether 0.24 s at the top is right. I do not call either one right.</div>
<h2>Misses first</h2><ul>
<li><b>'hitch' is worse on George:</b> his support (planted) sole drifts ${probe.hitch.runs.find(r => r.id === 'gl-l').supportSoleDrift} px (lift: ${probe.lift.runs.find(r => r.id === 'gl-l').supportSoleDrift}); his near sole is ${probe.hitch.runs.find(r => r.id === 'gl-l').soles[0].maxHeightToL} px off the mat before the lift ends. A second plant on the near foot holds for Lou (0.2 px) but George cannot reach; dropped.</li>
<li><b>Both feet are not on the mat through the lift in 'hitch'</b> (Lou: near sole ${probe.hitch.runs.find(r => r.id === 'lg-l').soles[0].maxHeightToL} px up, ${probe.hitch.runs.find(r => r.id === 'lg-l').soles[0].maxSlideToL} px slid by the lift's end).</li>
<li><b>Receiver pelvis over the hitch:</b> lift 0 px; hitch Lou ${probe.hitch.runs.find(r => r.id === 'lg-l').receiverPelvisRangeHitch}, George ${probe.hitch.runs.find(r => r.id === 'gl-l').receiverPelvisRangeHitch} px (want under 2). One lift value (13) cannot zero both rigs: 8 gives 14.8 / 9.0, 20 gives 3.0 / 12.5.</li>
<li><b>Carried from r4/r5, not touched:</b> the receiver's near leg is near horizontal and straight at the peak; snapmare release step 32-36 px; snapmare near knee 20-30 px over the mat at impact; D12 overlap below.</li></ul>
<h2>Table (lift / hitch)</h2>
<table><tr><th>pair (facing left; right is identical)</th><th>near sole by L, lift</th><th>near sole by L, hitch</th><th>far (support) sole, lift</th><th>far sole, hitch</th><th>receiver pelvis range over the hitch (px)</th><th>attacker joint step at chamber end; at impact (px)</th><th>near thigh at T (rad)</th><th>seat gap at impact (px)</th><th>support sole drift (px)</th></tr>
${rows}</table>
<div class="note">D12 raw per beat (below-belt / torso on torso / total px&sup2;):<br>${d12}</div>
<div class="note">Gates: knee audit 0 saturated and no new failures for both variants, waistlock_throws_assert, focused tests pass. Not run for this page: full suite (at the commit gate only).</div>
<h2>Loops (normal speed) and the peak frame</h2>
${blocks}
<script>
for (const c of document.querySelectorAll('canvas')) { const dir = c.dataset.dir, a = +c.dataset.from, b = +c.dataset.to, ctx = c.getContext('2d'), imgs = []; let n = 0;
  for (let i = a; i <= b; i++) { const im = new Image(); im.src = dir + '/s' + String(i).padStart(4, '0') + '.jpg'; im.onload = () => { n++; }; imgs.push(im); }
  let k = 0; setInterval(() => { const im = imgs[k]; if (im.complete) ctx.drawImage(im, 0, 0, c.width, c.height); k = (k + 1) % imgs.length; }, 1000 / 60); }
</script></html>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
