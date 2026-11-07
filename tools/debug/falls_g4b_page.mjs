// PLAN_FALLS T4.8: the G4b page, research/animation/falls-2026-11/g4b/index.html: the splash on a downed man, current (g4b-current) beside revised (g4b), from
// falls_g4a_probe.mjs results.json (CONTACT=1) and the local, gitignored frames.
//   node tools/debug/falls_g4b_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'research/animation/falls-2026-11';
const load = (d) => JSON.parse(readFileSync(`${dir}/${d}/results.json`, 'utf8'));
const cur = load('g4b-current'), rev = load('g4b');
const gu = JSON.parse(readFileSync(`${dir}/g4b/getup.json`, 'utf8'));   // the get-up's first steps, from a second probe pass over the same seeded cells (the field was added after the first run)
for (const r of rev) r.getUp = gu[r.id];
const sum = (a) => a.reduce((n, f) => n + (f.ms ?? 0), 0);
const info = (r) => {
    const sp = r.splash, contact = sp[0].i, apex = sp.reduce((m, f) => (f.lift > m.lift ? f : m), sp[0]).i, land = sp.find(f => f.seg === 'settle').i, up = r.getUp.at;
    const land0 = sp.filter(f => f.seg === 'settle'), move = sp.filter(f => f.seg === 'rise' || f.seg === 'fall');
    return { contact, apex, land, up, from: contact - 6, to: up + 14, overlapFrames: sp.filter(f => f.ms > 50).length, overlapSum: Math.round(sum(sp) / 1000), afterLanding: Math.max(0, ...land0.map(f => f.ms ?? 0)),
        maxStep: Math.max(...move.map(f => f.ast)), toY: sp.find(f => f.to).to[1], start: sp[0].root, end: sp.at(-1).root, getUpStep: r.getUp.step, downFrames: up - contact };
};
const rows = rev.filter(r => r.facing === 1).map(r => ({ r, c: cur.find(x => x.id === r.id), i: info(r) }));
const cell = (d, r, i, label) => `<div class="c"><canvas data-dir="${d}" data-id="${r.id}" data-from="${i.from}" data-to="${i.to}" data-contact="${i.contact}" data-apex="${i.apex}" data-land="${i.land}" data-up="${i.up}" width="560" height="288"></canvas><div class="cap">${label}</div></div>`;
const table = rows.filter(x => x.r.lying === 'supine').map(({ r, c, i }) => `<tr><td>${r.move}</td><td>${r.attacker} on ${r.victim}</td><td>${c.contact.framesMiss50}</td><td>${Math.round(c.contact.missSum / 1000)}k</td><td>${i.overlapFrames}</td><td>${i.overlapSum}k</td><td><b>${i.afterLanding}</b></td><td>${i.maxStep}</td><td>${i.start[1]} to ${i.end[1]}</td><td>${i.downFrames} (${(i.downFrames / 60).toFixed(2)} s)</td><td>${r.getUp.step} / ${r.getUp.stoodStep}</td></tr>`).join('');
const groups = [['topDive', 'Top dive on a downed man'], ['divingElbow', 'Diving elbow on a downed man']];
const html = `<!doctype html><meta charset="utf-8"><title>G4b: the splash bounces off and rolls away</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1220px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0;font-size:13px}td,th{border:1px solid #444;padding:3px 8px;text-align:left}h2{margin-top:28px}
.g{display:grid;grid-template-columns:560px 560px;gap:10px}.c{width:560px}canvas{background:#000;width:560px;height:288px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}button{background:#333;color:#ddd;border:1px solid #666;padding:4px 10px;margin-right:6px;cursor:pointer}button.on{background:#865;color:#fff}.hdr{position:sticky;top:0;background:#111;padding:6px 0;z-index:5}</style>
<h1>G4b: the splash bounces off the chest and rolls away, <code>?falls=v1</code> (now the default)</h1>
<div class="hdr"><button id="n" class="on">normal speed</button><button id="q">quarter speed</button> Left: current (lies on him). Right: revised. 60 fps source. Each cell is labelled with the frame marks (contact, apex, landing, get-up).</div>
<h2 class="miss">Misses first</h2><ul>
<li><b>No facing flip.</b> The plan asked for one. A mirrored flip pops: every apex pose I measured threw a wrist 72-244 px at the flip frame (upright 72-138, tuck 160-244). Instead he pivots up through a near-vertical apex and lands <b>face up</b> (the rig's supine rest is the prone pose turned the other way, head on the opposite side), so the roll needs no mirror. His facing does not change; he lands face up with his head on the other side from where it was in the dive. Derek's call whether that reads as rolling away.</li>
<li>He is still across the receiver after contact: ${Math.min(...rows.map(x => x.i.overlapFrames))}-${Math.max(...rows.map(x => x.i.overlapFrames))} frames still overlap by more than 50 px (the flight's last body lies across him until the bounce carries it away, which the contact frame being unchanged requires); it was ${Math.min(...rows.map(x => x.c.contact.framesMiss50))}-${Math.max(...rows.map(x => x.c.contact.framesMiss50))} before. After the landing the overlap is 0 in all ${rev.length} cells.</li>
<li>The pivot is fast: the largest joint moves up to ${Math.max(...rows.map(x => x.i.maxStep))} px/frame in mid-rise (the limbs sweeping through vertical), smooth up and down, no single-frame jump. The apex pose is one pose; I did not tune it per move.</li>
<li>Both moves use the same staging (the plan's "diving elbow may want the elbow drop's contact pose": not done; it uses the splash like the top dive). Landing is straight up the screen from him at his x (74-94 px of root travel at this camera, receiver standing at y 400); the ropes are drawn art in front of the body at that height, nothing clamps it (the far rope is at y 258, he lands at y 306-326).</li>
<li>Not checked in the matches: the AI rarely throws these, so only these staged cells show it (see falls Stage 4's polish list).</li></ul>
<h2>Numbers (receiver supine, facing right; both rigs; 'before' = current)</h2>
<table><tr><th>move</th><th>who</th><th>frames overlapping &gt;50 px, before</th><th>overlap sum, before</th><th>frames overlapping, now</th><th>overlap sum, now</th><th>overlap after he lands (px)</th><th>max joint step px/frame in the bounce</th><th>root y, contact to landing</th><th>contact to get-up start</th><th>get-up first step / stand step (px)</th></tr>${table}</table>
<p>Today the diver lies across him and the get-up starts 2.0 s (diving elbow) / 3.0 s (top dive) after the call's hit; the splash cuts that to 1.25 s. Damage, shake and the receiver's sell fire once at the same contact frame (unit-tested). The root path is x unchanged, y up the screen along smoothstep with a 28 px gravity arc on top; the whole bounce is 0.46 s.</p>
${groups.map(([m, t]) => `<h2>${t}</h2>` + ['supine', 'prone'].map(l => `<h3 style="color:#999">receiver ${l}</h3><div class="g">` + rows.filter(x => x.r.move === m && x.r.lying === l).concat(rev.filter(r => r.move === m && r.lying === l && r.facing === -1).map(r => ({ r, c: cur.find(x => x.id === r.id), i: info(r) }))).map(({ r, c, i }) => cell('g4b-current', c, info(r), `current: ${r.move}, ${r.attacker} on ${r.victim}, receiver ${r.lying}, attacker facing ${r.facing > 0 ? 'right' : 'left'}`) + cell('g4b', r, i, `revised: same`)).join('') + '</div>').join('')).join('')}
<script>
let rate = 1; const btn = (id, v) => document.getElementById(id).onclick = () => { rate = v; document.getElementById('n').className = v === 1 ? 'on' : ''; document.getElementById('q').className = v === 1 ? '' : 'on'; }; btn('n', 1); btn('q', 0.25);
document.querySelectorAll('canvas').forEach(cv => { const d = cv.dataset, from = +d.from, to = +d.to, ctx = cv.getContext('2d'), n = to - from + 1, ims = [];
  const mark = (i) => i === +d.contact ? 'CONTACT' : i === +d.apex ? 'APEX' : i === +d.land ? 'LANDED' : i === +d.up ? 'GET-UP' : '';
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = '../' + d.dir + '/frames/' + d.id + '/s' + String(from + i).padStart(4, '0') + '.jpg'; ims.push(im); }
  let k = 0, acc = 0, last = performance.now();
  const draw = (now) => { acc += (now - last) * rate / (1000 / 60); last = now; while (acc >= 1) { acc -= 1; k = (k + 1) % (n + 20); }
    const i = Math.min(k, n - 1), im = ims[i]; if (im.complete && im.naturalWidth) { ctx.drawImage(im, 0, 0, 560, 288); ctx.fillStyle = '#fc6'; ctx.font = '14px system-ui'; ctx.fillText(String(from + i) + ' ' + mark(from + i), 8, 18); } requestAnimationFrame(draw); };
  requestAnimationFrame(draw); });
</script>`;
writeFileSync(`${dir}/g4b/index.html`, html);
console.log(`wrote ${dir}/g4b/index.html (${rev.length} cells, current beside revised)`);
