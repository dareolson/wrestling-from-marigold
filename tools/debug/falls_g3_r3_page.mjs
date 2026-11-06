// PLAN_FALLS T3.16: the G3 r3 page, research/animation/falls-2026-11/g3/r3.html. Reads what T3.15/T3.16 wrote:
//   g3/wear, wear2, wear3 (+ table.json each: falls_g3_soak, then falls_g3_wear_table --json), g3/r3clip (falls_g3_r3_clip).
//   node tools/debug/falls_g3_r3_page.mjs [checksLine] [clipDir=r3clip]
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11';
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const checks = process.argv[2] ?? '';
const clipDir = process.argv[3] ?? 'r3clip';
const ITER = [   // the tuning log: constants per soak directory (WEAR_PER_DAMAGE / WEAR_RECOVER per s / KNOCKDOWN_WEAR / EXCEPTIONAL_WEAR)
    { dir: 'wear', label: 'start', k: [1, 0.5, 60, 85] },
    { dir: 'wear2', label: 'second', k: [0.8, 0.4, 55, 85] },
    { dir: 'wear3', label: 'chosen', k: [0.8, 0.4, 60, 92] },
].map(i => ({ ...i, T: read(`g3/${i.dir}/table.json`) }));
const CH = ITER.at(-1), ALT = ITER[1];
const sum = (T, f) => T.reduce((n, t) => n + f(t), 0);
const firsts = (T) => T.map(t => (t.first == null ? 'none' : `${t.first.toFixed(0)} s`)).join(', ');
const early = (T) => T.filter(t => t.first != null && t.first < 45).length;

const buckets = (T) => {   // summed over the runs, per 30 s
    const n = Math.max(...T.map(t => t.buckets.length));
    return Array.from({ length: n }, (_, i) => {
        const bs = T.map(t => t.buckets[i]).filter(Boolean), w = bs.filter(b => b.meanWear != null);
        return { from: i * 30, gated: bs.reduce((a, b) => a + b.gated, 0), always: bs.reduce((a, b) => a + b.always, 0), exc: bs.reduce((a, b) => a + b.exceptional, 0), strikes: bs.reduce((a, b) => a + b.strikes, 0),
            meanWear: w.length ? (w.reduce((a, b) => a + b.meanWear, 0) / w.length).toFixed(1) : '-' };
    }).filter(b => b.from < 150);
};
const bucketRows = (T) => buckets(T).map(b => `<tr><td>${b.from}-${b.from + 30}</td><td>${b.gated}</td><td>${b.always}</td><td>${b.exc}</td><td>${b.strikes}</td><td>${b.meanWear}</td></tr>`).join('');
const runRows = (T) => T.map(t => `<tr><td>${esc(t.name)}</td><td>${t.gameSec}</td><td>${t.strikes}</td><td>${t.first == null ? 'none' : t.first.toFixed(0) + ' s'}</td><td>${t.gated}</td><td>${t.exceptional}${t.exceptionalAt.length ? ' (' + esc(t.exceptionalAt.join('; ')) + ')' : ''}</td><td>${t.piledrivers}</td><td>${t.buckets.map(b => b.meanWear ?? '-').join(' / ')}</td><td>${t.errors} / ${t.stuck}</td></tr>`).join('');
const iterRows = ITER.map(i => `<tr><td>${i.label} (${i.dir})</td><td>${i.k.join(' / ')}</td><td>${firsts(i.T)}</td><td>${i.T.map(t => t.gated).join(', ')} (sum ${sum(i.T, t => t.gated)})</td><td>${i.T.map(t => t.exceptional).join(', ')}</td><td>${early(i.T)} of 4</td></tr>`).join('');

const E = read(`g3/${clipDir}/events.json`);
const name = (w) => (w === 'p1' ? E.pair.split('-')[0] : E.pair.split('-')[1]);
const marksOf = (w) => E.marks.filter(m => m.frame >= w[0] && m.frame <= w[1]);
const cells = E.windows.map(w => {
    const ms = marksOf(w), at = (m) => m.frame - w[0];
    const labels = ms.map(m => ({ at: at(m), len: 90, label: m.kind === 'fall' ? `KNOCKDOWN ${m.fall}: ${m.reason}` : `EXCEPTIONAL ${m.move} landing, wear ${m.wear} (line ${CH.k[3]})` }));
    return `<div class="c"><canvas data-dir="${clipDir}/frames" data-from="${w[0]}" data-n="${w[1] - w[0] + 1}" data-marks='${JSON.stringify(labels).replace(/'/g, '&#39;')}' width="720" height="360"></canvas>
<div class="cap"><b>${(w[0] / 60).toFixed(1)}-${(w[1] / 60).toFixed(1)} s</b> (match clock): ${ms.map(m => `${(m.frame / 60).toFixed(1)} s ${m.kind === 'fall' ? `${name(m.who)} ${esc(m.move)} -> ${m.fall}${m.tier ? ' [' + m.tier + ']' : ''}, wear ${m.wear}, ${esc(m.reason)}` : `${name(m.who)} ${esc(m.move)} lands exceptional at wear ${m.wear}`}`).join('; ')}</div></div>`;
}).join('');
const traceRows = E.trace.filter((_, i) => i % 15 === 0).map(t => `<tr><td>${t.t}</td><td>${t.w1}</td><td>${t.w2}</td><td>${t.st1}</td><td>${t.st2}</td></tr>`).join('');

const T = CH.T, firstAll = T.filter(t => t.first != null).map(t => t.first);
const bigLanded = sum(T, t => t.exceptional);
const misses = [
    `<b>Strike knockdowns are fewer than "a few per match":</b> ${T.map(t => t.gated).join(', ')} per 150 s run (sum ${sum(T, t => t.gated)}), first at ${firsts(T)}. The AIs land only ${T.map(t => t.strikes).join(', ')} strikes a run, so the line decides few strikes; one run (${T.find(t => t.gated === 0)?.name ?? '-'}) has none. The lower line (${ALT.k[2]}, second row below) gives ${sum(ALT.T, t => t.gated)} but a first knockdown at ${firsts(ALT.T)}: ${early(ALT.T)} run under 45 s, which breaks the first target. I kept the line that meets it.`,
    `<b>Wear-driven exceptional landings: ${bigLanded} in the four runs${bigLanded ? ' (' + T.flatMap(t => t.exceptionalAt).join('; ') + ')' : ''}.</b> The AI throws a suplex, body slam or back body drop rarely (none in 3 of the first 4 first-pass runs), so the line is checked by unit tests at the threshold and by these runs only where a throw happened. ${bigLanded ? 'The ones that did land came early, at wear 100: a burst of damage in the first minute, not a late collapse.' : ''} The piledriver is exceptional on its own (${sum(T, t => t.piledrivers)} in these runs) and is not counted.`,
    `<b>Runs vary a lot with the same constants:</b> mean wear in the last 30 s ranges ${Math.min(...T.map(t => t.buckets.at(-2)?.meanWear ?? 0))} to ${Math.max(...T.map(t => t.buckets.at(-2)?.meanWear ?? 0))} across the four runs, because the AI mix differs (a run of holds or dodges is little damage). Four runs cannot show the spread; Stage 4's long run will.`,
    `<b>A bout ending inside the 150 s resets the men</b> (the arena resets wear with stamina at the next match), so a 150 s soak can contain two short matches; wear columns drop at a reset. Not retuned.`,
    `<b>Clip:</b> a continuous 150 s film is 9000 frames, so the clip keeps the windows around each mark (1.5 s before, 3.5 s after), each played at normal speed with the bars on; the rest of the run is in the wear trace table. ${E.marks.length} marks in this run (seed ${E.seed}, ${E.pair}).`,
    `<b>Headbutt and corner charge</b> still always fall; they are counted in their own column, not against the targets.`,
].filter(Boolean);

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G3 r3: wear</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1500px;margin:0 auto;padding:16px}h1,h2{font-weight:600}table{border-collapse:collapse;margin:8px 0 16px}td,th{border:1px solid #333;padding:3px 8px;text-align:left}th{background:#1c1c1c}.note{background:#1d2430;padding:10px 14px;border-radius:6px;margin:10px 0}.c{display:inline-block;vertical-align:top;margin:6px 10px 16px 0}canvas{background:#000;display:block}.cap{max-width:720px;font-size:12px;color:#aaa;margin-top:3px}code{background:#222;padding:0 4px}</style>
<h1>Falls G3 r3: the wear meter (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek:</b> knockdowns and exceptional landings now follow a separate <b>wear</b> meter (0-100): it rises with the damage a man takes, recovers slowly, resets at the start of a match and not on a get-up. Stamina still does everything else (pins, kickouts, begging off, staggers). <code>?wear=show</code> draws the wear bar under the stamina bar (purple; orange past the knockdown line, red past the exceptional line; the two white ticks are the lines). Off by default.</div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Constants chosen</h2>
<table><tr><th>constant</th><th>value</th><th>meaning</th></tr>
<tr><td><code>WEAR_PER_DAMAGE</code></td><td>${CH.k[0]}</td><td>wear gained per point of damage taken (hits, throws, hold drains; not the attacker's own cost)</td></tr>
<tr><td><code>WEAR_RECOVER</code></td><td>${CH.k[1]} per s</td><td>stamina recovers 6 per s</td></tr>
<tr><td><code>KNOCKDOWN_WEAR</code></td><td>${CH.k[2]}</td><td>a strike that leaves him at or over this puts him down instead of staggering him</td></tr>
<tr><td><code>EXCEPTIONAL_WEAR</code></td><td>${CH.k[3]}</td><td>a suplex, body slam or back body drop on a man at or over this lands exceptional</td></tr></table>
<p>The tired/fresh weighting in the fall pick reads wear: collapses weighted 3:1 at ${CH.k[2]} and over, straight falls 3:1 under 30. Damage, stamina and its recovery were not touched.</p>
<h2>Tuning log (4 runs of 150 s each, both pairings, nothing capped; same AI, random seed)</h2>
<table><tr><th>soak</th><th>per damage / recover / knockdown / exceptional</th><th>first strike knockdown per run</th><th>strike knockdowns per run</th><th>wear-driven exceptional per run</th><th>first knockdown under 45 s</th></tr>${iterRows}</table>
<h2>Chosen constants: the soak, per run</h2>
<table><tr><th>run</th><th>game s</th><th>landed strikes</th><th>first strike knockdown</th><th>strike knockdowns</th><th>wear-driven exceptional</th><th>piledrivers</th><th>mean wear of both men per 30 s</th><th>page errors / stuck</th></tr>${runRows(T)}</table>
<h2>Summed over the four runs, per 30 s</h2>
<table><tr><th>seconds</th><th>strike knockdowns (gated)</th><th>headbutt / corner (always fall)</th><th>wear-driven exceptional</th><th>landed strikes</th><th>mean wear</th></tr>${bucketRows(T)}</table>
<p class="cap" style="max-width:none">Targets: none in the first 45 s; a few per match from about the midpoint (75 s); exceptional late and rare (0-2 per match). Strike knockdowns are the fall events of the jab, front kick, shove, double axe handle and knee lift; a landing counts as wear-driven exceptional when a suplex, body slam or back body drop lands with the exceptional tier.</p>
<h2>One uncapped AI-vs-AI match, wear bars on (${esc(E.pair)}, seed ${E.seed})</h2>
<div>${cells || '<p>no marks in this run</p>'}</div>
<p class="cap" style="max-width:none">Wear and stamina every 15 s of the same run:</p>
<table><tr><th>s</th><th>${name('p1')} wear</th><th>${name('p2')} wear</th><th>${name('p1')} stamina</th><th>${name('p2')} stamina</th></tr>${traceRows}</table>
<p class="cap" style="max-width:none">Checks: ${esc(checks)}</p>
<script>
const pad = (i) => String(i).padStart(4, '0');
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target._on) start(e.target); }, { rootMargin: '200px' });
function start(c) { c._on = true; const n = +c.dataset.n, from = +c.dataset.from, ctx = c.getContext('2d'), imgs = [], marks = JSON.parse(c.dataset.marks || '[]');
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = c.dataset.dir + '/s' + pad(from + i) + '.jpg'; imgs.push(im); }
  let k = 0, acc = 0, last = performance.now();
  (function tick(now) { acc += now - last; last = now; while (acc >= 1000 / 60) { acc -= 1000 / 60; k = (k + 1) % n; }
    const im = imgs[k]; if (im.complete && im.naturalWidth) { ctx.drawImage(im, 0, 0, c.width, c.height); ctx.fillStyle = '#ff0'; ctx.font = '12px system-ui'; let y = 340;
      for (const m of marks) if (k >= m.at && k < m.at + m.len) { ctx.fillText(m.label, 6, y); y -= 14; } }
    requestAnimationFrame(tick); })(last); }
for (const c of document.querySelectorAll('canvas[data-dir]')) io.observe(c);
</script></html>`;
writeFileSync(`${root}/g3/r3.html`, html);
console.log('wrote', `${root}/g3/r3.html`);
