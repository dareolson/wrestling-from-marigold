// PLAN_FALLS T4.7d: strips for the knee drop, diving elbow and top dive receivers (groundHitSell), from falls_g4a_probe.mjs output (frames local, gitignored).
//   node tools/debug/falls_g4a_r2d_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11/g4a-r2d';
const R = JSON.parse(readFileSync(`${root}/results.json`, 'utf8'));
const cell = (c) => `<div class="c"><canvas data-id="${c.id}" data-from="${c.from}" data-n="${c.frames - c.from}" width="640" height="330"></canvas><div class="cap"><b>${c.move}</b>, ${c.attacker} on ${c.victim}, attacker facing ${c.facing > 0 ? 'right' : 'left'}; sell ${c.joltFrames[1] - c.joltFrames[0] + 1} frames, max joint step ${c.joltMaxStepRecv} px/frame, rest delta ${c.restDelta}</div></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>G4a r2d: ground-hit sell on the knee drop and dives</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1400px;background:#111;color:#ddd}h2{margin-top:28px}.g{display:flex;flex-wrap:wrap;gap:10px}.c{width:640px}canvas{background:#000;width:640px;height:330px}.cap{font-size:12px;color:#aaa}</style>
<h1>G4a r2d: receiver sell after a ground hit, <code>?falls=v1</code></h1><p>Normal-speed loops, 60 fps, supine receiver, both facings, both rig pairs. Derek judges the look.</p>
${[['kneeDrop', 'Knee drop (0.8)'], ['divingElbow', 'Diving elbow on a downed man (0.9)'], ['topDive', 'Top dive on a downed man (0.9)']].map(([m, t]) => `<h2>${t}</h2><div class="g">${R.filter(c => c.move === m).map(cell).join('')}</div>`).join('')}
<script>
document.querySelectorAll('canvas').forEach(cv => { const id = cv.dataset.id, from = +cv.dataset.from, n = +cv.dataset.n, ctx = cv.getContext('2d'), ims = [];
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = 'frames/' + id + '/s' + String(from + i).padStart(4, '0') + '.jpg'; ims.push(im); }
  let k = 0; setInterval(() => { const im = ims[k]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, 640, 330); k = (k + 1) % n; }, 1000 / 60); });
</script>`;
writeFileSync(`${root}/index.html`, html);
console.log(`wrote ${root}/index.html (${R.length} cells)`);
