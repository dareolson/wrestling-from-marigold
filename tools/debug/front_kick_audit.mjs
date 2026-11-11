// PLAN_LIGHT_MOVES T1.1/T1.2: motion audit of the front kick (frontKick, or frontKickV2 under LIGHT=1), the real `_doFrontKick` on a standing man at the clip's
// own standoff, 1/60 s steps (loop asleep). Per frame, the kicker:
//   - drawn knee flex near / far (the clip_knee_audit reading off hip/knee/ankle; < 0 is a backward fold, JOINT_LIMITS.knee is -0.10..2.55);
//   - pose channels at a JOINT_LIMITS knee limit (saturation), the clip's own lKnee / rKnee;
//   - both painted soles (Skeleton.soleWorld): slide px/frame, height above the mat; the support leg is the r channel (the far limb), the kick the l channel;
//   - the kicking boot against the defender's belly (neck-hip midpoint): horizontal gap and height above the mat at the impact event.
// Both facings, attackers Lou (vs George), George (vs Lou), Kowalski (vs George), Guido (vs Lou). With framesDir (only the ONLY pairs): a 30 fps crop of every second game
// frame (<framesDir>/<case>/sNNNN.jpg, normal speed) and tight stills (still-<t>.png).
//   LIGHT=1 node tools/debug/front_kick_audit.mjs <out.json> [framesDir]       ONLY=lou-george,kowalski-george  to pick pairs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, STEP } from './grapples_film.mjs';
import { JOINT_LIMITS } from '../../src/rig/articulation.js';
import { FRONT_KICK_V2_STANDOFF } from '../../src/animation/clips/frontKickV2.js';

const RIG = { lou: 'thesz-procreate-v1', george: 'george-roster-v1', kowalski: 'kowalski-roster-v1', guido: 'guido-roster-v1' };
const PAIRS = [['lou-george', 'lou', 'george'], ['george-lou', 'george', 'lou'], ['kowalski-george', 'kowalski', 'george'], ['guido-lou', 'guido', 'lou']];
const STILLS = [0.12, 0.22, 0.3, 0.36, 0.46, 0.58];
const out = process.argv[2], framesDir = process.argv[3];
const STANDOFF = 84;   // Wrestler.js FRONT_KICK_STANDOFF, boot to belly in the clip's own units (scaled by s)

const SETUP = ({ facing, standoff }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing;
    d.x = 640; a.x = d.x - facing * standoff * a.s;   // already at the standoff: the stance tween then moves nothing
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
    d.draw();
    const dp = d.skeleton.jointAttachmentPoints;
    const hip = { x: (dp.nearHip.x + dp.farHip.x) / 2, y: (dp.nearHip.y + dp.farHip.y) / 2 };
    window.__kickTarget = { x: (dp.neck.x + hip.x) / 2, y: (dp.neck.y + hip.y) / 2 };
    a._doFrontKick(d);
    return { clip: a._activeMove?.clip?.id ?? null, dur: a._activeMove?.clip?.duration ?? null, s: a.s };
};

const READ = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, hnd = a._activeMove;
    const sk = a.skeleton, p = sk.jointAttachmentPoints, dp = d.skeleton.jointAttachmentPoints, facing = a.facing;
    const hand = facing >= 0 ? 1 : -1;
    const dot = (u, v) => u.x * v.x + u.y * v.y, sub = (u, v) => ({ x: u.x - v.x, y: u.y - v.y });
    const hip = { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 };
    const flex = {};
    for (const sd of ['near', 'far']) {
        const u = sub(p[`${sd}Knee`], p[`${sd}Hip`]), l = sub(p[`${sd}Ankle`], p[`${sd}Knee`]);
        const q = hand > 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x };
        let v = -Math.atan2(dot(l, q), dot(l, u)); if (v < -2.6) v += 2 * Math.PI; flex[sd] = +v.toFixed(3);
    }
    const sole = (sd) => { const q = sk.soleWorld(sd); return q ? { x: q.x, y: q.y } : null; };
    const belly = { x: (dp.neck.x + (dp.nearHip.x + dp.farHip.x) / 2) / 2, y: (dp.neck.y + (dp.nearHip.y + dp.farHip.y) / 2) / 2 };
    const ank = (sd) => ({ gap: +((belly.x - p[`${sd}Ankle`].x) * facing).toFixed(1), h: +(a.y - p[`${sd}Ankle`].y).toFixed(1) });
    const pl = hnd?.plantLog?.at(-1); const plant = pl ? { w: +pl.w.toFixed(2), err: +pl.err.toFixed(2), leg: +pl.leg.toFixed(2), shin: +pl.shin.toFixed(2), thigh: +pl.thigh.toFixed(2), sole: [Math.round(pl.sole.x), Math.round(pl.sole.y)], want: [Math.round(pl.want.x), Math.round(pl.want.y)] } : null;
    const bellyH = +(a.y - belly.y).toFixed(1);
    const contact = sole(sk.lChannelSide(a.facing)), target = window.__kickTarget;
    return { contact: { x: contact.x, y: contact.y, dx: (target.x-contact.x)*facing, dy: contact.y-target.y }, defender: { bend: d.pose.bend ?? 0, neck: dp.neck, state: d.state, stamina: d.stamina }, plant, bellyH, t: hnd ? +hnd.time.toFixed(4) : null, x: a.x, flex, sole: { near: sole('near'), far: sole('far') }, ankle: { near: ank('near'), far: ank('far') }, hipY: +(a.y - hip.y).toFixed(1),
        pose: { lLeg: a.pose.lLeg, lKnee: a.pose.lKnee, lShin: a.pose.lShin ?? null, rLeg: a.pose.rLeg, rKnee: a.pose.rKnee, rShin: a.pose.rShin ?? null, crouch: a.pose.crouch } };
};

const CROP = () => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width; const x = (sc.w1.x + sc.w2.x) / 2, y = (sc.w1.y + sc.w2.y) / 2; return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k }; };
const round = (v, n = 2) => +v.toFixed(n);
const stat = (arr) => (arr.length ? { min: round(Math.min(...arr)), max: round(Math.max(...arr)), mean: round(arr.reduce((s, v) => s + v, 0) / arr.length) } : null);
const results = {};
for (const [pair, att, def] of PAIRS.filter(q => !process.env.ONLY || process.env.ONLY.split(',').includes(q[0]))) {
    process.env.WFM_P1 = RIG[att]; process.env.WFM_P2 = RIG[def]; process.env.WFM_QS = process.env.LIGHT ? 'notitle=1&light=v1' : 'notitle=1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`;
            const setup = await h.page.evaluate(SETUP, { facing, standoff: process.env.LIGHT ? FRONT_KICK_V2_STANDOFF : STANDOFF });
            const rows = []; let clip = null, n = 0; const stills = new Set();
            if (framesDir) mkdirSync(`${framesDir}/${id}`, { recursive: true });
            for (let i = 0; i < 90; i++) {
                await h.page.evaluate(STEP, { press: {}, hold: {} });
                const r = await h.page.evaluate(READ).catch(() => null);
                if (!r || r.t === null) { if (rows.length) break; continue; }
                rows.push(r);
                if (framesDir) {
                    if (!clip) { const c = await h.page.evaluate(CROP); clip = { x: Math.max(0, c.x - 270), y: Math.max(0, c.y - 285), width: 540, height: 350 }; }
                    if (i % 2 === 0) await h.page.screenshot({ path: `${framesDir}/${id}/s${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
                    const st = STILLS.find(t => r.t >= t && !stills.has(t));
                    if (st !== undefined) { stills.add(st); await h.page.screenshot({ path: `${framesDir}/${id}/still-${st}.png`, clip: { x: clip.x + 90, y: clip.y + 10, width: 360, height: 330 } }); }
                }
            }
            const L = JOINT_LIMITS.knee, sat = (v) => v <= L.min + 0.005 || v >= L.max - 0.005;
            const slide = (sd) => rows.slice(1).map((r, i) => Math.hypot(r.sole[sd].x - rows[i].sole[sd].x, r.sole[sd].y - rows[i].sole[sd].y));
            const run = (pred) => { let best = 0, cur = 0; for (const r of rows) { cur = pred(r) ? cur + 1 : 0; best = Math.max(best, cur); } return best; };
            const imp = rows.find(r => r.t >= 0.3) ?? rows.at(-1);
            const kneeAll = rows.flatMap(r => [r.flex.near, r.flex.far]);
            results[id] = {
                clip: setup.clip, duration: setup.dur, frames: rows.length,
                kneeDrawn: { near: stat(rows.map(r => r.flex.near)), far: stat(rows.map(r => r.flex.far)) },
                backwardFoldFrames: rows.filter(r => r.flex.near < -0.1 || r.flex.far < -0.1).length,   // drawn flex below the knee's own -0.10 clamp
                backwardWorst: round(Math.min(...kneeAll), 3),
                satFrames: { near: rows.filter(r => sat(r.flex.near)).length, far: rows.filter(r => sat(r.flex.far)).length, longestRun: Math.max(run(r => sat(r.flex.near)), run(r => sat(r.flex.far))) },
                poseKneeAtLimit: rows.filter(r => [r.pose.lKnee, r.pose.rKnee].some(v => Number.isFinite(v) && sat(v))).length,
                supportSlide: stat(slide('far')), supportSlideOver15: slide('far').filter(v => v > 1.5).length, supportSlideOverAt: slide('far').map((v, i) => [rows[i + 1].t, round(v)]).filter(([, v]) => v > 1.5), kickSlide: stat(slide('near')),
                supportSoleY: stat(rows.map(r => d0(r))), supportKnee: stat(rows.map(r => r.flex.far)),
                impact: { bellyHeight: imp.bellyH, t: imp.t, kickBootGap: imp.ankle.near.gap, kickBootHeight: imp.ankle.near.h, supportAnkleHeight: imp.ankle.far.h },
                soleContactAtImpact: imp.contact,
                defenderSell: rows.map(r => ({ t: r.t, ...r.defender })),
                hipDrop: stat(rows.map(r => r.hipY)),
                attackerShift: round(Math.max(...rows.map(r => r.x)) - Math.min(...rows.map(r => r.x))),
                plantTrace: rows.filter((r, i) => i % 4 === 0).map(r => [r.t, r.plant]),
                trace: rows.filter((r, i) => i % 4 === 0).map(r => [r.t, r.flex.near, r.flex.far, r.ankle.near.gap, r.ankle.near.h, r.pose.lLeg, r.pose.lKnee, r.pose.lShin, r.pose.rKnee]),
            };
            function d0(r) { return r.sole.far.y; }
            const R = results[id];
            console.log(id, R.clip, `| knee drawn near ${R.kneeDrawn.near.min}..${R.kneeDrawn.near.max} far ${R.kneeDrawn.far.min}..${R.kneeDrawn.far.max} | backward frames ${R.backwardFoldFrames} (worst ${R.backwardWorst}) | sat ${R.satFrames.near}/${R.satFrames.far} run ${R.satFrames.longestRun} | support slide max ${R.supportSlide.max} over1.5 ${R.supportSlideOver15} | impact boot gap ${R.impact.kickBootGap} h ${R.impact.kickBootHeight}`);
        }
    } finally { await h.close(); }
}
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
