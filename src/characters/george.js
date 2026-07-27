// Gorgeous George — character config.
//
// 2026-07-26 (promoted-george roster change): this is the former George AI
// art-swap pilot family (george_ai_pilot.js -> v2 -> v4 -> v5 -> v6 -> v7 ->
// v8, downsampled for broadcast in v9), flattened into one standalone file
// and promoted to be THE shipped George. Derek reviewed the final state live
// in-browser across many rig-tuner passes this session and confirmed it —
// this file is not an intermediate candidate, it's the resolved output of
// that whole process. The original hand-drawn "NewGeorge" redraw (the
// previous shipped George) and the entire pilot lineage (v1-v9, all their
// character files and asset folders) are preserved, not deleted, under
// `_vault/characters/` and `_vault/assets/wrestlers/` for history/reversal.
//
// Facing note (from the pilot's own orientation saga — see the vaulted
// george_ai_pilot_v8.js header for the full story): every PNG here is baked
// facing RIGHT, matching Skeleton.js's whole-character facing contract.
// `facing: 1` (P1's slot in Arena.js) is the correct, authored orientation
// and is the canonical config below. Two real Skeleton.js bugs were found
// and fixed at facing: -1 (P2's slot) this session — a hip-socket FK
// asymmetry (fixed via a canonical-compute-then-mirror path) and a head
// origin that never re-mirrored under flipX (fixed by re-deriving originX
// from headAnchorFrac every time facing changes). Even with both fixed,
// Derek's live read of the mirrored render still wasn't right — a 3/4-view
// torso doesn't necessarily look equally good mirrored, independent of
// whether the math is correct — so `faceLeftOverrides` below is a second,
// directly-tuned set of values for facing: -1 (rig-tuner's "face left"
// toggle), applied as-is rather than derived by mirroring. See
// Skeleton.js's `_withFaceLeftOverrides`.
//
// Art/rig assets are the Lanczos-3, premultiplied-alpha DOWNSAMPLE of the
// v8 art (george-ai-pilot-v9-broadcast — see CLAUDE_GEORGE_V9_BROADCAST_PASS.md
// and tools/wrestler-cutter/prepare_george_v9_broadcast.mjs), which Derek
// confirmed live reads noticeably cleaner than the full-resolution v8 source
// under both normal gameplay scale and the scanline overlay — not a redraw,
// every line is the same ink, just rasterized at a resolution that matches
// how large it actually renders on screen instead of ~9-12x oversized.
// torso/pelvisOverlay MUST share one box object, not two separate { w, h }
// literals: Skeleton.js's _placePart renders each part at its own
// img._texDims, so whatever this box says IS the actual on-screen size —
// there is no code path that keeps two independent boxes in sync. A prior
// rig-tuner pass let them drift apart (78 vs 80) producing a doubled/
// drifting trunks outline; sharing one object reference here means editing
// either box slider in the tuner moves both at once, by construction — this
// MUST stay one shared reference, not two object literals with matching
// numbers (copy-pasting two separate literals reopens the same drift risk
// the next time only one of them gets tuned).
const TORSO_BOX = { w: 67, h: 127 };

export const george = {
    id: 'george',
    // Sampled from the pilot source art; used only as the flat-fill color
    // for this character's non-textured fallback draws (piledriver/flat/
    // dropkick poses in Wrestler.js) — matches the values Arena.js's own
    // PRESETS.george has used for this character throughout the pilot.
    skinCol: 0xa87858,
    trunksCol: 0x1a1a1a,
    textures: {
        heightScale: 0.825,
        headScale: 0.89,
        head: 'george_head',
        // Neck is NOT baked into the torso for this rig (unlike the old
        // NewGeorge redraw) — the head carries its own full neck, anchored
        // via headAnchorFrac + the neck socket below (see Skeleton.js's
        // headAnchorFrac comment).
        neckInTorso: true,
        headAnchorFrac: { u: 0.5877862595419847, v: 0.84375 },
        // See the shared TORSO_BOX comment above this object.
        torso: { key: 'george_torso', box: TORSO_BOX },
        pelvisOverlay: { key: 'george_pelvis_overlay', box: TORSO_BOX },
        rigProfile: {
            sockets: {
                neck:         { u: 0.612, v: 0.136 },
                nearShoulder: { u: 0.21,  v: 0.136 },
                farShoulder:  { u: 0.652, v: 0.187 },
                nearHip:      { u: 0.469, v: 0.793 },
                farHip:       { u: 0.676, v: 0.748 },
            },
        },
        upperArm: {
            key: 'george_upper_arm',
            box: { w: 35, h: 67 },
            jointPivotFrac: 0.06717550548962259,
            distalAnchorFrac: { u: 0.5, v: 0.927007299270073 },
            pivotOffsetFrac: 0.065,
        },
        thigh: {
            key: 'george_thigh',
            box: { w: 39, h: 72.991 },
            jointPivotFrac: 0.02663115845539281,
            distalAnchorFrac: { u: 0.5, v: 0.9201065246338216 },
        },
        thighH: 67,
        shinH: 40.19,
        farShinScale: 1,
        nearShin: {
            key: 'george_near_shin',
            box: { w: 69.29863013689331, h: 86.05214511504334 },
            jointPivotFrac: 0.23422963443403397,
            soleAnchorFrac: { u: 0.6214887064664337, v: 0.8976677194167121 },
        },
        farShin: {
            key: 'george_far_shin',
            box: { w: 69.29863013689331, h: 86.05214511504334 },
            jointPivotFrac: 0.23422963443403397,
            soleAnchorFrac: { u: 0.6214887064664337, v: 0.8976677194167121 },
        },
        nearForearm: {
            key: 'george_near_forearm',
            box: { w: 32, h: 70.203 },
            jointPivotFrac: 0.0641025641025641,
            pivotOffsetFrac: 0.029,
        },
        farForearm: {
            key: 'george_far_forearm',
            box: { w: 41.786548813804224, h: 74.65110477276917 },
            jointPivotFrac: 0.060514372163388806,
        },
        nearArmTilt: -3 * Math.PI / 180,
        farArmTilt: 8.5 * Math.PI / 180,
        nearForearmOffsetX: -2,
        nearForearmOffsetY: 3,
        farForearmOffsetX: -6,
        farForearmOffsetY: 1,
        nearShinOffsetX: -2,
        nearShinOffsetY: 12,
        farShinOffsetX: 3,
        farShinOffsetY: 13,
        // Known unresolved issue, carried over from the pilot (not caused by
        // the promotion): sole_grounding_sweep.mjs still shows a planted-sole
        // gap (~11px) because nearShinOffsetY/farShinOffsetY apply AFTER the
        // sole-grounding IK solve (Skeleton.js ~line 1189) and are never read
        // by the sole-anchor solve that plants the foot (~lines 805-863).
        // Flagged across several sessions now — revisit by either zeroing
        // these two offsets or teaching the grounding solve to read them.

        // Derek's direct rig-tuner export with "face left" toggled on —
        // applied only at facing: -1 (P2's slot), as-is. Only the fields
        // Derek actually touched are listed; every other value (box sizes,
        // pivotOffsetFrac, thigh/shin, etc.) still comes from the facing: 1
        // config above and mirrors via Skeleton.js's canonical-mirror path.
        faceLeftOverrides: {
            nearForearmOffsetX: 0,
            farForearmOffsetX: -3,
            farForearmOffsetY: 0,
            rigProfile: {
                sockets: {
                    neck: { u: 0.451, v: 0.141 },
                },
            },
        },
    },
    idlePose: 'powerIdle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'piledriver', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag',
        'jab', 'headbutt', 'hammerlock', 'kneeLift', 'backBodyDrop', 'kneeDrop',
    ],
};
