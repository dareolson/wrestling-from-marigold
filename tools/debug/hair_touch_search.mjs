// PLAN_GEORGE_PERFORMANCE C: George's far arm wearing hairSmooth, searched over rArm/rElbow so the art's hairContact anchor (finger pads)
// lands on the painted hair at the crown and, for the smoothing stroke, further back along the hair. Reports the best poses per target,
// the anchor's distance to the painted hair edge (alpha of the head texture under the point) and whether the far forearm shows in front of
// the face (the forearm's on-screen segment past the face's front edge below the brow). Facing right and left.
//   WFM_URL=http://localhost:5197 node tools/debug/hair_touch_search.mjs
import { chromium } from 'playwright-core';
const URL = process.env.WFM_URL ?? 'http://localhost:5197';
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
await p.goto(`${URL}/?arena=1&notitle=1&light=v1&faces=0&p1=george-roster-v1&p2=thesz-procreate-v1`);
await p.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
for (const facing of [1, -1]) console.log(facing, JSON.stringify(await p.evaluate((facing) => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null;
  const A = sc.w1, D = sc.w2; A.x = 480; D.x = 480 + facing * 400; A.y = D.y = 380; A.facing = facing; A.state = 'taunting'; A._choreoUntil = sc.time.now + 1e9; A.combatBlend = 0;
  const farSlot = A.skeleton.lChannelSide(facing) === 'near' ? 'farForearm' : 'nearForearm';
  let T = sc.time.now; const step = (pose) => { for (let i = 0; i < 2; i++) { T += 1000 / 60; g.step(T, 1000 / 60); A.facing = facing; Object.assign(A.pose, pose); A.skeleton.setPartVariants({ [farSlot]: 'hairSmooth' }); } };
  const head = A.skeleton.head;
  // the head's painted top edge at a fraction u of its width measured from the BACK of the head
  // the head's painted top edge at a fraction u of its width from the BACK of the head (flipX mirrors the art, so the column flips with facing)
  const src = head.texture.getSourceImage(), cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const ctx = cv.getContext('2d'); ctx.drawImage(src, 0, 0);
  const hairTop = (hb, u) => {
    const x = facing > 0 ? hb.x + hb.width * u : hb.right - hb.width * u;
    const col = Math.round(u * (src.width - 1)), data = ctx.getImageData(col, 0, 1, src.height).data;   // the art faces right: its back is the left
    let row = 0; for (; row < src.height; row++) if (data[row * 4 + 3] > 128) break;
    return { x, y: hb.y + row / src.height * hb.height };
  };
  const res = { crown: [], back: [] };
  for (let ra = 2.3; ra <= 3.5; ra += 0.08) for (let re = 0.3; re <= 2.2; re += 0.08) {
    const pose = { rArm: ra, rElbow: re, lArm: 0.15, lElbow: 0.8, lean: -0.06, bend: 0 };
    step(pose);
    const img = A.skeleton[farSlot], a = img.constructor && A.skeleton.constructor.imageAnchorPoint(img, img._semanticAnchors?.hairContact); if (!a) continue;
    const hb = head.getBounds(), P = A.skeleton.jointAttachmentPoints, e = P[farSlot === 'farForearm' ? 'farElbow' : 'nearElbow'];
    const frontX = facing > 0 ? hb.x + hb.width * 0.72 : hb.right - hb.width * 0.72, browY = hb.y + hb.height * 0.35;
    let inFront = 0; for (let u = 0; u <= 1; u += 0.1) { const x = e.x + (a.x - e.x) * u, y = e.y + (a.y - e.y) * u; if ((x - frontX) * facing > 0 && y > browY && y < hb.bottom) inFront++; }
    for (const [name, uBack] of [['crown', 0.42], ['back', 0.18]]) { const t = hairTop(hb, uBack); res[name].push({ ra: +ra.toFixed(2), re: +re.toFixed(2), d: +Math.hypot(a.x - t.x, a.y - (t.y + 2)).toFixed(1), inFront }); }
  }
  return Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.filter(r => r.inFront === 0).sort((x, y) => x.d - y.d).slice(0, 3)])); }, facing)));
await b.close();
