// node tools/debug/arm_bar_polish_page.mjs <after-capture> <before-capture> <hipsAfter> <hipsBefore>
// T2.7b: 0834512 armBarV2 (before) vs the polish (after): loops, held numbers, 3x hip crops at 1.4 / 1.95 / 2.4 s, shadow.
import { mkdirSync, cpSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const root = 'research/animation/light-moves-2026-11/t2-7b';
const [after, before, hipsAfter, hipsBefore] = process.argv.slice(2);
const cases = ['lou-george-right', 'lou-george-left', 'george-lou-right', 'george-lou-left'];
mkdirSync(root, { recursive: true });
const data = {}, S = {};
for (const id of cases) {
    cpSync(`${after}/${id}`, `${root}/after/${id}`, { recursive: true });
    cpSync(`${before}/${id}`, `${root}/before/${id}`, { recursive: true });
    cpSync(`${hipsAfter}/${id}`, `${root}/hips/after/${id}`, { recursive: true });
    cpSync(`${hipsBefore}/${id}`, `${root}/hips/before/${id}`, { recursive: true });
    for (const w of ['before', 'after']) data[`${id}/${w}`] = readdirSync(`${root}/${w}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${w}/${id}/${n}`);
    S[id] = { after: JSON.parse(readFileSync(`${after}/${id}/audit.json`)).summary, before: JSON.parse(readFileSync(`${before}/${id}/audit.json`)).summary };
}
writeFileSync(`${root}/summary.json`, JSON.stringify(S, null, 2) + '\n');
const f = n => n.toFixed(1), kn = k => k.map(r => (r[0] === r[1] ? f(r[0]) : `${f(r[0])}..${f(r[1])}`)).join(' / ');
const sh = s => `${s.heldShadow.overMax} px, over him on ${s.heldShadow.aboveFrames}/${s.heldMaskCount ?? s.heldFrames} held frames`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arm bar polish</title><style>
body{font:16px/1.5 system-ui;background:#f4f1ea;color:#221f19;max-width:1160px;margin:auto;padding:24px}h1{font-size:26px}h2{font-size:19px}section{border-top:1px solid #aaa;padding-top:15px;margin-top:30px}.pair{display:flex;gap:16px;flex-wrap:wrap}figure{margin:0;flex:1;min-width:320px}canvas{width:100%;height:auto;background:#222}button,select,input{font:inherit}nav{position:sticky;top:0;background:#f4f1ea;padding:12px;border-bottom:1px solid #aaa}table{border-collapse:collapse}th,td{text-align:left;padding:4px 18px 4px 0}.crops{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.crops img{width:100%;image-rendering:pixelated}</style>
<h1>Arm bar polish (T2.7b)</h1>
<p>Left: 0834512 (approved kneel). Right: the polish, under <code>?light=v1</code>. Same x, y, grips, timing, sell and layer order. Changed: the hips sink (crouch 1.35 to 1.05, both legs -0.45, fold 2.1) so both knees rest on the mat and the thigh is no longer near vertical over a sharp fold; and his ground oval sits under his knees and boots and below the man's body.</p>
<nav><button id="play">Pause</button> <select id="speed"><option value="1">Normal speed</option><option value="0.5">Half speed</option></select> <input id="frame" type="range" min="0" max="107" value="0" aria-label="Frame"></nav>
${cases.map(id => { const a = S[id].after, b = S[id].before; return `<section><h2>${id.replaceAll('-', ' ')}</h2><div class="pair">${['before', 'after'].map(w => `<figure><canvas width="540" height="350" data-key="${id}/${w}"></canvas><figcaption>${w === 'before' ? '0834512' : 'Polish'}</figcaption></figure>`).join('')}</div>
<table><tr><th>Held frames</th><th>0834512</th><th>Polish</th><th>Bar</th></tr>
<tr><td>Knee height above his mat line, near / far (px)</td><td>${kn(b.heldKneeToMat)}</td><td>${kn(a.heldKneeToMat)}</td><td>within 6</td></tr>
<tr><td>His oval on the man's body (px, worst frame), drawn over him</td><td>${b.heldShadow.overMax}, ${b.heldShadow.aboveFrames}/${b.heldFrames} frames</td><td>${a.heldShadow.overMax}, ${a.heldShadow.aboveFrames}/${a.heldFrames} frames</td><td>not over him</td></tr>
<tr><td>Oval centre to his knees, x / y (px)</td><td>${f(b.heldShadow.gapX[0])} / ${f(b.heldShadow.gapY[0])}</td><td>${f(a.heldShadow.gapX[0])} / ${f(a.heldShadow.gapY[0])}</td><td>report</td></tr>
<tr><td>His legs over the man's legs / belly (px)</td><td>${b.heldLowerMax.legs} / ${b.heldLowerMax.belly}</td><td>${a.heldLowerMax.legs} / ${a.heldLowerMax.belly}</td><td>polish</td></tr>
<tr><td>Palm to wrist / forearm (px), pinned frames, ankle slide</td><td>${b.maxWristGap.toFixed(4)} / ${b.maxForearmGap.toFixed(4)}, ${b.pinnedFrames}, ${b.maxHeldAnkleSlide}</td><td>${a.maxWristGap.toFixed(4)} / ${a.maxForearmGap.toFixed(4)}, ${a.pinnedFrames}, ${a.maxHeldAnkleSlide}</td><td>held</td></tr>
<tr><td>His entry/exit step (px/frame, sep 70)</td><td>${b.hipStep.toFixed(2)}</td><td>${a.hipStep.toFixed(2)}</td><td>unchanged</td></tr>
<tr><td>Stack failures</td><td>${b.stackFailureFrames}</td><td>${a.stackFailureFrames}</td><td>0</td></tr></table>
<p>Hip close-ups, 0834512 over polish, at 1.4 / 1.95 / 2.4 s:</p><div class="crops">${['before', 'after'].map(w => [1.4, 1.95, 2.4].map(t => `<a href="hips/${w}/${id}/base-${t}.png"><img src="hips/${w}/${id}/base-${t}.png" alt="${w} ${t}s"></a>`).join('')).join('')}</div></section>`; }).join('')}
<script>const data=${JSON.stringify(data)};const views=[...document.querySelectorAll('canvas')].map(c=>({ctx:c.getContext('2d'),images:data[c.dataset.key].map(src=>{const i=new Image();i.src=src;return i})}));let frame=0,playing=true,last=0,speed=1;play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play'};document.getElementById('speed').onchange=e=>speed=+e.target.value;document.getElementById('frame').oninput=e=>{frame=+e.target.value;playing=false;play.textContent='Play'};function tick(t){if(playing&&t-last>=1000/30/speed){last=t;frame=(frame+1)%108;document.getElementById('frame').value=frame}for(const v of views){const i=v.images[frame%v.images.length];if(i.complete&&i.naturalWidth)v.ctx.drawImage(i,0,0,540,350)}requestAnimationFrame(tick)}requestAnimationFrame(tick);</script></html>`;
writeFileSync(`${root}/index.html`, html);
console.log(`${root}/index.html`);
