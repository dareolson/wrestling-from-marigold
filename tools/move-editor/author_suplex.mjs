// Vertical suplex, first pass — posed to match the WWF Royal Rumble (SNES) sheet
// (see Sprite sheets/reference/wwf-royal-rumble-snes/44459-bret-hart/INDEX.md): attacker frames
// 372 (hook), 370/374 (lift, leaning back, arms overhead); victim frames 357
// (lifted), 359–360 (upside down overhead), 363–365 (coming down, flat on the
// back). Pose reference only; the frames ride along as editor-only references.
//
//   node tools/move-editor/author_suplex.mjs
//
// writes tools/move-editor/drafts/suplex.json ("suplex — reference pass" in
// the editor) and src/animation/clips/suplex.js. Once the draft is edited in
// the editor, export from there instead.
//
// Cast: both kits have it; posed on Lou suplexing George. George's hips stand
// 137 off the mat, so lift 200 holds him straight up with his head at Lou's
// shoulders. Both go over backward: George keeps rotating forward past upside
// down (tilt π → ~3π/2), which lands him on his back BEHIND Lou with his head
// toward him; Lou tilts back flat. George lands a step further from the camera
// so the two bodies read as two.

import { pose, buildDraft, writeDraftAndClip } from './authoring.mjs';

const AT = { stance: 0, hook: 0.18, rise: 0.42, up: 0.62, hold: 0.92, over: 1.10, impact: 1.28, rest: 1.60 };

// [time, pose, transform x, reference frame (or null), ease]
const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, lean: 0.05, crouch: 0.05 }), 0, null],
    // Near arm over the head, far arm at the waist (372).
    [AT.hook, pose({ lArm: 1.60, rArm: 1.00, lElbow: 1.2, rElbow: 1.4, lLeg: -0.15, rLeg: 0.20, lKnee: 0.35, rKnee: 0.35, lean: 0.35, crouch: 0.20 }), 0, 372],
    // Drives up out of the knees.
    [AT.rise, pose({ lArm: 2.30, rArm: 2.10, lElbow: 0.8, rElbow: 0.9, lLeg: -0.15, rLeg: 0.15, lKnee: 0.25, rKnee: 0.25, lean: -0.05, crouch: 0.10 }), 0, 370, 'easeOut'],
    // Tall, leaning back, arms straight overhead (374).
    [AT.up, pose({ lArm: 2.90, rArm: 2.80, lElbow: 0.4, rElbow: 0.4, lLeg: -0.12, rLeg: 0.15, lean: -0.30 }), 0, 374],
    [AT.hold, pose({ lArm: 2.90, rArm: 2.80, lElbow: 0.4, rElbow: 0.4, lLeg: -0.12, rLeg: 0.15, lean: -0.40 }), 0, null],
    // Falling back.
    [AT.over, pose({ lArm: 2.80, rArm: 2.70, lElbow: 0.4, rElbow: 0.4, lLeg: 0.10, rLeg: 0.20, lKnee: 0.3, rKnee: 0.3, tilt: -0.80, lift: -35 }), -10, null, 'easeIn'],
    // Flat on his back; Lou's hips stand 124 off the mat, so lift -109.
    [AT.impact, pose({ lArm: 2.50, rArm: 2.40, lElbow: 0.4, rElbow: 0.4, lLeg: 0.15, rLeg: 0.25, lKnee: 0.3, rKnee: 0.25, tilt: -1.52, lift: -109 }), -20, null, 'easeIn'],
    [AT.rest, pose({ lArm: 2.20, rArm: 2.10, lElbow: 0.3, rElbow: 0.3, lLeg: 0.05, rLeg: 0.10, lKnee: 0.1, rKnee: 0.1, tilt: -1.52, lift: -109 }), -20, null],
];

const defender = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 }), 72, null],
    // Head trapped, bent in toward him.
    [AT.hook, pose({ lArm: 0.70, rArm: 0.50, lElbow: 0.5, rElbow: 0.5, lean: 0.45, crouch: 0.15, tilt: 0.30 }), 46, 357],
    // Going up, past horizontal.
    [AT.rise, pose({ lArm: 0.90, rArm: 0.70, lElbow: 0.3, rElbow: 0.3, lLeg: 0.05, rLeg: 0.00, lKnee: 0.15, rKnee: 0.10, tilt: 1.80, lift: 95 }), 20, 359, 'easeOut'],
    // Straight up, upside down over Lou (359–360).
    [AT.up, pose({ lArm: 2.60, rArm: 2.40, lElbow: 0.3, rElbow: 0.3, lLeg: 0.00, rLeg: 0.00, lKnee: 0.05, rKnee: 0.05, tilt: 3.14, lift: 200 }), 8, 360],
    [AT.hold, pose({ lArm: 2.60, rArm: 2.40, lElbow: 0.3, rElbow: 0.3, lLeg: 0.05, rLeg: -0.05, lKnee: 0.15, rKnee: 0.05, tilt: 3.20, lift: 205 }), 4, null],
    // Over the top and coming down behind (363).
    [AT.over, pose({ lArm: 2.20, rArm: 2.00, lElbow: 0.4, rElbow: 0.4, lLeg: 0.20, rLeg: 0.10, lKnee: 0.30, rKnee: 0.20, tilt: 3.95, lift: 110 }), -90, 363, 'easeIn'],
    // Flat on his back behind Lou, legs bouncing (365). Tilt ~3π/2 is the
    // supine pose for his facing: feet away from Lou, head toward him.
    [AT.impact, pose({ lArm: 0.70, rArm: 0.60, lElbow: 0.3, rElbow: 0.3, lLeg: 0.40, rLeg: 0.30, lKnee: 0.40, rKnee: 0.30, tilt: 4.76, lift: -122 }), -210, 365, 'easeIn'],
    // Lying tilted back, arm 0 lies along the body toward the feet.
    [AT.rest, pose({ lArm: 0.05, rArm: 0.05, lElbow: 0.1, rElbow: 0.1, lLeg: 0.05, rLeg: 0.10, lKnee: 0.10, rKnee: 0.10, tilt: 4.76, lift: -122 }), -215, null],
];

const draft = buildDraft({
    id: 'suplex',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
    // Held overhead George draws in front of Lou; landing behind him he lies a
    // step further from the camera, so he draws behind.
    transformY: (role, at) => (role !== 'defender' ? 0 : at >= AT.over ? -6 : at >= AT.rise ? 4 : 0),
});

writeDraftAndClip(draft, 'suplex.json', 'suplex.js');
