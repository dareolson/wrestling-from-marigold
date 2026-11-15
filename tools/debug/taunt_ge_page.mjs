// PLAN_GEORGE_PERFORMANCE gate GE: every wrestler's taunts through the real input path, both facings, normal speed in the full ring (video), the input that plays each,
// close stills and the probe numbers (taunt_probe.mjs JSON in <dir>/probe/).
//   WFM_URL=http://127.0.0.1:5233 node tools/debug/taunt_ge_page.mjs <dir>     (run taunt_probe.mjs <dir>/probe first)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
const [dir] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5233';
mkdirSync(`${dir}/video/_raw`, { recursive: true }); mkdirSync(`${dir}/stills`, { recursive: true });
const probe = JSON.parse(readFileSync(`${dir}/probe/taunt_probe.json`, 'utf8')).all;
const NAMES = { 'george-roster-v1': 'George', 'thesz-procreate-v1': 'Lou', 'guido-roster-v1': 'Guido', 'kowalski-roster-v1': 'Kowalski' };
const INPUT = { neutral: 'taunt button alone', up: 'Up + taunt button', down: 'Down + taunt button', forward: 'Forward (toward the opponent) + taunt button', back: 'Back + taunt button (no taunt of its own: plays neutral)', neutralDown: 'taunt button with the other man down' };
const SETUP = ({ facing, slot, downed }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, D = sc.w2; sc._p1AI = sc._p2AI = null; sc.lockupState = null;
    for (const w of [A, D]) { w.state = 'standing'; w.y = 380; w.vx = w.vy = 0; w.stamina = 100; w.lying = null; w._activeMove = null; w._facingLock = false; w.input = { justDown: () => false, isDown: () => false }; }
    A.x = 420; D.x = 420 + facing * 420; A.facing = facing; D.facing = -facing;
    if (downed) { D.state = 'down'; D.lying = 'supine'; D.x = 420 + facing * 80; sc.time.addEvent({ delay: 30, loop: true, callback: () => { if (A.state === 'taunting') { D.state = 'down'; D.lying = 'supine'; } } }); }
    const key = { up: 'up', down: 'down', forward: facing > 0 ? 'right' : 'left', back: facing > 0 ? 'left' : 'right' }[slot];
    window.__log = []; window.__go = () => {
        let press = true; A.input = { isDown: k => k === key, justDown: k => k === 'finisher' && press };
        window.__goAt = sc.time.now; A.tryFinisher(D); press = false; A.input = { isDown: () => false, justDown: () => false };
        const id = setInterval(() => { window.__log.push([Math.round(sc.time.now - window.__goAt), A._activeMove?.clip?.id ?? null, A.state]); if (window.__log.length > 140) clearInterval(id); }, 50);
    };
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
    for (const rig of Object.keys(NAMES)) {
        const keys = [...new Set(Object.keys(probe[rig] ?? {}).map(k => k.slice(2)))];
        for (const tag of keys) for (const facing of [1, -1]) {
            const slot = tag.replace('Down', ''), downed = tag.endsWith('Down') && tag !== 'down';
            const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
            const t0 = Date.now(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
            await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&georgePerformance=1&p1=${rig}&p2=${rig.startsWith('george') ? 'thesz-procreate-v1' : 'george-roster-v1'}`);
            await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
            await page.waitForTimeout(2500);
            await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, slot, downed })})`);
            await page.waitForTimeout(600);
            const tStart = (Date.now() - t0) / 1000;
            await page.evaluate(() => window.__go());
            await page.waitForTimeout(4500);
            const log = await page.evaluate(() => window.__log), tEnd = (Date.now() - t0) / 1000;
            const lastTaunt = [...log].reverse().find(r => r[2] === 'taunting');
            await ctx.close(); const file = `${rig}-${tag}-${facing > 0 ? 'right' : 'left'}.webm`; await page.video().saveAs(`${dir}/video/${file}`);
            cases.push({ rig, tag, facing, file, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2), errors, clip: log.find(r => r[1])?.[1] ?? null, playedMs: lastTaunt ? lastTaunt[0] + 50 : 0 });
        }
    }
} finally { await browser.close(); }
for (const f of readdirSync(`${dir}/probe`).filter(f => f.endsWith('.png'))) copyFileSync(`${dir}/probe/${f}`, `${dir}/stills/${f}`);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const stills = (rig, tag, f) => readdirSync(`${dir}/stills`).filter(n => n.startsWith(`${rig}_${tag}_${f > 0 ? 'R' : 'L'}_`)).sort().map(n => `<img src="stills/${n}" loading=lazy>`).join('');
const fig = c => { const r = probe[c.rig]?.[`${c.facing > 0 ? 'R' : 'L'}_${c.tag}`];
    const nums = r ? `probe (60 fps): ${r.secs} s, root drift ${r.rootDrift} px, ankle step max ${r.ankleStep} px/frame, positive lKnee/rKnee ${Math.max(r.maxLKnee, r.maxRKnee) > 0 ? 'YES' : 'none'}, ends ${r.end}` : 'no probe numbers';
    return `<figure><video src="video/${c.file}#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>${c.facing > 0 ? 'facing right' : 'facing left'} | played ${c.playedMs} ms (${esc(c.clip ?? r?.clip ?? 'pose sequence / strut')})${c.errors.length ? ' | PAGE ERRORS ' + esc(c.errors.join('; ')) : ''}</figcaption><p class=n>${esc(nums)}</p><div class=strip>${stills(c.rig, c.tag, c.facing)}</div></figure>`; };
let body = '';
for (const rig of Object.keys(NAMES)) {
    body += `<h2>${NAMES[rig]}</h2>`;
    for (const tag of [...new Set(cases.filter(c => c.rig === rig).map(c => c.tag))]) body += `<h3>${esc(INPUT[tag] ?? tag)}</h3><div class="row">${[1, -1].map(f => fig(cases.find(c => c.rig === rig && c.tag === tag && c.facing === f))).join('')}</div>`;
}
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>GE: taunts by direction</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}video{width:100%;background:#000}figcaption,.n{font-size:12.5px;color:#bbb;margin:4px 0}.strip{display:flex;gap:3px;overflow-x:auto}.strip img{height:150px}h2{margin:34px 0 0;border-bottom:1px solid #444}h3{margin:16px 0 4px;font-size:15px;color:#cde}</style>
<h1>GE: a taunt set per wrestler, picked by direction (draft, no approval)</h1>
<p>Each taunt plays through the real input path (the taunt button with the direction held at the press), under <code>?light=v1&amp;georgePerformance=1</code>, normal speed, full ring, the other man 420 px away. Forward is toward the opponent. A direction a wrestler has no taunt for plays his neutral. Numbers: <code>tools/debug/taunt_probe.mjs</code> (60 fps, loop asleep). Whether a gesture reads is Derek's call.</p>${body}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
writeFileSync(`${dir}/cases.json`, JSON.stringify(cases, null, 1));
console.log('wrote', `${dir}/index.html`);
