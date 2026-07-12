// Lou Thesz — character config.
// Far limbs mirror near limbs in code — you only draw one set.
export const thesz = {
    id:        'thesz',
    skinCol:   0xe8c098,
    trunksCol: 0x484848,
    textures: {
        head:     'thesz_head',
        torso:    'thesz_torso',
        upperArm: 'thesz_upper_arm',
        forearm:  'thesz_forearm',
        thigh:    'thesz_thigh',
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX comment).
        // (37, 57) / 0.8747 thesz-shin-art fillFrac = (42, 65), then widened
        // 1.5x on width per the same limb-proportion bump as TEX (2026-07-12).
        shin:     { key: 'thesz_shin', box: { w: 63, h: 65 } },
    },
    idlePose:  'powerIdle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'suplex', 'pin', 'elbowDrop',
        'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag',
        'jab', 'theszPress',
    ],
};
