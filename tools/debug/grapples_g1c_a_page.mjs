// G1c-a page: strips first (G1b | new), the 3x hip crops, then the misses and the table, all generated from the data.
//   node tools/debug/grapples_g1c_a_page.mjs     reads g1c-a/film.json (new column), g1c-a/baseline-g1b-*.json, g1b/film.json (G1b strips), crops/
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { LOCKUP, LOCKUP_POSES } from '../../src/animation/lockup.js';

const root = 'research/animation/grapples-2026-10/g1c-a', g1bRoot = 'research/animation/grapples-2026-10/g1b';
const film = JSON.parse(readFileSync(`${root}/film.json`, 'utf8')).runs.filter(r => r.column === 'new');
const g1bFilm = JSON.parse(readFileSync(`${g1bRoot}/film.json`, 'utf8')).runs.filter(r => r.column === 'new');
const baseFile = readdirSync(root).find(f => f.startsWith('baseline-g1b'));
const base = JSON.parse(readFileSync(`${root}/${baseFile}`, 'utf8'));
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const manifest = {
    commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain -- src tools tests').length > 0, branch: sh('git branch --show-current'),
    baseline: baseFile, g1bStrips: 'g1b/frames (ea8c542 film, same stance as the baseline)', rigs: 'thesz-procreate-v1 (Lou), george-roster-v1 (George)', flags: 'grapples=v1 only', seed: 11,
    constants: { LOCKUP_POSES, legGain: LOCKUP.legGain, holdGap: LOCKUP.holdGap, engageEnd: LOCKUP.engageEnd, timeout: LOCKUP.timeout },
};
const NAME = { 'lou-george': ['Lou', 'George'], 'george-lou': ['George', 'Lou'] }, F = { l: 'facing left', r: 'facing right' };
const idOf = (pair, f) => `a-${pair}-${f}`;
const PH = ['engage', 'even', 'drive', 'break'];
const worst = (sumSide, key, pick) => { let w = null; for (const ph of PH) { const x = sumSide[ph]?.[key]; if (x && (!w || pick(x.v, w.v))) w = { ...x, ph }; } return w; };
const lo = (a, b) => a < b, hi = (a, b) => a > b;
const MEASURES = [['kneeLine', 'knee line (px, >= -0.5)', lo], ['ankleStagger', 'ankle stagger (px, >= 20)', lo], ['kneeStagger', 'knee stagger (px, >= 14)', lo], ['soleDelta', 'planted sole vs idle (px, <= 1.5)', hi], ['trunksDelta', 'trunks share vs idle (points, <= 10)', hi], ['snapHip', 'hip angle step (rad/frame)', hi], ['snapKnee', 'knee line step (px/frame)', hi]];
const fmt = (w) => (w ? `${w.v} <small>${w.ph} f${w.i}${w.leg ? ' ' + w.leg : ''}</small>` : '&ndash;');
const limit = { kneeLine: (v) => v < -0.5, ankleStagger: (v) => v < 20, kneeStagger: (v) => v < 14, soleDelta: (v) => v > 1.5, trunksDelta: (v) => v > 10 };

let strips = '', rows = '', misses = [];
for (const pair of ['lou-george', 'george-lou']) for (const f of ['r', 'l']) {
    const id = idOf(pair, f), n = film.find(r => r.id === id), o = g1bFilm.find(r => r.id === id);
    const [A, D] = NAME[pair];
    strips += `<h3>${A} attacking ${D}, ${F[f]}</h3><div class="pair"><div><canvas data-dir="../g1b/frames/new/${id}" data-n="${o.frames}" width="380" height="330"></canvas><div class="cap">G1b (ea8c542)</div></div><div><canvas data-dir="frames/new/${id}" data-n="${n.frames}" width="380" height="330"></canvas><div class="cap">new stance</div></div></div>`;
    const b = base.find(r => r.pair === pair && r.facing === (f === 'r' ? 1 : -1));
    for (const side of ['a', 'd']) {
        const man = side === 'a' ? `${A} (attacker)` : `${D} (defender)`;
        rows += `<tr><th colspan="8">${man}, ${pair}, ${F[f]}</th></tr>`;
        for (const [k, label, pick] of MEASURES) {
            const w0 = worst(b.summary[side], k, pick), w1 = worst(n.legs[side], k, pick);
            rows += `<tr><td>${label}</td><td>${fmt(w0)}</td><td class="${w1 && limit[k]?.(w1.v) ? 'bad' : ''}">${fmt(w1)}</td></tr>`;
        }
    }
    for (const x of n.legFails.filter(x => x.side)) misses.push(`${A} v ${D}, ${F[f]}: ${x.side === 'a' ? A : D} ${x.measure} ${x.value} in ${x.phase} (frame ${x.i}${x.leg ? ', ' + x.leg + ' leg' : ''})`);
    for (const [k, v] of Object.entries(n.handErr)) if (v > 3) misses.push(`${A} v ${D}, ${F[f]}: hand ${k} ${v} px off (${n.contactMisses[k]} frames over 3 px; G1b ${o.handErr[k]}). Not moved by the stance; D12 / D13 beat the contact, so it stays.`);
    for (const ph of PH) { const p = n.byPhase[ph]; if (p?.belowBody > 0) misses.push(`${A} v ${D}, ${F[f]}: D12, ${p.belowBody} px of leg/pelvis overlap in the ${ph}, worst masked sample, every third frame (G1b ${o.byPhase[ph].belowBody})`); }
    if (n.plantedSlide > 2.5) misses.push(`${A} v ${D}, ${F[f]}: planted foot slide ${n.plantedSlide} px/frame`);
}
const uniq = [...new Set(misses)];
const crops = ['lou-george', 'george-lou'].map(pair => ['a', 'd'].map(side => {
    const [A, D] = NAME[pair], who = side === 'a' ? A : D;
    return `<div class="crop"><b>${who}</b> (${side === 'a' ? 'attacker' : 'defender'} in ${pair})<div class="pair"><div><img src="crops/${pair}-${side}-idle.png" width="450"><div class="cap">idle</div></div><div><img src="crops/${pair}-${side}-held.png" width="450"><div class="cap">held, frame 40</div></div></div></div>`;
}).join('')).join('');
const html = `<!doctype html><meta charset="utf-8"><title>G1c-a: the stance</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h3{margin:18px 0 4px;color:#9ad}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:380px}canvas{background:#000;display:block;max-width:100%}img{image-rendering:pixelated;background:#000;display:block;max-width:100%}.crop{margin:10px 0}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid var(--line);padding:3px 7px;text-align:right}th{background:var(--panel)}td:first-child{text-align:left}button{font:inherit;padding:4px 10px}.bad{color:#f96}small{color:#999}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}</style>
<h1>G1c-a: the stance</h1><div class="note"><b>For Derek to judge.</b> Engage, even, drive and break only, case a (no input), both rigs attacking, both facings. Nothing here says the legs look right; the numbers are proxies for D13. Strips run at normal speed.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Strips: G1b | new</h2>${strips}
<h2>Hip crops, 3&times;: idle beside the held pose</h2>${crops}
<h2>Misses (from the data)</h2><ul>${uniq.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Worst of each measure, engage / even / drive / break (px at scale 1)</h2><p>Geometry every frame; trunks masks every third frame. Idle for the rig and facing passes every threshold. G1b numbers are re-measured with this page's definitions.</p>
<table><tr><th>measure</th><th>G1b</th><th>new</th></tr>${rows}</table>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
requestAnimationFrame(tick);document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`, uniq.length, 'misses');
