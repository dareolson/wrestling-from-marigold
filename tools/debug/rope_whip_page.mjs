// PLAN_ROPES T1.4 / T2.3: side-by-side strips, left | right (labels from env LEFT / RIGHT, default old | ?ropes=v1; TITLE; peak-<rig>-<wall>.png stills shown above each strip when both runs have them), normal speed (30 fps), one card per whipper rig and wall.
//   node tools/debug/rope_whip_page.mjs <oldDir> <v1Dir> <outDir>   (oldDir / v1Dir hold whip/<rig>-<wall>/fNNNN.jpg from rope_order_probe.mjs --whip)
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [oldDir, v1Dir, outDir] = process.argv.slice(2), LEFT = process.env.LEFT ?? 'old', RIGHT = process.env.RIGHT ?? '?ropes=v1', TITLE = process.env.TITLE ?? 'Irish whip into the ropes';
mkdirSync(outDir, { recursive: true });
cpSync(join(oldDir, 'whip'), join(outDir, 'old'), { recursive: true });
cpSync(join(v1Dir, 'whip'), join(outDir, 'v1'), { recursive: true });
const idx = JSON.parse(readFileSync(join(v1Dir, 'whip', 'index.json')));
const names = { L: 'left side wall', R: 'right side wall', FL: 'far-left corner', FR: 'far-right corner', W: 'far-edge walk, both corners' };
const has = (d, e) => existsSync(join(d, 'whip', `peak-${e.rig}-${e.wall}.png`));
const card = e => `<section><h3>${e.rig} · ${names[e.wall]}</h3>${has(oldDir, e) && has(v1Dir, e) ? `<div class="still"><figure><figcaption>${LEFT}: largest bow</figcaption><img src="old/peak-${e.rig}-${e.wall}.png"></figure><figure><figcaption>${RIGHT}: largest bow</figcaption><img src="v1/peak-${e.rig}-${e.wall}.png"></figure></div>` : ''}<div class="strip" data-n="${e.frames}" data-k="${e.rig}-${e.wall}">
<figure><figcaption>${LEFT}</figcaption><img data-s="old"></figure><figure><figcaption>${RIGHT}</figcaption><img data-s="v1"></figure>
<div class="ctl"><button>pause</button><input type="range" min="0" max="${e.frames - 1}" value="0"><span></span></div></div></section>`;
writeFileSync(join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rope whip strips</title>
<style>body{font:14px system-ui;background:#16161a;color:#ddd;margin:16px}h1{font-size:18px}h3{margin:18px 0 6px;font-size:14px}.strip,.still{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px}figure{margin:0}figcaption{font-size:12px;color:#999}img{width:100%;display:block;background:#000}.ctl{grid-column:1/3;display:flex;gap:8px;align-items:center}.ctl input{flex:1}</style>
<h1>${TITLE}: ${LEFT} | ${RIGHT} (30 fps, normal speed)</h1>${idx.map(card).join('')}
<script>for(const el of document.querySelectorAll('.strip')){const n=+el.dataset.n,k=el.dataset.k,imgs=[...el.querySelectorAll('img')],r=el.querySelector('input'),b=el.querySelector('button'),sp=el.querySelector('span');let i=0,play=true;
const show=()=>{for(const im of imgs)im.src=im.dataset.s+'/'+k+'/f'+String(i).padStart(4,'0')+'.jpg';r.value=i;sp.textContent=i+'/'+(n-1)};
setInterval(()=>{if(play){i=(i+1)%n;show()}},1000/30);r.oninput=()=>{i=+r.value;play=false;b.textContent='play';show()};b.onclick=()=>{play=!play;b.textContent=play?'pause':'play'};show()}</script>`);
console.log('wrote', join(outDir, 'index.html'));
