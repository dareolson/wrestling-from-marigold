// Focused Irish whip proof: real lockup input, both kits, facings and rope choices.
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
import { partSteps } from './rise_handoff_probe.mjs';
const root = 'research/animation/whip-2026-10';
mkdirSync(root, { recursive: true });
const runs = [];
for (const [pair, att, def] of [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        const info = await h.page.evaluate(INSTALL);
        const clip = { x: info.box.x, y: info.box.y, width: info.box.w, height: info.box.h };
        for (const facing of [1, -1]) for (const direction of [1, -1]) {
            const id = `${pair}-${facing}-${direction}`, dir = `${root}/frames/${id}`;
            mkdirSync(dir, { recursive: true });
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            const rows = [];
            for (let i = 0; i < 150; i++) {
                const r = await h.page.evaluate(STEP, { press: { a: i === 48 ? ['action'] : [] }, hold: { a: i === 48 ? [direction > 0 ? 'right' : 'left'] : [] } });
                rows.push(r);
                if (i >= 42 && i < 126 && i % 2 === 0) await h.page.screenshot({ path: `${dir}/s${String((i - 42) / 2).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 75, clip });
            }
            const released = rows.findIndex((r, i) => i >= 48 && r.d.state === 'running');
            assert.ok(released > 48, `${id}: must gather before release`);
            assert.equal(rows[released].d.facing, direction, id);
            assert.equal(rows[released].d.x > rows[released - 1].d.x ? 1 : -1, direction, `${id}: runs toward selected rope`);
            assert.ok(rows.slice(48, released).every(r => r.d.state === 'grabbed'), `${id}: no early escape`);
            const steps = rows.slice(48, released + 2).map((r, j) => Math.max(...Object.values(partSteps({ parts: rows[47 + j].d.parts }, { parts: r.d.parts }))));
            // Frame table: peak part step per frame for both men, press to 300 ms after release.
            const stepAt = (who, j) => Math.max(...Object.values(partSteps({ parts: rows[j - 1][who].parts }, { parts: rows[j][who].parts })));
            const table = [];
            for (let j = 49; j <= Math.min(48 + 48, rows.length - 1); j++) table.push({ ms: Math.round((j - 48) * 1000 / 60), a: +stepAt('a', j).toFixed(1), d: +stepAt('d', j).toFixed(1) });
            const rel = table.findIndex(t => t.ms >= Math.round((released - 48) * 1000 / 60));
            const gather = table.slice(0, rel + 1);
            let still = 0, maxStill = 0;
            for (const t of gather) { still = t.a < 3 && t.d < 3 ? still + 1 : 0; maxStill = Math.max(maxStill, still); }
            const blendEnd = table.findIndex(t => t.ms >= 140);
            const popAfterBlend = Math.max(0, ...gather.slice(blendEnd, -1).flatMap(t => [t.a, t.d]));
            assert.ok(maxStill <= 3, `${id}: ${maxStill} still frames between press and release`);
            assert.ok(popAfterBlend <= 30, `${id}: pop ${popAfterBlend} px after the blend`);
            // After release: attacker's biggest step off the release frame, and the frames both men flip on.
            const releaseMs = Math.round((released - 48) * 1000 / 60);
            const afterRelease = table.filter(t => t.ms > releaseMs);
            const attackerAfterRelease = Math.max(0, ...afterRelease.map(t => t.a));
            const releaseFrameAttacker = table.find(t => t.ms === releaseMs)?.a;
            assert.ok(attackerAfterRelease <= 30, `${id}: attacker step ${attackerAfterRelease} px after release`);
            const flipFrame = (who) => rows.findIndex((r, j) => j > 48 && j < 96 && r[who].facing !== rows[j - 1][who].facing);
            if (direction !== facing) assert.equal(flipFrame('a'), released, `${id}: attacker flips on the receiver's first run frame`);
            const run = { attackerAfterRelease, releaseFrameAttacker, frameTable: table, maxStillFrames: maxStill, popAfterBlend, id, pair, facing, direction, crossBody: direction !== facing, releaseMs: Math.round((released - 48) * 1000 / 60), peakDefenderStep: +Math.max(...steps).toFixed(1), frames: 42 };
            runs.push(run); console.log(run);
        }
    } finally { await h.close(); }
}
writeFileSync(`${root}/results.json`, JSON.stringify(runs, null, 2));
writeFileSync(`${root}/index.html`, `<!doctype html><meta charset="utf-8"><title>Irish whip direction proof</title>
<style>body{font:16px system-ui;background:#181b20;color:#eee;margin:24px;max-width:1100px}select,button{font:inherit;padding:6px;margin-right:12px}canvas{width:100%;background:#000}#stats{padding:12px 0;color:#ccc}</style>
<h1>Irish whip: selectable rope direction</h1><p>Candidate only: <code>?grapples=v1</code>. Gameplay: enter a lockup, then hold Left or Right and press grapple again. Choosing the rope behind the attacker uses the cross-body pull.</p>
<label>Attacker <select id="pair"><option value="lou-george">Lou</option><option value="george-lou">George</option></select></label>
<label>Starting facing <select id="facing"><option value="1">Right</option><option value="-1">Left</option></select></label>
<label>Whip toward <select id="direction"><option value="1">Right rope</option><option value="-1">Left rope</option></select></label>
<button id="pause">Pause</button><button id="speed">Slow</button><p id="stats"></p><canvas id="film"></canvas>
<p>Open for visual review: wrist contact during the cross-body pull, the compact facing turn, and the receiver's first running step. Pixel steps measure movement; they do not establish good contact.</p>
<script>
const runs=${JSON.stringify(runs)};const canvas=document.getElementById('film'),ctx=canvas.getContext('2d');let frames=[],frame=0,paused=false,slow=false,last=0;
function select(){const r=runs.find(r=>r.pair===pair.value&&r.facing===+facing.value&&r.direction===+direction.value);frame=0;frames=Array.from({length:r.frames},(_,i)=>{const im=new Image();im.src='frames/'+r.id+'/s'+String(i).padStart(4,'0')+'.jpg';return im});stats.textContent=(r.crossBody?'Cross-body pull':'Same-side release')+' · release '+r.releaseMs+' ms · peak defender part step '+r.peakDefenderStep+' px/frame';}
for(const id of ['pair','facing','direction'])document.getElementById(id).onchange=select;
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause'};document.getElementById('speed').onclick=e=>{slow=!slow;e.target.textContent=slow?'Normal speed':'Slow'};
function tick(t){if(t-last>1000/(slow?7.5:30)){last=t;const im=frames[frame];if(im?.complete&&im.naturalWidth){canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;ctx.drawImage(im,0,0);if(!paused)frame=(frame+1)%frames.length;}}requestAnimationFrame(tick)}select();requestAnimationFrame(tick);
</script>`);
