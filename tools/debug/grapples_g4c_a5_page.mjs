// G4c-a page, revision 5 (PLAN_GRAPPLES T4c.4k): the snapmare with the thrower's forward foot planted, the atomic drop that lands on a bent knee. Table and misses first, then one
// normal-speed loop per move, both facings, both pairs (marks on: plant target and sole, knee points, seat against the knee), held grayscale stills at game size, the r4 lift beside.
// Reads g4c-a5/film.json (grapples_g4c_a5.mjs), sweep.txt and knee-audit.txt beside it.
//   node tools/debug/grapples_g4c_a5_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { ATOMIC, SNAPMARE } from '../../src/animation/waistlockThrows.js';

const base = 'research/animation/grapples-2026-10', root = `${base}/g4c-a5`;
const film = JSON.parse(readFileSync(`${root}/film.json`, 'utf8'));
const r4 = JSON.parse(readFileSync(`${base}/g4c-a4/film.json`, 'utf8'));
const text = (f) => readFileSync(`${root}/${f}`, 'utf8').trim();
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const drops = film.runs.filter(r => r.kind === 'drop'), snaps = film.runs.filter(r => r.kind === 'snapmare');
const F = { [-1]: 'attacker first facing left', 1: 'attacker first facing right' };
const who = (r) => (r.kind === 'drop' ? `${r.label}: drop` : `${r.label}: snapmare (${r.pair === 'lg' ? 'George' : 'Lou'} throws)`);
const mx = (rs, f) => Math.max(...rs.map(f));
const left = (rs, p) => rs.filter(r => r.pair === p && r.facing === -1)[0];

const audit = text('knee-audit.txt').split('\n'), sweep = text('sweep.txt').split('\n');
const auditNew = audit.filter(l => l.startsWith('NEW')).length;
const sweepRows = sweep.filter(l => l.startsWith('ok') || l.startsWith('FAIL')), sweepFail = sweepRows.filter(l => l.startsWith('FAIL')).length;
const stepRange = sweepRows.map(l => +l.match(/ankle step\s+([\d.]+)/)?.[1]).filter(Number.isFinite);

const dropRows = ['lg', 'gl'].map(p => left(drops, p)), snapRows = ['lg', 'gl'].map(p => left(snaps, p));
const maskMax = (rs, k) => mx(rs, r => Math.max(...Object.values(r.mask).map(m => m[k])));
const r4mask = (k) => mx(r4.runs.filter(r => r.kind === 'drop'), r => Math.max(...Object.values(r.mask).map(m => m[k])));
const r4masks = (kind, k) => mx(r4.runs.filter(r => r.kind === kind), r => Math.max(...Object.values(r.mask).map(m => m[k])));
const beatMax = (rs, beat, k) => mx(rs, r => r.mask[beat]?.[k] ?? 0);

const misses = [
    `<b>The forward foot's release is a step, not a settle:</b> held ${snaps[0].plant.driftHeld}-${mx(snaps, r => r.plant.driftHeld)} px over ${snaps[0].plant.heldFrames} frames (max ${mx(snaps, r => r.plant.maxStepHeld)} px/frame, solve residual ${mx(snaps, r => r.plant.solveResidual)} px), then it steps ${Math.min(...snaps.map(r => r.plant.stepOutAfterRelease))}-${mx(snaps, r => r.plant.stepOutAfterRelease)} px in the 0.10 s release, ${mx(snaps, r => r.plant.maxStepInRelease)} px/frame at the fastest (limit 2.5). A 0.20 s release would halve that; not changed.`,
    `<b>The thrower's near knee never touches:</b> at the impact the lower knee is ${Math.min(...snaps.map(r => r.knee.lowerKneeOverMatAtImpact))}-${mx(snaps, r => r.knee.lowerKneeOverMatAtImpact)} px over the mat (the other ${Math.min(...snaps.map(r => r.knee.otherKneeAtImpact))}-${mx(snaps, r => r.knee.otherKneeAtImpact)} px); the pull's keys were left alone, no frame has it under 8 px. The rear foot is not planted (a short plant popped on release): its sole moves ${Math.min(...snaps.map(r => r.plant.otherSole.excursion))}-${mx(snaps, r => r.plant.otherSole.excursion)} px, up to ${mx(snaps, r => r.plant.otherSole.maxStep)} px/frame, as before.`,
    `<b>First contact vs the marker:</b> the seat reaches the knee (gap under 3 px) at ${[...new Set(drops.map(r => r.contact.firstContactTime))].join(' / ')} s against ATOMIC.impact ${ATOMIC.impact}: ${drops.some(r => r.contact.offFrames) ? `Lou's drop is ${mx(drops, r => r.contact.offFrames)} frame late` : 'on the frame'}. The gap stays under ${mx(drops, r => r.contact.gapMax)} px from contact to the recoil.`,
    `<b>D12 overlap not cleared (not waived), mostly worse than r4:</b> drop below-belt max ${maskMax(drops, 'belowBody')} px&sup2; (r4 ${r4mask('belowBody')}), torso on torso ${maskMax(drops, 'torso')} (r4 ${r4mask('torso')}); the lift beat is the large one (${beatMax(drops, 'lift', 'belowBody')} vs r4 ${mx(r4.runs.filter(r => r.kind === 'drop'), r => r.mask.lift.belowBody)}) since the folded knees now draw (T4c.4h), the drop beat is smaller (${beatMax(drops, 'drop', 'belowBody')} vs ${mx(r4.runs.filter(r => r.kind === 'drop'), r => r.mask.drop.belowBody)}). Snapmare below-belt ${maskMax(snaps, 'belowBody')} (r4 ${r4masks('snapmare', 'belowBody')}), torso ${maskMax(snaps, 'torso')} (r4 ${r4masks('snapmare', 'torso')}).`,
    `<b>Hip heights bought with a little <code>lift</code>:</b> the rig sinks a one-legged man's pelvis (sole-mean hip solve), too low for a planted leg (the thrower's 70 px, the attacker's 50), so the thrower's pull/throw keys carry lift 6 and the attacker's hitch/drop keys lift 8. Both are on the keys, not a new track.`,
    `<b>Seams (unchanged by this work):</b> the defender's exit pop (36-41 px at exit frame 2) and the cold-start frame-0 pose residue in <code>grapples_flagoff</code> (HEAD fails it too, same frame 0: up to 3e-3 on lLeg/lArm/crouch) are old; this work adds a 5 px step at exit frame 1 of the drop (Lou on George: the defender; George on Lou: the attacker), 0.3 px before.`,
    `<b>Not tuned:</b> no speed retune, no art, no new variants. The sleeper keys moved to absolute shins too (T4c.4h), so every sleeper stage's knees are now drawn, not clamped to -0.10; unreviewed by Derek.`,
];
const table = `<tr><th>measure</th><th>result (raw)</th></tr>
<tr><td>first contact (seat-to-knee gap &lt; 3 px) vs ATOMIC.impact ${ATOMIC.impact} (damage marker = the clip's impact event)</td><td>${drops.map(r => `${r.id}: ${r.contact.firstContactTime} s (${r.contact.offFrames >= 0 ? '+' : ''}${r.contact.offFrames} frame)`).join('<br>')}</td></tr>
<tr><td>seat-to-knee gap from contact to the recoil (px, frame by frame, want under 3)</td><td>${drops.filter(r => r.facing === -1).map(r => `${r.label}: ${r.contact.gapAtContactToRecoil.join(' / ')}`).join('<br>')}</td></tr>
<tr><td>raised thigh at contact: from vertical / shin from vertical / fold (rad)</td><td>${drops.filter(r => r.facing === -1).map(r => `${r.label}: ${r.contact.thighFromVertical} / ${r.contact.shinFromVertical} / ${r.contact.fold}`).join('<br>')}</td></tr>
<tr><td>attacker's support sole (planted wrap to catch): drift / worst step / solve residual (px)</td><td>${drops.filter(r => r.facing === -1).map(r => `${r.label}: ${r.support.drift} / ${r.support.maxStep} / ${r.support.solveResidual}`).join('<br>')}</td></tr>
<tr><td>thrower's forward sole (planted landing to release start): drift / worst step / solve residual (px; was 85 / 57 px of slide)</td><td>${snaps.filter(r => r.facing === -1).map(r => `${r.label}: ${r.plant.driftHeld} / ${r.plant.maxStepHeld} / ${r.plant.solveResidual}; capture frame ${r.plant.onMatAtCapture} px off the line`).join('<br>')}</td></tr>
<tr><td>thrower's release: window / step out (px) / fastest step (px/frame)</td><td>${snaps.filter(r => r.facing === -1).map(r => `${r.label}: ${r.plant.releaseWindow.map(v => v.toFixed(2)).join('-')} s / ${r.plant.stepOutAfterRelease} / ${r.plant.maxStepInRelease}`).join('<br>')}</td></tr>
<tr><td>thrower's knees over the mat at the impact: lower / other (px)</td><td>${snaps.filter(r => r.facing === -1).map(r => `${r.label}: ${r.knee.lowerKneeOverMatAtImpact} / ${r.knee.otherKneeAtImpact}`).join('<br>')}</td></tr>
<tr><td>D12 raw (px&sup2;) per beat: below-belt / torso on torso / total, drop (facing left)</td><td>${dropRows.map(r => `${r.label}: ` + Object.entries(r.mask).map(([b, m]) => `${b} ${m.belowBody} / ${m.torso} / ${m.total}`).join('; ')).join('<br>')}</td></tr>
<tr><td>D12 raw per beat, snapmare (facing left)</td><td>${snapRows.map(r => `${r.label}: ` + Object.entries(r.mask).map(([b, m]) => `${b} ${m.belowBody} / ${m.torso} / ${m.total}`).join('; ')).join('<br>')}</td></tr>
<tr><td>r4 (Lou on George, facing left) D12 raw per beat, for comparison</td><td>${['drop', 'snapmare'].map(k => { const r = r4.runs.find(x => x.kind === k); return `${k}: ` + Object.entries(r.mask).map(([b, m]) => `${b} ${m.belowBody} / ${m.torso} / ${m.total}`).join('; '); }).join('<br>')}</td></tr>
<tr><td>knee audit (clip_knee_audit.mjs, all clips, hold, get-ups, live drop / reverse / sleeper, both rigs and facings)</td><td>${text('knee-audit.txt').split('\n').slice(-3).join('<br>')}; new failure runs: ${auditNew}</td></tr>
<tr><td>fold sweep (knee_fold_sweep.mjs: folds 0 / 0.6 / 1.2 / 1.8, both rigs and facings)</td><td>${sweepRows.length} rows, ${sweepFail} failed; ankle steps ${Math.min(...stepRange)}-${Math.max(...stepRange)} px (want 8+); ${sweep.at(-1)}</td></tr>`;

const stills = (r) => `<div class="stills"><div class="cap"><b>${who(r)}</b>, ${F[r.facing]}: held stills, grayscale, game size</div><div class="pair">${r.stills.map(s => `<div><img class="g" src="frames/${r.id}/s${String(s.frame).padStart(4, '0')}.jpg" width="620" height="360"><div class="cap">${s.label}: clip ${s.time} s, frame ${s.frame}</div></div>`).join('')}</div></div>`;
const cell = (r) => `<div><canvas data-id="${r.id}" data-dir="frames/${r.id}" data-from="${r.first}" data-to="${r.last}" width="620" height="360"></canvas><div class="cap">${who(r)}; ${F[r.facing]}; frames ${r.first}-${r.last}${r.kind === 'drop' ? '; red = his seat, green = top of the knee, joined by a line; the number is the gap in px' : '; cyan cross = the plant target, yellow = the forward sole, white rings = knees (red = within 8 px of the mat)'}</div></div>`;
const r4cell = (r) => `<div><canvas data-dir="../g4c-a4/frames/${r.id}" data-from="0" data-to="${r.frames - 1}" width="620" height="360"></canvas><div class="cap">r4 ${r.id} (the lift as an arc, knees clamped to -0.10): from the tie-up, no marks</div></div>`;
const marks = Object.fromEntries(film.runs.map(r => [r.id, { kind: r.kind, marks: r.marks, target: r.plant?.targetShot ?? null }]));
const manifest = { commit: sh('git rev-parse --short HEAD'), dirty: film.dirty, branch: sh('git branch --show-current'), tool: film.tool, snapmareSpeed: film.snapmareSpeed, rigs: 'Lou thesz-procreate-v1, George george-roster-v1; both pairs, both facings', shot: film.runs[0].shot, node: process.version };
const html = `<!doctype html><meta charset="utf-8"><title>G4c-a r5: planted feet and a bent knee</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1340px}h2{margin-top:26px}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:620px}canvas,img{background:#000;display:block;max-width:100%}img.g{filter:grayscale(1)}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px;margin:8px 0}td,th{border:1px solid var(--line);padding:3px 7px;text-align:left;vertical-align:top}th{background:var(--panel)}button{font:inherit;padding:4px 10px}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}li{margin:4px 0}a{color:#9ad}.stills{margin:14px 0}</style>
<h1>G4c-a, revision 5: planted feet, a bent knee (T4c.4h-T4c.4j)</h1><div class="note"><b>For Derek to judge.</b> One normal-speed loop per move, both facings, both pairs. Misses and the table first; I do not call any of it right. Earlier: <a href="../g4c-a4/index.html">r4</a>, <a href="../g4c-a3/index.html">r3</a>. The snapmare is 1.5x (SNAPMARE.speed), the pick between 1.5x and 2x is still open.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button> <button id="mk">marks: on</button></p>
<h2>Misses</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Table</h2><table>${table}</table>
<h2>The atomic drop: knee chambered at the hitch, he sits on it, recoil</h2><div class="pair">${drops.map(cell).join('')}</div>
${dropRows.map(stills).join('')}
<h2>The snapmare: George's forward foot stays where it landed</h2><div class="pair">${snaps.map(cell).join('')}</div>
${snapRows.map(stills).join('')}
<h2>r4's lift, for comparison (Lou on George, from the tie-up)</h2><div class="pair">${r4.runs.filter(r => r.kind === 'drop').map(r4cell).join('')}<div><img src="../g4c-a4/trace-left.png" width="620"><div class="cap">r4 pelvis path, attacker first facing left (red = end of the wrap, green = the top)</div></div></div>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>
const MARKS=${JSON.stringify(marks)};
const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1,marksOn=true;
const items=cvs.map(c=>{const from=+c.dataset.from,to=+c.dataset.to,imgs=[];for(let i=from;i<=to;i++){const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';imgs.push(im)}const m=MARKS[c.dataset.id];return{c,from,to,imgs,m,byFrame:m?Object.fromEntries(m.marks.map(k=>[k.i,k])):{}}});
function mark(it,i,ctx){const m=it.m;if(!m||!marksOn)return;const k=it.byFrame[i];ctx.lineWidth=1.5;ctx.font='12px system-ui';
 if(m.kind==='drop'&&k){ctx.strokeStyle='#f55';ctx.beginPath();ctx.arc(k.seat.x,k.seat.y,4,0,7);ctx.stroke();ctx.strokeStyle='#5f5';ctx.beginPath();ctx.arc(k.contact.x,k.contact.y,4,0,7);ctx.stroke();ctx.strokeStyle='#ff6';ctx.beginPath();ctx.moveTo(k.seat.x,k.seat.y);ctx.lineTo(k.contact.x,k.contact.y);ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(k.gap.toFixed(1),k.contact.x+8,k.contact.y-6)}
 if(m.kind==='snapmare'){if(m.target){ctx.strokeStyle='#0ff';ctx.beginPath();ctx.moveTo(m.target.x-8,m.target.y);ctx.lineTo(m.target.x+8,m.target.y);ctx.moveTo(m.target.x,m.target.y-8);ctx.lineTo(m.target.x,m.target.y+8);ctx.stroke()}
  if(k){ctx.strokeStyle='#fd0';ctx.beginPath();ctx.arc(k.sole.x,k.sole.y,3,0,7);ctx.stroke();for(const j of['nearKnee','farKnee']){ctx.strokeStyle=k.kneeDown?'#f44':'#fff';ctx.beginPath();ctx.arc(k[j].x,k[j].y,5,0,7);ctx.stroke()}}}}
let last=performance.now(),t=0;
function tick(now){const dt=(now-last)/1000;last=now;if(!paused)t+=dt*rate;for(const it of items){const n=it.imgs.length,i=Math.floor(t*60)%n,im=it.imgs[i],ctx=it.c.getContext('2d');if(im.complete&&im.naturalWidth){ctx.drawImage(im,0,0);mark(it,it.from+i,ctx)}}requestAnimationFrame(tick)}
requestAnimationFrame(tick);
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};
document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};
document.getElementById('mk').onclick=e=>{marksOn=!marksOn;e.target.textContent='marks: '+(marksOn?'on':'off')};
</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
