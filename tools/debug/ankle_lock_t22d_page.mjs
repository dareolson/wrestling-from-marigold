// PLAN_LIGHT_MOVES T2.2d page: 6abf871, 58fccc9 (T2.2c) and the new layer order + clear leg timing, side by side, normal-speed loops and stills, both
// pairings and facings, the audit numbers beside each. Reads t2-2c/before-6abf871.json + before/, t2-2c/after.json + after/ and t2-2d/after.json + after/
// (ankle_lock_audit.mjs). Writes <t2-2d>/index.html.
//   node tools/debug/ankle_lock_t22d_page.mjs research/animation/light-moves-2026-11
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = process.argv[2], dir = `${root}/t2-2d`;
// variant key -> [label, audit json, frames dir relative to the page]
const V = { v0: ['6abf871', `${root}/t2-2c/before-6abf871.json`, '../t2-2c/before'], v1: ['58fccc9 (T2.2c)', `${root}/t2-2c/after.json`, '../t2-2c/after'], v2: ['new (T2.2d)', `${dir}/after.json`, 'after'] };
const KEYS = Object.keys(V);
const J = Object.fromEntries(KEYS.map(k => [k, JSON.parse(readFileSync(V[k][1]))]));
const CASES = [['lou-george-right', 'Lou on George, facing right'], ['lou-george-left', 'Lou on George, facing left'], ['george-lou-right', 'George on Lou, facing right'], ['george-lou-left', 'George on Lou, facing left']];
const STILLS = [0.5, 0.9, 1.4, 1.95, 2.4, 2.7];
const f = (v, n = 1) => (v === null || v === undefined ? 'n/a' : (+v).toFixed(n).replace(/\.0+$/, ''));
const row = (label, b, a, note = '') => `<tr><th>${label}</th><td>${b}</td><td>${a}</td><td class="note">${note}</td></tr>`;
const frames = (k, id) => readdirSync(`${dir}/${V[k][2]}/frames/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${V[k][2]}/frames/${id}/${n}`);

const table = (id) => {
    const R = KEYS.map(k => J[k][id]);
    const row3 = (label, fn, note = '') => `<tr><th>${label}</th>${R.map(r => `<td>${fn(r)}</td>`).join('')}<td class="note">${note}</td></tr>`;
    const phaseMax = (r, lo, hi) => Math.max(...r.belowBodyAt.filter(([t]) => t >= lo && t < hi).map(([, v]) => v));
    const ord = (r, k) => r.orderHeld ? r.orderHeld[k] : 'not measured';
    return `<table><tr><th></th>${KEYS.map(k => `<th>${V[k][0]}</th>`).join('')}<th></th></tr>
${row3('palm to heel / toe, held 0.6-2.7 s (max px)', r => `${f(r.palmHeld.heel.max, 2)} / ${f(r.palmHeld.toe.max, 2)}`, 'bar 6')}
${row3('held frames over 6 px', r => r.palmHeld.framesOver6)}
${row3('frames with a seam past idle + 0.5 px', seamFrames)}
${row3('frames with a joint pinned at its limit', r => `${r.pinnedFrames} of ${r.frames}`)}
${row3('below-belt overlap, max over the clip (px)', r => f(r.belowBodyPx.max, 0), 'target under 1341-1381')}
${row3('below-belt overlap, grab 0-0.6 s / held 0.6-2.7 s / release 2.7-3.1 s (max px)', r => `${f(phaseMax(r, 0, 0.6), 0)} / ${f(phaseMax(r, 0.6, 2.7), 0)} / ${f(phaseMax(r, 2.7, 3.2), 0)}`, 'sampled every 10th frame')}
${row3('trapped leg through his legs: frames / max px', r => `${r.trappedVsLegsFrames} / ${f(r.trappedVsLegsPx.max, 0)}`)}
${row3('far upper arm behind his torso (held frames)', r => ord(r, 'farArmBehindTorso'), 'depth, every held frame')}
${row3('both his thighs in front of his torso (held frames)', r => ord(r, 'thighsOverTorso'))}
${row3('both his shins in front of his torso (held frames)', r => ord(r, 'shinsOverTorso'))}
${row3('near forearm in front of the boot (held frames)', r => ord(r, 'nearArmOverBoot'))}
${row3('boot drawn in front of his torso (held frames)', r => r.bootInFrontOfTorsoFramesHeld)}
${row3('planted soles 0.4-2.7 s, worst slide (px/frame)', r => `${f(r.plantedSlideMax.near, 2)} / ${f(r.plantedSlideMax.far, 2)}`, 'bar 1.5')}
${row3('attacker torso bend, held', r => f(r.torsoBend.max, 2), 'bar &le; .3')}
</table>`;
};
const seamFrames = (r) => r.brokenList.filter(e => e.bad.some(x => !x.startsWith('pinned'))).length;
const heldMax = (r) => Math.max(...r.belowBodyAt.filter(([t]) => t >= 0.6 && t <= 2.7).map(([, v]) => v));

const block = (id, title) => `<section><h2>${title}</h2>
<div class="pair">
${KEYS.map(k => ` <figure><canvas data-case="${id}" data-which="${k}" width="540" height="350"></canvas><figcaption>${V[k][0]}</figcaption></figure>`).join('\n')}
</div>
<div class="stills">${KEYS.map(k => `<div><b>${V[k][0]}</b><div class="row">${STILLS.map(t => `<a href="${V[k][2]}/frames/${id}/still-${t}.png"><img loading="lazy" src="${V[k][2]}/frames/${id}/still-${t}.png" alt="${V[k][0]} ${t}s"><span>${t} s</span></a>`).join('')}</div></div>`).join('')}</div>
${table(id)}</section>`;

const data = Object.fromEntries(CASES.flatMap(([id]) => KEYS.map(k => [`${id}/${k}`, frames(k, id)])));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ankle lock layers</title>
<style>
:root{color-scheme:light dark;--bg:#f4f1ea;--fg:#1d1b17;--mut:#6a645a;--line:#cfc8b8;--card:#fffdf7}
@media (prefers-color-scheme:dark){:root{--bg:#161512;--fg:#ece7da;--mut:#a39c8c;--line:#3a362e;--card:#1e1c18}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;max-width:1180px;margin-inline:auto}
h1{font-size:1.3rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.6em 0 .4em;border-top:1px solid var(--line);padding-top:.8em}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px}figcaption{color:var(--mut);font-size:.85rem}
canvas{width:100%;height:auto;display:block;background:#000}
.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:.6em 0}button{font:inherit;padding:4px 12px}
.stills{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:10px;margin-top:8px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.row a{color:var(--mut);font-size:.8rem;text-decoration:none}.row img{width:100%;display:block;border:1px solid var(--line)}
table{border-collapse:collapse;width:100%;margin-top:10px;background:var(--card)}th,td{border:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}th:first-child{font-weight:500}.note{color:var(--mut);font-size:.85rem}
p.s{color:var(--mut);margin:.2em 0}
</style></head><body>
<h1>Ankle lock: layer order and clear leg (T2.2d)</h1>
<p class="s">Left to right: 6abf871, 58fccc9 (T2.2c) and the new order, same flag (<code>?light=v1</code>), same duration, events and damage. Loops run at normal speed (30 fps of the 60 Hz game, every second frame). Numbers are measured per frame, not judged.</p>
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
