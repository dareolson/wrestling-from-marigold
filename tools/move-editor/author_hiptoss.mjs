// Hip toss, second pass (2026-10-15, MOVE_REFINEMENT_METHOD.md). The job: a
// quick, clean flip over the hip, effortless for the thrower, a flat landing.
//
// v1 (Bret Hart's Royal Rumble sheet 345–356, still carried as references)
// turned George forward through 270° but carried him back out in front of
// Lou, so he looped round Lou and landed where he started; it had no grip
// and Lou's acting was all `lean`, which never rendered. Going over the hip
// lands him on the far side: behind Lou, flat on his back, head toward Lou's
// heels (as the suplex lands).
//
// Rebuild (dev server on :5173):
//   node tools/move-editor/author_hiptoss.mjs /tmp/hiptoss.unstaged.json
//   node tools/move-critic/stage.mjs /tmp/hiptoss.unstaged.json tools/move-editor/hiptoss.constraints.mjs /tmp/hiptoss.json
//   node tools/move-editor/export_draft.mjs /tmp/hiptoss.json hiptoss.json hipToss.js
//
// Beats: George steps in, Lou's near arm round his waist, far hand on his
// arm → Lou drops his hips under him (the load) → pops the hips and pulls,
// leaning back: George's legs go over the top → upside down behind Lou →
// flat on his back, compression → Lou recovers. Lou's soles stay planted.

import { writeFileSync } from 'node:fs';
import { pose, buildDraft, LYING } from './authoring.mjs';

export const AT = {
    stance: 0, hook: 0.14, load: 0.30, over: 0.42, down: 0.52, impact: 0.62, compress: 0.65,
    bounce: 0.74, rest: 1.00,
};

const LOU_LEGS = { lLeg: -0.10, rLeg: 0.20 };

const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, ...LOU_LEGS, crouch: 0.05 }), 0, null],
    // Near arm round George's waist, far hand on his near arm (346).
    [AT.hook, pose({ lArm: 1.40, lElbow: 1.4, rArm: 0.90, rElbow: 1.2, ...LOU_LEGS, crouch: 0.15, bend: 0.20 }), 0, 346, 'easeOut'],
    // Hips dropped under him (348): the load.
    [AT.load, pose({ lArm: 1.30, lElbow: 1.5, rArm: 1.00, rElbow: 1.3, ...LOU_LEGS, crouch: 0.40, bend: 0.30 }), 0, 348, 'easeInOut'],
    // Pops the hips and pulls him over, leaning back (349).
    [AT.over, pose({ lArm: 2.30, lElbow: 1.0, rArm: 1.80, rElbow: 0.9, ...LOU_LEGS, crouch: 0.16, bend: -0.28 }), 0, 349, 'easeIn'],
    // Arms swing back after him as he goes down behind (stage.mjs keeps
    // the waist grip through here).
    [AT.down, pose({ lArm: -1.00, lElbow: 0.6, rArm: -0.80, rElbow: 0.6, ...LOU_LEGS, crouch: 0.20, bend: -0.20 }), 0, null, 'linear'],
    // George hits; Lou's weight settles back into his knees (350).
    [AT.impact, pose({ lArm: -0.60, lElbow: 0.3, rArm: -0.50, rElbow: 0.4, ...LOU_LEGS, crouch: 0.28, bend: -0.06 }), 0, 350, 'linear'],
    [AT.compress, pose({ lArm: -0.55, lElbow: 0.4, rArm: -0.45, rElbow: 0.5, ...LOU_LEGS, crouch: 0.31, bend: 0.0 }), 0, null, 'easeOut'],
    [AT.bounce, pose({ lArm: -0.20, lElbow: 0.6, rArm: -0.10, rElbow: 0.6, ...LOU_LEGS, crouch: 0.20, bend: 0.06 }), 0, null, 'easeInOut'],
    [AT.rest, pose({ lArm: 0.06, rArm: 0.18, ...LOU_LEGS, crouch: 0.05 }), 0, null, 'easeInOut'],
];

// George faces left: rArm is his near arm. His tilt grows forward only, from
// 0 through upside down (π) to lying on his back (≈3π/2).
const defender = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, crouch: 0.22 }), 70, null],
    // Stepped in against him.
    [AT.hook, pose({ lArm: 0.70, lElbow: 0.8, rArm: 0.80, rElbow: 0.6, lLeg: -0.25, rLeg: 0.15, crouch: 0.15, bend: 0.20 }), 48, null, 'easeOut'],
    // Folded over the hip, feet coming up (351).
    [AT.load, pose({ lArm: 1.00, lElbow: 0.5, rArm: 0.90, rElbow: 0.5, lLeg: -0.10, rLeg: 0.20, lKnee: 0.40, rKnee: 0.30, bend: 0.45, tilt: 0.55, lift: 20 }), 34, 351, 'easeInOut'],
    // Legs over the top (352).
    [AT.over, pose({ lArm: 1.70, lElbow: 0.3, rArm: 1.50, rElbow: 0.3, lLeg: 0.10, rLeg: 0.00, lKnee: 0.30, rKnee: 0.20, bend: 0.15, tilt: 1.90, lift: 90 }), 0, 352, 'easeIn'],
    // Upside down behind Lou, coming down (353).
    [AT.down, pose({ lArm: 2.40, lElbow: 0.3, rArm: 2.20, rElbow: 0.3, lLeg: 0.20, rLeg: 0.10, lKnee: 0.30, rKnee: 0.20, tilt: 3.30, lift: 50 }), -70, 353, 'linear'],
    // Flat on his back (354–355); arms slap the mat.
    [AT.impact, pose({ lArm: 0.60, lElbow: 0.3, rArm: 0.50, rElbow: 0.3, lLeg: 0.40, rLeg: 0.30, lKnee: 0.40, rKnee: 0.30, tilt: 4.76, lift: LYING }), -160, 355, 'linear'],
    [AT.compress, pose({ lArm: 0.70, lElbow: 0.4, rArm: 0.60, rElbow: 0.4, lLeg: 0.75, rLeg: 0.60, lKnee: 0.80, rKnee: 0.65, bend: 0.25, tilt: 4.76, lift: LYING }), -160, null, 'easeOut'],
    [AT.bounce, pose({ lArm: 0.40, lElbow: 0.3, rArm: 0.35, rElbow: 0.3, lLeg: 0.45, rLeg: 0.35, lKnee: 0.55, rKnee: 0.45, bend: 0.06, tilt: 4.76, lift: LYING }), -160, null, 'easeInOut'],
    [AT.rest, pose({ lArm: 0.05, lElbow: 0.1, rArm: 0.08, rElbow: 0.1, lLeg: 0.06, rLeg: 0.22, lKnee: 0.10, rKnee: 0.40, tilt: 4.76, lift: LYING }), -160, 356, 'easeInOut'],
];

const draft = buildDraft({
    id: 'hipToss',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
    // Going over the hip, George draws in front of Lou.
    transformY: (role, at) => (role === 'defender' && at >= AT.load && at < AT.impact ? 4 : 0),
});

const out = process.argv[2];
if (!out) throw new Error('usage: author_hiptoss.mjs <out.json> (then stage.mjs; see header)');
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`wrote ${out}`);
