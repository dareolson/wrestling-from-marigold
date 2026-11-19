// PLAN_SCALE T2.4: the G page for Derek. Lou (w1) and George (w2), idle then wristlockHammerlock (frame 150 of the clip), at the back, middle and front rows, flag off | ?scale=v1
// (T2.1 perspective + T1 fixes), the arena's own top rope and posts in every still. Under each still: draw scale, body height (union of the visible parts' frame bounds, so it
// includes transparent padding), post height at that row (linear between the far post, 120 px above the mat, and the near post, 200 px) and body / post. Plus a normal-speed loop strip,
// both facings, flag off | on, at the back row (1x, 1/60 s steps, loop asleep, seeded Math.random, AIs nulled). Frames are not committed (.git/info/exclude); the numbers go in g2.json.
//   WFM_URL=http://localhost:5173 node tools/debug/scale_g2_page.mjs [dir=research/scale-2026-11/g2]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INK } from './scale_rope_body.mjs';
const DIR = process.argv[2] ?? 'research/scale-2026-11/g2';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const ROWS = { back: 266, middle: 352, front: 438 }, STILL_AT = 150, LOOP = 150;
const INSTALL = () => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now; window.__idle = { ...sc.w1.pose }; };
const BEGIN = ({ row, facing, move }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234; Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.lockupState = null; sc.headlockState = null; sc.pinState = null; sc.sleeperState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null; w._corner = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle); w.skeleton.setPartVariants?.({});
    }
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    a.facing = facing; d.facing = -facing; a.y = row; d.y = row; a.x = 480; d.x = 480 + facing * (move ? 70 * a.s : 130);
    if (move) { a.state = 'lockup'; d.state = 'lockup'; a.tweenPose('lockup', 1, 'Linear'); d.tweenPose('lockup', 1, 'Linear'); sc.lockupState = { attacker: a, defender: d, timer: 0 }; a._doWristlockHammerlock(d); }
    return true;
};
const STEP = () => { const g = window.__WFM_GAME; window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); return true; };
const MEASURE = ({ row }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    return [sc.w1, sc.w2].map(w => {
        const post = 120 + (w.y - 258) / (445 - 258) * 80;   // at the man's own row: Arena.js:2568-2571 post tops vs the mat rows at the far (258) and near (445) edges
        let top = Infinity, bot = -Infinity;
        for (const k of Object.keys(w.skeleton)) { const im = w.skeleton[k]; if (im && typeof im.getBounds === 'function' && im.visible && im.frame && im.alpha > 0) { const b = im.getBounds(); top = Math.min(top, b.top); bot = Math.max(bot, b.bottom); } }
        const h = bot - top;
        return { rig: w.rigId, y: w.y, drawScale: +w.drawScale().toFixed(4), bodyPx: +h.toFixed(1), postPx: +post.toFixed(1), frac: +(h / post).toFixed(3) };
    });
};
const RING = { nearLeft: { x: 40, y: 445 }, nearRight: { x: 920, y: 445 }, farLeft: { x: 210, y: 258 }, farRight: { x: 750, y: 258 }, ropes: [{ nearY: 380, farY: 218 }, { nearY: 316, farY: 181 }, { nearY: 251, farY: 142 }] };
const cells = {}, loops = [];
for (const on of [0, 1]) {
    process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&light=v1' + (on ? '&scale=v1' : '');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 }); await page.waitForTimeout(1500);
        await page.evaluate(INSTALL);
        await page.evaluate((R) => { window.__RING = R; }, RING);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clipOf = (gx, gy, gw, gh) => ({ x: Math.round(box.x + gx * box.w / box.gw), y: Math.round(box.y + gy * box.h / box.gh), width: Math.round(gw * box.w / box.gw), height: Math.round(gh * box.h / box.gh) });
        mkdirSync(join(DIR, 'img'), { recursive: true });
        for (const [rn, row] of Object.entries(ROWS)) for (const kind of ['idle', 'move']) {
            await page.evaluate(BEGIN, { row, facing: 1, move: kind === 'move' });
            if (kind === 'move') for (let i = 0; i < STILL_AT; i++) await page.evaluate(STEP); else for (let i = 0; i < 20; i++) await page.evaluate(STEP);
            const id = `${rn}-${kind}-${on ? 'on' : 'off'}`;
            const clipTop = 0;   // the whole canvas: the camera may scroll/zoom, so marks are placed in screen space (view in each ink record)
            await page.screenshot({ path: join(DIR, 'img', id + '.jpg'), type: 'jpeg', quality: 88, clip: clipOf(0, 0, 960, 600) });
            cells[id] = { on, row: rn, kind, clipTop, men: await page.evaluate(MEASURE, { row }), ink: await page.evaluate(INK) };
        }
        for (const facing of [-1, 1]) {
            const id = `loop-${facing < 0 ? 'l' : 'r'}-${on ? 'on' : 'off'}`, dir = join(DIR, 'frames', id);
            rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
            await page.evaluate(BEGIN, { row: ROWS.back, facing, move: true });
            for (let i = 0; i < LOOP; i++) { await page.evaluate(STEP); await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip: clipOf(300, 100, 460, 230) }); }
            loops.push({ id, facing, on, n: LOOP });
        }
    } finally { await h.close(); }
}
writeFileSync(join(DIR, 'g2.json'), JSON.stringify({ rows: ROWS, cells, loops }, null, 1));
const fmt = (m) => `${m.rig.replace('-roster-v1', '').replace('thesz-procreate-v1', 'lou')}: draw scale ${m.drawScale}, body ${m.bodyPx} px, post ${m.postPx} px, body/post ${m.frac}`;
// the rope-crossing line: each top rope (far = red, near = yellow) at a man's x, drawn only where it crosses his painted ink; cyan ticks mark his ink top and bottom (alpha >= 128, T2.5)
const NAME = (r) => r.replace('-roster-v1', '').replace('thesz-procreate-v1', 'lou');
const marks = (c) => c.ink.map(m => {
    const v = m.view, sx = (x) => (x - v.x) * v.sw / v.w, sy = (y) => (y - v.y) * v.sh / v.h;   // world -> screen through the camera
    const L = (y, col, label) => `<div class="ln" style="left:${(sx(m.x - 55) / 9.6).toFixed(2)}%;width:${(110 * v.sw / v.w / 9.6).toFixed(2)}%;top:${(sy(y) / 6).toFixed(2)}%;border-color:${col}"><span style="color:${col}">${label}</span></div>`;
    const out = [L(m.inkTop, '#0ff', ''), L(m.inkBottom, '#0ff', '')];
    for (const [k, col] of [['far', '#f44'], ['near', '#fd0']]) if (m.ropes[k] >= m.inkTop && m.ropes[k] <= m.inkBottom) out.push(L(m.ropes[k], col, `${(((m.inkBottom - m.ropes[k]) / m.ink) * 100).toFixed(1)}%`));
    return out.join('');
}).join('');
const crossTxt = (c) => c.ink.map(m => `${NAME(m.rig)}: ` + (['far', 'near'].filter(k => m.ropes[k] >= m.inkTop && m.ropes[k] <= m.inkBottom).map(k => `${k} top rope crosses at ${(((m.inkBottom - m.ropes[k]) / m.ink) * 100).toFixed(1)}% of ink height from the feet`).join('; ') || 'no top rope crosses the body') + ` (ink ${m.ink.toFixed(1)} px, ${(m.ink / m.drawScale).toFixed(1)} per draw scale)`).join('<br>');
const still = (id) => { const c = cells[id]; return `<div class="cell"><h4>${c.on ? 'scale=v1' : 'flag off'} &middot; ${c.row} row (y ${ROWS[c.row]}) &middot; ${c.kind === 'idle' ? 'idle' : 'wristlockHammerlock, clip frame ' + STILL_AT}</h4><div class="im"><img src="img/${id}.jpg" loading="lazy">${marks(c)}</div><div class="m">${crossTxt(c)}<br>${c.men.map(fmt).join('<br>')}</div></div>`; };
const grid = Object.keys(ROWS).flatMap(rn => ['idle', 'move'].map(k => `<div class="pair">${still(`${rn}-${k}-off`)}${still(`${rn}-${k}-on`)}</div>`)).join('');
const loopCell = (l) => `<div class="lc"><h4>facing ${l.facing < 0 ? 'L' : 'R'} &middot; <b>${l.on ? 'scale=v1' : 'flag off'}</b> &middot; back row, 1&times;</h4><canvas width="${460}" height="${230}" data-dir="frames/${l.id}" data-n="${l.n}"></canvas></div>`;
const order = [-1, 1].flatMap(f => [0, 1].map(on => loops.find(l => l.facing === f && l.on === on)));
const css = `<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1400px}h1{font-weight:600}h4{margin:2px 0 4px;color:#9ad;font-size:12px;font-weight:500}.pair{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap}.cell{width:680px}.cell img{width:680px;display:block;background:#000}.im{position:relative;width:680px;line-height:0}.ln{position:absolute;border-top:1px solid;height:0}.ln span{position:absolute;left:100%;top:-7px;margin-left:3px;font:11px ui-monospace,monospace;white-space:nowrap}.m{font:12px ui-monospace,monospace;color:#bbb;margin-top:3px}.lc{display:inline-block;margin:0 12px 12px 0}canvas{background:#000;display:block}button{font:inherit}</style>`;
const script = `<p><button id="pp">pause</button></p><script>
const cvs=[...document.querySelectorAll('canvas')],st=new Map();let paused=false;
cvs.forEach(c=>{const k=+c.dataset.n;st.set(c,{f:0,imgs:Array.from({length:k},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im})})});
let last=0;function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach(c=>{const s=st.get(c),im=s.imgs[s.f%s.imgs.length];if(im.complete&&im.naturalWidth)c.getContext('2d').drawImage(im,0,0);s.f++})}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
writeFileSync(join(DIR, 'index.html'), `<!doctype html><meta charset="utf-8"><title>G2 perspective</title>${css}<h1>G2: one perspective, flag off | scale=v1</h1><p>PLAN_SCALE T2.4. Lou (w1) vs George (w2). Each still is the arena as drawn: top rope and posts in frame. Body height is the union of the visible parts' frame bounds (includes transparent padding); post height is interpolated between the far post (120 px above the mat) and the near post (200 px). Marked lines (T2.5): red = the far top rope, yellow = the near top rope, drawn where each crosses a man's painted ink, with its height as % of his ink height from the feet; cyan ticks = his ink top and bottom (pixels with alpha &ge; 128). Numbers are measurements; Derek judges.</p>${grid}<h1>Loop strip (normal speed, both facings)</h1><p>wristlockHammerlock at the back row, first ${LOOP} frames (2.5 s), looping.</p>${order.map(loopCell).join('')}${script}`);
console.log('wrote', join(DIR, 'index.html'));
process.exit(0);
