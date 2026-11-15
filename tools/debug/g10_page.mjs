// PLAN_LIGHT_MOVES T11.7: the combined G10+G11 page. Every new light move (T10.1-T10.4, T11.1-T11.6) through its real executor at normal speed, Lou on George and George on Lou, both facings, with the
// numbers (strike_measure.mjs JSON where the move has one) beside each loop, the kit table, and the soak results if given.
//   WFM_URL=http://localhost:5197 node tools/debug/g10_page.mjs research/animation/light-moves-2026-11/g10 [soak.json]   (measure JSON read from <dir>/measure/<move>.json when present)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { ROSTER_KITS, lightKit } from '../../src/characters/rosterKits.js';
const [dir, soakJson] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://localhost:5197';
mkdirSync(`${dir}/video`, { recursive: true });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
// id, executor, setup of the other man, title, what to press (the input), the default kits
const MOVES = [
    ['clubBlow',        '_doClubBlow',        'standing',  'T10.1 Club blow / forearm smash', 'Power, no direction (replaces the jab)', 'George, Kowalski'],
    ['runningForearm',  '_doRunningForearm',  'runnerAtk', 'T10.2 Running forearm',           'Power while returning off the ropes',  'Lou, Guido'],
    ['shoulderBlock',   '_doShoulderBlock',   'standing',  'T10.3 Shoulder block',            'Forward + Power at medium reach',      'Kowalski, George'],
    ['mountedPunches',  '_doMountedPunches',  'supine',    'T10.4 Mounted punches',           'Down + Action next to a man on his back', 'everyone'],
    ['chop',            '_doChop',            'standing',  'T11.1 Knife-edge chop',           'Up + Power',                           'Kowalski, Lou'],
    ['uppercut',        '_doUppercut',        'standing',  'T11.2 European uppercut',         'Back + Power',                         'Guido, Kowalski'],
    ['backElbow',       '_doBackElbow',       'runner',    'T11.3 Back elbow vs a runner',    'Down + Action vs a returning runner',  'George, Kowalski'],
    ['legSweep',        '_doLegSweep',        'standing',  'T11.4 Leg sweep',                 'Down + Action vs a standing man',      'Lou, Guido'],
    ['axeHandleBack',   '_doAxeHandleBack',   'staggered', 'T11.5 Double axe handle to the back', 'Down + Power vs a staggered man', 'George, Kowalski'],
    ['bodyStomps',      '_doBodyStomps',      'prone',     'T11.6 Body stomps',               'Down + Action next to a man on his stomach', 'George, Kowalski'],
];
const SETUP = ({ facing, exec, kind }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w1 = sc.w1, w2 = sc.w2; sc._p1AI = sc._p2AI = null;
    for (const w of [w1, w2]) { w.state = 'standing'; w.y = 330; w.vx = w.vy = 0; w.stamina = 100; w.wear = 0; w.lying = null; w.input = { justDown: () => false, isDown: () => false }; }
    const ground = kind === 'supine' || kind === 'prone';
    w1.x = 520; w1.facing = facing; w2.x = 520 + facing * (ground ? 90 : 80 * w1.s); w2.facing = ground && kind === 'supine' ? -facing : (ground ? facing : -facing);
    if (ground) { w2.state = 'down'; w2.lying = kind; w2.stateTimer = 99; }
    const cam = sc.cameras.main; cam.stopFollow?.(); cam.removeBounds?.(); cam.setZoom(1.3); cam.centerOn(w2.x - facing * 30, 290);
    window.__go = () => {
        if (kind === 'runner') { w2.state = 'running'; w2.runPhase = 'returning'; w2.runFacing = -facing; w2.facing = -facing; w2.runTarget = w1.x - facing * 400; w2.x = w1.x + facing * 330; }
        if (kind === 'runnerAtk') { w1.state = 'running'; w1.runPhase = 'returning'; w1.runFacing = facing; w1.x = 520 - facing * 140; }
        if (kind === 'staggered') w2.startStagger();
        w1[exec](w2);
    };
};
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
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, exec, kind })})`);
        await page.waitForTimeout(500);
        const tStart = (Date.now() - t0) / 1000;
        await page.evaluate(() => window.__go());
        await page.waitForTimeout(kind === 'supine' || kind === 'prone' ? 4200 : 2600);
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
    return r ? `<p class=n>${esc(Object.entries(r).filter(([k]) => !['attacker', 'defender', 'facing'].includes(k)).map(([k, v]) => `${k} ${v}`).join(' | '))}</p>` : '<p class=n>no numbers</p>';
};
const fig = c => `<figure><video src="video/${c.tag}.webm#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>${esc(c.name.replace('-', ' on '))}, facing ${c.facing > 0 ? 'right' : 'left'}${c.errors.length ? ' (page errors ' + c.errors.length + ')' : ''}</figcaption>${nums(c.id, c.name, c.facing)}</figure>`;
const kitRows = MOVES.map(([id, , , title, input, kits]) => `<tr><td>${esc(title)}</td><td>${esc(input)}</td><td>${esc(kits)}</td><td>${['thesz', 'george', 'kowalski', 'guido'].filter(k => lightKit(k).includes(id)).join(', ')}</td></tr>`).join('');
const soak = soakJson && existsSync(soakJson) ? JSON.parse(readFileSync(soakJson, 'utf8')) : null;
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>G10 + G11 new light moves</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}video{width:100%;background:#000}.n{font:12px ui-monospace,monospace;color:#bbb;margin:2px 0 12px}table{border-collapse:collapse}td,th{border:1px solid #444;padding:4px 8px;text-align:left}h2{margin-top:30px}</style>
<h1>G10 + G11: ten new light moves (draft, no approval)</h1><p>Each through its real executor at normal speed under <code>?light=v1</code>, Lou on George and George on Lou, both facings. The numbers are measured; whether it reads is Derek's call.</p>
<h2>Kit table (defaults, Derek overrides)</h2><table><tr><th>Move</th><th>Input</th><th>Default kits</th><th>Kits that hold it now</th></tr>${kitRows}</table>
${soak ? `<h2>Soak</h2><pre>${esc(JSON.stringify(soak, null, 1))}</pre>` : ''}
${MOVES.map(([id, , , title, input]) => `<h2>${esc(title)}</h2><p>${esc(input)}</p>${['lou-george', 'george-lou'].map(name => `<div class="row">${[1, -1].map(f => fig(cases.find(c => c.id === id && c.name === name && c.facing === f))).join('')}</div>`).join('')}`).join('')}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
console.log('wrote', `${dir}/index.html`);
