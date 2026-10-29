// T3.6a page writer: reads <dir>/strip.json (getups_g2_strip.mjs) and writes <dir>/index.html (relative paths, works from file://).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] ?? 'research/animation/getups-2026-10/g2-strip';
const cells = JSON.parse(readFileSync(join(dir, 'strip.json'), 'utf8'));
const F = (f) => (f < 0 ? 'L' : 'R'), n = (v) => (v === null ? '&ndash;' : v);
const rows = []; for (const c of cells) for (const [side, h] of Object.entries(c.hands)) rows.push({ c, side, h });
const two = rows.filter((r) => r.c.facing < 0); // facings are mirror images in every number: one row per rig/family/hand
const same = rows.every((r) => { const o = rows.find((q) => q.c.facing > 0 && q.c.rig === r.c.rig && q.c.family === r.c.family && q.side === r.side); return JSON.stringify(o.h) === JSON.stringify(r.h); });
const misses = two.filter((r) => r.h.neverPlants);
let html = `<!doctype html><meta charset="utf-8"><title>G2 loop strip: T3.2 keys | T3.4b</title>
<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1,h2{font-weight:600}h4{margin:14px 0 4px;color:#9ad}
table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #444;padding:3px 8px;text-align:right}th{background:#2a2a2a}td:first-child,th:first-child,td:nth-child(2){text-align:left}
.bad{background:#4a2a20}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:340px}canvas{background:#000;display:block}
.note{background:#2a2a2a;padding:8px 12px;border-left:3px solid #c84;margin:10px 0}button{font:inherit;padding:4px 10px}code{color:#cb8}</style>
<h1>G2 loop strip: T3.2 keys (hands off) | T3.4b</h1>
<p>PLAN_GETUPS T3.6a. 1&times; speed, 60 fps stepping, forced rises, full stamina, no back pain, each loop = rise then 2 s standing. Left column <code>?getups=v1&amp;handsOff=1&amp;getup=&lt;family&gt;</code> (dev-only switch: the entry drawn without hand targets, so the keys' own arms); right column <code>?getups=v1&amp;getup=&lt;family&gt;</code> as it plays now (T3.4b). Measured from the drawn wrists; Derek judges.</p>
<h2>Misses first</h2><div class="note">${misses.length} hand(s) never plant (lift at push start, one planted frame or none) out of ${two.length}:
<table><tr><th>rig</th><th>family</th><th>hand</th><th>tLift (t)</th><th>ms from push</th><th>planted frames</th><th>slip max px</th></tr>
${misses.map((r) => `<tr class="bad"><td>${r.c.rig}</td><td>${r.c.family}</td><td>${r.side}</td><td>${n(r.h.tLift)}</td><td>${n(r.h.msFromPush)}</td><td>${r.h.plantedFrames}</td><td>${r.h.slipMax}</td></tr>`).join('')}</table>
The hands that do plant, and when they lift:
<table><tr><th>rig</th><th>family</th><th>hand</th><th>push (t)</th><th>tLift (t)</th><th>ms from push</th><th>planted frames</th><th>slip max px</th></tr>
${two.filter((r) => !r.h.neverPlants).map((r) => `<tr><td>${r.c.rig}</td><td>${r.c.family}</td><td>${r.side}</td><td>${r.h.push.join(' &ndash; ')}</td><td>${r.h.lifted ? r.h.tLift : 'never lifts'}</td><td>${n(r.h.msFromPush)}</td><td>${r.h.plantedFrames}</td><td>${r.h.slipMax}</td></tr>`).join('')}</table>
Left and right facings give ${same ? 'identical numbers in every row (mirror images), so the tables show one facing' : 'DIFFERENT numbers; see strip.json'}. frontKnee is the turn variant (opponent behind); backTuck has no turn (opponent in front).</div>
<h2>Loops (1&times;)</h2>`;
for (const c of cells) {
    const cell = (col, label) => `<div><canvas data-dir="frames/${col}/${c.id}" data-n="${c.frames}" width="340" height="330"></canvas><div class="cap">${label} &middot; rise ${c.riseMs} ms</div></div>`;
    html += `<h4>${c.rig} &middot; ${c.family}${c.family === 'frontKnee' ? ' (turn)' : ''} &middot; facing ${F(c.facing)}</h4><div class="pair">${cell('keys', 'T3.2 keys, hands off')}${cell('t34b', 'T3.4b')}</div>`;
}
html += `<p><button id="pp">pause</button></p>
<h2>Wrist step: keyed arm (no hand targets) vs T3.4b, px per 1/60 s frame</h2>
<p>Window = the lift to the end of that phase's release (t); a hand that never lifts uses push start to release end. The facing-flip frame is excluded. Whole rise = largest step anywhere in the rise.</p>
<table><tr><th>rig</th><th>family</th><th>hand</th><th>window (t)</th><th>lifts</th><th>keys step</th><th>T3.4b lift step</th><th>T3.4b minus keys</th><th>keys whole rise</th><th>T3.4b whole rise</th></tr>
${two.map((r) => `<tr><td>${r.c.rig}</td><td>${r.c.family}</td><td>${r.side}</td><td>${r.h.window.join(' &ndash; ')}</td><td>${r.h.lifted ? 'yes' : 'no'}</td><td>${r.h.keysStep}</td><td>${r.h.t34bStep}</td><td>${(r.h.t34bStep - r.h.keysStep).toFixed(2)}</td><td>${r.h.keysWhole}</td><td>${r.h.t34bWhole}</td></tr>`).join('')}</table>
<script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false;
const imgs=cvs.map(c=>{const k=+c.dataset.n;return Array.from({length:k},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im})});
let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach((c,k)=>{const a=imgs[k];const im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
writeFileSync(join(dir, 'index.html'), html);
console.log('wrote', join(dir, 'index.html'));
