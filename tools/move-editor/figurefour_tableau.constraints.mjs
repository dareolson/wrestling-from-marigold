// stage.mjs constraints for the figure-four locked tableau
// (author_figurefour_tableau.mjs). Ledger: research/animation/figure-four-tableau/LEDGER.md.
//
// Only the bodies are staged here. The leg channels in the author file were
// searched for the ledger contacts at THIS pelvis offset, so the offset is the
// one number that has to stay in step with them. The contacts themselves
// (trap: T across H; brace: B against N) are graded by the critic spec `figureFourTableau`.
import { KEYS } from './author_figurefour_tableau.mjs';

// George's near hip sits this far "in front of" (along the receiver's facing,
// i.e. toward the receiver's feet) and this far above the receiver's near hip.
// Screen px, measured on the searched solution.
const PELVIS = { dx: 111.3, dy: -32.0 };

export const plant = [];

export const stage = KEYS.map(at => ({
    at, role: 'attacker', joint: 'nearHip',
    to: { role: 'defender', joint: 'nearHip', ...PELVIS },
}));

export const hands = [];
