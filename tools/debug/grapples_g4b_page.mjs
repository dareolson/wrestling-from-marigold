// G4b page (PLAN_GRAPPLES T4b.5): normal-speed loop strips of each ending (the timeout's shove, the attacker's shove-off, the switch, the rope
// break), both attackers, both facings, far side; then the misses from the data, the gates and the table.   node tools/debug/grapples_g4b_page.mjs
// reads research/animation/grapples-2026-10/g4b/film.json (WL_CASES=timeout,shove,switch,rope grapples_waistlock.mjs) and soak-summary.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { WAISTLOCK, WAISTLOCK_POSES } from '../../src/animation/waistlock.js';

const root = 'research/animation/grapples-2026-10/g4b';
const runs = JSON.parse(readFileSync(`${root}/film.json`, 'utf8')).runs;
const gates = existsSync(`${root}/gates.json`) ? JSON.parse(readFileSync(`${root}/gates.json`, 'utf8')) : null;
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const NAME = { 'lou-george': ['Lou', 'George'], 'george-lou': ['George', 'Lou'] }, F = { [-1]: 'facing left', 1: 'facing right' };
const CASE = { timeout: ['Timeout', 'no input: the hold lets go on its own at 1.6 s and pushes him forward'], shove: ['Shove-off', 'the attacker presses action 20 frames into the hold'],
    switch: ['Switch', 'the defender presses action 20 frames into the hold; the new attacker goes behind, and the hold then times out'], rope: ['Rope break', 'the defender starts 125 px inside the rope behind him, so the attacker\'s spot is inside the rope\'s reach'] };
const ph = (r, p, k) => r.byPhase?.[p]?.[k] ?? 0;
const phs = (r, p, k) => r.byPhase?.[p]?.[k] ?? '&ndash; (no such phase)';
const cell = (r) => `<div><canvas data-dir="frames/${r.id}" data-n="${r.frames}" width="380" height="330"></canvas><div class="cap">${r.id}: held ${r.heldMs} ms</div></div>`;

let strips = '';
for (const c of Object.keys(CASE)) {
    strips += `<h2>${CASE[c][0]}</h2><p class="cap">${CASE[c][1]}</p>`;
    for (const pair of ['lou-george', 'george-lou']) {
        const [A, D] = NAME[pair];
        strips += `<h3>${A} attacking ${D}</h3><div class="pair">${[-1, 1].map(f => runs.find(r => r.case === c && r.pair === pair && r.facing === f && r.id.endsWith('-up'))).filter(Boolean).map(cell).join('')}</div>`;
    }
}
const worst = (f) => Math.max(...runs.map(f));
const misses = [
    `<b>The circle (unchanged, polish list):</b> overlap while he passes up to ${worst(r => ph(r, 'goBehind', 'belowBody'))} px under the belt and ${worst(r => ph(r, 'goBehind', 'torso'))} px torso on torso (every frame); ankle movement up to ${worst(r => r.slide['attacker.goBehind'])} px/frame plus ${worst(r => r.slide['attacker.goBehind.facingFlipFrame'] ?? 0)} on the flip frame. Footwork, turn and route are not worked on.`,
    `<b>The hold, every ending:</b> overlap under the belt ${worst(r => ph(r, 'hold', 'belowBody'))} px and torso on torso ${worst(r => ph(r, 'hold', 'torso'))} px, worst of ${runs.length} runs; George's near hand out of reach by up to ${worst(r => r.hands['attacker.near']?.maxOver ?? -99)} px (D12 wins).`,
    `<b>The let-go:</b> leg/pelvis overlap for a few frames as the hands leave, up to ${worst(r => ph(r, 'release', 'belowBody'))} px; the defender's planted soles slide up to ${worst(r => r.slide['defender.release'] ?? 0)} px/frame in the shove; the turn after it is one frame (the game's own idle flip).`,
    `<b>Switch:</b> the new attacker's facing flips in one frame when the hitch ends (he turns to face the man he is going behind).`,
    `<b>Rope break:</b> the defender walks off the rope (the attacker's back is to it) rather than the attacker stepping back. A go-behind whose spot would be past the ropes is denied, so the tie-up goes on; it is not a rope break.`,
    `<b>AI:</b> the AI attacker never ends a hold early (the timeout's shove only); the AI defender rolls its reversal once per hold. The odds are first drafts: Lou go-behind .20 / switch .30, George .10 / .15.`,
    `<b>Coverage:</b> the baseline goes 23 -> 24 gaps (goBehind, unverified: no clip, no critic spec).`,
];
const rows = runs.map(r => `<tr><td>${r.id}</td><td>${r.heldMs}</td><td>${ph(r, 'goBehind', 'belowBody')} / ${ph(r, 'goBehind', 'torso')}</td><td>${phs(r, 'hold', 'belowBody')} / ${phs(r, 'hold', 'torso')}</td><td>${ph(r, 'release', 'belowBody')}</td><td>${r.hands['attacker.near']?.max ?? '&ndash;'}</td><td>${r.slide['attacker.hold'] ?? '&ndash;'}</td><td>${r.slide['defender.release'] ?? '&ndash;'}</td><td>${r.stepFirst} / ${r.stepGoBehind} / ${r.stepHold} / ${r.stepRelease} / ${r.stepAfter}</td></tr>`).join('');
const soak = existsSync(`${root}/soak-summary.json`) ? JSON.parse(readFileSync(`${root}/soak-summary.json`, 'utf8')) : null;
const manifest = { commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain -- src tools tests').length > 0, branch: sh('git branch --show-current'),
    rigs: 'thesz-procreate-v1 (Lou), george-roster-v1 (George)', flags: 'grapples=v1 (default) and waistlock=v1', tool: 'tools/debug/grapples_waistlock.mjs (WL_CASES)', seed: 11,
    input: 'frame 36: the attacker presses power with up (far side) held; each case then scripts its ending as described above', constants: { WAISTLOCK, WAISTLOCK_POSES } };
const html = `<!doctype html><meta charset="utf-8"><title>G4b: go-behind waistlock endings</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h2{margin-top:26px}h3{margin:18px 0 4px;color:#9ad}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:760px}canvas{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid var(--line);padding:3px 7px;text-align:right}th{background:var(--panel)}td:first-child{text-align:left}button{font:inherit;padding:4px 10px}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}li{margin:4px 0}</style>
<h1>G4b: the go-behind waistlock and its endings</h1><div class="note"><b>For Derek to judge.</b> Four endings, both attackers, both facings, normal-speed loops from the tie-up. Nothing here says the look is right. Misses first, then the soak and gates, then the table. <code>?waistlock=v1</code> stays opt-in; power with up or down held in a tie-up goes behind, the defender's action reverses it.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Misses</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
${soak ? `<h2>AI soak (waistlock=v1, both orders, ${soak.note})</h2><pre>${JSON.stringify(soak.runs, null, 1)}</pre>` : ''}
${gates ? `<h2>Gates</h2><pre>${gates.lines.join('\n')}</pre>` : ''}
${strips}
<h2>Table (px at scale 1; px/frame at 60 fps; masks every frame)</h2><table><tr><th>run</th><th>held ms</th><th>circle: under belt / torso</th><th>hold: under belt / torso</th><th>let-go: under belt</th><th>near hand to waist</th><th>hold sole slide</th><th>defender slide in the let-go</th><th>part step: first / circle / hold / let-go / after</th></tr>${rows}</table>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
requestAnimationFrame(tick);document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
