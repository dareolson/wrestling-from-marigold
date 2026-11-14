// Visual draft only: ankle-lock pickup, turn into a one-legged crab, sit back.
import { ankleLockEntryClip } from '../../src/animation/clips/ankleLockV2.js';
import { shinsFromFolds } from '../../src/rig/articulation.js';
export function buildHalfCrab(s, fists, front, pair = 'lou-george') {
 const v = s.variants?.[pair] ?? {};
 s = { ...s, ...v, att: { ...s.att, ...v.att }, def: { ...s.def, ...v.def } };
 const end = 4.6, turn = .78, roll = .88;
 const tuck = 1.18;
 const pickup = ankleLockEntryClip(120);
 const frames = { attacker: [], defender: [] };
 for (const [role, out] of Object.entries(frames)) {
   const keys = pickup.tracks[role].keyframes.filter(k => k.at <= .6);
   for (const k of keys) out.push({ at: k.at, pose: k.pose, x: k.transform.x, y: k.transform.y ?? 0, facing: role === 'attacker' ? 1 : -1, parts: k.parts });
 }
 // The held arm clamps the toes in the armpit; hand-to-boot IK is pickup-only.
 // Move the trapped leg as one stack: calf stays below thigh, outside arm covers the toes.
 const add = (role, at, pose, gap = s.gap, sign) => frames[role].push({ at, pose: shinsFromFolds(pose), x: role === 'attacker' ? 120-gap : 120, y: role === 'attacker' ? s.attY : 0, facing: sign ?? (role === 'attacker' ? -1 : 1), parts: role === 'defender' ? { nearForearm:'base',farForearm:'base' } : { nearForearm:'grip',farForearm:'grip' } });
 // First collect the leg, then step around it before taking the crab's base.
 // The turn: a step around the leg, about 0.25 s. Knees and elbows bend toward the facing, so the facing flips (turn)
 // on a near-symmetric pose (legs crossing, knees and elbows nearly straight) and the mirrored frame matches the last.
 const wide = { ...s.att, crouch: .5, bend: .1, lean: 0, lLeg: .38, rLeg: -.38, lFold: .35, rFold: .35, lArm: .1, lElbow: .7, rArm: .1, rElbow: .4 };
 const cross = { ...s.att, crouch: 0, bend: 0, lean: 0, lLeg: 0, rLeg: 0, lFold: 0, rFold: 0, lArm: 0, lElbow: 0, rArm: 0, rElbow: 0 };
 add('attacker', .68, wide, 65, 1);
 add('attacker', turn - .01, cross, 62, 1);
 add('attacker', turn, cross, 62);
 add('attacker', .92, { ...wide, lLeg: -.3, rLeg: .3, lElbow: .8, rElbow: .4 }, 58);
 add('attacker', 1.0, { ...s.att, bend: .2, lean: 0, lArm: -.1, lElbow: 1.4, rArm: -.2, rElbow: .7 });
 add('attacker', tuck, { ...s.att, bend: .2, lean: 0 });
 // The receiver rolls over while the attacker brings the leg into position.
 // At the facing swap the straight leg has the same world direction on both
 // sides. Step the mirrored pose instead of blending through an upright body.
 const rollPose = { ...s.def, tilt: Math.PI/2, lift: -100, lLeg: -.5,
   rLeg: .1, lFold: 0, rFold: 0, lArm: .05, rArm: .05, lElbow: 0, rElbow: 0 };
 add('defender', .86, { ...rollPose, tilt: -Math.PI/2, lLeg: .5,
   rLeg: -.1, lArm: -.05, rArm: -.05 }, 0, -1);
 add('defender', roll, rollPose);
 frames.defender.at(-1).ease = 'step';
 add('defender', 1.0, { ...s.def, tilt: 1.65, lift: -97, lFold: s.def.lFold - .45 });
 add('defender', tuck, s.def);
 // Each pull: he sits back (hips low, torso leans back) and drags the leg with him; the man slides toward him.
 for (const [at, back] of [[1.6,1],[2.0,0],[2.5,1],[2.9,0],[3.4,1],[3.8,0],[end,0]]) {
   add('attacker', at, { ...s.att, bend: s.att.bend + (back ? -.3 : .1), lean: s.att.lean + (back ? -.22 : 0) });
   add('defender', at, { ...s.def, lLeg: s.def.lLeg - (back ? .2 : 0), lFold: s.def.lFold + (back ? .25 : 0) });
   frames.defender.at(-1).x = 120 - (back ? s.drag ?? 12 : 0);
 }
 // One elbow stays braced while the other fist pounds on each pull.
 const support = { ...s.def };
 const punches = [
   { peak: 1.6, arm: 'l', up: [3.0, .9], hit: [2.65, .2] },
   { peak: 2.5, arm: 'r', up: [3.6, .9], hit: [3.0, .2] },
   { peak: 3.4, arm: 'l', up: [3.0, .9], hit: [2.65, .2] },
 ];
 const baseFrames = [...frames.defender].sort((a,b)=>a.at-b.at);
 const atPose = at => {
   let i=0; while(i+1<baseFrames.length && baseFrames[i+1].at<=at) i++;
   const a=baseFrames[i], b=baseFrames[Math.min(i+1,baseFrames.length-1)];
   const k=b.at===a.at?0:(at-a.at)/(b.at-a.at);
   return Object.fromEntries(Object.keys(a.pose).map(n=>[n,typeof a.pose[n]==='number'?a.pose[n]+((b.pose[n]??a.pose[n])-a.pose[n])*k:a.pose[n]]));
 };
 for(const {peak,arm,up,hit} of punches) {
   for(const [at,v] of [[peak-.3,null],[peak-.15,up],[peak-.08,up],[peak,hit],[peak+.08,hit],[peak+.2,null]]) {
     const pose={...atPose(at),lArm:support.lArm,lElbow:support.lElbow,rArm:support.rArm,rElbow:support.rElbow};
     if(v) {pose[arm+'Arm']=v[0];pose[arm+'Elbow']=v[1];}
     const f={at,pose,x:120,y:0,facing:1,parts:{nearForearm:arm==='l'&&v?'grip':'base',farForearm:arm==='r'&&v?'grip':'base'}};
     frames.defender=frames.defender.filter(k=>Math.abs(k.at-at)>.0001);frames.defender.push(f);
   }
 }

 for (const f of frames.attacker) f.ease = 'easeInOut';
 for (const list of Object.values(frames)) list.sort((a,b)=>a.at-b.at);
 const order = front ?? [['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm']];
 return { duration:end, rollAt:roll, frames, phases:[{from:0,to:turn,attSign:1,defSign:-1,release:.1},{from:turn,to:roll,attSign:-1,defSign:-1,arms:[]},{from:roll,to:tuck,attSign:-1,defSign:1,arms:[],release:.2},{from:tuck,to:end,attSign:-1,defSign:1,arms:[]}], layers:[{from:0,to:roll,order},{from:roll,to:end,order:[['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],['attacker','farArm'],['attacker','nativeBody'],['defender','lLeg'],['attacker','nearArm']]}] };
}
