// T4.2 (PLAN_GETUPS Rev 7) loop strip: the overlap rise before and after the eased separation, Lou and George, both facings, 1x.
// Forced backTuck rise (?getups=v1&getup=backTuck), the opponent held in elbowDropping 30 px in front (the case getups_snap.mjs confirmed).
// "before" = the same game with the stamp that arms the ease swallowed in page (the hard snap of today); "after" = the shipped ease.
// The crop is fixed on the start position, so the snap shows as the figure moving, not as the background.
//
//   WFM_URL=http://localhost:5173 node tools/debug/getups_snap_strip.mjs [dir=research/animation/getups-2026-10/g3]
// Reads <dir>/snap-probe-before.json and snap-probe-after.json (getups_snap.mjs) for the table. Writes <dir>/snap-strip.html and
// <dir>/snap-frames/<rig>-<l|r>-<before|after>/sNNNN.jpg (raw frames: not committed, .git/info/exclude).
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

const DIR = process.argv[2] ?? 'research/animation/getups-2026-10/g3';
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const WHO = { lou: 'w1', george: 'w2' };
const LEAD = 14, POST = 26, GAP = 30;

const INSTALL = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    let a = 0x5eed1234;
    Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    window.__T = sc.time.now;
};
const BEGIN = ({ who, facing, gap, before }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc[who], o = sc[who === 'w1' ? 'w2' : 'w1'];
    for (const q of [w, o]) { q.scene.tweens.killTweensOf(q); q.scene.tweens.killTweensOf(q.pose); }
    delete w._riseStandAt;
    if (before) Object.defineProperty(w, '_riseStandAt', { configurable: true, get: () => undefined, set: () => {} }); // the ease never arms
    w.x = 520; w.y = 355; w.facing = facing; w.lying = 'supine';
    o.x = w.x + facing * gap; o.y = w.y; o.state = 'elbowDropping'; o.vx = 0; o.vy = 0; o.facing = -facing;
    for (const q of [w, o]) { q._activeMove = null; q._choreoUntil = 0; q._groundHandoff = null; q._sell = null; q._hold = null; q._pain = null; q.stamina = 100; q.combatBlend = 0; q.moveBlend = 0; q.walkPhase = 0; }
    w.state = 'down'; w.stateTimer = 99; w.fallProgress = 1;
    window.__rise = { w, o };
    w._startRiseUp();
};
const STEP = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], { w, o } = window.__rise;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    return { state: w.state, x: w.x, y: w.y, ox: o.x };
};

process.env.WFM_P1 = RIGS.lou; process.env.WFM_P2 = RIGS.george; process.env.WFM_QS = 'notitle=1&getups=v1&getup=backTuck';
const h = await launch();
const cells = [];
try {
    const page = h.page;
    for (let i = 0; i < 60 && !(await h.snap())?.w1; i++) await page.waitForTimeout(500);
    await page.evaluate(INSTALL);
    const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
    const clip = { width: 420, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 210), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
    for (const rig of ['lou', 'george']) for (const facing of [-1, 1]) for (const col of ['before', 'after']) {
        const id = `${rig}-${facing < 0 ? 'l' : 'r'}-${col}`, dir = join(DIR, 'snap-frames', id);
        rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
        await page.evaluate(BEGIN, { who: WHO[rig], facing, gap: GAP, before: col === 'before' });
        const rows = [];
        let standI = null;
        for (let i = 0; i < 400; i++) {
            const f = await page.evaluate(STEP);
            rows.push(f);
            if (standI === null && f.state === 'standing') standI = i;
            if (standI !== null && i - standI >= POST) break;
        }
        // keep LEAD frames before standing and POST after: re-run for the screenshots (the step must be filmed as it happens)
        await page.evaluate(BEGIN, { who: WHO[rig], facing, gap: GAP, before: col === 'before' });
        let n = 0;
        for (let i = 0; i < rows.length; i++) {
            await page.evaluate(STEP);
            if (i >= standI - LEAD) await page.screenshot({ path: join(dir, `s${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip });
        }
        const steps = rows.map((r, i) => (i ? Math.hypot(r.x - rows[i - 1].x, r.y - rows[i - 1].y) : 0));
        cells.push({ id, rig, facing, col, n, standI, stand: +steps[standI].toFixed(2), max: +Math.max(...steps).toFixed(2), endDist: +Math.hypot(rows.at(-1).x - rows.at(-1).ox, 0).toFixed(2) });
        console.log(`[strip] ${id}: ${n} frames, stand at ${standI}, standing-frame step ${steps[standI].toFixed(2)}, max ${Math.max(...steps).toFixed(2)}`);
    }
} finally { await h.close(); }

// ── page ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const probe = (f) => { try { return JSON.parse(readFileSync(join(DIR, f), 'utf8')).cases; } catch { return []; } };
const pb = probe('snap-probe-before.json'), pa = probe('snap-probe-after.json');
const find = (cs, c) => cs.find(x => x.rig === c.rig && x.opp === c.opp && x.facing === c.facing && x.gap === c.gap);
const rowsHtml = [];
for (const opp of ['standing', 'busy']) for (const rig of ['lou', 'george']) for (const facing of [-1, 1]) for (const gap of [0, 30, 150]) {
    const c = { rig, opp, facing, gap }, b = find(pb, c), a = find(pa, c);
    if (!b || !a) continue;
    rowsHtml.push(`<tr${opp === 'busy' && gap < 150 ? ' class="hl"' : ''}><td>${rig}</td><td>${opp}</td><td>${facing < 0 ? 'L' : 'R'}</td><td>${gap}</td><td>${b.standStep}</td><td>${a.standStep}</td><td>${b.maxStep}</td><td>${a.maxStep}</td><td>${a.distEnd}</td></tr>`);
}
const css = `<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1,h2{font-weight:600}h4{margin:2px 0 4px;color:#9ad;font-size:12px;font-weight:500}
table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #444;padding:3px 8px;text-align:right}th{background:#2a2a2a}td:first-child,th:first-child,td:nth-child(2){text-align:left}
.hl{background:#2a3a2a}.grid{display:flex;gap:12px;flex-wrap:wrap}.cell{width:420px}canvas{background:#000;display:block}.note{background:#2a2a2a;padding:8px 12px;border-left:3px solid #c84;margin:10px 0}button{font:inherit;padding:4px 10px}a{color:#8bd}</style>`;
const cell = (c) => `<div class="cell"><h4>${c.rig === 'lou' ? 'Lou' : 'George'} &middot; facing ${c.facing < 0 ? 'L' : 'R'} &middot; <b>${c.col}</b> &middot; standing-frame step ${c.stand} px, max ${c.max} px</h4><canvas data-dir="snap-frames/${c.id}" data-n="${c.n}" width="420" height="330"></canvas></div>`;
const order = ['lou', 'george'].flatMap(r => [-1, 1].flatMap(f => ['before', 'after'].map(col => cells.find(c => c.rig === r && c.facing === f && c.col === col))));
const loops = `<p><button id="pp">pause</button></p><script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false;const st=new Map();
const io=new IntersectionObserver(es=>es.forEach(e=>{const c=e.target;if(e.isIntersecting&&!st.has(c)){const k=+c.dataset.n;st.set(c,{imgs:Array.from({length:k},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}),f:0})}c._vis=e.isIntersecting}),{rootMargin:'200px'});
cvs.forEach(c=>io.observe(c));let last=0;
function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach(c=>{const s=st.get(c);if(!s||!c._vis)return;const im=s.imgs[s.f%s.imgs.length];if(im.complete)c.getContext('2d').drawImage(im,0,0);s.f++})}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
writeFileSync(join(DIR, 'snap-strip.html'), `<!doctype html><meta charset="utf-8"><title>T4.2 snap strip</title>${css}<h1>T4.2 snap into standing: before and after, both facings</h1>
<p>PLAN_GETUPS Rev 7 T4.2. Forced <code>backTuck</code> rise under <code>?getups=v1</code>, 1&times;, 1/60 s steps; the opponent is 30 px in front of the riser and held in <code>elbowDropping</code> (no clip drawn for it here: it is a stand-in for a mid-move opponent, as in the G3 snap cases). Fixed camera on the start position, so the snap shows as the figure jumping. <b>Before</b> = the same build with the ease's stamp swallowed (today's hard snap); <b>after</b> = the shipped ease (6&middot;s px per 1/60 s for 250 ms after standing). Loops: ${LEAD} frames of the rise, the standing frame, then ${POST} frames. Derek judges. Back to the <a href="index.html">G3 page</a>.</p>
<div class="grid">${order.map(cell).join('')}</div>${loops}
<h2>Measured root step (px), from <code>getups_snap.mjs</code></h2>
<p>Standing-frame step = root x/y change on the first standing frame; max step = the largest root step anywhere in the run. Highlighted rows are the overlap cases with a busy opponent. A standing opponent separates itself on frame 0, so the riser never moves. <code>80&middot;s</code> = 63.83 px for both rigs.</p>
<table><tr><th>rise</th><th>opponent</th><th>face</th><th>gap px</th><th>stand step before</th><th>after</th><th>max step before</th><th>after</th><th>end distance after</th></tr>${rowsHtml.join('')}</table>`);
console.log('wrote', join(DIR, 'snap-strip.html'));
process.exit(0);
