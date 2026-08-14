// Staging transport proof — a DEVELOPER PROOF CLIP, not a gameplay move.
//
// This clip exists to prove one thing end to end: that a clip authored in the
// move editor's data shape travels the real AnimationClip → MoveRuntime →
// Wrestler → Skeleton path and produces the pose, actor staging, part variant,
// and timing the editor previewed. It is deliberately NOT in
// src/moves/registry.js and is never registered on the Arena's runtime by the
// game — registering it would put a non-move in the move roster and let the AI
// or a kit reconciliation pick it. tools/debug/staging_transport_proof.mjs
// registers it on the live scene's runtime at probe time and tears it down.
//
// It is authored in exactly the shape tools/move-editor exports: two
// synchronized role tracks, `transform` in RIG UNITS as role-local offsets
// (see src/animation/clipStaging.js), local elbow/knee articulation channels,
// a discrete part-variant swap on a contact keyframe, and event markers.
//
// Choreography — a step-in collar tie, chosen because every channel under test
// is separately observable in the result:
//   0.00  both square, arms low                 (attacker at its own origin)
//   0.18  attacker steps in +18 units, arm rises, elbow flexes toward guard
//   0.36  CONTACT: attacker at +26, defender driven back to +14 and 6 deep,
//         fist variant swaps in on the striking forearm
//   0.60  both settle, attacker's elbow extends, defender recovers depth
//
// The defender's offsets are positive along the SAME staging axis as the
// attacker's, so under facing -1 the whole tableau mirrors as one rigid unit
// and the defender is still driven AWAY from the attacker, never through them.

export const STAGING_PROOF_CLIP_ID = 'staging-transport-proof';
export const STAGING_PROOF_DURATION = 0.60;
export const STAGING_PROOF_CONTACT_AT = 0.36;
export const STAGING_PROOF_STEP_AT = 0.18;

// Authored staging, in rig units along the staging axis. Named so the probe
// and the tests assert against the SAME numbers the clip data carries rather
// than re-typing them (a re-typed expectation cannot catch a data edit).
export const STAGING_PROOF_OFFSETS = Object.freeze({
    attackerStep: 18,
    attackerContact: 26,
    attackerSettle: 22,
    defenderContact: 14,
    defenderSettle: 20,
    defenderDepth: 6,
});

export const stagingProofClip = {
    id: STAGING_PROOF_CLIP_ID,
    duration: STAGING_PROOF_DURATION,
    tracks: {
        attacker: {
            keyframes: [
                {
                    at: 0,
                    ease: 'linear',
                    pose: { lArm: 0.15, rArm: -0.10, lElbow: 0.70, rElbow: 0.70, lLeg: -0.08, rLeg: 0.08, lKnee: 0.22, rKnee: 0.22, lean: 0, crouch: 0 },
                    transform: { x: 0, y: 0 },
                    parts: {},
                },
                {
                    at: STAGING_PROOF_STEP_AT,
                    ease: 'easeOut',
                    pose: { lArm: 0.95, lElbow: 1.35, lLeg: 0.22, lKnee: 0.55, lean: 0.12, crouch: 0.10 },
                    transform: { x: STAGING_PROOF_OFFSETS.attackerStep, y: 0 },
                },
                {
                    at: STAGING_PROOF_CONTACT_AT,
                    ease: 'easeInOut',
                    pose: { lArm: 1.48, lElbow: 0.42, rArm: 0.60, rElbow: 1.10, lLeg: 0.30, lKnee: 0.38, lean: 0.24, crouch: 0.18 },
                    transform: { x: STAGING_PROOF_OFFSETS.attackerContact, y: 0 },
                    // Discrete on purpose: art swaps land on a keyframe, they do
                    // not blend. The reference rig publishes a `fist` hand
                    // variant; Wrestler._resolveVariantSlots maps the semantic
                    // slot to whichever forearm is the near one for its facing.
                    parts: { strikingForearm: 'fist' },
                },
                {
                    at: STAGING_PROOF_DURATION,
                    ease: 'easeOut',
                    pose: { lArm: 0.70, lElbow: 1.05, rArm: 0.20, rElbow: 0.80, lLeg: 0.05, lKnee: 0.30, lean: 0.06, crouch: 0.06 },
                    transform: { x: STAGING_PROOF_OFFSETS.attackerSettle, y: 0 },
                },
            ],
        },
        defender: {
            keyframes: [
                {
                    at: 0,
                    ease: 'linear',
                    pose: { lArm: -0.12, rArm: 0.12, lElbow: 0.70, rElbow: 0.70, lLeg: -0.08, rLeg: 0.08, lKnee: 0.22, rKnee: 0.22, lean: 0, crouch: 0 },
                    transform: { x: 0, y: 0 },
                    parts: {},
                },
                {
                    at: STAGING_PROOF_STEP_AT,
                    ease: 'linear',
                    pose: { lArm: 0.10, lElbow: 0.85, lean: -0.05 },
                    transform: { x: 0, y: 0 },
                },
                {
                    at: STAGING_PROOF_CONTACT_AT,
                    ease: 'easeOut',
                    // Driven back and slightly toward the camera — proves the
                    // depth channel travels too, and that it is NOT mirrored.
                    pose: { lArm: -0.55, rArm: 0.75, lElbow: 1.25, rElbow: 1.40, lKnee: 0.62, rKnee: 0.48, lean: -0.28, crouch: 0.22 },
                    transform: { x: STAGING_PROOF_OFFSETS.defenderContact, y: STAGING_PROOF_OFFSETS.defenderDepth },
                },
                {
                    at: STAGING_PROOF_DURATION,
                    ease: 'easeInOut',
                    pose: { lArm: -0.20, rArm: 0.35, lElbow: 0.90, rElbow: 0.95, lKnee: 0.34, rKnee: 0.30, lean: -0.10, crouch: 0.10 },
                    transform: { x: STAGING_PROOF_OFFSETS.defenderSettle, y: 0 },
                },
            ],
        },
    },
    events: [
        { at: STAGING_PROOF_STEP_AT, type: 'proof-step' },
        { at: STAGING_PROOF_CONTACT_AT, type: 'proof-contact' },
    ],
};

// Deterministic seek targets for the probe and tests — the same named-phase
// convention HAMMERLOCK_PHASES uses.
export const STAGING_PROOF_PHASES = Object.freeze({
    entry: 0,
    step: STAGING_PROOF_STEP_AT,
    contact: STAGING_PROOF_CONTACT_AT,
    settle: STAGING_PROOF_DURATION,
});
