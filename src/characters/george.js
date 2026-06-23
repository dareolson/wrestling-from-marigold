// Gorgeous George — character config.
// Drop PNG files into src/assets/wrestlers/george/ then uncomment the matching line.
// Far limbs mirror near limbs in code — you only draw one set.
export const george = {
    id:        'george',
    skinCol:   0xffe4c4,
    trunksCol: 0xffd700,
    textures: {
        // head:     'george_head',
        // torso:    'george_torso',
        // upperArm: 'george_upper_arm',
        // forearm:  'george_forearm',
        // thigh:    'george_thigh',
        // shin:     'george_shin',
    },
    idlePose:  'idle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick',
        'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
    ],
};
