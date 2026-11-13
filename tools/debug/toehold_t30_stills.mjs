// PLAN_LIGHT_MOVES T3.0: hand-posed stills of Derek's step-over toehold, Lou on George (or the reverse), both facings. Each still is a one-pose clip played through the real
// move runtime (so layers, shins and joint solves are the game's own), held, then photographed. Poses live in toehold_t30_poses.mjs; SEARCH=1 hill-climbs them, REPLAY=1 reloads each
// report's saved `authored` pose (no search, no random) so the committed numbers reproduce.
//   node tools/debug/toehold_t30_stills.mjs <outDir>     env: ONLY=<pair prefix>, FACE=1|-1, ONLYSTILL=<id>, SEARCH=1 [ITERS=n SEED=n], REPLAY=1 [REPLAY_DIR=<dir> SEARCH_IDS=3-kneel,... to re-search only those, from their saved pose], REFIST=1 re-solves the fist poses
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { PAIRS, CROP_W, CROP_H, sellFrames, fistSummary, SETUP, CROP, GRIPPX, STEPF, READ, MASKS, METRICS, FISTS } from './toehold_t30_lib.mjs';

const outDir = process.argv[2];
const SEED = +(process.env.SEED ?? 1);
let rs = SEED >>> 0;
const rng = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32: the search is repeatable

// fold = heel fold (0 straight) for lShin/rShin through shinsFromFolds (page side). `flip` = the attacker's facing is reversed from the grab (after the step-over).
// gap = hips-to-hips px (attacker behind the man's hip along the man's length); the man lies tilt -PI/2 on the mat.
export const POSES = JSON.parse(process.env.POSES_JSON ?? 'null') ?? {};

// `frames` = sell keyframes [{ at, ch }] for a prone man (the arm channels over time); static poses pass none.
const PLAY = ({ id, pose, facing, gap, flip, distance, frames }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, duration = frames ? frames[frames.length - 1].at : 1.2;
    return import('/src/rig/articulation.js').then(({ shinsFromFolds }) => {
        const keys = role => (frames && role === 'defender' ? frames : [{ at: 0, ch: {} }, { at: duration, ch: {} }]).map(({ at, ch }) => ({ at, ease: 'linear', pose: shinsFromFolds({ ...(({ fists, ...rest }) => rest)(pose[role === 'attacker' ? 'att' : 'def']), ...(role === 'defender' ? ch : {}) }),
            transform: { x: role === 'defender' ? distance : distance - gap, y: role === 'attacker' ? (pose.attY ?? 0) : 0 },
            parts: role === 'defender' ? { lShin: pose.twist ? 'ankleTwist' : 'base', nearForearm: pose.prone ? 'grip' : 'base', farForearm: pose.prone ? 'grip' : 'base' } : {} }));
        // The trapped leg is the man's l channel. `side` is relative to the gripping arm's own side, so resolve it after the facing flip: the l arm sits on the near side only
        // while the attacker's lChannelSide matches the man's.
        const fa = flip ? -a.facing : a.facing, as = a.skeleton.lChannelSide(fa), ds = d.skeleton.lChannelSide(pose.prone ? a.facing : -a.facing);
        const sideFor = armSide => (armSide === ds ? 'same' : 'other');
        const lHeel = pose.swap ? 'toe' : 'heel', rHeel = pose.swap ? 'heel' : 'toe';
        sc.moveRuntime.register({ id, duration, events: [], tracks: { attacker: { keyframes: keys('attacker') }, defender: { keyframes: keys('defender') } }, grips: pose.grip === false ? [] : [
            { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Ankle', side: sideFor(as), anchor: lHeel }, in: [0, .05], out: [duration - .01, duration], natural: true, palm: 'clutch' },
            { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Ankle', side: sideFor(as === 'near' ? 'far' : 'near'), anchor: rHeel }, in: [0, .05], out: [duration - .01, duration], natural: true, palm: 'clutch' }],
            plants: [], layers: [{ from: 0, to: duration, order: pose.order }] });
        a.state = d.state = 'holding';
        const h = sc.moveRuntime.play(id, { attacker: a, defender: d }, { onEvent() {}, onComplete() {}, onCancel() {} });
        a._activeMove = d._activeMove = h; a._fixedHold = d._fixedHold = true;
        d.facing = pose.prone ? a.facing : -a.facing;
        d.lying = pose.prone ? 'prone' : 'supine';
        if (flip) a.facing = -a.facing;
        return true;
    });
};

// Search: per still, the channels the hill climb may move and the cost it minimises (px; 0 = every bar met). pen = distance outside [lo, hi].
const pen = (v, lo, hi) => (v < lo ? lo - v : v > hi ? v - hi : 0);
const common = (g, m, r, t) => Math.max(0, Math.max(g.heel, g.toe) - 3) * 2 + pen(m.footMinusHip, 0, 14) * 1.2 + m.bootCoveredPx * .08 + Math.abs(t.def.lift + 110) * .1 + (r.att.pinned.length + r.def.pinned.length) * 40;
const PARAMS = [['gap', 0, 150], ['attY', 0, 40], ['def.lift', -110, -60], ['att.crouch', .3, 2.2], ['att.bend', 0, 1.5], ['att.lFold', 0, 2.45], ['att.rFold', 0, 2.45], ['att.lLeg', -.8, 1.4], ['att.rLeg', -.8, 1.4], ['def.lLeg', -1.4, .6], ['def.lFold', 1.2, 2.45]];
const EARLY = (g, m, r, t) => Math.max(0, Math.max(g.heel, g.toe) - 3) * 2 + Math.abs(t.def.lift + 110) * .1 + (r.att.pinned.length + r.def.pinned.length) * 40;
const EARLY_PARAMS = [['gap', 0, 150], ['def.lift', -110, -60], ['att.crouch', .3, 2.2]];   // stills 1 and 2: reach only, as before
const KNEEL = (g, m, r, t) => common(g, m, r, t) + m.kneeToMat.reduce((s, v) => s + pen(v, -6, 6) * 2, 0) + m.kneeAboveAnkle.reduce((s, v) => s + pen(v, 0, 1e9) * 2, 0);
const SEARCH_SPEC = {
    '1-grab': { params: EARLY_PARAMS, cost: EARLY }, '2-step-over': { params: EARLY_PARAMS, cost: EARLY },
    '3-kneel': { params: PARAMS, cost: KNEEL }, '4a-heels': { params: PARAMS, cost: KNEEL },
    '4b-mat': { params: PARAMS, cost: (g, m, r, t) => common(g, m, r, t) + pen(m.seatToMat, -10, 10) * 2 + m.ankleToMat.reduce((s, v) => s + pen(v, -8, 8) * 2, 0) + pen(r.att.knees.near, 0, 1) * 10 + pen(r.att.knees.far, 0, 1) * 10 },
};

const { STILLS } = await import(process.env.STILLS_MODULE ?? './toehold_t30_poses.mjs');

// Per case, the arm channel values that put each fist on the mat (down) and clearly off it (up). One eval measures both arms (they are independent), so sweep one shared value.
// Target: contact point 2 px below the torso's mat line (contact is 0..4); up = about 35 px above it.
const solveFists = async (h, st, facing) => {
    const grid = [];
    for (const elbow of [.2, .5, .9, 1.3]) for (let arm = 1.6; arm <= 4.01; arm += .1) grid.push({ arm: +arm.toFixed(2), elbow });
    const rows = [];
    for (const g of grid) {
        const t = JSON.parse(JSON.stringify(st)); Object.assign(t.def, { lArm: g.arm, rArm: g.arm, lElbow: g.elbow, rElbow: g.elbow });
        await h.page.evaluate(SETUP, { facing, sep: 120 });
        await h.page.evaluate(PLAY, { id: 'toeholdFistSolve', pose: t, facing, gap: t.gap, flip: !!t.flip, distance: 120 });
        for (let i = 0; i < 3; i++) await h.page.evaluate(STEPF);
        rows.push({ ...g, f: await h.page.evaluate(FISTS) });
    }
    const out = {};
    for (const sd of ['near', 'far']) {
        const ch = rows[0].f.lSide === sd ? 'l' : 'r', ok = rows.filter(r => r.f[sd] !== null);
        const pick = target => ok.reduce((b, r) => (Math.abs(r.f[sd] - target) < Math.abs(b.f[sd] - target) ? r : b));
        const down = pick(2), up = pick(-35);
        out[ch] = { down: { arm: down.arm, elbow: down.elbow, rel: down.f[sd] }, up: { arm: up.arm, elbow: up.elbow, rel: up.f[sd] } };
    }
    return out;
};
const searched = new Map(), SEARCH_IDS = new Set((process.env.SEARCH_IDS ?? '').split(',').filter(Boolean));
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
            const caseDir = `${outDir}/${pair}-${side}`;
            mkdirSync(caseDir, { recursive: true });
            const saved = process.env.REPLAY ? JSON.parse(readFileSync(`${process.env.REPLAY_DIR ?? outDir}/${pair}-${side}/report.json`)) : null;
            const report = {};
            for (let st of STILLS) {
                if (process.env.ONLYSTILL && st.id !== process.env.ONLYSTILL) continue;
                if (saved && !saved[st.id]) continue;   // a revised preview may omit a superseded ending
                if (saved) st = saved[st.id].authored;   // REPLAY: the saved pose, which SEARCH_IDS may then refine
                const searchIt = process.env.SEARCH && (!saved || SEARCH_IDS.has(st.id));
                if (searchIt && searched.has(pair + st.id)) st = searched.get(pair + st.id);
                else if (searchIt && SEARCH_SPEC[st.id]) {   // hill climb on the pose channels (SEARCH_SPEC) against the grip, foot-at-hip, cover, mat and cap measures
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
                            if (rng() > .45) continue;
                            const keys = path.split('.'), last = keys.pop(); let o = t; for (const k of keys) o = o[k];
                            o[last] = Math.max(lo, Math.min(hi, (o[last] ?? 0) + (rng() - .5) * 2 * sigma * (hi - lo) * .25));
                        }
                        const e = await evalPose(t);
                        if (e.cost < best.cost) best = { t, ...e };
                    }
                    console.log('best', st.id, Math.round(best.cost * 10) / 10, JSON.stringify(best.g), JSON.stringify(best.m));
                    st = best.t;
                    searched.set(pair + st.id, st);
                }
                if (st.prone && (!st.def.fists || process.env.REFIST)) { st = JSON.parse(JSON.stringify(st)); st.def.fists = await solveFists(h, st, facing); console.log(st.id, 'fists', JSON.stringify(st.def.fists)); }
                const frames = st.prone ? sellFrames(st.def.fists, 0, 2) : null;
                await h.page.evaluate(SETUP, { facing, sep: 120 });
                await h.page.evaluate(PLAY, { id: 'toeholdStill_' + st.id, pose: st, facing, gap: st.gap, flip: !!st.flip, distance: 120, frames });
                for (let i = 0; i < 8; i++) await h.page.evaluate(STEPF);
                const c = await h.page.evaluate(CROP);
                await h.page.screenshot({ path: `${caseDir}/${st.id}.png`, clip: { x: Math.max(0, c.x - CROP_W / 2), y: Math.max(0, c.y - 210), width: CROP_W, height: CROP_H } });
                const metrics = await h.page.evaluate(METRICS), gripPx = await h.page.evaluate(GRIPPX), read = await h.page.evaluate(READ), fists = []; let gripMax = gripPx;
                if (st.prone) {   // the whole 2 s sell, a frame at a time (the screenshot above is at frame 8)
                    for (let frame = 8; frame < 115; frame++) {
                        if (frame % 8 === 0) { const g = await h.page.evaluate(GRIPPX); gripMax = { heel: Math.max(gripMax.heel, g.heel), toe: Math.max(gripMax.toe, g.toe) }; }
                        fists.push({ t: +(frame / 60).toFixed(3), ...(await h.page.evaluate(FISTS)) }); await h.page.evaluate(STEPF); }
                }
                report[st.id] = { authored: st, metrics, fists, ...(fists.length ? { fistSummary: fistSummary(fists) } : {}), ...read, gripPx, ...(fists.length ? { gripPxMax: gripMax } : {}) }; console.log(st.id, JSON.stringify(report[st.id].gripPx), JSON.stringify(report[st.id].fistSummary ?? ''));
            }
            writeFileSync(`${caseDir}/report.json`, JSON.stringify(report, null, 1));
            console.log(pair, side, 'done');
        }
    } finally { await h.close(); }
}
