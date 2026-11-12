// T3.0 pose table. att/def are pose channels (lFold/rFold become lShin/rShin). `l` is the near-side channel, so the man's trapped leg is his lLeg.
// First guesses; iterate by looking at the stills.
const DEF_LYING = { tilt: -Math.PI / 2, lift: Number(process.env.DLIFT ?? -110), lArm: .05, rArm: .05, lElbow: .12, rElbow: .12, crouch: 0, lean: 0, bend: 0 };
// back -> front. FRONT: the trapped leg over both his legs; BEHIND: his near leg over the trapped leg (shin behind the thigh).
const BASE = [['defender', 'rLeg'], ['defender', 'farArm'], ['defender', 'torso'], ['defender', 'head'], ['defender', 'nearArm'], ['attacker', 'farArm'], ['attacker', 'torso'], ['attacker', 'head'], ['attacker', 'farLeg']];
const FRONT = [...BASE, ['attacker', 'nearLeg'], ['defender', 'lLeg'], ['attacker', 'nearArm']];
const BEHIND = [...BASE.slice(0, 5), ['defender', 'lLeg'], ...BASE.slice(5), ['attacker', 'nearLeg'], ['attacker', 'nearArm']];
export const STILLS = [
    { id: '1-grab', order: FRONT, gap: 130, twist: false,
        att: { crouch: 1.0, bend: .7, lean: .1, lLeg: -.2, rLeg: .2, lFold: 1.2, rFold: 1.0, lArm: 1.0, rArm: 1.0, lElbow: .3, rElbow: .3, tilt: 0, lift: 0 },
        def: { ...DEF_LYING, lLeg: .6, rLeg: .1, lFold: .2, rFold: .15 } },
    { id: '2-step-over', order: BEHIND, gap: 100, flip: false, twist: false,
        att: { crouch: .8, bend: .5, lean: .1, lLeg: .9, rLeg: -.2, lFold: .5, rFold: 1.0, lArm: 1.0, rArm: 1.0, lElbow: .3, rElbow: .3, tilt: 0, lift: 0 },
        def: { ...DEF_LYING, lLeg: 1.2, rLeg: .05, lFold: .5, rFold: .15 } },
    { id: '3-kneel', order: BEHIND, gap: 28, flip: true, twist: true,
        att: { crouch: 1.3, bend: 1.2, lean: -.3, lLeg: -.45, rLeg: -.45, lFold: 2.0, rFold: 2.0, lArm: .6, rArm: .6, lElbow: .4, rElbow: .4, tilt: 0, lift: 0 },
        def: { ...DEF_LYING, lLeg: 1.7, rLeg: -.3, lFold: 2.4, rFold: .15 } },
    { id: '4a-heels', order: BEHIND, gap: 55, flip: true, twist: true,
        att: { crouch: 1.3, bend: .2, lean: -.25, lLeg: -.45, rLeg: -.45, lFold: 2.3, rFold: 2.3, lArm: .5, rArm: .5, lElbow: .4, rElbow: .4, tilt: 0, lift: 0 },
        def: { ...DEF_LYING, lLeg: 1.45, rLeg: -.3, lFold: 2.4, rFold: .15 } },
    { id: '4b-mat', order: BEHIND, gap: 55, flip: true, twist: true, attY: 14,
        att: { crouch: 1.6, bend: .15, lean: -.3, lLeg: .5, rLeg: -.2, lFold: 1.5, rFold: 1.7, lArm: .5, rArm: .5, lElbow: .4, rElbow: .4, tilt: 0, lift: 0 },
        def: { ...DEF_LYING, lLeg: 1.45, rLeg: -.3, lFold: 2.4, rFold: .15 } },
];

// Derek 2026-11-11: the cinch turns the receiver onto his stomach.
// Reverse facing and torso tilt together to keep his head at the same end.
// Keep heel folds positive: negating folds would bend the knee backwards.
for (const still of STILLS) {
    if (!still.twist) continue;
    still.prone = true;
    Object.assign(still.def, { tilt: Math.PI / 2, lLeg: -.65, rLeg: .05,
        lFold: 1.65, rFold: .15, lArm: 2.5, rArm: 2.5,
        lElbow: .2, rElbow: .2 });
}
