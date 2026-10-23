// Explicit move kits for the four roster comparison rigs. The generated
// *_roster_v1.js files (tools/wrestler-cutter/prepare-roster-character.py)
// borrow Lou's or George's kit as a neutral control; this file is where a
// roster member's own kit is decided, so regenerating a rig never touches it.
// Moves are shared implementations (src/moves/registry.js); a kit is only the
// list a wrestler may use, and AIHandler's per-wrestler personality decides how
// often and when.
import { thesz } from './thesz.js';
import { george } from './george.js';

export const ROSTER_KITS = {
    // Lou and George: unchanged from the shipped kits until Derek assigns more.
    thesz:     [...thesz.moveSet],
    george:    [...george.moveSet],
    // Kowalski and Guido start from their borrowed base plus the front kick, the
    // first move of the shared library batch (2026-10-21).
    kowalski:  [...thesz.moveSet, 'frontKick', 'shove'],
    guido:     [...george.moveSet, 'frontKick'],
};
