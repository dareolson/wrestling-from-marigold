// MOVE=knee: T8.3, the knee drop V2 on a supine man (knee point to the chest point, apex height, frames apex->contact). Default: T8.1/T8.2, the hand stomp through the real executor on a prone man (?light=v1), stepped at 60 fps with the loop asleep.
//   [Y=330 depth of the pair, OUT=rows.json] WFM_URL=http://localhost:5198 node tools/debug/hand_stomp_probe.mjs [outDir] [attRig:defRig ...]   (default: every roster pairing, both facings)
// Per run: the boot's ankle to the man's near wrist at the impact frame (joint points, px), the attacker's x steps, the man's state after, errors; stills at set / chamber / contact / +0.3 / +0.9 s.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MASKS } from './toehold_t30_lib.mjs';
const URL0 = process.env.WFM_URL ?? 'http://localhost:5198';
const RIGS = ['thesz-procreate-v1', 'george-roster-v1', 'kowalski-roster-v1', 'guido-roster-v1'];
const KNEE = process.env.MOVE === 'knee';
const [outDir = '', ...pairArgs] = process.argv.slice(2);
const pairs = pairArgs.length ? pairArgs.map(p => p.split(':')) : RIGS.flatMap(a => RIGS.map(d => [a, d]));
if (outDir) mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];
try {
  for (const [a, d] of pairs) for (const facing of [1, -1]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1200);
    const shots = KNEE ? [0.45, 0.78, 0.94, 1.1, 1.4] : [0.65, 0.85, 0.97, 1.13, 1.4, 1.9];
    await page.exposeFunction('__SHOT', async t => { await page.screenshot({ path: `${outDir}/${a.split('-')[0]}-on-${d.split('-')[0]}_${facing > 0 ? 'R' : 'L'}_${String(t).replace('.', '_')}.png`, clip: { x: 150, y: 100, width: 800, height: 500 } }); });
    const res = await page.evaluate(async ({ facing, shots, wantShots, masks, KNEE, JOINTS, SAMPLE, Y }) => {
      (0, eval)(`(${masks})()`);
      const G = window.__WFM_GAME, sc = G.scene.scenes[0], w1 = sc.w1, w2 = sc.w2;
      G.loop.sleep(); sc._p1AI = sc._p2AI = null; let T = sc.time.now; const step = () => { T += 1000 / 60; G.step(T, 1000 / 60); };
      sc.tweens.getDelta = () => 1000 / 60;
      for (const w of [w1, w2]) { w.state = "standing"; w.y = Y; w.vx = w.vy = 0; w.input = { justDown: () => false, isDown: () => false }; }
      w1.x = 520; w1.facing = facing; w2.x = 520 + facing * 90; w2.facing = facing;   // he lies head toward the attacker's side of travel: prone, facing the way he walks
      w2.state = 'down'; w2.lying = KNEE ? 'supine' : 'prone'; w2.stateTimer = 99;
      sc.cameras.main.stopFollow?.(); sc.cameras.main.removeBounds?.(); sc.cameras.main.setZoom(2.2); sc.cameras.main.centerOn(w2.x + facing * 40, w2.y - 40);
      step(); step();
      const stam0 = w2.stamina, x0 = w1.x;
      const hipY0 = (w1.skeleton.jointAttachmentPoints.nearHip.y + w1.skeleton.jointAttachmentPoints.farHip.y) / 2 - w1.y, hipH = -hipY0; let apexY = hipY0, apexT = 0, contactT = 0;
      w1[KNEE ? '_doKneeDropV2' : '_doHandStomp'](w2);
      const out = { frames: [], dist: null, xs: [], shots: [], bodyOverlap: {} };
      // the attacker's boots (both legs' shin + boot) against the man's drawn head and torso, px; the stomped hand and arm are not counted (the contact is meant to touch them)
      const overlap = () => {
        const a = w1.skeleton, d = w2.skeleton, ox = Math.floor(Math.min(w1.x, w2.x) - 260), oy = Math.floor(Math.min(w1.y, w2.y) - 200), cw = 520, ch = 400;
        const boots = window.__partsMask(w1, [a.nearShin, a.nearBoot, a.farShin, a.farBoot], ox, oy, cw, ch), man = window.__partsMask(w2, [d.head, d.torso], ox, oy, cw, ch);
        // feet = each leg's lowest 22 painted rows (a boot) (shin and boot art together): the legs themselves pass over the body when he stands in front of it, which is occlusion, not a foot on the man
        const feet = new Uint8Array(boots.length);
        for (const part of [[a.nearShin, a.nearBoot], [a.farShin, a.farBoot]]) { const m = window.__partsMask(w1, part, ox, oy, cw, ch); let low = -1; for (let i = 0; i < m.length; i++) if (m[i]) low = Math.max(low, Math.floor(i / cw)); for (let i = 0; i < m.length; i++) if (m[i] && Math.floor(i / cw) > low - 22) feet[i] = 1; }
        for (let i = 0; i < boots.length; i++) boots[i] = feet[i];
        let n = 0, nb = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < boots.length; i++) { if (boots[i]) nb++; if (boots[i] && man[i]) { n++; const x = i % cw + ox, y = Math.floor(i / cw) + oy; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
        return { px: n, bootPx: nb, box: n ? [x0, y0, x1, y1] : null, atk: [Math.round(w1.x), Math.round(w1.y)], man: [Math.round(w2.x), Math.round(w2.y)] };
      };
      // T8.5: the attacker's boots (every painted pixel of both legs' lowest 22 rows) to the man's painted head, px; Infinity = none
      const headClear = () => {
        const a = w1.skeleton, d = w2.skeleton, ox = Math.floor(Math.min(w1.x, w2.x) - 260), oy = Math.floor(Math.min(w1.y, w2.y) - 200), cw = 520, ch = 400;
        const head = window.__partsMask(w2, [d.head], ox, oy, cw, ch), hp = []; for (let i = 0; i < head.length; i++) if (head[i]) hp.push([i % cw, Math.floor(i / cw)]);
        let best = Infinity;
        for (const part of [[a.nearShin, a.nearBoot], [a.farShin, a.farBoot]]) { const m = window.__partsMask(w1, part, ox, oy, cw, ch); let low = -1; for (let i = 0; i < m.length; i++) if (m[i]) low = Math.max(low, Math.floor(i / cw));
          for (let i = 0; i < m.length; i++) if (m[i] && Math.floor(i / cw) > low - 22) { const x = i % cw, y = Math.floor(i / cw); for (const [hx, hy] of hp) { const dd = (x - hx) ** 2 + (y - hy) ** 2; if (dd < best) best = dd; } } }
        return Number.isFinite(best) ? +Math.sqrt(best).toFixed(1) : null;
      };
      const lSide = w1.skeleton.lChannelSide(w1.facing);
      const ank = () => w1.skeleton.jointAttachmentPoints[lSide + (KNEE ? 'Knee' : 'Ankle')], wr = () => KNEE ? w2.skeleton.constructor.groundedTarget(w2.skeleton.jointAttachmentPoints, 'chest', w2.s * w2._heightScale) : w2.skeleton.jointAttachmentPoints.nearWrist;
      let impactAt = null, lastX = w1.x, maxStep = 0;
      for (let i = 0; i < 60 * 3; i++) {
        step(); const t = (i + 1) / 60; for (const [nm, at] of Object.entries(SAMPLE)) if (Math.abs(t - at) < 0.0085 && !out.bodyOverlap[nm]) out.bodyOverlap[nm] = overlap(); if (wantShots && shots.some(s => Math.abs(s - t) < 0.0085)) { out.shots.push(+t.toFixed(2)); await window.__SHOT(+t.toFixed(2)); }
        maxStep = Math.max(maxStep, Math.abs(w1.x - lastX)); lastX = w1.x; if (i < 180) out.xs.push(Math.round(w1.x) + ":" + Math.round(w1.y) + ":" + w1.state); { const hp = w1.skeleton.jointAttachmentPoints, hy = (hp.nearHip.y + hp.farHip.y) / 2 - w1.y; if (hy < apexY) { apexY = hy; apexT = t; } }
        if (impactAt == null && w2._jolt && w2._jolt.t >= 0) { impactAt = t; out.apex = { px: +(hipY0 - apexY).toFixed(1), fracOfHip: +((hipY0 - apexY) / hipH).toFixed(2), hipH: +hipH.toFixed(0), framesApexToContact: Math.round((t - apexT) * 60) }; const A = ank(), W = wr(); // painted contact: the boot's sole (its lowest 10 painted rows) against the stomped hand's painted pixels (forearm + hand), px
        if (!KNEE) { const sk = w1.skeleton, ds = sk.lChannelSide(w1.facing), A = ank(), W = wr(), ox = Math.floor(Math.min(A.x, W.x) - 120), oy = Math.floor(Math.min(A.y, W.y) - 120), cw = 300, ch = 300;
          const boot = window.__partsMask(w1, [sk[ds + 'Shin'], sk[ds + 'Boot']], ox, oy, cw, ch), hand = window.__partsMask(w2, [w2.skeleton.nearForearm, w2.skeleton.nearHand], ox, oy, cw, ch);
          let low = -1; for (let i = 0; i < boot.length; i++) if (boot[i]) low = Math.max(low, Math.floor(i / cw));
          const sole = []; let overlap = 0, handPx = 0;
          for (let i = 0; i < boot.length; i++) { if (boot[i] && Math.floor(i / cw) > low - 10) sole.push(i); if (boot[i] && hand[i]) overlap++; if (hand[i]) handPx++; }
          let best = Infinity; const hp = []; for (let i = 0; i < hand.length; i++) if (hand[i]) hp.push([i % cw, Math.floor(i / cw)]);
          for (const i of sole) { const x = i % cw, y = Math.floor(i / cw); for (const [hx, hy] of hp) best = Math.min(best, Math.hypot(x - hx, y - hy)); }
          if (!KNEE) out.painted = { headClearPx: headClear(), soleToHandPx: Number.isFinite(best) ? +best.toFixed(1) : null, bootOverHandPx: overlap, handPx, solePx: sole.length }; }
        out.dbg = JOINTS ? { shh: w1.skeleton.standingHipHeight, s: w1.s, hs: w1._heightScale, lift: w1._activeMove?.clip?.tracks?.attacker?.keyframes?.map(k => [k.at, +k.pose.lift.toFixed(1)]).filter(k => k[0] > 0.9 && k[0] < 1.1), pl: w1.pose.lift } : undefined;
        out.joints = JOINTS ? Object.fromEntries(['nearHip', 'nearKnee', 'nearAnkle', 'farHip', 'farKnee', 'farAnkle', 'neck'].map(n => [n, [w1.skeleton.jointAttachmentPoints[n].x, w1.skeleton.jointAttachmentPoints[n].y].map(v => Math.round(v))]).concat([['chest', [wr().x, wr().y].map(Math.round)], ['root', [w1.x, w1.y].map(Math.round)]])) : undefined;
        out.dist = { dx: +(A.x - W.x).toFixed(1), dy: +(A.y - W.y).toFixed(1), ankle: [A.x, A.y].map(v => +v.toFixed(0)), wrist: [W.x, W.y].map(v => +v.toFixed(0)), atkX: +w1.x.toFixed(0), hip: +(w1.y).toFixed(0) }; }
      }
      out.impactAt = impactAt; out.maxStep = +maxStep.toFixed(1); out.x = [x0, +w1.x.toFixed(0)]; out.final = { a: w1.state, d: w2.state, lying: w2.lying, stam: [stam0, w2.stamina], jolt: !!w2._jolt };
      return out;
    }, { facing, shots, wantShots: !!outDir, masks: MASKS.toString(), KNEE, Y: +(process.env.Y || 400), JOINTS: !!process.env.JOINTS, SAMPLE: KNEE ? { set: 0.45, contact: 0.95, finish: 1.75 } : { set: 0.65, contact: 0.98, finish: 1.7 } });
    rows.push({ a, d, facing, ...res, errors });
    await page.close();
  }
} finally { await browser.close(); }
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(rows));   // OUT=file.json: the rows as JSON (the G8 page reads it)
for (const r of rows) console.log(r.a.split('-')[0], '>', r.d.split('-')[0], r.facing, JSON.stringify({ impact: r.impactAt, dist: r.dist?.dx != null ? [r.dist.dx, r.dist.dy] : null, painted: r.painted, body: r.bodyOverlap, joints: r.joints, dbg: r.dbg, apex: r.apex, step: r.maxStep, xs: process.env.XS ? r.xs : undefined, final: r.final, err: r.errors }));
