// Gorgeous George — character config.
// Drop PNG files into src/assets/wrestlers/george/ then uncomment the matching line.
// Far limbs mirror near limbs in code — you only draw one set.
export const george = {
    id:        'george',
    skinCol:   0xffe4c4,
    trunksCol: 0xffd700,
    textures: {
        head:     'george_head',
        // George's head read ~10% too big for his body (Derek, 2026-07-12).
        headScale: 0.9,
        // head2/torso2 art (2026-07-12): neck is baked into the torso, head
        // art is neck-free — see Skeleton.js's `_neckInTorso`.
        neckInTorso: true,
        torso:    'george_torso',
        upperArm: 'george_upper_arm',
        forearm:  'george_forearm',
        thigh:    'george_thigh',
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX comment).
        // (37, 57) / 0.841 george-shin-art fillFrac = (44, 68), then widened
        // 1.5x on width per the same limb-proportion bump as TEX (2026-07-12).
        shin:     { key: 'george_shin', box: { w: 66, h: 68 } },
    },
    idlePose:  'idle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick',
        'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
    ],
};
