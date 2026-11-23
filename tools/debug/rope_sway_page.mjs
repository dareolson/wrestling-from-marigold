// PLAN_ROPES T1.6: strips of the slam beside a side wall at ?ropeSway 0.5 / 1 / 2, both facings (left wall, right wall), one card per slammer rig; 30 fps, normal speed.
//   node tools/debug/rope_sway_page.mjs <outDir> <dir05> <dir1> <dir2>   (each from rope_order_probe.mjs --sway --shots)
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
const [outDir, ...dirs] = process.argv.slice(2), scales = ['0.5', '1', '2'];
mkdirSync(outDir, { recursive: true });
dirs.forEach((d, i) => cpSync(d, join(outDir, 's' + scales[i]), { recursive: true }));
const rows = JSON.parse(readFileSync(join(dirs[1], 'sway.json')));
const cards = rows.filter(r => r.wall !== 'N').map(r => `<section><h3>${r.rig} slams · ${r.wall === 'L' ? 'left' : 'right'} side wall</h3><div class="strip" data-n="${r.frames}" data-k="${r.rig}-${r.wall}">
${scales.map(s => `<figure><figcaption>ropeSway ${s}</figcaption><img data-s="s${s}"></figure>`).join('')}<div class="ctl"><button>pause</button><input type="range" min="0" max="${r.frames - 1}" value="0"><span></span></div></div></section>`).join('');
writeFileSync(join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rope sway strips</title>
<style>body{font:14px system-ui;background:#16161a;color:#ddd;margin:16px}h1{font-size:18px}h3{margin:18px 0 6px;font-size:14px}.strip{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}figure{margin:0}figcaption{font-size:12px;color:#999}img{width:100%;display:block;background:#000}.ctl{grid-column:1/4;display:flex;gap:8px;align-items:center}.ctl input{flex:1}</style>
<h1>Bottom strand sway after a slam beside the wall: ropeSway 0.5 | 1 | 2 (30 fps)</h1>${cards}
<script>for(const el of document.querySelectorAll('.strip')){const n=+el.dataset.n,k=el.dataset.k,imgs=[...el.querySelectorAll('img')],r=el.querySelector('input'),b=el.querySelector('button'),sp=el.querySelector('span');let i=0,play=true;
const show=()=>{for(const im of imgs)im.src=im.dataset.s+'/'+k+'/f'+String(i).padStart(4,'0')+'.jpg';r.value=i;sp.textContent=i+'/'+(n-1)};
setInterval(()=>{if(play){i=(i+1)%n;show()}},1000/30);r.oninput=()=>{i=+r.value;play=false;b.textContent='play';show()};b.onclick=()=>{play=!play;b.textContent=play?'pause':'play'};show()}</script>`);
console.log('wrote', join(outDir, 'index.html'));
