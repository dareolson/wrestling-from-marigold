// PLAN_ROPES TC.2: stills of the ring corners, old | ?corners=v1, the full ring, a man cornered and a man on the top turnbuckle, with Derek's reference photo beside them.
//   WFM_URL=http://localhost:5174 node tools/debug/ring_corners_page.mjs [outDir=research/ropes-2026-11/rc/tc2]
// Needs research/ropes-2026-11/rc/reference-1940s-ring.png (Derek's photo); the page links it as ../reference-1940s-ring.png.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { RING } from '../../src/constants.js';
import { cornerGeom, cornerGaps } from '../../src/ringCorners.js';

const outDir = process.argv[2] ?? 'research/ropes-2026-11/rc/tc2';
mkdirSync(outDir, { recursive: true });
const G = cornerGeom(RING);   // the corner points only (the same at any gap)

async function shoot(qs, tag) {
    process.env.WFM_QS = 'notitle=1&ropes=v1' + qs; process.env.WFM_P1 = 'thesz-procreate-v1'; process.env.WFM_P2 = 'george-roster-v1';
    const h = await launch();
    try {
        await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 });
        await h.page.waitForTimeout(1500);
        const box = await h.page.evaluate((R) => { window.__R = R; const g = window.__WFM_GAME, sc = g.scene.scenes[0], b = document.querySelector('canvas').getBoundingClientRect(), cam = sc.cameras.main; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now;
            for (const w of [sc.w1, sc.w2]) w.input = { justDown: () => false, isDown: () => false }; return { x: b.x, y: b.y, w: b.width, h: b.height, gw: g.scale.gameSize.width, gh: g.scale.gameSize.height, zoom: cam.zoom, vx: cam.worldView.x, vy: cam.worldView.y }; }, RING);
        const step = (n) => h.page.evaluate((n) => { for (let i = 0; i < n; i++) { window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); } }, n);
        const px = (gx, gy) => ({ x: box.x + (gx - box.vx) * box.zoom * box.w / box.gw, y: box.y + (gy - box.vy) * box.zoom * box.h / box.gh });   // game coords through the camera, scaled by the canvas' screenshot width / game width
        const clip = (gx, gy, gw, gh) => { const a = px(gx - gw / 2, gy - gh / 2), b = px(gx + gw / 2, gy + gh / 2); return { x: Math.max(0, a.x), y: Math.max(0, a.y), width: b.x - a.x, height: b.y - a.y }; };
        await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1.x = 400; sc.w2.x = 560; sc.w1.y = sc.w2.y = 360; sc.w1.facing = 1; sc.w2.facing = -1; });
        await step(30);
        await h.page.screenshot({ path: join(outDir, `full-${tag}.png`), clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
        for (const k of ['nl', 'nr', 'fl', 'fr']) await h.page.screenshot({ path: join(outDir, `${k}-${tag}.png`), clip: clip(G[k].corner.x + (k.endsWith('l') ? 45 : -45), G[k].corner.y - 50, 170, 130) });
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
const VARIANTS = [['', 'old'], ['&corners=v1&cornerGap=8', 'g8'], ['&corners=v1&cornerGap=20', 'g20'], ['&corners=v1&cornerGap=30', 'g30']];
for (const [qs, tag] of VARIANTS) await shoot(qs, tag);

const f = n => +n.toFixed(1);
const TAGS = VARIANTS.map(v => v[1]), LABEL = { old: 'old', g8: 'gap 8 (~2")', g20: 'gap 20 (~5")', g30: 'gap 30 (~8")' };
const row = (n, w) => `<div class="row">${TAGS.map(t => `<figure><img class="${w < 560 ? 'z' : ''}" src="${n}-${t}.png" style="width:${w}px"><figcaption>${LABEL[t]}</figcaption></figure>`).join('')}</div>`;
const tbl = [8, 20, 30].map(g => { const GG = cornerGeom(RING, cornerGaps(g, RING)); return `<tr><td>${g}</td>${['nl', 'nr', 'fl', 'fr'].map(k => `<td>(${f(GG[k].foot.x)}, ${f(GG[k].foot.y)}) moves ${f(GG[k].gap)}</td>`).join('')}</tr>`; }).join('');
writeFileSync(join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ring corners gap</title>
<style>:root{color-scheme:dark}body{font:14px system-ui;background:#16161a;color:#ddd;margin:16px;max-width:1700px}img{image-rendering:pixelated;display:block;max-width:100%}img.z{filter:brightness(1.8) contrast(1.1)}.row{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}figure{margin:0}figcaption{font-size:12px;color:#aaa}h2{margin:22px 0 4px;font-size:16px}table{border-collapse:collapse}td,th{border:1px solid #444;padding:3px 8px;text-align:left}</style>
<h1>Ring corners: how far out the posts stand (TC.3)</h1>
<p><code>?corners=v1&amp;cornerGap=&lt;px at the near posts&gt;</code>; the far posts move 540/880 of it. Drawing only: strands, RING and rope points are where they were. One near px is about 3 inches (880 px ≈ 20 ft). Connector: light line, 3 px near / 2 px far; the turnbuckle is the dark block at the strand end, the pad on top.</p>
<h2>Reference (Derek's 1940s ring)</h2><div class="row"><img src="../reference-1940s-ring.png" style="width:680px"></div>
<h2>Full ring</h2><div class="row">${TAGS.map(t => `<figure><img src="full-${t}.png" style="width:420px"><figcaption>${LABEL[t]}</figcaption></figure>`).join('')}</div>
${[['nl', 'Near left'], ['nr', 'Near right'], ['fl', 'Far left'], ['fr', 'Far right']].map(([k, n]) => `<h2>${n} corner, zoomed 4x (brightened 1.8x on this page only)</h2>${row(k, 420)}`).join('')}
<h2>A man cornered (near left)</h2>${row('cornered', 380)}
<h2>A man on the top turnbuckle (far right)</h2>${row('turnbuckle', 380)}
<h2>Numbers: post footprints (game px; canvas 960 wide)</h2><table><tr><th>near gap</th><th>near left</th><th>near right</th><th>far left</th><th>far right</th></tr>${tbl}</table>
<p>Near gap 30: the near-left post's left edge is at x ≈ ${f(cornerGeom(RING, cornerGaps(30, RING)).nl.foot.x - 4)} (canvas edge 0); the apron wedge under it reaches that x at y 445-490.</p>`);
console.log('wrote', join(outDir, 'index.html'));
process.exit(0);
