// PLAN_LIGHT_MOVES T3.0c: the two-knee toe hold as a solved, dense timeline. Shared by the solver/video script and the page.
// Every in-page function here is serialised by Playwright (install them with `installPage`), so none may close over this file.
import { sellFrames } from './toehold_t30_lib.mjs';
export const DIST = 120, FPS = 60;

// ---- timeline (seconds). Facing flips sit between two frames (k - .5)/60 so no frame samples a half-mirrored pose or a half-weighted grip. -----------------------------
export const midFrame = k => (k - .5) / FPS;
export const T = {
    hold: .5,                       // grab held
    stepEnd: 1.1,                   // step-over done
    turnStart: 1.1, turnFlip: midFrame(75), turnEnd: 1.4,   // attacker turn: 0.3 s, mirrored at the symmetric instant
    dropStart: 1.4, land: 102 / FPS,   // knee drop: 0.3 s, both knees land on frame 102
    settleEnd: 1.85,
    rollStart: 1.85, rollFlip: midFrame(126), rollEnd: 2.35,   // victim roll: 0.5 s
    wrench: .9, firstPeak: 2.35 + .45,   // three wrenches, 0.9 s each: pull peak at firstPeak + k * wrench
    peaks: [2.8, 3.7, 4.6], end: 5.55,
};

// ---- fist schedule: one strike per wrench, alternating arms (l, r, l), landing on the pull's peak frame ---------------------------------------------------------------
// keys per arm: down (resting on the mat), up before the strike, sharp strike down on the peak, held on the mat 0.16 s
export const fistKeys = (fists, peaks, strikeArm = ['l', 'r', 'l']) => {
    const out = { l: [], r: [] };
    for (const arm of ['l', 'r']) {
        const f = fists[arm], k = out[arm];
        k.push([T.rollEnd - .05, f.down]);
        peaks.forEach((p, i) => {
            if (strikeArm[i] !== arm) return;
            k.push([p - .5, f.down], [p - .22, f.up], [p - .1, f.up], [p, f.down], [p + .16, f.down]);
        });
        k.push([T.end, f.down]);
        k.sort((a, b) => a[0] - b[0]);
    }
    return out;
};
const lerpArm = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = t1 === t0 ? 1 : (t - t0) / (t1 - t0); return { arm: a.arm + (b.arm - a.arm) * k, elbow: a.elbow + (b.elbow - a.elbow) * k }; }
    return keys[keys.length - 1][1];
};
export const armsAt = (keys, t) => { const l = lerpArm(keys.l, t), r = lerpArm(keys.r, t); return { lArm: l.arm, lElbow: l.elbow, rArm: r.arm, rElbow: r.elbow }; };

// ---- in page ------------------------------------------------------------------------------------------------------------------------------------------------------
// Evaluate one static state: w = { att, def, gap, attY, attSign, defSign, twist, order }. attSign/defSign are the facings relative to the grab's attacker facing (f):
// the supine man is -1, the prone man +1; the attacker is +1 until the turn, -1 after.
export const EVALW = async ({ w, f, order, metrics }) => {
    window.__SETUP({ facing: f, sep: 120 });
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, dist = 120;
    const { shinsFromFolds } = await import('/src/rig/articulation.js');
    const strip = ({ fists, ...r }) => r, dur = 1;
    const kf = (pose, x, y, parts) => [0, dur].map(at => ({ at, ease: 'linear', pose: shinsFromFolds(strip(pose)), transform: { x, y }, parts }));
    const prone = w.defSign > 0, dparts = prone ? { lShin: w.twist ? 'ankleTwist' : 'base', nearForearm: 'grip', farForearm: 'grip' } : { lShin: 'base', nearForearm: 'base', farForearm: 'base' };
    const as = a.skeleton.lChannelSide(f * w.attSign), ds = d.skeleton.lChannelSide(f * w.defSign), sf = s => (s === ds ? 'same' : 'other');
    const G = (arm, side, anchor) => ({ role: 'attacker', arm, to: { role: 'defender', joint: 'Ankle', side, anchor }, in: [0, .05], out: [dur - .01, dur], natural: true, palm: 'clutch' });
    sc.moveRuntime.register({ id: 'toeholdC_eval', duration: dur, events: [],
        tracks: { attacker: { keyframes: kf(w.att, dist - w.gap, w.attY ?? 0, {}) }, defender: { keyframes: kf(w.def, dist, 0, dparts) } },
        grips: [G('l', sf(as), 'heel'), G('r', sf(as === 'near' ? 'far' : 'near'), 'toe')], plants: [], layers: [{ from: 0, to: dur, order }] });
    a.state = d.state = 'holding';
    const h = sc.moveRuntime.play('toeholdC_eval', { attacker: a, defender: d }, { onEvent() {}, onComplete() {}, onCancel() {} });
    a._activeMove = d._activeMove = h; a._fixedHold = d._fixedHold = true;
    d.facing = f * w.defSign; d.lying = prone ? 'prone' : 'supine'; a.facing = f * w.attSign;
    for (let i = 0; i < 3; i++) await window.__STEPF();
    return window.__MEASURE(metrics);
};
// the numbers every solve and every video frame reads
export const MEASURE = metrics => {
    const sc = window.__WFM_GAME.scene.scenes[0], a = sc.w1, d = sc.w2, ap = a.skeleton.jointAttachmentPoints, dp = d.skeleton.jointAttachmentPoints, dsd = d.skeleton.lChannelSide(d.facing);
    const g = window.__GRIPPX(), r = window.__READ(), foot = dp[dsd + 'Ankle'], mat = d.y;
    const hip = { x: (ap.nearHip.x + ap.farHip.x) / 2, y: (ap.nearHip.y + ap.farHip.y) / 2 };
    const out = { grip: g, pinned: [...r.att.pinned.map(p => 'att ' + p), ...r.def.pinned.map(p => 'def ' + p)], knees: [mat - ap.nearKnee.y, mat - ap.farKnee.y], kneeX: [ap.nearKnee.x, ap.farKnee.x],
        kneeFlex: [r.att.knees.near, r.att.knees.far], attX: a.x, foot: { x: foot.x, y: foot.y }, hip, attFacing: a.facing, defFacing: d.facing,
        pts: { att: r.att.pts, def: r.def.pts } };
    if (metrics) out.boot = window.__METRICS();
    return out;
};
export const installPage = async (page, fns) => {
    // fns: { name: function }; installed as window.__NAME
    await page.evaluate(src => { for (const [k, v] of Object.entries(src)) window['__' + k] = (0, eval)('(' + v + ')'); }, Object.fromEntries(Object.entries(fns).map(([k, v]) => [k, v.toString()])));
};
