// Body slam, first pass — posed to match the WWF Raw (Genesis) sheet (see
// Sprite sheets/reference/raw-genesis-44459/INDEX.md): attacker frames
// 322–328 (grab, lift, drive down, recover), victim frames 120–121 (arched
// over, flat on the back). Pose reference only; the frames ride along as
// editor-only references.
//
//   node tools/move-editor/author_bodyslam.mjs
//
// writes tools/move-editor/drafts/bodyslam.json ("body slam — reference pass"
// in the editor) and src/animation/clips/bodySlam.js. Once the draft is edited
// in the editor, export from there instead.
//
// Cast: Lou's move, so Lou (shipped art) attacks and George is the victim.
// George's hips stand 137 rig units off the mat, so lift moves them from
// there: +45 is Lou's chest, +70 his shoulders, -122 flat on the mat. He
// lands with his hips ~165 out, so his legs (about as long as his hips are
// high) end just short of Lou's boots.
// Backward tilt (negative) puts George's head away from Lou, so he lands on
// his back with his feet toward Lou — the grounded supine pose for his facing.

import { pose, buildDraft, writeDraftAndClip } from './authoring.mjs';

const AT = { stance: 0, grab: 0.16, scoop: 0.40, peak: 0.66, impact: 0.86, follow: 1.05, rest: 1.35 };

// [time, pose, transform x, reference frame (or null), ease]
const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, lean: 0.05, crouch: 0.05 }), 0, 322],
    // Steps in and grabs low (323).
    [AT.grab, pose({ lArm: 1.00, rArm: 0.90, lElbow: 0.9, rElbow: 0.9, lLeg: -0.15, rLeg: 0.20, lKnee: 0.35, rKnee: 0.35, lean: 0.35, crouch: 0.25 }), 0, 323],
    // Scoops him up against the chest, legs bent under the load (194).
    [AT.scoop, pose({ lArm: 1.20, rArm: 1.00, lElbow: 1.6, rElbow: 1.6, lLeg: -0.20, rLeg: 0.20, lKnee: 0.45, rKnee: 0.45, lean: 0.20, crouch: 0.40 }), 0, 194],
    // Stands tall with him across the shoulders (324).
    [AT.peak, pose({ lArm: 2.70, rArm: 2.55, lElbow: 0.35, rElbow: 0.45, lLeg: -0.15, rLeg: 0.15, lean: -0.15, crouch: 0.05 }), 0, 324, 'easeOut'],
    // Drives him down in front (326–327).
    [AT.impact, pose({ lArm: 1.30, rArm: 1.20, lElbow: 0.3, rElbow: 0.3, lLeg: -0.20, rLeg: 0.25, lKnee: 0.40, rKnee: 0.40, lean: 0.55, crouch: 0.30 }), 6, 326, 'easeIn'],
    // Follows through, still bent over him (328).
    [AT.follow, pose({ lArm: 0.80, rArm: 0.70, lElbow: 0.4, rElbow: 0.4, lLeg: -0.15, rLeg: 0.20, lKnee: 0.30, rKnee: 0.30, lean: 0.40, crouch: 0.20 }), 6, 328],
    [AT.rest, pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, lean: 0.05, crouch: 0.05 }), 6, null],
];

const defender = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 }), 72, null],
    // Grabbed, bent in toward him.
    [AT.grab, pose({ lArm: 0.70, rArm: 0.60, lElbow: 0.5, rElbow: 0.5, lean: 0.30, crouch: 0.15 }), 55, null],
    // Upside down against Lou's chest, legs up (120, arching over).
    [AT.scoop, pose({ lArm: 1.50, rArm: 1.30, lElbow: 0.6, rElbow: 0.5, lLeg: 0.10, rLeg: 0.00, lKnee: 0.30, rKnee: 0.20, tilt: -2.60, lift: 45 }), 24, 120],
    // Swung flat across the shoulders.
    [AT.peak, pose({ lArm: 1.90, rArm: 1.70, lElbow: 0.4, rElbow: 0.4, lLeg: 0.20, rLeg: 0.10, lKnee: 0.25, rKnee: 0.20, tilt: -1.70, lift: 70 }), 28, null, 'easeOut'],
    // Flat on his back on the mat, legs bouncing up (121).
    // Lying tilted back, arm/leg 0 runs along the body toward the feet, so
    // these are small: arms flung a little off the mat, legs bouncing up.
    [AT.impact, pose({ lArm: 0.60, rArm: 0.50, lElbow: 0.3, rElbow: 0.3, lLeg: 0.40, rLeg: 0.30, lKnee: 0.40, rKnee: 0.30, tilt: -1.52, lift: -122 }), 160, 121, 'easeIn'],
    [AT.follow, pose({ lArm: 0.30, rArm: 0.25, lElbow: 0.2, rElbow: 0.2, lLeg: 0.15, rLeg: 0.10, lKnee: 0.20, rKnee: 0.15, tilt: -1.52, lift: -122 }), 165, null],
    // Settles into the grounded supine pose the executor hands him to.
    [AT.rest, pose({ lArm: 0.05, rArm: 0.05, lElbow: 0.1, rElbow: 0.1, lLeg: 0.05, rLeg: 0.10, lKnee: 0.10, rKnee: 0.10, tilt: -1.52, lift: -122 }), 165, null],
];

const draft = buildDraft({
    id: 'bodySlam',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
    // Held up across Lou, George draws in front of him (nearer the camera).
    transformY: (role, at) => (role === 'defender' && at >= AT.scoop && at < AT.impact ? 4 : 0),
});

writeDraftAndClip(draft, 'bodyslam.json', 'bodySlam.js');
