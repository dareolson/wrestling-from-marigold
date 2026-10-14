// Filmstrip of every fall (Skeleton.FALLS) and both get-ups on the real art,
// one PNG per row x progress, for eyeballing pose changes.
//   WFM_URL=http://127.0.0.1:5173 WFM_P1=thesz-procreate-v1 node tools/debug/fall_strip.mjs <outDir>
// Rows: each fall 0 -> 1, then each get-up drawn lying -> standing reversed.
import { launch } from './harness.mjs';
const outDir = process.argv[2];
const h = await launch();
await h.page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
await h.page.waitForTimeout(800);
await h.page.evaluate(() => {
  const sc = window.__WFM_GAME.scene.scenes[0];
  sc.scene.pause();
  for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false);
});
const rows = ['backward', 'sitBack', 'forward', 'kneesForward', 'flip', 'getup:supine', 'getup:prone'];
const ts = [0, 0.2, 0.4, 0.6, 0.8, 1];
for (const row of rows) for (const t of ts) {
  await h.page.evaluate(([row, t]) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const [w, x, f] of [[sc.w1, 330, 1], [sc.w2, 700, -1]]) {
      w.gfx.clear(); w.skeleton.setVisible(true);
      if (row.startsWith('getup:')) w.skeleton.updateGetUp(x, 380, w.s, f, 1 - t, row.slice(6));
      else w.skeleton.updateFall(x, 380, w.s, f, row, t);
      w.gfx.lineStyle(1, 0xff0000, 1); w.gfx.lineBetween(x - 150, 380, x + 150, 380);
    }
  }, [row, t]);
  await h.page.waitForTimeout(60);
  await h.page.screenshot({ path: `${outDir}/${row.replace(':', '_')}_${t}.png`, clip: { x: 130, y: 210, width: 780, height: 280 } });
}
process.exit(0);
