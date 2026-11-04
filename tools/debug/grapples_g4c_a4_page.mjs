// G4c-a page, revision 4 (PLAN_GRAPPLES T4c.4g): the atomic drop's lift as a carry, an arc. Misses first; the r3 lift beside the new one, both facings, normal speed,
// plus the pelvis-path trace stills. Reads g4c-a4/film.json (grapples_g4c_a.mjs) and g4c-a3/film.json for r3.
//   WFM_URL=... node tools/debug/grapples_g4c_a.mjs research/animation/grapples-2026-10/g4c-a4 && python3 tools/debug/carry_trace_stills.py <that dir> && node tools/debug/grapples_g4c_a4_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { ATOMIC, SNAPMARE } from '../../src/animation/waistlockThrows.js';

const base = 'research/animation/grapples-2026-10', root = `${base}/g4c-a4`;
const load = (d) => JSON.parse(readFileSync(`${base}/${d}/film.json`, 'utf8'));
const f4 = load('g4c-a4'), f3 = load('g4c-a3');
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const F = { [-1]: 'attacker first facing left', 1: 'attacker first facing right' };
const drops = f4.runs.filter(r => r.kind === 'drop'), snaps = f4.runs.filter(r => r.kind === 'snapmare'), old = f3.runs.filter(r => r.kind === 'drop');
const mx = (rs, f) => Math.max(...rs.map(f));
const cell = (r, dir, note = '') => `<div><canvas data-dir="${dir}/frames/${r.id}" data-n="${r.frames}" width="620" height="360"></canvas><div class="cap">${r.id}: ${F[r.facing]}; clip starts at frame ${r.clipStart}${note}</div></div>`;
const d0 = drops[0], o0 = old[0];
const mask = (rs, k) => mx(rs, r => Math.max(...Object.values(r.mask).map(m => m[k])));
const ang = d0.carryAngles.map(a => `<tr><td>frame ${a.i}</td><td>${a.attacker}&deg;</td><td>${a.defender}&deg;</td><td>${a.attacker ? (a.defender / a.attacker).toFixed(2) : ''}</td></tr>`).join('');
const misses = [
    `<b>Height is short:</b> the defender's pelvis tops out ${d0.liftTop.pelvisOverAttackerPelvis} px over the attacker's pelvis (r2: 58, r3: ${o0.liftTop.pelvisOverAttackerPelvis}); ${d0.carryAbsolute.pelvisHeightOverMatAtTop} px over the mat. The carry only gives the rise from the squat, the knees and the lean (the defender's own <code>lift</code> track is 0 through it). I deepened the squat (crouch 1.0) and leaned him back ${Math.abs(d0.attackerTorsoAtTop.degreesFromVertical)}&deg;, no further. Say if you want it higher (more lean, or a bigger carry anchor offset).`,
    `<b>Torso angle runs past 1.3x:</b> the defender's drawn torso is ${d0.carryAngles.at(-1).defender}&deg; against the attacker's ${d0.carryAngles.at(-1).attacker}&deg; at the top (ratio ${(d0.carryAngles.at(-1).defender / d0.carryAngles.at(-1).attacker).toFixed(2)}, the plan's 1.3x): the carry sets the tilt channel from the attacker's drawn lean, and his own bend/lean keys are 0. The table below has every sixth frame. His legs are nearly horizontal at the top (thigh ${d0.defenderLegsAtTop.thighFromVerticalDeg.near}&deg; from vertical).`,
    `<b>Locked arms, just over:</b> his near hand moves ${d0.armsInTorsoFrame.nearAlongRange} px along his own torso and ${d0.armsInTorsoFrame.nearAcrossRange} px across it (far: ${d0.armsInTorsoFrame.farAlongRange} / ${d0.armsInTorsoFrame.farAcrossRange}); want under 5 (r3: ${o0.armsInTorsoFrame.nearAlongRange} / ${o0.armsInTorsoFrame.nearAcrossRange}). The remainder is the attacker's own shoulder moving as he stands and leans.`,
    `<b>Chest-to-back gap is not steady:</b> shoulder mid to shoulder mid runs ${d0.carryGap.min} to ${d0.carryGap.max} px through the carry (want within 5): the ratio-1.3 lean swings his shoulders back faster than the attacker's, by design of the plan's 1.3x; with a ratio of 1.0 the gap would hold.`,
    `<b>D12 overlap not cleared (not waived):</b> drop below-belt max ${mask(drops, 'belowBody')} px, torso ${mask(drops, 'torso')} px (r3: ${mask(old, 'belowBody')} / ${mask(old, 'torso')}); snapmare ${mask(snaps, 'belowBody')} / ${mask(snaps, 'torso')}. He rides the chest on purpose: Derek judges the frames (A7).`,
    `<b>Lead-in step:</b> first clip frame max part step ${mx(drops, r => r.stepFirst)} px (drop), ${mx(snaps, r => r.stepFirst)} px (snapmare), the tie-up's worst ${mx(f4.runs, r => r.stepTieUpWorst)} px.`,
];
const table = `<tr><th>measure</th><th>r4 (carry)</th><th>r3</th></tr>
<tr><td>defender pelvis path, relative to the attacker's pelvis (px, s = 1): x along the facing / y up</td><td>x ${d0.carryPath.relXRange.join(' to ')}, y ${d0.carryPath.relYRange.join(' to ')}: a curve (traces below), up ${(d0.carryPath.relYRange[1] - d0.carryPath.relYRange[0]).toFixed(1)} px and forward ${(d0.carryPath.relXRange[1] - d0.carryPath.relXRange[0]).toFixed(1)} px</td><td>straight up 80 px, x fixed</td></tr>
<tr><td>attacker's hands along / across his own torso over the lift (want under 5)</td><td>near ${d0.armsInTorsoFrame.nearAlongRange} / ${d0.armsInTorsoFrame.nearAcrossRange}, far ${d0.armsInTorsoFrame.farAlongRange} / ${d0.armsInTorsoFrame.farAcrossRange}</td><td>${o0.armsInTorsoFrame.nearAlongRange} / ${o0.armsInTorsoFrame.nearAcrossRange}, far ${o0.armsInTorsoFrame.farAlongRange} / ${o0.armsInTorsoFrame.farAcrossRange}</td></tr>
<tr><td>chest-to-back, shoulder mid to shoulder mid, min to max</td><td>${d0.carryGap.min} to ${d0.carryGap.max} (wrap ${d0.carryGap.atWrap}, top ${d0.carryGap.atTop})</td><td>horizontal 32.3 to 51.2</td></tr>
<tr><td>pelvis over attacker's pelvis at the top; attacker's chest over his pelvis</td><td>${d0.liftTop.pelvisOverAttackerPelvis}; ${d0.liftTop.attackerChestOverPelvis}</td><td>${o0.liftTop.pelvisOverAttackerPelvis}; ${o0.liftTop.attackerChestOverPelvis}</td></tr>
<tr><td>defender's thigh from vertical at the top; feet over the mat</td><td>${d0.defenderLegsAtTop.thighFromVerticalDeg.near}&deg; / ${d0.defenderLegsAtTop.thighFromVerticalDeg.far}&deg;; ${d0.defenderLegsAtTop.feetOverMat} px</td><td>${o0.defenderLegsAtTop.thighFromVerticalDeg.near}&deg; / ${o0.defenderLegsAtTop.thighFromVerticalDeg.far}&deg;; ${o0.defenderLegsAtTop.feetOverMat} px</td></tr>
<tr><td>planted soles, standing man, lift beat (px/frame, limit 2.5)</td><td>${Object.entries(d0.ankle).filter(([k]) => k.startsWith('att.') && k.endsWith('.lift')).map(([k, v]) => `${k.replace('att.', '')} ${v}`).join(', ')}</td><td>${Object.entries(o0.ankle).filter(([k]) => k.startsWith('att.') && k.endsWith('.lift')).map(([k, v]) => `${k.replace('att.', '')} ${v}`).join(', ')}</td></tr>
<tr><td>knee flex over the clip, min to max (want above -0.25)</td><td>Lou ${d0.knees.w1.minFlex} to ${d0.knees.w1.maxFlex}, George ${d0.knees.w2.minFlex} to ${d0.knees.w2.maxFlex}</td><td>same keys</td></tr>
<tr><td>far arm over his own torso, worst (px)</td><td>${Math.max(d0.farArm.a, d0.farArm.d)}</td><td>${Math.max(o0.farArm.a, o0.farArm.d)}</td></tr>
<tr><td>reverse window vs the lift</td><td>${ATOMIC.reverseWindow} s of ${ATOMIC.lift} s</td><td>same</td></tr>`;
const manifest = { commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain -- src tools tests').length > 0, branch: sh('git branch --show-current'), rigs: 'Lou (thesz-procreate-v1) on George (george-roster-v1)', tool: 'tools/debug/grapples_g4c_a.mjs', constants: { ATOMIC, SNAPMARE } };
const html = `<!doctype html><meta charset="utf-8"><title>G4c-a r4: the lift as an arc</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1340px}h2{margin-top:26px}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:620px}canvas,img{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px;margin:8px 0}td,th{border:1px solid var(--line);padding:3px 7px;text-align:left;vertical-align:top}th{background:var(--panel)}button{font:inherit;padding:4px 10px}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}li{margin:4px 0}a{color:#9ad}</style>
<h1>G4c-a, revision 4: the lift is an arc (T4c.4g)</h1><div class="note"><b>For Derek to judge.</b> Normal-speed loops from the tie-up. Misses first. Earlier: <a href="../g4c-a3/index.html">r3</a>, <a href="../g4c-a2/index.html">r2</a>, <a href="../g4c-a/index.html">first page</a>.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Misses</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>New lift: he rides Lou's chest and leans back with him</h2><div class="pair">${drops.map(r => cell(r, '.')).join('')}</div>
<h2>r3 lift, straight up, for comparison</h2><div class="pair">${old.map(r => cell(r, '../g4c-a3', ' (r3)')).join('')}</div>
<h2>The defender's pelvis path through the lift (red = the end of the wrap, green = the top)</h2><div class="pair"><div><img src="trace-left.png" width="620"><div class="cap">attacker first facing left</div></div><div><img src="trace-right.png" width="620"><div class="cap">attacker first facing right</div></div></div>
<h2>Snapmare (1.5x), reversing the new lift</h2><div class="pair">${snaps.map(r => cell(r, '.')).join('')}</div>
<h2>Measures (px at scale 1)</h2><table>${table}</table>
<h2>Torso angle from vertical, attacker against defender, every sixth frame of the carry (negative = leaning back)</h2><table><tr><th></th><th>attacker</th><th>defender</th><th>ratio</th></tr>${ang}</table>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
requestAnimationFrame(tick);document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
