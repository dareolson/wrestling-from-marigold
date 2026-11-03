// The go-behind waistlock (PLAN_GRAPPLES Stage 4b, W1-W8). Pure data and math, behind `?waistlock=v1`: nothing here touches POSES or a
// Wrestler, so flag off is untouched. Arena._tickWaistlock asks waistlockPhase() what the pair does this frame; waistlockGrips() says where
// each hand goes (Wrestler.holdGrips does the IK). All times in seconds, all lengths in px at s = 1 (the caller multiplies by `s`).
// Offsets are in the DEFENDER's frame: `fwd` is along his facing (positive = in front of him, where the attacker stood in the tie-up),
// `dy` is the world y (negative = upstage, away from the camera).
import { LOCKUP, legChannels } from './lockup.js';

export const WAISTLOCK = Object.freeze({
    goBehind: 0.60,                     // s the circle takes
    timeout: 1.6,                       // W6: the hold lets go on its own this long after the go-behind ends
    holdBehind: 82,                     // px between the attacker and the defender while held, the attacker behind (W3)
    upstage: 12,                        // the attacker stands this far upstage of the defender, so he draws behind (W3)
    lane: 40,                           // the circle's depth lane: the most it bulges toward (near) or away from (far) the camera
    gripRamp: 0.16,                     // s before the circle ends that the hands start to close; they are full when it ends
    waistRise: 36, waistFront: 12,       // the defender's waist point: above the hip joints, and how far in front of his hips the near hand lands
    strainHz: 7, strainLean: 0.02,      // the defender's struggle
    turnBeat: 0.30,                     // after the let-go the defender keeps his facing this long while his pose comes home, then turns
    release: Object.freeze({ dur: 0.35 }),   // let go and push: LOCKUP.breakGrip + LOCKUP.breakStep
});

export const WAISTLOCK_ARMS = Object.freeze({ attacker: Object.freeze({ arm: 0.7, elbow: 0.5 }), defender: Object.freeze({ arm: 0.15, elbow: 0.6 }) });

// Pose keys for the A-frame hold (W3): the attacker bent at the waist with his hips back, the defender nearly upright. Same channels and leg
// convention as LOCKUP_POSES (`lead` = near-side leg, `rear` = far-side leg, each shin absolute); values to be solved on both rigs.
export const WAISTLOCK_POSES = Object.freeze({
    attacker: Object.freeze({ bend: 0.75, crouch: 0.30, lead: -0.25, leadShin: -0.10, rear: 0.05, rearShin: -0.40 }),
    defender: Object.freeze({ bend: 0.10, crouch: 0.12, lead: -0.10, leadShin: -0.10, rear: 0.10, rearShin: -0.40 }),
});

const smooth = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };

// Where the attacker is, relative to the defender, `u` (0..1) of the way round. `side` is -1 for up (the far side), +1 for down (the near
// side). start = { fwd, dy } is where he stood when the circle began. He ends WAISTLOCK.holdBehind behind the defender and `upstage` upstage.
// The x travel is a smoothstep; the y bulges out on the lane (sin) so the circle goes round him, not through him. `facesDefenderWay` is true
// once he is past the defender: from then on he faces the way the defender does.
export function goBehindOffset(u, side, start, s = 1) {
    const k = smooth(u), endFwd = -WAISTLOCK.holdBehind * s, endDy = -WAISTLOCK.upstage * s;
    const fwd = start.fwd + (endFwd - start.fwd) * k, dy = start.dy + (endDy - start.dy) * k + side * WAISTLOCK.lane * s * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
    return { fwd, dy, facesDefenderWay: fwd < 0 };
}

// What the pair does at time `t` since the go-behind began. Returns { phase: 'goBehind' | 'hold' | 'release' | 'done', u (0..1 round the
// circle), pose (0..1 the poses are in the hold's), grips: { attacker: { near, far }, defender: { pry } } (weights), strain (the defender's
// lean), release (0..1) }.
export function waistlockPhase(t) {
    const W = WAISTLOCK, holdEnd = W.goBehind + W.timeout;
    const out = { phase: 'goBehind', u: Math.min(1, t / W.goBehind), pose: smooth(t / W.goBehind), release: 0, strain: 0, grips: { attacker: { near: 0, far: 0 }, defender: { pry: 0 } } };
    const closing = smooth((t - (W.goBehind - W.gripRamp)) / W.gripRamp);
    out.grips = { attacker: { near: closing, far: closing }, defender: { pry: closing } };
    if (t >= W.goBehind) { out.phase = 'hold'; out.strain = Math.sin(2 * Math.PI * W.strainHz * t) * W.strainLean; }
    if (t >= holdEnd) {
        const tr = t - holdEnd;
        out.phase = tr >= W.release.dur ? 'done' : 'release';
        out.release = smooth(tr / W.release.dur);
        const g = 1 - smooth(tr / LOCKUP.breakGrip);
        out.grips = { attacker: { near: g, far: g }, defender: { pry: g } };
        out.strain = 0;
    }
    return out;
}

// Channels for one role: arms, torso, legs. `lSide` is skeleton.lChannelSide(facing). extra: { strain, release, legLen }. In the release the
// attacker's arms go straight out (T4a.2's shove) and the defender is pushed forward onto his toes, leaning into the stumble.
export function waistlockPoseChannels(role, lSide, extra = {}) {
    const P = WAISTLOCK_POSES[role], base = WAISTLOCK_ARMS[role], rel = extra.release ?? 0, legLen = extra.legLen ?? 118.8;
    const mix = (field) => P[field];
    const nearCh = lSide === 'far' ? 'r' : 'l', farCh = nearCh === 'l' ? 'r' : 'l';
    let arm = base.arm, elbow = base.elbow, bend = P.bend + (extra.strain ?? 0) * (role === 'defender' ? 1 : -0.5);
    if (role === 'attacker') { arm = base.arm + (LOCKUP.shove.arm - base.arm) * rel; elbow = base.elbow + (LOCKUP.shove.elbow - base.elbow) * rel; bend = P.bend * (1 - rel); }
    else { arm = base.arm + (LOCKUP.breakArm - base.arm) * rel; bend = P.bend + (-LOCKUP.shove.stumbleLean - P.bend) * rel; }   // pushed from behind: the lean is forward
    return { lArm: arm, rArm: arm, lElbow: elbow, rElbow: elbow, bend, crouch: P.crouch, ...legChannels(mix, nearCh, farCh, { lead: 0, rear: 0 }, legLen) };
}

// The two men's travel in the release (px at s = 1): the defender is pushed forward along his facing, the attacker follows a little.
export function releaseTravel() {
    return { attacker: LOCKUP.shove.attackerPx, defender: LOCKUP.shove.stepPx };
}

// The defender's waist: between his hip joints, a little up, as a world point. `front` moves it along his facing (px at s = 1).
export function waistPoint(defender, front = 0) {
    const p = defender.skeleton?.jointAttachmentPoints, s = defender.s ?? 1;
    if (!p?.nearHip || !p?.farHip) return null;
    return { x: (p.nearHip.x + p.farHip.x) / 2 + defender.facing * front * s, y: (p.nearHip.y + p.farHip.y) / 2 - WAISTLOCK.waistRise * s };
}

// W5, in Wrestler.holdGrips form. Attacker: his near hand on the front of the defender's waist, his far hand at the middle (hidden behind
// the defender's body by the W4 layering). Defender: his near hand on the attacker's near wrist (prying); his far arm stays on its pose.
export function waistlockGrips(attacker, defender, grips) {
    const nearArm = (a) => ((a.skeleton?.lChannelSide?.(a.facing) ?? 'near') === 'near' ? 'l' : 'r');
    const farArm = (a) => (nearArm(a) === 'l' ? 'r' : 'l');
    const out = { attacker: [], defender: [] };
    const front = waistPoint(defender, WAISTLOCK.waistFront), mid = waistPoint(defender, 0);
    if (front && grips.attacker.near > 0) out.attacker.push({ arm: nearArm(attacker), partner: defender, joint: 'Waist', side: 'same', at: front, w: grips.attacker.near });
    if (mid && grips.attacker.far > 0) out.attacker.push({ arm: farArm(attacker), partner: defender, joint: 'Waist', side: 'same', at: mid, w: grips.attacker.far });
    if (grips.defender.pry > 0) out.defender.push({ arm: nearArm(defender), partner: attacker, joint: 'Wrist', side: 'same', w: grips.defender.pry });
    return out;
}

// W4, back to front: attacker far arm, defender far arm, attacker body, defender body, defender near arm, attacker near arm (his near hand
// shows across the defender's belly). Each body is its far leg, torso, head, near leg, or torso first for a rig whose art wants both legs
// over the torso (George), as the tie-up's does.
export function waistlockLayerOrder(attacker, defender) {
    const nearArm = (a) => ((a.skeleton?.lChannelSide?.(a.facing) ?? 'near') === 'near' ? 'lArm' : 'rArm');
    const farArm = (a) => (nearArm(a) === 'lArm' ? 'rArm' : 'lArm');
    const nearLeg = (a) => (nearArm(a) === 'lArm' ? 'lLeg' : 'rLeg');
    const farLeg = (a) => (nearLeg(a) === 'lLeg' ? 'rLeg' : 'lLeg');
    const body = (role, a) => (a.skeleton?._farLegOverTorso ? [[role, 'torso'], [role, 'head'], [role, farLeg(a)], [role, nearLeg(a)]] : [[role, farLeg(a)], [role, 'torso'], [role, 'head'], [role, nearLeg(a)]]);
    return [['attacker', farArm(attacker)], ['defender', farArm(defender)], ...body('attacker', attacker), ...body('defender', defender), ['defender', nearArm(defender)], ['attacker', nearArm(attacker)]];
}
