// PLAN_FALLS T4.8 r2: the G4b r2 page, research/animation/falls-2026-11/g4b-r2/index.html: the tumble (lands face down) beside the roll (lands face up), from falls_g4a_probe.mjs
// results (CONTACT=1) in g4b-tumble and g4b-roll, frames local and gitignored.
//   node tools/debug/falls_g4b_r2_page.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const dir = 'research/animation/falls-2026-11';
const load = (d) => JSON.parse(readFileSync(`${dir}/${d}/results.json`, 'utf8'));
const V = { tumble: load('g4b-tumble'), roll: load('g4b-roll') };
const sum = (a) => a.reduce((n, f) => n + (f.ms ?? 0), 0);
const info = (r) => {
    const sp = r.splash, contact = sp[0].i, apex = sp.reduce((m, f) => (f.lift > m.lift ? f : m), sp[0]).i, land = sp.find(f => f.seg === 'settle').i, up = r.getUp.at, move = sp.filter(f => f.seg !== 'hold' && f.seg !== 'settle');
    return { contact, apex, land, up, from: contact - 6, to: up + 14, overlapFrames: sp.filter(f => f.ms > 50).length, after: Math.max(0, ...sp.filter(f => f.seg === 'settle').map(f => f.ms ?? 0)), maxStep: Math.max(...move.map(f => f.ast)),
        y0: sp[0].root[1], y1: sp.at(-1).root[1], down: up - contact, gu: r.getUp.step, stood: r.getUp.stoodStep, riseMax: Math.max(...r.getUp.steps.map(q => q[0])), turned: new Set(r.getUp.steps.map(q => q[1])).size > 1, lift: Math.max(...sp.map(f => f.lift)) };
};
const ids = V.tumble.map(r => r.id);
const get = (v, id) => { const r = V[v].find(x => x.id === id); return { r, i: info(r) }; };
const cell = (v, id) => { const { r, i } = get(v, id); return `<div class="c"><canvas data-dir="g4b-${v}" data-id="${id}" data-from="${i.from}" data-to="${i.to}" data-contact="${i.contact}" data-apex="${i.apex}" data-land="${i.land}" data-up="${i.up}" width="560" height="288"></canvas><div class="cap"><b>${v}</b>: ${r.move}, ${r.attacker} on ${r.victim}, attacker facing ${r.facing > 0 ? 'right' : 'left'}</div></div>`; };
const rowsT = ids.filter(id => id.endsWith('right')).flatMap(id => ['tumble', 'roll'].map(v => ({ v, id, ...get(v, id) })));
const table = rowsT.map(({ v, r, i }) => `<tr><td>${v}</td><td>${r.move}</td><td>${r.attacker} on ${r.victim}</td><td>${i.overlapFrames}</td><td><b>${i.after}</b></td><td>${i.maxStep}</td><td>${i.lift}</td><td>${i.y0} to ${i.y1}</td><td>${i.down} (${(i.down / 60).toFixed(2)} s)</td><td>${i.gu} / ${i.stood}</td><td>${i.riseMax}${i.turned ? ' (a turn inside the rise)' : ''}</td></tr>`).join('');
const html = `<!doctype html><meta charset="utf-8"><title>G4b r2: tumble and roll</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1220px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0;font-size:13px}td,th{border:1px solid #444;padding:3px 8px;text-align:left}h2{margin-top:28px}
.g{display:grid;grid-template-columns:560px 560px;gap:10px}.c{width:560px}canvas{background:#000;width:560px;height:288px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}button{background:#333;color:#ddd;border:1px solid #666;padding:4px 10px;margin-right:6px;cursor:pointer}button.on{background:#865;color:#fff}.hdr{position:sticky;top:0;background:#111;padding:6px 0;z-index:5}</style>
<h1>G4b r2: he turns over with his head staying on the same side</h1>
<div class="hdr"><button id="n" class="on">normal speed</button><button id="q">quarter speed</button> Left: <b>tumble</b> (a full turn in the air, lands face down, rises from his front). Right: <b>roll</b> (up and back down, lands on his back, rises from his back). Marks: contact, apex, landed, get-up.</div>
<h2 class="miss">Misses first</h2><ul>
<li><b>The roll mirrors his art once, at the apex.</b> The rig's lying-on-back pose has the head on the far side, so the roll's second half is drawn with the facing mirrored and every angle negated: the joints do not move (the pose test checks no angle jumps), but the sprites flip at the apex, and his <code>facing</code> is the mirror of the dive's from then on, so he rises from his back facing the other way. If the art flip shows, the clean fix is a back-lying pose with the head forward (an art request); I have not asked for it.</li>
<li><b>The roll's turn in the rise:</b> he is mirrored when he lands, so the get-up turns him back inside the rise (the existing mid-rise turn, PLAN_GETUPS B2/B4, pivot joint held); its mirror moves the limbs up to ${Math.max(...rowsT.filter(x => x.v === 'roll').map(x => x.i.riseMax))} px at the flip frame. Without it the stand-up snapped him round in one frame (39-60 px).</li>
<li>The tumble spins fast: a quarter turn in about 5 frames, the largest joint up to ${Math.max(...rowsT.filter(x => x.v === 'tumble').map(x => x.i.maxStep))} px/frame; the roll's pivot up to ${Math.max(...rowsT.filter(x => x.v === 'roll').map(x => x.i.maxStep))}. Smooth, no single-frame jump. The tumble goes ${Math.max(...rowsT.map(x => x.i.lift))} px above the mat at the top (the roll 28) so the head and feet clear it while inverted.</li>
<li><b>Halved (Derek, r3): the lift above the mat (roll 28 to 14 px, tumble 44 to 22) and the trip up the screen (he now travels about ${Math.min(...rowsT.map(x => x.i.y0 - x.i.y1))}-${Math.max(...rowsT.map(x => x.i.y0 - x.i.y1))} px, was 74-94).</b> The cost: he lands partly across the receiver. Overlap after landing is ${Math.min(...rowsT.map(x => x.i.after))}-${Math.max(...rowsT.map(x => x.i.after))} px (was 0 at the full trip), and ${Math.min(...rowsT.map(x => x.i.overlapFrames))}-${Math.max(...rowsT.map(x => x.i.overlapFrames))} frames overlap by more than 50 px from contact on. The landing y is the receiver's far edge minus a 34 px gap, scaled by 0.5 (<code>route.scale</code>); something near 0.75 would clear him again if it reads tangled.</li>
<li>The earlier pivot ([g4b](../g4b/index.html): head ends on the opposite side, rises from his back) stays in the code: the top dive still uses it by default, the diving elbow uses the tumble. <code>?splash=tumble</code>, <code>?splash=roll</code> or <code>?splash=pivot</code> forces one on both moves. Which move gets which is Derek's call.</li>
<li>Only these staged cells show it; the AI rarely throws the dives.</li></ul>
<h2>Numbers (receiver supine, facing right, both rigs)</h2>
<table><tr><th>variant</th><th>move</th><th>who</th><th>frames overlapping &gt;50 px</th><th>overlap after landing (px, silhouette area)</th><th>max joint step px/frame</th><th>apex lift px</th><th>root y, contact to landing</th><th>contact to get-up start</th><th>get-up first step / stand step (px)</th><th>largest step during the rise</th></tr>${table}</table>
${[['divingElbow', 'Diving elbow on a downed man'], ['topDive', 'Top dive on a downed man']].map(([m, t]) => `<h2>${t}</h2><div class="g">${ids.filter(id => id.startsWith(m + '-')).map(id => cell('tumble', id) + cell('roll', id)).join('')}</div>`).join('')}
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
mkdirSync(`${dir}/g4b-r2`, { recursive: true });
writeFileSync(`${dir}/g4b-r2/index.html`, html);
console.log(`wrote ${dir}/g4b-r2/index.html`);
