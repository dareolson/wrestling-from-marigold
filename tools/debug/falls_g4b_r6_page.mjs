// PLAN_FALLS T4.8c: the G4b r6 page, research/animation/falls-2026-11/g4b-r6/index.html: the diving elbow's roll at r5 (dolphin), at r6 (legs stay on their side, tuck after the
// flip) and the pivot (Derek's leg reference), same cells, both rigs, both facings. From falls_g4a_probe.mjs results (CONTACT=1, ONLY=divingElbow LYING=supine) in g4b-r5-roll,
// g4b-r6-roll and g4b-r4-pivot; frames local and gitignored.
//   node tools/debug/falls_g4b_r6_page.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const dir = 'research/animation/falls-2026-11';
const load = (d) => JSON.parse(readFileSync(`${dir}/${d}/results.json`, 'utf8'));
const COLS = [['g4b-r5-roll', 'roll r5'], ['g4b-r6-roll', 'roll r6'], ['g4b-r4-pivot', 'pivot (leg reference)']].map(([d, label]) => ({ d, label, R: load(d) }));
const ids = COLS[1].R.map(r => r.id);
const info = (r) => { const sp = r.splash; return { contact: sp[0].i, apex: sp.reduce((m, f) => (f.lift > m.lift ? f : m), sp[0]).i, land: sp.find(f => f.seg === 'settle').i, up: r.getUp.at }; };
const cell = (c, id) => { const r = c.R.find(x => x.id === id), i = info(r);
    return `<div class="c"><canvas data-dir="${c.d}" data-id="${id}" data-from="${i.contact - 6}" data-to="${i.up + 14}" data-contact="${i.contact}" data-apex="${i.apex}" data-land="${i.land}" data-up="${i.up}" width="560" height="288"></canvas><div class="cap"><b>${c.label}</b>: ${r.attacker} on ${r.victim}, facing ${r.facing > 0 ? 'right' : 'left'}</div></div>`; };
const html = `<!doctype html><meta charset="utf-8"><title>G4b r6: the roll's legs</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1200px;background:#111;color:#ddd}.g{display:grid;grid-template-columns:380px 380px 380px;gap:10px}.c{width:380px}canvas{background:#000;width:380px;height:196px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}button{background:#333;color:#ddd;border:1px solid #666;padding:4px 10px;margin-right:6px;cursor:pointer}button.on{background:#865;color:#fff}.hdr{position:sticky;top:0;background:#111;padding:6px 0;z-index:5}</style>
<h1>G4b r6: the roll keeps its legs on their own side</h1>
<div class="hdr"><button id="n" class="on">normal speed</button><button id="q">quarter speed</button> Left to right: <b>roll r5</b>, <b>roll r6</b>, <b>pivot</b>. Diving elbow on a man on his back. Marks: contact, apex, landed, get-up.</div>
<h2 class="miss">Misses first</h2><ul>
<li><b>The straight moment stays.</b> The art flips at the apex, and a knee bent before the flip would point backward after it, so the legs pass through straight there (knee bend under 0.2 rad for about 4 frames, u 0.43-0.58). What changed is where they point: r5 threw them across to the head's side, then swung them back while the torso tipped over (the arch). r6 keeps them on the far side the whole roll: thigh angle on screen -0.62, -0.60 at the flip, -1.20 at the tuck, -1.50 / -1.97 lying, one direction only.</li>
<li><b>The torso rises less:</b> it peaks 0.59 rad short of vertical (2.55 rad; r5 3.0, 0.14 short). Legs straight under a vertical torso would put the feet through the mat at this height; the alternative is raising the apex, which Derek halved at r3.</li>
<li>After the flip, the tuck (thighs up, shins hanging, as the pivot) runs 6.7 px/frame for 5 frames (neighbouring frames 3-5); the last 3 frames before the landing reach 8.9 (the gravity fall, unchanged).</li>
<li>Feet clear the mat until the landing (closest 10 px at the start of the tuck, test leg lengths 44 + 44). Apex hip 70 (r5 66), the bounce lift is unchanged (14 px).</li>
<li>Not changed: the sprite flip itself, the get-up's turn inside the rise, overlap after landing, timing, travel.</li></ul>
${ids.map(id => `<div class="g">${COLS.map(c => cell(c, id)).join('')}</div>`).join('')}
<script>
let rate = 1; const btn = (id, v) => document.getElementById(id).onclick = () => { rate = v; document.getElementById('n').className = v === 1 ? 'on' : ''; document.getElementById('q').className = v === 1 ? '' : 'on'; }; btn('n', 1); btn('q', 0.25);
document.querySelectorAll('canvas').forEach(cv => { const d = cv.dataset, from = +d.from, to = +d.to, ctx = cv.getContext('2d'), n = to - from + 1, ims = [];
  const mark = (i) => i === +d.contact ? 'CONTACT' : i === +d.apex ? 'APEX' : i === +d.land ? 'LANDED' : i === +d.up ? 'GET-UP' : '';
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = '../' + d.dir + '/frames/' + d.id + '/s' + String(from + i).padStart(4, '0') + '.jpg'; ims.push(im); }
  let k = 0, acc = 0, last = performance.now();
  const draw = (now) => { acc += (now - last) * rate / (1000 / 60); last = now; while (acc >= 1) { acc -= 1; k = (k + 1) % (n + 20); }
    const i = Math.min(k, n - 1), im = ims[i]; if (im.complete && im.naturalWidth) { ctx.drawImage(im, 0, 0, 380, 196); ctx.fillStyle = '#fc6'; ctx.font = '14px system-ui'; ctx.fillText(String(from + i) + ' ' + mark(from + i), 8, 18); } requestAnimationFrame(draw); };
  requestAnimationFrame(draw); });
</script>`;
mkdirSync(`${dir}/g4b-r6`, { recursive: true });
writeFileSync(`${dir}/g4b-r6/index.html`, html);
console.log(`wrote ${dir}/g4b-r6/index.html`);
