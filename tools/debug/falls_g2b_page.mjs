// PLAN_FALLS T2.5f: the G2b page. Forward catch, knees-first, seated collapse, the sideways spill (concept) and the body slam at r2 / heavy / exceptional, off the rows and audits of
// falls-2026-11/g2b/{r2,heavy,exceptional,spill} (falls_probe.mjs then falls_landing_audit.mjs).   node tools/debug/falls_g2b_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { TIERS } from '../../src/animation/falls.js';

const root = 'research/animation/falls-2026-11';
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
const audit = { r2: read('g2b/r2/audit.json'), heavy: read('g2b/heavy/audit.json'), exceptional: read('g2b/exceptional/audit.json'), spill: read('g2b/spill/audit.json') };
const get = (d, id) => audit[d].find(r => r.id === id);
const rows = (d, id) => read(`g2b/${d}/rows-${id}.json`);
const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));
const sides = ['l', 'r'], victims = ['lou', 'george'];
const hitFrame = (d, id) => rows(d, id).findIndex(r => r.ct != null && r.ct >= 1.0799);
const step = (rs, i, k) => Math.hypot(rs[i].d.pts[k].x - rs[i - 1].d.pts[k].x, rs[i].d.pts[k].y - rs[i - 1].d.pts[k].y) / rs[i].d.s;

// T2.5a (1): is the jump into the slam's landing a pose seam or the impact's own velocity? The flag-off clip's ankle on the same frames is the reference.
const off = JSON.parse(readFileSync(`${root}/before/rows-bodySlam-lou-l.json`, 'utf8')), on = rows('r2', 'bodySlam-lou-l');
const hitOn = hitFrame('r2', 'bodySlam-lou-l'), hitOff = off.findIndex(r => r.ct != null && r.ct >= 1.0799);
const ankle = (rs, h) => [-1, 0, 1, 2, 3].map(k => f1(step(rs, h + k, 'nearAnkle'))).join(' / ');

const slamIds = victims.flatMap(v => sides.map(s => `bodySlam-${v}-${s}`));
const tierRow = (id) => ['r2', 'heavy', 'exceptional'].map(d => get(d, id));
const hopTxt = (id) => tierRow(id).map(a => `${f1(a.rebound.firstHop?.drawnPx)} px (cmd ${a.rebound.firstHop?.commandedPx})`).join(' / ');
const flexMiss = Object.entries(audit).flatMap(([d, list]) => list.filter(r => r.flexMisses.length).map(r => `${d}/${r.id}: ${r.flexMisses.join('; ')}`));
const clampAll = Object.entries(audit).flatMap(([d, list]) => list.filter(r => Object.values(r.clampHits).some(v => v)).map(r => `${d}/${r.id} ${JSON.stringify(r.clampHits)}`));
const beforeAudit = read('g2b/audit-g2a-r2-reaudited.json').filter(r => r.id.startsWith('bodySlam-george'));   // the r2 rows (e36116c) re-read with the fixed audit

const misses = [
    `<b>T2.5a (1), the 17.1 / 24.3 px jump into the slam's landing is the impact's velocity, not a pose seam.</b> The flag-off clip's own near ankle on the same frames (frame before the hit, the hit, then +1, +2, +3, px a frame at s = 1) moves ${ankle(off, hitOff)}; with the landing it moves ${ankle(on, hitOn)}. The landing frame is the third number: ${f1(step(on, hitOn + 1, 'nearAnkle'))} px against the clip's own ${f1(step(off, hitOff + 1, 'nearAnkle'))} px at that frame, so the blend slows the body more than the clip does, it does not add a step. The hop is unchanged (r2: Lou ${f1(get('r2', 'bodySlam-lou-l').rebound.firstHop.drawnPx)}, George ${f1(get('r2', 'bodySlam-george-l').rebound.firstHop.drawnPx)} px drawn). Nothing was changed for it.`,
    `<b>T2.5a (2), George's near knee: the 3.73 was my audit's error, the real fault was a pinned fold, and <code>?falls=v1</code> caused it.</b> The audit chose the bend's side per frame from the torso normal, which flips when the thigh points up; a real 2.55 knee read as -2.55 + 2 pi = 3.73. The audit now fixes the handedness per limb from the rest row. Re-read: on the r2 rows George's knee sat at the 2.55 hard cap for ${beforeAudit[0].clampHits.nearKnee} frames (and Lou's for 6 on the left-facing row) (a pinned fold, <code>limitKnees</code> hiding it). Cause: the sell's knee bend was authored over the missile's straight knee; over the rest pose's drawn-up near knee (flex 1.5) it ran into the cap. Fix: <code>applyOffsetsSoft</code> (falls.js), the added bend saturates toward 2.45 and is plain below 60% of the headroom, for the sell and for the landing, flag on only. Now: George ${get('r2', 'bodySlam-george-l').flexMax.nearKnee} / ${get('r2', 'bodySlam-george-r').flexMax.nearKnee}, Lou ${get('r2', 'bodySlam-lou-l').flexMax.nearKnee} / ${get('r2', 'bodySlam-lou-r').flexMax.nearKnee} rad, clamp hits in the four r2 rows ${get('r2', 'bodySlam-george-l').clampHits.nearKnee + get('r2', 'bodySlam-george-r').clampHits.nearKnee + get('r2', 'bodySlam-lou-l').clampHits.nearKnee + get('r2', 'bodySlam-lou-r').clampHits.nearKnee}. The sell's own knee action over a bent rest knee is now smaller than flag-off's absolute fold (it was never meant to reach the cap); not judged.`,
    `<b>George's sell elbows (polish list, not caused by the flag):</b> flag off, George's slam sell already drove the near elbow to -1.9 and the far to -0.28 (the T0 rows, <code>before/</code>). The sell plan varies from run to run, so this run's rows show: ${flexMiss.length ? flexMiss.join(' | ') : 'no elbow outside the limits on any row'}. Listed in the Progress line.`,
    `<b>Slam tier hop heights, drawn over the blend base (the probe's method, wince excluded), r2 / heavy / exceptional:</b> ${slamIds.map(id => `${id.replace('bodySlam-', '')} ${hopTxt(id)}`).join('; ')}. Targets 11-12 and 14-16 px: Lou is in range (11.5, 14.4); <b>George is over it</b> (14.9, 18.8) because his drawn hop already reads 9.2 against Lou's 7.2 at r2 with the same command. Not tuned per rig.`,
    `<b>Landing length and gameplay:</b> r2 ${get('r2', 'bodySlam-lou-l').landingSec} s, heavy ${get('heavy', 'bodySlam-lou-l').landingSec} s, exceptional ${get('exceptional', 'bodySlam-lou-l').landingSec} s, so neither tier runs the pin/AI block past r2's. Damage, down time and pin rules are untouched; the sell starts ${TIERS.heavy.spent} s (heavy) / ${TIERS.exceptional.spent} s (exceptional) later than r2's (the spent pause) and is planned into what is left of the down time. Camera shake x1.4 / x1.8 on the same hit frame; foley already at its range.`,
    `<b>Seams:</b> first landing frame, px at s = 1, left facing: slam r2 ${slamIds.filter(i => i.endsWith('-l')).map(i => `${i.split('-')[1]} ${get('r2', i).steps.seams[0].px}`).join(' / ')}, heavy ${slamIds.filter(i => i.endsWith('-l')).map(i => get('heavy', i).steps.seams[0].px).join(' / ')}, exceptional ${slamIds.filter(i => i.endsWith('-l')).map(i => get('exceptional', i).steps.seams[0].px).join(' / ')} (impact velocity, as above; the harder compression adds a little); forward ${f1(get('r2', 'forward-lou-l').steps.seams[0].px)}, knees ${f1(get('r2', 'kneesForward-lou-l').steps.seams[0].px)}, seated ${f1(get('r2', 'sitBack-lou-l').steps.seams[0].px)}, spill ${f1(get('spill', 'spill-lou-l').steps.seams[0].px)}. The fall's last frames carry their own speed; T2.6 retimes the falls.`,
    `<b>Support (forearm part box within 3 px of the mat, read off the part, not a painted palm):</b> forward and knees-first: both hands "stayed" from contact (the near elbow bends 0.29 / 0.24 rad under it, the far one 0.04 / 0.19; a planted hand that yields, not a release); seated: ${['lou', 'george'].map(v => `${v} near ${get('r2', `sitBack-${v}-l`).hands.near.class}, far ${get('r2', `sitBack-${v}-l`).hands.far.class}`).join('; ')}; spill: ${['lou', 'george'].map(v => `${v} near ${get('spill', `spill-${v}-l`).hands.near.class}, far ${get('spill', `spill-${v}-l`).hands.far.class}`).join('; ')}. The spill's near arm brace is in the fall's keys (before contact), so the audit, which starts at contact, cannot class it.`,
    `<b>Joint limits (both limits, no tolerance; grain +-0.005 rad):</b> ${flexMiss.length ? flexMiss.join(' | ') : 'none on any row'}; pinned frames (clamp hits): ${clampAll.length ? clampAll.join(', ') : 'none'}. Landing-only flex stays bend-only by construction (tests: 120 samples x 6 kinds x 4 intensities x 3 speeds, and both tiers).`,
    `<b>Not built / carried:</b> no head or wrist channel (no head lag); the wince's hand toward <code>sell.part</code>; the spill is keys only, no move calls it and its pelvis curve is not gravity-timed (T2.6); the falls from standing still ease in rather than accelerate (T2.6); forward falls land with the hands first through the fall's own keys, so "hands 1-2 frames before the chest" is those keys, not the landing's offsets; the audit's first-hop is the supported push for the forward catch (${f1(get('r2', 'forward-lou-l').rebound.firstHop?.drawnPx)} px), not a flight; <b>not claimed:</b> that any of it reads right.`,
];

const row = (d, id) => { const a = get(d, id), hop = a.rebound.firstHop; return `<tr><td>${d}</td><td>${id}</td><td>${a.landingSec} s</td><td>${hop ? `${hop.commandedPx} / ${f1(hop.drawnPx)}` : '-'}</td><td>${a.hands.near.class}</td><td>${a.hands.far.class}</td><td>${a.flexMax.nearKnee}, ${a.flexMax.farKnee}</td><td>${a.flexMin.nearElbow}, ${a.flexMin.farElbow}</td><td>${a.flexMax.nearElbow}, ${a.flexMax.farElbow}</td><td>${a.steps.seams[0].px}</td><td>${a.steps.impactWindow.px}</td><td>${a.steps.afterImpactToRest.px}</td></tr>`; };
const tableIds = [['r2', ['forward', 'kneesForward', 'sitBack']], ['spill', ['spill']], ['r2', ['bodySlam']], ['heavy', ['bodySlam']], ['exceptional', ['bodySlam']]];
const table = tableIds.flatMap(([d, ps]) => ps.flatMap(p => victims.flatMap(v => sides.map(s => row(d, `${p}-${v}-${s}`))))).join('');
const marksOf = (d, id) => { const a = get(d, id); return { hit: id.startsWith('bodySlam') ? hitFrame(d, id) : null, contact: a.contact, apex: a.rebound.firstHop?.peakFrame ?? null, recontact: a.rebound.firstHop?.recontactFrame ?? null }; };
const cell = (d, id, tag) => `<div><canvas data-dir="${d}/frames/${id}" data-n="${rows(d, id).length}" data-marks='${JSON.stringify(marksOf(d, id))}' width="560" height="330"></canvas><div class="cap">${tag}: ${id}</div></div>`;
const section = (title, note, cells) => `<h3>${title}</h3><p class="cap">${note}</p><div class="pairrow">${cells}</div>`;
const four = (d, p, tag) => victims.flatMap(v => sides.map(s => cell(d, `${p}-${v}-${s}`, tag))).join('');
const loops = [
    section('Forward catch (<code>forward</code>)', 'Hands and forearms are down first, they yield as the chest arrives, the near forearm reacts and the far stays planted, a few px of supported push, the heels kick, then the wince.', four('r2', 'forward', 'catch')),
    section('Knees-first (<code>kneesForward</code>)', 'The knees are already on the mat; the chest and face arrive over them, the upper body bounces without the pelvis, both elbows yield out, the lower legs flutter.', four('r2', 'kneesForward', 'knees')),
    section('Seated collapse (<code>sitBack</code>)', 'Hips first, the shoulders rock back and up and down with the pelvis staying, the legs kick, the arms slap out lightly. No full-body hop.', four('r2', 'sitBack', 'seat')),
    section('Sideways spill (concept, <code>?falls=v1&amp;spill=1</code>, no move calls it)', 'Lou, left facing only: the hip takes the mat first with the near leg under it, the far leg kicks out, the near arm braces then gives, the far arm flies up, the torso rolls back onto the shoulders.', cell('spill', 'spill-lou-l', 'spill')),
    ...victims.flatMap(v => sides.map(s => section(`Body slam, ${v} goes down, ${s === 'l' ? 'left' : 'right'} facing: r2 / heavy / exceptional`, 'Same slam, same hit frame; only the landing differs.', ['r2', 'heavy', 'exceptional'].map(d => cell(d, `bodySlam-${v}-${s}`, d)).join('')))),
].join('');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G2b: more falls, bigger slams</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1240px;margin:0 auto;padding:16px}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #333;padding:3px 6px;text-align:right}td:first-child,td:nth-child(2){text-align:left}.pairrow{display:flex;flex-wrap:wrap;gap:8px}canvas{background:#222;display:block;max-width:100%}.cap{font-size:12px;color:#999}.note{background:#222;padding:8px 12px;border-radius:6px}label{margin-right:12px}</style>
<h1>Falls G2b: more fall shapes and bigger slam tiers (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek to pick:</b> which fall shapes you like (forward catch, knees-first, seated collapse, the spill concept), which slam tier is the default (r2 / <code>?slamTier=heavy</code> / <code>exceptional</code>), and where "exceptional" is used. CONTACT (the landing starts), HIT (slam only), APEX and RE-CONTACT are marked. <b>Not claimed:</b> that any of it reads right. Speed: <label><input type="radio" name="sp" value="1" checked> normal</label><label><input type="radio" name="sp" value="0.25"> 0.25x</label></div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Table (px at scale 1; hop = commanded / drawn; elbow and knee flex in rad)</h2>
<table><tr><th>set</th><th>run</th><th>landing length</th><th>first hop / push px</th><th>near hand</th><th>far hand</th><th>knee max (n, f)</th><th>elbow min (n, f)</th><th>elbow max (n, f)</th><th>first-frame step</th><th>max step in impact 0.2 s</th><th>max step after it</th></tr>${table}</table>
<p class="cap">Data: <a href="r2/audit.json">r2</a>, <a href="heavy/audit.json">heavy</a>, <a href="exceptional/audit.json">exceptional</a>, <a href="spill/audit.json">spill</a>.</p>
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
writeFileSync(`${root}/g2b/index.html`, html);
console.log('wrote', `${root}/g2b/index.html`);
