// Propose a rig's `backWaist` anchor from its torso art (PLAN_GEORGE_TRANSFER T2.1), then show the
// candidates on the art and on the rig in the game, side by side. Proposes only: it writes nothing under src/.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/backwaist_candidates.mjs [outDir] [insets=0,3,6]
//     rig: WFM_P1 (default george-roster-v1). insets = how far inside the back contour each candidate sits,
//     in GAME px as rendered at the rig's match scale (the tool reads the torso's displayWidth).
//
// How the point is found (all from the torso PNG's alpha and colour, nothing copied from another rig):
//   1. contour  the back contour is the left edge of the art (the source faces right, the chest is on
//               the right): per row, the first pixel with alpha > 128.
//   2. waistband the first row where the trunks' colour (r > 150, r - g > 90: the anti-aliased outline
//               is never that saturated) appears within 40 source px of
//               the contour is the top of the trunks at the back.
//   3. height   walk up from there along the column 24 source px inside the contour to the last skin
//               pixel above the black waistband line, and go 6 source px higher still, so every
//               candidate sits on skin just above the band.
//   4. depth    candidate k is `insets[k]` game px inside the contour on that row.
// u = (x + .5) / width, v = (y + .5) / height of the torso PNG, the form `semanticAnchors.backWaist` takes.
//
// Writes <outDir>/: candidates.json, torso-4x.png (all points + grid), waist-8x-{A,B,C,all}.png,
// supine-{r,l}-{A,B,C,all,clean}.png (the rig paused supine, facing +1 = r / -1 = l, points drawn with
// Skeleton.imageAnchorPoint), and index.html (self-contained, images relative to it).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'george-roster-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const outDir = process.argv[2] ?? 'research/animation/george-transfer-2026-10/backwaist';
const insets = (process.argv[3] ?? '0,3,6').split(',').map(Number);
const NAMES = ['A', 'B', 'C'];
const COLORS = ['#ff2d2d', '#1fd16a', '#2d7bff'];
const LABELS = ['on the contour', `${insets[1]} px inside`, `${insets[2]} px inside`];
mkdirSync(outDir, { recursive: true });

const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.torso, null, { timeout: 30000 });

    // ── 1. the art: contour, trunks top, candidates, and the 4x / 8x renders ───────────────────────────
    const art = await h.page.evaluate(async ({ insets, NAMES, COLORS }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
        // draw once at the match scale so displayWidth is the real game-px size of the torso
        const s = w.s * (w._heightScale ?? 1);
        sk.updateGroundedReach(400, 430, s, 1, { ...Sk.GROUNDED_POSES.supine }, {}, {});
        const dispW = sk.torso.displayWidth;
        const img = sk.torso.texture.getSourceImage();
        const W = img.width, H = img.height, pxPerGame = W / dispW;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, W, H).data;
        const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
        const kind = (x, y) => { const [r, gg, b, a] = at(x, y);
            if (a < 128) return 'none'; if (Math.max(r, gg, b) < 70) return 'black';
            if (r > 150 && r - gg > 90) return 'trunks'; if (r > 200 && gg > 150) return 'skin'; return 'other'; };
        const left = y => { for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) return x; return -1; };
        let yPink = -1;
        for (let y = 0; y < H && yPink < 0; y++) { const x0 = left(y); if (x0 < 0) continue;
            for (let x = x0; x < Math.min(W, x0 + 40); x++) if (kind(x, y) === 'trunks') { yPink = y; break; } }
        if (yPink < 0) return { error: 'no trunks colour found near the back contour' };
        const xc = left(yPink) + 24;
        let ySkin = yPink; while (ySkin > 0 && kind(xc, ySkin) !== 'skin') ySkin--;
        const y = ySkin - 6;
        const x0 = left(y);
        const cands = insets.map((inset, k) => {
            const x = Math.round(x0 + inset * pxPerGame);
            return { name: NAMES[k], insetGamePx: inset, insetSourcePx: +(x - x0).toFixed(1), x, y, u: +((x + 0.5) / W).toFixed(4), v: +((y + 0.5) / H).toFixed(4), pixel: kind(x, y) };
        });
        // contour profile around the row, for the page
        const profile = []; for (let yy = y - 30; yy <= yPink + 30; yy += 6) profile.push({ y: yy, contourX: left(yy), kind: kind(left(yy) + 24, yy) });

        const draw = (cv, sc2, ox, oy, pts, opts = {}) => {
            const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
            x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, cv.width, cv.height);
            x.drawImage(img, ox, oy, cv.width / sc2, cv.height / sc2, 0, 0, cv.width, cv.height);
            if (opts.grid) {
                x.font = `${12 * (sc2 / 4)}px sans-serif`;
                for (let i = 1; i < 20; i++) {
                    const u = i * 0.05, major = i % 2 === 0;
                    x.strokeStyle = major ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.18)'; x.lineWidth = major ? 1.5 : 1;
                    x.beginPath(); x.moveTo((u * W - ox) * sc2, 0); x.lineTo((u * W - ox) * sc2, cv.height); x.stroke();
                    x.beginPath(); x.moveTo(0, (u * H - oy) * sc2); x.lineTo(cv.width, (u * H - oy) * sc2); x.stroke();
                    if (major) { x.fillStyle = '#000'; x.fillText(`u${u.toFixed(1)}`, (u * W - ox) * sc2 + 3, 14); x.fillText(`v${u.toFixed(1)}`, 3, (u * H - oy) * sc2 - 3); }
                }
            }
            for (const p of pts) {
                const px = (p.x + 0.5 - ox) * sc2, py = (p.y + 0.5 - oy) * sc2, r = 6 * (sc2 / 4);
                x.strokeStyle = COLORS[NAMES.indexOf(p.name)]; x.fillStyle = x.strokeStyle; x.lineWidth = 2.5;
                x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.stroke();
                x.beginPath(); x.moveTo(px - r * 1.8, py); x.lineTo(px + r * 1.8, py); x.moveTo(px, py - r * 1.8); x.lineTo(px, py + r * 1.8); x.stroke();
                x.font = `bold ${16 * (sc2 / 4)}px sans-serif`; x.fillText(p.name, px + r * 1.4, py - r * 1.4);
            }
            return cv.toDataURL('image/png');
        };
        const shots = {};
        const big = document.createElement('canvas'); big.width = W * 4; big.height = H * 4;
        shots['torso-4x'] = draw(big, 4, 0, 0, cands, { grid: true });
        const crop = { ox: Math.max(0, x0 - 24), oy: Math.max(0, y - 64), w: 120, h: 128 };
        for (const [name, pts] of [['all', cands], ...cands.map(p => [p.name, [p]])]) {
            const cv = document.createElement('canvas'); cv.width = crop.w * 8; cv.height = crop.h * 8;
            shots[`waist-8x-${name}`] = draw(cv, 8, crop.ox, crop.oy, pts);
        }
        return { W, H, dispW, pxPerGame, yPink, ySkin, y, x0, cands, profile, shots, box: sk._textureConfig?.torso?.box };
    }, { insets, NAMES, COLORS });
    if (art.error) throw new Error(art.error);
    for (const [name, url] of Object.entries(art.shots)) writeFileSync(join(outDir, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    delete art.shots;

    // ── 2. the rig, paused supine, both facings, with each point drawn through imageAnchorPoint ────────
    const canvasBox = await h.page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
        const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
    const frames = {};
    for (const [tag, facing] of [['r', 1], ['l', -1]]) {
        const pts = await h.page.evaluate(({ facing, cands }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
            sc.w2?.setVisible?.(false); if (sc.w2) { sc.w2.x = -500; }
            w.x = 400; w.y = 430; w.facing = facing; w.lying = 'supine'; w.state = 'down';
            sk.updateGroundedReach(400, 430, w.s * (w._heightScale ?? 1), facing, { ...Sk.GROUNDED_POSES.supine }, {}, {});
            const W = sk.torso.texture.getSourceImage().width, H = sk.torso.texture.getSourceImage().height;
            return cands.map(p => ({ name: p.name, ...Sk.imageAnchorPoint(sk.torso, { u: p.u, v: p.v }), flipX: sk.torso.flipX }));
        }, { facing, cands: art.cands });
        frames[tag] = pts;
        const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
        const CW = 150, CH = 110;   // game px around the torso's waist
        const clip = { x: Math.max(0, Math.round(canvasBox.x + (mx - CW / 2) * canvasBox.w / canvasBox.gw)),
            y: Math.max(0, Math.round(canvasBox.y + (my - CH / 2) * canvasBox.h / canvasBox.gh)),
            width: Math.round(CW * canvasBox.w / canvasBox.gw), height: Math.round(CH * canvasBox.h / canvasBox.gh) };
        const setMarks = async show => h.page.evaluate(({ show, pts, COLORS, NAMES }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            sc.__marks?.destroy(); sc.__marks = null;
            if (!show.length) return;
            const gr = sc.add.graphics().setDepth(1e6); sc.__marks = gr;
            for (const p of pts.filter(p => show.includes(p.name))) {
                const col = Number('0x' + COLORS[NAMES.indexOf(p.name)].slice(1));
                gr.lineStyle(1, col, 1); gr.strokeCircle(p.x, p.y, 4); gr.lineBetween(p.x - 5, p.y, p.x + 5, p.y); gr.lineBetween(p.x, p.y - 5, p.x, p.y + 5);
            }
        }, { show, pts, COLORS, NAMES });
        for (const [name, show] of [['clean', []], ['all', NAMES], ...NAMES.map(n => [n, [n]])]) {
            await setMarks(show);
            await h.page.waitForTimeout(80);
            await h.page.screenshot({ path: join(outDir, `supine-${tag}-${name}.png`), clip });
        }
        await setMarks([]);
    }

    // ── 3. data + page ─────────────────────────────────────────────────────────────────────────────────
    const data = { rig: process.env.WFM_P1, ...art, frames, rule: 'see the header of tools/debug/backwaist_candidates.mjs' };
    writeFileSync(join(outDir, 'candidates.json'), JSON.stringify(data, null, 1));
    const card = (c, k) => `<section class="card" style="--c:${COLORS[k]}"><h2>${c.name}: ${LABELS[k]}</h2>
  <p class="num"><b>u ${c.u}, v ${c.v}</b><br>${c.insetGamePx} game px inside the contour (${c.insetSourcePx} source px); the pixel under it is <i>${c.pixel}</i></p>
  <div class="row"><figure><img src="waist-8x-${c.name}.png"><figcaption>torso art, 8×</figcaption></figure>
  <figure><img class="px" src="supine-r-${c.name}.png"><figcaption>supine, facing +1</figcaption></figure>
  <figure><img class="px" src="supine-l-${c.name}.png"><figcaption>supine, facing -1</figcaption></figure></div></section>`;
    writeFileSync(join(outDir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${data.rig} backWaist candidates</title><style>
:root{--bg:#f5f5f2;--fg:#1c1c1c;--card:#fff;--line:#d6d6d0}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#e8e8e4;--card:#222;--line:#444}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:0 0 4px;border-left:6px solid var(--c);padding-left:8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}
.row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start} figure{margin:0} img{max-width:100%;height:auto;display:block;border:1px solid var(--line)}
img.px{image-rendering:pixelated;width:450px;max-width:100%} .row figure:first-child img{width:330px;max-width:100%} figcaption{font-size:12px;opacity:.75}
.num{margin:0 0 8px} table{border-collapse:collapse} td,th{border:1px solid var(--line);padding:3px 8px;text-align:left} code{font-size:13px}
</style></head><body>
<h1>${data.rig}: backWaist candidates</h1>
<p>Proposal only: nothing is in the rig. Found from the torso art's back contour at the top of the trunks (${data.W}×${data.H} source px, shown ${data.dispW.toFixed(1)} px wide in the game). Insets are game px.</p>
<table><tr><th></th><th>u</th><th>v</th><th>inset (game px)</th><th>source px</th></tr>
${art.cands.map((c, k) => `<tr style="color:${COLORS[k]}"><td><b>${c.name}</b></td><td>${c.u}</td><td>${c.v}</td><td>${c.insetGamePx}</td><td>${c.insetSourcePx}</td></tr>`).join('\n')}</table>
${art.cands.map(card).join('\n')}
<section class="card"><h2 style="--c:#888">All three</h2><div class="row">
<figure><img src="torso-4x.png" style="width:380px;max-width:100%"><figcaption>torso art, 4×, grid every .05 (labels every .1)</figcaption></figure>
<figure><img class="px" src="supine-r-all.png"><figcaption>supine, facing +1</figcaption></figure><figure><img class="px" src="supine-l-all.png"><figcaption>supine, facing -1</figcaption></figure>
<figure><img class="px" src="supine-r-clean.png"><figcaption>supine, facing +1, no marks</figcaption></figure><figure><img class="px" src="supine-l-clean.png"><figcaption>supine, facing -1, no marks</figcaption></figure></div></section>
</body></html>`);
    console.log(`rig ${data.rig}: torso ${art.W}x${art.H}, shown ${art.dispW.toFixed(2)} game px wide (${art.pxPerGame.toFixed(2)} source px per game px)`);
    console.log(`trunks top at the back contour: row ${art.yPink}; last skin row above the band ${art.ySkin}; candidate row ${art.y} (contour x ${art.x0})`);
    for (const c of art.cands) console.log(`  ${c.name}  u ${c.u}  v ${c.v}  (${c.insetGamePx} game px = ${c.insetSourcePx} source px inside; pixel ${c.pixel})`);
    console.log(`wrote ${outDir}/index.html`);
} finally { await h.close(); }
