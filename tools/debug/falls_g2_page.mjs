// PLAN_FALLS T2.7: the G2 page. Every path to the mat, before (flag off, T0 rows in falls-2026-11/before) beside after (?falls=v1, falls-2026-11/g2/after = Lou throws / George goes down, after-gl =
// George throws / Lou goes down, spill = ?falls=v1&spill=1), normal speed and 0.25x loops, the D4 pelvis curve per fall from standing, the T2.3 table, misses first.
//   node tools/debug/falls_g2_page.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = 'research/animation/falls-2026-11';
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, 'utf8'));
const dirOf = (id, set = 'after') => (set === 'before' ? 'before' : id.includes('-george-') ? 'g2/after' : 'g2/after-gl');
const f1 = (v) => (v == null ? '-' : (+v).toFixed(1));
const PATHS = ['backward', 'sitBack', 'forward', 'kneesForward', 'flip', 'bodySlam', 'hipToss', 'snapmare', 'suplex', 'piledriver'];
const EVENT = { bodySlam: 1.08, suplex: 1.28, hipToss: 0.62, snapmare: 0.405, piledriver: 1.24 };
const victims = ['lou', 'george'], sides = ['l', 'r'];
const A = [...read('g2/after/audit.json'), ...read('g2/after-gl/audit.json'), ...read('g2/spill/audit.json')];
const atk = existsSync(`${root}/g2/suplex-attacker-audit.json`) ? read('g2/suplex-attacker-audit.json') : [];
const SUM = { after: read('g2/after/summary.json'), afterGl: read('g2/after-gl/summary.json'), before: read('before/summary.json'), spill: read('g2/spill/summary.json') };
const getA = (id) => A.find(r => r.id === id);
const sumRun = (S, id) => S.runs.find(r => r.id === id);
const rowsOf = (dir, id) => read(`${dir}/rows-${id}.json`);
const hipH = (r) => (r.d.y - (r.d.pts.nearHip.y + r.d.pts.farHip.y) / 2) / r.d.s;
const step = (rs, i, k) => Math.hypot(rs[i].d.pts[k].x - rs[i - 1].d.pts[k].x, rs[i].d.pts[k].y - rs[i - 1].d.pts[k].y) / rs[i].d.s;
const maxStep = (rs, i) => Math.max(...Object.keys(rs[i].d.pts).map(k => step(rs, i, k)));
const sumFor = (id) => (id.includes('-george-') ? SUM.after : SUM.afterGl);

// ---- D4 per fall: the unsupported interval (probe) and the pelvis curve before and after -----------------------------------------------------
const FALLS = ['backward', 'sitBack', 'forward', 'kneesForward', 'spill'];
const d4id = (p, v) => `${p}-${v}-l`;
const d4row = (p, v) => { const id = d4id(p, v), r = p === 'spill' ? sumRun(SUM.spill, id) : sumRun(sumFor(id), id), q = r?.m.d4; return q ? { id, ...q, hop: r.m.bounce.peakPx } : null; };
const curve = (rows, from, to) => { const out = []; for (let i = from; i <= to; i++) out.push(hipH(rows[i])); return out; };
const svgCurve = (p) => {
    const W = 330, H = 140, mx = 0.62, mxMs = 700, lines = [];
    const add = (rows, start, contact, cls) => { const hs = curve(rows, start, Math.min(rows.length - 1, contact + 4)); lines.push({ cls, pts: hs.map((h, i) => [i / 60 * 1000, h]) }); };
    for (const v of victims) {
        const id = d4id(p, v), S = p === 'spill' ? SUM.spill : sumFor(id), r = sumRun(S, id); if (!r) continue;
        const rows = rowsOf(p === 'spill' ? 'g2/spill' : dirOf(id), id); add(rows, r.m.start, r.m.contact, `a-${v}`);
        if (p !== 'spill') { const b = sumRun(SUM.before, id), brows = rowsOf('before', id); add(brows, b.m.start, b.m.contact, `b-${v}`); }
    }
    const X = (ms) => 28 + ms / mxMs * (W - 36), Y = (h) => H - 18 - h / 140 * (H - 30);
    const body = lines.map(l => `<polyline class="${l.cls}" fill="none" points="${l.pts.map(([ms, h]) => `${X(ms).toFixed(1)},${Y(h).toFixed(1)}`).join(' ')}"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#181818"/><line x1="28" y1="${Y(0)}" x2="${W - 8}" y2="${Y(0)}" stroke="#444"/><text x="4" y="${Y(137) + 4}" fill="#888" font-size="9">137</text><text x="4" y="${Y(0) + 3}" fill="#888" font-size="9">0</text><text x="${W - 70}" y="${H - 4}" fill="#888" font-size="9">ms from balance lost</text>${body}</svg>`;
};

// ---- misses ----------------------------------------------------------------------------------------------------------------------------
const d4all = FALLS.flatMap(p => victims.map(v => d4row(p, v))).filter(Boolean);
const d4Fails = d4all.filter(q => q.ratioStanding < 0.8 || q.ratioStanding > 1.2 || q.decreasingSteps > 1 || !q.fastestIsLastTwo);
const firstFrame = (set, id) => { const S = set === 'before' ? SUM.before : sumFor(id), r = sumRun(S, id), rows = rowsOf(set === 'before' ? 'before' : dirOf(id), id); return f1(maxStep(rows, r.m.start)); };
const lastFrame = (id) => { const r = sumRun(sumFor(id), id), rows = rowsOf(dirOf(id), id); return f1(maxStep(rows, r.m.contact)); };
const flexMiss = A.concat(atk).filter(r => r.flexMisses.length).map(r => `${r.id}: ${r.flexMisses.join('; ')}`);
const clamps = A.concat(atk).filter(r => Object.values(r.clampHits).some(v => v)).map(r => `${r.id} ${JSON.stringify(r.clampHits)}`);
const landTable = (ids) => ids.map(id => `${id.replace(/-l$/, '')} ${getA(id)?.landingSec} s`).join(', ');

const misses = [
    `<b>The fall from standing used to start with a pop, and still starts with a smaller one.</b> Flag off, the first frame of every fall from standing jumps the whole body down about 68 px (the grounded key for "standing" sits lower than the upright draw; the feet go below the mat line): the biggest joint step on that frame, px at s = 1, was ${['backward-lou-l', 'sitBack-lou-l', 'forward-george-l'].map(id => `${id.split('-').slice(0, 2).join(' ')} ${firstFrame('before', id)}`).join(', ')}. Under <code>?falls=v1</code> the fall now draws from the rig's real standing channels (<code>_riseStand</code>, as the quick rise does), and the same frame reads ${['backward-lou-l', 'sitBack-lou-l', 'forward-george-l'].map(id => `${id.split('-').slice(0, 2).join(' ')} ${firstFrame('after', id)}`).join(', ')}. Not zero: the standing channels and the upright draw still differ at the wrists (the old "known handoff gap").`,
    `<b>D4 (gravity), unsupported interval only: ${d4Fails.length ? 'misses' : 'all pass on both rigs'}.</b> ${d4Fails.length ? d4Fails.map(q => `${q.id} ratio ${q.ratioStanding}, violations ${q.decreasingSteps}, fastest frame last-two ${q.fastestIsLastTwo}`).join('; ') : 'ratio of the fall time to free fall from the standing pelvis height is within 0.8-1.2, per-frame drop never decreases (one frame of noise allowed), the fastest frame is the last or second-to-last before contact.'} A single "frames where the drop shrank" is the frame the knees take the weight (kneesForward); one is allowed. Retimed: backward / forward / sitBack / spill 0.40 s (was 0.52 / 0.48 / 0.70 / n.a.), kneesForward 0.33 s free fall plus 0.30 s folding down on the knees (was 0.72 s). The pelvis barely moves in the first 0.2 s (free fall from rest): they stand, then go.`,
    `<b>The last frame of the backward and sitBack falls is fast in the arms:</b> biggest joint step on the contact frame, px at s = 1: ${['backward-lou-l', 'backward-george-l', 'sitBack-lou-l', 'forward-lou-l'].map(id => `${id.replace(/-l$/, '')} ${lastFrame(id)}`).join(', ')} (flag off: backward lou 19.8). The keys now ride the pelvis's free fall, so the arms' slap-out lands in the last two frames. That is the impact's velocity, not a seam, and it is a number to look at: if the slap reads too sudden, the cure is a slower key for the arms.`,
    `<b>Backward fall hop (target 6-10 px):</b> ${['lou', 'george'].map(v => `${v} ${f1(d4row('backward', v)?.hop)} px`).join(', ')} (was 3.1-4.0); the closing speed is now free fall's (684 px/s), the headbutt's intensity is the default 0.6. Just under 6; it grows with a harder hit's intensity.`,
    `<b>T2.3 audit on the new paths, both limits, no tolerance:</b> ${flexMiss.length ? flexMiss.join(' | ') : 'no knee or elbow outside its limit on any row'}; frames pinned at a limit (clamp hits): ${clamps.length ? clamps.join(', ') : 'none'}. The sell's own elbows (George) vary run to run and are not the landing's.`,
    `<b>Tiers by move (Opus's proposal, Derek decides here):</b> body slam, suplex and back body drop heavy; piledriver exceptional; hip toss, snapmare (seated), arm drag and the clothesline / dropkick / dive flips r2. <code>?slamTier=r2|heavy|exceptional</code> overrides the slam only. Rig scale: George's hop x0.775, so drawn hops are Lou / George: ${['lou', 'george'].map(v => `slam ${f1(getA(`bodySlam-${v}-l`)?.rebound.firstHop?.drawnPx)}`).join(' / ')} px (heavy target 11-12), piledriver ${['lou', 'george'].map(v => f1(getA(`piledriver-${v}-l`)?.rebound.firstHop?.drawnPx)).join(' / ')} px (exceptional target 14-16).`,
    `<b>Landing length (runtime), left facing:</b> ${landTable(['bodySlam-lou-l', 'suplex-george-l', 'hipToss-george-l', 'snapmare-george-l', 'piledriver-lou-l', 'flip-lou-l', 'backward-lou-l', 'forward-lou-l', 'kneesForward-lou-l', 'sitBack-lou-l'])}. The pin/AI block is the landing's length; every one is shorter than r2's slam landing (0.72 s).`,
    `<b>Not covered / carried:</b> the atomic drop has no landing by design; the head and wrists have no channel (no head lag); the spill is keys only and still behind <code>&amp;spill=1</code>; the AI never picks a fall by situation yet (Stage 3). The suplex attacker's bump is audited separately (${atk.map(r => `${r.id} hop ${f1(r.rebound.firstHop?.drawnPx)} px`).join('; ') || 'not run'}). <b>Not claimed:</b> that any of it reads right.`,
];

// ---- tables and loops ----------------------------------------------------------------------------------------------------------------
const d4Table = d4all.map(q => `<tr><td>${q.id}</td><td>${q.unsupportedFrames} f / ${q.sec} s</td><td>${q.freeFromStandingSec} s</td><td><b>${q.ratioStanding}</b> (drop ${q.ratioDrop})</td><td>${q.decreasingSteps}</td><td>${q.fastestIsLast ? 'last' : q.fastestIsLastTwo ? 'second-to-last' : 'no'}</td><td>${q.supportedTailDropsPx?.length ? q.supportedTailDropsPx.slice(0, 8).join(' ') : '-'}</td></tr>`).join('');
const auditRows = [...PATHS.flatMap(p => victims.flatMap(v => sides.map(s => `${p}-${v}-${s}`))), ...['lou', 'george'].flatMap(v => sides.map(s => `spill-${v}-${s}`))].map(id => getA(id)).filter(Boolean).concat(atk);
const aTable = auditRows.map(a => { const hop = a.rebound.firstHop; return `<tr><td>${a.id}</td><td>${a.landingSec} s</td><td>${hop ? `${hop.commandedPx} / ${f1(hop.drawnPx)}` : '-'}</td><td>${a.hands.near.class}</td><td>${a.hands.far.class}</td><td>${a.flexMax.nearKnee}, ${a.flexMax.farKnee}</td><td>${a.flexMin.nearElbow}, ${a.flexMin.farElbow}</td><td>${a.flexMax.nearElbow}, ${a.flexMax.farElbow}</td><td>${a.steps.seams[0].px}</td><td>${a.steps.impactWindow.px}</td><td>${a.steps.afterImpactToRest.px}</td></tr>`; }).join('');
const marksFor = (p, id, set) => {
    if (set === 'before') { const rows = rowsOf('before', id), d = rows.findIndex((r, i) => i > 0 && r.d.state === 'down' && rows[i - 1].d.state !== 'down'); return { contact: d, label: 'DOWN' }; }
    const a = getA(id), rows = rowsOf(p === 'spill' ? 'g2/spill' : dirOf(id), id), hit = EVENT[p] ? rows.findIndex(r => r.ct != null && r.ct >= EVENT[p] - 0.0001) : null;
    return { hit, contact: a.contact, apex: a.rebound.firstHop?.peakFrame ?? null, recontact: a.rebound.firstHop?.recontactFrame ?? null };
};
const cell = (p, id, set, tag) => { const dir = set === 'before' ? 'before' : p === 'spill' ? 'g2/spill' : dirOf(id); return `<div><canvas data-dir="../${dir}/frames/${id}" data-n="${rowsOf(dir, id).length}" data-marks='${JSON.stringify(marksFor(p, id, set))}' width="560" height="330"></canvas><div class="cap">${tag}: ${id}</div></div>`; };
const loops = [...PATHS, 'spill'].map(p => {
    const vs = p === 'spill' ? ['lou'] : victims, ss = p === 'spill' ? ['l'] : sides;
    return `<h3>${p}${p === 'spill' ? ' (concept, <code>&amp;spill=1</code>, no before)' : ''}</h3><div class="pairrow">${vs.flatMap(v => ss.map(s => { const id = `${p}-${v}-${s}`; return (p === 'spill' ? '' : cell(p, id, 'before', 'before (flag off)')) + cell(p, id, 'after', 'after'); })).join('')}</div>`;
}).join('');
const curves = FALLS.map(p => `<div><div class="cap"><b>${p}</b>: pelvis height from balance lost (px at s = 1). Solid = after (green Lou, blue George), dashed = before</div>${svgCurve(p)}</div>`).join('');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Falls G2: every path</title><style>:root{color-scheme:dark}body{font:14px/1.45 system-ui;background:#111;color:#ddd;max-width:1240px;margin:0 auto;padding:16px}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid #333;padding:3px 6px;text-align:right}td:first-child{text-align:left}.pairrow,.curves{display:flex;flex-wrap:wrap;gap:8px}canvas{background:#222;display:block;max-width:100%}.cap{font-size:12px;color:#999}.note{background:#222;padding:8px 12px;border-radius:6px}label{margin-right:12px}polyline{stroke-width:1.6}.a-lou{stroke:#6c6}.a-george{stroke:#69f}.b-lou{stroke:#6c6;stroke-dasharray:4 3;opacity:.7}.b-george{stroke:#69f;stroke-dasharray:4 3;opacity:.7}</style>
<h1>Falls G2: every path to the mat, before and after (<code>?falls=v1</code>)</h1>
<div class="note"><b>For Derek:</b> every fall and throw landing, flag off on the left, <code>?falls=v1</code> on the right; both rigs as the man who goes down, both facings. DOWN / HIT / CONTACT / APEX / RE-CONTACT are marked. Decide: the tier per move, whether the falls go standard (today still opt-in), and anything that reads wrong. <b>Not claimed:</b> that any of it reads right. Speed: <label><input type="radio" name="sp" value="1" checked> normal</label><label><input type="radio" name="sp" value="0.25"> 0.25x</label></div>
<h2>Misses first</h2><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>D4: gravity on the fall from standing (unsupported interval)</h2><div class="curves">${curves}</div>
<table><tr><th>fall</th><th>unsupported</th><th>free fall from the standing pelvis</th><th>ratio</th><th>frames where the drop shrank</th><th>fastest frame</th><th>supported tail drops px/frame</th></tr>${d4Table}</table>
<h2>T2.3 table (px at scale 1; hop = commanded / drawn)</h2>
<table><tr><th>run</th><th>landing</th><th>first hop / push</th><th>near hand</th><th>far hand</th><th>knee max (n, f)</th><th>elbow min (n, f)</th><th>elbow max (n, f)</th><th>first-frame step</th><th>max step in impact 0.2 s</th><th>after it</th></tr>${aTable}</table>
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
      const tags = []; if (m.hit != null && m.hit >= 0 && k === m.hit) tags.push('HIT'); if (k === m.contact) tags.push(m.label || 'CONTACT'); if (m.apex != null && Math.abs(k - m.apex) <= 1) tags.push('APEX'); if (m.recontact != null && Math.abs(k - m.recontact) <= 1) tags.push('RE-CONTACT'); if (tags.length) ctx.fillText(tags.join(' '), 8, 20); }
    requestAnimationFrame(tick); })(last); }
for (const c of document.querySelectorAll('canvas')) io.observe(c);
</script></html>`;
writeFileSync(`${root}/g2/index.html`, html);
console.log('wrote', `${root}/g2/index.html`);
