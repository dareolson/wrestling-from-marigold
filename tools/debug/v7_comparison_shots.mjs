// Required visual evidence for the George AI pilot v7 thigh-recut candidate
// (v6 vs v7, same depth/scale, both facings) plus forearm/shin runtime
// verification crops carried forward from v6 unchanged. See the dated
// AI_HANDOFF_ENTRIES v7 entry for how this evidence was judged.
//
//   node tools/debug/v7_comparison_shots.mjs
//
// Writes numbered PNGs to tools/debug/shots/v7-comparison/.

import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('./shots/v7-comparison', import.meta.url));
fs.mkdirSync(dir, { recursive: true });

process.env.WFM_P1 = 'george-ai-pilot-v6';
process.env.WFM_P2 = 'george-ai-pilot-v7';
const h = await launch();
await h.page.waitForTimeout(6000); // clear title card, same as pilot_comparison_shots.mjs
await h.page.evaluate(() => { window.__WFM_GAME.scene.scenes[0].scene.pause(); });

async function resetCamera() {
    await h.page.evaluate(() => {
        const cam = window.__WFM_GAME.scene.scenes[0].cameras.main;
        cam.setZoom(1);
        cam.centerOn(cam.width / 2, cam.height / 2);
    });
}

async function forcePose(name, poseName, facing = 1) {
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
    await h.screenshot(`${dir}/${name}.png`);
    console.log(`${dir}/${name}.png`);
}

async function zoomShot(name, x, y, zoom = 5) {
    await h.page.evaluate(({ x, y, zoom }) => {
        const cam = window.__WFM_GAME.scene.scenes[0].cameras.main;
        cam.setZoom(zoom);
        cam.centerOn(x, y);
    }, { x, y, zoom });
    await h.page.waitForTimeout(50);
    await h.screenshot(`${dir}/${name}.png`);
    console.log(`${dir}/${name}.png`);
    await resetCamera();
}

// Real world-space bounds of a named skeleton part (or union of several),
// read directly from Phaser's own getBounds() instead of guessed camera
// coordinates -- so crops actually land on the body part regardless of
// each character's own leg/torso proportions.
async function partsBounds(which, parts) {
    return h.page.evaluate(({ which, parts }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = which === 'p1' ? sc.w1 : sc.w2;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of parts) {
            const img = w.skeleton[p];
            if (!img || !img.visible) continue;
            const b = img.getBounds();
            x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top);
            x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
        }
        return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
    }, { which, parts });
}

async function zoomOnParts(name, which, parts, zoom = 5) {
    const b = await partsBounds(which, parts);
    await zoomShot(name, b.x, b.y, zoom);
    return b;
}

// ── Gameplay-scale poses ────────────────────────────────────────────────
await forcePose('01_idle_facing_right', 'powerIdle', 1);
await forcePose('02_idle_facing_left', 'powerIdle', -1);
await forcePose('03_crouch_block', 'block', 1);
await forcePose('04_lockup_pose', 'lockup', 1);
await forcePose('05_hammerlock', 'hammerlockCrank', 1);
await forcePose('06_arm_bar', 'armBarLock', 1);
await forcePose('07_overhead_taunt', 'tauntArmsWide', 1);
// Deep thigh swing beneath the pelvis overlay — kneeLiftImpact has the
// largest single-leg-raise value in POSES (lLeg 1.72), well past dropkick's
// 0.80 -- the sharpest test of the thigh clearing the pelvis overlay without
// a knee underlap or exposed wedge at full swing. moveBlend must be 0 here
// (not 1, unlike every other forced pose above) -- Skeleton.js's own
// useGait = moveBlend > 0.2 || !poseLegActive means moveBlend:1 always
// overrides pose-driven leg FK with the (motionless, vx:0) gait stance,
// silently discarding lLeg/rLeg for any pose forced that way.
await h.page.evaluate(({ pose }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const w of [sc.w1, sc.w2]) {
        w.state = 'standing';
        w.facing = 1;
        w.pose = { ...pose };
        w.vx = 0; w.vy = 0;
        w.moveBlend = 0;
        w.combatBlend = 0;
        w.draw();
    }
}, { pose: POSES.kneeLiftImpact });
await h.page.waitForTimeout(50);
await h.screenshot(`${dir}/08_deep_thigh_swing.png`);
console.log(`${dir}/08_deep_thigh_swing.png`);
await zoomOnParts('08b_deep_thigh_swing_zoom_v6', 'p1', ['torso', 'pelvisOverlay', 'nearThigh', 'farThigh'], 4);
await zoomOnParts('08b_deep_thigh_swing_zoom_v7', 'p2', ['torso', 'pelvisOverlay', 'nearThigh', 'farThigh'], 4);

// Four dense walk phases (forced walkPhase, real gait code path).
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
    await h.screenshot(`${dir}/09_walk_phase_${i}.png`);
    console.log(`${dir}/09_walk_phase_${i}.png`);
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
await h.screenshot(`${dir}/10_running.png`);
console.log(`${dir}/10_running.png`);

// Get-up sequence (grounded/get-up rotation).
for (const t of [0, 0.34, 0.56, 0.72, 1]) {
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
    await h.screenshot(`${dir}/11_getup_${t}.png`);
    console.log(`${dir}/11_getup_${t}.png`);
}
// The one automated-gate finding carried over from v6 (torso_socket_sweep's
// farHip, ~3px, facing 1 / get-up t=0.56) at the exact flagged pose, both
// facings, before resetting the game loop.
await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const w of [sc.w1, sc.w2]) {
        w.state = 'gettingUp';
        w.facing = 1;
        w.riseT = 0.56;
        w.draw();
    }
});
const TORSO_HIP = ['torso', 'pelvisOverlay'];
const THIGH_KNEE = ['torso', 'pelvisOverlay', 'nearThigh', 'farThigh'];
const HANDS = ['nearForearm', 'farForearm'];
const FEET = ['nearShin', 'farShin'];

await zoomOnParts('12_farhip_flagged_pose_zoom_p1v6', 'p1', TORSO_HIP, 6);
await zoomOnParts('12_farhip_flagged_pose_zoom_p2v7', 'p2', TORSO_HIP, 6);

// ── Tight crops: trunks/thigh/knee, hands, feet — both characters ───────
await forcePose('13_idle_for_crops', 'powerIdle', 1);
await zoomOnParts('14_trunks_thigh_knee_v6', 'p1', THIGH_KNEE, 4.5);
await zoomOnParts('14_trunks_thigh_knee_v7', 'p2', THIGH_KNEE, 4.5);

await forcePose('15_arms_extended_for_crops', 'tauntArmsWide', 1);
await zoomOnParts('16_hands_v6', 'p1', HANDS, 6);
await zoomOnParts('16_hands_v7', 'p2', HANDS, 6);

await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    for (const w of [sc.w1, sc.w2]) {
        w.state = 'standing';
        w.facing = 1;
        w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
        w.vx = 40; w.vy = 0;
        w.moveBlend = 1;
        w.walkPhase = Math.PI / 2;
        w.draw();
    }
});
await h.screenshot(`${dir}/17_walk_for_foot_crops.png`);
await zoomOnParts('18_feet_v6', 'p1', FEET, 6);
await zoomOnParts('18_feet_v7', 'p2', FEET, 6);

// ── Forearm verification poses (thumb orientation, near/far assignment) ─
// Carried forward from v6 unchanged; captured here at v7's own idle/extreme
// poses to confirm no regression from the thigh-only change, per the
// brief's forearm-verification requirement.
await forcePose('19_forearm_idle_facing_right', 'powerIdle', 1);
await zoomOnParts('20_forearm_idle_right_v6', 'p1', HANDS, 6);
await zoomOnParts('20_forearm_idle_right_v7', 'p2', HANDS, 6);
await forcePose('19_forearm_idle_facing_left', 'powerIdle', -1);
await zoomOnParts('20_forearm_idle_left_v6', 'p1', HANDS, 6);
await zoomOnParts('20_forearm_idle_left_v7', 'p2', HANDS, 6);
await forcePose('21_forearm_overhead', 'axeHandleUp', 1);
await zoomOnParts('22_forearm_overhead_v6', 'p1', HANDS, 6);
await zoomOnParts('22_forearm_overhead_v7', 'p2', HANDS, 6);
await forcePose('23_forearm_deep_elbow_bend', 'armBarLock', 1);
await zoomOnParts('24_forearm_deep_bend_v6', 'p1', HANDS, 6);
await zoomOnParts('24_forearm_deep_bend_v7', 'p2', HANDS, 6);
await forcePose('25_forearm_lockup', 'lockup', 1);
await zoomOnParts('26_forearm_lockup_v6', 'p1', HANDS, 6);
await zoomOnParts('26_forearm_lockup_v7', 'p2', HANDS, 6);

// ── Shin/foot verification: both facings, walk + run ─────────────────────
await forcePose('27_shin_idle_facing_right', 'powerIdle', 1);
await zoomOnParts('28_shin_idle_right_v6', 'p1', FEET, 6);
await zoomOnParts('28_shin_idle_right_v7', 'p2', FEET, 6);
await forcePose('27_shin_idle_facing_left', 'powerIdle', -1);
await zoomOnParts('28_shin_idle_left_v6', 'p1', FEET, 6);
await zoomOnParts('28_shin_idle_left_v7', 'p2', FEET, 6);

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
await zoomOnParts('29_shin_running_v6', 'p1', FEET, 6);
await zoomOnParts('29_shin_running_v7', 'p2', FEET, 6);

// ── Real, input-driven walking (not forced pose) in both directions ──────
await h.page.evaluate(() => { window.__WFM_GAME.scene.scenes[0].scene.resume(); });
await h.page.waitForTimeout(100);

async function holdKeys(keys, ms) {
    for (const k of keys) await h.page.keyboard.down(k);
    await h.page.waitForTimeout(ms);
    for (const k of keys) await h.page.keyboard.up(k);
}

// P1 (v6, WASD) walks right, P2 (v7, arrows) walks left -- both wrestlers
// walking apart, real input driving the actual gait code path.
await holdKeys(['D', 'ArrowLeft'], 500);
await h.screenshot(`${dir}/30_live_walk_apart.png`);
console.log(`${dir}/30_live_walk_apart.png`);

// Reverse: P1 walks left, P2 walks right -- both directions covered for
// both characters.
await holdKeys(['A', 'ArrowRight'], 700);
await h.screenshot(`${dir}/31_live_walk_together.png`);
console.log(`${dir}/31_live_walk_together.png`);

// Continue closing until a lockup actually triggers (grapple button at
// close range), then screenshot the real, input-triggered lockup.
await h.page.keyboard.down('D');
await h.page.keyboard.down('ArrowLeft');
await h.page.waitForTimeout(600);
await h.page.keyboard.up('D');
await h.page.keyboard.up('ArrowLeft');
await h.page.keyboard.down('F');
await h.page.waitForTimeout(150);
await h.page.keyboard.up('F');
await h.page.waitForTimeout(300);
await h.screenshot(`${dir}/32_live_lockup_engaged.png`);
console.log(`${dir}/32_live_lockup_engaged.png`);

await h.close();
console.log('Done.');
