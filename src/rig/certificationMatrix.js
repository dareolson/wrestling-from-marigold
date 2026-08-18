// The high-strain certification matrix.
//
// Each entry names a wrestling configuration the rig must survive, and — the
// part that turned out to matter most — declares WHICH RENDER PATH actually
// draws it:
//
//   'upright'  Skeleton.updateUpright. The modular rig, fully certifiable.
//   'getup'    Skeleton.updateGetUp -> _applyGrounded. Also the modular rig.
//   'unrigged' Wrestler's legacy Graphics primitives (_drawFlat,
//              _drawDropkickFront, _drawInverted, _drawFalling...), which set
//              `skeleton.setVisible(false)` and draw filled rectangles and a
//              circle instead. No joint, no binding, no articulation.
//
// Audit finding (2026-08-12): prone, supine, pinned, bridged, dropkick
// extension, every airborne state and every held/slam state are 'unrigged'.
// `_drawFlat` is literally two rectangles and a circle. A matrix that ran
// these through the certifier and reported "pass" would be lying — there is
// nothing there to measure. They are reported as coverage gaps instead,
// because for a moveset author "this move bypasses the rig entirely" is far
// more actionable than a green tick.
//
// Poses are referenced by name from Wrestler's POSES table rather than
// duplicated here, so the matrix cannot drift away from the poses the game
// actually plays.

/** Frame counts for sampled motion. Intermediate frames are the point. */
export const MOTION_SAMPLES = 12;

// The get-up tween runs 850ms at full stamina (Wrestler._startRiseUp), which
// is ~51 frames at 60fps. Sampling it at 49 points keeps the certifier at or
// below real playback density, so a frame-to-frame budget measured here is a
// budget the player's screen will also satisfy. Sampling it coarsely — an
// earlier draft used 7 points — makes legitimate motion look like a
// discontinuity, because each "step" spans eight real frames.
export const GETUP_SAMPLES = Object.freeze(
    Array.from({ length: 49 }, (_, index) => index / 48),
);

export const CERTIFICATION_MATRIX = Object.freeze([
    Object.freeze({
        id: 'relaxed-stance',
        label: 'relaxed stance',
        renderPath: 'upright',
        pose: 'theszIdle',
    }),
    Object.freeze({
        id: 'combat-guard',
        label: 'combat guard',
        renderPath: 'upright',
        pose: 'block',
    }),
    Object.freeze({
        id: 'straight-jab',
        label: 'straight jab',
        renderPath: 'upright',
        // Cock -> extension -> recoil. The extension is the structural worst
        // case for the wrist chain: the arm is at full reach, so any error in
        // the forearm's distal anchor is fully expressed.
        motion: Object.freeze(['jabCock', 'jab', 'jabRecoil']),
    }),
    Object.freeze({
        id: 'bent-elbow-strike',
        label: 'deeply bent hook / elbow strike',
        renderPath: 'upright',
        motion: Object.freeze(['elbowRaise', 'elbowImpact']),
    }),
    Object.freeze({
        id: 'overhead-double-axe',
        label: 'overhead double-axe position',
        renderPath: 'upright',
        // Known worst case for elbow seating on legacy art: arms go higher
        // here than in any other move.
        motion: Object.freeze(['axeHandleUp', 'axeHandleDown', 'axeHandleImpact']),
    }),
    Object.freeze({
        id: 'hammerlock',
        label: 'hammerlock',
        renderPath: 'upright',
        motion: Object.freeze(['hammerlockReach', 'hammerlockTurn', 'hammerlockSet', 'hammerlockCrank']),
    }),
    Object.freeze({
        id: 'arm-drag-reach',
        label: 'arm drag reach',
        renderPath: 'upright',
        motion: Object.freeze(['armDragGrab', 'armDragPull', 'armDragFollow']),
    }),
    Object.freeze({
        id: 'lockup',
        label: 'lockup',
        renderPath: 'upright',
        pose: 'lockup',
    }),
    Object.freeze({
        id: 'deep-squat',
        label: 'deep squat',
        renderPath: 'upright',
        // elbowCrouch carries the deepest `crouch` channel in the table, which
        // is the pose-driven knee-bend path rather than the gait path.
        pose: 'elbowCrouch',
    }),
    Object.freeze({
        id: 'single-knee-stance',
        label: 'single-knee stance',
        renderPath: 'upright',
        pose: 'kneeDropLand',
        // The down knee carries the weight here, not a sole. Demanding a
        // planted foot would be asking the rig to render the pose wrongly.
        footBearing: false,
    }),
    Object.freeze({
        id: 'knee-lift',
        label: 'knee lift',
        renderPath: 'upright',
        motion: Object.freeze(['kneeLiftLoad', 'kneeLiftChamber', 'kneeLiftImpact', 'kneeLiftRecover']),
    }),
    Object.freeze({
        id: 'sprawl',
        label: 'sprawl / braced stuff',
        renderPath: 'upright',
        // The braced low stance that stuffs a tie-up. A true face-down sprawl
        // is grounded and currently unrigged — see prone-recovery below.
        pose: 'block',
    }),
    Object.freeze({
        id: 'seated-getup',
        label: 'seated / get-up transition',
        renderPath: 'getup',
        getUp: true,
    }),
    Object.freeze({
        id: 'back-drop-arch',
        label: 'bridge / arched pin escape (upright arch phase)',
        renderPath: 'upright',
        motion: Object.freeze(['backDropBrace', 'backDropDip', 'backDropLaunch', 'backDropRecover']),
    }),
    Object.freeze({
        id: 'dropkick-extension',
        label: 'dropkick extension',
        renderPath: 'unrigged',
        state: 'dropkicking',
        gap: 'Wrestler._drawDropkickFront draws primitives; skeleton is hidden.',
    }),
    // Migrated off Wrestler._drawFlat onto Skeleton.updateGrounded
    // (2026-08-13). These now carry real joints, bindings and parts, and
    // GETUP_POSES[0] IS their pose object, so lying down and the first frame
    // of the get-up are the same render.
    //
    // Scope, stated precisely (Codex review, 2026-08-13): what is certified
    // is the `down`/`pinned`/`possum` STATE PATHS through the rig, all three
    // of which render the one `flat` pose — exactly as _drawFlat rendered all
    // three identically before. That shared pose renders PRONE (face down) —
    // see Skeleton.GROUNDED_FLAT. A SUPINE posture, an arched bridge and a
    // kneeling pose do not exist yet, so these entries deliberately do NOT
    // claim them. `postureGap` names what is still missing, so the coverage
    // number cannot be read as more than it is.
    //
    // A render-time reflection briefly presented these face-up; it rendered
    // every part upside down and was removed (2026-08-17). Supine is now an
    // honest, named gap rather than a broken feature.
    Object.freeze({
        id: 'down-state',
        label: 'downed state (flat on mat)',
        renderPath: 'grounded',
        state: 'down',
        groundedPose: 'flat',
        // Lying on the mat: the body bears weight, not the soles.
        footBearing: false,
        postureGap: 'renders the shared prone (face-down) flat pose; no supine posture exists, so a wrestler dropped on his back still lands face down',
    }),
    Object.freeze({
        id: 'pinned-state',
        label: 'pinned state (flat on mat)',
        renderPath: 'grounded',
        state: 'pinned',
        groundedPose: 'flat',
        footBearing: false,
        postureGap: 'no arched bridge / pin-escape posture yet, and no supine posture; renders the shared prone flat pose',
    }),
]);

export const FACINGS = Object.freeze([1, -1]);

/**
 * Does this entry put weight on at least one sole?
 *
 * Upright stances do by default. Kneeling and grounded entries do not, and an
 * invariant that demanded it everywhere would be asking the rig to render
 * those poses wrongly — so the exceptions are declared on the entry rather
 * than absorbed by loosening the grounding budget.
 */
export function isFootBearing(entry) {
    if (entry.footBearing !== undefined) return entry.footBearing;
    return entry.renderPath === 'upright';
}

/** Matrix entries the modular rig actually draws. */
export function riggedEntries(matrix = CERTIFICATION_MATRIX) {
    return matrix.filter(entry => entry.renderPath !== 'unrigged');
}

/** Matrix entries that bypass the rig — reported, never silently skipped. */
export function coverageGaps(matrix = CERTIFICATION_MATRIX) {
    return matrix.filter(entry => entry.renderPath === 'unrigged');
}

/**
 * Postures the rig can now draw but has no authored pose for.
 *
 * Distinct from coverageGaps: those states reach no rig at all, while these
 * reach the rig and render a stand-in. Reported separately so "16/17 entries
 * reach the modular rig" is never mistaken for "16/17 wrestling postures
 * exist" — three grounded state paths currently share one flat pose.
 */
export function postureGaps(matrix = CERTIFICATION_MATRIX) {
    return matrix.filter(entry => entry.postureGap);
}

/**
 * Expand an entry into the ordered pose keys to render. A static pose yields
 * one frame per facing; a motion yields interpolated intermediate frames,
 * because "finite at the endpoints" is not continuity.
 */
export function motionFrames(entry, samples = MOTION_SAMPLES) {
    if (!entry.motion) return entry.pose ? [entry.pose] : [];
    const segments = entry.motion.length - 1;
    if (segments < 1) return [entry.motion[0]];
    const frames = [];
    for (let i = 0; i <= samples * segments; i++) {
        const position = i / samples;
        const index = Math.min(segments - 1, Math.floor(position));
        frames.push({ from: entry.motion[index], to: entry.motion[index + 1], t: position - index });
    }
    return frames;
}
