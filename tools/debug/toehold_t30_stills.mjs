// PLAN_LIGHT_MOVES T3.0: hand-posed stills of Derek's step-over toehold, Lou on George (or the reverse), both facings. Each still is a one-pose clip played through the real
// move runtime (so layers, shins and joint solves are the game's own), held, then photographed. Poses live in POSES below; edit and rerun.
//   node tools/debug/toehold_t30_stills.mjs <outDir>     env: ONLY=<pair prefix>, FACE=1|-1, ONLYSTILL=<id>
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const outDir = process.argv[2];

// fold = heel fold (0 straight) for lShin/rShin through shinsFromFolds (page side). `flip` = the attacker's facing is reversed from the grab (after the step-over).
// gap = hips-to-hips px (attacker behind the man's hip along the man's length); the man lies tilt -PI/2 on the mat.
export const POSES = JSON.parse(process.env.POSES_JSON ?? 'null') ?? {};

const PLAY = ({ id, pose, facing, gap, flip, distance }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    return import('/src/rig/articulation.js').then(({ shinsFromFolds }) => {
        const keys = role => [0, .22, .30, .52, .60, .82, .90, 1.2].map(at => ({ at, ease: 'linear', pose: shinsFromFolds({ ...pose[role === 'attacker' ? 'att' : 'def'],
            ...(role === 'defender' && pose.prone ? {
                // Slow fist lift, quick downward strike; alternate the two arms.
                lArm: at === .22 || at === .82 ? 3.0 : 2.5,
                lElbow: at === .22 || at === .82 ? .9 : .2,
                rArm: at === .52 ? 3.0 : 2.5,
                rElbow: at === .52 ? .9 : .2,
            } : {}) }),
            transform: { x: role === 'defender' ? distance : distance - gap, y: role === 'attacker' ? (pose.attY ?? 0) : 0 },
            parts: role === 'defender' ? { lShin: pose.twist ? 'ankleTwist' : 'base', nearForearm: pose.prone ? 'grip' : 'base', farForearm: pose.prone ? 'grip' : 'base' } : {} }));
        // The trapped leg is the man's l channel. `side` is relative to the gripping arm's own side, so resolve it after the facing flip: the l arm sits on the near side only
        // while the attacker's lChannelSide matches the man's.
        const fa = flip ? -a.facing : a.facing, as = a.skeleton.lChannelSide(fa), ds = d.skeleton.lChannelSide(pose.prone ? a.facing : -a.facing);
        const sideFor = armSide => (armSide === ds ? 'same' : 'other');
        const lHeel = pose.swap ? 'toe' : 'heel', rHeel = pose.swap ? 'heel' : 'toe';
        sc.moveRuntime.register({ id, duration: 1.2, events: [], tracks: { attacker: { keyframes: keys('attacker') }, defender: { keyframes: keys('defender') } }, grips: pose.grip === false ? [] : [
            { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Ankle', side: sideFor(as), anchor: lHeel }, in: [0, .05], out: [1.19, 1.2], natural: true, palm: 'clutch' },
            { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Ankle', side: sideFor(as === 'near' ? 'far' : 'near'), anchor: rHeel }, in: [0, .05], out: [1.19, 1.2], natural: true, palm: 'clutch' }],
            plants: [], layers: [{ from: 0, to: 1.2, order: pose.order }] });
        a.state = d.state = 'holding';
        const h = sc.moveRuntime.play(id, { attacker: a, defender: d }, { onEvent() {}, onComplete() {}, onCancel() {} });
        a._activeMove = d._activeMove = h; a._fixedHold = d._fixedHold = true;
        d.facing = pose.prone ? a.facing : -a.facing;
        d.lying = pose.prone ? 'prone' : 'supine';
        if (flip) a.facing = -a.facing;
        return true;
    });
};
const SETUP = ({ facing, sep }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w.scene.tweens.killTweensOf(w.pose);
        w._activeMove = null; w._choreoUntil = 0; w._sell = null; w._hold = null; w._gripLatch = null; w._groundHandoff = null; w._pain = null;
        w.state = 'standing'; w.stamina = 100; w.vx = 0; w.vy = 0; w.lying = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
        w.skeleton.setPartVariants?.({});
    }
    a.y = d.y = 400; a.facing = facing; d.facing = -facing; a.x = 520; d.x = 520 + facing * sep * a.s;
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    d.state = 'down'; d.lying = 'supine'; d.stateTimer = 99;
    window.__keys = { a: new Set(), d: new Set(), ad: new Set(), dd: new Set() };
    return true;
};
const CROP = () => { const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width; const x = (sc.w1.x + sc.w2.x) / 2, y = (sc.w1.y + sc.w2.y) / 2; return { x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k }; };
const GRIPPX = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, ds = d.skeleton.lChannelSide(d.facing), as = a.skeleton.lChannelSide(a.facing), ao = as === 'near' ? 'far' : 'near', dof = ds === 'near' ? 'far' : 'near';
    const P = d.skeleton.jointAttachmentPoints, past = k => ({ x: P[ds + 'Ankle'].x + (P[ds + 'Ankle'].x - P[ds + 'Knee'].x) * k, y: P[ds + 'Ankle'].y + (P[ds + 'Ankle'].y - P[ds + 'Knee'].y) * k });
    const palm = s => a.skeleton.partAnchorPoint(s + 'Forearm', 'clutch') ?? a.skeleton.jointAttachmentPoints[s + 'Wrist'], tgt = (s, n) => d.skeleton.partAnchorPoint(s + 'Shin', n) ?? past(n === 'heel' ? .15 : .4);
    const dist = (p, q) => p && q ? +Math.hypot(p.x - q.x, p.y - q.y).toFixed(1) : null;
    return { heel: dist(palm(as), tgt(ds, 'heel')), toe: dist(palm(ao), tgt(ds, 'toe')) };
};
const STEPF = async () => { const game = window.__WFM_GAME; window.__T += 1000 / 60; game.step(window.__T, 1000 / 60); };
const READ = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], out = {};
    for (const [role, w] of [['att', sc.w1], ['def', sc.w2]]) {
        const P = w.skeleton.jointAttachmentPoints;
        const knees = {}, pinned = [];
        for (const sd of ['near', 'far']) {
            const H = P[sd + 'Hip'], K = P[sd + 'Knee'], A = P[sd + 'Ankle'];
            let flex = -Math.atan2(((K.y - H.y) * (A.x - K.x) - (K.x - H.x) * (A.y - K.y)) * w.facing, (K.x - H.x) * (A.x - K.x) + (K.y - H.y) * (A.y - K.y));
            if (flex < -2.6) flex += 2 * Math.PI;
            knees[sd] = +flex.toFixed(2); if (flex <= -.095 || flex >= 2.545) pinned.push(sd + 'Knee');
        }
        for (const ch of ['lElbow', 'rElbow']) if (w.pose[ch] <= -2.995 || w.pose[ch] >= 2.745) pinned.push(ch);
        out[role] = { knees, pinned, lSide: w.skeleton.lChannelSide(w.facing), x: w.x, facing: w.facing, pose: Object.fromEntries(Object.entries(w.pose).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, +v.toFixed(3)])),
            pts: Object.fromEntries(['nearHip', 'farHip', 'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle', 'nearWrist', 'farWrist'].map(k => [k, P[k] ? { x: +P[k].x.toFixed(1), y: +P[k].y.toFixed(1) } : null])) };
    }
    return out;
};

// T3.0 r3 measures: where the held foot is against the attacker's hip, how much of it his body covers, his knees/seat/ankles against the mat line, the fists against the mat.
const MASKS = () => {
    const cv = document.createElement('canvas');
    // alpha mask (1 = drawn) of the listed parts of one wrestler, in a window of world px
    window.__partsMask = (w, parts, ox, oy, cw, ch) => {
        cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, cw, ch);
        for (const img of parts) {
            if (!img || !img.visible || img.alpha <= 0 || !img.frame) continue;
            const m = img.getWorldTransformMatrix(), f = img.frame, fw = img.width, fh = img.height;
            ctx.setTransform(m.a, m.b, m.c, m.d, m.tx - ox, m.ty - oy); ctx.translate(-img.originX * fw, -img.originY * fh);
            if (img.flipX) { ctx.translate(fw, 0); ctx.scale(-1, 1); }
            if (img.flipY) { ctx.translate(0, fh); ctx.scale(1, -1); }
            ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, fw, fh);
        }
        const px = ctx.getImageData(0, 0, cw, ch).data, out = new Uint8Array(cw * ch);
        for (let k = 0; k < out.length; k++) out[k] = px[k * 4 + 3] > 128 ? 1 : 0;
        return out;
    };
};
const METRICS = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, ap = a.skeleton.jointAttachmentPoints, dp = d.skeleton.jointAttachmentPoints, ds = d.skeleton.lChannelSide(d.facing);
    const hipY = (ap.nearHip.y + ap.farHip.y) / 2, ankle = dp[ds + 'Ankle'], sk = a.skeleton, bootImg = d.skeleton[ds + 'Shin'];
    const ox = Math.floor(Math.min(a.x, d.x) - 300), oy = 200, cw = 800, ch = 330;
    // the attacker's body (not his arms) drawn above the held boot
    const covers = ['torso', 'head', 'trunks', 'pelvisMask', 'pelvisOverlay', 'pelvisUnderlay', 'nearThigh', 'nearShin', 'nearBoot', 'farThigh', 'farShin', 'farBoot'].map(n => sk[n]).filter(i => i && bootImg && i.depth > bootImg.depth);
    // the boot is baked into the shin art, so "the foot" is the trapped shin's pixels within 28 px of the ankle
    const B = window.__partsMask(d, [d.skeleton[ds + 'Shin'], bootImg], ox, oy, cw, ch).slice(), C = window.__partsMask(a, covers, ox, oy, cw, ch);
    let boot = 0, hidden = 0; for (let k = 0; k < B.length; k++) if (B[k] && Math.hypot(k % cw + ox - ankle.x, Math.floor(k / cw) + oy - ankle.y) <= 28) { boot++; if (C[k]) hidden++; }
    const mat = d.y;   // the man never moves in y; the attacker's own y drops with `attY`
    return { footMinusHip: +(ankle.y - hipY).toFixed(1), bootPx: boot, bootCoveredPx: hidden,
        kneeToMat: ['near', 'far'].map(sd => +(mat - ap[sd + 'Knee'].y).toFixed(1)), ankleToMat: ['near', 'far'].map(sd => +(mat - ap[sd + 'Ankle'].y).toFixed(1)),
        kneeAboveAnkle: ['near', 'far'].map(sd => +(ap[sd + 'Ankle'].y - ap[sd + 'Knee'].y).toFixed(1)),
        seatToMat: +(mat - hipY).toFixed(1), hipY, mat };
};
const FISTS = () => {   // lowest drawn pixel of each of the man's forearm+hand images, y minus the mat line (negative = above the mat)
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, sk = d.skeleton, ox = Math.floor(d.x - 300), oy = 200, cw = 800, ch = 330, out = {};
    for (const sd of ['near', 'far']) {
        const M = window.__partsMask(d, [sk[sd + 'Forearm'], sk[sd + 'Hand']], ox, oy, cw, ch);
        let low = -1; for (let y = ch - 1; y >= 0 && low < 0; y--) for (let x = 0; x < cw; x++) if (M[y * cw + x]) { low = y; break; }
        out[sd] = low < 0 ? null : +(low + oy - d.y).toFixed(1);
    }
    return out;
};

// Search: per still, the channels the hill climb may move and the cost it minimises (px; 0 = every bar met). pen = distance outside [lo, hi].
const pen = (v, lo, hi) => (v < lo ? lo - v : v > hi ? v - hi : 0);
const common = (g, m, r, t) => Math.max(0, Math.max(g.heel, g.toe) - 3) * 2 + pen(m.footMinusHip, 0, 14) * 1.2 + m.bootCoveredPx * .08 + Math.abs(t.def.lift + 110) * .1 + (r.att.pinned.length + r.def.pinned.length) * 40;
const PARAMS = [['gap', 0, 150], ['attY', 0, 40], ['def.lift', -110, -60], ['att.crouch', .3, 2.2], ['att.bend', 0, 1.5], ['att.lFold', 0, 2.45], ['att.rFold', 0, 2.45], ['att.lLeg', -.8, 1.4], ['att.rLeg', -.8, 1.4], ['def.lLeg', -1.4, .6], ['def.lFold', 1.2, 2.45]];
const EARLY = (g, m, r, t) => Math.max(0, Math.max(g.heel, g.toe) - 3) * 2 + Math.abs(t.def.lift + 110) * .1 + (r.att.pinned.length + r.def.pinned.length) * 40;
const EARLY_PARAMS = [['gap', 0, 150], ['def.lift', -110, -60], ['att.crouch', .3, 2.2]];   // stills 1 and 2: reach only, as before
const SEARCH_SPEC = {
    '1-grab': { params: EARLY_PARAMS, cost: EARLY }, '2-step-over': { params: EARLY_PARAMS, cost: EARLY },
    '3-kneel': { params: PARAMS, cost: common },
    '4a-heels': { params: PARAMS, cost: (g, m, r, t) => common(g, m, r, t) + m.kneeToMat.reduce((s, v) => s + pen(v, -6, 6) * 2, 0) + m.kneeAboveAnkle.reduce((s, v) => s + pen(v, 0, 1e9) * 2, 0) },
    '4b-mat': { params: PARAMS, cost: (g, m, r, t) => common(g, m, r, t) + pen(m.seatToMat, -10, 10) * 2 + m.ankleToMat.reduce((s, v) => s + pen(v, -8, 8) * 2, 0) + pen(r.att.knees.near, 0, 1) * 10 + pen(r.att.knees.far, 0, 1) * 10 },
};

const { STILLS } = await import(process.env.STILLS_MODULE ?? './toehold_t30_poses.mjs');
const searched = new Map();
for (const [pair, att, def] of PAIRS) {
    if (process.env.ONLY && !pair.startsWith(process.env.ONLY)) continue;
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&light=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL); await h.page.evaluate(MASKS);
        for (const facing of [1, -1]) {
            if (process.env.FACE && +process.env.FACE !== facing) continue;
            const side = facing > 0 ? 'right' : 'left';
            mkdirSync(`${outDir}/${pair}-${side}`, { recursive: true });
            const report = {};
            for (let st of STILLS) {
                if (process.env.ONLYSTILL && st.id !== process.env.ONLYSTILL) continue;
                if (searched.has(pair + st.id)) st = searched.get(pair + st.id);
                else if (process.env.SEARCH && SEARCH_SPEC[st.id]) {   // hill climb on the pose channels (SEARCH_SPEC) against the grip, foot-at-hip, cover, mat and cap measures
                    const spec = SEARCH_SPEC[st.id], evalPose = async (t) => {
                        await h.page.evaluate(SETUP, { facing, sep: 120 });
                        await h.page.evaluate(PLAY, { id: 'toeholdStill_' + st.id, pose: t, facing, gap: t.gap, flip: !!t.flip, distance: 120 });
                        for (let i = 0; i < 3; i++) await h.page.evaluate(STEPF);
                        const g = await h.page.evaluate(GRIPPX), m = await h.page.evaluate(METRICS), r = await h.page.evaluate(READ);
                        return { g, m, cost: spec.cost(g, m, r, t) };
                    };
                    let best = { t: st, ...(await evalPose(st)) }, sigma = 1;
                    for (let it = 0; it < (+process.env.ITERS || 450); it++) {
                        if (it % 90 === 89) sigma *= .6;
                        const t = JSON.parse(JSON.stringify(best.t));
                        for (const [path, lo, hi] of spec.params) {
                            if (Math.random() > .45) continue;
                            const keys = path.split('.'), last = keys.pop(); let o = t; for (const k of keys) o = o[k];
                            o[last] = Math.max(lo, Math.min(hi, (o[last] ?? 0) + (Math.random() - .5) * 2 * sigma * (hi - lo) * .25));
                        }
                        const e = await evalPose(t);
                        if (e.cost < best.cost) best = { t, ...e };
                    }
                    console.log('best', st.id, Math.round(best.cost * 10) / 10, JSON.stringify(best.g), JSON.stringify(best.m));
                    st = best.t;
                    searched.set(pair + st.id, st);
                }
                await h.page.evaluate(SETUP, { facing, sep: 120 });
                await h.page.evaluate(PLAY, { id: 'toeholdStill_' + st.id, pose: st, facing, gap: st.gap, flip: !!st.flip, distance: 120 });
                for (let i = 0; i < 8; i++) await h.page.evaluate(STEPF);
                const c = await h.page.evaluate(CROP);
                await h.page.screenshot({ path: `${outDir}/${pair}-${side}/${st.id}.png`, clip: { x: Math.max(0, c.x - 190), y: Math.max(0, c.y - 200), width: 380, height: 280 } });
                const metrics = await h.page.evaluate(METRICS), fists = [];
                if (st.prone) {
                    for (let frame = 0; frame < 60; frame++) {
                        fists.push({ t: +((8 + frame) / 60).toFixed(3), ...(await h.page.evaluate(FISTS)) });
                        if (frame % 3 === 0) await h.page.screenshot({ path: `${outDir}/${pair}-${side}/${st.id}-sell-${frame / 3}.png`, clip: { x: Math.max(0, c.x - 190), y: Math.max(0, c.y - 200), width: 380, height: 280 } });
                        await h.page.evaluate(STEPF);
                    }
                }
                report[st.id] = { authored: st, metrics, fists, ...(await h.page.evaluate(READ)), gripPx: await h.page.evaluate(GRIPPX) }; console.log(st.id, JSON.stringify(report[st.id].gripPx));
            }
            writeFileSync(`${outDir}/${pair}-${side}/report.json`, JSON.stringify(report, null, 1));
            console.log(pair, side, 'done');
        }
    } finally { await h.close(); }
}
