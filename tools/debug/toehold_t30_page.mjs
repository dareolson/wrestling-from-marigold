// T3.0b page: per case, the moving preview (webm from toehold_t30_video.mjs, both endings) with its numbers, and the five posed stills underneath with theirs.
//   node tools/debug/toehold_t30_page.mjs research/animation/light-moves-2026-11/t3-0b
// Everything the page needs is committed beside it (stills, report.json, video/*.webm, video/manifest.json): no regeneration on a fresh checkout.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const dir = process.argv[2];
const capture = dir.includes('knee-capture');
const NAMES = { '1-grab': '1 ankle grab', '2-step-over': '2 mid step-over', '3-kneel': '3 kneeling, leg bent', '4a-heels': '4a sit back on heels', '4b-mat': '4b sit back on the mat' };
const LAYER = { '1-grab': 'back to front: his free leg, his far arm, torso, head, near arm | Lou far arm, torso, head, far leg, near leg | trapped leg | Lou near arm',
    '2-step-over': 'Lou\'s near leg drawn over the raised shin (his near arm and leg over the trapped leg)',
    '3-kneel': 'trapped leg behind Lou\'s near leg and his arms/torso; whole-leg granularity, so shin and boot are behind the thigh too (misses)',
    '4a-heels': 'as still 3', '4b-mat': 'as still 3' };
const CASES = [['lou-george-right', 'Lou on George, facing right'], ['lou-george-left', 'Lou on George, facing left'], ['george-lou-right', 'George on Lou, facing right'], ['george-lou-left', 'George on Lou, facing left']];
const LIMIT = 1.5 * 1024 * 1024;   // clips over this stay local (gitignored: *-slow.webm) and are left off the page, so it works on a fresh checkout
const manifest = (existsSync(`${dir}/video/manifest.json`) ? JSON.parse(readFileSync(`${dir}/video/manifest.json`)) : []).filter(m => m.bytes <= LIMIT);
const f = v => v === null || v === undefined ? 'n/a' : (+v).toFixed(1).replace(/\.0$/, '');
const kb = n => (n / 1024).toFixed(0) + ' KB';
const fistLine = s => ['near', 'far'].map(sd => `${sd} ${s[sd].strikes} strikes, ${s[sd].contactFrames} contact frames (longest run ${s[sd].longestRun}), highest lift ${f(s[sd].highestLift)} px, deepest ${f(s[sd].deepest)} px`).join(' | ');
const videoBlock = id => {
    const rows = manifest.filter(m => `${m.pair}-${m.side}` === id).sort((a, b) => a.file.localeCompare(b.file));
    if (!rows.length) return '<p><i>No video for this case.</i></p>';
    return '<div class="vids">' + rows.map(m => `<figure><video src="video/${m.file}#t=${m.tStart}" data-start="${m.tStart}" data-end="${m.tEnd}" autoplay loop muted playsinline controls></video><figcaption><b>${m.ending === '4a-heels' ? '4a ending (on his heels)' : '4b ending (on the mat)'}${m.rate < 1 ? ', 0.25× speed' : ', normal speed'}</b> · ${kb(m.bytes)}${m.summary ? `<br>fists over the sell, bottom of the hand vs the mat line at his chest (0 to 4 px = on the mat): ${fistLine(m.summary.fists)}<br>palm to heel/toe, kneel and pulls: ${f(m.summary.gripKneelAndPulls.heel)} / ${f(m.summary.gripKneelAndPulls.toe)} px max; in transit (step-over, roll, into the kneel): ${f(m.summary.gripTransit.heel)} / ${f(m.summary.gripTransit.toe)} px max; at the flip frames (±0.07 s of the one-frame turn): ${f(m.summary.gripFlipFrames.heel)} / ${f(m.summary.gripFlipFrames.toe)}${m.summary.capture ? `<br>leg between near/far attacker thighs: ${m.summary.capture.samples - m.summary.capture.depthFailures}/${m.summary.capture.samples} samples; knees above mat ${m.summary.capture.kneesAboveMat.map(k => f(k.min) + '…' + f(k.max)).join(' / ')} px; knee travel ${m.summary.capture.kneeTravel.map(f).join(' / ')} px` : ''}${m.summary.pinned.length ? `<br>joints near a cap: ${m.summary.pinned.join(', ')}` : '<br>no joint near a cap'}` : ''}</figcaption></figure>`).join('') + '</div>';
};
const sec = ([id, title]) => {
    const r = JSON.parse(readFileSync(`${dir}/${id}/report.json`));
    const trappedIsLou = id.startsWith('george-lou'), lock = Object.keys(NAMES).filter(k => r[k]).map(k => {
        const v = r[k], cap = [...v.att.pinned.map(p => 'attacker ' + p), ...v.def.pinned.map(p => 'man ' + p)];
        const boot = k === '1-grab' || k === '2-step-over' ? 'base shin (foot not yet bent)' : trappedIsLou ? 'Lou\'s ankleTwist worn; drawn for a shin hanging straight down, here the shin is folded back (judge the fit)' : 'George has no ankleTwist: base shin';
        return `<tr><td><a href="${id}/${k}.png"><img src="${id}/${k}.png" alt="${NAMES[k]}"></a><br><b>${NAMES[k]}</b></td><td>
<p>palm to heel ${f(v.gripPx.heel)} px, to toe ${f(v.gripPx.toe)} px (bar 6)${v.gripPxMax ? `; worst over the 2 s fist sell ${f(v.gripPxMax.heel)} / ${f(v.gripPxMax.toe)}` : ''}</p>
<p>knee flex: attacker near ${v.att.knees.near} / far ${v.att.knees.far}; man's trapped ${v.def.knees[v.def.lSide]} (cap 2.545)</p>
<p>near a cap: ${cap.length ? cap.join(', ') : 'none (pinned list empty)'}</p>
${v.metrics ? `<p>held foot minus attacker hip y: ${f(v.metrics.footMinusHip)} px (0 = hip height, + = below); attacker's body covers ${v.metrics.bootCoveredPx} of ${v.metrics.bootPx} px of the foot</p>
<p>mat line (400): attacker knees ${v.metrics.kneeToMat.map(f).join(' / ')} px above (bar -6..6), ankles ${v.metrics.ankleToMat.map(f).join(' / ')} px above, knee above ankle ${v.metrics.kneeAboveAnkle.map(f).join(' / ')}, seat ${f(v.metrics.seatToMat)} px above</p>` : ''}${v.fistSummary ? `<p>fists over a 2 s sell: ${fistLine(v.fistSummary)}</p>` : ''}
<p>layers: ${v.authored?.capture ? 'far attacker leg behind trapped leg; near attacker leg in front; both knees remain planted through the wrench' : LAYER[k]}</p>${v.authored.prone ? `<p>Receiver: stomach down; hip lift ${v.authored.def.lift}, attacker crouch ${f(v.authored.att.crouch)}, hip spacing ${f(v.authored.gap)} px.</p>` : ''}<p>bent boot: ${boot}</p></td></tr>`;
    }).join('');
    return `<section><h2>${title}</h2>${videoBlock(id)}<h3>Stills (the poses the video chains)</h3><table>${lock}</table></section>`;
};
writeFileSync(`${dir}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>T3.0b toehold video</title>
<style>body{font:15px/1.4 system-ui;margin:16px auto;max-width:1000px;padding:0 16px;background:#f4f1ea;color:#1d1b17}img{width:520px;max-width:100%;border:1px solid #bbb}video{width:100%;max-width:780px;background:#000;border:1px solid #bbb}figure{margin:0 0 14px}figcaption{font-size:13px}td{vertical-align:top;padding:6px;border-bottom:1px solid #ccc}p{margin:2px 0}h2{border-top:2px solid #999;padding-top:8px}@media(prefers-color-scheme:dark){body{background:#161512;color:#ece7da}}</style></head><body>
<h1>${capture ? 'Toe hold: drop onto both knees, trap the leg, wrench the foot' : 'T3.0b: step-over toehold, moving preview (both endings) and the poses behind it'}</h1>
${capture ? '<p><b>Knee-capture revision:</b> a short two-knee drop, the trapped leg layered between the attacker’s legs, then three wrenches on a stationary kneeling base. The legs-out seated ending is removed. This is a review preview, not a playable move. <b>Entry still needs work:</b> the turn and stomach roll snap into place, hands lose contact in transit, and some transition joints reach their limits. The planted capture and wrench are the revised portion to judge.</p>' : '<p><b>Pick 4a or 4b from the videos.</b></p>'}<p> Each clip: ankle grab, step-over (the attacker's facing flips once, in a single frame), the man rolls onto his stomach (<b>placeholder roll: a one-frame snap, no roll art</b>), the attacker kneels bending the leg, then wrenches the foot three times with the man's fists alternating lift, strike, rest on the mat; 0.5 s hold. Normal game speed; 0.25× copies of the right-facing 4a case of each pairing (2.8 MB each, over the 1.5 MB commit limit) are local only: regenerate with toehold_t30_video.mjs. Hands ride the clip grip channel. Whole-leg layering, boot-art fit and the roll remain unapproved; there is no playable move yet (T3.2 builds it).</p>
<p>The stills are one-pose clips through the same runtime (tools/debug/toehold_t30_stills.mjs, poses saved in each report.json and replayed with REPLAY=1). Fist contact = the lowest drawn pixel of the hand alone (his forearm/hand pixels within 22 px of the painted palm) against the lowest row of his torso, in px; 0..4 counts as touching. Derek judges every visual.</p>
${CASES.map(sec).join('')}
<script>document.querySelectorAll('video[data-start]').forEach(v=>{const s=+v.dataset.start,e=+v.dataset.end;v.addEventListener('loadedmetadata',()=>{v.currentTime=s});v.addEventListener('timeupdate',()=>{if(v.currentTime>=e||v.currentTime<s-.05)v.currentTime=s})})</script></body></html>`);
