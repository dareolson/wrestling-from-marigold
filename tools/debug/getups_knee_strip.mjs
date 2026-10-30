// T4.3 (PLAN_GETUPS Rev 8) loop strip: the grounded knee clamp before / after, Lou and George, both facings, 1x.
// Two scenes per rig and facing, forced, 1/60 s steps, tween clock pinned (as getups_snap_strip.mjs):
//   rise: 0.5 s lying on his back (the lying pose: knee +0.15 rad past straight before the clamp), then the full backTuck rise to standing + 8 frames
//         (?getups=v1&getup=backTuck; backTuck carries +0.18 through the rise)
//   roll: the supine roll sell played on the mat (the one table sell that opens a knee far past straight: on the turned half it is +0.7 rad at
//         its turnover, and Wrestler._sellPose skips limitKnees for a roll). getups=v1 never PLANS a roll (noRoll, D7); it is forced here
// "before" = the same game with the clamp off (the skeleton's _getUps flag is dropped for each _applyGrounded call only: nothing else changes);
// "after" = the shipped clamp. The crop is fixed on the start position.
//
//   WFM_URL=http://localhost:5173 node tools/debug/getups_knee_strip.mjs [dir=research/animation/getups-2026-10/knee]
// Writes <dir>/knee-strip.html and <dir>/strip-frames/<scene>-<rig>-<l|r>-<before|after>/sNNNN.jpg (raw frames: not committed, .git/info/exclude).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

const DIR = process.argv[2] ?? 'research/animation/getups-2026-10/knee';
const RIGS = { lou: 'thesz-procreate-v1', george: 'george-roster-v1' };
const WHO = { lou: 'w1', george: 'w2' };
const LYING_FRAMES = 30, POST = 8, ROLL_FRAMES = 80;

const INSTALL = () => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    let a = 0x5eed1234;
    Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    window.__T = sc.time.now;
};
// both skeletons: _applyGrounded wrapped once; `clamp` (window.__clamp) says whether the clamp is on for this clip
const WRAP = () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const who of ['w1', 'w2']) {
        const sk = sc[who].skeleton;
        if (sk.__wrapped) continue;
        const orig = sk._applyGrounded.bind(sk), recOrig = sk._recordJointAttachment.bind(sk);
        let cap = null;
        sk._recordJointAttachment = (name, img, x, y, angle) => { if (cap && /^(near|far)(Hip|Knee)$/.test(name)) cap[name] = angle; return recOrig(name, img, x, y, angle); };
        sk._applyGrounded = (x, y, s, facing, g) => {
            const on = sk._getUps, f = facing >= 0 ? 1 : -1;
            if (!window.__clamp) sk._getUps = false;
            cap = {}; orig(x, y, s, facing, g); const c = cap; cap = null; sk._getUps = on;
            sk.__d = { near: f * (c.nearKnee - c.nearHip), far: f * (c.farKnee - c.farHip) };
        };
        sk.__wrapped = true;
    }
};
// in-page: set the wrestler down on his back far from the other one; `scene` rise = lie there, roll = a roll sell is planned
const BEGIN = ({ who, facing, scene, clamp }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc[who], o = sc[who === 'w1' ? 'w2' : 'w1'];
    window.__clamp = clamp;
    for (const q of [w, o]) { q.scene.tweens.killTweensOf(q); q.scene.tweens.killTweensOf(q.pose); }
    w.x = 520; w.y = 355; w.facing = facing; w.lying = 'supine';
    o.x = 520 - facing * 380; o.y = w.y; o.state = 'standing'; o.vx = 0; o.vy = 0;
    for (const q of [w, o]) { q._activeMove = null; q._choreoUntil = 0; q._groundHandoff = null; q._sell = null; q._hold = null; q._pain = null; q.stamina = 100; q.combatBlend = 0; q.moveBlend = 0; q.walkPhase = 0; }
    Object.assign(w.pose, { lLeg: 0.1, rLeg: 0.35, lArm: 0.05, rArm: 0.12, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.1, rElbow: 0.2, lKnee: 0.15, rKnee: 0.6 });
    w.state = 'down'; w.stateTimer = 99; w.fallProgress = 1;
    window.__rw = w; window.__scene = scene; window.__dMax = { near: -9, far: -9 };
    if (scene === 'roll') w._sell = { plan: [{ name: 'roll', lying: 'supine', duration: 0.9, amp: 1.3, limb: null, rolls: 0 }], i: 0, t: 0, facing0: facing };
};
const START_RISE = () => window.__rw._startRiseUp();
const STEP = () => {
    const game = window.__WFM_GAME, w = window.__rw, sk = w.skeleton;
    window.__T += 1000 / 60;
    game.step(window.__T, 1000 / 60);
    const d = sk.__d; sk.__d = null;
    if (d) { window.__dMax.near = Math.max(window.__dMax.near, d.near); window.__dMax.far = Math.max(window.__dMax.far, d.far); }
    return { state: w.state, d };
};

process.env.WFM_P1 = RIGS.lou; process.env.WFM_P2 = RIGS.george; process.env.WFM_QS = 'notitle=1&getups=v1&getup=backTuck';
const h = await launch();
const cells = [];
try {
    const page = h.page;
    for (let i = 0; i < 60 && !(await h.snap())?.w1; i++) await page.waitForTimeout(500);
    await page.evaluate(INSTALL);
    await page.evaluate(WRAP);
    const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
    const clip = { width: 520, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 260), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
    for (const scene of ['rise', 'roll']) for (const rig of ['lou', 'george']) for (const facing of [-1, 1]) for (const col of ['before', 'after']) {
        const id = `${scene}-${rig}-${facing < 0 ? 'l' : 'r'}-${col}`, dir = join(DIR, 'strip-frames', id);
        rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
        await page.evaluate(BEGIN, { who: WHO[rig], facing, scene, clamp: col === 'after' });
        let n = 0, standI = null;
        const shot = async () => page.screenshot({ path: join(dir, `s${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 80, clip });
        if (scene === 'rise') {
            for (let i = 0; i < LYING_FRAMES; i++) { await page.evaluate(STEP); await shot(); }
            await page.evaluate(START_RISE);
            for (let i = 0; i < 400; i++) {
                const f = await page.evaluate(STEP); await shot();
                if (standI === null && f.state === 'standing') standI = i;
                if (standI !== null && i - standI >= POST) break;
            }
        } else for (let i = 0; i < ROLL_FRAMES; i++) { await page.evaluate(STEP); await shot(); }
        const dMax = await page.evaluate(() => window.__dMax);
        cells.push({ id, scene, rig, facing, col, n, near: +dMax.near.toFixed(3), far: +dMax.far.toFixed(3) });
        console.log(`[knee-strip] ${id}: ${n} frames, drawn knee past straight: near ${dMax.near.toFixed(3)} far ${dMax.far.toFixed(3)}`);
    }
} finally { await h.close(); }

// ── page ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const css = `<style>body{font:14px system-ui;margin:20px;background:#1c1c1c;color:#ddd;max-width:1500px}h1,h2{font-weight:600}h4{margin:2px 0 4px;color:#9ad;font-size:12px;font-weight:500}
table{border-collapse:collapse;margin:8px 0}td,th{border:1px solid #444;padding:3px 8px;text-align:right}th{background:#2a2a2a}td:first-child,th:first-child{text-align:left}
.hl{background:#2a3a2a}.grid{display:flex;gap:12px;flex-wrap:wrap}.cell{width:520px}canvas{background:#000;display:block}button{font:inherit;padding:4px 10px}a{color:#8bd}</style>`;
const cell = (c) => `<div class="cell"><h4>${c.rig === 'lou' ? 'Lou' : 'George'} &middot; facing ${c.facing < 0 ? 'L' : 'R'} &middot; <b>${c.col}</b> &middot; knee past straight, worst: near ${c.near} rad, far ${c.far} rad</h4><canvas data-dir="strip-frames/${c.id}" data-n="${c.n}" width="520" height="330"></canvas></div>`;
const pick = (scene) => ['lou', 'george'].flatMap(r => [-1, 1].flatMap(f => ['before', 'after'].map(col => cells.find(c => c.scene === scene && c.rig === r && c.facing === f && c.col === col))));
const loops = `<p><button id="pp">pause</button></p><script>
const cvs=[...document.querySelectorAll('canvas')];let paused=false;const st=new Map();
const io=new IntersectionObserver(es=>es.forEach(e=>{const c=e.target;if(e.isIntersecting&&!st.has(c)){const k=+c.dataset.n;st.set(c,{imgs:Array.from({length:k},(_,i)=>{const im=new Image();im.src=c.dataset.dir+'/s'+String(i).padStart(4,'0')+'.jpg';return im}),f:0})}c._vis=e.isIntersecting}),{rootMargin:'200px'});
cvs.forEach(c=>io.observe(c));let last=0;
function tick(t){if(!paused&&t-last>=1000/60){last=t;cvs.forEach(c=>{const s=st.get(c);if(!s||!c._vis)return;const im=s.imgs[s.f%s.imgs.length];if(im.complete)c.getContext('2d').drawImage(im,0,0);s.f++})}requestAnimationFrame(tick)}
document.getElementById('pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause'};requestAnimationFrame(tick);
</script>`;
writeFileSync(join(DIR, 'knee-strip.html'), `<!doctype html><meta charset="utf-8"><title>T4.3 knee strip</title>${css}<h1>T4.3 knees past straight on the mat: before and after, both facings</h1>
<p>PLAN_GETUPS Rev 8 T4.3, Derek's G3 &quot;gumby legs&quot;. 1&times;, 1/60 s steps, <code>?getups=v1</code>. <b>Before</b> = the same game with the clamp off; <b>after</b> = the shipped clamp: under the flag a leg whose knee is past straight is drawn with the shin at the thigh's angle (the knee exactly straight, 0 rad), never bent backwards; a bent knee is untouched. The camera is fixed on the start position. The audit behind it: commit 34b3d71 (<code>knee/knee-audit.json</code>, <code>knee-match.json</code>); drawn knee after the clamp: <code>knee/knee-audit-after.json</code>. Derek judges: does a straight knee read better, or should it keep a slight bend (e.g. clamp at 0.05 rad flexed)? Back to the <a href="../g3/index.html">G3 page</a>.</p>
<h2>1. Lying on his back, then the backTuck rise</h2><p>Half a second lying (the lying pose is 0.15 rad past straight), then the full backTuck rise (+0.18 around riseT 0.28), to standing + 8 frames.</p>
<div class="grid">${pick('rise').map(cell).join('')}</div>
<h2>2. The roll sell (forced)</h2><p>The supine roll, 1.3&times; amplitude, played on the mat: the turned half opens the knee +0.7 rad past straight (peak near the turnover). <code>getups=v1</code> never plans a roll (D7), so this is the table's worst case forced in, not something the reel shows.</p>
<div class="grid">${pick('roll').map(cell).join('')}</div>${loops}`);
console.log('wrote', join(DIR, 'knee-strip.html'));
process.exit(0);
