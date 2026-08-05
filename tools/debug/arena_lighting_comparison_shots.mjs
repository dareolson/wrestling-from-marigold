// Evidence capture for the arena-lighting experiment — see
// ARENA_LIGHTING_AND_DEPTH_CONCEPTS.md's "Visual verification is the central
// gate" section. Produces the controlled before/after frames that section
// calls for, at identical camera/viewport settings (same harness as
// tools/debug/shot.mjs), into ARENA_LIGHTING_EVIDENCE/ at the repo root.
//
//   node tools/debug/arena_lighting_comparison_shots.mjs
//
// Input helpers (hold/tap/approach) are intentionally duplicated from
// play.mjs rather than imported — play.mjs doesn't export them, and this is
// a one-scenario evidence script, not a second scenario runner.
import { launch } from './harness.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../../ARENA_LIGHTING_EVIDENCE', import.meta.url));
fs.mkdirSync(DIR, { recursive: true });

const HELD = new Set();
async function hold(page, key) { if (HELD.has(key)) return; HELD.add(key); await page.keyboard.down(key); }
async function release(page, key) { if (!HELD.delete(key)) return; await page.keyboard.up(key); }
async function releaseAll(page) { for (const k of [...HELD]) await release(page, k); }
async function tap(page, key, ms = 90) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }

async function approach(h, dist, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const s = await h.snap();
        const dx = s.w2.x - s.w1.x, dy = s.w2.y - s.w1.y;
        if (Math.hypot(dx, dy) <= dist) { await releaseAll(h.page); return s; }
        await (dx > 6 ? hold : release)(h.page, 'd');
        await (dx < -6 ? hold : release)(h.page, 'a');
        await (dy > 6 ? hold : release)(h.page, 's');
        await (dy < -6 ? hold : release)(h.page, 'w');
        await h.page.waitForTimeout(50);
    }
    await releaseAll(h.page);
    throw new Error(`approach(${dist}) timed out`);
}
async function jam(h, ms = 450) {
    const s = await h.snap();
    await hold(h.page, s.w2.x >= s.w1.x ? 'd' : 'a');
    await h.page.waitForTimeout(ms);
    await releaseAll(h.page);
}
async function until(h, pred, label, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const s = await h.snap();
        if (pred(s)) return s;
        await h.page.waitForTimeout(60);
    }
    throw new Error(`until(${label}) timed out`);
}

async function shot(label, { drive } = {}) {
    const h = await launch();
    // Title card runs fade-in(900) + hold(3200) + fade-out(1400) = 5.5s
    // (showTitleCard) — wait it out before driving/shooting.
    await h.page.waitForTimeout(5700);
    if (drive) await drive(h);
    const path = `${DIR}/${label}.png`;
    await h.screenshot(path);
    await h.close();
    console.log(`  ${label}.png`);
    return path;
}

console.log('Arena lighting evidence capture');

// 1. Baseline — lighting experiment off, idle stand-off.
process.env.WFM_QS = 'lighting=0';
await shot('01_baseline_idle');

// 2. Lighting on, idle stand-off — same camera/state as (1), only the
// ?lighting toggle differs.
delete process.env.WFM_QS;
await shot('02_lighting_idle');

// 3. Lighting on, mid-move (jab exchange) — representative standing move.
await shot('03_lighting_move_jab', {
    drive: async h => {
        await approach(h, 85);
        await jam(h);
        await tap(h.page, 'g');
        await h.page.waitForTimeout(120); // land mid-strike, not the recovery frame
    },
});

// 4. Lighting on, rope-press/sag frame — irish whip sends w2 into the ropes,
// triggering the same real spring-sag (triggerRopeBounce) the rope-shadow
// pass reads its points from every frame.
await shot('04_lighting_rope_bounce', {
    drive: async h => {
        await approach(h, 85);
        await jam(h);
        await tap(h.page, 'f'); // lockup
        await h.page.waitForTimeout(250);
        await hold(h.page, 'd');
        await tap(h.page, 'f'); // irish whip — w2 runs into the far ropes and bounces
        await releaseAll(h.page);
        // 'returning' means w2 has already hit the ropes and triggered the
        // real spring sag (triggerRopeBounce) — shoot right as that flips.
        await until(h, s => s.w2.st === 'running' && s.w2.rp === 'returning', 'w2 returning off the ropes');
        await h.page.waitForTimeout(60); // just past the bounce, ropes still visibly oscillating
    },
});

// 5. Roles swapped (george attacks, thesz defends) + a beat further into the
// match — spot-checks the other character pairing and both ring sides for
// layering problems, not just the default p1/p2 stand-off.
process.env.WFM_P1 = 'george';
process.env.WFM_P2 = 'thesz';
await shot('05_lighting_roles_swapped', {
    drive: async h => { await approach(h, 200); },
});
delete process.env.WFM_P1;
delete process.env.WFM_P2;

console.log(`Done — see ${DIR}`);
