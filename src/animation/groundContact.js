// PLAN_FALLS T4.6 (G4a r2): where a ground attacker's body goes when his elbow lands on a man on the mat. Pure data, in the grounded channels of
// Skeleton._applyGrounded (hip height in px at s = 1, absolute segment angles, facing right; the renderer mirrors). Not a physics model: three authored poses
// per move, each placed by ONE anchor, the striking elbow's joint point, relative to the target (the receiver's chest read off his drawn pose, falls_contact.mjs
// chestOf). The upper arm's length and the depth offset between the two bodies fall out of the pose's arm angle, so a rig with a longer arm keeps its elbow on the
// chest and its body at the same angle; nothing is shared as a fixed root offset.
//
// Angle sense (facing right): direction (sin a, cos a), screen y down: 0 points down the screen, +pi/2 points along the facing, pi points up.
//   dx is along the facing (px at s = 1), dy is screen y (+ = down the screen, nearer the camera).

export const ELBOW_DROP = Object.freeze({
    // the arm that strikes: the far arm reaches across him to the receiver (the receiver lies up the screen from the attacker's body)
    // the arm that strikes: the far arm, with the attacker lying on the far side of the receiver, his shoulder above the chest on the screen and the arm dropping down
    // onto it (the search, falls_g4a_r2_search.mjs: 285-480 px of overlap against 1000+ with him on the near side)
    side: 'far',
    phases: Object.freeze({
        approach: Object.freeze({ anchor: Object.freeze({ dx: -55, dy: -85 }), g: Object.freeze({ hip: 70, torso: 1.50, farThigh: -1.60, farShin: -1.95, nearThigh: -1.35, nearShin: -1.85, farArm: 2.70, farFore: 4.60, nearArm: 2.40, nearFore: 3.10 }) }),
        contact:  Object.freeze({ anchor: Object.freeze({ dx: 0, dy: 0 }),     g: Object.freeze({ hip: 14, torso: 1.50, farThigh: -1.60, farShin: -1.85, nearThigh: -1.30, nearShin: -2.10, farArm: 0.10, farFore: 2.10, nearArm: 0.20, nearFore: 0.25 }) }),
        rolloff:  Object.freeze({ anchor: Object.freeze({ dx: -45, dy: -60 }), g: Object.freeze({ hip: 22, torso: 1.95, farThigh: -1.45, farShin: -1.80, nearThigh: -0.60, nearShin: -1.90, farArm: 0.40, farFore: 0.45, nearArm: 0.10, nearFore: 0.15 }) }),
    }),
});
