// T3b.2 page writer: reads <dir>/g2b-*.json (getups_g2b.mjs) and writes <dir>/strip.html (the 1x loops alone, both facings) and
// <dir>/index.html (misses first, the same loops, then the numbers). Relative paths, works from file://.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] ?? 'research/animation/getups-2026-10/g2b';
const rows = readdirSync(dir).filter(f => /^g2b-.*\.json$/.test(f)).flatMap(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const n = (v) => (v === null || v === undefined ? '&ndash;' : v);
const F = (f) => (f < 0 ? 'L' : 'R');
const NAME = { bkh: 'backKneeHurt (turn)', fk: 'frontKnee (turn)', fkb: 'frontKnee + back pain (frontKneeBack, turn)' };
const find = (rig, scn, facing, s) => rows.find(r => r.rig === rig && r.scn === scn && r.facing === facing && r.stamina === s);
const rigs = [...new Set(rows.map(r => r.rig))], scns = ['bkh', 'fk', 'fkb'], facings = [-1, 1];
const stalled = rows.filter(r => r.stall);

// misses first
const miss = [];
for (const r of stalled.filter(r => r.facing < 0 && r.stamina === 5)) {
    for (const h of r.stall.hands) {
        if (h.state === 'lifting' || h.state === 'lift just began') miss.push(`${r.rig} ${r.entry} ${h.side} hand ${h.space === 'world' ? 'on the mat' : 'at ' + h.target}: ${h.state} through the stall (weight ${h.wStart} &rarr; ${h.wEnd}, tLift ${n(h.tLift)})`);
        if (h.reachVerdict && h.reachVerdict !== 'within reach') miss.push(`${r.rig} ${r.entry} ${h.side} hand: reach ratio ${h.reachRatioMin}&ndash;${h.reachRatioMax} through the breath (${h.reachVerdict})`);
    }
}
const steps = stalled.filter(r => r.facing < 0).map(r => {
    const base = find(r.rig, r.scn, r.facing, 100);
    return { r, base };
});
const bigStep = steps.filter(({ r, base }) => Math.max(r.stall.enter?.perFrame ?? 0, r.stall.leave?.perFrame ?? 0) > (base?.keyWindowStep?.perFrame ?? 0) + 0.5);
const lenOff = stalled.filter(r => r.facing < 0 && Math.abs(r.totalMs - r.expectedTotalMs) > 17);
const flat = (o, p = '') => Object.entries(o ?? {}).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, p + k + '.') : [[p + k, v]]));
// facings are mirror images: every number agrees to rounding (.1 px, 5 px/s), frame indices and facing fields aside
const mirror = rows.filter(r => r.facing < 0).every(l => { const q = find(l.rig, l.scn, 1, l.stamina); if (!q) return false; const b = Object.fromEntries(flat(q));
    return flat(l).every(([k, v]) => /(^|\.)(i|facing|frames|facingStart|facingStand)$/.test(k) || (typeof v === 'number' ? Math.abs(v - b[k]) <= (/perSec/.test(k) ? 5 : 0.1) : v === b[k])); });

const css = `<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1,h2{font-weight:600}h4{margin:14px 0 4px;color:#9ad}
table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #444;padding:3px 8px;text-align:right}th{background:#2a2a2a}td:first-child,th:first-child{text-align:left}
.bad{background:#4a2a20}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:340px}canvas{background:#000;display:block}
.note{background:#2a2a2a;padding:8px 12px;border-left:3px solid #c84;margin:10px 0}button{font:inherit;padding:4px 10px}code{color:#cb8}li{margin:3px 0}</style>`;
const loops = () => {
    let h = '';
    for (const rig of rigs) for (const scn of scns) for (const facing of facings) {
        const cell = (s) => { const r = find(rig, scn, facing, s); return r ? `<div><canvas data-dir="frames/s${s}/${scn}/${rig}-${facing < 0 ? 'l' : 'r'}" data-n="${r.frames}" width="340" height="330"></canvas><div class="cap">stamina ${s} % &middot; ${r.entry} &middot; ${r.totalMs} ms${r.stall ? ` (stall ${r.stall.stallMs})` : ' (no stall)'}</div></div>` : ''; };
        h += `<h4>${rig} &middot; ${NAME[scn]} &middot; facing ${F(facing)}</h4><div class="pair">${cell(100)}${cell(25)}${cell(5)}</div>`;
    }
    return h + `<p><button id="pp">pause</button></p>
<script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false;
const imgs=cvs.map(c=>{const k=+c.dataset.n;return Array.from({length:k},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im})});
let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach((c,k)=>{const a=imgs[k];const im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
};
const intro = `<p>PLAN_GETUPS T3b.2. 1&times; speed, 60 fps stepping, forced rises, turn variants (opponent behind). Columns: stamina 100 % (no stall, today's rise) | 25 % | 5 %. Each loop = rise then 1 s standing (2.6 s with back pain). Measured from the drawn frames; Derek judges.</p>`;
writeFileSync(join(dir, 'strip.html'), `<!doctype html><meta charset="utf-8"><title>G2b loop strip: stamina 100 | 25 | 5</title>${css}<h1>G2b loop strip: stamina 100 | 25 | 5</h1>${intro}${loops()}`);

let html = `<!doctype html><meta charset="utf-8"><title>G2b: the fatigue stall</title>${css}<h1>G2b: the fatigue stall (D8)</h1>${intro}
<h2>Misses first</h2><div class="note"><ul>
<li><b>Hands through the stall (stamina 5 %, one facing; 25 % is the same keys):</b> ${miss.length ? '<ul>' + miss.map(m => `<li>${m}</li>`).join('') + '</ul>' : 'none'}</li>
<li><b>Steps entering / leaving the stall</b> larger than the same entry's biggest step within &plusmn;.04 t of the stall key at stamina 100 (+.5 px): ${bigStep.length ? '<ul>' + bigStep.map(({ r, base }) => `<li>${r.rig} ${r.entry} @${r.stamina} %: enter ${r.stall.enter.perFrame} (${r.stall.enter.part}), leave ${r.stall.leave.perFrame} (${r.stall.leave.part}) px/frame vs ${n(base?.keyWindowStep?.perFrame)} at 100 %</li>`).join('') + '</ul>' : 'none'}</li>
<li><b>Total time vs today + stall</b> off by more than one frame (17 ms): ${lenOff.length ? lenOff.map(r => `${r.rig} ${r.entry} @${r.stamina} %: ${r.totalMs} vs ${r.expectedTotalMs}`).join('; ') : 'none (all within one frame)'}</li>
<li><b>Head down:</b> there is no head channel in the grounded pose (S4). The droop is a torso rotation of ${0.10} rad toward the mat plus a ${3} px hip sag, both eased in over 200 ms; the head follows the torso. Whether that reads as head down is for Derek (G2b Q3).</li>
<li>Left and right facings give ${mirror ? 'the same numbers in every row to rounding (mirror images); the tables show facing L' : 'DIFFERENT numbers in some rows; see g2b-*.json'}.</li>
</ul></div>
<h2>Loops (1&times;)</h2>${loops()}
<h2>Per film (facing L)</h2>
<p>Phases in real ms from the first rise frame (frame steps of 16.7 ms). Total = first rise frame to first standing frame; today + stall = ${'850 + 750 &times; (1 &minus; stamina)'} + stallMs. Steps are the largest per-part corner step in the window (the facing-flip frame is mirrored about the pivot, as in G2): enter = 3 frames before to 12 frames after the stall's first frame (the 200 ms ease-in), leave = 12 frames before to 3 after its last, inside = the breath alone. px/s = px/frame &times; 60. &ldquo;at 100 %&rdquo; is the same entry's biggest step within &plusmn;.04 t of the stall key with no stall.</p>
<table><tr><th>rig</th><th>entry</th><th>stamina</th><th>before stall ms</th><th>stall ms</th><th>after ms</th><th>total ms</th><th>today + stall ms</th><th>enter px/f (px/s)</th><th>leave px/f (px/s)</th><th>inside px/f</th><th>at 100 % px/f</th></tr>`;
for (const rig of rigs) for (const scn of scns) for (const s of [100, 25, 5]) {
    const r = find(rig, scn, -1, s); if (!r) continue;
    const base = find(rig, scn, -1, 100), st = r.stall;
    const px = (m) => (m ? `${m.perFrame} (${m.perSec}) ${m.part}${m.turned ? ' flip' : ''}` : '&ndash;');
    html += `<tr><td>${rig}</td><td>${r.entry}</td><td>${s} %</td><td>${st ? st.beforeMs : '&ndash;'}</td><td>${st ? st.stallMs : '0'}</td><td>${st ? st.afterMs : '&ndash;'}</td><td>${r.totalMs}</td><td>${r.expectedTotalMs}</td><td>${st ? px(st.enter) : '&ndash;'}</td><td>${st ? px(st.leave) : '&ndash;'}</td><td>${st ? px(st.inside) : '&ndash;'}</td><td>${n(base?.keyWindowStep?.perFrame)} ${base?.keyWindowStep?.part ?? ''}</td></tr>`;
}
html += `</table>
<h2>Hands through the stall (facing L)</h2>
<p>Weight = the phase schedule at the stall key &times; the lift factor recorded in the hold (as the draw computes it). Reach ratio = drawn shoulder &rarr; held mat point &divide; drawn arm length (upper + fore), min&ndash;max over the stall frames, i.e. at the breath's extremes; above .97 the hand would lift if the check ran, above 1 it cannot reach. The stall holds the key pose for the checks (S3), so no lift is recorded during the stall.</p>
<table><tr><th>rig</th><th>entry</th><th>stamina</th><th>hand</th><th>space / target</th><th>state at stall</th><th>weight start &rarr; end</th><th>tLift</th><th>reach ratio min&ndash;max</th><th>verdict</th></tr>`;
for (const rig of rigs) for (const scn of scns) for (const s of [25, 5]) {
    const r = find(rig, scn, -1, s); if (!r?.stall) continue;
    for (const h of r.stall.hands) html += `<tr${h.state === 'lifting' || h.state === 'lift just began' || (h.reachVerdict && h.reachVerdict !== 'within reach') ? ' class="bad"' : ''}><td>${rig}</td><td>${r.entry}</td><td>${s} %</td><td>${h.side}${h.phase}</td><td>${h.space} / ${h.target}</td><td>${h.state}</td><td>${h.wStart} &rarr; ${h.wEnd}</td><td>${n(h.tLift)}</td><td>${h.reachRatioMin !== undefined ? h.reachRatioMin + ' &ndash; ' + h.reachRatioMax : '&ndash;'}</td><td>${n(h.reachVerdict)}</td></tr>`;
}
html += `</table>
<h2>Questions for G2b (Derek)</h2>
<ol><li>Is the stall the right length (600&ndash;1400 ms)?</li>
<li>Lou's frontKnee near hand is half-lifted through the stall: keep, move frontKnee's stall to the push-up key (t .22, both Lou hands planted), or let a running lift finish on the stall clock?</li>
<li>Is the droop enough for &ldquo;head down&rdquo;?</li>
<li>Punishable later (gameplay plan), confirmed as look only now?</li></ol>`;
writeFileSync(join(dir, 'index.html'), html);
console.log('wrote', join(dir, 'index.html'), 'and strip.html');
