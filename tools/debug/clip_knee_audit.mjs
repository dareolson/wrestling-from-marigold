// The knee guard (PLAN_GRAPPLES T4c.4d): no move bends a knee backward, ever. Renders every registered clip (every track, every frame at 60 fps), the
// waistlock hold's poses and the get-ups on Procreate Lou and george-roster-v1, both facings, through the real Wrestler.draw, reads each knee's and
// elbow's flex off the DRAWN hip/knee/ankle (front taken from the torso, so it holds lying or upside down; same reading as limb_limits_audit.mjs) and
// fails on any knee past LIM.knee (hyperextended below -0.25 rad, or flexed past 2.55). Elbows are counted the same way and never fail.
//   WFM_URL=http://localhost:5173 node tools/debug/clip_knee_audit.mjs [--all] [--json out.json] [--write-baseline]
// A baseline (tools/debug/baselines/clip_knee_baseline.json, like the coverage one) lists the failures that shipped before the guard: each is keyed
// by move/rig/role/facing/joint and holds the worst angle seen. A listed failure that gets no worse is reported as "baseline"; one that is new, or
// worse than its listing by more than TOL rad, fails the run. --write-baseline replaces the file with this run's failures (Opus decides when).
//   --elbows lists the elbow runs too (reported only; the elbow reading is noisy at deep folds).
//   --all prints every failing frame; the default prints each run of frames once, at its worst frame.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { film, PRESS_AT } from './waistlock_throws.mjs';

const BASELINE = new URL('./baselines/clip_knee_baseline.json', import.meta.url).pathname;
const TOL = 0.05;
const LIM_SAT = { min: -0.10, max: 2.55 };   // JOINT_LIMITS.knee
const LIM = { knee: { min: -0.25, max: 2.55 }, elbow: { min: -0.25, max: 2.75 } };
const argv = process.argv.slice(2), has = (f) => argv.includes(f), val = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';

// flex > 0 = bent the normal way. Front is read off the torso, so it holds lying or upside down. Runs in the page and in node.
function flexes(sk, facing) {
    const p = sk.jointAttachmentPoints;
    const hip = p.nearHip && p.farHip ? { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 } : p.nearHip;
    const t = { x: p.neck.x - hip.x, y: p.neck.y - hip.y };
    const n = facing >= 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x };
    const dot = (a, b) => a.x * b.x + a.y * b.y, sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
    // q is the front of the bone: the bone turned a quarter so a bone hanging straight down has the facing side as its front. It follows the bone, not the
    // torso: choosing q by its dot with the torso front (the first version) is ill-conditioned once a thigh points forward (a raised knee read as -0.9 rad
    // when the geometry was a normal bend, T4c.4h). A body turned by tilt keeps its handedness, so the facing alone says which way q goes.
    const hand = facing >= 0 ? 1 : -1;
    const flex = (a, b, c) => { const u = sub(b, a), l = sub(c, b); const q = hand > 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x }; return Math.atan2(dot(l, q), dot(l, u)); };
    const r = {};
    for (const sd of ['near', 'far']) {
        if (p[`${sd}Hip`] && p[`${sd}Knee`] && p[`${sd}Ankle`]) { r[`${sd}Knee`] = -flex(p[`${sd}Hip`], p[`${sd}Knee`], p[`${sd}Ankle`]); if (r[`${sd}Knee`] < -2.6) r[`${sd}Knee`] += 2 * Math.PI; }
        if (p[`${sd}Shoulder`] && p[`${sd}Elbow`] && p[`${sd}Wrist`]) { r[`${sd}Elbow`] = flex(p[`${sd}Shoulder`], p[`${sd}Elbow`], p[`${sd}Wrist`]); if (r[`${sd}Elbow`] < -2.9) r[`${sd}Elbow`] += 2 * Math.PI; }
    }
    return r;
}
const FLEX = flexes.toString();
const rowsOf = (move, rig, role, facing, frame, t, f) => Object.entries(f).map(([j, v]) => {
    const kind = j.endsWith('Knee') ? 'knee' : 'elbow';
    return { move, rig, role, facing, frame, t, joint: j, kind, angle: +v.toFixed(3), bad: v < LIM[kind].min - 1e-9 || v > LIM[kind].max };
});

process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
const h = await launch();
let rows, sat;
try {
    const page = h.page;
    await page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
    await page.waitForTimeout(800);
    ({ rows, sat } = await page.evaluate(async ({ LIM, FLEX }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause();
        const { REGISTERED_MOVE_CLIPS } = await import('/src/animation/clips/index.js');
        const { sampleClip, compileClip } = await import('/src/animation/AnimationClip.js');
        const flexes = (0, eval)('(' + FLEX + ')');
        const out = [], sat = {};
        const { JOINT_LIMITS } = await import('/src/rig/articulation.js');
        for (const [seat, w] of [['p1', sc.w1], ['p2', sc.w2]]) {
            const rig = seat === 'p1' ? 'thesz-procreate-v1' : 'george-roster-v1';
            const idle = JSON.parse(JSON.stringify(w.pose));
            w.state = 'standing'; w.x = 500; w.y = 380; w.moveBlend = 0; w.combatBlend = 0;
            w._choreoOwnsPose = () => true;
            const record = (move, role, facing, frame, t) => {
                for (const [j, v] of Object.entries(flexes(w.skeleton, facing))) {
                    const kind = j.endsWith('Knee') ? 'knee' : 'elbow';
                    out.push({ move, rig, role, facing, frame, t, joint: j, kind, angle: +v.toFixed(3), bad: v < LIM[kind].min - 1e-9 || v > LIM[kind].max });
                }
            };
            for (const facing of [1, -1]) {
                for (const source of REGISTERED_MOVE_CLIPS) {
                    const clip = source._compiled ? source : compileClip(source);
                    for (let i = 0; i <= Math.ceil(clip.duration * 60); i++) {
                        const t = Math.min(clip.duration, i / 60), s = sampleClip(clip, t);
                        for (const [role, state] of Object.entries(s.tracks)) {
                            // T4c.4h: a keyed lKnee/rKnee outside JOINT_LIMITS.knee is eaten by the clamp (a fold that never draws): a miss, not a pass
                            for (const j of ['lKnee', 'rKnee']) {
                                const v = state.pose?.[j];
                                if (!Number.isFinite(v) || (v >= JOINT_LIMITS.knee.min && v <= JOINT_LIMITS.knee.max)) continue;
                                const k = `${clip.id}|${role}|${j}`, e = sat[k] ??= { worst: v, frames: new Set() };
                                if (Math.abs(v) > Math.abs(e.worst)) e.worst = v;
                                e.frames.add(i);
                            }
                            w.pose = JSON.parse(JSON.stringify(idle));
                            Object.assign(w.pose, state.pose ?? {});
                            w.facing = facing * (state.facing ?? 1);
                            w.draw();
                            record(clip.id, role, w.facing, i, t);
                        }
                    }
                }
                // the get-ups, both lyings
                for (const lying of ['prone', 'supine']) for (let i = 0; i <= 60; i++) {
                    w.skeleton.updateGetUp(500, 380, w.s, facing, i / 60, lying);
                    record(`getup:${lying}`, 'solo', facing, i, i / 60);
                }
            }
            delete w._choreoOwnsPose;
            w.pose = idle;
        }
        for (const e of Object.values(sat)) e.frames = e.frames.size;
        return { rows: out, sat };
    }, { LIM, FLEX }));
} finally { await h.close(); }

// The live pass: the waistlock hold, the drop, the snapmare and the rear sleeper (every stage to the KO) as the game plays them (lead-in blends, hand-over and all), read off the stepped
// film's joint points. Both attackers, both facings. `hold` = frames before a clip owns the pair.
for (const [label, att, def] of [['Lou on George', LOU, GEORGE], ['George on Lou', GEORGE, LOU]]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def;
    const h2 = await launch();
    try {
        await h2.page.waitForTimeout(2500);
        const info = await h2.page.evaluate(INSTALL);
        for (const facing of [-1, 1]) for (const cs of ['drop', 'reverse', 'sleeper']) {
            const film_ = await film(h2.page, info, { facing, case: cs, rev: 6 }, null, { quiet: 8 });
            film_.forEach((r, i) => {
                const hold = !r.t.clip && i >= PRESS_AT && r.wl !== null ? 'hold' : null;
                const move = r.t.clip ?? (r.t.sleeper ? 'rear sleeper' : hold ? 'waistlock hold' : null);
                if (!move) return;
                for (const [side, role, rig] of [['a', 'attacker', att], ['d', 'defender', def]]) {
                    if (!r[side].pts.nearKnee) continue;
                    rows.push(...rowsOf(`live ${cs} ${move}`, rig, role, r.t.facing[side === 'a' ? 0 : 1], i, r.t.time ?? i / 60, flexes({ jointAttachmentPoints: r[side].pts }, r.t.facing[side === 'a' ? 0 : 1])));
                }
            });
        }
    } finally { await h2.close(); }
    console.log(`[live] ${label} done`);
}

// group failing frames into runs per move/rig/role/facing/joint
const key = (r) => `${r.move}|${r.rig}|${r.role}|${r.facing > 0 ? 'R' : 'L'}|${r.joint}`;
const groups = new Map();
for (const r of rows.filter(r => r.bad)) {
    const k = key(r), g = groups.get(k) ?? [];
    g.push(r); groups.set(k, g);
}
const worst = (g) => g.reduce((m, r) => (Math.abs(r.angle - (r.kind === 'knee' ? 0.9 : 1)) > Math.abs(m.angle - (m.kind === 'knee' ? 0.9 : 1)) ? r : m));
const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { failures: {} };
const lines = [], newFails = [], summary = {};
for (const [k, g] of groups) {
    const w = worst(g), isKnee = g[0].kind === 'knee';
    summary[k] = { worst: w.angle, frame: w.frame, frames: g.length };
    const listed = base.failures[k];
    const status = !isKnee ? 'elbow' : listed && Math.abs(w.angle - (isKnee ? 0.9 : 1)) <= Math.abs(listed.worst - 0.9) + TOL ? 'baseline' : 'NEW';
    if (status === 'NEW') newFails.push(k);
    if (!isKnee && !has('--elbows')) continue;
    if (has('--all')) for (const r of g) lines.push(`${status} ${r.move} ${r.rig} ${r.role} facing ${r.facing} frame ${r.frame} ${r.joint} ${r.angle}`);
    else lines.push(`${status.padEnd(8)} ${k.replaceAll('|', ' | ')} | ${g.length} frames, worst ${w.angle} at frame ${w.frame} (t ${w.t.toFixed(3)})`);
}
lines.sort();
for (const l of lines) console.log(l);
const kneeGroups = [...groups.values()].filter(g => g[0].kind === 'knee').length;
console.log(`\n${rows.length} samples; ${kneeGroups} knee failure runs (${[...groups.entries()].filter(([, g]) => g[0].kind === 'knee').reduce((n, [, g]) => n + g.length, 0)} frames); ${groups.size - kneeGroups} elbow runs (reported only)`);
if (val('--json')) writeFileSync(val('--json'), JSON.stringify({ summary, failures: rows.filter(r => r.bad) }, null, 1));
if (has('--write-baseline')) {
    const failures = Object.fromEntries([...groups].filter(([, g]) => g[0].kind === 'knee').map(([k, g]) => [k, { worst: summary[k].worst, frame: summary[k].frame, frames: g.length }]));
    writeFileSync(BASELINE, JSON.stringify({ about: 'clip_knee_audit baseline: knee failures that shipped before the guard (T4c.4d). New or worse ones fail.', limits: LIM, failures, saturation: Object.fromEntries(Object.entries(sat).map(([k, e]) => [k, { worst: +e.worst.toFixed(3), frames: e.frames }])) }, null, 1) + '\n');
    console.log('wrote', BASELINE);
    process.exit(0);
}
// saturation: keyed knee values the clamp removes (static scan of every registered clip, both rigs and facings sample the same keys, so counted once per frame)
const satBase = base.saturation ?? {}, satNew = [], satLines = [];
for (const [k, e] of Object.entries(sat)) {
    const listed = satBase[k], worse = !listed || Math.abs(e.worst) > Math.abs(listed.worst) + TOL;
    if (worse) satNew.push(k);
    satLines.push(`${worse ? 'NEW     ' : 'baseline'} saturated ${k.replaceAll('|', ' | ')} | keyed ${e.worst.toFixed(3)} (limit ${LIM_SAT.min}..${LIM_SAT.max}), ${e.frames} frames`);
}
satLines.sort(); for (const l of satLines) console.log(l);
console.log(`${Object.keys(sat).length} saturated clip knee track(s)`);
if (satNew.length) { console.log(`FAIL: ${satNew.length} saturated knee track(s) not in the baseline: ${satNew.join(', ')}`); process.exit(1); }
if (newFails.length) { console.log(`FAIL: ${newFails.length} knee failure run(s) not in the baseline`); process.exit(1); }
console.log('ok: no new knee failures');
