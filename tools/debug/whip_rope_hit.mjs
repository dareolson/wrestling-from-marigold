// Rope hit (PLAN_GRAPPLES T3c.5): real lockup input, whip to a side rope with the receiver at a set stamina, grapples=v1.
// Measures recoil length, dx travel, the flip frame's step and the rope press, then films the strip for the page.
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/whip_rope_hit.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
const root = 'research/animation/whip-2026-10';
mkdirSync(root, { recursive: true });
const press = (d) => Math.min(1, Math.max(0, (34 - d) / 14));   // Arena._ropePresses
const stepOf = (p, q) => { let m = 0; p.parts.forEach((a, i) => { if (!a.vis || !q.parts[i].vis) return; a.c.forEach((c, j) => { m = Math.max(m, Math.hypot(c[0] - q.parts[i].c[j][0], c[1] - q.parts[i].c[j][1])); }); }); return m; };
// The flip mirrors the sprite about his x, so corner steps read ~150 px for any still figure. The pose pop is the step between
// part centres once the previous frame is mirrored about x: what the turn changes beyond the mirror.
const centre = (a) => [a.c.reduce((t, c) => t + c[0], 0) / 4, a.c.reduce((t, c) => t + c[1], 0) / 4];
const mirrorStep = (p, q) => { let m = 0; p.parts.forEach((a, i) => { if (!a.vis || !q.parts[i].vis) return; const [px, py] = centre(a), [qx, qy] = centre(q.parts[i]); m = Math.max(m, Math.hypot(2 * q.x - px - qx, py - qy)); }); return m; };
const runs = [], types = [];
const CASES = [['fresh', 100], ['worn', 20]];
const TYPE_STAMINA = [100, 60, 40, 20, 5];
for (const [pair, att, def] of [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL);
        const clip = { x: info.box.x, y: info.box.y, width: info.box.w, height: info.box.h };
        const jobs = [];
        for (const dirKey of ['left', 'right']) for (const [label, st] of CASES) jobs.push({ dirKey, label, st, film: true });
        for (const st of TYPE_STAMINA) jobs.push({ dirKey: 'right', label: `s${st}`, st, film: false });
        for (const { dirKey, label, st, film } of jobs) {
            const id = `${pair}-rope-${dirKey}-${label}`;
            await h.page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            const dir = `${root}/rope-frames/${id}`;
            if (film) mkdirSync(dir, { recursive: true });
            const rows = [];
            let shots = 0;
            for (let i = 0; i < 300; i++) {
                if (i === 47) await h.page.evaluate((s) => { window.__WFM_GAME.scene.scenes[0].w2.stamina = s; }, st);
                const row = await h.page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [] }, hold: { a: i === 48 ? [dirKey] : [] } });
                const extra = await h.page.evaluate(() => { const d = window.__WFM_GAME.scene.scenes[0].w2; return { phase: d.runPhase ?? null, stamina: d.stamina, runFacing: d.runFacing }; });
                rows.push({ ...row.d, ...extra, parts: row.d.parts });
                if (film && i >= 42 && i < 250 && i % 2 === 0) { await h.page.screenshot({ path: `${dir}/s${String(shots).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 75, clip }); shots++; }
            }
            const a = rows.findIndex(r => r.phase === 'ropeRecoil');
            const f = rows.findIndex((r, i) => i > a && r.phase === 'returning');
            if (a < 0 || f < 0) { console.log({ id, error: 'no recoil', a, f }); continue; }
            const first = rows[a];
            // distance from the rope he hit: right rope = bounds.right - x, left = x - bounds.left (bounds read at his y)
            const bounds = (await h.page.evaluate(async (y) => { const { ringBoundsAtY } = await import('/src/constants.js'); return ringBoundsAtY(y); }, first.y));
            const dist = (r) => dirKey === 'right' ? bounds.right - r.x : r.x - bounds.left;
            const ds = rows.slice(a, f).map(dist);
            const rec = {
                id, pair, rope: dirKey, label, stamina: +first.stamina.toFixed(1), recoilFrames: f - a, recoilMs: Math.round((f - a) * 1000 / 60),
                arrivalFacing: first.facing, flipFacing: rows[f].facing, dxTravel: +(Math.abs(rows[f - 1].x - first.x)).toFixed(1),
                flipStep: +stepOf(rows[f - 1], rows[f]).toFixed(1), flipPoseStep: +mirrorStep(rows[f - 1], rows[f]).toFixed(1), prevStep: +stepOf(rows[f - 2], rows[f - 1]).toFixed(1), nextStep: +stepOf(rows[f], rows[f + 1]).toFixed(1),
                ropeDist0: +ds[0].toFixed(1), ropeDistMax: +Math.max(...ds).toFixed(1), pressFrames: ds.filter(x => press(x) > 0).length, pressHalfFrames: ds.filter(x => press(x) >= 0.5).length, pressMin: +Math.min(...ds.map(press)).toFixed(2), pressEnd: +press(ds.at(-1)).toFixed(2),
                holdsFacingThrough: rows.slice(a, f).every(r => r.facing === first.facing), state: rows[a].state,
                shots: film ? shots : 0,
            };
            (film ? runs : types).push(rec);
            console.log(rec);
        }
    } finally { await h.close(); }
}
writeFileSync(`${root}/rope-results.json`, JSON.stringify({ runs, types }, null, 2));
writeFileSync(`${root}/rope.html`, `<!doctype html><meta charset="utf-8"><title>Rope hit</title>
<style>body{font:16px system-ui;background:#181b20;color:#eee;margin:24px;max-width:1100px}select,button{font:inherit;padding:6px;margin-right:12px}canvas{width:100%;background:#000}#stats{padding:12px 0;color:#ccc}</style>
<h1>Rope hit</h1><p>Candidate only: <code>?grapples=v1</code>. Whip to a side rope: he hits it still facing the run, recoils off the rope, then turns and runs back. Normal speed (30 fps strip).</p>
<label>Attacker <select id="pair"><option value="lou-george">Lou whips George</option><option value="george-lou">George whips Lou</option></select></label>
<label>Rope <select id="rope"><option value="right">Right</option><option value="left">Left</option></select></label>
<label>Receiver <select id="label"><option value="fresh">Fresh (100)</option><option value="worn">Worn (20)</option></select></label>
<button id="pause">Pause</button><button id="speed">Slow</button><p id="stats"></p><canvas id="film"></canvas>
<script>
const runs=__RUNS__;const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');let frames=[],frame=0,paused=false,slow=false,last=0;
function select(){const r=runs.find(r=>r.pair===pair.value&&r.rope===rope.value&&r.label===label.value);frame=0;frames=Array.from({length:r.shots},(_,i)=>{const im=new Image();im.src='rope-frames/'+r.id+'/s'+String(i).padStart(4,'0')+'.jpg';return im});stats.textContent='Recoil '+r.recoilMs+' ms, travel '+r.dxTravel+' px, flip-frame step '+r.flipPoseStep+' px beyond the mirror, '+r.flipStep+' px raw (before '+r.prevStep+', after '+r.nextStep+')';}
for(const id of ['pair','rope','label'])document.getElementById(id).onchange=select;
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause'};document.getElementById('speed').onclick=e=>{slow=!slow;e.target.textContent=slow?'Normal speed':'Slow'};
function tick(t){if(t-last>1000/(slow?7.5:30)){last=t;const im=frames[frame];if(im?.complete&&im.naturalWidth){canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;ctx.drawImage(im,0,0);if(!paused)frame=(frame+1)%frames.length;}}requestAnimationFrame(tick)}select();requestAnimationFrame(tick);
</script>`.replace('__RUNS__', JSON.stringify(runs)));
