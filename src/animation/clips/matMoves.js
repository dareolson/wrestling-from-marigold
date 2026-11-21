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
const kf = (base, [at, over, x = 0, y = 0, ease = 'easeInOut', facing, parts = {}]) => ({ at, ease, pose: shinsFromFolds({ ...base, ...over }), transform: { x, y }, ...(facing === undefined ? {} : { facing }), parts });
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
            duration:4.5,events:[{at:1.5,type:'impact'}],
            att:[
                [0,TIE,0,0,'linear',1],
                [.3,{...ST,lArm:.8,rArm:.7,lElbow:1,rElbow:1,crouch:.08},4],
                [.8,{...ST,lArm:.8,rArm:.7,lElbow:1,rElbow:1,crouch:.12,lLeg:.15,rLeg:-.12,lFold:.35,rFold:.35},D-90],
                [1.15,{...ST,lArm:.65,rArm:.6,lElbow:1,rElbow:1,crouch:.15,bend:.05,lLeg:.15,rLeg:-.12,lFold:.4,rFold:.4},D-90],
                [1.5,{...ST,lArm:.55,rArm:.5,lElbow:1.1,rElbow:1.1,crouch:.2,bend:.1,lLeg:.2,rLeg:-.15,lFold:.4,rFold:.4},D-94],
                [2.15,{...ST,lArm:.55,rArm:.5,lElbow:1.1,rElbow:1.1,crouch:.2,bend:.1,lLeg:.2,rLeg:-.15,lFold:.4,rFold:.4},D-94],
                [2.35,{...ST,lArm:.55,rArm:.5,lElbow:1.1,rElbow:1.1,crouch:.18,bend:.08,lLeg:.2,rLeg:-.15,lFold:.4,rFold:.4},D-94],
                [2.55,{...ST,lArm:.4,rArm:.35,lElbow:1.45,rElbow:1.4,crouch:.25,bend:.25,lLeg:.2,rLeg:-.15,lFold:.45,rFold:.4},D-100,0,'easeOut'],
                [2.78,{...ST,lArm:.4,rArm:.35,lElbow:1.1,rElbow:1.1,crouch:.15,bend:.12},D-102],
                [3.1,ST,D-108],[4.5,ST,D-108],
            ],
            def:[
                [0,TIE,D,0,'linear',-1],
                [.3,{...ST,lArm:.8,rArm:.8,lElbow:1.2,rElbow:1.2,crouch:.08},D],
                [.8,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.18,crouch:.1,lFold:.3,rFold:.3},D+2],
                [1.15,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.35,crouch:.15,lFold:.35,rFold:.35},D+4],
                [1.5,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.65,crouch:.22,lFold:.45,rFold:.4},D+8],
                // Pull his weight back against the captured wrist; the free hand
                // pushes into the controlling forearm while the legs brace behind.
                [1.85,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:-.08,crouch:.22,lLeg:-.38,rLeg:-.2,lFold:.5,rFold:.45},D+20],
                [2.15,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.58,crouch:.26,lLeg:-.22,rLeg:-.14,lFold:.62,rFold:.48},D+13],
                [2.35,{...ST,lArm:.9,rArm:.9,lElbow:1.2,rElbow:1.2,bend:.08,crouch:.2,lLeg:-.32,rLeg:-.18,lFold:.45,rFold:.4},D+20],
                [2.55,{...ST,lArm:.6,rArm:.6,lElbow:1.3,rElbow:1.3,bend:.85,crouch:.34,lLeg:.04,rLeg:-.16,lFold:.85,rFold:.55},D+6,0,'easeOut',undefined,{head:'pain'}],
                [2.78,{...ST,lArm:.6,rArm:.6,lElbow:1.3,rElbow:1.3,bend:.65,crouch:.24,lLeg:-.04,rLeg:-.1,lFold:.6,rFold:.45},D+9,0,'easeInOut',undefined,{head:'pain'}],
                // Back away in short guarded steps, keeping the same sore wrist.
                [3.1,{...ST,nearArm:.7,nearElbow:1.4,farArm:.9,farElbow:1.6,bend:.4,crouch:.16,lLeg:-.2,rLeg:.12,lFold:.45,rFold:.3},D+16,0,'easeInOut',undefined,{head:'pain',farForearm:'grip'}],
                [3.35,{...ST,nearArm:.7,nearElbow:1.4,farArm:.9,farElbow:1.6,bend:.32,crouch:.14,lLeg:-.42,rLeg:.18,lFold:.55,rFold:.2},D+32,0,'linear',undefined,{head:'pain',farForearm:'grip'}],
                [3.65,{...ST,nearArm:.7,nearElbow:1.4,farArm:.9,farElbow:1.6,bend:.38,crouch:.18,lLeg:.16,rLeg:-.38,lFold:.2,rFold:.55},D+48,0,'linear',undefined,{head:'pain',farForearm:'grip'}],
                [3.95,{...ST,nearArm:.7,nearElbow:1.4,farArm:.9,farElbow:1.6,bend:.3,crouch:.14,lLeg:-.3,rLeg:.12,lFold:.4,rFold:.2},D+63,0,'linear',undefined,{head:'pain',farForearm:'grip'}],
                [4.25,{...ST,nearArm:.7,nearElbow:1.4,farArm:.9,farElbow:1.6,bend:.35,crouch:.13,lLeg:-.12,rLeg:.12,lFold:.3,rFold:.25},D+68,0,'easeOut',undefined,{head:'pain',farForearm:'grip'}],
                [4.5,{...ST,nearArm:.7,nearElbow:1.4,farArm:.9,farElbow:1.6,bend:.3,crouch:.1,lFold:.25,rFold:.25},D+68,0,'easeInOut',undefined,{head:'pain',farForearm:'grip'}],
            ],
            layers:[['defender','farArm'],['defender','nativeBody'],['attacker','farArm'],['attacker','nativeBody'],['defender','nearArm'],['attacker','nearArm']],
            layerWindows:[
                {from:0,to:3,order:[['defender','farArm'],['defender','nativeBody'],['attacker','farArm'],['attacker','nativeBody'],['defender','nearArm'],['attacker','nearArm']]},
                // Keep the complete back arm behind the torso; its gripping hand
                // meets the sore wrist outside the body silhouette.
                {from:3,to:4.5,order:[['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm'],['defender','farArm'],['defender','nativeBody'],['defender','nearArm']]},
            ],
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

    // T12.2: in the headlock (both facing the same way, he beside the man), Power: he earns the wrap first: a hop, the camera-side arm all the way up over the
    // man's head and swung back down around his neck (Derek, Nov 17: no hot-swapped arm), then the drop to a hip and the man back over it to the mat; up first.
    headlockTakeover: {
        kind:'paired',hitEvent:'impact',damage:9,faceToFace:false,end:{def:'stagger',att:'stand'},shake:[150,.0025],foley:['mat',.8],
        build:D=>{
            const grip={farForearm:'grip'},free={farForearm:'base'};
            const hold={...HEADLOCK,crouch:.12,bend:.05,nearArm:.45,nearElbow:1.4,farArm:1.0,farElbow:1.6};
            return {duration:5.15,events:[{at:1.65,type:'impact'}],
                att:[
                    [0,hold,0,0,'linear',1,free],
                    // Guide the head as the knees load; the reach begins before takeoff.
                    [.18,{...hold,crouch:.35,lFold:.85,rFold:.8,nearArm:1.9,nearElbow:.7,farArm:1.1,farElbow:1.3},D-42,0,'easeInOut',undefined,free],
                    // The wrapping arm clears the crown on the way up, then closes while still airborne.
                    [.3,{...hold,crouch:.05,lift:48,lLeg:.35,rLeg:-.25,lFold:.7,rFold:.75,nearArm:2.35,nearElbow:.55,farArm:1.2,farElbow:1.4,lean:.1},D-44,0,'easeOut',undefined,free],
                    [.38,{...hold,crouch:0,lift:60,lLeg:.45,rLeg:-.35,lFold:.7,rFold:.8,nearArm:1.95,nearElbow:.85,farArm:1.2,farElbow:1.4,lean:.1},D-44,0,'linear',undefined,free],
                    [.48,{...hold,crouch:.08,lift:36,lLeg:.35,rLeg:-.25,lFold:.6,rFold:.6,nearArm:1.15,nearElbow:1.4,farArm:1.1,farElbow:1.5,lean:.15},D-43,0,'easeIn',undefined,free],
                    [.6,{...hold,crouch:.2,lift:0,lLeg:.2,rLeg:-.15,lFold:.5,rFold:.45},D-42,0,'easeOut',undefined,free],
                    [.75,{...hold,crouch:.25,lLeg:.15,rLeg:-.15,lFold:.5,rFold:.45},D-42,0,'easeOut',undefined,grip],
                    [1.0,{...hold,crouch:.4,bend:.12,lLeg:.3,rLeg:-.2,lFold:.8,rFold:.7},D-40,0,'easeInOut',undefined,grip],
                    [1.3,{...hold,crouch:.08,bend:.05,tilt:.72,lift:-66,lLeg:.4,rLeg:.15,lFold:1.1,rFold:.85},D-48,0,'easeInOut',undefined,grip],
                    // Open the torso angle and lower the crook so the heads separate on landing.
                    [1.65,{...hold,crouch:0,bend:0,tilt:.82,lift:-112,nearArm:.25,nearElbow:1.85,lLeg:.05,rLeg:.25,lFold:.25,rFold:.65},D-52,0,'easeOut',undefined,grip],
                    // Settle long on his side, keep the clasp while the receiver tries to peel it.
                    [2.05,{...hold,crouch:0,bend:0,tilt:.82,lift:-112,nearArm:.25,nearElbow:1.85,lLeg:-.08,rLeg:.2,lFold:.18,rFold:.55},D-52,0,'easeInOut',undefined,grip],
                    [2.45,{...hold,crouch:0,bend:.2,tilt:.65,lift:-95,nearArm:.3,nearElbow:1.9,lLeg:-.12,rLeg:.35,lFold:1.1,rFold:.8},D-52,0,'easeInOut',undefined,grip],
                    [3.0,{...hold,crouch:0,bend:.35,tilt:.6,lift:-80,nearArm:.25,nearElbow:1.85,lLeg:-.15,rLeg:.4,lFold:1.55,rFold:.75},D-52,0,'easeInOut',undefined,grip],
                    [3.25,{...hold,tilt:.2,lift:-30,crouch:.45,bend:.3,nearArm:.25,nearElbow:1.85,lLeg:-.15,rLeg:.35,lFold:.95,rFold:.6},D-52,0,'easeInOut',undefined,grip],
                    // Load against the chest, then shove through straightening arms before either man travels.
                    [3.45,{...ST,tilt:.12,lift:-20,crouch:.35,bend:.35,nearArm:.75,nearElbow:1.3,farArm:.4,farElbow:1,lLeg:-.15,rLeg:.4,lFold:1.2,rFold:.7},D-52,0,'easeIn',undefined,free],
                    [3.51,{...ST,tilt:.05,lift:-10,crouch:.35,bend:.12,nearArm:1.3,nearElbow:.15,farArm:.5,farElbow:.6,lLeg:-.3,rLeg:.45,lFold:.9,rFold:.6},D-54,0,'easeIn'],
                    // A short recoil and a catch step, not a continuous glide out of the lock.
                    [3.67,{...ST,tilt:-.12,lift:-12,crouch:.4,bend:-.08,nearArm:1.05,nearElbow:.4,farArm:.65,farElbow:.85,lLeg:-.55,rLeg:.25,lFold:.7,rFold:.4},D-112,0,'easeOut'],
                    [3.78,{...ST,crouch:.48,bend:.1,nearArm:.65,farArm:.55,nearElbow:1.05,farElbow:.9,lLeg:-.45,rLeg:.28,lFold:.85,rFold:.5},D-120,0,'easeOut'],
                    [3.98,{...ST,crouch:.25,bend:.16,nearArm:.55,farArm:.5,nearElbow:1.15,farElbow:.95,lLeg:-.18,rLeg:.2,lFold:.45,rFold:.3},D-120,0,'easeInOut'],
                    [4.25,{...ST,crouch:.1,bend:.1,nearArm:.5,farArm:.45,nearElbow:1,farElbow:.9,lLeg:-.08,rLeg:.2,lFold:.25,rFold:.25},D-120],
                    [4.7,{...ST,nearArm:.4,farArm:.35,nearElbow:.8,farElbow:.8},D-120],
                    [5.15,ST,D-120],
                ],
                def:[
                    [0,{...ST,bend:.65,crouch:.3,nearArm:.8,farArm:.8,nearElbow:1,farElbow:1},D-20,0,'linear',1],
                    // Brace as the arm comes over; one hand rises to peel it, the other stays low.
                    [.38,{...ST,bend:.6,crouch:.28,nearArm:1.25,farArm:.45,nearElbow:1.6,farElbow:.85,lLeg:-.16,rLeg:.24,lFold:.35,rFold:.3},D-18],
                    [.56,{...ST,bend:.85,crouch:.24,nearArm:1.5,farArm:.7,nearElbow:1.85,farElbow:1.15,lLeg:-.24,rLeg:.3,lFold:.5,rFold:.28},D-15],
                    // Fold over the crook, then pull against the clasp with a staggered base.
                    [.75,{...ST,bend:1.05,crouch:.18,nearArm:1.15,farArm:.55,nearElbow:1.7,farElbow:.9,lLeg:-.25,rLeg:.28,lFold:.55,rFold:.3},D-12],
                    [.9,{...ST,bend:1.12,crouch:.23,nearArm:1.35,farArm:.85,nearElbow:1.95,farElbow:1.3,lLeg:-.3,rLeg:.18,lFold:.65,rFold:.35},D-10],
                    [1.0,{...ST,bend:.95,crouch:.18,tilt:-.2,nearArm:1.1,farArm:.75,nearElbow:1.65,farElbow:1.2,lLeg:-.15,rLeg:.3,lFold:.5,rFold:.65},D-8],
                    // The outside leg trails the hip; his free arm opens to catch the fall.
                    [1.3,{...ST,bend:.1,tilt:-1.05,lift:5,lLeg:.55,rLeg:-.12,lFold:.85,rFold:.3,nearArm:.8,farArm:-.4,nearElbow:1.45,farElbow:.65},D-6],
                    [1.65,{...LIE,nearArm:-.65,farArm:.25,nearElbow:1.2,farElbow:1,lLeg:.05,rLeg:.3,lFold:.35,rFold:.4},D-4,0,'easeIn',undefined,{head:'pain'}],
                    // Impact contracts the legs unevenly; he squirms once against the hold.
                    [1.74,{...LIE,bend:.08,nearArm:-.4,farArm:.4,nearElbow:1.5,farElbow:1.2,lLeg:-.12,rLeg:.48,lFold:.95,rFold:.6},D-4,0,'easeOut'],
                    [1.88,{...LIE,bend:.03,nearArm:-.6,farArm:.15,nearElbow:1.3,farElbow:1.05,lLeg:.22,rLeg:.08,lFold:.65,rFold:.85},D-4],
                    [2.0,{...LIE,nearArm:-.5,farArm:.3,nearElbow:1.4,farElbow:1.2,lLeg:.12,rLeg:.25,lFold:.4,rFold:.6},D-4],
                    // Draw a knee across, roll through the side, then face the mat under the retained lock.
                    [2.2,{...LIE,bend:.08,nearArm:-.2,farArm:.4,nearElbow:1.55,farElbow:1.2,lLeg:-.2,rLeg:.4,lFold:1.15,rFold:.75},D-4],
                    [2.34,{...LIE,tilt:-1.5,bend:.1,nearArm:.2,farArm:.6,nearElbow:1.3,farElbow:1.1,lLeg:-.3,rLeg:.3,lFold:1.4,rFold:.95},D-4],
                    [2.35,{...ST,tilt:1.5,lift:-106,bend:.1,nearArm:.25,farArm:.45,nearElbow:1.1,farElbow:1,lLeg:-.3,rLeg:.3,lFold:1.4,rFold:.95},D-4,0,'step',-1],
                    [2.6,{...ST,tilt:1.05,lift:-85,bend:.65,crouch:.1,nearArm:.25,farArm:.2,nearElbow:.8,farElbow:.9,lLeg:1.0,rLeg:.2,lFold:1.8,rFold:1.35},D-4],
                    [3.0,{...ST,tilt:.8,lift:-70,bend:.9,crouch:.2,nearArm:.2,farArm:.15,nearElbow:.45,farElbow:.65,lLeg:.8,rLeg:.2,lFold:1.8,rFold:1.45},D-4],
                    [3.25,{...ST,tilt:.3,lift:-35,bend:.5,crouch:.4,nearArm:.5,farArm:.35,nearElbow:1.15,farElbow:.9,lLeg:-.15,rLeg:.3,lFold:1,rFold:.7},D-4],
                    // Brace into Lou, drive the shoulder away, then catch the recoil on a backward step.
                    [3.45,{...ST,tilt:.15,lift:-25,bend:.5,crouch:.3,nearArm:.7,farArm:.6,nearElbow:1.2,farElbow:1.15,lLeg:.6,rLeg:.3,lFold:1.65,rFold:1.3},D-4,0,'easeIn'],
                    [3.51,{...ST,tilt:.08,lift:-12,bend:.35,crouch:.4,nearArm:1.3,farArm:1.15,nearElbow:.15,farElbow:.25,lLeg:.35,rLeg:.3,lFold:1.25,rFold:.9},D-2,0,'easeIn'],
                    [3.67,{...ST,tilt:-.08,lift:-15,bend:-.08,crouch:.45,nearArm:1.1,farArm:.9,nearElbow:.4,farElbow:.6,lLeg:-.45,rLeg:.3,lFold:.8,rFold:.6},D+50,0,'easeOut'],
                    [3.78,{...ST,crouch:.5,bend:.12,nearArm:.75,farArm:.65,nearElbow:1,farElbow:.9,lLeg:-.4,rLeg:.3,lFold:.85,rFold:.55},D+58,0,'easeOut'],
                    [3.98,{...ST,crouch:.3,bend:.25,nearArm:.6,farArm:.45,nearElbow:1.15,farElbow:.85,lLeg:-.2,rLeg:.25,lFold:.5,rFold:.35},D+58],
                    [4.25,{...ST,crouch:.16,bend:.25,nearArm:.5,farArm:.3,nearElbow:1.1,farElbow:.8,lLeg:-.1,rLeg:.2,lFold:.35,rFold:.25},D+58],
                    [4.7,{...ST,bend:.2,crouch:.1,nearArm:.45,farArm:.25,nearElbow:1.1,farElbow:.75,lFold:.25,rFold:.2},D+58],
                    [5.15,{...ST,bend:.18,crouch:.08,nearArm:.4,farArm:.2,nearElbow:1.1,farElbow:.7,lFold:.2,rFold:.2},D+58],
                ],
                // His neck in the crook of the real forearm, from the moment the swing comes down around it.
                carry:[{role:'defender',on:'attacker',frame:'joint',from:'nearElbow',to:'nearWrist',at:.35,joint:'neck',in:[.42,.6],out:[3.35,3.43]}],
                floorContacts:[
                    {role:'attacker',point:'nearSole',in:[0,.05],out:[.2,.28]},
                    {role:'attacker',point:'nearKnee',in:[2.6,2.85],out:[3.0,3.12]},
                    {role:'attacker',point:'nearSole',in:[3.04,3.12],out:[5.15,5.15]},
                    {role:'defender',point:'nearSole',in:[3.4,3.48],out:[5.15,5.15]},
                ],
                // The man stays over his torso the whole way; only the wrapping arm comes over the man (Derek, Nov 17).
                layers:[['attacker','farArm'],['attacker','nativeBody'],['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],['attacker','nearArm']],
            };
        },
    },

    // T12.3: tie-up, Down + Power. Arm capture, pivot, shoulder load and
    // kneeling forward throw; independently authored in flyingMareClip below.
    flyingMare: { kind: 'paired', hitEvent: 'impact', damage: 14, faceToFace: false, end: { def: 'back', att: 'stand' }, shake: [210, 0.0033], foley: ['mat', 1.0], custom: true },
    // T12.4: a slow overhead hand-lock contest: establish, resist, regain ground, then yield.
    testOfStrength: {
        kind:'paired',hitEvent:'squeeze',damage:3,faceToFace:true,end:{def:'stand',att:'stand'},hold:true,shake:[60,.0008],
        build:D=>{
            const m=D/2,up={...ST,nearArm:1.95,farArm:2.15,nearElbow:1.0,farElbow:.85,crouch:.1,lLeg:-.18,rLeg:.22,lFold:.3,rFold:.3};
            const reach={...up,nearArm:2.75,farArm:2.85,nearElbow:.25,farElbow:.25};
            const hands={nearForearm:'grip',farForearm:'grip'};
            const lock={...ST,crouch:.18,bend:.12,nearArm:.9,nearElbow:1.25,farArm:1.1,farElbow:1.7,lLeg:-.18,rLeg:.22,lFold:.4,rFold:.35};
            const caught={...ST,crouch:.12,bend:.3,nearArm:1.05,nearElbow:2.1,farArm:-.5,farElbow:1.8,lFold:.3,rFold:.3};

            return {duration:12.6,events:[...squeezes(3.0,5.0,7.0),{at:11.08,type:'shove'}],
                att:[
                    [0,TIE,0,0,'linear',1],
                    [.7,{...up,nearArm:1.4,farArm:1.6,nearElbow:.9,farElbow:.8},m-44],
                    [.95,up,m-44],
                    [1.35,up,m-44],
                    [2.1,{...up,bend:-.05,crouch:.14},m-44],
                    [3.0,{...up,bend:.18,crouch:.22,lFold:.5,rFold:.45},m-51],
                    [3.9,{...up,bend:-.12,crouch:.3,lFold:.65,rFold:.5},m-44],
                    [5.0,{...up,bend:.22,crouch:.28,lFold:.65,rFold:.55},m-44],
                    [5.9,{...up,bend:.02,crouch:.22,lFold:.5,rFold:.4},m-44],
                    [7.0,{...up,bend:.3,crouch:.35,nearArm:1.75,farArm:1.95,lFold:.8,rFold:.65},m-48],
                    [7.7,{...up,bend:.25,crouch:.32,nearArm:1.75,farArm:1.95,lFold:.7,rFold:.6},m-48],
                    [8.25,{...lock,nearArm:1.1,farArm:.25,farElbow:1.1},m-18],
                    [8.85,{...lock,farArm:-.55,farElbow:1.95},m-26],
                    [9.2,{...lock,farArm:-.6,farElbow:1.6},m-26],
                    [9.35,{...lock,bend:.2,farArm:1.25,farElbow:1.9},m-26],
                    [9.85,{...lock,bend:.28,crouch:.25},m-22],
                    [10.35,{...lock,bend:.2,crouch:.2,nearArm:.85,farArm:1.25,farElbow:1.9},m-22],
                    [10.7,{...lock,bend:.15,crouch:.15,nearArm:-.05,farArm:-.65,nearElbow:1.4,farElbow:1.75},m-25],
                    [10.95,{...ST,crouch:.25,bend:.24,nearArm:1.0,farArm:1.05,nearElbow:1.4,farElbow:1.4,lLeg:-.18,rLeg:.2,lFold:.55,rFold:.35},m-21],
                    [11.08,{...ST,crouch:.12,bend:.42,nearArm:1.45,farArm:1.5,nearElbow:.25,farElbow:.3,lLeg:-.25,rLeg:.18,lFold:.45,rFold:.3},m-16,0,'easeIn'],
                    [11.2,{...ST,crouch:.15,bend:.32,nearArm:1.35,farArm:1.3,nearElbow:.4,farElbow:.45,lLeg:-.25,rLeg:.18,lFold:.4,rFold:.3},m-16,0,'easeOut'],
                    [11.5,{...ST,crouch:.15,bend:.12,nearArm:.8,farArm:.75,nearElbow:1.1,farElbow:1.1,lFold:.35,rFold:.3},m-19,0,'easeOut'],
                    [11.65,{...ST,nearArm:.6,farArm:.55,nearElbow:1,farElbow:1,lLeg:-.3,rLeg:.12,lFold:.4,rFold:.2},m-30],
                    [12.15,{...ST,nearArm:.6,farArm:.55,nearElbow:1,farElbow:1,lLeg:.1,rLeg:-.25,lFold:.2,rFold:.4},m-52],
                    [12.6,ST,m-55],
                ].map(k=>{if(k[0]>=.7&&k[0]<=10.7)k[6]=hands;if(k[0]>=11.5)k[6]={nearUpperArm:'base',farUpperArm:'base',nearForearm:'base',farForearm:'base'};return k}),
                def:[
                    [0,TIE,D,0,'linear',-1],
                    [.7,{...up,nearArm:1.4,farArm:1.6,nearElbow:.9,farElbow:.8},m+44],
                    [.95,up,m+44],
                    [1.35,up,m+44],
                    [2.1,{...up,bend:-.12,tilt:-.04,crouch:.2,lLeg:-.3,rLeg:.25,lFold:.5,rFold:.35},m+44],
                    // Yield through the hips as he folds: the locked palms must
                    // stay ahead of Lou's shoulders, rather than collapsing into them.
                    [3.0,{...up,nearArm:2.2,farArm:2.35,nearElbow:.7,farElbow:.6,crouch:.44,bend:.38,tilt:.07,lLeg:-.25,rLeg:.3,lFold:1.0,rFold:.65},m+69],
                    // He wins a little height back before the next sustained push.
                    [3.45,{...up,bend:.5,tilt:.09,crouch:.48,lLeg:-.25,rLeg:.3,lFold:1.05,rFold:.8},m+84],
                    [3.9,{...up,bend:-.1,tilt:-.05,crouch:.27,lLeg:-.3,rLeg:.25,lFold:.6,rFold:.4},m+48],
                    [5.0,{...reach,crouch:.78,bend:.48,tilt:.08,lLeg:-.2,rLeg:.18,lFold:1.55,rFold:1.25},m+77],
                    [5.4,{...reach,crouch:.85,bend:.58,tilt:.1,lFold:1.75,rFold:1.45},m+92],
                    [5.9,{...up,nearArm:2.4,farArm:2.55,nearElbow:.5,farElbow:.4,crouch:.5,bend:-.06,tilt:-.03,lLeg:-.25,rLeg:.2,lFold:1.05,rFold:.8},m+49],
                    [7.0,{...reach,crouch:1,bend:.4,tilt:.06,lLeg:-.05,rLeg:-.05,lFold:2.35,rFold:2.35},m+82],
                    [7.7,{...reach,crouch:1,bend:.55,tilt:.08,lLeg:-.05,rLeg:-.05,lFold:2.35,rFold:2.35},m+92],
                    [8.25,{...caught,crouch:.65,lFold:1.35,rFold:1.25,nearArm:1.65,nearElbow:1.4,farArm:.1,farElbow:2.6},m+65],
                    [8.85,{...caught,crouch:.25,lFold:.6,rFold:.5,farArm:-.4,farElbow:2.2},m+54],
                    // Two pain hops, with a crouched landing between them.
                    [9.35,{...caught,bend:.35,crouch:.28,lLeg:-.18,rLeg:.25,lFold:.65,rFold:.55},m+43],
                    [9.5,{...caught,bend:.3,tilt:-.03,crouch:.02,lift:24,lLeg:-.12,rLeg:.22,lFold:.3,rFold:.65},m+43,0,'easeOut'],
                    [9.65,{...caught,bend:.25,tilt:-.03,crouch:0,lift:30,lLeg:-.12,rLeg:.22,lFold:.4,rFold:.7},m+43],
                    [9.85,{...caught,bend:.5,crouch:.3,lLeg:-.18,rLeg:.25,lFold:.7,rFold:.6},m+41,0,'easeIn'],
                    [10.0,{...caught,bend:.45,crouch:.28,lLeg:-.18,rLeg:.25,lFold:.65,rFold:.55},m+41],
                    [10.15,{...caught,bend:.3,tilt:-.03,crouch:.02,lift:24,lLeg:.22,rLeg:-.15,lFold:.65,rFold:.35},m+43,0,'easeOut'],
                    [10.3,{...caught,bend:.25,tilt:-.03,crouch:0,lift:30,lLeg:.22,rLeg:-.15,lFold:.7,rFold:.4},m+43],
                    [10.5,{...caught,bend:.5,crouch:.32,lLeg:-.18,rLeg:.25,lFold:.75,rFold:.65},m+41,0,'easeIn'],
                    [10.7,{...caught,bend:.32,crouch:.12},m+43],
                    [10.95,{...ST,bend:.3,crouch:.18,nearArm:.5,nearElbow:1.7,farArm:.65,farElbow:1.2,lFold:.4,rFold:.35},m+43],
                    [11.08,{...ST,bend:-.32,tilt:-.15,crouch:.3,nearArm:.8,nearElbow:.8,farArm:.65,farElbow:1.2,lLeg:-.15,rLeg:.35,lFold:.45,rFold:.6},m+50,0,'easeIn'],
                    [11.3,{...ST,bend:-.4,tilt:-.22,crouch:.4,nearArm:.7,nearElbow:1.0,farArm:.5,farElbow:1.5,lLeg:-.55,rLeg:.12,lFold:.9,rFold:.3},m+115,0,'easeOut'],
                    [11.65,{...ST,bend:.1,tilt:-.08,crouch:.3,nearArm:.45,nearElbow:1.5,farArm:.4,farElbow:1.7,lLeg:.15,rLeg:-.42,lFold:.3,rFold:.8},m+180],
                    [12.05,{...ST,bend:.32,crouch:.2,nearArm:.4,nearElbow:1.5,farArm:.35,farElbow:1.7,lLeg:-.18,rLeg:.16,lFold:.45,rFold:.3},m+225],
                    [12.6,{...ST,bend:.08,crouch:.03,nearArm:.4,nearElbow:1.4,farArm:.35,farElbow:1.7,lFold:.25,rFold:.25},m+240],
                ].map(k=>{if(k[0]>=.7&&k[0]<=12.6)k[6]={...(k[0]<=10.7?hands:{}),...(k[0]>=2.1?{head:'pain'}:{})};return k}),
                floorContacts:[{role:'defender',point:'nearKnee',in:[6.7,7],out:[7.8,8.85]}],
                layerWindows:[
                    {from:0,to:8.25,order:[['attacker','farArm'],['defender','farArm'],['attacker','nativeBody'],['defender','nativeBody'],['attacker','farForearm'],['defender','farForearm'],['defender','head'],['defender','nearArm'],['attacker','nearArm']]},
                    {from:8.25,to:10.85,order:[['attacker','farArm'],['defender','farArm'],['attacker','nativeBody'],['defender','nativeBody'],['defender','farForearm'],['defender','nearArm'],['attacker','nearArm']]},
                    {from:10.85,to:12.6,order:[['defender','farArm'],['defender','nativeBody'],['defender','farForearm'],['defender','nearArm'],['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm']]},
                ],
                layers:[['attacker','farArm'],['defender','farArm'],['attacker','nativeBody'],['defender','nativeBody'],['attacker','farForearm'],['defender','farForearm'],['defender','nearArm'],['attacker','nearArm']],
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
    const knee={...ST,crouch:.8,lift:-25,lLeg:-.15,rLeg:-.05,lFold:2.2,rFold:2.2,bend:.2,nearArm:.65,farArm:.5,nearElbow:1,farElbow:1.2};
    const brace={...knee,crouch:.65,bend:.05,nearLeg:-.15,nearFold:2.2,farLeg:.5,farFold:2.15};
    const drive={...brace,bend:.1,tilt:-.08,farLeg:.6,nearArm:.9,nearElbow:1.1};
    const seated={...LIE,tilt:3*PI2,bend:1.4,nearArm:-1.5,nearElbow:.15,farArm:.6,farElbow:1.2,lLeg:.12,rLeg:.25,lFold:.25,rFold:.5};
    const landed={...LIE,tilt:3*PI2};
    const att=[
        [0,TIE,0,0,'linear',1],
        [.18,{...ST,crouch:.15,nearArm:.9,farArm:.7,nearElbow:1,farElbow:1.1},2,0,'linear',1],
        [.2,{...ST,crouch:.15,nearArm:.9,farArm:.7,nearElbow:1,farElbow:1.1},2,0,'step',-1],
        [.36,{...ST,crouch:.45,bend:.2,lLeg:.15,rLeg:-.1,lFold:.6,rFold:.7,nearArm:1.2,farArm:.9,nearElbow:.9,farElbow:1.1},8,0,'easeIn'],
        [.44,{...knee,bend:.55,crouch:.85},10,0,'easeIn'],
        [.62,{...knee,bend:.7,nearArm:1.35,nearElbow:.6},10,0,'linear'],
        [.82,{...knee,bend:.45},8,0,'easeOut',undefined,{nearForearm:'grip',farForearm:'grip'}],
        [1.02,knee,2],
        [1.3,brace,15],
        [1.45,{...brace,bend:0,nearArm:.8,nearElbow:.85},15],
        [1.7,drive,15,0,'easeOut'],
        [2.05,brace,15],
        [2.35,drive,15,0,'easeOut'],
        [2.8,brace,15],
        [3.15,brace,15],
        [3.6,drive,15,0,'easeOut'],
        [3.95,brace,15],
        [4.25,drive,15,0,'easeOut'],
        [4.9,brace,15],
        [5.22,{...brace,bend:.2,farLeg:.5,nearArm:.6,farArm:.4},2],
        [5.55,{...ST,crouch:.7,bend:.3,lFold:1.6,rFold:1.25,nearArm:.4,farArm:.4,nearElbow:.9,farElbow:.9},14],
        [5.9,{...ST,crouch:.25,bend:.15,lFold:.55,rFold:.45},24],
        [6.25,{...ST,crouch:.08,nearArm:.6,farArm:.5,nearElbow:1,farElbow:.9},28],
        [6.35,{...ST,crouch:.12,nearArm:.6,farArm:.5,nearElbow:1,farElbow:.9,lLeg:-.1,rLeg:.2,lFold:.3,rFold:.2},28],
        [6.45,{...ST,crouch:.08,nearArm:.6,farArm:.5,nearElbow:1,farElbow:.9,lLeg:-.35,rLeg:.2,lFold:.5,rFold:.2},42,0,'linear'],
        [6.55,{...ST,crouch:.1,nearArm:.6,farArm:.5,nearElbow:1,farElbow:.9,lLeg:-.25,rLeg:.2,lFold:.2,rFold:.25},54,0,'easeOut'],
        [6.65,{...ST,crouch:.12,nearArm:.6,farArm:.5,nearElbow:1,farElbow:.9,lLeg:.15,rLeg:-.1,lFold:.25,rFold:.3},54],
        [6.76,{...ST,crouch:.08,nearArm:.6,farArm:.5,nearElbow:1,farElbow:.9,lLeg:.2,rLeg:-.35,lFold:.2,rFold:.5},66,0,'linear'],
        [6.87,{...ST,crouch:.1,nearArm:.6,farArm:.5,nearElbow:1,farElbow:.9,lLeg:.15,rLeg:-.25,lFold:.25,rFold:.2},78,0,'easeOut'],
        [7.15,{...ST,nearArm:.55,farArm:.45,nearElbow:1,farElbow:.9},78],
    ];
    const def=[
        [0,TIE,distance,0,'linear',-1],
        [.2,{...TIE,nearArm:1.1,nearElbow:.5,farArm:.35,farElbow:.9},70],
        [.36,{...ST,bend:.4,crouch:.15,tilt:.15,nearArm:1.4,nearElbow:.35,farArm:.4,farElbow:.8},40,0,'easeIn'],
        [.44,{...ST,tilt:.65,lift:24,bend:.25,lLeg:.2,rLeg:.1,lFold:.5,rFold:.65,nearArm:1.35,nearElbow:.3,farArm:.5,farElbow:.9},18,0,'linear'],
        [.54,{...ST,tilt:1.8,lift:35,bend:.15,lLeg:.4,rLeg:.1,lFold:.8,rFold:.9,nearArm:1.2,nearElbow:.3,farArm:.65,farElbow:1},-8,0,'linear'],
        [.64,{...ST,tilt:3.25,lift:20,bend:.15,lLeg:.4,rLeg:.15,lFold:1,rFold:.9,nearArm:.5,nearElbow:.3,farArm:.8,farElbow:1},-35,0,'linear'],
        [.74,{...ST,tilt:4.3,lift:-55,bend:.55,lLeg:.2,rLeg:.25,lFold:.5,rFold:.6,nearArm:-.5,nearElbow:.25,farArm:.7,farElbow:1.2},-60,0,'easeIn'],
        [.82,{...seated,bend:1.25,lFold:.45,rFold:.6},-75,0,'easeIn',undefined,{head:'pain'}],
        [.94,{...seated,bend:1.5,lFold:.6,rFold:.5},-75,0,'easeOut'],
        [1.2,seated,-75],
        [1.7,{...seated,bend:.95,nearArm:-1.8,nearElbow:.1,farArm:1.2,farElbow:1.8,lLeg:.4,lFold:.85,rFold:.65},-75],
        [2.05,{...seated,bend:1.25,farArm:1.0,farElbow:1.7,rFold:.7},-75],
        [2.35,{...seated,bend:.9,nearArm:-1.85,nearElbow:.1,farArm:1.3,farElbow:1.9,lLeg:.45,lFold:.95,rFold:.55},-75],
        [2.8,{...seated,bend:1.2,farArm:1.0,farElbow:1.6,rFold:.65},-75],
        [3.15,{...seated,bend:1.25,farArm:1.0,farElbow:1.7,rFold:.65},-75],
        [3.6,{...seated,bend:.95,nearArm:-1.8,nearElbow:.1,farArm:1.2,farElbow:1.8,lLeg:.4,lFold:.85,rFold:.65},-75],
        [3.95,{...seated,bend:1.25,farArm:1.0,farElbow:1.7,rFold:.7},-75],
        [4.25,{...seated,bend:.9,nearArm:-1.85,nearElbow:.1,farArm:1.3,farElbow:1.9,lLeg:.45,lFold:.95,rFold:.55},-75],
        [4.9,{...seated,bend:1.2,farArm:1.0,farElbow:1.6,rFold:.65},-75],
        [5.22,{...seated,bend:1.2,nearArm:-.65,nearElbow:.8,farArm:.8,farElbow:1.5},-75],
        [5.55,{...seated,bend:.9,nearArm:.2,nearElbow:1.4,farArm:.7,farElbow:1.4},-75],
        [5.9,{...landed,bend:.2,nearArm:.4,nearElbow:.9,farArm:.3,farElbow:.7},-75],
        [6.25,landed,-75],
        [7.15,landed,-75],
    ];
    // Enlarge the complete back arm consistently, then blend back to idle proportions on release.
    for(const beat of att){const p=beat[1];beat[1]={...p,nearLeg:p.nearLeg??p.lLeg,nearFold:p.nearFold??p.lFold,farLeg:p.farLeg??p.rLeg,farFold:p.farFold??p.rFold,farArmScale:beat[0]<=5.22?1.15:1};}
    // Keep the receiver's free arm at matching proportions through the seated struggle.
    for(const beat of def)beat[1]={...beat[1],farArmScale:beat[0]<=5.22?1.15:1};
    // Appearance is keyed per beat: keep the grip and pain through the hold, not only on impact.
    for(const beat of att)if(beat[0]>=.82&&beat[0]<=5.22)beat[6]={nearForearm:'grip',farForearm:'grip'};
    for(const beat of att)if(beat[0]>=5.55)beat[6]={nearUpperArm:'base',farUpperArm:'base',nearForearm:'base',farForearm:'base'};
    for(const beat of def)if(beat[0]>=.82&&beat[0]<=5.55)beat[6]={head:'pain'};
    return {id:'flyingMare',duration:7.15,events:[{at:.82,type:'impact'}],
        tracks:{attacker:{keyframes:att.map(b=>kf(ST,b))},defender:{keyframes:def.map(b=>kf(ST,b))}},
        // One captured wrist through the throw and seated lock; the back hand clamps the top shoulder while the near hand works the wrist.
        grips:[
            // Solve the receiver's captured arm onto the gripping hand after the throw pose is placed.
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Wrist',side:'same'},in:[.06,.16],out:[5.05,5.35],natural:true,afterLegs:true},
            {role:'attacker',arm:'near',to:{role:'defender',joint:'Wrist',side:'same'},in:[.06,.16],out:[5.05,5.35],natural:true},
            {role:'attacker',arm:'far',to:{role:'defender',joint:'Shoulder',side:'other'},in:[.08,.18],out:[.62,.82],natural:true},
            {role:'attacker',arm:'far',to:{role:'defender',joint:'Shoulder',side:'other',offset:{x:0,y:-4}},in:[.82,1.05],out:[5.05,5.35],palm:'clutch',natural:true,afterLegs:true},
        ],
        floorContacts:[{role:'attacker',point:'nearKnee',in:[.38,.55],out:[5.22,5.55]},
            {role:'attacker',point:'nearSole',in:[5.6,5.9],out:[7.15,7.15]}],
        plants:[{role:'attacker',leg:'far',in:[6.2,6.25],out:[6.48,6.6],kneeRestart:true},
            {role:'attacker',leg:'near',in:[6.48,6.55],out:[6.8,6.9],kneeRestart:true},
            {role:'attacker',leg:'far',in:[6.8,6.87],out:[7.15,7.15],kneeRestart:true}],
        layers:[
            {from:0,to:.64,order:FRONT_ATT},
            {from:.64,to:.82,order:FRONT_DEF},
            // Keep the complete back arm behind both bodies; only its depth changes.
            {from:.82,to:5.35,order:[['attacker','farArm'],['attacker','nearArm'],['attacker','nativeBody'],['defender','farArm'],['attacker','farLeg'],['defender','nativeBody'],['defender','nearArm'],['defender','farForearm'],['attacker','nearForearm']]},
            {from:5.35,to:7.15,order:FRONT_DEF},
        ],
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
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Hip',side:'other',above:.5},in:[.6,1.05],out:[2.62,2.9],natural:true},
            grip('near','Wrist','same',.2,.45,2.62,2.9),
            grip('far','Elbow','other',.2,.45,2.62,2.9,{fore:.9}),
            {role:'defender',arm:'far',to:{role:'attacker',joint:'Elbow',side:'other',fore:.65},in:[.75,1.1],out:[2.35,2.7],natural:true,afterLegs:true},
            {role:'defender',arm:'near',to:{role:'defender',joint:'Hip',side:'same',above:.35,offset:{x:40,y:4}},in:[2.9,3.3],out:[4.3,4.5],natural:true,blendFromHand:true},
            {role:'defender',arm:'far',to:{role:'defender',joint:'Wrist',side:'other'},in:[3,3.3],out:[4.3,4.5],natural:true,palm:'clutch',afterLegs:true},
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
        headlockTakeover:[
            // The far hand guides the head through takeoff, then transfers to the clasp.
            {role:'attacker',arm:'far',to:{role:'defender',joint:'Neck',side:'same',offset:{x:0,y:-5}},in:[.08,.18],out:[.48,.6],natural:true,afterLegs:true},
            {role:'attacker',arm:'far',to:{role:'attacker',joint:'Wrist',side:'other'},in:[.6,.75],out:[2.5,2.6],palm:'clutch',natural:true},
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Elbow',side:'same',fore:.65},in:[2.02,2.18],out:[2.36,2.5],natural:true,afterLegs:true},
            {role:'defender',arm:'near',to:{role:'defender',joint:'Floor',side:'same',ahead:8},in:[2.4,2.65],out:[2.92,3.08],natural:true,afterLegs:true},
            {role:'defender',arm:'far',to:{role:'defender',joint:'Floor',side:'same',ahead:0},in:[2.4,2.65],out:[3.0,3.1],natural:true,afterLegs:true},
            {role:'attacker',arm:'far',to:{role:'attacker',joint:'Floor',side:'same',ahead:12},in:[2.55,2.75],out:[2.9,3.08],natural:true},
            {role:'attacker',arm:'near',to:{role:'defender',joint:'Shoulder',side:'same',offset:{x:0,y:12}},in:[3.35,3.43],out:[3.51,3.58],natural:true,afterLegs:true},
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Shoulder',side:'other',offset:{x:0,y:12}},in:[3.34,3.43],out:[3.51,3.58],natural:true,afterLegs:true},
            {role:'defender',arm:'far',to:{role:'attacker',joint:'Shoulder',side:'other',offset:{x:0,y:12}},in:[3.36,3.45],out:[3.51,3.58],natural:true,afterLegs:true},
            {role:'attacker',arm:'far',to:{role:'attacker',joint:'Wrist',side:'other'},in:[3.08,3.2],out:[3.35,3.4],palm:'clutch',natural:true},
        ],
        testOfStrength:[
            {role:'defender',arm:'near',to:{role:'defender',joint:'Hip',side:'same',above:.3,offset:{x:28,y:-2}},in:[7.85,8.85],out:[11.08,11.2],natural:true},
            {role:'attacker',arm:'near',to:{role:'defender',joint:'Wrist',side:'same',anchor:'clutch'},in:[.7,.95],out:[11.08,11.2],palm:'clutch',natural:true},
            {role:'attacker',arm:'far',to:{role:'defender',joint:'Wrist',side:'same',anchor:'clutch'},in:[.7,.95],out:[8.85,8.95],palm:'clutch',natural:true},
            {role:'defender',arm:'near',to:{role:'attacker',joint:'Wrist',side:'same',anchor:'clutch'},in:[.7,.95],out:[7.7,7.85],palm:'clutch',natural:true,afterLegs:true},
            {role:'defender',arm:'far',to:{role:'attacker',joint:'Wrist',side:'same',anchor:'clutch'},in:[.7,.95],out:[8.85,8.95],palm:'clutch',natural:true,afterLegs:true},
            // The second hand threads underneath the worked arm and closes on his own wrist.
            {role:'attacker',arm:'far',to:{role:'attacker',joint:'Wrist',side:'other',anchor:'clutch'},in:[8.95,9.2],out:[10.6,10.85],palm:'clutch',natural:true,afterLegs:true},
            {role:'attacker',arm:'far',to:{role:'defender',joint:'Shoulder',side:'other',offset:{x:0,y:12}},in:[10.85,10.95],out:[11.08,11.2],palm:'clutch',natural:true,afterLegs:true},
        ],
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
        wristlock:[plant('attacker','r',.8,1,2.1,2.7),plant('defender','r',.3,.5,2.1,2.7),plant('defender','r',3.02,3.08,3.3,3.4),plant('defender','l',3.4,3.48,3.65,3.75),plant('defender','r',3.75,3.83,4.05,4.15)],
        headlockTakeover:[plant('attacker','r',.05,.1,.16,.24),plant('attacker','r',.62,.72,1.0,1.15),plant('attacker','r',3.43,3.47,3.53,3.6),plant('attacker','l',3.67,3.75,3.93,4.07),plant('defender','r',3.43,3.47,3.53,3.6),plant('defender','l',3.67,3.75,3.93,4.07)],
        testOfStrength:[plant('attacker','r',1.15,1.35,7.7,8.25),plant('defender','r',1.15,1.35,4.6,5.0),plant('attacker','r',10.85,10.95,11.35,11.5),plant('defender','r',11.27,11.3,11.45,11.55),plant('defender','l',11.6,11.65,11.9,12.05)],
        leapfrog:[plant('attacker','r',0,.05,.12+delay,.2+delay),plant('attacker','l',.85+delay,.92+delay,.98+delay,1+delay)],
        backdropSuplex:[plant('attacker','r',.3,.45,.75,.94)],
    }[id]??[];
    const tracks = { attacker: { keyframes: spec.att.map(b => kf(ST, b)) } };
    if (spec.def) tracks.defender = { keyframes: spec.def.map(([at, over, x, y = 0, ...rest]) => kf(ST, [at, over, x, y + dy, ...rest])) };   // `dy`: the man's depth from the attacker's at play(), so a pair a little off one line does not pop
    return { id, duration: spec.duration, events: spec.events, tracks, plants, grips, floorContacts:spec.floorContacts??[], legContacts:spec.legContacts??[],...(spec.carry?{carry:spec.carry}:{}),
        ...(id==='backdropSuplex'?{carry:[{role:'defender',on:'attacker',tilt:1,in:[.4,.65],out:[.98,1.18],slide:{along:55,in:[.5,.95]}}]}:{}),
        ...(id==='backwardRoll'?{floorContacts:[{role:'attacker',point:'upperBack',in:[.2,.35],out:[.8,1.05]}]}:{}),
        ...(spec.layers ? { layers: spec.layerWindows??[{ from: 0, to: spec.duration, order: spec.layers }] } : {}) };
}
