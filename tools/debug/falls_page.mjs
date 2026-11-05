// PLAN_FALLS pages: reads <dir>/summary.json (tools/debug/falls_probe.mjs) and writes <dir>/index.html: misses first, the table, then normal-speed loops.
// Loops start when scrolled into view (about 40 strips of 85-250 frames each); frames live in <dir>/frames/<id>/ (raw film, not committed).
//   node tools/debug/falls_page.mjs <dir> "<title>" ["<intro html>"]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, title = 'Falls', intro = ''] = process.argv.slice(2);
const sum = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));
const runs = sum.runs, left = runs.filter(r => r.facing < 0), right = runs.filter(r => r.facing > 0);
const by = (list, pid, victim) => list.find(r => r.path === pid && r.victim === victim);
const falls = left.filter(r => r.kind === 'fall'), throws = left.filter(r => r.kind === 'throw');
const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));
const label = (r) => `${r.path} / ${r.victim}`;

// right-facing runs against left: the same pose in a mirrored world, so the numbers should match
let maxMirror = 0;
for (const l of left) { const r = by(right, l.path, l.victim); if (!r) continue; for (let i = 0; i < Math.min(l.m.pelvisPath.length, r.m.pelvisPath.length); i++) maxMirror = Math.max(maxMirror, Math.abs(l.m.pelvisPath[i] - r.m.pelvisPath[i])); }

const grav = falls.filter(r => r.m.gravity), gravFail = grav.filter(r => r.m.gravity.decreasingSteps > 1 || !r.m.gravity.fastestFrameIsLast || r.m.gravity.ratio < 0.8 || r.m.gravity.ratio > 1.2);
const missiles = runs.filter(r => r.m.armsAtRest.missile);
const stepsOver = (sel) => left.filter(r => { const s = sel(r.m.steps); return s && s.px > 2.5; });
const bounceFalls = falls.filter(r => r.m.bounce.count > 0), bounceThrows = throws.filter(r => r.m.bounce.count > 0);
const range = (list, f) => `${f1(Math.min(...list.map(f)))}-${f1(Math.max(...list.map(f)))}`;

const misses = [
    `<b>Gravity (D4) fails on ${gravFail.length} of ${grav.length} falls from standing</b> (want: the per-frame drop never decreases with one frame of noise, the fastest frame is the last before contact, fall time within 20% of free fall; g = ${sum.g.value} px/s&sup2; at scale 1, from Lou's standing pelvis ${sum.g.standingPelvisPx} px so a standing man falls free in ${sum.g.freeFallSec} s). The ratio of the fall's time to free fall is ${range(grav, r => r.m.gravity.ratio)} (fall time ${range(grav, r => r.m.gravity.fallSec)} s). Drops that stop decreasing: ${grav.map(r => `${label(r)} ${r.m.gravity.decreasingSteps}`).join(', ')}; fastest frame is the last before contact in ${grav.filter(r => r.m.gravity.fastestFrameIsLast).length} of ${grav.length}.`,
    `<b>The missile pose is every rest:</b> in ${missiles.length} of ${runs.length} runs an arm lies within 15&deg; of the torso's line at rest (angle of shoulder to wrist off the torso, near / far: ${range(runs, r => Math.min(r.m.armsAtRest.offTorsoDeg.near, r.m.armsAtRest.offTorsoDeg.far))}&deg; for the smaller arm). The rest frame is read with the sell cleared (<code>_sell</code> null) so it is the bare lying pose.`,
    `<b>No bounce on any fall from standing:</b> ${falls.length - bounceFalls.length} of ${falls.length} falls show no pelvis rise after contact (the state goes <code>down</code> at once). The throws that do rise (${bounceThrows.length} of ${throws.length}) do it inside their own clips (${range(bounceThrows, r => r.m.bounce.peakPx)} px) or in the 0.3 s ground blend, not from a landing layer.`,
    `<b>The hand to the mat is not measured on the painted hand.</b> These rigs have no separate hand art (the forearm part carries it), so the table gives the lowest drawn corner of the forearm part and the wrist joint, both against the wrestler's y. The lying body's depth band spans about -26 to +30 px around that line (the near side is lower on screen), so "within 3 px of the mat" needs a defined contact line first: a question for G1, listed here as a miss in the measure, not a pass.`,
    `<b>Hand-offs over the gait's 2.5 px/frame:</b> into <code>down</code>, ${stepsOver(s => s.intoDown).length} of ${left.length} runs (worst ${f1(Math.max(...left.map(r => r.m.steps.intoDown?.px ?? 0)))} px, ${left.map(r => r.m.steps.intoDown).sort((a, b) => (b?.px ?? 0) - (a?.px ?? 0))[0]?.joint}); the 0.3 s ground blend's worst frame, ${f1(Math.max(...left.map(r => r.m.steps.blend?.px ?? 0)))} px; into the get-up's first frame, ${stepsOver(s => s.intoRise).length} of ${left.length} runs over (worst ${f1(Math.max(...left.map(r => r.m.steps.intoRise?.px ?? 0)))} px); the frame-to-frame step inside a fall is far larger (${f1(Math.max(...falls.map(r => r.m.steps.wholeFall.px)))} px, authored motion, not a hand-off).`,
    `<b>Contact is a threshold, not an event:</b> the contact frame is the first frame the pelvis is within ${4} px of its rest height. Throws touch inside their clip (their impact event is a marker, not read here), so a throw's "fall time" is the clip up to that threshold, not a free fall; D4 is judged on falls from standing only.`,
    `<b>Not measured here:</b> pins (the cover reads the lying man's chest, unchanged by the rest pose; checked at T1.2), sells over the rest pose (T1.3), the old rigs. Left-facing and right-facing runs match: the largest pelvis-height difference between them over all paths is ${maxMirror.toFixed(2)} px.`,
];

const row = (r) => {
    const m = r.m, g = m.gravity;
    return `<tr><td>${r.path}</td><td>${r.victim}</td><td>${m.start}&rarr;${m.contact} (${m.fallSec} s)</td><td>${g ? `${g.ratio} / ${g.decreasingSteps} / ${g.fastestFrameIsLast ? 'yes' : 'no'}` : '-'}</td><td>${f1(m.restPelvisPx)}</td><td>${m.bounce.count} / ${m.bounce.peakPx}</td><td>${m.armsAtRest.offTorsoDeg.near} / ${m.armsAtRest.offTorsoDeg.far}</td><td>${f1(m.handGapPx.rest.near)} / ${f1(m.handGapPx.rest.far)}; wrist ${f1(m.handGapPx.wristAboveMat.rest.near)} / ${f1(m.handGapPx.wristAboveMat.rest.far)}</td><td>${m.steps.intoDown ? m.steps.intoDown.px : '-'} / ${m.steps.blend ? m.steps.blend.px : '-'}</td><td>${m.steps.intoRise ? m.steps.intoRise.firstFrames.px : '-'}</td></tr>`;
};
const cell = (r) => `<div><canvas data-dir="frames/${r.id}" data-n="${r.frames}" width="560" height="330"></canvas><div class="cap">${r.id}: ${r.victim} goes down, ${r.attacker}'s facing ${r.facing < 0 ? 'left' : 'right'}; ${r.frames} frames, down at ${r.m.start}&ndash;${r.m.contact}, rest at ${r.m.rest}, then the rise</div></div>`;
const section = (pid) => `<h3>${pid}</h3><div class="pairrow">${['lou', 'george'].flatMap(v => ['l', 'r'].map(side => runs.find(r => r.path === pid && r.victim === v && r.id.endsWith('-' + side)))).filter(Boolean).map(cell).join('')}</div>`;
const order = ['backward', 'sitBack', 'forward', 'kneesForward', 'flip', 'bodySlam', 'hipToss', 'snapmare', 'suplex', 'piledriver'].filter(p => runs.some(r => r.path === p));

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1240px;margin:0 auto;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:4px 6px;vertical-align:top;font-size:12px}th{background:#222}.note{background:#222;padding:8px 12px;margin:10px 0}.pairrow{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;margin:8px 0}canvas{width:100%;background:#000}.cap{font-size:11px;color:#aaa}a{color:#8cf}code{background:#222;padding:0 3px}</style>
<h1>${title}</h1>
<div class="note">${intro}<b>For Derek to judge:</b> the loops. <b>Not claimed:</b> that any of it looks right. The numbers are in game px at the victim's scale (Lou on George and George on Lou, both facings, 1/60 s steps, <code>${sum.flags || 'flag off'}</code>).</div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Table (facing left; right matches)</h2>
<table><tr><th>path</th><th>victim</th><th>fall start&rarr;contact (frames)</th><th>fall time / free fall; drops that shrink; fastest last</th><th>rest pelvis (px)</th><th>bounces / peak (px)</th><th>arms at rest off the torso, near / far (&deg;)</th><th>hand gap at rest, near / far (forearm box; wrist)</th><th>step into down / worst in blend (px)</th><th>get-up first-frames step (px)</th></tr>
${order.flatMap(p => ['lou', 'george'].map(v => by(left, p, v)).filter(Boolean)).map(row).join('')}</table>
<h2>Loops (normal speed)</h2>${order.map(section).join('')}
<script>
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target._on) start(e.target); }, { rootMargin: '200px' });
function start(c) { c._on = true; const n = +c.dataset.n, ctx = c.getContext('2d'), imgs = [];
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = c.dataset.dir + '/s' + String(i).padStart(4, '0') + '.jpg'; imgs.push(im); }
  let k = 0; setInterval(() => { const im = imgs[k]; if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, c.width, c.height); k = (k + 1) % n; }, 1000 / 60); }
for (const c of document.querySelectorAll('canvas')) io.observe(c);
</script></html>`;
writeFileSync(join(dir, 'index.html'), html);
console.log(`wrote ${join(dir, 'index.html')}: ${runs.length} runs, ${misses.length} misses`);
