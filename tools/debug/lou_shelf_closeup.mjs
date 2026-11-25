// Close-up companion to lou_shelf_compare.mjs: the moves that use Lou's re-fitted variant art (grip/clasp/chop forearms,
// ankle twist, waist clasp) plus the piledriver, framed tight on the pair (camera tracks them), full-size video.
//   WFM_URL=http://localhost:5173 node tools/debug/lou_shelf_closeup.mjs research/art-revisions/2026-11-24-lou/closeup [moveId ...]
//   WFM_ZOOM=2.0 (default) sets the camera zoom.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MOVES, BASE_MOVES, SETUP } from './g12_lib.mjs';
const [dir, ...only] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://localhost:5173', ZOOM = Number(process.env.WFM_ZOOM ?? 2.0);
// [id, why it is here]
const PICK = [
    ['chop', 'chop windup/contact/follow forearms + upper arms, chop sweeps (projected)'],
    ['ankleLock', 'grip forearms; ankle twist on the shin'],
    ['wristlockHammerlock', 'grip forearm'],
    ['testOfStrength', 'collar-tie / elbow-cup clasps'],
    ['headlock', 'headlock wrap (projected arm)'],
    ['backdropSuplex', 'waist clasp (waistlock=v1)'],
    ['piledriver', 'crownBelowHip not re-measured'],
];
const ALL = [...MOVES, ...BASE_MOVES, ['chop', '_doChop', 'tie']];
const moves = PICK.filter(([id]) => !only.length || only.includes(id)).map(([id, why]) => [...ALL.find(m => m[0] === id), why]);
const RIGS = [['lou', 'thesz-procreate-v1'], ['shelf', 'thesz-procreate-shelf']];
const W = 960, H = 600;   // the game canvas size (no letterbox)
mkdirSync(`${dir}/video/_raw`, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
    for (const [id, exec, kind] of moves) for (const facing of [1, -1]) for (const [name, rig] of RIGS) {
        const tag = `${id}-${name}-${facing > 0 ? 'right' : 'left'}`;
        const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: W, height: H } } });
        const page = await ctx.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&waistlock=v1&p1=${rig}&p2=george-roster-v1`);
        await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
        await page.waitForTimeout(1500);
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, kind })})`);
        // Track the pair every frame: midpoint in x; in y the lower feet (w.y) sit at screen y 480, above the
        // 88px HUD bar at the canvas bottom, so lifts
        // (piledriver, suplex) have the rest of the frame above them.
        await page.evaluate(zoom => {
            const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main;
            cam.stopFollow?.(); cam.removeBounds?.(); cam.setZoom(zoom);
            const aim = () => cam.centerOn((sc.w1.x + sc.w2.x) / 2, Math.max(sc.w1.y, sc.w2.y) - (480 - cam.height / 2) / cam.zoom);
            aim(); sc.events.on('postupdate', aim);
        }, ZOOM);
        await page.waitForTimeout(500);
        const dur = await page.evaluate(exec => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1[exec](sc.w2); return sc.w1._activeMove?.clip.duration ?? 2; }, exec);
        await page.waitForTimeout(Math.round((dur + 1.4) * 1000));
        await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}.webm`); await page.video().delete();
        cases.push({ tag, errors });
        console.log(tag, errors.length ? `ERRORS ${errors.join(' | ')}` : 'ok');
    }
} finally { await browser.close(); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cell = tag => { const c = cases.find(x => x.tag === tag); return `<td><div class=v><video src="video/${tag}.webm" autoplay loop muted playsinline></video></div>${c.errors.length ? `<p class=e>${esc(c.errors.join(' | '))}</p>` : ''}</td>`; };
const rows = moves.map(([id, , , why]) => `<tr><th colspan=2>${esc(id)} <span>${esc(why)}</span></th></tr>`
    + ['right', 'left'].map(side => `<tr>${cell(`${id}-lou-${side}`)}${cell(`${id}-shelf-${side}`)}</tr>`).join('')).join('');
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>Lou close-up</title><style>body{background:#1d1f22;color:#ddd;font:14px system-ui;margin:16px}table{border-collapse:collapse}td{padding:4px;vertical-align:top}th{text-align:left;padding:18px 4px 4px;font-size:17px}th span{font-weight:400;color:#9ab;font-size:13px;margin-left:8px}div.v{width:min(46vw,720px);aspect-ratio:960/512;overflow:hidden}video{width:100%;display:block}.e{color:#f77}.h th{font-size:13px;color:#9ab}</style>
<h1>Lou close-up: new body (left) vs shelved body (right), on George, normal speed, zoom ${ZOOM}</h1><p>Each move: facing right, then facing left. The camera tracks the pair. Notes say which re-fitted art the move shows.</p>
<table><tr class=h><th>New Lou (Lou2.psd body)</th><th>Shelved body</th></tr>${rows}</table>`);
console.log(`${dir}/index.html`);
