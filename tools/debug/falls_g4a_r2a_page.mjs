// PLAN_FALLS T4.7a: the G4a r2a page, research/animation/falls-2026-11/g4a-r2a/index.html, from results.json (the animated elbow drop) and before.json (the G4a path, same matched window),
// both from falls_g4a_r2a_probe.mjs; frames/ is local and gitignored.   node tools/debug/falls_g4a_r2a_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11/g4a-r2a';
const A = JSON.parse(readFileSync(`${root}/results.json`, 'utf8')), B = JSON.parse(readFileSync(`${root}/before.json`, 'utf8'));
const pair = (a) => B.find(b => b.id === a.id);
const max = (k, f) => Math.max(...A.map(a => f(a)));
const row = (a) => { const b = pair(a); return `<tr><td>${a.attacker} on ${a.victim}, ${a.lying}, ${a.facing > 0 ? 'right' : 'left'}</td>
<td>${b.raw.peak} / ${b.raw.sum}</td><td><b>${a.raw.peak}</b> / ${a.raw.sum}</td><td>${b.outside.peak} / ${b.outside.sum}</td><td><b>${a.outside.peak}</b> / ${a.outside.sum}</td><td>${b.conflict.peak}</td><td><b>${a.conflict.peak}</b></td>
<td>${a.strikePeak}</td><td>${a.elbowGapAtContact}</td><td>${a.rollEnd?.wristEdgeGap}</td><td>${a.rollEnd ? a.rollEnd.raw + ' / ' + a.rollEnd.out : '-'}</td><td>${a.hurts} / ${a.shakes}</td><td>${a.seamAtEnd}</td></tr>`; };
const cell = (a) => `<div class="c"><canvas data-id="${a.id}" data-from="${a.from}" data-n="${a.frames - a.from}" width="640" height="330"></canvas><div class="cap"><b>${a.attacker} on ${a.victim}</b>, receiver ${a.lying}, attacker facing ${a.facing > 0 ? 'right' : 'left'}</div></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>G4a r2a: elbow drop in motion</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1400px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0;font-size:12px}td,th{border:1px solid #444;padding:3px 6px;text-align:left}h2{margin-top:28px}
.g{display:flex;flex-wrap:wrap;gap:10px}.c{width:640px}canvas{background:#000;width:640px;height:330px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}</style>
<h1>G4a r2a: the elbow drop in motion (T4.7a), <code>?falls=v1</code></h1>
<p>Normal-speed loops, 60 fps, the attacker on the far side. Flight, then: 0.14 s blend into the approach, 0.16 s down onto the receiver's chest (damage, sound and shake on the contact frame), 0.10 s hold, 0.34 s roll-off with the far hand planted on the mat past his far edge, 0.30 s settle into the ordinary lying pose, then the get-up. Derek judges the look; everything below is measurement.</p>
<h2 class="miss">Misses first</h2><ul>
<li><b>Overlap is not zero.</b> Raw overlap peaks at ${max('raw', a => a.raw.peak)} px and overlap outside the declared striking forearm + hand at ${max('o', a => a.outside.peak)} px (bodies about 6,000-8,000 px). The shoulder, upper arm and head lie against the receiver's chest because the elbow is pinned there and the arm is only about 60 px long; a torso lying beside him overlaps him by geometry. The depth-conflict column (attacker parts drawn over his) peaks at ${max('c', a => a.conflict.peak)} px: that is the upper arm and head over him, the part to watch in the loops.</li>
<li><b>He ends up far from where he started:</b> the far-side placement and the planted hand move him up the screen (about 130 px at the receiver's depth), and the commit leaves him there for the get-up. Ring room is clamped along the route (test), so close to the far rope the elbow misses the chest rather than the body leaving the ring.</li>
<li><b>Fast arrival:</b> the blend and the reach move a joint 18-32 px per frame (the flight before it is 13-34); the reach is eased in on purpose, so the elbow arrives at speed. The seam at the end (settle into the lying pose, no handoff) is the last column.</li>
<li>The striking part is declared as the <b>far</b> arm's forearm + hand (the arm the stills used); the plan's note says "near-camera forearm + hand", but with the attacker on the far side it is the far arm that reaches the chest. Say if you meant the other arm.</li>
<li>Elbow drop only. Knee drop, diving elbow and top dive are untouched (their G4a path), and the whole of T4.7's full validation waits for this look.</li>
<li>Rig-wide not checked: the pose angles are one set for both rigs; George's longer arm leaves a different gap (elbow gap column). Single-run measurement, seeded; no soak.</li></ul>
<h2>Matched window: the attacker's first <code>down</code> frame to 66 frames (1.1 s), before (G4a path) vs after</h2>
<p>peak / sum over the window, px. raw = both paint; outside = not under the declared forearm + hand; conflict = an attacker part outside that limb drawn above a receiver part. Elbow gap = far elbow to the receiver's chest at the contact frame (px). Roll-off end: the wrist's height above the receiver's far edge (+ above, on the mat beside him; - inside his silhouette), then raw / outside overlap on that frame. hurts / shakes = how many times damage and shake fired.</p>
<table><tr><th>cell</th><th>raw before</th><th>raw after</th><th>outside before</th><th>outside after</th><th>conflict before</th><th>conflict after</th><th>forearm on him</th><th>elbow gap</th><th>wrist gap</th><th>roll-off raw / out</th><th>hurts / shakes</th><th>seam at end</th></tr>${A.map(row).join('')}</table>
<h2>Loops</h2><div class="g">${A.map(cell).join('')}</div>
<script>
document.querySelectorAll('canvas').forEach(cv => { const id = cv.dataset.id, from = +cv.dataset.from, n = +cv.dataset.n, ctx = cv.getContext('2d'), ims = [];
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = 'frames/' + id + '/s' + String(from + i).padStart(4, '0') + '.jpg'; ims.push(im); }
  let k = 0; setInterval(() => { const im = ims[k]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, 640, 330); k = (k + 1) % (n + 30); if (k >= n) k = 0; }, 1000 / 60); });
</script>`;
writeFileSync(`${root}/index.html`, html);
console.log(`wrote ${root}/index.html (${A.length} cells)`);
