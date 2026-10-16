// Vertical suplex, third pass (2026-10-15): torso acting via the new `bend`
// channel (lean never rendered), phase-continuous eases, a landing
// compression and George's entry step. Second pass (2026-10-15): rebuilt as deliberate paired
// beats after the pilot review (MOVE_REFINEMENT_AUDIT.md, Codex's review of
// the move critic). v1 had no visible hook, George floating unsupported
// through the lift, Lou letting go before the fall, and George landing on
// top of Lou. Pose reference stays the Royal Rumble sheet (attacker 370-374,
// victim 357-365), carried as editor-only references.
//
// Rebuild (dev server on :5173):
//   node tools/move-editor/author_suplex.mjs /tmp/suplex.unstaged.json
//   node tools/move-critic/stage.mjs /tmp/suplex.unstaged.json tools/move-editor/suplex.constraints.mjs /tmp/suplex.json
//   node tools/move-editor/export_draft.mjs /tmp/suplex.json suplex.json suplex.js
//
// This file blocks the POSES and timing. George's placement (transform x and
// lift) at each held key, and Lou's two grips, are then solved by stage.mjs
// from suplex.constraints.mjs: bodies first, hands second. The values for
// George's x/lift below are only starting guesses for that solve.
//
// Beats: tie-up → front facelock (George bent, head under Lou's near arm,
// Lou's far hand on his trunks) → Lou loads through the knees → drives up,
// leaning back → George balanced vertical → past vertical, Lou committed
// backward → both falling, grip kept → back-to-back landing, head to head →
// compression bounce → settle.
//
// Lou's legs keep ONE stance from the tie-up to the fall so the planted feet
// cannot skate; only crouch bends him.

import { writeFileSync } from 'node:fs';
import { pose, buildDraft, LYING } from './authoring.mjs';

export const AT = {
    stance: 0, step: 0.11, hook: 0.22, load: 0.40, drive: 0.56, up: 0.74, past: 0.98, tip: 1.07,
    fall: 1.15, impact: 1.28, compress: 1.32, bounce: 1.42, rest: 1.72,
};

const LOU_LEGS = { lLeg: -0.10, rLeg: 0.20, lKnee: 0.22, rKnee: 0.22 };
// Near arm (lArm facing right) wrapped over George's neck; far arm (rArm)
// reaching to his trunks. stage.mjs refines both onto George.
const HOOK_ARMS = { lArm: 1.55, lElbow: 1.70, rArm: 1.20, rElbow: 0.50 };

// Eases (each key's ease shapes the segment arriving at it): a continuous
// lift or fall keeps its speed through the keys inside it — the only stops
// are the intended ones (the load, the balanced vertical, the landing).
// v2 chained easeIn through the fall, so it restarted slow at every key.
const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, ...LOU_LEGS, lean: 0.05, crouch: 0.05 }), 0, null],
    [AT.step, pose({ lArm: 0.9, lElbow: 1.2, rArm: 0.7, rElbow: 0.6, ...LOU_LEGS, crouch: 0.08, bend: 0.15 }), 0, null, 'easeIn'],
    // Chest over George, trapping his head.
    [AT.hook, pose({ ...HOOK_ARMS, ...LOU_LEGS, crouch: 0.12, bend: 0.38 }), 0, 372, 'easeOut'],
    // Sits into the knees, chest coming up: the load.
    [AT.load, pose({ ...HOOK_ARMS, ...LOU_LEGS, crouch: 0.36, bend: 0.12 }), 0, null, 'easeInOut'],
    // Drives up out of the knees, starting to arch; far arm pulls the trunks.
    [AT.drive, pose({ lArm: 1.9, lElbow: 1.5, rArm: 2.3, rElbow: 0.5, ...LOU_LEGS, crouch: 0.06, bend: -0.22 }), 0, 370, 'easeIn'],
    // Tall and arched back under the weight (374).
    [AT.up, pose({ lArm: 2.3, lElbow: 1.3, rArm: 2.9, rElbow: 0.3, ...LOU_LEGS, bend: -0.38 }), 0, 374, 'easeOut'],
    // The balanced moment: a slow drift further back.
    [AT.past, pose({ lArm: 2.4, lElbow: 1.3, rArm: 3.0, rElbow: 0.3, ...LOU_LEGS, bend: -0.50 }), 0, null, 'easeInOut'],
    // Commits: tips back over planted feet (stage.mjs plants the soles here)...
    [AT.tip, pose({ lArm: 2.45, lElbow: 1.25, rArm: 3.0, rElbow: 0.3, ...LOU_LEGS, bend: -0.50, tilt: -0.30, lift: -6 }), 0, null, 'easeIn'],
    // ...and falls straight back, still holding on, accelerating.
    [AT.fall, pose({ lArm: 2.5, lElbow: 1.2, rArm: 3.0, rElbow: 0.3, lLeg: 0.05, rLeg: 0.25, lKnee: 0.35, rKnee: 0.30, bend: -0.25, tilt: -0.85, lift: -30 }), -27, null, 'linear'],
    // Flat on his back; arms stretched along the mat past his head.
    [AT.impact, pose({ lArm: 2.92, lElbow: 0.5, rArm: 2.98, rElbow: 0.4, lLeg: 0.20, rLeg: 0.30, lKnee: 0.45, rKnee: 0.35, tilt: -1.52, lift: LYING }), -20, null, 'linear'],
    // Compression: chest crunches up off the mat, knees pull in (2-3 frames).
    [AT.compress, pose({ lArm: 2.78, lElbow: 0.6, rArm: 2.88, rElbow: 0.5, lLeg: 0.50, rLeg: 0.45, lKnee: 0.85, rKnee: 0.65, bend: 0.22, tilt: -1.52, lift: LYING }), -20, null, 'easeOut'],
    // Rebound: legs still up, chest dropping back.
    [AT.bounce, pose({ lArm: 2.86, lElbow: 0.5, rArm: 2.92, rElbow: 0.4, lLeg: 0.40, rLeg: 0.30, lKnee: 0.70, rKnee: 0.50, bend: 0.06, tilt: -1.52, lift: LYING }), -20, null, 'easeInOut'],
    // Settled, spent: arms on the mat overhead, legs down last.
    [AT.rest, pose({ lArm: 2.95, lElbow: 0.3, rArm: 3.0, rElbow: 0.3, lLeg: 0.12, rLeg: 0.08, lKnee: 0.22, rKnee: 0.15, tilt: -1.52, lift: LYING }), -20, null, 'easeInOut'],
];

// George faces left: rArm is his near (camera-side) arm.
const defender = [
    [AT.stance, pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, lean: 0.09, crouch: 0.22 }), 72, null],
    // A real step in: lead foot up, weight going forward.
    [AT.step, pose({ lArm: 0.4, rArm: 1.2, rElbow: 1.2, lLeg: -0.30, rLeg: 0.22, lKnee: 0.30, rKnee: 0.55, crouch: 0.18, bend: 0.30 }), 58, null, 'easeIn'],
    // Bent at the waist into the facelock (bend, not a whole-body tip), near
    // arm draped behind Lou's neck.
    [AT.hook, pose({ lArm: 0.6, lElbow: 0.8, rArm: 1.7, rElbow: 2.1, lLeg: -0.30, rLeg: 0.05, lKnee: 0.30, rKnee: 0.30, bend: 0.70, tilt: 0.30 }), 48, 357, 'easeOut'],
    [AT.load, pose({ lArm: 0.6, lElbow: 0.8, rArm: 1.7, rElbow: 2.1, lLeg: -0.30, rLeg: 0.05, lKnee: 0.32, rKnee: 0.30, bend: 0.72, tilt: 0.34 }), 46, null, 'easeInOut'],
    // Feet leave the mat; legs trail, the waist opening out.
    [AT.drive, pose({ lArm: 0.9, lElbow: 0.6, rArm: 2.0, rElbow: 1.2, lLeg: -0.20, rLeg: -0.05, lKnee: 0.45, rKnee: 0.30, bend: 0.35, tilt: 1.70, lift: 80 }), 30, 359, 'easeIn'],
    // Straight up, upside down, legs together; arms hang down Lou's back.
    [AT.up, pose({ lArm: 2.9, lElbow: 0.6, rArm: 2.6, rElbow: 1.1, lLeg: 0.02, rLeg: -0.02, lKnee: 0.08, rKnee: 0.05, bend: 0.05, tilt: 3.14, lift: 200 }), 10, 360, 'easeOut'],
    // Just past vertical, over Lou's head; legs start to lead.
    [AT.past, pose({ lArm: 2.9, lElbow: 0.6, rArm: 2.6, rElbow: 1.1, lLeg: 0.12, rLeg: 0.05, lKnee: 0.20, rKnee: 0.10, tilt: 3.40, lift: 200 }), 4, null, 'easeInOut'],
    [AT.tip, pose({ lArm: 2.8, lElbow: 0.6, rArm: 2.5, rElbow: 1.0, lLeg: 0.20, rLeg: 0.10, lKnee: 0.25, rKnee: 0.15, tilt: 3.70, lift: 190 }), -20, null, 'easeIn'],
    [AT.fall, pose({ lArm: 2.7, lElbow: 0.6, rArm: 2.4, rElbow: 0.9, lLeg: 0.30, rLeg: 0.20, lKnee: 0.35, rKnee: 0.25, bend: -0.15, tilt: 4.05, lift: 120 }), -60, 363, 'linear'],
    // Flat on his back beyond Lou's head (365); arms slap along the mat.
    [AT.impact, pose({ lArm: 0.5, lElbow: 0.3, rArm: 0.4, rElbow: 0.3, lLeg: 0.45, rLeg: 0.35, lKnee: 0.50, rKnee: 0.40, tilt: 4.76, lift: LYING }), -220, 365, 'linear'],
    // Compression: whiplash curl, legs whip up.
    [AT.compress, pose({ lArm: 0.55, lElbow: 0.4, rArm: 0.45, rElbow: 0.4, lLeg: 0.85, rLeg: 0.70, lKnee: 0.95, rKnee: 0.80, bend: 0.30, tilt: 4.76, lift: LYING }), -220, null, 'easeOut'],
    [AT.bounce, pose({ lArm: 0.45, lElbow: 0.3, rArm: 0.35, rElbow: 0.3, lLeg: 0.65, rLeg: 0.50, lKnee: 0.80, rKnee: 0.65, bend: 0.10, tilt: 4.76, lift: LYING }), -220, null, 'easeInOut'],
    // Out of it: limp, one knee left up.
    [AT.rest, pose({ lArm: 0.05, rArm: 0.12, lElbow: 0.1, rElbow: 0.2, lLeg: 0.10, rLeg: 0.35, lKnee: 0.15, rKnee: 0.60, tilt: 4.76, lift: LYING }), -220, null, 'easeInOut'],
];

const draft = buildDraft({
    id: 'suplex',
    duration: AT.rest,
    attacker, defender,
    events: [{ at: AT.impact, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
    // George draws in front of Lou through the facelock and drive (his head is
    // at Lou's chest). Upside down he draws behind, so Lou's face and grip stay
    // readable over George's torso; landing beyond Lou he lies further back.
    transformY: (role, at) => (role !== 'defender' ? 0 : at >= AT.up ? -6 : at >= AT.step ? 4 : 0),
});

const out = process.argv[2];
if (!out) throw new Error('usage: author_suplex.mjs <out.json> (then stage.mjs; see header)');
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`wrote ${out}`);
