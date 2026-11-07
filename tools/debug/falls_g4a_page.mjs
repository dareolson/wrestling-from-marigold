// PLAN_FALLS T4.2b: the G4a page, research/animation/falls-2026-11/g4a/index.html, from film/results.json (falls_g4a_probe.mjs) and film/frames (local, gitignored).
//   node tools/debug/falls_g4a_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11/g4a';
const R = JSON.parse(readFileSync(`${root}/film/results.json`, 'utf8'));
const LIMIT = 2.5;
const cells = R.filter(c => c.facing === 1 || true);
const att = R.filter(c => c.attackerSeamStep != null && c.facing === 1);
const jolt = R.filter(c => c.joltFrames && c.facing === 1);
const knee = R.filter(c => c.kneeRise && c.facing === 1 && c.lying === 'supine');
const row = (c) => `<tr><td>${c.move}</td><td>${c.attacker} on ${c.victim}</td><td>${c.attackerStepBefore}</td><td><b>${c.attackerSeamStep}</b></td><td>${c.attackerStepAfterSeam}</td><td>${c.handoff ? 'yes' : 'no'}</td><td>${c.attackerStates.map(s => s.s).join(' &gt; ')}</td></tr>`;
const uniqAtt = [...new Map(att.filter(c => c.lying !== 'prone').map(c => [c.id, c])).values()];
const jrow = (c) => `<tr><td>${c.move}</td><td>${c.victim} ${c.lying}</td><td>${c.joltFrames[1] - c.joltFrames[0] + 1} frames (${((c.joltFrames[1] - c.joltFrames[0] + 1) / 60).toFixed(2)} s)</td><td>${c.joltMaxStepRecv}</td><td>${c.restDelta}</td></tr>`;
const cell = (c) => `<div class="c"><canvas data-id="${c.id}" data-from="${c.from}" data-n="${c.frames - c.from}" width="640" height="330"></canvas><div class="cap"><b>${c.move}</b>, ${c.attacker} on ${c.victim} (${c.lying ?? 'standing'}), attacker facing ${c.facing > 0 ? 'right' : 'left'}</div></div>`;
const groups = [['elbowDrop', 'Elbow drop (T4.2b: attacker lies down 0.8 s, then the get-up; receiver jolts 0.7)'], ['kneeDrop', 'Knee drop (receiver jolts 0.8; attacker rise left alone, see misses)'],
    ['divingElbow', 'Diving elbow on a downed man (receiver jolts 0.9; attacker now lays down through the handoff)'], ['topDive', 'Top dive splash on a downed man (0.9; attacker through the handoff)'], ['theszPress', 'Thesz press whiff (the receiver is down, so it misses: attacker only)']];
const html = `<!doctype html><meta charset="utf-8"><title>G4a: down-hit reaction and attacker landings</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1400px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #444;padding:3px 8px;text-align:left}h2{margin-top:28px}
.g{display:flex;flex-wrap:wrap;gap:10px}.c{width:640px}canvas{background:#000;width:640px;height:330px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}</style>
<h1>G4a: down-hit reaction (T4.1-T4.2) and attacker landings (T4.2b), <code>?falls=v1</code></h1>
<p>Normal-speed loops, 60 fps. Derek judges the look; the numbers below are measurements only.</p>
<h2 class="miss">Misses first</h2><ul>
<li>Seam step is over the ${LIMIT} px/frame limit on every attacker landing, even after the fix: elbow drop 6.5 (George) / 9.3 (Lou), diving elbow and top dive 3.1-5.5, press whiff 4.5-6.5. These are the handoff blend's first frame; the flight just before moves 13-34 px/frame, so it is not a freeze-then-pop. Before the fix the diving elbow and top dive cut 51-54 px.</li>
<li>Knee drop: not changed. The attacker rises in ${knee.map(c => c.kneeRise.frames).join('/')} frames (about 0.38 s) with a max step of ${knee.map(c => c.kneeRise.maxStep).join(' / ')} px/frame (George / Lou receiving), against ${knee.map(c => c.kneeRise.stepBefore).join(' / ')} px/frame at the end of the flight. That is over the limit and a teleport-like stand; Derek's call whether to give it a lie-down too.</li>
<li>The jolt is fast by design: the receiver's largest joint step during it is ${Math.min(...jolt.map(c => c.joltMaxStepRecv))} to ${Math.max(...jolt.map(c => c.joltMaxStepRecv))} px/frame (the arms). It is velocity, not a seam: he returns to his exact lying pose (rest delta 0 px every cell).</li>
<li>The press whiff has no baseline from before the change (the cell only whiffs on a downed man), so its seam is reported, not compared.</li>
<li>Not checked in this pass: outline overlap, rope and mat clipping (watch the loops), a jolt over a sell already in progress (it drops the sell), the AI choosing these moves in a match (that is T4.3's soak).</li></ul>
<h2>Attacker landing seam (px per frame, largest joint; both rigs, facing right; supine and prone receivers give the same attacker numbers)</h2>
<table><tr><th>move</th><th>who</th><th>step before</th><th>step at the seam</th><th>max of next 5</th><th>handoff</th><th>states</th></tr>${uniqAtt.map(row).join('')}</table>
<h2>Receiver's jolt (facing right)</h2>
<table><tr><th>move</th><th>receiver</th><th>length</th><th>max joint step px/frame</th><th>rest-pose delta after (px)</th></tr>${jolt.map(jrow).join('')}</table>
${groups.map(([m, t]) => `<h2>${t}</h2><div class="g">${R.filter(c => c.move === m).map(cell).join('')}</div>`).join('')}
<script>
document.querySelectorAll('canvas').forEach(cv => { const id = cv.dataset.id, from = +cv.dataset.from, n = +cv.dataset.n, ctx = cv.getContext('2d'), ims = [];
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = 'film/frames/' + id + '/s' + String(from + i).padStart(4, '0') + '.jpg'; ims.push(im); }
  let k = 0; setInterval(() => { const im = ims[k]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, 640, 330); k = (k + 1) % (n + 30); if (k >= n) k = k; if (k >= n) { k = 0; } }, 1000 / 60); });
</script>`;
writeFileSync(`${root}/index.html`, html);
console.log(`wrote ${root}/index.html (${R.length} cells)`);
