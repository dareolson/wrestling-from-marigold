// G1 page (PLAN_GRAPPLES T1.4): normal-speed loop strips first (today | new, per case and facing), then the D8 layering alternative,
// then the measurement tables. Reads the film written by grapples_film.mjs.
//   node tools/debug/grapples_g1_page.mjs [root=research/animation/grapples-2026-10/g1]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'research/animation/grapples-2026-10/g1';
const film = JSON.parse(readFileSync(join(root, 'film.json'), 'utf8'));
const runs = film.runs;
const CASE = { a: '(a) even, then the drive, mid-ring, no input to the timeout and the break', b: '(b) driving: from the attacker\'s rope side, room to travel', c: '(c) steal: the defender presses grapple at 0.7 s', d: '(d) ropes: the defender starts 60 px (x scale) from the rope behind him' };
const PAIR = { 'lou-george': 'Lou attacker vs George', 'george-lou': 'George attacker vs Lou' };
const F = { l: 'facing left', r: 'facing right' };
const fx = (v, d = 1) => (v === null || v === undefined ? '&ndash;' : Number(v).toFixed(d));
const cell = (col, id, n, cap) => `<div class="cell"><canvas data-dir="frames/${col}/${id}" data-n="${n}" width="380" height="330"></canvas><div class="cap">${cap}</div></div>`;
const find = (col, id) => runs.find(r => r.column === col && r.id === id);

let html = `<!doctype html><meta charset="utf-8"><title>G1: the tie-up</title>
<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1700px}h1,h2{font-weight:600}h3{margin:18px 0 4px;color:#9ad}
.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:380px}canvas{background:#000;display:block}
.note{background:#2a2a2a;padding:8px 12px;border-left:3px solid #c84;margin:10px 0;max-width:1100px}table{border-collapse:collapse;font-size:12px;margin:8px 0}
td,th{border:1px solid #444;padding:3px 7px;text-align:right}th{background:#2a2a2a}td:first-child,th:first-child{text-align:left}button{font:inherit;padding:4px 10px}.bad{color:#f96}</style>
<h1>G1: the collar-and-elbow tie-up, today | new (<code>?grapples=v1</code>)</h1>
<div class="note"><b>For Derek to judge.</b> Forced lockups, 1/60 s steps, both facings, Lou and George as attacker. Every strip loops at normal speed (60 fps); today = the lockup as it plays now (0.8 s, same pose both sides), new = the flag branch (1.4 s: engage, tugs, drive, break). Numbers are in the tables below the strips and nothing here claims the result is right. <b>Asks:</b> is 1.4 s the right length; which hands fail as art; which layering order (strip below, case b).</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>`;

for (const c of ['a', 'b', 'c', 'd']) {
    html += `<h2>${CASE[c]}</h2>`;
    for (const pair of Object.keys(PAIR)) for (const f of ['l', 'r']) {
        const id = `${c}-${pair}-${f}`, t = find('today', id), n = find('new', id);
        if (!t || !n) continue;
        html += `<h3>${PAIR[pair]} &middot; ${F[f]}</h3><div class="pair">${cell('today', id, t.frames, `today: locked ${t.lockMs} ms, travel ${fx(t.travel.total)} px, feet overlap ${fx(t.footOverlap)} px`)}${cell('new', id, n.frames, `new: locked ${n.lockMs} ms, travel ${fx(n.travel.total)} px, feet overlap ${fx(n.footOverlap)} px`)}</div>`;
    }
}
html += `<h2>Layering (D8), case b</h2><p>Default (defender near arm in front of the attacker's near arm) | alternative (<code>&amp;grapplesLayer=alt</code>: the defender's near arm behind the attacker's).</p>`;
for (const pair of Object.keys(PAIR)) for (const f of ['l', 'r']) {
    const id = `b-${pair}-${f}`, n = find('new', id), a = find('alt', id);
    if (!n || !a) continue;
    html += `<h3>${PAIR[pair]} &middot; ${F[f]}</h3><div class="pair">${cell('new', id, n.frames, 'default order')}${cell('alt', id, a.frames, 'alt order')}</div>`;
}

// tables
html += `<h2>Measurements (new)</h2><p>px are at scale 1 (divided by the wrestler's perspective scale) unless noted; grips counted when their weight is 1; unreachable = more than 3 px from the target.</p>
<table><tr><th>run</th><th>grab order ms: A collar / A elbow / D collar / D elbow</th><th>hand-to-target px (max): A collar / A elbow / D collar / D elbow</th><th>unreachable frames</th><th>collar elbow flex rad</th><th>head gap px</th><th>hold gap px</th><th>ring travel px (total / after engage)</th><th>planted-foot slide px/frame (limit 2.5)</th><th>feet overlap px</th><th>max part step px/frame: engage / steal / break</th></tr>`;
const news = runs.filter(r => r.column === 'new' && r.case !== 'e');
for (const r of news) {
    const g = r.grabMs ?? {}, h = r.handErr ?? {}, u = r.unreachable ?? {};
    html += `<tr><td>${r.id}</td><td>${['attacker.collar', 'attacker.elbow', 'defender.collar', 'defender.elbow'].map(k => g[k] ?? '&ndash;').join(' / ')}</td>
<td>${['attacker.collar', 'attacker.elbow', 'defender.collar', 'defender.elbow'].map(k => fx(h[k], 1)).join(' / ')}</td><td>${Object.values(u).reduce((s, x) => s + x, 0)}</td>
<td>${r.flex ? `${r.flex.min}&ndash;${r.flex.max}` : '&ndash;'}</td><td>${r.headGap ? `${r.headGap.min}&ndash;${r.headGap.max}` : '&ndash;'}</td><td>${fx(r.holdGap)}</td>
<td>${fx(r.travel.total)} / ${fx(r.travel.afterEngage)}</td><td class="${r.plantedSlide > 2.5 ? 'bad' : ''}">${fx(r.plantedSlide, 2)}</td><td>${fx(r.footOverlap)}</td><td>${fx(r.stepEngage)} / ${fx(r.stepSteal)} / ${fx(r.stepBreak)}</td></tr>`;
}
html += `</table><h2>Measurements (today)</h2><table><tr><th>run</th><th>locked ms</th><th>ring travel px</th><th>planted-foot slide px/frame</th><th>feet overlap px</th><th>max part step px/frame (engage)</th></tr>`;
for (const r of runs.filter(r => r.column === 'today')) html += `<tr><td>${r.id}</td><td>${r.lockMs}</td><td>${fx(r.travel.total)}</td><td>${fx(r.plantedSlide, 2)}</td><td>${fx(r.footOverlap)}</td><td>${fx(r.stepEngage)}</td></tr>`;
html += `</table><h2>(e) Exits pressed at 0.8 s: the first-frame max part step (the Stage 3 list; no target)</h2><table><tr><th>exit</th><th>pair</th><th>facing</th><th>exit frame (ms into the lockup)</th><th>first-frame max part step px (attacker / defender)</th><th>next two frames</th><th>states after</th></tr>`;
for (const r of runs.filter(r => r.case === 'e')) html += `<tr><td>${r.exit} (${r.move})</td><td>${r.pair}</td><td>${r.facing < 0 ? 'L' : 'R'}</td><td>${r.exitMs ?? '&ndash;'}</td><td>${fx(r.firstFrameStep)} (${fx(r.firstFrameStepAttacker)} / ${fx(r.firstFrameStepDefender)})</td><td>${(r.first3 ?? []).slice(1).map(x => fx(x)).join(' / ')}</td><td>${(r.stateAfter ?? []).join(' / ')}</td></tr>`;
html += `</table><h2>Cost</h2><table><tr><th>pair / column</th><th>median ms per game step</th><th>mean</th><th>n</th></tr>${Object.entries(film.timing).map(([k, v]) => `<tr><td>${k}</td><td>${v.medianMs}</td><td>${v.meanMs}</td><td>${v.n}</td></tr>`).join('')}</table>
<script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;
const imgs=cvs.map(c=>{const n=+c.dataset.n;return Array.from({length:n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im})});
let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k];const im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};
document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal (1\\u00d7)'};
requestAnimationFrame(tick);
</script>`;
writeFileSync(join(root, 'index.html'), html);
console.log('wrote', join(root, 'index.html'));
