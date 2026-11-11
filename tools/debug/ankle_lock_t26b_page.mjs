// PLAN_LIGHT_MOVES T2.6b G2 page: the ankle lock before the bent boot (5dde20c, base shin) vs now (4825c75 wiring), normal-speed loops and stills, all four cases,
// the audit numbers beside each, the swap counts, close-ups of the art, and the arm bar as it is today. Reads <dir>/{before,after}.json, measure-after.json,
// <dir>/{before,after,armbar}/<case>/, <dir>/closeups/, research/art/lou-ankle-twist-2026-11-08/pixel-check.json.
//   node tools/debug/ankle_lock_t26b_page.mjs research/animation/light-moves-2026-11/t2-6b
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = process.argv[2];
const J = { before: JSON.parse(readFileSync(`${dir}/before.json`)), after: JSON.parse(readFileSync(`${dir}/after.json`)) };
const M = JSON.parse(readFileSync(`${dir}/measure-after.json`));
const PX = JSON.parse(readFileSync('research/art/lou-ankle-twist-2026-11-08/pixel-check.json'));
const CASES = [['lou-george-right', 'Lou on George, facing right', 'George is trapped: no ankleTwist art, so he wears the base shin in both columns'], ['lou-george-left', 'Lou on George, facing left', 'George is trapped: base shin in both columns'], ['george-lou-right', 'George on Lou, facing right', 'Lou is trapped: the bent boot is on the right'], ['george-lou-left', 'George on Lou, facing left', 'Lou is trapped: the bent boot is on the right']];
const STILLS = [0.3, 0.9, 1.4, 1.95, 2.4, 2.7];
const f = (v, n = 2) => (v === null || v === undefined ? 'n/a' : (+v).toFixed(n).replace(/\.?0+$/, ''));
const frames = (sub, id) => readdirSync(`${dir}/${sub}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${sub}/${id}/${n}`);
const seam = (r) => r.brokenList.filter(e => e.bad.some(x => !x.startsWith('pinned'))).length;
const row = (label, fn, note = '') => `<tr><th>${label}</th><td>${fn(J.before)}</td><td>${fn(J.after)}</td><td class="note">${note}</td></tr>`;
const table = (id) => `<table><tr><th></th><th>before (5dde20c)</th><th>now (4825c75)</th><th></th></tr>
${row('palm to heel / toe held 0.6-2.7 s, max px', j => `${f(j[id].palmHeld.heel.max)} / ${f(j[id].palmHeld.toe.max)}`, 'bar 6')}
${row('palm to heel / toe in the lift 0.3-0.6 s, max px', j => `${f(j[id].palmLift.heel.max)} / ${f(j[id].palmLift.toe.max)}`, 'bar 6')}
${row('seam frames past idle + 0.5 px / pinned frames', j => `${seam(j[id])} / ${j[id].pinnedFrames} of ${j[id].frames}`, 'bar 0')}
${row('planted soles, worst slide near / far, px/frame', j => `${f(j[id].plantedSlideMax.near)} / ${f(j[id].plantedSlideMax.far)}`, 'bar 1.5')}
${row('trapped boot in front of the attacker\'s torso (held)', j => j[id].bootInFrontOfTorsoFramesHeld)}
${row('trapped leg on his legs: frames / max px', j => `${j[id].trappedVsLegsFrames} / ${f(j[id].trappedVsLegsPx.max, 0)}`, 'known polish item')}
${row('below the belt, max px', j => f(j[id].belowBodyPx.max, 0))}
<tr><th>trapped shin art drawn (186 frames)</th><td>base 186</td><td>${Object.entries(M[id].shinArtFrames).map(([k, v]) => `${k} ${v}`).join(', ')}</td><td class="note">${M[id].shinKeys.join(', ')}</td></tr>
</table>`;
const block = (id, title, note) => `<section><h2>${title}</h2><p class="s">${note}.</p>
<div class="pair">${['before', 'after'].map(k => ` <figure><canvas data-case="${id}" data-which="${k}" width="540" height="350"></canvas><figcaption>${k === 'before' ? 'before: base shin (5dde20c)' : 'now: ankleTwist on the trapped shin, 0.45-2.95 s (4825c75)'}</figcaption></figure>`).join('')}</div>
<div class="stills">${['before', 'after'].map(k => `<div><b>${k}</b><div class="row">${STILLS.map(t => `<a href="${k}/${id}/still-${t}.png"><img loading="lazy" src="${k}/${id}/still-${t}.png" alt="${k} ${t}s"><span>${t} s</span></a>`).join('')}</div></div>`).join('')}</div>
${table(id)}</section>`;
const arm = (id, title) => `<section><h2>${title}</h2>
<div class="pair"><figure><canvas data-case="${id}" data-which="arm" width="540" height="350"></canvas><figcaption>armBar as it is today (3.6 s clip)</figcaption></figure></div>
<div class="stills"><div><div class="row">${[0.3, 0.9, 1.4, 1.95, 2.4, 2.7].map(t => `<a href="armbar/${id}/still-${t}.png"><img loading="lazy" src="armbar/${id}/still-${t}.png" alt="armBar ${t}s"><span>${t} s</span></a>`).join('')}</div></div></div></section>`;
const closeups = ['george-lou-right', 'george-lou-left'].map(c => `<h3>${c.replace('-', ' on ').replace('-', ', facing ')}: before | now, around the trapped boot</h3><div class="row5">${['0.9', '1.4', '1.95', '2.4', '2.7'].map(t => `<a href="closeups/${c}-${t}.png"><img loading="lazy" src="closeups/${c}-${t}.png" alt="${c} ${t}"><span>${t} s</span></a>`).join('')}</div>`).join('');

const data = Object.fromEntries([...CASES.flatMap(([id]) => [[`${id}/before`, frames('before', id)], [`${id}/after`, frames('after', id)]]), ...CASES.map(([id]) => [`${id}/arm`, frames('armbar', id)])]);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ankle lock bent boot</title>
<style>
:root{color-scheme:light dark;--bg:#f4f1ea;--fg:#1d1b17;--mut:#6a645a;--line:#cfc8b8;--card:#fffdf7}
@media (prefers-color-scheme:dark){:root{--bg:#161512;--fg:#ece7da;--mut:#a39c8c;--line:#3a362e;--card:#1e1c18}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;max-width:1180px;margin-inline:auto}
h1{font-size:1.3rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.6em 0 .4em;border-top:1px solid var(--line);padding-top:.8em}h3{font-size:.95rem;margin:1em 0 .3em}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px}figcaption{color:var(--mut);font-size:.85rem}
canvas{width:100%;height:auto;display:block;background:#000}
.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:.6em 0}button{font:inherit;padding:4px 12px}
.stills{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:10px;margin-top:8px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.row5{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:6px}
.row a,.row5 a{color:var(--mut);font-size:.8rem;text-decoration:none}.row img,.row5 img{width:100%;display:block;border:1px solid var(--line)}
table{border-collapse:collapse;width:100%;margin-top:10px;background:var(--card)}th,td{border:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}th:first-child{font-weight:500}.note{color:var(--mut);font-size:.85rem}
p.s{color:var(--mut);margin:.2em 0}img.art{max-width:100%;border:1px solid var(--line)}
</style></head><body>
<h1>Ankle lock: the bent boot on the trapped shin (T2.6b, G2)</h1>
<p class="s">Left: before the art, base shin (5dde20c). Right: now, with <code>variants.shin.ankleTwist</code> worn on the trapped shin from 0.45 s to 2.95 s (4825c75). Same clip, flag <code>?light=v1</code>, same staging, sell and numbers. <b>George has no ankleTwist art yet, so when he is the trapped man (Lou on George) both columns show his base shin and should be identical</b>; the bent boot only changes anything when Lou is trapped (George on Lou). Loops run at normal speed (30 fps of the 60 Hz game, every second frame). Numbers are measured, not judged.</p>
<div class="controls"><button id="play">Pause</button><label>speed <select id="speed"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label></div>
<h2>The swap</h2>
<table><tr><th>pixel swap check (Lou, shin.png vs shin_ankle_twist.png)</th><td>changed px above the ankle row ${PX.ankleRow}: <b>${PX.changedPixelsAboveAnkle}</b> (gate ${PX.gate}); changed in all: ${PX.changedPixels}; canvas ${PX.canvas.join(' x ')}</td></tr>
<tr><th>drawn in the move (George on Lou, both facings)</th><td>${Object.entries(M['george-lou-right'].shinArtFrames).map(([k, v]) => `${k} ${v}`).join(', ')} of ${M['george-lou-right'].frames} frames; the base frames are the lead-in before 0.45 s and the fall after 2.95 s. Palm to heel / toe held (painted anchors on the bent boot): ${f(J.after['george-lou-right'].palmHeld.heel.max)} / ${f(J.after['george-lou-right'].palmHeld.toe.max)} px, 0 frames over 6.</td></tr>
<tr><th>drawn in the move (Lou on George)</th><td>The clip asks for ankleTwist for 150 frames; George has none, so he keeps his base shin (${M['lou-george-right'].shinKeys.join(', ')} only).</td></tr></table>
<h3>Lou's shin art: base | ankleTwist (lower shin, full resolution)</h3>
<img class="art" src="closeups/lou-shin-base-vs-twist.png" alt="Lou base shin and bent boot">
<p class="s">Visible in this crop: two small grey wisps on the shaft edges just above the toe of the bent boot (left edge and right of the laces). Not judged; Derek's call whether they show in play.</p>
<h2>Close-ups in play: before | now, around the trapped boot</h2>
<p class="s">Cropped around where the two renders differ, 3x. The game draws the boot small, and the stills carry the ring's film grain, so differences are subtle.</p>
${closeups}
${CASES.map(([id, t, n]) => block(id, t, n)).join('\n')}
<h2>Arm bar, as it is today (not changed)</h2>
<p class="s">So Derek can say if it is trash too (T2.6). Real <code>_doArmBar</code> on a downed man at the same 70 px entry, both pairings, both facings. No measurements taken; Derek judges.</p>
${[['lou-george-right', 'Lou on George, facing right'], ['lou-george-left', 'Lou on George, facing left'], ['george-lou-right', 'George on Lou, facing right'], ['george-lou-left', 'George on Lou, facing left']].map(([id, t]) => arm(id, t)).join('\n')}
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
