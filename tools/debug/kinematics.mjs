// Kinematics probe — per-frame position sampling for the feel audit.
// Measures: walk accel/decel/turn cost, run speed, rope rebound, whip
// rebound, clothesline knockback arc timing, position clamping.
// Run at ts=1 so px/s map directly to gameplay speeds.

import { launch } from './harness.mjs';

const h = await launch();
const page = h.page;

await page.waitForTimeout(600);
await page.keyboard.press('2'); // P2 AI -> keyboard dummy
await page.waitForTimeout(300);

// Install per-frame sampler: wrap scene.update, record post-tick state.
await page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    window.__SAMPLES = [];
    window.__MARKS = [];
    window.__mark = (label) => window.__MARKS.push({ label, t: sc.time.now });
    // scene.update is bound at boot — hook the systems' postupdate event instead
    sc.events.on('postupdate', (t, d) => {
        const f = (w) => ({ x: w.x, y: w.y, st: w.state, fp: w.flipProgress, rp: w.runPhase, fc: w.facing });
        window.__SAMPLES.push({ t: sc.time.now, d, w1: f(sc.w1), w2: f(sc.w2) });
    });
});

const mark = (label) => page.evaluate((l) => window.__mark(l), label);

// ── Test A: walk start / stop ────────────────────────────────────────────────
await mark('A_start');
await page.keyboard.down('d');
await page.waitForTimeout(1000);
await mark('A_release');
await page.keyboard.up('d');
await page.waitForTimeout(600);

// ── Test B: turn-around (walk left after facing right) ──────────────────────
await mark('B_start');
await page.keyboard.down('a');
await page.waitForTimeout(800);
await page.keyboard.up('a');
await mark('B_end');
await page.waitForTimeout(400);

// ── Test B2: live reversal (plant-and-turn, no stop in between) ─────────────
// Ramp to full speed one way, then swap input direction without ever
// releasing, and check velocity passes back through ~0 before it builds up
// the other way — a real mid-motion reversal, unlike Test B's fresh start.
await mark('B2_start');
await page.keyboard.down('d');
await page.waitForTimeout(400); // reach steady rightward speed first
await mark('B2_swap');
await page.keyboard.up('d');
await page.keyboard.down('a');
await page.waitForTimeout(400);
await page.keyboard.up('a');
await mark('B2_end');
await page.waitForTimeout(300);

// ── Test C: self-run + rope rebound ──────────────────────────────────────────
await mark('C_start');
await page.keyboard.press('r');
// wait until run completes
for (let i = 0; i < 100; i++) {
    const s = await h.snap();
    if (s.w1.st === 'standing' && i > 5) break;
    await page.waitForTimeout(100);
}
await mark('C_end');

// ── Test D: lockup -> whip -> clothesline knockback ──────────────────────────
// approach P2
async function approach(dist) {
    for (let i = 0; i < 120; i++) {
        const s = await h.snap();
        const dx = s.w2.x - s.w1.x, dy = s.w2.y - s.w1.y;
        if (Math.hypot(dx, dy) <= dist) break;
        if (dx > 6) { await page.keyboard.down('d'); } else { await page.keyboard.up('d'); }
        if (dx < -6) { await page.keyboard.down('a'); } else { await page.keyboard.up('a'); }
        if (dy > 6) { await page.keyboard.down('s'); } else { await page.keyboard.up('s'); }
        if (dy < -6) { await page.keyboard.down('w'); } else { await page.keyboard.up('w'); }
        await page.waitForTimeout(50);
    }
    for (const k of ['d', 'a', 's', 'w']) await page.keyboard.up(k);
}
await approach(85);
// jam into opponent
{
    const s = await h.snap();
    await page.keyboard.down(s.w2.x >= s.w1.x ? 'd' : 'a');
    await page.waitForTimeout(450);
    for (const k of ['d', 'a']) await page.keyboard.up(k);
}
await mark('D_lockup');
await page.keyboard.down('f'); await page.waitForTimeout(90); await page.keyboard.up('f');
await page.waitForTimeout(250);
await page.keyboard.down('d');
await page.keyboard.down('f'); await page.waitForTimeout(90); await page.keyboard.up('f');
await page.keyboard.up('d');
await mark('D_whip');
// clothesline the rebound
try {
    for (let i = 0; i < 100; i++) {
        const s = await h.snap();
        if (s.w2.st === 'running' && s.w2.rp === 'returning' && Math.abs(s.w2.x - s.w1.x) < 120) break;
        await page.waitForTimeout(40);
    }
    await mark('D_clothesline');
    await page.keyboard.down('f'); await page.waitForTimeout(90); await page.keyboard.up('f');
} catch (e) { console.log('clothesline setup failed:', e.message); }
await page.waitForTimeout(1500);
await mark('D_end');

// ── Fetch + analyze ───────────────────────────────────────────────────────────
const { samples, marks } = await page.evaluate(() => ({ samples: window.__SAMPLES, marks: window.__MARKS }));
await h.close();

console.log(`samples: ${samples.length}, avg dt: ${(samples.reduce((a, s) => a + s.d, 0) / samples.length).toFixed(1)}ms`);
const M = {};
for (const m of marks) M[m.label] = m.t;

function seg(from, to) {
    return samples.filter(s => s.t >= M[from] && s.t < (M[to] ?? Infinity));
}
function vels(ss, who) {
    const out = [];
    for (let i = 1; i < ss.length; i++) {
        const dt = (ss[i].t - ss[i - 1].t) / 1000;
        if (dt <= 0) continue;
        out.push({
            t: ss[i].t, dt,
            vx: (ss[i][who].x - ss[i - 1][who].x) / dt,
            vy: (ss[i][who].y - ss[i - 1][who].y) / dt,
            st: ss[i][who].st, fp: ss[i][who].fp, rp: ss[i][who].rp, fc: ss[i][who].fc,
            x: ss[i][who].x, y: ss[i][who].y,
        });
    }
    return out;
}

// A: acceleration profile
{
    const v = vels(seg('A_start', 'B_start'), 'w1');
    const moving = v.filter(x => Math.abs(x.vx) > 1);
    const first = v.findIndex(x => Math.abs(x.vx) > 1);
    console.log('\n== A: WALK START/STOP ==');
    console.log('first 6 moving-frame vx (px/s):', moving.slice(0, 6).map(x => x.vx.toFixed(0)).join(', '));
    const steady = moving.slice(3, 20).reduce((a, x) => a + x.vx, 0) / Math.max(1, moving.slice(3, 20).length);
    console.log('steady vx:', steady.toFixed(1));
    // time-to-full-speed: first moving frame -> first frame at/above 90% of steady
    const startT = moving[0]?.t;
    const fullIdx = moving.findIndex(x => Math.abs(x.vx) >= 0.9 * Math.abs(steady));
    if (startT != null && fullIdx >= 0) {
        console.log(`time to 90% steady speed: ${(moving[fullIdx].t - startT).toFixed(0)}ms (frame ${fullIdx + 1})`);
    }
    // stop: find release
    const relIdx = v.findIndex(x => x.t >= M['A_release']);
    console.log('vx frames around release:', v.slice(Math.max(0, relIdx - 2), relIdx + 5).map(x => x.vx.toFixed(0)).join(', '));
    // brake time/distance: release -> first frame with ~0 vx
    if (relIdx >= 0) {
        const stopIdx = v.findIndex((x, i) => i >= relIdx && Math.abs(x.vx) < 3);
        if (stopIdx >= 0) {
            const brakeMs = v[stopIdx].t - M['A_release'];
            const brakeDist = v[stopIdx].x - v[relIdx].x;
            console.log(`brake time (release -> ~0 vx): ${brakeMs.toFixed(0)}ms, brake distance: ${brakeDist.toFixed(1)}px`);
        } else {
            console.log('brake time: did not reach ~0 vx before segment end');
        }
    }
}

// B: turn (fresh start in the opposite direction, from a stop)
{
    const v = vels(seg('B_start', 'C_start'), 'w1');
    const first = v.findIndex(x => x.vx < -1);
    console.log('\n== B: TURN-AROUND (from a stop) ==');
    console.log('facing before/after first left frame:', v[Math.max(0, first - 1)]?.fc, '->', v[first]?.fc);
    console.log('first 5 vx after turn:', v.slice(first, first + 5).map(x => x.vx.toFixed(0)).join(', '));
}

// B2: live reversal — analyze the drive captured above (Test B2 section)
{
    const vv = vels(seg('B2_start', 'C_start'), 'w1');
    console.log('\n== B2: LIVE REVERSAL (plant-and-turn, no stop between) ==');
    const preSwap = vv.filter(x => x.t < M['B2_swap']).slice(-3);
    console.log('vx just before swap:', preSwap.map(x => x.vx.toFixed(0)).join(', '));
    const postSwap = vv.filter(x => x.t >= M['B2_swap']);
    console.log('vx after swap (full profile):', postSwap.map(x => x.vx.toFixed(0)).join(', '));
    const zeroIdx = postSwap.findIndex(x => Math.abs(x.vx) < 5);
    if (zeroIdx >= 0) {
        console.log(`crosses ~0 vx at ${(postSwap[zeroIdx].t - M['B2_swap']).toFixed(0)}ms after swap`);
    } else {
        console.log('WARNING: never dipped near 0 vx after the swap — instant flip, not a reversal');
    }
    const newSteadyIdx = postSwap.findIndex(x => x.vx < -90);
    if (newSteadyIdx >= 0) {
        console.log(`reaches new-direction speed at ${(postSwap[newSteadyIdx].t - M['B2_swap']).toFixed(0)}ms after swap`);
    }
}

// C: run + rebound
{
    const v = vels(seg('C_start', 'D_lockup'), 'w1');
    const run = v.filter(x => x.st === 'running');
    console.log('\n== C: SELF-RUN + ROPE REBOUND ==');
    const toRope = run.filter(x => x.rp === 'toRope');
    const ret = run.filter(x => x.rp === 'returning');
    console.log('toRope avg vx:', (toRope.reduce((a, x) => a + x.vx, 0) / Math.max(1, toRope.length)).toFixed(0),
        ' returning avg vx:', (ret.reduce((a, x) => a + x.vx, 0) / Math.max(1, ret.length)).toFixed(0));
    // find the bounce: sign change
    for (let i = 1; i < run.length; i++) {
        if (Math.sign(run[i].vx) !== Math.sign(run[i - 1].vx) && Math.abs(run[i - 1].vx) > 50) {
            console.log(`rebound: vx ${run[i - 1].vx.toFixed(0)} -> ${run[i].vx.toFixed(0)} in ONE frame (dt ${(run[i].dt * 1000).toFixed(0)}ms)`);
            break;
        }
    }
    // post-run stop
    const stopIdx = v.findIndex((x, i) => i > 0 && v[i - 1].st === 'running' && x.st === 'standing');
    if (stopIdx > 0) console.log('vx frames at run->standing:', v.slice(stopIdx - 2, stopIdx + 3).map(x => `${x.vx.toFixed(0)}(${x.st})`).join(', '));
}

// D: whip + clothesline knockback
{
    const v = vels(seg('D_whip', 'D_end'), 'w2');
    console.log('\n== D: WHIP + CLOTHESLINE KNOCKBACK (victim w2) ==');
    const run = v.filter(x => x.st === 'running');
    console.log('whipped run avg |vx|:', (run.reduce((a, x) => a + Math.abs(x.vx), 0) / Math.max(1, run.length)).toFixed(0));
    const flip = v.filter(x => x.st === 'flipping');
    if (flip.length) {
        console.log('flip frames:', flip.length, 'duration:', ((flip[flip.length - 1].t - flip[0].t)).toFixed(0), 'ms');
        console.log('flip vx profile:', flip.map(x => x.vx.toFixed(0)).join(', '));
        console.log('flip fp profile:', flip.map(x => x.fp.toFixed(2)).join(', '));
        // arc: visual height = sin(fp*pi)*85s. rise time = time to fp 0.5
        const half = flip.find(x => x.fp >= 0.5);
        if (half) {
            const rise = half.t - flip[0].t;
            const total = flip[flip.length - 1].t - flip[0].t;
            console.log(`arc rise ${rise.toFixed(0)}ms vs fall ${(total - rise).toFixed(0)}ms`);
        }
        const pre = v.filter(x => x.st === 'running').slice(-3);
        console.log('victim |vx| last 3 running frames:', pre.map(x => Math.abs(x.vx).toFixed(0)).join(', '));
    } else {
        console.log('no flip captured (clothesline missed)');
    }
}

// bounds check across all samples
{
    let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9;
    for (const s of samples) for (const w of [s.w1, s.w2]) {
        minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y);
        minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x);
    }
    console.log(`\nposition ranges: x [${minX.toFixed(0)}, ${maxX.toFixed(0)}], y [${minY.toFixed(0)}, ${maxY.toFixed(0)}] (ring y clamp is [278, 425])`);
}
