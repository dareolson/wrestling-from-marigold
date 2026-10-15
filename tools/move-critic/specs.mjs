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
    hammerlock: {},
    jab: {
        solo: true,
        strikes: [{ role: 'attacker', source: 'nearWrist', target: 'part:head' }],
    },
};
export const specFor = id => SPECS[id] ?? SPECS[id.replace(/-.*$/, '')] ?? {};
