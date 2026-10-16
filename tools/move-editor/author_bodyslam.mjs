// Body slam, second pass (2026-10-15, MOVE_REFINEMENT_METHOD.md). Keeps the
// look Derek likes from the first pass: George pressed overhead, flat, like
// a powerbomb set-up, then driven down in front. v1 (Royal Rumble sheet
// 322–328 / 120–121, still carried as references) had no grip through the
// lift, flipped George upside down and back (a tilt reversal that read as a
// spin), cut from overhead to the mat in 0.1 s with no follow-through (its
// `lean` never rendered), slid Lou's boot, and landed George's legs over
// Lou's boots.
//
// Rebuild (dev server on :5173):
//   node tools/move-editor/author_bodyslam.mjs /tmp/bodyslam.unstaged.json
//   node tools/move-critic/stage.mjs /tmp/bodyslam.unstaged.json tools/move-editor/bodyslam.constraints.mjs /tmp/bodyslam.json
//   node tools/move-editor/export_draft.mjs /tmp/bodyslam.json bodyslam.json bodySlam.js
//
// Beats: Lou steps in and bends → near arm through the legs, far arm over the
// shoulder → loads in the knees → scoops George up his chest, turning him
// over one way only (tilt only grows) → presses him overhead, flat → a
// balanced beat up there → drives him down, folding over after him → flat
// on his back in front, compression → Lou rises out of the follow-through.
// Lou's soles stay planted (one stance; crouch and bend do the work).

import { writeFileSync } from 'node:fs';
import { pose, buildDraft, LYING } from './authoring.mjs';

export const AT = {
    stance: 0, step: 0.12, grab: 0.24, load: 0.40, lift: 0.56, press: 0.74, hold: 0.90,
    drive: 1.00, impact: 1.08, compress: 1.11, bounce: 1.20, follow: 1.30, rest: 1.50,
};

const LOU_LEGS = { lLeg: -0.10, rLeg: 0.20 };

const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, ...LOU_LEGS, crouch: 0.05 }), 0, 322],
    [AT.step, pose({ lArm: 0.70, lElbow: 1.0, rArm: 0.90, rElbow: 0.8, ...LOU_LEGS, crouch: 0.10, bend: 0.25 }), 0, null, 'easeIn'],
    // Near arm low between George's legs, far arm over his shoulder (323).
    [AT.grab, pose({ lArm: 0.80, lElbow: 0.9, rArm: 1.60, rElbow: 1.3, ...LOU_LEGS, crouch: 0.18, bend: 0.45 }), 0, 323, 'easeOut'],
    // Sits into the knees, chest coming up under him: the load.
    [AT.load, pose({ lArm: 0.90, lElbow: 1.1, rArm: 1.70, rElbow: 1.4, ...LOU_LEGS, crouch: 0.38, bend: 0.22 }), 0, null, 'easeInOut'],
    // Drives up out of the knees, George rolling up his chest (194).
    [AT.lift, pose({ lArm: 1.90, lElbow: 1.3, rArm: 2.10, rElbow: 1.2, ...LOU_LEGS, crouch: 0.12, bend: -0.05 }), 0, 194, 'easeIn'],
    // Presses him overhead, arms long, chest up (324).
    [AT.press, pose({ lArm: 2.80, lElbow: 0.35, rArm: 2.95, rElbow: 0.40, ...LOU_LEGS, crouch: 0.02, bend: -0.14 }), 0, 324, 'easeOut'],
    // Balanced up there: a small settle under the weight.
    [AT.hold, pose({ lArm: 2.85, lElbow: 0.45, rArm: 3.00, rElbow: 0.50, ...LOU_LEGS, crouch: 0.06, bend: -0.10 }), 0, null, 'easeInOut'],
    // Commits forward: arms start the throw, chest following.
    [AT.drive, pose({ lArm: 2.10, lElbow: 0.30, rArm: 2.25, rElbow: 0.35, ...LOU_LEGS, crouch: 0.12, bend: 0.20 }), 0, 326, 'easeIn'],
    // Folded over after him at the impact (327).
    [AT.impact, pose({ lArm: 1.25, lElbow: 0.25, rArm: 1.35, rElbow: 0.30, ...LOU_LEGS, crouch: 0.30, bend: 0.62 }), 0, 327, 'linear'],
    [AT.compress, pose({ lArm: 1.15, lElbow: 0.30, rArm: 1.25, rElbow: 0.35, ...LOU_LEGS, crouch: 0.34, bend: 0.68 }), 0, null, 'easeOut'],
    [AT.bounce, pose({ lArm: 0.95, lElbow: 0.40, rArm: 1.05, rElbow: 0.45, ...LOU_LEGS, crouch: 0.26, bend: 0.55 }), 0, 328, 'easeInOut'],
    // Coming up out of it, arms dropping last.
    [AT.follow, pose({ lArm: 0.60, lElbow: 0.50, rArm: 0.75, rElbow: 0.55, ...LOU_LEGS, crouch: 0.14, bend: 0.30 }), 0, null, 'easeInOut'],
    [AT.rest, pose({ lArm: 0.06, rArm: 0.18, ...LOU_LEGS, crouch: 0.05 }), 0, null, 'easeInOut'],
];

// George faces left: rArm is his near (camera-side) arm. His tilt only ever
// grows backward (negative), so he turns over one way.
const defender = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, crouch: 0.22 }), 72, null],
    [AT.step, pose({ lArm: 0.30, rArm: 0.80, rElbow: 0.9, lLeg: -0.18, rLeg: 0.13, crouch: 0.18, bend: 0.12 }), 66, null, 'easeIn'],
    // Grabbed: bent over Lou's shoulder, hands on his back.
    [AT.grab, pose({ lArm: 1.10, lElbow: 1.0, rArm: 1.50, rElbow: 1.2, lLeg: -0.15, rLeg: 0.15, crouch: 0.10, bend: 0.35 }), 56, null, 'easeOut'],
    // Weight coming off his feet, tipping back over the arm in his legs.
    [AT.load, pose({ lArm: 1.20, lElbow: 1.0, rArm: 1.60, rElbow: 1.1, lLeg: -0.05, rLeg: 0.25, lKnee: 0.40, rKnee: 0.30, bend: 0.25, tilt: -0.35, lift: 10 }), 52, null, 'easeInOut'],
    // Rolling up Lou's chest, legs trailing.
    [AT.lift, pose({ lArm: 1.60, lElbow: 0.8, rArm: 1.90, rElbow: 0.7, lLeg: 0.15, rLeg: 0.35, lKnee: 0.50, rKnee: 0.35, bend: 0.10, tilt: -1.10, lift: 70 }), 34, 120, 'easeIn'],
    // Flat overhead, arms and legs flung (the powerbomb look).
    [AT.press, pose({ lArm: 1.90, lElbow: 0.4, rArm: 1.70, rElbow: 0.4, lLeg: 0.20, rLeg: 0.10, lKnee: 0.25, rKnee: 0.20, tilt: -1.62, lift: 150 }), 20, null, 'easeOut'],
    [AT.hold, pose({ lArm: 2.05, lElbow: 0.5, rArm: 1.80, rElbow: 0.5, lLeg: 0.25, rLeg: 0.12, lKnee: 0.30, rKnee: 0.22, tilt: -1.64, lift: 146 }), 20, null, 'easeInOut'],
    // Thrown down and out in front; limbs trail the fall.
    [AT.drive, pose({ lArm: 2.30, lElbow: 0.4, rArm: 2.10, rElbow: 0.4, lLeg: 0.30, rLeg: 0.18, lKnee: 0.30, rKnee: 0.25, tilt: -1.60, lift: 110 }), 60, null, 'easeIn'],
    // Flat on his back in front, feet toward Lou (121); arms slap the mat.
    [AT.impact, pose({ lArm: 0.60, lElbow: 0.3, rArm: 0.50, rElbow: 0.3, lLeg: 0.40, rLeg: 0.30, lKnee: 0.40, rKnee: 0.30, tilt: -1.52, lift: LYING }), 200, 121, 'linear'],
    // Compression: chest curls up off the mat, legs whip up.
    [AT.compress, pose({ lArm: 0.70, lElbow: 0.4, rArm: 0.60, rElbow: 0.4, lLeg: 0.75, rLeg: 0.60, lKnee: 0.80, rKnee: 0.65, bend: 0.28, tilt: -1.52, lift: LYING }), 200, null, 'easeOut'],
    [AT.bounce, pose({ lArm: 0.45, lElbow: 0.3, rArm: 0.40, rElbow: 0.3, lLeg: 0.50, rLeg: 0.38, lKnee: 0.60, rKnee: 0.45, bend: 0.08, tilt: -1.52, lift: LYING }), 200, null, 'easeInOut'],
    [AT.follow, pose({ lArm: 0.25, lElbow: 0.2, rArm: 0.20, rElbow: 0.2, lLeg: 0.22, rLeg: 0.18, lKnee: 0.30, rKnee: 0.25, tilt: -1.52, lift: LYING }), 200, null, 'easeInOut'],
    // Limp, one knee left up; the grounded handoff takes it from here.
    [AT.rest, pose({ lArm: 0.05, lElbow: 0.1, rArm: 0.08, rElbow: 0.1, lLeg: 0.06, rLeg: 0.25, lKnee: 0.10, rKnee: 0.45, tilt: -1.52, lift: LYING }), 200, null, 'easeInOut'],
];

const draft = buildDraft({
    id: 'bodySlam',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
    // George draws behind Lou through the grab and load, so Lou's face and
    // grip read; rolled up over him and overhead he draws in front.
    transformY: (role, at) => (role !== 'defender' ? 0 : at >= AT.lift && at < AT.impact ? 4 : at >= AT.grab && at < AT.lift ? -4 : 0),
});

const out = process.argv[2];
if (!out) throw new Error('usage: author_bodyslam.mjs <out.json> (then stage.mjs; see header)');
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`wrote ${out}`);
