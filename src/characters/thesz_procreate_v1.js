// Lou Thesz — Derek's PROCREATE MASTER, bound as a removable COMPARISON CANDIDATE.
//
// NOT production Lou. Separate id, separate asset folder, its own preset, so
// shipped `thesz` is untouched. The default card and default matchup are
// unchanged; this appears only for `?p1=thesz-procreate-v1` (or WFM_P1 through
// the debug harness). Deleting this file, its two registration lines in
// Arena.js and `src/assets/wrestlers/thesz-procreate-v1/` removes it entirely.
//
// WHAT THE ART IS. Derek's layered Procreate master, extracted 2026-10-07:
//   Sprite sheets/AI Pilot/Lou/procreate-masters/2026-10-06-imagegen-cohesive-v1/
//     lou-cohesive-v1-procreate-master.psd
//     sha256 41a6af6469e650ab4e55ab0fc8caf4cc7a998fa99fd3dd6929d1f129d8a8b3bb
// The PSD is unmodified. Layer inventory, alpha measurements and the full
// derivation are in that directory's LAYER_INVENTORY.md and extracted-v1/.
//
// The PSD delivers nine full-canvas-aligned art layers. Six map onto shipped
// Lou's EXACT six-part contract with no renderer change:
//
//   Head         -> head.png        (head carries its own full neck)
//   Torso        -> torso.png       (headless, trunks included)
//   R Upper Arm  -> upper_arm.png   shared by BOTH arms, as shipped Lou does
//   R Lower Arm  -> forearm.png     shared by BOTH forearms, fist baked in
//   R Upper Leg  -> thigh.png       shared by BOTH thighs
//   R Lower Leg  -> shin.png        shared by BOTH shins, boot baked in
//
// `L Arm` is a WHOLE limb (shoulder to fist) and is deliberately NOT wired: the
// rig articulates the elbow, and no offset bends one painting in the middle.
// `L Upper Leg` / `L Lower Leg` are the far-side paintings; the rig shares the
// thigh and shin families, so they stay donor material. All three are preserved
// in extracted-v1/layers-full-canvas/.
//
// TWO DERIVED CORRECTIONS, both deterministic and both recorded:
//   1. alpha floor 15 (removes the feathered aura the PSD README flags) and
//      largest-connected-component only (114px of 1-14px brush specks across
//      nine layers, which otherwise inflate every part's bbox and so corrupt
//      every fractional anchor derived from it).
//   2. each limb rotated about its own proximal joint onto a neutral bone axis.
//      As delivered the limbs carry a baked stance -- upper arm 21.2 deg, thigh
//      7.0, forearm 8.4, shin 4.3, against a 3 deg threshold. The rig rotates a
//      limb by the POSE angle alone, so a baked angle adds to every frame.
//      Residual after rotation is 0.00 deg on every bone except the forearm
//      (0.56, measured on fist ink, no declared wrist) and the shin, whose
//      knee->sole reads 7.38 because the boot toe juts forward of the ankle --
//      the documented booted-shin effect; its knee->ankle BONE is straight.
//
// Anchors are measured from Derek's art, never inherited. Elbow, knee, hip and
// neck are the centroid of the two parts' own overlap (those pairs touch only
// at that joint). The SHOULDER is not: a hanging arm overlaps the torso along
// most of its length, so that centroid is lateral adjacency, not a socket. It
// is taken as the proximal cap centre instead -- lateral centre of the top
// band, one cap-radius down.
//
//   //   forearm.png    d2735a0d9b990154e9f5704c67bc18ac787562df00a8c9da694f530e8d16f2f7
//   head.png       c6a660c26ec05d4173eb6c7b29f9768982adda8fee547a2b1c23437cf7a49836
//   shin.png       80b43d2357f1a649a099de522aa0cae20ec8820a3dec03c983b85d5fef1a7b55
//   thigh.png      500f5bd3a4fd992e1837d10670a8c90fd06ab5a9d4650334766932da16593ce6
//   torso.png      c3a18a883e90a35a8b1ba716ee7ea691c3ba938b25e609aed85ff96c003ccc7f
//   upper_arm.png  0a9efed7210bcb5aa819506e31a3177562a925387d30948296334d1e1009a3a9
//
// TUNED 2026-10-07 against live A/B screenshots, after a first pass read wrong
// on screen. Two errors, both in the derivation rather than the art:
//
//   box.w: shipped Lou's part canvases carry wide empty margins (ink fills
//   0.47-0.75 of canvas width); these crops are tight (0.93-0.96). box.w maps
//   the whole CANVAS to the rendered width, so an equally-wide box renders a
//   tight crop's ink much wider -- the upper arm came out 1.49x shipped Lou's
//   on-screen ink width and read as a mass that covered the head overhead, the
//   thigh 0.70x and too thin. box.w is now solved for the ON-SCREEN INK width
//   (box.w = target / (growth * inkFill)) against shipped Lou's own widths,
//   which are known good against this skeleton's fixed bone lengths.
//
//   headScale: now solved at the same uniform scale as every other part
//   (head ink * k / (headR*2 * inkFill)), so the head is the size Derek drew
//   relative to the rest of the figure. Earlier attempts:
//   head-ink/torso-height ratio. That double-counts -- the rig already sizes
//   the head from the torso -- and rendered the head ~1.3x too small, sunk into
//   the shoulders. Now solved on head ink FILL instead: 0.65 * 0.745/0.939.
//
// Boxes follow RIG_AND_MOVE_PIPELINE.md "Binding art to the rig":
//   box.h = L * (1 - jointPivotFrac) / (v_distal - jointPivotFrac)
//   box.w = box.h * (canvas w / canvas h)   -- preserves the art's own aspect
// with L the skeleton's own bone spans (P.upperArmH 68, forearmH 63, thighH 56,
// shinH 64 + bootH 25 for the knee->sole shin box).

import { thesz } from './thesz.js';

export const theszProcreateV1 = {
    id:        'thesz-procreate-v1',
    skinCol:   thesz.skinCol,
    trunksCol: thesz.trunksCol,
    textures: {
        // Joint attachment takes precedence over legacy idle-only calf/forearm
        // nudges below. Those values remain historical tuner data; locked
        // elbows/knees use the painted parent joint in every render pose.
        lockLimbJoints: true,
        // Carried over from shipped Lou UNCHANGED, exactly as thesz_front3q_r1
        // does and for the same reason: this candidate's parts assemble to a
        // different raw height, and re-solving heightScale here would hide the
        // proportion difference that is the point of the review. Measure the
        // rendered figure before reading anything into its height.
        // Per-character BONE LENGTHS. The first binding scaled every part
        // independently onto the skeleton's shared bone constants, which
        // compressed this thigh to 54% of its drawn length while the arms kept
        // their full 131 units -- Derek: "he looks like an orangutan". These are
        // measured from the art at ONE uniform scale (k = 0.29946 units per
        // canvas px, pinned to the upper arm, the one bone the rig does not let
        // a character override) so the whole figure keeps its drawn proportions.
        // _authoredLegRig is now false (no hip sockets), so NEAR_SHIN_SCALE
        // defaults to 1.1. Shipped Lou sets 1.0 because the 1.1 bump rendered
        // his near shin ~24% wider than the reference; same art lineage, same
        // correction.
        nearShinScale: 1.0,
        torsoH: 113.23,
        upperArmH: 50.51,
        forearmH: 60.16,
        thighH: 76.96,
        shinH: 41.81,
        // Matched to SHIPPED Lou's on-screen height (2026-10-08, Derek: "eight
        // feet tall"). The earlier 0.9075 came from summing part BOXES, which
        // counts transparent padding. Measured instead as painted INK (alpha
        // >= 128) projected through each visible part's world transform, both
        // Lous in their own idle at the same spot: 0.9075 rendered 231.7 vs
        // shipped 201.9 (1.148x); 0.9075/1.1478 = 0.7907 renders 201.9, 1.000.
        heightScale: 0.7907,
        head:     'thesz_pv1_head',
        // neckInTorso is REQUIRED here, and its name is misleading. It reads as
        // "the torso art bakes the neck in", which is false for this art -- the
        // HEAD carries the full neck and the torso has no stub. What the flag
        // actually DOES (Skeleton.js:1664-1668) is anchor the head at the
        // torso's declared neck socket, which combined with headAnchorFrac
        // seats this head's own neck base exactly there. That is what this art
        // needs.
        //
        // It is also not optional. With neckInTorso false, Skeleton takes the
        // branch at :1669 and computes anchorY from `this._headHidePx` -- a
        // field assigned ONLY when neither neckInTorso nor headAnchorFrac is
        // declared (:414-418). Declaring headAnchorFrac alone therefore leaves
        // it undefined and head.y resolves to NaN in every pose and both
        // facings. `rig:certify` caught exactly that: 820 runtime-transport
        // findings, nonfinite-transform at head.y and joints.neck throughout.
        // thesz_front3q_r1 avoids it only by declaring both flags too.
        //
        // Declaring headAnchorFrac also suppresses Skeleton's legacy
        // HEAD_HIDE_FRAC crop, which would otherwise cut 24% off the bottom of
        // this head and take the neck -- and the anchor -- with it.
        neckInTorso: true,
        headScale: 0.6445,
        headAnchorFrac: { u: 0.349983, v: 0.866348 },
        headOffsetX: 0,
        headOffsetY: 0,
        // NO added geometry. Two attempts to close the hip seam in the binding
        // were reverted: a torso-anchored pelvis mask (which stays put while the
        // leg swings), and black caps centred on each hip (which measured clean
        // -- nearHip interior_bg 325 -> 0 -- but read as a bulge on screen,
        // because the thing protruding below the trunks is Derek's own rounded
        // SKIN-coloured thigh cap, which no amount of black behind it hides).
        // The hip seam is an ART fix; see the correction list in the handoff.
        //
        // 2026-10-08, Derek: the far-leg black oval read as a bulge and is
        // GONE -- torso.png is Derek's PSD torso again, on the same 302x521
        // canvas (offset 6,5) so no anchor moved. One edit on top: the NEAR
        // leg opening (the scoop between the left trunk flap and the crotch)
        // is filled with trunk black on a straight hem from flap tip to
        // crotch, because the outer leg covers that area and the scoop showed
        // background whenever the leg swung forward.
        //
        // Calves stack UNDER the thighs, as Derek's layers do.
        shinUnderThigh: true,
        torso: {
            key: 'thesz_pv1_torso', box: { w: 67.181, h: 113.228 },
            // Left/back waist contour on this three-quarter source, above the
            // trunks. Candidate pain acting presses here instead of the hip joint.
            semanticAnchors: { backWaist: { u: 0.22, v: 0.60 } },
        },
        // The back sell's numbers for THIS rig (src/rig/backSell.js is the contract: the sell runs only
        // with this AND the backWaist above). settledArm is not stored: it is this rig's idle lArm
        // (POSES.theszProcreateIdle, .04). Values moved here unchanged from backRisePerformance.js /
        // sellAppearance.js (PLAN_GEORGE_TRANSFER T1.3); tests/backSellLouFixture.test.js pins them.
        backSell: {
            holdW: 0.80,          // grip <= 15 px from w .67, fist from w .70; trough = .80 - .08 = .72
            recoveryArm: -1.2,    // painted contact 2.33 px from backWaist, both facings, elbow flex 125.8 deg (limit 157.6)
            recoveryElbow: 1.5,
            settledElbow: 0.70,   // what tweenPose('idle') settles on (REST_POSE.lElbow)
            contactPx: 15,        // Lou's painted grip cup
            evidence: 'tools/debug/hold_weight_sweep.mjs (holdW, 81fe5bf 2026-10-24); tools/debug/recovery_probe.mjs (recoveryArm/Elbow, 2fa6c0b + a822721 2026-10-24); contactPx 15: PLAN_SUPLEX_RISE T4.0, measured to the painted grip cup',
        },
        // Inverted, painted crown below the hip pivot, in this rig's own units
        // (after heightScale; measured
        // 2026-10-15 at the piledriver impact, tilt PI): a clip's crown-on-mat
        // contact (floorContacts) reads it, since lift alone scales by hip
        // height and leaves a shorter trunk short of the mat.
        rigProfile: {
            crownBelowHip: 136.1,
            sockets: {
                neck:         { u: 0.526313, v: 0.057178 },
                // Derek rig-tuner export 2026-10-08: near shoulder u 0.165505 ->
                // 0.177, v 0.210173 -> 0.21; near hip u 0.455 -> 0.438.
                nearShoulder: { u: 0.177, v: 0.21 },
                farShoulder:  { u: 0.797568, v: 0.210173 },
                // Derek rig-tuner export 2026-10-07: both hips raised (near
                // v 0.885 -> 0.875, far v 0.891 -> 0.845) and the near hip moved
                // outboard (u 0.418 -> 0.455). Measured values from the art were
                // the starting point, not the destination -- the far hip in
                // particular sits well above where the overlap centroid put it.
                //
                // Hip sockets ON. Turning them OFF (to match shipped Lou) flips
                // `_authoredLegRig` false and applies FAR_THIGH_TILT / leg
                // stagger values calibrated for shipped Lou's geometry; against
                // this art the two legs collapse onto each other. With the
                // sockets the separation is the one Derek drew.
                nearHip:      { u: 0.438, v: 0.875 },
                farHip:       { u: 0.738, v: 0.845 },
            },
        },
        // Shin offsets: Derek rig-tuner export 2026-10-08 (knee gap while
        // walking). Every other candidate-only screen offset is still ZERO.
        nearShinOffsetX: 1,
        nearShinOffsetY: -5,
        farShinOffsetX: 1,
        farShinOffsetY: -3,
        armOffsetX: 0,
        armOffsetY: 0,
        upperArm: {
            key: 'thesz_pv1_upper_arm',
            box: { w: 25.979, h: 59.953 },
            jointPivotFrac: 0.183333,
            distalAnchorFrac: { u: 0.538338, v: 0.871414 },
            pivotOffsetFrac: 0.038338,
        },
        forearm: {
            key: 'thesz_pv1_forearm',
            box: { w: 23.003, h: 69.008 },
            jointPivotFrac: 0.116194,
            pivotOffsetFrac: -0.012388,
        },
        // 2026-10-11, Derek: audition the Oct 8 generated forearms in game
        // without a Procreate pass. Both are the donors scaled whole-canvas
        // onto forearm.png's exact 117x351 canvas (never tight-bbox), with
        // the donor's black outline arc across the elbow cap recoloured to
        // skin -- Derek's own forearm leaves that cap uninked under the upper
        // arm. Geometry is forearm.png's, unchanged.
        //   far_forearm.png   palm-donor-v3: palm-side fist for the far arm
        //   forearm_grip.png  grip-donor-v1: clutching hand for hammerlock
        // Source: Sprite sheets/AI Pilot/Lou/articulation-donors/
        // 2026-10-08-forearm-variants-v1/. Unapproved donors, not final art.
        farForearm: {
            key: 'thesz_pv1_far_forearm',
            box: { w: 23.003, h: 69.008 },
            jointPivotFrac: 0.116194,
            pivotOffsetFrac: -0.012388,
        },
        // The hand is painted into the forearm, so a clip's `workingHand`
        // request swaps the whole forearm (see resolveSemanticSlots).
        handInForearm: true,
        variants: {
            forearm: {
                grip: {
                    key: 'thesz_pv1_forearm_grip', file: 'forearm_grip.png',
                    // Inner cup contour measured on the 117x351 donor, separate
                    // from the baked hand's logical endpoint. Candidate reaches
                    // use this contact; ordinary clip posing remains unchanged.
                    semanticAnchors: { clutch: { u: 57 / 117, v: 279 / 351 } },
                },
            },
        },
        thigh: {
            key: 'thesz_pv1_thigh',
            box: { w: 34.86, h: 87.146 },
            jointPivotFrac: 0.06721,
            distalAnchorFrac: { u: 0.513568, v: 0.891024 },
            pivotOffsetFrac: 0.013568,
        },
        shin: {
            key: 'thesz_pv1_shin',
            box: { w: 43.716, h: 101.028 },
            jointPivotFrac: 0.090196,
            soleAnchorFrac: { u: 0.641101, v: 0.98573 },
            pivotOffsetFrac: -0.124635,
        },
    },
    // Shipped Lou's kit and poses, unchanged, so the review isolates art and
    // binding rather than gameplay.
    // Its own idle, not shipped Lou's -- see POSES.theszProcreateIdle. The kit
    // and taunt stay shared, so the review still isolates art and binding.
    idlePose:  'theszProcreateIdle',
    tauntPose: thesz.tauntPose,
    moveSet:   thesz.moveSet,
};

// Alias for `rig:certify`, which resolves a character as `module[characterId]`
// with characterId being the FILENAME (tools/rig/certify.mjs:191). Without it
// the certifier cannot render this candidate at all -- the same reason
// thesz_front3q_r1 was never certifiable. Diagnostic only: the candidate is
// deliberately NOT added to certify.mjs's default character list.
export const thesz_procreate_v1 = theszProcreateV1;
