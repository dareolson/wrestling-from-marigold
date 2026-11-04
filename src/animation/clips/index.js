// The clips that are actually registered with the scene MoveRuntime.
//
// KNEES AND ELBOWS (read before you pose a leg). THE CLAMP EATS A KNEE FOLD: `JOINT_LIMITS.knee.min` is -0.10, so a local-flex `lKnee` of -0.2..-1.6 draws as -0.10 (0 px
// difference). A clip that needs a real fold owns the shin as the absolute `lShin`/`rShin` through `foldShin` / `shinsFromFolds` (rig/articulation.js; atomicDrop and
// snapmare key `lFold`/`rFold`); tools/debug/knee_fold_sweep.mjs proves the fold renders. On the upright draw path a NEGATIVE `lKnee`/`rKnee` folds the heel BACK behind the knee (the way a
// knee bends); a POSITIVE one swings the shin FORWARD of the knee, a knee bent backward, which Derek calls "breaking the art". Elbows are the other
// way round: a positive `lElbow`/`rElbow` bends the forearm toward the front of the upper arm. `JOINT_LIMITS` clamps the number, not the drawn bend, so
// the clamp does not protect you: check the RENDERED joint. `node tools/debug/clip_knee_audit.mjs` (WFM_URL set) reads every clip, the waistlock
// hold and the get-ups off the drawn hip/knee/ankle on both rigs and both facings; it fails on a knee past -0.25 rad or 2.55, and a new failure that
// is not in tools/debug/baselines/clip_knee_baseline.json (the failures that shipped before the guard) fails the run. No G-package goes to Derek
// without it passing.
//
//
// This is the single registration list. Arena registers from it rather than
// naming clips one by one, and tests/moveRegistry.test.js checks it against
// the registry's `clip` fields — so a migrated move that never gets registered
// (or a registration for a move the registry doesn't know about) fails the
// suite instead of only failing in game.
//
// Adding a migrated move means one edit here plus its registry `clip` field.

import { jabClip } from './jab.js';
// The game's hammerlock is Derek's, posed in the move editor
// (./hammerlockWip.js). ./hammerlock.js is the earlier generated clip; it
// stays as the fixture the authoring pipeline's tests and proofs are built on.
import { hammerlockWipClip } from './hammerlockWip.js';
// Posed against the Royal Rumble sheet (tools/move-editor/author_piledriver.mjs).
import { piledriverClip } from './piledriver.js';
import { bodySlamClip } from './bodySlam.js';
import { suplexClip } from './suplex.js';
import { dropkickClip } from './dropkick.js';
import { frontKickClip } from './frontKick.js';
import { shoveClip } from './shove.js';
import { elbowDropClip } from './elbowDrop.js';
import { kneeDropClip } from './kneeDrop.js';
import { divingElbowClip } from './divingElbow.js';
import { topDiveClip } from './topDive.js';
import { theszPressClip } from './theszPress.js';
// George's, from Ric Flair's sheet (tools/move-editor/author_figurefour.mjs).
import { figureFourClip } from './figureFour.js';
// Mat wrestling (tools/move-editor/author_hiptoss.mjs, author_groundholds.mjs).
import { hipTossClip } from './hipToss.js';
import { ankleLockClip } from './ankleLock.js';
import { armBarClip } from './armBar.js';
// Out of the waistlock (waistlock=v1, PLAN_GRAPPLES Stage 4c).
import { atomicDropClip } from './atomicDrop.js';
import { snapmareClip } from './snapmare.js';

export const REGISTERED_MOVE_CLIPS = [
    jabClip,
    hammerlockWipClip,
    piledriverClip,
    bodySlamClip,
    suplexClip,
    dropkickClip,
    frontKickClip,
    shoveClip,
    elbowDropClip,
    kneeDropClip,
    divingElbowClip,
    topDiveClip,
    theszPressClip,
    figureFourClip,
    hipTossClip,
    ankleLockClip,
    armBarClip,
    atomicDropClip,
    snapmareClip,
];
