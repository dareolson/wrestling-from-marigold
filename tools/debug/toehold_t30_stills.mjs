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
        const keys = role => [0, 1.2].map(at => ({ at, ease: 'linear', pose: shinsFromFolds({ ...pose[role === 'attacker' ? 'att' : 'def'] }),
            transform: { x: role === 'defender' ? distance : distance - gap, y: role === 'attacker' ? (pose.attY ?? 0) : 0 },
            parts: role === 'defender' ? { lShin: pose.twist ? 'ankleTwist' : 'base' } : {} }));
        // The trapped leg is the man's l channel. `side` is relative to the gripping arm's own side, so resolve it after the facing flip: the l arm sits on the near side only
        // while the attacker's lChannelSide matches the man's.
        const fa = flip ? -a.facing : a.facing, as = a.skeleton.lChannelSide(fa), ds = d.skeleton.lChannelSide(-a.facing);
        const sideFor = armSide => (armSide === ds ? 'same' : 'other');
        const lHeel = pose.swap ? 'toe' : 'heel', rHeel = pose.swap ? 'heel' : 'toe';
        sc.moveRuntime.register({ id, duration: 1.2, events: [], tracks: { attacker: { keyframes: keys('attacker') }, defender: { keyframes: keys('defender') } }, grips: pose.grip === false ? [] : [
            { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Ankle', side: sideFor(as), anchor: lHeel }, in: [0, .05], out: [1.1, 1.2], natural: true, palm: 'clutch' },
            { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Ankle', side: sideFor(as === 'near' ? 'far' : 'near'), anchor: rHeel }, in: [0, .05], out: [1.1, 1.2], natural: true, palm: 'clutch' }],
            plants: [], layers: [{ from: 0, to: 1.2, order: pose.order }] });
        a.state = d.state = 'holding';
        const h = sc.moveRuntime.play(id, { attacker: a, defender: d }, { onEvent() {}, onComplete() {}, onCancel() {} });
        a._activeMove = d._activeMove = h; a._fixedHold = d._fixedHold = true;
        d.facing = -a.facing;
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

const { STILLS } = await import(process.env.STILLS_MODULE ?? './toehold_t30_poses.mjs');
for (const [pair, att, def] of PAIRS) {
    if (process.env.ONLY && !pair.startsWith(process.env.ONLY)) continue;
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&light=v1';
    const h = await launch();
    try {
        await h.page.waitForTimeout(2500);
        await h.page.evaluate(INSTALL);
        for (const facing of [1, -1]) {
            if (process.env.FACE && +process.env.FACE !== facing) continue;
            const side = facing > 0 ? 'right' : 'left';
            mkdirSync(`${outDir}/${pair}-${side}`, { recursive: true });
            const report = {};
            for (let st of STILLS) {
                if (process.env.ONLYSTILL && st.id !== process.env.ONLYSTILL) continue;
                if (process.env.SEARCH) {   // grid over the man's hip lift, the attacker's crouch and gap: least grip px, with a penalty for lifting the man off the mat
                    let best = null;
                    for (const lift of [-110, -100, -90, -80, -70]) for (const dc of [-.4, -.2, 0, .2]) for (const dg of [-20, -10, 0, 10, 20]) {
                        const t = { ...st, gap: st.gap + dg, att: { ...st.att, crouch: st.att.crouch + dc }, def: { ...st.def, lift } };
                        await h.page.evaluate(SETUP, { facing, sep: 120 });
                        await h.page.evaluate(PLAY, { id: 'toeholdStill_' + st.id, pose: t, facing, gap: t.gap, flip: !!t.flip, distance: 120 });
                        for (let i = 0; i < 3; i++) await h.page.evaluate(STEPF);
                        const g = await h.page.evaluate(GRIPPX), cost = Math.max(g.heel, g.toe) + Math.abs(lift + 110) * .12;
                        if (!best || cost < best.cost) best = { cost, g, t };
                    }
                    console.log('best', st.id, JSON.stringify({ ...best.g, lift: best.t.def.lift, crouch: best.t.att.crouch, gap: best.t.gap }));
                    st = best.t;
                }
                await h.page.evaluate(SETUP, { facing, sep: 120 });
                await h.page.evaluate(PLAY, { id: 'toeholdStill_' + st.id, pose: st, facing, gap: st.gap, flip: !!st.flip, distance: 120 });
                for (let i = 0; i < 8; i++) await h.page.evaluate(STEPF);
                const c = await h.page.evaluate(CROP);
                await h.page.screenshot({ path: `${outDir}/${pair}-${side}/${st.id}.png`, clip: { x: Math.max(0, c.x - 190), y: Math.max(0, c.y - 200), width: 380, height: 280 } });
                report[st.id] = { ...(await h.page.evaluate(READ)), gripPx: await h.page.evaluate(GRIPPX) }; console.log(st.id, JSON.stringify(report[st.id].gripPx));
            }
            writeFileSync(`${outDir}/${pair}-${side}/report.json`, JSON.stringify(report, null, 1));
            console.log(pair, side, 'done');
        }
    } finally { await h.close(); }
}
