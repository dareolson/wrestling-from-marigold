// PLAN_FALLS T4.8a: per splash variant, what the renderer is handed (sampleSplash, 241 points + both sides of the mirror frame + landing): knee/elbow flex min/max per side, bad samples, grounded-knee clamp count, and the drawn-joint step across the mirror frame vs neighbouring frames. Writes JSON to stdout.
//   node tools/debug/falls_g4b_r4_numbers.mjs
import Skeleton from '../../src/Skeleton.js';
import { SPLASH_VARIANTS, sampleSplash } from '../../src/animation/groundContact.js';

const L = { thigh: 44, shin: 44, arm: 38, fore: 38 }, tip = (a, len, f) => [Math.sin(a) * len * f, Math.cos(a) * len];
const joints = (g, mir) => { const f = mir ? -1 : 1, out = {}; for (const side of ['far', 'near']) {
    const k = tip(g[`${side}Thigh`], L.thigh, f), a = tip(g[`${side}Shin`], L.shin, f), e = tip(g[`${side}Arm`], L.arm, f), w = tip(g[`${side}Fore`], L.fore, f);
    out[`${side}Knee`] = k; out[`${side}Ankle`] = [k[0] + a[0], k[1] + a[1]]; out[`${side}Elbow`] = e; out[`${side}Wrist`] = [e[0] + w[0], e[1] + w[1]];
} return out; };
const dist = (A, B) => Math.max(...Object.keys(A).map(k => Math.hypot(A[k][0] - B[k][0], A[k][1] - B[k][1])));
const out = {};
for (const [name, def] of Object.entries(SPLASH_VARIANTS)) {
    const rest = Skeleton.lyingBase(def.rest, true), T = def.timing, b0 = T.fall + T.hold, ts = [];
    for (let i = 0; i <= 240; i++) ts.push(b0 + T.bounce * i / 240);
    if (def.mirrorAt != null) ts.push(b0 + T.bounce * def.mirrorAt - T.bounce * 1e-6, b0 + T.bounce * def.mirrorAt + T.bounce * 1e-6);
    ts.push(b0 + T.bounce - 1e-9); ts.sort((a, b) => a - b);
    const restKnee = Math.min(rest.farThigh - rest.farShin, rest.nearThigh - rest.nearShin), kneeFloor = Math.min(-0.02, restKnee - 1e-9);
    const r = { samples: 0, bad: 0, clamps: 0, mirrorStep: null, neighbourMax: 0, flex: {} };
    let prev = null;
    for (const t of ts) {
        const s = sampleSplash(def, t, rest); if (!s.g) continue; r.samples++;
        let bad = false;
        for (const side of ['far', 'near']) {
            const knee = s.g[`${side}Thigh`] - s.g[`${side}Shin`], elbow = s.g[`${side}Fore`] - s.g[`${side}Arm`];
            for (const [k, v] of [[`${side}Knee`, knee], [`${side}Elbow`, elbow]]) { const f = r.flex[k] ??= [Infinity, -Infinity]; f[0] = Math.min(f[0], v); f[1] = Math.max(f[1], v); }
            if (knee < kneeFloor || knee > 2.55 || elbow < -0.02 || elbow > 2.55) bad = true;
            if (knee < Math.min(0, restKnee) - 1e-9) r.clamps++;
        }
        if (bad) r.bad++;
        const J = joints(s.g, s.mirror);
        if (prev) { const d = dist(prev.J, J); if (prev.mirror !== s.mirror) r.mirrorStep = Math.max(r.mirrorStep ?? 0, d); else if (t - prev.t > 1e-4) r.neighbourMax = Math.max(r.neighbourMax, d); }
        prev = { J, mirror: s.mirror, t };
    }
    // the roll's first sampled pose is already mirrored (its apex sits at mirrorAt), so the flip is the apex key drawn plain just before it vs the same key mirrored just after
    if (def.mirrorAt != null) { const post = sampleSplash(def, b0 + T.bounce * (def.mirrorAt + 1e-6), rest); r.mirrorStep = Math.max(r.mirrorStep ?? 0, dist(joints(def.keys[0].g, false), joints(post.g, post.mirror))); }
    r.restKnee = { far: rest.farThigh - rest.farShin, near: rest.nearThigh - rest.nearShin };
    for (const k of Object.keys(r.flex)) r.flex[k] = r.flex[k].map(v => +v.toFixed(3));
    r.mirrorStep = r.mirrorStep == null ? null : +r.mirrorStep.toFixed(2); r.neighbourMax = +r.neighbourMax.toFixed(2);
    r.restKnee = Object.fromEntries(Object.entries(r.restKnee).map(([k, v]) => [k, +v.toFixed(3)]));
    out[name] = r;
}
console.log(JSON.stringify(out, null, 1));
