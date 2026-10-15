// Ground submissions on a downed man, first pass: the ankle lock and the
// arm bar, rebuilt from the old standing holds into real mat wrestling
// (Derek, 2026-10-15: "a lot of grounded moves like wristlocks and hip
// tosses"). No sheet has these holds, so they are posed from wrestling
// knowledge, with Flair's leg-grab frames (figure-four row 392–394) as the
// reference for reaching down to the legs. Pose reference only.
//
//   node tools/move-editor/author_groundholds.mjs
//
// writes drafts/anklelock.json + src/animation/clips/ankleLock.js and
// drafts/armbar.json + src/animation/clips/armBar.js.
//
// Cast: Lou on George. George lies on his back, feet toward Lou (his facing
// is turned to face Lou, so tilt -1.52 puts his head away). Lift is in
// reference-body units (authoring.mjs hipsAt / LYING): flat is LYING, seated
// with the legs out is hipsAt(20), on any wrestler. Three `squeeze` markers
// drain while each hold is on.

import { pose, buildDraft, writeDraftAndClip, LYING, hipsAt } from './authoring.mjs';

const FLAIR = 'wwf-royal-rumble-snes/44464-ric-flair';
const flair = frame => ({ sheet: FLAIR, frame });
const stand = pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, lean: 0.05, crouch: 0.05 });
const lying = (fields = {}) => pose({ lArm: 0.05, rArm: 0.05, lElbow: 0.1, rElbow: 0.1, lLeg: 0.05, rLeg: 0.10, lKnee: 0.10, rKnee: 0.10, tilt: -1.52, lift: LYING, ...fields });

// ── Ankle lock: grabs a foot, stands it up, leans back and twists ──────────
{
    const AT = { stance: 0, reach: 0.30, lift: 0.60, locked: 0.90, rock1: 1.40, rock2: 1.95, rock3: 2.50, release: 2.80, up: 3.10 };
    const lean = (back, twist) => pose({ lArm: 0.95, rArm: 0.80, lElbow: 1.4 + twist, rElbow: 1.5 - twist, lLeg: -0.10, rLeg: 0.20, lKnee: 0.40, rKnee: 0.40, lean: back, crouch: 0.30 });
    const attacker = [
        [AT.stance, stand, 0, null],
        // Bends to the foot (Flair 393–394).
        [AT.reach, pose({ lArm: 1.30, rArm: 1.10, lElbow: 0.5, rElbow: 0.5, lLeg: -0.20, rLeg: 0.25, lKnee: 0.80, rKnee: 0.80, lean: 0.55, crouch: 0.55 }), 0, flair(393)],
        // Stands the leg up against his body.
        [AT.lift, lean(-0.05, 0), 0, flair(394)],
        // Leans back on it, wrenching the ankle.
        [AT.locked, lean(-0.25, 0.2), 0, null],
        [AT.rock1, lean(-0.15, -0.1), 0, null],
        [AT.rock2, lean(-0.28, 0.25), 0, null],
        [AT.rock3, lean(-0.15, -0.1), 0, null],
        [AT.release, lean(0.05, 0), 0, null],
        [AT.up, stand, 0, null, 'easeOut'],
    ];
    const caught = { lLeg: 0.90, lKnee: 0.05 };
    const defender = [
        [AT.stance, lying(), 150, null],
        [AT.reach, lying({ lLeg: 0.25 }), 150, null],
        [AT.lift, lying(caught), 150, null],
        // Writhing: sits up reaching, then slaps the mat.
        [AT.locked, lying({ ...caught, tilt: -1.30, lArm: 1.60, rArm: 1.40 }), 150, null],
        [AT.rock1, lying({ ...caught, tilt: -1.52, lArm: 0.30, rArm: 0.20 }), 150, null],
        [AT.rock2, lying({ ...caught, tilt: -1.25, lArm: 1.80, rArm: 1.60 }), 150, null],
        [AT.rock3, lying({ ...caught, tilt: -1.50, lArm: 0.40, rArm: 0.30 }), 150, null],
        [AT.release, lying({ lLeg: 0.20 }), 150, null],
        [AT.up, lying(), 150, null],
    ];
    writeDraftAndClip(buildDraft({
        id: 'ankleLock', duration: AT.up, attacker, defender,
        events: [1.2, 1.8, 2.4].map(at => ({ at, type: 'squeeze' })),
        characters: { attacker: 'thesz', defender: 'george' },
    }), 'anklelock.json', 'ankleLock.js');
}

// ── Arm bar: kneels at the shoulder, takes the arm, sits through and lies
//    back across the chest with the arm straight between his legs ─────────
{
    const AT = { stance: 0, step: 0.30, kneel: 0.60, sit: 0.95, locked: 1.30, rock1: 1.80, rock2: 2.35, rock3: 2.90, release: 3.20, up: 3.60 };
    // Lying back, a leg near 0 runs along his body: across George's chest.
    const locked = (tilt) => pose({ lArm: 1.30, rArm: 1.10, lElbow: 1.6, rElbow: 1.7, lLeg: 0.25, rLeg: 0.12, lKnee: 0.40, rKnee: 0.45, tilt, lift: LYING });
    const attacker = [
        [AT.stance, stand, 0, null],
        [AT.step, pose({ lArm: 0.50, rArm: 0.40, lLeg: 0.30, rLeg: -0.10, lKnee: 0.40, rKnee: 0.30, lean: 0.20, crouch: 0.15 }), 25, null],
        // Down on a knee at the shoulder, taking the wrist (Flair 392).
        [AT.kneel, pose({ lArm: 1.30, rArm: 1.10, lElbow: 0.6, rElbow: 0.6, lLeg: 0.10, rLeg: -0.40, lKnee: 1.60, rKnee: 1.40, lean: 0.45, crouch: 0.85 }), 35, flair(392)],
        // Sits through, legs over the chest.
        [AT.sit, pose({ lArm: 1.30, rArm: 1.10, lElbow: 1.2, rElbow: 1.3, lLeg: 1.20, rLeg: 1.10, lKnee: 0.30, rKnee: 0.40, tilt: -0.30, lift: hipsAt(20) }), 35, null, 'easeIn'],
        // Lies back, arm across his chest, rocking on it.
        [AT.locked, locked(-1.30), 35, null],
        [AT.rock1, locked(-1.45), 35, null],
        [AT.rock2, locked(-1.25), 35, null],
        [AT.rock3, locked(-1.45), 35, null],
        [AT.release, pose({ lArm: 0.60, rArm: 0.50, lLeg: 1.10, rLeg: 1.00, lKnee: 0.50, rKnee: 0.50, tilt: -0.40, lift: hipsAt(20) }), 35, null],
        [AT.up, stand, 30, null, 'easeOut'],
    ];
    // His near arm straight up, held between Lou's legs.
    const held = { lArm: 1.55, lElbow: 0.05 };
    const defender = [
        [AT.stance, lying(), 40, null],
        [AT.kneel, lying({ lArm: 0.80, lElbow: 0.4 }), 40, null],
        [AT.sit, lying(held), 40, null],
        [AT.locked, lying({ ...held, tilt: -1.35, rArm: 1.20, lLeg: 0.40, lKnee: 0.60 }), 40, null],
        [AT.rock1, lying({ ...held, rArm: 0.20, lLeg: 0.10 }), 40, null],
        [AT.rock2, lying({ ...held, tilt: -1.30, rArm: 1.50, rLeg: 0.50, rKnee: 0.70 }), 40, null],
        [AT.rock3, lying({ ...held, rArm: 0.30 }), 40, null],
        [AT.release, lying({ lArm: 0.40 }), 40, null],
        [AT.up, lying(), 40, null],
    ];
    writeDraftAndClip(buildDraft({
        id: 'armBar', duration: AT.up, attacker, defender,
        events: [1.6, 2.2, 2.8].map(at => ({ at, type: 'squeeze' })),
        characters: { attacker: 'thesz', defender: 'george' },
        // Lying across him, Lou draws in front.
        transformY: (role, at) => (role === 'attacker' && at >= AT.kneel && at < AT.up ? 4 : 0),
    }), 'armbar.json', 'armBar.js');
}
