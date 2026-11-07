// PLAN_GRAPPLES T2.0: preview-only art swap after today's unmodified grip IK.
// No runtime source edits, semantic registration, custom IK or contact correction.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=root+'Sprite sheets/AI Pilot/shared/articulation-donors/2026-11-07-clasps-v1/';
const configs=JSON.parse(readFileSync(out+'donors.json'));
const fits=Object.fromEntries(Object.keys(configs).map(n=>[n,JSON.parse(readFileSync(out+n+'/fit-measurements.json'))]));
const pairs=[['lou-on-george','thesz-procreate-v1','george-roster-v1'],['george-on-lou','george-roster-v1','thesz-procreate-v1']];
mkdirSync(out+'stills',{recursive:true});const records=[];
for(const [pair,a,d] of pairs){
 process.env.WFM_P1=a;process.env.WFM_P2=d;process.env.WFM_QS='notitle=1&grapples=v1&waistlock=v1';
 const h=await launch();
 try{
  const p=h.page;await p.setViewportSize({width:960,height:600});await p.waitForTimeout(1800);await p.evaluate(INSTALL);
  const assets=[];for(const n of Object.keys(configs))for(const id of [a,d])assets.push({key:'claspProof_'+n+'_'+id,url:'data:image/png;base64,'+readFileSync(root+fits[n].rigs[id].output).toString('base64')});
  await p.evaluate(async assets=>{const sc=window.__WFM_GAME.scene.scenes[0];for(const x of assets)await new Promise((res,rej)=>{sc.textures.once('addtexture-'+x.key,res);sc.textures.once('onerror',rej);sc.textures.addBase64(x.key,x.url);});},assets);
  for(const facing of [1,-1])for(const mode of ['lockup','waistlock']){
   await p.evaluate(()=>{const sc=window.__WFM_GAME.scene.scenes[0];sc.waistlockState=null;sc.dropState=null;sc._exitBlend=null;for(const w of [sc.w1,sc.w2]){w._facingLock=false;w._fixedHold=false;w._gripSignCache={};}});
   await p.evaluate(SETUP,{facing,midX:520,startGap:80,flag:true,seed:123});
   for(let i=0;i<33;i++)await p.evaluate(STEP,{});
   if(mode==='waistlock'){
    await p.evaluate(()=>{const sc=window.__WFM_GAME.scene.scenes[0];sc._beginWaistlock(sc.lockupState,1);});
    for(let i=0;i<62;i++)await p.evaluate(STEP,{});
   }
   const rows=await p.evaluate(async({mode,fits,ids})=>{
    const sc=window.__WFM_GAME.scene.scenes[0];
    const {lockupGrips,gripTarget}=await import('/src/animation/lockup.js');const {waistlockGrips}=await import('/src/animation/waistlock.js');
    const state=mode==='lockup'?sc.lockupState:sc.waistlockState;if(!state)throw Error(mode+' expired');
    const lists=mode==='lockup'?lockupGrips(state.attacker,state.defender,state.grapple.grips):waistlockGrips(state.attacker,state.defender,state.grips);
    const swaps=[],rows=[];
    for(const [role,w,id] of [['attacker',state.attacker,ids[0]],['defender',state.defender,ids[1]]]){
     if(mode==='waistlock'&&role!=='attacker')continue;
     const items=mode==='lockup'?lists[role]:lists[role].slice(0,1);
     for(let i=0;i<items.length;i++){
      const item=items[i],n=mode==='waistlock'?'waistClasp':i===0?'collarTie':'elbowCup';
      const sk=w.skeleton,side=item.arm==='l'?sk.lChannelSide(w.facing):(sk.lChannelSide(w.facing)==='near'?'far':'near'),img=sk[side+'Forearm'];
      const old={key:img.texture.key,frame:img.frame.name,scaleX:img.scaleX,scaleY:img.scaleY,originX:img.originX,originY:img.originY};
      const fit=fits[n].rigs[id],oldW=img.width,oldH=img.height;
      img.setTexture('claspProof_'+n+'_'+id);img.setScale(old.scaleX*oldW/img.width,old.scaleY*oldH/img.height);
      // The fitting preserves this canvas's elbow, so use its rig pivot as origin
      // while retaining the base sprite's world elbow location (no IK correction).
      const E=sk.jointAttachmentPoints[side+'Elbow'];
      img.setOrigin(fit.pivot.x/img.width,fit.pivot.y/img.height);img.setPosition(E.x,E.y);
      const local={x:(fit.semanticAnchors.clutch.u-img.originX)*img.width,y:(fit.semanticAnchors.clutch.v-img.originY)*img.height};
      // flip flags are part of Phaser's art mapping, not the transform matrix.
      if(img.flipX)local.x=((1-fit.semanticAnchors.clutch.u)-img.originX)*img.width;
      if(img.flipY)local.y=((1-fit.semanticAnchors.clutch.v)-img.originY)*img.height;
      const m=img.getWorldTransformMatrix(),C=m.transformPoint(local.x,local.y),T=gripTarget(item,side);
      rows.push({role,rig:id,variant:n,side,target:T,palm:{x:C.x,y:C.y},palmGapPx:Math.hypot(C.x-T.x,C.y-T.y),elbowPivotGapPx:Math.hypot(img.x-E.x,img.y-E.y),gripWeight:item.w});
      swaps.push({img,old});
     }
    }
    window.__claspUndo=()=>{for(const{img,old:o}of swaps){img.setTexture(o.key,o.frame);img.setOrigin(o.originX,o.originY);img.setScale(o.scaleX,o.scaleY);}};
    // Render swapped art without advancing the simulation or running different IK.
    window.__WFM_GAME.renderer.preRender();window.__WFM_GAME.scene.render(window.__WFM_GAME.renderer);window.__WFM_GAME.renderer.postRender();
    return rows;
   },{mode,fits,ids:[a,d]});
   const id=pair+'-'+mode+'-'+(facing>0?'right':'left');
   const shot=await p.screenshot({path:out+'stills/'+id+'-1x.png',clip:{x:250,y:100,width:480,height:450}});
   const zoom=await p.evaluate(async url=>{const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=im.width*3;c.height=im.height*3;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/png');},'data:image/png;base64,'+shot.toString('base64'));
   writeFileSync(out+'stills/'+id+'-3x.png',Buffer.from(zoom.split(',')[1],'base64'));
   records.push({id,mode,facing,rows});await p.evaluate(()=>window.__claspUndo());
   console.log(id,rows.map(r=>r.variant+' '+r.rig+' '+r.side+' gap='+r.palmGapPx.toFixed(2)).join('; '));
  }
 }finally{await h.close();}
}
writeFileSync(out+'pose-measurements.json',JSON.stringify(records,null,2)+'\n');
