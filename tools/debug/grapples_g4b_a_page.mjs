// G4b-a page (PLAN_GRAPPLES T4b.2): normal-speed loop strips first (one per attacker per facing, up = round the far side, then the same for
// down = the near side), then the misses from the data, then the table.   node tools/debug/grapples_g4b_a_page.mjs
// reads research/animation/grapples-2026-10/g4b-a/film.json (grapples_waistlock.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { WAISTLOCK, WAISTLOCK_POSES } from '../../src/animation/waistlock.js';

const root = 'research/animation/grapples-2026-10/g4b-a';
const runs = JSON.parse(readFileSync(`${root}/film.json`, 'utf8')).runs;
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const NAME = { 'lou-george': ['Lou', 'George'], 'george-lou': ['George', 'Lou'] }, F = { [-1]: 'facing left', 1: 'facing right' };
const ph = (r, p, k) => r.byPhase?.[p]?.[k] ?? 0;
const cell = (r) => `<div><canvas data-dir="frames/${r.id}" data-n="${r.frames}" width="380" height="330"></canvas><div class="cap">${r.id}: held ${r.heldMs} ms (circle ${WAISTLOCK.goBehind * 1000} ms, hold ${WAISTLOCK.timeout * 1000} ms, release ${WAISTLOCK.release.dur * 1000} ms)</div></div>`;

let strips = '';
for (const [side, label] of [['up', 'Up: round the far side'], ['down', 'Down: round the near side']]) {
    strips += `<h2>${label}</h2>`;
    for (const pair of ['lou-george', 'george-lou']) {
        const [A, D] = NAME[pair];
        strips += `<h3>${A} attacking ${D}</h3><div class="pair">${[-1, 1].map(f => runs.find(r => r.pair === pair && r.facing === f && r.id.endsWith(side))).map(cell).join('')}</div>`;
    }
}

const worst = (key, f) => Math.max(...runs.map(f ?? ((r) => r[key])));
const misses = [];
for (const pair of ['lou-george', 'george-lou']) {
    const [A, D] = NAME[pair], rs = runs.filter(r => r.pair === pair);
    const m = (f) => Math.max(...rs.map(f));
    misses.push(`<b>${A} on ${D}, the circle (D12):</b> the bodies overlap on screen while he passes: up to ${m(r => ph(r, 'goBehind', 'belowBody'))} px under the belt (leg or pelvis) and ${m(r => ph(r, 'goBehind', 'torso'))} px torso on torso, worst masked frame (every third frame). The depth lane (${WAISTLOCK.lane} px) moves him on screen, not apart, so passing him overlaps whatever the lane. Closest low-body approach in x ${m(r => r.circleClosestLow)} px.`);
    misses.push(`<b>${A} on ${D}, the circle's feet:</b> no steps in the circle, so his planted soles slide ${Math.min(...rs.map(r => r.slide['attacker.goBehind']))}-${m(r => r.slide['attacker.goBehind'])} px/frame (limit 2.5), plus ${Math.min(...rs.map(r => r.slide['attacker.goBehind.facingFlipFrame']))}-${m(r => r.slide['attacker.goBehind.facingFlipFrame'])} px on the one frame his facing flips as he passes the defender. Whole-body part step in the circle ${Math.min(...rs.map(r => r.stepGoBehind))}-${m(r => r.stepGoBehind)} px/frame (the tie-up's worst after the engage: ${m(r => r.stepTieUpWorst)}); first frame ${m(r => r.stepFirst)}.`);
    misses.push(`<b>${A} on ${D}, the hold:</b> overlap under the belt ${m(r => ph(r, 'hold', 'belowBody'))} px, torso on torso ${m(r => ph(r, 'hold', 'torso'))} px (want 0 / 0). Near hand to the waist point: max ${m(r => r.hands['attacker.near'].max)} px${m(r => r.hands['attacker.near'].outOfReach) ? `, out of the arm's reach by ${m(r => r.hands['attacker.near'].maxOver)} px in ${m(r => r.hands['attacker.near'].outOfReach)} frames (D12 wins, the bodies stay apart)` : ', in reach'}; far hand ${m(r => r.hands['attacker.far'].max)} px; the defender's hand on the attacker's wrist ${m(r => r.hands['defender.near'].max)} px. The hold's last circle frame still slides his soles ${m(r => r.slide['attacker.hold'])} px/frame, then 0.`);
    misses.push(`<b>${A} on ${D}, the let-go:</b> ${m(r => ph(r, 'release', 'belowBody'))} px of leg/pelvis overlap for a few frames as the hands leave (as in G4a's shove); the defender's planted soles slide ${m(r => r.slide['defender.release'])} px/frame in the push (no foot steps); when he is let go, move() turns him round to face the man behind him: whole-body step up to ${m(r => r.stepAfter)} px/frame in the next 8 frames.`);
}
misses.push(`<b>Open measures:</b> waist point is ${WAISTLOCK.waistRise} px above the hip joints (the near hand lands ${WAISTLOCK.waistFront} px in front of them); at 8 px (belly at the belt) the hand overlapped the defender's pelvis, which the D12 mask counts as under-belt body. The attacker's bend is ${WAISTLOCK_POSES.attacker.bend} rad (the tie-up's A-frame is .38), the hips ${WAISTLOCK.holdBehind} px behind the defender's, ${WAISTLOCK.upstage} px upstage. A sweep of 70-88 px spacing, bend .55-.85 and waist 8-36 px: smaller spacing or less bend put leg overlap back (up to 377 px) or short the hand; more bend put torso on torso on George (10 px at .85).`);
misses.push(`<b>Not built yet:</b> the switch, the rope break, the AI, kits and the registry id (T4b.3, T4b.4). Until then any wrestler can go behind with the flag on; the AI never presses power in a lockup, so only a held up or down can start it (read in AIHandler._handleLockup).`);

const rows = runs.map(r => `<tr><td>${r.id}</td><td>${ph(r, 'goBehind', 'belowBody')}</td><td>${ph(r, 'goBehind', 'torso')}</td><td>${ph(r, 'hold', 'belowBody')}</td><td>${ph(r, 'hold', 'torso')}</td><td>${ph(r, 'release', 'belowBody')}</td><td>${r.hands['attacker.near'].max}</td><td>${r.hands['attacker.far'].max}</td><td>${r.hands['defender.near'].max}</td><td>${r.slide['attacker.goBehind']} / ${r.slide['attacker.goBehind.facingFlipFrame']}</td><td>${r.slide['attacker.hold']}</td><td>${r.slide['defender.release']}</td><td>${r.stepFirst} / ${r.stepGoBehind} / ${r.stepHold} / ${r.stepRelease} / ${r.stepAfter}</td><td>${r.holdGapX} / ${r.holdDy}</td></tr>`).join('');
const manifest = {
    commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain -- src tools tests').length > 0, branch: sh('git branch --show-current'),
    rigs: 'thesz-procreate-v1 (Lou), george-roster-v1 (George)', flags: 'grapples=v1 (default) and waistlock=v1', tool: 'tools/debug/grapples_waistlock.mjs', seed: 11,
    input: 'frame 36: the attacker presses power with up (far side) or down (near side) held, from the tie-up, no other input',
    constants: { WAISTLOCK, WAISTLOCK_POSES }, measures: 'px at scale 1, px/frame at 60 fps; masks every third frame (grapples_masks.mjs); hands read every frame at full grip weight',
};
const html = `<!doctype html><meta charset="utf-8"><title>G4b-a: go-behind waistlock</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h2{margin-top:26px}h3{margin:18px 0 4px;color:#9ad}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:380px}canvas{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid var(--line);padding:3px 7px;text-align:right}th{background:var(--panel)}td:first-child{text-align:left}button{font:inherit;padding:4px 10px}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}li{margin:4px 0}</style>
<h1>G4b-a: the go-behind waistlock</h1><div class="note"><b>For Derek to judge.</b> Whether the A-frame shape is a waistlock at all (W3) and the layering (W4). Strips run at normal speed, a loop from the tie-up through the circle, the hold, and the let-go; nothing here says the shape is right. Misses first, then the table.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Misses</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
${strips}
<h2>Table (px at scale 1; px/frame at 60 fps)</h2><table><tr><th>run</th><th>circle: under belt</th><th>circle: torso</th><th>hold: under belt</th><th>hold: torso</th><th>release: under belt</th><th>near hand to waist</th><th>far hand</th><th>defender hand to wrist</th><th>circle sole slide / flip frame</th><th>hold sole slide</th><th>release slide (defender)</th><th>part step: first / circle / hold / release / after</th><th>hold gap x / dy</th></tr>${rows}</table>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
requestAnimationFrame(tick);document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
