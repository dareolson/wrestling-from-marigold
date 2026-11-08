// PLAN_LIGHT_MOVES T2.1: the ankle lock as drawn today (no code change). Lou vs George and George vs Lou, both facings, the attacker's
// real `_doAnkleLock` on a downed man, stepped 1/60 s with the loop asleep. Per frame: each hand's wrist to the trapped ankle joint and to
// the trapped boot (centroid of the opaque shin pixels in the lowest 30% of the shin image), attacker ankle slide, knee flex of both men,
// the trapped leg's angle off the mat, silhouette overlap (D12 masks).
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/ankle_lock_measure.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, STEP } from './grapples_film.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const HELD = [0.6, 2.8];   // the clip's hold keys (arms at the foot) to the start of the release

const SETUP = async ({ facing }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234;
    Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing; a.x = 520; d.x = 520 + facing * 70 * a.s;
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    d.state = 'down'; d.lying = 'supine'; d.stateTimer = 99;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
    a._doAnkleLock(d);
    return { a: a.x, d: d.x, s: a.s, clipDur: a._activeMove?.clip?.duration ?? null };
};

const READ = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, hnd = a._activeMove;
    const px = new Map();
    const pix = (img) => { const k = img.texture.key; if (!px.has(k)) { const src = img.texture.getSourceImage(), cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(src, 0, 0); px.set(k, { d: c.getImageData(0, 0, cv.width, cv.height).data, w: src.width }); } return px.get(k); };
    // boot: opaque pixels of the shin image in the lowest 30% (local v > 0.7), centroid to world
    const boot = (img) => {
        const m = img.getWorldTransformMatrix(), f = img.frame, P = pix(img), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
        let sx = 0, sy = 0, n = 0;
        for (let j = Math.floor(f.cutHeight * 0.7); j < f.cutHeight; j += 2) for (let i = 0; i < f.cutWidth; i += 2) {
            if (P.d[((f.cutY + j) * P.w + f.cutX + i) * 4 + 3] < 32) continue;
            const u = (img.flipX ? f.cutWidth - 1 - i : i) / f.cutWidth * fw - ox, v = j / f.cutHeight * fh - oy;
            sx += m.a * u + m.c * v + m.tx; sy += m.b * u + m.d * v + m.ty; n++;
        }
        return n ? { x: sx / n, y: sy / n } : null;
    };
    const sk = d.skeleton, ask = a.skeleton, pt = sk.jointAttachmentPoints, ap = ask.jointAttachmentPoints;
    const lSide = sk.lChannelSide(d.facing), rSide = lSide === 'near' ? 'far' : 'near';
    const out = { t: hnd ? +hnd.time.toFixed(4) : null, lSide, dPose: { lLeg: d.pose.lLeg, rLeg: d.pose.rLeg, lKnee: d.pose.lKnee, rKnee: d.pose.rKnee, tilt: d.pose.tilt, lift: d.pose.lift }, aPose: { lKnee: a.pose.lKnee, rKnee: a.pose.rKnee, lShin: a.pose.lShin, rShin: a.pose.rShin } };
    // trapped = the defender leg the clip lifts (lLeg channel); the boot the hands should land on
    const side = lSide, ankle = pt[`${side}Ankle`], hip = pt[`${side}Hip`], knee = pt[`${side}Knee`], shin = sk[`${side}Shin`], b = boot(shin);
    const dist = (p, q) => (p && q ? Math.hypot(p.x - q.x, p.y - q.y) : null);
    out.trapped = side; out.ankle = ankle; out.boot = b;
    out.hands = {};
    for (const hs of ['near', 'far']) { const w = ap[`${hs}Wrist`]; out.hands[hs] = { toAnkle: dist(w, ankle), toBoot: dist(w, b) }; }
    out.legAngleDeg = Math.atan2(-(ankle.y - hip.y), Math.abs(ankle.x - hip.x)) * 180 / Math.PI;   // 0 = along the mat, +90 = straight up
    out.kneeBend = { trapped: Math.atan2(ankle.y - knee.y, ankle.x - knee.x) - Math.atan2(knee.y - hip.y, knee.x - hip.x) };
    out.aAnkle = { near: ap.nearAnkle, far: ap.farAnkle };
    out.aKnee = { near: ap.nearKnee, far: ap.farKnee, nearHip: ap.nearHip, farHip: ap.farHip };
    const m = window.__maskOverlap ? window.__maskOverlap(a, d, false) : null;
    out.mask = m ? { below: m.below, belowBody: m.belowBody, torso: m.torso, above: m.above } : null;
    out.state = [a.state, d.state];
    return out;
};

const round = (v, n = 2) => (typeof v === 'number' ? +v.toFixed(n) : v);
const results = {};
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        await h.page.evaluate(INSTALL_MASKS);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`;
            const info = await h.page.evaluate(SETUP, { facing });
            const rows = [];
            for (let i = 0; i < 230; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                const r = await h.page.evaluate(READ);
                if (r.t === null && rows.length) break;
                if (r.t !== null) rows.push(r);
            }
            const held = rows.filter(r => r.t >= HELD[0] && r.t <= HELD[1]);
            const stat = (arr) => arr.length ? { min: round(Math.min(...arr)), max: round(Math.max(...arr)), mean: round(arr.reduce((p, q) => p + q, 0) / arr.length) } : null;
            const handStat = (rs, hs, k) => stat(rs.map(r => r.hands[hs][k]).filter(v => v !== null));
            const slide = (ank) => { let worst = 0, sum = 0, n = 0; for (let i = 1; i < rows.length; i++) { const dx = Math.hypot(rows[i].aAnkle[ank].x - rows[i - 1].aAnkle[ank].x, rows[i].aAnkle[ank].y - rows[i - 1].aAnkle[ank].y); worst = Math.max(worst, dx); sum += dx; n++; } return { worstPxPerFrame: round(worst), meanPxPerFrame: round(sum / n) }; };
            const kneeFlex = (who) => { const ks = rows.flatMap(r => [r[who].lKnee, r[who].rKnee]).filter(Number.isFinite); return { min: round(Math.min(...ks), 3), max: round(Math.max(...ks), 3) }; };
            const rec = {
                info, frames: rows.length, trapped: rows[0]?.trapped, lSide: rows[0]?.lSide,
                handsHeld: { near: { toAnkle: handStat(held, 'near', 'toAnkle'), toBoot: handStat(held, 'near', 'toBoot') }, far: { toAnkle: handStat(held, 'far', 'toAnkle'), toBoot: handStat(held, 'far', 'toBoot') } },
                handsAll: { near: { toAnkle: handStat(rows, 'near', 'toAnkle'), toBoot: handStat(rows, 'near', 'toBoot') }, far: { toAnkle: handStat(rows, 'far', 'toAnkle'), toBoot: handStat(rows, 'far', 'toBoot') } },
                bestHandHeld: stat(held.map(r => Math.min(r.hands.near.toBoot, r.hands.far.toBoot))),
                attackerSlide: { near: slide('near'), far: slide('far') },
                attackerKnee: kneeFlex('aPose'), defenderKnee: kneeFlex('dPose'),
                legAngleDeg: stat(rows.map(r => r.legAngleDeg)), legAngleHeldDeg: stat(held.map(r => r.legAngleDeg)),
                trappedKneeBendRad: stat(held.map(r => r.kneeBend.trapped)),
                mask: { belowBodyMaxPx: Math.max(...rows.map(r => r.mask?.belowBody ?? 0)), torsoMaxPx: Math.max(...rows.map(r => r.mask?.torso ?? 0)), aboveMaxPx: Math.max(...rows.map(r => r.mask?.above ?? 0)), belowBodyFrames: rows.filter(r => (r.mask?.belowBody ?? 0) > 0).length },
                // the 0.1 s trace: t, best hand to boot, other hand to boot, leg angle
                trace: rows.filter((r, i) => i % 6 === 0).map(r => ({ t: r.t, near: round(r.hands.near.toBoot, 1), far: round(r.hands.far.toBoot, 1), leg: round(r.legAngleDeg, 1), aKnee: [round(r.aPose.lKnee, 2), round(r.aPose.rKnee, 2)] })),
            };
            results[id] = rec;
            console.log(id, JSON.stringify({ ...rec, trace: undefined }));
        }
    } finally { await h.close(); }
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(results, null, 2));
