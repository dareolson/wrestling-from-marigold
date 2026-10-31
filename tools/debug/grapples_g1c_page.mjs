// G1c page (PLAN_GRAPPLES T1.14): strips first (G1b | new, normal speed), the misses from the data, then the table, the exits and the manifest.
//   node tools/debug/grapples_g1c_page.mjs
// reads g1c/film.json (flag on; cases a, c, d2, shove, both pairs, both facings), g1c/exits.json (grapples_legs_phases.mjs exits),
// g1c-a/baseline-g1b-*.json (G1b leg measures, case a only: the metric definitions have not changed since T1.11) and g1b/film.json (G1b strips and hands).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { LOCKUP, LOCKUP_POSES, breakKind } from '../../src/animation/lockup.js';

const base0 = 'research/animation/grapples-2026-10', root = `${base0}/g1c`, aRoot = `${base0}/g1c-a`, g1bRoot = `${base0}/g1b`;
const film = JSON.parse(readFileSync(`${root}/film.json`, 'utf8')).runs.filter(r => r.column === 'new' && r.case !== 'e');
const g1bFilm = JSON.parse(readFileSync(`${g1bRoot}/film.json`, 'utf8')).runs.filter(r => r.column === 'new');
const baseFile = readdirSync(aRoot).find(f => f.startsWith('baseline-g1b'));
const base = JSON.parse(readFileSync(`${aRoot}/${baseFile}`, 'utf8'));
const exits = JSON.parse(readFileSync(`${root}/exits.json`, 'utf8')).filter(r => r.kind === 'exit');
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const shoveSeed = (() => { for (let k = 1; ; k++) if (breakKind(k, false) === 'shove') return k; })();
const manifest = {
    commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain -- src tools tests').length > 0, branch: sh('git branch --show-current'),
    g1bBaseline: `${baseFile} (leg measures, case a); strips and hand errors from g1b/film.json (ea8c542)`,
    rigs: 'thesz-procreate-v1 (Lou), george-roster-v1 (George)', flags: 'grapples=v1 only (flag off proven identical by the fixture)', seed: 11, shoveSeed,
    cases: { a: 'no input to the timeout and the break (seed 11: a shove ending)', c: 'the defender presses grapple at frame 42 (the steal)', d2: 'defender 40 px from the rope behind him (stall, rope break)', shove: `seed ${shoveSeed}` },
    constants: { LOCKUP_POSES, legGain: LOCKUP.legGain, holdGap: LOCKUP.holdGap, engageEnd: LOCKUP.engageEnd, timeout: LOCKUP.timeout, breakRelease: LOCKUP.breakRelease, breakBendRelease: LOCKUP.breakBendRelease },
    measures: 'unchanged since T1.11 (leg measures, px at s = 1); trunks masks every third frame; geometry every frame',
};
const NAME = { 'lou-george': ['Lou', 'George'], 'george-lou': ['George', 'Lou'] }, F = { l: 'facing left', r: 'facing right' };
const CASE = { a: 'even / drive / break (no input)', c: 'steal', d2: 'stall and rope break', shove: 'shove' };
const PH = ['engage', 'even', 'drive', 'steal', 'stall', 'break'];
const lo = (a, b) => a < b, hi = (a, b) => a > b;
const worst = (sumSide, key, pick) => { let w = null; for (const ph of PH) { const x = sumSide?.[ph]?.[key]; if (x && (!w || pick(x.v, w.v))) w = { ...x, ph }; } return w; };
const MEASURES = [['kneeLine', 'knee line (px, >= -0.5)', lo], ['ankleStagger', 'ankle stagger (px, >= 20)', lo], ['kneeStagger', 'knee stagger (px, >= 14)', lo], ['soleDelta', 'planted sole vs idle (px, <= 1.5)', hi], ['trunksDelta', 'trunks share vs idle (points, <= 10)', hi], ['snapHip', 'hip angle step (rad/frame)', hi], ['snapKnee', 'knee line step (px/frame)', hi]];
const limit = { kneeLine: (v) => v < -0.5, ankleStagger: (v) => v < 20, kneeStagger: (v) => v < 14, soleDelta: (v) => v > 1.5, trunksDelta: (v) => v > 10 };
const fmt = (w) => (w ? `${w.v} <small>${w.ph} f${w.i}${w.leg ? ' ' + w.leg : ''}</small>` : '&ndash;');
const id = (c, pair, f) => `${c}-${pair}-${f}`;

let strips = '', rows = '', misses = [], fixed = [];
for (const c of ['a', 'c', 'd2', 'shove']) {
    strips += `<h3>${CASE[c]}</h3>`;
    for (const pair of ['lou-george', 'george-lou']) for (const f of ['r', 'l']) {
        const n = film.find(r => r.id === id(c, pair, f)), o = g1bFilm.find(r => r.id === id(c, pair, f));
        if (!n) continue;
        const [A, D] = NAME[pair];
        strips += `<h4>${A} attacking ${D}, ${F[f]}</h4><div class="pair">${o ? `<div><canvas data-dir="../g1b/frames/new/${id(c, pair, f)}" data-n="${o.frames}" width="380" height="330"></canvas><div class="cap">G1b (ea8c542)</div></div>` : '<div class="cap">no G1b strip for this case</div>'}<div><canvas data-dir="frames/new/${id(c, pair, f)}" data-n="${n.frames}" width="380" height="330"></canvas><div class="cap">now</div></div></div>`;
        const b = c === 'a' ? base.find(r => r.pair === pair && r.facing === (f === 'r' ? 1 : -1)) : null;
        for (const side of ['a', 'd']) {
            const man = side === 'a' ? `${A} (attacker)` : `${D} (defender)`;
            rows += `<tr><th colspan="3">${CASE[c]}: ${man}, ${pair}, ${F[f]}</th></tr>`;
            for (const [k, label, pick] of MEASURES) {
                const w0 = b ? worst(b.summary[side], k, pick) : null, w1 = worst(n.legs[side], k, pick);
                rows += `<tr><td>${label}</td><td>${b ? fmt(w0) : 'not measured'}</td><td class="${w1 && limit[k]?.(w1.v) ? 'bad' : ''}">${fmt(w1)}</td></tr>`;
                if (b && w0 && limit[k]?.(w0.v) && !(w1 && limit[k](w1.v))) fixed.push(`${A} v ${D}, ${F[f]}: ${man} ${label.split(' (')[0]}: G1b ${w0.v} (${w0.ph} f${w0.i}), now ${w1?.v} (${w1?.ph} f${w1?.i})`);
            }
        }
        for (const x of n.legFails) misses.push(`${CASE[c]}, ${A} v ${D}, ${F[f]}: ${x.side === 'a' ? A : D} ${x.measure} ${x.value} in ${x.phase} (frame ${x.i}${x.leg ? ', ' + x.leg + ' leg' : ''})`);
        for (const [k, v] of Object.entries(n.handErr ?? {})) if (v > 3) misses.push(`${CASE[c]}, ${A} v ${D}, ${F[f]}: hand ${k} ${v} px off (${n.contactMisses?.[k]} frames over 3 px${o?.handErr ? `; G1b ${o.handErr[k]}` : ''}). D12 / D13 beat the contact, so it stays.`);
        for (const ph of PH) { const p = n.byPhase?.[ph]; if (p?.belowBody > 0) misses.push(`${CASE[c]}, ${A} v ${D}, ${F[f]}: D12, ${p.belowBody} px of leg/pelvis overlap in the ${ph}, worst masked sample, every third frame${o?.byPhase?.[ph] ? ` (G1b ${o.byPhase[ph].belowBody})` : ''}`); }
        if (n.plantedSlide > 2.5) misses.push(`${CASE[c]}, ${A} v ${D}, ${F[f]}: planted foot slide ${n.plantedSlide} px/frame`);
    }
}
const leftover = exits.filter(r => r.atExit?.length || r.plus6?.length);
const exitRows = exits.map(r => `<tr><td>${r.pair}</td><td>${r.exit}</td><td>${r.facing > 0 ? 'right' : 'left'}</td><td>${r.exitFrame}</td><td class="${r.atExit?.length ? 'bad' : ''}">${r.atExit?.length ? r.atExit.join(' ') : 'none'}</td><td class="${r.plus6?.length ? 'bad' : ''}">${r.plus6?.length ? r.plus6.join(' ') : 'none'}</td><td>${r.plus120?.length ? r.plus120.join(' ') + ' <small>move\'s own</small>' : 'none'}</td></tr>`).join('');
const uniq = [...new Set(misses)], fixedU = [...new Set(fixed)];
const html = `<!doctype html><meta charset="utf-8"><title>G1c: legs that are legs</title>
<style>:root{--bg:#1c1c1c;--fg:#ddd;--panel:#2a2a2a;--line:#444}body{font:14px system-ui;margin:20px;background:var(--bg);color:var(--fg);max-width:1240px}h3{margin:22px 0 4px;color:#9ad}h4{margin:12px 0 4px;color:#cde;font-weight:600}.pair{display:flex;gap:10px;flex-wrap:wrap}.cap{font-size:12px;color:#aaa;max-width:380px}canvas{background:#000;display:block;max-width:100%}.note{background:var(--panel);padding:8px 12px;border-left:3px solid #c84;margin:10px 0}table{border-collapse:collapse;font-size:12px}td,th{border:1px solid var(--line);padding:3px 7px;text-align:right}th{background:var(--panel)}td:first-child{text-align:left}button{font:inherit;padding:4px 10px}.bad{color:#f96}small{color:#999}pre{background:var(--panel);padding:8px;overflow:auto;font-size:12px}</style>
<h1>G1c: legs that are legs</h1><div class="note"><b>For Derek to judge.</b> The stance you accepted at G1c-a, now through every phase (engage, even, drive, steal, stall, rope break, shove, break) and out through every exit. Nothing here says the legs look right; the numbers are proxies for D13 and D12. Strips run at normal speed, every case, both rigs attacking, both facings.</div>
<p><button id="pp">pause</button> <button id="sl">slow (0.25&times;)</button></p>
<h2>Strips: G1b | now</h2>${strips}
<h2>Misses (from the data)</h2><ul>${uniq.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>G1b misses that now pass</h2><ul>${fixedU.map(m => `<li>${m}</li>`).join('')}</ul>
<h2>Worst of each measure (px at scale 1; frame and phase beside each)</h2><p>G1b leg measures exist for case a only (re-measured with the T1.11 definitions, which have not changed). Geometry every frame; trunks masks every third frame.</p>
<table><tr><th>measure</th><th>G1b</th><th>now</th></tr>${rows}</table>
<h2>Exits: lockup shins left on either man</h2><p>Every exit move, both rigs, both facings, fresh launch each. lShin / rShin are the lockup's keys. ${leftover.length ? `<b class="bad">${leftover.length} exits still leave one.</b>` : 'None left at the exit frame or 6 frames later.'} The last column is whatever the move itself writes 120 frames on.</p>
<table><tr><th>pair</th><th>exit</th><th>facing</th><th>exit frame</th><th>at exit</th><th>+6 frames</th><th>+120 frames</th></tr>${exitRows}</table>
<h2>Manifest</h2><pre>${JSON.stringify(manifest, null, 1)}</pre>
<script>const cvs=[...document.querySelectorAll('canvas')];let paused=false,rate=1;const imgs=cvs.map(c=>Array.from({length:+c.dataset.n},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}));let f=0,last=0;function tick(t){if(!paused&&t-last>=1000/60/rate){last=t;cvs.forEach((c,k)=>{const a=imgs[k],im=a[f%a.length];if(im.complete)c.getContext('2d').drawImage(im,0,0)});f++}requestAnimationFrame(tick)}
requestAnimationFrame(tick);document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};document.getElementById('sl').onclick=e=>{rate=rate===1?0.25:1;e.target.textContent=rate===1?'slow (0.25\\u00d7)':'normal speed'};</script>`;
writeFileSync(`${root}/index.html`, html);
console.log('wrote', `${root}/index.html`, uniq.length, 'misses,', fixedU.length, 'G1b misses now passing,', leftover.length, 'exits with a leftover');
