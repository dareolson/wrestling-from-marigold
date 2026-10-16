// stage.mjs constraints for the hip toss (author_hiptoss.mjs).
import { AT } from './author_hiptoss.mjs';

// George's near hip relative to Lou's near hip: against it for the hook, up
// on it for the load, over the top, then coming down behind Lou (a negative
// dx is behind him).
const HIP_AT = {
    [AT.hook]: { dx: 34, dy: -5 },
    [AT.load]: { dx: 14, dy: -30 },
    [AT.over]: { dx: -10, dy: -85 },
    [AT.down]: { dx: -60, dy: -40 },
};

export const plant = Object.values(AT).filter(at => at > 0)
    .map(at => ({ at, role: 'attacker', side: 'near', refAt: AT.stance }));

export const stage = Object.entries(HIP_AT).map(([at, off]) => ({
    at: Number(at), role: 'defender', joint: 'nearHip', to: { role: 'attacker', joint: 'nearHip', ...off },
}));

// Near arm round his waist (hand at his far hip), far hand on his near arm,
// until he is upside down behind Lou.
export const hands = [AT.hook, AT.load, AT.over, AT.down].flatMap(at => [
    { at, role: 'attacker', limb: 'nearWrist', to: { role: 'defender', joint: 'farHip' } },
    { at, role: 'attacker', limb: 'farWrist', to: { role: 'defender', joint: 'nearElbow' } },
]);
