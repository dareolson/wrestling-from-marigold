// Joint-limit audit for the down-state sells and the protective recovery
// overlay: renders every sell/clutch (both lyings, both slots, both facings,
// theatrical amp) on the real rigs through Wrestler._sellPose and
// Skeleton.updateGroundedReach, reads each elbow and knee's flex off the
// RENDERED joints, and checks it against src/rig/articulation.js JOINT_LIMITS.
//   flex > 0 = bent the normal way (knee: heel toward the back of the thigh;
//   elbow: forearm toward the front of the upper arm); < 0 = hyperextended.
// Front is read off the torso (hip -> neck), so it holds lying or standing.
// CAVEAT (2026-10-23): the elbow numbers track the rendered joints and the calibration holds
// upright, but at deep knee folds the sign this reads off the art disagrees with the grounded
// angles Wrestler hands the skeleton (thigh - shin, clamped by sells.limitKnees, was checked
// directly: it stays within [-0.15, 2.55]). Treat this as a screening list, not proof.
// Calibrated first on upright poses with known lKnee/lElbow.
//   WFM_P1=george-roster-v1 WFM_P2=thesz-procreate-v1 node tools/debug/limb_limits_audit.mjs
import { launch } from './harness.mjs';
const h = await launch();
await h.page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
await h.page.waitForTimeout(800);
// ANATOMICAL, measured: knee proper = ankle behind the knee line (the heel folds toward the
// back of the thigh), elbow proper = forearm folds toward the front of the upper arm. The rest
// poses sit up to 0.15 rad off straight, hence the slack. NOTE: pose.lKnee/rKnee > 0 puts the
// ankle FORWARD of the knee (measured, see calibration), the opposite of this.
const LIM = { knee: { min: -0.25, max: 2.55 }, elbow: { min: -0.25, max: 2.75 } };
const res = await h.page.evaluate(async (LIM) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    sc.scene.pause();
    const out = { calibration: [], cases: [] };
    const mod = await import('/src/animation/sells.js');
    const { SELLS } = mod;
    const flexes = (sk, facing) => {
        const p = sk.jointAttachmentPoints;
        const hip = p.nearHip && p.farHip ? { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 } : p.nearHip;
        const t = { x: p.neck.x - hip.x, y: p.neck.y - hip.y };
        const n = facing >= 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x };
        const dot = (a, b) => a.x * b.x + a.y * b.y;
        const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
        const flex = (a, b, c) => {
            const u = sub(b, a), l = sub(c, b);
            let q = { x: -u.y, y: u.x };
            if (dot(q, n) < 0) q = { x: -q.x, y: -q.y };
            return Math.atan2(dot(l, q), dot(l, u));
        };
        const r = {};
        for (const sd of ['near', 'far']) {
            if (p[`${sd}Hip`] && p[`${sd}Knee`] && p[`${sd}Ankle`]) r[`${sd}Knee`] = -flex(p[`${sd}Hip`], p[`${sd}Knee`], p[`${sd}Ankle`]);
            if (p[`${sd}Shoulder`] && p[`${sd}Elbow`] && p[`${sd}Wrist`]) r[`${sd}Elbow`] = flex(p[`${sd}Shoulder`], p[`${sd}Elbow`], p[`${sd}Wrist`]);
        }
        // fold past straight-through-pi wraps to the other sign: unwrap into the proper side
        if (r.nearKnee !== undefined) for (const k of ['nearKnee', 'farKnee']) if (r[k] < -2.6) r[k] += 2 * Math.PI;
        for (const k of ['nearElbow', 'farElbow']) if (r[k] !== undefined && r[k] < -2.9) r[k] += 2 * Math.PI;
        return r;
    };
    for (const [seat, w] of [['p1', sc.w1], ['p2', sc.w2]]) {
        const sk = w.skeleton;
        const name = (seat === 'p1' ? sc._preset1 : sc._preset2).name;
        // calibration: upright, known flex
        for (const facing of [1, -1]) {
            sk.updateUpright(500, 380, w.s, facing, { ...w.pose, lKnee: 0.5, rKnee: 0.5, lElbow: 1.0, rElbow: 1.0 }, 0, 0, 0, 0, 1, 0);
            out.calibration.push({ seat, name, facing, ...Object.fromEntries(Object.entries(flexes(sk, facing)).map(([k, v]) => [k, +v.toFixed(2)])) });
        }
        const worst = {};
        const note = (label, f) => {
            for (const [j, v] of Object.entries(f)) {
                const kind = j.endsWith('Knee') ? 'knee' : 'elbow';
                const key = `${kind}`;
                const w0 = (worst[label] ??= { knee: { lo: 9, hi: -9 }, elbow: { lo: 9, hi: -9 } });
                w0[key].lo = Math.min(w0[key].lo, v); w0[key].hi = Math.max(w0[key].hi, v);
            }
        };
        const entries = [];
        for (const lying of ['supine', 'prone']) {
            for (const [nm, def] of Object.entries(SELLS[lying])) {
                if (nm === 'clutch') for (const part of Object.keys(def)) for (const slot of ['near', 'far']) entries.push({ lying, nm: 'clutch', part, slot });
                else entries.push({ lying, nm, part: 'chest', slot: 'near' });
            }
        }
        for (const e of entries) for (const facing of [1, -1]) for (const amp of [0.75, 1.3]) {
            const halves = e.nm === 'roll' ? [false, true] : [false];
            for (const turned of halves) for (let i = 0; i <= 20; i++) {
                const u = i / 20;
                if (e.nm === 'roll' && (turned ? u < 0.5 : u > 0.5)) continue;
                // pick limb so the slot resolves: any limb, we force the slot via the plan's limb/rolls
                const limb = e.slot === 'far' ? 'rLeg' : 'lLeg';
                w.lying = e.lying; w.facing = turned ? -facing : facing;
                const cur = { name: e.nm, lying: e.lying, part: e.part, duration: 1, amp, limb: e.nm === 'clutch' ? limb : null, rolls: 0, turned };
                const stayRig = { lChannelSide: () => 'near' };
                const savedSk = w.skeleton; // groundedSlot reads the skeleton's lChannelSide: force near-for-l
                w._sell = { plan: [cur], i: 0, t: u, facing0: facing };
                w.skeleton = Object.assign(Object.create(Object.getPrototypeOf(savedSk)), savedSk);
                w.skeleton.lChannelSide = () => 'near';
                const sold = w._sellPose();
                w.skeleton = savedSk;
                w._sell = null;
                if (!sold) continue;
                sk.updateGroundedReach(500, 380, w.s, w.facing, sold.g, sold.reach);
                note(`${name} ${e.lying} ${e.nm}${e.nm === 'clutch' ? ` ${e.part} ${e.slot}` : ''}`, flexes(sk, w.facing));
            }
        }
        // recovery overlay on the rig's own idle pose, upright
        globalThis.location = undefined;
        for (const [part, limb] of [['knee', 'lLeg'], ['knee', 'rLeg'], ['back', null]]) for (const facing of [1, -1]) {
            for (const wgt of [1]) {
                w.state = 'standing'; w.facing = facing;
                w._pain = { part, limb, severity: 1, phase: 'recover', since: 0, until: 1e12 };
                const real = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(w), '_recoveryWeight').value;
                w._recoveryWeight = () => wgt;
                const pose = w._recoveryPose();
                delete w._recoveryWeight; w._pain = null;
                for (const [label, p] of [['idle', w.pose], ['overlay', pose]]) {
                    sk.updateUpright(500, 380, w.s, facing, p, 0, 0, 0, 0, 1, 0);
                    note(`${name} upright ${part} ${limb ?? ''} ${label}`, flexes(sk, facing));
                }
            }
        }
        for (const [label, v] of Object.entries(worst)) {
            const bad = [];
            for (const kind of ['knee', 'elbow']) {
                if (v[kind].lo < LIM[kind].min - 1e-9 && v[kind].lo < 9) bad.push(`${kind} min ${v[kind].lo.toFixed(2)}`);
                if (v[kind].hi > LIM[kind].max && v[kind].hi > -9) bad.push(`${kind} max ${v[kind].hi.toFixed(2)}`);
            }
            out.cases.push({ name, label, knee: [v.knee.lo, v.knee.hi].map(x => +x.toFixed(2)), elbow: [v.elbow.lo, v.elbow.hi].map(x => +x.toFixed(2)), bad: bad.join('; ') });
        }
    }
    return out;
}, LIM);
console.log('CALIBRATION: pose lKnee 0.5 / lElbow 1.0 (knee reads NEGATIVE = ankle forward of knee: the channel is inverted vs anatomy)');
for (const c of res.calibration) console.log(JSON.stringify(c));
const bad = res.cases.filter(c => c.bad);
console.log(`\n${res.cases.length} cases, ${bad.length} outside limits`);
for (const c of bad) console.log(`${c.name} | ${c.label} | knee ${c.knee} elbow ${c.elbow} | ${c.bad}`);
await h.close();
process.exit(0);
