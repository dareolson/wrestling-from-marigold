// Figure-four leglock, first pass — George's, borrowed from Ric Flair's
// signature row on the WWF Royal Rumble (SNES) sheet (see Sprite sheets/
// reference/wwf-royal-rumble-snes/44464-ric-flair/INDEX.md): 386–388 (the
// hunched strut in), 390–391 (stepping over the leg), 393–394 (crouched,
// crossing the legs), 396–399 (falling back into it, rocking), 400–403
// (getting up). The victim's frames come from Bret Hart's sheet, on his back
// with his legs up (307–309). Pose reference only.
//
//   node tools/move-editor/author_figurefour.mjs
//
// writes tools/move-editor/drafts/figurefour.json ("figure-four — reference
// pass" in the editor) and src/animation/clips/figureFour.js.
//
// Cast: George attacks, Lou (shipped art) lies on his back with his feet
// toward George. Lying flat is lift -109 for Lou (hips 124 off the mat).
// George's lifts are small because the upright rig keeps his soles down: with
// his legs out in front his hips are already near the mat (measured in the
// editor: 34 for the fall pose, 21 locked, 98 at the release, -10 sitting
// up), so each lift just sets them ~25 off it. Tilted back, a leg forward of ~1 points up
// and over: George's legs go over Lou's, Lou's crossed legs come up into
// them. Three `squeeze` markers carry the damage while the hold is on.

import { pose, buildDraft, writeDraftAndClip } from './authoring.mjs';

const FLAIR = 'wwf-royal-rumble-snes/44464-ric-flair';
const BRET = 'wwf-royal-rumble-snes/44459-bret-hart';
const flair = frame => ({ sheet: FLAIR, frame });
const bret = frame => ({ sheet: BRET, frame });

const AT = {
    strut: 0, step: 0.30, over: 0.60, grab: 0.95, fall: 1.30, locked: 1.60,
    rock1: 2.10, rock2: 2.60, rock3: 3.10, release: 3.40, sitUp: 3.75, up: 4.10,
};
export const SQUEEZES = [2.0, 2.6, 3.2];

// George. Locked in he lies back propped on his hands, legs over Lou's.
const locked = (tilt, arms) => pose({ lArm: arms, rArm: arms + 0.2, lElbow: 0.4, rElbow: 0.4, lLeg: 1.00, rLeg: 0.80, lKnee: 0.70, rKnee: 0.90, tilt, lift: 4 });
const attacker = [
    // The hunched Flair strut in (386–388).
    [AT.strut, pose({ lArm: 0.50, rArm: 0.40, lElbow: 1.0, rElbow: 1.0, lLeg: 0.20, rLeg: -0.10, lKnee: 0.40, rKnee: 0.40, lean: 0.45, crouch: 0.30 }), 0, flair(386)],
    [AT.step, pose({ lArm: 0.45, rArm: 0.55, lElbow: 1.0, rElbow: 1.0, lLeg: -0.15, rLeg: 0.30, lKnee: 0.40, rKnee: 0.40, lean: 0.40, crouch: 0.30 }), 18, flair(388)],
    // Steps over the leg (390–391).
    [AT.over, pose({ lArm: 0.60, rArm: 0.90, lElbow: 0.6, rElbow: 0.6, lLeg: 0.90, rLeg: 0.05, lKnee: 1.30, rKnee: 0.20, lean: 0.10, crouch: 0.10 }), 40, flair(391)],
    // Crouched, crossing the legs (393–394).
    [AT.grab, pose({ lArm: 1.20, rArm: 1.00, lElbow: 0.6, rElbow: 0.6, lLeg: -0.20, rLeg: 0.30, lKnee: 0.90, rKnee: 0.90, lean: 0.60, crouch: 0.65 }), 55, flair(394)],
    // Falls back into it (396).
    [AT.fall, pose({ lArm: -0.60, rArm: -0.40, lElbow: 0.5, rElbow: 0.5, lLeg: 1.00, rLeg: 0.70, lKnee: 0.60, rKnee: 0.80, tilt: -0.90, lift: 6 }), 60, flair(396), 'easeIn'],
    // Locked, rocking back and slapping the mat (397–399).
    [AT.locked, locked(-1.20, -0.50), 60, flair(397)],
    [AT.rock1, locked(-1.35, -1.00), 60, flair(398)],
    [AT.rock2, locked(-1.15, -0.50), 60, null],
    [AT.rock3, locked(-1.35, -1.00), 60, flair(399)],
    [AT.release, pose({ lArm: -0.40, rArm: -0.30, lElbow: 0.4, rElbow: 0.4, lLeg: 0.60, rLeg: 0.50, lKnee: 0.30, rKnee: 0.30, tilt: -1.20, lift: -73 }), 60, null],
    // Sits up and gets up (400–403).
    [AT.sitUp, pose({ lArm: 0.80, rArm: 0.70, lElbow: 0.6, rElbow: 0.6, lLeg: 1.20, rLeg: 1.10, lKnee: 0.80, rKnee: 0.80, tilt: -0.50, lift: 30 }), 55, flair(400)],
    [AT.up, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 }), 50, flair(403), 'easeOut'],
];

// Lou, on his back the whole time, feet toward George. Lying tilted back,
// arm 0 lies along the body; arms forward reach up off the mat.
const lying = (fields) => pose({ lArm: 0.05, rArm: 0.05, lElbow: 0.1, rElbow: 0.1, lLeg: 0.05, rLeg: 0.10, lKnee: 0.10, rKnee: 0.10, tilt: -1.52, lift: -109, ...fields });
const crossed = { lLeg: 0.70, rLeg: 0.50, lKnee: 0.90, rKnee: 0.30 };
const defender = [
    [AT.strut, lying({}), 150, bret(310)],
    [AT.grab, lying({ lLeg: 0.50, rLeg: 0.40, lKnee: 0.20, rKnee: 0.20 }), 150, bret(307)],
    [AT.fall, lying(crossed), 150, null],
    // Writhing in it: sitting up reaching, then slapping the mat (307–309).
    [AT.locked, lying({ ...crossed, tilt: -1.30, lArm: 1.60, rArm: 1.40 }), 150, bret(308)],
    [AT.rock1, lying({ ...crossed, tilt: -1.52, lArm: 0.30, rArm: 0.20 }), 150, null],
    [AT.rock2, lying({ ...crossed, tilt: -1.25, lArm: 1.80, rArm: 1.60 }), 150, bret(309)],
    [AT.rock3, lying({ ...crossed, tilt: -1.50, lArm: 0.40, rArm: 0.30 }), 150, null],
    [AT.release, lying({ lLeg: 0.20, rLeg: 0.15, lKnee: 0.20, rKnee: 0.20 }), 150, null],
    [AT.up, lying({}), 150, null],
];

const draft = buildDraft({
    id: 'figureFour',
    duration: AT.up,
    attacker, defender,
    events: SQUEEZES.map(at => ({ at, type: 'squeeze' })),
    characters: { attacker: 'george', defender: 'thesz' },
});

writeDraftAndClip(draft, 'figurefour.json', 'figureFour.js');
