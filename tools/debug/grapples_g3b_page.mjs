// G3b page (PLAN_GRAPPLES Stage 3b): normal-speed strips of the three exits that miss, then the misses from the data, then the tables.
//   node tools/debug/grapples_g3b_page.mjs     (reads g3b/film.json, 3b1.json, 3b2.json, 3b3.json)
import { readFileSync, writeFileSync } from 'node:fs';
const root = 'research/animation/grapples-2026-10/g3b', J = (n) => JSON.parse(readFileSync(`${root}/${n}`, 'utf8'));
const film = J('film.json'), s1 = J('3b1.json'), s2 = J('3b2.json'), s3 = J('3b3.json');
const PAIR = { 'lou-george': 'Lou attacker vs George', 'george-lou': 'George attacker vs Lou' };
const cell = (dir, n, cap) => `<div><canvas data-dir="${dir}" data-n="${n}" width="380" height="330"></canvas><div class="cap">${cap}</div></div>`;
const find = (col, id) => film.runs.find(r => r.column === col && r.id === id);
let strips = '';
for (const ex of ['whip', 'armDrag', 'headlock']) for (const pair of Object.keys(PAIR)) {
    const t = find('today', `e-${ex}-${pair}-r`), n = find('new', `e-${ex}-${pair}-r`);
    if (n) strips += `<h3>${ex}: ${PAIR[pair]}, facing right</h3><div class="pair">${t ? cell(`frames/today/${t.id}`, t.frames, `today: first ${t.firstFrameStep}, worst in 0.2 s ${t.maxStep200ms}`) : ''}${cell(`frames/new/${n.id}`, n.frames, `new: first ${n.firstFrameStep}, worst in 0.2 s ${n.maxStep200ms}`)}</div>`;
}
const f1 = (x) => (x.started ? `${x.leftoverFrames} / k${x.kneeLine} / a${x.ankleStagger} n${x.kneeStagger} / ${x.firstStep}` : 'no start');
const t1 = s1.filter(r => r.facing === 1).map(r => `<tr><td>${r.att} ${r.move}</td><td>${f1(r.base)}</td>${[0, 60, 120, 200].map(ms => `<td>${f1(r.at[ms])}</td>`).join('')}</tr>`).join('');
const t2 = s2.filter(r => r.facing === 1).map(r => `<tr><td>${PAIR[r.pair]}</td><td>${r.exit}</td><td>+${r.leadInReleasedAt} f</td><td>${r.leadInPeakDiff} @+${r.peakAt}</td><td>${r.marks.map(m => `${m.name} +${m.ms} ms${m.insideLeadIn ? ' <b class="bad">in lead-in</b>' : ''}: drawn vs true ${m.drawnVsTrue}, nearest wrist ${m.contact?.d} px to ${m.contact?.part}`).join('<br>')}</td></tr>`).join('');
const t3 = s3.map(r => { const k = r.table.filter(x => Math.max(x.a.step, x.d.step) > 60).map(x => `+${x.f}: attacker ${x.a.step}, defender ${x.d.step} (${x.d.part}; defender vs mirrored previous frame ${x.d.mirrored})`).join('; '); return `<tr><td>${r.att.includes('thesz') ? 'Lou' : 'George'} attacker</td><td>${r.col}</td><td>${k || 'nothing over 60'}</td></tr>`; }).join('');
const html = `<!doctype html><meta charset="utf-8"><title>G3b: exit checks</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h3{margin:18px 0 4px;color:#9ad}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:380px}canvas{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px;margin-bottom:14px}td,th{border:1px solid var(--line);padding:3px 7px;text-align:left}th{background:var(--panel)}button{font:inherit;padding:4px 10px}.bad{color:#f96}</style>
<h1>G3b: exit checks before promotion</h1><div class="note"><b>For Derek to judge.</b> No game code changed in this stage; the stance, gap and hold are the approved G1c ones. The strips are the three exits that miss, today (left) next to the tie-up (right), normal speed.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Misses</h2><ul>
<li><b>Whip turn:</b> the defender's facing flip is 120.5 px/frame (Lou attacker) and 118.7 (George attacker) at frame +8, when the lead-in lets go; today the same flip is 98.6 / 108.4 at frame 0. The flip alone: the step against the previous frame mirrored is 13.8 / 12.5, so it is the flip and not motion. It is bigger because the flip happens on the move's stretched pose, not the tie-up. Turning him at the start of the lead-in (scratch edit, reverted): Lou 126 (worse), George 103.6 (under today). At half the lead-in: 133.6 / 125.6; at three quarters: 136.9 / 127.0. No per-move timing gets Lou to today's number, so I left it.</li>
<li><b>Hit timing inside the lead-in:</b> three exits do something in the first 0.14 s. Headlock (hold applied) and whip (defender sent running) act at frame 0 by design; arm drag damages at frame 0 and sells at +83 ms, when the picture is still 17.3 px from the true pose. The five clip moves (suplex, piledriver, body slam, hip toss, hammerlock) all land at 533 ms or later, after the lead-in; drawn and true agree there.</li>
<li><b>Break settle:</b> no move leaves a lockup shin, in any of 7 cases x 4 offsets (asserted). The first-frame part step from the settle is larger than from plain idle: jab 49 / 56 vs 35, dropkick 99 / 92 vs 69, George taunt 40 vs 19, a new lockup 17-18 vs 4 (all at 0 ms; they fall back to the idle number by about 200 ms).</li>
<li><b>Evidence limits:</b> the "nearest wrist" number is distance to the nearest part's sprite rectangle, so it can touch transparent space; it says a hand is far, not that it is on the body. The 0 ms case now presses on the first frame after the lockup ends.</li></ul>
<h2>Strips</h2>${strips}
<h2>T3b.1 A move in the break's settle (facing right; leftover shin frames / worst knee line / ankle, knee stagger / first-frame step)</h2>
<table><tr><th>move</th><th>from idle</th><th>0 ms</th><th>60 ms</th><th>120 ms</th><th>200 ms</th></tr>${t1}</table>
<h2>T3b.2 Marker frames against the 0.14 s lead-in (facing right; left is identical)</h2>
<table><tr><th>pair</th><th>exit</th><th>lead-in lets go</th><th>peak drawn-vs-true (px) @frame</th><th>markers</th></tr>${t2}</table>
<h2>T3b.3 The whip turn (largest step, facing right)</h2><table><tr><th>attacker</th><th>column</th><th>frames over 60 px/frame</th></tr>${t3}</table>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal (1\\u00d7)'};requestAnimationFrame(tick);</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`);
