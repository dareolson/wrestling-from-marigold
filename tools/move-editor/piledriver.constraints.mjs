// stage.mjs constraints for the piledriver (author_piledriver.mjs).
import { AT } from './author_piledriver.mjs';

// Where Lou's neck sits relative to George's near hip, upside down with the
// head hanging at thigh height (an inverted head hangs below the neck). The
// tuck and load are placed by hand: solving them sank Lou through the mat.
const NECK_AT = {
    [AT.lift]: { dx: 24, dy: 20 },
    [AT.over]: { dx: 22, dy: 16 },
    [AT.up]: { dx: 22, dy: 15 },
    [AT.hold]: { dx: 22, dy: 15 },
    [AT.rise]: { dx: 22, dy: 15 },
};

// George's soles stay put until he rises onto his toes for the drop; Lou's
// until the lift takes him off them (tilting him swings his feet).
export const plant = [
    ...[AT.reach, AT.tuck, AT.load, AT.lift, AT.over, AT.up, AT.hold].map(at => ({ at, role: 'attacker', side: 'near', refAt: AT.stance })),
    ...[AT.reach, AT.tuck, AT.load].map(at => ({ at, role: 'defender', side: 'near', refAt: AT.stance })),
];

export const stage = Object.entries(NECK_AT).map(([at, off]) => ({
    at: Number(at), role: 'defender', joint: 'neck', to: { role: 'attacker', joint: 'nearHip', ...off },
}));

// Both hands on Lou's hips, round his waist, from the tuck until he lets go.
export const hands = [AT.tuck, AT.load, AT.lift, AT.over, AT.up, AT.hold, AT.rise, AT.impact, AT.compress].flatMap(at => [
    { at, role: 'attacker', limb: 'nearWrist', to: { role: 'defender', joint: 'nearHip' } },
    { at, role: 'attacker', limb: 'farWrist', to: { role: 'defender', joint: 'farHip' } },
]);
