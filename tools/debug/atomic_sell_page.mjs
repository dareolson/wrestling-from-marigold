// G4c-a r7 page (PLAN_GRAPPLES T4c.4q): the atomic drop's receiver arms (T4c.4o) and the tailbone sell, walk away and turn (T4c.4p), both pairs, both facings, normal speed.
// Reads g4c-a7/film.json (grapples_g4c_a5.mjs with WFM_KINDS=drop WFM_TAIL=30), probe-arms.json (+ the T4c.4l baseline beside it), probe-walk.json and probe-walk-rope.json, and
// r6's lift loops (g4c-a6/lift). Writes index.html and strip.html (the quick normal-speed glance, both facings).
//   node tools/debug/atomic_sell_page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { ATOMIC, } from '../../src/animation/waistlockThrows.js';
import { WAISTLOCK } from '../../src/animation/waistlock.js';

const root = 'research/animation/grapples-2026-11/g4c-a7';
const J = (f) => JSON.parse(readFileSync(f.startsWith('research') ? f : `${root}/${f}`, 'utf8'));
const film = J('film.json'), arms = J('probe-arms.json'), armsBase = J('probe-arms-baseline-4l.json'), walk = J('probe-walk.json'), rope = J('probe-walk-rope.json'), r6 = J('research/animation/grapples-2026-11/g4c-a6/lift/film.json');
const run = (id) => film.runs.find(r => r.id === `drop-${id}`), r6run = (id) => r6.runs.find(r => r.id === `drop-${id}`);
const IDS = ['lg-l', 'lg-r', 'gl-l', 'gl-r'], PAIR = { lg: 'Lou on George', gl: 'George on Lou' }, FACE = { l: 'attacker first facing left', r: 'attacker first facing right' };
const lab = (id) => `${PAIR[id.slice(0, 2)]}, ${FACE[id.slice(-1)]}`;
const w = (id) => walk.runs.find(r => r.id === id), a = (id) => arms.runs.find(r => r.id === id), b = (id) => armsBase.runs.find(r => r.id === id), rp = (id) => rope.runs.find(r => r.id === id);
const canvas = (dir, from, to, cap) => `<div><canvas data-dir="${dir}" data-from="${from}" data-to="${to}" width="620" height="360"></canvas><div class="cap">${cap}</div></div>`;
const r7c = (id, cap) => { const r = run(id); return canvas(`frames/drop-${id}`, r.first, r.last, cap ?? `r7: ${lab(id)}`); };
const worstSlide = (id) => w(id).slide.map(s => `${s.leg} ${s.held.x}/${s.held.y}`).join(', ');

const css = `body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1320px;margin:0 auto;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:4px 6px;vertical-align:top;font-size:12px}.note{background:#222;padding:8px 12px;margin:10px 0}.pairrow{display:flex;gap:10px;margin:8px 0}.pairrow>div{flex:1}canvas,img{width:100%;background:#000}.cap{font-size:12px;color:#aaa}a{color:#8cf}`;
const script = `<script>
for (const c of document.querySelectorAll('canvas')) { const dir = c.dataset.dir, a = +c.dataset.from, b = +c.dataset.to, ctx = c.getContext('2d'), imgs = [];
  for (let i = a; i <= b; i++) { const im = new Image(); im.src = dir + '/s' + String(i).padStart(4, '0') + '.jpg'; imgs.push(im); }
  let k = 0; setInterval(() => { const im = imgs[k]; if (im.complete) ctx.drawImage(im, 0, 0, c.width, c.height); k = (k + 1) % imgs.length; }, 1000 / 60); }
</script>`;

// the quick glance first (CLAUDE.md): both facings, normal speed, Lou on George then George on Lou
const strip = `<!doctype html><html lang="en"><meta charset="utf-8"><title>G4c-a r7: loop strip</title><style>${css}</style>
<h1>G4c-a r7: the atomic drop, normal speed, both facings</h1>
<p>A quick glance before the page: the receiver's arms in the lift, the tailbone, four steps away, the turn. <a href="index.html">The full page</a> has the numbers and r6's lift loop beside it.</p>
<div class="pairrow">${r7c('lg-l')}${r7c('lg-r')}</div><div class="pairrow">${r7c('gl-l')}${r7c('gl-r')}</div>${script}</html>`;

const armRows = IDS.filter(i => i.endsWith('-l')).map(id => `<tr><td>${PAIR[id.slice(0, 2)]}</td><td>${a(id).pelvisDiffVsBaseline}</td><td>${a(id).longestSimilarArmFrames} (r6: ${b(id).longestSimilarArmFrames})</td><td>${a(id).maxHandStep.step} (r6: ${b(id).maxHandStep.step})</td><td>${a(id).maxHandStepOverShoulderToImpact.step} (r6: ${b(id).maxHandStepOverShoulderToImpact.step})</td><td>${a(id).farArmInsideOwnTorsoToImpactMaxPx}</td><td>${a(id).armPartsInsideAttackerTorsoMaxPx.toLift ?? a(id).armPartsInsideAttackerTorsoMaxPx.toLiftEnd} / ${b(id).armPartsInsideAttackerTorsoMaxPx.toLiftEnd}</td></tr>`).join('\n');
const walkRows = IDS.filter(i => i.endsWith('-l')).map(id => { const x = w(id), y = rp(id), hp = x.handsAtPain; return `<tr><td>${PAIR[id.slice(0, 2)]}</td><td>${x.gapAtImpact.px} (${x.gapAtImpact.overS})</td><td>${x.gapAtTurn.px} (${x.gapAtTurn.overS})</td><td>${worstSlide(id)}</td><td>${x.flipJointStep} (ordinary ${x.neighbourJointStepMax})</td><td>${x.handOffJointStepMax}</td><td>${hp.near.behind} / ${hp.near.down}; far ${hp.far.behind} / ${hp.far.down}</td><td>${y.noDrop ? 'no drop' : `clamp moved ${y.clampMovedFramesDuringClip} frames; turn at x ${y.defenderX.atTurn}, ring right ${y.ring.right}`}</td></tr>`; }).join('\n');
const ropeR = rope.runs.find(r => r.id === 'lg-l'), ropeG = rope.runs.find(r => r.id === 'lg-r');
const slideWorst = Math.max(...walk.runs.map(r => r.slideHeldMax.x)), slideBy = walk.runs.filter(r => r.slideHeldMax.x > 2).map(r => `${r.id} ${r.slideHeldMax.x}`);

const blocks = IDS.map(id => `<h3>${lab(id)}</h3><div class="pairrow">${r7c(id, `r7, the whole drop through the turn and the hand-off (clip ${ATOMIC.duration} s)`)}${(() => { const r = r6run(id), n = r.last - r.first; const s7 = run(id); return canvas(`../g4c-a6/lift/frames/drop-${id}`, r.first, r.last, `r6 lift (stiff arms), the same first ${n + 1} frames as r7's left loop`) ; })()}</div>`).join('\n');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>G4c-a r7: arms and sell</title><style>${css}</style>
<h1>G4c-a, revision 7: the receiver's arms and the tailbone sell (T4c.4o-T4c.4q)</h1>
<div class="note"><b>For Derek to judge:</b> (1) the arms in the lift: shoulders lead, elbows follow, the two arms on their own times; (2) the sell: pain with the near hand on the backside and the far arm out, four steps away still facing away, then one turn. Lift, drop, impact (${ATOMIC.impact} s) and the one damage event are unchanged. The clip is ${ATOMIC.duration} s now (sell ${ATOMIC.sell} s, was 0.55), the turn at ${ATOMIC.turnAt} s: an implementation choice, change it if the beats feel long. <a href="strip.html">The quick loop strip</a> is the same frames. Not claimed: that any of it reads right; that is yours.</div>
<h2>Misses first</h2><ul>
<li><b>Stance sole slide over 2 px:</b> ${slideBy.length ? slideBy.join('; ') : 'none'} (x, px; the worst of the four planted steps per run). Per step, x/y px: ${walk.runs.filter(r => r.id.endsWith('-l')).map(r => `${r.id}: ${worstSlide(r.id)}`).join('; ')}. The steps are held by plants and the leg keys were tuned by hand on both rigs; one key set does not zero both.</li>
<li><b>The distance is the plan's 1.5 x holdBehind (${WAISTLOCK.holdBehind} px held), and the steps are short:</b> after the pop he is 86 units from the attacker; four steps carry him ${ATOMIC.walkAway} more, about 8-10 per step, to ${walk.runs[0].gapAtTurn.overS} units (${walk.runs[0].gapAtTurn.px} px on screen) at the turn. Shuffles, not strides. If you want a clearer separation, raise <code>ATOMIC.walkAway</code> and each step's reach; that is a number, not a redo.</li>
<li><b>The turn pops ${walk.runs[0].flipJointStep} px (Lou) / ${walk.runs[2].flipJointStep} px (George)</b> at the facing flip, joints, against ${walk.runs[0].neighbourJointStepMax} / ${walk.runs[2].neighbourJointStepMax} px for an ordinary frame next to it (G3b's whip turn is 120 px). Feet together, both arms hanging, torso nearly upright at the flip, but the sprite is mirrored in one frame.</li>
<li><b>The hand on his backside is a grip on his own hip joint, 0.12 of the way down:</b> about ${walk.runs[0].handsAtPain.near.behind} px behind his hips (Lou), ${walk.runs[2].handsAtPain.near.behind} (George), not at the tailbone exactly. The hand leaves it 0.12 s before the turn (a mirrored hand on his backside would land on his front), so the "carry the hurt through the turn" is the existing back recovery after the clip, not the clip itself. Hand-off joint step: ${walk.runs[0].handOffJointStepMax} / ${walk.runs[2].handOffJointStepMax} px.</li>
<li><b>Rope-side:</b> with the pair placed so the receiver walks toward the near rope (his turn at x ${ropeR.defenderX?.atTurn}, ring edge ${ropeR.ring?.right}), Wrestler._clamp moved nobody during the clip (${ropeR.clampMovedFramesDuringClip} frames). The distance is not reduced: the staging fit shifts the pair together (the attacker ends ${Math.abs((ropeR.attackerX?.first ?? 0) - (ropeR.attackerX?.atTurn ?? 0)).toFixed(0)} px from where he started). Nearer than that the rope break ends the hold before the drop starts, so there is no case between.</li>
<li><b>Arms:</b> receiver pelvis path within ${Math.max(...arms.runs.map(r => r.pelvisDiffVsBaseline))} px of T4c.4l up to 0.10 s past the impact; the two arms are within 3 degrees of each other for at most ${Math.max(...arms.runs.map(r => r.longestSimilarArmFrames))} frames over the lift and hitch (r6: ${Math.max(...armsBase.runs.map(r => r.longestSimilarArmFrames))}); far arm inside his own torso 0 px. His hands are in the attacker's torso silhouette up to ${a('lg-l').armPartsInsideAttackerTorsoMaxPx.toLiftEnd} px (Lou) / ${a('gl-l').armPartsInsideAttackerTorsoMaxPx.toLiftEnd} px (George) at the lift's end, the same as r6 (${b('lg-l').armPartsInsideAttackerTorsoMaxPx.toLiftEnd} / ${b('gl-l').armPartsInsideAttackerTorsoMaxPx.toLiftEnd}): not touched. The largest wrist step before the impact is the drop's body fall, not the arm keys (shoulder-relative ${a('lg-l').maxHandStepOverShoulderToImpact.step} / ${a('gl-l').maxHandStepOverShoulderToImpact.step} px is the torso tilting 0.9 rad in 4 frames).</li>
<li><b>Carried, not touched:</b> the receiver's near leg near horizontal and straight at the peak; snapmare release step 32-36 px; snapmare near knee 20-30 px over the mat at impact; D12 overlap (below).</li></ul>
<h2>Table (facing left; right is identical)</h2>
<table><tr><th>pair</th><th>pelvis vs T4c.4l (px, to impact +0.10)</th><th>longest run of near-equal arm angles (frames)</th><th>max wrist step to impact (px/frame)</th><th>... over the shoulder</th><th>far arm in own torso (px)</th><th>hands in attacker's torso at lift end (px, r7 / r6)</th></tr>
${armRows}</table>
<table style="margin-top:10px"><tr><th>pair</th><th>gap at impact, px (units)</th><th>gap at the turn, px (units)</th><th>stance sole slide per step, x/y px</th><th>turn joint step (px)</th><th>hand-off joint step (px)</th><th>hands mid-pain (behind / down of pelvis, units)</th><th>rope-side</th></tr>
${walkRows}</table>
<div class="note">Gates run: focused tests (atomicDrop, carry, waistlock, snapmare, animationClip), knee audit (0 saturated, no new failures), waistlock_throws_assert, waistlock_cleanup (now with the walk and the turn), grapples_flagoff, full suite 1178/1178, build, moves:coverage --check (26 baselined gaps; the atomicDrop fingerprint did not change, so no re-take). Receiver state through the clip: ${[...new Set(walk.runs.flatMap(r => r.receiverStatesInClip))].join(', ')}, so input and the AI cannot act on him before the turn; one 12-point damage drop per run.</div>
<h2>Loops (normal speed): r7 beside r6's lift</h2>
<p class="cap">Left: r7 from 0.36 s to the hand-off (loops every ${(run('lg-l').last - run('lg-l').first + 1) / 60 | 0}+ s). Right: r6's lift loop, the same first frames, for the arms.</p>
${blocks}
${script}</html>`;
writeFileSync(`${root}/strip.html`, strip);
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`, `${root}/strip.html`);
