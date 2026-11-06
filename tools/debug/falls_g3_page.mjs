// PLAN_FALLS T3.4: the G3 page. The move x situation table (falls_g3_probe.mjs: fresh, tired, from behind, near the ropes; Lou strikes George, George strikes Lou), the spill's T3.3
// audit (falls_probe + falls_landing_audit on g3/spill), and one AI-vs-AI match clip with every fall marked by its pick reason (falls_g3_match.mjs). Misses first.
//   node tools/debug/falls_g3_page.mjs [suiteLine]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = 'research/animation/falls-2026-11';
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
const R = read('g3/table/results.json');
const SP = read('g3/spill/audit.json'), SPS = read('g3/spill/summary.json');
const M = existsSync(`${root}/g3/match/events.json`) ? read('g3/match/events.json') : null;
const suite = process.argv[2] ?? '';
const MOVES = ['headbutt', 'jab', 'frontKick', 'shove', 'doubleAxeHandle', 'kneeLift'];
const SITS = [['fresh', 'fresh (100)'], ['tired', 'tired (20)'], ['behind', 'from behind (20)'], ['ropes', 'near the ropes (20, 85 px behind him)']];
const VICT = ['george', 'lou'];
const cellOf = (m, s, v) => R.find(r => r.move === m && r.situation === s && r.victim === v);
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---- misses ----------------------------------------------------------------------------------------------------------------------------
const falls = R.filter(r => r.outcome === 'fall'), staggers = R.filter(r => r.outcome === 'stagger'), none = R.filter(r => r.outcome === 'none');
const freshFalls = R.filter(r => r.situation === 'fresh' && r.outcome === 'fall').map(r => r.id);
const tiredStaggers = R.filter(r => r.situation !== 'fresh' && r.outcome !== 'fall').map(r => r.id);
const cramped = R.filter(r => /cramped|ring room/.test(r.reason ?? '')).map(r => `${r.id} (${r.reason})`);
const byFall = {}; for (const r of falls) byFall[r.fall] = (byFall[r.fall] ?? 0) + 1;
const spillMiss = SP.filter(a => a.flexMisses.length || Object.values(a.clampHits).some(v => v));
const d4 = SPS.runs.map(r => `${r.id} ${r.m.d4.ratioStanding}`).join(', ');
const matchFalls = M?.events ?? [];
const matchBy = {}; for (const e of matchFalls) matchBy[e.fall] = (matchBy[e.fall] ?? 0) + 1;
const misses = [
    `<b>The pick has never been looked at by anyone but its numbers.</b> This page shows what each rule picks and why; whether a sitBack off a jab, a kneesForward off a knee lift or a spill off a shove reads right is Derek's call. <b>Not claimed:</b> that any of it reads right.`,
    `<b>In ordinary play almost no strike knocks a man down.</b> The knockdown needs the hit to leave him under 35 stamina, and stamina comes back within seconds: two 150 s AI-vs-AI runs at full stamina logged ${M?.dryRuns ?? 'zero'} strike falls (no headbutt landed either time). The match clip below therefore holds both men's stamina at ${M?.capStamina ?? 'a cap'} every frame, a worn-down match on demand, and says so. It is not a measured rate.`,
    `<b>"From behind" is a staged case.</b> A strike turns the receiver to face the attacker, so the from-behind rule only runs when his facing is held (waistlock, a turn beat, a run). The table holds his facing to show it (<code>_facingLock</code>); in the match clip the corner charge is the one that uses it (the corner is behind him).`,
    `<b>Near the ropes only matters between 70 and 92 px.</b> The lying lengths are 70 behind / 96 ahead (backward, sitBack, spill) and 92 behind / 84 ahead (forward, kneesForward), so a rope 85 px behind him rules the forward falls out and nothing else; closer than 70 px behind, every fall pokes through and the rule keeps the least overshoot (flagged "cramped"). ${cramped.length ? 'Cramped or re-picked in this table: ' + cramped.map(esc).join('; ') + '.' : 'No cell in this table needed it.'}`,
    `<b>The shove spills toward the rope.</b> With a rope 85 px behind him (plus the shove's 40 px push) the shove still spills: the spill lies along the same line as a back fall (70 behind), so it fits. Whether it should spill sideways in depth instead is a call for Derek; the spill's art is the one authored in T2.5e.`,
    `<b>Spill (T3.3), four runs: ${spillMiss.length ? 'misses' : 'clean'}.</b> Lou and George, both facings, <code>?falls=v1</code> only (the <code>&amp;spill=1</code> flag is gone): no knee or elbow outside its limit, no clamp hit; D4 fall time over free fall from the standing pelvis: ${d4}. The near arm's brace is in the fall's keys, before contact, so the audit (which starts at contact) classes the hands "${SP[0].hands.near.class}" / "${SP[0].hands.far.class}" for ${SP[0].id} and "${SP[2].hands.near.class}" / "${SP[2].hands.far.class}" for ${SP[2].id} (the far arm flies up in the keys, so on Lou it never touches the mat in the landing).`,
    `<b>Table totals:</b> ${R.length} cells, ${falls.length} falls (${Object.entries(byFall).map(([k, v]) => `${k} ${v}`).join(', ')}), ${staggers.length} staggers${none.length ? `, <b>${none.length} with no reaction: ${none.map(r => r.id).join(', ')}</b>` : ''}. Falls in a fresh cell: ${freshFalls.length ? freshFalls.join(', ') : 'none except the headbutt, which is always a fall'}; a tired, behind or ropes cell that only staggered: ${tiredStaggers.length ? tiredStaggers.join(', ') : 'none'}.`,
    `<b>Not covered:</b> falls from the throws are the G2 page's; the clothesline family still flips; the strike falls land at the default tier (no strike is a big move); the AI does not choose a fall, the situation does; the head and wrists have no channel; no wince face. ${suite ? `<b>Checks:</b> ${suite}` : ''}`,
];

// ---- table -----------------------------------------------------------------------------------------------------------------------------
const cell = (r) => {
    if (!r) return '';
    const mark = r.outcome === 'fall' ? { at: r.fallAt, label: `FALL ${r.fall}${r.tier ? ' [' + r.tier + ']' : ''}` } : { at: 10, label: r.outcome.toUpperCase() };
    const cap = r.outcome === 'fall' ? `<b>${r.fall}</b>${r.tier ? ` [${r.tier}]` : ''}: ${esc(r.reason)}` : `<b>${r.outcome}</b> (stamina ${r.stamina.before} -> ${r.stamina.after})`;
    return `<div class="c"><canvas data-dir="table/frames/${r.id}" data-n="${r.frames}" data-mark='${JSON.stringify(mark)}' width="280" height="165"></canvas><div class="cap">${r.victim} receives. ${cap}</div></div>`;
};
const rowsHtml = MOVES.map(m => `<tr><th>${m}</th>${SITS.map(([s]) => `<td>${VICT.map(v => cell(cellOf(m, s, v))).join('')}</td>`).join('')}</tr>`).join('');
const head = `<tr><th></th>${SITS.map(([, t]) => `<th>${t}</th>`).join('')}</tr>`;

// ---- spill table ------------------------------------------------------------------------------------------------------------------------
const spillRows = SP.map(a => { const s = SPS.runs.find(r => r.id === a.id).m.d4; return `<tr><td>${a.id}</td><td>${a.landingSec} s</td><td>${s.ratioStanding}</td><td>${s.decreasingSteps}</td><td>${s.fastestIsLast ? 'last' : s.fastestIsLastTwo ? 'second-to-last' : 'no'}</td><td>${a.flexMax.nearKnee}, ${a.flexMax.farKnee}</td><td>${a.flexMin.nearElbow}, ${a.flexMin.farElbow}</td><td>${a.flexMax.nearElbow}, ${a.flexMax.farElbow}</td><td>${Object.values(a.clampHits).reduce((x, y) => x + y, 0)}</td><td>${a.hands.near.class}</td><td>${a.hands.far.class}</td></tr>`; }).join('');

// ---- match -----------------------------------------------------------------------------------------------------------------------------
const matchHtml = M ? `<p class="cap">${esc(M.pair)}, seed ${M.seed}, real AIs, 1/60 s steps, ${M.frames} frames (${(M.frames / 60).toFixed(0)} s of play); ${M.capStamina ? `<b>both men's stamina held at or under ${M.capStamina} every frame</b> so that the wear-down rule (strike knockdown under 35) has something to act on` : 'natural stamina'}. Only the windows around the falls are kept (1.5 s before the pick, 3.5 s after), played back to back; the game seconds are in the corner. Falls: ${matchFalls.length} (${Object.entries(matchBy).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}). Events: ${esc(JSON.stringify(M.counts))}.</p>
<div class="c"><canvas id="match" width="700" height="370"></canvas></div>
<table class="fl"><tr><th>game s</th><th>who</th><th>move</th><th>fall</th><th>tier</th><th>pick reason</th></tr>${matchFalls.map((e, i) => `<tr class="jump" data-i="${i}"><td>${(e.frame / 60).toFixed(1)}</td><td>${e.wrestler}</td><td>${e.move}</td><td><b>${e.fall}</b></td><td>${e.tier ?? '-'}</td><td>${esc(e.reason)}</td></tr>`).join('')}</table>` : '<p>No match clip recorded.</p>';

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G3: the right fall</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1500px;margin:0 auto;padding:16px}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #333;padding:3px 6px;vertical-align:top}table.g td,table.g th{text-align:left}table.fl td:nth-child(n+1){text-align:left}.c{display:inline-block;margin:2px;vertical-align:top}.c canvas{background:#000;display:block}.cap{font-size:11px;color:#aaa;max-width:300px}.note{border:1px solid #555;padding:8px 12px;margin:10px 0;background:#1a1a1a}.jump{cursor:pointer}.jump:hover{background:#222}code{color:#9cf}</style>
<h1>Falls G3: the right fall for the situation (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek:</b> the strikes now pick their fall by the situation (rules and registry in MOVE_CATALOG.md section 4) and put a worn-down man on the mat instead of staggering him (stamina under 35 after the hit; a fresher man staggers as before). Table: six moves by four situations, Lou strikes George (left) and George strikes Lou (right), each a real strike through the game's own code. Below it: the sideways spill, finished and unflagged, and one AI-vs-AI clip. Decide: the knockdown line (35), the picks, the spill off a shove, and whether the falls go standard. <b>Not claimed:</b> that any of it reads right. Speed: <label><input type="radio" name="sp" value="1" checked> normal</label> <label><input type="radio" name="sp" value="0.25"> 0.25x</label></div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Move x situation</h2>
<p class="cap" style="max-width:none">Each cell: the receiver's reaction to one strike. FALL marks the first frame of the fall. Stamina is the receiver's before the hit; the strike's own drain comes off it.</p>
<table class="g">${head}${rowsHtml}</table>
<h2>T3.3: the spill (T2.3 audit, no tolerance, and D4)</h2>
<table class="g"><tr><th>run</th><th>landing</th><th>D4 ratio</th><th>drop shrank</th><th>fastest frame</th><th>knee max (n, f)</th><th>elbow min (n, f)</th><th>elbow max (n, f)</th><th>clamp hits</th><th>near hand</th><th>far hand</th></tr>${spillRows}</table>
<h2>AI vs AI, every fall marked</h2>${matchHtml}
<script>
let speed = 1;
for (const r of document.querySelectorAll('input[name=sp]')) r.onchange = () => { speed = +r.value; };
const pad = (i) => String(i).padStart(4, '0');
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target._on) start(e.target); }, { rootMargin: '200px' });
function start(c) { c._on = true; const n = +c.dataset.n, ctx = c.getContext('2d'), imgs = [], m = JSON.parse(c.dataset.mark || '{}');
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = c.dataset.dir + '/s' + pad(i) + '.jpg'; imgs.push(im); }
  let k = 0, acc = 0, last = performance.now();
  (function tick(now) { acc += (now - last) * speed; last = now; while (acc >= 1000 / 60) { acc -= 1000 / 60; k = (k + 1) % n; }
    const im = imgs[k]; if (im.complete && im.naturalWidth) { ctx.drawImage(im, 0, 0, c.width, c.height); if (k >= m.at && k < m.at + 40) { ctx.fillStyle = '#ff0'; ctx.font = '13px system-ui'; ctx.fillText(m.label, 6, 16); } }
    requestAnimationFrame(tick); })(last); }
for (const c of document.querySelectorAll('canvas[data-dir]')) io.observe(c);
const MATCH = ${JSON.stringify(M ? { windows: M.windows, events: matchFalls } : null)};
if (MATCH) { const c = document.getElementById('match'), ctx = c.getContext('2d'), seq = []; for (const [a, b] of MATCH.windows) for (let i = a; i <= b; i++) seq.push(i);
  const imgs = new Map(); const get = (i) => { if (!imgs.has(i)) { const im = new Image(); im.src = 'match/frames/s' + pad(i) + '.jpg'; imgs.set(i, im); } return imgs.get(i); };
  let k = 0, acc = 0, last = performance.now();
  for (const tr of document.querySelectorAll('tr.jump')) tr.onclick = () => { const f = MATCH.events[+tr.dataset.i].frame - 60; k = Math.max(0, seq.findIndex(v => v >= f)); acc = 0; };
  (function tick(now) { acc += (now - last) * speed; last = now; while (acc >= 1000 / 60) { acc -= 1000 / 60; k = (k + 1) % seq.length; }
    const f = seq[k], im = get(f); get(seq[(k + 30) % seq.length]);
    if (im.complete && im.naturalWidth) { ctx.drawImage(im, 0, 0, c.width, c.height); ctx.fillStyle = '#ff0'; ctx.font = '13px system-ui'; ctx.fillText((f / 60).toFixed(1) + ' s', 8, 16);
      const e = MATCH.events.filter(e => f >= e.frame - 20 && f <= (e.upFrame ?? e.frame + 150)).pop();
      if (e) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, c.height - 46, c.width, 46); ctx.fillStyle = '#ff0'; ctx.fillText(e.wrestler + ' ' + e.move + ' -> ' + e.fall + (e.tier ? ' [' + e.tier + ']' : ''), 8, c.height - 28); ctx.fillStyle = '#ddd'; ctx.fillText(e.reason, 8, c.height - 10); } }
    requestAnimationFrame(tick); })(last); }
</script></html>`;
writeFileSync(`${root}/g3/index.html`, html);
console.log('wrote', `${root}/g3/index.html`);
