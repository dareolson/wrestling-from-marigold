// PLAN_SCALE T1.3 loop strip: flag off | ?scale=v1, both facings, 1x, 1/60 s steps (loop asleep, seeded Math.random, AIs nulled), fixed camera on the start position.
//   a) two standers stacked in depth (dx 25, dy 12): the separation block's old y push
//   b) lockup -> hammerlock with the defender 25 px deeper than the attacker: the paired-move entry snap
// Lou (w1) and George (w2). Writes <dir>/strip.html and <dir>/frames/<case>-<l|r>-<off|on>/sNNNN.jpg (raw frames: not committed, .git/info/exclude).
//   WFM_URL=http://localhost:5173 node tools/debug/scale_s1_strip.mjs [dir=research/scale-2026-11/s1]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
const DIR = process.argv[2] ?? 'research/scale-2026-11/s1';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const CASES = { stack: { frames: 60, label: 'two standers stacked in depth (dx 25, dy 12)' }, hammerlock: { frames: 90, label: 'lockup &rarr; hammerlock, defender 25 px deeper' } };
const INSTALL = () => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now; window.__idle = { ...sc.w1.pose }; };
const BEGIN = ({ kase, facing }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234; Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle); w.skeleton.setPartVariants?.({});
    }
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    a.facing = facing; d.facing = -facing; a.x = 520; a.y = 380;
    const snapshot = () => ({ ay: a.y, dy: d.y, as: a.s, ds: d.s, ax: a.x, dx: d.x });
    if (kase === 'stack') { d.x = 520 + facing * 25; d.y = 392; return snapshot(); }
    d.x = 520 + facing * 70 * a.s; d.y = 405; a.state = 'lockup'; d.state = 'lockup';
    a.tweenPose('lockup', 1, 'Linear'); d.tweenPose('lockup', 1, 'Linear'); sc.lockupState = { attacker: a, defender: d, timer: 0 };
    const pre = snapshot();
    a._doHammerlock(d);
    return pre;
};
const STEP = () => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); const { w1: a, w2: d } = sc; return { ay: a.y, dy: d.y, as: a.s, ds: d.s, ax: a.x, dx: d.x }; };
const cells = [];
for (const on of [0, 1]) {
    process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&light=v1' + (on ? '&scale=v1' : '&scale=off');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 });
        await page.waitForTimeout(1500);
        await page.evaluate(INSTALL);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clip = { width: 460, height: 330, x: Math.round(box.x + 545 * box.w / box.gw - 230), y: Math.round(box.y + 430 * box.h / box.gh - 330) };
        for (const [kase, c] of Object.entries(CASES)) for (const facing of [-1, 1]) {
            const id = `${kase}-${facing < 0 ? 'l' : 'r'}-${on ? 'on' : 'off'}`, dir = join(DIR, 'frames', id);
            rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
            let prev = await page.evaluate(BEGIN, { kase, facing });   // the state before the first step, so a snap on the first frame counts
            let maxPop = 0, maxDy = 0;
            for (let i = 0; i < c.frames; i++) {
                const f = await page.evaluate(STEP);
                if (prev) for (const [y, s, py, ps] of [[f.ay, f.as, prev.ay, prev.as], [f.dy, f.ds, prev.dy, prev.ds]]) { maxPop = Math.max(maxPop, Math.abs(s / ps - 1)); maxDy = Math.max(maxDy, Math.abs(y - py)); }
                prev = f;
                await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip });
            }
            cells.push({ id, kase, facing, on, n: c.frames, maxPop: +(maxPop * 100).toFixed(2), maxDy: +maxDy.toFixed(1) });
            console.log(`[strip] ${id}: ${c.frames} frames, largest one-frame size change ${(maxPop * 100).toFixed(2)}%, largest y step ${maxDy.toFixed(1)} px`);
        }
    } finally { await h.close(); }
}
const css = `<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1{font-weight:600}h4{margin:2px 0 4px;color:#9ad;font-size:12px;font-weight:500}.grid{display:flex;gap:12px;flex-wrap:wrap}.cell{width:460px}canvas{background:#000;display:block}button{font:inherit;padding:4px 10px}</style>`;
const cell = (c) => `<div class="cell"><h4>${CASES[c.kase].label} &middot; facing ${c.facing < 0 ? 'L' : 'R'} &middot; <b>${c.on ? 'scale=v1' : 'flag off'}</b> &middot; largest size change ${c.maxPop}%, largest y step ${c.maxDy} px</h4><canvas data-dir="frames/${c.id}" data-n="${c.n}" width="460" height="330"></canvas></div>`;
const order = Object.keys(CASES).flatMap(k => [-1, 1].flatMap(f => [0, 1].map(on => cells.find(c => c.kase === k && c.facing === f && c.on === on))));
const loops = `<p><button id="pp">pause</button></p><script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false;const st=new Map();
const io=new IntersectionObserver(es=>es.forEach(e=>{const c=e.target;if(e.isIntersecting&&!st.has(c)){const k=+c.dataset.n;st.set(c,{imgs:Array.from({length:k},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}),f:0})}c._vis=e.isIntersecting}),{rootMargin:'200px'});
cvs.forEach(c=>io.observe(c));let last=0;
function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach(c=>{const s=st.get(c);if(!s||!c._vis)return;const im=s.imgs[s.f%s.imgs.length];if(im.complete)c.getContext('2d').drawImage(im,0,0);s.f++})}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
writeFileSync(join(DIR, 'strip.html'), `<!doctype html><meta charset="utf-8"><title>S1 loop strip</title>${css}<h1>S1 loop strip: flag off | scale=v1, both facings</h1><p>PLAN_SCALE T1.3. Lou (w1) vs George (w2), 1&times;, 1/60 s steps, fixed camera on the start position. Per cell: largest one-frame size change and largest root y step of either man. Derek judges.</p><div class="grid">${order.map(cell).join('')}</div>${loops}`);
console.log('wrote', join(DIR, 'strip.html'));
process.exit(0);
