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
        // head2 art is cropped along the jaw curve, not a clean neck line —
        // only the chin-tip pixel is flush with the anchor, so the head read
        // too high and too far back (Derek, 2026-07-12). Nudged down/forward
        // to seat the jaw/ear mass on the torso's neck stub — see Skeleton.js.
        headOffsetX: 10,
        // headOffsetY/armOffsetX/near+far shin+leg offsets below retuned
        // visually by Derek in tools/rig-tuner (2026-07-14).
        headOffsetY: 11,
        // 10% bigger than the Skeleton.js TEX default (82x112) — torso read
        // too small next to the arms/legs (Derek, 2026-07-12).
        torso:    { key: 'george_torso', box: { w: 90, h: 123 } },
        // Shoulders/upper arms sat too high and too far forward (Derek,
        // 2026-07-12) — same offset convention as headOffsetX/Y.
        armOffsetX: -2,
        armOffsetY: 8,
        upperArm: 'george_upper_arm',
        forearm:  'george_forearm',
        // Legs read almost right at the shared default but sat a touch high
        // (Derek, 2026-07-12) — small down nudge, see Skeleton.js's legOffsetY.
        legOffsetY: 6,
        // Front (near) upper leg needed a forward nudge (Derek, 2026-07-12).
        legOffsetX: 6,
        // ...and up a touch too, without moving the far leg.
        nearLegOffsetY: -6,
        // Rotated clockwise ~15deg ("5 o'clock to 5:30" — Derek, 2026-07-12).
        // Sign is a best guess pending visual check — flip if it reads
        // backward (setRotation(-angle) + setFlipX mean the on-screen
        // direction for a given sign depends on which way george is facing).
        nearLegTilt: -15 * Math.PI / 180,
        thigh:    'george_thigh',
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX comment).
        // (37, 57) / 0.841 george-shin-art fillFrac = (44, 68), then widened
        // 1.5x on width per the same limb-proportion bump as TEX (2026-07-12).
        // Height re-derived for shinH's 2x bump — (64+25)/0.841=106 — plus
        // +18 for KNEE_OVERLAP (tuned to reference for subtle clean connection, 2026-07-12).
        shin:     { key: 'george_shin', box: { w: 66, h: 124 } },
        // Nudged back and down to settle under the retilted thigh (Derek,
        // 2026-07-12; eased via rig-tuner 2026-07-14).
        nearShinOffsetX: -17,
        nearShinOffsetY: 7,
        // Far leg/shin nudges — new in the rig-tuner pass (2026-07-14);
        // george previously used the shared defaults (0).
        farLegOffsetX: 11,
        farLegOffsetY: -1,
        farShinOffsetX: 10,
        farShinOffsetY: 2,
        // Rotated from 6 o'clock to 7 o'clock (Derek, 2026-07-12) — same
        // clock convention as nearLegTilt.
        nearShinTilt: -30 * Math.PI / 180,
    },
    // Arena's PRESETS.george overrides this with 'powerIdle' at runtime; this
    // said 'idle' since 2026-07-12 (known inconsistency). Aligned so tools
    // reading the character file (rig-tuner) preview the real resting stance.
    idlePose:  'powerIdle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick',
        'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
    ],
};
