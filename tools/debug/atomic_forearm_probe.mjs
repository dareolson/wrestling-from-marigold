// T4c.4r: the atomic drop's carrier's camera-side wrapping forearm against the receiver's trunks. Per frame of the clip, both pairs, both facings (waistlock_throws film, 1/60 s):
//   cover   = pixels where the attacker's near forearm+hand (alpha > 128) lie under a receiver torso part drawn in front of them (trunks, torso, pelvis layers) -- want 0 while the grips hold
//   front   = pixels of the near forearm+hand drawn in front of those torso parts (the arm over the trunks); outside the grip window this is the default order, reported so the window is seen to end
//   WFM_URL=http://localhost:5180 node tools/debug/atomic_forearm_probe.mjs out.json
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film } from './waistlock_throws.mjs';
import { ATOMIC } from '../../src/animation/waistlockThrows.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lg', LOU, GEORGE], ['gl', GEORGE, LOU]];
const r2 = (v) => +v.toFixed(2);
const END = ATOMIC.lift + ATOMIC.hitch + 0.06, CLEAR = 1.08;   // END: the grips' release (atomicDrop.js grips out[1]); CLEAR: the layer window's end (atomicDrop.js ARM_CLEAR)

const INSTALL_COVER = () => {
    const mask = (img, ox0, oy0, cw, ch) => {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (img.visible && img.alpha > 0 && img.frame) {
            const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
            ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - ox0, m.ty - oy0);
            ctx.translate(-img.originX * fw, -img.originY * fh);
            if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
            if (img.flipY) { ctx.translate(0, fh); ctx.scale(1, -1); }
            ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        }
        return ctx.getImageData(0, 0, cw, ch).data;
    };
    // a = attacker, d = receiver. The working arm is the camera-side (near) one: nearForearm, nearHand.
    window.__trunkCover = (a, d) => {
        const R = 300, cw = 2 * R, ch = 2 * R, tm = d.skeleton.torso.getWorldTransformMatrix(), cx = Math.floor(tm.tx - R), cy = Math.floor(tm.ty - R);
        const tors = ['pelvisUnderlay', 'torso', 'trunks', 'pelvisOverlay', 'pelvisMask'].map(n => d.skeleton[n]).filter(Boolean).map(img => ({ img, m: mask(img, cx, cy, cw, ch) }));
        const out = { cover: 0, front: 0 };
        for (const n of ['nearForearm', 'nearHand']) {
            const arm = a.skeleton[n]; if (!arm) continue;
            const A = mask(arm, cx, cy, cw, ch);
            for (let i = 3; i < A.length; i += 4) {
                if (A[i] <= 128) continue;
                let under = false, over = false;
                for (const t of tors) if (t.m[i] > 128) { if (t.img.depth > arm.depth) under = true; else over = true; }
                if (under) out.cover++; else if (over) out.front++;
            }
        }
        return out;
    };
};
const out = { end: r2(END), runs: [] };
for (const [pid, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1' + (process.env.WFM_XQ ?? '');
    const h = await launch();
    try {
        const page = h.page; await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL); await page.evaluate(INSTALL_COVER);
        await page.evaluate(() => { window.__maskOverlap = (a, d) => window.__trunkCover(a, d); });
        for (const facing of [-1, 1]) {
            const rows = (await film(page, info, { facing, case: 'drop', mask: true }, null, { quiet: 8 })).filter(r => r.t.clip === 'atomicDrop');
            const inWin = rows.filter(r => r.t.time < END), after = rows.filter(r => r.t.time >= END);
            const sum = (rs, k) => rs.reduce((m, r) => m + (r.mask?.[k] ?? 0), 0);
            out.runs.push({
                id: `${pid}-${facing < 0 ? 'l' : 'r'}`, frames: rows.length,
                gripWindow: { frames: inWin.length, framesCovered: inWin.filter(r => r.mask?.cover > 0).length, coverPx: sum(inWin, 'cover'), maxCoverPx: Math.max(0, ...inWin.map(r => r.mask?.cover ?? 0)), framesFront: inWin.filter(r => r.mask?.front > 0).length, minFrontPx: Math.min(...inWin.map(r => r.mask?.front ?? 0)) },
                afterRelease: { frames: after.length, framesCovered: after.filter(r => r.mask?.cover > 0).length, coverPx: sum(after, 'cover'), framesFront: after.filter(r => r.mask?.front > 0).length, frontPx: sum(after, 'front') },
                coveredAt: inWin.filter(r => r.mask?.cover > 0).map(r => r2(r.t.time)), coveredAfterAt: after.filter(r => r.mask?.cover > 0).map(r => [r2(r.t.time), r.mask.cover]),
            });
        }
    } finally { await h.close(); }
}
writeFileSync(process.argv[2] ?? 'atomic_forearm.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.runs.map(({ coveredAt, ...r }) => ({ ...r, coveredAt: coveredAt.length > 12 ? `${coveredAt.length} frames, ${coveredAt[0]}..${coveredAt.at(-1)}` : coveredAt })), null, 1));
