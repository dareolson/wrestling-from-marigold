// PLAN_GEORGE_PERFORMANCE gate GD: George's hair check (taunt) and the wear-triggered hair fix, both facings, all three wear stages, at normal speed
// in the full ring (video), plus close stills and the probe numbers (hair_arm_probe.mjs JSON read from <dir>/probe/).
//   WFM_URL=http://127.0.0.1:5233 node tools/debug/hair_gd_page.mjs <dir>     (run hair_arm_probe.mjs <dir>/probe check|one|two first)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
const [dir] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5233';
mkdirSync(`${dir}/video/_raw`, { recursive: true }); mkdirSync(`${dir}/stills`, { recursive: true });
// [tag, wear stage, how it starts, title]
const CASES = [
    ...[0, 1, 2].map(s => [`check-s${s}`, s, 'taunt', `Hair check from the taunt, wear stage ${s}`]),
    ['fix-s1', 1, 'wear', 'Wear stage 0 to 1: the fix he starts himself (one stroke, irritated)'],
    ['fix-s2', 2, 'wear', 'Wear stage 1 to 2: the fix he starts himself (two hurried tries, the second breaks off)'],
];
const SETUP = ({ facing, stage, how }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, D = sc.w2; sc._p1AI = sc._p2AI = null; sc.lockupState = null;
    for (const w of [A, D]) { w.state = 'standing'; w.y = 380; w.vx = w.vy = 0; w.stamina = 100; w.lying = null; w._activeMove = null; w._facingLock = false; w.input = { justDown: () => false, isDown: () => false }; }
    A.x = 430; D.x = 430 + facing * 300; A.facing = facing; D.facing = -facing;
    const wearOf = s => [0, 30, 70][s];
    A.face.state = { ...A.face.state, wear: wearOf(how === 'wear' ? stage - 1 : stage), stage: how === 'wear' ? stage - 1 : stage };
    A._hairFix = null;   // a fresh queue adopts the starting stage without queueing a fix for it
    window.__log = []; window.__go = () => {
        if (how === 'taunt') A._doHairCheck();
        else A.face.state = { ...A.face.state, wear: wearOf(stage), stage };
        window.__goAt = sc.time.now;
        const id = setInterval(() => { const c = A._activeMove?.clip?.id ?? null; window.__log.push([Math.round(sc.time.now - window.__goAt), c, A.state]); if (window.__log.length > 400) clearInterval(id); }, 50);
    };
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
    for (const [tag, stage, how, title] of CASES) for (const facing of [1, -1]) {
        const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
        const t0 = Date.now(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&georgePerformance=1&p1=george-roster-v1&p2=thesz-procreate-v1`);
        await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
        await page.waitForTimeout(2500);
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, stage, how })})`);
        await page.waitForTimeout(600);
        const tStart = (Date.now() - t0) / 1000;
        await page.evaluate(() => window.__go());
        await page.waitForTimeout(4200);
        const log = await page.evaluate(() => window.__log), tEnd = (Date.now() - t0) / 1000;
        const first = log.find(r => r[1]?.startsWith('georgeHair')), last = [...log].reverse().find(r => r[1]?.startsWith('georgeHair'));
        await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}-${facing > 0 ? 'right' : 'left'}.webm`);
        cases.push({ tag, title, stage, how, facing, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2), errors, startedAfterMs: first?.[0] ?? null, clip: first?.[1] ?? null, playedMs: first ? last[0] - first[0] + 50 : 0 });
    }
} finally { await browser.close(); }
// close stills from the probe runs
for (const mode of ['check', 'one', 'two']) if (existsSync(`${dir}/probe`)) for (const f of readdirSync(`${dir}/probe`).filter(f => f.startsWith(mode + '_') && f.endsWith('.png'))) copyFileSync(`${dir}/probe/${f}`, `${dir}/stills/${f}`);
const probe = m => existsSync(`${dir}/probe/${m}_probe.json`) ? JSON.parse(readFileSync(`${dir}/probe/${m}_probe.json`, 'utf8')).sum : null;
const P = { check: probe('check'), one: probe('one'), two: probe('two') };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const numRow = (mode, f, s) => { const r = P[mode]?.[`${f > 0 ? 'R' : 'L'}${s}`]; return r ? `${mode}: ${r.frames} frames (${(r.frames / 60).toFixed(2)} s), root drift ${r.rootDriftMax} px, ankle step max ${r.ankleStepMax} px/frame, hairContact distance on the hair ${r.contactDistMin}-${r.contactDistMax} px (hold ${r.contactDistMin}), eye covered ${r.eyeCoveredFrames} / mouth covered ${r.mouthCoveredFrames} frames, ends ${r.endState}` : 'no probe numbers'; };
const stillsFor = (mode, f, s) => readdirSync(`${dir}/stills`).filter(n => n.startsWith(`${mode}_${f > 0 ? 'R' : 'L'}_s${s}_`)).sort().map(n => `<img src="stills/${n}" loading=lazy>`).join('');
const fig = c => { const mode = c.how === 'wear' ? (c.stage === 1 ? 'one' : 'two') : 'check';
    return `<figure><video src="video/${c.tag}-${c.facing > 0 ? 'right' : 'left'}.webm#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>${c.facing > 0 ? 'facing right' : 'facing left'}${c.how === 'wear' ? ` | started itself ${c.startedAfterMs} ms after the stage change, played ${c.playedMs} ms (${esc(c.clip)})` : ` | played ${c.playedMs} ms`}${c.errors.length ? ' | PAGE ERRORS ' + esc(c.errors.join('; ')) : ''}</figcaption><p class=n>${esc(numRow(mode, c.facing, c.stage))}</p><div class=strip>${stillsFor(mode, c.facing, c.stage)}</div></figure>`; };
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>GD: George hair check and fix</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}video{width:100%;background:#000}figcaption,.n{font-size:12.5px;color:#bbb;margin:4px 0}.strip{display:flex;gap:3px;overflow-x:auto}.strip img{height:170px}h2{margin:26px 0 4px}</style>
<h1>GD: George's hair check and the wear-triggered fix (draft, no approval)</h1>
<p>Near arm (Codex's hairReach upper arm + hairFix forearm) through the real executor under <code>?light=v1&amp;georgePerformance=1</code>, normal speed, full ring, Lou 300 px away. Numbers are measured by <code>tools/debug/hair_arm_probe.mjs</code> (60 fps, loop asleep): hairContact distance is to a forelock point on the head box; eye/mouth coverage tests two points on the head against the arm art's alpha. Whether it reads at game size is Derek's call.</p>
${CASES.map(([tag, , , title]) => `<h2>${esc(title)}</h2><div class="row">${[1, -1].map(f => fig(cases.find(c => c.tag === tag && c.facing === f))).join('')}</div>`).join('')}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
writeFileSync(`${dir}/cases.json`, JSON.stringify(cases, null, 1));
console.log('wrote', `${dir}/index.html`);
