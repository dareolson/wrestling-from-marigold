// PLAN_LIGHT_MOVES T6.1: an answer to a returning runner through the real tryAction, 60 fps, both pairings and facings.
//   WFM_URL=http://127.0.0.1:5197 [LIGHT=v1] MODES=clothesline,backBodyDrop node tools/debug/runner_measure.mjs <out.json>
// The runner is placed 420 px out, state 'running', runPhase 'returning', run target far behind the attacker; the attacker presses Action (Up held for backBodyDrop)
// on the first frame the answer's window is open. A kit that lacks the move gets it pushed into its moveSet (said in the output).
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { READ } from './toehold_t30_lib.mjs';
const URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197', LIGHT = process.env.LIGHT === 'v1';
const MODES = (process.env.MODES ?? 'clothesline,backBodyDrop').split(',');
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const res = {};
try {
  for (const mode of MODES) for (const [name, a, d] of [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]]) for (const facing of [1, -1]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${URL0}/?arena=1&notitle=1${LIGHT ? '&light=v1' : ''}&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1500);
    res[`${mode}-${name}-${facing > 0 ? 'right' : 'left'}`] = { errors, ...(await page.evaluate(async ({ facing, mode, readSrc }) => {
      const read = (0, eval)(`(${readSrc})`);
      const G = window.__WFM_GAME, sc = G.scene.scenes[0], w1 = sc.w1, w2 = sc.w2;
      G.loop.sleep(); sc._p1AI = sc._p2AI = null; let T = sc.time.now; const step = () => { T += 1000 / 60; G.step(T, 1000 / 60); };
      sc.tweens.getDelta = () => 1000 / 60;
      let press = false; const up = mode === 'backBodyDrop', pw = mode === 'hipToss' || mode === 'armDrag';
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.stamina = 100; }
      w1.input = { justDown: k => (k === (pw ? 'power' : 'action')) && press, isDown: k => k === 'up' && up && press };
      w2.input = { justDown: () => false, isDown: () => false };
      w1.x = 520; w1.facing = facing; w2.facing = -facing; w2.x = 520 + facing * 420;
      const added = !w1.moveSet.includes(mode); if (added) w1.moveSet.push(mode); if (mode === 'armDrag') w1.moveSet = w1.moveSet.filter(m => m !== 'hipToss');
      step();
      w2.state = 'running'; w2.runPhase = 'returning'; w2.runFacing = -facing; w2.facing = -facing; w2.runTarget = 520 - facing * 700; w2.runTargetY = null; w2.vx = 0;
      const j = w => Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints).map(([k, v]) => [k, [v.x, v.y]]));
      const rows = []; let called = null, answer = null;
      for (let i = 0; i < 60 * 4; i++) {
        press = called === null && Math.abs(w2.x - w1.x) < 160 * w1.s && ((w2.x - w1.x) * w2.runFacing) < 45 * w1.s && w2.state === 'running';
        const dx0 = w2.x;
        if (press) { answer = pw ? w1.tryPower(w2) : w1.tryAction(w2); called = i; }
        press = false;
        step();
        const r = read();
        rows.push({ t: i / 60, ax: w1.x, dx: w2.x, dy: w2.y, ast: w1.state, dst: w2.state, dlying: w2.lying, runSpeed: (w2.x - dx0) * 60, pin: [...r.att.pinned, ...r.def.pinned], a: j(w1), d: j(w2) });
      }
      return { answer, called, added, rows };
    }, { facing, mode, readSrc: READ.toString() })) };
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(process.argv[2] ?? '/private/tmp/claude-501/s/runner.json', JSON.stringify(res));
console.log('ok', Object.keys(res).length);
