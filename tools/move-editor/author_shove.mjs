// Shove — a two-handed guard-breaker: coil, step in, drive both palms into the
// chest and make him give ground. Job (Derek's "effort" family): a short,
// stubborn shove, less damage than a strike but it opens a man who is hiding
// behind his block. Reference: Bret Hart 109-114 (coil 110-111, step 112,
// drive 113-114, recoil 115).
//
// Solo clip: the executor owns position (he closes to SHOVE_REACH and stays),
// so the draft's transform is preview only. Rebuild (dev server on :5173):
//   node tools/move-editor/author_shove.mjs /tmp/shove.json
//   node tools/move-editor/export_draft.mjs --solo /tmp/shove.json shove.json shove.js

import { writeFileSync } from 'node:fs';
import { pose, buildDraft } from './authoring.mjs';

// Rig units between the two bodies' origins when the palms land.
export const SHOVE_REACH = 76;
export const AT = { stance: 0, coil: 0.14, step: 0.24, drive: 0.32, hold: 0.40, recoil: 0.50, rest: 0.62 };

const idle = pose({ lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lElbow: 0.75, rElbow: 0.75, lKnee: 0.0, rKnee: 0.0 });

const attacker = [
    [AT.stance, idle, 0, 108],
    // Coil (110-111): sink and lean back, both hands drawn in to the chest.
    [AT.coil, pose({ lLeg: -0.12, rLeg: 0.12, lArm: 0.45, rArm: 0.55, lElbow: 2.1, rElbow: 2.1, crouch: 0.14, bend: -0.20 }), 0, 111, 'easeOut'],
    // Step (112): front foot lands, arms start to unfold.
    [AT.step, pose({ lLeg: 0.30, rLeg: -0.10, lArm: 0.85, rArm: 0.85, lElbow: 1.2, rElbow: 1.2, crouch: 0.12, bend: 0.05 }), 0, 112, 'easeIn'],
    // Drive (113-114): arms locked out at chest height, body leaning in.
    [AT.drive, pose({ lLeg: 0.36, rLeg: -0.14, lArm: 1.30, rArm: 1.25, lElbow: 0.25, rElbow: 0.3, crouch: 0.10, bend: 0.28 }), 0, 113, 'easeIn'],
    [AT.hold, pose({ lLeg: 0.36, rLeg: -0.14, lArm: 1.25, rArm: 1.20, lElbow: 0.3, rElbow: 0.35, crouch: 0.10, bend: 0.30 }), 0, 114, 'linear'],
    // Recoil (115): arms fall, weight settles back.
    [AT.recoil, pose({ lLeg: 0.12, rLeg: 0.05, lArm: 0.50, rArm: 0.50, lElbow: 1.3, rElbow: 1.3, crouch: 0.06, bend: 0.06 }), 0, 115, 'easeOut'],
    [AT.rest, idle, 0, null, 'easeOut'],
];

const stand = pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, crouch: 0.22 });
const defender = [[0, stand, SHOVE_REACH, null], [AT.rest, stand, SHOVE_REACH, null]];

const draft = buildDraft({
    id: 'shove',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.drive, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
});

const out = process.argv[2];
if (!out) throw new Error('usage: author_shove.mjs <out.json> (see header)');
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`wrote ${out}`);
