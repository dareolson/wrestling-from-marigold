import test from 'node:test';
import assert from 'node:assert/strict';
import {matMoveClip} from '../src/animation/clips/matMoves.js';
import {headScissorsClip} from '../src/animation/clips/headScissors.js';
import {validateClip} from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import Skeleton from '../src/Skeleton.js';

test('head-scissors knees cannot reverse past straight during contact blends, in either facing or body rotation',()=>{
    for(const facing of [1,-1])for(const rotation of [-2,-.5,0,1.8])for(const weight of [.01,.25,.5,.75,1])for(const goal of [{x:60,y:30},{x:-40,y:50},{x:20,y:-70}]){
        const turn=p=>({x:facing*(p.x*Math.cos(rotation)-p.y*Math.sin(rotation)),y:p.x*Math.sin(rotation)+p.y*Math.cos(rotation)});
        const sk=Object.create(Skeleton.prototype);
        sk.jointAttachmentPoints={nearHip:{x:0,y:0},nearKnee:turn({x:0,y:50}),nearAnkle:turn({x:0,y:95})};
        sk.reachLeg('near',turn(goal),weight,'anatomical',1,facing);
        const {nearHip:H,nearKnee:K,nearAnkle:A}=sk.jointAttachmentPoints;
        const ux=K.x-H.x,uy=K.y-H.y,vx=A.x-K.x,vy=A.y-K.y;
        const flex=facing*Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
        assert.ok(flex>=-1e-10&&flex<=2.45+1e-10,`reversed knee: ${flex}`);
        assert.ok(Math.abs(Math.hypot(ux,uy)-50)<1e-8);
        assert.ok(Math.abs(Math.hypot(vx,vy)-45)<1e-8);
    }
    assert.ok(headScissorsClip().legContacts.every(c=>c.bend==='anatomical'));
});

test('seated head-scissors support grounds the hips instead of forcing the head onto the floor',()=>{
    const sk=Object.create(Skeleton.prototype);sk._parts=[];
    sk.jointAttachmentPoints={nearHip:{x:10,y:280},farHip:{x:20,y:284},neck:{x:15,y:230}};
    let dy;
    sk._rotateAbout=(parts,points,pivot,angle,shift)=>{dy=shift;};
    sk.holdOnFloor('hips',300,1,.5,0);
    assert.equal(dy,6);
});

test('body and head scissors validate across the current roster and keep distinct contact locations',()=>{
    for(const attackerRigId of ['thesz-procreate-v1','george-roster-v1','guido-roster-v1','kowalski-roster-v1']){
        for(const distance of [62,100,130]){
            const body=matMoveClip('bodyScissors',distance,{attackerRigId});
            const before=structuredClone(body);
            const head=headScissorsClip(distance,{attackerRigId});
            for(const c of [body,head])assert.equal(validateClip(c).ok,true,JSON.stringify(validateClip(c).errors));
            assert.equal(body.legContacts[0].to.joint,'Hip');
            assert.equal(head.legContacts[0].to.joint,'Neck');
            assert.deepEqual(head.legContacts[1].to,{role:'attacker',joint:'Ankle',side:'far',x:3,y:-14});
            assert.deepEqual(matMoveClip('bodyScissors',distance,{attackerRigId}),before);
        }
    }
});

test('neck targeting resolves the central neck joint before the opposite ankle crosses onto the solved leg',()=>{
    for(const facing of [1,-1]){
        const order=[],joints={farAnkle:{x:0,y:0}};
        const a={pose:{},s:1,facing,skeleton:{setPartVariants(){},jointAttachmentPoints:joints,
            reachLeg(side,goal){order.push({side,goal:{...goal}});joints[side+'Ankle']={...goal};}}};
        const d={pose:{},s:1,facing,skeleton:{setPartVariants(){},jointAttachmentPoints:{neck:{x:50,y:60}}}};
        const tracks=Object.fromEntries(['attacker','defender'].map(role=>[role,{keyframes:[{at:0,pose:{}}]}]));
        const contacts=headScissorsClip().legContacts.map(c=>({...c,in:[0,0],out:[.9,1],pulses:[]}));
        const rt=new MoveRuntime();rt.register({id:'scissors-contact-test',duration:1,tracks,legContacts:contacts});
        rt.play('scissors-contact-test',{attacker:a,defender:d});rt.update(.5);rt.afterDraw();
        assert.deepEqual(order,[{side:'far',goal:{x:50+30*facing,y:62}},{side:'near',goal:{x:50+33*facing,y:48}}]);
    }
});

test('pressure pulses tighten the neck and ankle targets smoothly, then return to the base lock',()=>{
    for(const facing of [1,-1]){
        const joints={farAnkle:{x:0,y:0}},goals={};
        const a={pose:{},s:1,facing,skeleton:{setPartVariants(){},jointAttachmentPoints:joints,
            reachLeg(side,goal){goals[side]={...goal};joints[side+'Ankle']={...goal};}}};
        const d={pose:{},s:1,facing,skeleton:{setPartVariants(){},jointAttachmentPoints:{neck:{x:50,y:60}}}};
        const contacts=headScissorsClip().legContacts.map((c,i)=>({...c,in:[0,0],out:[1,1],pulses:[{in:[.2,.4],out:[.6,.8],x:i===0?-3:-2,y:i===0?-2:-3}]}));
        const tracks=Object.fromEntries(['attacker','defender'].map(role=>[role,{keyframes:[{at:0,pose:{}}]}]));
        const source={id:'pressure-test',duration:1,tracks,legContacts:contacts};
        const rt=new MoveRuntime();rt.register(source);rt.play(source.id,{attacker:a,defender:d});
        rt.update(.1);rt.afterDraw();assert.deepEqual(goals.far,{x:50+30*facing,y:62});
        rt.update(.4);rt.afterDraw();assert.deepEqual(goals.far,{x:50+27*facing,y:60});
        assert.deepEqual(goals.near,{x:50+28*facing,y:43});
        rt.update(.4);rt.afterDraw();assert.deepEqual(goals.far,{x:50+30*facing,y:62});
        const bad=structuredClone(source);bad.legContacts[0].pulses[0].out=[.6,2];
        assert.equal(validateClip(bad).ok,false);
    }
    const clip=headScissorsClip();
    assert.equal(clip.duration,14.05);
    assert.deepEqual(clip.events.map(e=>e.at),[3.9,6.5,9.1]);
    assert.ok(clip.tracks.defender.keyframes.some(k=>k.parts.head==='pain'));
});


test('head scissors releases neck and ankle contacts before the backward roll turns over',()=>{
    const clip=headScissorsClip();
    const turnover=clip.tracks.attacker.keyframes.find(k=>k.pose.tilt < -2);
    assert.ok(turnover);
    assert.ok(clip.legContacts.every(c=>c.out[1] < turnover.at));
    assert.ok(clip.grips.filter(c=>c.to.role==='defender').every(c=>c.out[1] < turnover.at));
    assert.ok(clip.floorContacts.some(c=>c.point==='shoulders'&&c.in[0] < turnover.at));
    assert.ok(clip.tracks.attacker.keyframes.at(-1).pose.tilt < -6);
    assert.equal(validateClip(clip).ok,true);
    const overlapping=structuredClone(clip);
    overlapping.grips.find(c=>c.role==='attacker'&&c.afterLegs).in=[2,2.5];
    assert.equal(validateClip(overlapping).ok,false);
    assert.equal(clip.layers.filter(w=>w.from<2.35&&w.to>1.75).length,1);
});
