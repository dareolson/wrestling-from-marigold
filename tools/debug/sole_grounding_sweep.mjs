// Painted-sole grounding sweep (2026-07-25, George AI pilot focused
// correction — see AI_HANDOFF_ENTRIES/2026-07-25-codex-george-ai-pilot-
// review.md's "blocking grounding issue" and Skeleton.js's
// soleAnchorFrac comments).
//
// A shin's declared soleAnchorFrac is a measured, canvas-fraction point on
// the source art and an input to the authored-sole IK/FK path. This script is
// the independent output check: for every sampled pose, it reads the
// shin's ACTUAL render transform (position/angle/scale Phaser used this
// frame) and maps soleAnchorFrac through it via Skeleton._socketPoint (the
// same transform the runtime already uses for torso sockets/distal
// anchors), then measures the vertical distance from that transformed point
// down to the mat line.
//
//   node tools/debug/sole_grounding_sweep.mjs [character]
//     — defaults george-ai-pilot; only meaningful for a character whose shin
//       declares soleAnchorFrac (the shipped characters don't, and their
//       shin images won't carry _soleAnchorFrac, so this reports "not
//       declared" and exits 0 rather than failing on an inapplicable check).
//
// Acceptance (Codex review): both painted soles within 2px of the mat for
// idle and every planted sample across a full gait cycle, both facings.
// Swing feet must still clear (not checked here — clearance is visibly
// obvious and already exercised by the general debug:play/browser review).

import { launch } from './harness.mjs';

const CHAR = process.argv[2] || 'george-ai-pilot';
const MAX_SOLE_GAP = 2;
// Dense walk-phase sweep — samples both feet's planted AND swing portions
// of a full gait cycle (matches GAIT.STANCE/footGait's 0..2*PI convention).
const PHASES = [];
for (let t = 0; t <= 2 * Math.PI + 0.001; t += (2 * Math.PI) / 120) PHASES.push(Math.round(t * 1000) / 1000);

process.env.WFM_P1 = CHAR;
process.env.WFM_P2 = CHAR === 'george' ? 'thesz' : 'george';
const h = await launch();
await h.page.waitForTimeout(300);

const result = await h.page.evaluate(async ({ phases }) => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1;
    const sk = w.skeleton;

    const nearAnchor = sk.nearShin._soleAnchorFrac;
    const farAnchor = sk.farShin._soleAnchorFrac;
    if (!nearAnchor || !farAnchor) return { declared: false };

    w.state = 'standing';
    w.vx = 0; w.vy = 0;

    // Mat line: the same y ground-contact reference the gait/IK code itself
    // targets (Wrestler's own resting y — see draw()'s `s`/y usage). Read it
    // directly off the wrestler rather than re-deriving it, so this check
    // can't silently drift from whatever the runtime actually treats as
    // "the mat" for this wrestler.
    const matY = w.y;

    function soleGap(side, renderDebug) {
        const anchor = side === 'near' ? nearAnchor : farAnchor;
        const rd = renderDebug;
        const point = sk._socketPoint(sk[side === 'near' ? 'nearShin' : 'farShin'], anchor.u, anchor.v, rd.x, rd.y, rd.angle, rd.s, rd.facing);
        return matY - point.y; // + = above mat (expected), - = sinks through
    }

    const samples = [];
    for (const facing of [1, -1]) {
        w.facing = facing;
        // Idle sample (moveBlend effectively 0 — standing rest pose).
        w.moveBlend = 0;
        w.walkPhase = 0;
        w.draw();
        samples.push({
            facing, tag: 'idle', phase: null,
            nearGap: soleGap('near', sk.nearShinRenderDebug), nearPlanted: true,
            farGap: soleGap('far', sk.farShinRenderDebug), farPlanted: true,
        });
        // Full gait-cycle sweep. Swing-phase feet are SUPPOSED to lift off
        // the mat (footGait's lift arc) — only planted samples (sk.*Foot
        // .planted, the same flag the gait code itself sets) are held to
        // the <=2px acceptance criterion; swing samples are reported for
        // visibility but not judged.
        w.moveBlend = 1;
        for (const phase of phases) {
            w.walkPhase = phase;
            w.draw();
            samples.push({
                facing, tag: 'gait', phase,
                nearGap: soleGap('near', sk.nearShinRenderDebug), nearPlanted: !!sk.nearFoot?.planted,
                farGap: soleGap('far', sk.farShinRenderDebug), farPlanted: !!sk.farFoot?.planted,
            });
        }
    }
    return { declared: true, samples };
}, { phases: PHASES });

await h.close();
delete process.env.WFM_P1;
delete process.env.WFM_P2;

console.log(`Character: ${CHAR}`);
if (!result.declared) {
    console.log('No soleAnchorFrac declared on this character\'s shin — check not applicable, nothing to verify.');
    process.exit(0);
}

let maxAbsGap = -Infinity, worst = null;
let minSwingGap = Infinity;
for (const s of result.samples) {
    for (const side of ['near', 'far']) {
        const gap = s[`${side}Gap`];
        const planted = s[`${side}Planted`];
        if (planted) {
            const absGap = Math.abs(gap);
            if (absGap > maxAbsGap) { maxAbsGap = absGap; worst = { ...s, side, gap }; }
        } else if (gap < minSwingGap) {
            minSwingGap = gap;
        }
    }
}

const plantedCount = result.samples.reduce((n, s) => n + (s.nearPlanted ? 1 : 0) + (s.farPlanted ? 1 : 0), 0);
console.log(`Sampled ${result.samples.length} poses (idle + dense gait-phase sweep) x2 facings, ${plantedCount} planted foot-samples.`);
console.log(`Max |planted sole-to-mat gap|: ${maxAbsGap.toFixed(2)}px`);
console.log(`Worst planted sample: facing ${worst.facing}, ${worst.tag}${worst.phase !== null ? ` (phase ${worst.phase})` : ''}, ${worst.side} sole, gap ${worst.gap.toFixed(2)}px (+ = above mat, - = sinks through)`);
console.log(`Smallest swing-phase clearance: ${Number.isFinite(minSwingGap) ? minSwingGap.toFixed(2) : 'n/a'}px above the mat.`);

const pass = maxAbsGap <= MAX_SOLE_GAP && minSwingGap >= 0;
console.log('');
console.log(pass
    ? `PASS — both painted soles stay within ${MAX_SOLE_GAP}px of the mat for idle and every planted gait sample, both facings; all sampled swing soles clear.`
    : `FAIL — a planted sole exceeds ${MAX_SOLE_GAP}px or a swing sole crosses the mat; inspect the authored-sole IK/FK solve against this measured error.`);
process.exit(pass ? 0 : 1);
