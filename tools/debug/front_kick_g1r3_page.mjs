// PLAN_LIGHT_MOVES G1 round 3: frontKick (now) | frontKickV2 with the stomp restored (Lou gets Kowalski's stomp) and the gut sell (stumble, knees give, holds his stomach), Lou and Kowalski on George,
// both facings, normal-speed loops and stills, the audit numbers beside each. Reads t1-5/{before,new}.json and the frames of t1-5/{before,after}.
//   node tools/debug/front_kick_g1r3_page.mjs research/animation/light-moves-2026-11
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = process.argv[2], out = `${root}/t1-5`;
const J = [JSON.parse(readFileSync(`${root}/t1-1/old.json`)), JSON.parse(readFileSync(`${root}/t1-5/new.json`))];
const V = [['frontKick (now)', 'before'], ['stomp + gut sell', 'after']];
const CASES = [['lou-george-right', 'Lou kicks George, facing right'], ['lou-george-left', 'Lou kicks George, facing left'], ['kowalski-george-right', 'Kowalski kicks George, facing right'], ['kowalski-george-left', 'Kowalski kicks George, facing left']];
const STILLS = [0.22, 0.3, 0.46, 0.8, 1.1, 1.5, 2];
const f = (v, n = 2) => (v === null || v === undefined ? 'n/a' : (+v).toFixed(n).replace(/\.?0+$/, ''));
const frames = (sub, id) => readdirSync(`${out}/${sub}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${sub}/${id}/${n}`);
const sellPeak = (r) => (r.defenderSell ? Math.max(...r.defenderSell.map(x => x.bend), ...(r.defenderAfter ?? []).map(x => x.bend)) : null);
const all = (r) => [...(r.defenderSell ?? []).map(x => ({ t: x.t, bend: x.bend, x: x.neck?.x, crouch: null })), ...(r.defenderAfter ?? [])];
const held = (r) => { const a = (r.defenderAfter ?? []).filter(x => x.bend >= 0.45); return a.length ? `${f(a.at(-1).t - a[0].t + 0.083, 1)} s (${f(a[0].t, 1)} to ${f(a.at(-1).t, 1)})` : 'none'; };
const crouchPeak = (r) => (r.defenderAfter?.length ? f(Math.max(...r.defenderAfter.map(x => x.crouch)), 2) : 'not measured');
const travel = (r) => (r.defenderAfter?.length ? `${f(r.defenderAfter.at(-1).x - r.defenderAfter[0].x + 0, 0)} px after the clip` : 'n/a');
const rows = [
    ['frames with a backward-folded knee', r => `${r.backwardFoldFrames} of ${r.frames}`, 'bar 0'],
    ['frames with a drawn knee at its limit (longest run)', r => `${r.satFrames.near + r.satFrames.far} (${r.satFrames.longestRun})`, 'bar: run <= 2'],
    ['support knee bend, min .. max (rad)', r => `${f(r.kneeDrawn.far.min)} .. ${f(r.kneeDrawn.far.max)}`],
    ['support sole slide, worst px/frame / frames over 1.5', r => `${f(r.supportSlide.max)} / ${r.supportSlideOver15}`, 'bar 1.5'],
    ['support sole, lowest world y (the mat is 400)', r => f(r.supportSoleY.max, 0), 'past 400 = through the mat'],
    ['hips above the mat, lowest (px)', r => f(r.hipDrop.min, 0)],
    ['painted kicking sole vs his belly at impact: horizontal / vertical (px)', r => (r.soleContactAtImpact ? `${f(r.soleContactAtImpact.dx, 1)} / ${f(r.soleContactAtImpact.dy, 1)}` : 'not measured'), '- = past / above the belly midpoint'],
    ['receiver bend peak (pose bend, rad)', r => (sellPeak(r) === null ? 'not measured' : f(sellPeak(r))), 'was 0.95 in round 2'],
    ['receiver bent over (bend >= 0.45) for', r => held(r), 'the hold; sampled every 0.08 s'],
    ['receiver crouch peak after the clip (his knees giving)', r => crouchPeak(r), 'rad'],
    ['receiver travel back while staggering', r => travel(r)],
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
<h1>Front kick, round three: the stomp and the gut sell (G1)</h1>
<p class="s">Left: <code>frontKick</code> as it plays now. Right: <code>frontKickV2</code> under <code>?light=v1</code>. The kicking leg is the first-pass stomp you liked on Kowalski (body sinks onto the planted support leg, the leg drives out and down into the belly), unchanged for Kowalski; Lou has his own table with the same stomp and the thigh carried higher, so his sole lands where Kowalski's does. The receiver no longer folds as far (bend 0.6, was 0.95): he stumbles back a couple of short steps with his knees giving, stays bent over holding his stomach for two slow beats, then straightens. Same 0.68 s, impact at 0.3 s, damage unchanged. Loops include the sell after the kick (about 3.3 s at normal speed). Measured, not judged.</p>
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
