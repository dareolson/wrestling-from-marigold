// stage.mjs constraints for the body slam (author_bodyslam.mjs).
import { AT } from './author_bodyslam.mjs';

const HELD = [AT.grab, AT.load, AT.lift, AT.press, AT.hold, AT.drive];

// Where George's near hip sits relative to Lou's neck, per phase: at Lou's
// chest for the grab and load, rolling up past his face, then overhead and a
// little behind his head (George's trunk spans Lou's hands), then on its way
// out in front for the drive.
const HIP_AT = {
    [AT.grab]: { dx: 40, dy: 70 },
    [AT.load]: { dx: 36, dy: 60 },
    [AT.lift]: { dx: 24, dy: -10 },
    [AT.press]: { dx: -10, dy: -105 },
    [AT.hold]: { dx: -10, dy: -100 },
    [AT.drive]: { dx: 40, dy: -55 },
};

// Lou's soles stay where they started: crouch and bend do all the work.
export const plant = Object.values(AT).filter(at => at > 0)
    .map(at => ({ at, role: 'attacker', side: 'near', refAt: AT.stance }));

export const stage = HELD.map(at => ({
    at, role: 'defender', joint: 'nearHip', to: { role: 'attacker', joint: 'neck', ...HIP_AT[at] },
}));

// Near hand under George's legs at the hip, far hand at his shoulders.
export const hands = HELD.flatMap(at => [
    { at, role: 'attacker', limb: 'nearWrist', to: { role: 'defender', joint: 'nearHip' } },
    { at, role: 'attacker', limb: 'farWrist', to: { role: 'defender', joint: 'nearShoulder' } },
]);
