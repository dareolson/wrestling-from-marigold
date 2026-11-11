// PLAN_LIGHT_MOVES T1.3 G1 page: frontKick vs frontKickV2 (?light=v1), Lou on George and Kowalski on George, both facings, normal-speed loops and stills, the audit numbers beside
// each, and the all-rig table (Lou, George, Kowalski, Guido as attacker). Reads <dir>/t1-1/old.json, t1-2/new.json, t1-3/{before,after}.json and t1-3/{before,after}/<case>/.
//   node tools/debug/front_kick_g1_page.mjs research/animation/light-moves-2026-11
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = process.argv[2], dir = `${root}/t1-3`;
const OLD = JSON.parse(readFileSync(`${root}/t1-1/old.json`)), NEW = JSON.parse(readFileSync(`${root}/t1-2/new.json`));
const CASES = [['lou-george-right', 'Lou kicks George, facing right'], ['lou-george-left', 'Lou kicks George, facing left'], ['kowalski-george-right', 'Kowalski kicks George, facing right'], ['kowalski-george-left', 'Kowalski kicks George, facing left']];
const STILLS = [0.12, 0.22, 0.3, 0.36, 0.46, 0.58];
const f = (v, n = 2) => (v === null || v === undefined ? 'n/a' : (+v).toFixed(n).replace(/\.?0+$/, ''));
const frames = (sub, id) => readdirSync(`${dir}/${sub}/${id}`).filter(n => /^s\d+\.jpg$/.test(n)).sort().map(n => `${sub}/${id}/${n}`);
const R = (J, id, fn) => fn(J[id]);
const rows = (id) => [
    ['drawn knee, kicking leg, min .. max (rad; < -0.10 is a backward fold)', r => `${f(r.kneeDrawn.near.min)} .. ${f(r.kneeDrawn.near.max)}`, 'bar: no negative'],
    ['frames with a backward-folded knee', r => `${r.backwardFoldFrames} of ${r.frames}`, 'bar 0'],
    ['frames with a drawn knee at its limit (longest run)', r => `${r.satFrames.near + r.satFrames.far} (${r.satFrames.longestRun})`, 'bar: run <= 2'],
    ['support knee bend, min .. max (rad)', r => `${f(r.kneeDrawn.far.min)} .. ${f(r.kneeDrawn.far.max)}`, 'weight on it'],
    ['support sole slide, worst px/frame / frames over 1.5', r => `${f(r.supportSlide.max)} / ${r.supportSlideOver15}`, 'bar 1.5'],
    ['... frames over 1.5 at (s, px)', r => r.supportSlideOverAt.map(([t, v]) => `${t}: ${v}`).join(', ') || 'none'],
    ['support sole height, lowest .. highest (world y; the mat is 400)', r => `${f(r.supportSoleY.min, 0)} .. ${f(r.supportSoleY.max, 0)}`, 'below 400 = through the mat'],
    ['hips above the mat, lowest .. highest (px)', r => `${f(r.hipDrop.min, 0)} .. ${f(r.hipDrop.max, 0)}`],
    ['impact (s): kicking ankle short of his belly (px, - = past it) / ankle height (px)', r => `${r.impact.t}: ${f(r.impact.kickBootGap, 1)} / ${f(r.impact.kickBootHeight, 0)}`, 'his belly is ~144 px up'],
];
const table = (id) => `<table><tr><th></th><th>frontKick (now)</th><th>frontKickV2</th><th></th></tr>
${rows(id).map(([l, fn, n = '']) => `<tr><th>${l}</th><td>${fn(OLD[id])}</td><td>${fn(NEW[id])}</td><td class="note">${n}</td></tr>`).join('\n')}</table>`;
const block = ([id, title]) => `<section><h2>${title}</h2>
<div class="pair">${['before', 'after'].map(k => ` <figure><canvas data-case="${id}" data-which="${k}" width="540" height="350"></canvas><figcaption>${k === 'before' ? 'frontKick (now)' : 'frontKickV2 (?light=v1)'}</figcaption></figure>`).join('')}</div>
<div class="stills">${['before', 'after'].map(k => `<div><b>${k === 'before' ? 'frontKick (now)' : 'frontKickV2'}</b><div class="row">${STILLS.map(t => `<a href="${k}/${id}/still-${t}.png"><img loading="lazy" src="${k}/${id}/still-${t}.png" alt="${k} ${t}s"><span>${t} s</span></a>`).join('')}</div></div>`).join('')}</div>
${table(id)}</section>`;
const ALL = ['lou-george', 'george-lou', 'kowalski-george', 'guido-lou'];
const allTable = `<table><tr><th>attacker (vs)</th><th>version</th><th>backward-fold frames</th><th>support slide worst / over 1.5</th><th>impact: ankle short of belly / height</th></tr>
${ALL.flatMap(p => [['frontKick', OLD], ['frontKickV2', NEW]].map(([n, J]) => { const r = J[`${p}-right`]; return `<tr><td>${p.replace('-', ' (vs ')})</td><td>${n}</td><td>${r.backwardFoldFrames} of ${r.frames}</td><td>${f(r.supportSlide.max)} / ${r.supportSlideOver15}</td><td>${f(r.impact.kickBootGap, 1)} / ${f(r.impact.kickBootHeight, 0)}</td></tr>`; })).join('\n')}</table>`;
const data = Object.fromEntries(CASES.flatMap(([id]) => ['before', 'after'].map(k => [`${id}/${k}`, frames(k, id)])));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Front kick rebuild</title>
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
<h1>Front kick rebuild (T1.1 to T1.3, G1)</h1>
<p class="s">Left: <code>frontKick</code> as it plays now. Right: <code>frontKickV2</code> under <code>?light=v1</code>: same 0.68 s, same impact frame (0.3 s), same arms and trunk keys; legs re-authored. The weight goes onto the support leg, whose painted sole is held on the mat by a plant while the knee bends; the kicking knee chambers with the shin hanging, then the leg pushes out into the belly and returns through the chamber. The old clip folded the kicking knee backward (a positive <code>lKnee</code> 1.55 and 1.3) and let the rig's pelvis solve sink the support foot through the mat. Kowalski and Guido are the only kits that hold the kick; Lou and George are shown because they are the measured pair and the art bar. Loops run at normal speed (30 fps of the 60 Hz game, every second frame). Numbers are measured, not judged.</p>
<div class="controls"><button id="play">Pause</button><label>speed <select id="speed"><option value="1">normal</option><option value="0.5">half</option><option value="0.25">quarter</option></select></label></div>
${CASES.map(block).join('\n')}
<h2>All four attackers, facing right (the left facing measures the same)</h2>
<p class="s">George kicking Lou and Guido kicking Lou are measured but not on this page; both still miss the slide bar (see Progress).</p>
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
writeFileSync(`${dir}/index.html`, html);
console.log('wrote', `${dir}/index.html`);
