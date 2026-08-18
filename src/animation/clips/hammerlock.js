// Hammerlock — the first PAIRED move migrated to the seekable clip runtime
// (see RIG_AND_MOVE_PIPELINE.md's "Migration order" step 2), and the first move
// authored END TO END in tools/move-editor: stance, staging, contact, art
// variant, easing and markers all come out of the editor draft that lives
// beside it (tools/move-editor/drafts/hammerlock.json). tests/hammerlockAuthoring.test.js
// holds the two in agreement, so neither can be retuned without the other.
//
// This is DATA, not behavior. It describes WHERE each actor stands, how each
// one reads at each phase (attacker cranks the arm; defender is folded into the
// trapped stance), which art the working hand wears, and WHEN the three
// gameplay beats fire. Gameplay (Wrestler._doHammerlock's event handlers) still
// owns damage, stamina, state, and the character-specific recovery.
//
// The numeric pose channels are the exact facing-relative stances from
// Wrestler.js's POSES (lockup / hammerlockReach / hammerlockTurn / hammerlockSet
// / hammerlockCrank for the attacker; lockup -> armBarDefender for the
// defender), normalized to the six channels tweenPose blends (lLeg, rLeg, lArm,
// rArm, lean, crouch). They are inlined rather than imported so the animation
// layer stays free of any Wrestler dependency; keep them in sync with POSES if
// those stances are ever retuned. Extended channels a character may carry
// (lForearm/lShin/…, e.g. Lou's theszIdle) are deliberately NOT authored here,
// so they pass through untouched exactly as the legacy tweenPose path left them.

// Legacy timing this clip reproduces 1:1 (MOVE_DEFS.hammerlock.poseSeq, in ms,
// each step's duration is the tween INTO that pose from the previous one):
//   reach 120  ->  turn 180  ->  set 200  ->  crank 900   (1400ms of hold)
// Cumulative phase boundaries: reach done @120, turn @300, set @500, crank @1400.
// The defender tweened into armBarDefender over 260ms at commitment. The two old
// delayedCalls — drain at 300ms, release (+drain) at 1400ms — become the
// apply-drain and release-contact markers below, at the same times, so the feel
// and the damage schedule are unchanged. The 220ms settle back to each
// character's CONFIGURED idle pose is owned by the executor (onComplete), not
// this shared clip data — the idle target differs per wrestler (Lou's theszIdle
// vs George's powerIdle) and must never be baked into a shared clip.
const REACH_AT   = 0.120;
const TURN_AT    = 0.300;
const SET_AT     = 0.500;
export const HAMMERLOCK_DURATION       = 1.400;
export const HAMMERLOCK_CONTACT_AT     = REACH_AT; // hand catches the wrist
export const HAMMERLOCK_DRAIN_AT       = TURN_AT; // first crank drain lands as the set begins
export const HAMMERLOCK_RELEASE_AT     = HAMMERLOCK_DURATION;
export const HAMMERLOCK_DEF_SET_AT     = 0.260;   // defender fully into the trapped stance
export const HAMMERLOCK_CLIP_ID        = 'hammerlock';

// ── Staging: the authored tableau ────────────────────────────────────────────
//
// Rig units from the SHARED tableau origin — the attacker's position when the
// clip begins (src/animation/clipStaging.js). These numbers are not new
// choreography: they are the ring geometry Wrestler._doHammerlock used to build
// imperatively with two Phaser tweens (`sx + facing*30*s` for the defender,
// 24 units back from that for the attacker), moved into clip data so the move
// editor can compose, preview and re-measure the tableau instead of an author
// having to read it out of gameplay code.
//
// The entry offsets are load-bearing under the shared-origin contract: at t=0
// each actor is PLACED there. They are the real trigger geometry, not a guess —
// hammerlock can only be committed from inside a lockup, and Arena._tickLockup
// holds that tie-up at a gap of exactly 100*s with both wrestlers on one depth
// line. Measured on the live game across three commitments: 99.539 rig units
// (the residue is the lockup's exponential approach), so the t=0 placement
// moves the defender under half a rig unit and the attacker not at all.
//
// What the clip DOES change versus the old executor tweens: the defender is
// pulled onto the attacker's depth line (dy 0) rather than keeping whatever
// depth it committed at. That is the shared-tableau contract doing its job — a
// paired hold is one rigid tableau, not two independently placed bodies — and
// it is why a hammerlock now reads identically from every trigger.
export const HAMMERLOCK_STAGING = Object.freeze({
    attackerEntry:  Object.freeze({ x: 0,   y: 0 }),
    defenderEntry:  Object.freeze({ x: 100, y: 0 }),
    attackerWork:   Object.freeze({ x: 6,   y: 0 }),
    defenderWork:   Object.freeze({ x: 30,  y: 0 }),
});

// Attacker stances (facing-relative, 6 blended channels).
const lockup          = { lLeg:  0.18, rLeg: -0.12, lArm:  1.57, rArm:  1.57, lean:  0.26, crouch: 0.18 };
const hammerlockReach = { lLeg:  0.10, rLeg: -0.12, lArm:  0.78, rArm:  0.42, lean:  0.18, crouch: 0.10 };
const hammerlockTurn  = { lLeg: -0.10, rLeg:  0.24, lArm:  1.32, rArm:  0.74, lean:  0.22, crouch: 0.16 };
const hammerlockSet   = { lLeg:  0.20, rLeg: -0.16, lArm:  1.92, rArm:  0.68, lean:  0.30, crouch: 0.22 };
const hammerlockCrank = { lLeg:  0.28, rLeg: -0.22, lArm:  2.18, rArm:  0.46, lean: -0.06, crouch: 0.28 };

// Defender stances: starts in the shared lockup tie-up, gets folded into the
// trapped reach. armBarDefender is reused deliberately (the current rigs cannot
// draw genuinely interlocked hands — the offset silhouette implies the lock).
const armBarDefender  = { lLeg: -0.08, rLeg:  0.06, lArm: -0.60, rArm:  0.90, lean: -0.14, crouch: 0.20 };

// The attacker's gripping hand wears `grip` art for exactly the length of the
// hold: acquired on the reach (the contact frame) and returned to base on the
// release frame. `workingHand` is a SEMANTIC slot, not a fixed near/far one —
// src/rig/partVariants.js maps it to the hand on the arm the pose drives as
// lArm, which the skeleton renders as the near hand facing right and the far
// hand facing left, so the grip lands on the correct hand in BOTH facings.
// Characters that publish no `hand` variant family resolve it to their
// calibrated base hand art, so this is a safe no-op on George and Lou and a
// real swap on the reference rig — which is what the editor previews against.
export const hammerlockClip = {
    id: HAMMERLOCK_CLIP_ID,
    duration: HAMMERLOCK_DURATION,
    tracks: {
        // Two roles sampled at the same clip time every frame — the paired proof.
        attacker: {
            keyframes: [
                { at: 0,        pose: lockup, transform: { ...HAMMERLOCK_STAGING.attackerEntry }, parts: { workingHand: 'base' } },
                { at: REACH_AT, ease: 'easeOut',   pose: hammerlockReach, parts: { workingHand: 'grip' } },
                // The step-in completes here, on the same 300ms the executor's
                // staging tween used. Easing is a property of the KEYFRAME, so
                // this 6-rig-unit adjustment rides the stance's easeInOut rather
                // than the old tween's Cubic.easeOut; at under 5 px of travel the
                // two curves never differ by a whole pixel.
                { at: TURN_AT,  ease: 'easeInOut',  pose: hammerlockTurn, transform: { ...HAMMERLOCK_STAGING.attackerWork } },
                { at: SET_AT,   ease: 'easeOut',    pose: hammerlockSet },
                { at: HAMMERLOCK_DURATION, ease: 'linear', pose: hammerlockCrank, parts: { workingHand: 'base' } },
            ],
        },
        defender: {
            keyframes: [
                { at: 0,                       pose: lockup, transform: { ...HAMMERLOCK_STAGING.defenderEntry } },
                // Dragged in off the tie-up and folded into the trapped stance
                // on one keyframe: the 70 rig units of travel and the stance
                // change share the same easeOut, so the body arrives as the arm
                // is trapped rather than sliding in afterwards.
                { at: HAMMERLOCK_DEF_SET_AT,   ease: 'easeOut', pose: armBarDefender, transform: { ...HAMMERLOCK_STAGING.defenderWork } },
                // Held through the crank; explicit final frame keeps the trapped
                // stance readable when a tool seeks to the release moment.
                { at: HAMMERLOCK_DURATION,     pose: armBarDefender },
            ],
        },
    },
    events: [
        // Hand catches the wrist — the choreographic contact frame. (It sits at
        // the reach, not 0: eventsBetween is (from, to], so an at=0 marker could
        // never emit, and the physical grab is already owned synchronously by
        // the executor's holding-state assignment at commitment.)
        { at: HAMMERLOCK_CONTACT_AT, type: 'acquire-contact' },
        // First crank drain, as the set begins (was delayedCall(300)).
        { at: HAMMERLOCK_DRAIN_AT,  type: 'apply-drain' },
        // Release drain + hand-off back to standing (was delayedCall(1400)).
        // eventsBetween is (from, to] and `to` reaches duration on the final
        // step, so this fires exactly once on natural completion and never when
        // a preview merely seeks. A move cancelled before 1.4s never reaches it,
        // so an interrupted hammerlock correctly deals no release damage.
        { at: HAMMERLOCK_RELEASE_AT, type: 'release-contact' },
    ],
};

// Named seek targets for the preview/test seam (tools/debug/hammerlock_preview.mjs
// and tests) so entry / contact-set / crank / release / recovery can each be
// inspected at an exact, deterministic time without live gameplay.
export const HAMMERLOCK_PHASES = Object.freeze({
    entry:    0.0,                    // tie-up, before the reach
    reach:    REACH_AT,               // hand catches the wrist (contact frame)
    turn:     TURN_AT,
    set:      SET_AT,                 // arm folded, first drain frame
    crank:    (SET_AT + HAMMERLOCK_DURATION) / 2, // deep in the working hold
    release:  HAMMERLOCK_DURATION,    // release frame
});
