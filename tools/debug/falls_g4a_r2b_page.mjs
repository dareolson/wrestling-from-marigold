// PLAN_FALLS T4.7b: the G4a r2b page, research/animation/falls-2026-11/g4a-r2b/index.html: the elbow drop as of T4.7a (current, 54b60db) beside the one continuous fall (revised), normal and quarter speed,
// from current.json and revised.json (falls_g4a_r2a_probe.mjs with OUT/FRAMES, the current code served from a worktree); frames-*/ are local and gitignored.   node tools/debug/falls_g4a_r2b_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11/g4a-r2b';
const C = JSON.parse(readFileSync(`${root}/current.json`, 'utf8')), R = JSON.parse(readFileSync(`${root}/revised.json`, 'utf8'));
const cur = (r) => C.find(c => c.id === r.id);
const rel = (r, k) => (r.marks[k] >= 0 ? r.marks[k] - r.marks.trigger : '-');
const f = (n) => (n == null ? '-' : n);
const marksRow = (r, tag) => { const sup = tag === 'current' ? r.marks.flightEnd : r.marks.matLevel, ms = sup - r.marks.trigger; return `<tr><td>${r.attacker} on ${r.victim}, ${r.lying}, ${r.facing > 0 ? 'right' : 'left'}</td><td>${tag}</td><td>${rel(r, 'apex')}</td><td>${rel(r, 'flightEnd')}</td><td>${ms}</td><td><b>${rel(r, 'hit')}</b></td><td>${rel(r, 'hit') - ms}</td><td>${rel(r, 'rolloff')}</td></tr>`; };
const marks = R.map(r => marksRow(cur(r), 'current') + marksRow(r, '<b>revised</b>')).join('');
const speed = (r) => `<tr><td>${r.attacker} on ${r.victim}, ${r.lying}, ${r.facing > 0 ? 'right' : 'left'}</td><td>${r.speedAtHandoff.before.join(' ')}</td><td><b>${r.speedAtHandoff.at}</b></td><td>${r.speedAtHandoff.after.join(' ')}</td><td>${r.descent.slice(0, 12).map(v => Math.round(v)).join(' ')}</td><td>${r.descent.slice(0, r.descent.indexOf(Math.max(...r.descent)) + 1).every((v, i, a) => i === 0 || v >= a[i - 1] - 0.01) ? 'rising' : '<b>NOT rising</b>'}</td></tr>`;
const over = (r) => { const c = cur(r); return `<tr><td>${r.attacker} on ${r.victim}, ${r.lying}, ${r.facing > 0 ? 'right' : 'left'}</td><td>${c.raw.peak} / ${c.raw.sum}</td><td><b>${r.raw.peak}</b> / ${r.raw.sum}</td><td>${c.outside.peak} / ${c.outside.sum}</td><td><b>${r.outside.peak}</b> / ${r.outside.sum}</td><td>${c.conflict.peak}</td><td><b>${r.conflict.peak}</b></td><td>${r.strikePeak}</td><td>${r.elbowGapAtContact}</td><td>${r.rollEnd?.wristEdgeGap}</td><td>${r.hurts} / ${r.shakes}</td><td>${r.seamAtEnd}</td></tr>`; };
const cell = (r) => { const c = cur(r), pack = (x, dir) => `data-dir="${dir}/${x.id}" data-from="${x.from}" data-n="${x.frames - x.from}" data-marks='${JSON.stringify(Object.fromEntries(Object.entries(x.marks).map(([k, v]) => [k, v - x.from])))}'`;
    return `<div class="p"><div class="c"><canvas ${pack(c, 'frames-current')} width="640" height="330"></canvas><div class="cap"><b>current</b> (T4.7a): ${r.attacker} on ${r.victim}, ${r.lying}, facing ${r.facing > 0 ? 'right' : 'left'} <span class="m"></span></div></div>
<div class="c"><canvas ${pack(r, 'frames-revised')} width="640" height="330"></canvas><div class="cap"><b>revised</b> (T4.7b) <span class="m"></span></div></div></div>`; };
const html = `<!doctype html><meta charset="utf-8"><title>G4a r2b: one continuous fall</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1400px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0;font-size:12px}td,th{border:1px solid #444;padding:3px 6px;text-align:left}h2{margin-top:28px}
.p{display:flex;gap:10px;margin:8px 0}.c{width:640px}canvas{background:#000;width:640px;height:330px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}.m{color:#fc6;font-weight:bold}button{font:inherit;padding:4px 10px;margin-right:6px}</style>
<h1>G4a r2b: the elbow drop as one continuous fall (T4.7b), <code>?falls=v1</code></h1>
<p><button id="n">normal speed (60 fps)</button><button id="q">quarter speed (15 fps)</button> Left: the T4.7a drop (54b60db). Right: revised. Both start on the same frame (the call of the move). The yellow tag names the mark on screen: <b>apex</b> (hip at its highest), <b>flight end</b> (the old flight clip's last frame / the cut flight's last frame), <b>on the mat</b> (current: the flight clip's last frame, tilt 1.5 and lift -95, already mat-level; revised: the hip reaching the contact pose's height, which is the hit frame), <b>HIT</b> (damage, jolt, sound and shake fire), <b>roll-off</b>. Derek judges the look.</p>
<p>What changed: the flight clip is cut at its apex key (0.24 of 0.38 s) and the ground attack carries him down in one gravity-eased fall (u&sup2;, from the apex) into the elbow on the chest, so the hit lands on the frame the old flight used to end. There is no pose on the mat before it and no climb back to an approach pose. After the hit: a brief compression (hip dips 5 px and returns over the hold), then the hold, roll-off, planted hand, settle and get-up exactly as before.</p>
<h2 class="miss">Misses first</h2><ul>
<li><b>Overlap is still not zero</b> and is no better at the peak: outside-limb peak ${Math.max(...R.map(r => r.outside.peak))} px, depth conflict peak ${Math.max(...R.map(r => r.conflict.peak))} px (the contact pose is unchanged; the upper arm and head against his chest). The sum over the matched window is lower because the hit now lands earlier inside it.</li>
<li><b>He hits at speed.</b> The hip is falling about ${Math.round(Math.max(...R.map(r => r.descent.at(-3) ?? 0)))} px/frame on the last frame before contact, then stops within the hold. That is the gravity ease; the compression is only 5 px, so the stop is abrupt. Say if the arrival wants softening or the hit more weight.</li>
<li>The cut flight clip's last key has the body near horizontal and still in the air (tilt 1.35, lift 80); the grounded pose blend takes over from there. The flight's x travel (Sine in-out over 0.24 s) ends at his apex, so the sideways slide to the far side happens in the fall (0.14 s, linear).</li>
<li>Carried over, unchanged: striking part is the far forearm (plan said near), he ends about 130 px up-screen, Lou's contact pose is still roughly parallel to George's.</li>
<li>Elbow drop only; knee drop and dives wait. No soak. One seeded run per cell.</li></ul>
<h2>Marks (frames from the move's call; 60 frames = 1 s)</h2>
<table><tr><th>cell</th><th>version</th><th>apex</th><th>flight end</th><th>first mat support</th><th>HIT</th><th>frames on the mat before the hit</th><th>roll-off</th></tr>${marks}</table>
<h2>Downward speed across the flight / contact handoff (attacker hip, px per frame, down +)</h2>
<p>revised only (the current version has no descent: it flies to the mat first). Four frames before the flight's last frame, that frame, four after; then from the apex through the hit. Rising means each frame's downward speed is not lower than the one before it, up to the hit.</p>
<table><tr><th>cell</th><th>4 frames before</th><th>flight end frame</th><th>4 frames after</th><th>apex &rarr; hit</th><th></th></tr>${R.map(speed).join('')}</table>
<h2>Overlap (matched window: first <code>down</code> frame + 66 frames; peak / sum, px), contact, hit, seam</h2>
<table><tr><th>cell</th><th>raw current</th><th>raw revised</th><th>outside current</th><th>outside revised</th><th>conflict current</th><th>conflict revised</th><th>forearm on him</th><th>elbow gap at hit</th><th>wrist gap</th><th>hurts / shakes</th><th>seam at end</th></tr>${R.map(over).join('')}</table>
<p>Signed joints (knees and elbows bend-only, inside the limits) and part-layer cleanup (depths restored on the end of contact, a pin, a cancel; one damage beat) are in <code>tests/falls.test.js</code>.</p>
<h2>Loops</h2>${R.map(cell).join('')}
<script>
let rate = 60;
const names = { apex: 'apex', flightEnd: 'flight end', matLevel: 'on the mat', hit: 'HIT', rolloff: 'roll-off' };
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
