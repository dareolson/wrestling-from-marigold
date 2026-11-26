// PLAN_ROPES TC.2: stills of the ring corners, old | ?corners=v1, the full ring, a man cornered and a man on the top turnbuckle, with Derek's reference photo beside them.
//   WFM_URL=http://localhost:5174 node tools/debug/ring_corners_page.mjs [outDir=research/ropes-2026-11/rc/tc2]
// Needs research/ropes-2026-11/rc/reference-1940s-ring.png (Derek's photo); the page links it as ../reference-1940s-ring.png.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { RING } from '../../src/constants.js';
import { cornerGeom } from '../../src/ringCorners.js';

const outDir = process.argv[2] ?? 'research/ropes-2026-11/rc/tc2';
mkdirSync(outDir, { recursive: true });
const G = cornerGeom(RING);

async function shoot(qs, tag) {
    process.env.WFM_QS = 'notitle=1&ropes=v1' + qs; process.env.WFM_P1 = 'thesz-procreate-v1'; process.env.WFM_P2 = 'george-roster-v1';
    const h = await launch();
    try {
        await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 });
        await h.page.waitForTimeout(1500);
        const box = await h.page.evaluate((R) => { window.__R = R; const g = window.__WFM_GAME, sc = g.scene.scenes[0], b = document.querySelector('canvas').getBoundingClientRect(); g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now;
            for (const w of [sc.w1, sc.w2]) w.input = { justDown: () => false, isDown: () => false }; return { x: b.x, y: b.y, w: b.width, h: b.height, gw: g.scale.gameSize.width, gh: g.scale.gameSize.height }; }, RING);
        const step = (n) => h.page.evaluate((n) => { for (let i = 0; i < n; i++) { window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); } }, n);
        const px = (gx, gy) => ({ x: box.x + gx * box.w / box.gw, y: box.y + gy * box.h / box.gh });
        const clip = (gx, gy, gw, gh) => { const a = px(gx - gw / 2, gy - gh / 2), b = px(gx + gw / 2, gy + gh / 2); return { x: Math.max(0, a.x), y: Math.max(0, a.y), width: b.x - a.x, height: b.y - a.y }; };
        await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1.x = 400; sc.w2.x = 560; sc.w1.y = sc.w2.y = 360; sc.w1.facing = 1; sc.w2.facing = -1; });
        await step(30);
        await h.page.screenshot({ path: join(outDir, `full-${tag}.png`), clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
        for (const k of ['nl', 'nr', 'fl', 'fr']) await h.page.screenshot({ path: join(outDir, `${k}-${tag}.png`), clip: clip(G[k].corner.x + (k.endsWith('l') ? 30 : -30), G[k].corner.y - 50, 110, 130) });
        // a man cornered at near left (stuck there after a whip)
        await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2, a = sc.w1, R = window.__R; d.x = R.nearLeft.x + 24; d.y = R.nearLeft.y - 6; a.x = d.x + 150; a.y = d.y; a.facing = -1; d.facing = 1; d._beginCorner(-1); });
        await step(45);
        await h.page.screenshot({ path: join(outDir, `cornered-${tag}.png`), clip: clip(G.nl.corner.x + 45, G.nl.corner.y - 105, 170, 240) });
        // a man on the top turnbuckle taunting at far right
        await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], d = sc.w2, a = sc.w1, R = window.__R; d.state = 'standing'; d._cornerEp = null; a.x = 480; a.y = 340;
            d._corner = { x: R.farRight.x, y: R.ropes[1].farY, topY: R.ropes[2].farY, matY: R.farRight.y, facing: -1 }; d._ropeLevel = 2; d.x = R.farRight.x; d.y = d._corner.topY; d.facing = -1; d.state = 'taunting'; });   // standing on the top turnbuckle in the taunting state (the taunt's own walk would move him off the corner)
        await step(40);
        console.log(tag, 'turnbuckle man', JSON.stringify(await h.page.evaluate(() => { const d = window.__WFM_GAME.scene.scenes[0].w2; return [d.state, Math.round(d.x), Math.round(d.y), d._ropeLevel, d.skeleton?.torso?.visible]; })));
        await h.page.screenshot({ path: join(outDir, `turnbuckle-${tag}.png`), clip: clip(G.fr.corner.x - 30, G.fr.corner.y - 120, 150, 210) });
    } finally { await h.close(); }
}
await shoot('', 'old');
await shoot('&corners=v1', 'v1');

const f = n => +n.toFixed(1);
const rows = Object.entries(G).map(([k, c]) => `<tr><td>${k}</td><td>(${c.corner.x}, ${c.corner.y})</td><td>(${f(c.out.x)}, ${f(c.out.y)})</td><td>${c.gap}</td><td>(${f(c.foot.x)}, ${f(c.foot.y)})</td><td>${c.levels.map(l => f(l.connector)).join(' / ')}</td></tr>`).join('');
const pair = (n, w) => `<div class="pair"><figure><img class="${w < 560 ? 'z' : ''}" src="${n}-old.png" style="width:${w}px"><figcaption>old</figcaption></figure><figure><img class="${w < 560 ? 'z' : ''}" src="${n}-v1.png" style="width:${w}px"><figcaption>?corners=v1</figcaption></figure></div>`;
writeFileSync(join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ring corners</title>
<style>:root{color-scheme:dark}body{font:14px system-ui;background:#16161a;color:#ddd;margin:16px;max-width:1500px}img{image-rendering:pixelated;display:block;max-width:100%}img.z{filter:brightness(1.8) contrast(1.1)}.pair,.row{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}figure{margin:0}figcaption{font-size:12px;color:#aaa}h2{margin:22px 0 4px;font-size:16px}table{border-collapse:collapse}td,th{border:1px solid #444;padding:3px 8px;text-align:left}</style>
<h1>Ring corners: posts out, turnbuckle + connector (TC.1/TC.2)</h1>
<p>Drawing only, behind <code>?corners=v1</code>: strands, RING corners and every rope point are unchanged; each post moves out along its corner's outward diagonal and each rope level gets a turnbuckle at the strand end with a short connector to the post. Derek's reference photo is first, for the look.</p>
<h2>Reference (Derek's 1940s ring)</h2><div class="row"><img src="../reference-1940s-ring.png" style="width:680px"></div>
<h2>Full ring, old | v1</h2>${pair('full', 560)}
<h2>Corners, zoomed 4x (near left, near right, far left, far right; the stills and zooms below are brightened 1.8x on this page only)</h2>${['nl', 'nr', 'fl', 'fr'].map(k => pair(k, 440)).join('')}
<h2>A man cornered (near left) and a man on the top turnbuckle taunting (far right)</h2>${pair('cornered', 420)}${pair('turnbuckle', 420)}
<h2>Numbers</h2><table><tr><th>corner</th><th>RING point (unchanged)</th><th>outward unit</th><th>post moves px</th><th>post foot</th><th>connector px (bottom / mid / top)</th></tr>${rows}</table>
<p>Pad on the top turnbuckle; connectors are the same length at every level (the post is the old one translated).</p>`);
console.log('wrote', join(outDir, 'index.html'));
process.exit(0);
