// PLAN_LIGHT_MOVES G1 round 2: frontKick (now) | frontKickV2 first pass (e27939c) | frontKickV2 with Codex's stomach-kick revision (standoff 128, sellGut, short recoil), Lou and Kowalski on George,
// both facings, normal-speed loops and stills, the audit numbers beside each. Reads t1-1/old.json, t1-2/new.json, t1-4/new.json and the frames of t1-3/{before,after}, t1-4/after.
//   node tools/debug/front_kick_g1r2_page.mjs research/animation/light-moves-2026-11
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = process.argv[2], out = `${root}/t1-4`;
const J = [JSON.parse(readFileSync(`${root}/t1-1/old.json`)), JSON.parse(readFileSync(`${root}/t1-2/new.json`)), JSON.parse(readFileSync(`${root}/t1-4/new.json`))];
const V = [['frontKick (now)', '../t1-3/before'], ['first pass (e27939c)', '../t1-3/after'], ['revised stomach kick', 'after']];
const CASES = [['lou-george-right', 'Lou kicks George, facing right'], ['lou-george-left', 'Lou kicks George, facing left'], ['kowalski-george-right', 'Kowalski kicks George, facing right'], ['kowalski-george-left', 'Kowalski kicks George, facing left']];
const STILLS = [0.12, 0.22, 0.3, 0.36, 0.46, 0.58];
const f = (v, n = 2) => (v === null || v === undefined ? 'n/a' : (+v).toFixed(n).replace(/\.?0+$/, ''));
const frames = (sub, id) => readdirSync(`${out}/${sub}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${sub}/${id}/${n}`);
const sellPeak = (r) => (r.defenderSell ? Math.max(...r.defenderSell.map(x => x.bend)) : null);
const rows = [
    ['frames with a backward-folded knee', r => `${r.backwardFoldFrames} of ${r.frames}`, 'bar 0'],
    ['frames with a drawn knee at its limit (longest run)', r => `${r.satFrames.near + r.satFrames.far} (${r.satFrames.longestRun})`, 'bar: run <= 2'],
    ['support knee bend, min .. max (rad)', r => `${f(r.kneeDrawn.far.min)} .. ${f(r.kneeDrawn.far.max)}`],
    ['support sole slide, worst px/frame / frames over 1.5', r => `${f(r.supportSlide.max)} / ${r.supportSlideOver15}`, 'bar 1.5'],
    ['support sole, lowest world y (the mat is 400)', r => f(r.supportSoleY.max, 0), 'past 400 = through the mat'],
    ['hips above the mat, lowest (px)', r => f(r.hipDrop.min, 0)],
    ['painted kicking sole vs his belly at impact: horizontal / vertical (px)', r => (r.soleContactAtImpact ? `${f(r.soleContactAtImpact.dx, 1)} / ${f(r.soleContactAtImpact.dy, 1)}` : 'not measured'), '- = past / above the belly midpoint'],
    ['receiver bend peak (pose bend, rad)', r => (sellPeak(r) === null ? 'not measured' : f(sellPeak(r))), 'the old sellChest leans him back'],
];
const table = (id) => `<table><tr><th></th>${V.map(v => `<th>${v[0]}</th>`).join('')}</tr>
${rows.map(([l, fn, n = '']) => `<tr><th>${l}${n ? ` <span class="note">(${n})</span>` : ''}</th>${J.map(j => `<td>${fn(j[id])}</td>`).join('')}</tr>`).join('\n')}</table>`;
const block = ([id, title]) => `<section><h2>${title}</h2>
<div class="pair">${V.map((v, i) => ` <figure><canvas data-case="${id}" data-which="${i}" width="540" height="350"></canvas><figcaption>${v[0]}</figcaption></figure>`).join('')}</div>
<div class="stills">${V.map((v, i) => `<div><b>${v[0]}</b><div class="row">${STILLS.map(t => `<a href="${v[1]}/${id}/still-${t}.png"><img loading="lazy" src="${v[1]}/${id}/still-${t}.png" alt="${v[0]} ${t}s"><span>${t} s</span></a>`).join('')}</div></div>`).join('')}</div>
${table(id)}</section>`;
const ALL = ['lou-george', 'george-lou', 'kowalski-george', 'guido-lou'];
const allTable = `<table><tr><th>attacker (vs)</th><th>version</th><th>backward-fold frames</th><th>support slide worst / over 1.5</th><th>sole vs belly at impact (h / v px)</th></tr>
${ALL.flatMap(p => J.map((j, i) => { const r = j[`${p}-right`]; return `<tr><td>${p.replace('-', ' (vs ')})</td><td>${V[i][0]}</td><td>${r.backwardFoldFrames} of ${r.frames}</td><td>${f(r.supportSlide.max)} / ${r.supportSlideOver15}</td><td>${r.soleContactAtImpact ? `${f(r.soleContactAtImpact.dx, 1)} / ${f(r.soleContactAtImpact.dy, 1)}` : 'not measured'}</td></tr>`; })).join('\n')}</table>`;
const data = Object.fromEntries(CASES.flatMap(([id]) => V.map((v, i) => [`${id}/${i}`, frames(v[1], id)])));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Front kick round two</title>
<style>
:root{color-scheme:light dark;--bg:#f4f1ea;--fg:#1d1b17;--mut:#6a645a;--line:#cfc8b8;--card:#fffdf7}
@media (prefers-color-scheme:dark){:root{--bg:#161512;--fg:#ece7da;--mut:#a39c8c;--line:#3a362e;--card:#1e1c18}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;max-width:1280px;margin-inline:auto}
h1{font-size:1.3rem;margin:.2em 0}h2{font-size:1.05rem;margin:1.6em 0 .4em;border-top:1px solid var(--line);padding-top:.8em}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px}figcaption{color:var(--mut);font-size:.85rem}
canvas{width:100%;height:auto;display:block;background:#000}
.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:.6em 0}button{font:inherit;padding:4px 12px}
.stills{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:10px;margin-top:8px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.row a{color:var(--mut);font-size:.8rem;text-decoration:none}.row img{width:100%;display:block;border:1px solid var(--line)}
table{border-collapse:collapse;width:100%;margin-top:10px;background:var(--card)}th,td{border:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}th:first-child{font-weight:500}.note{color:var(--mut);font-size:.85rem}
p.s{color:var(--mut);margin:.2em 0}
</style></head><body>
<h1>Front kick, round two: the stomach kick (G1)</h1>
<p class="s">Left: <code>frontKick</code> as it plays now. Middle: the first <code>frontKickV2</code> pass (e27939c). Right: Codex's revision on top of it, all under <code>?light=v1</code>: the kicker stands further back (standoff 128 instead of 84) and the leg is higher, so the sole meets the abdomen above the trunks; the receiver now folds forward (<code>sellGut</code>, hands in) instead of snapping back, the recoil is a short 10-unit step, and the planted support foot gives a light canvas thump. Same 0.68 s, impact at 0.3 s, damage unchanged. The measured numbers are Lou's; Kowalski, George and Guido are not cleared (table at the bottom). Loops at normal speed (30 fps of the 60 Hz game, every second frame). Measured, not judged.</p>
<div class="controls"><button id="play">Pause</button><label>speed <select id="speed"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label></div>
${CASES.map(block).join('\n')}
<h2>All four attackers, facing right</h2>
${allTable}
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
writeFileSync(`${out}/index.html`, html);
console.log('wrote', `${out}/index.html`);
