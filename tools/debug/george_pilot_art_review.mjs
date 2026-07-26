// Focused George AI-pilot art review capture.
//
// Captures the failure modes that forced final-pose screenshots missed:
//   - live keyboard-driven walking in both directions/facings;
//   - a dense gait-phase sweep in both facings;
//   - the real lockup pose tween from several retained walk phases.
//
// Usage:
//   WFM_REVIEW_LABEL=baseline node tools/debug/george_pilot_art_review.mjs
//
// Output:
//   tools/debug/shots/george-pilot-art-review/<label>/

// The script only selects the isolated george-ai-pilot preset. It never
// changes shipped George assets or forces a final lockup pose directly.

import { launch } from './harness.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const label = (process.env.WFM_REVIEW_LABEL || 'review').replace(/[^a-z0-9_-]+/gi, '-');
const dir = fileURLToPath(new URL(`./shots/george-pilot-art-review/${label}/`, import.meta.url));
fs.mkdirSync(dir, { recursive: true });

process.env.WFM_P1 = process.env.WFM_REVIEW_PRESET || 'george-ai-pilot';
process.env.WFM_P2 = 'george';

const h = await launch();
await h.page.waitForTimeout(6000);

async function reset({ facing, phase = 0, close = false }) {
    await h.page.evaluate(({ facing, phase, close }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.tweens.killTweensOf([sc.w1.pose, sc.w2.pose]);
        const idle = { lLeg: 0.08, rLeg: -0.08, lArm: 0.08, rArm: -0.08, lean: 0, crouch: 0 };
        Object.assign(sc.w1, {
            x: facing > 0 ? 390 : 610,
            y: 390,
            state: 'standing',
            facing,
            walkPhase: phase,
            vx: 0,
            vy: 0,
            moveBlend: 0,
            combatBlend: 0,
            pose: { ...idle },
        });
        Object.assign(sc.w2, {
            x: close ? (facing > 0 ? 475 : 525) : (facing > 0 ? 830 : 170),
            y: 390,
            state: 'standing',
            facing: -facing,
            walkPhase: 0,
            vx: 0,
            vy: 0,
            moveBlend: 0,
            combatBlend: 0,
            pose: { ...idle },
        });
        sc.w1.draw();
        sc.w2.draw();
    }, { facing, phase, close });
    await h.page.waitForTimeout(40);
}

async function shot(name) {
    const path = `${dir}/${name}.png`;
    await h.screenshot(path);
    console.log(path);
}

// Actual live movement: the Arena update loop remains active, and Playwright
// holds the same keyboard controls a player uses. Sample starts, full-speed
// travel, and braking because retained gait phase during deceleration matters.
for (const [facing, key, side] of [[1, 'KeyD', 'right'], [-1, 'KeyA', 'left']]) {
    await reset({ facing });
    await h.page.keyboard.down(key);
    for (let i = 0; i < 16; i++) {
        await h.page.waitForTimeout(75);
        await shot(`live-walk-${side}-${String(i).padStart(2, '0')}`);
    }
    await h.page.keyboard.up(key);
    for (let i = 0; i < 5; i++) {
        await h.page.waitForTimeout(75);
        await shot(`live-brake-${side}-${String(i).padStart(2, '0')}`);
    }
}

// Pause only for deterministic dense phase coverage. This still calls the
// real Wrestler.draw -> Skeleton.updateUpright gait path; it is not a set of
// hand-authored replacement poses.
await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].scene.pause());
for (const facing of [1, -1]) {
    for (let i = 0; i < 24; i++) {
        const phase = i * Math.PI * 2 / 24;
        await h.page.evaluate(({ facing, phase }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            const w = sc.w1;
            Object.assign(w, {
                x: 500,
                y: 390,
                state: 'standing',
                facing,
                walkPhase: phase,
                vx: facing * 40,
                vy: 0,
                moveBlend: 1,
                combatBlend: 0,
                pose: { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 },
            });
            w.draw();
            sc.w2.skeleton.setVisible(false);
            sc.w2.gfx.setVisible(false);
        }, { facing, phase });
        await shot(`gait-${facing > 0 ? 'right' : 'left'}-${String(i).padStart(2, '0')}`);
    }
}
await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    sc.w2.gfx.setVisible(true);
    sc.scene.resume();
});

// Exercise the actual 180ms tweenPose('lockup') transition. Each retained
// phase gets entry samples plus a settled frame; the final pose is therefore
// tested against several incoming walk phases, not one sanitized endpoint.
for (const facing of [1, -1]) {
    for (const [phaseIndex, phase] of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].entries()) {
        await reset({ facing, phase, close: true });
        await h.page.keyboard.press('KeyF');
        for (const [sampleIndex, delay] of [0, 45, 45, 45, 90].entries()) {
            if (delay) await h.page.waitForTimeout(delay);
            await shot(`lockup-${facing > 0 ? 'right' : 'left'}-phase-${phaseIndex}-t${sampleIndex}`);
        }
    }
}

await h.close();
console.log(`Done: ${dir}`);
