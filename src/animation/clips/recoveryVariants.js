import {matMoveClip} from './matMoves.js';
import {shinsFromFolds} from '../../rig/articulation.js';

const ST={lArm:.05,rArm:.15,lElbow:.6,rElbow:.6,lLeg:-.04,rLeg:.16,lFold:.22,rFold:.22,crouch:0,lean:0,bend:0,tilt:0,lift:0,gaitWeight:0,gaitDistance:0};
const BACK={...ST,tilt:-Math.PI/2,lift:-110,lLeg:.1,rLeg:.22,lFold:.15,rFold:.4};
const key=(at,pose,x=0,ease='easeInOut')=>({at,pose:shinsFromFolds({...ST,...pose}),transform:{x,y:0},ease});
const rounded=n=>+n.toFixed(4);

// Reuse the accepted recovery unchanged after an independently authored entry.
function withEntry(id,entry,delay,retreat,options){
    const clip=structuredClone(matMoveClip('backwardRoll',0,options));
    clip.id=id;clip.duration=rounded(clip.duration+delay);
    const keys=clip.tracks.attacker.keyframes;
    clip.tracks.attacker.keyframes=[...entry,...keys.slice(1).map(k=>({...k,at:rounded(k.at+delay),transform:{...k.transform,x:k.transform.x-retreat}}))];
    for(const e of clip.events)e.at=rounded(e.at+delay);
    for(const group of ['grips','plants','floorContacts'])for(const c of clip[group]??[]){c.in=c.in.map(t=>rounded(t+delay));c.out=c.out.map(t=>rounded(t+delay));}
    return clip;
}

export const RECOVERY_VARIANTS=['backwardRollEscape','rockingRecovery','kipUp'];
export function recoveryVariantClip(id,options={}){
    if(id==='backwardRollEscape'){
        // An escape never stops supine. Travel begins with the knee bend,
        // enters the tuck directly, and accelerates through the turnover.
        const clip=structuredClone(matMoveClip('backwardRoll',0,options));
        const beats=[[0,.24],[.1,.30],[.24,.36],[.4,.48],[.65,.62],[.86,.76],
            [1.06,.9],[1.22,1.02],[1.34,1.06],[1.45,1.16],[1.85,1.34],
            [2,1.44],[2.22,1.6],[2.48,1.78],[2.7,1.94],[2.85,2.05]];
        const time=t=>{
            const i=beats.findIndex(([old])=>old>=t);
            if(i<=0)return beats[0][1];
            const [a,x]=beats[i-1],[b,y]=beats[i];
            return rounded(x+(y-x)*(t-a)/(b-a));
        };
        clip.id=id;clip.duration=2.05;
        clip.tracks.attacker.keyframes=[
            key(0,ST),
            key(.1,{...ST,crouch:.7,lLeg:.08,rLeg:.2,lFold:.95,rFold:.9,bend:.12,lArm:.6,rArm:.65},-14,'easeIn'),
            key(.24,{...ST,crouch:1.25,lLeg:.15,rLeg:.3,lFold:1.9,rFold:1.8,tilt:-.35,bend:.25,lArm:1,rArm:1.1},-34,'linear'),
            key(.36,{...ST,lLeg:1.65,rLeg:1.5,lFold:2.1,rFold:2,tilt:-1.5,lift:-80,bend:.45,lArm:1.2,rArm:1.3,lElbow:.8,rElbow:.8},-53,'linear'),
            ...clip.tracks.attacker.keyframes.filter(k=>k.at>=.4).map(k=>({...k,at:time(k.at),
                pose:{...k.pose,gaitDistance:(k.pose.gaitDistance??0)*.65},
                transform:{...k.transform,x:rounded(k.transform.x*.65-55)}})),
        ];
        for(const e of clip.events)e.at=time(e.at);
        for(const group of ['grips','plants','floorContacts'])for(const c of clip[group]??[]){c.in=c.in.map(time);c.out=c.out.map(time);}
        clip.floorContacts.unshift({role:'attacker',point:'nearSole',in:[0,.03],out:[.18,.31]});
        return clip;
    }
    if(id==='rockingRecovery'){
        const sit={...ST,lift:-70,lLeg:1.5,rLeg:1.45,lFold:.15,rFold:.18,bend:.12,lArm:.15,rArm:.25,lElbow:1.2,rElbow:1.1};
        const clip=withEntry(id,[
            key(0,BACK),key(.28,sit),key(.43,{...sit,bend:.23,lArm:.05,rArm:.15,lElbow:1.3,rElbow:1.2}),
            key(.65,{...BACK,tilt:-.95,lift:-95,lLeg:.7,rLeg:.6,lFold:.5,rFold:.55,lArm:-.4,rArm:-.3,lElbow:.7,rElbow:.7},-5),
            key(.8,BACK,-10),
        ],.8,10,options);
        clip.floorContacts.unshift({role:'attacker',point:'nearSole',in:[.18,.28],out:[.43,.58]});
        return clip;
    }
    if(id==='kipUp'){
        const idle={...ST,...options.landingPose};
        if(options.landingPose)for(const side of ['l','r']){
            const shin=options.landingPose[side+'Shin'];
            if(Number.isFinite(shin))idle[side+'Fold']=idle[side+'Leg']+.85*idle.crouch-shin;
        }
        return{
        id,duration:1.8,events:[{at:.54,type:'spring'}],
        tracks:{attacker:{keyframes:[
            key(0,BACK),
            key(.22,{...BACK,lLeg:1.9,rLeg:1.8,lFold:1.35,rFold:1.4,tilt:-1.95,lift:-90,bend:.25,lArm:1.3,rArm:1.4,lElbow:1.1,rElbow:1.1},-5),
            key(.42,{...ST,lLeg:2.25,rLeg:2.15,lFold:.85,rFold:.95,tilt:-2.95,lift:-20,bend:.3,lArm:1.1,rArm:1.2,lElbow:.9,rElbow:.9},-20),
            key(.62,{...ST,lift:25,lLeg:1.1,rLeg:1,lFold:.2,rFold:.25,tilt:-1.1,bend:-.1,lArm:1.95,rArm:2.05,lElbow:.3,rElbow:.35},10,'easeOut'),
            key(.84,{...ST,lift:35,lLeg:-.2,rLeg:.05,lFold:.45,rFold:.5,tilt:-.2,lArm:1.65,rArm:1.8,lElbow:.4,rElbow:.45},22),
            key(1.06,{...ST,crouch:.8,lFold:1.3,rFold:1.25,bend:.2,lArm:.65,rArm:.8,lElbow:.5,rElbow:.55},28,'easeIn'),
            key(1.22,{...ST,crouch:.45,lFold:.8,rFold:.75,bend:.12,lArm:.2,rArm:.3,lElbow:.6,rElbow:.6},28,'easeOut'),
            key(1.36,{...ST,crouch:.2,lFold:.45,rFold:.4,bend:.08,lArm:.15,rArm:.25,lElbow:.6,rElbow:.6},28),key(1.65,idle,28),key(1.8,idle,28),
        ]}},
        grips:['near','far'].map((arm,i)=>({role:'attacker',arm,to:{role:'attacker',joint:'Floor',ahead:12-i*6},in:[.2,.32],out:[.45,.59],palm:'clutch',natural:true,afterLegs:true})),
        floorContacts:[{role:'attacker',point:'shoulders',in:[.12,.25],out:[.43,.58]},
            {role:'attacker',point:'nearSole',in:[1.02,1.08],out:[1.8,1.8]}],
        // The authored crouch and painted-sole floor support own this landing.
        // Two independent leg plants fought that shared pelvis as it rose,
        // causing alternating knee corrections even after the body settled.
        plants:[],
        };
    }
    throw new Error(`Unknown recovery variant: ${id}`);
}
