// Thesz press flight, first pass — Lou's flying body press, posed to match
// the WWF Raw (Genesis) sheet's flying cross-body (see Sprite sheets/
// reference/raw-genesis-44459/INDEX.md): frames 210 (leaving his feet),
// 211–212 (flat in the air, arms out), 213 (down on top). Pose reference only.
//
//   node tools/move-editor/author_theszpress.mjs
//
// writes tools/move-editor/drafts/theszpress.json ("Thesz press flight —
// reference pass" in the editor) and src/animation/clips/theszPress.js — a
// ONE-wrestler clip that only poses the body; the executor flies him onto
// the target (420 ms) and turns a hit into the pin.
//
// Lower and flatter than the dives: he launches off the mat, so the body is
// lifted ~45 at the top of the leap, arms spread to wrap the man he lands
// on. The last frame lies flat face down at the mat (Lou's hips stand 124
// off it: lift ~-110), on top of the target.

import { pose, buildDraft, writeDraftAndSoloClip } from './authoring.mjs';

const AT = { launch: 0, leap: 0.12, flat: 0.26, land: 0.42 };

// [time, pose, transform x (preview only), reference frame (or null), ease]
const attacker = [
    [AT.launch, pose({ lArm: 0.50, rArm: 0.40, lElbow: 0.5, rElbow: 0.5, lLeg: -0.10, rLeg: 0.20, lKnee: 0.50, rKnee: 0.50, lean: 0.25, crouch: 0.35 }), 0, null],
    // Leaving his feet, arms coming up and out (210).
    [AT.leap, pose({ lArm: 1.90, rArm: 1.60, lElbow: 0.4, rElbow: 0.5, lLeg: -0.20, rLeg: 0.10, lKnee: 0.30, rKnee: 0.30, tilt: 0.80, lift: 40 }), 40, 210, 'easeOut'],
    // Flat out, arms spread to wrap him (211–212).
    [AT.flat, pose({ lArm: 2.30, rArm: 1.30, lElbow: 0.3, rElbow: 0.4, lLeg: -0.10, rLeg: 0.05, lKnee: 0.15, rKnee: 0.20, tilt: 1.45, lift: 45 }), 95, 212],
    // Down on top of him (213).
    [AT.land, pose({ lArm: 2.10, rArm: 1.20, lElbow: 0.5, rElbow: 0.5, lLeg: 0.00, rLeg: 0.05, lKnee: 0.15, rKnee: 0.15, tilt: 1.52, lift: -110 }), 150, 213, 'easeIn'],
];

// The standing target, for the preview only.
const stand = pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 });
const defender = [[0, stand, 190, null], [AT.land, stand, 190, null]];

const draft = buildDraft({
    id: 'theszPress',
    duration: AT.land,
    attacker, defender,
    events: [{ at: AT.land, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
});

writeDraftAndSoloClip(draft, 'theszpress.json', 'theszPress.js');
