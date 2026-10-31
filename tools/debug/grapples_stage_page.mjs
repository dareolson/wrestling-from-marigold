// G3 and G4a pages (PLAN_GRAPPLES T3.3, T4a): normal-speed strips first, then the misses, then the table.
//   node tools/debug/grapples_stage_page.mjs g3 [override film.json ...]   node tools/debug/grapples_stage_page.mjs g4a
import { readFileSync, writeFileSync } from 'node:fs';

const which = process.argv[2], root = `research/animation/grapples-2026-10/${which}`;
const film = JSON.parse(readFileSync(`${root}/film.json`, 'utf8'));
for (const extra of process.argv.slice(3)) {   // refilmed runs replace theirs
    const more = JSON.parse(readFileSync(extra, 'utf8')).runs;
    film.runs = film.runs.filter(r => !more.some(m => m.id === r.id && m.column === r.column)).concat(more);
}
if (process.argv.length > 3) writeFileSync(`${root}/film.json`, JSON.stringify(film, null, 1));
const cell = (dir, n, cap) => `<div><canvas data-dir="${dir}" data-n="${n}" width="380" height="330"></canvas><div class="cap">${cap}</div></div>`;
const PAIR = { 'lou-george': 'Lou attacker vs George', 'george-lou': 'George attacker vs Lou' }, F = { [-1]: 'facing left', 1: 'facing right' };
const find = (col, id) => film.runs.find(r => r.column === col && r.id === id);
let body = '', title, misses;
if (which === 'g3') {
    title = 'G3: every exit from the tie-up';
    const news = film.runs.filter(r => r.column === 'new');
    const row = (r, t) => ({ r, t, miss: !t || r.maxStep200ms > t.maxStep200ms });
    const rows = news.map(r => row(r, find('today', r.id))).sort((a, b) => b.miss - a.miss || a.r.exit.localeCompare(b.r.exit));
    misses = `<li>Whip: when the defender turns to run, 119-121 px/frame at frame 9 (today 99-108). The lead-in cannot ease a facing flip.</li>
<li>Arm drag: first frame 5.5 px (today 0.01, it starts later), worst in 0.2 s 27.8 (today 42.9).</li><li>Exits use the plain lockup's hit timing, so a move can hit while the picture is still easing for up to 0.14 s.</li>`;
    for (const { r, t } of rows.filter(x => x.r.facing === 1)) {
        body += `<h3>${r.exit}: ${PAIR[r.pair]}</h3><div class="pair">${t ? cell(`frames/today/${r.id}`, t.frames, `today: first ${t.firstFrameStep}, worst in 0.2 s ${t.maxStep200ms}`) : ''}${cell(`frames/new/${r.id}`, r.frames, `new: first ${r.firstFrameStep}, worst in 0.2 s ${r.maxStep200ms}`)}</div>`;
    }
    body += `<h2>Table (max part step, px/frame, both facings)</h2><table><tr><th>run</th><th>first frame: today / new</th><th>worst in 0.2 s: today / new</th><th>states after</th></tr>${rows.map(({ r, t, miss }) => `<tr><td class="${miss ? 'bad' : ''}">${r.id}</td><td>${t?.firstFrameStep ?? '&ndash;'} / ${r.firstFrameStep}</td><td>${t?.maxStep200ms ?? '&ndash;'} / ${r.maxStep200ms}</td><td>${(r.stateAfter ?? []).join(', ')}</td></tr>`).join('')}</table>`;
} else {
    title = 'G4a: rope break and shove-off';
    misses = `<li>Rope break planted slide 2.93 and 2.53 px/frame on the two left-facing runs, limit 2.5.</li><li>Under the belt in the break: rope 5-85 px, shove 17-105 px of body overlap for a few frames as the hands leave.</li><li>Engage frame 0 boots as on the G1b page.</li>`;
    for (const c of ['rope', 'shove']) for (const pair of Object.keys(PAIR)) for (const f of ['l', 'r']) {
        const r = find('new', `${c}-${pair}-${f}`);
        if (r) body += `<h3>${c === 'rope' ? 'Rope break' : 'Shove-off'}: ${PAIR[pair]}, ${F[f === 'l' ? -1 : 1]}</h3><div class="pair">${cell(`frames/new/${r.id}`, r.frames, `travel ${r.travel.total}, break step ${r.stepBreak}, planted slide ${r.plantedSlide}`)}</div>`;
    }
    body += `<h2>Table (px at scale 1)</h2><table><tr><th>run</th><th>under belt body, break</th><th>torso</th><th>planted slide</th><th>break step</th><th>travel</th></tr>${film.runs.filter(r => r.column === 'new').map(r => `<tr><td>${r.id}</td><td>${r.byPhase.break?.belowBody}</td><td>${r.byPhase.break?.torso}</td><td class="${r.plantedSlide > 2.5 ? 'bad' : ''}">${r.plantedSlide}</td><td>${r.stepBreak}</td><td>${r.travel.total}</td></tr>`).join('')}</table>`;
}
const html = `<!doctype html><meta charset="utf-8"><title>${title.split(':')[0]}: tie-up</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h3{margin:18px 0 4px;color:#9ad}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:380px}canvas{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid var(--line);padding:3px 7px;text-align:right}th{background:var(--panel)}td:first-child{text-align:left}button{font:inherit;padding:4px 10px}.bad{color:#f96}</style>
<h1>${title}</h1><div class="note"><b>For Derek to judge.</b> Built on G1b before you judged it, so expect some rework. Normal speed; nothing here claims the result is right.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p><h2>Misses</h2><ul>${misses}</ul><h2>Strips</h2>${body}
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal (1\\u00d7)'};requestAnimationFrame(tick);</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
