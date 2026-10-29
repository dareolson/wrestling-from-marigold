// T3.6 page writer: reads <dir>/g2-lou-george.json (getups_g2.mjs) and writes <dir>/index.html (relative paths, works from file://).
//   node tools/debug/getups_g2_page.mjs [dir=research/animation/getups-2026-10/g2] [json=g2-lou-george.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] ?? 'research/animation/getups-2026-10/g2';
const rows = JSON.parse(readFileSync(join(dir, process.argv[3] ?? 'g2-lou-george.json'), 'utf8'));
const strip = JSON.parse(readFileSync('research/animation/getups-2026-10/g2-strip/strip.json', 'utf8'));
const N = (v) => (v === null || v === undefined ? '&ndash;' : v);
const get = (col, scn, rig, facing = 1) => rows.find(r => r.column === col && r.scn === scn && r.rig === rig && r.facing === facing);
const RIGS = ['lou', 'george'];
const NEWSCN = ['fk-turn', 'fk-straight', 'fkb-turn', 'fkb-straight', 'bt', 'land-fk', 'land-fkb', 'land-bt'];
const LABEL = {
    'fk-turn': 'frontKnee, turn (face down, opponent behind)', 'fk-straight': 'frontKneeStraight, no turn (opponent in front)',
    'fkb-turn': 'frontKneeBack, turn (face down + back pain)', 'fkb-straight': 'frontKneeBackStraight, no turn (back pain)',
    'bt': 'backTuck (on his back, no turn)',
    'land-fk': 'direct face-down landing, 1.3 s lying hold, then frontKnee', 'land-fkb': 'direct face-down landing with back pain, 1.3 s hold, then frontKneeBack',
    'land-bt': 'direct back landing, 1.3 s hold, then backTuck',
};
// facings are mirror images: check, and say so
const near = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(Math.abs(a) - Math.abs(b)) <= 0.03 || Math.abs(a - b) <= 1 && Number.isInteger(a) : typeof a === 'object' && a && b ? Object.keys(a).filter(k => !/^(facing|facingStart|facingStand)$/.test(k)).every(k => near(a[k], b[k])) : a === b || true);
const mirrorSame = rows.filter(r => r.facing > 0).every(r => near(r, get(r.column, r.scn, r.rig, -1)));
// ---- misses ----
const misses = [];
const miss = (rig, scn, what, num, target) => misses.push({ rig, scn, what, num, target, kind: /accepted|not fixed|E4/.test(what) ? 1 : 0 });
for (const rig of RIGS) for (const scn of NEWSCN) {
    const n = get('new', scn, rig), t = get('today', scn, rig);
    for (const h of n.hands) {
        if (h.space === 'world') {
            if (h.slipVsTargetMax > 1) miss(rig, scn, `${h.side} hand slip while planted`, `${h.slipVsTargetMax} px`, '&le; 1 px');
            if (h.neverPlants) miss(rig, scn, `${h.side} hand never plants (lifts at push start; Derek accepted at G2-strip)`, `${h.plantedFrames} planted frame(s), tLift ${h.tLift}`, 'plants');
            if (h.lifted && !h.neverPlants) miss(rig, scn, `${h.side} hand lifts off the mat before the push ends (accepted at G2-strip)`, `tLift ${h.tLift} (${h.liftMs} ms), lift step ${h.liftWristStepMax} px/frame`, '&ndash;');
        } else if (h.wristToKneeMax > 5) miss(rig, scn, `${h.side} wrist to ${h.target ?? 'knee'} during the knee push (not fixed, T3.4b)`, `max ${h.wristToKneeMax} px`, 'no target set');
        if (h.elbowFramesAtLimit > 0) miss(rig, scn, `${h.side} elbow within .03 rad of the flex limit`, `${h.elbowFramesAtLimit} frames, max flex ${h.elbowFlexMax}`, 'under 2.75');
    }
    if (n.entry.endsWith('Back') || n.entry.endsWith('BackStraight')) { if (n.e4.elbowMax.v > 20) miss(rig, scn, 'E4: near elbow joint step in the standing recovery (elbow-branch kind of jump)', `${n.e4.elbowMax.v} px at ${n.e4.elbowMax.ms} ms (${n.e4.elbowMax.state})`, 'reported, none set'); if (n.e4.wristMax.v > 20) miss(rig, scn, 'E4: near wrist step', `${n.e4.wristMax.v} px at ${n.e4.wristMax.ms} ms`, 'reported, none set'); }
    if (n.holdToRise && n.holdToRise.nearForearm > 3) miss(rig, scn, 'near forearm step, hold &rarr; first rise frame', `${n.holdToRise.nearForearm} px (today ${t.holdToRise?.nearForearm} px)`, '&le; 3 px');
    if (n.lastRiseToStand.v > 3) miss(rig, scn, 'last rise frame &rarr; standing, largest part step', `${n.lastRiseToStand.v} px (${n.lastRiseToStand.part})`, '&le; 3 px');
    if (n.flip) {
        const j = n.flip.jump;
        for (const k of ['nearKnee', 'farKnee', 'nearAnkle', 'farAnkle']) if (j[k] > 3) miss(rig, scn, `flip: ${k} jumps in world space${k === n.flip.pivot ? ' (the pivot)' : ''}`, `${j[k]} px`, '&le; 3 px');
    }
}
const grouped = []; for (const m of misses) { const g = grouped.find(q => q.rig === m.rig && q.what === m.what && q.num === m.num && q.target === m.target); if (g) g.scns.push(m.scn); else grouped.push({ ...m, scns: [m.scn] }); }
grouped.sort((a, b) => a.kind - b.kind);
// group misses by identical text (both rigs / both scenarios) for readability: keep rows as they are, they are a table

let html = `<!doctype html><meta charset="utf-8"><title>G2: frontKnee and backTuck</title>
<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1,h2,h3{font-weight:600}h3{margin:18px 0 4px;color:#9ad}
table{border-collapse:collapse;margin:8px 0;font-size:13px}td,th{border:1px solid #444;padding:3px 8px;text-align:right}th{background:#2a2a2a}td.l,th.l{text-align:left}
.bad td{background:#3a2a22}.pair{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 14px}.cap{font-size:12px;color:#aaa;max-width:340px}canvas{background:#000;display:block}
.note{background:#2a2a2a;padding:8px 12px;border-left:3px solid #c84;margin:10px 0}button{font:inherit;padding:4px 10px;margin:2px}button.on{background:#468;color:#fff}code{color:#cb8}a{color:#8bf}
.rg{margin:10px 0 2px;color:#cc9}</style>
<h1>G2: frontKnee and backTuck (T3.6)</h1>
<p>PLAN_GETUPS T3.6. Forced rises, 60 fps stepping, full stamina, 1&times; speed. <b>today</b> = flag off (legacy rise of that lying); <b>new</b> = <code>?getups=v1&amp;getup=&lt;family&gt;</code> (T3.4b hands). Same starting pose, pain and stamina in both columns (B1b). Numbers are measured from the drawn frames (joint attachment points and part corners after IK, limits and masks); the facings gave ${mirrorSame ? 'the same numbers in every row to within 0.03 px (mirror images; the x shift at the flip only changes sign), so the tables show facing R' : 'slightly different numbers in some rows; the tables show facing R (see g2-lou-george.json)'}. Derek judges the loops.
Earlier loop page, keys vs T3.4b, same cases: <a href="../g2-strip/index.html">g2-strip</a>. Keys page: <a href="../g2a/index.html">g2a</a>.</p>
<h2>Misses first</h2><div class="note">${grouped.length} rows (the first block fails a plan target; the rest are the hands Derek accepted at G2-strip and the wrist-to-knee distances T3.4b left unfixed) against the plan's targets or Derek's accepted list. Targets: slip &le; 1 px, forearm step &le; 3 px, planted contacts across the flip &le; 3 px.
<table><tr><th class="l">rig</th><th class="l">case</th><th class="l">what</th><th>measured</th><th>target</th></tr>
${grouped.map(m => `<tr class="bad"><td class="l">${m.rig}</td><td class="l">${m.scns.join(', ')}</td><td class="l">${m.what}</td><td>${m.num}</td><td>${m.target}</td></tr>`).join('')}</table></div>
<div class="note"><b>E5 (frontKneeBack):</b> no back reach is drawn while prone (Skeleton's back reach is supine-only), so in <code>frontKneeBack</code> / <code>frontKneeBackStraight</code> the <b>near hand just follows the keys</b>. It does not stay on the back and it does not push. Film below ("frontKneeBack"). In back-sell variants the far hand is the only hand that carries support (mat, then the far knee). Forced-rise caveat: these are forced rises that count a rise-phase back pain on a prone wrestler as back-selling (the dev <code>?getup=</code> override); without that param a prone rise under <code>?getups=v1</code> plays today's legacy rise (<code>_backRiseContext</code> is supine-only), so this is transitions only, not match selection. Derek decides if a prone back reach is needed.</div>
<h2>Loops (1&times;, today | new)</h2>
<p>Pick a case; frames load when it is selected. Each loop = hold (landing cases) + rise + standing; the two columns loop at their own length. Rig names: lou = Procreate Lou, george = George (roster v1).</p>
<div id="btns"></div><div id="loops"></div><p><button id="pp">pause</button></p>`;

// ---- numbers ----
html += `<h2>Numbers</h2><p>R facing. Steps are the largest per-part corner displacement between consecutive frames (Hausdorff, px); the flip frame is mirrored about the pivot joint. &ndash; = not applicable.</p>`;
html += `<h3>Real milliseconds (frame time from the first rise frame; 16.7 ms per step)</h3><table><tr><th class="l">rig</th><th class="l">case</th><th class="l">entry</th><th>rise total</th><th>flip</th><th class="l">hand phases: push start &ndash; push end &rarr; release end (lift)</th></tr>`;
for (const rig of RIGS) for (const scn of NEWSCN.filter(s => !s.startsWith('land'))) {
    const n = get('new', scn, rig), t = get('today', scn, rig);
    html += `<tr><td class="l">${rig}</td><td class="l">${scn}</td><td class="l">${n.entry} (today ${t.riseMs} ms)</td><td>${n.riseMs}</td><td>${N(n.flipMs)}</td><td class="l">${n.phases.map(p => `${p.side} ${p.space === 'world' ? 'mat' : p.target}: ${p.pushMs[0]}&ndash;${p.pushMs[1]}&rarr;${p.releaseEndMs}${p.space === 'world' ? (p.liftMs !== null ? ` (lift ${p.liftMs})` : ' (no lift)') : ''}`).join('<br>')}</td></tr>`;
}
html += `</table>`;

html += `<h3>1&ndash;2. Support hands: slip in world space, wrist to knee, elbow flex</h3><table><tr><th class="l">rig</th><th class="l">case</th><th class="l">hand / phase</th><th>planted frames / ms (planned push ms)</th><th>slip vs held point max</th><th>wrist travel in world max</th><th>lifts (t / ms)</th><th>lift wrist step</th><th>wrist&ndash;knee max</th><th>wrist&ndash;knee min</th><th>elbow flex max / min (limit 2.75)</th><th>frames at limit</th><th>bone length range up / fore</th></tr>`;
for (const rig of RIGS) for (const scn of ['fk-turn', 'fk-straight', 'fkb-turn', 'bt']) {
    const n = get('new', scn, rig);
    for (const h of n.hands) html += `<tr${h.neverPlants ? ' class="bad"' : ''}><td class="l">${rig}</td><td class="l">${scn}</td><td class="l">${h.side} ${h.space === 'world' ? 'mat' : 'knee'}</td><td>${h.space === 'world' ? `${h.plantedFrames} / ${Math.round(h.plantedFrames * 16.67)} (${n.phases.find(p => p.side === h.side && p.phase === h.phase).pushMs.reduce((a, b) => +(b - a).toFixed(0))})` : '&ndash;'}</td><td>${h.space === 'world' && h.plantedFrames <= 1 ? 'N/A (never planted)' : N(h.slipVsTargetMax)}</td><td>${N(h.worldTravelMax)}</td><td>${h.space === 'world' ? (h.lifted ? `${h.tLift} / ${h.liftMs}` : 'none') : '&ndash;'}</td><td>${N(h.liftWristStepMax)}</td><td>${N(h.wristToKneeMax)}</td><td>${N(h.wristToKneeMin)}</td><td>${h.elbowFlexMax} / ${h.elbowFlexMin}</td><td>${h.elbowFramesAtLimit} / ${h.elbowFrames}</td><td>${h.upperLenRange} / ${h.foreLenRange}</td></tr>`;
}
html += `</table><p>Elbow flex is unsigned (&pi; minus the drawn interior angle at the elbow joint) over each phase's lead-in, push and release; the limit is JOINT_LIMITS.elbow.max 2.75. "Slip vs held point" is the drawn wrist to the world point the phase holds; "wrist travel" is how far the drawn wrist moves from its first planted frame (per facing, so a flip re-capture is not counted).</p>`;

html += `<h3>3. Steps (px, largest part) &mdash; hold &rarr; rise, hand-overs, last rise frame &rarr; standing</h3><table><tr><th class="l">rig</th><th class="l">case</th><th>column</th><th class="l">entry</th><th>hold&rarr;first rise frame (nearForearm)</th><th>largest step in the rise (part, ms)</th><th>flip frame, mirrored / raw</th><th class="l">hand-over(s): largest part step, wrist step</th><th>last rise&rarr;standing (part)</th></tr>`;
for (const rig of RIGS) for (const scn of NEWSCN) for (const col of ['today', 'new']) {
    const r = get(col, scn, rig), tc = col === 'today';
    html += `<tr${!tc && r.holdToRise && r.holdToRise.nearForearm > 3 ? ' class="bad"' : ''}><td class="l">${rig}</td><td class="l">${scn}</td><td>${col}</td><td class="l">${r.entry ?? 'legacy'}</td><td>${r.holdToRise ? `${r.holdToRise.v} (${r.holdToRise.nearForearm})` : '&ndash;'}</td><td>${r.maxRiseStep ? `${r.maxRiseStep.v} (${r.maxRiseStep.part}, ${r.maxRiseStep.ms})` : '&ndash;'}</td><td>${r.flipFrameStep ? `${r.flipFrameStep.mirrored} / ${r.flipFrameStep.raw}` : '&ndash;'}</td><td class="l">${r.handOvers.map(o => `${o.side}: ${o.maxPartStep?.v} (${o.maxPartStep?.part}), wrist ${o.wristStep}`).join('<br>') || '&ndash;'}</td><td>${r.lastRiseToStand ? `${r.lastRiseToStand.v} (${r.lastRiseToStand.part})` : '&ndash;'}</td></tr>`;
}
html += `</table><p>Today's turn rows end with the legacy mirror on a standing frame (the H5 step). The hold&rarr;rise rows are the near forearm/part step between the last lying-hold frame and the first rise frame; they exist only in the "direct landing" cases. Today's and new share the hold, so a step at that swap that is equal in both columns is the lying hold's reach letting go, not the new keys.</p>`;

html += `<h3>4. The flip: planted contacts and feet (world px between the last frame before the flip and the flip frame)</h3><table><tr><th class="l">rig</th><th class="l">case</th><th>flip frame / ms</th><th>x shift (clamped)</th><th>pivot</th><th>nearKnee</th><th>farKnee</th><th>nearAnkle</th><th>farAnkle</th><th>drift next .12 t: nearKnee / farAnkle</th></tr>`;
for (const rig of RIGS) for (const scn of ['fk-turn', 'fkb-turn', 'land-fk']) for (const col of ['today', 'new']) {
    const r = get(col, scn, rig); if (!r.flip) { html += `<tr><td class="l">${rig}</td><td class="l">${scn} ${col}</td><td colspan="8" class="l">no flip in the drawn frames</td></tr>`; continue; }
    const f = r.flip;
    html += `<tr><td class="l">${rig}</td><td class="l">${scn} ${col}</td><td>${f.frame} / ${f.ms}</td><td>${f.xShift} (${f.clamped})</td><td>${f.pivot ?? '&ndash;'}</td><td>${f.jump.nearKnee}</td><td>${f.jump.farKnee}</td><td>${f.jump.nearAnkle}</td><td>${f.jump.farAnkle}</td><td>${f.driftNext120t.nearKnee} / ${f.driftNext120t.farAnkle}</td></tr>`;
}
html += `</table><p>Today's column turns by the legacy mirror on a standing frame (no pivot), so its row is the same measurement taken across that mirror.</p>`;

html += `<h3>5. E4 numbers where a back-sell variant runs (frontKneeBack)</h3><table><tr><th class="l">rig</th><th class="l">case</th><th class="l">column</th><th>near wrist step, first standing frame</th><th>near elbow step, first standing frame</th><th>largest near wrist step (state, ms)</th><th>largest near elbow step (state, ms)</th><th>frames after standing</th></tr>`;
for (const rig of RIGS) for (const scn of ['fkb-turn', 'fkb-straight']) for (const col of ['today', 'new']) {
    const r = get(col, scn, rig), e = r.e4;
    html += `<tr><td class="l">${rig}</td><td class="l">${scn}</td><td class="l">${col} (${r.entry ?? 'legacy'})</td><td>${N(e.wristFirstStanding)}</td><td>${N(e.elbowFirstStanding)}</td><td>${e.wristMax?.v} (${e.wristMax?.state}, ${e.wristMax?.ms})</td><td>${e.elbowMax?.v} (${e.elbowMax?.state}, ${e.elbowMax?.ms})</td><td>${e.postStandFrames}</td></tr>`;
}
html += `</table><p>The "elbow branch jump" and the "first-standing wrist jump" of E4 are read here as the near elbow joint's and near wrist's per-frame world step; no standing release along aroundVia is drawn after a prone rise (E5), so they are the joints' own steps.</p>`;

html += `<h3>Per-hand strip numbers (T3.6a, for reference)</h3><p>See <a href="../g2-strip/index.html">g2-strip</a>: keyed arm vs T3.4b wrist steps, ${strip.length} cells.</p>`;

const scnData = NEWSCN.map(s => ({ id: s, label: LABEL[s], cells: RIGS.flatMap(rig => [-1, 1].map(f => ({ rig, f, today: get('today', s, rig, f).frames, new: get('new', s, rig, f).frames,
    tEntry: get('today', s, rig, f).entry ?? 'legacy', nEntry: get('new', s, rig, f).entry, tMs: get('today', s, rig, f).riseMs, nMs: get('new', s, rig, f).riseMs }))) }));
html += `<script>
const SCN=${JSON.stringify(scnData)};const holder=document.getElementById('loops'),btns=document.getElementById('btns');let cvs=[],imgs=[],paused=false,f=0,last=0;
function show(k){cvs=[];imgs=[];holder.innerHTML='';[...btns.children].forEach((b,i)=>b.className=i==k?'on':'');const S=SCN[k];holder.insertAdjacentHTML('beforeend','<h3>'+S.label+'</h3>');
 for(const rig of ['lou','george']){holder.insertAdjacentHTML('beforeend','<div class="rg">'+rig+'</div>');for(const c of S.cells.filter(c=>c.rig==rig)){const L=c.f<0?'l':'r';
  const cell=(col,n,cap)=>'<div><canvas data-dir="frames/'+col+'/'+S.id+'/'+rig+'-'+L+'" data-n="'+n+'" width="340" height="330"></canvas><div class="cap">'+cap+'</div></div>';
  holder.insertAdjacentHTML('beforeend','<div class="pair">'+cell('today',c.today,'today ('+c.tEntry+'), facing '+L.toUpperCase()+', rise '+c.tMs+' ms')+cell('new',c.new,'new ('+c.nEntry+'), facing '+L.toUpperCase()+', rise '+c.nMs+' ms')+'</div>');}}
 cvs=[...holder.querySelectorAll('canvas')];imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));f=0}
SCN.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.id;b.title=s.label;b.onclick=()=>show(i);btns.appendChild(b)});
function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach((c,k)=>{const a=imgs[k];const im=a[f%a.length];if(im.complete&&im.naturalWidth)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};show(0);requestAnimationFrame(tick);
</script>`;
writeFileSync(join(dir, 'index.html'), html);
console.log('wrote', join(dir, 'index.html'), misses.length, 'misses');
