// Jab — the first move migrated to the seekable clip runtime (see
// RIG_AND_MOVE_PIPELINE.md's "Migration order" and the jab proof gates).
//
// This is DATA, not behavior. It describes only WHEN the strike reads at each
// phase, WHICH forearm art is visible, and the one authored impact frame.
// Gameplay (Wrestler._doJab's impact handler) still owns legality, damage,
// stamina, blocking, and selling — the runtime just fires the marker.
//
// Second pass (2026-10-15, after the move pilot): the fist now lands on the
// FACE (it was a chest touch, while gameplay plays sellHead), with a guard on
// the way in, a shoulder lead from the `bend` torso channel and a rear hand
// that stays at the chin. That needs the elbows, so both are authored on every
// key; the first and last keys hold them at 0.75, the bend both wrestlers'
// idles already show, so entering and leaving the clip does not pop. Graded
// with tools/move-critic (fist:near → face, specs.mjs) at 60/70/85 units.
// Legacy timing (MOVE_DEFS.jab.poseSeq, in ms) was
//   jabCock 83  ->  jab 67  ->  jabRecoil 83  ->  idle 167   (400ms total)
// with the single delayedCall(83) that applied damage — so damage landed on
// the fully COCKED pose, before the arm arrived. The gameplay beat stays at
// 83ms; the stroke is retimed so full extension is that frame: a quicker
// load, contact at reach, then the same recoil and return.
const COCK_AT   = 0.040; // wind-up fully loaded
const JAB_AT    = 0.083; // full forward extension == the authored impact frame
const RECOIL_AT = 0.166; // arm bounces back, guard begins dropping
export const JAB_DURATION  = 0.400;
export const JAB_IMPACT_AT = JAB_AT;
export const JAB_CLIP_ID    = 'jab';

// Facing-relative stance.
const idle      = { lLeg: -0.04, rLeg:  0.16, lArm:  0.00, rArm:  0.00, lElbow: 0.75, rElbow: 0.75, lean: 0.00, crouch: 0.00, bend:  0.00 };
// Loaded: lead fist drawn back low beside the ribs, shoulder turned away.
const jabCock   = { lLeg:  0.10, rLeg: -0.08, lArm:  0.40, rArm:  0.55, lElbow: 2.25, rElbow: 2.05, lean: 0.00, crouch: 0.08, bend: -0.10 };
// Contact: the game strikes at in-fighting range (bodies nearly touching), so
// this is a short punch to the jaw, not a full-length jab. Arm solved by
// stage.mjs (fist:near → face) at 70 units; shoulder leading, rear fist still
// at the chin.
const jab       = { lLeg:  0.18, rLeg: -0.12, lArm:  1.12, rArm:  0.55, lElbow: 2.06, rElbow: 2.05, lean: 0.00, crouch: 0.10, bend:  0.16 };
// Snap back toward the guard.
const jabRecoil = { lLeg:  0.14, rLeg: -0.09, lArm:  0.80, rArm:  0.45, lElbow: 1.85, rElbow: 1.70, lean: 0.00, crouch: 0.04, bend:  0.04 };

// The clip binds the fist to `strikingForearm` — a SEMANTIC slot, not a fixed
// near/far one. Wrestler.applyAnimationSample maps it to the near OR far
// forearm depending on facing (the jab punches with lArm, which the skeleton
// renders as the near arm facing right and the far arm facing left), so the
// fist lands on the correct forearm in BOTH facings and both wrestler slots.
// No `fist` variant exists yet: setPartVariants resolves the semantic slot to
// the calibrated base forearm art, so this is a safe no-op until fist art is
// authored (do not create PNGs or hand bones for this).
export const jabClip = {
    id: JAB_CLIP_ID,
    duration: JAB_DURATION,
    tracks: {
        attacker: {
            keyframes: [
                { at: 0,         pose: idle,      parts: { strikingForearm: 'base' } },
                { at: COCK_AT,   ease: 'easeOut', pose: jabCock,   parts: { strikingForearm: 'fist' } },
                { at: JAB_AT,    ease: 'easeIn',  pose: jab },
                { at: RECOIL_AT, ease: 'linear',  pose: jabRecoil, parts: { strikingForearm: 'base' } },
                { at: JAB_DURATION, ease: 'easeOut', pose: idle },
            ],
        },
    },
    events: [
        // Exactly one impact. eventsBetween is (from, to] so contiguous frames
        // fire it once and only once at any sampling rate; seeking never emits.
        { at: JAB_IMPACT_AT, type: 'impact' },
    ],
};

// Named seek targets for the preview/test seam (tools/debug/jab_preview.mjs
// and tests) so wind-up / extension / impact / recovery can each be inspected
// at an exact, deterministic time without live gameplay.
export const JAB_PHASES = Object.freeze({
    windup:    0.020,   // mid wind-up, arm loading back
    cocked:    COCK_AT, // wind-up fully loaded
    impact:    JAB_AT,  // authored damage frame == full forward reach
    recovery:  RECOIL_AT,
    rest:      JAB_DURATION,
});
