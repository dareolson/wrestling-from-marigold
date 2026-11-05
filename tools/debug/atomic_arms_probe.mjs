// T4c.4o / T4c.4p: the atomic drop's receiver arms and pelvis path. Films the drop for both pairs and both facings (waistlock_throws film, 1/60 s) and measures, per frame
// of the clip, in game px unless noted:
//   pelvis path (receiver, y and x over the clip, for the "arm keys only" check against a saved run: pass a baseline json as argv[3]),
//   max hand step (px/frame, both wrists, receiver), L/R arm angle difference (shoulder->wrist, degrees; the longest run of frames under 3 degrees over lift + hitch),
//   arm parts (upper arm, forearm, hand) drawn inside his own torso (depth above it) and inside the attacker's torso (any depth), pixels counted as G8's forearm count.
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/atomic_arms_probe.mjs out.json [baseline.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film } from './waistlock_throws.mjs';
import { ATOMIC } from '../../src/animation/waistlockThrows.js';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lg', LOU, GEORGE], ['gl', GEORGE, LOU]];
const r1 = (v) => +v.toFixed(1), r2 = (v) => +v.toFixed(2);
const L = ATOMIC.lift, T = L + ATOMIC.hitch;

// the receiver's arm parts against his own torso and the attacker's torso, drawn alone from their world matrices (as far_arm_probe, but both arms and both men)
const INSTALL_ARMS = () => {
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
    window.__armsInside = (w, other) => {
        const sk = w.skeleton, R = 300, cw = 2 * R, ch = 2 * R, tm = sk.torso.getWorldTransformMatrix(), cx = Math.floor(tm.tx - R), cy = Math.floor(tm.ty - R);
        const own = mask(sk.torso, cx, cy, cw, ch), oth = mask(other.skeleton.torso, cx, cy, cw, ch), out = { own: 0, other: 0 };
        for (const n of ['nearUpArm', 'nearForearm', 'nearHand', 'farUpArm', 'farForearm', 'farHand']) {
            const img = sk[n]; if (!img) continue;
            const A = mask(img, cx, cy, cw, ch), far = n.startsWith('far'); let o = 0, p = 0;
            // own torso: the far arm only (G8's count); the near arm hangs in front of the torso by design. attacker's torso: every arm part, any depth
            for (let i = 3; i < A.length; i += 4) if (A[i] > 128) { if (far && img.depth > sk.torso.depth && own[i] > 128) o++; if (oth[i] > 128) p++; }
            out.own += o; out.other += p;
        }
        return out;
    };
};
export const probe = async (page, info, facing) => {
    // film() asks for window.__maskOverlap(a, d) once a frame when spec.mask is set; the probe's answer is the receiver's arm-part overlap (row.mask)
    await page.evaluate(() => { window.__maskOverlap = (a, d) => window.__armsInside(d, a); });
    const rows = await film(page, info, { facing, case: 'drop', mask: true }, null, { quiet: 8 });
    const clip = rows.filter(r => r.t.clip === 'atomicDrop');
    return clip;
};
const dir = (a, b) => Math.atan2(b.x - a.x, b.y - a.y);
const base = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : null;
const out = { runs: [] };
for (const [pid, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1' + (process.env.WFM_XQ ?? '');
    const h = await launch();
    try {
        const page = h.page; await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL); await page.evaluate(INSTALL_ARMS);
        for (const facing of [-1, 1]) {
            const clip = await probe(page, info, facing);
            const id = `${pid}-${facing < 0 ? 'l' : 'r'}`;
            const pel = clip.map(r => ({ t: r2(r.t.time), x: r2((r.d.pts.nearHip.x + r.d.pts.farHip.x) / 2), y: r2((r.d.pts.nearHip.y + r.d.pts.farHip.y) / 2) }));
            const wr = (r, n) => r.d.pts[`${n}Wrist`], sh = (r, n) => r.d.pts[`${n}Shoulder`];
            let maxHand = { step: 0 }, maxRel = { step: 0 }, flat = 0, longestFlat = 0;
            for (let i = 1; i < clip.length; i++) {
                for (const n of ['near', 'far']) { const s = Math.hypot(wr(clip[i], n).x - wr(clip[i - 1], n).x, wr(clip[i], n).y - wr(clip[i - 1], n).y); if (s > maxHand.step) maxHand = { step: r2(s), t: r2(clip[i].t.time), arm: n };
                    const rel = (r) => ({ x: wr(r, n).x - sh(r, n).x, y: wr(r, n).y - sh(r, n).y }), ra = rel(clip[i]), rb = rel(clip[i - 1]), sr = Math.hypot(ra.x - rb.x, ra.y - rb.y); if (clip[i].t.time <= ATOMIC.impact && sr > maxRel.step) maxRel = { step: r2(sr), t: r2(clip[i].t.time), arm: n }; }
                const t = clip[i].t.time;
                if (t >= 0.14 && t <= T) {
                    const df = Math.abs(dir(sh(clip[i], 'near'), wr(clip[i], 'near')) - dir(sh(clip[i], 'far'), wr(clip[i], 'far'))) * 180 / Math.PI;
                    flat = df < 3 ? flat + 1 : 0; longestFlat = Math.max(longestFlat, flat);
                }
            }
            const upTo = (lim, k) => clip.filter(r => r.t.time <= lim).reduce((m, r) => Math.max(m, r.mask?.[k] ?? 0), 0);
            const insideOwn = upTo(ATOMIC.impact, 'own'), insideOther = { toLiftEnd: upTo(L, 'other'), toImpact: upTo(ATOMIC.impact, 'other') };
            const insideFrames = { own: clip.filter(r => r.mask?.own > 0).length, other: clip.filter(r => r.mask?.other > 0).length };
            const ang = clip.filter((_, i) => i % 6 === 0).map(r => ({ t: r2(r.t.time), near: r1(dir(sh(r, 'near'), wr(r, 'near')) * 180 / Math.PI), far: r1(dir(sh(r, 'far'), wr(r, 'far')) * 180 / Math.PI) }));
            const run = { id, frames: clip.length, maxHandStep: maxHand, maxHandStepOverShoulderToImpact: maxRel, longestSimilarArmFrames: longestFlat, farArmInsideOwnTorsoToImpactMaxPx: insideOwn, armPartsInsideAttackerTorsoMaxPx: insideOther, insideFrames, ang, pelvis: pel };
            if (base) { const b = base.runs.find(x => x.id === id); run.pelvisDiffVsBaseline = r2(Math.max(...pel.map((p, i) => { const q = b.pelvis[i]; return q ? Math.hypot(p.x - q.x, p.y - q.y) : 0; }))); }
            out.runs.push(run);
        }
    } finally { await h.close(); }
}
writeFileSync(process.argv[2] ?? 'atomic_arms.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.runs.map(({ ang, pelvis, ...r }) => r), null, 1));
