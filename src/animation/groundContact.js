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
        contact:  Object.freeze({ anchor: Object.freeze({ dx: 0, dy: 0 }),     g: Object.freeze({ hip: 14, torso: 1.90, farThigh: -1.90, farShin: -2.00, nearThigh: -1.80, nearShin: -1.95, farArm: 0.10, farFore: 2.10, nearArm: 0.20, nearFore: 0.25 }) }),
        // plant (T4.7a): the roll-off's far hand lands on the MAT beside the receiver: dx along the facing from his chest (px at s = 1), gap = how far past his far edge (up the screen) the
        // wrist sits; the body slides so the wrist is on that point. The stills tool still places this pose by `anchor`.
        rolloff:  Object.freeze({ plant: Object.freeze({ dx: -20, gap: 14 }), anchor: Object.freeze({ dx: -45, dy: -60 }), g: Object.freeze({ hip: 22, torso: 1.95, farThigh: -1.85, farShin: -1.95, nearThigh: -1.75, nearShin: -1.90, farArm: 0.30, farFore: 1.90, nearArm: 0.10, nearFore: 0.15 }) }),
    }),
    // seconds. T4.7b: `fall` = the one continuous descent from the flight's apex into the elbow on the chest (gravity: the pose and height ease in as u^2 from the apex, so the speed rises right up to
    // contact; the hit lands on its last frame, in the air above the mat); hold = the contact beat with a brief compression (`press`); release = contact -> roll-off, the hand planting; settle =
    // roll-off -> the ordinary lying pose, drawn here too so the ordinary down draw takes over with no handoff; `layer` is the window the striking forearm draws over the receiver.
    // The flight clip that precedes it is cut at `flightAt` (the clip's own apex key, 0.24 s of its 0.38): flightAt + fall is the old flight length, so the hit lands where the old flight ended.
    flightAt: 0.24,
    timing: Object.freeze({ fall: 0.14, hold: 0.10, release: 0.34, settle: 0.30, layerFrom: 0.6, layerTail: 0.12, pressHip: 14, pressDy: 3, pressAt: 0.6, armLead: 0.45 }),   // T4.7c: pressHip = the squash at the hit (a decelerating yield over half the hold, then the recoil); armLead = the fraction of the fall by which the arms have reached their contact pose
});

export const ARM_CHANNELS = Object.freeze(['farArm', 'farFore', 'nearArm', 'nearFore']);
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => u * u * (3 - 2 * u);
const mixG = (a, b, u) => { const g = {}; for (const k of Object.keys(b)) if (k !== 't') g[k] = lerp(a[k] ?? b[k], b[k], u); return g; };
const mixAnchor = (a, b, u) => ({ dx: lerp(a.dx, b.dx, u), dy: lerp(a.dy, b.dy, u) });

export const groundAttackSeconds = (def) => { const t = def.timing; return t.fall + t.hold + t.release + t.settle; };
export const groundAttackReleaseEnd = (def) => { const t = def.timing; return t.fall + t.hold + t.release; };
export const groundAttackContactAt = (def) => def.timing.fall;

// The ground attack at time t: { seg, u, e, g, anchor, plant, layer }. `fall` (u: 0..1, e = u^2 the gravity ease the caller applies to the pose and height blend from the flight's last body, and the contact
// pose is g); `anchor` places the striking elbow on the receiver; `plant` (0..1) is how far the body has moved from that placement to the roll-off's planted wrist; `layer` is the contact window.
export function sampleGroundAttack(def, t, rest) {
    const T = def.timing, P = def.phases, c = T.fall, h = c + T.hold, end = h + T.release;
    const layer = t >= T.fall * T.layerFrom && t < h + T.release * T.layerTail;
    if (t < c) { const u = t / c; return { seg: 'fall', u, e: u * u, eArm: smooth(Math.min(1, u / T.armLead)), g: P.contact.g, anchor: P.contact.anchor, plant: 0, layer }; }
    if (t < h) {
        // compression: the body dips into him and comes back over the hold (a sine pulse), the elbow pressing a little deeper
        const u = (t - c) / T.hold, press = u < T.pressAt ? 1 - (1 - u / T.pressAt) ** 2 : 1 - smooth((u - T.pressAt) / (1 - T.pressAt));
        return { seg: 'hold', u, e: 1, g: { ...P.contact.g, hip: P.contact.g.hip - T.pressHip * press }, anchor: { dx: P.contact.anchor.dx, dy: P.contact.anchor.dy + T.pressDy * press }, plant: 0, layer };
    }
    if (t >= end) return { seg: 'settle', u: Math.min(1, (t - end) / T.settle), g: mixG(P.rolloff.g, rest, smooth(Math.min(1, (t - end) / T.settle))), anchor: P.contact.anchor, plant: 1, layer: false };
    const u = Math.min(1, (t - h) / T.release), e = smooth(u);
    return { seg: 'release', u, g: mixG(P.contact.g, P.rolloff.g, e), anchor: P.contact.anchor, plant: e, layer };
}

// PLAN_FALLS T4.8 (G4b): the top dive and the diving elbow on a man on the mat. Derek: he bounces off the chest and rolls away. The flight clip runs to the chest as before (contact, damage,
// shake and the receiver's sell are the flight callback's, unchanged); this is what comes after: `hold` on the chest in the flight's last body, then ONE bounce (`bounce` seconds, a gravity
// arc `lift` px at s = 1 high, lift * 4u(1 - u)) during which the body travels to the mat up the screen from him (`route`) and turns over. Three variants of the turn, all the same lifecycle
// (fall, hold, release, settle, so Wrestler._tickGroundAttack serves them all; fall 0 = contact on the first tick; `restSec` = the down time after the landing):
//   pivot  (r1) the flight's last body pivots up through a near-vertical, legs-tucked apex and falls into the SUPINE rest pose: in this rig supine is the prone pose turned the other way, so
//          the head ends on the OTHER side (Derek: not what he meant, kept for the top dive: a high-impact landing).
//   tumble (r2) a full turn in the air, rigid-rotating the tucked apex pose (every absolute angle + theta) through head-up, head-back, head-down, into the PRONE rest: the head ends on the
//          SAME side and he rises from his front.
//   roll   (r2) up to the apex and back down on the same side, landing SUPINE with the head on the same side. The rig's supine pose has the head on the far side, so the second half is
//          drawn with the facing mirrored and every angle negated (same joint positions, only the art mirrors, at the apex; T4.8a: the roll's apex has straight limbs so the negation reverses no bend); his facing is the mirror of the dive's from then on, and he
//          rises from his back.
// (A facing flip drawn at an arbitrary frame was tried first: mirroring a pose throws its wrists 70-240 px.)
const B = Object.freeze({ torso: 3.0, farThigh: 1.1, farShin: 0.2, nearThigh: 1.3, nearShin: 0.3, farArm: 0.5, farFore: 1.8, nearArm: 0.3, nearFore: 1.4 });   // the tucked top of the pivot: torso just short of vertical, thighs drawn up a little, shins hanging, arms out
const APEX = Object.freeze({ hip: 66, ...B });   // hip 66: with the halved lift (r3) the feet still clear the mat at the apex
const rotated = (th, hip) => Object.freeze({ hip, ...Object.fromEntries(Object.entries(B).map(([k, v]) => [k, v + th])) });
const SPLASH_BASE = { mode: 'splash', route: Object.freeze({ gap: 34, scale: 0.5 }), restSec: 0.5 };   // route.gap: px at s = 1 between the receiver's far edge (the top of everything he draws) and the landing root; scale: how much of that trip he makes (Derek r3: they oversold, half the distance up the screen)

export const SPLASH = Object.freeze({ ...SPLASH_BASE, variant: 'pivot', rest: 'supine', apex: APEX, keys: Object.freeze([Object.freeze({ u: 0.5, g: APEX })]), lift: 14,
    timing: Object.freeze({ fall: 0, hold: 0.06, release: 0.46, settle: 0.22, bounce: 0.46 }) });
// the tumble's keys: the pivot's apex, then the same body turned a quarter, a half and three quarters further (the hip raised through the inverted part so the head and shoulders clear the mat), then the prone rest a full turn on
export const SPLASH_TUMBLE = Object.freeze({ ...SPLASH_BASE, variant: 'tumble', rest: 'prone', restShift: 2 * Math.PI, apex: APEX, lift: 22,
    keys: Object.freeze([{ u: 0.22, g: rotated(0, 66) }, { u: 0.36, g: rotated(Math.PI / 2, 60) }, { u: 0.50, g: rotated(Math.PI, 76) }, { u: 0.64, g: rotated(Math.PI * 1.5, 82) }].map(Object.freeze)),
    timing: Object.freeze({ fall: 0, hold: 0.06, release: 0.66, settle: 0.22, bounce: 0.66 }) });
// T4.8a: the roll's own apex, limbs STRAIGHT (distal = proximal on every chain). Mirroring negates each angle, which reverses a bend (a knee thigh - shin >= 0 becomes <= 0: a backward knee), so the facing flips only on a pose with no bend to
// reverse; the knees and elbows bend after it, into the supine rest, the valid way for the new facing. Legs at 1.0/1.15 rad keep the feet clear of the mat at hip 66.
const ROLL_APEX = Object.freeze({ hip: 66, torso: 3.0, farThigh: 1.0, farShin: 1.0, nearThigh: 1.15, nearShin: 1.15, farArm: 0.5, farFore: 0.5, nearArm: 0.3, nearFore: 0.3 });
export const SPLASH_ROLL = Object.freeze({ ...SPLASH_BASE, variant: 'roll', rest: 'supine', mirrorAt: 0.5, apex: ROLL_APEX, keys: Object.freeze([Object.freeze({ u: 0.5, g: ROLL_APEX })]), lift: 14,
    timing: Object.freeze({ fall: 0, hold: 0.06, release: 0.46, settle: 0.22, bounce: 0.46 }) });
export const SPLASH_VARIANTS = Object.freeze({ pivot: SPLASH, tumble: SPLASH_TUMBLE, roll: SPLASH_ROLL });

const wrapTo = (a, ref) => a + 2 * Math.PI * Math.round((ref - a) / (2 * Math.PI));
// The same joint positions drawn with the facing mirrored: negate every angle. A chain stays whole: the proximal channel (torso, thigh, upper arm) wraps to `ref`, the distal one is placed from it by the
// same bend on the same branch (never wrapped on its own). Negating reverses a bend's sign, which the renderer's one-way knees and elbows can't draw, so a pose with a bend is an error, not a clamp.
const CHAINS = Object.freeze([['farThigh', 'farShin'], ['nearThigh', 'nearShin'], ['farArm', 'farFore'], ['nearArm', 'nearFore']]);
const MIRROR_BEND_TOL = 0.02;
const mirrored = (g, ref) => {
    const m = {};
    for (const [k, v] of Object.entries(g)) if (k === 'hip' || k === 't') m[k] = v; else m[k] = wrapTo(-v, ref[k] ?? -v);
    for (const [p, d] of CHAINS) {
        if (g[p] === undefined || g[d] === undefined) continue;
        const bend = g[p] - g[d];
        if (Math.abs(bend) > MIRROR_BEND_TOL) throw new Error(`mirrored: ${p}/${d} bend ${bend.toFixed(3)} would reverse; straighten the pose before the facing flips`);
        m[d] = m[p] + bend;
    }
    return m;
};
const shifted = (g, d) => { const m = {}; for (const [k, v] of Object.entries(g)) m[k] = k === 'hip' || k === 't' ? v : v + d; return m; };

// The splash at time t (since contact): { seg, u (0..1 over the bounce), lift (px at s = 1), travel (0..1 along the route), toApex (0..1 body blend flight -> first key; g absent until then), mirror (draw g with the facing mirrored), g }.
export function sampleSplash(def, t, rest) {
    const T = def.timing, b0 = T.fall + T.hold, B = T.bounce, keys = def.keys;
    if (t < b0) return { seg: 'hold', u: 0, lift: 0, travel: 0, toApex: 0, mirror: false };
    if (t >= b0 + B) return { seg: 'settle', u: 1, lift: 0, travel: 1, toApex: 1, mirror: !!def.mirrorAt, g: rest };
    const u = (t - b0) / B, travel = smooth(u), lift = def.lift * 4 * u * (1 - u);
    if (u < keys[0].u) return { seg: 'rise', u, lift, travel, toApex: smooth(u / keys[0].u), mirror: false };
    const mirror = def.mirrorAt != null && u >= def.mirrorAt;
    let i = keys.length - 1; while (i > 0 && keys[i].u > u) i--;
    const next = keys[i + 1], target = def.restShift ? shifted(rest, def.restShift) : rest;
    const from = mirror ? mirrored(keys[i].g, target) : keys[i].g;
    // between keys the turn runs at a steady rate; after the last key the body settles into the mat as u^2 (gravity)
    const g = next ? mixG(keys[i].g, next.g, (u - keys[i].u) / (next.u - keys[i].u)) : mixG(from, target, ((u - keys[i].u) / (1 - keys[i].u)) ** 2);
    return { seg: next ? 'turn' : 'fall', u, lift, travel, toApex: 1, mirror, g };
}
export const splashSeconds = (def) => groundAttackSeconds(def);
