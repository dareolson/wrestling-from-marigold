import { launch } from './harness.mjs';

const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.some(scene => scene.w1));
    const result = await h.page.evaluate(() => {
        const scene = window.__WFM_GAME.scene.scenes.find(candidate => candidate.w1);
        const w = scene.w1;
        const render = pose => {
            w.tweenPose(pose, 0);
            w.skeleton.updateUpright(w.x, w.y, w.s, w.facing, w.pose, 0, 0, 0, 0, 1, 0);
            return {
                forearmRotation: w.skeleton.nearForearm.rotation,
                shinRotation: w.skeleton.nearShin.rotation,
                pose: { lElbow: w.pose.lElbow, lKnee: w.pose.lKnee },
            };
        };
        const base = render({ lLeg: 0.2, rLeg: -0.1, lArm: 0.2, rArm: -0.1, lElbow: 0.2, lKnee: 0.2 });
        const articulated = render({ lLeg: 0.2, rLeg: -0.1, lArm: 0.2, rArm: -0.1, lElbow: 1.15, lKnee: 1.5 });
        return { base, articulated };
    });
    const forearmDelta = Math.abs(result.articulated.forearmRotation - result.base.forearmRotation);
    const shinDelta = Math.abs(result.articulated.shinRotation - result.base.shinRotation);
    if (result.articulated.pose.lElbow !== 1.15 || result.articulated.pose.lKnee !== 1.5) {
        throw new Error(`tweenPose dropped articulated values: ${JSON.stringify(result)}`);
    }
    if (forearmDelta < 0.5 || shinDelta < 0.5) {
        throw new Error(`articulated values did not reach rendered Images: forearm=${forearmDelta}, shin=${shinDelta}`);
    }
    console.log(`PASS articulated channels reached screen transforms (forearm Δ${forearmDelta.toFixed(3)}, shin Δ${shinDelta.toFixed(3)})`);

    // Phase 2 — the TWEENED path. Everything above uses tweenPose(pose, 0),
    // which assigns directly and never touches Phaser's tween engine, but every
    // real pose sequence uses a duration. Tweening a channel the live pose has
    // never carried used to interpolate from `undefined` and produce NaN: a NaN
    // elbow was laundered into the joint default by clampLocalFlex, and a NaN
    // legacy lForearm/lShin went straight into a sprite rotation and position,
    // blanking the limb. Reproduced on Thesz via the recovery-to-idle in
    // _doKneeDrop, which left both shins and boots at NaN coordinates.
    const tweened = await h.page.evaluate(async () => {
        const scene = window.__WFM_GAME.scene.scenes.find(candidate => candidate.w1);
        const w = scene.w1;
        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

        // Start from a stance carrying no articulated channel at all.
        w.tweenPose('idle', 0);
        for (const channel of ['lElbow', 'rElbow', 'lKnee', 'rKnee', 'lForearm', 'rForearm', 'lShin', 'rShin']) {
            delete w.pose[channel];
        }

        // The literal recovery from _doKneeDrop, on the character's own idle.
        w._runPoseSequence([
            { p: 'kneeDropLand', dur: 120, e: 'Linear' },
            { p: w.idlePose,     dur: 220, e: 'Cubic.easeOut' },
        ]);
        await sleep(420);
        w.skeleton.updateUpright(w.x, w.y, w.s, w.facing, w.pose, 0, 0, 0, 0, 1, 0);

        const sk = w.skeleton;
        const transforms = {
            nearForearmRotation: sk.nearForearm.rotation,
            nearForearmX: sk.nearForearm.x, nearForearmY: sk.nearForearm.y,
            nearShinRotation: sk.nearShin.rotation,
            nearShinX: sk.nearShin.x, nearShinY: sk.nearShin.y,
            farShinRotation: sk.farShin?.rotation,
        };
        const poseChannels = Object.fromEntries(
            ['lElbow', 'lKnee', 'lForearm', 'lShin', 'rShin']
                .filter(c => w.pose[c] !== undefined)
                .map(c => [c, w.pose[c]]),
        );
        return { idlePose: w.idlePose, transforms, poseChannels };
    });

    const badPose = Object.entries(tweened.poseChannels).filter(([, v]) => !Number.isFinite(v));
    if (badPose.length) {
        throw new Error(`tweened pose channels are non-finite: ${badPose.map(([k]) => k).join(', ')}`);
    }
    const badTransforms = Object.entries(tweened.transforms)
        .filter(([, v]) => v !== undefined && !Number.isFinite(v));
    if (badTransforms.length) {
        throw new Error(
            `NaN reached rendered transforms after a tweened pose (${tweened.idlePose}): `
            + badTransforms.map(([k]) => k).join(', '),
        );
    }
    console.log(`PASS tweened path kept every transform finite (${tweened.idlePose}, channels: ${Object.keys(tweened.poseChannels).join(', ') || 'none'})`);

    // Phase 3 — intermediate-frame continuity. Finite end transforms only prove
    // the limb survived; they say nothing about how it got there. A cold channel
    // assigned straight to its destination is NaN-free but pops on frame one.
    // Seeding it from the relationship already on screen should make the first
    // frame indistinguishable from the last pre-tween frame, with the rest of
    // the motion spread across the tween.
    const continuity = await h.page.evaluate(async () => {
        const scene = window.__WFM_GAME.scene.scenes.find(candidate => candidate.w1);
        const w = scene.w1;
        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
        const draw = () => {
            w.skeleton.updateUpright(w.x, w.y, w.s, w.facing, w.pose, 0, 0, 0, 0, 1, 0);
            return w.skeleton.nearForearm.rotation;
        };

        // Settle on a stance with no articulated channel, and record where the
        // forearm is actually being drawn.
        w.tweenPose('idle', 0);
        for (const channel of ['lElbow', 'rElbow', 'lKnee', 'rKnee', 'lForearm', 'rForearm', 'lShin', 'rShin']) {
            delete w.pose[channel];
        }
        const before = draw();

        // Introduce an elbow well away from the derived relationship.
        w.tweenPose({ lLeg: 0.2, rLeg: -0.1, lArm: 0.2, rArm: -0.1, lElbow: 2.2 }, 260);

        const samples = [draw()];
        for (let i = 0; i < 26; i++) { await sleep(16); samples.push(draw()); }

        let maxStep = 0;
        for (let i = 1; i < samples.length; i++) {
            maxStep = Math.max(maxStep, Math.abs(samples[i] - samples[i - 1]));
        }
        return {
            before,
            firstStep: Math.abs(samples[0] - before),
            maxStep,
            total: Math.abs(samples.at(-1) - before),
            samples: samples.length,
        };
    });

    if (!Number.isFinite(continuity.total) || continuity.total < 0.3) {
        throw new Error(`the articulated joint barely moved (total ${continuity.total}) — it is not animating`);
    }
    // A snap to the destination shows up as nearly all the travel landing in the
    // very first frame.
    if (continuity.firstStep > continuity.total * 0.5) {
        throw new Error(
            `joint jumped on frame one (${continuity.firstStep.toFixed(3)} of ${continuity.total.toFixed(3)} rad) `
            + '— a cold channel is not being seeded from the rendered relationship',
        );
    }
    console.log(
        `PASS intermediate-frame continuity (total ${continuity.total.toFixed(3)} rad, `
        + `first frame ${continuity.firstStep.toFixed(3)}, largest step ${continuity.maxStep.toFixed(3)}, `
        + `${continuity.samples} frames)`,
    );
} finally {
    await h.close();
}
