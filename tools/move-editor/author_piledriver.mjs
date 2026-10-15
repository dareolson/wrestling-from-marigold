// Piledriver, first pass — posed to match the WWF Royal Rumble (SNES) sheet, frames
// 140–153 (see Sprite sheets/reference/wwf-royal-rumble-snes/44459-bret-hart/INDEX.md). The sheet
// is pose reference only: these are our own rig channels, chosen by eye
// against those frames, and the frames ride along in the draft as editor-only
// references so the match can be checked and refined in the move editor.
//
//   node tools/move-editor/author_piledriver.mjs
//
// writes tools/move-editor/drafts/piledriver.json (open "piledriver —
// reference pass" in the editor) and src/animation/clips/piledriver.js.
// Once Derek edits the draft in the editor, export from there instead and
// stop running this.
//
// Cast: George's move, so George attacks and Lou (shipped art) is the victim.
// Lift is in reference-body units (authoring.mjs hipsAt/LYING), so it holds
// for any cast. On shipped Lou, upside down, lift 28 puts the crown on the
// mat and ~98 holds his head at George's thigh height.

import { pose, buildDraft, writeDraftAndClip, LYING, hipsAt } from './authoring.mjs';

const AT = { stance: 0, reach: 0.20, hook: 0.45, up: 0.72, hold: 1.00, hop: 1.12, impact: 1.28, crumple: 1.50, rest: 1.95 };
const DURATION = AT.rest;

// [time, pose, transform x, reference frame (or null), ease]
const attacker = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 }), 0, 130],
    // Bends in and reaches down for the head (141–143).
    [AT.reach, pose({ lArm: 1.00, rArm: 0.90, lElbow: 0.5, rElbow: 0.5, lLeg: -0.20, rLeg: 0.20, lKnee: 0.35, rKnee: 0.35, lean: 0.55, crouch: 0.30 }), 0, 143],
    // Arms round the waist, legs bent to lift (145–146).
    [AT.hook, pose({ lArm: 1.30, rArm: 1.20, lElbow: 1.4, rElbow: 1.4, lLeg: -0.22, rLeg: 0.22, lKnee: 0.45, rKnee: 0.45, lean: 0.35, crouch: 0.35 }), 0, 146],
    // Stands tall with him upside down against his chest (148–149).
    [AT.up, pose({ lArm: 0.55, rArm: 0.45, lElbow: 2.0, rElbow: 2.0, lLeg: -0.15, rLeg: 0.15, lean: -0.12, crouch: 0.05 }), 0, 148],
    [AT.hold, pose({ lArm: 0.55, rArm: 0.45, lElbow: 2.0, rElbow: 2.0, lLeg: -0.15, rLeg: 0.15, lean: -0.15, crouch: 0.05 }), 0, 149],
    // Small hop to drive it home.
    [AT.hop, pose({ lArm: 0.55, rArm: 0.45, lElbow: 2.0, rElbow: 2.0, lLeg: -0.10, rLeg: 0.10, lKnee: 0.1, rKnee: 0.1, lean: -0.10, lift: 14 }), 0, null, 'easeOut'],
    // Sits straight down, legs out in front, hips 17 off the mat.
    [AT.impact, pose({ lArm: -0.30, rArm: -0.25, lElbow: 0.3, rElbow: 0.3, lLeg: 1.40, rLeg: 1.30, lKnee: 0.15, rKnee: 0.15, lean: -0.15, lift: hipsAt(17) }), 0, null, 'easeIn'],
    [AT.crumple, pose({ lArm: -0.35, rArm: -0.30, lElbow: 0.3, rElbow: 0.3, lLeg: 1.40, rLeg: 1.30, lKnee: 0.15, rKnee: 0.15, lean: -0.20, lift: hipsAt(17) }), 0, null],
    // Falls back flat, ready for the executor's 'down'.
    [AT.rest, pose({ lArm: 0.10, rArm: 0.05, lElbow: 0.3, rElbow: 0.3, lLeg: 0.00, rLeg: 0.10, lKnee: 0.1, rKnee: 0.1, tilt: -1.50, lift: LYING }), -10, null],
];

const defender = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, lean: 0.05, crouch: 0.05 }), 72, 100],
    // Doubled over, head into George's middle (150).
    [AT.reach, pose({ lArm: 0.60, rArm: 0.50, lElbow: 0.4, rElbow: 0.4, lean: 0.75, crouch: 0.20, tilt: 0.35 }), 64, 150],
    // Going over, past horizontal (151).
    [AT.hook, pose({ lArm: 0.20, rArm: -0.20, lElbow: 0.3, rElbow: 0.3, lLeg: 0.0, rLeg: 0.05, lKnee: 0.1, rKnee: 0.1, tilt: 1.70, lift: 60 }), 30, 151],
    // Straight up and down, arms hanging toward the mat (152).
    [AT.up, pose({ lArm: 2.80, rArm: 2.90, lElbow: 0.2, rElbow: 0.2, lLeg: 0.0, rLeg: 0.0, lKnee: 0.05, rKnee: 0.05, tilt: 3.14, lift: 98 }), 14, 152],
    [AT.hold, pose({ lArm: 2.75, rArm: 2.95, lElbow: 0.3, rElbow: 0.2, lLeg: 0.05, rLeg: -0.05, lKnee: 0.30, rKnee: 0.10, tilt: 3.14, lift: 98 }), 14, null],
    [AT.hop, pose({ lArm: 2.80, rArm: 2.90, lElbow: 0.2, rElbow: 0.2, lLeg: 0.0, rLeg: 0.0, lKnee: 0.05, rKnee: 0.05, tilt: 3.14, lift: 112 }), 14, null, 'easeOut'],
    // Crown into the mat (153).
    [AT.impact, pose({ lArm: 2.50, rArm: 2.60, lElbow: 0.4, rElbow: 0.4, lLeg: 0.05, rLeg: -0.05, lKnee: 0.15, rKnee: 0.15, tilt: 3.14, lift: 28 }), 14, 153, 'easeIn'],
    // Folds over onto his back, legs falling over George's side.
    [AT.crumple, pose({ lArm: 2.20, rArm: 2.40, lElbow: 0.6, rElbow: 0.5, lLeg: 0.30, rLeg: 0.20, lKnee: 0.50, rKnee: 0.40, tilt: 3.90, lift: -30 }), 30, null],
    // Tilted onto his back, arm 0 lies along the body toward the feet.
    [AT.rest, pose({ lArm: 0.05, rArm: 0.05, lElbow: 0.1, rElbow: 0.1, lLeg: 0.05, rLeg: 0.10, lKnee: 0.10, rKnee: 0.10, tilt: 4.66, lift: LYING }), 40, null],
];

// Upside down, the victim's body has to read against the attacker's front, so
// from the hook on he stands a hair nearer the camera, which draws him in
// front (draw order follows ring depth, in game and in the editor).
const draft = buildDraft({
    id: 'piledriver',
    duration: DURATION,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    characters: { attacker: 'george', defender: 'thesz' },
    transformY: (role, at) => (role === 'defender' && at >= AT.hook ? 4 : 0),
});

writeDraftAndClip(draft, 'piledriver.json', 'piledriver.js');
