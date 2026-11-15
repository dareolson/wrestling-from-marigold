// PLAN_LIGHT_MOVES Stage 12 (?light=v1): the ten mat and lockup moves as one spec table and one clip builder (build rules: one spec per move, overrides by rig, shared phrases). ROUGH on
// purpose (Derek: "batch make 10 moves and we'll fix them after"): hand-posed keys on the snapmare / half crab pattern, no footage, nothing judged. Every move is the same shape: an
// `att` beat list and a `def` beat list (or one list for the solo moves), a few events, and the executor's ending (`end`), in rig units at s = 1 along the attacker's facing at play().
//   x: hips from the attacker's start, along his facing (the man starts at `distance`, the clip's argument); y: depth, negative upstage; tilt / lift: the channels the throws use (tilt -pi/2 and
//   lift -110 is lying on his back, as ankleLockV2's receiver); a `facing` key is relative to the attacker's facing at play. Knees: folds only (shinsFromFolds), no positive lKnee/rKnee upright.
//   The turn flips the facing on a straight pose only where a move needs it (none of the ten flips an upright man; the backward roll and the mare's pivot do their turning on the mat / in snapmareTieUp).
// `kind`: 'paired' (two men, Wrestler._playPairedThrow) or 'solo' (one man). `hitEvent`: the event that drains (`impact`, or `squeeze` for a hold's three pulls).
// An attacker or defender override (specFor) holds a per-rig `gap` (px at s = 1 added to the standoff of the hold) where a rig's frame needs it; none are needed yet, so none exist.
import { specFor } from './rigOverrides.js';
import { shinsFromFolds } from '../../rig/articulation.js';
import { snapmareTieUpClip } from './snapmareTieUp.js';

const PI2 = Math.PI / 2;
const ST = { lArm: 0.05, rArm: 0.15, lElbow: 0.6, rElbow: 0.6, lLeg: -0.04, rLeg: 0.16, lFold: 0.22, rFold: 0.22, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0 };
const TIE = { lArm: 0.7, rArm: 0.7, lElbow: 0.9, rElbow: 0.9, lLeg: -0.1, rLeg: 0.2, lFold: 0.22, rFold: 0.22, lean: 0, crouch: 0.05, tilt: 0, lift: 0, bend: 0 };
const LIE = { lArm: 0.05, rArm: 0.08, lElbow: 0.1, rElbow: 0.1, lLeg: 0.1, rLeg: 0.22, lFold: 0.15, rFold: 0.4, lean: 0, crouch: 0, tilt: -PI2, lift: -110, bend: 0 };
const HEADLOCK = { ...ST, lArm: 1.5, rArm: 0.8, lElbow: 1.3, rElbow: 0.9, lean: 0.1, crouch: 0.15, bend: 0.15, lLeg: 0.2, rLeg: -0.15, lFold: 0.4, rFold: 0.4 };

// A beat: [at, pose over `base`, x, y, ease, facing]
const kf = (base, [at, over, x = 0, y = 0, ease = 'easeInOut', facing]) => ({ at, ease, pose: shinsFromFolds({ ...base, ...over }), transform: { x, y }, ...(facing === undefined ? {} : { facing }), parts: {} });
const FRONT_ATT = [['defender', 'farArm'], ['defender', 'body'], ['defender', 'nearArm'], ['attacker', 'farArm'], ['attacker', 'body'], ['attacker', 'nearArm']];
const FRONT_DEF = [['attacker', 'farArm'], ['attacker', 'body'], ['attacker', 'nearArm'], ['defender', 'farArm'], ['defender', 'body'], ['defender', 'nearArm']];

// The three pulls of a hold: `at` times, each a squeeze event; `pose(k)` is the pose delta on the pull.
const squeezes = (...at) => at.map(t => ({ at: t, type: 'squeeze' }));

// Each spec: (D) => { duration, events, att: [beats], def: [beats], layers? }, D = the man's hips from the attacker's at play(). Beats are [at, over, x, y, ease, facing].
export const MAT_MOVES = {
    // T12.1: tie-up, Back + Action. He takes the wrist in both hands, steps in beside him and cranks it (the man bends over, his arm wrung up); he is left bent and staggered.
    wristlock: {
        kind: 'paired', hitEvent: 'impact', damage: 8, faceToFace: true, end: { def: 'stagger', att: 'stand' }, shake: [110, 0.0018],
        build: D => ({
            duration: 2.8, events: [{ at: 1.5, type: 'impact' }],
            att: [
                [0, TIE, 0, 0, 'linear', 1],
                [0.3, { lArm: 1.5, lElbow: 0.4, rArm: 1.2, rElbow: 0.5, lean: 0.1, crouch: 0.1 }, 8],
                [0.8, { lArm: 1.6, lElbow: 0.5, rArm: 1.3, rElbow: 0.6, lean: 0.15, crouch: 0.3, bend: 0.1, lLeg: 0.3, rLeg: -0.2, lFold: 0.5, rFold: 0.5 }, D - 58, -12],
                [1.5, { lArm: 1.1, lElbow: 0.6, rArm: 1.0, rElbow: 0.6, lean: 0.3, crouch: 0.45, bend: 0.25, lLeg: 0.3, rLeg: -0.2, lFold: 0.6, rFold: 0.6 }, D - 58, -12],
                [2.1, { lArm: 1.1, lElbow: 0.6, rArm: 1.0, rElbow: 0.6, lean: 0.3, crouch: 0.45, bend: 0.25, lLeg: 0.3, rLeg: -0.2, lFold: 0.6, rFold: 0.6 }, D - 58, -12],
                [2.8, { ...ST, lean: 0.05, crouch: 0.15 }, D - 74, -12],
            ],
            def: [
                [0, TIE, D, 0, 'linear', -1],
                [0.3, { lArm: 0.9, rArm: 2.0, rElbow: 0.3, lean: 0.05 }, D],
                [0.8, { lArm: 0.5, rArm: 2.3, rElbow: 0.2, bend: 0.3, crouch: 0.25, lean: 0.1 }, D],
                [1.5, { lArm: 0.4, rArm: 2.5, rElbow: 0.2, bend: 0.85, crouch: 0.55, lean: 0.25, lFold: 0.5, rFold: 0.5 }, D + 4],
                [2.1, { lArm: 0.4, rArm: 2.5, rElbow: 0.2, bend: 0.85, crouch: 0.55, lean: 0.25, lFold: 0.5, rFold: 0.5 }, D + 4],
                [2.8, { lArm: 0.5, rArm: 1.0, rElbow: 0.5, bend: 0.6, crouch: 0.4, lean: 0.15, lFold: 0.4, rFold: 0.4 }, D + 10],
            ],
            layers: FRONT_ATT,
        }),
    },
    // T12.2: in the headlock (both facing the same way, he beside the man), Power: he drops to a hip and takes the man back over it to the mat; the headlock breaks, he is up first.
    headlockTakeover: {
        kind: 'paired', hitEvent: 'impact', damage: 9, faceToFace: false, end: { def: 'back', att: 'stand' }, land: 'back', shake: [150, 0.0025], foley: ['mat', 0.8],
        build: D => ({
            duration: 2.7, events: [{ at: 1.2, type: 'impact' }],
            att: [
                [0, HEADLOCK, 0, 0, 'linear', 1],
                [0.4, { ...HEADLOCK, crouch: 0.7, lean: 0.3, bend: 0.35, lFold: 1.0, rFold: 1.0, lArm: 1.7 }, 14],
                [0.9, { ...HEADLOCK, crouch: 1.5, lean: 0.15, bend: 0.45, lFold: 1.9, rFold: 1.9, lLeg: 0.6, rLeg: -0.2, lArm: 1.6 }, 26],
                [1.3, { ...HEADLOCK, crouch: 1.8, lean: 0.1, bend: 0.4, lFold: 2.2, rFold: 2.2, lLeg: 0.6, rLeg: -0.2, lArm: 1.2, rArm: 0.6 }, 30],
                [1.9, { ...ST, crouch: 1.0, lFold: 1.2, rFold: 1.2, lean: 0.1, bend: 0.2 }, 28],
                [2.7, { ...ST, lean: 0.05, crouch: 0.15 }, 24],
            ],
            def: [
                [0, { ...ST, lArm: 0.9, rArm: 0.7, bend: 0.5, crouch: 0.2 }, D, 0, 'linear', 1],
                [0.4, { ...ST, lArm: 1.1, rArm: 0.9, bend: 0.7, crouch: 0.35, lean: 0.2 }, D + 2],
                [0.9, { ...ST, lArm: 1.3, rArm: 1.5, lLeg: 0.3, rLeg: -0.2, tilt: -0.7, lift: 20, bend: 0.5 }, 62],
                [1.2, LIE, 38, 0, 'easeIn'],
                [2.7, LIE, 38],
            ],
            layers: FRONT_DEF,
        }),
    },
    // T12.3: tie-up, Down + Power. He pivots, takes the arm and pulls the man over his shoulder; the man lands on his back (the snapmare's pivot and flip frames, retimed and higher: see flyingMareClip).
    flyingMare: { kind: 'paired', hitEvent: 'impact', damage: 14, faceToFace: false, end: { def: 'back', att: 'stand' }, land: 'back', shake: [210, 0.0033], foley: ['mat', 1.0], custom: true },
    // T12.4: tie-up, Up + Power. Hands lock overhead; he forces the man down in three pushes (squeezes drain); the man is on his knees, he lets go: a free strike window (stagger). The attacker always wins (no struggle).
    testOfStrength: {
        kind: 'paired', hitEvent: 'squeeze', damage: 3, faceToFace: true, end: { def: 'stagger', att: 'stand' }, hold: true, shake: [60, 0.0008],
        build: D => {
            const m = D / 2, up = { lArm: 2.45, rArm: 2.45, lElbow: 0.5, rElbow: 0.5 };
            return {
                duration: 3.1, events: squeezes(1.0, 1.55, 2.1),
                att: [
                    [0, TIE, 0, 0, 'linear', 1],
                    [0.4, { ...up, lean: 0.05, crouch: 0.1 }, m - 36],
                    [1.0, { ...up, lean: 0.22, crouch: 0.25, bend: 0.1, lFold: 0.6, rFold: 0.6 }, m - 34],
                    [1.55, { ...up, lean: 0.3, crouch: 0.3, bend: 0.12, lFold: 0.7, rFold: 0.7 }, m - 33],
                    [2.1, { ...up, lean: 0.36, crouch: 0.35, bend: 0.15, lFold: 0.8, rFold: 0.8 }, m - 32],
                    [2.5, { ...up, lean: 0.36, crouch: 0.35, bend: 0.15, lFold: 0.8, rFold: 0.8 }, m - 32],
                    [3.1, { ...ST, lean: 0.05, crouch: 0.1 }, m - 52],
                ],
                def: [
                    [0, TIE, D, 0, 'linear', -1],
                    [0.4, { ...up, lean: 0, crouch: 0.1 }, m + 36],
                    [1.0, { ...up, lean: -0.1, crouch: 0.5, bend: 0.15, lFold: 1.0, rFold: 1.0 }, m + 36],
                    [1.55, { ...up, lean: -0.15, crouch: 1.0, bend: 0.25, lFold: 1.7, rFold: 1.7 }, m + 36],
                    [2.1, { ...up, lean: -0.2, crouch: 1.7, bend: 0.3, lFold: 2.3, rFold: 2.3 }, m + 36],
                    [2.5, { ...up, lean: -0.2, crouch: 1.7, bend: 0.3, lFold: 2.3, rFold: 2.3 }, m + 36],
                    [3.1, { ...ST, lArm: 0.5, rArm: 0.6, bend: 0.5, crouch: 0.9, lFold: 1.4, rFold: 1.4 }, m + 44],
                ],
                layers: FRONT_ATT,
            };
        },
    },
    // T12.5: defending vs a returning runner, Up + Power. A solo hop: a spring, legs apart, hands forward, and down again as the runner passes under. No damage; nobody is touched.
    leapfrog: {
        kind: 'solo', end: { att: 'stand' },
        build: () => ({
            duration: 1.0, events: [{ at: 0.45, type: 'apex' }],
            att: [
                [0, ST, 0, 0, 'linear', 1],
                [0.16, { ...ST, crouch: 0.7, lFold: 1.2, rFold: 1.2, lean: 0.2, lArm: 0.6, rArm: 0.6 }, 0],
                [0.32, { ...ST, lift: 50, lLeg: 1.0, rLeg: -1.0, lFold: 0.1, rFold: 0.1, lArm: 1.5, rArm: 1.4, lElbow: 0.2, rElbow: 0.2, lean: 0.15 }, 6, 0, 'easeOut'],
                [0.5, { ...ST, lift: 82, lLeg: 1.15, rLeg: -1.15, lFold: 0.05, rFold: 0.05, lArm: 1.6, rArm: 1.5, lElbow: 0.15, rElbow: 0.15, lean: 0.2 }, 12, 0, 'easeInOut'],
                [0.72, { ...ST, lift: 30, lLeg: 0.6, rLeg: -0.5, lFold: 0.4, rFold: 0.4, lArm: 0.8, rArm: 0.8, lean: 0.1 }, 18, 0, 'easeIn'],
                [0.85, { ...ST, crouch: 0.5, lFold: 0.9, rFold: 0.9, lean: 0.1 }, 18],
                [1.0, ST, 18],
            ],
        }),
    },
    // T12.6: on his back at the rise, Back held (away from the man). A solo roll over the shoulders to his feet, away from him. `tilt` runs on past inverted to -2 pi: the same way he fell.
    backwardRoll: {
        kind: 'solo', end: { att: 'stand' },
        build: () => ({
            duration: 1.5, events: [{ at: 0.55, type: 'over' }],
            att: [
                [0, LIE, 0, 0, 'linear', 1],
                [0.25, { ...LIE, lLeg: 1.4, rLeg: 1.3, lFold: 1.5, rFold: 1.5, tilt: -1.75, lift: -100, lArm: 0.3, rArm: 0.3 }, -6],
                [0.55, { ...LIE, lLeg: 0.7, rLeg: 0.6, lFold: 0.4, rFold: 0.4, tilt: -Math.PI, lift: 25, lArm: 0.6, rArm: 0.6 }, -42],
                [0.9, { ...LIE, lLeg: 0.5, rLeg: 0.4, lFold: 1.6, rFold: 1.6, tilt: -3 * PI2, lift: -40, crouch: 0.9, lArm: 0.4, rArm: 0.4 }, -84],
                [1.2, { ...ST, crouch: 1.5, lFold: 2.0, rFold: 2.0, tilt: -4 * PI2, lift: 0, lean: 0.1 }, -90],
                [1.5, { ...ST, crouch: 0.3, lFold: 0.5, rFold: 0.5, tilt: -4 * PI2 }, -90],   // tilt stays at -2 pi (upright): a 0 here would turn him a whole turn back; _standBackUp zeroes it after
            ],
        }),
    },
    // T12.7: vs a staggered man, Back + Action. From his side: one leg hooked over the man's, one arm over the head, the other across the belly; he pulls back three times and the man is stretched.
    abdominalStretch: {
        kind: 'paired', hitEvent: 'squeeze', damage: 5, faceToFace: false, end: { def: 'stagger', att: 'stand' }, hold: true, shake: [80, 0.001],
        build: D => {
            const hold = { crouch: 0.3, lean: -0.1, lArm: 2.2, lElbow: 0.8, rArm: 1.3, rElbow: 0.7, rLeg: 0.7, rFold: 1.0, lLeg: 0.1, lFold: 0.5 };
            const pull = { ...hold, lean: -0.32, crouch: 0.4 };
            const man = { bend: 0.1, lArm: 1.8, rArm: 1.6, lElbow: 0.5, rElbow: 0.5, lLeg: 0.2, rLeg: -0.15, lFold: 0.3, rFold: 0.3 };
            return {
                duration: 3.4, events: squeezes(1.2, 1.9, 2.6),
                att: [
                    [0, TIE, 0, 0, 'linear', 1],
                    [0.5, { ...hold, lean: 0 }, D - 46, -16],
                    [1.2, pull, D - 46, -16], [1.55, hold, D - 46, -16],
                    [1.9, pull, D - 46, -16], [2.25, hold, D - 46, -16],
                    [2.6, pull, D - 46, -16], [3.0, hold, D - 46, -16],
                    [3.4, { ...ST, crouch: 0.15 }, D - 62, -16],
                ],
                def: [
                    [0, { ...ST, bend: 0.5, crouch: 0.25 }, D, 0, 'linear', 1],
                    [0.5, { ...ST, ...man, lean: -0.1, bend: 0.2 }, D],
                    [1.2, { ...ST, ...man, lean: -0.4, bend: -0.2, lArm: 2.0, rArm: 1.9 }, D - 4],
                    [1.55, { ...ST, ...man, lean: -0.2, bend: 0 }, D],
                    [1.9, { ...ST, ...man, lean: -0.45, bend: -0.25, lArm: 2.1, rArm: 2.0 }, D - 4],
                    [2.25, { ...ST, ...man, lean: -0.2, bend: 0 }, D],
                    [2.6, { ...ST, ...man, lean: -0.5, bend: -0.3, lArm: 2.2, rArm: 2.1 }, D - 4],
                    [3.0, { ...ST, ...man, lean: -0.15, bend: 0.2 }, D],
                    [3.4, { ...ST, bend: 0.55, crouch: 0.4, lArm: 0.5, rArm: 0.6, lFold: 0.5, rFold: 0.5 }, D + 4],
                ],
                layers: FRONT_ATT,
            };
        },
    },
    // T12.8: next to a man on his back, Up + Action. He drops to a seat at the man's side and locks his legs round the waist; three squeezes; he rises, the man stays on his back.
    bodyScissors: {
        kind: 'paired', hitEvent: 'squeeze', damage: 4, faceToFace: true, end: { def: 'back', att: 'stand' }, hold: true, shake: [70, 0.0009],
        build: D => {
            const sit = { crouch: 2.2, lFold: 2.4, rFold: 2.4, lean: -0.2, bend: 0.1, lArm: 0.9, rArm: 0.8, lElbow: 0.6, rElbow: 0.6, lLeg: 0.2, rLeg: 0.1 };
            const lock = { ...sit, lLeg: 1.45, rLeg: 1.3, lFold: 0.7, rFold: 0.9, lean: -0.3, crouch: 1.9 };
            const sq = { ...lock, lLeg: 1.5, rLeg: 1.4, lean: -0.38 };
            const squeezed = { ...LIE, bend: 0.4, lArm: 2.2, rArm: 1.6, lElbow: 0.3, rElbow: 0.4 };
            return {
                duration: 3.6, events: squeezes(1.5, 2.1, 2.7),
                att: [
                    [0, ST, 0, 0, 'linear', 1],
                    [0.35, { ...ST, crouch: 1.3, lFold: 1.6, rFold: 1.6, lean: 0.2, bend: 0.3 }, Math.max(8, D - 50), 12],
                    [0.8, sit, D + 2, 16],
                    [1.2, lock, D + 2, 16], [1.5, sq, D + 2, 16], [1.8, lock, D + 2, 16], [2.1, sq, D + 2, 16], [2.4, lock, D + 2, 16], [2.7, sq, D + 2, 16], [3.0, lock, D + 2, 16],
                    [3.3, sit, D + 2, 16],
                    [3.6, { ...ST, crouch: 0.9, lFold: 1.2, rFold: 1.2, lean: 0.1 }, D - 28, 16],
                ],
                def: [
                    [0, LIE, D, 0, 'linear', -1],
                    [1.2, LIE, D],
                    [1.5, squeezed, D], [1.8, { ...LIE, bend: 0.1, lArm: 0.8 }, D],
                    [2.1, squeezed, D], [2.4, { ...LIE, bend: 0.1, lArm: 0.8 }, D],
                    [2.7, squeezed, D], [3.3, LIE, D],
                    [3.6, LIE, D],
                ],
                layers: FRONT_ATT,
            };
        },
    },
    // T12.9: at the legs of a man on his back, Back + Finisher. He steps in between the boots, hooks a leg through and leans back with the man's legs crossed in his; three pulls; he lets go and rises.
    indianDeathlock: {
        kind: 'paired', hitEvent: 'squeeze', damage: 5, faceToFace: true, end: { def: 'back', att: 'stand' }, hold: true, shake: [80, 0.001],
        build: D => {
            const lock = { crouch: 1.9, lFold: 1.9, rFold: 0.6, lean: -0.5, bend: -0.2, lArm: 1.8, rArm: 1.6, lElbow: 0.6, rElbow: 0.5, lLeg: 0.4, rLeg: 1.0 };
            const pull = { ...lock, lean: -0.7, lArm: 1.5, rArm: 1.3 };
            const raised = { ...LIE, lLeg: 1.2, rLeg: 1.0, lFold: 0.6, rFold: 0.4, lift: -85, tilt: -1.85 };
            const wrench = { ...raised, bend: 0.3, lArm: 1.9, rArm: 1.2, lElbow: 0.4, rElbow: 0.5 };
            return {
                duration: 3.8, events: squeezes(1.6, 2.2, 2.8),
                att: [
                    [0, ST, 0, 0, 'linear', 1],
                    [0.4, { ...ST, crouch: 0.6, lFold: 0.8, rFold: 0.8, lean: 0.1, bend: 0.3, lArm: 1.2, rArm: 1.2 }, Math.max(8, D - 78)],
                    [0.9, { ...lock, lean: -0.1, crouch: 1.1 }, D - 64],
                    [1.3, lock, D - 60], [1.6, pull, D - 62], [1.9, lock, D - 60], [2.2, pull, D - 62], [2.5, lock, D - 60], [2.8, pull, D - 62], [3.2, lock, D - 60],
                    [3.8, { ...ST, crouch: 0.9, lFold: 1.2, rFold: 1.2, lean: 0.1 }, D - 84],
                ],
                def: [
                    [0, LIE, D, 0, 'linear', -1],
                    [0.9, { ...LIE, lLeg: 0.6, rLeg: 0.5, lift: -95, tilt: -1.7 }, D],
                    [1.3, raised, D], [1.6, wrench, D - 8], [1.9, raised, D - 4], [2.2, wrench, D - 8], [2.5, raised, D - 4], [2.8, wrench, D - 8], [3.2, raised, D],
                    [3.8, LIE, D],
                ],
                layers: FRONT_ATT,
            };
        },
    },
    // T12.10: from behind a man with his back turned, Power, once his wear is past KNOCKDOWN_WEAR. He locks the waist, lifts, arches back and falls; the man goes over his head and lands on his upper back.
    backdropSuplex: {
        kind: 'paired', hitEvent: 'impact', damage: 17, faceToFace: false, end: { def: 'back', att: 'back' }, land: 'back', attLand: true, shake: [200, 0.003], foley: ['mat', 1.0], tier: 'suplex',
        build: D => ({
            duration: 2.6, events: [{ at: 1.28, type: 'impact' }],
            att: [
                [0, ST, 0, 0, 'linear', 1],
                [0.45, { ...ST, crouch: 0.7, lFold: 1.0, rFold: 1.0, lean: 0.25, bend: 0.3, lArm: 1.1, rArm: 1.1, lElbow: 0.7, rElbow: 0.7 }, Math.max(8, D - 34)],
                [0.95, { ...ST, crouch: 0.15, lean: -0.3, bend: -0.15, lArm: 1.0, rArm: 1.0, lElbow: 0.8, rElbow: 0.8 }, D - 34],
                [1.28, { ...LIE, lArm: 0.9, rArm: 0.9, lElbow: 0.9, rElbow: 0.9, lLeg: 0.2, rLeg: 0.1 }, D - 66, 14, 'easeIn'],
                [2.0, { ...LIE, lArm: 0.3, rArm: 0.3, lLeg: 0.1, rLeg: 0.2 }, D - 68, 14],
                [2.6, { ...LIE, lArm: 0.3, rArm: 0.3, lLeg: 0.1, rLeg: 0.2 }, D - 68, 14],
            ],
            def: [
                [0, { ...ST, lArm: 1.2, rArm: 1.0 }, D, 0, 'linear', 1],
                [0.45, { ...ST, lArm: 1.4, rArm: 1.3, lean: 0.05 }, D],
                [0.95, { ...ST, lArm: 1.6, rArm: 1.6, lLeg: 0.5, rLeg: -0.3, lFold: 0.5, rFold: 0.4, lift: 60, tilt: -0.35 }, D - 24],
                [1.12, { ...ST, lArm: 1.5, rArm: 1.5, lLeg: 0.9, rLeg: 0.7, lFold: 0.3, rFold: 0.3, lift: 90, tilt: -1.2 }, D - 80, -6, 'easeInOut'],
                [1.28, { ...LIE, lLeg: 1.1, rLeg: 0.9, lFold: 0.4, rFold: 0.4, lift: -95, tilt: -2.0, lArm: 1.2, rArm: 1.1 }, D - 150, -14, 'easeIn'],
                [1.55, { ...LIE, lLeg: 0.2, rLeg: 0.3, lArm: 1.0, rArm: 0.9 }, D - 150, -14],
                [2.6, { ...LIE, lLeg: 0.1, rLeg: 0.22, lArm: 0.3, rArm: 0.3 }, D - 150, -14],
            ],
            layers: FRONT_DEF,
        }),
    },
};

// The flying mare: the snapmare's tie-up clip (a pivot, the arm, the throw over the shoulder) played 20% quicker with the man's arc 25% higher, so it is a different throw in time and
// size but shares the flip frames: ROUGH, logged as a miss (the by-the-arm grip is not drawn; the hands are the snapmare's head grip).
export function flyingMareClip(distance = 100) {
    const base = snapmareTieUpClip(distance), k = 0.8;
    const scale = keys => keys.map(f => ({ ...f, at: +(f.at * k).toFixed(3), pose: f.pose.lift > 0 ? { ...f.pose, lift: f.pose.lift * 1.25 } : f.pose }));
    return {
        ...base, id: 'flyingMare', duration: +(base.duration * k).toFixed(3),
        events: base.events.map(e => ({ ...e, at: +(e.at * k).toFixed(3) })),
        tracks: { attacker: { ...base.tracks.attacker, keyframes: scale(base.tracks.attacker.keyframes) }, defender: { ...base.tracks.defender, keyframes: scale(base.tracks.defender.keyframes) } },
        plants: (base.plants ?? []).map(p => ({ ...p, in: p.in.map(t => t * k), out: p.out.map(t => t * k) })),
        layers: (base.layers ?? []).map(l => ({ ...l, from: l.from * k, to: l.to * k })),
    };
}

// `distance`: the man's hips from the attacker's at the start, in the attacker's units; `dy`: his depth from the attacker's (the waistlock stands the attacker upstage). Returns a clip for MoveRuntime.register (id = the move's id).
export function matMoveClip(id, distance = 100, { attackerRigId, defenderRigId, dy = 0 } = {}) {
    if (id === 'flyingMare') return flyingMareClip(distance);
    const def = MAT_MOVES[id];
    if (!def?.build) throw new Error(`matMoveClip: no spec for ${id}`);
    const params = specFor({ gap: 0, ...(def.params ?? {}) }, { attackerRigId, defenderRigId });
    const spec = def.build(distance + params.gap);
    const tracks = { attacker: { keyframes: spec.att.map(b => kf(ST, b)) } };
    if (spec.def) tracks.defender = { keyframes: spec.def.map(([at, over, x, y = 0, ...rest]) => kf(ST, [at, over, x, y + dy, ...rest])) };   // `dy`: the man's depth from the attacker's at play(), so a pair a little off one line does not pop
    return { id, duration: spec.duration, events: spec.events, tracks, plants: [], ...(spec.layers ? { layers: [{ from: 0, to: spec.duration, order: spec.layers }] } : {}) };
}
