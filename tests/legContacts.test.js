import test from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import Wrestler from '../src/Wrestler.js';
import {matMoveClip} from '../src/animation/clips/matMoves.js';
import {validateClip} from '../src/animation/AnimationClip.js';
import MoveRuntime from '../src/animation/MoveRuntime.js';
import {reachableCalfFraction} from '../src/animation/legContacts.js';

test('calf contact fits shorter legs higher without changing the requested hook for longer legs',()=>{
    const knee={x:0,y:50},ankle={x:0,y:100},hip={x:0,y:0};
    const short=reachableCalfFraction(knee,ankle,hip,60,.65,.05);
    assert.ok(Math.abs(short-.2)<1e-10);
    assert.equal(reachableCalfFraction(knee,ankle,hip,95,.65,.05),.65);
    for(const facing of [1,-1]){
        const t=reachableCalfFraction(knee,ankle,hip,60,.65,.05,{x:12*facing,y:0});
        assert.ok(Math.abs(Math.hypot(12,50+50*t)-60)<1e-10);
    }
    assert.equal(reachableCalfFraction(knee,ankle,{x:0,y:-50},40,.65,.05),.05,'unreachable comfort goal stops at the closest calf point');
});

test('forward hook knee keeps the same side when the calf target crosses the hip axis',()=>{
    for(const facing of [1,-1])for(const dx of [-1,0,1]){
        const sk=Object.create(Skeleton.prototype);
        sk.jointAttachmentPoints={nearHip:{x:0,y:0},nearKnee:{x:0,y:50},nearAnkle:{x:0,y:100}};
        sk.reachLeg('near',{x:dx,y:60},1,'forward',1,facing);
        assert.ok(sk.jointAttachmentPoints.nearKnee.x*facing>10);
    }
});

test('support floor contact uses the painted sole rather than an ankle proxy',()=>{
    const sk=Object.create(Skeleton.prototype);sk._parts=[];sk.jointAttachmentPoints={nearHip:{x:0,y:200}};
    sk.soleWorld=side=>{assert.equal(side,'near');return{x:5,y:303}};
    let dy;sk._rotateAbout=(parts,points,pivot,angle,y)=>{dy=y};
    sk.holdOnFloor('nearSole',300,1,1,0);assert.equal(dy,-3);
});

test('leg contact blends preserve thigh and shin length in both facings',()=>{
    for(const facing of [1,-1])for(const side of ['near','far'])for(const bend of ['up','down'])for(const weight of [.05,.3,.7,1]){
        const sk=Object.create(Skeleton.prototype);
        sk.jointAttachmentPoints={ [side+'Hip']:{x:0,y:0},[side+'Knee']:{x:0,y:50},[side+'Ankle']:{x:0,y:95}};
        sk._placeLimbPart=()=>{};
        const goal={x:60*facing,y:30};
        const r=sk.reachLeg(side,goal,weight,bend,1,facing),p=sk.jointAttachmentPoints;
        assert.ok(Math.abs(Math.hypot(p[side+'Knee'].x,p[side+'Knee'].y)-50)<1e-8);
        assert.ok(Math.abs(Math.hypot(p[side+'Ankle'].x-p[side+'Knee'].x,p[side+'Ankle'].y-p[side+'Knee'].y)-45)<1e-8);
        if(weight===1)assert.ok(r.err<1e-8);
    }
});

test('leg solve carries painted pivot offsets, knee overlap and the boot as rigid artwork',()=>{
    const sk=Object.create(Skeleton.prototype);
    const image=(x,y)=>({x,y,rotation:0,visible:true,displayWidth:20,displayHeight:70,
        setPosition(x,y){this.x=x;this.y=y;return this},setRotation(r){this.rotation=r;return this}});
    sk.nearThigh=image(2,-3);sk.nearShin=image(3,47);sk.nearBoot=image(0,95);
    sk.jointAttachmentPoints={nearHip:{x:0,y:0},nearKnee:{x:0,y:50},nearAnkle:{x:0,y:95}};
    sk.semanticAnchors={'nearBoot.sole':{x:5,y:100}};
    sk.reachLeg('near',{x:60,y:30},1);
    const rotate=(x,y,r)=>({x:x*Math.cos(r)-y*Math.sin(r),y:x*Math.sin(r)+y*Math.cos(r)});
    const T=sk.nearThigh,S=sk.nearShin,B=sk.nearBoot,K=sk.jointAttachmentPoints.nearKnee,A=sk.jointAttachmentPoints.nearAnkle;
    const kneeFromThigh=rotate(-2,53,T.rotation),kneeFromShin=rotate(-3,3,S.rotation);
    assert.ok(Math.hypot(T.x+kneeFromThigh.x-K.x,T.y+kneeFromThigh.y-K.y)<1e-8);
    assert.ok(Math.hypot(S.x+kneeFromShin.x-K.x,S.y+kneeFromShin.y-K.y)<1e-8);
    assert.ok(Math.hypot(B.x-A.x,B.y-A.y)<1e-8,'boot follows the new ankle');
    for(const img of [T,S,B]){assert.equal(img.displayWidth,20);assert.equal(img.displayHeight,70)}
    const sole=rotate(5,5,B.rotation);
    assert.ok(Math.hypot(sk.semanticAnchors['nearBoot.sole'].x-A.x-sole.x,sk.semanticAnchors['nearBoot.sole'].y-A.y-sole.y)<1e-8);
});

test('invalid contact roles, sides and windows are rejected before runtime',()=>{
    const source=matMoveClip('bodyScissors');assert.equal(validateClip(source).ok,true);
    for(const change of [{role:'missing'},{side:'left'},{in:[2,1]}]){
        const bad={...source,legContacts:[{...source.legContacts[0],...change}]};
        assert.equal(validateClip(bad).ok,false);
    }
});

test('leapfrog arrival delay keeps clip events and contact windows valid',()=>{
    for(const delay of [.01,.7,1.2]){
        const clip=matMoveClip('leapfrog',0,{delay});assert.equal(validateClip(clip).ok,true);
        assert.ok(Math.abs(clip.events[0].at-(.45+delay))<1e-8);
        assert.ok(clip.tracks.attacker.keyframes.every((k,i,a)=>i===0||k.at>a[i-1].at));
    }
});

test('flying mare keeps arm control through the shoulder load and lands after the flip',()=>{
    const clip=matMoveClip('flyingMare');
    assert.equal(validateClip(clip).ok,true);
    const impact=clip.events.find(e=>e.type==='impact').at;
    assert.ok(clip.grips.some(g=>g.to.joint==='Wrist'&&g.out[0]>=.95));
    const flight=clip.tracks.defender.keyframes.filter(k=>k.at>=.95&&k.at<=impact);
    assert.ok(flight.every((k,i)=>i===0||k.pose.tilt>flight[i-1].pose.tilt));
    assert.equal(flight.at(-1).pose.tilt,3*Math.PI/2);
    assert.ok(clip.floorContacts.some(c=>c.point==='nearKnee'&&c.out[0]>=impact));
});

test('knee support moves the complete body to the mat rather than stretching a segment',()=>{
    const sk=Object.create(Skeleton.prototype);
    sk._parts=[];sk.jointAttachmentPoints={nearKnee:{x:30,y:200},nearHip:{x:0,y:160}};
    let translation;
    sk._rotateAbout=(parts,joints,hip,angle,dy)=>{translation=dy;assert.equal(joints.length,2);assert.equal(angle,0)};
    sk.holdOnFloor('nearKnee',300,1,1,0);
    assert.equal(translation,94);
});

test('threaded boot grip follows the solved leg and the authored trapping channel in both facings',()=>{
    for(const facing of [1,-1]){
        const order=[];
        const attacker={pose:{},s:1,facing,skeleton:{setPartVariants(){},lChannelSide:f=>f===1?'near':'far',jointAttachmentPoints:{nearKnee:{x:10,y:20},farKnee:{x:80,y:20}}},
            holdGrips(list){order.push('grip');assert.equal(list[0].arm,facing===1?'l':'r');assert.deepEqual(list[0].partner.skeleton.jointAttachmentPoints.nearAnkle,{x:facing===1?10:80,y:20});}};
        const defender={pose:{},s:1,facing:-facing,skeleton:{setPartVariants(){},jointAttachmentPoints:{},reachLeg(side,goal){order.push('leg');this.jointAttachmentPoints[side+'Ankle']={...goal};}}};
        const tracks=Object.fromEntries(['attacker','defender'].map(role=>[role,{keyframes:[{at:0,pose:{}},{at:1,pose:{}}]}]));
        const window={in:[0,0],out:[.9,1]};
        const source={id:'thread-grip',duration:1,tracks,legContacts:[{role:'defender',side:'near',to:{role:'attacker',joint:'Knee',side:'near',channel:'l'},...window}],
            grips:[{role:'attacker',arm:'near',to:{role:'defender',joint:'Ankle',side:'same'},afterLegs:true,...window}]};
        const rt=new MoveRuntime();rt.register(source);rt.play(source.id,{attacker,defender});rt.update(.5);rt.afterDraw();
        assert.deepEqual(order,['leg','grip']);
        assert.equal(validateClip({...source,legContacts:[{...source.legContacts[0],role:'attacker'}]}).ok,false,'late grip must not erase its actor leg contact');
        assert.equal(validateClip({...source,legContacts:[{...source.legContacts[0],to:{...source.legContacts[0].to,channel:'invalid'}}]}).ok,false);
    }
});

test('outside hook swings away first and returns onto the calf, mirrored in either facing',()=>{
    const contact=matMoveClip('abdominalStretch').legContacts[0];
    for(const facing of [1,-1]){
        let goal;
        const a={pose:{},s:1,facing,skeleton:{setPartVariants(){},reachLeg(side,p){goal={...p}}}};
        const d={pose:{},s:1,facing,skeleton:{setPartVariants(){},jointAttachmentPoints:{farHip:{x:0,y:0},farKnee:{x:0,y:50},farAnkle:{x:0,y:100}}}};
        const tracks=Object.fromEntries(['attacker','defender'].map(role=>[role,{keyframes:[{at:0,pose:{}}]}]));
        const source={id:'outside-swing',duration:5,tracks,legContacts:[contact]};
        const rt=new MoveRuntime();rt.register(source);rt.play(source.id,{attacker:a,defender:d});
        rt.update(.7);rt.afterDraw();const kick={...goal};
        rt.update(.3);rt.afterDraw();
        assert.ok(Math.abs((kick.x-goal.x)*facing-26)<1e-8,'foot first clears outside, then folds back');
        assert.ok(kick.y<goal.y,'kick lifts clear before hooking');
        const hooked={...goal};rt.update(2);rt.afterDraw();assert.deepEqual(goal,hooked);
        rt.update(.3);rt.afterDraw();assert.ok(Math.hypot(goal.x-kick.x,goal.y-kick.y)<1e-8,'release reverses the same outward swing before lowering');
        assert.equal(validateClip({...source,legContacts:[{...contact,sweep:{...contact.sweep,apex:2}}]}).ok,false);
    }
});

test('fall catch plants both physical hands and holds their floor points as the body falls',()=>{
    for(const facing of [1,-1])for(const lSide of ['near','far']){
        let list;
        const man={pose:{},s:1,facing,y:300,skeleton:{setPartVariants(){},lChannelSide:()=>lSide,jointAttachmentPoints:{nearShoulder:{x:50,y:260},farShoulder:{x:60,y:260}}},holdGrips(items){list=items}};
        const tracks={defender:{keyframes:[{at:0,pose:{}}]}};
        const grips=matMoveClip('abdominalStretch').grips.filter(g=>g.to.joint==='Floor');
        const rt=new MoveRuntime();rt.register({id:'catch',duration:5,tracks,grips});rt.play('catch',{defender:man});rt.update(3.86);rt.afterDraw();
        const first=list.map(g=>({...g.at}));assert.equal(first.length,2);
        assert.deepEqual(first,[{x:50+14*facing,y:293},{x:60+4*facing,y:293}]);
        man.skeleton.jointAttachmentPoints.nearShoulder.x+=20;man.skeleton.jointAttachmentPoints.farShoulder.x+=20;
        rt.update(.1);rt.afterDraw();assert.deepEqual(list.map(g=>g.at),first,'palms stay put as elbows buckle');
        rt.update(.25);rt.afterDraw();assert.deepEqual(list.map(g=>g.at),first,'palms stay planted through the landing bounce');
    }
});

test('stretch knee fitting preserves Lou and changes only the other rigs painted overlap',()=>{
    const reference=matMoveClip('abdominalStretch',100,{attackerRigId:'thesz-procreate-v1'});
    assert.equal(reference.legContacts[0].kneeOverlap,3);
    for(const [attackerRigId,overlap]of [['george-roster-v1',1.5],['kowalski-roster-v1',2],['guido-roster-v1',0]]){
        const fitted=matMoveClip('abdominalStretch',100,{attackerRigId});
        assert.equal(fitted.legContacts[0].kneeOverlap,overlap);
        assert.deepEqual(fitted.legContacts[0].kneeArtOffset,attackerRigId==='kowalski-roster-v1'?{x:2,y:2}:attackerRigId==='guido-roster-v1'?{x:2.5,y:2.5}:undefined);
        delete fitted.legContacts[0].kneeArtOffset;
        fitted.legContacts[0].kneeOverlap=3;
        assert.deepEqual(fitted,reference,'rig fit preserves the hook, release, grips, damage events and layer timing');
    }
});


test('folded knee artwork tucks along the calf without slipping sideways or changing the solve',()=>{
    for(const facing of [1,-1])for(const weight of [.3,1]){
        const make=()=>{
            const sk=Object.create(Skeleton.prototype);
            const image=(x,y)=>({x,y,rotation:0,visible:true,setPosition(x,y){this.x=x;this.y=y;return this},setRotation(r){this.rotation=r;return this}});
            sk.farThigh=image(0,0);sk.farShin=image(0,50);sk.farBoot=image(0,95);
            sk.semanticAnchors={'farBoot.sole':{x:3,y:100}};
            sk.jointAttachmentPoints={farHip:{x:0,y:0},farKnee:{x:0,y:50},farAnkle:{x:0,y:95}};
            return sk;
        };
        const base=make(),fit=make(),goal={x:35*facing,y:35};
        base.reachLeg('far',goal,weight,'forward',1,facing,0);
        fit.reachLeg('far',goal,weight,'forward',1,facing,4);
        assert.deepEqual(fit.jointAttachmentPoints,base.jointAttachmentPoints);
        const k=base.jointAttachmentPoints.farKnee,a=base.jointAttachmentPoints.farAnkle;
        const len=Math.hypot(a.x-k.x,a.y-k.y),dx=-(a.x-k.x)/len*4*weight,dy=-(a.y-k.y)/len*4*weight;
        for(const name of ['farShin','farBoot']){
            assert.ok(Math.abs(fit[name].x-base[name].x-dx)<1e-8);
            assert.ok(Math.abs(fit[name].y-base[name].y-dy)<1e-8);
            assert.equal(fit[name].rotation,base[name].rotation);
        }
        const b=base.semanticAnchors['farBoot.sole'],f=fit.semanticAnchors['farBoot.sole'];
        assert.ok(Math.hypot(f.x-b.x-dx,f.y-b.y-dy)<1e-8);
    }
});


test('painted knee offset mirrors outward, blends down, and preserves the joint solve',()=>{
    for(const facing of [1,-1])for(const weight of [.4,1]){
        const make=()=>{
            const sk=Object.create(Skeleton.prototype);
            const image=()=>({x:0,y:50,rotation:0,visible:true,setPosition(x,y){this.x=x;this.y=y;return this},setRotation(r){this.rotation=r;return this}});
            sk.farShin=image();sk.farBoot=image();
            sk.semanticAnchors={'farBoot.sole':{x:0,y:100}};
            sk.jointAttachmentPoints={farHip:{x:0,y:0},farKnee:{x:0,y:50},farAnkle:{x:0,y:95}};
            return sk;
        };
        const a=make(),b=make(),goal={x:30*facing,y:40};
        a.reachLeg('far',goal,weight,'forward',2,facing,2);
        b.reachLeg('far',goal,weight,'forward',2,facing,2,{x:2,y:1.5});
        assert.deepEqual(a.jointAttachmentPoints,b.jointAttachmentPoints);
        for(const [p,q]of [[a.farShin,b.farShin],[a.farBoot,b.farBoot],[a.semanticAnchors['farBoot.sole'],b.semanticAnchors['farBoot.sole']]]){
            assert.ok(Math.abs(q.x-p.x-4*facing*weight)<1e-8);
            assert.ok(Math.abs(q.y-p.y-3*weight)<1e-8);
        }
    }
    const source=matMoveClip('abdominalStretch');
    for(const kneeArtOffset of [null,{x:NaN,y:0},{x:0,y:7}])assert.equal(validateClip({...source,legContacts:[{...source.legContacts[0],kneeArtOffset}]}).ok,false);
});


test('relative arm poses keep the worked arm near across rig channel mappings and facings',()=>{
    for(const facing of [1,-1])for(const lSide of ['near','far']){
        const actor={pose:{},facing,skeleton:{lChannelSide:()=>lSide}};
        Wrestler.prototype.applyAnimationSample.call(actor,{pose:{nearArm:-.3,nearElbow:-2.7,farArm:.7,farElbow:1.1}});
        const near=lSide==='near'?'l':'r',far=near==='l'?'r':'l';
        assert.equal(actor.pose[near+'Arm'],-.3);assert.equal(actor.pose[near+'Elbow'],-2.7);
        assert.equal(actor.pose[far+'Arm'],.7);assert.equal(actor.pose[far+'Elbow'],1.1);
        assert.equal(actor.pose.nearArm,undefined,'semantic keys are consumed rather than left on the live pose');
    }
});


test('grip handoff blends the captured held wrist, independent of changing authored arm poses',()=>{
    let contact;
    const actor={pose:{},s:1,facing:1,skeleton:{lChannelSide:()=> 'near',setPartVariants(){},jointAttachmentPoints:{nearWrist:{x:10,y:20},nearHip:{x:100,y:100}}},holdGrips(items){contact=items[0]}};
    const source={id:'handoff',duration:2,tracks:{defender:{keyframes:[{at:0,pose:{}}]}},grips:[{role:'defender',arm:'near',to:{role:'defender',joint:'Hip',side:'same'},in:[.5,1],out:[1.5,2],blendFromHand:true}]};
    const rt=new MoveRuntime();rt.register(source);rt.play(source.id,{defender:actor});rt.update(.4);rt.afterDraw();
    actor.skeleton.jointAttachmentPoints.nearWrist={x:200,y:300};rt.update(.35);rt.afterDraw();
    assert.deepEqual(contact.at,{x:55,y:60});assert.equal(contact.w,1,'hand stays fully constrained while target moves');
    rt.update(.25);rt.afterDraw();assert.deepEqual(contact.at,{x:100,y:100});
});
