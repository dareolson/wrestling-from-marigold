// Gorgeous George — AI art-swap pilot. Reversible, opt-in character config
// (select via ?p1=george-ai-pilot / ?p2=george-ai-pilot — see Arena.js's
// PRESETS). Do NOT replace the live george.js textures with this file; it
// exists so the new AI-generated "gameplay master" art can be compared
// side-by-side with the shipped George before Derek approves a swap.
//
// Source of truth for every measurement below (not committed — Sprite
// sheets/ is gitignored):
//   Sprite sheets/AI Pilot/George/CLAUDE_INTEGRATION_HANDOFF.md
//   Sprite sheets/AI Pilot/George/PILOT_NOTES.md
//   Sprite sheets/AI Pilot/George/rig-profile-pilot.json
// Approved parts copied verbatim from
// Sprite sheets/AI Pilot/George/rig-parts-source/transparent/ into
// src/assets/wrestlers/george-ai-pilot/ (this file's textures.*.key values).
//
// Every limb canvas is pre-rotated so its proximal-to-distal axis is exactly
// vertical and centered at u=0.5 (the pilot's own contract, point 2) — unlike
// George's/Thesz's live art, no lateral distalAnchorFrac.u term is needed
// here; only v (how far down the canvas the true joint actually sits) does
// real work. jointPivotFrac = parts.<name>.proximal[1]; a parent's
// distalAnchorFrac = { u: 0.5, v: parts.<name>.distal[1] } — both straight
// from rig-profile-pilot.json (contract points 3-4).
//
// ONE EFFECTIVE SCALE (2026-07-25, Codex review correction — see
// AI_HANDOFF_ENTRIES/2026-07-25-codex-george-ai-pilot-review.md's "blocking
// visual issue"): the first pass normalized each limb independently to the
// shared bone-length constants (P.upperArmH=68, P.thighH=56, etc.), which
// applied a DIFFERENT source-pixel-to-world scale to every part (upper arm
// ~0.320, forearm ~0.503, thigh ~0.260, shin ~0.396) — that mismatch is why
// the hand/forearm and boot/shin visibly ballooned relative to the rest of
// the approved drawing. Corrected direction: derive ONE
// source-pixel-to-world scale from the approved master's own measured
// head-top-to-painted-sole height and George's existing 5'9" / ~247px
// target, then apply that same scale to every part's canvas. heightScale
// (0.798, reused from george.js — see below) is layered on top uniformly at
// draw time, so it does not need to be folded into this derivation twice.
//
//   headTopMaster  = head.masterCrop[1] (50) + head alphaBounds[1] (24) = 74
//                    (diagnostics/rig-validation.json — top-of-ink row of
//                    the head crop, master-canvas coordinates)
//   soleMaster     = master-joints.json's nearSole.y = 1319
//   masterHeight   = 1319 - 74 = 1245 source px (head-top to painted sole)
//   rawTarget      = 247 / heightScale (0.798) = 309.5238 (the raw,
//                    heightScale=1 assembled height that will re-solve to
//                    George's exact 247px/5'9" target once heightScale is
//                    applied — same target George's own raw-then-heightScale
//                    calibration uses, see george.js)
//   EFFECTIVE_SCALE = rawTarget / masterHeight = 309.5238 / 1245 = 0.248614
//                    (unscaled world px per source px — same units as
//                    P.torsoH etc., before the s/heightScale multipliers
//                    Wrestler.js applies at draw time)
//
// Every box below follows CLAUDE_INTEGRATION_HANDOFF.md's box-derivation
// formula with this ONE scale (not a per-part desired-bone-length divisor):
//   box.w = canvasW * EFFECTIVE_SCALE
//   box.h = (canvasH - proximalPxY) * EFFECTIVE_SCALE   (limbs — the
//           "below-pivot" span _placePart's jointPivotFrac growth expects)
//   box.h = canvasH * EFFECTIVE_SCALE                    (torso — no pivot
//           growth; jointPivotFrac is always 0 for the torso)
// canvasW/H and proximalPxY come straight from rig-profile-pilot.json's
// parts.<name>.canvas / proximalPx[1]. Rounded to the nearest px only here,
// for the in-engine comparison — the unrounded scale above is the source of
// truth if this needs re-deriving.
const EFFECTIVE_SCALE = 0.24861350162554982;

// Logical bone spans (2026-07-25, same Codex review point — "derive the
// pilot's logical bone spans from its measured anchors at that common
// scale," not the shared P.thighH/P.shinH constants every other character
// defaults to). thighH feeds the hip->knee IK leg; shinH feeds knee->ankle —
// both matter for foot-planting/gait, unlike the arms (no IK; the elbow's
// world position comes straight from the upper arm's box + distalAnchorFrac,
// so no separate bone-length override is needed there — see
// Skeleton.js's _trueDistalEnd, which ignores its `len` argument whenever a
// distalAnchorFrac is present).
//   thighH = thigh.bonePixelLength (215.00232557) * EFFECTIVE_SCALE = 53.45
//   shinH  = shin.bonePixelLength  (161.64467204) * EFFECTIVE_SCALE = 40.19
const PILOT_THIGH_H = 53.45;
const PILOT_SHIN_H  = 40.19;

export const georgeAiPilot = {
    id: 'george-ai-pilot',
    // Same fill colors as george.js — only used as the flat-fill fallback
    // for non-textured draws; every part here is textured, so these are
    // effectively unused, kept for parity/safety.
    skinCol:   0xc7a2ac,
    trunksCol: 0xd54283,
    textures: {
        // Reuses george.js's measured real-world heightScale (0.798) rather
        // than re-deriving one: this pilot represents the SAME character
        // (George, 5'9") in new art, not a new proportion pass, so the
        // comparison is apples-to-apples at the same real-world height. This
        // is also the target EFFECTIVE_SCALE above solves against, so
        // changing this value without re-deriving EFFECTIVE_SCALE would
        // break that calibration.
        heightScale: 0.798,
        head: 'george_ai_head',
        // The pilot's torso bakes the neck in like George's/Thesz's live art
        // (same _neckInTorso contract) — the head layer is neck-free.
        neckInTorso: true,
        // headAnchorFrac (2026-07-25, opt-in — see Skeleton.js's constructor
        // comment): this head is drawn at a 3/4 angle, so its painted neck
        // point isn't at the legacy bottom-center (0.5, 1) origin. Value is
        // rig-profile-pilot.json's parts.head.neck verbatim. Do not add
        // headOffsetX/Y to compensate — the anchor is the correction.
        // u mirrored (1 - u) 2026-07-25: the approved gameplay master was
        // drawn facing left, so every baked part was a mirror image of
        // Skeleton.js's required "PNGs baked facing right" contract -- see
        // AI_HANDOFF.md's 2026-07-25 "orientation fix" entry. Canvas/v
        // unchanged; flipping only reflects the horizontal axis.
        headAnchorFrac: { u: 0.5877862595419847, v: 0.84375 },
        // headScale intentionally left at the default (1) — no measured
        // real-world head-size pass exists yet for this art (unlike George's
        // live-tuned 0.745), and the head isn't part of the box/bone-length
        // unification above (head sizing is headR*headScale, a separate,
        // pre-existing mechanism untouched by this pass). The comparison
        // screenshots are what this pilot is for; if the head reads
        // mis-sized next to the now-uniform-scale body, that is Derek's call
        // during the visual review, not a guessed number here.
        torso: {
            key: 'george_ai_torso',
            // canvas 294x530 (rig-profile-pilot.json) at EFFECTIVE_SCALE:
            // w = 294*0.2486135 = 73.09 -> 73; h = 530*0.2486135 = 131.77 ->
            // 132 (no jointPivotFrac growth term — torso has none).
            box: { w: 73, h: 132 },
        },
        // rigProfile.sockets: full five-socket profile (neck + both
        // shoulders + both hips), straight from rig-profile-pilot.json's
        // parts.torso.sockets. nearHip/farHip presence is what opts this
        // character into Skeleton.js's dynamic-pelvis hip-socket mechanism
        // (see that file's _solveTorsoOrigin comment) — George's and
        // Thesz's own rigProfile.sockets deliberately has no hip entries yet
        // and is unaffected by this. The SAME opt-in (both hip sockets
        // present) is also what gates Skeleton.js's authored-leg-rig path —
        // see that file's _authoredLegRig comment — which neutralizes the
        // inherited FAR_THIGH_TILT/NEAR_SHIN_FWD/UP/SCALE cosmetic
        // corrections built for the old shared-bone-length rig, and roots
        // grounded/get-up shoulders from these same sockets instead of the
        // shared torso origin.
        // u mirrored (1 - u) 2026-07-25 for the same reason as headAnchorFrac
        // above -- the torso art was flipped to face right; near/far labels
        // are unchanged (mirroring doesn't change which physical side is
        // camera-near, only where it sits in the canvas).
        rigProfile: {
            sockets: {
                neck:         { u: 0.5748299319727891,  v: 0.09811320754716982 },
                nearShoulder: { u: 0.18367346938775508, v: 0.18679245283018867 },
                farShoulder:  { u: 0.8435374149659864,  v: 0.1830188679245283 },
                nearHip:      { u: 0.27551020408163274, v: 0.9113207547169812 },
                farHip:       { u: 0.8163265306122449,  v: 0.8867924528301887 },
            },
        },
        upperArm: {
            key: 'george_ai_upper_arm',
            // canvas 136x332, proximalPxY=67.1458234056098:
            // w = 136*0.2486135 = 33.81 -> 34
            // h = (332-67.1458234056098)*0.2486135 = 65.85 -> 66
            box: { w: 34, h: 66 },
            jointPivotFrac: 0.2022464560409934,
            distalAnchorFrac: { u: 0.5, v: 0.8429707749019165 },
        },
        forearm: {
            key: 'george_ai_forearm',
            // canvas 166x338, proximalPxY=64.06299162629668:
            // w = 166*0.2486135 = 41.27 -> 41
            // h = (338-64.06299162629668)*0.2486135 = 68.10 -> 68
            box: { w: 41, h: 68 },
            jointPivotFrac: 0.1895354781843097,
            // Terminal part (no child limb attaches to the forearm's own
            // distal end) — no distalAnchorFrac needed, same as George's/
            // Thesz's live forearm entries.
        },
        thigh: {
            key: 'george_ai_thigh',
            // canvas 230x338, proximalPxY=71.92971412163433:
            // w = 230*0.2486135 = 57.18 -> 57
            // h = (338-71.92971412163433)*0.2486135 = 66.15 -> 66
            box: { w: 57, h: 66 },
            jointPivotFrac: 0.2128098050935927,
            // Routed through Skeleton.js's _trueDistalEnd for the shin's
            // knee attachment in both upright and grounded/get-up modes
            // (2026-07-25 Codex review point) — this pilot's box-derivation
            // formula bakes below-hip overlap into box.h (66 vs. thighH's
            // 53.45), so the true knee point does not sit at the bone-length
            // endpoint the shared rig assumes.
            distalAnchorFrac: { u: 0.5, v: 0.848911360030924 },
        },
        shin: {
            key: 'george_ai_shin',
            // canvas 268x453, proximalPxY=70.5650980316983:
            // w = 268*0.2486135 = 66.63 -> 67
            // h = (453-70.5650980316983)*0.2486135 = 95.08 -> 95 (below-knee
            // span, INCLUDING the boot baked in all the way to the sole).
            box: { w: 67, h: 95 },
            jointPivotFrac: 0.15577284333708233,
            // soleAnchorFrac (2026-07-25, opt-in — Codex review "blocking
            // grounding issue"): this baked boot's painted sole, measured on
            // the same aligned shin canvas as proximal/distal above (derived
            // from master-joints.json's nearSole (600, 1319) carried through
            // the shin's own align_limb transform — see
            // tools/prepare_rig_assets.py). Not currently read by Skeleton.js
            // consumed directly by Skeleton.js's authored-sole IK/FK path
            // and independently checked against the mat by
            // tools/debug/sole_grounding_sweep.mjs.
            // u mirrored (1 - u) 2026-07-25, same orientation fix.
            soleAnchorFrac: { u: 0.6261981200708765, v: 0.9233791530916341 },
        },
        // Added 2026-07-25 alongside the orientation fix above: this shin's
        // sole anchor now points the opposite (correct) direction relative
        // to the knee, which shifted sole_grounding_sweep.mjs's idle worst
        // case from 2.00px to 2.04px (just over the <=2px gate) even though
        // this shares one "shin" asset for both legs (same knee-to-sole
        // magnitude, no ratio to fix — unlike george-ai-pilot-v2's separate
        // near/far shins). Re-measured empirically the same way as that
        // character's farShinScale (sweeping sk._farShinScale against both
        // facings' idle sole gaps): 1.04 is close to the minimax point,
        // worst idle gap 1.10px both facings.
        farShinScale: 1.04,
        // Per-character leg bone lengths (see PILOT_THIGH_H/PILOT_SHIN_H
        // derivation above) — this pilot's art has shorter legs relative to
        // its torso than the shared rig's stylized bones, same category of
        // correction as thesz.js's own thighH/shinH overrides.
        thighH: PILOT_THIGH_H,
        shinH:  PILOT_SHIN_H,
        // Expression head variants (2026-07-25, Derek's request): five
        // approved AI-generated expressions, normalized onto this exact
        // 262x320 canvas and headAnchorFrac by
        // tools/wrestler-cutter/normalize_pilot_expressions.mjs (source:
        // Sprite sheets/AI Pilot/George/expressions/transparent/, gitignored
        // -- raw sources are independent generations at a different canvas
        // with no measured neck anchor of their own). This is DATA ONLY --
        // Skeleton.js/Wrestler.js have no expression-switching mechanism yet
        // (see CLAUDE_INTEGRATION_HANDOFF.md: "Expression and hand/foot
        // swapping are not supported by the current Skeleton.js and are not
        // v1 requirements"), so none of these five are preloaded or given a
        // texture key -- only `idle` (== textures.head above) is currently
        // wired. Whoever adds that runtime state machine should preload each
        // file below under its own key the same way Arena.js's PART_FILES
        // loop loads `head`, then swap Skeleton's `this.head` texture on
        // expression change. All six share this exact canvas/anchor by
        // construction (the normalize script's placement check, not an
        // independent anatomical measurement -- see that script's header
        // for the bbox-relative-fraction method and its cross-check deltas,
        // 29-31px vs. idle's own 25.58px). Do not add per-expression
        // headOffsetX/Y or a different headAnchorFrac; if an expression
        // reads mis-seated in-engine, re-run the normalize script with a
        // corrected fraction rather than patching around it here.
        headExpressions: {
            idle:      'head.png',
            smug:      'head_smug.png',
            angry:     'head_angry.png',
            hurt:      'head_hurt.png',
            exhausted: 'head_exhausted.png',
            shocked:   'head_shocked.png',
        },
        // No legOffsetX/Y, nearLegTilt, farLegOffset*, HIP_STAGGER-adjacent
        // knobs, nor armOffsetX/Y/farArmOffset*/nearArmTilt — the pilot's own
        // contract explicitly forbids reintroducing per-part screen-space
        // compensation now that hips/shoulders/neck are all torso-socket
        // rooted and jointPivotFrac supplies each limb's own proximal
        // overlap. The FAR_THIGH_TILT/NEAR_SHIN_FWD/UP/SCALE cosmetic
        // corrections built for the old shared-bone-length rig are
        // neutralized automatically by supplying both hip sockets above
        // (Skeleton.js's _authoredLegRig) — no opposite-direction offset
        // knobs needed here either. If something still reads off during the
        // comparison gate, the fix is a socket/anchor re-measurement, not a
        // knob here.
    },
    idlePose:  'powerIdle',
    tauntPose: 'tauntArmsWide',
    // Same kit as george.js — this is an art swap, not a new character.
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick',
        'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
    ],
};
