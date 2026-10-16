// stage.mjs constraints for the vertical suplex (author_suplex.mjs).
import { AT } from './author_suplex.mjs';

const HELD = [AT.hook, AT.load, AT.drive, AT.up, AT.past, AT.tip, AT.fall];

// Where George's NECK sits relative to Lou's near shoulder, per phase. In
// this 3/4 view Lou's near shoulder is toward his back, so "in front of his
// chest" is a large dx. Bent over, George's head hangs below the neck at
// Lou's chest; upside down the head hangs below the neck too, so the neck sits
// ABOVE the shoulder for the head to land in the armpit.
const NECK_AT = {
    [AT.hook]: { dx: 42, dy: 30 },
    [AT.load]: { dx: 42, dy: 34 },
    [AT.drive]: { dx: 34, dy: 8 },
    [AT.up]: { dx: 44, dy: -22 },
    [AT.past]: { dx: 40, dy: -24 },
    [AT.tip]: { dx: 38, dy: -36 },
    [AT.fall]: { dx: 34, dy: -55 },
};

// Lou's soles stay where they started through the load, the lift and the
// landing: he goes straight back over his feet and lands where he stood.
// (Without the landing keys the tilt swung his feet forward and they skidded
// along the mat.) Not the mid-air `fall` key: his feet are off the mat there,
// and planting it swung his hips back and forth; author.mjs sets its x
// between its neighbours instead.
export const plant = [AT.step, AT.hook, AT.load, AT.drive, AT.up, AT.past, AT.tip, AT.impact, AT.compress, AT.bounce, AT.rest]
    .flatMap(at => [{ at, role: 'attacker', side: 'near', refAt: AT.stance }]);

export const stage = [
    ...HELD.map(at => ({ at, role: 'defender', joint: 'neck', to: { role: 'attacker', joint: 'nearShoulder', frame: 'body', ...NECK_AT[at] } })),
    // Landed head to head: George's neck just beyond Lou's (behind Lou's back).
    ...[AT.impact, AT.compress, AT.bounce, AT.rest].map(at => ({ at, role: 'defender', joint: 'neck', to: { role: 'attacker', joint: 'neck', dx: -38, dy: 0 } })),
];

// With George vertical his trunks are beyond Lou's overhead reach, so the far
// hand holds his lower back there instead (down the back from the hip; screen
// down is toward George's head while he is inverted).
const UPSIDE_DOWN = new Set([AT.up, AT.past, AT.tip]);

export const hands = HELD.flatMap(at => [
    // Near hand around the back of George's neck, far hand on his trunks.
    { at, role: 'attacker', limb: 'nearWrist', to: { role: 'defender', joint: 'neck' } },
    { at, role: 'attacker', limb: 'farWrist', to: { role: 'defender', joint: 'nearHip', dy: UPSIDE_DOWN.has(at) ? 60 : 0 } },
]);
