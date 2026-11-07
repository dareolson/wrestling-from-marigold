// PLAN_FALLS T4.6: the G4a r2 stills page, research/animation/falls-2026-11/g4a-r2/index.html, from stills/results.json (falls_g4a_r2_stills.mjs) and before.json
// (falls_g4a_probe.mjs with CONTACT=1 on the code at b1c4b1b).   node tools/debug/falls_g4a_r2_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11/g4a-r2';
const S = JSON.parse(readFileSync(`${root}/stills/results.json`, 'utf8')), B = JSON.parse(readFileSync(`${root}/before.json`, 'utf8'));
const right = S.filter(r => r.facing === 1);
const before = (att, vic, lying) => B.find(c => c.move === 'elbowDrop' && c.attacker === att && c.victim === vic && c.lying === lying && c.facing === 1)?.contact;
const combos = [['lou', 'george'], ['george', 'lou']].flatMap(([a, v]) => ['supine', 'prone'].map(l => ({ a, v, l })));
const rows = combos.map(({ a, v, l }) => {
    const get = (p) => right.find(r => r.attacker === a && r.victim === v && r.lying === l && r.phase === p), b = before(a, v, l);
    return `<tr><td>${a} on ${v}, ${l}</td><td>${b.peakMiss}</td><td>${b.framesMiss}</td><td>${get('approach').miss}</td><td><b>${get('contact').miss}</b></td><td>${get('contact').limb}</td><td>${get('rolloff').miss}</td><td>${get('contact').front}</td></tr>`;
}).join('');
const worst = Math.max(...S.filter(r => r.phase === 'contact').map(r => r.miss));
const img = (id) => `<a href="stills/${id}.jpg"><img src="stills/${id}.jpg" width="400"></a>`;
const mask = (id) => `<img src="stills/${id}-mask.png" width="400" style="object-fit:none;object-position:-200px -200px;height:254px;width:400px;background:#000">`;
const cell = (r) => `<div class="c"><div class="cap"><b>${r.phase}</b> miss ${r.miss} px, arm on him ${r.limb}, front conflict ${r.front}</div>${img(r.id)}${mask(r.id)}</div>`;
const closeup = (r) => `<div class="z"><div style="background:url(stills/${r.id}.jpg) no-repeat;background-size:${520 * 2.6}px ${330 * 2.6}px;background-position:-${(520 / 2 - 110) * 2.6}px -${100 * 2.6}px;width:520px;height:330px"></div><div class="cap">${r.attacker} on ${r.victim} (${r.lying}), contact</div></div>`;
const groups = combos.map(({ a, v, l }) => `<h3>${a} on ${v}, receiver ${l}</h3>` + [1, -1].map(f => `<div class="g">${['approach', 'contact', 'rolloff'].map(p => cell(S.find(r => r.attacker === a && r.victim === v && r.lying === l && r.facing === f && r.phase === p))).join('')}<div class="cap">facing ${f > 0 ? 'right' : 'left'}</div></div>`).join('')).join('');
const html = `<!doctype html><meta charset="utf-8"><title>G4a r2: elbow drop stills</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1300px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #444;padding:3px 8px;text-align:left}.g{display:flex;gap:10px;margin:6px 0;align-items:flex-start}.c{width:400px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}.z{overflow:hidden}.zz{display:flex;flex-wrap:wrap;gap:10px}</style>
<h1>G4a r2: elbow drop, three stills (T4.6), <code>?falls=v1</code></h1>
<p>Stills only: approach / contact / roll-off, posed with the rig's own grounded renderer (<code>src/animation/groundContact.js</code>), nothing animated yet. Each row: the render, then the silhouettes (red attacker only, blue receiver only, green his striking arm on the receiver, white the rest of his body inside the receiver). Derek judges the look.</p>
<h2 class="miss">Misses first</h2><ul>
<li><b>One deviation from the plan, on the measure's say-so:</b> the attacker lies on the <b>far</b> side of the receiver (up the screen), not nearer the camera. A search over the contact pose with the elbow pinned on the chest (<code>falls_g4a_r2_search.mjs</code>) gave 285-480 px of overlap there against 1,000+ on the near side (the receiver's own splayed near arm and drawn-up knee fill that side), and the near-side poses that came close had his torso standing straight up the screen. The bodies are separate; his torso is drawn behind the receiver's, and only his striking arm is raised over it.</li>
<li>The overlap is not zero: contact leaves up to <b>${worst} px</b> of raw 2D overlap (his shoulder and trunk against the receiver's side, of bodies about 6,000 and 8,000 px). By depth it is occlusion, not one body drawn through the other (front conflict 0 on every still), but that number comes from the depth order, not from the pixels, so say if it reads as phasing.</li>
<li>The striking arm is layered over the receiver in the contact still only, by a depth override in the stills tool. The game has no such layering yet; T4.7 needs it as a fixed order with an explicit release.</li>
<li>Roll-off: he plants the near hand and pushes away up the screen, but the far hand still touches the receiver (arm on him 132-246 px supine, 28-163 px prone). Not tuned further.</li>
<li>The before column is the whole G4a elbow-drop run (about 2.6 s, the attacker lying on him until he gets up): peak and frames of miss. The stills are single poses, so the columns are not a like-for-like drop; the animated comparison is T4.7's.</li>
<li>Existing parts only. No bent-elbow or shoulder angle was out of reach, so there is no art request for Codex. The arm's elbow flex is 2.1 rad, inside the limit.</li></ul>
<h2>Overlap (px, facing right; facing left is the mirror: identical numbers)</h2>
<table><tr><th>pair</th><th>before: peak miss (G4a)</th><th>before: frames with miss</th><th>approach miss</th><th>contact miss</th><th>contact: arm on him (allowed)</th><th>roll-off miss</th><th>contact: front conflict</th></tr>${rows}</table>
<h2>Contact close-ups</h2><div class="zz">${right.filter(r => r.phase === 'contact').map(closeup).join('')}</div>
<h2>All stills</h2>${groups}`;
writeFileSync(`${root}/index.html`, html);
console.log(`wrote ${root}/index.html`);
