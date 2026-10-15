// Elbow drop flight, first pass — posed to match the WWF Royal Rumble (SNES) sheet
// (see Sprite sheets/reference/wwf-royal-rumble-snes/44459-bret-hart/INDEX.md): frames 165–167
// (up off the mat), 168 (flat in the air, elbow down). Pose reference only.
//
//   node tools/move-editor/author_elbowdrop.mjs
//
// writes tools/move-editor/drafts/elbowdrop.json ("elbow drop — reference
// pass" in the editor) and src/animation/clips/elbowDrop.js — a ONE-wrestler
// clip covering only the flight (the executor keeps the crouch/raise wind-up
// before it and the landing poses after it, and moves him onto the target).
//
// Forward tilt (positive) pitches him face down. Prone, "down" is the body's
// front, so a near upper arm forward ~1.5 points the elbow at the mat and a
// deep elbow bend folds the forearm back along it. Lou's hips stand 124 off
// the mat; flat at the mat is lift ~-95.

import { pose, buildDraft, writeDraftAndSoloClip, LYING, hipsAt } from './authoring.mjs';

const AT = { launch: 0, rise: 0.12, over: 0.24, impact: 0.38 };

// [time, pose, transform x (preview only), reference frame (or null), ease]
const attacker = [
    // Where the wind-up leaves him: POSES.elbowRaise.
    [AT.launch, pose({ lLeg: 0.10, rLeg: 0.05, lArm: -1.40, rArm: 0.15, lean: -0.12 }), 0, 165],
    // Up off the mat, knees bent, elbow cocked (166–167).
    [AT.rise, pose({ lArm: -1.20, rArm: 0.60, lElbow: 2.20, rElbow: 0.8, lLeg: 0.30, rLeg: 0.20, lKnee: 0.60, rKnee: 0.50, tilt: 0.40, lift: 70 }), 25, 167, 'easeOut'],
    // Turning flat in the air, elbow pointed at the mat (168).
    [AT.over, pose({ lArm: 1.50, rArm: 0.90, lElbow: 2.40, rElbow: 0.6, lLeg: -0.10, rLeg: 0.05, lKnee: 0.30, rKnee: 0.20, tilt: 1.35, lift: 80 }), 50, 168],
    // Elbow into the mat.
    [AT.impact, pose({ lArm: 1.55, rArm: 1.00, lElbow: 2.50, rElbow: 0.5, lLeg: -0.05, rLeg: 0.05, lKnee: 0.20, rKnee: 0.15, tilt: 1.50, lift: -95 }), 70, null, 'easeIn'],
];

// The downed target, for the preview only: George lying on his back.
const down = pose({ tilt: -1.52, lift: LYING });
const defender = [[0, down, 120, null], [AT.impact, down, 120, null]];

const draft = buildDraft({
    id: 'elbowDrop',
    duration: AT.impact,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
});

writeDraftAndSoloClip(draft, 'elbowdrop.json', 'elbowDrop.js');
