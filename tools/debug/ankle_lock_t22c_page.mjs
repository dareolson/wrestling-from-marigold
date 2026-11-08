// PLAN_LIGHT_MOVES T2.2c page: 6abf871 (before) vs the re-staged ankleLockV2 (after), normal-speed loops and stills, both pairings and facings, the
// audit numbers beside each. Reads <dir>/before-6abf871.json and after.json (ankle_lock_audit.mjs) and <dir>/{before,after}/frames/<case>/.
//   node tools/debug/ankle_lock_t22c_page.mjs research/animation/light-moves-2026-11/t2-2c
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = process.argv[2];
const J = { before: JSON.parse(readFileSync(`${dir}/before-6abf871.json`)), after: JSON.parse(readFileSync(`${dir}/after.json`)) };
const CASES = [['lou-george-right', 'Lou on George, facing right'], ['lou-george-left', 'Lou on George, facing left'], ['george-lou-right', 'George on Lou, facing right'], ['george-lou-left', 'George on Lou, facing left']];
const STILLS = [0.5, 0.9, 1.4, 1.95, 2.4, 2.7];
const f = (v, n = 1) => (v === null || v === undefined ? 'n/a' : (+v).toFixed(n).replace(/\.0+$/, ''));
const row = (label, b, a, note = '') => `<tr><th>${label}</th><td>${b}</td><td>${a}</td><td class="note">${note}</td></tr>`;
const frames = (which, id) => readdirSync(`${dir}/${which}/frames/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${which}/frames/${id}/${n}`);

const table = (id) => {
    const b = J.before[id], a = J.after[id];
    return `<table><tr><th></th><th>6abf871</th><th>re-staged</th><th></th></tr>
${row('palm to heel / toe, held 0.6-2.7 s (max px)', `${f(b.palmHeld.heel.max, 2)} / ${f(b.palmHeld.toe.max, 2)}`, `${f(a.palmHeld.heel.max, 2)} / ${f(a.palmHeld.toe.max, 2)}`, 'bar 6; the IK target, not a picture check')}
${row('held frames over 6 px', b.palmHeld.framesOver6, a.palmHeld.framesOver6)}
${row('ink gap at a seam: worst over the clip (px)', f(Math.max(...Object.values(b.worstInkGap).flatMap(o => Object.values(o))), 2), f(Math.max(...Object.values(a.worstInkGap).flatMap(o => Object.values(o))), 2), 'neck, shoulders, elbows, hips, knees; idle is 0 for both men; the ankle has no seam (boot baked into the shin)')}
${row('frames with a seam past idle + 0.5 px', seamFrames(b), seamFrames(a))}
${row('frames with a joint pinned at its limit', `${b.pinnedFrames} of ${b.frames}`, `${a.pinnedFrames} of ${a.frames}`, `${b.pinnedKinds.join(', ') || 'none'} &rarr; ${a.pinnedKinds.join(', ') || 'none'}`)}
${row('below-belt overlap, max over the clip (px)', f(b.belowBodyPx.max, 0), f(a.belowBodyPx.max, 0), 'target under 1341-1381')}
${row('below-belt overlap, held 0.6-2.7 s (max px)', f(heldMax(b), 0), f(heldMax(a), 0))}
${row('trapped leg through his legs: frames / max px', `${b.trappedVsLegsFrames} / ${f(b.trappedVsLegsPx.max, 0)}`, `${a.trappedVsLegsFrames} / ${f(a.trappedVsLegsPx.max, 0)}`, 'after: where they are, in the clip\'s first 0.5 s and its last 0.3 s')}
${row('boot drawn in front of his torso (held frames)', b.bootInFrontOfTorsoFramesHeld, a.bootInFrontOfTorsoFramesHeld)}
${row('planted soles 0.4-2.7 s, worst slide (px/frame)', `${f(b.plantedSlideMax.near, 2)} / ${f(b.plantedSlideMax.far, 2)}`, `${f(a.plantedSlideMax.near, 2)} / ${f(a.plantedSlideMax.far, 2)}`, 'bar 1.5')}
${row('attacker knee drawn flex (min..max rad)', `${f(b.kneeDrawn.a.min, 2)}..${f(b.kneeDrawn.a.max, 2)}`, `${f(a.kneeDrawn.a.min, 2)}..${f(a.kneeDrawn.a.max, 2)}`, 'limits -0.10..2.55')}
${row('victim knee drawn flex (min..max rad)', `${f(b.kneeDrawn.d.min, 2)}..${f(b.kneeDrawn.d.max, 2)}`, `${f(a.kneeDrawn.d.min, 2)}..${f(a.kneeDrawn.d.max, 2)}`)}
${row('attacker torso bend, held', f(b.torsoBend.max, 2), f(a.torsoBend.max, 2), 'bar &le; .3')}
</table>`;
};
const seamFrames = (r) => r.brokenList.filter(e => e.bad.some(x => !x.startsWith('pinned'))).length;
const heldMax = (r) => Math.max(...r.belowBodyAt.filter(([t]) => t >= 0.6 && t <= 2.7).map(([, v]) => v));

const block = (id, title) => `<section><h2>${title}</h2>
<div class="pair">
 <figure><canvas data-case="${id}" data-which="before" width="540" height="350"></canvas><figcaption>6abf871</figcaption></figure>
 <figure><canvas data-case="${id}" data-which="after" width="540" height="350"></canvas><figcaption>re-staged</figcaption></figure>
</div>
<div class="stills">${['before', 'after'].map(w => `<div><b>${w === 'before' ? '6abf871' : 're-staged'}</b><div class="row">${STILLS.map(t => `<a href="${w}/frames/${id}/still-${t}.png"><img loading="lazy" src="${w}/frames/${id}/still-${t}.png" alt="${w} ${t}s"><span>${t} s</span></a>`).join('')}</div></div>`).join('')}</div>
${table(id)}</section>`;

const data = Object.fromEntries(CASES.flatMap(([id]) => ['before', 'after'].map(w => [`${id}/${w}`, frames(w, id)])));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ankle lock re-staged</title>
<style>
:root{color-scheme:light dark;--bg:#f4f1ea;--fg:#1d1b17;--mut:#6a645a;--line:#cfc8b8;--card:#fffdf7}
@media (prefers-color-scheme:dark){:root{--bg:#161512;--fg:#ece7da;--mut:#a39c8c;--line:#3a362e;--card:#1e1c18}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;max-width:1180px;margin-inline:auto}
h1{font-size:1.3rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.6em 0 .4em;border-top:1px solid var(--line);padding-top:.8em}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px}figcaption{color:var(--mut);font-size:.85rem}
canvas{width:100%;height:auto;display:block;background:#000}
.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:.6em 0}button{font:inherit;padding:4px 12px}
.stills{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:10px;margin-top:8px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.row a{color:var(--mut);font-size:.8rem;text-decoration:none}.row img{width:100%;display:block;border:1px solid var(--line)}
table{border-collapse:collapse;width:100%;margin-top:10px;background:var(--card)}th,td{border:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}th:first-child{font-weight:500}.note{color:var(--mut);font-size:.85rem}
p.s{color:var(--mut);margin:.2em 0}
</style></head><body>
<h1>Ankle lock, re-staged (T2.2c)</h1>
<p class="s">Left: 6abf871 as committed. Right: the new staging, same flag (<code>?light=v1</code>), same duration, events and damage. Loops run at normal speed (30 fps of the 60 Hz game, every second frame). Numbers are measured per frame, not judged.</p>
<div class="controls"><button id="play">Pause</button><label>speed <select id="speed"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label></div>
${CASES.map(([id, t]) => block(id, t)).join('\n')}
<script>
const DATA=${JSON.stringify(data)};
const canv=[...document.querySelectorAll('canvas')].map(c=>({c,ctx:c.getContext('2d'),list:DATA[c.dataset.case+'/'+c.dataset.which],imgs:null}));
for(const o of canv){o.imgs=o.list.map(s=>{const i=new Image();i.src=s;return i;});}
let n=0,playing=true,speed=1,last=0;
document.getElementById('play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play';};
document.getElementById('speed').onchange=e=>{speed=+e.target.value;};
function tick(ts){ if(playing&&ts-last>=(1000/30)/speed){last=ts;n++;} for(const o of canv){const i=o.imgs[n%o.imgs.length]; if(i&&i.complete)o.ctx.drawImage(i,0,0,o.c.width,o.c.height);} requestAnimationFrame(tick);}
requestAnimationFrame(tick);
</script></body></html>`;
writeFileSync(`${dir}/index.html`, html);
console.log('wrote', `${dir}/index.html`);
