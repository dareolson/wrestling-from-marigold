// PLAN_GEORGE_PERFORMANCE Stage D (T-D3): George's hair check / fix through the real executor (_doHairCheck) at 60 fps with the loop asleep, both facings,
// the three wear stages. Per frame: root and ankle motion, the hairContact point of the near forearm (hairFix art) against the forelock target, and whether the
// arm covers the eye or the mouth. Stills at chosen frames. Dev server from the worktree.
//   WFM_URL=http://127.0.0.1:5199 node tools/debug/hair_arm_probe.mjs <outDir> [check|one|two]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5199', [out, mode = 'check'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 });
const errors = []; p.on('pageerror', e => errors.push(e.message));
await p.goto(`${URL0}/?arena=1&notitle=1&light=v1&georgePerformance=1&p1=george-roster-v1&p2=thesz-procreate-v1`);
await p.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, null, { timeout: 60000 });
await p.waitForTimeout(2500);
const report = [];
for (const facing of [1, -1]) for (const stage of [0, 1, 2]) {
  await p.evaluate(({ facing, stage, mode }) => {
    const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.lockupState = null; sc.tweens.getDelta = () => 1000 / 60; window.__T = sc.time.now;
    const A = sc.w1, D = sc.w2;
    for (const w of [A, D]) { w.state = 'standing'; w.y = 380; w.vx = w.vy = 0; w.stamina = 100; w.lying = null; w._activeMove = null; w._facingLock = false; w.input = { justDown: () => false, isDown: () => false }; }
    A.x = 420; D.x = 420 + facing * 300; A.facing = facing; D.facing = -facing;
    window.__stage = stage; window.__wear = [0, 30, 70][stage];
    window.__step = () => { A.face.state = { ...A.face.state, wear: window.__wear, stage: window.__stage }; window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); };
    for (let i = 0; i < 30; i++) window.__step();
    window.__rows = []; window.__t0 = [A.x, A.y];
    A._doHairCheck(mode === 'check' ? null : mode);
    window.__id = A._activeMove?.clip?.id ?? null;
  }, { facing, stage, mode });
  const stills = new Set([8, 20, 32, 45, 60, 80, 100, 120]);
  for (let f = 0; f < 200; f++) {
    const r = await p.evaluate(() => {
      window.__step();
      const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, sk = A.skeleton, P = sk.jointAttachmentPoints ?? {}, fa = sk.nearForearm, up = sk.nearUpArm;
      const pt = k => (P[k] ? [+P[k].x.toFixed(2), +P[k].y.toFixed(2)] : null);
      const hb = sk.head.getBounds(), facing = A.facing;
      let contact = null, d = null, eye = false, mouth = false;
      const fk = fa.texture.key, onHair = fk.endsWith('hair_fix');
      const covers = (img, u, v) => { const w = { x: facing > 0 ? hb.x + hb.width * u : hb.right - hb.width * u, y: hb.y + hb.height * v }; const src = img.texture.getSourceImage(); const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const cx = cv.getContext('2d'); cx.drawImage(src, 0, 0);
        const q = img.getWorldTransformMatrix().applyInverse(w.x, w.y); let x = q.x + img.displayOriginX; const y = q.y + img.displayOriginY; if (img.flipX) x = src.width - x; return x >= 0 && y >= 0 && x < src.width && y < src.height && cx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3] > 128; };
      if (onHair) {
        const q = sk.constructor.imageAnchorPoint(fa, fa._semanticAnchors.hairContact); contact = [+q.x.toFixed(2), +q.y.toFixed(2)];
        const target = { x: facing > 0 ? hb.x + hb.width * .48 : hb.right - hb.width * .48, y: hb.y + hb.height * .12 };
        d = +Math.hypot(q.x - target.x, q.y - target.y).toFixed(2);
        eye = covers(fa, .77, .43) || covers(up, .77, .43); mouth = covers(fa, .80, .72) || covers(up, .80, .72);
      }
      return { x: +A.x.toFixed(2), y: +A.y.toFixed(2), st: A.state, fk, uk: up.texture.key, nA: pt('nearAnkle'), fA: pt('farAnkle'), contact, d, eye, mouth, am: !!A._activeMove };
    });
    report.push({ facing, stage, f, ...r });
    if (stills.has(f)) {
      const clip = await p.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, c = sc.game.canvas.getBoundingClientRect(), k = c.width / sc.scale.width; return { x: c.left + (A.x - 90) * k, y: c.top + (A.y - 235) * k, width: 180 * k, height: 170 * k }; });
      await p.screenshot({ path: `${out}/${mode}_${facing > 0 ? 'R' : 'L'}_s${stage}_${String(f).padStart(3, '0')}.png`, clip });
    }
    if (!r.am && f > 10) break;
  }
}
const sum = {};
for (const facing of [1, -1]) for (const stage of [0, 1, 2]) {
  const rows = report.filter(r => r.facing === facing && r.stage === stage), x0 = rows[0].x, y0 = rows[0].y;
  let ankle = 0; for (let i = 1; i < rows.length; i++) for (const k of ['nA', 'fA']) { const a = rows[i - 1][k], c = rows[i][k]; if (a && c) ankle = Math.max(ankle, Math.hypot(c[0] - a[0], c[1] - a[1])); }
  const hair = rows.filter(r => r.d !== null);
  sum[`${facing > 0 ? 'R' : 'L'}${stage}`] = { frames: rows.length, rootDriftMax: +Math.max(...rows.map(r => Math.hypot(r.x - x0, r.y - y0))).toFixed(2), ankleStepMax: +ankle.toFixed(2),
    hairFrames: hair.length, contactDistMin: hair.length ? Math.min(...hair.map(r => r.d)) : null, contactDistMax: hair.length ? Math.max(...hair.map(r => r.d)) : null, eyeCoveredFrames: hair.filter(r => r.eye).length, mouthCoveredFrames: hair.filter(r => r.mouth).length, endState: rows.at(-1).st };
}
writeFileSync(`${out}/${mode}_probe.json`, JSON.stringify({ sum, errors, rows: report }, null, 0));
console.log(JSON.stringify({ sum, errors }, null, 1));
await b.close();
