// Propose a rig's `backSell.aroundVia` (PLAN_GEORGE_TRANSFER T8.1, D9): the point on the torso image the hand
// goes through on its way behind the body and back out. Proposes only: it writes nothing under src/.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/around_via_candidates.mjs [outDir] [fists=1,1.5,2] [degrees=45]
//     rig: WFM_P1 (default george-roster-v1). fists = candidate distances from backWaist, in fist lengths.
//
// How the points are found (the art and the rig's own anchor, nothing copied from another rig):
//   1. fist length  the forearm art's hand: from the wrist (the forearm's distalAnchorFrac.v row) down to the last
//                   row with alpha > 128, in source px, converted to GAME px with the forearm's displayed scale.
//                   The art is an OPEN hand, so this is wrist-to-fingertip, longer than a closed fist.
//   2. start        the rig's backWaist (u, v) on the torso image, read from the live skeleton.
//   3. direction    `degrees` from straight down, toward the back contour (the source faces right, the back is
//                   the left edge): below and outboard. 45 by default.
//   4. candidate k  backWaist + k * fist * direction, then, if any pixel with alpha > 0 lies within CLEAR game px
//                   (2) of it, pushed straight out (left) one source px at a time until none does. The push is
//                   reported. u may come out < 0 (off the image's left edge): imageAnchorPoint does not clamp.
// u = x / width, v = y / height of the torso PNG (pixel-edge coordinates, the form `semanticAnchors` takes).
//
// Writes <outDir>/: candidates.json, torso-4x.png, {supine,standing}-{r,l}-{clean,all,A,B,C}.png, index.html
// (self-contained: images inlined as data URIs).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'george-roster-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const outDir = process.argv[2] ?? 'research/animation/george-transfer-2026-10/around';
const fists = (process.argv[3] ?? '1,1.5,2').split(',').map(Number);
const degrees = Number(process.argv[4] ?? 45);
const CLEAR = 2;
const NAMES = ['A', 'B', 'C'];
const COLORS = ['#ff2d2d', '#1fd16a', '#2d7bff'];
mkdirSync(outDir, { recursive: true });

const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.torso, null, { timeout: 30000 });

    const art = await h.page.evaluate(async ({ fists, degrees, CLEAR, NAMES, COLORS }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
        const s = w.s * (w._heightScale ?? 1);
        sk.updateGroundedReach(400, 430, s, 1, { ...Sk.GROUNDED_POSES.supine }, {}, {});
        const pixels = image => {
            const src = image.texture.getSourceImage(), W = src.width, H = src.height;
            const c = document.createElement('canvas'); c.width = W; c.height = H;
            const g = c.getContext('2d'); g.drawImage(src, 0, 0);
            return { src, W, H, d: g.getImageData(0, 0, W, H).data };
        };
        // 1. fist length from the forearm art (the standing/supine forearm texture currently on the near forearm)
        const fa = sk.nearForearm, fp = pixels(fa);
        const cfg = sk._textureConfig.forearm;
        const wristV = cfg.distalAnchorFrac?.v ?? cfg.binding?.distal?.v;
        const wristRow = Math.round(wristV * fp.H);
        let lastRow = -1;
        for (let y = fp.H - 1; y >= 0 && lastRow < 0; y--) for (let x = 0; x < fp.W; x++) if (fp.d[(y * fp.W + x) * 4 + 3] > 128) { lastRow = y; break; }
        const gamePerSrcF = fa.displayHeight / fp.H;
        const fistSrc = lastRow - wristRow, fistGame = fistSrc * gamePerSrcF;
        // 2-4. candidates on the torso
        const tp = pixels(sk.torso), { W, H, d } = tp;
        const pxPerGame = W / sk.torso.displayWidth;
        const anchor = sk.torso._semanticAnchors.backWaist;
        const ax = anchor.u * W, ay = anchor.v * H;
        const th = degrees * Math.PI / 180, dir = { x: -Math.sin(th), y: Math.cos(th) };
        const rad = Math.ceil(CLEAR * pxPerGame);
        const nearest = (px, py) => {   // distance (game px) to the nearest pixel with alpha > 0, searched within 40 game px
            const R = Math.ceil(40 * pxPerGame); let best = Infinity;
            for (let y = Math.max(0, Math.floor(py - R)); y <= Math.min(H - 1, Math.ceil(py + R)); y++)
                for (let x = Math.max(0, Math.floor(px - R)); x <= Math.min(W - 1, Math.ceil(px + R)); x++)
                    if (d[(y * W + x) * 4 + 3] > 0) { const dd = Math.hypot(x + .5 - px, y + .5 - py); if (dd < best) best = dd; }
            return best / pxPerGame;
        };
        const cands = fists.map((k, i) => {
            const dist = k * fistGame * pxPerGame;
            let x = ax + dir.x * dist, y = ay + dir.y * dist;
            const x0 = x; let guard = 0;
            while (nearest(x, y) < CLEAR && guard++ < 2000) x -= 1;
            return { name: NAMES[i], fists: k, distGamePx: +(k * fistGame).toFixed(2), x, y, pushSrcPx: +(x0 - x).toFixed(1),
                u: +(x / W).toFixed(4), v: +(y / H).toFixed(4), clearGamePx: +nearest(x, y).toFixed(2) };
        });
        // renders: the torso at 4x with a left margin (the points can sit off the image)
        const pad = 220, sc4 = 4, cv = document.createElement('canvas');
        const padB = 220; cv.width = (W + pad) * sc4; cv.height = (H + padB) * sc4;
        const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
        x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, cv.width, cv.height);
        x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.fillStyle = '#000'; x.font = '12px sans-serif';
        x.fillStyle = '#b4b4b4'; x.fillRect(pad * sc4, 0, W * sc4, (H + padB) * sc4);
        x.drawImage(tp.src, pad * sc4, 0, W * sc4, H * sc4);
        x.fillStyle = '#000';
        for (let i = -2; i < 20; i++) { const u = i * 0.1; x.beginPath(); x.moveTo((u * W + pad) * sc4, 0); x.lineTo((u * W + pad) * sc4, cv.height); x.stroke(); x.fillText(`u${u.toFixed(1)}`, (u * W + pad) * sc4 + 3, 14); }
        for (let i = 1; i < 14; i++) { const v = i * 0.1; x.beginPath(); x.moveTo(0, v * H * sc4); x.lineTo(cv.width, v * H * sc4); x.stroke(); x.fillText(`v${v.toFixed(1)}`, 3, v * H * sc4 - 3); }
        const mark = (px, py, col, label, r = 7) => {
            const X = (px + pad) * sc4, Y = py * sc4; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 3;
            x.beginPath(); x.arc(X, Y, r, 0, 7); x.stroke(); x.beginPath(); x.moveTo(X - r * 1.8, Y); x.lineTo(X + r * 1.8, Y); x.moveTo(X, Y - r * 1.8); x.lineTo(X, Y + r * 1.8); x.stroke();
            x.font = 'bold 18px sans-serif'; x.fillText(label, X + r * 1.4, Y - r * 1.4);
        };
        for (const c of cands) { x.strokeStyle = COLORS[NAMES.indexOf(c.name)]; x.lineWidth = 2; x.setLineDash([8, 6]); x.beginPath(); x.moveTo((ax + pad) * sc4, ay * sc4); x.lineTo((c.x + pad) * sc4, c.y * sc4); x.stroke(); x.setLineDash([]); }
        mark(ax, ay, '#000', 'backWaist', 7);
        for (const c of cands) mark(c.x, c.y, COLORS[NAMES.indexOf(c.name)], `${c.name} ${c.fists}f`);
        const torso4x = cv.toDataURL('image/png');
        return { W, H, pxPerGame, wristV, wristRow, lastRow, fistSrc, fistGame, gamePerSrcF, anchor, ax, ay, dir, cands, torso4x, forearmSize: [fp.W, fp.H] };
    }, { fists, degrees, CLEAR, NAMES, COLORS });
    writeFileSync(join(outDir, 'torso-4x.png'), Buffer.from(art.torso4x.split(',')[1], 'base64')); delete art.torso4x;

    // ── the rig, supine and standing, both facings, each point through imageAnchorPoint ────────────────
    const canvasBox = await h.page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect();
        const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
    const frames = {};
    for (const stance of ['supine', 'standing']) for (const [tag, facing] of [['r', 1], ['l', -1]]) {
        const pts = await h.page.evaluate(async ({ stance, facing, cands, anchor }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
            if (sc.w2) { sc.w2.setVisible?.(false); sc.w2.x = -500; }
            w.x = 400; w.y = 430; w.facing = facing;
            const s = w.s * (w._heightScale ?? 1);
            if (stance === 'supine') {
                w.lying = 'supine'; w.state = 'down';
                sk.updateGroundedReach(400, 430, s, facing, { ...Sk.GROUNDED_POSES.supine }, {}, {});
            } else {
                const { POSES } = await import('/src/Wrestler.js');
                w.lying = null; w.state = 'standing';
                const pose = { ...w.pose }, target = POSES[w.idlePose] ?? POSES.idle;
                for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) pose[k] = target[k] ?? 0;
                sk.updateUpright(400, 430, s, facing, pose, 0, 0, facing * (pose.lean ?? 0), 0, 0.5, 0);
            }
            const at = (name, a) => ({ name, ...Sk.imageAnchorPoint(sk.torso, a) });
            return [at('W', anchor), ...cands.map(c => at(c.name, { u: c.x / sk.torso.texture.getSourceImage().width, v: c.y / sk.torso.texture.getSourceImage().height }))];
        }, { stance, facing, cands: art.cands, anchor: art.anchor });
        frames[`${stance}-${tag}`] = pts;
        const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
        const CW = stance === 'supine' ? 150 : 110, CH = stance === 'supine' ? 110 : 150;
        const clip = { x: Math.max(0, Math.round(canvasBox.x + (mx - CW / 2) * canvasBox.w / canvasBox.gw)),
            y: Math.max(0, Math.round(canvasBox.y + (my - CH / 2) * canvasBox.h / canvasBox.gh)),
            width: Math.round(CW * canvasBox.w / canvasBox.gw), height: Math.round(CH * canvasBox.h / canvasBox.gh) };
        const setMarks = async show => h.page.evaluate(({ show, pts, COLORS, NAMES }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            sc.__marks?.destroy(); sc.__marks = null;
            if (!show.length) return;
            const gr = sc.add.graphics().setDepth(1e6); sc.__marks = gr;
            const W = pts.find(p => p.name === 'W');
            for (const p of pts.filter(p => show.includes(p.name))) {
                const col = p.name === 'W' ? 0x000000 : Number('0x' + COLORS[NAMES.indexOf(p.name)].slice(1));
                if (p.name !== 'W') { gr.lineStyle(1, col, .8); gr.lineBetween(W.x, W.y, p.x, p.y); }
                gr.lineStyle(1, col, 1); gr.strokeCircle(p.x, p.y, 4); gr.lineBetween(p.x - 5, p.y, p.x + 5, p.y); gr.lineBetween(p.x, p.y - 5, p.x, p.y + 5);
            }
        }, { show, pts, COLORS, NAMES });
        for (const [name, show] of [['clean', []], ['all', ['W', ...NAMES]], ...NAMES.map(n => [n, ['W', n]])]) {
            await setMarks(show);
            await h.page.waitForTimeout(80);
            await h.page.screenshot({ path: join(outDir, `${stance}-${tag}-${name}.png`), clip });
        }
        await setMarks([]);
    }

    // ── data + a self-contained page ───────────────────────────────────────────────────────────────────
    const data = { rig: process.env.WFM_P1, degrees, CLEAR, ...art, frames, rule: 'see the header of tools/debug/around_via_candidates.mjs' };
    writeFileSync(join(outDir, 'candidates.json'), JSON.stringify(data, null, 1));
    const img = (f, cls = '') => `<img class="${cls}" src="data:image/png;base64,${readFileSync(join(outDir, f)).toString('base64')}">`;
    const fig = (f, cap, cls = 'px') => `<figure>${img(f, cls)}<figcaption>${cap}</figcaption></figure>`;
    const stances = [['supine', 'supine'], ['standing', 'standing']];
    const card = c => { const k = NAMES.indexOf(c.name); return `<section class="card" style="--c:${COLORS[k]}"><h2>${c.name}: ${c.fists} fist${c.fists === 1 ? '' : 's'} out</h2>
<p class="num"><b>u ${c.u}, v ${c.v}</b><br>${c.distGamePx} game px from backWaist at ${degrees}° from straight down toward the back; pushed out ${c.pushSrcPx} source px to clear the art; nearest painted pixel ${c.clearGamePx} game px away${c.u < 0 ? '; <b>u &lt; 0: off the image\'s left edge</b>' : ''}</p>
<div class="row">${stances.flatMap(([st]) => [['r', '+1'], ['l', '-1']].map(([t, f]) => fig(`${st}-${t}-${c.name}.png`, `${st}, facing ${f}`))).join('')}</div></section>`; };
    writeFileSync(join(outDir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${data.rig} aroundVia candidates</title><style>
:root{--bg:#f5f5f2;--fg:#1c1c1c;--card:#fff;--line:#d6d6d0}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#e8e8e4;--card:#222;--line:#444}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:0 0 4px;border-left:6px solid var(--c);padding-left:8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}
.row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start} figure{margin:0} img{max-width:100%;height:auto;display:block;border:1px solid var(--line)}
img.px{image-rendering:pixelated;width:300px;max-width:100%} figcaption{font-size:12px;opacity:.75}
.num{margin:0 0 8px} table{border-collapse:collapse} td,th{border:1px solid var(--line);padding:3px 8px;text-align:left}
</style></head><body>
<h1>${data.rig}: aroundVia candidates</h1>
<p>Proposal only: nothing is in the rig. Black mark = backWaist (u ${art.anchor.u}, v ${art.anchor.v}). One fist = <b>${art.fistGame.toFixed(2)} game px</b>: the forearm art's hand, from the wrist row (${art.wristRow} of ${art.forearmSize[1]}, distalAnchorFrac.v ${art.wristV.toFixed(4)}) to the last row with alpha &gt; 128 (${art.lastRow}), ${art.fistSrc} source px × ${art.gamePerSrcF.toFixed(4)} game px per source px. The art is an open hand, so this is wrist to fingertip, longer than a closed fist. Candidates run ${degrees}° from straight down toward the back contour, then are pushed out until ${CLEAR} game px clear of any painted pixel.</p>
<table><tr><th></th><th>fists</th><th>game px</th><th>u</th><th>v</th><th>pushed (src px)</th><th>clear (game px)</th></tr>
${art.cands.map(c => `<tr style="color:${COLORS[NAMES.indexOf(c.name)]}"><td><b>${c.name}</b></td><td>${c.fists}</td><td>${c.distGamePx}</td><td>${c.u}</td><td>${c.v}</td><td>${c.pushSrcPx}</td><td>${c.clearGamePx}</td></tr>`).join('\n')}</table>
<section class="card"><h2 style="--c:#888">All three on the torso, 4×</h2><div class="row">${fig('torso-4x.png', 'torso art 4×, grid every .1, dashed = path from backWaist', '').replace('<img class=""', '<img style="width:620px;max-width:100%"')}</div></section>
${art.cands.map(card).join('\n')}
<section class="card"><h2 style="--c:#888">All three, no marks and marked</h2><div class="row">
${stances.flatMap(([st]) => [['r', '+1'], ['l', '-1']].flatMap(([t, f]) => [fig(`${st}-${t}-clean.png`, `${st}, facing ${f}, no marks`), fig(`${st}-${t}-all.png`, `${st}, facing ${f}, all`)])).join('')}</div></section>
</body></html>`);
    console.log(`rig ${data.rig}: fist ${art.fistGame.toFixed(2)} game px (wrist row ${art.wristRow}, last row ${art.lastRow}, ${art.fistSrc} src px x ${art.gamePerSrcF.toFixed(4)})`);
    console.log(`backWaist u ${art.anchor.u} v ${art.anchor.v}; torso ${art.W}x${art.H}, ${art.pxPerGame.toFixed(2)} src px per game px`);
    for (const c of art.cands) console.log(`  ${c.name}  ${c.fists} fists  u ${c.u}  v ${c.v}  (${c.distGamePx} game px, pushed ${c.pushSrcPx} src px, ${c.clearGamePx} game px clear)`);
    console.log(`wrote ${outDir}/index.html`);
} finally { await h.close(); }
