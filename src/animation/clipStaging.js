// Clip staging transport — what a clip's `transform` channels MEAN once a real
// Wrestler consumes them.
//
// Until now `transform` was authored in the move editor, previewed there, and
// then silently dropped: MoveRuntime.applySample returns early for any target
// that implements applyAnimationSample, and Wrestler.applyAnimationSample only
// consumed pose and parts. Editor staging previewed correctly and reached
// nothing. This module is the contract that closes that seam.
//
// ── THE CONTRACT ─────────────────────────────────────────────────────────────
//
// UNITS. transform.x/y are RIG UNITS (the unscaled body-space the Skeleton is
// drawn in at s=1), never editor-canvas pixels and never world coordinates.
// The move editor divides by its preview SCALE on the way into the draft, so
// one authored unit means the same body distance in the editor and in the ring
// regardless of either one's zoom.
//
// ORIGIN. They are OFFSETS FROM THE ACTOR'S OWN POSITION when the clip began,
// captured once per role at play() time. Clip data therefore never carries an
// absolute ring position and a move stages identically wherever it is started.
//
// AXIS. x is measured along the STAGING AXIS: the direction the anchor role
// (`attacker`, see ANCHOR_PREFERENCE) was facing at clip start. Positive x is
// forward along that axis for BOTH actors, so the two-actor tableau mirrors as
// one rigid unit when the attacker faces left — a defender authored 24 units
// ahead of the attacker stays ahead of them, never behind. y is ring DEPTH and
// is deliberately NOT mirrored; facing is a left/right property and mirroring
// depth would swap which wrestler is nearer the camera.
//
// SCALE. Both axes are multiplied by ONE captured perspective scale, taken
// from the anchor. Using each actor's own live `s` would let the pair drift
// apart as the clip nudges them to different depths — the relative geometry the
// author saw would not survive playback. One scale keeps the tableau rigid.
//
// DETERMINISM. world = origin + f(sampled transform). Nothing accumulates and
// nothing reads back the previous frame, so seeking to t gives the same
// position whether it was reached by playing forward, scrubbing backward, or
// jumping there cold — the property the editor's scrubber depends on.
//
// OWNERSHIP. Staging is OPT-IN PER TRACK: a context exists only for roles whose
// track actually authors transform channels (see `authorsTransform` on the
// compiled clip). A clip that authors none — hammerlock, jab — gets no context
// at all and its executor keeps sole ownership of position exactly as before.
// That is what makes "the clip owns position" and "the executor owns position"
// mutually exclusive by construction rather than by convention, so two owners
// can never fight over a wrestler.
//
// NOT IN THIS CONTRACT. Facing is not a clip channel: executors set it (the
// hammerlock's `other.facing = this.facing`) before play() and it is captured,
// not driven. Ring-bounds clamping is the consumer's job, not this module's —
// see Wrestler._applyStagedTransform.

// Which bound role defines the staging axis. `attacker` first: for a paired
// move the attacker's facing is the one gameplay already establishes at
// commitment, and mirroring the pair about anything else would make the
// defender's authored offset read backwards. The fallbacks cover solo clips
// and any future non-combat naming; the first bound role is the last resort so
// a context is still well-defined for a clip that uses none of these names.
export const ANCHOR_PREFERENCE = Object.freeze(['attacker', 'anchor', 'solo']);

export function pickAnchorRole(roles) {
    for (const preferred of ANCHOR_PREFERENCE) {
        if (roles.includes(preferred)) return preferred;
    }
    return roles[0] ?? null;
}

// Read a binding target's staging origin. Targets opt in by implementing
// captureStagingOrigin() (Wrestler does); anything else falls back to plain
// x/y/facing reads so generic targets — test doubles, tools — still stage.
//
// This is a PURE READ on purpose. An earlier shape zeroed walk velocity here,
// which made a function named "capture" quietly mutate the actor and made the
// side effect depend on capture order. Velocity is instead zeroed by the
// consumer on every frame it owns position, where it is visible.
function captureOrigin(target) {
    const captured = target?.captureStagingOrigin?.() ?? {
        x: target?.x ?? 0,
        y: target?.y ?? 0,
        facing: target?.facing ?? 1,
        scale: 1,
    };
    const scale = Number(captured.scale);
    return {
        x: Number.isFinite(captured.x) ? captured.x : 0,
        y: Number.isFinite(captured.y) ? captured.y : 0,
        facing: Math.sign(captured.facing) || 1,
        scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
    };
}

/**
 * Build the immutable per-role staging context for one playback of `clip`.
 *
 * Returns null when no bound role authors transform channels — the signal that
 * this clip does not own anybody's position and the executor still does.
 *
 * @param {object} clip compiled clip (carries `authorsTransform` per track)
 * @param {Record<string, object>} bindings role → binding target
 */
export function captureStagingContext(clip, bindings) {
    if (!clip?.authorsTransform) return null;
    const bound = Object.keys(bindings ?? {}).filter(role => bindings[role]);
    const staged = bound.filter(role => clip.tracks[role]?.authorsTransform);
    if (!staged.length) return null;

    // The anchor is chosen from every BOUND role, not only the staged ones: a
    // clip can perfectly well move just the defender while the attacker stands
    // still, and that move must still mirror about the attacker's facing.
    const anchorRole = pickAnchorRole(bound);
    const anchor = captureOrigin(bindings[anchorRole]);
    const roles = {};
    for (const role of staged) {
        const origin = role === anchorRole ? anchor : captureOrigin(bindings[role]);
        roles[role] = Object.freeze({
            role,
            originX: origin.x,
            originY: origin.y,
            // Axis and scale come from the ANCHOR for every role — that shared
            // frame is what keeps the pair rigid.
            facing: anchor.facing,
            scale: anchor.scale,
        });
    }
    return Object.freeze({ anchorRole, facing: anchor.facing, scale: anchor.scale, roles: Object.freeze(roles) });
}

/**
 * Resolve one sampled transform to a world point under a role's staging.
 *
 * Non-finite channels resolve to 0 rather than propagating NaN into a
 * wrestler's position — a single bad authored keyframe should read as "no
 * offset", not teleport an actor out of the ring permanently. The move
 * editor's readiness report is what tells the author the channel is bad.
 */
export function stagedWorldPoint(staging, transform = {}) {
    const dx = Number.isFinite(transform?.x) ? transform.x : 0;
    const dy = Number.isFinite(transform?.y) ? transform.y : 0;
    return {
        x: staging.originX + staging.facing * dx * staging.scale,
        y: staging.originY + dy * staging.scale,
    };
}
