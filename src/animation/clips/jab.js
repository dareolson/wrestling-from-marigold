// Jab — the first move migrated to the seekable clip runtime (see
// RIG_AND_MOVE_PIPELINE.md's "Migration order" and the jab proof gates).
//
// This is DATA, not behavior. It describes only WHEN the strike reads at each
// phase, WHICH forearm art is visible, and the one authored impact frame.
// Gameplay (Wrestler._doJab's impact handler) still owns legality, damage,
// stamina, blocking, and selling — the runtime just fires the marker.
//
// The numeric pose channels below are the exact facing-relative stance values
// from Wrestler.js's POSES (idle / jabCock / jab / jabRecoil), normalized to
// the same six channels Wrestler.tweenPose blends (lLeg, rLeg, lArm, rArm,
// lean, crouch). They are inlined rather than imported so the animation layer
// stays free of any Wrestler dependency; keep them in sync with POSES if those
// stances are ever retuned. Extended channels a character may carry
// (lForearm/lShin/…, e.g. theszIdle) are deliberately NOT authored here, so
// they pass through untouched exactly as the legacy tweenPose path left them.

// Legacy timing this clip reproduces 1:1 (MOVE_DEFS.jab.poseSeq, in ms):
//   jabCock 83  ->  jab 67  ->  jabRecoil 83  ->  idle 167   (400ms total)
// and the single delayedCall(83) that applied damage. The impact marker sits
// at that same 83ms so game feel is preserved.
const COCK_AT   = 0.083; // wind-up fully loaded == the authored impact frame
const JAB_AT    = 0.150; // full forward extension
const RECOIL_AT = 0.233; // arm bounces back, guard begins dropping
export const JAB_DURATION  = 0.400;
export const JAB_IMPACT_AT = COCK_AT;
export const JAB_CLIP_ID    = 'jab';

// Facing-relative stance -> the six blended channels (mirrors tweenPose's own
// normalization, so lean/crouch default to 0 when a pose omits them).
const idle      = { lLeg: -0.04, rLeg:  0.16, lArm:  0.00, rArm:  0.00, lean:  0.00, crouch: 0.00 };
const jabCock   = { lLeg:  0.12, rLeg: -0.10, lArm: -0.55, rArm:  0.26, lean: -0.10, crouch: 0.08 };
const jab       = { lLeg:  0.18, rLeg: -0.12, lArm:  1.00, rArm: -0.35, lean:  0.22, crouch: 0.10 };
const jabRecoil = { lLeg:  0.14, rLeg: -0.09, lArm:  0.82, rArm: -0.10, lean:  0.08, crouch: 0.00 };

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
    windup:    0.040,   // mid wind-up, arm loading back
    impact:    COCK_AT, // authored damage frame
    extension: JAB_AT,  // full forward reach
    recovery:  RECOIL_AT,
    rest:      JAB_DURATION,
});
