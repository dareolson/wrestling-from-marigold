// Dive flight (diving elbow and top-rope dive), first pass — posed to match
// the WWF Raw (Genesis) sheet (see Sprite sheets/reference/raw-genesis-44459/
// INDEX.md): frames 209 (springing off, arms up), 210–212 (flying flat, arms
// out), 213 (landing face down). Pose reference only.
//
//   node tools/move-editor/author_dive.mjs
//
// writes tools/move-editor/drafts/dive.json ("dive flight — reference pass"
// in the editor) and src/animation/clips/divingElbow.js — a ONE-wrestler clip
// that only poses the body. The top-rope dive plays the same flight under its
// own id (src/animation/clips/topDive.js). The executor still flies him from
// the turnbuckle onto the target (x AND y), and plays this clip stretched to
// each dive's flight time.
//
// Forward tilt pitches him face down; the last frame lies flat at the mat
// (Lou's hips stand 124 off it: lift ~-110), the prone pose the executor
// hands him to.

import { pose, buildDraft, writeDraftAndSoloClip } from './authoring.mjs';

const AT = { launch: 0, spring: 0.12, fly: 0.32, land: 0.55 };

// [time, pose, transform x (preview only), reference frame (or null), ease]
const attacker = [
    [AT.launch, pose({ lArm: 2.70, rArm: 2.60, lElbow: 0.3, rElbow: 0.3, lLeg: 0.05, rLeg: 0.10, lKnee: 0.40, rKnee: 0.40, crouch: 0.20, lean: -0.10 }), 0, 209],
    // Springing out, arms up and forward (209–210).
    [AT.spring, pose({ lArm: 2.40, rArm: 2.20, lElbow: 0.3, rElbow: 0.3, lLeg: -0.10, rLeg: 0.05, lKnee: 0.20, rKnee: 0.20, tilt: 0.70, lift: 20 }), 30, 210, 'easeOut'],
    // Flat out, arms reaching past the head (211–212).
    [AT.fly, pose({ lArm: 2.90, rArm: 2.70, lElbow: 0.2, rElbow: 0.3, lLeg: -0.05, rLeg: 0.05, lKnee: 0.10, rKnee: 0.15, tilt: 1.45, lift: -20 }), 90, 212],
    // Down on his front (213).
    [AT.land, pose({ lArm: 2.60, rArm: 2.40, lElbow: 0.3, rElbow: 0.3, lLeg: 0.00, rLeg: 0.05, lKnee: 0.10, rKnee: 0.10, tilt: 1.52, lift: -110 }), 140, 213, 'easeIn'],
];

const down = pose({ tilt: -1.52, lift: -122 });
const defender = [[0, down, 180, null], [AT.land, down, 180, null]];

const draft = buildDraft({
    id: 'divingElbow',
    duration: AT.land,
    attacker, defender,
    events: [{ at: AT.land, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
});

writeDraftAndSoloClip(draft, 'dive.json', 'divingElbow.js');
