// PLAN_FALLS T3.12: the G3 r2 page, research/animation/falls-2026-11/g3/r2.html. Reads what the T3.5-T3.11 tools wrote:
//   g3/r2cases (falls_g3_r2_cases), g3/slam24 + slam26 (falls_probe, FALLS_PROBE_STAMINA) + g2/after rows for the fresh slam, g2/after* + before rows (T3.7),
//   g3/phases.json (falls_phases), g3/edge (falls_g3_edge), g3/soak/*.json (falls_g3_soak), g3/snapmare + g3/snapmare-before (falls_probe, rear reversal).
//   node tools/debug/falls_g3_r2_page.mjs [checksLine]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const root = 'research/animation/falls-2026-11';
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const f1 = (v) => (v == null || Number.isNaN(v) ? '-' : (+v).toFixed(1));
const checks = process.argv[2] ?? '';
const C = read('g3/r2cases/results.json'), E = read('g3/edge/results.json'), PH = read('g3/phases.json');
const SOAK = readdirSync(`${root}/g3/soak`).filter(f => f.endsWith('.json')).sort().map(f => read(`g3/soak/${f}`));
const VICT = ['george', 'lou'];
const SNAP = read('g3/snapmare/audit.json');
const dirOf = (v) => (v === 'george' ? 'g2/after' : 'g2/after-gl');   // George goes down when Lou throws (lg), Lou when George throws (gl)

// ---- canvas cells: frames dir (relative to g3/), count, marks [{at, len, label}] ----------------------------------------------------------------------------
// `off` 1: falls_probe's frames are numbered from s0001 (its snap() runs after the row is pushed), so row i is frame i + 1; the g3 cases and edge tools number from s0000
const cell = (dir, n, marks, cap, off = 0, wide = false) => `<div class="c"><canvas data-dir="${dir}" data-n="${n}" data-off="${off}" data-marks='${JSON.stringify(marks)}' width="${wide ? 450 : 280}" height="${wide ? 138 : 165}"></canvas><div class="cap">${cap}</div></div>`;
const rowsOf = (dir, id) => read(`${dir}/rows-${id}.json`);

// ---- T3.7: the backward fall's last frames ---------------------------------------------------------------------------------------------------------------
const armSplit = (rows, i) => {
    const a = rows[i - 1].d, b = rows[i].d, P = (d, k) => d.pts[k], d2 = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    const sh0 = P(a, 'nearShoulder'), sh1 = P(b, 'nearShoulder'), w0 = P(a, 'nearWrist'), w1 = P(b, 'nearWrist');
    const rel0 = { x: w0.x - sh0.x, y: w0.y - sh0.y }, rel1 = { x: w1.x - sh1.x, y: w1.y - sh1.y };
    let ang = (Math.atan2(rel1.y, rel1.x) - Math.atan2(rel0.y, rel0.x)) * 180 / Math.PI; ang = ((ang + 540) % 360) - 180;
    return { wrist: d2(w0, w1), shoulder: d2(sh0, sh1), angleDeg: ang, state: b.state, armLen: Math.hypot(rel1.x, rel1.y), s: b.s };
};
const t37 = [];
for (const v of VICT) for (const [col, dir] of [['flag off', 'before'], ['?falls=v1', dirOf(v)]]) {
    const id = `backward-${v}-l`, rows = rowsOf(dir, id), down = rows.findIndex(r => r.d.state === 'down');
    const steps = []; for (let i = down - 3; i <= down + 1; i++) steps.push({ i, ...armSplit(rows, i) });
    t37.push({ v, col, dir, id, down, steps, rows: rows.length });
}
const strip37 = (t) => { const a = t.down - 9, frames = Array.from({ length: 10 }, (_, k) => a + k); return `<div class="strip">${frames.map(i => `<div><img loading="lazy" src="../${t.dir}/frames/${t.id}/s${String(i + 1).padStart(4, '0')}.jpg" width="224"><div class="cap">${i === t.down ? 'DOWN' : i - t.down}</div></div>`).join('')}</div>`; };
const t37Rows = t37.map(t => { const last = t.steps.find(s => s.i === t.down), prev = t.steps.find(s => s.i === t.down - 1), prev2 = t.steps.find(s => s.i === t.down - 2); const sx = (s) => `${f1(s.wrist / s.s)} (shoulder ${f1(s.shoulder / s.s)} + arm ${f1(Math.abs(s.angleDeg))} deg)`; return `<tr><td>${t.v}</td><td>${t.col}</td><td>${sx(prev2)}</td><td>${sx(prev)}</td><td><b>${sx(last)}</b></td><td>${f1(t.steps.find(s => s.i === t.down + 1).wrist / last.s)}</td></tr>`; }).join('');

// ---- T3.8: the phases ----------------------------------------------------------------------------------------------------------------------------------------
const phaseDir = (r) => (r.fall === 'spill' ? 'g3/spill' : dirOf(r.victim));
const phaseCells = PH.filter(r => r.side === 'l').map(r => cell(`../${phaseDir(r)}/frames/${r.id}`, rowsOf(phaseDir(r), r.id).length,
    [{ at: r.firstSupport, len: 5, label: `FIRST SUPPORT (${r.supportPart})` }, { at: r.firstSupport + 5, len: Math.max(1, r.responseStart - r.firstSupport - 5), label: 'keyed absorption' }, { at: r.responseStart, len: 6, label: 'RESPONSE STARTS' }],
    `<b>${r.id}</b>: support ${r.firstSupport}, response ${r.responseStart} (${r.gapFrames} f, ${r.gapMs} ms), dead frames ${r.deadFrames}`, 1)).join('');
const phaseTable = PH.filter(r => r.side === 'l').map(r => `<tr><td>${r.id}</td><td>${r.supportPart}</td><td>${r.firstSupport}</td><td>${r.responseStart}</td><td>${r.gapFrames} f / ${r.gapMs} ms</td><td>${r.deadFrames}</td><td>${r.maxJointSpeedPerFrame.join(' ')}</td></tr>`).join('');

// ---- T3.5 cases -------------------------------------------------------------------------------------------------------------------------------------------
const caseCells = C.map(r => cell(`r2cases/frames/${r.id}`, r.frames, [{ at: r.fallAt >= 0 ? r.fallAt : 12, len: 40, label: r.outcome === 'fall' ? `FALL ${r.fall}` : r.outcome.toUpperCase() }],
    `<b>${r.note}</b>, ${r.victim} receives. Read at the hit: stamina ${r.hit?.stamina}, facing ${r.hit?.facing}. <b>${r.outcome}${r.fall ? ' ' + r.fall : ''}</b>${r.reason ? ': ' + esc(r.reason) : ''}`)).join('');

// ---- T3.6 slam tiers ----------------------------------------------------------------------------------------------------------------------------------------
const slamSets = [['fresh (100)', 'g2/after', 'g2/after-gl'], ['26', 'g3/slam26', 'g3/slam26'], ['24', 'g3/slam24', 'g3/slam24']];
const slamTier = (dir, id) => { const rows = rowsOf(dir, id); const l = rows.find(r => r.d.land); return l?.d.land?.tier ?? null; };
const slamAudit = (dir) => (existsSync(`${root}/${dir}/audit.json`) ? read(`${dir}/audit.json`) : []);
const slamCells = slamSets.flatMap(([lab, dG, dL]) => VICT.map(v => { const dir = v === 'george' ? dG : dL, id = `bodySlam-${v}-l`, rows = rowsOf(dir, id), a = slamAudit(dir).find(x => x.id === id), contact = rows.findIndex(r => r.d.land);
    return cell(`../${dir}/frames/${id}`, rows.length, [{ at: contact, len: 30, label: `LAND ${slamTier(dir, id) ?? 'r2'}` }], `receiver at <b>${lab}</b> stamina, ${v}: tier <b>${slamTier(dir, id) ?? 'none'}</b>, first hop ${f1(a?.rebound?.firstHop?.drawnPx)} px, landing ${a?.landingSec ?? '-'} s`, 1); })).join('');

// ---- T3.9 edge -------------------------------------------------------------------------------------------------------------------------------------------------
const edgeTable = E.map(r => `<tr><td>${r.id}</td><td>${r.fall}</td><td>${r.xStart} -> ${r.xDown}</td><td>${r.left > 0 ? `${Math.round(r.left)} / ${Math.round(r.right)}` : ''}</td><td class="${r.contact.inside ? '' : 'bad'}">${r.contact.margin}</td><td class="${r.landing.inside ? '' : 'bad'}">${r.landing.margin}</td><td class="${r.sell.inside ? '' : 'bad'}">${r.sell.margin}</td></tr>`).join('');
const edgeCells = E.map(r => cell(`edge/frames/${r.id}`, r.frames, [{ at: r.fallAt, len: 40, label: `FALL ${r.fall} (slid inward)` }], `<b>${r.id}</b>: rope ${r.ropeBehindPx} px behind him; body x ${r.contact.x[0]}..${r.contact.x[1]} in ropes ${Math.round(r.left)}..${Math.round(r.right)} (margin ${r.contact.margin} px)`)).join('');

// ---- T3.10 numbers ---------------------------------------------------------------------------------------------------------------------------------------------
const agg = (S) => {
    const strikes = {}; for (const s of S.S.strikes) { const m = (strikes[s.move] ??= { landed: 0, under: 0, min: 100, max: 0 }); m.landed++; if (s.stamina < 35) m.under++; m.min = Math.min(m.min, s.stamina); m.max = Math.max(m.max, s.stamina); }
    const picks = {}; for (const f of S.falls) { const k = `${f.move} -> ${f.fall}`; picks[k] = (picks[k] ?? 0) + 1; }
    const lands = {}; for (const l of S.S.landings) { const k = `${l.source ?? '?'} ${l.kind}${l.tier ? ' [' + l.tier + ']' : ''}`; (lands[k] ??= []).push(l); }
    return { strikes, picks, lands };
};
const A = SOAK.map(agg);
const sum = (f) => SOAK.reduce((n, s, i) => n + f(s, A[i]), 0);
const totalStrikes = sum((s) => s.S.strikes.length), totalUnder = sum((s) => s.S.strikes.filter(x => x.stamina < 35).length), totalFalls = sum((s) => s.falls.length);
const strikeFalls = sum((s) => s.falls.filter(f => f.move !== 'headbutt' && f.move !== 'cornerCharge').length);
const totalSec = SOAK.reduce((n, s) => n + s.gameSec, 0);
const minStamina = Math.min(...SOAK.flatMap(s => s.S.strikes.map(x => x.stamina)));
const runRows = SOAK.map((s, i) => `<tr><td>${s.pair} #${s.run}</td><td>${s.gameSec}</td><td>${Object.entries(A[i].strikes).map(([m, v]) => `${m} ${v.landed}${v.under ? ` (${v.under} under 35)` : ''}`).join(', ') || '-'}</td><td>${Object.entries(A[i].picks).map(([k, v]) => `${k} x${v}`).join(', ') || 'none'}</td><td>${s.S.stuck.length}</td><td>${s.errors.length}</td></tr>`).join('');
const landAll = {}; for (const a of A) for (const [k, v] of Object.entries(a.lands)) (landAll[k] ??= []).push(...v);
const durs = (v) => v.filter(l => l.endT != null && !l.cut).map(l => l.endT - l.t);
const landRows = Object.entries(landAll).sort().map(([k, v]) => { const d = durs(v); return `<tr><td>${esc(k)}</td><td>${v.length}</td><td>${d.length ? f1(Math.min(...d) * 1000) + ' / ' + f1(d.reduce((a, b) => a + b, 0) / d.length * 1000) + ' / ' + f1(Math.max(...d) * 1000) : '-'}</td><td>${v.filter(l => l.cut).length}</td><td>${v.filter(l => l.stamina < 25).length}</td></tr>`; }).join('');
const reasonRows = (() => { const m = {}; for (const s of SOAK) for (const f of s.falls) { const k = f.reason.replace(/\(\d+\)/, '(n)').replace(/ -> \w+$/, ''); m[k] = (m[k] ?? 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join(''); })();
const stuck = SOAK.flatMap(s => s.S.stuck.map(x => `${s.pair} #${s.run} ${x.who} ${x.state} ${x.for}s`));

// ---- misses ----------------------------------------------------------------------------------------------------------------------------------------------------
const edgeOut = E.filter(r => !r.contact.inside || !r.landing.inside), edgeSell = E.filter(r => !r.sell.inside);
const k35 = C.filter(r => r.id.startsWith('jab-at35') || r.id.startsWith('jab-under35'));
const last37 = t37.filter(t => t.col === '?falls=v1').map(t => { const s = t.steps.find(x => x.i === t.down); return `${t.v} ${f1(s.wrist / s.s)} px (shoulder ${f1(s.shoulder / s.s)}, arm ${f1(Math.abs(s.angleDeg))} deg)`; });
const off37 = t37.filter(t => t.col === 'flag off').map(t => { const s = t.steps.find(x => x.i === t.down - 1); return `${t.v} ${f1(s.wrist / s.s)} px`; });
const deadAll = PH.filter(r => r.side === 'l').reduce((n, r) => n + r.deadFrames, 0);
const misses = [
    `<b>Strike knockdowns in real play: ${strikeFalls} in ${Math.round(totalSec)} game seconds of nothing-capped AI vs AI (4 runs).</b> ${totalStrikes} strikes landed through <code>_strikeReact</code>, ${totalUnder} of them left the receiver under 35 (the lowest stamina read right after a hit was ${f1(minStamina)}). Stamina recovers in seconds and the AIs rarely wear each other down; this is the number, not retuned (the 35 line and the recovery are the game's). Derek's call: lower recovery, raise the line, or leave knockdowns as the rare worn-down event they are.`,
    `<b>Back-fall arm step (T3.7): not a seam, left alone, and it is fast.</b> At <code>?falls=v1</code> the near wrist moves ${last37.join('; ')} on the last frame into the mat (flag off: ${off37.join('; ')} on its last fall frame), nearly all of it the arm swinging back down through ~40 deg in one frame (the free-fall timing puts the keys' arm swing in the last three frames); the frame after contact is ${f1(t37[1].steps.at(-1).wrist / t37[1].steps.at(-1).s)} px. The last fall frame is the exact t = 1 pose, so nothing pops. If the slap reads too sudden, the cure is an earlier arm key, a Derek call.`,
    `<b>Supported falls (T3.8): the keys already hold the catch, nothing changed.</b> First support to the response start is ${PH.filter(r => r.side === 'l').map(r => `${r.id.replace(/-l$/, '')} ${r.gapMs} ms`).join(', ')}; ${deadAll} dead frames (no joint over 1 px/frame) anywhere in those windows. One stop-start, not a dead beat: kneesForward's fastest joint drops from 24-27 px/frame to 1.5 on the frame the knees take the weight, then eases back up over ten frames as the body folds down.`,
    `<b>Ring edge (T3.9): ${edgeOut.length ? 'misses at contact or in the landing' : 'inside the ropes at contact and through the landing in all ' + E.length + ' cases'}, ${edgeSell.length ? `but the sell outside in ${edgeSell.length}` : 'and through the sell'}.</b> ${edgeSell.length ? `The sell's writhe and clutch swing the limbs 13-18 px past the rope line in ${edgeSell.map(r => r.id).join(', ')}; that is the sell's own motion (it plays on the mat whether or not the fall fits) and was not touched. ` : ''}The slide is the overshoot plus 10 px, over the fall; George lands 2-3 px inside the rope line at contact, Lou 7, so the margin is thin: the measured reach is per rig and the lying lengths are one table.`,
    `<b>Checks of the 35 line (T3.5, real strikes):</b> ${k35.map(r => `${r.victim} ${r.note}: read ${r.hit?.stamina}, ${r.outcome}`).join('; ')}.`,
    `<b>Throws:</b> the tired rule is wired to the slam, suplex and back body drop (receiver stamina read at the impact, before its damage; unit-tested at 24 / 25 / 26). In the four soak runs ${(() => { const big = Object.entries(landAll).filter(([k]) => /^(bodySlam|suplex|backBodyDrop)/.test(k)).flatMap(([, v]) => v); return `${big.length} big-throw landings, ${big.filter(l => l.tier === 'exceptional').length} of them exceptional (receiver under 25); ` + (Object.entries(landAll).filter(([k]) => /bodySlam|suplex|backBodyDrop|piledriver/.test(k)).map(([k, v]) => `${k} x${v.length}`).join(', ') || 'no big throw landed'); })()}. The tired-throw look is the filmed pair below (24 against 26 and fresh), staged. The piledriver, hip toss and snapmare keep their own tiers.`,
    `<b>Snapmare (T3.11):</b> re-filmed through the rear atomic-drop reversal (<code>Arena._beginSnapmare</code>), both rigs, both facings; the old G2 snapmare clips were face to face and are invalid. Before (flag off) beside after below; its landing is the seated shape (T2.5g), ${SNAP.map(r => `${r.id} ${r.landingSec} s, first-frame step ${r.steps.seams[0].px} px`).join('; ')}. T2.3 audit: ${SNAP.filter(r => r.flexMisses.length).length ? SNAP.filter(r => r.flexMisses.length).map(r => `<b>${r.id}</b>: ${esc(r.flexMisses.join('; '))}`).join(' | ') + ' (the sell\'s own elbow, flag-independent, on the polish list); the Lou runs are clean' : 'clean'}. <b>Not claimed:</b> that any of it reads right.`,
    `<b>Not covered:</b> "from behind" in the cases is a receiver turned away on the hit frame (staged by setting his facing there, no lock); in the soak the AIs produced ${sum((s) => s.falls.filter(f => /behind/.test(f.reason)).length)} from-behind picks. The match clip of G3 is superseded by the soak numbers. ${checks ? `<b>Checks:</b> ${checks}` : ''}`,
];

// ---- snapmare cells -----------------------------------------------------------------------------------------------------------------------------------------
const snapDir = (set) => (set === 'after' ? 'g3/snapmare' : 'g3/snapmare-before');
const snapCells = VICT.flatMap(v => ['l', 'r'].map(s => ['before', 'after'].map(set => { const id = `snapmare-${v}-${s}`; if (!existsSync(`${root}/${snapDir(set)}/rows-${id}.json`)) return ''; const rows = rowsOf(snapDir(set), id), down = rows.findIndex((r, i) => i > 0 && r.d.state === 'down' && rows[i - 1].d.state !== 'down'); return cell(`../${snapDir(set)}/frames/${id}`, rows.length, [{ at: down, len: 20, label: 'DOWN' }], `${set === 'before' ? 'before (flag off)' : 'after (?falls=v1)'}: ${id}`, 1, true); }).join(''))).join('');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G3 r2: wiring and evidence</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1500px;margin:0 auto;padding:16px}table{border-collapse:collapse;font-size:12px;margin:6px 0}td,th{border:1px solid #333;padding:3px 6px;vertical-align:top;text-align:left}.c{display:inline-block;margin:2px;vertical-align:top}.c canvas{background:#000;display:block}.cap{font-size:11px;color:#aaa;max-width:300px}.note{border:1px solid #555;padding:8px 12px;margin:10px 0;background:#1a1a1a}.strip{display:flex;flex-wrap:wrap;gap:2px}.strip img{background:#000;display:block}.bad{color:#f88}code{color:#9cf}h3{margin:14px 0 4px}</style>
<h1>Falls G3 r2: wiring and evidence (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek:</b> G3 built the selector; this page is the wiring and the proof. Strikes are read at the hit (T3.5), tired throws land exceptional (T3.6), the back fall's arm step and the supported falls' phases are measured (T3.7, T3.8), a fall that does not fit the ring slides him inward (T3.9), the numbers from four uncapped AI-vs-AI runs (T3.10), and the snapmare re-filmed from the rear (T3.11). Decide: the knockdown rule given how rarely it fires, the back-fall arm slap, and whether the falls go standard. <b>Not claimed:</b> that any of it reads right. Speed: <label><input type="radio" name="sp" value="1" checked> normal</label> <label><input type="radio" name="sp" value="0.25"> 0.25x</label></div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>T3.5: read at the hit (real strikes, no facing lock)</h2>${caseCells}
<h2>T3.6: tired vs fresh body slam (receiver's stamina before the damage)</h2>${slamCells}
<h2>T3.7: the backward fall's last frames</h2>
<table><tr><th>rig</th><th>build</th><th>frame -2</th><th>frame -1</th><th>last into the mat (down)</th><th>next frame</th></tr>${t37Rows}</table>
<p class="cap" style="max-width:none">Near wrist step per frame, px at s = 1, split into the shoulder's own move and the arm's angle change. Ten frames up to the mat, both rigs, flag off then candidate:</p>
${t37.map(t => `<h3>${t.v}, ${t.col}</h3>${strip37(t)}`).join('')}
<h2>T3.8: the supported falls' phases</h2>
<table><tr><th>fall</th><th>first support by</th><th>frame</th><th>response start</th><th>gap</th><th>dead frames</th><th>max joint speed, px/frame, through the gap</th></tr>${phaseTable}</table>${phaseCells}
<h2>T3.9: no fall fits the ring: slid inward (rope 40 px behind him)</h2>
<table><tr><th>case</th><th>fall</th><th>x, start -> down</th><th>ropes at his y</th><th>margin at contact</th><th>margin in the landing</th><th>margin in the sell</th></tr>${edgeTable}</table>
<p class="cap" style="max-width:none">Margin = the smaller gap between the lying body's furthest joint and the rope line (px; negative = through the rope). The landing is the 20 frames after contact; the sell is what follows.</p>${edgeCells}
<h2>T3.10: four uncapped AI-vs-AI runs (${Math.round(totalSec)} game s)</h2>
<table><tr><th>run</th><th>game s</th><th>landed strikes (under 35 after the hit)</th><th>falls by move and pick</th><th>stuck states</th><th>page errors</th></tr>${runRows}</table>
<p>Totals: ${totalStrikes} landed strikes, ${totalUnder} left the receiver under 35, ${totalFalls} falls from standing (${strikeFalls} from strikes that were not the headbutt or corner charge). Stamina is read right after the damage.</p>
<table><tr><th>landing</th><th>count</th><th>landing to earliest legal pin, ms (min / mean / max)</th><th>cut short by a pick-up</th><th>receiver under 25</th></tr>${landRows}</table>
<table><tr><th>pick reason (stamina bucket n)</th><th>count</th></tr>${reasonRows}</table>
<p class="cap" style="max-width:none">Stuck states: ${stuck.length ? stuck.join('; ') : 'none'}. The suplex's two-body cleanup under interruption is a unit test (<code>tests/falls.test.js</code>: cut before the hit, at the hit, and after both landed).</p>
<h2>T3.11: the snapmare from the rear reversal</h2>${snapCells}
<script>
let speed = 1;
for (const r of document.querySelectorAll('input[name=sp]')) r.onchange = () => { speed = +r.value; };
const pad = (i) => String(i).padStart(4, '0');
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !e.target._on) start(e.target); }, { rootMargin: '200px' });
function start(c) { c._on = true; const n = +c.dataset.n, off = +c.dataset.off || 0, ctx = c.getContext('2d'), imgs = [], marks = JSON.parse(c.dataset.marks || '[]');
  for (let i = 0; i < n; i++) { const im = new Image(); im.src = c.dataset.dir + '/s' + pad(i + off) + '.jpg'; imgs.push(im); }
  let k = 0, acc = 0, last = performance.now();
  (function tick(now) { acc += (now - last) * speed; last = now; while (acc >= 1000 / 60) { acc -= 1000 / 60; k = (k + 1) % n; }
    const im = imgs[k]; if (im.complete && im.naturalWidth) { ctx.drawImage(im, 0, 0, c.width, c.height); ctx.fillStyle = '#ff0'; ctx.font = '12px system-ui'; let y = 14;
      for (const m of marks) if (k >= m.at && k < m.at + m.len) { ctx.fillText(m.label, 6, y); y += 14; } }
    requestAnimationFrame(tick); })(last); }
for (const c of document.querySelectorAll('canvas[data-dir]')) io.observe(c);
</script></html>`;
writeFileSync(`${root}/g3/r2.html`, html);
console.log('wrote', `${root}/g3/r2.html`);
