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
        contact:  Object.freeze({ anchor: Object.freeze({ dx: 0, dy: 0 }),     g: Object.freeze({ hip: 14, torso: 1.90, farThigh: -2.00, farShin: -2.25, nearThigh: -1.70, nearShin: -2.50, farArm: 0.10, farFore: 2.10, nearArm: 0.20, nearFore: 0.25 }) }),
        // plant (T4.7a): the roll-off's far hand lands on the MAT beside the receiver: dx along the facing from his chest (px at s = 1), gap = how far past his far edge (up the screen) the
        // wrist sits; the body slides so the wrist is on that point. The stills tool still places this pose by `anchor`.
        rolloff:  Object.freeze({ plant: Object.freeze({ dx: -20, gap: 14 }), anchor: Object.freeze({ dx: -45, dy: -60 }), g: Object.freeze({ hip: 22, torso: 1.95, farThigh: -1.45, farShin: -1.80, nearThigh: -0.60, nearShin: -1.90, farArm: 0.30, farFore: 1.90, nearArm: 0.10, nearFore: 0.15 }) }),
    }),
    // T4.7a: seconds. blend = the flight's last body into the approach pose; reach = approach -> contact (eased in: it arrives, it doesn't slow); hold = the contact beat (damage, sound and shake
    // fire at its start); release = contact -> roll-off, the hand planting; settle = roll-off -> the ordinary lying pose, drawn here too so the ordinary down draw takes over with no handoff; `layer` is the window the striking forearm draws over the receiver.
    timing: Object.freeze({ blend: 0.14, reach: 0.16, hold: 0.10, release: 0.34, settle: 0.30, layerFrom: 0.5, layerTail: 0.12 }),
});

const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => u * u * (3 - 2 * u);
const mixG = (a, b, u) => { const g = {}; for (const k of Object.keys(b)) if (k !== 't') g[k] = lerp(a[k] ?? b[k], b[k], u); return g; };
const mixAnchor = (a, b, u) => ({ dx: lerp(a.dx, b.dx, u), dy: lerp(a.dy, b.dy, u) });

export const groundAttackSeconds = (def) => { const t = def.timing; return t.blend + t.reach + t.hold + t.release + t.settle; };
export const groundAttackReleaseEnd = (def) => { const t = def.timing; return t.blend + t.reach + t.hold + t.release; };
export const groundAttackContactAt = (def) => def.timing.blend + def.timing.reach;

// The ground attack at time t: { seg, u, g, anchor, plant, layer }. `anchor` places the striking elbow on the receiver (blend, reach, hold, and the start of release);
// `plant` (0..1) is how far the body has moved from that placement to the roll-off's planted wrist; `layer` is the contact window.
export function sampleGroundAttack(def, t, rest) {
    const T = def.timing, P = def.phases, c = T.blend + T.reach, h = c + T.hold, end = h + T.release;
    const layer = t >= T.blend + T.reach * T.layerFrom && t < h + T.release * T.layerTail;
    if (t < T.blend) return { seg: 'blend', u: t / T.blend, g: P.approach.g, anchor: P.approach.anchor, plant: 0, layer };
    if (t < c) { const u = (t - T.blend) / T.reach, e = u * u; return { seg: 'reach', u, g: mixG(P.approach.g, P.contact.g, e), anchor: mixAnchor(P.approach.anchor, P.contact.anchor, e), plant: 0, layer }; }
    if (t < h) return { seg: 'hold', u: (t - c) / T.hold, g: P.contact.g, anchor: P.contact.anchor, plant: 0, layer };
    if (t >= end) return { seg: 'settle', u: Math.min(1, (t - end) / T.settle), g: mixG(P.rolloff.g, rest, smooth(Math.min(1, (t - end) / T.settle))), anchor: P.contact.anchor, plant: 1, layer: false };
    const u = Math.min(1, (t - h) / T.release), e = smooth(u);
    return { seg: 'release', u, g: mixG(P.contact.g, P.rolloff.g, e), anchor: P.contact.anchor, plant: e, layer };
}
