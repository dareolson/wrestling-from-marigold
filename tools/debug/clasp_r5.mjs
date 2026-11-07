// PLAN_GRAPPLES T2.2 r5 proof: the tie-up in the real game, both pairs, both facings, clasp art on (code as built) beside base art (setClasps
// off, same grips and IK otherwise). Per frame: a wide and a close-up still; for each closing grip the reach against the arm's length (is the
// palm-corrected target inside CLASP_REACH of shoulder + forearm?); at each clasp swap, the forearm quad with base vs clasp art at the same pose.
//   WFM_URL=http://localhost:5174 node tools/debug/clasp_r5.mjs <outDir>     (stills in <outDir>/<case>/{wide,close}-{base,clasp}/, results in <outDir>/r5.json)
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';

const PAIRS = [['lou-george', 'thesz-procreate-v1', 'george-roster-v1'], ['george-lou', 'george-roster-v1', 'thesz-procreate-v1']];
const FRAMES = 101;
const out = process.argv[2];

// In the page: where the pair is on screen, and the reach of every clasped grip.
const SCR = () => {
    const sc = window.__WFM_GAME.scene.scenes[0], cam = sc.cameras.main, box = document.querySelector('canvas').getBoundingClientRect(), g = window.__WFM_GAME.scale.gameSize, k = box.width / g.width;
    const to = (x, y) => ({ x: box.x + (x - cam.worldView.x) * cam.zoom * k, y: box.y + (y - cam.worldView.y) * cam.zoom * k });
    const n1 = sc.w1.skeleton.jointAttachmentPoints.neck, n2 = sc.w2.skeleton.jointAttachmentPoints.neck;
    return { mid: to((n1.x + n2.x) / 2, (n1.y + n2.y) / 2 + 20), pair: to((sc.w1.x + sc.w2.x) / 2, (sc.w1.y + sc.w2.y) / 2) };
};
const READ = async () => {
    const sc = window.__WFM_GAME.scene.scenes[0], ls = sc.lockupState;
    const { lockupGrips, gripTarget } = await import('/src/animation/lockup.js');
    const { claspArt, CLASP_REACH } = await import('/src/animation/clasps.js');
    const g = ls?.grapple, res = { grips: {}, state: {} };
    for (const [id, w] of [['a', sc.w1], ['d', sc.w2]]) res.state[id] = { ...(w.skeleton._partVariantState ?? {}) };
    if (!g?.grips || !g.grabber) return res;
    const lists = lockupGrips(g.grabber, g.grabbed, g.grips);
    const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    for (const [role, actor, id] of [['attacker', g.grabber, g.grabber === sc.w1 ? 'a' : 'd'], ['defender', g.grabbed, g.grabbed === sc.w1 ? 'a' : 'd']]) {
        const sk = actor.skeleton, pts = sk.jointAttachmentPoints, lSide = sk.lChannelSide(actor.facing);
        for (const it of lists[role]) {
            const side = it.arm === 'l' ? lSide : (lSide === 'near' ? 'far' : 'near');
            const S = pts[`${side}Shoulder`], E = pts[`${side}Elbow`], W = pts[`${side}Wrist`], T = gripTarget(it, side);
            if (!S || !E || !W || !T) continue;
            const img = sk[`${side}Forearm`], P = sk.constructor.imageAnchorPoint(img, img?._semanticAnchors?.clutch);
            const on = sk._partVariantState?.[`${side}Forearm`] === claspArt(it.clasp);
            const goal = on && P ? { x: W.x + (T.x - P.x), y: W.y + (T.y - P.y) } : T;   // the wrist goal holdGrips solves for
            const len = dist(S, E) + dist(E, W);
            res.grips[`${id}.${it.clasp}.${side}`] = { w: +it.w.toFixed(3), on, len: +len.toFixed(2), reach: +dist(S, goal).toFixed(2), cap: +(len * CLASP_REACH).toFixed(2), palm: on && P ? +dist(P, T).toFixed(2) : null,
                // the palm itself: it sits lp from the elbow whatever the forearm does, so its reach is lu + lp (the wrist goal above is only where the solver aims)
                palmLen: P ? +(dist(S, E) + dist(E, P)).toFixed(2) : null, palmReach: P ? +dist(S, T).toFixed(2) : null };
        }
    }
    return res;
};
// At the frame a swap just happened: the forearm quad of that slot with the clasp art on (as drawn) and with base art, same pose, no redraw.
const FROZEN = ({ man, slot }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], w = man === 'a' ? sc.w1 : sc.w2, sk = w.skeleton, img = sk[slot];
    const quad = () => { const m = img.getWorldTransformMatrix(), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh; return [[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([x, y]) => [m.a * x + m.c * y + m.tx, m.b * x + m.d * y + m.ty]); };
    const st = { ...(sk._partVariantState ?? {}) }, clasp = quad(), name = st[slot];
    const baseState = { ...st }; delete baseState[slot];
    sk.setPartVariants(baseState);
    const base = quad();
    sk.setPartVariants(st);   // put it back
    const d = clasp.map((c, i) => Math.hypot(c[0] - base[i][0], c[1] - base[i][1]));
    const cen = (q) => q.reduce((s, c) => [s[0] + c[0] / 4, s[1] + c[1] / 4], [0, 0]);
    return { art: name, cornerMaxPx: +Math.max(...d).toFixed(2), centroidPx: +Math.hypot(...cen(clasp).map((v, i) => v - cen(base)[i])).toFixed(2) };
};

async function pass(h, { facing, dir, which, rec }) {
    await h.page.evaluate(SETUP, { facing, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
    mkdirSync(`${dir}/wide-${which}`, { recursive: true }); mkdirSync(`${dir}/close-${which}`, { recursive: true });
    let wide = null, prev = null;
    for (let i = 0; i < FRAMES; i++) {
        await h.page.evaluate(STEP, { press: {}, hold: {} });
        const c = await h.page.evaluate(SCR);
        wide ??= { x: Math.max(0, c.pair.x - 270), y: Math.max(0, c.pair.y - 250), width: 540, height: 330 };
        const fn = `s${String(i).padStart(4, '0')}.jpg`;
        await h.page.screenshot({ path: `${dir}/wide-${which}/${fn}`, type: 'jpeg', quality: 80, clip: wide });
        await h.page.screenshot({ path: `${dir}/close-${which}/${fn}`, type: 'jpeg', quality: 85, clip: { x: Math.max(0, c.mid.x - 130), y: Math.max(0, c.mid.y - 100), width: 260, height: 170 } });
        if (which !== 'clasp') continue;
        const r = await h.page.evaluate(READ);
        for (const [k, v] of Object.entries(r.grips)) if (v.on && v.w >= 0.95) ((rec.reach[k] ??= []).push({ f: i, ...v }));
        for (const man of ['a', 'd']) for (const slot of ['nearForearm', 'farForearm']) {
            const was = prev?.state[man][slot] ?? 'base', now = r.state[man][slot] ?? 'base';
            if (prev && was !== now && now !== 'base') rec.frozen.push({ man, slot, frame: i, ...(await h.page.evaluate(FROZEN, { man, slot })) });
        }
        prev = r;
    }
}

const results = {};
for (const [pair, att, def] of PAIRS) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`, dir = `${out}/${id}`, rec = { reach: {}, frozen: [] };
            await pass(h, { facing, dir, which: 'clasp', rec });
            results[id] = rec;
            console.log(id, 'clasp');
        }
        // base: the same game with the art swap switched off (grips, IK and reach as built), so the only difference is the forearm art
        await h.page.evaluate(() => { const P = window.__WFM_GAME.scene.scenes[0].w1.constructor.prototype; P.setClasps = () => {}; });
        for (const facing of [1, -1]) {
            const id = `${pair}-${facing > 0 ? 'right' : 'left'}`;
            await pass(h, { facing, dir: `${out}/${id}`, which: 'base', rec: results[id] });
            console.log(id, 'base');
        }
    } finally { await h.close(); }
}
// summary per hand
for (const rec of Object.values(results)) {
    rec.hands = {};
    for (const [k, rows] of Object.entries(rec.reach)) {
        const short = rows.map(r => r.reach - r.cap), mean = (a) => +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(2);
        rec.hands[k] = { frames: rows.length, reachable94: short.every(v => v <= 0.05), shortfallMeanPx: mean(short.map(v => Math.max(0, v))), shortfallMaxPx: +Math.max(0, ...short).toFixed(2), palmReachShortfallMaxPx: +Math.max(0, ...rows.map(r => r.palmReach - r.palmLen * 0.94)).toFixed(2), palmReachOverFullMaxPx: +Math.max(...rows.map(r => r.palmReach - r.palmLen)).toFixed(2), reachOverLenMaxPx: +Math.max(...rows.map(r => r.reach - r.len)).toFixed(2), palmMeanPx: mean(rows.map(r => r.palm)), palmMaxPx: +Math.max(...rows.map(r => r.palm)).toFixed(2) };
    }
    delete rec.reach;
}
writeFileSync(`${out}/r5.json`, JSON.stringify(results, null, 2));
