// PLAN_LIGHT_MOVES Stage 12 (T12.11): the combined page. All ten mat / lockup moves through their real executors at normal speed, Lou on George and George on Lou, both facings, with the numbers
// (g12_play.mjs JSON from <dir>/measure/<move>.json) beside each loop, the input for each, the kit table and the soak results if given.
//   WFM_URL=http://localhost:5231 node tools/debug/g12_page.mjs research/animation/light-moves-2026-11/g12 [soak-summary.json]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { lightKit } from '../../src/characters/rosterKits.js';
import { MOVES, SETUP } from './g12_lib.mjs';
const [dir, soakJson] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://localhost:5231';
mkdirSync(`${dir}/video`, { recursive: true });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
    for (const [id, exec, kind] of MOVES) for (const [name, a, d] of PAIRS) for (const facing of [1, -1]) {
        const tag = `${id}-${name}-${facing > 0 ? 'right' : 'left'}`;
        const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
        const t0 = Date.now(), page = await ctx.newPage();
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
        await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
        await page.waitForTimeout(1500);
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, kind })})`);
        await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main; cam.stopFollow?.(); cam.removeBounds?.(); cam.setZoom(1.3); cam.centerOn((sc.w1.x + sc.w2.x) / 2, 310); });
        await page.waitForTimeout(500);
        const tStart = (Date.now() - t0) / 1000;
        const dur = await page.evaluate(exec => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1[exec](sc.w2); return sc.w1._activeMove?.clip.duration ?? 2; }, exec);
        await page.waitForTimeout(Math.round((dur + 1.4) * 1000));
        const tEnd = (Date.now() - t0) / 1000;
        await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}.webm`);
        cases.push({ tag, id, name, facing, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2), errors });
    }
} finally { await browser.close(); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const measure = id => { const f = `${dir}/measure/${id}.json`; return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };
const nums = (id, name, facing) => {
    const rows = measure(id); if (!rows) return '<p class=n>no numbers</p>';
    const [att, def] = name.split('-'), r = rows.find(x => x.attacker === att && x.defender === def && x.facing === (facing > 0 ? 'R' : 'L'));
    if (!r || r.shots) return '<p class=n>no numbers</p>';
    return `<p class=n>${esc(`fired ${r.fired} | hits ${r.hits} drain ${r.drain} | clip ${(+r.dur).toFixed(2)} s | joint step mid ${r.stepMid.a}/${r.stepMid.d} px (att/man), start ${r.stepStart}, end ${r.stepEnd} | closest ${Math.round(r.minGap)} px | ends ${r.end.a}/${r.end.d}${r.end.dLying ? ':' + r.end.dLying : ''}, past the ring clamp ${r.end.aClamp}/${r.end.dClamp}`)}</p>`;
};
const fig = c => `<figure><video src="video/${c.tag}.webm#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>${esc(c.name.replace('-', ' on '))}, facing ${c.facing > 0 ? 'right' : 'left'}${c.errors.length ? ' (page errors ' + c.errors.length + ')' : ''}</figcaption>${nums(c.id, c.name, c.facing)}</figure>`;
const kitRows = MOVES.map(([id, , , title, input, kits]) => `<tr><td>${esc(title)}</td><td>${esc(input)}</td><td>${esc(kits)}</td><td>${['thesz', 'george', 'kowalski', 'guido'].filter(k => lightKit(k).includes(id)).join(', ')}</td></tr>`).join('');
const soak = soakJson && existsSync(soakJson) ? JSON.parse(readFileSync(soakJson, 'utf8')) : null;
const NOTES = existsSync(`${dir}/misses.html`) ? readFileSync(`${dir}/misses.html`, 'utf8') : '';
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>G12 ten mat and lockup moves</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}video{width:100%;background:#000}.n{font:12px ui-monospace,monospace;color:#bbb;margin:2px 0 12px}table{border-collapse:collapse}td,th{border:1px solid #444;padding:4px 8px;text-align:left}h2{margin-top:30px}li{margin:3px 0}</style>
<h1>G12: ten mat and lockup moves (rough first build, no approval)</h1><p>Each through its real executor at normal speed under <code>?light=v1</code>, Lou on George and George on Lou, both facings. Hand-posed with no footage: expect them to look terrible until dialled in. The numbers are measured; whether any of it reads is Derek's call.</p>
${NOTES}
<h2>Kit table (defaults, Derek overrides)</h2><table><tr><th>Move</th><th>Input</th><th>Default kits</th><th>Kits that hold it now</th></tr>${kitRows}</table>
${soak ? `<h2>Soak</h2><pre>${esc(JSON.stringify(soak, null, 1))}</pre>` : ''}
${MOVES.map(([id, , , title, input]) => `<h2>${esc(title)}</h2><p>${esc(input)}</p>${['lou-george', 'george-lou'].map(name => `<div class="row">${[1, -1].map(f => fig(cases.find(c => c.id === id && c.name === name && c.facing === f))).join('')}</div>`).join('')}`).join('')}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
console.log('wrote', `${dir}/index.html`);
