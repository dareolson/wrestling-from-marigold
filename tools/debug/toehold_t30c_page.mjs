// T3.0c review page: per case, the normal-speed and 0.5x videos (each loops only the move), the 12-frame contact sheet, then the numbers, misses first.
//   node tools/debug/toehold_t30c_page.mjs <outDir> [seedDir]
// Everything the page needs is committed beside it (video/*.webm, video/manifest.json, <case>/contact-sheet.png): no regeneration on a fresh checkout.
import { readFileSync, writeFileSync } from 'node:fs';
const [dir, seedDir = 'research/animation/light-moves-2026-11/t3-knee-capture'] = process.argv.slice(2);
const CASES = [['lou-george-right', 'Lou on George, facing right'], ['lou-george-left', 'Lou on George, facing left'], ['george-lou-right', 'George on Lou, facing right'], ['george-lou-left', 'George on Lou, facing left']];
const manifest = JSON.parse(readFileSync(`${dir}/video/manifest.json`));
const f = (v, d = 1) => v === null || v === undefined ? 'n/a' : (+v).toFixed(d).replace(/\.0+$/, '');
const kb = n => (n / 1024).toFixed(0) + ' KB';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// requirement bars from the task; every miss is listed above the numbers
const misses = (s, base) => {
    const m = [];
    if (s.grip.worst > 6) m.push(`grip: worst ${f(s.grip.worst)} px at ${f(s.grip.worstAt, 2)} s (bar 6); ${s.grip.framesOver6} frame(s) over`);
    if (s.turn.seconds < .25) m.push(`turn lasts ${s.turn.seconds} s (bar 0.25)`);
    if (s.roll.seconds < .4) m.push(`roll lasts ${s.roll.seconds} s (bar 0.4)`);
    if (s.roll.afterLand <= 0) m.push('roll starts before the knees land');
    if (s.drop.seconds < .28) m.push(`drop lasts ${s.drop.seconds} s (bar ~0.3)`);
    const [l0, l1] = s.drop.landFrame; if (l0 === null || l1 === null || Math.abs(l0 - l1) > 1) m.push(`knees land on frames ${l0} / ${l1} (bar: same frame ±1)`);
    s.kneesHold.forEach((k, i) => { if (k.min < -6 || k.max > 6) m.push(`${i ? 'far' : 'near'} knee leaves ±6 px of the mat during the hold: ${k.min}..${k.max}`); });
    s.wrenches.forEach((w, i) => { if (w.foot < 25) m.push(`wrench ${i + 1}: foot travels ${w.foot} px (bar 25)`); });
    s.strikes.forEach((k, i) => {
        if (k.lift > -30) m.push(`strike ${i + 1}: lift ${f(-k.lift)} px (bar 30)`);
        if (k.contactFrames < 3) m.push(`strike ${i + 1}: ${k.contactFrames} contact frames (bar 3)`);
        if (k.offsetFrames === null || Math.abs(k.offsetFrames) > 2) m.push(`strike ${i + 1}: lands ${k.offsetFrames === null ? 'never' : k.offsetFrames + ' frames off'} the wrench peak`);
    });
    if (s.pinned.length) m.push(`joints at a limit: ${s.pinned.join(', ')}`);
    if (s.boot.wrenchMax > 0) m.push(`boot: ${s.boot.wrenchMax} of ${s.boot.bootPx} px covered at worst during the wrenches (was ${base ? base.bootCoveredPx : 'n/a'} px on the candidate's kneel still)`);
    return m;
};

const sec = ([tag, title]) => {
    const rows = manifest.filter(x => x.tag === tag && x.file).sort((a, b) => a.rate - b.rate).reverse();
    const main = rows.find(x => x.rate === 1), s = main?.summary;
    if (!s) return `<section><h2>${title}</h2><p><i>No measured video for this case.</i></p></section>`;
    let base = null; try { base = JSON.parse(readFileSync(`${seedDir}/${tag}/report.json`))['3-kneel'].metrics; } catch { /* no baseline */ }
    const miss = misses(s, base);
    const vids = rows.map(x => `<figure><video src="video/${x.file}#t=${x.tStart}" data-start="${x.tStart}" data-end="${x.tEnd}" autoplay loop muted playsinline controls></video><figcaption><b>${x.rate === 1 ? 'Normal speed' : '0.5× speed'}</b> · ${kb(x.bytes)}</figcaption></figure>`).join('');
    const st = s.strikes.map((k, i) => `<tr><td>${i + 1}</td><td>${k.arm === 'l' ? 'left' : 'right'} (${k.side})</td><td>${f(-k.lift)}</td><td>${k.landedAt ?? 'n/a'}</td><td>${k.offsetFrames ?? 'n/a'}</td><td>${k.contactFrames}</td></tr>`).join('');
    const wr = s.wrenches.map((w, i) => `<tr><td>${i + 1}</td><td>${f(w.peak, 2)} s</td><td>${f(w.foot)}</td><td>${f(w.footPath)}</td><td>${f(w.hipBack)}</td><td>${w.kneesAtPeak.map(v => f(v)).join(' / ')}</td><td>${s.boot.atPeaks[i]}</td></tr>`).join('');
    return `<section id="${tag}"><h2>${title}</h2><div class="vids">${vids}</div>
<h3>Contact sheet (12 frames over the move)</h3><a href="${tag}/contact-sheet.png"><img class="sheet" src="${tag}/contact-sheet.png" alt="contact sheet, ${title}"></a>
<h3>Misses</h3>${miss.length ? `<ul>${miss.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>None against the task bars.</p>'}
<h3>Numbers</h3>
<p><b>Hands on the foot, every frame from the grab (0.02 s) to the end:</b> worst ${f(s.grip.worst)} px at ${f(s.grip.worstAt, 2)} s; ${s.grip.framesOver6} frames over 6 px.</p>
<p><b>Turn</b> (attacker mirrors at his straddle, ${f(s.turn.flipAt, 3)} s): ${s.turn.seconds} s long; biggest one-frame joint move ${f(s.turn.worstFrameJump.d)} px at ${f(s.turn.worstFrameJump.t, 3)} s (median frame ${f(s.turn.medianFrameJump)}). <b>Roll</b> (man's back to his stomach, mirrors at ${f(s.roll.flipAt, 3)} s): ${s.roll.seconds} s long, starts ${s.roll.afterLand} s after the knees land; biggest one-frame joint move ${f(s.roll.worstFrameJump.d)} px at ${f(s.roll.worstFrameJump.t, 3)} s (median ${f(s.roll.medianFrameJump)}).</p>
<p><b>Knee drop:</b> ${s.drop.seconds} s (${s.drop.start} to ${s.drop.land} s); standing knees ${s.drop.standingKnees.map(v => f(v)).join(' / ')} px above the mat; hips fall ${f(s.drop.hipDrop)} px; knees reach the mat (≤3 px) on frames ${s.drop.landFrame.join(' / ')} (near / far); largest one-frame joint move in the drop ${f(s.drop.worstFrameJump)} px. Knees above the mat during the hold: near ${s.kneesHold[0].min}..${s.kneesHold[0].max}, far ${s.kneesHold[1].min}..${s.kneesHold[1].max} px; knee sideways travel ${s.kneeTravelPx.map(v => f(v)).join(' / ')} px.</p>
<table><tr><th>wrench</th><th>peak</th><th>foot travel px (start to peak)</th><th>foot path px</th><th>hips back px</th><th>knees at peak (near / far)</th><th>boot px covered</th></tr>${wr}</table>
<table><tr><th>strike</th><th>arm</th><th>lift px</th><th>lands at s</th><th>frames off the peak</th><th>contact frames</th></tr>${st}</table>
<p>Fists over the whole sell: near ${s.fists.near.strikes} strike(s), far ${s.fists.far.strikes}; deepest ${f(s.fists.near.deepest)} / ${f(s.fists.far.deepest)} px (0..4 = on the mat). <b>Boot:</b> ${s.boot.wrenchMax ? `${s.boot.wrenchMin}..${s.boot.wrenchMax}` : '0'} of ${s.boot.bootPx} px hidden by the attacker's body over the wrenches (candidate kneel still: ${base ? base.bootCoveredPx : 'n/a'} of ${base ? base.bootPx : 'n/a'}).</p></section>`;
};
writeFileSync(`${dir}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>T3.0c two-knee toe hold</title>
<style>body{font:15px/1.4 system-ui;margin:16px auto;max-width:1000px;padding:0 16px;background:#f4f1ea;color:#1d1b17}video{width:100%;max-width:780px;background:#000;border:1px solid #bbb}.sheet{width:100%;max-width:980px;border:1px solid #bbb}figure{margin:0 0 14px}figcaption{font-size:13px}p,li{margin:3px 0}h2{border-top:2px solid #999;padding-top:8px}table{border-collapse:collapse;margin:6px 0;font-size:13px}td,th{border:1px solid #bbb;padding:2px 8px;text-align:left}@media(prefers-color-scheme:dark){body{background:#161512;color:#ece7da}}</style></head><body>
<h1>Toe hold: knee drop, turn, roll, wrench (T3.0c)</h1>
<p>Derek's direction: the attacker falls onto both knees with the man's leg between his legs, then wrenches the foot while the man, on his stomach, pounds the canvas. Each clip: grab, step-over, a turn (the attacker mirrors at a standing straddle over the leg), a 0.3 s knee drop, the man rolls from his back to his stomach (mirrors at a straight-limbed instant), then three wrenches, each with a fist strike on the peak, alternating arms. Hands ride the clip grip channel the whole way. Review preview, not a playable move; nothing here is approved. Videos loop only the move. Misses are listed first under each case.</p>
${CASES.map(sec).join('')}
<script>document.querySelectorAll('video[data-start]').forEach(v=>{const s=+v.dataset.start,e=+v.dataset.end;v.addEventListener('loadedmetadata',()=>{v.currentTime=s});v.addEventListener('timeupdate',()=>{if(v.currentTime>=e||v.currentTime<s-.05)v.currentTime=s})})</script></body></html>`);
