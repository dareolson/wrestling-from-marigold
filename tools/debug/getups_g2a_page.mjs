// G2a page (PLAN_GETUPS Stage 3): the rough keys of frontKnee and backTuck beside the Bret reference, posed on Lou and George,
// plus normal-speed loops today | new. Reads the film folders written by getups_film.mjs.
//   node tools/debug/getups_g2a_page.mjs [outDir=research/animation/getups-2026-10/g2a]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const out = process.argv[2] ?? 'research/animation/getups-2026-10/g2a';
mkdirSync(out, { recursive: true });
const REF = '../../../../Sprite%20sheets/reference/wwf-royal-rumble-snes/44459-bret-hart/';
const FAMILIES = [
    { id: 'frontKnee', dir: 'research/animation/getups-2026-10/g2a-frontKnee', title: 'frontKnee (from the front, face down)', ref: [244, 258],
      keys: 'flat on the face &rarr; push up on both hands (t .22) &rarr; all fours (.42) &rarr; one knee under, far foot planted, far hand to its knee (.62, the flip) &rarr; push off it (.82) &rarr; standing. A turn shows the flip key twice.' },
    { id: 'backTuck', dir: 'research/animation/getups-2026-10/g2a-backTuck', title: 'backTuck (from the back, no turn)', ref: [62, 68],
      keys: 'flat on the back &rarr; propped on both hands behind (.30) &rarr; feet drawn in under him (.52) &rarr; leaning forward over them, hands off the mat to the knees (.74) &rarr; standing. No turn, so only the opponent-in-front case.' },
];
const rel = (p) => relative(out, p).split('\\').join('/');
const refStrip = ([a, b]) => `<div class="strip">${Array.from({ length: b - a + 1 }, (_, i) => `<figure><img class="px" src="${REF}f${String(a + i).padStart(3, '0')}.png"><figcaption>f${a + i}</figcaption></figure>`).join('')}</div>`;
let html = `<!doctype html><meta charset="utf-8"><title>G2a: frontKnee and backTuck keys</title>
<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1,h2{font-weight:600}h4{margin:14px 0 4px;color:#9ad}
.strip{display:flex;overflow-x:auto;gap:0}figure{margin:0;flex:none}figure img{height:200px;display:block}figcaption{font-size:12px;color:#aaa;text-align:center}
.px{image-rendering:pixelated;height:200px!important}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:340px}canvas{background:#000;display:block}
.note{background:#2a2a2a;padding:8px 12px;border-left:3px solid #c84;margin:10px 0}button{font:inherit;padding:4px 10px}</style>
<h1>G2a: do these keys look right to start from?</h1>
<p>Rough, untuned <b>frontKnee</b> and <b>backTuck</b> (PLAN_GETUPS Stage 3). No measuring pass yet; Derek judges. Forced rises, full stamina, no back pain, 1&times; speed, 60 fps stepping, played with <code>?getups=v1&amp;getup=&lt;family&gt;</code>.</p>
`;
const loops = [];
for (const f of FAMILIES) {
    const film = JSON.parse(readFileSync(join(f.dir, 'film.json'), 'utf8'));
    const runs = film.filter((r) => r.rows), poses = film.filter((r) => r.poseTimes);
    const newRuns = runs.filter((r) => r.column === 'new');
    const maxStep = Math.max(...newRuns.map((r) => r.maxStep)), todayMax = Math.max(...runs.filter((r) => r.column === 'today').map((r) => r.maxStep));
    html += `<h2>${f.title}</h2><div class="note"><b>Known so far (measured, not judged):</b> rise ${[...new Set(newRuns.map((r) => r.riseMs))].join(' / ')} ms (today ${[...new Set(runs.filter((r) => r.column === 'today').map((r) => r.riseMs))].join(' / ')} ms); largest per-part step in the new rise ${maxStep} px/frame (today ${todayMax}); facing at standing: ${newRuns.map((r) => `${r.rig} ${r.facing < 0 ? 'L' : 'R'} ${r.opp}: ${r.facingStart < 0 ? 'L' : 'R'}&rarr;${r.facingEnd < 0 ? 'L' : 'R'}`).join('; ')}. The mat-point push-up hand target is not built yet (hands are only the keys' arms until the far hand reaches its knee).</div>
<h4>Reference: Bret frames ${f.ref[0]}&ndash;${f.ref[1]} (pose reference only, local)</h4>${refStrip(f.ref)}
<h4>The keys, posed on Lou and George</h4><p>${f.keys}</p>`;
    for (const p of poses) {
        const id = `${p.rig}-${p.facing < 0 ? 'l' : 'r'}-${p.opp}`;
        const turn = p.opp === 'behind' ? 'he turns' : 'no turn';
        const flipI = p.poseTimes.findIndex((t, i) => i > 0 && p.poseTimes[i] - p.poseTimes[i - 1] === 0.002) ;
        html += `<div class="row"><h4>${p.rig} &middot; facing ${p.facing < 0 ? 'left' : 'right'} &middot; opponent ${p.opp === 'behind' ? 'behind' : 'in front'}: ${turn}</h4><div class="strip">${p.poseTimes.map((t, i) => `<figure><img src="${rel(join(f.dir, 'poses', id))}/p${String(i).padStart(2, '0')}.jpg"><figcaption>t ${t.toFixed(2)}</figcaption></figure>`).join('')}</div></div>`;
    }
    html += `<h4>Normal-speed loop, today | new (each loops: rise, then 2 s standing)</h4>`;
    const ids = [...new Set(runs.map((r) => `${r.rig}-${r.facing < 0 ? 'l' : 'r'}-${r.opp}`))];
    for (const id of ids) {
        const cell = (col) => { const r = runs.find((q) => q.column === col && `${q.rig}-${q.facing < 0 ? 'l' : 'r'}-${q.opp}` === id);
            loops.push(1); return `<div class="cell"><canvas data-dir="${rel(join(f.dir, 'frames', col, id))}" data-n="${r.frames}" width="340" height="330"></canvas><div class="cap">${col}: ${r.getUp ?? 'legacy'} &middot; rise ${r.riseMs} ms &middot; facing ${r.facingStart < 0 ? 'L' : 'R'}&rarr;${r.facingEnd < 0 ? 'L' : 'R'} &middot; largest part step ${r.maxStep} px</div></div>`; };
        html += `<div class="row"><h4>${id}</h4><div class="pair">${cell('today')}${cell('new')}</div></div>`;
    }
}
html += `<p><button id="pp">pause</button></p><script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false;
const imgs=cvs.map(c=>{const n=+c.dataset.n;return Array.from({length:n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im})});
let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach((c,k)=>{const a=imgs[k];const im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
writeFileSync(join(out, 'index.html'), html);
console.log('wrote', join(out, 'index.html'), loops.length, 'loops');
