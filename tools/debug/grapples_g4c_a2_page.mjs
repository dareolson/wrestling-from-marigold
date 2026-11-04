// G4c-a page, revision 2 (PLAN_GRAPPLES T4c.4b): the four strips redone after Derek's notes, misses first, the five fixes measured; the first page stays
// below as a link.   node tools/debug/grapples_g4c_a2_page.mjs   reads research/animation/grapples-2026-10/g4c-a2/film.json (grapples_g4c_a.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { ATOMIC, SNAPMARE } from '../../src/animation/waistlockThrows.js';

const root = 'research/animation/grapples-2026-10/g4c-a2';
const film = JSON.parse(readFileSync(`${root}/film.json`, 'utf8')), runs = film.runs;
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const F = { [-1]: 'attacker first facing left', 1: 'attacker first facing right' };
const drops = runs.filter(r => r.kind === 'drop'), snaps = runs.filter(r => r.kind === 'snapmare');
const mx = (rs, f) => Math.max(...rs.map(f));
const cell = (r) => `<div><canvas data-dir="frames/${r.id}" data-n="${r.frames}" width="460" height="360"></canvas><div class="cap">${r.id}: ${F[r.facing]}; clip starts at frame ${r.clipStart}</div></div>`;
const s0 = snaps[0], d0 = drops[0];
const misses = [
    `<b>The lead-in step is still there:</b> first-clip-frame max part step ${mx(drops, r => r.stepFirst)} px for the drop, ${mx(snaps, r => r.stepFirst)} px for the snapmare, against the tie-up's worst ${mx(runs, r => r.stepTieUpWorst)} px. The drop's is the lift (peak ${ATOMIC.liftPeak}) arriving, the snapmare's is Codex's blend (the snapmare now starts from the live drop pose through the draw blend; no pop at the first frame beyond this number).`,
    `<b>D12 overlap is not cleared:</b> drop below-belt max ${mx(drops, r => Math.max(...Object.values(r.mask).map(m => m.belowBody)))} px, torso ${mx(drops, r => Math.max(...Object.values(r.mask).map(m => m.torso)))} px; snapmare below-belt max ${mx(snaps, r => Math.max(...Object.values(r.mask).map(m => m.belowBody)))} px, torso ${mx(snaps, r => Math.max(...Object.values(r.mask).map(m => m.torso)))} px (flip, listed on the first page too). Layering is not clearance.`,
    `<b>Item 3 is not what the note says:</b> the thrower's arms are already behind the thrown man for the whole second layer window (every part of his, measured at 3-frame steps from 0.633 s to the end: depth below every thrown part). Pushing his whole body 0.5 behind changes nothing in frame 130 (same pixels as shipped). The forearm and hands crossing the thrown man's chest toward the thrower's chin are the <b>thrown man's own arms</b>: the flip's tuck (arms 1.6 to 0.8) swings them at the thrower. I did not change them: say if you want them across his own chest instead.`,
    `<b>Still open from the first page:</b> hands to the head, foot support, the supported kneel, facing snap at the end. Not touched here.`,
];
const table = `<tr><th>fix</th><th>measure</th><th>value</th></tr>
<tr><td>1 lift higher</td><td>defender's pelvis over the attacker's pelvis at the top of the lift (frame ${d0.liftTop.frame}); attacker's chest over his pelvis</td><td>${d0.liftTop.pelvisOverAttackerPelvis} px (was 55 lift); chest ${d0.liftTop.attackerChestOverPelvis} px</td></tr>
<tr><td>1 snapmare first frame</td><td>max part step, first clip frame</td><td>${s0.stepFirst} px (was 45.2); the clip's first key still says lift 20, the draw blend carries the live drop pose across</td></tr>
<tr><td>2 one flip</td><td>total rotation at the landing; peak; worst step</td><td>${s0.flip.degrees}&deg; (${s0.flip.tiltEnd} rad), peak ${s0.flipTiltMax} rad, ${s0.flip.radPerFrameMax} rad/frame max in ${SNAPMARE.flip} s (was 630&deg;, 11 rad). PEAK stays 110.</td></tr>
<tr><td>3 arms behind</td><td>layer order</td><td>already correct; see misses</td></tr>
<tr><td>4 arms drop</td><td>thrower's worst wrist to his pelvis: landing / +0.1 / +0.2 / +0.3 s</td><td>${Object.values(s0.throwerArmsWristToPelvis).join(' / ')} px (hanging)</td></tr>
<tr><td>5 boot clear</td><td>thrower's nearest ankle to the thrown man's neck after the landing</td><td>${s0.bootToHeadMin.px} px (was 11.5); landFwd 185 to ${SNAPMARE.landFwd}; lands ${s0.landDistance} px in front, ring margin ${Math.min(...snaps.map(r => r.landMargin))} px</td></tr>`;
const manifest = { commit: film.commit, dirty: sh('git status --porcelain -- src tools tests').length > 0, branch: sh('git branch --show-current'), rigs: 'Lou (thesz-procreate-v1) on George (george-roster-v1)', tool: 'tools/debug/grapples_g4c_a.mjs', constants: { ATOMIC, SNAPMARE } };
const html = `<!doctype html><meta charset="utf-8"><title>G4c-a r2: atomic drop and snapmare</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h2{margin-top:26px}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:460px}canvas{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px;margin:8px 0}td,th{border:1px solid var(--line);padding:3px 7px;text-align:left}th{background:var(--panel)}button{font:inherit;padding:4px 10px}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}li{margin:4px 0}a{color:#9ad}</style>
<h1>G4c-a, revision 2 (T4c.4b): higher lift, one flip, arms, boot</h1><div class="note"><b>For Derek to judge.</b> Normal-speed loops from the tie-up. Misses first, then the five fixes measured. The first G4c-a page (before these fixes) is kept: <a href="../g4c-a/index.html">first page, old strips</a>.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Misses</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Atomic drop: Lou on George</h2><div class="pair">${drops.map(cell).join('')}</div>
<h2>Snapmare reversal: Lou on George, George reverses inside the lift</h2><div class="pair">${snaps.map(cell).join('')}</div>
<h2>The five fixes (px at scale 1)</h2><table>${table}</table>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
requestAnimationFrame(tick);document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
