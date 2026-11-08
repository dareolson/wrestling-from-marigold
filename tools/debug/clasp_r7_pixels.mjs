// PLAN_GRAPPLES T2.2 r7: the frozen swap check on DRAWN PIXELS (r5's compared the forearm image quad, which cannot see that a clasp is a different drawing).
// At the frame each clasp swaps in, the same pose is drawn twice, clasp art and base art, and the screenshots are diffed. Changed pixels are split by where they
// sit along the forearm axis (t = 0 at the elbow, 1 at the wrist): the shaft (t < 0.85) should not change when only the hand is redrawn; the hand (t >= 0.85) may.
//   WFM_URL=http://localhost:5174 node tools/debug/clasp_r7_pixels.mjs <out.json>
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const SWAPS = () => {   // which slot of which man wears clasp art now
    const sc = window.__WFM_GAME.scene.scenes[0], out = {};
    for (const [id, w] of [['a', sc.w1], ['d', sc.w2]]) for (const slot of ['nearForearm', 'farForearm']) { const v = w.skeleton._partVariantState?.[slot]; if (v && v !== 'base') out[`${id}.${slot}`] = v; }
    return out;
};
const GEOM = ({ man, slot }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w = man === 'a' ? sc.w1 : sc.w2, side = slot.replace('Forearm', ''), p = w.skeleton.jointAttachmentPoints;
    const cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), gs = window.__WFM_GAME.scale.gameSize, k = box.width / gs.width;
    const scr = (q) => ({ x: box.x + (q.x - cam.worldView.x) * cam.zoom * k, y: box.y + (q.y - cam.worldView.y) * cam.zoom * k });
    return { E: scr(p[`${side}Elbow`]), W: scr(p[`${side}Wrist`]), scale: cam.zoom * k };
};
const SETART = ({ man, slot, art }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w = man === 'a' ? sc.w1 : sc.w2, sk = w.skeleton;
    window.__keep ??= {};
    if (art === 'base') { window.__keep = { ...(sk._partVariantState ?? {}) }; const s = { ...window.__keep }; delete s[slot]; sk.setPartVariants(s); }
    else sk.setPartVariants(window.__keep);
    const r = window.__WFM_GAME.renderer; r.preRender(); sc.sys.render(r); r.postRender();
};
const DIFF = async ({ a, b, E, W, ox, oy }) => {
    const load = (s) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const draw = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
    const A = draw(ia), B = draw(ib);
    const ax = W.x - E.x - 0, ay = W.y - E.y, len = Math.hypot(ax, ay) || 1, ux = ax / len, uy = ay / len;
    const out = { changed: 0, shaft: 0, hand: 0, elbowEnd: 0, bbox: null, shaftMaxPerpPx: 0, forearmScreenLen: +len.toFixed(1) };
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
        const o = (y * A.width + x) * 4;
        if (Math.abs(A.data[o] - B.data[o]) + Math.abs(A.data[o + 1] - B.data[o + 1]) + Math.abs(A.data[o + 2] - B.data[o + 2]) <= 24) continue;
        out.changed++;
        const px = x + ox - E.x, py = y + oy - E.y, t = (px * ux + py * uy) / len, perp = Math.abs(-px * uy + py * ux);
        if (t < 0.85) { out.shaft++; out.shaftMaxPerpPx = Math.max(out.shaftMaxPerpPx, perp); } else out.hand++;
        if (t < 0.1) out.elbowEnd++;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (out.changed) out.bbox = [x0, y0, x1, y1];
    out.shaftMaxPerpPx = +out.shaftMaxPerpPx.toFixed(1);
    return out;
};

const results = {};
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500); await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`; results[id] = [];
            await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
            let prev = {};
            for (let i = 0; i < 30; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                const now = await h.page.evaluate(SWAPS);
                for (const [key, art] of Object.entries(now)) {
                    if (prev[key]) continue;
                    const [man, slot] = key.split('.'), g = await h.page.evaluate(GEOM, { man, slot });
                    const clip = { x: Math.max(0, Math.min(g.E.x, g.W.x) - 60), y: Math.max(0, Math.min(g.E.y, g.W.y) - 60), width: Math.abs(g.E.x - g.W.x) + 120, height: Math.abs(g.E.y - g.W.y) + 120 };
                    const on = (await h.page.screenshot({ type: 'png', clip })).toString('base64');
                    await h.page.evaluate(SETART, { man, slot, art: 'base' });
                    const base = (await h.page.screenshot({ type: 'png', clip })).toString('base64');
                    await h.page.evaluate(SETART, { man, slot, art });
                    const d = await h.page.evaluate(DIFF, { a: on, b: base, E: g.E, W: g.W, ox: clip.x, oy: clip.y });
                    results[id].push({ man, slot, frame: i, art, ...d });
                }
                prev = now;
            }
            console.log(id, JSON.stringify(results[id].map(r => [r.man, r.slot, r.frame, r.art, r.changed, r.shaft, r.hand])));
        }
    } finally { await h.close(); }
}
writeFileSync(process.argv[2], JSON.stringify(results, null, 2));
