// PLAN_SCALE T2.5: where the top rope crosses each body, in painted ink. Lou (w1) and George (w2), idle, at the depth bounds and the G2 rows, flag off | ?scale=v1.
// Ink = every visible skeleton part's pixels with alpha >= 128, mapped through the part's world matrix (not frame bounds, which include transparent padding).
// Rope y at the man's x is the arena's own arch: nominal y + (REST_SAG[2] + bounce sag * 0.75) * sin(pi t); the far rope's rest sag is scaled by 0.58 (Arena.js:2391-2423).
//   WFM_URL=http://localhost:5173 node tools/debug/scale_rope_body.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
export const ROWS = { farBound: 264, back: 266, middle: 352, front: 438, nearBound: 439 };
export const INK = () => {   // evaluated in the page: per man, ink top/bottom in screen y, plus the ropes at his x
    const sc = window.__WFM_GAME.scene.scenes[0], cache = new Map();
    const alphaOf = (frame) => {
        let c = cache.get(frame); if (c) return c;
        const cv = document.createElement('canvas'); cv.width = frame.cutWidth; cv.height = frame.cutHeight;
        const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
        c = { w: frame.cutWidth, h: frame.cutHeight, d: cx.getImageData(0, 0, frame.cutWidth, frame.cutHeight).data }; cache.set(frame, c); return c;
    };
    const ropes = (x) => {
        const R = window.__RING, top = R.ropes[2], ns = sc.nearRopeSag?.val ?? 0, fs = sc.farRopeSag?.val ?? 0;
        const tn = (x - R.nearLeft.x) / (R.nearRight.x - R.nearLeft.x), tf = (x - R.farLeft.x) / (R.farRight.x - R.farLeft.x);
        return { near: top.nearY + (3 + ns * 0.75) * Math.sin(Math.PI * Math.max(0, Math.min(1, tn))), far: top.farY + (3 * 0.58 + fs * 0.75) * Math.sin(Math.PI * Math.max(0, Math.min(1, tf))) };
    };
    const cam = sc.cameras.main, wv = cam.worldView, view = { x: wv.x, y: wv.y, w: wv.width, h: wv.height, sw: cam.width, sh: cam.height };   // the camera may scroll/zoom: screen = (world - view) * sw / w
    return [sc.w1, sc.w2].map(w => {
        let top = Infinity, bot = -Infinity, fTop = Infinity, fBot = -Infinity, n = 0;
        for (const k of Object.keys(w.skeleton)) {
            const im = w.skeleton[k];
            if (!im || typeof im.getWorldTransformMatrix !== 'function' || !im.frame || !im.visible || !(im.alpha > 0) || !im.frame.source?.image) continue;
            const f = im.frame, a = alphaOf(f), m = im.getWorldTransformMatrix(), b = im.getBounds();
            fTop = Math.min(fTop, b.top); fBot = Math.max(fBot, b.bottom);
            const ox = im.displayOriginX, oy = im.displayOriginY, rw = f.realWidth, ox0 = f.x ?? 0, oy0 = f.y ?? 0;
            for (let j = 0; j < a.h; j++) for (let i = 0; i < a.w; i++) {
                if (a.d[(j * a.w + i) * 4 + 3] < 128) continue;
                const px = (im.flipX ? rw - (i + 0.5 + ox0) : i + 0.5 + ox0) - ox, py = (im.flipY ? f.realHeight - (j + 0.5 + oy0) : j + 0.5 + oy0) - oy;
                const y = m.b * px + m.d * py + m.ty;
                if (y < top) top = y; if (y > bot) bot = y; n++;
            }
        }
        return { rig: w.rigId, x: w.x, y: w.y, drawScale: w.drawScale(), heightScale: w._heightScale, inkTop: top, inkBottom: bot, ink: bot - top, boundsTop: fTop, boundsBottom: fBot, px: n, ropes: ropes(w.x), view };
    });
};
const SETUP = ({ row }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose); w._activeMove = null; w._sell = null; w._hold = null; w._corner = null;
        w.state = 'standing'; w.vx = 0; w.vy = 0; w.lying = null; w.combatBlend = 0; w.moveBlend = 0; w.walkPhase = 0;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle); w.skeleton.setPartVariants?.({});
    }
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    a.facing = 1; d.facing = -1; a.y = row; d.y = row; a.x = 415; d.x = 545;
};
if (import.meta.url === `file://${process.argv[1]}`) {
    const out = [];
    for (const on of [0, 1]) {
        process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&light=v1' + (on ? '&scale=v1' : '&scale=off');
        const h = await launch();
        try {
            const page = h.page;
            await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 }); await page.waitForTimeout(1500);
            await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now; window.__idle = { ...sc.w1.pose }; });
            await page.evaluate((R) => { window.__RING = R; }, JSON.parse(readRing()));
            for (const [rn, row] of Object.entries(ROWS)) {
                await page.evaluate(SETUP, { row });
                for (let i = 0; i < 90; i++) await page.evaluate(() => { window.__T += 1000 / 60; window.__WFM_GAME.step(window.__T, 1000 / 60); return 0; });   // settle: idle pose, the rope's rest sag
                const men = await page.evaluate(INK);
                for (const m of men) out.push({ flag: on, row: rn, ...m });
            }
        } finally { await h.close(); }
    }
    writeFileSync(process.argv[2] ?? 'research/scale-2026-11/g2/rope-body.json', JSON.stringify(out, null, 1));
    console.table(out.map(r => ({ flag: r.flag, row: r.row, rig: r.rig.slice(0, 5), y: +r.y.toFixed(1), ds: +r.drawScale.toFixed(4), ink: +r.ink.toFixed(1), inkTop: +r.inkTop.toFixed(1), inkBot: +r.inkBottom.toFixed(1), farFrac: +((r.inkBottom - r.ropes.far) / r.ink).toFixed(3), nearFrac: +((r.inkBottom - r.ropes.near) / r.ink).toFixed(3) })));
    process.exit(0);
}
function readRing() { return JSON.stringify({ nearLeft: { x: 40, y: 445 }, nearRight: { x: 920, y: 445 }, farLeft: { x: 210, y: 258 }, farRight: { x: 750, y: 258 }, ropes: [{ nearY: 380, farY: 218 }, { nearY: 316, farY: 181 }, { nearY: 251, farY: 142 }] }); }
