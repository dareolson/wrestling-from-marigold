import test from 'node:test';
import assert from 'node:assert/strict';
import { shadowProjection, syncCharacterShadow, characterShadowsEnabled } from '../src/rendering/characterShadows.js';
const project = (m, x, y) => ({ x: m.a*x+m.c*y+m.e, y:m.b*x+m.d*y+m.f });
test('character shadow keeps mat contacts fixed and casts elevated points consistently', () => {
    const m = shadowProjection({state:'standing',y:360});
    assert.deepEqual(project(m,330,360),{x:330,y:360});
    const head = project(m,330,160);
    assert.ok(head.x>330 && head.y>360);
    assert.deepEqual(shadowProjection({state:'standing',y:360,facing:-1}),m);
});
test('lying down retains the light projection instead of duplicating the body', () => {
    for (const angle of ['original', 'reference']) {
        const m = shadowProjection({state:'down', y:360}, angle);
        const contact = project(m,450,360);
        assert.ok(Math.abs(contact.x-450)<1e-9 && Math.abs(contact.y-360)<1e-9);
        assert.notDeepEqual(project(m,450,340), {x:450,y:340});
        assert.deepEqual(m, shadowProjection({state:'holding',y:360},angle));
    }
});
test('corner and routed ground attacks anchor at mat depth', () => {
    const corner=shadowProjection({state:'standing',y:210,_onRopes:()=>true,_corner:{matY:300}});
    assert.deepEqual(project(corner,400,300),{x:400,y:300});
    const routed=shadowProjection({state:'down',y:360,_groundAttack:{root:{y:390}}});
    assert.deepEqual(project(routed,400,390),{x:400,y:390});
});
test('shadow prototype stays off in Node and needs no rendering stand-ins', () => {
    assert.equal(characterShadowsEnabled(),false);
    assert.equal(syncCharacterShadow({}),false);
});

test('standing projection follows actual planted paint rather than an ideal foot target', () => {
    const skeleton = {nearFoot:{planted:true,y:360},farFoot:{planted:false,y:350},
        nearShin:{_soleAnchorFrac:{u:.5,v:.9}},
        constructor:{imageAnchorPoint:()=>({x:330,y:355})}};
    const w={state:'standing',y:360,skeleton};
    assert.deepEqual(project(shadowProjection(w),330,355),{x:330,y:355});
    // An authored lift must not be pulled down to stale locomotion foot records.
    const lifted=shadowProjection({...w,_activeMove:{}});
    assert.deepEqual(project(lifted,330,360),{x:330,y:360});
});


test('fall, impact and recovery never collapse or flip the light projection', () => {
    for (const angle of ['original', 'reference']) {
        const reference = shadowProjection({state:'standing',y:370},angle);
        for (let i=0; i<=100; i++) for (const state of ['falling','risingUp','gettingUp','down','elbowDropping']) {
            const m=shadowProjection({state,y:370,fallProgress:i/100,riseT:i/100},angle);
            assert.deepEqual(m,reference,`${angle} ${state} ${i}`);
            assert.ok(Math.abs(m.a*m.d-m.b*m.c)>=.29);
        }
    }
});
