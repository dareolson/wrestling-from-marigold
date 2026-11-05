// PLAN_FALLS T1.4: the G1 page. Before (research/animation/falls-2026-11/before) and after (?falls=v1, falls-2026-11/g1) side by side: misses first, stills of both rest poses,
// the numbers, normal-speed loops (fall, the lie, a sell, the get-up) per rig and facing.   node tools/debug/falls_g1_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'research/animation/falls-2026-11';
const load = (d) => JSON.parse(readFileSync(`${root}/${d}/summary.json`, 'utf8'));
const before = load('before'), after = load('g1');
const sellLou = JSON.parse(readFileSync(`${root}/g1/rest-sell-lou.json`, 'utf8')), sellGeorge = JSON.parse(readFileSync(`${root}/g1/rest-sell-george.json`, 'utf8'));
const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));
const pair = (runs) => (p, v, side) => runs.find(r => r.path === p && r.victim === v && r.id.endsWith('-' + side));
const B = pair(before.runs), A = pair(after.runs);
const paths = ['backward', 'forward', 'bodySlam', 'piledriver'];
const rows = paths.flatMap(p => ['lou', 'george'].map(v => [p, v, B(p, v, 'l'), A(p, v, 'l')])).filter(([, , b, a]) => b && a);

const missed = (list) => list.filter(([, , b, a]) => a.m.armsAtRest.missile);
const riseOver = rows.filter(([, , , a]) => (a.m.steps.intoRise?.firstFrames.px ?? 0) > 2.5);
const riseWorse = rows.filter(([, , b, a]) => (a.m.steps.intoRise?.firstFrames.px ?? 0) > (b.m.steps.intoRise?.firstFrames.px ?? 0) + 0.5);
const restDiffers = rows.map(([p, v, b, a]) => `${p}/${v}: ${f1(b.m.restPelvisPx)} &rarr; ${f1(a.m.restPelvisPx)}`);
const sellWorse = (s) => s.filter(r => r.facing === 1 && r.rest.maxStepPerFrame > r.missile.maxStepPerFrame + 3);

const misses = [
    `<b>The fall's last key and the 0.3 s ground blend now end on the rest pose, but nothing else about the fall changed:</b> no gravity curve, no bounce (Stage 2). Every fall here is the old timing into a new pose.`,
    `<b>Arms at rest, off the torso (near / far, degrees):</b> ${rows.map(([p, v, , a]) => `${p}/${v} ${a.m.armsAtRest.offTorsoDeg.near} / ${a.m.armsAtRest.offTorsoDeg.far}`).join('; ')}. The missile test (under 15&deg;) fails on ${missed(rows).length} of ${rows.length}${missed(rows).length ? `: ${missed(rows).map(([p, v]) => `${p}/${v}`).join(', ')}` : ''}.`,
    `<b>"Arms out 40-60&deg;" is foreshortened in this view.</b> The rig draws a lying man seen from the side with the near side lower on screen; the supine arms are splayed 0.5-0.6 rad off the body in the channels but measure only 13-21&deg; shoulder to wrist on screen (the arm's own bend and the near side's drop eat the rest). I tuned the supine pose until both arms cleared the 15&deg; line, not to 40-60&deg;; getting there needs a different projection of the arm, not a bigger angle. Derek judges whether that reads as "arms on the mat".`,
    `<b>The hand on the mat is still not measured on painted art</b> (see the before page: no hand art, the forearm part carries it; the lying body spans a depth band, not a line). The hand gaps in the table are the forearm box and the wrist joint, for what they are worth.`,
    `<b>Prone has no head turn.</b> The grounded channels have no neck: the head follows the torso, so "head turned or slightly up" is not there. A neck channel (or a head variant from Codex) is the ask.`,
    `<b>Sells over the rest pose:</b> the clutch's wrist still reaches its target at full weight on both rigs (distance unchanged), but the prone knee, back and gut clutches' wrist steps went from 1-3 to 9-14 px/frame on Lou (${sellWorse(sellLou).length} of ${sellLou.filter(r => r.facing === 1).length} Lou clutches over +3 px/frame, ${sellWorse(sellGeorge).length} of ${sellGeorge.filter(r => r.facing === 1).length} George's): the hands start further from where they clutch. Not measured: whether a hand passes through the torso on the way. Rolls are removed under the flag (they pop up to 3.1 rad at the swap because the rest poses are not mirror images; roll is already off by default under getups).`,
    `<b>Get-up first frame from the rest pose:</b> ${riseOver.length} of ${rows.length} runs over 2.5 px/frame (${rows.map(([p, v, b, a]) => `${p}/${v} ${f1(b.m.steps.intoRise?.firstFrames.px)} &rarr; ${f1(a.m.steps.intoRise?.firstFrames.px)}`).join('; ')}); ${riseWorse.length} worse than before. The get-up's other keys were not retuned.`,
    `<b>Pins</b> use the rest pose too (the same draw branch; the pinned man's neck, shoulders and hips are the missile's, and the cover is a pose tween that reads none of his arms). Not filmed.`,
    `<b>Harness noise:</b> falls from standing are identical with the flag off (0.00 px, 20 runs); throw runs differ from run to run with the flag off too (sells are not deterministic in this harness, up to 106 px late in the lie), so a throw's before/after rows are not frame-comparable after the impact.`,
];

const rowHtml = ([p, v, b, a]) => `<tr><td>${p}</td><td>${v}</td><td>${b.m.armsAtRest.offTorsoDeg.near} / ${b.m.armsAtRest.offTorsoDeg.far}</td><td><b>${a.m.armsAtRest.offTorsoDeg.near} / ${a.m.armsAtRest.offTorsoDeg.far}</b></td><td>${f1(b.m.handGapPx.wristAboveMat.rest.near)} / ${f1(b.m.handGapPx.wristAboveMat.rest.far)}</td><td>${f1(a.m.handGapPx.wristAboveMat.rest.near)} / ${f1(a.m.handGapPx.wristAboveMat.rest.far)}</td><td>${f1(b.m.restPelvisPx)} &rarr; ${f1(a.m.restPelvisPx)}</td><td>${b.m.steps.intoDown ? b.m.steps.intoDown.px : '-'} &rarr; ${a.m.steps.intoDown ? a.m.steps.intoDown.px : '-'}</td><td>${f1(b.m.steps.intoRise?.firstFrames.px)} &rarr; ${f1(a.m.steps.intoRise?.firstFrames.px)}</td></tr>`;
const cell = (dir, r, tag) => `<div><canvas data-dir="${dir}/frames/${r.id}" data-n="${r.frames}" width="560" height="330"></canvas><div class="cap">${tag}: ${r.id} (${r.frames} frames)</div></div>`;
const still = (rig, lying, side) => `<div><img src="stills-${rig}/${lying}_${side}_missile.png"><img src="stills-${rig}/${lying}_${side}_rest.png"><div class="cap">${rig}, ${lying}, ${side === 'l' ? 'facing left' : 'facing right'}: missile above, rest below</div></div>`;
const loops = paths.map(p => `<h3>${p}</h3><div class="pairrow">${['lou', 'george'].flatMap(v => ['l', 'r'].map(side => { const b = B(p, v, side), a = A(p, v, side); return b && a ? cell('../before', b, 'before') + cell('.', a, 'after (falls=v1)') : ''; })).join('')}</div>`).join('');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G1: the rest pose</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1240px;margin:0 auto;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:4px 6px;vertical-align:top;font-size:12px}th{background:#222}.note{background:#222;padding:8px 12px;margin:10px 0}.pairrow{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px;margin:8px 0}canvas,img{width:100%;background:#000;display:block}.cap{font-size:11px;color:#aaa}a{color:#8cf}code{background:#222;padding:0 3px}</style>
<h1>Falls G1: lying with the arms on the mat (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek to judge:</b> the two rest poses (stills), then the loops: a fall, the lie, the sell the throws bring, and the get-up, before beside after, Lou and George as the man who goes down, both facings. The pose is my first draft, tuned by eye on stills at 2.4x. <b>Not claimed:</b> that it reads as a man using his arms for support. Questions for you: arms splayed this much? Near knee up (supine) and out to the side (prone) as asked? Anything you want different before Stage 2 builds the landing on it? Opt-in only: <code>?falls=v1</code>; flag off is the old pose.</div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>The rest poses</h2><div class="pairrow">${['lou', 'george'].flatMap(rig => ['supine', 'prone'].flatMap(l => ['l', 'r'].map(side => still(rig, l, side)))).join('')}</div>
<h2>Table (facing left; right matches)</h2>
<table><tr><th>path</th><th>victim</th><th>arms off the torso at rest, before (&deg;, near / far)</th><th>after</th><th>wrist above the mat line before (px, near / far)</th><th>after</th><th>rest pelvis (px)</th><th>step into down (px)</th><th>get-up first frames step (px)</th></tr>${rows.map(rowHtml).join('')}</table>
<p class="cap">Wrist heights are against the wrestler's y, not a contact line (see misses). Rest read with the sell cleared. Sell reach and step numbers: <a href="rest-sell-lou.json">Lou</a>, <a href="rest-sell-george.json">George</a>. Probe data: <a href="summary.json">summary.json</a>.</p>
<h2>Loops (normal speed; before left, after right)</h2>${loops}
<script>
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target._on) start(e.target); }, { rootMargin: '200px' });
function start(c) { c._on = true; const n = +c.dataset.n, ctx = c.getContext('2d'), imgs = [];
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = c.dataset.dir + '/s' + String(i).padStart(4, '0') + '.jpg'; imgs.push(im); }
  let k = 0; setInterval(() => { const im = imgs[k]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, c.width, c.height); k = (k + 1) % n; }, 1000 / 60); }
for (const c of document.querySelectorAll('canvas')) io.observe(c);
</script></html>`;
writeFileSync(`${root}/g1/index.html`, html);
console.log('wrote', `${root}/g1/index.html`, rows.length, 'rows');
