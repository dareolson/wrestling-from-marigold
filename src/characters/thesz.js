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
        // Width kept from the earlier eyeball pass (~12% + 10% over TEX,
        // Derek, 2026-07-12 — thesz's legs read a little small next to
        // george's). Height re-derived against the reference (2026-07-12
        // measured pass): thigh ink length / torso ink height target is
        // 275.8/380 = 0.726; the old 86 rendered 0.768 (5.8% long) — 81
        // measures 1.00. Still ≥ thighH+HIP_OVERLAP (70), so the knee tuck
        // keeps its overlap margin.
        thigh:    { key: 'thesz_thigh', box: { w: 101, h: 81 } },
        // Position pass (2026-07-12): ref thigh ink top sits 83/380 of torso
        // height above the torso ink bottom and 66/380 behind the torso
        // centroid. Derek's eyeballed -14 was close on y (measured residual
        // -2.3); the near thigh needed to come back 13 on x.
        legOffsetX: -13,
        legOffsetY: -16,
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX comment).
        // (37, 57) / 0.8747 thesz-shin-art fillFrac = (42, 65), then widened
        // 1.5x on width per the same limb-proportion bump as TEX (2026-07-12).
        // Height re-derived for shinH's 2x bump — (64+25)/0.8747=102 — plus
        // +12 for KNEE_OVERLAP (shins read squished/floating, then still too
        // small at 1.5x to line up with the thigh — Derek, 2026-07-12).
        shin:     { key: 'thesz_shin', box: { w: 63, h: 114 } },
    },
    idlePose:  'powerIdle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag',
        'jab', 'theszPress',
    ],
};
