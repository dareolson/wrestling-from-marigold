// PLAN_GEORGE_PERFORMANCE A: George's strut into the crowd taunt (?light=v1&georgePerformance=1), real _doTaunt at 60 fps, loop asleep.
// Per run: root x drift and max ankle move during the stationary taunt, the face keys in order, end state; HIT=<s> hits him that many
// seconds into the taunt (interruption check). Stills every 0.2 s of the taunt into <outDir>.
//   WFM_URL=http://localhost:5197 node tools/debug/crowd_taunt_probe.mjs <outDir> [facing] [wearDamage]
import { chromium } from 'playwright-core';
const URL = process.env.WFM_URL ?? 'http://localhost:5197', HIT = process.env.HIT ? +process.env.HIT : null;
// SUPERIOR=1: Lou is down a step away, so the taunt is B (georgeSuperiority) instead of the strut
const SUPERIOR = !!process.env.SUPERIOR, CLIP = SUPERIOR ? 'georgeSuperiority' : 'georgeCrowdTaunt';
const [out = '', facingArg = '1', wearArg = '0'] = process.argv.slice(2), facing = +facingArg;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', e => errors.push(e.message));
await p.goto(`${URL}/?arena=1&notitle=1&light=v1&georgePerformance=1&p1=george-roster-v1&p2=thesz-procreate-v1`);
await p.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
await p.evaluate(({ facing, wear, superior }) => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; window.__T = sc.time.now;
  const A = sc.w1, D = sc.w2; A.x = 440; D.x = 440 + facing * 330; A.y = D.y = 380; A.facing = facing;
  window.__step = () => { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); };
  for (let i = 0; i < 30; i++) window.__step(); if (wear) A._damage(wear); for (let i = 0; i < 120; i++) window.__step(); A.stamina = 100;
  if (superior) { D.x = A.x + facing * 120; D.state = 'down'; D.lying = 'supine'; D.stateTimer = 99; window.__step(); } else Math.random = () => 0;   // always the crowd taunt after the strut
  A._doTaunt(); }, { facing, wear: +wearArg, superior: SUPERIOR });
const rows = []; let t0 = null, f = 0;
for (; f < 600; f++) {
  const r = await p.evaluate((hitNow) => { window.__step(); const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, P = A.skeleton.jointAttachmentPoints ?? {};
    if (hitNow) { A._hurt(6, 'jab'); A._doSell('sellChest', 150, () => { A.state = 'standing'; }); }
    return { x: +A.x.toFixed(2), st: A.state, clip: A._activeMove?.clip?.id ?? null, face: A.face?.key, nA: P.nearAnkle && [+P.nearAnkle.x.toFixed(1), +P.nearAnkle.y.toFixed(1)], fA: P.farAnkle && [+P.farAnkle.x.toFixed(1), +P.farAnkle.y.toFixed(1)], lock: A._facingLock, now: sc.time.now }; }, HIT !== null && t0 !== null && f - t0 === Math.round(HIT * 60));
  rows.push(r);
  if (t0 === null && r.clip === CLIP) t0 = f;
  if (out && t0 !== null && (f - t0) % 12 === 0 && f - t0 <= 168) {
    const bb = await p.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, c = sc.game.canvas.getBoundingClientRect(), k = c.width / sc.scale.width; return { x: c.left + (A.x - 95) * k, y: c.top + (A.y - 215) * k, width: 190 * k, height: 225 * k }; });
    await p.screenshot({ path: `${out}/${SUPERIOR ? 'superior' : 'crowd'}_${facing > 0 ? 'R' : 'L'}_w${wearArg}_${String(f - t0).padStart(3, '0')}.png`, clip: bb });
  }
  if (t0 !== null && r.st === 'standing' && !r.clip) break;
}
const taunt = rows.slice(t0 ?? 0).filter(r => r.clip === CLIP);
let ankle = 0; for (let i = 1; i < taunt.length; i++) for (const k of ['nA', 'fA']) if (taunt[i][k] && taunt[i - 1][k]) ankle = Math.max(ankle, Math.hypot(taunt[i][k][0] - taunt[i - 1][k][0], taunt[i][k][1] - taunt[i - 1][k][1]));
const faces = []; for (const r of rows.slice(t0 ?? 0)) if (r.face !== faces.at(-1)) faces.push(r.face);
// the hand-back to idle after the clip: ankle jump on the first frames out of it
const after = rows.slice((t0 ?? 0) + taunt.length - 1, (t0 ?? 0) + taunt.length + 10);
let handback = 0; for (let i = 1; i < after.length; i++) for (const k of ['nA', 'fA']) if (after[i][k] && after[i - 1][k]) handback = Math.max(handback, Math.hypot(after[i][k][0] - after[i - 1][k][0], after[i][k][1] - after[i - 1][k][1]));
// the largest one-frame ankle move over the whole run (strut, hand-over into the taunt, taunt, hand-back), with where it happened
let worst = { px: 0, f: -1, clip: null }; for (let i = 1; i < rows.length; i++) for (const k of ['nA', 'fA']) if (rows[i][k] && rows[i - 1][k]) { const d = Math.hypot(rows[i][k][0] - rows[i - 1][k][0], rows[i][k][1] - rows[i - 1][k][1]); if (d > worst.px) worst = { px: +d.toFixed(1), f: i - (t0 ?? 0), clip: rows[i].clip, st: rows[i].st }; }
console.log(JSON.stringify({ facing, worstAnkleJump: worst, wear: +wearArg, hit: HIT, tauntStarted: t0 !== null, tauntFrames: taunt.length, rootDriftPx: taunt.length ? +Math.abs(taunt.at(-1).x - taunt[0].x).toFixed(2) : null, ankleMaxPxPerFrame: +ankle.toFixed(2), handbackAnklePx: +handback.toFixed(1), endState: rows.at(-1).st, endFacingLock: rows.at(-1).lock, endClip: rows.at(-1).clip, faces, errors }));
await b.close();
