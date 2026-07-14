// Lou Thesz — character config.
// Far limbs mirror near limbs in code — you only draw one set.
export const thesz = {
    id:        'thesz',
    skinCol:   0xe8c098,
    trunksCol: 0x484848,
    textures: {
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
        headScale: 0.615,
        // Position pass (2026-07-12, same measured loop as the sizes): every
        // anchor below is (reference layer's joint landmark relative to the
        // torso ink centroid/top) minus (live pivot read off the running
        // rig), converted to unscaled px. Ref seats the head 35/380 of torso
        // height below the torso ink top and ~22px (ref canvas) forward of
        // the torso centroid; the rig's default anchors it exactly at torso
        // top, centered.
        headOffsetX: 3,
        headOffsetY: 10,
        torso:    'thesz_torso',
        // Ref shoulder (upper-arm layer top-rows center) sits 56.6/380 of
        // torso height BEHIND the torso centroid and 50/380 below its top;
        // the rig's default (torso x + 12·s shoulder drop, near arm staggered
        // back 12) rendered the near-arm pivot 9px too far forward and ~3px
        // too high.
        armOffsetX: -9,
        armOffsetY: 3,
        upperArm: 'thesz_upper_arm',
        // TEX default h 63 measured 3.1% long vs the reference (forearm ink
        // length / torso ink height: target 207.4/380 = 0.546, rendered
        // 0.5625) — 63/1.031 = 61. Width stays the TEX default (limb widths
        // are deliberately stylized wider, not tracked against the ref).
        forearm:  { key: 'thesz_forearm', box: { w: 44, h: 61 } },
        // Both dims re-derived against the reference (2026-07-13 recomposite
        // probe: live part transforms re-rendered filter-free and measured
        // ink-vs-ink against the identity-positioned New Lou layers —
        // scratchpad legref/probe.mjs). At 78×78 the thigh's rendered ink
        // matches the ref within 0.7px on every metric (centroid, top,
        // bottom, width) under the final -5.5° tilt below. Still ≥
        // thighH+HIP_OVERLAP (63+ margin), so the knee tuck keeps its
        // overlap. Width note: the ink bbox includes rotation inflation, so
        // box w is tuned at the shipped tilt, not in isolation.
        thigh:    { key: 'thesz_thigh', box: { w: 78, h: 78 } },
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
        legOffsetX: -16,
        legOffsetY: -15,
        // -5.5° (was -15° against the old splayed powerIdle stance): the ref
        // leg's ink leans +9.9° forward hip→knee; at the theszIdle bone angle
        // (0.06+crouch ≈ 5.9°) this render-only tilt measures 10.1° on the
        // live rig. Same clock convention/sign as george.js.
        nearLegTilt: -5.5 * Math.PI / 180,
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX comment).
        // 51×95 from the 2026-07-13 recomposite probe: ref shin ink (boot
        // included) spans 253/380 of torso height at 131/380 wide (the old
        // 54×92 measured 5% wide / 9% tall against that). Height is NOT the
        // ink-match value (85): the cutter flattens the shin PNG's top into
        // a straight opaque cap, and at the ink-matched position that flat
        // edge sat exposed across the middle of the knee — the leg read as
        // cleaved in half (Derek, 2026-07-13). The +12 y-shift below rides
        // the cap ~8px up under the thigh's opaque ink (like the raw layers'
        // own 29-ref-px overlap in LouTheszFullBodyRef.png) and h grows to
        // 95 so the sole stays on the ref's 404/380 hip→sole line (probe:
        // sole within 0.5px, visible knee seam gone).
        shin:     { key: 'thesz_shin', box: { w: 51, h: 95 } },
        // Knee alignment: the shin hangs off the IK knee (computed from the
        // un-offset hip bone), so the thigh's render offsets/tilt above pull
        // the thigh art away from where the shin art starts — these re-join
        // them. x puts the shin ink centroid on the ref's (probe Δ -0.4px);
        // y carries the cap-tuck described above.
        nearShinOffsetX: -25,
        nearShinOffsetY: 12,
        // Far leg mirrors the near leg exactly (2026-07-13, probe-measured
        // pass): the New Lou full-body reference draws ONE leg — at rest the
        // far leg must hide completely behind the near leg, so every far
        // render offset below equals the near leg's net value.
        // With theszIdle's equal leg angles the bones already coincide, so
        // equal render offsets make the two legs pixel-identical (probe
        // measured farPeek — far-leg px visible outside the near leg/torso —
        // at exactly 0). KEEP THESE IN LOCKSTEP: if a near value changes,
        // recompute its far twin.
        //   farShinOffsetX: near shin net x = NEAR_SHIN_FWD(5) + (-25) = -20
        //   farShinOffsetY: near shin net y = -NEAR_SHIN_UP(5) + 12  =   7
        //   farLegOffsetX:  near thigh net = -8 + legOffsetX(-16) = -24; far
        //                   base is -7, so -17 closes the gap
        //   farLegOffsetY:  near thigh net = legOffsetY + 5; far base is
        //                   legOffsetY, so +5
        //   farLegTilt:     same screen-absolute tilt as nearLegTilt
        farShinOffsetX: -20,
        farShinOffsetY: 7,
        farLegOffsetX: -17,
        farLegOffsetY: 5,
        farLegTilt: -5.5 * Math.PI / 180,
        // The shared NEAR_SHIN_SCALE 1.1 rendered the near shin ~24% wider
        // than the reference (the far shin, at 1.0, already matched) and any
        // near/far size difference makes hiding the far leg impossible.
        nearShinScale: 1.0,
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
