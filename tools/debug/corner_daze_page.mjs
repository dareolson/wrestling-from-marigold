// Builds research/animation/whip-2026-10/corner-daze.html from corner-daze-results.json (the films tools/debug/corner_daze.mjs took).
import { readFileSync, writeFileSync } from 'node:fs';
const root = 'research/animation/whip-2026-10';
const { films } = JSON.parse(readFileSync(`${root}/corner-daze-results.json`, 'utf8'));
const page = `<!doctype html><meta charset="utf-8"><title>Corner daze</title>
<style>body{font:16px system-ui;background:#181b20;color:#eee;margin:24px;max-width:900px}select,button{font:inherit;padding:6px;margin:0 12px 8px 0}canvas{width:100%;background:#000}#stats{padding:12px 0;color:#ccc;line-height:1.5}</style>
<h1>Stuck in the corner, and the running attack at him</h1>
<p>Candidate only: <code>?grapples=v1</code>. A whip into the corner: he turns his back, takes the corner 12 px deep, and stays in the lean, dazed, hands up on the top rope. Daze alone; a charge that hits (clothesline look, he comes back to the daze, +0.6 s once); a charge that misses because he got out (the attacker runs on into the corner himself). Tight on the corner, every frame at 60 fps.</p>
<label>Cornered <select id="pair"><option value="george-lou">Lou (George charges)</option><option value="lou-george">George (Lou charges)</option></select></label>
<label>Corner <select id="corner"><option value="left-near">Near left</option><option value="right-far">Far right</option></select></label>
<label>Scene <select id="scene"><option value="daze">Daze alone</option><option value="hit">Charge hits</option><option value="miss">Charge misses</option></select></label>
<label>Speed <select id="speed"><option value="1">Normal</option><option value="0.25">Quarter</option></select></label>
<button id="pause">Pause</button><p id="stats"></p><canvas id="film"></canvas>
<script>
const runs=__RUNS__;const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');let frames=[],frame=0,paused=false,last=0;
function select(){const id=pair.value+'-'+corner.value+'-'+scene.value,r=runs.find(r=>r.id===id);frame=0;frames=Array.from({length:r.frames},(_,i)=>{const im=new Image();im.src='corner-daze-frames/'+r.id+'/s'+String(i).padStart(4,'0')+'.jpg';return im});
let t='Daze '+r.dazeMs+' ms, '+r.depthPx+' px past the corner point ('+r.depthOverS+' x scale)';if(r.handMissPx)t+=', hands '+r.handMissPx.mean+' px off the rope point on average (max '+r.handMissPx.max+')';
if(r.chargeMs)t+='<br>Charge '+r.chargeMs+' ms over '+r.startDistance+' px, stops '+r.arrivalGap+' px short'+(r.gapAtImpact?'; at impact the bodies are '+r.gapAtImpact+' px apart, damage '+r.damage+', daze +'+r.extensionSeen+' s':'; he was gone: no damage');stats.innerHTML=t;}
for(const id of ['pair','corner','scene'])document.getElementById(id).onchange=select;
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause'};
function tick(t){if(t-last>1000/(60*+speed.value)){last=t;const im=frames[frame];if(im?.complete&&im.naturalWidth){canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;ctx.drawImage(im,0,0);if(!paused)frame=(frame+1)%frames.length;}}requestAnimationFrame(tick)}select();requestAnimationFrame(tick);
</script>`;
writeFileSync(`${root}/corner-daze.html`, page.replace('__RUNS__', JSON.stringify(films)));
console.log('wrote', `${root}/corner-daze.html`, films.length, 'films');
