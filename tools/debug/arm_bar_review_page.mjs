// node tools/debug/arm_bar_review_page.mjs <capture-root>
import { mkdirSync, cpSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const root = 'research/animation/light-moves-2026-11/armbar-v2';
const capture = process.argv[2];
const cases = ['lou-george-right', 'lou-george-left', 'george-lou-right', 'george-lou-left'];
mkdirSync(root, { recursive: true });
const data = {}, summaries = {};
for (const id of cases) {
    cpSync(`${capture}/${id}`, `${root}/after/${id}`, { recursive: true });
    for (const [which, dir] of [['before', '../t2-6b/armbar'], ['after', 'after']]) {
        data[`${id}/${which}`] = readdirSync(`${root}/${dir}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${dir}/${id}/${n}`);
    }
    summaries[id] = JSON.parse(readFileSync(`${capture}/${id}/audit.json`)).summary;
}
writeFileSync(`${root}/summary.json`, JSON.stringify(summaries, null, 2) + '\n');
const f = n => n.toFixed(3);
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kneeling arm bar review</title><style>
body{font:16px/1.5 system-ui;background:#f4f1ea;color:#221f19;max-width:1160px;margin:auto;padding:24px}h1{font-size:26px}h2{font-size:19px}section{border-top:1px solid #aaa;padding-top:15px;margin-top:30px}.pair{display:flex;gap:16px;flex-wrap:wrap}figure{margin:0;flex:1;min-width:320px}canvas{width:100%;height:auto;background:#222}button,select,input{font:inherit}nav{position:sticky;top:0;background:#f4f1ea;padding:12px;border-bottom:1px solid #aaa}table{border-collapse:collapse}th,td{text-align:left;padding:5px 20px 5px 0}.stills{display:flex;gap:8px}.stills img{width:150px;max-width:100%}</style>
<h1>Kneeling wrestling arm bar — review candidate</h1>
<p>Old arm bar at left, rebuilt kneeling hold at right. Both play at normal speed, 3.6 seconds. Lou and George, both facings. Candidate is under <code>?light=v1</code>; no commit.</p>
<p>The attacker kneels beside the receiver, holds the wrist and presses the forearm, then releases and steps back to stand. Damage and all three squeeze times are unchanged.</p>
<nav><button id="play">Pause</button> <select id="speed"><option value="1">Normal speed</option><option value="0.5">Half speed</option></select> <input id="frame" type="range" min="0" max="107" value="0" aria-label="Frame"></nav>
${cases.map(id => {const s = summaries[id]; return `<section><h2>${id.replaceAll('-', ' ')}</h2><div class="pair">${['before','after'].map(which=>`<figure><canvas width="540" height="350" data-key="${id}/${which}"></canvas><figcaption>${which==='before'?'Old arm bar':'Kneeling candidate'}</figcaption></figure>`).join('')}</div>
<table><tr><th>Candidate, held 1.05–3.0 s</th><th>Measured</th></tr><tr><td>Palm to wrist / forearm, maximum px</td><td>${f(s.maxWristGap)} / ${f(s.maxForearmGap)}</td></tr><tr><td>Pinned-joint frames, entire move</td><td>${s.pinnedFrames} / ${s.frames}</td></tr><tr><td>Support ankle slide, held, max px/frame</td><td>${f(s.maxHeldAnkleSlide)}</td></tr><tr><td>Drawn knee range, entire move, radians</td><td>${s.kneeRange.map(f).join(' to ')}</td></tr></table>
<div class="stills">${[.3,.9,1.4,2.4].map(t=>`<a href="after/${id}/still-${t}.png"><img src="after/${id}/still-${t}.png" alt="Candidate at ${t}s"></a>`).join('')}</div></section>`;}).join('')}
<p>Limits: numerical contact is measured only during the settled hold. Entry/release and the pose need visual review. This capture does not measure silhouette overlaps or pixel seam gaps. The arm remains slightly flexed; the free hand and leg react on each squeeze.</p>
<script>const data=${JSON.stringify(data)};const views=[...document.querySelectorAll('canvas')].map(c=>({c,ctx:c.getContext('2d'),images:data[c.dataset.key].map(src=>{const i=new Image();i.src=src;return i})}));let frame=0,playing=true,last=0,speed=1;play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play'};document.getElementById('speed').onchange=e=>speed=+e.target.value;document.getElementById('frame').oninput=e=>{frame=+e.target.value;playing=false;play.textContent='Play'};function tick(t){if(playing&&t-last>=1000/30/speed){last=t;frame=(frame+1)%108;document.getElementById('frame').value=frame}for(const v of views){const i=v.images[frame%v.images.length];if(i.complete&&i.naturalWidth)v.ctx.drawImage(i,0,0,540,350)}requestAnimationFrame(tick)}requestAnimationFrame(tick);</script></html>`;
writeFileSync(`${root}/index.html`, html);
console.log(`${root}/index.html`);
