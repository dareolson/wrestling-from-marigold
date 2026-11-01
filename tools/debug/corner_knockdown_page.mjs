// Builds research/animation/whip-2026-10/corner-knockdown.html from corner-knockdown-results.json (the films tools/debug/corner_knockdown.mjs took).
import { readFileSync, writeFileSync } from 'node:fs';
const root = 'research/animation/whip-2026-10';
const { films } = JSON.parse(readFileSync(`${root}/corner-knockdown-results.json`, 'utf8'));
const page = `<!doctype html><meta charset="utf-8"><title>Corner knockdown</title>
<style>body{font:16px system-ui;background:#181b20;color:#eee;margin:24px;max-width:900px}select,button{font:inherit;padding:6px;margin:0 12px 8px 0}canvas{width:100%;background:#000}#stats{padding:12px 0;color:#ccc;line-height:1.5}</style>
<h1>The charge puts him down: face or stomach</h1>
<p>Candidate only: <code>?grapples=v1</code>. The attacker charges the dazed man in the corner. Face: the clothesline look, head and torso snap back, he topples forward and sells with his hands to his head. Stomach (down held at the run press): dropped shoulder, he folds over, buckles to his knees and sells curled over his stomach. Tight on the corner, every frame at 60 fps, through the get-up.</p>
<label>Cornered <select id="pair"><option value="george-lou">Lou (George charges)</option><option value="lou-george">George (Lou charges)</option></select></label>
<label>Corner <select id="corner"><option value="left-near">Near left</option><option value="right-far">Far right</option></select></label>
<label>Hit <select id="part"><option value="face">Face</option><option value="gut">Stomach</option></select></label>
<label>Speed <select id="speed"><option value="1">Normal</option><option value="0.25">Quarter</option></select></label>
<button id="pause">Pause</button><p id="stats"></p><canvas id="film"></canvas>
<script>
const runs=__RUNS__;const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');let frames=[],frame=0,paused=false,last=0;
function select(){const id=pair.value+'-'+corner.value+'-'+part.value,r=runs.find(r=>r.id===id);frame=0;frames=Array.from({length:r.frames},(_,i)=>{const im=new Image();im.src='corner-knockdown-frames/'+r.id+'/s'+String(i).padStart(4,'0')+'.jpg';return im});
stats.innerHTML='Charge '+r.chargeMs+' ms; reaction '+r.reactionMs+' ms, fall ('+r.variant+') '+r.fallMs+' ms; lands '+r.lying+', '+r.landing.toLeftRope+' px inside the left rope, '+r.landing.toRightRope+' px inside the right; attacker '+r.attackerGapOnLanding.toNearestJoint+' px from the body on landing<br>Sell: '+r.sell.part+' clutch '+r.sell.durationS+' s of '+r.sell.downTimeAtLanding+' s down; hand-to-target '+(r.wristToTarget.nearHand?r.wristToTarget.nearHand.min:'-')+' px'+(r.wristToTarget.farHand?' / '+r.wristToTarget.farHand.min+' px':'')+'; get-up '+r.getUp;}
for(const id of ['pair','corner','part'])document.getElementById(id).onchange=select;
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause'};
function tick(t){if(t-last>1000/(60*+speed.value)){last=t;const im=frames[frame];if(im?.complete&&im.naturalWidth){canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;ctx.drawImage(im,0,0);if(!paused)frame=(frame+1)%frames.length;}}requestAnimationFrame(tick)}select();requestAnimationFrame(tick);
</script>`;
writeFileSync(`${root}/corner-knockdown.html`, page.replace('__RUNS__', JSON.stringify(films)));
console.log('wrote', `${root}/corner-knockdown.html`, films.length, 'films');
