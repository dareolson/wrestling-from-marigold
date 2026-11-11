// node tools/debug/arm_bar_review_page.mjs <new-capture> <candidate-capture>   (T2.7: candidate = 15e7d5e armBarV2, new = the fixes; same framing)
import { mkdirSync, cpSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const root = 'research/animation/light-moves-2026-11/t2-7';
const capture = process.argv[2], candCapture = process.argv[3];
const cases = ['lou-george-right', 'lou-george-left', 'george-lou-right', 'george-lou-left'];
mkdirSync(root, { recursive: true });
const data = {}, summaries = {};
for (const id of cases) {
    cpSync(`${capture}/${id}`, `${root}/after/${id}`, { recursive: true });
    cpSync(`${candCapture}/${id}`, `${root}/before/${id}`, { recursive: true });
    for (const [which, dir] of [['before', 'before'], ['after', 'after']]) {
        data[`${id}/${which}`] = readdirSync(`${root}/${dir}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${dir}/${id}/${n}`);
    }
    summaries[id] = { after: JSON.parse(readFileSync(`${capture}/${id}/audit.json`)).summary, before: JSON.parse(readFileSync(`${candCapture}/${id}/audit.json`)).summary };
}
writeFileSync(`${root}/summary.json`, JSON.stringify(summaries, null, 2) + '\n');
const f = n => n.toFixed(1);
const kn = k => k.map(r => r[0] === r[1] ? f(r[0]) : `${f(r[0])}..${f(r[1])}`).join(' / ');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arm bar fixes review</title><style>
body{font:16px/1.5 system-ui;background:#f4f1ea;color:#221f19;max-width:1160px;margin:auto;padding:24px}h1{font-size:26px}h2{font-size:19px}section{border-top:1px solid #aaa;padding-top:15px;margin-top:30px}.pair{display:flex;gap:16px;flex-wrap:wrap}figure{margin:0;flex:1;min-width:320px}canvas{width:100%;height:auto;background:#222}button,select,input{font:inherit}nav{position:sticky;top:0;background:#f4f1ea;padding:12px;border-bottom:1px solid #aaa}table{border-collapse:collapse}th,td{text-align:left;padding:4px 18px 4px 0}.stills{display:flex;gap:8px;flex-wrap:wrap}.stills img{width:170px;max-width:100%}</style>
<h1>Kneeling arm bar, T2.7 fixes</h1>
<p>Left: Codex's candidate (15e7d5e). Right: the fixes. Both under <code>?light=v1</code>, same 3.6 s timing, grips, squeezes and damage. Lou and George, both facings, normal speed (30 fps loops). Changes: both knees down with the shins flat behind them, he kneels at the shoulder on the camera side (front of the mat, y +40) with the man eased 30 px back, hands low while he walks in and up with the reach; his legs stack by rig (Lou far leg, torso, near leg; George both legs over the torso) and his far arm sits behind his torso; the man sells harder (steady strain, then a hard curl, free arm slap, knee draw and hip lift on each squeeze).</p>
<nav><button id="play">Pause</button> <select id="speed"><option value="1">Normal speed</option><option value="0.5">Half speed</option></select> <input id="frame" type="range" min="0" max="107" value="0" aria-label="Frame"></nav>
${cases.map(id => {const a = summaries[id].after, b = summaries[id].before; return `<section><h2>${id.replaceAll('-', ' ')}</h2><div class="pair">${['before','after'].map(which=>`<figure><canvas width="540" height="350" data-key="${id}/${which}"></canvas><figcaption>${which==='before'?'Candidate 15e7d5e':'T2.7 fixes'}</figcaption></figure>`).join('')}</div>
<table><tr><th>Held 1.05 to 3.0 s</th><th>Candidate</th><th>Fixes</th><th>Bar</th></tr>
<tr><td>His legs, hips drawn over the man's legs (px)</td><td>${b.heldLowerMax.legs}</td><td>${a.heldLowerMax.legs}</td><td>0</td></tr>
<tr><td>His legs and hips over the man's belly (px, hip half of the torso)</td><td>${b.heldLowerMax.belly}</td><td>${a.heldLowerMax.belly}</td><td>0 (not met)</td></tr>
<tr><td>D12 below the belt / torso on torso / above (px, worst held frame)</td><td>${b.heldMaskMax.belowBody} / ${b.heldMaskMax.torso} / ${b.heldMaskMax.above}</td><td>${a.heldMaskMax.belowBody} / ${a.heldMaskMax.torso} / ${a.heldMaskMax.above}</td><td>report</td></tr>
<tr><td>Knee height above the mat, near / far (px)</td><td>${kn(b.heldKneeToMat)}</td><td>${kn(a.heldKneeToMat)}</td><td>within 6</td></tr>
<tr><td>Palm to wrist / forearm, max px</td><td>${b.maxWristGap.toFixed(3)} / ${b.maxForearmGap.toFixed(3)}</td><td>${a.maxWristGap.toFixed(3)} / ${a.maxForearmGap.toFixed(3)}</td><td>held</td></tr>
<tr><td>Pinned frames / ankle slide</td><td>${b.pinnedFrames} / ${b.maxHeldAnkleSlide}</td><td>${a.pinnedFrames} / ${a.maxHeldAnkleSlide}</td><td>0 / 0</td></tr>
<tr><td>His worst step in and out at separation 70 (px/frame)</td><td>${b.hipStep.toFixed(1)}</td><td>${a.hipStep.toFixed(1)}</td><td>report</td></tr></table>
<div class="stills">${[.3,.9,1.4,2.4].map(t=>`<a href="after/${id}/still-${t}.png"><img src="after/${id}/still-${t}.png" alt="Fixes at ${t}s"></a>`).join('')}</div></section>`;}).join('')}
<p>Misses: the belly bar is not met (his thigh and trunks still cross the hip half of the man's torso, a few hundred px); torso on torso is about 1400 px (he leans over the man's chest and head), up from 0; the man slides 30 px back over the entry and he covers 110 px in 0.95 s (peak step over the candidate's 2.1); the camera-side offset is at the mat's front limit, so a man downed near the back rope clamps his 30 px and overlap returns; separations 50/150/210 not rerun; Kowalski and Guido unchecked. Whether it reads as a kneeling arm bar is Derek's call.</p>
<script>const data=${JSON.stringify(data)};const views=[...document.querySelectorAll('canvas')].map(c=>({c,ctx:c.getContext('2d'),images:data[c.dataset.key].map(src=>{const i=new Image();i.src=src;return i})}));let frame=0,playing=true,last=0,speed=1;play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play'};document.getElementById('speed').onchange=e=>speed=+e.target.value;document.getElementById('frame').oninput=e=>{frame=+e.target.value;playing=false;play.textContent='Play'};function tick(t){if(playing&&t-last>=1000/30/speed){last=t;frame=(frame+1)%108;document.getElementById('frame').value=frame}for(const v of views){const i=v.images[frame%v.images.length];if(i.complete&&i.naturalWidth)v.ctx.drawImage(i,0,0,540,350)}requestAnimationFrame(tick)}requestAnimationFrame(tick);</script></html>`;
writeFileSync(`${root}/index.html`, html);
console.log(`${root}/index.html`);
