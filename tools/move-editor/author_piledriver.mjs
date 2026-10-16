// Piledriver, second pass (2026-10-15, MOVE_REFINEMENT_METHOD.md). The job:
// a lift into a dangerous upside-down hold, a beat of suspense, a sharp drop
// and a sickening stop, then the crumple.
//
// v1 (Royal Rumble sheet 130–153, still carried as references) had no grip
// on the lift or the hold, no load before the lift (its `lean` never
// rendered), and ended with Lou lying across George: both supine, Lou's feet
// toppled over George's lap. An upside-down man facing his attacker falls
// FORWARD when let go, so v2 crumples Lou onto his face (prone: head toward
// George, feet falling away) and George sits out and rocks back on his own.
//
// Rebuild (dev server on :5173):
//   node tools/move-editor/author_piledriver.mjs /tmp/piledriver.unstaged.json
//   node tools/move-critic/stage.mjs /tmp/piledriver.unstaged.json tools/move-editor/piledriver.constraints.mjs /tmp/piledriver.json
//   node tools/move-editor/export_draft.mjs /tmp/piledriver.json piledriver.json piledriver.js
//
// Cast: George's move, so George attacks and Lou is the victim. Lou's x and
// lift through the hold are starting guesses for stage.mjs.

import { writeFileSync } from 'node:fs';
import { pose, buildDraft, LYING, hipsAt } from './authoring.mjs';

export const AT = {
    stance: 0, reach: 0.18, tuck: 0.32, load: 0.46, lift: 0.62, over: 0.71, up: 0.80, hold: 1.02, rise: 1.10,
    impact: 1.24, compress: 1.27, balance: 1.42, topple: 1.62, land: 1.74, bounce: 1.80, rest: 2.00,
};

const GEORGE_LEGS = { lLeg: -0.18, rLeg: 0.13 };
const SIT_LEGS = { lLeg: 1.40, rLeg: 1.30, lKnee: 0.15, rKnee: 0.15 };
// Arms round Lou's waist; stage.mjs puts the hands on his hips.
const WRAP = { lArm: 1.10, lElbow: 1.5, rArm: 0.95, rElbow: 1.6 };

// George faces right: lArm is his near arm.
const attacker = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, ...GEORGE_LEGS, crouch: 0.22 }), 0, 130],
    // Steps in over the bent man and reaches down for his waist (141–143).
    [AT.reach, pose({ lArm: 1.00, lElbow: 0.6, rArm: 0.90, rElbow: 0.6, ...GEORGE_LEGS, crouch: 0.20, bend: 0.45 }), 0, 143, 'easeIn'],
    // Head tucked between the thighs, arms round the waist (145).
    [AT.tuck, pose({ ...WRAP, ...GEORGE_LEGS, crouch: 0.26, bend: 0.82 }), 0, 145, 'easeOut'],
    // Sits into the knees: the load.
    [AT.load, pose({ ...WRAP, ...GEORGE_LEGS, crouch: 0.42, bend: 0.62 }), 0, 146, 'easeInOut'],
    // Drives up; Lou's legs swing up over George's shoulder.
    [AT.lift, pose({ ...WRAP, ...GEORGE_LEGS, crouch: 0.14, bend: 0.06 }), 0, null, 'easeIn'],
    [AT.over, pose({ ...WRAP, ...GEORGE_LEGS, crouch: 0.07, bend: -0.06 }), 0, null, 'linear'],
    // Tall, arched back under the weight, Lou straight up and down (148).
    [AT.up, pose({ ...WRAP, ...GEORGE_LEGS, crouch: 0.03, bend: -0.14 }), 0, 148, 'easeOut'],
    // The suspense: held up there, a slow settle.
    [AT.hold, pose({ ...WRAP, ...GEORGE_LEGS, crouch: 0.07, bend: -0.10 }), 0, 149, 'easeInOut'],
    // Up on his toes before the drop.
    [AT.rise, pose({ ...WRAP, ...GEORGE_LEGS, bend: -0.04, lift: 8 }), 0, null, 'easeOut'],
    // Sits out, legs straight out in front; the jolt goes through his back.
    [AT.impact, pose({ ...WRAP, ...SIT_LEGS, bend: 0.10, lift: hipsAt(17) }), 0, null, 'easeIn'],
    [AT.compress, pose({ ...WRAP, ...SIT_LEGS, bend: 0.24, lift: hipsAt(15) }), 0, null, 'easeOut'],
    // Lets go.
    [AT.balance, pose({ lArm: 0.70, lElbow: 0.5, rArm: 0.60, rElbow: 0.6, ...SIT_LEGS, bend: 0.02, lift: hipsAt(17) }), 0, null, 'easeInOut'],
    // Rocks back off his seat, arms thrown forward, knees tucked, sliding out from under Lou as
    // he goes over (sat-out legs would be right where Lou falls).
    [AT.topple, pose({ lArm: 1.20, lElbow: 0.4, rArm: 1.05, rElbow: 0.5, lLeg: 2.0, rLeg: 1.9, lKnee: 1.4, rKnee: 1.3, bend: -0.30, tilt: -0.70, lift: hipsAt(20) }), -40, null, 'easeInOut'],
    // Down on his back himself, knees still up from the rock.
    [AT.land, pose({ lArm: 0.30, lElbow: 0.3, rArm: 0.25, rElbow: 0.3, lLeg: 1.40, rLeg: 1.30, lKnee: 1.20, rKnee: 1.10, tilt: -1.52, lift: LYING }), -100, null, 'easeIn'],
    [AT.bounce, pose({ lArm: 0.25, lElbow: 0.3, rArm: 0.20, rElbow: 0.3, lLeg: 0.90, rLeg: 0.80, lKnee: 0.90, rKnee: 0.80, tilt: -1.52, lift: LYING }), -100, null, 'easeOut'],
    [AT.rest, pose({ lArm: 0.08, lElbow: 0.2, rArm: 0.06, rElbow: 0.2, lLeg: 0.10, rLeg: 0.20, lKnee: 0.15, rKnee: 0.35, tilt: -1.52, lift: LYING }), -100, null, 'easeInOut'],
];

// Lou faces left: rArm is his near arm. His tilt grows forward (positive)
// through the lift to straight upside down, then falls back to face down.
const defender = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, crouch: 0.05 }), 72, 100],
    // Doubled over, head toward George's middle (150).
    [AT.reach, pose({ lArm: 0.60, lElbow: 0.4, rArm: 0.50, rElbow: 0.4, crouch: 0.12, bend: 0.55 }), 66, 150, 'easeIn'],
    [AT.tuck, pose({ lArm: 0.40, lElbow: 0.3, rArm: 0.35, rElbow: 0.3, crouch: 0.15, bend: 0.95 }), 46, null, 'easeOut'],
    [AT.load, pose({ lArm: 0.45, lElbow: 0.3, rArm: 0.40, rElbow: 0.3, crouch: 0.12, bend: 1.00 }), 44, null, 'easeInOut'],
    // Going over, legs trailing up (151).
    [AT.lift, pose({ lArm: 1.40, lElbow: 0.4, rArm: 1.20, rElbow: 0.5, lLeg: -0.25, rLeg: -0.10, lKnee: 0.50, rKnee: 0.35, bend: 0.30, tilt: 1.75, lift: 55 }), 30, 151, 'easeIn'],
    [AT.over, pose({ lArm: 2.20, lElbow: 0.3, rArm: 2.10, rElbow: 0.4, lLeg: -0.12, rLeg: -0.04, lKnee: 0.25, rKnee: 0.15, bend: 0.15, tilt: 2.55, lift: 85 }), 20, null, 'linear'],
    // Straight up and down, arms hanging toward the mat (152).
    [AT.up, pose({ lArm: 2.85, lElbow: 0.2, rArm: 2.90, rElbow: 0.2, lLeg: 0.0, rLeg: 0.0, lKnee: 0.05, rKnee: 0.05, bend: 0.05, tilt: 3.14, lift: 98 }), 14, 152, 'easeOut'],
    [AT.hold, pose({ lArm: 2.75, lElbow: 0.3, rArm: 2.95, rElbow: 0.2, lLeg: 0.06, rLeg: -0.06, lKnee: 0.25, rKnee: 0.10, tilt: 3.12, lift: 98 }), 14, null, 'easeInOut'],
    [AT.rise, pose({ lArm: 2.80, lElbow: 0.2, rArm: 2.90, rElbow: 0.2, lLeg: 0.0, rLeg: 0.0, lKnee: 0.05, rKnee: 0.05, tilt: 3.14, lift: 106 }), 14, null, 'easeOut'],
    // Crown into the mat (153); arms flung out to the sides, clear of it.
    [AT.impact, pose({ lArm: 1.95, lElbow: 0.5, rArm: 2.05, rElbow: 0.5, lLeg: 0.05, rLeg: -0.05, lKnee: 0.10, rKnee: 0.10, tilt: 3.14, lift: 28 }), 14, 153, 'easeIn'],
    // The jolt runs up the body: knees buckle.
    [AT.compress, pose({ lArm: 1.85, lElbow: 0.6, rArm: 1.95, rElbow: 0.6, lLeg: 0.10, rLeg: -0.02, lKnee: 0.45, rKnee: 0.35, bend: 0.12, tilt: 3.14, lift: 24 }), 14, null, 'easeOut'],
    // A sick beat still balanced on his head, already limp.
    [AT.balance, pose({ lArm: 1.60, lElbow: 0.6, rArm: 1.70, rElbow: 0.6, lLeg: 0.20, rLeg: 0.10, lKnee: 0.55, rKnee: 0.45, bend: 0.18, tilt: 3.02, lift: 24 }), 16, null, 'easeInOut'],
    // Goes over forward, pivoting on his head (hips swing away from George),
    // limp arms trailing along his body (hanging, they dug into the mat).
    [AT.topple, pose({ lArm: 0.50, lElbow: 0.3, rArm: 0.40, rElbow: 0.3, lLeg: 0.25, rLeg: 0.15, lKnee: 0.50, rKnee: 0.40, bend: 0.10, tilt: 2.25, lift: -10 }), 80, null, 'easeIn'],
    // Face down, flat (the grounded prone pose takes it from here). Prone,
    // a positive arm angle points into the mat: his front faces down.
    [AT.land, pose({ lArm: -0.05, lElbow: 0.2, rArm: -0.10, rElbow: 0.2, lLeg: 0.05, rLeg: -0.05, lKnee: 0.20, rKnee: 0.15, tilt: 1.57, lift: LYING }), 150, null, 'linear'],
    [AT.bounce, pose({ lArm: 0.0, lElbow: 0.3, rArm: -0.05, rElbow: 0.3, lLeg: -0.12, rLeg: -0.20, lKnee: 0.25, rKnee: 0.20, tilt: 1.57, lift: LYING }), 150, null, 'easeOut'],
    [AT.rest, pose({ lArm: -0.08, lElbow: 0.2, rArm: -0.12, rElbow: 0.2, lLeg: 0.05, rLeg: -0.05, lKnee: 0.15, rKnee: 0.15, tilt: 1.57, lift: LYING }), 150, null, 'easeInOut'],
];

const draft = buildDraft({
    id: 'piledriver',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    // Crown on the mat from the drop through the balance beat, let go over
    // the topple: lift alone leaves a shorter trunk (Procreate Lou, George)
    // short of the mat (Codex review 2026-10-15).
    floorContacts: [{ role: 'defender', point: 'crown', in: [AT.rise, AT.impact], out: [AT.balance, AT.topple] }],
    // ...without letting go of his waist: the hands follow his hips on every
    // cast (stage.mjs solved them on shipped Lou only).
    grips: ['l', 'r'].map(arm => ({ role: 'attacker', arm, to: { role: 'defender', joint: 'Hip', side: 'same' }, in: [AT.reach, AT.tuck], out: [AT.compress, AT.balance] })),
    characters: { attacker: 'george', defender: 'thesz' },
    // Upside down, Lou's body reads against George's front, so from the tuck
    // on he draws nearer the camera.
    transformY: (role, at) => (role === 'defender' && at >= AT.tuck ? 4 : 0),
});

const out = process.argv[2];
if (!out) throw new Error('usage: author_piledriver.mjs <out.json> (then stage.mjs; see header)');
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`wrote ${out}`);
