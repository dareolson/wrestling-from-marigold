// PLAN_FALLS T4.8a r4: the G4b r5 page, research/animation/falls-2026-11/g4b-r5/index.html: pivot, tumble and roll side by side after the T4.8a backward-leg fix, from falls_g4a_probe.mjs
// results (CONTACT=1) in g4b-r4-pivot, g4b-r4-tumble and g4b-r4-roll, plus falls_g4b_r4_numbers.mjs output in NUMBERS, frames local and gitignored.
//   NUMBERS=numbers.json node tools/debug/falls_g4b_r4_page.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const dir = 'research/animation/falls-2026-11';
const load = (d) => JSON.parse(readFileSync(`${dir}/${d}/results.json`, 'utf8'));
const V = { pivot: load('g4b-r4-pivot'), tumble: load('g4b-r4-tumble'), roll: load('g4b-r5-roll') };
const NUM = JSON.parse(readFileSync(process.env.NUMBERS, 'utf8'));
const sum = (a) => a.reduce((n, f) => n + (f.ms ?? 0), 0);
const info = (r) => {
    const sp = r.splash, contact = sp[0].i, apex = sp.reduce((m, f) => (f.lift > m.lift ? f : m), sp[0]).i, land = sp.find(f => f.seg === 'settle').i, up = r.getUp.at, move = sp.filter(f => f.seg !== 'hold' && f.seg !== 'settle');
    return { contact, apex, land, up, from: contact - 6, to: up + 14, overlapFrames: sp.filter(f => f.ms > 50).length, after: Math.max(0, ...sp.filter(f => f.seg === 'settle').map(f => f.ms ?? 0)), maxStep: Math.max(...move.map(f => f.ast)),
        y0: sp[0].root[1], y1: sp.at(-1).root[1], down: up - contact, gu: r.getUp.step, stood: r.getUp.stoodStep, riseMax: Math.max(...r.getUp.steps.map(q => q[0])), turned: new Set(r.getUp.steps.map(q => q[1])).size > 1, lift: Math.max(...sp.map(f => f.lift)) };
};
const ids = V.tumble.map(r => r.id);
const get = (v, id) => { const r = V[v].find(x => x.id === id); return { r, i: info(r) }; };
const cell = (v, id) => { const { r, i } = get(v, id); return `<div class="c"><canvas data-dir="${v === 'roll' ? 'g4b-r5-roll' : 'g4b-r4-' + v}" data-id="${id}" data-from="${i.from}" data-to="${i.to}" data-contact="${i.contact}" data-apex="${i.apex}" data-land="${i.land}" data-up="${i.up}" width="560" height="288"></canvas><div class="cap"><b>${v}</b>: ${r.move}, ${r.attacker} on ${r.victim}, attacker facing ${r.facing > 0 ? 'right' : 'left'}</div></div>`; };
const rowsT = ids.filter(id => id.endsWith('right')).flatMap(id => ['pivot', 'tumble', 'roll'].map(v => ({ v, id, ...get(v, id) })));
const table = rowsT.map(({ v, r, i }) => `<tr><td>${v}</td><td>${r.move}</td><td>${r.attacker} on ${r.victim}</td><td>${i.overlapFrames}</td><td><b>${i.after}</b></td><td>${i.maxStep}</td><td>${i.lift}</td><td>${i.y0} to ${i.y1}</td><td>${i.down} (${(i.down / 60).toFixed(2)} s)</td><td>${i.gu} / ${i.stood}</td><td>${i.riseMax}${i.turned ? ' (a turn inside the rise)' : ''}</td></tr>`).join('');
const html = `<!doctype html><meta charset="utf-8"><title>G4b r5: tumble and roll</title>
<style>body{font:14px/1.4 system-ui;margin:20px auto;max-width:1200px;background:#111;color:#ddd}table{border-collapse:collapse;margin:8px 0;font-size:13px}td,th{border:1px solid #444;padding:3px 8px;text-align:left}h2{margin-top:28px}
.g{display:grid;grid-template-columns:380px 380px 380px;gap:10px}.c{width:380px}canvas{background:#000;width:380px;height:196px}.cap{font-size:12px;color:#aaa}.miss{color:#f90}button{background:#333;color:#ddd;border:1px solid #666;padding:4px 10px;margin-right:6px;cursor:pointer}button.on{background:#865;color:#fff}.hdr{position:sticky;top:0;background:#111;padding:6px 0;z-index:5}</style>
<h1>G4b r5: the roll's legs hang like the pivot's (pivot and tumble unchanged from r4)</h1>
<div class="hdr"><button id="n" class="on">normal speed</button><button id="q">quarter speed</button> Left to right: <b>pivot</b> (head ends on the opposite side, rises from his back), <b>tumble</b> (a full turn in the air, lands face down), <b>roll</b> (up and back down, lands on his back, mirrored at the apex). Marks: contact, apex, landed, get-up.</div>
<h2 class="miss">Misses first</h2><ul>
<li><b>Roll change (Derek: both rigs "dolphin", legs thrown forward like a backbend):</b> the apex legs hang at 0.65/0.8 rad, not 1.0/1.15, and the knee bend spreads over the whole descent (kneeEase 1) instead of folding in the last 4 frames. The apex legs are still straight because the mirror cannot flip a bend; the pivot's tucked thighs with hanging shins are not possible at the flip. Pivot and tumble are the r4 renders.</li>
<li><b>The roll's art still flips once at the apex</b> (the rig's lying-on-back pose has the head on the far side). What changed: the apex is now a straight-limbed pose (knees 0 to 0.15, elbows 0 to 0.15 of flex), so negating it reverses no bend; the drawn joints step ${NUM.roll.mirrorStep} px across the flip (neighbouring frames up to ${NUM.roll.neighbourMax} px). The sprite flip itself is still there; the clean fix would be a back-lying pose with the head forward (an art request I have not made).</li>
<li><b>The roll's get-up still turns inside the rise:</b> largest step during the rise ${Math.max(...rowsT.filter(x => x.v === 'roll').map(x => x.i.riseMax))} px (was 71-96 px at r2; not fixed here, per the plan).</li>
<li>The tumble spins fast: largest joint step up to ${Math.max(...rowsT.filter(x => x.v === 'tumble').map(x => x.i.maxStep))} px/frame (was 49 at r2).</li>
<li><b>Overlap after landing</b> (halved trip): up to ${Math.max(...rowsT.map(x => x.i.after))} px of silhouette area; see the table. Unchanged by this fix.</li>
<li><b>Pivot's supine rest is 0.05 the wrong way</b> (far knee ${NUM.pivot.restKnee.far}, near ${NUM.pivot.restKnee.near}, the shared supine rest pose). Reported, not changed.</li>
<li>Only these staged cells show it; the AI rarely throws the dives. My own read of the knees is in the reply, not here; Derek judges.</li></ul>
<h2>Pose numbers (what the renderer is handed, 241 samples per variant + both sides of the mirror frame + landing)</h2>
<table><tr><th>variant</th><th>samples</th><th>bad samples</th><th>knee flex far (min / max)</th><th>knee flex near</th><th>elbow flex far</th><th>elbow flex near</th><th>grounded-knee clamp fired</th><th>mirror-frame step px</th><th>neighbouring-frame step px</th></tr>${['pivot', 'tumble', 'roll'].map(n => { const q = NUM[n], f = (k) => q.flex[k].join(' / '); return `<tr><td>${n}</td><td>${q.samples}</td><td>${q.bad}</td><td>${f('farKnee')}</td><td>${f('nearKnee')}</td><td>${f('farElbow')}</td><td>${f('nearElbow')}</td><td>${q.clamps}</td><td>${q.mirrorStep ?? 'no mirror'}</td><td>${q.neighbourMax}</td></tr>`; }).join('')}</table>
<h2>Numbers (receiver supine, facing right, both rigs)</h2>
<table><tr><th>variant</th><th>move</th><th>who</th><th>frames overlapping &gt;50 px</th><th>overlap after landing (px, silhouette area)</th><th>max joint step px/frame</th><th>apex lift px</th><th>root y, contact to landing</th><th>contact to get-up start</th><th>get-up first step / stand step (px)</th><th>largest step during the rise</th></tr>${table}</table>
${[['divingElbow', 'Diving elbow on a downed man'], ['topDive', 'Top dive on a downed man']].map(([m, t]) => `<h2>${t}</h2><div class="g">${ids.filter(id => id.startsWith(m + '-')).map(id => cell('pivot', id) + cell('tumble', id) + cell('roll', id)).join('')}</div>`).join('')}
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
mkdirSync(`${dir}/g4b-r5`, { recursive: true });
writeFileSync(`${dir}/g4b-r5/index.html`, html);
console.log(`wrote ${dir}/g4b-r5/index.html`);
