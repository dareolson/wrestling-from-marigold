// PLAN_FALLS T2.4: the G2a page. The backward fall and the body slam, before (flag off, falls-2026-11/before) beside after (?falls=v1, falls-2026-11/g2a), Lou and George as the man
// who goes down, both facings, normal speed and 0.25x loops with the contact, rebound apex and re-contact frames marked, misses first.   node tools/debug/falls_g2a_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11';
const A = JSON.parse(readFileSync(`${root}/g2a/audit.json`, 'utf8')), B = JSON.parse(readFileSync(`${root}/g2a/audit-before.json`, 'utf8'));
const frames = (id, d) => JSON.parse(readFileSync(`${root}/${d.replace('../', '')}/rows-${id}.json`, 'utf8')).length;
const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));
const get = (list, id) => list.find(r => r.id === id);
const ids = ['backward', 'bodySlam'].flatMap(p => ['lou', 'george'].flatMap(v => ['l', 'r'].map(s => `${p}-${v}-${s}`)));
const left = ids.filter(i => i.endsWith('-l'));

const elbowMiss = A.filter(r => r.flexMisses.length);
const misses = [
    `<b>The rebound is below the 6-10 px target on the fall:</b> backward ${left.filter(i => i.startsWith('backward')).map(i => `${i.split('-')[1]} ${f1(get(A, i).rebound.heightPx)} px`).join(', ')}. The hop scales with the pelvis's closing speed, and the backward fall is not gravity-timed yet (T2.6): it closes at ${'about 0.4 of free fall'} so the hop is clamped small. The slam, which comes in fast: ${left.filter(i => i.startsWith('bodySlam')).map(i => `${i.split('-')[1]} ${f1(get(A, i).rebound.heightPx)} px`).join(', ')}.`,
    `<b>The slam's impact event is not the contact.</b> The clip's "impact" fires at 1.083 s with the pelvis still ${f1(44)} px above the mat (it falls 246 to 45 px in 5 frames, then settles 37 px over 0.28 s). I added a "contact" event at 1.367 s (pelvis within 4 px of rest) and start the landing there; damage and shake stay on the impact event. That settle is the slow part the old slam showed; the landing does not hide it, it only follows it.`,
    `<b>Elbows below the ordinary floor (-0.12) in the drawn frames:</b> ${elbowMiss.length ? elbowMiss.map(r => `${r.id}: ${r.flexMisses.join('; ')}`).join(' | ') : 'none'}. These are in the sell (frames flagged S), George's near-hand-under back sell, which is allowed down to -3.0 for the hammerlock fold and exists with the flag off; they are not the landing's (its offsets are bend-only). Not fixed here.`,
    `<b>No head and no wrist channel</b> in the grounded pose, so neither lags or peaks on its own; the head follows the torso. The hand gaps are the forearm part's box, not a painted palm (no hand art), so the 3 px arm-on-mat line (D6) is not measured on art. Near hands read far below the line because the box is the lying body's depth band.`,
    `<b>Support release / replant is read off that box:</b> far hand leaves the mat at the rebound and replants (see table) in some runs and stays up in others (Lou's far arm sits above the line at rest: ${f1(get(A, 'backward-lou-l').hands.far.gapAtRest)} px).`,
    `<b>Rebound peak count is inflated by the wince</b> (small 1 px wiggles after the last contact count as peaks in the audit); read the first peak.`,
    `<b>Intensity is the default 0.6</b> in the probe (no move's sell is set on the backward fall; the slam uses its registry sell). The wince's hand moving toward <code>sell.part</code> is not built: the landing fades to the rest pose and the sell starts from it.`,
    `<b>Harness noise:</b> the probe's throws are not deterministic run to run (sell planning); numbers are one run each, facing left shown, right matches within noise.`,
];

const row = (id) => { const a = get(A, id), b = get(B, id); const sp = a.steps; return `<tr><td>${id}</td><td>${b.rebound.heightPx ? f1(b.rebound.heightPx) : '0'}</td><td><b>${f1(a.rebound.heightPx)}</b></td><td>${a.contact}</td><td>${a.rebound.contactFrames.join(', ')}</td><td>${a.rebound.peaks[0]?.frame ?? '-'}</td><td>${a.hands.near.releaseFrame ?? '-'} / ${a.hands.near.replantFrame ?? '-'}</td><td>${a.hands.far.releaseFrame ?? '-'} / ${a.hands.far.replantFrame ?? '-'}</td><td>${a.flexMin.nearKnee}, ${a.flexMin.farKnee}</td><td>${a.flexMin.nearElbow}, ${a.flexMin.farElbow}</td><td>${sp.fallToLanding?.px ?? '-'}</td><td>${sp.impactWindow.px}</td><td>${sp.afterImpactToRest.px}</td><td>${sp.sellStart?.px ?? '-'}</td></tr>`; };
const cell = (d, id, tag, marks) => `<div><canvas data-dir="${d}/frames/${id}" data-n="${frames(id, d)}" data-marks='${JSON.stringify(marks)}' width="560" height="330"></canvas><div class="cap">${tag}: ${id}</div></div>`;
const marksOf = (id) => { const a = get(A, id); return { contact: a.contact, apex: a.rebound.peaks[0]?.frame ?? null, recontact: a.rebound.contactFrames.slice(1, 2)[0] ?? null }; };
const loops = ['backward', 'bodySlam'].map(p => `<h3>${p}</h3><div class="pairrow">${['lou', 'george'].flatMap(v => ['l', 'r'].map(s => { const id = `${p}-${v}-${s}`; return cell('../before', id, 'before', {}) + cell('../g2a', id, 'after', marksOf(id)); })).join('')}</div>`).join('');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G2a: the landing</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1240px;margin:0 auto;padding:16px}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #333;padding:3px 6px;text-align:right}td:first-child{text-align:left}.pairrow{display:flex;flex-wrap:wrap;gap:8px}canvas{background:#222;display:block;max-width:100%}.cap{font-size:12px;color:#999}.note{background:#222;padding:8px 12px;border-radius:6px}label{margin-right:12px}</style>
<h1>Falls G2a: the landing (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek to judge:</b> rebound size, whether the limbs flail, any wrong bend. Backward fall and body slam only, Lou and George as the man who goes down, both facings; before (left of each pair) beside after. Contact, apex and re-contact frames are marked on the after loops. <b>Not claimed:</b> that it reads right. Speed: <label><input type="radio" name="sp" value="1" checked> normal</label><label><input type="radio" name="sp" value="0.25"> 0.25x</label></div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Table (px at scale 1; frames are 1/60 s, probe frame numbers)</h2>
<table><tr><th>run</th><th>rebound before</th><th>rebound after</th><th>contact</th><th>contacts</th><th>apex</th><th>near hand rel / replant</th><th>far hand rel / replant</th><th>knee flex min (n, f)</th><th>elbow flex min (n, f)</th><th>step into landing</th><th>max step in impact 0.2 s</th><th>max step after (to rest)</th><th>step at sell start</th></tr>${ids.map(row).join('')}</table>
<p class="cap">Data: <a href="audit.json">audit.json</a>, <a href="audit-before.json">audit-before.json</a>. Steps are the largest joint move in one frame; the impact window is expected velocity, the others are seams.</p>
<h2>Loops</h2>${loops}
<script>
let speed = 1;
for (const r of document.querySelectorAll('input[name=sp]')) r.onchange = () => { speed = +r.value; };
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target._on) start(e.target); }, { rootMargin: '200px' });
function start(c) { c._on = true; const n = +c.dataset.n, ctx = c.getContext('2d'), imgs = [], m = JSON.parse(c.dataset.marks || '{}');
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = c.dataset.dir + '/s' + String(i).padStart(4, '0') + '.jpg'; imgs.push(im); }
  let k = 0, acc = 0, last = performance.now();
  (function tick(now) { acc += (now - last) * speed; last = now; while (acc >= 1000 / 60) { acc -= 1000 / 60; k = (k + 1) % n; }
    const im = imgs[k]; if (im.complete && im.naturalWidth) { ctx.drawImage(im, 0, 0, c.width, c.height); ctx.fillStyle = '#ff0'; ctx.font = '14px system-ui';
      const tags = []; if (Math.abs(k - m.contact) <= 1) tags.push('CONTACT'); if (m.apex != null && Math.abs(k - m.apex) <= 1) tags.push('APEX'); if (m.recontact != null && Math.abs(k - m.recontact) <= 1) tags.push('RE-CONTACT'); if (tags.length) ctx.fillText(tags.join(' '), 8, 20); }
    requestAnimationFrame(tick); })(last); }
for (const c of document.querySelectorAll('canvas')) io.observe(c);
</script></html>`;
writeFileSync(`${root}/g2a/index.html`, html);
console.log('wrote', `${root}/g2a/index.html`);
