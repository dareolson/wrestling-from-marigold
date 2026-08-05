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

// --- Round 3 close crops --------------------------------------------------
// Game canvas is 960x600 (see src/constants.js), rendered into the harness's
// 1100x700 viewport under Phaser.Scale.FIT + CENTER_BOTH — uniform scale,
// letterboxed vertically only. toScreen() maps a game-space rect to the
// screenshot-space `clip` box these crops need.
const SCALE = Math.min(1100 / 960, 700 / 600);
const OFFSET_Y = (700 - 600 * SCALE) / 2;
const toScreen = (x, y, w, h) => ({ x: x * SCALE, y: y * SCALE + OFFSET_Y, width: w * SCALE, height: h * SCALE });

async function crop(label, rect, { qs } = {}) {
    if (qs) process.env.WFM_QS = qs; else delete process.env.WFM_QS;
    const h = await launch();
    await h.page.waitForTimeout(5700);
    await h.screenshot(`${DIR}/${label}.png`, toScreen(...rect));
    await h.close();
    console.log(`  ${label}.png`);
}

// 7. Mat center, tight crop — the orb-elimination proof. Wide enough to show
// the pool reading as a broad, even exposure plateau with no small bright
// core/bullseye/ring-stepping at the middle.
await crop('07_mat_center_crop', [330, 260, 300, 220]);

// 8-10. Rope shadow vs. visible rope, same frame, for a direct thickness
// comparison per side — see ROPE_SHADOW's comment in arenaLighting.js for
// the target (shadow close to the rope's own rendered width).
await crop('08_near_rope_crop', [380, 365, 300, 55]);
await crop('09_far_rope_crop', [350, 195, 300, 130]);
await crop('10_side_rope_crop', [52, 221, 192, 186]);

// 11. Dust catching a beam — polls live dustMote alpha (boosted by
// beamInfluenceAt in arenaLighting.js when a mote sits inside a shaft;
// ambient peak is ~0.1-0.2, beam-caught motes run well above that) and
// grabs a tight crop around the brightest one seen in a ~20s window rather
// than a fixed timestamp, since mote spawn/position is randomized.
{
    delete process.env.WFM_QS;
    const h = await launch();
    await h.page.waitForTimeout(5700);
    let best = null;
    for (let i = 0; i < 70; i++) {
        await h.page.waitForTimeout(500);
        const motes = await h.page.evaluate(() => {
            const sc = window.__WFM_GAME?.scene?.scenes?.[0];
            if (!sc) return [];
            return sc.children.list
                .filter(o => o.texture?.key === 'dustMote')
                .map(o => ({ x: o.x, y: o.y, alpha: o.alpha }));
        });
        for (const m of motes) {
            if (m.alpha > (best?.alpha ?? 0)) {
                best = m;
                await h.screenshot(`${DIR}/11_dust_in_beam_crop.png`, toScreen(best.x - 130, best.y - 100, 260, 200));
            }
        }
    }
    await h.close();
    console.log(`  11_dust_in_beam_crop.png (best mote alpha ${best?.alpha?.toFixed(2)})`);
}

console.log(`Done — see ${DIR}`);
