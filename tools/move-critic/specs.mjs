// What each pilot move asserts, so the critic can grade it. Times are clip
// seconds. A contact here is a claim about the choreography ("his hand is on
// George's head from the hook until the turnover"), not a runtime constraint.
export const SPECS = {
    suplex: {
        contacts: [
            // Matches suplex.constraints.mjs: the near hand holds the neck from
            // the facelock into the fall; the far hand holds the trunks
            // through the drive (it moves to his back while he's inverted).
            { role: 'attacker', source: 'nearWrist', target: 'neck', from: 0.22, to: 1.16, label: 'Lou near hand on George\'s neck (hook → fall)' },
            { role: 'attacker', source: 'farWrist', target: 'nearHip', from: 0.22, to: 0.58, label: 'Lou far hand on George\'s trunks (hook → drive)' },
        ],
        landings: [
            { role: 'defender', part: 'torso', event: 'impact', after: 0.5 },
            { role: 'attacker', part: 'torso', event: 'impact', after: 0.5 },
        ],
    },
    dropkick: {
        solo: true,
        airborne: { attacker: [[0.1, 0.5]] },
        strikes: [
            { role: 'attacker', source: 'nearAnkle', target: 'part:torso' },
            { role: 'attacker', source: 'farAnkle', target: 'part:torso' },
        ],
        landings: [{ role: 'attacker', part: 'torso', event: 'impact', after: 0.3 }],
    },
    bodySlam: {
        // bodyslam.constraints.mjs: near hand under the legs at the hip, far
        // hand at the shoulders, from the grab through the drive.
        contacts: [
            { role: 'attacker', source: 'nearWrist', target: 'nearHip', from: 0.24, to: 0.98, label: 'Lou near hand under George\'s hips (grab → drive)' },
            { role: 'attacker', source: 'farWrist', target: 'nearShoulder', from: 0.24, to: 0.92, label: 'Lou far hand at George\'s shoulders (grab → hold)' },
        ],
        landings: [{ role: 'defender', part: 'torso', event: 'impact', after: 0.4 }],
    },
    piledriver: {
        // piledriver.constraints.mjs: both hands on Lou's hips from the lift
        // through the drop.
        contacts: [
            { role: 'attacker', source: 'nearWrist', target: 'nearHip', from: 0.62, to: 1.27, label: 'George near hand on Lou\'s hip (lift → impact)' },
            { role: 'attacker', source: 'farWrist', target: 'farHip', from: 0.62, to: 1.27, label: 'George far hand on Lou\'s far hip (lift → impact)' },
        ],
        landings: [{ role: 'attacker', part: 'torso', event: 'impact', after: 0.6 }],
    },
    hipToss: {
        // hiptoss.constraints.mjs: near arm round his waist from the hook
        // until he is upside down behind Lou.
        contacts: [
            { role: 'attacker', source: 'nearWrist', target: 'farHip', from: 0.14, to: 0.52, label: 'Lou near hand at George\'s far hip (hook → down)' },
            { role: 'attacker', source: 'farWrist', target: 'nearElbow', from: 0.14, to: 0.42, label: 'Lou far hand on George\'s near arm (hook → over)' },
        ],
        landings: [{ role: 'defender', part: 'torso', event: 'impact', after: 0.3 }],
    },
    figureFourTableau: {
        // research/animation/figure-four-tableau/LEDGER.md (v2 roles), locked beat.
        // Receiver: rLeg = H (hurt, bent, shin southward), lLeg = N (near, straight).
        // George: lLeg = T (lands across H), rLeg = B (stepped between the legs).
        contacts: [
            { role: 'attacker', source: 'lAnkle', target: 'seg:rKnee-rAnkle', from: 0, to: 1, kind: 'trap', tol: 0.05,
                label: 'George\'s near ankle (T) across the receiver\'s bent far shin (H)' },
            { role: 'attacker', source: 'rAnkle', target: 'seg:lHip-lKnee', from: 0, to: 1, kind: 'brace', tol: 0.08,
                label: 'George\'s far ankle (B), stepped between, against the near thigh (N)' },
        ],
    },
    hammerlock: {},
    frontKick: {
        solo: true,
        // The kick leads with lLeg: the near leg facing right. The boot meets
        // the belly, not the thigh or the ribs.
        strikes: [{ role: 'attacker', source: 'nearAnkle', target: 'part:torso' }],
    },
    shove: {
        solo: true,
        // Both palms drive into the chest: the near hand lands on the torso.
        strikes: [{ role: 'attacker', source: 'nearWrist', target: 'part:torso' }],
    },
    jab: {
        solo: true,
        // The jab punches with lArm: the near arm facing right.
        strikes: [{ role: 'attacker', source: 'fist:near', target: 'face' }],
    },
};
export const specFor = id => SPECS[id] ?? SPECS[id.replace(/-.*$/, '')] ?? {};
// Strict sibling of specFor: says whether a move has a spec at all, instead of
// returning {} for both "nothing to check" and "nobody wrote one". Same lookup
// (exact id, then the id up to its first '-').
export function specStatus(id) {
    const key = [id, id.replace(/-.*$/, '')].find(k => Object.hasOwn(SPECS, k));
    if (key === undefined) return { status: 'missing', spec: {} };
    const spec = SPECS[key];
    return { status: Object.keys(spec).length ? 'specified' : 'empty', spec };
}
