// Gait film and metrics (PLAN_GAIT Stage 1, T1.1). Measures today's walk and run; changes nothing.
//
//   WFM_URL=http://localhost:5173 node tools/debug/gait_film.mjs [scenario|all] [rig|all] [outRoot]
//     scenario: walk (walk toward the other rig, stop, back away, stop) | run (run key: to the ropes, rebound, back)
//               | whip (the subject is Irish-whipped by the other rig)
//     rig:      thesz-procreate-v1 | george-roster-v1
//
// Like aftermath_film.mjs the page is driven by hand: the Phaser loop is put to sleep right after
// init and the game advances in fixed 1/60 s steps (game.step), so every frame is a known game time
// and screenshots never race the clock. The seed (Math.random, mulberry32) is installed with
// page.addInitScript BEFORE any game code runs and recorded in the manifest. Nothing in src/ is
// touched; the only game-side calls are key presses, plus `_doIrishWhip` for the whip scenario
// (the whip is a grapple chain; the call is the move's own entry point).
//
// Output: <outRoot>/<rig>/<facing>/<scenario>/{manifest.json, metrics.json, loop.webp, strip.png, frames/}
//   loop.webp  normal speed: a 30 fps capture (every 2nd step) played at 30 fps
//   strip.png  12 frames over one steady cycle
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { launch } from './harness.mjs';

export const SEED = 0x5eed1234;
const RIGS = ['thesz-procreate-v1', 'george-roster-v1'];
const SCENARIOS = ['walk', 'run', 'whip'];
const STEP_MS = 1000 / 60;
const CAPTURE_EVERY = 2;
const CROP = { w: 440, h: 300 };
const TAU = Math.PI * 2;

const INIT_SCRIPT = `(() => { let a = ${SEED}; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

// In-page: put the loop to sleep, park the pair, install the step/sample function.
const SETUP = ({ subjectX, subjectY, facing, otherX, otherY }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0];
    game.loop.sleep();
    sc.tweens.getDelta = () => 1000 / 60;
    const w = sc.w1, o = sc.w2;
    w.x = subjectX; w.y = subjectY; w.facing = facing;
    o.x = otherX; o.y = otherY;
    const st = (window.__gait = { T: sc.time.now, prev: { x: w.x, y: w.y } });
    st.step = () => {
        st.T += 1000 / 60;
        game.step(st.T, 1000 / 60);
        const sk = w.skeleton, p = sk.jointAttachmentPoints ?? {};
        const hip = sk._hipPivot?.() ?? null;
        const f = q => q ? { x: +q.x.toFixed(3), y: +q.y.toFixed(3), planted: q.planted } : null;
        const out = {
            now: sc.time.now, x: +w.x.toFixed(3), y: +w.y.toFixed(3), state: w.state, runPhase: w.runPhase, facing: w.facing,
            hs: w._heightScale ?? 1, moveBlend: +w.moveBlend.toFixed(4), walkPhase: +w.walkPhase.toFixed(4), s: w.s,
            near: f(sk.nearFoot), far: f(sk.farFoot), hipY: hip ? +hip.y.toFixed(3) : null, hipX: hip ? +hip.x.toFixed(3) : null,
            torsoRot: +(sk.torso?.rotation ?? 0).toFixed(4), pose: !!w.pose,
        };
        return out;
    };
    return { x: w.x, y: w.y, s: w.s, ring: null };
};

const FRAME_STATE = () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    return { x: sc.w1.x, y: sc.w1.y, f: sc.w1.facing };
};

function gitInfo() {
    const sh = c => execSync(c, { encoding: 'utf8' }).trim();
    return { commit: sh('git rev-parse --short HEAD'), dirty: sh('git status --porcelain --untracked-files=no') !== '' };
}

// ── metrics ──────────────────────────────────────────────────────────────────
const round = (v, d = 2) => v == null ? null : +v.toFixed(d);
const median = a => { if (!a.length) return null; const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };

// Contiguous planted runs of one foot -> [{from,to}] (sample indices, inclusive)
function stances(samples, foot) {
    const out = [];
    let start = null;
    samples.forEach((s, i) => {
        const p = s[foot]?.planted === true;
        if (p && start === null) start = i;
        if (!p && start !== null) { out.push({ from: start, to: i - 1 }); start = null; }
    });
    if (start !== null) out.push({ from: start, to: samples.length - 1 });
    return out;
}

// Segment label per sample from the driver, e.g. 'walkR', 'stop1'; steady = |v| near its plateau.
function analyse(samples, labels, dt) {
    const v = samples.map((s, i) => i ? (s.x - samples[i - 1].x) / dt : 0);
    const out = { segments: {} };
    for (const seg of [...new Set(labels)]) {
        const idx = labels.map((l, i) => l === seg ? i : -1).filter(i => i >= 0);
        const sub = idx.map(i => samples[i]);
        if (sub.length < 6) continue;
        const sp = idx.map(i => Math.abs(v[i]));
        const vmax = Math.max(...sp);
        // steady = within 3% of the segment's top speed
        const steadyIdx = idx.filter(i => Math.abs(v[i]) > vmax * 0.97);
        const m = { frames: idx.length, vmax: round(vmax, 1), heightScale: sub[0].hs };
        if (steadyIdx.length >= 10) {
            const a = steadyIdx[0], b = steadyIdx.at(-1);
            const win = samples.slice(a, b + 1);
            const T = (b - a + 1) * dt;
            const per = {};
            const allDrift = [];
            const stanceLens = [];
            let plantOnsets = 0;
            for (const foot of ['near', 'far']) {
                const st = stances(win, foot).filter(r => r.from > 0 && r.to < win.length - 1); // whole stances only
                const drifts = st.map(r => {
                    const xs = win.slice(r.from, r.to + 1).map(s => s[foot].x);
                    return Math.max(...xs) - Math.min(...xs);
                });
                // net signed travel of the planted foot over its stance
                const net = st.map(r => win[r.to][foot].x - win[r.from][foot].x);
                allDrift.push(...drifts);
                st.forEach(r => stanceLens.push(r.to - r.from + 1));
                plantOnsets += st.length;
                per[foot] = { stances: st.length, driftMedian: round(median(drifts)), driftMax: round(Math.max(0, ...drifts)), netMedian: round(median(net)) };
            }
            const bothUp = win.filter(s => s.near.planted === false && s.far.planted === false).length;
            const bothDown = win.filter(s => s.near.planted === true && s.far.planted === true).length;
            const nearDown = win.filter(s => s.near.planted === true).length;
            // all plants (incl. partial at the edges) / duration -> steps per second
            const onsets = ['near', 'far'].reduce((n, foot) => n + stances(win, foot).filter(r => r.from > 0).length, 0);
            const hip = win.map(s => s.hipY);
            const hipMean = hip.reduce((p, q) => p + q, 0) / hip.length;
            // mid-stance of the near foot: sample of the stance's middle; phase vs hip max/min
            const ns = stances(win, 'near').filter(r => r.from > 0 && r.to < win.length - 1);
            const hipAt = i => win[i].hipY;
            const midHip = ns.length ? median(ns.map(r => hipAt(Math.round((r.from + r.to) / 2)) - hipMean)) : null;
            Object.assign(m, {
                steadyFrames: win.length, perFoot: per, driftMedian: round(median(allDrift)), driftMax: round(Math.max(0, ...allDrift)),
                cadenceStepsPerS: round(onsets / T, 2),
                stanceFraction: round(nearDown / win.length, 3), doubleSupportFraction: round(bothDown / win.length, 3), flightFraction: round(bothUp / win.length, 3),
                stanceFrames: round(median(stanceLens), 1),
                hipBobPx: round(Math.max(...hip) - Math.min(...hip)),
                hipAtNearMidStancePx: round(midHip), // + = lower than mean (y down). Walk model: hip highest mid-stance -> negative
                hipMax: round(Math.max(...hip) - hipMean), hipMin: round(Math.min(...hip) - hipMean),
                moveBlend: round(median(win.map(s => s.moveBlend)), 3), torsoRotMedian: round(median(win.map(s => s.torsoRot)), 4),
                phaseRadPerPx: round(median(win.slice(1).map((s, i) => { const dx = Math.abs(s.x - win[i].x) ; let dp = Math.abs(s.walkPhase - win[i].walkPhase); if (dp > Math.PI) dp = TAU - dp; return dx > 0.05 ? dp / dx * s.s : null; }).filter(q => q != null)), 5),
                bodyXPerFootSweepRatio: null,
            });
            // planted-foot world speed vs body speed (skating): mean |dFootX/dt| while planted, in px/s
            const fv = [];
            for (const foot of ['near', 'far']) for (let i = 1; i < win.length; i++) if (win[i][foot].planted && win[i - 1][foot].planted) fv.push(Math.abs(win[i][foot].x - win[i - 1][foot].x) / dt);
            m.plantedFootSpeedMedian = round(median(fv), 1);
            m.plantedFootSpeedPctOfBody = round(median(fv) / vmax * 100, 1);
        }
        out.segments[seg] = m;
    }
    return out;
}

// Feet moving while the body stands still: stop segment, frames after |v| < 0.5 px/s... world foot travel per foot.
function stopSlide(samples, labels, dt, seg) {
    const idx = labels.map((l, i) => l === seg ? i : -1).filter(i => i > 0);
    if (!idx.length) return null;
    const still = idx.filter(i => Math.abs(samples[i].x - samples[i - 1].x) / dt < 0.5 && Math.abs(samples[i].y - samples[i - 1].y) / dt < 0.5);
    if (!still.length) return { stillFrames: 0 };
    const a = still[0], b = still.at(-1);
    const travel = foot => { let t = 0; for (let i = a + 1; i <= b; i++) t += Math.abs(samples[i][foot].x - samples[i - 1][foot].x); return round(t); };
    const net = foot => round(samples[b][foot].x - samples[a][foot].x);
    const ph = samples.slice(a, b + 1).map(s => s.walkPhase);
    return { stillFrames: still.length, bodyMovedPx: round(Math.abs(samples[b].x - samples[a].x), 3), footTravelPx: { near: travel('near'), far: travel('far') }, footNetPx: { near: net('near'), far: net('far') },
        walkPhaseStart: round(ph[0], 3), walkPhaseEnd: round(ph.at(-1), 3) };
}

// ── driver ───────────────────────────────────────────────────────────────────
async function filmRun(scenario, rig, facing, outRoot, ringInfo) {
    const other = rig === 'george-roster-v1' ? 'thesz-procreate-v1' : 'george-roster-v1';
    process.env.WFM_P1 = rig; process.env.WFM_P2 = other;
    process.env.WFM_QS = 'notitle=1&sellart=off&aftermath=off';
    const dir = join(outRoot, rig, facing > 0 ? 'right' : 'left', scenario);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, 'frames'), { recursive: true });

    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(500);
        const b = await page.evaluate(async () => {
            const c = await import('/src/constants.js');
            const sc = window.__WFM_GAME.scene.scenes[0];
            return { ...c.ringBoundsAtY(360), s: sc.w1.s };
        });
        // the game turns each wrestler to face the other, so `facing` is set by parking the other rig at that end, back row, out of frame
        const mid = (b.left + b.right) / 2;
        await page.evaluate(SETUP, { subjectX: mid - facing * 150, subjectY: 360, facing, otherX: facing > 0 ? b.right - 20 : b.left + 20, otherY: 150 });
        const kDir = facing > 0 ? 'd' : 'a', kRev = facing > 0 ? 'a' : 'd';

        const samples = [], labels = [], shots = [];
        let step = 0, held = new Set();
        const keys = async want => {
            for (const k of [...held]) if (!want.includes(k)) { await page.keyboard.up(k); held.delete(k); }
            for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
        };
        const clipFor = (canvasBox, x, y) => {
            const cx = canvasBox.x + x * canvasBox.w / canvasBox.gw, bottom = canvasBox.y + (y + 70) * canvasBox.h / canvasBox.gh;
            return { x: Math.max(0, Math.min(1100 - CROP.w, Math.round(cx - CROP.w / 2))), y: Math.max(0, Math.min(700 - CROP.h, Math.round(bottom - CROP.h))), width: CROP.w, height: CROP.h };
        };
        const canvasBox = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize;
            return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        let lastClip = null;
        const run = async (label, n, want = [], until = null) => {
            await keys(want);
            for (let i = 0; i < n; i++) {
                const s = await page.evaluate(() => window.__gait.step());
                samples.push(s); labels.push(label);
                if (step % CAPTURE_EVERY === 0) {
                    // camera follows the subject's x at a fixed per-segment anchor so the foot reads against the mat
                    const clip = clipFor(canvasBox, s.x, s.y);
                    lastClip = clip;
                    const file = `f${String(shots.length).padStart(4, '0')}.png`;
                    await page.screenshot({ path: join(dir, 'frames', file), clip });
                    shots.push({ file, step, label });
                }
                step++;
                if (until && until(s)) return;
            }
        };

        if (scenario === 'walk') {
            await run('idle0', 20);
            await run('walkA', 150, [kDir]);          // ~2.5 s at 140 px/s
            await run('stop1', 40, []);
            await run('walkB', 150, [kRev]);          // back away (the game keeps facing the other rig)
            await run('stop2', 40, []);
        } else if (scenario === 'run') {
            await run('idle0', 20);
            await run('face', 8, [kDir]); await run('faceStop', 40, []); // face the way we want; run goes to the rope behind
            await keys(['r']); await run('runKey', 2, ['r']); await keys([]);
            await run('toRope', 400, [], s => s.runPhase === 'returning');
            await run('returning', 600, [], s => s.state === 'standing');
            await run('after', 40, []);
        } else if (scenario === 'whip') {
            // the other rig (w2) is the whipper; the subject (w1) is whipped away from it
            await page.evaluate(facing => {
                const sc = window.__WFM_GAME.scene.scenes[0];
                sc.w2.x = sc.w1.x - facing * 60; sc.w2.y = sc.w1.y; sc.w2.facing = facing; sc.w1.facing = -facing;
                window.__gait.whipDir = facing;
            }, facing);
            await run('idle0', 20);
            await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w2._doIrishWhip(sc.w1, window.__gait.whipDir); });
            await run('toRope', 400, [], s => s.runPhase === 'returning');
            await run('returning', 600, [], s => s.state === 'standing');
            await run('after', 40, []);
        }
        await keys([]);

        const dt = STEP_MS / 1000;
        const metrics = { scenario, rig, facing, ...analyse(samples, labels, dt), stopSlide: {} };
        for (const seg of ['stop1', 'stop2', 'after', 'faceStop']) { const r = stopSlide(samples, labels, dt, seg); if (r) metrics.stopSlide[seg] = r; }
        const ti = labels.indexOf('returning');
        if (ti > 12) {
            const w = samples.slice(ti - 12, ti + 13);
            const jump = (f) => Math.max(...w.slice(1).map((q, i) => Math.abs(f(q) - f(w[i]))));
            metrics.ropeTurn = { windowFrames: w.length, maxFootStepPx: round(Math.max(jump(q => q.near.x - q.x), jump(q => q.far.x - q.x))), maxHipStepPx: round(jump(q => q.hipY)),
                maxFootLiftStepPx: round(Math.max(jump(q => q.near.y), jump(q => q.far.y))), bodyXAtTurn: samples[ti].x, facingBefore: samples[ti - 1].facing, facingAfter: samples[ti].facing,
                plantedFootWorldSlipPx: round(Math.max(...['near', 'far'].map(f => { const xs = w.filter(q => q[f].planted).map(q => q[f].x - q.x); return xs.length ? Math.max(...xs) - Math.min(...xs) : 0; }))) };
        }
        // D / lean: the Wrestler.draw coefficient (read from source in the viewer table), measured torso rotation here
        writeFileSync(join(dir, 'metrics.json'), JSON.stringify(metrics, null, 1));
        writeFileSync(join(dir, 'samples.json'), JSON.stringify({ labels, samples }));

        // loop.webp at normal speed (30 fps capture, 33.3 ms per frame) and a 12-frame strip over one steady cycle
        const strip = pickStrip(metrics, samples, labels, shots);
        writeFileSync(join(dir, 'frames.json'), JSON.stringify({ shots, strip }));
        execSync(`python3 -I tools/debug/gait_pack.py ${JSON.stringify(dir)}`, { stdio: 'inherit' });
        rmSync(join(dir, 'frames'), { recursive: true, force: true });

        const manifest = {
            tool: 'tools/debug/gait_film.mjs', git: gitInfo(), scenario, rig, facing, casts: { p1: rig, p2: other },
            seed: { value: SEED, algo: 'mulberry32', installedBefore: 'game init (page.addInitScript)', math: 'Math.random' },
            stepMs: +STEP_MS.toFixed(4), captureEverySteps: CAPTURE_EVERY, urlFlags: process.env.WFM_QS, ring: b, crop: CROP, frames: shots.length, steps: step,
            otherAtEnd: await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; return { x: sc.w2.x, y: sc.w2.y, state: sc.w2.state }; }),
            segments: Object.fromEntries([...new Set(labels)].map(l => [l, labels.filter(x => x === l).length])),
        };
        writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
        const wk = metrics.segments.walkA ?? metrics.segments.returning ?? metrics.segments.toRope ?? {};
        console.log(`[gait] ${rig} ${facing > 0 ? 'R' : 'L'} ${scenario}: vmax ${wk.vmax} drift med/max ${wk.driftMedian}/${wk.driftMax} cadence ${wk.cadenceStepsPerS} flight ${wk.flightFraction}`);
        return metrics;
    } finally {
        await h.close();
    }
}

// 12 capture indices spanning one full cycle (two steps) of the steady segment: from a near-foot plant onset
function pickStrip(metrics, samples, labels, shots) {
    const segName = labels.includes('walkA') ? 'walkA' : labels.includes('toRope') ? 'toRope' : null;
    if (!segName) return [];
    const m = metrics.segments[segName];
    if (!m || !m.cadenceStepsPerS) return [];
    const idx = labels.map((l, i) => l === segName ? i : -1).filter(i => i >= 0);
    const mid = idx[Math.floor(idx.length * 0.6)];
    const cycleFrames = Math.round(60 * 2 / m.cadenceStepsPerS); // one cycle = two steps
    // start at the next near-foot plant onset after mid
    let start = mid;
    for (let i = mid + 1; i < samples.length; i++) if (samples[i].near.planted && !samples[i - 1].near.planted) { start = i; break; }
    return Array.from({ length: 12 }, (_, k) => Math.round(start + k * cycleFrames / 12))
        .map(si => { const j = shots.findIndex(s => s.step >= si); return j < 0 ? shots.length - 1 : j; });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [scArg = 'all', rigArg = 'all', outRoot = 'research/animation/gait-2026-10/g1'] = process.argv.slice(2);
    const scenarios = scArg === 'all' ? SCENARIOS : [scArg];
    const rigs = rigArg === 'all' ? RIGS : [rigArg];
    mkdirSync(outRoot, { recursive: true });
    const initPath = join(outRoot, 'seed-init.js');
    writeFileSync(initPath, INIT_SCRIPT);
    process.env.WFM_INIT_SCRIPT = initPath;
    for (const rig of rigs) for (const sc of scenarios) for (const facing of [1, -1]) await filmRun(sc, rig, facing, outRoot);
    process.exit(0);
}
