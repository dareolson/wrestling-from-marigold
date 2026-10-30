import { launch } from '/Users/home/Documents/wrestling-from-marigold/tools/debug/harness.mjs';
const out = process.argv[2];
const h = await launch();
await h.page.waitForTimeout(4000);
const info = await h.page.evaluate(() => {
  const game = window.__WFM_GAME, sc = game.scene.scenes[0];
  game.loop.sleep();
  const a = sc.w1, b = sc.w2;
  for (const w of [a, b]) { w.state = 'standing'; w.stamina = 100; }
  a.x = 480; b.x = 600; a.y = b.y = 400; a.facing = 1; b.facing = -1;
  a.state = b.state = 'lockup'; a.tweenPose('lockup',180,'Cubic.easeOut'); b.tweenPose('lockup',180,'Cubic.easeOut'); const r='forced';
  sc.lockupState = { attacker: a, defender: b, timer: 0 };
  sc._p1AI = null; sc._p2AI = null;
  let T = performance.now();
  for (let i = 0; i < 18; i++) { T += 1000/60; game.step(T, 1000/60); }
  return { r, a: a.state, b: b.state, att: sc.lockupState?.attacker === a, keys: Object.keys(sc).filter(k => /ai/i.test(k)).slice(0,10) };
});
console.log(JSON.stringify(info));
await h.screenshot(out);
await h.close();
