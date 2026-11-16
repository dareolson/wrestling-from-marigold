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
            duration:3.1,events:[{at:1.5,type:'impact'}],
            att:[
                [0,TIE,0,0,'linear',1],
                [.3,{...ST,lArm:.8,rArm:.7,lElbow:1,rElbow:1,crouch:.08},4],
                [.8,{...ST,lArm:.8,rArm:.7,lElbow:1,rElbow:1,crouch:.12,lLeg:.15,rLeg:-.12,lFold:.35,rFold:.35},D-90],
                [1.15,{...ST,lArm:.65,rArm:.6,lElbow:1,rElbow:1,crouch:.15,bend:.05,lLeg:.15,rLeg:-.12,lFold:.4,rFold:.4},D-90],
                [1.5,{...ST,lArm:.55,rArm:.5,lElbow:1.1,rElbow:1.1,crouch:.2,bend:.1,lLeg:.2,rLeg:-.15,lFold:.4,rFold:.4},D-94],
                [2.15,{...ST,lArm:.55,rArm:.5,lElbow:1.1,rElbow:1.1,crouch:.2,bend:.1,lLeg:.2,rLeg:-.15,lFold:.4,rFold:.4},D-94],
                [2.55,{...ST,lArm:.4,rArm:.35,lElbow:.8,rElbow:.8,crouch:.1},D-100],
                [3.1,ST,D-108],
            ],
            def:[
                [0,TIE,D,0,'linear',-1],
                [.3,{...ST,lArm:.8,rArm:.8,lElbow:1.2,rElbow:1.2,crouch:.08},D],
                [.8,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.18,crouch:.1,lFold:.3,rFold:.3},D+2],
                [1.15,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.35,crouch:.15,lFold:.35,rFold:.35},D+4],
                [1.5,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.65,crouch:.22,lFold:.45,rFold:.4},D+8],
                [1.85,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.5,crouch:.18,lFold:.4,rFold:.4},D+8],
                [2.15,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.6,crouch:.2,lFold:.4,rFold:.4},D+8],
                [2.55,{...ST,lArm:.6,rArm:.6,lElbow:1.3,rElbow:1.3,bend:.4,crouch:.12,lFold:.3,rFold:.3},D+12],
                [3.1,{...ST,lArm:.5,rArm:.5,lElbow:1.2,rElbow:1.2,bend:.25,crouch:.08},D+12],
            ],
            layers:[['defender','farArm'],['defender','nativeBody'],['attacker','farArm'],['attacker','nativeBody'],['defender','nearArm'],['attacker','nearArm']],
        }),
    },

    // Wrist control flows into the same worked wrist folded behind the back.
    wristlockHammerlock: {
        kind:'paired',hitEvent:'impact',damage:8,faceToFace:true,end:{def:'stagger',att:'stand'},shake:[110,.0018],
        build:D=>{
            const entry=MAT_MOVES.wristlock.build(D);
            const set={...ST,crouch:.12,bend:.12,lArm:.65,rArm:.7,lElbow:1.3,rElbow:1.2,lLeg:.1,rLeg:-.12,lFold:.25,rFold:.25};
            const trapped={...ST,crouch:.15,bend:.28,nearArm:-.3,nearElbow:-2.7,farArm:.65,farElbow:1.1,lFold:.28,rFold:.28};
            const relative=p=>{const q={...p};for(const [a,b]of [['lArm','nearArm'],['lElbow','nearElbow'],['rArm','farArm'],['rElbow','farElbow']]){q[b]=q[a];delete q[a]}return q};
            return {duration:4.8,events:entry.events,
                att:[...entry.att.filter(k=>k[0]<=1.5),
                    [1.85,{...set,lLeg:.35,rLeg:-.2},D-58,18],
                    [2.15,{...set,lLeg:-.15,rLeg:.3},D+8,26],
                    [2.34,{...set,lArm:.2,rArm:.2},D+48,14,'linear',1],
                    [2.36,{...set,lArm:.2,rArm:.2},D+48,14,'linear',-1],
                    [2.7,set,D+48,-8],[3.1,{...set,bend:.2,crouch:.18},D+44,-8],
                    [3.5,set,D+48,-8],[3.9,{...set,bend:.2,crouch:.18},D+44,-8],
                    [4.25,set,D+52,-8],[4.55,{...ST,lArm:.4,rArm:.4,lElbow:1,rElbow:1},D+64,-8],
                    [4.8,ST,D+76,-8]],
                def:[...entry.def.filter(k=>k[0]<=1.5).map(k=>[k[0],relative(k[1]),...k.slice(2)]),
                    [1.85,{...trapped,nearArm:.35,nearElbow:.7,bend:.4},D+8],
                    [2.15,{...trapped,nearArm:0,nearElbow:-1.3},D+8],
                    [2.7,trapped,D+8],[3.1,{...trapped,bend:.43,farArm:1.15,farElbow:.8},D+8],
                    [3.5,{...trapped,farArm:.8,farElbow:1.3},D+8],
                    [3.9,{...trapped,bend:.43,farArm:1.2,farElbow:.85},D+8],
                    [4.25,trapped,D+10],
                    [4.55,{...ST,bend:.3,crouch:.1,nearArm:.3,nearElbow:1,farArm:.6,farElbow:1.2},D-4],
                    [4.8,{...ST,bend:.25,crouch:.08,nearArm:.5,farArm:.5,nearElbow:1.2,farElbow:1.2},D-8]],
                layers:entry.layers,
                layerWindows:[{from:0,to:1.6,order:entry.layers},
                    // Carry the captured wrist across the camera side before circling behind.
                    {from:1.6,to:2.5,order:[['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm']]},
                    // The worked arm stays on the camera side of his body: elbow down past his back, forearm cranked up it.
                    {from:2.5,to:4.4,order:[['attacker','farArm'],['attacker','nativeBody'],['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],['attacker','nearArm']]},
                    {from:4.4,to:4.8,order:entry.layers}],
            };
        },
    },

    // T12.2: in the headlock (both facing the same way, he beside the man), Power: he drops to a hip and takes the man back over it to the mat; the headlock breaks, he is up first.
    headlockTakeover: {
        kind: 'paired', hitEvent: 'impact', damage: 9, faceToFace: false, end: { def: 'back', att: 'stand' }, shake: [150, 0.0025], foley: ['mat', 0.8],
        build: D => ({
            duration:3.2,events:[{at:1.2,type:'impact'}],
            att:[
                [0,HEADLOCK,0,0,'linear',1],
                [.3,{...HEADLOCK,crouch:.4,bend:.2,lFold:.7,rFold:.7},D-50],
                [.55,{...HEADLOCK,crouch:.55,bend:.3,lLeg:.2,rLeg:-.1,lFold:1,rFold:1.1},D-44],
                [.85,{...HEADLOCK,crouch:0,lift:-85,tilt:.6,bend:.1,lLeg:.3,rLeg:.2,lFold:.7,rFold:.9},D-140],
                [1.2,{...HEADLOCK,crouch:0,lift:-105,tilt:1.35,bend:0,lLeg:.1,rLeg:.2,lFold:.5,rFold:.7,rArm:1.7,rElbow:1.5},D-190,12],
                [1.7,{...HEADLOCK,crouch:0,lift:-105,tilt:1.35,bend:0,lLeg:.1,rLeg:.2,lFold:.5,rFold:.7,rArm:1.7,rElbow:1.5},D-190,12],
                [2.05,{...ST,crouch:0,lift:-95,tilt:.5,lLeg:1,rLeg:.3,lFold:1.6,rFold:2.1},D-195,12],
                [2.6,{...ST,crouch:1,lLeg:-.05,rLeg:-.05,lFold:2.3,rFold:2.3,bend:.2},D-205,12],
                [3.2,ST,D-220,12],
            ],
            def:[
                [0,{...ST,lArm:.9,rArm:.7,bend:.5,crouch:.2},D,0,'linear',1],
                [.3,{...ST,lArm:1,rArm:.8,bend:.5,crouch:.3},D],
                [.55,{...ST,lArm:1.2,rArm:1,bend:.55,crouch:.1,tilt:-.2,lift:8,lFold:.4,rFold:.4},D-20],
                [.85,{...ST,lArm:1.3,rArm:1.1,tilt:-.8,lift:15,bend:.2,lLeg:.4,rLeg:.3,lFold:.6,rFold:.6},D-30],
                [1.2,{...LIE,lArm:.9,rArm:.7,lElbow:1,rElbow:1},D-40,0,'easeIn'],
                [1.3,{...LIE,lift:-103,lLeg:.3,rLeg:.3,lFold:.45,rFold:.55,lArm:.9,rArm:.7,lElbow:1,rElbow:1},D-40],
                [1.45,{...LIE,lArm:.9,rArm:.7,lElbow:1,rElbow:1},D-40],
                [1.7,{...LIE,lArm:.8,rArm:.6,lElbow:1,rElbow:1},D-40],
                [2.05,LIE,D-40],[3.2,LIE,D-40],
            ],layers:FRONT_ATT,
        }),
    },

    // T12.3: tie-up, Down + Power. Arm capture, pivot, shoulder load and
    // kneeling forward throw; independently authored in flyingMareClip below.
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
                    [2.1,{...up,lean:-.1,crouch:1,bend:.15,lLeg:-.05,rLeg:-.05,lFold:2.35,rFold:2.35},m+36],
                    [2.5,{...up,lean:-.1,crouch:1,bend:.15,lLeg:-.05,rLeg:-.05,lFold:2.35,rFold:2.35},m+36],
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
            duration:2.0,events:[{at:.7,type:'over'}],
            att:[
                [0,LIE,0,0,'linear',1],
                [.25,{...LIE,lLeg:1.6,rLeg:1.5,lFold:1.9,rFold:1.9,tilt:-1.8,lift:-100,bend:.25,lArm:1.8,rArm:1.8,lElbow:1.2,rElbow:1.2},-8],
                [.55,{...ST,lLeg:1.7,rLeg:1.6,lFold:2.1,rFold:2.1,tilt:-2.8,lift:-30,bend:.4,lArm:2.2,rArm:2.2,lElbow:1.4,rElbow:1.4},-30],
                [.8,{...ST,lLeg:1.5,rLeg:1.4,lFold:2.1,rFold:2.1,tilt:-3.9,lift:-10,bend:.35,lArm:2,rArm:2,lElbow:1.4,rElbow:1.4},-55],
                [1.05,{...ST,lLeg:.7,rLeg:.6,lFold:1.8,rFold:1.8,tilt:-5.2,lift:-35,bend:.2,crouch:.3,lArm:1.2,rArm:1.2,lElbow:.7,rElbow:.7},-80],
                [1.35,{...ST,crouch:1,lLeg:-.05,rLeg:-.05,lFold:2.3,rFold:2.3,tilt:-4*PI2,lArm:.8,rArm:.8,lElbow:.6,rElbow:.6},-90],
                [1.7,{...ST,crouch:.3,lFold:.65,rFold:.65,tilt:-4*PI2},-90],
                [2,{...ST,tilt:-4*PI2},-90],
            ],
        }),
    },

    // T12.7: vs a staggered man, Back + Action. From his side: one leg hooked over the man's, one arm over the head, the other across the belly; he pulls back three times and the man is stretched.
    abdominalStretch: {
        kind: 'paired', hitEvent: 'squeeze', damage: 5, faceToFace: false, end: { def: 'prone', att: 'stand' }, hold: true, escapeStanding: true, shake: [80, 0.001],
        params:{kneeOverlap:3,attacker:{
            'george-roster-v1':{kneeOverlap:1.5},
            'kowalski-roster-v1':{kneeOverlap:2,kneeArtOffset:{x:2,y:2}},
            'guido-roster-v1':{kneeOverlap:0,kneeArtOffset:{x:2.5,y:2.5}},
        }},
        build: (D,params) => {
            const straight={...ST,lArm:0,rArm:0,lElbow:0,rElbow:0,lLeg:0,rLeg:0,lFold:0,rFold:0};
            const hold={...ST,crouch:.12,bend:.25,lArm:1.3,rArm:1.3,lElbow:1,rElbow:1};
            const pull={...hold,bend:.4};
            const man={...ST,crouch:.08,bend:.48,lArm:.35,rArm:.35,lElbow:.4,rElbow:.4};
            const strain={...man,bend:.82,lArm:.7,rArm:.7,lElbow:.35,rElbow:.35};
            return {
                duration:5,events:[...squeezes(1.2,1.9,2.6),{at:3.45,type:'shove'},{at:4,type:'matImpact'}],
                att:[
                    [0,TIE,0,0,'linear',1],
                    [.2,{...ST,crouch:.1,lArm:.4,rArm:.4},D-45,-28],
                    [.39,straight,D+16,-26,'linear',1],
                    [.41,straight,D+16,-26,'linear',-1],
                    [.85,hold,D+16,-10],
                    [1.2,pull,D+16,-10],[1.55,hold,D+16,-10],
                    [1.9,pull,D+16,-10],[2.25,hold,D+16,-10],
                    [2.6,pull,D+16,-10],[3,hold,D+16,-10],
                    [3.25,{...ST,crouch:.12,bend:.1,lArm:.8,rArm:.8,lElbow:1,rElbow:1},D+16,-10],
                    [3.35,{...ST,crouch:.12,bend:.1,lArm:.8,rArm:.8,lElbow:1,rElbow:1},D+16,-10],
                    [3.45,{...ST,crouch:.15,bend:.45,lArm:1.2,rArm:1.2,lElbow:.25,rElbow:.25},D+8,-10,'easeOut'],
                    [3.75,{...ST,crouch:.1,bend:.2,lArm:1,rArm:1,lElbow:.4,rElbow:.4},D+16,-10],
                    [4.05,ST,D+30,-10],[5,ST,D+30,-10],
                ],
                def:[
                    [0,{...ST,bend:.5,crouch:.25},D,0,'linear',-1],
                    [.45,{...ST,bend:.25,crouch:.08},D],
                    [.85,man,D],
                    [1.2,strain,D],[1.55,man,D],[1.9,{...strain,bend:.88},D],[2.25,man,D],
                    [2.6,{...strain,bend:.94},D],[3,{...man,bend:.55},D],
                    [3.25,{...ST,bend:.25,crouch:.12,lArm:.3,rArm:.3},D+2],
                    [3.45,{...ST,bend:.45,crouch:.15,tilt:.18,lift:-5,lLeg:.5,rLeg:-.15,lFold:.5,rFold:.35,lArm:.8,rArm:.8},D-16,0,'easeIn'],
                    [3.68,{...ST,tilt:.65,lift:-28,bend:.2,lLeg:.35,rLeg:.1,lFold:.4,rFold:.5,lArm:1.5,rArm:1.5,lElbow:.25,rElbow:.25},D-42,0,'linear'],
                    [3.85,{...ST,tilt:1.15,lift:-72,bend:.1,lLeg:.2,rLeg:.2,lFold:.3,rFold:.35,lArm:1.4,rArm:1.4,lElbow:.3,rElbow:.3},D-70,0,'linear'],
                    [4,{...LIE,tilt:PI2,lArm:.8,rArm:.8,lElbow:1.3,rElbow:1.3},D-88,0,'easeIn'],
                    [4.1,{...LIE,tilt:PI2,lift:-102,lArm:.6,rArm:.6,lElbow:.9,rElbow:.9,lLeg:.2,rLeg:.2,lFold:.45,rFold:.45},D-90],
                    [4.25,{...LIE,tilt:PI2,lArm:.6,rArm:.65,lElbow:1.1,rElbow:1.1},D-90],
                    // One arm lowers while the other remains gathered under the chest.
                    [4.65,{...LIE,tilt:PI2,lArm:.4,rArm:.95,lElbow:1.1,rElbow:1.7},D-90],
                    [4.85,{...LIE,tilt:PI2,lArm:.4,rArm:1.05,lElbow:1.15,rElbow:1.85},D-90],
                    [5,{...LIE,tilt:PI2,lArm:.4,rArm:1.1,lElbow:1.2,rElbow:1.9},D-90],
                ],
                layers:[['attacker','farArm'],['attacker','nativeBody'],['defender','farArm'],['defender','nativeBody'],['attacker','nearArm'],['defender','nearArm']],
                layerWindows:[
                    {from:0,to:.64,order:[['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm'],['defender','farArm'],['defender','nativeBody'],['defender','nearArm']]},
                    {from:.64,to:.72,order:[['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm'],['defender','farArm'],['defender','nativeBody'],['attacker','farShin'],['defender','nearArm']]},
                    {from:.72,to:3.36,order:[['attacker','farArm'],['attacker','nativeBody'],['defender','farArm'],['defender','nativeBody'],['attacker','farShin'],['attacker','nearArm'],['defender','nearArm']]},
                    {from:3.36,to:5,order:[['attacker','farArm'],['attacker','nativeBody'],['defender','farArm'],['defender','nativeBody'],['attacker','nearArm'],['defender','nearArm']]},
                ],
                floorContacts:[{role:'attacker',point:'nearSole',in:[.45,.65],out:[3.35,3.55]}],
                legContacts:[{role:'attacker',side:'far',to:{role:'defender',joint:'Hip',side:'far',along:.8,minAlong:.1,maxReach:.8,x:-4},bend:'forward',kneeOverlap:params?.kneeOverlap??3,...(params?.kneeArtOffset?{kneeArtOffset:params.kneeArtOffset}:{}),sweep:{from:.45,apex:.7,to:1,x:26,y:-10},releaseSweep:{from:3,apex:3.3,to:3.55,x:26,y:-10},in:[.45,.65],out:[3.35,3.55]}],
            };
        },
    },

    // T12.8: next to a man on his back, Up + Action. He drops to a seat at the man's side and locks his legs round the waist; three squeezes; he rises, the man stays on his back.
    bodyScissors: {
        kind: 'paired', hitEvent: 'squeeze', damage: 4, faceToFace: true, end: { def: 'back', att: 'stand' }, hold: true, shake: [70, 0.0009],
        build: D => {
            const sit = { lift:-90,crouch:0,lFold:.18,rFold:.3,lLeg:1.4,rLeg:1.5,lean:0,bend:-.12,lArm:.1,rArm:-.3,lElbow:.55,rElbow:.45 };
            const lock = { ...sit, lFold:.35,rFold:.5 };
            const sq = { ...lock, bend:-.18 };
            const squeezed = { ...LIE, bend:.12,lArm:.55,rArm:.65,lElbow:1.4,rElbow:1.4 };
            return {
                duration: 4.3, events: squeezes(1.5, 2.1, 2.7),
                att: [
                    [0, ST, 0, 0, 'linear', 1],
                    [.35,{...ST,crouch:.7,lFold:1.3,rFold:1.3,bend:.2},D-78,6],
                    [.85,sit,D-62,10],
                    [1.2,lock,D-62,10],[1.5,sq,D-62,10],[1.8,lock,D-62,10],[2.1,sq,D-62,10],[2.4,lock,D-62,10],[2.7,sq,D-62,10],[3.0,lock,D-62,10],
                    [3.35,sit,D-70,10],
                    [3.8,{...ST,crouch:1,lLeg:-.05,rLeg:-.05,lFold:2.3,rFold:2.3,bend:.25},D-78,10],
                    [4.3,{...ST,lFold:.08,rFold:.08},D-82,10],
                ],
                def: [
                    [0, LIE, D, 0, 'linear', -1],
                    [1.2, LIE, D],
                    [1.5, squeezed, D], [1.8, { ...LIE, bend: 0.1, lArm: 0.8 }, D],
                    [2.1, squeezed, D], [2.4, { ...LIE, bend: 0.1, lArm: 0.8 }, D],
                    [2.7, squeezed, D], [3.3, LIE, D],
                    [4.3, LIE, D],
                ],
                layers: [['attacker','farLeg'],['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],['attacker','farArm'],['attacker','torso'],['attacker','head'],['attacker','nearLeg'],['attacker','nearArm']],
                legContacts: [
                    {role:'attacker',side:'far',to:{role:'defender',joint:'Hip',side:'far',torso:.15,y:-9},bend:'up',in:[.85,1.2],out:[3,3.35]},
                    {role:'attacker',side:'near',to:{role:'defender',joint:'Hip',side:'near',torso:.15,y:9},bend:'down',in:[.85,1.2],out:[3,3.35]},
                ],
            };
        },
    },
    // T12.9: at the legs of a man on his back, Back + Finisher. He steps in between the boots, hooks a leg through and leans back with the man's legs crossed in his; three pulls; he lets go and rises.
    indianDeathlock: {
        kind: 'paired', hitEvent: 'squeeze', damage: 5, faceToFace: true, end: { def: 'back', att: 'stand' }, hold: true, shake: [80, 0.001],
        build: D => {
            // Seated deathlock: the raised l-knee is the visible fulcrum.
            // Receiver's first ankle passes behind it, the second crosses the
            // shin. The attacker settles back only after the legs are threaded.
            const lock = {...ST,crouch:0,lift:-80,tilt:-.5,lLeg:1.9,rLeg:1.2,lFold:2.3,rFold:2.3,lArm:.5,rArm:.55,lElbow:.8,rElbow:.85};
            const pull = {...lock,tilt:-.62,lArm:.6,lElbow:1};
            const raised = {...LIE,lLeg:1.1,rLeg:.85,lFold:1.2,rFold:1.1,lArm:.6,rArm:.4,lElbow:1.1,rElbow:1};
            const wrench = {...raised,bend:.12,lArm:.75,rArm:.45,lElbow:1.2,rElbow:1};
            // Hips stay on the mat and the legs stay threaded. Only the chest
            // curls up: a cocked fist, a short desperate reach, then the pull
            // folds him back down before he can get close enough to hit.
            const cock = {...raised,bend:.7,lArm:.8,lElbow:1.5,rArm:.8,rElbow:1.5};
            const miss = {...raised,bend:1.05,lArm:.8,lElbow:1.5,rArm:.8,rElbow:1.5};
            return {
                duration:5.1,events:squeezes(2.0,2.65,3.3),
                att:[
                    [0,ST,0,0,'linear',1],
                    [.4,{...ST,crouch:.6,lFold:1,rFold:1,bend:.25,lArm:1.1,rArm:1.1},D-100],
                    [.8,{...ST,crouch:.6,lLeg:1.2,rLeg:-.1,lFold:.5,rFold:1.4,bend:.25,lArm:1.2,rArm:1},D-90,6],
                    [1.2,{...lock,lift:-65,tilt:-.15,lLeg:1.5,lFold:1.8},D-90,10],
                    [1.65,lock,D-90,10],[2,pull,D-90,10],[2.3,lock,D-90,10],
                    [2.65,pull,D-90,10],[2.95,lock,D-90,10],[3.3,pull,D-90,10],[3.65,lock,D-90,10],
                    [4,{...lock,tilt:-.2,lLeg:1.5,rLeg:1.1,lFold:1.5,rFold:1.5},D-98,10],
                    [4.55,{...ST,crouch:1,lLeg:-.05,rLeg:-.05,lFold:2.3,rFold:2.3,bend:.2},D-106,10],
                    [5.1,ST,D-110,10],
                ],
                def:[
                    [0,LIE,D,0,'linear',-1],
                    [.65,{...LIE,lLeg:.6,rLeg:.4,lFold:.6,rFold:.5},D],
                    [1.2,raised,D],[1.65,{...raised,bend:.35,lArm:.7,rArm:.3},D],
                    [2,wrench,D],
                    [2.14,cock,D],[2.3,miss,D,0,'easeOut'],
                    [2.5,{...cock,bend:.4},D],[2.65,wrench,D],
                    [2.88,cock,D],[3.08,{...miss,bend:.9},D,0,'easeOut'],
                    [3.3,wrench,D],[3.65,{...raised,bend:.05,lArm:.3,rArm:.15},D],
                    [4.25,LIE,D],[5.1,LIE,D],
                ],
                layers:[['defender','farArm'],['defender','torso'],['defender','head'],['defender','farLeg'],
                    ['attacker','rLeg'],['attacker','farArm'],['attacker','torso'],['attacker','head'],
                    ['attacker','lLeg'],['defender','nearLeg'],['attacker','lShin'],['attacker','lThigh'],['defender','nearArm'],['attacker','nearArm']],
                legContacts:[
                    {role:'defender',side:'far',to:{role:'attacker',joint:'Knee',side:'near',channel:'l',x:8,y:-5},bend:'up',in:[.8,1.35],out:[3.65,4.15]},
                    {role:'defender',side:'near',to:{role:'attacker',joint:'Knee',side:'near',channel:'l',along:.65,x:-5,y:5},bend:'up',in:[1.15,1.65],out:[3.65,4.15]},
                ],
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
                [1.12,{...ST,crouch:.1,tilt:-.65,lift:-30,lArm:1,rArm:1,lElbow:.8,rElbow:.8},D-48,6],
                [1.28, { ...LIE, lArm: 0.9, rArm: 0.9, lElbow: 0.9, rElbow: 0.9, lLeg: 0.2, rLeg: 0.1 }, D - 66, 14, 'easeIn'],
                [2.0, { ...LIE, lArm: 0.3, rArm: 0.3, lLeg: 0.1, rLeg: 0.2 }, D - 68, 14],
                [2.6, { ...LIE, lArm: 0.3, rArm: 0.3, lLeg: 0.1, rLeg: 0.2 }, D - 68, 14],
            ],
            def: [
                [0, { ...ST, lArm: 1.2, rArm: 1.0 }, D, 0, 'linear', 1],
                [0.45, { ...ST, lArm: 1.4, rArm: 1.3, lean: 0.05 }, D],
                [0.95, { ...ST, lArm: 1.6, rArm: 1.6, lLeg: 0.5, rLeg: -0.3, lFold: 0.5, rFold: 0.4, lift: 60, tilt: -0.35 }, D - 24],
                [1.12, { ...ST, lArm: 1.5, rArm: 1.5, lLeg: 0.9, rLeg: 0.7, lFold: 0.3, rFold: 0.3, lift: 90, tilt: -1.2 }, D - 80, -6, 'easeInOut'],
                [1.28,{...LIE,lLeg:.25,rLeg:.25,lFold:.3,rFold:.3,lift:-110,tilt:-PI2,lArm:.8,rArm:.8},D-150,-14,'easeIn'],
                [1.55, { ...LIE, lLeg: 0.2, rLeg: 0.3, lArm: 1.0, rArm: 0.9 }, D - 150, -14],
                [2.6, { ...LIE, lLeg: 0.1, rLeg: 0.22, lArm: 0.3, rArm: 0.3 }, D - 150, -14],
            ],
            layers: FRONT_DEF,
        }),
    },
};

// Arm-and-shoulder throw, authored separately from the snapmare. Reference:
// Robbins/Gotch, How to Wrestle, printed pp.32–33: wrist capture, turn under
// the arm, shoulder load, then forward pull. No head-grip or retimed flip.
export function flyingMareClip(distance = 100) {
    const knee = {...ST,crouch:1,lLeg:-.05,rLeg:-.05,lFold:2.35,rFold:2.35,bend:.4,lArm:1,rArm:.8,lElbow:1,rElbow:1.1};
    const landed = {...LIE,tilt:3*PI2};
    const att = [
        [0,TIE,0,0,'easeOut',1],
        [.19,{...ST,lArm:0,rArm:0,lElbow:0,rElbow:0,lLeg:0,rLeg:0,lFold:0,rFold:0},0,0,'linear',1],
        [.2,{...ST,lArm:0,rArm:0,lElbow:0,rElbow:0,lLeg:0,rLeg:0,lFold:0,rFold:0},0,0,'linear',-1],
        [.4,{...TIE,lArm:.8,rArm:.7,lElbow:1,rElbow:1},4],
        [.75,{...ST,crouch:.45,bend:.25,lLeg:.15,rLeg:-.1,lFold:.6,rFold:.7,lArm:.8,rArm:.7,lElbow:1,rElbow:1.1},8],
        [1.05,knee,10],[1.65,{...knee,lArm:.5,rArm:.4},12],
        [2.05,{...ST,crouch:.6,lFold:1.5,rFold:1.5,bend:.2},12],
        [2.4,ST,10],
    ];
    const def = [
        [0,TIE,distance,0,'easeOut',-1],
        [.4,{...TIE,bend:.2,crouch:.1},62],
        [.75,{...ST,bend:.35,crouch:.2,tilt:.25,lArm:1.2,rArm:.4,lElbow:.4,rElbow:.8},40],
        [.95,{...ST,tilt:.8,lift:45,bend:.2,lLeg:.2,rLeg:.1,lFold:.55,rFold:.7,lArm:1.3,rArm:.5},15,0,'linear'],
        [1.1,{...ST,tilt:1.5,lift:75,bend:.15,lLeg:.3,rLeg:.2,lFold:.7,rFold:.8,lArm:1.1,rArm:.7},-15,0,'linear'],
        [1.25,{...ST,tilt:2.3,lift:60,bend:.1,lLeg:.3,rLeg:.2,lFold:.8,rFold:.9,lArm:.9,rArm:.8},-45,0,'linear'],
        [1.4,{...ST,tilt:3.1,lift:45,bend:.05,lLeg:.25,rLeg:.2,lFold:.7,rFold:.8,lArm:.8,rArm:.8},-70,0,'linear'],
        [1.55,{...ST,tilt:4,lift:-30,lLeg:.2,rLeg:.15,lFold:.45,rFold:.6,lArm:.7,rArm:.7},-95,0,'linear'],
        [1.6,{...ST,tilt:4.4,lift:-65,lLeg:.15,rLeg:.2,lFold:.3,rFold:.5,lArm:.5,rArm:.5},-103,0,'linear'],
        [1.65,landed,-110,0,'easeIn'],[2.4,landed,-110],
    ];
    return {id:'flyingMare',duration:2.4,events:[{at:1.65,type:'impact'}],
        tracks:{attacker:{keyframes:att.map(b=>kf(ST,b))},defender:{keyframes:def.map(b=>kf(ST,b))}},
        grips:[
            {role:'attacker',arm:'l',to:{role:'defender',joint:'Wrist',side:'same'},in:[.3,.45],out:[.95,1.15],natural:true},
            {role:'attacker',arm:'r',to:{role:'defender',joint:'Shoulder',side:'other'},in:[.3,.45],out:[.95,1.12],natural:true},
        ],
        floorContacts:[{role:'attacker',point:'nearKnee',in:[.8,1.05],out:[1.65,1.95]}],
        layers:[{from:0,to:1.15,order:FRONT_ATT},{from:1.15,to:2.4,order:FRONT_DEF}],
    };
}

// `distance`: the man's hips from the attacker's at the start, in the attacker's units; `dy`: his depth from the attacker's (the waistlock stands the attacker upstage). Returns a clip for MoveRuntime.register (id = the move's id).
export function matMoveClip(id, distance = 100, { attackerRigId, defenderRigId, dy = 0, delay = 0 } = {}) {
    if (id === 'flyingMare') return flyingMareClip(distance);
    const def = MAT_MOVES[id];
    if (!def?.build) throw new Error(`matMoveClip: no spec for ${id}`);
    const params = specFor({ gap: 0, ...(def.params ?? {}) }, { attackerRigId, defenderRigId });
    const spec = def.build(distance + params.gap, params);
    if(id==='leapfrog'&&delay>0){
        for(let i=1;i<spec.att.length;i++)spec.att[i][0]=+(spec.att[i][0]+delay).toFixed(4);
        spec.att.splice(1,0,[+delay.toFixed(4),ST,0]);
        spec.events=spec.events.map(e=>({...e,at:+(e.at+delay).toFixed(4)}));spec.duration=+(spec.duration+delay).toFixed(4);
    }
    // Finish standing before handing to the idle/stagger controller; it must
    // not erase a deep crouch or a negative lift in a single frame.
    if(def.end.att==='stand'&&spec.att.at(-1)[1].crouch>.1&&id!=='bodyScissors'&&id!=='indianDeathlock'){
        spec.duration=+(spec.duration+.4).toFixed(3);
        const last=spec.att.at(-1);spec.att.push([spec.duration,{...ST,lFold:.08,rFold:.08,tilt:id==='backwardRoll'?-2*Math.PI:0},last[2],last[3]??0]);
        if(spec.def){const d=spec.def.at(-1);spec.def.push([spec.duration,def.end.def==='stagger'?{...ST,bend:.18,crouch:.08,lFold:.2,rFold:.2}:d[1],d[2],d[3]??0]);}
    }
    const grip=(arm,joint,side,start,full,hold,end,extra={})=>({role:'attacker',arm,to:{role:'defender',joint,side,...extra},in:[start,full],out:[hold,end],natural:true});
    const grips={
        wristlock:[
            // Place the worked near wrist first, then both hands follow that
            // same forearm. Separate bodies leave the grip and shoulder visible.
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Hip',side:'other',above:.75},in:[.15,.4],out:[.6,1.05],natural:true},
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Hip',side:'other',above:.5},in:[.6,1.05],out:[2.15,2.65],natural:true},
            grip('near','Wrist','same',.2,.45,2.15,2.65),
            grip('far','Elbow','other',.2,.45,2.15,2.65,{fore:.9}),
            {role:'defender',arm:'far',to:{role:'defender',joint:'Elbow',side:'other',fore:.6},in:[.75,1.1],out:[2.15,2.65],natural:true,afterLegs:true},
        ],
        wristlockHammerlock:[
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Hip',side:'other',above:.6},in:[.15,.4],out:[1.5,1.5],natural:true},
            {role:'defender',arm:'near',to:{role:'defender',joint:'Hip',side:'same',above:.5,offset:{x:-18,y:0}},in:[1.5,2.65],out:[2.65,2.95],blendFromHand:true,reverseElbow:true},
            // Then crank it: the elbow points down past his back and the forearm folds up his spine (Derek, 2026-11-15). The swing above keeps
            // the low path; a straight line to this high target passes the shoulder and the elbow pops.
            {role:'defender',arm:'near',to:{role:'defender',joint:'Shoulder',side:'same',limb:{upper:.5,fore:2.94}},in:[2.6,2.95],out:[4.05,4.45],blendFromHand:true,reverseElbow:true},
            grip('near','Wrist','same',.2,.45,4.05,4.45),
            grip('far','Elbow','other',.4,.6,1.5,1.8,{fore:.9}),
            grip('far','Elbow','other',1.7,2.3,4.05,4.45,{fore:.15}),
            {role:'defender',arm:'far',to:{role:'defender',joint:'Elbow',side:'other',fore:.6},in:[.75,1.1],out:[1.5,1.8],natural:true,afterLegs:true},
        ],
        headlockTakeover:[grip('l','Shoulder','other',0,.1,1.7,2.05),grip('r','Shoulder','same',.4,.6,1.7,2.05)],
        testOfStrength:[grip('l','Wrist','same',.15,.4,2.45,2.85),grip('r','Wrist','same',.15,.4,2.45,2.85)],
        abdominalStretch:[
            {role:'defender',arm:'far',to:{role:'attacker',joint:'Neck',side:'same'},in:[.5,.9],out:[3,3.3],natural:true},
            grip('far','Hip','other',.5,.9,3,3.3,{above:.6}),
            // Set the hand on the outside shoulder before closing over the neck.
            grip('near','Shoulder','same',.43,.57,.6,.72),
            grip('near','Neck','same',.6,.84,3,3.3),
            // The free hand pries at the actual controlling forearm, lets go
            // under the wrench, and returns for another unsuccessful attempt.
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Elbow',side:'same',fore:.65},in:[1.02,1.18],out:[1.35,1.6],natural:true,afterLegs:true},
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Elbow',side:'same',fore:.65},in:[1.7,1.88],out:[2.05,2.3],natural:true,afterLegs:true},
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Elbow',side:'same',fore:.65},in:[2.38,2.58],out:[2.8,3],natural:true,afterLegs:true},
            grip('near','Shoulder','same',3.1,3.32,3.48,3.65),
            grip('far','Shoulder','other',3.1,3.32,3.48,3.65),
            // Catch and buckle without lifting the palms during the bounce.
            // Ease into the prone resting arms before the grounded/get-up handoff.
            {role:'defender',arm:'near',to:{role:'defender',joint:'Floor',side:'same',ahead:14},in:[3.7,3.85],out:[4.25,4.65],natural:true},
            {role:'defender',arm:'far',to:{role:'defender',joint:'Floor',side:'same',ahead:4},in:[3.7,3.85],out:[4.35,4.85],natural:true},
        ],
        indianDeathlock:[
            grip('l','Ankle','same',.2,.45,1.0,1.45),
            grip('r','Ankle','other',.2,.45,.8,1.2),
            {...grip('near','Ankle','other',1.35,1.65,3.65,4.1),afterLegs:true},
            {...grip('far','Ankle','other',1.35,1.65,3.65,4.1),afterLegs:true},
            // Reach only: the held man cannot cover the distance and this
            // emits no strike event. Resolve before his leg contacts redraw.
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Hip',side:'other',above:.75},in:[2.14,2.3],out:[2.32,2.5],natural:true},
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Hip',side:'other',above:.75},in:[2.88,3.08],out:[3.1,3.3],natural:true},
        ],
        backdropSuplex:[grip('l','Hip','same',.05,.35,.98,1.15),grip('r','Hip','other',.05,.35,.98,1.15)],
    }[id]??[];
    const plant=(role,leg,start,full,hold,end)=>({role,leg,in:[start,full],out:[hold,end],kneeRestart:true});
    const plants={
        wristlockHammerlock:[plant('attacker','r',.8,1,1.5,1.65),plant('defender','r',.3,.5,4.1,4.5)],
        wristlock:[plant('attacker','r',.8,1,2.1,2.7),plant('defender','r',.3,.5,2.1,2.7)],
        headlockTakeover:[plant('attacker','r',.05,.12,.35,.5)],
        testOfStrength:[plant('attacker','r',.4,.55,2.5,2.9)],
        leapfrog:[plant('attacker','r',0,.05,.12+delay,.2+delay),plant('attacker','l',.85+delay,.92+delay,.98+delay,1+delay)],
        backdropSuplex:[plant('attacker','r',.3,.45,.75,.94)],
    }[id]??[];
    const tracks = { attacker: { keyframes: spec.att.map(b => kf(ST, b)) } };
    if (spec.def) tracks.defender = { keyframes: spec.def.map(([at, over, x, y = 0, ...rest]) => kf(ST, [at, over, x, y + dy, ...rest])) };   // `dy`: the man's depth from the attacker's at play(), so a pair a little off one line does not pop
    return { id, duration: spec.duration, events: spec.events, tracks, plants, grips, floorContacts:spec.floorContacts??[], legContacts:spec.legContacts??[],
        ...(id==='backdropSuplex'?{carry:[{role:'defender',on:'attacker',tilt:1,in:[.4,.65],out:[.98,1.18],slide:{along:55,in:[.5,.95]}}]}:{}),
        ...(id==='backwardRoll'?{floorContacts:[{role:'attacker',point:'upperBack',in:[.2,.35],out:[.8,1.05]}]}:{}),
        ...(spec.layers ? { layers: spec.layerWindows??[{ from: 0, to: spec.duration, order: spec.layers }] } : {}) };
}
