import test from 'node:test';
import assert from 'node:assert/strict';
import {locomotionArms} from '../src/animation/locomotionArms.js';
const tau=2*Math.PI;

test('locomotion arm cycles are periodic, mirrored, and keep natural elbow flex',()=>{
    for(const running of [0,.3,1])for(const guard of [0,.5,1])for(let i=0;i<80;i++){
        const phase=i/80*tau,a=locomotionArms(phase,running,guard),b=locomotionArms(phase+tau,running,guard);
        for(const side of ['near','far']){
            assert.ok(Math.abs(a[side].upper-b[side].upper)<1e-10);
            assert.ok(Math.abs(a[side].forearm-b[side].forearm)<1e-10);
            const flex=a[side].forearm-a[side].upper;
            assert.ok(flex>.1&&flex<1.6);
            for(const facing of [1,-1]){
                const upper=facing*a[side].upper,fore=facing*a[side].forearm;
                assert.ok(Math.abs((fore-upper)*facing-flex)<1e-10);
            }
        }
    }
});

test('the rearward running stroke takes the hand behind the shoulder, then returns it forward',()=>{
    const wrist=(phase,side)=>{const a=locomotionArms(phase,1,0)[side];return Math.sin(a.upper+.09)*38+Math.sin(a.forearm+.09)*26;};
    assert.ok(wrist(0,'near')<0);
    assert.ok(wrist(Math.PI,'near')>0);
    assert.ok(wrist(0,'far')>0);
    assert.ok(wrist(Math.PI,'far')<0);
});

test('nearby guard still owns the arms at full guard',()=>{
    for(const phase of [0,1,3,5])for(const running of [0,1]){
        const a=locomotionArms(phase,running,1);
        for(const side of ['near','far']){
            assert.ok(Math.abs(a[side].upper-.6)<1e-10);
            assert.ok(Math.abs(a[side].forearm-1.5)<1e-10);
        }
    }
});
