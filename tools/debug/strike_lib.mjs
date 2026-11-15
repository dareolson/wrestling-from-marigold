// Shared by strike_solve.mjs and strike_measure.mjs: the probe points on the attacker and the target points on the defender (in-page functions, serialised by Playwright, so they close over nothing).
export const RIGS = ['thesz-procreate-v1', 'george-roster-v1', 'kowalski-roster-v1', 'guido-roster-v1'];
// probe on the attacker, target on the defender, the seed pose and the channels the search may move (lo, hi)
export const PROBES = {
    clubBlow:      { probe: 'forearm', target: 'neck',  seed: { lLeg: 0.25, rLeg: -0.12, lArm: 2.0, lElbow: 0.5, rArm: -0.2, lean: 0.25, bend: 0.2, crouch: 0.15 }, vars: { lArm: [0.6, 3.0], lElbow: [0, 2.0], lean: [0, 0.6], bend: [0, 0.6], crouch: [0, 0.5] } },
    chop:          { probe: 'hand',    target: 'chest', seed: { lLeg: 0.25, rLeg: -0.12, lArm: 1.3, lElbow: 0.1, rArm: -0.3, lean: 0.12, bend: 0.1, crouch: 0.1 }, vars: { lArm: [0.4, 2.4], lElbow: [0, 1.6], lean: [0, 0.5], bend: [0, 0.5], crouch: [0, 0.5] } },
    uppercut:      { probe: 'fist',    target: 'chin',  seed: { lLeg: 0.2, rLeg: -0.1, lArm: 1.5, lElbow: 1.3, rArm: -0.3, lean: 0.1, bend: 0.12, crouch: 0.45 }, vars: { lArm: [0.4, 2.8], lElbow: [0, 2.0], lean: [0, 0.5], bend: [0, 0.5], crouch: [0.2, 0.8] } },
    backElbow:     { probe: 'elbow',   target: 'chest', lungeMax: 45, seed: { lLeg: 0.25, rLeg: -0.12, lArm: 1.0, lElbow: 1.5, rArm: -0.3, lean: 0.05, bend: 0.1, crouch: 0.1 }, vars: { lArm: [0, 2.4], lElbow: [0.4, 2.4], lean: [-0.2, 0.4], bend: [0, 0.5], crouch: [0, 0.5] } },
    axeHandleBack: { probe: 'wrists',  target: 'back',  seed: { lLeg: 0.2, rLeg: -0.1, lArm: 0.9, rArm: 0.85, lElbow: 0.3, rElbow: 0.3, lean: 0.45, bend: 0.3, crouch: 0.3 }, vars: { lArm: [0.2, 2.4], rArm: [0.2, 2.4], lElbow: [0, 1.4], rElbow: [0, 1.4], lean: [0, 0.6], bend: [0, 0.6], crouch: [0, 0.6] }, defStagger: true },
    shoulderBlock: { probe: 'shoulder', target: 'chest', lungeMax: 90, seed: { lLeg: 0.35, rLeg: -0.2, lArm: 0.4, lElbow: 1.1, rArm: 0.3, lean: 0.3, bend: 0.1, crouch: 0.3 }, vars: { lArm: [-0.4, 1.6], lElbow: [0, 2], lean: [0, 0.6], bend: [0, 0.5], crouch: [0, 0.6] } },
    legSweep:      { probe: 'ankle',   target: 'ankles', seed: { lLeg: 1.0, lFold: 0, rLeg: 0.1, rFold: 1.4, lArm: 0.5, rArm: -0.3, crouch: 1.0, lean: 0.3, bend: 0.2 }, vars: { lLeg: [0.3, 1.7], lFold: [0, 1.0], rFold: [0.6, 2.0], crouch: [0.5, 1.3], lean: [0, 0.6], bend: [0, 0.5] } },
    // ground moves: a man on the mat, the attacker kneeling beside him on the camera side (`ay` px of depth), `fixed` = the kneel; `lunge` is his standing place along the mat (px from where he starts), `range` its bounds
    mountedPunch:  { probe: 'fist',    target: 'face',  ground: { lying: 'supine', ay: 18, start: 40, range: [-20, 130], fixed: { lLeg: -0.05, lFold: 2.3, rLeg: 1.0, rFold: 1.25, crouch: 1.3, rArm: 0.6, rElbow: 1.4 } }, seed: { lArm: 1.3, lElbow: 0.7, lean: 0.5, bend: 0.45 }, vars: { lArm: [0.3, 2.6], lElbow: [0, 2.2], lean: [0.2, 0.9], bend: [0.2, 0.7] } },
    // the other (right) hand's punch, from the same place: `rangeByRig` pins the standing place to the left hand's solution
    mountedPunchR: { probe: 'fistOther', target: 'face', ground: { lying: 'supine', ay: 18, start: 80, range: [80, 80], rangeByRig: { 'thesz-procreate-v1': 79.29, 'george-roster-v1': 100, 'kowalski-roster-v1': 99.48, 'guido-roster-v1': 100 }, fixed: { lLeg: -0.05, lFold: 2.3, rLeg: 1.0, rFold: 1.25, crouch: 1.3, lArm: 0.6, lElbow: 1.4 } }, seed: { rArm: 1.3, rElbow: 0.33, lean: 0.5, bend: 0.7 }, vars: { rArm: [0.3, 2.6], rElbow: [0, 2.2] } },
    runningForearm:{ probe: 'forearm', target: 'face',  seed: { lLeg: 0.25, rLeg: -0.12, lArm: 1.9, lElbow: 0.7, rArm: -0.4, lean: 0.35, bend: 0.2, crouch: 0.1 }, vars: { lArm: [0.6, 3.0], lElbow: [0, 2.0], lean: [0, 0.6], bend: [0, 0.5], crouch: [0, 0.5] } },
};

// in-page: the probe and target points now (joints as drawn after the last step)
export const POINTS = ({ probe, target }) => {
    const sc = window.__WFM_GAME.scene.scenes[0], A = sc.w1, D = sc.w2;
    const P = A.skeleton.jointAttachmentPoints, Q = D.skeleton.jointAttachmentPoints, side = A.skeleton.lChannelSide(A.facing), other = side === 'near' ? 'far' : 'near';
    const w = P[side + 'Wrist'], e = P[side + 'Elbow'];
    const pt = {
        fist: { x: w.x + (w.x - e.x) * 0.35, y: w.y + (w.y - e.y) * 0.35 }, forearm: { x: e.x + (w.x - e.x) * 0.75, y: e.y + (w.y - e.y) * 0.75 },
        hand: { x: w.x + (w.x - e.x) * 0.15, y: w.y + (w.y - e.y) * 0.15 }, elbow: { x: e.x, y: e.y }, shoulder: { x: P[side + 'Shoulder'].x, y: P[side + 'Shoulder'].y },
        wrists: { x: (w.x + P[other + 'Wrist'].x) / 2, y: (w.y + P[other + 'Wrist'].y) / 2 },
        ankle: { x: P[side + 'Ankle'].x, y: P[side + 'Ankle'].y }, fists: { x: 0, y: 0 },
        fistOther: { x: P[other + 'Wrist'].x + (P[other + 'Wrist'].x - P[other + 'Elbow'].x) * 0.35, y: P[other + 'Wrist'].y + (P[other + 'Wrist'].y - P[other + 'Elbow'].y) * 0.35 },
    }[probe];
    const hip = { x: (Q.nearHip.x + Q.farHip.x) / 2, y: (Q.nearHip.y + Q.farHip.y) / 2 }, hb = D.skeleton.head.getBounds(), toward = -A.facing * -1;
    const tg = {
        neck: { x: Q.neck.x, y: Q.neck.y }, chest: { x: Q.neck.x + (hip.x - Q.neck.x) * 0.35, y: Q.neck.y + (hip.y - Q.neck.y) * 0.35 },
        back: { x: Q.neck.x + (hip.x - Q.neck.x) * 0.2, y: Q.neck.y + (hip.y - Q.neck.y) * 0.2 },
        chin: { x: (hb.left + hb.right) / 2 - A.facing * (hb.right - hb.left) * 0.2, y: hb.bottom - (hb.bottom - hb.top) * 0.12 },
        ankles: { x: (Q.nearAnkle.x + Q.farAnkle.x) / 2, y: (Q.nearAnkle.y + Q.farAnkle.y) / 2 },
        face: { x: (hb.left + hb.right) / 2 - A.facing * (hb.right - hb.left) * 0.2, y: (hb.top + hb.bottom) / 2 },
    }[target];
    if (probe === 'fists') {   // whichever fist tip (either arm) is nearer the target: the alternating punches
        const tip = n => { const ww = P[n + 'Wrist'], ee = P[n + 'Elbow']; return { x: ww.x + (ww.x - ee.x) * 0.35, y: ww.y + (ww.y - ee.y) * 0.35 }; };
        const a1 = tip('near'), a2 = tip('far'), d1 = Math.hypot(a1.x - tg.x, a1.y - tg.y), d2 = Math.hypot(a2.x - tg.x, a2.y - tg.y);
        return { pt: d1 < d2 ? a1 : a2, tg, s: A.s, facing: A.facing, dist: Math.min(d1, d2) };
    }
    return { pt, tg, s: A.s, facing: A.facing, dist: Math.hypot(pt.x - tg.x, pt.y - tg.y) };
};

