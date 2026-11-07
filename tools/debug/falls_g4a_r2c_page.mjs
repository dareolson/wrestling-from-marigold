// PLAN_FALLS T4.7c: the G4a r2c page, research/animation/falls-2026-11/g4a-r2c/index.html: the elbow drop as of T4.7b (current, ba94014) beside the finesse pass (revised), normal and quarter speed,
// from current.json and revised.json (falls_g4a_r2a_probe.mjs with OUT/FRAMES, the current code served from a worktree); frames-*/ are local and gitignored.   node tools/debug/falls_g4a_r2b_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11/g4a-r2c';
const C = JSON.parse(readFileSync(`${root}/current.json`, 'utf8')), R = JSON.parse(readFileSync(`${root}/revised.json`, 'utf8'));
const cur = (r) => C.find(c => c.id === r.id);
const rel = (r, k) => (r.marks[k] >= 0 ? r.marks[k] - r.marks.trigger : '-');
const f = (n) => (n == null ? '-' : n);
const marksRow = (r, tag) => { const sup = tag === 'current' ? r.marks.flightEnd : r.marks.matLevel, ms = sup - r.marks.trigger; return `<tr><td>${r.attacker} on ${r.victim}, ${r.lying}, ${r.facing > 0 ? 'right' : 'left'}</td><td>${tag}</td><td>${rel(r, 'apex')}</td><td>${rel(r, 'flightEnd')}</td><td>${ms}</td><td><b>${rel(r, 'hit')}</b></td><td>${rel(r, 'hit') - ms}</td><td>${rel(r, 'rolloff')}</td></tr>`; };
const marks = R.map(r => marksRow(cur(r), 'current') + marksRow(r, '<b>revised</b>')).join('');
const stop = (r) => { const c = cur(r); const row = (x, tag) => `<td>${tag}</td><td>${x.stop.before.map(Math.round).join(' ')}</td><td><b>${Math.round(x.stop.at)}</b></td><td>${x.stop.after.map(v => Math.round(v * 10) / 10).join(' ')}</td><td>${x.stop.squash}</td>`;
    return `<tr><td rowspan="2">${r.attacker} on ${r.victim}, ${r.lying}, ${r.facing > 0 ? 'right' : 'left'}</td>${row(c, 'current')}</tr><tr>${row(r, '<b>revised</b>')}</tr>`; };
const sell = (r) => { const c = cur(r); return `<tr><td>${r.attacker} on ${r.victim}, ${r.lying}, ${r.facing > 0 ? 'right' : 'left'}</td><td>${c.kicks.near} / ${c.kicks.far}</td><td><b>${r.kicks.near} / ${r.kicks.far}</b></td><td>${c.recvLimbPeak}</td><td><b>${r.recvLimbPeak}</b></td><td>${c.ropeOverPeak}</td><td><b>${r.ropeOverPeak}</b></td></tr>`; };
const over = (r) => { const c = cur(r); return `<tr><td>${r.attacker} on ${r.victim}, ${r.lying}, ${r.facing > 0 ? 'right' : 'left'}</td><td>${c.raw.peak} / ${c.raw.sum}</td><td><b>${r.raw.peak}</b> / ${r.raw.sum}</td><td>${c.outside.peak} / ${c.outside.sum}</td><td><b>${r.outside.peak}</b> / ${r.outside.sum}</td><td>${c.conflict.peak}</td><td><b>${r.conflict.peak}</b></td><td>${r.strikePeak}</td><td>${r.elbowGapAtContact}</td><td>${r.rollEnd?.wristEdgeGap}</td><td>${r.hurts} / ${r.shakes}</td><td>${r.seamAtEnd}</td></tr>`; };
const cell = (r) => { const c = cur(r), pack = (x, dir) => `data-dir="${dir}/${x.id}" data-from="${x.from}" data-n="${x.frames - x.from}" data-marks='${JSON.stringify(Object.fromEntries(Object.entries({ ...x.marks, kicks: x.marks.hit + 10 }).map(([k, v]) => [k, v - x.from])))}'`;
    return `<div class="p"><div class="c"><canvas ${pack(c, 'frames-current')} width="640" height="330"></canvas><div class="cap"><b>current</b> (T4.7a): ${r.attacker} on ${r.victim}, ${r.lying}, facing ${r.facing > 0 ? 'right' : 'left'} <span class="m"></span></div></div>
<div class="c"><canvas ${pack(r, 'frames-revised')} width="640" height="330"></canvas><div class="cap"><b>revised</b> (T4.7b) <span class="m"></span></div></div></div>`; };
const html = `<!doctype html><meta charset="utf-8"><title>G4a r2b: one continuous fall</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1400px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0;font-size:12px}td,th{border:1px solid #444;padding:3px 6px;text-align:left}h2{margin-top:28px}
.p{display:flex;gap:10px;margin:8px 0}.c{width:640px}canvas{background:#000;width:640px;height:330px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}.m{color:#fc6;font-weight:bold}button{font:inherit;padding:4px 10px;margin-right:6px}</style>
<h1>G4a r2c: finesse on the continuous fall (T4.7c), <code>?falls=v1</code></h1>
<p><button id="n">normal speed (60 fps)</button><button id="q">quarter speed (15 fps)</button> Left: the T4.7b drop (ba94014). Right: revised. Both start on the same frame (the call of the move); the hit lands on the same frame in both (44 frames after the call: Derek's timing is locked). The yellow tag names the mark on screen: <b>apex</b>, <b>flight end</b>, <b>on the mat</b> (current: the flight clip's last frame; revised: the hip reaching the contact height, which is the hit), <b>HIT</b>, <b>roll-off</b>, <b>kicks start</b> (revised only). Derek judges the look.</p>
<p>What changed: (1) the arms lead the fall: the striking arm reaches its cocked contact pose by 45% of the fall while the body keeps its u&sup2; gravity ease; (2) the stop is a yield: the hip sinks 14 px past contact over the first 60% of the hold (decelerating), then recoils; (3) his legs lie along the mat from contact through the roll-off, angled a little away up the screen, instead of the raised far boot and splayed near knee; (4) the receiver's new sell after a ground hit (<code>groundHitSell</code>, reusable by the knee drop and dives): chest pinned for 0.08 s, then head and shoulders curl up, knees draw up, arms flail, then three alternating leg kicks from 0.16 s that fade, back on the lying pose by 1.0 s. The jolt is not used for the elbow drop any more. Down timer and get-up unchanged.</p>
<h2 class="miss">Misses first</h2><ul>
<li><b>The body still reads fairly flat in the fall.</b> The cocked arm leads, but the 2D rig has no roll about the long axis, so "on its side with the elbow lowest" is only the arm pose, not the torso. Say if it needs the torso tipped, or art.</li>
<li><b>The stop is softer but still short:</b> hip speed goes 30 / 14 / ~1 px per frame over the hit frame and the next (George 34 / 16 / ~1); the squash is ${Math.min(...R.map(r => r.stop.squash))}-${Math.max(...R.map(r => r.stop.squash))} px past the hit frame (was 2.4-3.1). A yield over 3-4 frames from 30 px/frame would need about 45 px of travel, so this is a compromise.</li>
<li><b>Supine receivers overlap the attacker more than before:</b> his limbs on the attacker peak at ${Math.max(...R.filter(r => r.lying === 'supine').map(r => r.recvLimbPeak))} px (was ${Math.max(...R.filter(r => r.lying === 'supine').map(r => cur(r).recvLimbPeak))}), outside-limb overlap peaks at ${Math.max(...R.map(r => r.outside.peak))} px (was 2,503), from the curl and the kicks. Prone receivers overlap less. Part of it is legitimate 2D occlusion of a man lying against another; I did not tune the sell down to hide it.</li>
<li><b>His kicks reach the attacker's side of the screen:</b> no part of the receiver goes past the side ropes (0 px, all cells). The kick counts below are ankle peaks over 8 px, 2-4 per leg; the design is three alternating kicks, the rest are the knee draw and the arm flail moving the ankle.</li>
<li><b>His legs "kick" by swinging the whole leg in the grounded rig's channels;</b> the feet go up the screen, not toward the camera, so on a supine man they can read as lifting more than kicking. Judge in motion.</li>
<li>The sell holds the pin off for 1.0 s (the jolt held it for about 0.55 s).</li>
<li>Seam at the end of the settle is 0.9-1.0 px (was 0.6-0.7). Carried over: the striking part is the far forearm, he ends about 130 px up-screen, Lou's contact pose is still roughly parallel to George. Elbow drop only; knee drop and dives wait; no soak.</li></ul>
<h2>Marks (frames from the move's call; 60 frames = 1 s)</h2>
<table><tr><th>cell</th><th>version</th><th>apex</th><th>flight end</th><th>first mat support</th><th>HIT</th><th>frames on the mat before the hit</th><th>roll-off</th></tr>${marks}</table>
<h2>The stop (attacker hip, px per frame, down +) and the squash</h2>
<p>Four frames before the hit, the hit frame, four after; squash = how far the hip sinks past its height at the hit (px). The fall itself is unchanged (still rising to contact, timing locked).</p>
<table><tr><th>cell</th><th></th><th>4 frames before</th><th>hit frame</th><th>4 frames after</th><th>squash px</th></tr>${R.map(stop).join('')}</table>
<h2>The receiver: kicks (near / far ankle peaks &gt; 8 px after the curl), his limbs against the attacker, past the ropes</h2>
<table><tr><th>cell</th><th>kicks current</th><th>kicks revised</th><th>his limbs on the attacker, peak px, current</th><th>revised</th><th>past the side ropes px, current</th><th>revised</th></tr>${R.map(sell).join('')}</table>
<h2>Overlap (matched window: first <code>down</code> frame + 66 frames; peak / sum, px), contact, hit, seam</h2>
<table><tr><th>cell</th><th>raw current</th><th>raw revised</th><th>outside current</th><th>outside revised</th><th>conflict current</th><th>conflict revised</th><th>forearm on him</th><th>elbow gap at hit</th><th>wrist gap</th><th>hurts / shakes</th><th>seam at end</th></tr>${R.map(over).join('')}</table>
<p>Signed joints (knees and elbows bend-only, inside the limits) and part-layer cleanup (depths restored on the end of contact, a pin, a cancel; one damage beat) are in <code>tests/falls.test.js</code>.</p>
<h2>Loops</h2>${R.map(cell).join('')}
<script>
let rate = 60;
const names = { apex: 'apex', flightEnd: 'flight end', matLevel: 'on the mat', hit: 'HIT', rolloff: 'roll-off', kicks: 'kicks start (revised only)' };
document.getElementById('n').onclick = () => { rate = 60; }; document.getElementById('q').onclick = () => { rate = 15; };
document.querySelectorAll('canvas').forEach(cv => { const dir = cv.dataset.dir, from = +cv.dataset.from, n = +cv.dataset.n, ctx = cv.getContext('2d'), marks = JSON.parse(cv.dataset.marks), tag = cv.parentNode.querySelector('.m'), ims = [];
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = dir + '/s' + String(from + i).padStart(4, '0') + '.jpg'; ims.push(im); }
  let k = 0, last = 0;
  const tick = (ts) => { if (ts - last >= 1000 / rate) { last = ts; const j = Math.min(k, n - 1), im = ims[j]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, 640, 330);
      const hit = Object.entries(marks).filter(([m, v]) => v >= 0 && m !== 'trigger' && Math.abs(v - j) <= 1).map(([m]) => names[m]); tag.textContent = hit.length ? '[' + hit.join(', ') + ']' : '';
      k = (k + 1) % (n + 20); }   // the last frame holds for 20 ticks, then the loop restarts
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick); });
</script>`;
writeFileSync(`${root}/index.html`, html);
console.log(`wrote ${root}/index.html (${R.length} cells)`);
