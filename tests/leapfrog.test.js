import test from 'node:test';
import assert from 'node:assert/strict';
import { leapfrogDuckPose, leapfrogPressWeight } from '../src/animation/leapfrog.js';
import { matMoveClip } from '../src/animation/clips/matMoves.js';
import { validateClip } from '../src/animation/AnimationClip.js';

test('back support follows approach timing and releases before the apex',()=>{
    for(const apex of [.45,1.02]) {
        assert.equal(leapfrogPressWeight(apex-.32,apex),0);
        assert.equal(leapfrogPressWeight(apex-.22,apex),1);
        assert.ok(leapfrogPressWeight(apex-.12,apex)>0);
        assert.equal(leapfrogPressWeight(apex,apex),0);
    }
});

test('leapfrog duck lowers the runner through passage without changing his live pose or running legs',()=>{
    const pose={bend:.12,crouch:.05,lLeg:.4,rLeg:-.3,lElbow:1};
    const snapshot={...pose};
    const duck=leapfrogDuckPose(pose,.45,.45);
    assert.equal(duck.bend,1.25);
    assert.equal(duck.crouch,1.45);
    assert.equal(duck.lLeg,pose.lLeg);
    assert.equal(duck.rLeg,pose.rLeg);
    assert.deepEqual(pose,snapshot);
    assert.equal(leapfrogDuckPose(pose,0,.45),pose);
    assert.equal(leapfrogDuckPose(pose,1,.45),pose);
});

test('leapfrog duck follows the delayed apex and releases smoothly',()=>{
    const apex=1.02,pose={bend:0,crouch:0};
    assert.equal(leapfrogDuckPose(pose,.45,apex),pose);
    assert.equal(leapfrogDuckPose(pose,apex,apex).bend,1.25);
    const release=leapfrogDuckPose(pose,apex+.3,apex);
    assert.ok(release.bend>0&&release.bend<1.25);
    assert.equal(leapfrogDuckPose(pose,apex+.4,apex),pose);
});

test('fractional leapfrog approach delays keep the landing plant inside the clip',()=>{
    for(const delay of [.5303921568627451,.1234567,1.1999999]) {
        const clip=matMoveClip('leapfrog',0,{delay});
        assert.equal(validateClip(clip).ok,true,JSON.stringify(validateClip(clip).errors));
        assert.ok(clip.plants.every(p=>p.out[1]<=clip.duration));
    }
});

