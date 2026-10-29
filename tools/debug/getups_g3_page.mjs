// T4.1 page writer: reads <dir>/seedNN.json and seedNN-off.json (getups_g3.mjs) and writes <dir>/strip.html (4 rises, both facings) and
// <dir>/index.html (misses first, the reel, then the tables). Relative paths, works from file://.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] ?? 'research/animation/getups-2026-10/g3';
const files = readdirSync(dir).filter(f => /^seed\d+(-off)?\.json$/.test(f)).sort();
const runs = files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const on = runs.filter(r => !r.off), off = runs.filter(r => r.off);
const rises = on.flatMap(r => r.rises);
const n = (v) => (v === null || v === undefined ? '&ndash;' : v);
const RIG = { w1: 'Lou', w2: 'George' };
const label = (r) => `seed ${r.seed} &middot; ${RIG[r.who]} #${r.k} &middot; ${r.quick ? 'quick rise' : (r.id ?? 'legacy')} &middot; ${r.log ? (r.log.reason + (r.log.family ? '' : '')) : '&ndash;'} &middot; stamina ${r.stamina}%${r.stallMs ? ` &middot; stall ${r.stallMs} ms` : ''}${r.interrupted ? ' &middot; INTERRUPTED' : ''}`;
const fl = (r, i) => `${r.dir}/s${String(i).padStart(4, '0')}.jpg`;
const link = (r, i, txt) => `<a href="${fl(r, i)}">${txt ?? 'frame ' + i}</a>`;
const full = rises.filter(r => !r.quick), quick = rises.filter(r => r.quick);
const fam = (r) => r.log?.family ?? (r.quick ? 'quick' : 'legacy');

// ── misses ───────────────────────────────────────────────────────────────────────────────────────────────────
const miss = [];
const fallbacks = full.filter(r => r.log?.reason?.startsWith('fallback'));
if (fallbacks.length) miss.push(`${fallbacks.length} fallback(s) to the legacy rise: ${fallbacks.map(r => `seed ${r.seed} ${RIG[r.who]} #${r.k} (${r.log.reason})`).join('; ')}`);
const interrupted = rises.filter(r => r.interrupted);
if (interrupted.length) miss.push(`${interrupted.length} rise(s) cut short (the state changed before the rise reached its end): ${interrupted.map(r => `seed ${r.seed} ${RIG[r.who]} #${r.k} ${r.quick ? 'quick' : r.id} to ${r.endTo} at ${r.lastRiseT}`).join('; ')}`);
const stepList = (a) => a.slice(0, 12).map(r => `seed ${r.seed} ${RIG[r.who]} #${r.k} ${r.id} ${r.standStep.v} px ${r.standStep.part} (${link(r, r.standStep.i - 1)}, ${link(r, r.standStep.i)})`).join('; ') + (a.length > 12 ? '; ...' : '');
const bigAll = full.filter(r => r.standStep && r.standStep.v > 5).sort((a, b) => b.standStep.v - a.standStep.v);
const bigStand = bigAll.filter(r => r.endTo === 'standing'), bigAct = bigAll.filter(r => r.endTo !== 'standing');
if (bigStand.length) miss.push(`${bigStand.length} of ${full.filter(r => r.standStep && r.endTo === 'standing').length} rises that end in the standing state step more than 5 px (any part) from the last rise frame to the first standing frame: ${stepList(bigStand)}`);
if (bigAct.length) miss.push(`${bigAct.length} of ${full.filter(r => r.standStep && r.endTo !== 'standing').length} rises ended straight into another action on the very next step (the AI started a move: ${[...new Set(bigAct.map(r => r.endTo))].join(', ')}), and the pose changes by more than 5 px there; that is the next action's first pose, not the rise's handoff, but it is what the player sees: ${stepList(bigAct)}`);
const bigStart = full.filter(r => r.startStep && r.startStep.v > 10).sort((a, b) => b.startStep.v - a.startStep.v);
if (bigStart.length) miss.push(`${bigStart.length} rises step more than 10 px at rise start (last down frame to frame 0; the down frame is not filmed, frame 0 linked): ${bigStart.slice(0, 8).map(r => `seed ${r.seed} ${RIG[r.who]} #${r.k} ${r.id} ${r.startStep.v} px ${r.startStep.part} (${link(r, 0)})`).join('; ')}`);
const repeats = [];
for (const who of ['w1', 'w2']) for (const seed of [...new Set(full.map(r => r.seed))]) {
    const seq = full.filter(r => r.seed === seed && r.who === who && r.log && r.log.reason !== 'override');
    for (let i = 1; i < seq.length; i++) if (fam(seq[i]) === fam(seq[i - 1])) repeats.push({ r: seq[i], alt: (seq[i].log.eligible?.length ?? 0) > 1 });
}
const badRepeats = repeats.filter(x => x.alt);
if (badRepeats.length) miss.push(`${badRepeats.length} repeat(s) of a family while another was eligible: ${badRepeats.map(x => `seed ${x.r.seed} ${RIG[x.r.who]} #${x.r.k} ${x.r.id}`).join('; ')}`);
const stalled = full.filter(r => r.stall);
const stallBig = stalled.filter(r => (r.stall.enter?.v ?? 0) > 12 || (r.stall.leave?.v ?? 0) > 12);
if (stallBig.length) miss.push(`${stallBig.length} stall(s) enter or leave with a step above 12 px: ${stallBig.map(r => `seed ${r.seed} ${RIG[r.who]} #${r.k} ${r.id} enter ${n(r.stall.enter?.v)} / leave ${n(r.stall.leave?.v)}`).join('; ')}`);
const prone = full.filter(r => r.lying === 'prone');
if (!prone.length) miss.push('no prone rise happened naturally in these 10 seeds (frontKnee is exercised by the forced films of G2 / G2b, not by this reel).');
const band = full.filter(r => r.stamina >= 20 && r.stamina <= 30);
if (!band.length) miss.push('no natural rise at stamina 20-30 % in these seeds, so the 25 % step (600 ms in one step) is not seen in the reel; G2b shows it forced.');
const matches = on.map(r => `seed ${r.seed}: ${r.steps} steps, ${r.matchT} s${r.matchOver ? ' (match over)' : ''}, rises Lou ${r.starts.w1} / George ${r.starts.w2}`).join('<br>');

// ── strip: one per family plus a stall, both facings where the seeds have them ─────────────────────────────────
const pickStrip = () => {
    const cats = [['backKneeHurt', (r) => fam(r) === 'backKneeHurt'], ['backTuck', (r) => fam(r) === 'backTuck'], ['frontKnee', (r) => fam(r) === 'frontKnee'], ['stall', (r) => r.stallMs > 0]];
    const out = [];
    for (const [name, f] of cats) for (const face of [-1, 1]) { const r = full.find(q => f(q) && q.facing === face && !q.interrupted && !out.includes(q)); if (r) out.push(Object.assign(r, { _cat: name })); }
    return out;
};
const strip = pickStrip();
const css = `<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1,h2{font-weight:600}h4{margin:2px 0 4px;color:#9ad;font-size:12px;font-weight:500}
table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #444;padding:3px 8px;text-align:right}th{background:#2a2a2a}td:first-child,th:first-child{text-align:left}
.bad{background:#4a2a20}.grid{display:flex;gap:12px;flex-wrap:wrap}.cell{width:340px}canvas{background:#000;display:block}
.note{background:#2a2a2a;padding:8px 12px;border-left:3px solid #c84;margin:10px 0}button{font:inherit;padding:4px 10px}a{color:#8bd}li{margin:3px 0}</style>`;
const loopsScript = `<script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false;const st=new Map();
const io=new IntersectionObserver(es=>es.forEach(e=>{const c=e.target;if(e.isIntersecting&&!st.has(c)){const k=+c.dataset.n;st.set(c,{imgs:Array.from({length:k},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}),f:0})}c._vis=e.isIntersecting}),{rootMargin:'200px'});
cvs.forEach(c=>io.observe(c));let last=0;
function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach(c=>{const s=st.get(c);if(!s||!c._vis)return;const im=s.imgs[s.f%s.imgs.length];if(im.complete)c.getContext('2d').drawImage(im,0,0);s.f++})}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
const cell = (r, hl) => `<div class="cell"><h4>${hl ?? label(r)}</h4><canvas data-dir="${r.dir}" data-n="${r.frames}" width="340" height="330"></canvas></div>`;
const intro = `<p>PLAN_GETUPS T4.1, Rev 6. 10 seeded AI-vs-AI matches, Lou (<code>thesz-procreate-v1</code>, w1) vs George (<code>george-roster-v1</code>, w2), <code>?getups=v1</code>, stepped at 1/60 s; each match runs until each wrestler has had 6 rises, 180 s of game time, or the match ends. Every rise is filmed at 1&times; from its first frame to standing + .3 s; measured from the drawn frames. Seeds fix the random stream; the game state before the loop was put to sleep is load-time dependent, so a seed repeats in kind, not frame for frame. Derek judges.</p>`;
writeFileSync(join(dir, 'strip.html'), `<!doctype html><meta charset="utf-8"><title>G3 loop strip</title>${css}<h1>G3 loop strip: one rise per family plus a stall, both facings</h1>${intro}
<div class="grid">${strip.map(r => cell(r, `${r._cat}: ${label(r)} &middot; facing ${r.facing < 0 ? 'L' : 'R'}`)).join('') || 'no rises'}</div><p><button id="pp">pause</button></p>${loopsScript}`);

// ── tables ─────────────────────────────────────────────────────────────────────────────────────────────────────
const entries = [...new Set(rises.map(r => (r.quick ? 'quick rise' : r.id ?? 'legacy')))].sort();
const rigs = ['w1', 'w2'];
const cnt = (f) => rises.filter(f).length;
let t1 = `<table><tr><th>entry</th>${rigs.map(w => `<th>${RIG[w]}</th>`).join('')}<th>total</th></tr>`;
for (const e of entries) { const f = (r) => (r.quick ? 'quick rise' : r.id ?? 'legacy') === e; t1 += `<tr><td>${e}</td>${rigs.map(w => `<td>${cnt(r => f(r) && r.who === w)}</td>`).join('')}<td>${cnt(f)}</td></tr>`; }
t1 += `<tr><th>all</th>${rigs.map(w => `<th>${cnt(r => r.who === w)}</th>`).join('')}<th>${rises.length}</th></tr></table>`;
const maxRow = (arr, get, linkFn) => { const m = arr.filter(r => get(r)).sort((a, b) => get(b).v - get(a).v)[0]; return m ? `${get(m).v} px ${get(m).part} (seed ${m.seed} ${RIG[m.who]} #${m.k}; ${linkFn(m)})` : '&ndash;'; };
let t2 = `<table><tr><th>entry</th><th>rises</th><th>stalls</th><th>largest step at rise start</th><th>largest step entering a stall</th><th>largest step leaving a stall</th><th>largest step at the first frame after the rise</th></tr>`;
for (const e of entries.filter(e => e !== 'quick rise')) {
    const a = full.filter(r => (r.id ?? 'legacy') === e);
    t2 += `<tr><td>${e}</td><td>${a.length}</td><td>${a.filter(r => r.stall).length}</td><td>${maxRow(a, r => r.startStep, (m) => link(m, 0, 'frame 0') + ', pre-rise frame not filmed')}</td>
<td>${maxRow(a, r => r.stall?.enter, (m) => `${link(m, m.stall.enter.i - 1)}, ${link(m, m.stall.enter.i)}`)}</td><td>${maxRow(a, r => r.stall?.leave, (m) => `${link(m, m.stall.leave.i - 1)}, ${link(m, m.stall.leave.i)}`)}</td>
<td>${maxRow(a, r => r.standStep, (m) => `${link(m, m.standStep.i - 1)}, ${link(m, m.standStep.i)}`)}</td></tr>`;
}
t2 += '</table>';
const reasons = {}; for (const r of full) { const k = r.log?.reason ?? 'none'; reasons[k] = (reasons[k] ?? 0) + 1; }
const how = {}; for (const r of rises) { const k = r.cause ? `${r.cause.move} (${r.cause.type})` : 'none logged'; how[k] = (how[k] ?? 0) + 1; }
const offRises = off.flatMap(r => r.rises);
const offCnt = (w, f) => offRises.filter(r => r.who === w && f(r)).length;
let t3 = `<table><tr><th></th>${rigs.map(w => `<th>${RIG[w]} getups on</th><th>${RIG[w]} getups off (B1a)</th>`).join('')}</tr>`;
for (const [name, f] of [['full rise, supine', (r) => !r.quick && r.lying === 'supine'], ['full rise, prone', (r) => !r.quick && r.lying === 'prone'], ['quick rise', (r) => r.quick]]) {
    t3 += `<tr><td>${name}</td>${rigs.map(w => `<td>${rises.filter(r => r.who === w && f(r)).length}</td><td>${offCnt(w, f)}</td>`).join('')}</tr>`;
}
t3 += `<tr><th>rises</th>${rigs.map(w => `<th>${rises.filter(r => r.who === w).length}</th><th>${offRises.filter(r => r.who === w).length}</th>`).join('')}</tr></table>`;
const natural = band.length ? `<table><tr><th>seed</th><th>who</th><th>entry</th><th>stamina %</th><th>stall ms</th></tr>${band.sort((a, b) => a.stamina - b.stamina).map(r => `<tr><td>${r.seed}</td><td>${RIG[r.who]}</td><td>${r.id}</td><td>${r.stamina}</td><td>${r.stallMs}</td></tr>`).join('')}</table>` : 'none in these seeds';
const lowest = full.map(r => r.stamina).sort((a, b) => a - b).slice(0, 5);

writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>G3: the get-up reel</title>${css}<h1>G3: the get-up reel (<code>?getups=v1</code>, selection on)</h1>${intro}
<h2>Misses first</h2><div class="note"><ul>${miss.map(m => `<li>${m}</li>`).join('') || '<li>none</li>'}</ul>
<p>Strip (4 rises, both facings): <a href="strip.html">strip.html</a>. ${matches}</p></div>
<h2>The reel (every rise, 1&times;)</h2><p>${rises.length} rises; loops play as they scroll into view. <button id="pp">pause</button></p>
<div class="grid">${rises.filter(r => r.frames).map(r => cell(r)).join('')}</div>
<h2>Counts per entry and wrestler</h2>${t1}
<h2>Choice reasons (full rises)</h2><p>${Object.entries(reasons).map(([k, v]) => `${k}: ${v}`).join(' &middot; ')}. Repeats of a family in a row per wrestler: ${repeats.length}, of which with another family eligible: ${badRepeats.length}${repeats.length ? ` (${repeats.map(x => `seed ${x.r.seed} ${RIG[x.r.who]} #${x.r.k} ${fam(x.r)}, ${x.alt ? 'alternative eligible' : 'only family eligible'}`).join('; ')})` : ''}. Fallbacks: ${fallbacks.length}. Prone rises (natural): ${prone.length}. Interrupted: ${interrupted.length}. Stalls: ${stalled.length}. Lowest stamina at a rise: ${lowest.join(', ')} %.</p>
<h2>Largest per-part step by entry (px between adjacent 1/60 s frames)</h2>${t2}
<h2>How they got down</h2><p>${Object.entries(how).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(' &middot; ')}.</p>
<h2>Natural rises at stamina 20-30 % (either side of the 25 % stall step)</h2>${natural}
<h2>How often each lying and the quick rise happen: getups on | off (B1a)</h2><p>Same 10 seeds with <code>getups</code> off, counts only. The sell plans differ on purpose (no rolls under getups), so the matches diverge; this is the frequency of each kind of rise, not a like-for-like.</p>${t3}
<h2>Questions for G3 (Derek)</h2><ol><li>Is the mix right (weights: backTuck = fresh, backKneeHurt = .2 + hurt, frontKnee alone from the front)?</li><li>Promote <code>getups</code> to default (legacy stays as <code>getups=off</code>)?</li><li>Anything in the reel that looks wrong, even if the numbers don't show it.</li></ol>
${loopsScript}`);
console.log('wrote', join(dir, 'index.html'), 'and strip.html;', rises.length, 'rises');
