// Gorgeous George — character config.
// Drop PNG files into src/assets/wrestlers/george/ then uncomment the matching line.
// Far limbs mirror near limbs in code — you only draw one set.
export const george = {
    id:        'george',
    skinCol:   0xffe4c4,
    trunksCol: 0xffd700,
    textures: {
        head:     'george_head',
        torso:    'george_torso',
        upperArm: 'george_upper_arm',
        forearm:  'george_forearm',
        thigh:    'george_thigh',
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX comment).
        // (37, 57) / 0.841 george-shin-art fillFrac.
        shin:     { key: 'george_shin', box: { w: 44, h: 68 } },
    },
    idlePose:  'idle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick',
        'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
    ],
};
