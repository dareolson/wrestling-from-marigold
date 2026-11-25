import {matMoveClip} from './matMoves.js';

// Grounded Sandow–Lewis-style head scissors, separate from a flying takedown.
export function headScissorsClip(distance=100,options={}){
    const clip=structuredClone(matMoveClip('bodyScissors',distance,options));
    clip.id='headScissors';
    for(const k of clip.tracks.attacker.keyframes){
        if(k.at>0)k.transform.x-=k.at===.35?43:72;
        if(k.at>=.75&&k.at<=3.65){
            Object.assign(k.pose,{tilt:-.5,lift:-83,bend:k.pose.bend>.15?.18:.1});
        }
    }
    clip.legContacts[0].to={role:'defender',joint:'Neck',side:'far',x:30,y:2};
    clip.legContacts[1].to={role:'attacker',joint:'Ankle',side:'far',x:3,y:-14};
    for(const contact of clip.legContacts)contact.bend='anatomical';
    clip.floorContacts[0].point='hips';
    clip.layers[0].order=[['attacker','farArm'],['attacker','farLeg'],['defender','farArm'],
        ['defender','farLeg'],['attacker','torso'],['attacker','head'],['defender','nativeBody'],
        ['defender','head'],['attacker','nearLeg'],
        ['attacker','nearArm'],['defender','nearArm']];

    // Keep the head down between the thighs, not propped above the leg clamp.
    const attacks=clip.tracks.attacker.keyframes,receives=clip.tracks.defender.keyframes;
    const locked=structuredClone(attacks.find(k=>k.at===1.25));
    const caught=structuredClone(receives.find(k=>k.at===1.25));
    caught.pose.bend=-.12;
    const beat=(base,at,pose={},parts={})=>({...structuredClone(base),at,pose:{...base.pose,...pose},parts:{...base.parts,...parts}});
    const attHold=[beat(locked,1.3)],defHold=[beat(caught,1.3,{}, {head:'pain'})];
    const pulses=[{in:[2,2.4],out:[2.95,3.7]}, {in:[4.4,5],out:[5.55,6.3]}, {in:[7,7.6],out:[8.2,9.1]}];
    for(const pulse of pulses){
        for(const at of [pulse.in[1],pulse.out[0]]){
            attHold.push(beat(locked,at,{bend:.28,rArm:.65,rElbow:1.25}));
            defHold.push(beat(caught,at,{bend:-.3,lLeg:.4,rLeg:.55,lShin:-.25,rShin:-.3},{head:'pain'}));
        }
        attHold.push(beat(locked,pulse.out[1]));
        defHold.push(beat(caught,pulse.out[1],{lLeg:.12,rLeg:.28},{head:'pain'}));
        // A trapped upper body with restless legs: alternate the kick rather
        // than moving both boots together. Peak effort follows each squeeze.
        for(const [i,offset] of [0,.18,.36].entries()){
            const at=pulse.in[1]+offset;
            const near=i%2===0;
            defHold.push(beat(caught,at,{bend:-.3,
                lLeg:near?1.05:.12,rLeg:near?.2:1.1,
                lShin:near?.1:-.5,rShin:near?-.55:.12},{head:'pain'}));
        }
        defHold.push(beat(caught,pulse.out[0]-.04,{bend:-.22,lLeg:.3,rLeg:.4,lShin:-.55,rShin:-.65},{head:'pain'}));
    }
    // The first kick replaces the old static pressure key at the same time.
    const unique=keys=>[...new Map(keys.map(k=>[k.at,k])).values()].sort((a,b)=>a.at-b.at);
    const exits=[[3.65,9.8],[4.05,10.4],[4.5,11.1],[5,12]];
    clip.tracks.attacker.keyframes=[...attacks.filter(k=>k.at<1.25),...attHold,
        ...exits.map(([old,at])=>beat(attacks.find(k=>k.at===old),at))];
    clip.tracks.defender.keyframes=[...receives.filter(k=>k.at<1.25),...unique(defHold),
        beat(receives.find(k=>k.at===3.8),10,{}, {head:'base'}),beat(receives.at(-1),12,{}, {head:'base'})];
    clip.duration=12;
    clip.events=[2.4,5,7.6].map(at=>({at,type:'squeeze'}));
    for(const c of clip.grips){c.out=[9.3,9.8];}
    for(const [i,c]of clip.legContacts.entries()){
        c.out=[9.3,9.8];
        c.pulses=pulses.map(p=>({...p,x:i===0?-3:-2,y:i===0?-2:-3}));
    }
    clip.floorContacts[0].out=[9.35,10];
    clip.layers[0].to=12;

    // Prehn (1925), step-over entry: control the arm, work toward the head,
    // then sit into the scissors. Keep one leg supporting the descent rather
    // than lifting both feet into a floating seated pose.
    const entryDelay=1.5;
    for(const track of Object.values(clip.tracks))for(const key of track.keyframes){
        if(key.at>=1.3)key.at+=entryDelay;
    }
    const entry=(at,x,y,pose)=>({...beat(locked,at,pose),transform:{x,y}});
    clip.tracks.attacker.keyframes=[attacks[0],
        entry(.4,distance-130,-12,{tilt:0,lift:0,crouch:.4,bend:.5,lArm:.8,rArm:.9,lLeg:.05,rLeg:-.2,lShin:-.6,rShin:-.8}),
        entry(.9,distance-130,0,{tilt:-.25,lift:-65,crouch:0,bend:.3,lArm:.5,rArm:1,lLeg:1.1,rLeg:.9,lShin:-.1,rShin:-1.1}),
        entry(1.35,distance-122,12,{tilt:-.5,lift:-83,crouch:0,bend:.12,lLeg:1.8,rLeg:2.1,lShin:.8,rShin:.7}),
        entry(1.65,distance-117,14,{tilt:-.5,lift:-83,crouch:0,bend:.12,lLeg:1.8,rLeg:2.1,lShin:.8,rShin:.7}),
        entry(1.9,distance-117,16,{tilt:-.5,lift:-83,crouch:0,bend:.1,lLeg:1.65,rLeg:2.1,lShin:.7,rShin:.7}),
        beat(locked,2.35),
        ...clip.tracks.attacker.keyframes.filter(k=>k.at>=2.8)];
    // Keep the receiver's arms below the stepping leg until the lock is set.
    const receiverEntry=beat(caught,2.1,{lArm:.45,rArm:.15,lElbow:.9,rElbow:.45,bend:0});
    clip.tracks.defender.keyframes=[receives[0],
        beat(receiverEntry,.55,{lArm:.7,lElbow:1.1,bend:.06}),
        beat(receiverEntry,1.2,{lArm:.8,lElbow:1.2,bend:.1}),receiverEntry,
        ...clip.tracks.defender.keyframes.filter(k=>k.at>=2.8)];
    for(const event of clip.events)event.at+=entryDelay;
    for(const contact of [...clip.grips,...clip.legContacts,...clip.floorContacts]){
        contact.in=contact.in.map(t=>t+entryDelay);
        contact.out=contact.out.map(t=>t+entryDelay);
        for(const pulse of contact.pulses??[]){
            pulse.in=pulse.in.map(t=>t+entryDelay);
            pulse.out=pulse.out.map(t=>t+entryDelay);
        }
    }
    clip.legContacts[0].in=[1.75,2.25];
    clip.legContacts[1].in=[1.9,2.35];
    // Hand-to-wrist control leads the leg entry; release it as the brace hand
    // takes the attacker's weight beside his seated hip.
    clip.grips.unshift(
        {role:'attacker',arm:'near',to:{role:'defender',joint:'Wrist',side:'same'},in:[.2,.55],out:[.65,1.05],natural:true},
        {role:'attacker',arm:'far',to:{role:'defender',joint:'Wrist',side:'other'},in:[.3,.65],out:[1.4,1.85],natural:true});
    clip.grips.find(c=>c.role==='attacker'&&c.to.joint==='Floor').in=[.7,1.1];
    clip.floorContacts[0].in=[1.05,1.35];
    clip.floorContacts.unshift({role:'attacker',point:'farSole',in:[.15,.4],out:[.95,1.35]});
    // Uncross clear of the head before reusing the accepted backward roll.
    // Keep its support windows and facing-relative movement together.
    const roll=structuredClone(matMoveClip('backwardRoll',0,options));
    // This roll starts beside another man's shoulders, not from an empty
    // supine recovery. Keep the knees up instead of sweeping straight legs
    // across his head before the stock tuck begins.
    Object.assign(roll.tracks.attacker.keyframes[0].pose,{lLeg:1.6,rLeg:1.5,lShin:.4,rShin:.3});
    Object.assign(roll.tracks.attacker.keyframes[1].pose,{lLeg:1.75,rLeg:1.65,lShin:.6,rShin:.5});
    const rollAt=11.2,rollX=distance-135,travel=.65;
    const shifted=k=>({...k,at:+(rollAt+k.at).toFixed(4),
        pose:{...k.pose,gaitDistance:(k.pose.gaitDistance??0)*travel},
        transform:{x:rollX+k.transform.x*travel,y:16}});
    clip.tracks.attacker.keyframes=[...clip.tracks.attacker.keyframes.filter(k=>k.at<=10.6),
        entry(10.95,distance-125,16,{tilt:-.85,lift:-90,bend:.18,lLeg:1.8,rLeg:2.1,lShin:.8,rShin:.7}),
        ...roll.tracks.attacker.keyframes.map(shifted)];
    clip.duration=+(rollAt+roll.duration).toFixed(4);
    clip.tracks.defender.keyframes=clip.tracks.defender.keyframes.filter(k=>k.at<=10.6);
    clip.tracks.defender.keyframes.push(beat(caught,10.95,{bend:-.1,lLeg:.4,rLeg:.2,lShin:-.25,rShin:-.4},{head:'pain'}),
        beat(receives.at(-1),11.6,{}, {head:'pain'}),beat(receives.at(-1),clip.duration,{}, {head:'base'}));
    for(const c of [...clip.grips,...clip.legContacts])if(c.out[0]>10)c.out=[10.65,10.95];
    clip.floorContacts.find(c=>c.point==='hips').out=[10.7,11.1];
    for(const group of ['grips','plants','floorContacts'])for(const c of roll[group]??[]){
        c.in=c.in.map(t=>+(t+rollAt).toFixed(4));c.out=c.out.map(t=>+(t+rollAt).toFixed(4));
        (clip[group]??=[]).push(c);
    }
    // No depth swap during closure: the outside leg remains over the face,
    // and the inside leg passes behind the head continuously from the entry.
    clip.layers=[{...clip.layers[0],from:0,to:11.1},
        {from:11.1,to:clip.duration,order:[['defender','farArm'],['defender','nativeBody'],
            ['defender','nearArm'],['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm']]}];
    return clip;
}
