// George's taunt strut (Derek 2026-11-14: "gumby legs"): per frame knee flex (skeleton _jointState, both legs), the sole points and the body x,
// the real _doTaunt stepped at 60 fps with the loop asleep. LIGHT=0 = the old strut. Stills at every 0.25 s into <outDir>.
//   WFM_URL=http://localhost:5197 node tools/debug/strut_probe.mjs <outDir> [facing 1|-1]
import { chromium } from 'playwright-core';
const URL = process.env.WFM_URL ?? 'http://localhost:5197', light = process.env.LIGHT !== '0';
const [out, facingArg = '1'] = process.argv.slice(2), facing = +facingArg;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
const errors = []; p.on('pageerror', e => errors.push(e.message));
await p.goto(`${URL}/?arena=1&notitle=1${light ? '&light=v1' : ''}&p1=george-roster-v1&p2=thesz-procreate-v1`);
await p.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
await p.evaluate((facing) => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; window.__T = sc.time.now;
  const A = sc.w1, D = sc.w2; A.x = 480; D.x = 480 + facing * 200; A.y = D.y = 380; A.facing = facing;
  window.__step = () => { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); };
  for (let i = 0; i < 30; i++) window.__step(); A.stamina = 100; A._doTaunt(); }, facing);
const rows = [];
for (let f = 0; f < 240; f++) {
  const r = await p.evaluate(() => { window.__step(); const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, J = A.skeleton._jointState ?? {}, P = A.skeleton.jointAttachmentPoints ?? {};
    const sole = k => P[k] ? [+P[k].x.toFixed(1), +P[k].y.toFixed(1)] : null;
    return { x: +A.x.toFixed(1), st: A.state, lKnee: +(J.lKnee ?? NaN).toFixed(2), rKnee: +(J.rKnee ?? NaN).toFixed(2), keys: Object.keys(P).filter(k => /ankle|sole|foot/i.test(k)).join(','), nA: sole('nearAnkle'), fA: sole('farAnkle'), mb: +A.moveBlend.toFixed(2) }; });
  rows.push(r);
  if (out && f % 15 === 0) {
    const bb = await p.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, c = sc.game.canvas.getBoundingClientRect(), k = c.width / sc.scale.width; return { x: c.left + (A.x - 110) * k, y: c.top + (A.y - 230) * k, width: 220 * k, height: 250 * k }; });
    await p.screenshot({ path: `${out}/${light ? 'new' : 'old'}_${facing > 0 ? 'R' : 'L'}_${String(f).padStart(3, '0')}.png`, clip: bb });
  }
  if (r.st === 'standing' && f > 20) break;
}
const kn = rows.flatMap(r => [r.lKnee, r.rKnee]).filter(Number.isFinite);
// sole slide: per frame movement of each ankle while it is the lower one (planted), px
let slide = 0;
for (let i = 1; i < rows.length; i++) for (const k of ['nA', 'fA']) {
  const a = rows[i - 1][k], c = rows[i][k], o = rows[i][k === 'nA' ? 'fA' : 'nA'];
  if (a && c && o && c[1] >= o[1] - 0.5) slide = Math.max(slide, Math.abs(c[0] - a[0]));
}
// any ankle jump in one frame (a pop entering or leaving the gait shows here; a swing foot moves up to ~8 px/frame at this pace)
let jump = 0, jumpAt = -1;
for (let i = 1; i < rows.length; i++) for (const k of ['nA', 'fA']) { const a = rows[i - 1][k], c = rows[i][k]; if (a && c) { const d = Math.hypot(c[0] - a[0], c[1] - a[1]); if (d > jump) { jump = d; jumpAt = i; } } }
console.log(JSON.stringify({ light, facing, ankleJumpMax: +jump.toFixed(1), jumpAtFrame: jumpAt, endState: rows.at(-1).st, frames: rows.length, travel: +(rows.at(-1).x - rows[0].x).toFixed(1), kneeFlexRange: [Math.min(...kn), Math.max(...kn)], plantedAnkleSlideMaxPxPerFrame: +slide.toFixed(1), ankleKeys: rows[0].keys, errors }));
if (process.env.ROWS) for (const r of rows) console.log(JSON.stringify(r));
await b.close();
