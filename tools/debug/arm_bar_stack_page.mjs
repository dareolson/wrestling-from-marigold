// node tools/debug/arm_bar_stack_page.mjs <capture-root>
import { mkdirSync, cpSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const root = 'research/animation/light-moves-2026-11/armbar-stack';
const captures = process.argv[2];
const cases = ['lou-george-right', 'lou-george-left', 'george-lou-right', 'george-lou-left'];
mkdirSync(root, { recursive: true });
const data = {}, summary = {};
for (const id of cases) {
    cpSync(`${captures}/${id}`, `${root}/${id}`, { recursive: true });
    data[id] = readdirSync(`${root}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${id}/${n}`);
    summary[id] = JSON.parse(readFileSync(`${root}/${id}/audit.json`)).summary;
}
writeFileSync(`${root}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
writeFileSync(`${root}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arm bar — body stacking</title>
<style>body{font:16px/1.5 system-ui;background:#f4f1ea;color:#241e16;max-width:1140px;margin:auto;padding:24px}h1{font-size:26px}h2{font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:24px}canvas{width:100%;height:auto;background:#222}nav{position:sticky;top:0;background:#f4f1ea;padding:12px}button,select{font:inherit}small{display:block}.stills{display:flex;gap:8px}.stills img{width:155px;max-width:100%}</style>
<h1>Arm bar: preserved body stack</h1><p>Current candidate only, on the restored kneeling geometry. Normal-speed loops, Lou and George attacking in both facings. Under <code>?light=v1</code>; uncommitted.</p>
<p>Each rig's torso, head, garment masks and legs retain their original relative depths. Both pieces of the far arm stay behind the complete body stack; the near arm remains in front for the grip.</p>
<nav><button id="play">Pause</button> <select id="speed"><option value="1">Normal speed</option><option value="0.5">Half speed</option></select> <input id="seek" type="range" min="0" max="107" value="0" aria-label="Frame"></nav>
<div class="grid">${cases.map(id => { const s=summary[id]; return `<section><h2>${id.replaceAll('-',' ')}</h2><canvas data-case="${id}" width="540" height="350"></canvas><small>Stack failures: ${s.stackFailureFrames}/${s.frames} frames. Held grip max wrist / forearm: ${s.maxWristGap.toFixed(3)} / ${s.maxForearmGap.toFixed(3)} px. Pinned joints: ${s.pinnedFrames}.</small><div class="stills">${[.9,1.4,2.4].map(t=>`<a href="${id}/still-${t}.png"><img src="${id}/still-${t}.png" alt="${id} at ${t}s"></a>`).join('')}</div><small>Lower-body overlap with receiver: legs ${s.heldLowerMax.legs}, belly ${s.heldLowerMax.belly} pixels at worst. These geometry checks are separate from depth order.</small></section>`; }).join('')}</div>
<p><a href="summary.json">Measurements</a>. Every frame compares body-part depth offsets with that rig's own <code>Skeleton.setDepth</code> output, and checks the far upper arm and forearm against the body block. This checks layer order, not whether the poses look convincing.</p>
<script>const data=${JSON.stringify(data)};const views=[...document.querySelectorAll('canvas')].map(c=>({c,ctx:c.getContext('2d'),imgs:data[c.dataset.case].map(src=>{const i=new Image();i.src=src;return i})}));let n=0,running=true,speed=1,last=0;const play=document.getElementById('play'),seek=document.getElementById('seek');play.onclick=()=>{running=!running;play.textContent=running?'Pause':'Play'};document.getElementById('speed').onchange=e=>speed=+e.target.value;seek.oninput=e=>{n=+e.target.value;running=false;play.textContent='Play'};function tick(t){if(running&&t-last>=1000/30/speed){last=t;n=(n+1)%108;seek.value=n}for(const v of views){const i=v.imgs[n%v.imgs.length];if(i.complete&&i.naturalWidth)v.ctx.drawImage(i,0,0,540,350)}requestAnimationFrame(tick)}requestAnimationFrame(tick);</script></html>`);
console.log(`${root}/index.html`);
