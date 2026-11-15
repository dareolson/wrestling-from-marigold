// ?light=v1 (Derek 2026-11-14: "the jab doesn't make contact"): the jab with a contact pose per rig. The game holds standing men 80 units apart
// (Wrestler.move's minDist), and at that spacing jab.js's short bent-arm punch, solved on the old rig, stops 53-56 px short of the face on every
// roster rig. Same timing, wind-up, recoil shape, impact event and rear guard as jab.js; only the contact key's lead arm and trunk lean differ,
// solved per rig by the fist tip (wrist + 0.35 forearm) against the defender's head bounds at 80 units (tools/debug/strike_contact.mjs).
import { jabClip, JAB_DURATION } from './jab.js';

// lArm / lElbow / bend at the impact key. Lou's long arm reaches with the elbow still bent; George and Guido need the arm nearly straight and the
// shoulder turned in; Guido's is the shortest and only just touches.
const CONTACT = {
    'thesz-procreate-v1': { lArm: 1.00, lElbow: 1.35, bend: 0.16 },
    'george-roster-v1':   { lArm: 1.80, lElbow: 0.75, bend: 0.35 },
    'guido-roster-v1':    { lArm: 1.90, lElbow: 0.75, bend: 0.35 },
    'kowalski-roster-v1': { lArm: 1.20, lElbow: 1.20, bend: 0.25 },
};
// The man stands this far off before the punch (units, the separation minimum): the contact poses are solved at it.
export const JAB_V2_STANDOFF = 80;

const name = rigId => rigId.split('-')[0].replace(/^./, c => c.toUpperCase());
const build = (rigId, contact) => {
    const [idle, cock, jab, recoil, rest] = jabClip.tracks.attacker.keyframes;
    // the recoil snaps halfway back from this rig's contact toward the wind-up, as jab.js's does
    const back = { lArm: (contact.lArm + cock.pose.lArm) / 2, lElbow: (contact.lElbow + cock.pose.lElbow) / 2, bend: contact.bend / 4 };
    return {
        ...jabClip,
        id: `jabV2${name(rigId)}`,
        tracks: { attacker: { keyframes: [idle, cock, { ...jab, pose: { ...jab.pose, ...contact } }, { ...recoil, pose: { ...recoil.pose, ...back } }, rest] } },
    };
};
export const JAB_V2_CLIPS = Object.entries(CONTACT).map(([rigId, contact]) => build(rigId, contact));
const BY_RIG = new Map(Object.keys(CONTACT).map((rigId, i) => [rigId, JAB_V2_CLIPS[i]]));
// The clip for a rig (Wrestler.rigId); a rig without a solved contact keeps the old jab.
export const jabV2For = (rigId) => BY_RIG.get(rigId) ?? jabClip;
export { JAB_DURATION };
