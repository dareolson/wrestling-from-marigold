import test from 'node:test';
import assert from 'node:assert/strict';
import {newHeadPerformance,addHeadWear,startHeadSpeech,startHeadReaction,sampleHeadPerformance} from '../src/animation/headPerformance.js';
test('wear persists across speech and cannot heal from negative damage',()=>{
 let s=addHeadWear(newHeadPerformance(),70);s=startHeadSpeech(s,'referee',100);
 assert.equal(sampleHeadPerformance(s,200).stage,2);assert.equal(sampleHeadPerformance(s,3000).mouth,0);
 assert.equal(addHeadWear(s,-20).wear,70);assert.equal(addHeadWear(s,100).wear,100);
 assert.equal(newHeadPerformance().stage,0);
});
test('speech has multiple shapes, expires, and action suppresses it',()=>{
 const s=startHeadSpeech(newHeadPerformance(),'audience',100);
 assert.deepEqual(new Set([100,195,290].map(t=>sampleHeadPerformance(s,t).mouth)),new Set([0,1,2]));
 assert.equal(sampleHeadPerformance(s,300,true).talking,false);
 assert.equal(sampleHeadPerformance(s,2500).talking,false);
 assert.equal(sampleHeadPerformance(s,0).talking,false);
 assert.throws(()=>startHeadSpeech(s,'missing',0));
});

test('pain cancels boasting and speech, preserves wear and blocks new boasts until recovery',()=>{
 let s=startHeadReaction(addHeadWear(newHeadPerformance(),70),'smug',0);
 assert.equal(sampleHeadPerformance(s,400).family,'smug');
 s=startHeadReaction(s,'pain',500);
 assert.equal(s.speech,null);
 assert.equal(sampleHeadPerformance(s,700).family,'pain');
 assert.equal(startHeadReaction(s,'smug',800),s);
 assert.equal(startHeadSpeech(s,'referee',800),s);
 assert.equal(sampleHeadPerformance(s,2000).family,'talk');
 assert.equal(sampleHeadPerformance(s,2000).talking,false);
 assert.equal(sampleHeadPerformance(s,2000).stage,2);
 assert.equal(sampleHeadPerformance(s,700,true).family,'talk');
 s=startHeadReaction(startHeadSpeech(s,'referee',2100),'pain',2200);
 assert.equal(s.speech,null);
 assert.equal(sampleHeadPerformance(s,3700).talking,false);
});
