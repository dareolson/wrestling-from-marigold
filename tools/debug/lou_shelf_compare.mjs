// Lou (Lou2.psd body, 2026-11-24) vs the shelved pre-swap Procreate Lou: the same mat/lockup and base moves on George, both facings, normal speed, side by side.
//   WFM_URL=http://localhost:5173 node tools/debug/lou_shelf_compare.mjs research/art-revisions/2026-11-24-lou/compare [moveId ...]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MOVES, BASE_MOVES, SETUP } from './g12_lib.mjs';
const [dir, ...only] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://localhost:5173';
const PICK = ['wristlockHammerlock', 'headlockTakeover', 'flyingMare', 'testOfStrength', 'backwardRoll', 'kipUp', 'abdominalStretch', 'indianDeathlock', 'hipToss', 'suplex', 'halfBostonCrab', 'piledriver', 'ankleLock', 'headlock'];
const moves = [...MOVES, ...BASE_MOVES].filter(m => (only.length ? only : PICK).includes(m[0]));
const RIGS = [['lou', 'thesz-procreate-v1'], ['shelf', 'thesz-procreate-shelf']];
mkdirSync(`${dir}/video/_raw`, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
    for (const [id, exec, kind] of moves) for (const facing of [1, -1]) for (const [name, rig] of RIGS) {
        const tag = `${id}-${name}-${facing > 0 ? 'right' : 'left'}`;
        const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
        const page = await ctx.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&p1=${rig}&p2=george-roster-v1`);
        await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
        await page.waitForTimeout(1500);
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, kind })})`);
        await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main; cam.stopFollow?.(); cam.removeBounds?.(); cam.setZoom(1.3); cam.centerOn((sc.w1.x + sc.w2.x) / 2, 310); });
        await page.waitForTimeout(500);
        const dur = await page.evaluate(exec => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1[exec](sc.w2); return sc.w1._activeMove?.clip.duration ?? 2; }, exec);
        await page.waitForTimeout(Math.round((dur + 1.4) * 1000));
        await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}.webm`); await page.video().delete();
        cases.push({ tag, id, name, facing, errors });
        console.log(tag, errors.length ? `ERRORS ${errors.join(' | ')}` : 'ok');
    }
} finally { await browser.close(); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cell = (id, name, side) => { const c = cases.find(x => x.tag === `${id}-${name}-${side}`); return `<td><video src="video/${c.tag}.webm" autoplay loop muted playsinline></video>${c.errors.length ? `<p class=e>${esc(c.errors.join(' | '))}</p>` : ''}</td>`; };
const rows = moves.map(([id]) => `<tr><th colspan=4>${esc(id)}</th></tr><tr>${cell(id, 'lou', 'right')}${cell(id, 'shelf', 'right')}${cell(id, 'lou', 'left')}${cell(id, 'shelf', 'left')}</tr>`).join('');
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>Lou vs shelf</title><style>body{background:#1d1f22;color:#ddd;font:14px system-ui;margin:16px}table{border-collapse:collapse}td{padding:4px;vertical-align:top}th{text-align:left;padding:14px 4px 2px;font-size:16px}video{width:400px;display:block}.e{color:#f77;max-width:400px}.h th{font-size:13px;color:#9ab}</style>
<h1>Lou (Lou2.psd body, 2026-11-24) vs shelved Procreate body, on George, normal speed</h1><p>Same moves, same per-rig tuning (the shelf runs Lou's via moveRig). Variants on the new body were re-fitted by tools/art/rebase_variants.py.</p>
<table><tr class=h><th>Lou, facing right</th><th>Shelf, facing right</th><th>Lou, facing left</th><th>Shelf, facing left</th></tr>${rows}</table>`);
console.log(`${dir}/index.html`);
