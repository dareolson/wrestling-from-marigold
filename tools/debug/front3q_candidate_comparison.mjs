// Live A/B of the front3q replacement-limb candidate against shipped Lou.
//
// Both wrestlers are the SAME character in every respect the rig can vary --
// same kit, same idle pose, same skin and trunks colours, same scene, same
// broadcast treatment -- so anything that reads differently on screen is the
// art. p1 is the candidate, p2 is shipped Lou.
//
// It drives them through poses rather than waiting for a match to produce them,
// because a match never reliably reaches an overhead arm or a get-up inside a
// screenshot window, and those are the poses the candidate's joints are most
// likely to fail in.
//
//   node tools/debug/front3q_candidate_comparison.mjs [--out <dir>]
//
// Writes one PNG per pose per facing, plus a contact sheet.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { launch } from './harness.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// Chosen to cover what the brief asks the candidate to survive: rest, a
// close-range stance, an ordinary strike, a grapple, the overhead extremes that
// shipped Lou's own locked forearm offsets are a known tradeoff against, and a
// grounded pose.
const POSES = [
    'theszIdle',        // rest -- the approved idle silhouette
    'lockup',           // close range, both arms forward
    'jab',              // ordinary strike
    'grapple',
    'tauntArmsWide',    // overhead, arms wide
    'axeHandleUp',      // the worst overhead case in the kit
    'pinHold',          // dropped low
    'stumble',
];

const args = process.argv.slice(2);
const outDir = args.includes('--out')
    ? args[args.indexOf('--out') + 1]
    : path.join(ROOT, 'tools/debug/shots/front3q-candidate');

process.env.WFM_P1 = 'thesz-front3q-r1';
process.env.WFM_P2 = 'thesz';

await mkdir(outDir, { recursive: true });
const h = await launch();

// Wait for the match itself, not a fixed delay. The intro title card holds for
// several seconds and a fixed wait screenshotted sixteen copies of it.
for (let tries = 0; tries < 60; tries++) {
    const snap = await h.snap();
    if (snap?.w1) break;
    await h.page.waitForTimeout(500);
}
const ready = await h.snap();
if (!ready?.w1) throw new Error('the match never started; nothing to compare');
// The intro card fades over the live ring on its own wall-clock timer, not on
// match time -- snap().t passes 4 while the card is still printed across both
// wrestlers. Wait it out in wall time.
await h.page.waitForTimeout(9000);
console.log(`  match live at ${(await h.snap()).clock}`);

// Freeze the match so the poses hold still, then drive both skeletons directly.
const applied = await h.page.evaluate(({ poses }) => {
    const sc = window.__WFM_GAME?.scene?.scenes?.[0];
    if (!sc?.w1) return { error: 'no scene' };
    sc._frozen = true;
    return { ok: true, poses, w1: sc.w1.x, w2: sc.w2.x };
}, { poses: POSES });
if (applied.error) throw new Error(applied.error);

const shots = [];
for (const pose of POSES) {
    for (const facing of [1, -1]) {
        await h.page.evaluate(({ pose, facing }) => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            for (const w of [sc.w1, sc.w2]) {
                w.facing = facing;
                w.state = 'idle';
                // Stop the match logic fighting the pose we are setting.
                w._lockPose = pose;
                if (typeof w.tweenPose === 'function') w.tweenPose(pose, 0);
                else Object.assign(w.pose, window.__WFM_POSES?.[pose] ?? {});
                w.draw?.();
            }
            sc.w1.draw?.();
            sc.w2.draw?.();
        }, { pose, facing });
        await h.page.waitForTimeout(220);

        const tag = `${pose}-facing${facing > 0 ? 'R' : 'L'}`;
        const file = path.join(outDir, `${tag}.png`);
        // One clip holding both wrestlers, so they are compared in one image at
        // one scale under one lighting pass.
        await h.screenshot(file, { x: 250, y: 150, width: 620, height: 330 });
        shots.push({ pose, facing, file });
        console.log(`  ${tag}`);
    }
}

await writeFile(path.join(outDir, 'INDEX.md'),
    `# front3q candidate vs shipped Lou\n\n`
    + `Left figure: \`thesz-front3q-r1\` (candidate).\n`
    + `Right figure: \`thesz\` (shipped, unchanged).\n\n`
    + `Same kit, pose, skin and trunks colours; only the art differs.\n\n`
    + shots.map(s => `- \`${path.basename(s.file)}\` — ${s.pose}, facing ${s.facing > 0 ? 'right' : 'left'}`).join('\n')
    + '\n');

console.log(`  ${shots.length} shots -> ${outDir}`);
await h.close();
