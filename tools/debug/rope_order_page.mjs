// PLAN_ROPES T0.2: the worst-frame page from rope_order_probe.mjs output.
//   node tools/debug/rope_order_page.mjs [dir=research/ropes-2026-11/r0]   -> <dir>/index.html (open it from file://; stills and film are relative)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'research/ropes-2026-11/r0';
const P = JSON.parse(readFileSync(join(dir, 'probe.json'), 'utf8'));
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const table = (rows, cols) => rows.length ? `<table><tr>${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}</tr>${rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c[0]])}</td>`).join('')}</tr>`).join('')}</table>` : '<p class="dim">none</p>';
const tcols = [['key', 'key'], ['frames', 'man-frames'], ['maxPx', 'max px'], ['sumPx', 'sum px']];
const S = P.summary;

const caption = (e, kind) => {
    const rows = e.recs.map(r => {
        const w = Object.entries(r.wrongTally ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.replace(/\|/g, ' · ')}: ${v}px`).join('<br>');
        const p = Object.entries(r.penTally ?? {}).sort((a, b) => b[1].px - a[1].px).map(([k, v]) => `${k.replace('|', ' · ')}: ${v.px}px, ${v.past.toFixed(1)} past the plane`).join('<br>');
        return `<tr><td>${esc(r.who === 1 ? 'w1' : 'w2')} ${esc(r.rig)}</td><td>x ${r.x}, y ${r.y}${r.onRopes ? ` (ground ${r.gy})` : ''}<br>${esc(r.region)}</td><td>${esc(r.mv ? 'move ' + r.mv : r.st)}</td><td>${kind === 'wrong' ? r.wrong : r.penPx}</td><td>${kind === 'wrong' ? w : p}</td></tr>`;
    }).join('');
    return `<table class="cap"><tr><th>man</th><th>root</th><th>state</th><th>${kind === 'wrong' ? 'wrong-order px' : 'penetration px'} (this man)</th><th>${kind === 'wrong' ? 'wall+rope · part · drawn order' : 'wall+rope · part'}</th></tr>${rows}</table>`;
};
const card = (e, i, kind) => `<section class="card">
  <h3>${kind === 'wrong' ? 'Wrong order' : 'Penetration'} #${i + 1}: ${e.score} px <span class="dim">· run ${esc(e.run)} · game frame ${e.f}</span></h3>
  <div class="pair"><div class="full"><img src="${e.file}" data-i="${kind}${i}" alt=""><svg class="marks" data-i="${kind}${i}"></svg></div><canvas class="zoom" data-i="${kind}${i}"></canvas></div>
  ${caption(e, kind)}
  <p class="dim">${kind === 'wrong' ? 'red = ink px where the strand is drawn on the wrong side of the part' : 'blue = ink px beyond a side strand\'s plane within 3 px of that strand\'s drawn height'}. Right: 4x crop of the marks.</p>
</section>`;

let film = '';
for (const f of P.film ?? []) {
    const frames = readdirSync(join(dir, 'film', f.rig)).filter(n => n.endsWith('.jpg')).sort();
    film += `<section class="card"><h3>Far-edge walk, ${esc(f.rig)} <span class="dim">· 30 fps, normal speed, both far corners and back (left then right facing)</span></h3>
    <div class="strip" data-dir="film/${f.rig}" data-n="${frames.length}"><img alt=""><div class="ctl"><button>pause</button><input type="range" min="0" max="${frames.length - 1}" value="0"><span></span></div></div></section>`;
}

const sumRows = (arr) => (arr ?? []).slice(0, 12);
const runRows = P.perRun.filter(r => r.wrongFrames || r.penFrames).sort((a, b) => b.maxWrongPx - a.maxWrongPx || b.maxPenPx - a.maxPenPx);
const wallTotals = Object.entries(S.crossingPxByWall ?? {}).map(([k, v]) => `${k} ${v}`).join(', ');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rope order R0</title>
<style>
:root{--bg:#15171c;--fg:#e6e8ee;--dim:#8d93a3;--card:#1e2128;--line:#2e323c;--red:#ff4d4d;--blue:#4da3ff}
@media (prefers-color-scheme: light){:root{--bg:#f4f5f8;--fg:#1b1e26;--dim:#667085;--card:#fff;--line:#d9dce4}}
body{background:var(--bg);color:var(--fg);font:14px/1.45 -apple-system,system-ui,sans-serif;margin:0;padding:16px;max-width:1240px;margin:0 auto}
h1{font-size:22px;margin:4px 0}h2{margin:28px 0 8px;font-size:18px}h3{margin:0 0 8px;font-size:15px}
.dim{color:var(--dim)}.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}
.pair{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}.full{position:relative;flex:1 1 560px;max-width:700px}.full img{width:100%;display:block}
.marks{position:absolute;left:0;top:0;width:100%;height:100%}.zoom{flex:1 1 300px;max-width:520px;width:100%;background:#000}
table{border-collapse:collapse;font-size:12px;margin:6px 0}th,td{border:1px solid var(--line);padding:3px 7px;text-align:left;vertical-align:top}.cap{width:100%}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.strip img{width:100%;display:block;background:#000}.ctl{display:flex;gap:8px;align-items:center;margin-top:6px}.ctl input{flex:1}
</style></head><body>
<h1>Ropes R0: what the game draws today</h1>
<p class="dim">Measured by tools/debug/rope_order_probe.mjs on the game as it is (no flag, no src change). ${esc(P.made)}. Crossing = a painted pixel of a body part lying on a drawn strand. A crossing is <b>wrong</b> when the strand's drawn depth puts it on the other side of the part from where its ground position says it belongs (strand ground y vs the man's ground y).</p>
<div class="card"><b>${S.totalManFrames}</b> man-frames measured (runs a/b/c/d). <b>${S.crossingManFrames}</b> had a strand over/under ink; <b>${S.wrongManFrames}</b> had a wrong-order crossing; <b>${S.penetrationManFrames}</b> had ink past a side-wall plane at a strand's height (max ${S.penMaxPast.toFixed(1)} px past, climbing/turnbuckle excluded).
<br><span class="dim">Crossing px summed over all frames by wall: ${esc(wallTotals)}. Near and far strands were never wrong-ordered unless listed below; their draw order is fixed.</span></div>
<h2>Wrong-order totals</h2>
<div class="grid"><div><b>by wall</b>${table(sumRows(S.wrongByWall), tcols)}</div><div><b>by strand (L/R/near/far + rope 0 bottom, 2 top)</b>${table(sumRows(S.wrongByStrand), tcols)}</div><div><b>by ring region</b>${table(sumRows(S.wrongByRegionAll), tcols)}</div><div><b>by part</b>${table(sumRows(S.wrongByPart), tcols)}</div><div><b>by state / move</b>${table(sumRows(S.wrongByState), tcols)}</div><div><b>by drawn order</b>${table(sumRows(S.wrongByOrder), tcols)}<p class="dim">strandOver = strand drawn over the part but belongs behind it; strandUnder = drawn under but belongs in front.</p></div></div>
<h2>Penetration totals</h2>
<div class="grid"><div><b>by run</b>${table(sumRows(S.penByRun), tcols)}</div><div><b>by state / move</b>${table(sumRows(S.penByState), tcols)}</div><div><b>by part</b>${table(sumRows(S.penByPart), tcols)}</div><div><b>by strand</b>${table(sumRows(S.penByStrand), tcols)}</div></div>
<h2>Runs with a miss</h2>${table(runRows.slice(0, 30), [['run', 'run'], ['frames', 'frames'], ['wrongFrames', 'wrong-order man-frames'], ['maxWrongPx', 'max wrong px'], ['penFrames', 'penetration man-frames'], ['maxPenPx', 'max pen px']])}
<h2>Worst ${P.pools.wrong.length} wrong-order frames</h2>${P.pools.wrong.map((e, i) => card(e, i, 'wrong')).join('')}
<h2>Worst ${P.pools.pen.length} penetrations</h2>${P.pools.pen.map((e, i) => card(e, i, 'pen')).join('')}
<h2>Far-edge walk at normal speed</h2>${film || '<p class="dim">no film in this run</p>'}
<script>
const POOLS = ${JSON.stringify({ wrong: P.pools.wrong.map(e => ({ scr: e.scr, cells: e.recs.flatMap(r => r.wrongCells ?? []) })), pen: P.pools.pen.map(e => ({ scr: e.scr, cells: e.recs.flatMap(r => r.penCells ?? []) })) })};
const draw = (img) => {
  const [kind, i] = [img.dataset.i.replace(/\\d+$/, ''), +img.dataset.i.replace(/^\\D+/, '')], e = POOLS[kind][i], col = kind === 'wrong' ? '#ff4d4d' : '#4da3ff';
  const nw = img.naturalWidth, nh = img.naturalHeight, k = nw / e.scr.w;
  const pts = e.cells.map(([X, Y]) => [(X * e.scr.kx + e.scr.ox) * k, (Y * e.scr.ky + e.scr.oy) * k]);
  const svg = document.querySelector('svg[data-i="' + img.dataset.i + '"]'); svg.setAttribute('viewBox', '0 0 ' + nw + ' ' + nh);
  svg.innerHTML = pts.map(p => '<rect x="' + (p[0] - 1) + '" y="' + (p[1] - 1) + '" width="2" height="2" fill="' + col + '" opacity=".85"/>').join('');
  if (!pts.length) return;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 50, x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad), x1 = Math.min(nw, Math.max(...xs) + pad), y1 = Math.min(nh, Math.max(...ys) + pad);
  const Z = Math.max(2, Math.min(5, Math.floor(480 / Math.max(x1 - x0, 1)))), cv = document.querySelector('canvas[data-i="' + img.dataset.i + '"]');
  cv.width = (x1 - x0) * Z; cv.height = (y1 - y0) * Z; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, cv.width, cv.height);
  c.fillStyle = col; c.globalAlpha = .55; pts.forEach(p => c.fillRect((p[0] - x0 - 0.5) * Z, (p[1] - y0 - 0.5) * Z, Z, Z));
};
document.querySelectorAll('.full img').forEach(img => img.complete ? draw(img) : img.addEventListener('load', () => draw(img)));
document.querySelectorAll('.strip').forEach(el => {
  const n = +el.dataset.n, img = el.querySelector('img'), rng = el.querySelector('input'), btn = el.querySelector('button'), lab = el.querySelector('span'), cache = [];
  for (let i = 0; i < n; i++) { const m = new Image(); m.src = el.dataset.dir + '/f' + String(i).padStart(4, '0') + '.jpg'; cache.push(m); }
  let i = 0, playing = true, last = 0;
  const show = (j) => { i = j; img.src = cache[j].src; rng.value = j; lab.textContent = (j + 1) + ' / ' + n; };
  const tick = (t) => { if (playing && t - last >= 1000 / 30) { last = t; show((i + 1) % n); } requestAnimationFrame(tick); };
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? 'pause' : 'play'; }; rng.oninput = () => { playing = false; btn.textContent = 'play'; show(+rng.value); };
  show(0); requestAnimationFrame(tick);
});
</script></body></html>`;
writeFileSync(join(dir, 'index.html'), html);
console.log(`wrote ${join(dir, 'index.html')}`);
