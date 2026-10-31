// G1b page (PLAN_GRAPPLES T1.10): normal-speed strips first (today | G1 | new), then the misses, then the table and the worst masks.
//   node tools/debug/grapples_g1b_page.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = 'research/animation/grapples-2026-10/g1b', base = 'research/animation/grapples-2026-10/g1b-base';
const film = JSON.parse(readFileSync(`${root}/film.json`, 'utf8')), old = JSON.parse(readFileSync(`${base}/film.json`, 'utf8'));
const CASES = { a: 'Even, then the drive, no input, then the break', c: 'Steal at 0.7 s', d2: 'Ropes: the drive stalls, 40 px out', b: 'Driving, room to travel' };
const PAIR = { 'lou-george': 'Lou attacker vs George', 'george-lou': 'George attacker vs Lou' }, F = { l: 'facing left', r: 'facing right' };
const find = (runs, col, id) => runs.find(r => r.column === col && r.id === id);
const cell = (dir, n, cap) => `<div class="cell"><canvas data-dir="${dir}" data-n="${n}" width="380" height="330"></canvas><div class="cap">${cap}</div></div>`;
const worst = (r, k) => Math.max(...Object.entries(r.byPhase ?? {}).filter(([p]) => !['after'].includes(p)).map(([, v]) => v[k]));
const cap = (r) => `daylight ${r.ankleDaylight}, under the belt ${worst(r, 'belowBody')}, torso ${worst(r, 'torso')}`;

let html = `<!doctype html><meta charset="utf-8"><title>G1b: upper body only</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h3{margin:18px 0 4px;color:#9ad}
.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:380px}canvas{background:#000;display:block;max-width:100%}
.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px;margin:8px 0}td,th{border:1px solid var(--line);padding:3px 7px;text-align:right}th{background:var(--panel)}td:first-child{text-align:left}button{font:inherit;padding:4px 10px}.bad{color:#f96}img{max-width:380px}</style>
<h1>G1b: upper body only (D12)</h1>
<div class="note"><b>For Derek to judge.</b> Left to right: today, what you saw at G1, new. Every strip is normal speed. Nothing here claims the result is right. <b>Still open from G1:</b> is 1.4 s the right length; which hands fail as art; which layering order.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>`;
for (const c of Object.keys(CASES)) {
    html += `<h2>${CASES[c]}</h2>`;
    for (const pair of Object.keys(PAIR)) for (const f of ['l', 'r']) {
        if (c === 'b' && f === 'r') continue;
        const id = `${c}-${pair}-${f}`, t = find(old.runs, 'today', id), g = find(old.runs, 'new', id), n = find(film.runs, 'new', id);
        if (!t || !g || !n) continue;
        html += `<h3>${PAIR[pair]} &middot; ${F[f]}</h3><div class="pair">${cell(`../g1b-base/frames/today/${id}`, t.frames, `today: ${cap(t)}`)}${cell(`../g1b-base/frames/new/${id}`, g.frames, `G1: ${cap(g)}`)}${cell(`frames/new/${id}`, n.frames, `new: ${cap(n)}`)}</div>`;
    }
}
html += `<h2>Misses</h2><ul>
<li>Under the belt, engage: 81-368 px of body overlap on the first frames. It is boots at the film's 90 px start in the idle stance; today has the same (82-267). Not fixed.</li>
<li>Under the belt, break: 21-139 px for a few frames: a hand on the other man's trunk at belt height as he lets go.</li>
<li>Ankle daylight target 8 px: 6.3 on the first run after a page load (frame 0, idle stance), 15-40 otherwise.</li>
<li>George's attacker collar: 2 frames over 3 px in the engage (9.3 px), still reaching.</li>
<li>Break step 44-55 px/frame (43 at G1 Lou, 42 George): the arms now go home fast.</li>
<li>Guido and Kowalski at gap 80, not tuned: torso on torso 50-166 px, every grip within 1.6 px.</li>
<li>The elbow hand sits on the partner's forearm, past the elbow: at the elbow itself Lou's hand misses by 30 px.</li></ul>
<h2>Table (new, worst per phase, px at scale 1)</h2><table><tr><th>run</th><th>ankle daylight</th><th>under belt body: engage / even / drive / steal / stall / break</th><th>torso on torso</th><th>contact misses (&gt; 3 px)</th><th>out of reach frames</th><th>hand px A collar / A cup</th><th>head gap</th><th>travel</th><th>planted slide</th><th>step: engage / steal / break</th></tr>`;
for (const r of film.runs.filter(x => x.column === 'new')) {
    const p = r.byPhase, u = ['engage', 'even', 'drive', 'steal', 'stall', 'break'].map(k => p[k]?.belowBody ?? '&ndash;').join(' / ');
    html += `<tr><td>${r.id}</td><td class="${r.ankleDaylight < 8 ? 'bad' : ''}">${r.ankleDaylight}</td><td>${u}</td><td>${worst(r, 'torso')}</td><td>${Object.values(r.contactMisses).reduce((a, b) => a + b, 0)}</td><td>${Object.values(r.outOfReach).reduce((a, b) => a + b, 0)}</td><td>${r.handErr['attacker.collar']} / ${r.handErr['attacker.elbow']}</td><td>${r.headGap.min}-${r.headGap.max}</td><td>${r.travel.total}</td><td>${r.plantedSlide}</td><td>${r.stepEngage} / ${r.stepSteal} / ${r.stepBreak}</td></tr>`;
}
html += `</table><h2>Worst masks (white = under the belt, yellow = torso on torso, green = arms and heads)</h2><div class="pair">`;
for (const id of ['a-lou-george-r', 'a-george-lou-r', 'c-lou-george-r', 'c-george-lou-r']) if (existsSync(`${root}/frames/new/${id}-mask.png`)) html += `<div><img src="frames/new/${id}-mask.png"><div class="cap">${id}</div></div>`;
html += `</div><script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;
const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));
let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};
document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal (1\\u00d7)'};
requestAnimationFrame(tick);
</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
