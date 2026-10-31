// Corner whips (PLAN_GRAPPLES T3c.3): real lockup input, up/down + left/right + grapple, both kits, both facings, four corners.
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
const root = 'research/animation/whip-2026-10';
mkdirSync(root, { recursive: true });
const runs = [];
const released0 = (rows) => rows.findIndex((r, i) => i >= 48 && r.d.state === 'running');
for (const [pair, att, def] of [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL);
        const clip = { x: info.box.x, y: info.box.y, width: info.box.w, height: info.box.h };
        for (const facing of [1, -1]) for (const dirKey of ['left', 'right']) for (const vert of ['up', 'down', 'rope']) {
            const id = `${pair}-${facing}-${dirKey}-${vert}`;
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            const dir = `${root}/corner-frames/${id}`;
            mkdirSync(dir, { recursive: true });
            const rows = [];
            const rope = vert === 'rope';
            const frames = rope ? 330 : 260;
            for (let i = 0; i < frames; i++) {
                rows.push(await h.page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [] }, hold: { a: i === 48 ? (rope ? [dirKey] : [dirKey, vert]) : [] } }));
                if (i >= 42 && i < 200 && i % 2 === 0) await h.page.screenshot({ path: `${dir}/s${String((i - 42) / 2).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 75, clip });
            }
            const nShots = Math.ceil((200 - 42) / 2);
            if (rope) {
                const back = rows.findIndex((r, i) => i > released0(rows) && r.d.state !== 'running');
                const run = { id, pair, facing, dirKey, vert, rebound: true, endMs: Math.round((back - 48) * 1000 / 60), endY: +rows[back].d.y.toFixed(1), frames: nShots };
                runs.push(run); console.log(run); continue;
            }
            const released = rows.findIndex((r, i) => i >= 48 && r.d.state === 'running');
            assert.ok(released > 48, `${id}: never released`);
            const end = rows.findIndex((r, i) => i > released && r.d.state !== 'running');
            assert.ok(end > released, `${id}: never arrived`);
            const hit = rows[end].d;
            const wantY = vert === 'up' ? 264 : 439;
            const run = { id, pair, facing, dirKey, vert, hitX: +hit.x.toFixed(1), hitY: +hit.y.toFixed(1), wantY, arrivedMs: Math.round((end - 48) * 1000 / 60), state: hit.state, frames: nShots };
            runs.push(run); console.log(run);
            assert.ok(Math.abs(hit.y - wantY) <= 2, `${id}: y ${hit.y} vs ${wantY}`);
        }
    } finally { await h.close(); }
}
writeFileSync(`${root}/corner-results.json`, JSON.stringify(runs, null, 2));
writeFileSync(`${root}/corners.html`, `<!doctype html><meta charset="utf-8"><title>Corner whips</title>
<style>body{font:16px system-ui;background:#181b20;color:#eee;margin:24px;max-width:1100px}select,button{font:inherit;padding:6px;margin-right:12px}canvas{width:100%;background:#000}#stats{padding:12px 0;color:#ccc}</style>
<h1>Corner whips and rope rebound</h1><p>Candidate only: <code>?grapples=v1</code>. In a lockup hold up or down plus left or right and press grapple. Rope = left or right alone. Normal speed (30 fps strip).</p>
<label>Attacker <select id="pair"><option value="lou-george">Lou</option><option value="george-lou">George</option></select></label>
<label>Starting facing <select id="facing"><option value="1">Right</option><option value="-1">Left</option></select></label>
<label>Whip <select id="dirKey"><option value="left">Left</option><option value="right">Right</option></select></label>
<label>To <select id="vert"><option value="up">Far corner</option><option value="down">Near corner</option><option value="rope">Rope + rebound</option></select></label>
<button id="pause">Pause</button><button id="speed">Slow</button><p id="stats"></p><canvas id="film"></canvas>
<script>
const runs=__RUNS__;const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');let frames=[],frame=0,paused=false,slow=false,last=0;
function select(){const r=runs.find(r=>r.pair===pair.value&&r.facing===+facing.value&&r.dirKey===dirKey.value&&r.vert===vert.value);frame=0;frames=Array.from({length:r.frames},(_,i)=>{const im=new Image();im.src='corner-frames/'+r.id+'/s'+String(i).padStart(4,'0')+'.jpg';return im});stats.textContent=r.rebound?'Rope and rebound, ends '+r.endMs+' ms':'Corner hit at '+r.arrivedMs+' ms, at ('+r.hitX+', '+r.hitY+')';}
for(const id of ['pair','facing','dirKey','vert'])document.getElementById(id).onchange=select;
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause'};document.getElementById('speed').onclick=e=>{slow=!slow;e.target.textContent=slow?'Normal speed':'Slow'};
function tick(t){if(t-last>1000/(slow?7.5:30)){last=t;const im=frames[frame];if(im?.complete&&im.naturalWidth){canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;ctx.drawImage(im,0,0);if(!paused)frame=(frame+1)%frames.length;}}requestAnimationFrame(tick)}select();requestAnimationFrame(tick);
</script>`.replace('__RUNS__', JSON.stringify(runs)));
