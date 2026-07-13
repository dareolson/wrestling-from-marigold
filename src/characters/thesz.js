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
        // Measured directly off LouTheszFullBodyRef.png (2026-07-12): head's
        // own max content width (122px) vs the isolated torso layer's max
        // content width (205px, same shared canvas so directly comparable) =
        // 0.595 ratio. Skeleton.js's fixed headR box vs thesz's TEX-default
        // torso box was rendering that ratio at ~0.88 (headR's box is sized
        // for a stylized/bigger head — george needed the same correction via
        // headScale 0.9) — 1.47x too wide, reading as a bobblehead. Solving
        // 0.88*headScale = 0.595 gives ~0.68.
        headScale: 0.68,
        torso:    'thesz_torso',
        upperArm: 'thesz_upper_arm',
        forearm:  'thesz_forearm',
        // ~12% bigger than the Skeleton.js TEX default (82x70), then another
        // 10% on top (Derek, 2026-07-12) — thesz's legs read a little small
        // next to george's.
        thigh:    { key: 'thesz_thigh', box: { w: 101, h: 86 } },
        // Nudged up toward the trunks a bit (Derek, 2026-07-12) — see
        // Skeleton.js's legOffsetY (+ = down, so negative here = up).
        legOffsetY: -14,
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
