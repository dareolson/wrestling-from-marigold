// Hip toss, first pass — posed to match Bret Hart's WWF Royal Rumble (SNES)
// sheet (see Sprite sheets/reference/wwf-royal-rumble-snes/44459-bret-hart/
// INDEX.md): 345–350 the thrower turning his hip in and loading, 351–356 the
// man going over it and landing flat. Pose reference only.
//
//   node tools/move-editor/author_hiptoss.mjs
//
// writes tools/move-editor/drafts/hiptoss.json ("hip toss — reference pass"
// in the editor) and src/animation/clips/hipToss.js.
//
// Cast: Lou throws George. George goes over forward — tilt 0 through upside
// down (π) to ~3π/2, which for his facing is lying on his back with his feet
// toward Lou — and lands in front of him. George's hips stand 137 off the
// mat; flat is lift -122.

import { pose, buildDraft, writeDraftAndClip } from './authoring.mjs';

const AT = { stance: 0, hook: 0.15, load: 0.30, over: 0.42, down: 0.55, impact: 0.66, rest: 0.95 };

// [time, pose, transform x, reference frame (or null), ease]
const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, lean: 0.05, crouch: 0.05 }), 0, null],
    // Steps in, near arm across his back (346).
    [AT.hook, pose({ lArm: 1.50, rArm: 0.90, lElbow: 1.0, rElbow: 1.4, lLeg: -0.15, rLeg: 0.20, lKnee: 0.35, rKnee: 0.35, lean: 0.10, crouch: 0.25 }), 15, 346],
    // Drops his hip under him (348).
    [AT.load, pose({ lArm: 1.20, rArm: 1.00, lElbow: 1.1, rElbow: 1.3, lLeg: -0.20, rLeg: 0.25, lKnee: 0.50, rKnee: 0.50, lean: 0.45, crouch: 0.45 }), 18, 348, 'easeOut'],
    // Throws him over (349).
    [AT.over, pose({ lArm: 1.60, rArm: 1.40, lElbow: 0.4, rElbow: 0.5, lLeg: -0.15, rLeg: 0.25, lKnee: 0.45, rKnee: 0.45, lean: 0.65, crouch: 0.40 }), 20, 349],
    // Follows through (350).
    [AT.impact, pose({ lArm: 1.00, rArm: 0.90, lElbow: 0.5, rElbow: 0.5, lLeg: -0.10, rLeg: 0.20, lKnee: 0.30, rKnee: 0.30, lean: 0.40, crouch: 0.25 }), 20, 350],
    [AT.rest, pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, lean: 0.05, crouch: 0.05 }), 20, null, 'easeOut'],
];

const defender = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 }), 70, null],
    // Pulled in against him.
    [AT.hook, pose({ lArm: 0.70, rArm: 0.60, lElbow: 0.6, rElbow: 0.6, lean: 0.25, crouch: 0.10 }), 45, null],
    // Bent over the hip (351).
    [AT.load, pose({ lArm: 1.00, rArm: 0.80, lElbow: 0.4, rElbow: 0.4, lLeg: 0.20, rLeg: 0.10, lKnee: 0.30, rKnee: 0.20, tilt: 0.90, lift: 35 }), 30, 351, 'easeOut'],
    // Legs over the top (352).
    [AT.over, pose({ lArm: 1.60, rArm: 1.40, lElbow: 0.3, rElbow: 0.3, lLeg: 0.10, rLeg: 0.00, lKnee: 0.25, rKnee: 0.15, tilt: 2.40, lift: 70 }), 40, 352],
    // Coming down past upside down (353).
    [AT.down, pose({ lArm: 1.80, rArm: 1.60, lElbow: 0.3, rElbow: 0.3, lLeg: 0.20, rLeg: 0.10, lKnee: 0.30, rKnee: 0.20, tilt: 3.60, lift: 40 }), 85, 353, 'easeIn'],
    // Flat on his back, legs bouncing (354–355). Lying tilted back, arm 0
    // lies along the body toward the feet.
    [AT.impact, pose({ lArm: 0.60, rArm: 0.50, lElbow: 0.3, rElbow: 0.3, lLeg: 0.40, rLeg: 0.30, lKnee: 0.40, rKnee: 0.30, tilt: 4.76, lift: -122 }), 125, 355, 'easeIn'],
    [AT.rest, pose({ lArm: 0.05, rArm: 0.05, lElbow: 0.1, rElbow: 0.1, lLeg: 0.05, rLeg: 0.10, lKnee: 0.10, rKnee: 0.10, tilt: 4.76, lift: -122 }), 130, 356],
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

writeDraftAndClip(draft, 'hiptoss.json', 'hipToss.js');
