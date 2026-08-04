// Lou Thesz — character config.
// Far limbs mirror near limbs in code — you only draw one set.
export const thesz = {
    id:        'thesz',
    skinCol:   0xe8c098,
    trunksCol: 0x484848,
    textures: {
        // Measured alongside george.js's own height fix (Derek, 2026-07-19:
        // real George 5'9" vs real Thesz 6'2", Thesz should have the height
        // advantage — both currently rendered ~7ft, no prior real-world
        // calibration existed for either). At s=1 (DRAWING_GUIDE's near-edge
        // calibration, 43px/ft), Thesz's assembled skeleton measured 302px
        // tall = 7.03ft. Real Thesz stood 6'2" (74in = 6.167ft = 265px at
        // s=1); heightScale = 265/302 = 0.877. Wrestler.js folds this into
        // draw()'s local `s` only — never the `s` getter (movement/reach/
        // hit-detection) — so this is a visual resize only, no gameplay
        // change. Result: Thesz now reads taller than George (265px vs
        // George's 247px target in george.js), matching their real heights.
        heightScale: 0.877,
        head:     'thesz_head',
        // Redrawn head/torso (2026-07-12, New Lou pass): the new head.png
        // carries almost no neck slack (unlike the old long-neck art the
        // HEAD_HIDE_FRAC crop was tuned for) and the new torso.png bakes its
        // own neck stub in instead — same split as george.js. Without this
        // flag, Skeleton.js's legacy crop chopped into the new head's actual
        // chin/jaw and stretched the remainder, reading cropped and oversized.
        neckInTorso: true,
        // Measured off LouTheszFullBodyRef.png vs the live engine (2026-07-12,
        // second pass — ink-content basis this time, i.e. each ratio corrected
        // for how much of its spec canvas the art actually fills: head ink is
        // 172/200 of its canvas width, torso ink 141/190). Reference target:
        // head max ink width / torso ink height = 122/380 = 0.321. The first
        // pass (0.68, derived from box widths without the fill correction)
        // still rendered 0.355 — 10.6% wide. 0.68/1.106 = 0.615 measures 1.000
        // on the live rig. Note the head still renders ~25% taller than the
        // reference's ink aspect — Skeleton.js's fixed 2.0:2.5 head box
        // stretches the square head canvas non-uniformly and headScale is
        // uniform, so width is the ratio matched here; the aspect needs a
        // Skeleton-level knob if it bothers in motion.
        // headScale 0.65 (final-correction, 2026-07-28) — a SINGLE mirrored
        // value used in both facings, replacing the split 0.63(R)/0.67(L) that
        // rendered an inconsistent apparent head size. The head + neck socket
        // now seat cleanly in both facings from one config (rendered check:
        // evidence/final-correction/head_*.png, both facings), so the prior
        // facing-left headScale/neck override is removed. 0.65 is between the
        // two old values and reads proportional to Lou's frame.
        headScale: 0.65,
        // Position pass (2026-07-12, same measured loop as the sizes): every
        // anchor below is (reference layer's joint landmark relative to the
        // torso ink centroid/top) minus (live pivot read off the running
        // rig), converted to unscaled px. Ref seats the head 35/380 of torso
        // height below the torso ink top and ~22px (ref canvas) forward of
        // the torso centroid; the rig's default anchors it exactly at torso
        // top, centered.
        // headOffsetX/Y are INERT for thesz: the neck-socket branch in
        // Skeleton.js (_neckInTorso && _torsoSockets.neck) resolves the head
        // anchor from the torso socket below and never reads these. Restored to
        // their long-standing 4/9 (an earlier pass bumped them to 10/12, which
        // changed nothing on screen). Head seating is tuned via headScale +
        // the neck socket, not here.
        headOffsetX: 4,
        headOffsetY: 9,
        torso:    'thesz_torso',
        // rigProfile.sockets (2026-07-25, cohesive-body-rig-binding Phase C
        // — see Skeleton.js's _torsoSockets/_socketPoint comments,
        // COHESIVE_BODY_RIG_BLUEPRINT.md, and george.js's matching entry).
        // Derived algebraically from the armOffsetX/Y/headOffsetX/Y +
        // SHOULDER_STAGGER chain below against the default TEX.torso box
        // (82x112, since this torso entry has no box override) — byte-
        // identical rendered output, not a new correction.
        rigProfile: {
            sockets: {
                // neck socket retuned (final-correction, 2026-07-28) to seat
                // the head in BOTH facings from one config: u 0.54878->0.530
                // (closer to center so the mirror lands symmetrically), v
                // 0.080357->0.095 (slightly lower into the collar, kills the
                // small high-collar gap). Verified filter-free both facings.
                // v 0.135 LOCKED (2026-07-31): Derek confirmed the head seats
                // right here. A brief experiment lowering it (v 0.175) buried
                // the jaw and was reverted. The neck was shortened instead by
                // cutting half the torso's neck nub in the art (see
                // tools/debug/lou_seam_cleanup.py's cut_neck_nub).
                neck:         { u: 0.577,     v: 0.135 },
                nearShoulder: { u: 0.243902, v: 0.169643 },
                farShoulder:  { u: 0.536585, v: 0.169643 },
            },
        },
        // Ref shoulder (upper-arm layer top-rows center) sits 56.6/380 of
        // torso height BEHIND the torso centroid and 50/380 below its top;
        // the rig's default (torso x + 12·s shoulder drop, near arm staggered
        // back 12) rendered the near-arm pivot 9px too far forward and ~3px
        // too high. armOffsetY 3→7: same-day rig-tuner refinement
        // (2026-07-15), tuned together with the leg/shin knobs below.
        armOffsetX: -9,
        armOffsetY: 7,
        // distalAnchorFrac (2026-07-25, cohesive-body-rig-binding, extending
        // George's elbow fix to Thesz per the blueprint's phase order —
        // see COHESIVE_BODY_RIG_BLUEPRINT.md and george.js's own comment on
        // this field for the mechanism).
        // v2-layer-standardization re-cut (session 27d5b447): the u=0.5846
        // above was measured off the OLD upper-arm art, whose painted elbow
        // sat right-of-center. The approved v2 upper-arm paints the elbow
        // nearly laterally centered — elbow_anchor_sweep.mjs's own INDEPENDENT
        // bottom-row centroid heuristic (the anatomical proxy, not the
        // tautological authored check) measures u=0.4923 on the new PNG, and a
        // direct PIL bottom-rows read agrees (0.489-0.496). The old 0.5846
        // over-corrected the forearm attach by ~0.092*56*s px (~5px). Updated
        // to the measured painted elbow; v=0.9969 (bottom edge) unchanged.
        upperArm: { key: 'thesz_upper_arm', distalAnchorFrac: { u: 0.4923, v: 0.9969 } },
        // TEX default h 63 measured 3.1% long vs the reference (forearm ink
        // length / torso ink height: target 207.4/380 = 0.546, rendered
        // 0.5625) — 63/1.031 = 61. Width stays the TEX default (limb widths
        // are deliberately stylized wider, not tracked against the ref).
        // Authored elbow overlap retained by the cutter (2026-07-25).
        // Internal pivot keeps the forearm on the true elbow through bends;
        // no screen-space seating offset is needed.
        // h 61->49 (Derek rig-tuner, 2026-07-25): the forearm rested ~12px too
        // low at idle. Derek first corrected this with a -12 screen-space
        // forearmOffsetY, but a fixed Y offset does not rotate with the elbow
        // and visibly detached the forearm at overhead extremes (taunt,
        // axe-handle). Shortening the below-pivot reach instead raises the
        // idle hand the same ~12px as a real, rotating change, so the elbow
        // stays seated in every pose. Width stays 44 to keep the wrist/elbow
        // widths matched to the upper arm (a proportional shrink would neck
        // the joint in). box.h is the elbow->hand span; see Skeleton.js
        // _placePart's jointPivotFrac growth note.
        // jointPivotFrac re-measured 0.09615 -> 0.07246 for the v2-layer-
        // standardization re-cut (session 27d5b447): the approved v2 forearm
        // (PCA-straightened from its +42deg authored bake, overlap retained)
        // seats its true elbow row at 0.0725 of the canvas, per the cutter's
        // own report.json. box.h (elbow->hand span, 49) and box.w (44)
        // unchanged — the conformed art's fillFrac is 1.0 like the shipped
        // forearm, and the ~7% width delta is left for the visual pass.
        // box.w 44 -> 31 (Derek, 2026-07-30/31): forearms read too wide; Derek
        // narrowed them in the live tuner in two steps (44 -> 39.6 -> 31).
        // Supersedes the old "keep 44 to match the upper arm" note above —
        // Derek's explicit call. box.h/jointPivotFrac unchanged; origin is
        // x-centered so the shrink is symmetric about the forearm axis.
        forearm:  { key: 'thesz_forearm', box: { w: 31, h: 49 }, jointPivotFrac: 0.07246376811594202 },
        // Forearm screen-space offsets — LOCKED to Derek's 2026-07-31 tuner
        // export (near X -2 / Y -10, far X 0 / Y -7). These are FIXED offsets
        // (they do NOT rotate with the elbow), tuned so the idle hand seats
        // where Derek wants it. KNOWN TRADEOFF, accepted by Derek: because a
        // fixed Y offset can't follow the elbow through rotation, the near/far
        // elbow separates ~3-5px at the extreme overhead poses (axeHandleUp,
        // tauntArmsWide, hammerlockCrank) — joint_attachment_audit reports those
        // as fails. Every non-overhead pose (idle/block/powerIdle/armBar/get-up)
        // and both facings stay attached. If a future pass wants BOTH the idle
        // look AND overhead attachment, drop these fixed offsets and raise the
        // idle hand via the ROTATING levers instead (shorten forearm.box.h
        // and/or the pose.lForearm bend) — never re-introduce a fixed Y offset
        // expecting overhead to hold. upperArm.distalAnchorFrac (0.4923) +
        // forearm.jointPivotFrac (0.07246) are the rotating geometry underneath.
        nearForearmOffsetX: -2,
        nearForearmOffsetY: -10,
        farForearmOffsetX: 0,
        farForearmOffsetY: -7,
        // Both dims re-derived against the reference (2026-07-13 recomposite
        // probe: live part transforms re-rendered filter-free and measured
        // ink-vs-ink against the identity-positioned New Lou layers —
        // scratchpad legref/probe.mjs). At 78×78 the thigh's rendered ink
        // matches the ref within 0.7px on every metric (centroid, top,
        // bottom, width) under the final -5.5° tilt below. Still ≥
        // thighH+HIP_OVERLAP (63+ margin), so the knee tuck keeps its
        // overlap. Width note: the ink bbox includes rotation inflation, so
        // box w is tuned at the shipped tilt, not in isolation.
        // h 78→85: Derek's rig-tuner pass (2026-07-14) on top of the probe-
        // measured 78×78 baseline.
        // pivotOffsetFrac APPLIED (final-correction, 2026-07-28). The approved
        // v2 thigh paints its proximal hip off-center at u=0.4233 (the boot-
        // forward art pushes the shaft toward the canvas's rear edge), so the
        // rig's box-rotation would orbit the hip. pivotOffsetFrac -0.0767
        // (= paintedU 0.4233 - 0.5) shifts the render so the painted hip sits
        // on the true hip joint and the thigh rotates about it. This is the
        // load-bearing half of the measured leg conformation.
        // distalAnchorFrac is deliberately NOT set. report.json measured the
        // thigh "distal" at { u: 0.5444, v: 1.0 } — but v=1.0 is the canvas
        // BOTTOM edge, i.e. the hidden overlap tail past the knee, NOT the
        // anatomical knee. Routing the shin there (via _trueDistalEnd)
        // over-extends the near shin and detaches the near knee at leg extremes:
        // knee_ink_gap_sweep goes from 0.00px to Infinity (no-ink) at ±1.5rad, a
        // hard-constraint violation. With pivotOffsetFrac alone the shin already
        // attaches at the bone knee and its own painted knee lands ~1.0px from it
        // (knee_pivot_audit trueKnee-vs-artShin) — so the distal routing is
        // unnecessary as well as harmful.
        // box.h 85 -> 71.4 (2026-07-29 rebuild, task 1 — see
        // tools/debug/lou_thigh_knee_crop.py + tests/theszThighKnee.test.js).
        // The standardized thigh canvas (150x150 -> box.h 85) paints a long,
        // narrowing "hooked" skin tail past the true knee. The thigh's canvas
        // row 0 renders at the hip pulled UP the bone by HIP_OVERLAP(14), so the
        // true knee sits at display HIP_OVERLAP+thighH = 63 from row 0 (canvas
        // row ~111), and the untrimmed box put ~22 display-units of tail past it.
        // During the walk that tail escaped the shin and read as a pink flap.
        // The crop is a deterministic distal trim of the SAME 150x150 repo source
        // to 150x126 (box.h = 126*85/150 = 71.4): rows 0..115 are byte-identical
        // (the rounded hip AND the entire kneecap — knee ink widths 44-45px are
        // fully preserved), and ONLY rows 116..125 (distal to the knee, capTop
        // 116 > knee row 111) are rounded into a knee-shaped cap (NOT a flat
        // cutoff). This restores full kneecap volume (the earlier over-trim
        // rounded from row 106, ABOVE the knee, pinching it to an hourglass),
        // leaves ~8 display-units of hidden overlap (George-comparable), and keeps
        // box.h at the shipped display geometry so the hip row/center and
        // pivotOffsetFrac are untouched. Result: gait/idle/get-up protrusion ~0px,
        // knee_ink_gap still 0.00. Residual: at leg angles the game never reaches
        // (|lLeg| past ~1.0 backward) a few px of the thigh's knee region show
        // because thesz's PAINTED knee sits ~12px below the bone knee (structural,
        // not tail). See runtime-conformed/REPORT.md's task-1 section.
        thigh:    { key: 'thesz_thigh', box: { w: 78, h: 71.4 }, pivotOffsetFrac: -0.0767 },
        // Per-character leg bones (2026-07-12, Derek approved the Skeleton.js
        // knob): the shared rig legs (56/64) stand ~18% longer relative to
        // the torso than the reference drawing. Ref targets, torso-ink-
        // normalized: hip->sole 404/380, knee->sole 237.5/380. Solving the
        // rig's standing geometry (ankleRest bootH*0.9, LMAX knee-soft
        // factor) gives 49/50.
        thighH: 49,
        shinH:  50,
        // Thigh anchor, converged by the 2026-07-13 recomposite probe: ref
        // thigh ink centroid sits 26/380 of torso height behind the torso
        // ink centroid and 236/380 below it; these values measure within
        // 0.7px of that with the theszIdle pose (lLeg/rLeg 0.06).
        // legOffsetX/nearLegOffsetY and the shin/far offsets below: retuned as
        // one system (final-correction, 2026-07-28) around the now-correct
        // rotating pivots (thigh + shin pivotOffsetFrac). The old large lateral
        // offsets (legOffsetX -15, nearShinOffsetX -22) were tuned against the
        // OFF-CENTER painted art to fake a centered pivot; with pivotOffsetFrac
        // doing that properly the intent was to collapse them toward 0.
        // legOffsetX -6 seats the near leg under the body (pivotOffsetFrac
        // already seats the hip). CORRECTION (2026-07-29): the near/far SHIN
        // offsets below are NOT zero — they carry the 2026-07-29 tuner values
        // (near -15/1, far 5/-11) and are retained only because the knee gate
        // stays clean (knee_ink_gap_sweep 0.00px; see each shin-offset comment
        // below). A prior version of this comment wrongly said they were 0.
        // legOffsetY -15
        // (whole-body leg seating) and nearLegOffsetY 4 (near-leg vertical
        // depth) keep the near foot planted on the mat. Verified in both facings
        // from this single config (no faceLeftOverrides — see the note below).
        // LEG/SHIN offsets LOCKED to Derek's 2026-07-31 tuner export: legOffsetX
        // -7, nearLegOffsetY 4, nearShin -17/4, farLeg 13/4, farShin 11/-14. The
        // long per-field notes below predate this tuning and describe earlier
        // values — the numbers on the lines themselves are authoritative. The
        // knee gate stays clean at these values (knee_ink_gap_sweep 0.00px, 42
        // samples, both facings; joint_attachment_audit 0 knee fails).
        legOffsetX: -7,
        legOffsetY: -15,
        nearLegOffsetY: 4,
        // -5.5° (was -15° against the old splayed powerIdle stance): the ref
        // leg's ink leans +9.9° forward hip→knee; at the theszIdle bone angle
        // (0.06+crouch ≈ 5.9°) this render-only tilt measures 10.1° on the
        // live rig. Same clock convention/sign as george.js.
        nearLegTilt: -5.5 * Math.PI / 180,
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX comment).
        // 51×95 from the 2026-07-13 recomposite probe: ref shin ink (boot
        // included) spans 253/380 of torso height at 131/380 wide. The
        // authored overlap above the knee is now preserved instead of being
        // flattened into the exposed cap that previously read as a cleave.
        // Authored knee overlap retained by the cutter (2026-07-25), same
        // contract as George. The display height remains the approved 95;
        // jointPivotFrac grows only the above-knee overlap band.
        // v2-layer-standardization re-cut (session 27d5b447): the approved v2
        // shin conforms with fillFrac 1.0 (boot sole now reaches the canvas
        // bottom edge; the shipped shin fell short at ~0.909), so the display
        // box that maps knee->sole changes. jointPivotFrac re-measured
        // 0.03945 -> 0.05495 (cutter report.json). box.h 95 -> 86 preserves
        // the shipped on-screen knee->sole span (shipped 95 * 0.905 fill-short
        // factor ~= 86, now that the sole reaches the canvas edge); box.w
        // 51 -> 47 preserves the on-screen shin width at the new fill. Screen-
        // space offsets below are revisited in the visual pass.
        // shin pivotOffsetFrac APPLIED (final-correction, 2026-07-28). The v2
        // shin paints its knee at u=0.3833 — the tall laced boot's toe/sole
        // juts forward (u=0.6544 at the base), which pushes the knee/shaft to
        // the rear (left) of the canvas. pivotOffsetFrac -0.1167 (= 0.3833-0.5)
        // shifts the render so the painted knee sits on the true knee and the
        // shin rotates about it (knee_pivot_audit trueKnee-vs-artShin drops to
        // ~1px near / ~4.5px far, from ~10px; the shin no longer orbits the
        // knee). box/jointPivotFrac are the v2 re-cut (unchanged this pass).
        // soleAnchorFrac { u: 0.6544, v: 1.0 } records the measured painted
        // sole. NOTE: the runtime only consumes soleAnchorFrac when a character
        // declares hip sockets (Skeleton.js _authoredLegRig => authoredSoles,
        // the George dynamic-pelvis path); thesz uses the legacy leg path, so
        // this field is currently inert — kept for the future dynamic-pelvis
        // migration. Grounding on the legacy path is verified separately (see
        // sole_grounding note in REPORT.md).
        shin:     { key: 'thesz_shin', box: { w: 47, h: 86 }, jointPivotFrac: 0.05494505494505494, pivotOffsetFrac: -0.1167, soleAnchorFrac: { u: 0.6544, v: 1.0 } },
        // Near shin offsets (ACTUAL shipping values, comment corrected
        // 2026-07-29): nearShinOffsetX -15, nearShinOffsetY 1 — the 2026-07-29
        // rig-tuner export's values, NOT zero (a prior comment here wrongly
        // claimed "held at 0"). These are retained because they PASS the hard
        // motion gate: knee_ink_gap_sweep is 0.00px across all 42 near/far
        // angle samples (|angle| out to 1.5rad, both facings) and
        // joint_attachment_audit reports 0 knee failures — i.e. with the shin
        // pivotOffsetFrac riding the true knee, this X/Y nudge does not detach
        // or orbit the knee within the game's actual range. If a future pass
        // wants them at 0, re-verify knee_ink_gap_sweep before trusting idle.
        nearShinOffsetX: -17,
        nearShinOffsetY: 4,
        // Far leg NO LONGER mirrors the near leg. The 2026-07-13 pass kept
        // every far offset in lockstep with the near leg's net value so the
        // far leg hid pixel-identically behind the near one (single-leg
        // New Lou ref). Derek's rig-tuner pass (2026-07-14) deliberately
        // broke that: the far leg now renders forward of the near leg (both
        // legs visible). If a future pass wants the hidden-leg look back,
        // see git history for the lockstep derivation.
        // Far shin offsets (ACTUAL shipping values, comment corrected
        // 2026-07-29): farShinOffsetX 5, farShinOffsetY -11 — the 2026-07-29
        // rig-tuner export's values, NOT zero (a prior comment wrongly claimed
        // "held at 0"). Like the near shin they are retained because the far
        // knee still passes: knee_ink_gap_sweep 0.00px far across the dense
        // sweep and joint_attachment_audit 0 far-knee failures. The both-legs-
        // visible depth stagger is a separate WHOLE-LEG root move via
        // farLegOffsetX 8 / farLegOffsetY 2 (below), which moves the far knee
        // with its thigh so the shin stays attached.
        farShinOffsetX: 11,
        farShinOffsetY: -14,
        farLegOffsetX: 13,
        farLegOffsetY: 4,
        farLegTilt: -5.5 * Math.PI / 180,
        // The shared NEAR_SHIN_SCALE 1.1 rendered the near shin ~24% wider
        // than the reference (the far shin, at 1.0, already matched) and any
        // near/far size difference makes hiding the far leg impossible.
        nearShinScale: 1.0,
        // No faceLeftOverrides (final-correction, 2026-07-28). The prior pass
        // needed a facing-left patch (headScale 0.67, neck u 0.589, plus
        // near-leg Y nudges) because the head config and the OLD off-center leg
        // offsets didn't mirror cleanly. With the head on one mirrored config
        // and the legs on true rotating pivots (thigh/shin pivotOffsetFrac,
        // shin Y offsets zeroed), both facings render symmetrically from the
        // single config above — verified: joint_attachment_audit 0 fails and
        // knee_ink_gap_sweep 0.00px at facing -1, and filter-free facing-left
        // renders (evidence/final-correction) show head + both legs seated.
        // The torso socket is symmetric, so no facing-left override is needed.
    },
    // Legs-together stance (equal lLeg/rLeg) — powerIdle's splayed legs
    // rendered a two-leg spread the single-leg reference doesn't have.
    idlePose:  'theszIdle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag',
        'jab', 'theszPress',
    ],
};
