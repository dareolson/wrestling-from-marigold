// Front kick — a planted mid-range strike: the lead boot drives into the belly
// and shoves the man back a step. Job (Derek: "effort"): a heavy, deliberate
// push-kick, not a flurry — load the weight onto the back leg, chamber, snap
// the shin out, let the recoil push him away, then re-plant.
// Reference: Bret Hart 171-175 (chamber 173, extension 174, re-plant 175).
//
// Solo clip: the executor owns position (he stays planted), so the draft's
// transform is preview only. Rebuild (dev server on :5173):
//   node tools/move-editor/author_frontkick.mjs /tmp/fk.json
//   node tools/move-editor/export_draft.mjs --solo /tmp/fk.json frontKick.json frontKick.js

import { writeFileSync } from 'node:fs';
import { pose, buildDraft } from './authoring.mjs';

// Rig units between the two bodies' origins when the boot lands (the game
// fires the kick from inside 130 units; the target is the belly).
export const FRONTKICK_REACH = 84;
export const AT = { stance: 0, load: 0.12, chamber: 0.22, kick: 0.30, hold: 0.36, retract: 0.46, plant: 0.58, rest: 0.68 };

// The jab's idle, so entering and leaving the clip pops nothing.
const idle = pose({ lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lElbow: 0.75, rElbow: 0.75, lKnee: 0.0, rKnee: 0.0 });

const attacker = [
    [AT.stance, idle, 0, 173],
    // Load: weight over the back leg, chest leaning away, fists up.
    [AT.load, pose({ lLeg: -0.14, rLeg: 0.10, lArm: 0.35, rArm: 0.55, lElbow: 1.9, rElbow: 1.9, lKnee: 0.0, rKnee: 0.0, crouch: 0.10, bend: -0.12 }), 0, null, 'easeOut'],
    // Chamber: knee up and folded, shin hanging, balanced on the back leg.
    [AT.chamber, pose({ lLeg: 1.20, rLeg: 0.06, lArm: 0.25, rArm: 0.60, lElbow: 1.7, rElbow: 1.8, lKnee: 1.55, rKnee: 0.0, crouch: 0.04, bend: -0.18 }), 0, 173, 'easeOut'],
    // Contact: shin snaps out level, boot into the belly; torso leans back.
    [AT.kick, pose({ lLeg: 1.70, rLeg: 0.05, lArm: 0.15, rArm: 0.70, lElbow: 1.5, rElbow: 1.8, lKnee: 0.05, rKnee: 0.0, crouch: 0.0, bend: -0.28 }), 0, 174, 'easeIn'],
    // Push through for a beat: the leg stays out as he rocks back off it.
    [AT.hold, pose({ lLeg: 1.66, rLeg: 0.05, lArm: 0.15, rArm: 0.70, lElbow: 1.5, rElbow: 1.8, lKnee: 0.08, rKnee: 0.0, bend: -0.30 }), 0, null, 'linear'],
    // Fold the leg back to the chamber.
    [AT.retract, pose({ lLeg: 1.00, rLeg: 0.08, lArm: 0.25, rArm: 0.60, lElbow: 1.7, rElbow: 1.8, lKnee: 1.30, rKnee: 0.0, bend: -0.16 }), 0, null, 'easeOut'],
    // Boot back down in front of him (175).
    [AT.plant, pose({ lLeg: 0.18, rLeg: 0.12, lArm: 0.10, rArm: 0.40, lElbow: 1.3, rElbow: 1.4, lKnee: 0.10, rKnee: 0.0, crouch: 0.06, bend: -0.04 }), 0, 175, 'easeOut'],
    [AT.rest, idle, 0, null, 'easeOut'],
];

// The target, standing, for the preview only.
const stand = pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, crouch: 0.22 });
const defender = [[0, stand, FRONTKICK_REACH, null], [AT.rest, stand, FRONTKICK_REACH, null]];

const draft = buildDraft({
    id: 'frontKick',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.kick, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
});

const out = process.argv[2];
if (!out) throw new Error('usage: author_frontkick.mjs <out.json> (see header)');
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`wrote ${out}`);
