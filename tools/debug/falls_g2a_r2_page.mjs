// PLAN_FALLS T2.4d: the G2a r2 page. dcc4454 (falls-2026-11/g2a) beside the T2.4a-c fix (falls-2026-11/g2a-r2): the backward fall (unchanged, proven) and the body slam, Lou and George as
// the man who goes down, both facings, normal speed and 0.25x loops with the hit, contact, rebound apex and re-contact frames marked, misses first.   node tools/debug/falls_g2a_r2_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11';
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
const A = read('g2a-r2/audit.json'), B = read('g2a/audit-dcc4454.json'), B0 = read('g2a/audit.json');   // B0: dcc4454's own audit (peak-over-minimum hop heights)
const rows = (d, id) => read(`${d}/rows-${id}.json`);
const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));
const get = (list, id) => list.find(r => r.id === id);
const ids = ['backward', 'bodySlam'].flatMap(p => ['lou', 'george'].flatMap(v => ['l', 'r'].map(s => `${p}-${v}-${s}`)));
const left = ids.filter(i => i.endsWith('-l'));
const hipY = (r) => (r.d.y - (r.d.pts.nearHip.y + r.d.pts.farHip.y) / 2) / r.d.s;
const hitFrame = (d, id) => rows(d, id).findIndex(r => r.ct != null && r.ct >= 1.0799);

// the backward fall must be unchanged: same joints as dcc4454 on every frame up to the rest pose (the get-up after it is random)
const same = (id) => { const a = rows('g2a-r2', id), b = rows('g2a', id), end = a.findIndex(r => r.rest); let d = 0; for (let i = 0; i <= end; i++) for (const k of Object.keys(a[i].d.pts)) d = Math.max(d, Math.abs(a[i].d.pts[k].x - b[i].d.pts[k].x), Math.abs(a[i].d.pts[k].y - b[i].d.pts[k].y)); return +d.toFixed(2); };
const backSame = left.filter(i => i.startsWith('backward')).map(i => `${i} ${same(i)} px`).join(', ');

const slam = left.filter(i => i.startsWith('bodySlam'));
const timing = slam.map(id => { const a = get(A, id), b = get(B, id), ra = rows('g2a-r2', id), hf = hitFrame('g2a-r2', id), s = ra[0].d.s; return { id, hit: hf, landing: a.contact, oldLanding: b.contact, hitPelvis: f1(hipY(ra[hf])), restPelvis: a.restPelvisPx, delayMs: Math.round((a.contact - hf) * 1000 / 60), oldDelayMs: Math.round((b.contact - hf) * 1000 / 60) }; });

const misses = [
    `<b>The premise of T2.4a did not reproduce, and I changed the plan's fix.</b> The plan says the slam's pelvis is 37 px up at the <code>impact</code> event and reaches the mat at 1.367 s. The probe rows (both rigs, both facings) show the pelvis already at the mat when impact fires: ${slam.map(i => { const t = timing.find(x => x.id === i); return `${i.split('-')[1]} ${t.hitPelvis} px (rest ${t.restPelvis})`; }).join(', ')}; it falls 235 to 13 px in 5 frames to 1.083 s and then holds flat to 1.367 s while the legs swing. The dcc4454 numbers (44 px, 246 to 45) are the frame before. The pause Derek saw is real but different: the landing started ${timing[0].oldDelayMs} ms after the hit (the old contact marker, 1.367 s). So I did not retime a descent (there is none to retime): the landing now starts ${timing[0].delayMs} ms (1 frame) after the hit, and damage, shake and foley stay on the impact event.`,
    `<b>Why one frame and not the same frame:</b> events fire in the runtime update, before the clip's pose is applied and drawn, and the ground blend starts from the last drawn body. Started inside the impact event the blend began from the frame before the pelvis arrived (49.8 px) and floated him down over 0.3 s (I measured that first). The landing starts on the next frame's tickDown instead, after one draw of the final pose. A frame hitch of more than one frame at that moment would start the blend from an older pose; it still blends, it does not break.`,
    `<b>Hop heights (the amplitude was not retuned):</b> commanded ${[...new Set(slam.map(i => get(A, i).rebound.firstHop.commandedPx))].join('/')} px; drawn over its own baseline (phase-tagged, wince excluded) ${slam.map(i => `${i.split('-')[1]} ${f1(get(A, i).rebound.firstHop.drawnPx)} px`).join(', ')}. dcc4454 read ${slam.map(i => `${i.split('-')[1]} ${f1(get(B0, i).rebound.heightPx)}`).join(' / ')} px by the old peak-over-minimum method, which on the new rows reads about 10.1 / 11.6 px because the blend base is still easing down under the hop; that is the method, not a bigger hop.`,
    `<b>Backward fall unchanged:</b> the largest joint difference from dcc4454 on any frame up to the rest pose is ${backSame} (the get-up after rest is random and is not compared). The backward fall's hop is still ${left.filter(i => i.startsWith('backward')).map(i => `${i.split('-')[1]} ${f1(get(A, i).rebound.firstHop.drawnPx)} px`).join(', ')} drawn (target 6-10; T2.6 retimes the fall).`,
    `<b>Joint limits through contact, blend, settle and the sell, both limits, no tolerance (the rows round joints to 0.01 px, so the audit reads +-0.005 rad of grain):</b> ${A.filter(r => r.flexMisses.length).map(r => `${r.id}: ${r.flexMisses.join('; ')}`).join(' | ') || 'none'}. Every miss left is already outside the limit under the landing's offsets, in the sell frames (George's back sell: near elbow to -1.9 or far elbow to -0.42, near knee folded past the 2.55 cap; I did not check these with the flag off); none is pushed out by the landing. Where the landing's knee bend sat on a sell pose already at the knee cap it pushed it past 2.55; <code>limitKnees</code> now caps the combined pose (frames pinned at a limit: ${A.filter(r => Object.values(r.clampHits).some(v => v)).map(r => `${r.id} ${JSON.stringify(r.clampHits)}`).join(', ') || 'none'}).`,
    `<b>Seam steps are still large at the first landing frame:</b> ${slam.map(i => `${i.split('-')[1]} ${get(A, i).steps.seams[0].px} px`).join(', ')} at s = 1 (dcc4454: ${slam.map(i => `${i.split('-')[1]} ${get(B, i).steps.seams[0]?.px ?? '-'}`).join(' / ')}). The clip is moving 49 px a frame into the hit and the legs come down under the blend, so this is the fall's own velocity, not a pop at a measured seam (the following frames step 5-9 px). Not tuned.`,
    `<b>Support:</b> hands are read off the forearm part's box, not a painted palm. Classes at contact: ${slam.map(i => `${i} near ${get(A, i).hands.near.class}, far ${get(A, i).hands.far.class}`).join('; ')}. Lou's far arm sits above the line the whole time (never supported), so it cannot be a release.`,
    `<b>Not built / carried:</b> no head or wrist channel; the wince's hand moving toward <code>sell.part</code>; George's sell elbow and knee limits (sell, flag-independent); the probe's throws are not deterministic run to run (sell planning), so numbers are one run each, facing left shown.`,
];

const row = (id) => { const a = get(A, id), b = get(B, id), hop = a.rebound.firstHop; return `<tr><td>${id}</td><td>${b.contact}</td><td><b>${a.contact}</b></td><td>${a.landingSec} s</td><td>${hop ? `${hop.commandedPx} / ${f1(hop.drawnPx)}` : '-'}</td><td>${a.rebound.firstHop?.peakFrame ?? '-'}</td><td>${a.rebound.recontactFrames.join(', ') || '-'}</td><td>${a.hands.near.class}</td><td>${a.hands.far.class}</td><td>${a.flexMin.nearKnee}, ${a.flexMin.farKnee}</td><td>${a.flexMin.nearElbow}, ${a.flexMin.farElbow}</td><td>${a.steps.seams.map(q => `${q.label} ${q.px}`).join('; ')}</td><td>${a.steps.impactWindow.px}</td></tr>`; };
const marksOf = (d, id, list) => { const a = get(list, id), hit = id.startsWith('bodySlam') ? hitFrame(d, id) : null; return { hit, contact: a.contact, apex: a.rebound.firstHop?.peakFrame ?? a.rebound.peaks?.[0]?.frame ?? null, recontact: a.rebound.firstHop?.recontactFrame ?? a.rebound.contactFrames?.[1] ?? null }; };
const cell = (d, id, tag, marks) => `<div><canvas data-dir="${d}/frames/${id}" data-n="${rows(d.replace('../', ''), id).length}" data-marks='${JSON.stringify(marks)}' width="560" height="330"></canvas><div class="cap">${tag}: ${id}</div></div>`;
const loops = ['backward', 'bodySlam'].map(p => `<h3>${p}</h3><div class="pairrow">${['lou', 'george'].flatMap(v => ['l', 'r'].map(s => { const id = `${p}-${v}-${s}`; return cell('../g2a', id, 'dcc4454', marksOf('g2a', id, B)) + cell('../g2a-r2', id, 'fix', marksOf('g2a-r2', id, A)); })).join('')}</div>`).join('');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G2a r2: slam landing</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1240px;margin:0 auto;padding:16px}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #333;padding:3px 6px;text-align:right}td:first-child{text-align:left}.pairrow{display:flex;flex-wrap:wrap;gap:8px}canvas{background:#222;display:block;max-width:100%}.cap{font-size:12px;color:#999}.note{background:#222;padding:8px 12px;border-radius:6px}label{margin-right:12px}</style>
<h1>Falls G2a r2: does he react the moment he hits? (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek to judge:</b> the body slam: does he react the moment he hits (before, the landing started ${timing[0].oldDelayMs} ms after the hit; now ${timing[0].delayMs} ms)? The backward fall is unchanged and is here for reference. Left of each pair is dcc4454, right is the fix. HIT, CONTACT (the landing starts), APEX and RE-CONTACT are marked on the loops. <b>Not claimed:</b> that it reads right. Speed: <label><input type="radio" name="sp" value="1" checked> normal</label><label><input type="radio" name="sp" value="0.25"> 0.25x</label></div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Table (px at scale 1; frames are 1/60 s, probe frame numbers)</h2>
<table><tr><th>run</th><th>landing start dcc4454</th><th>landing start now</th><th>landing length (runtime)</th><th>first hop commanded / drawn px</th><th>apex frame</th><th>re-contact frames</th><th>near hand</th><th>far hand</th><th>knee flex min (n, f)</th><th>elbow flex min (n, f)</th><th>seam steps</th><th>max step in impact 0.2 s</th></tr>${ids.map(row).join('')}</table>
<p class="cap">Data: <a href="../g2a-r2/audit.json">audit.json</a>, <a href="audit-dcc4454.json">audit-dcc4454.json</a>. The audit reads phases and the landing's end from the runtime's own record in each row.</p>
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
      const tags = []; if (m.hit != null && k === m.hit) tags.push('HIT'); if (k === m.contact) tags.push('CONTACT'); if (m.apex != null && Math.abs(k - m.apex) <= 1) tags.push('APEX'); if (m.recontact != null && Math.abs(k - m.recontact) <= 1) tags.push('RE-CONTACT'); if (tags.length) ctx.fillText(tags.join(' '), 8, 20); }
    requestAnimationFrame(tick); })(last); }
for (const c of document.querySelectorAll('canvas')) io.observe(c);
</script></html>`;
writeFileSync(`${root}/g2a/r2.html`, html);
console.log('wrote', `${root}/g2a/r2.html`);
