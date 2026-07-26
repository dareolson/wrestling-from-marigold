// Side-by-side comparison gate screenshots: shipped George (P1) vs. the
// george-ai-pilot art swap (P2), same pose/state, both in frame at once —
// see AI_HANDOFF_ENTRIES/2026-07-25-codex-george-ai-pilot-review.md's
// "Required comparison gate" list.
//
//   node tools/debug/pilot_comparison_shots.mjs
//
// Writes numbered PNGs to tools/debug/shots/pilot-comparison/.

import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// WFM_PILOT_PRESET (2026-07-25, v4 modular-source candidate): optional
// override so this same script can shoot any pilot preset against shipped
// george without clobbering another version's comparison set. Defaults to
// 'george-ai-pilot' -- byte-identical behavior/output path to every prior
// run of this script.
const preset = process.env.WFM_PILOT_PRESET || 'george-ai-pilot';
const dirName = preset === 'george-ai-pilot' ? 'pilot-comparison' : `pilot-comparison-${preset}`;
const dir = fileURLToPath(new URL(`./shots/${dirName}`, import.meta.url));
fs.mkdirSync(dir, { recursive: true });

process.env.WFM_P1 = 'george';
process.env.WFM_P2 = preset;
const h = await launch();
// Title card runs fade-in(900) + hold(3200) + fade-out(1400) then destroys
// itself (Arena.js's showTitleCard) — wait past all of it so screenshots
// aren't obscured by title text/overlay.
await h.page.waitForTimeout(6000);
// Pause the scene's own update loop once the title card is clear: this
// script forces state/pose directly and calls draw() itself (like the other
// debug/audit scripts), but unlike those, it also awaits real wall-clock
// time between each shot for the screenshot to be taken. Leaving the scene
// running lets Wrestler.update() keep ticking in the background during that
// gap and, for some pose/moveBlend combinations, redraw a stale/mid-
// transition internal state before the screenshot fires (observed: torso.y
// going NaN for tauntArmsWide specifically when preceded by another forced
// pose) — a debug-tooling race, not a rendering bug. Pausing stops update()
// while leaving the last rendered frame (our forced draw() call) on screen.
await h.page.evaluate(() => { window.__WFM_GAME.scene.scenes[0].scene.pause(); });

async function shotPose(name, poseName, facing = 1) {
    await h.page.evaluate(({ pose, facing }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        for (const w of [sc.w1, sc.w2]) {
            w.state = 'standing';
            w.facing = facing;
            w.pose = { ...pose };
            w.vx = 0; w.vy = 0;
            w.moveBlend = 1;
            w.combatBlend = 0;
            w.draw();
        }
    }, { pose: POSES[poseName], facing });
    await h.page.waitForTimeout(50);
    const path = `${dir}/${name}.png`;
    await h.screenshot(path);
    console.log(path);
}

await shotPose('01_idle_facing_right', 'powerIdle', 1);
await shotPose('02_idle_facing_left', 'powerIdle', -1);
await shotPose('03_crouch_block', 'block', 1);
await shotPose('04_overhead_taunt', 'tauntArmsWide', 1);
await shotPose('05_axe_handle_overhead', 'axeHandleUp', 1);
await shotPose('06_hammerlock', 'hammerlockCrank', 1);
await shotPose('07_arm_bar', 'armBarLock', 1);

// Walk cycle — a few phases, running through the actual gait code path.
for (const [i, phase] of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].entries()) {
    await h.page.evaluate((phase) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        for (const w of [sc.w1, sc.w2]) {
            w.state = 'standing';
            w.facing = 1;
            w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
            w.vx = 40; w.vy = 0;
            w.moveBlend = 1;
            w.walkPhase = phase;
            w.draw();
        }
    }, phase);
    await h.page.waitForTimeout(50);
    await h.screenshot(`${dir}/08_walk_phase_${i}.png`);
    console.log(`${dir}/08_walk_phase_${i}.png`);
}

// Running.
await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const w of [sc.w1, sc.w2]) {
        w.state = 'running';
        w.facing = 1;
        w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
        w.vx = 260; w.vy = 0;
        w.moveBlend = 1;
        w.walkPhase = 1.2;
        w.draw();
    }
});
await h.page.waitForTimeout(50);
await h.screenshot(`${dir}/09_running.png`);
console.log(`${dir}/09_running.png`);

// Get-up sequence samples.
for (const t of [0, 0.34, 0.72, 1]) {
    await h.page.evaluate((t) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        for (const w of [sc.w1, sc.w2]) {
            w.state = 'gettingUp';
            w.facing = 1;
            w.riseT = t;
            w.draw();
        }
    }, t);
    await h.page.waitForTimeout(50);
    await h.screenshot(`${dir}/10_getup_${t}.png`);
    console.log(`${dir}/10_getup_${t}.png`);
}

await h.close();
console.log('Done.');
