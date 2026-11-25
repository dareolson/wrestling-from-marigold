import test from 'node:test';
import assert from 'node:assert/strict';
import {walkPresentation,walkSwing,walkLoad} from '../src/animation/walkPresentation.js';
import Skeleton,{footGait} from '../src/Skeleton.js';
import Wrestler,{gaitV2Config} from '../src/Wrestler.js';

test('walking swing meets the planted sole with continuous position and velocity',()=>{
    const g={STRIDE:80,STANCE:.6,LIFT:18,walkWeight:1},tau=2*Math.PI,h=1e-6;
    for(const boundary of [g.STANCE*tau,tau]){
        const a=footGait(boundary-h,g),b=footGait(boundary,g),c=footGait(boundary+h,g);
        assert.ok(Math.abs((b.fx-a.fx)/h-(c.fx-b.fx)/h)<.001);
        assert.ok(Math.abs((b.lift-a.lift)/h-(c.lift-b.lift)/h)<.001);
    }
    for(const f of [1,-1])for(let i=0;i<50;i++){
        const p=i/50*g.STANCE*tau,dx=g.STRIDE/(g.STANCE*tau)*p;
        assert.ok(Math.abs(f*(dx+footGait(p,g).fx)-f*g.STRIDE*.5)<1e-9);
    }
    assert.equal(walkSwing(0,80,.6).liftFrac,0);
    assert.equal(walkSwing(1,80,.6).liftFrac,0);
});

test('walking presentation relaxes guard without writing into authored poses',()=>{
    const p={lArm:.7,rArm:.8,lElbow:.9,rElbow:1,crouch:.1};
    const before=structuredClone(p),drawn=walkPresentation(p,1,1);
    assert.deepEqual(p,before);
    assert.ok(drawn.guard>0&&drawn.guard<1);
    assert.ok(drawn.pose.lElbow<p.lElbow);
    assert.equal(walkPresentation(p,0,1).pose,p);
    assert.equal(walkLoad(0,.6),0);
    assert.ok(walkLoad(.1*2*Math.PI,.6)>.9);
});

test('walking trial leaves running and authored clip gait parameters unchanged',()=>{
    const config=search=>{globalThis.location={search};try{return gaitV2Config();}finally{delete globalThis.location;}};
    const candidate=config('?walk=v1'),baseline=config('?walk=off');
    const actor=g=>Object.assign(Object.create(Wrestler.prototype),{_gaitV2:g,state:'standing',_heightScale:.8});
    const a=actor(candidate),b=actor(baseline);a.rigId=b.rigId='george-roster-v1';
    assert.notEqual(a._gaitParamsAt(0).STRIDE,b._gaitParamsAt(0).STRIDE);
    for(const state of ['running','slamming','holding'])for(const w of [0,.5,1]){
        a.state=b.state=state;
        const x=a._gaitParamsAt(w),y=b._gaitParamsAt(w);
        assert.equal(x.walkWeight??0,0);
        delete x.walkWeight;
        assert.deepEqual(x,y);
    }
});

test('separate foot tracks remain planted as each hip moves past the supporting sole',()=>{
    const sk=Object.create(Skeleton.prototype);sk._gaitParams={hipTracks:1};
    for(const facing of [1,-1])for(const offset of [-8,8]){
        let first;
        for(let i=0;i<40;i++){
            const x=300+facing*i*.5,hip={x:x+facing*offset,y:10};
            const leg=sk._gaitLeg({fx:20-i*.5,lift:0},facing,x,10,100,50,50,1,1,hip);
            const ankle={x:leg.hx+Math.sin(leg.thighAng)*50+Math.sin(leg.shinAng)*50,
                y:leg.hy+Math.cos(leg.thighAng)*50+Math.cos(leg.shinAng)*50};
            first??=ankle;
            assert.ok(Math.abs(ankle.x-first.x)<1e-8);
            assert.ok(Math.abs(ankle.y-100)<1e-8);
            assert.ok(Math.abs(first.x-(300+facing*(20+offset)))<1e-8);
        }
    }
});
