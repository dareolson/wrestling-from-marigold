// Half-crab numbers from the live preview. Vite must be running.
//   WFM_URL=http://127.0.0.1:5197 node tools/move-preview/crab_measure.mjs [out.json] [pair=lou-george|george-lou|<attRig>:<defRig>] [facing=right|left|all]
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { MASKS, READ } from '../debug/toehold_t30_lib.mjs';
const [out, only, face = 'all'] = process.argv.slice(2);
const pairs = only ? [only] : ['lou-george', 'george-lou'];
const faces = face === 'all' ? ['right', 'left'] : [face];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const res = {};
try {
  for (const pair of pairs) for (const fc of faces) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
    await page.goto(`${process.env.WFM_URL ?? 'http://127.0.0.1:5197'}/tools/move-preview/`);
    await page.waitForFunction(() => window.__MOVE_PREVIEW?.ready && window.__MOVE_PREVIEW.handle, { timeout: 30000 });
    // 'attackerRig:defenderRig' picks any two roster rigs; the two named pairs use the Pair preset
    if (pair.includes(':')) { const [att, def] = pair.split(':'); await page.locator('#att').selectOption(att); await page.locator('#def').selectOption(def); await page.waitForFunction(() => window.__MOVE_PREVIEW.ready && window.__MOVE_PREVIEW.handle); }
    else if (pair !== 'lou-george') { await page.locator('#pair').selectOption(pair); await page.waitForFunction(() => window.__MOVE_PREVIEW.ready && window.__MOVE_PREVIEW.handle); }
    if (fc === 'left') { await page.locator('#mirror').click(); await page.waitForFunction(() => document.querySelector('#mirror').textContent === 'Face right' && window.__MOVE_PREVIEW.handle); }
    await page.waitForTimeout(300);
    res[`${pair}-${fc}`] = await page.evaluate(async ([masks, readSrc]) => {
      const P = window.__MOVE_PREVIEW, w = document.querySelector('#game').contentWindow, s = w.__WFM_GAME.scene.scenes[0];
      const dur = P.handle.clip.duration, rows = [];
      w.eval(`(${masks})()`); const read = w.eval(`(${readSrc})`);
      const trapped = () => {
        const a = s.w1, d = s.w2, ds = d.skeleton.lChannelSide(d.facing), sk = a.skeleton, k = d.skeleton;
        const ox = Math.floor(Math.min(a.x, d.x) - 300), oy = 200, cw = 800, ch = 330, ank = d.skeleton.jointAttachmentPoints[ds + 'Ankle'];
        const T = w.__partsMask(d, [k[ds + 'Thigh'], k[ds + 'Shin']], ox, oy, cw, ch).slice();
        const legs = ['nearThigh', 'nearShin', 'nearBoot', 'farThigh', 'farShin', 'farBoot'].map(n => sk[n]);
        const L = w.__partsMask(a, legs, ox, oy, cw, ch).slice();
        const cover = w.__partsMask(a, sk._parts.filter(i => i.depth > k[ds + 'Shin'].depth), ox, oy, cw, ch).slice();
        let tp = 0, over = 0, boot = 0, bootHid = 0;
        for (let i = 0; i < T.length; i++) if (T[i]) { tp++; if (L[i]) over++; if (Math.hypot(i % cw + ox - ank.x, Math.floor(i / cw) + oy - ank.y) <= 28) { boot++; if (cover[i]) bootHid++; } }
        return { trappedPx: tp, overlapLegsPx: over, bootPx: boot, bootCoveredPx: bootHid, bootVisiblePx: boot - bootHid };
      };
      const snap = a => ({ x: a.x, y: a.y, facing: a.facing, j: Object.fromEntries(Object.entries(a.skeleton.jointAttachmentPoints).map(([k, v]) => [k, [v.x, v.y]])),
        parts: a.skeleton._partCorners().map(c => c ? [c.reduce((m, q) => m + q[0], 0) / 4, c.reduce((m, q) => m + q[1], 0) / 4] : null), corners: a.skeleton._partCorners() });
      for (let i = 0; i * (1 / 60) < dur - .002; i++) { P.seek(i / 60); await new Promise(r => setTimeout(r, 0)); rows.push({ t: i / 60, a: snap(s.w1), d: snap(s.w2), mask: i % 6 === 0 && i / 60 >= 1 ? trapped() : undefined, pin: (() => { const r = read(); return { att: r.att.pinned, def: r.def.pinned, kneesA: r.att.knees, kneesD: r.def.knees }; })() }); }
      return rows;
    }, [MASKS.toString(), READ.toString()]);
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(out ?? '/private/tmp/claude-501/s/crab.json', JSON.stringify(res));
console.log('ok', Object.keys(res).join(' '));
