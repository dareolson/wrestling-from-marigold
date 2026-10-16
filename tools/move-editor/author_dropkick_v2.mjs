// Dropkick v2 — a COMPARISON CANDIDATE (2026-10-15), not the live move. The
// live dropkick (author_dropkick.mjs) disagrees with itself: its art connects
// ~123 units out, the hit range is 100, and _doDropkick tweens Lou to 35
// units from George, so the boots pass through his chest. This version is
// posed to connect at DROPKICK_V2_REACH (inside the unchanged 100-unit hit
// range), at chest height, with a sharper leg snap, a recoil off the chest and
// a cleaner landing. Played only with ?dropkick=v2 (Arena registers the clip,
// _doDropkick travels to the matching distance); balance is untouched.
//
// Rebuild (dev server on :5173):
//   node tools/move-editor/author_dropkick_v2.mjs /tmp/dk.unstaged.json
//   node tools/move-critic/stage.mjs /tmp/dk.unstaged.json tools/move-editor/dropkick_v2.constraints.mjs /tmp/dk.json
//   node tools/move-editor/export_draft.mjs --solo /tmp/dk.json dropkick-v2.json dropkickV2.js
//
// One-wrestler clip (authoring.mjs soloClip): the draft's travel and George
// are preview only; the executor owns position.

import { writeFileSync } from 'node:fs';
import { pose, buildDraft, LYING } from './authoring.mjs';

// Lou stops this far from George when the boots land (rig units).
export const DROPKICK_V2_REACH = 92;
const GEORGE_X = 150;

export const AT = { stance: 0, gather: 0.10, tuck: 0.22, kick: 0.34, recoil: 0.40, land: 0.50, flat: 0.64 };

const attacker = [
    [AT.stance, pose({ lArm: 0.04, rArm: 0.17, lLeg: 0.04, rLeg: 0.14, crouch: 0.05 }), 0, 224],
    // Compact gather: arms back, sitting low, chest over the knees.
    // Squatting on planted feet: crouch alone drops the hips and bends the
    // knees together. (v1 authored big knee values, which bend the knees
    // WITHOUT lowering the hips, so the boots left the mat and swung into
    // George's shins.)
    [AT.gather, pose({ lArm: -0.55, rArm: -0.45, lElbow: 0.6, rElbow: 0.6, lLeg: 0.02, rLeg: 0.12, crouch: 0.55, bend: 0.30 }), 8, 225, 'easeOut'],
    // Off the mat, knees to the chest, arms swinging up (226-227).
    [AT.tuck, pose({ lArm: 2.40, rArm: 2.20, lElbow: 0.7, rElbow: 0.7, lLeg: 1.25, rLeg: 1.10, lKnee: 1.70, rKnee: 1.60, bend: 0.20, tilt: -0.40, lift: 58 }), 34, 227, 'easeOut'],
    // The snap: both legs drive out level into the chest (229). Accelerates
    // into contact (easeIn); stage.mjs puts the boots on George's chest.
    [AT.kick, pose({ lArm: 2.00, rArm: 1.80, lElbow: 0.5, rElbow: 0.5, lLeg: 0.40, rLeg: 0.32, lKnee: 0.05, rKnee: 0.08, bend: -0.15, tilt: -1.15, lift: 62 }), GEORGE_X - DROPKICK_V2_REACH, 229, 'easeIn'],
    // Recoil: the chest pushes back and his knees fold toward him; the boots
    // come off George (not up his body) as he drops away.
    [AT.recoil, pose({ lArm: 2.30, rArm: 2.10, lElbow: 0.6, rElbow: 0.6, lLeg: 0.15, rLeg: 0.05, lKnee: 1.10, rKnee: 0.95, bend: 0.10, tilt: -1.25, lift: 40 }), GEORGE_X - DROPKICK_V2_REACH - 10, null, 'easeOut'],
    // Backside first (231), knees still bent, arms out to break the fall.
    [AT.land, pose({ lArm: 1.50, rArm: 1.30, lElbow: 0.4, rElbow: 0.4, lLeg: 0.25, rLeg: 0.15, lKnee: 0.80, rKnee: 0.70, tilt: -1.45, lift: 4 }), GEORGE_X - DROPKICK_V2_REACH - 14, 231, 'easeIn'],
    // Flat on his back (232).
    [AT.flat, pose({ lArm: 0.30, rArm: 0.25, lElbow: 0.2, rElbow: 0.2, lLeg: 0.10, rLeg: 0.15, lKnee: 0.10, rKnee: 0.10, tilt: -1.52, lift: LYING }), GEORGE_X - DROPKICK_V2_REACH - 14, 232, 'easeOut'],
];

// The target, standing, for the preview only.
const stand = pose({ lArm: 0.10, rArm: 0.59, lLeg: -0.18, rLeg: 0.13, crouch: 0.22 });
const defender = [[0, stand, GEORGE_X, null], [AT.flat, stand, GEORGE_X, null]];

const draft = buildDraft({
    id: 'dropkickV2',
    duration: AT.flat,
    attacker, defender,
    events: [{ at: AT.kick, type: 'impact' }],
    characters: { attacker: 'thesz', defender: 'george' },
});

const out = process.argv[2];
if (!out) throw new Error('usage: author_dropkick_v2.mjs <out.json> (then stage.mjs; see header)');
writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`);
console.log(`wrote ${out}`);
