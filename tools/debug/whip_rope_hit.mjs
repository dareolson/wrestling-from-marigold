// Rope hit (PLAN_GRAPPLES T3c.5b): real lockup input, whip to a side rope with the receiver at a set stamina and depth, grapples=v1.
// Pass 1 measures; pass 2 films every frame of the hit (tight on the rope) for the page's normal and quarter speed.
//   WFM_URL=http://localhost:5173 node tools/debug/whip_rope_hit.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
const root = 'research/animation/whip-2026-10';
mkdirSync(root, { recursive: true });
const centre = (a) => [a.c.reduce((t, c) => t + c[0], 0) / 4, a.c.reduce((t, c) => t + c[1], 0) / 4];
const stepOf = (p, q) => { let m = 0; p.parts.forEach((a, i) => { if (!a.vis || !q.parts[i].vis) return; a.c.forEach((c, j) => { m = Math.max(m, Math.hypot(c[0] - q.parts[i].c[j][0], c[1] - q.parts[i].c[j][1])); }); }); return m; };
// The turn mirrors the sprite about his x: mirror the previous frame's part centres about x and take the step from there.
const mirrorStep = (p, q) => { let m = 0; p.parts.forEach((a, i) => { if (!a.vis || !q.parts[i].vis) return; const [px, py] = centre(a), [qx, qy] = centre(q.parts[i]); m = Math.max(m, Math.hypot(2 * q.x - px - qx, py - qy)); }); return m; };
const CASES = [['fresh', 100], ['worn', 20]];
const DEPTHS = [['mid', 400], ['far', 290], ['near', 435]];
const GRAB = 'window.__WFM_GAME.scene.scenes[0]';
const EXTRA = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2, cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize;
    const k = box.width / g.width, sp = sc._sidePtsDebug;
    const strands = sp ? [0, 1, 2].map(ri => ({ pts: [-1, 1].map(dir => sp.pts[ri][dir].map(p => [p.x, p.y])), ref: [-1, 1].map(dir => sp.ref[ri][dir].map(p => [p.x, p.y])) })) : null;
    // draw order: the side-rope bands within 0.3 of his depth parameter, against his own draw depth (band behind him = depth below his)
    const hit = sc._ropePresses().hit[0], bands = sc.sideRopeBands, body = d.skeleton.depth ?? d.skeleton._parts?.[0]?.depth ?? null;
    let order = null;
    if (hit && body !== null) { const win = bands.map((g, i) => ({ i, dd: g.depth, tMid: (i + 0.5) / bands.length })).filter(b => Math.abs(b.tMid - hit.t) < 0.3); order = { n: win.length, body, minGap: Math.min(...win.map(b => body - b.dd)), inFront: win.filter(b => b.dd >= body).length }; }
    return {
        order, phase: d.runPhase ?? null, stamina: d.stamina, runTarget: d.runTarget, tension: d._ropeTension ?? 0, boost: d._runBoost || 0, moveBlend: d.moveBlend,
        scr: { x: box.x + (d.x - cam.worldView.x) * cam.zoom * k, y: box.y + (d.y - cam.worldView.y) * cam.zoom * k, k: cam.zoom * k }, strands,
    };
};
const runCase = async (h, { dirKey, st, y, shots }) => {
    await h.page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    await h.page.evaluate((y) => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1.y = sc.w2.y = y; }, y);
    const rows = [];
    let clip = null, n = 0;
    for (let i = 0; i < 300; i++) {
        if (i === 47) await h.page.evaluate((s) => { window.__WFM_GAME.scene.scenes[0].w2.stamina = s; }, st);
        const row = await h.page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [] }, hold: { a: i === 48 ? [dirKey] : [] } });
        const ex = await h.page.evaluate(EXTRA);
        rows.push({ ...row.d, ...ex, i });
        if (shots) {
            const w = shots.window;
            if (i >= w[0] && i <= w[1]) {
                if (!clip) {   // tight on the rope, fixed for the whole strip: 460 x 330 screen px around where he is at the first frame
                    const r = rows.at(-1).scr, W = 460, H = 330;
                    clip = { x: Math.max(0, r.x - W / 2), y: Math.max(0, r.y - H * 0.7), width: W, height: H };
                }
                await h.page.screenshot({ path: `${shots.dir}/s${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 80, clip }); n++;
            }
        }
    }
    return { rows, n };
};
const measure = (rows, dirKey) => {
    const a = rows.findIndex(r => r.phase === 'ropeHit'), f = rows.findIndex((r, i) => i > a && r.phase === 'returning');
    if (a < 0 || f < 0) return null;
    const dir = dirKey === 'right' ? 1 : -1, d0 = rows[a - 1], target = rows[a].runTarget;
    let turn = -1; for (let i = 1; i < a; i++) if (rows[i].phase === 'toRope' && rows[i].facing !== rows[i - 1].facing) turn = i;   // the last flip before contact: the whip's own flip comes earlier
    const hit = rows.slice(a, f + 1);
    const past = Math.max(...hit.map(r => (r.x - target) * dir));
    // ring bow: the strand's x offset from its own rest line, at full tension, middle strand and the others
    const bowOf = (r, ri) => { const s = r.strands?.[ri]; if (!s) return 0; const si = dir > 0 ? 1 : 0; return Math.max(...s.pts[si].map((p, k) => Math.abs(p[0] - s.ref[si][k][0]))); };
    const full = hit.filter(r => r.tension >= 0.999);
    const bow = [0, 1, 2].map(ri => +Math.max(...full.map(r => bowOf(r, ri))).toFixed(1));
    // Draw order while he is taking the rope's weight: bands in his window that draw in FRONT of him (0 = all three strands behind him).
    const ord = hit.filter(r => r.order);
    const inFrontMax = ord.length ? Math.max(...ord.map(r => r.order.inFront)) : null, orderFrames = ord.length;
    const base = Math.abs(rows[a - 3].x - rows[a - 4].x);
    const ret = rows.slice(f, f + 40).map((r, k, arr) => k ? Math.abs(r.x - arr[k - 1].x) : 0);
    let hitMax = 0; for (let i = a; i <= f; i++) hitMax = Math.max(hitMax, stepOf(rows[i - 1], rows[i]));
    return {
        contactToLaunchMs: Math.round((f - a) * 1000 / 60), pastRunTarget: +past.toFixed(1), middleBow: bow[1], bows: bow,
        returnPeakX: +(Math.max(...ret) / base).toFixed(2), turnShortOfRope: turn > 0 ? +Math.abs(target - rows[turn].x).toFixed(1) : null,
        turnRaw: turn > 0 ? +stepOf(rows[turn - 1], rows[turn]).toFixed(1) : null, turnMirrored: turn > 0 ? +mirrorStep(rows[turn - 1], rows[turn]).toFixed(1) : null,
        hitMaxStep: +hitMax.toFixed(1), launchRaw: +stepOf(rows[f - 1], rows[f]).toFixed(1), launchMirrored: +mirrorStep(rows[f - 1], rows[f]).toFixed(1),
        bandsInFrontMax: inFrontMax, orderFrames, a, f, turn,
    };
};
const runs = [], depthRuns = [];
for (const [pair, att, def] of [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const dirKey of ['left', 'right']) for (const [label, st] of CASES) for (const [dl, y] of DEPTHS) {
            const id = `${pair}-rope-${dirKey}-${label}-${dl}`;
            const { rows } = await runCase(h, { dirKey, st, y });
            const m = measure(rows, dirKey);
            if (!m) { console.log({ id, error: 'no hit' }); continue; }
            const rec = { id, pair, rope: dirKey, label, depth: dl, stamina: +rows[m.a].stamina.toFixed(1), ...m };
            if (dl === 'mid') {
                const win = [Math.max(0, m.turn - 14), m.f + 45], dir = `${root}/rope-frames/${id}`;
                mkdirSync(dir, { recursive: true });
                const { n } = await runCase(h, { dirKey, st, y, shots: { window: win, dir } });
                rec.frames = n; runs.push(rec);
            } else depthRuns.push(rec);
            console.log(rec);
        }
    } finally { await h.close(); }
}
writeFileSync(`${root}/rope-results.json`, JSON.stringify({ runs, depthRuns }, null, 2));
const page = `<!doctype html><meta charset="utf-8"><title>Rope hit</title>
<style>body{font:16px system-ui;background:#181b20;color:#eee;margin:24px;max-width:900px}select,button{font:inherit;padding:6px;margin-right:12px}canvas{width:100%;background:#000}#stats{padding:12px 0;color:#ccc;line-height:1.5}</style>
<h1>Rope hit: back into the rope, taut, sprung out</h1><p>Candidate only: <code>?grapples=v1</code>. Whip to a side rope. He turns his back 40 px short, hits the rope, goes 34 px into it as it bows and goes taut, then it throws him back out at 1.7x. Tight on the rope; every frame at 60 fps.</p>
<label>Attacker <select id="pair"><option value="lou-george">Lou whips George</option><option value="george-lou">George whips Lou</option></select></label>
<label>Rope <select id="rope"><option value="right">Right</option><option value="left">Left</option></select></label>
<label>Receiver <select id="label"><option value="fresh">Fresh (100)</option><option value="worn">Worn (20)</option></select></label>
<label>Speed <select id="speed"><option value="1">Normal</option><option value="0.25">Quarter</option></select></label>
<button id="pause">Pause</button><p id="stats"></p><canvas id="film"></canvas>
<script>
const runs=__RUNS__;const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');let frames=[],frame=0,paused=false,last=0;
function select(){const r=runs.find(r=>r.pair===pair.value&&r.rope===rope.value&&r.label===label.value);frame=0;frames=Array.from({length:r.frames},(_,i)=>{const im=new Image();im.src='rope-frames/'+r.id+'/s'+String(i).padStart(4,'0')+'.jpg';return im});stats.innerHTML='Contact to launch '+r.contactToLaunchMs+' ms, '+r.pastRunTarget+' px past the rope point, middle strand bow '+r.middleBow+' px, return peak '+r.returnPeakX+'x run speed<br>Turn step '+r.turnRaw+' px raw / '+r.turnMirrored+' px mirrored';}
for(const id of ['pair','rope','label'])document.getElementById(id).onchange=select;
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause'};
function tick(t){if(t-last>1000/(60*+speed.value)){last=t;const im=frames[frame];if(im?.complete&&im.naturalWidth){canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;ctx.drawImage(im,0,0);if(!paused)frame=(frame+1)%frames.length;}}requestAnimationFrame(tick)}select();requestAnimationFrame(tick);
</script>`;
writeFileSync(`${root}/rope.html`, page.replace('__RUNS__', JSON.stringify(runs)));
