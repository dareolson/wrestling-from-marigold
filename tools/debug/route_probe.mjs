// The hand's whole route on the REAL Wrestler draw, frame by frame, deterministic (PLAN_GEORGE_TRANSFER T8.3/T8.5):
//   clutch   a back clutch on the mat (supine, sell plan driven by hand, duration 1.38 s = theatrical, .63 s = the compact clutch)
//   release  the standing recovery's let-go (carried rise end, combat guard on, 2.5 s pain) from the hand on the back to idle
// For each facing it reports every depth swap (frame, phase, hand clearance px, the Wrestler's own _handUnder), skipped
// swaps, the largest frame-to-frame move of the wrist relative to the back waist, and the clearance range.
//   entry    the standing entry with no carried rise (after a prone rise): the recovery ramps the hand in from the idle pose
// A sweep: AROUND_VIAW / AROUND_STANDW / AROUND_APPROACH env (comma lists) override Skeleton.AROUND and the rig's aroundVia.approach
// for the run; AROUND_OFF=1 removes aroundVia (the straight path), the baseline.
//   WFM_URL=http://127.0.0.1:5173 WFM_P1=george-roster-v1 AROUND_VIAW=.2 AROUND_STANDW=.3 node tools/debug/route_probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'george-roster-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const ramps = (process.env.AROUND_RAMP ?? '').split(',').filter(Boolean).map(Number);
const approaches = (process.env.AROUND_APPROACH ?? '').split(',').filter(Boolean).map(Number);
const list = (v, d) => (v ?? d).split(',').map(Number);
const viaWs = list(process.env.AROUND_VIAW, '.2'), standWs = list(process.env.AROUND_STANDW, '.5');
const out = process.argv[2] ?? null;
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.torso, null, { timeout: 30000 });
    const res = await h.page.evaluate(async ({ viaWs, standWs, approaches, ramps, off }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        if (sc.w2) { sc.w2.setVisible?.(false); sc.w2.x = -500; }
        const w = sc.w1, sk = w.skeleton, Sk = sk.constructor, A = Sk.AROUND;
        const { POSES } = await import('/src/Wrestler.js');
        const FRAME = 1000 / 60;
        const sample = () => {
            const wr = sk.jointAttachmentPoints.nearWrist, wa = sk.backWaistPoint(), c = sk.handClearance(1);
            return { rel: { x: wr.x - wa.x, y: wr.y - wa.y }, clear: c ? +c.min.toFixed(2) : null, under: !!sk._handUnder };   // the flag the Wrestler handed the skeleton (by depth or by the torso mask)
        };
        const summarize = (rows, phaseOf) => {
            const swaps = [], steps = [];
            for (let i = 1; i < rows.length; i++) {
                steps.push(Math.hypot(rows[i].rel.x - rows[i - 1].rel.x, rows[i].rel.y - rows[i - 1].rel.y));
                if (rows[i].under !== rows[i - 1].under) swaps.push({ frame: i, ms: +(i * FRAME).toFixed(0), to: rows[i].under ? 'under' : 'over', phase: phaseOf(rows[i]), clearPx: rows[i - 1].clear });
            }
            const i = steps.indexOf(Math.max(...steps));
            return { stepsHead: steps.slice(0, 40).map(v => +v.toFixed(2)), stepsAfter30Max: +Math.max(...steps.slice(30)).toFixed(2), frames: rows.length, swaps, skips: w._handSkips ?? 0, maxStep: +Math.max(...steps).toFixed(2), maxStepAtFrame: i + 1,
                finalUnder: rows.at(-1).under, minClearBeforeSwap: swaps.map(s => s.clearPx) };
        };
        const result = {};
        const was = { ...A };
        const via0 = sk._textureConfig.backSell.aroundVia?.approach;
        const saved = sk._textureConfig.backSell.aroundVia;
        if (off) delete sk._textureConfig.backSell.aroundVia;   // the straight path, for the baseline
        for (const viaW of viaWs) for (const standW of standWs) for (const approach of (approaches.length ? approaches : [via0])) for (const ramp of (ramps.length ? ramps : [A.rampMs])) {
            A.viaW = viaW; A.standW = standW; A.rampMs = ramp; if (!off) sk._textureConfig.backSell.aroundVia.approach = approach;
            const key = `${off ? 'STRAIGHT ' : ''}viaW ${viaW} standW ${standW} approach ${approach} ramp ${ramp}`, r = result[key] = {};
            for (const facing of [1, -1]) {
                // ── the clutch ──
                for (const [dur, notLast] of [[1.38, false], [1.38, true], [0.63, false]]) {
                    w.x = 400; w.y = 430; w.facing = facing; w.lying = 'supine'; w.state = 'down'; w._hold = null; w._pain = null;
                    w._handUnderNow = false; w._handPending = false; w._handSkips = 0; w._gripLatch = null; sc.time.now = 10000;
                    const rows = [];
                    const item = { name: 'clutch', part: 'back', lying: 'supine', limb: null, rolls: 0, duration: dur, amp: 1.3 };
                    w._sell = { plan: notLast ? [item, { ...item }] : [item], i: 0, t: 0, facing0: facing };   // not the last clutch: it lets go back to rest, not to the hold
                    for (let t = 0; t <= dur + 1e-9; t += FRAME / 1000) {
                        w._sell.t = t; sc.time.now += FRAME; w.draw(); rows.push(sample());
                    }
                    w._sell = null;
                    r[`clutch ${dur}s${notLast ? ' (not last: lets go to rest)' : ''} facing ${facing}`] = summarize(rows, () => 'clutch');
                }
                // ── the standing release ──
                w.x = 400; w.y = 430; w.facing = facing; w.lying = null; w.state = 'standing'; w._sell = null; w._hold = null;
                w.combatBlend = 0.65; w.moveBlend = 0; w._handUnderNow = true; w._handPending = false; w._handSkips = 0;
                const since = 20000, until = since + 2500;
                w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since, until, planned: true, carried: 1, riseEnd: { arm: 0.3, elbow: 1.1 } };
                w.tweenPose?.('idle', 0, 'Linear');
                const idle = POSES[w.idlePose] ?? POSES.idle;
                for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) w.pose[k] = idle[k] ?? 0;
                const rows = [], hws = [];
                for (let t = since; t <= until + 400; t += FRAME) {
                    sc.time.now = t; w._gripLatch = { on: true, since: 0 };
                    w.draw(); rows.push(sample()); hws.push(+w._recoveryHandWeight().toFixed(3));
                }
                const sum = summarize(rows, row => 'standing');
                sum.swaps.forEach(s => { s.hw = hws[s.frame]; });
                r[`release facing ${facing}`] = sum;
                // ── the standing entry with no carried rise (after a prone rise): the recovery ramps in from the idle pose ──
                w._handUnderNow = false; w._handPending = false; w._handSkips = 0;
                w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since, until, planned: true };
                w.tweenPose?.('idle', 0, 'Linear');
                for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) w.pose[k] = idle[k] ?? 0;
                const ent = [], hwe = [];
                for (let t = since; t <= since + 1200; t += FRAME) { sc.time.now = t; w._gripLatch = { on: true, since: 0 }; w.draw(); ent.push(sample()); hwe.push(+w._recoveryHandWeight().toFixed(3)); }
                const es = summarize(ent, () => 'entry'); es.swaps.forEach(x => { x.hw = hwe[x.frame]; });
                r[`entry (no carried rise) facing ${facing}`] = es;
                w._pain = null;
            }
        }
        Object.assign(A, was); sk._textureConfig.backSell.aroundVia = saved; if (saved) saved.approach = via0;
        return result;
    }, { viaWs, standWs, approaches, ramps, off: !!process.env.AROUND_OFF });
    for (const [key, r] of Object.entries(res)) {
        console.log(`== ${key}`);
        for (const [name, s] of Object.entries(r)) console.log(`  ${name.padEnd(26)} maxStep ${String(s.maxStep).padEnd(5)} after30 ${String(s.stepsAfter30Max).padEnd(5)} @${String(s.maxStepAtFrame).padEnd(4)} swaps ${JSON.stringify(s.swaps.map(x => `${x.to}@${x.ms}ms clr ${x.clearPx}${x.hw !== undefined ? ' hw ' + x.hw : ''}`))} skips ${s.skips} final ${s.finalUnder ? 'under' : 'over'}`);
    }
    if (out) writeFileSync(out, JSON.stringify(res, null, 1));
} finally { await h.close(); }
