// PLAN_GEORGE_PERFORMANCE Stage E (T-E3): every wrestler's taunts through the real input path (Wrestler.tryFinisher reading the held direction), both facings,
// at 60 fps with the loop asleep. Per frame: root, ankles, the knee channels, which clip plays. Stills at chosen frames. Dev server from the worktree.
//   WFM_URL=http://127.0.0.1:5233 node tools/debug/taunt_probe.mjs <outDir> [rigKey ...]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5233', [out, ...rigs0] = process.argv.slice(2);
const RIGS = rigs0.length ? rigs0 : ['george-roster-v1', 'thesz-procreate-v1', 'guido-roster-v1', 'kowalski-roster-v1'];
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const all = {}, errors = [];
for (const rig of RIGS) {
  const open = async () => {
    const p = await b.newPage({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2 });
    p.on('pageerror', e => errors.push(`${rig}: ${e.message}`));
    await p.goto(`${URL0}/?arena=1&notitle=1&light=v1&georgePerformance=1&p1=${rig}&p2=${rig.startsWith('george') ? 'thesz-procreate-v1' : 'george-roster-v1'}`);
    await p.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, null, { timeout: 60000 });
    await p.waitForTimeout(2500);
    return p;
  };
  let p = await open();
  const slots = await p.evaluate(() => { const A = window.__WFM_GAME.scene.scenes[0].w1; return Object.keys(A._tauntKit() ?? {}); });
  all[rig] = {};
  const cases = [...slots.map(s => [s, false]), ...(rig.startsWith('george') ? [['neutral', true]] : [])];
  if (process.env.ONLY) { const keep = process.env.ONLY.split(','); cases.splice(0, cases.length, ...cases.filter(([s, d]) => keep.includes(`${s}${d ? 'Down' : ''}`))); }
  // the back slot every wrestler lacks, to prove the fall back to neutral
  cases.push(['back', false]);
  for (const facing of [1, -1]) for (const [slot, downed] of cases) {
    const tag = `${slot}${downed ? 'Down' : ''}`;
    await p.close(); p = await open();   // a fresh page per case: no clip or tween left over from the last one
    await p.evaluate(({ facing, slot, downed, GAP, NORAND }) => {
      const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.lockupState = null; sc.tweens.getDelta = () => 1000 / 60; window.__T = sc.time.now;
      const A = sc.w1, D = sc.w2;
      for (const w of [A, D]) { w.state = 'standing'; w.y = 380; w.vx = w.vy = 0; w.stamina = 100; w.lying = null; w._activeMove = null; w._facingLock = false; }
      A.x = 420; D.x = 420 + facing * GAP; window.__downX = 420 + facing * 220; A.facing = facing; D.facing = -facing; D.input = { justDown: () => false, isDown: () => false };
      window.__down = downed; if (downed) { D.state = 'down'; D.lying = 'supine'; D.x = window.__downX; }
      const key = { up: 'up', down: 'down', forward: facing > 0 ? 'right' : 'left', back: facing > 0 ? 'left' : 'right' }[slot];
      window.__press = true;
      if (!NORAND) Math.random = () => 0.9;   // a strut ends without the crowd taunt (its 50% roll), so it is measured alone
      window.__step = () => { if (window.__down) { D.state = 'down'; D.lying = 'supine'; } window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); };
      for (let i = 0; i < 30; i++) window.__step();
      if (downed) { D.state = 'down'; D.lying = 'supine'; }
      A.input = { isDown: k => k === key, justDown: k => k === 'finisher' && window.__press };
      window.__press = true; window.__r = A.tryFinisher(D); window.__press = false; A.input = { isDown: () => false, justDown: () => false };
    }, { facing, slot, downed, GAP: +(process.env.GAP ?? 420), NORAND: !!process.env.NORAND });
    const stills = new Set([6, 14, 24, 34, 46, 60, 80, 100]), rows = [];
    for (let f = 0; f < 400; f++) {
      const r = await p.evaluate(() => {
        window.__step();
        const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, sk = A.skeleton, P = sk.jointAttachmentPoints ?? {};
        const pt = k => (P[k] ? [+P[k].x.toFixed(2), +P[k].y.toFixed(2)] : null);
        return { x: +A.x.toFixed(2), y: +A.y.toFixed(2), st: A.state, id: A._activeMove?.clip?.id ?? null, nA: pt('nearAnkle'), fA: pt('farAnkle'), lK: A.pose.lKnee ?? null, rK: A.pose.rKnee ?? null, lS: A.pose.lShin ?? null, rS: A.pose.rShin ?? null, strut: !!A._strut };
      });
      rows.push(r);
      if (stills.has(f)) {
        const clip = await p.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, c = sc.game.canvas.getBoundingClientRect(), k = c.width / sc.scale.width; return { x: c.left + (A.x - 110) * k, y: c.top + (A.y - 235) * k, width: 220 * k, height: 190 * k }; });
        await p.screenshot({ path: `${out}/${rig}_${tag}_${facing > 0 ? 'R' : 'L'}_${String(f).padStart(3, '0')}.png`, clip });
      }
      if (r.st !== 'taunting' && f > 10) break;
    }
    if (process.env.DUMP === `${rig}:${facing > 0 ? 'R' : 'L'}_${tag}`) writeFileSync(`${out}/rows.json`, JSON.stringify(rows));
    const x0 = rows[0].x, y0 = rows[0].y, ids = [...new Set(rows.map(r => r.id).filter(Boolean))];
    let ankle = 0, ankleAt = 0; for (let i = 1; i < rows.length; i++) for (const k of ['nA', 'fA']) { const a = rows[i - 1][k], c = rows[i][k]; if (a && c) { const d = Math.hypot(c[0] - a[0], c[1] - a[1]); if (d > ankle) { ankle = d; ankleAt = i; } } }
    const maxPos = k => Math.max(...rows.map(r => r[k] ?? -9));
    all[rig][`${facing > 0 ? 'R' : 'L'}_${tag}`] = { returned: await p.evaluate(() => window.__r), frames: rows.length, secs: +(rows.length / 60).toFixed(2), clip: ids.join(',') || (rows.some(r => r.strut) ? 'strut(gait)' : 'poseSeq'), rootDrift: +Math.max(...rows.map(r => Math.hypot(r.x - x0, r.y - y0))).toFixed(2), ankleStep: +ankle.toFixed(2), ankleAt, maxLKnee: maxPos('lK'), maxRKnee: maxPos('rK'), maxLShin: maxPos('lS'), maxRShin: maxPos('rS'), end: rows.at(-1).st };
  }
  await p.close();
}
writeFileSync(`${out}/taunt_probe.json`, JSON.stringify({ all, errors }, null, 1));
console.log(JSON.stringify({ all, errors }, null, 1));
await b.close();
