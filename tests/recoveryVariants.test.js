import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryVariantClip,RECOVERY_VARIANTS} from '../src/animation/clips/recoveryVariants.js';
import {matMoveClip} from '../src/animation/clips/matMoves.js';
import {compileClip,sampleClip,validateClip} from '../src/animation/AnimationClip.js';

test('recovery variants build valid clips without modifying the accepted getup',()=>{
    const before=matMoveClip('backwardRoll');
    for(const attackerRigId of ['thesz-procreate-v1','george-roster-v1','kowalski-roster-v1','guido-roster-v1']){
        for(const id of RECOVERY_VARIANTS){
            const clip=recoveryVariantClip(id,{attackerRigId});
            assert.equal(validateClip(clip).ok,true,JSON.stringify(validateClip(clip).errors));
            for(let t=0;t<clip.duration;t+=1/60){
                const pose=sampleClip(compileClip(clip),t).tracks.attacker.pose;
                assert.ok(Object.values(pose).every(Number.isFinite),id);
            }
        }
    }
    assert.deepEqual(matMoveClip('backwardRoll'),before);
});

test('rocking entry preserves every accepted recovery key and shifted contact window',()=>{
    const base=matMoveClip('backwardRoll');
    for(const [id,delay,retreat] of [['rockingRecovery',.8,10]]){
        const clip=recoveryVariantClip(id),keys=clip.tracks.attacker.keyframes;
        for(const original of base.tracks.attacker.keyframes.slice(1)){
            const shifted=keys.find(k=>Math.abs(k.at-original.at-delay)<1e-8);
            assert.deepEqual(shifted.pose,original.pose);
            assert.equal(shifted.transform.x,original.transform.x-retreat);
        }
        assert.equal(clip.duration,+(base.duration+delay).toFixed(4));
        for(const group of ['grips','plants'])for(const [i,c] of base[group].entries()){
            assert.deepEqual(clip[group][i].in,c.in.map(t=>+(t+delay).toFixed(4)));
            assert.deepEqual(clip[group][i].out,c.out.map(t=>+(t+delay).toFixed(4)));
        }
    }
    assert.equal(recoveryVariantClip('backwardRollEscape').tracks.attacker.keyframes[0].pose.tilt,0);
});

test('standing escape retreats immediately into a tuck without a flat knockdown beat',()=>{
    const clip=recoveryVariantClip('backwardRollEscape'),keys=clip.tracks.attacker.keyframes;
    assert.ok(clip.duration<2.2);
    assert.ok(keys[1].transform.x< -10&&keys[1].pose.crouch>.5);
    assert.ok(keys.slice(0,4).every(k=>k.pose.tilt!==-Math.PI/2));
    assert.ok(keys.every((k,i)=>i===0||k.transform.x<keys[i-1].transform.x||k.transform.x===keys[i-1].transform.x));
});

test('kip-up springs forward into a landing without inheriting the backward somersault',()=>{
    const clip=recoveryVariantClip('kipUp');
    assert.ok(clip.tracks.attacker.keyframes.every(k=>k.pose.tilt>-Math.PI));
    assert.ok(clip.tracks.attacker.keyframes.some(k=>k.pose.lift>0));
    assert.ok(clip.tracks.attacker.keyframes.at(-1).transform.x>0);
    assert.ok(clip.floorContacts.find(c=>c.point==='nearSole').in[0]>clip.events[0].at);
});

test('kip-up settles into the supplied wrestling stance before returning control',()=>{
    const idle={lLeg:-.08,rLeg:.02,lShin:-.18,rShin:-.16,crouch:.1};
    const clip=recoveryVariantClip('kipUp',{landingPose:idle});
    const last=clip.tracks.attacker.keyframes.at(-1).pose;
    for(const channel of Object.keys(idle))assert.ok(Math.abs(last[channel]-idle[channel])<1e-10,channel);
    assert.deepEqual(idle,{lLeg:-.08,rLeg:.02,lShin:-.18,rShin:-.16,crouch:.1});
});
