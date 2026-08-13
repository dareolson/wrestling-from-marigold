// The clips that are actually registered with the scene MoveRuntime.
//
// This is the single registration list. Arena registers from it rather than
// naming clips one by one, and tests/moveRegistry.test.js checks it against
// the registry's `clip` fields — so a migrated move that never gets registered
// (or a registration for a move the registry doesn't know about) fails the
// suite instead of only failing in game.
//
// Adding a migrated move means one edit here plus its registry `clip` field.

import { jabClip } from './jab.js';
import { hammerlockClip } from './hammerlock.js';

export const REGISTERED_MOVE_CLIPS = [
    jabClip,
    hammerlockClip,
];
