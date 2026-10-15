// Dropkick, first pass — posed to match the WWF Royal Rumble (SNES) sheet (see
// Sprite sheets/reference/wwf-royal-rumble-snes/44459-bret-hart/INDEX.md): frames 225–226
// (crouch, take off), 227 (tucked in the air), 229 (both legs out, leaning
// back), 231 (landing), 232 (flat on the back). Pose reference only; the
// frames ride along as editor-only references.
//
//   node tools/move-editor/author_dropkick.mjs
//
// writes tools/move-editor/drafts/dropkick.json ("dropkick — reference pass"
// in the editor) and src/animation/clips/dropkick.js — a ONE-wrestler clip:
// the executor keeps moving him across to the target, as before, so the clip
// carries no transform and no defender (authoring.mjs soloClip). The draft's
// travel and standing George are there for the preview only.
//
// Body tilt is backward (negative): head away from the target. Leaning back
// by 1.2, a hip angle of ~0.37 puts the legs level, pointing at him.

import { pose, buildDraft, writeDraftAndSoloClip } from './authoring.mjs';

const AT = { stance: 0, crouch: 0.10, tuck: 0.22, kick: 0.36, land: 0.48, flat: 0.62 };

// [time, pose, transform x (preview only), reference frame (or null), ease]
const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, lean: 0.05, crouch: 0.05 }), 0, 224],
    // Loads up (225).
    [AT.crouch, pose({ lArm: -0.40, rArm: -0.30, lElbow: 0.5, rElbow: 0.5, lLeg: 0.10, rLeg: 0.20, lKnee: 0.70, rKnee: 0.70, lean: 0.20, crouch: 0.50 }), 8, 225, 'easeOut'],
    // Off the mat, knees tucked, arms up (226–227).
    [AT.tuck, pose({ lArm: 2.60, rArm: 2.40, lElbow: 0.6, rElbow: 0.6, lLeg: 1.20, rLeg: 1.05, lKnee: 1.60, rKnee: 1.50, tilt: -0.35, lift: 60 }), 30, 227, 'easeOut'],
    // Both legs out level at the chest, leaning back (229).
    [AT.kick, pose({ lArm: 2.10, rArm: 1.90, lElbow: 0.5, rElbow: 0.5, lLeg: 0.37, rLeg: 0.30, lKnee: 0.05, rKnee: 0.08, tilt: -1.20, lift: 70 }), 55, 229],
    // Coming down on the backside (231).
    [AT.land, pose({ lArm: 2.30, rArm: 2.20, lElbow: 0.5, rElbow: 0.5, lLeg: 0.40, rLeg: 0.35, lKnee: 0.20, rKnee: 0.20, tilt: -1.45, lift: 5 }), 58, 231, 'easeIn'],
    // Flat on his back (232); Lou's hips stand 124 off the mat. Lying tilted
    // back, arm 0 runs along the body toward the feet.
    [AT.flat, pose({ lArm: 0.30, rArm: 0.25, lElbow: 0.2, rElbow: 0.2, lLeg: 0.10, rLeg: 0.15, lKnee: 0.10, rKnee: 0.10, tilt: -1.52, lift: -109 }), 58, 232],
];

// The target, standing, for the preview only.
const stand = pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 });
const defender = [[0, stand, 150, null], [AT.flat, stand, 150, null]];

const draft = buildDraft({
    id: 'dropkick',
    duration: AT.flat,
    attacker, defender,
    events: [{ at: AT.kick, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
});

writeDraftAndSoloClip(draft, 'dropkick.json', 'dropkick.js');
