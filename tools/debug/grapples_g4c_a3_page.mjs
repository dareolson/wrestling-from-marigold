// G4c-a page, revision 3 (PLAN_GRAPPLES T4c.4c-T4c.4f): the far arm, knees, the faster snapmare at 1.5x and 2x, the fridge lift. Misses first; the old lift
// (r2) beside the new one. Reads g4c-a3/film.json (1.5x, shipped) and g4c-a3-2x/film.json (2x), both from grapples_g4c_a.mjs; r2 from g4c-a2.
//   WFM_URL=... node tools/debug/grapples_g4c_a.mjs research/animation/grapples-2026-10/g4c-a3
//   WFM_URL=... WFM_SNAPMARE_SPEED=2 node tools/debug/grapples_g4c_a.mjs research/animation/grapples-2026-10/g4c-a3-2x
//   node tools/debug/grapples_g4c_a3_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { ATOMIC, SNAPMARE } from '../../src/animation/waistlockThrows.js';

const base = 'research/animation/grapples-2026-10', root = `${base}/g4c-a3`;
const load = (d) => JSON.parse(readFileSync(`${base}/${d}/film.json`, 'utf8'));
const f15 = load('g4c-a3'), f2 = load('g4c-a3-2x'), old = load('g4c-a2'), first = load('g4c-a');
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const F = { [-1]: 'attacker first facing left', 1: 'attacker first facing right' };
const pick = (f, kind) => f.runs.filter(r => r.kind === kind);
const drops = pick(f15, 'drop'), s15 = pick(f15, 'snapmare'), s2 = pick(f2, 'snapmare'), oldDrops = pick(old, 'drop'), oldSnaps = pick(old, 'snapmare'), firstSnaps = pick(first, 'snapmare');
const cell = (r, dir, note = '') => `<div><canvas data-dir="${dir}/frames/${r.id}" data-n="${r.frames}" width="620" height="360"></canvas><div class="cap">${r.id}: ${F[r.facing]}; clip starts at frame ${r.clipStart}${note}</div></div>`;
const mx = (rs, f) => Math.max(...rs.map(f));
const d0 = drops[0], a15 = s15[0], a2 = s2[0];
const mask = (rs, k) => mx(rs, r => Math.max(...Object.values(r.mask).map(m => m[k])));
const snapRow = (label, r, speed) => `<tr><td>${label}</td><td>${r.flip.degrees}&deg; in ${(SNAPMARE.flip * (SNAPMARE.speed / speed)).toFixed(3)} s</td><td>${r.flip.radPerFrameMax}</td><td>${r.flipTiltMax}</td><td>${r.landX} (thrower ${r.throwerX}, ${r.landDistance} px in front; ring margin ${r.landMargin})</td><td>${r.bootToHeadMin.px}</td><td>${r.stepFirst}</td></tr>`;
const kneeTable = [...drops, ...s15].map(r => `<tr><td>${r.id}</td><td>${r.knees.w1.minFlex} to ${r.knees.w1.maxFlex}</td><td>${r.knees.w2.minFlex} to ${r.knees.w2.maxFlex}</td></tr>`).join('');
const misses = [
    `<b>Locked arms are not locked:</b> through the lift the attacker's near hand moves ${d0.armsInTorsoFrame.nearAlongRange} px along his own torso and ${d0.armsInTorsoFrame.nearAcrossRange} px across it (far hand ${d0.armsInTorsoFrame.farAlongRange} / ${d0.armsInTorsoFrame.farAcrossRange}), ${d0.armsInTorsoFrame.frames} frames from the end of the lead-in to the top. The hands are IK'd onto the defender's hip (the clip's grips), and his hip rises ${ATOMIC.liftPeak} px while the attacker's own chest rises less. A deeper squat brought it from 42 to 26 px.`,
    `<b>The lift peaks lower than r2:</b> the defender's pelvis tops out ${d0.liftTop.pelvisOverAttackerPelvis} px over the attacker's pelvis (r2: ${oldDrops[0].liftTop.pelvisOverAttackerPelvis}), because the attacker now leans back ${Math.abs(d0.attackerTorsoAtTop.degreesFromVertical)}&deg;, so his chest is ${d0.liftTop.attackerChestOverPelvis} px over his pelvis (r2: ${oldDrops[0].liftTop.attackerChestOverPelvis}). Defender's pelvis is above his chest by ${(d0.liftTop.pelvisOverAttackerPelvis - d0.liftTop.attackerChestOverPelvis).toFixed(1)} px.`,
    `<b>Lead-in step still there:</b> first clip frame max part step ${mx(drops, r => r.stepFirst)} px (drop), ${mx(s15, r => r.stepFirst)} px (snapmare 1.5x), ${mx(s2, r => r.stepFirst)} px (2x), against the tie-up's worst ${mx(f15.runs, r => r.stepTieUpWorst)} px. The snapmare number is bigger than r2's ${mx(oldSnaps, r => r.stepFirst)} px: its reach is now ${SNAPMARE.reach.toFixed(2)} s, so the same pose change happens in fewer frames.`,
    `<b>D12 overlap not cleared (not waived, layering does not fix it):</b> drop below-belt max ${mask(drops, 'belowBody')} px, torso ${mask(drops, 'torso')} px (r2: ${mask(oldDrops, 'belowBody')} / ${mask(oldDrops, 'torso')}); snapmare 1.5x below-belt ${mask(s15, 'belowBody')} px, torso ${mask(s15, 'torso')} px; 2x ${mask(s2, 'belowBody')} / ${mask(s2, 'torso')}. The wrap puts chest on back (chest to back ${d0.chestToBack.atWrap} px at the wrap, ${d0.chestToBack.atTop} px at the top); Derek judges those frames (A7).`,
    `<b>Elbows and the old moves:</b> the knee audit's baseline lists ${Object.keys(JSON.parse(readFileSync('tools/debug/baselines/clip_knee_baseline.json', 'utf8')).failures).length} knee-failure runs in shipped moves (armBar, figureFour, piledriver, suplex, ...), not fixed here: <code>research/animation/grapples-2026-10/knee-audit-first-run.txt</code>. Elbows are counted by the audit but never fail it.`,
    `<b>Still open from before:</b> hands to the head, foot support, the supported kneel, the snapmare's rise facing snap. Not touched.`,
];
const table = `<tr><th>fix</th><th>measure</th><th>value</th></tr>
<tr><td>4c far arm</td><td>far-arm pixels drawn over his own torso, worst frame, both men, every clip frame (${a15.farArm.of} frames)</td><td>snapmare now ${mx(s15, r => Math.max(r.farArm.a, r.farArm.d))} px, ${mx(s15, r => r.farArm.framesOver)} frames over; r2 layers: 541-643 px, over in every one of 61 frames (measured on the r2 layer order, same probe). Drop (no layers, default stacking): ${mx(drops, r => Math.max(r.farArm.a, r.farArm.d))} px.</td></tr>
<tr><td>4c order across the end</td><td>far arm over torso, last clip frame vs first frame after</td><td>[${a15.farArmEnd.lastClipFrame}] vs [${a15.farArmEnd.firstAfter}] (a, d): no pop. r2 order: [541,630] then [0,0], the pop.</td></tr>
<tr><td>4d knees</td><td>flex of the drawn knees over each clip, min to max (proper bend &gt; 0; below -0.25 fails)</td><td>see knee table; <code>clip_knee_audit</code> passes, no atomicDrop or snapmare run in its failures</td></tr>
<tr><td>4f lift</td><td>torso from vertical at the top; chest to back; defender's thigh from vertical; feet over the mat</td><td>${d0.attackerTorsoAtTop.degreesFromVertical}&deg;; ${d0.chestToBack.atWrap} to ${d0.chestToBack.atTop} px; near ${d0.defenderLegsAtTop.thighFromVerticalDeg.near}&deg; / far ${d0.defenderLegsAtTop.thighFromVerticalDeg.far}&deg;; ${d0.defenderLegsAtTop.feetOverMat} px (highest foot ${d0.defenderLegsAtTop.feetOverMatHighest})</td></tr>
<tr><td>4f timing</td><td>reverse window vs lift</td><td>window ${ATOMIC.reverseWindow} s from the lift's start; lift now ${ATOMIC.lift} s plus ${ATOMIC.hitch} s hitch (r2: 0.30 s), so the window covers ${Math.round(ATOMIC.reverseWindow / ATOMIC.lift * 100)}% of the lift (r2 67%): it closes while he is still on the way up. Say if that feels short.</td></tr>
<tr><td>4f planted soles</td><td>standing man's ankle px/frame, lift beat</td><td>${Object.entries(d0.ankle).filter(([k]) => k.startsWith('att.') && k.endsWith('.lift')).map(([k, v]) => `${k} ${v}`).join(', ')} (limit 2.5)</td></tr>`;
const snapTable = `<tr><th></th><th>flip</th><th>rad/frame max</th><th>peak tilt</th><th>landing x</th><th>boot to head, min</th><th>first-frame step</th></tr>${snapRow('1.5x (shipped), George throws Lou, facing right', a15, 1.5)}${snapRow('2x', a2, 2)}${snapRow('r2 (1x, landFwd 215)', oldSnaps[0], 1)}`;
const manifest = { commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain -- src tools tests').length > 0, branch: sh('git branch --show-current'), rigs: 'Lou (thesz-procreate-v1) on George (george-roster-v1)', tool: 'tools/debug/grapples_g4c_a.mjs (WFM_SNAPMARE_SPEED=2 for the 2x run)', constants: { ATOMIC, SNAPMARE } };
const html = `<!doctype html><meta charset="utf-8"><title>G4c-a r3: far arm, knees, speed, fridge lift</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h2{margin-top:26px}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:620px}canvas{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px;margin:8px 0}td,th{border:1px solid var(--line);padding:3px 7px;text-align:left;vertical-align:top}th{background:var(--panel)}button{font:inherit;padding:4px 10px}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}li{margin:4px 0}a{color:#9ad}</style>
<h1>G4c-a, revision 3: far arm, knees, snapmare speed, fridge lift</h1><div class="note"><b>For Derek to judge.</b> Normal-speed loops from the tie-up. Misses first, then the measures. Earlier pages: <a href="../g4c-a2/index.html">r2</a>, <a href="../g4c-a/index.html">first page</a>. <b>Pick the snapmare speed:</b> 1.5x is in the code, 2x is in the strips beside it.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Misses</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Atomic drop, the fridge lift (T4c.4f) with the knees fixed (T4c.4d): Lou on George</h2><div class="pair">${drops.map(r => cell(r, '.')).join('')}</div>
<h2>The old lift (r2), the toddler lift, for comparison</h2><div class="pair">${oldDrops.map(r => cell(r, '../g4c-a2', ' (r2)')).join('')}</div>
<h2>Snapmare at 1.5x (shipped), landing 260 px in front: Lou on George, George reverses inside the lift</h2><div class="pair">${s15.map(r => cell(r, '.')).join('')}</div>
<h2>Snapmare at 2x</h2><div class="pair">${s2.map(r => cell(r, '../g4c-a3-2x')).join('')}</div>
<h2>Measures (px at scale 1)</h2><table>${table}</table>
<h2>Snapmare speed and travel</h2><table>${snapTable}</table>
<h2>Knee flex through each clip (drawn joints, rad)</h2><table><tr><th>strip</th><th>w1 (Lou)</th><th>w2 (George)</th></tr>${kneeTable}</table>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
requestAnimationFrame(tick);document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
