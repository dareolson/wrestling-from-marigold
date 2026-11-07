// PLAN_GRAPPLES T2.0: deterministic whole-canvas forearm donor fitting. Art only; no registration.
// node tools/debug/build_forearm_variant.mjs [all|collarTie|elbowCup|waistClasp|sleeperWrap] [--check]
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {decodeRgbaPng} from '../wrestler-cutter/validate-source-manifest.mjs';
import {encodeRgbaPng} from '../wrestler-cutter/export-v2-sheet.mjs';
import {theszProcreateV1} from '../../src/characters/thesz_procreate_v1.js';
import {georgeRosterV1} from '../../src/characters/george_roster_v1.js';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const shared=root+'Sprite sheets/AI Pilot/shared/articulation-donors/2026-11-07-clasps-v1/';
const configs=JSON.parse(readFileSync(shared+'donors.json'));
const selected=process.argv.slice(2).find(a=>!a.startsWith('--'))??'all';
if(selected!=='all'&&selected!=='sleeperWrap'&&!configs[selected])throw Error('Unknown variant: '+selected);
const allResults={};
if(selected==='all'||selected==='sleeperWrap'){
 const r=spawnSync(process.execPath,[root+'tools/debug/build_sleeper_wrap.mjs',...(process.argv.includes('--check')?['--check']:[])],{encoding:'utf8'});
 if(r.status!==0)throw Error(r.stderr||r.stdout);
 console.log('sleeperWrap: existing fit '+(process.argv.includes('--check')?'verified':'rebuilt'));
}
for(const [name,config] of Object.entries(configs)){
 if(selected!=='all'&&selected!==name)continue;
 const masterBytes=readFileSync(shared+config.master),master=decodeRgbaPng(masterBytes);
 const crook=config.masterElbow;
 const cp=config.masterContact;
 if(!Number.isFinite(cp.x)||!Number.isFinite(cp.y)||cp.x<0||cp.y<0||cp.x>=master.w||cp.y>=master.h)throw Error(name+': invalid master contact');
 if(master.rgba[(Math.floor(cp.y)*master.w+Math.floor(cp.x))*4+3]<128)throw Error(name+': contact is not on painted palm');
const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
function inkRuns(im){const runs=[];for(let y=0;y<im.h;y++){let len=0;for(let x=0;x<=im.w;x++){const i=(y*im.w+x)*4,dark=x<im.w&&im.rgba[i+3]>=128&&Math.max(...im.rgba.subarray(i,i+3))<90;if(dark)len++;else if(len){if(len<=16)runs.push(len);len=0;}}}return runs;}
function tone(im){const c=[[],[],[]];for(let i=0;i<im.rgba.length;i+=4){const p=im.rgba;if(p[i+3]>220&&p[i]>130&&p[i]>p[i+1]*1.05&&p[i+1]>p[i+2])for(let j=0;j<3;j++)c[j].push(p[i+j]);}return c.map(a=>a.length?median(a):180);}
const sourceTone=tone(master);
const result={master:'master.png',masterSha256:createHash('sha256').update(masterBytes).digest('hex'),masterCanvas:[master.w,master.h],masterElbow:crook,masterContact:config.masterContact,rigs:{}};
for(const [id,rig] of [['thesz-procreate-v1',theszProcreateV1],['george-roster-v1',georgeRosterV1]]){
 const basePath=root+'src/assets/wrestlers/'+id+'/forearm.png',bytes=readFileSync(basePath),base=decodeRgbaPng(bytes),entry=rig.textures.forearm;
 const pivot={x:(.5+entry.pivotOffsetFrac)*base.w,y:entry.jointPivotFrac*base.h};
 // Bound the entire registered canvas around its elbow, not the alpha bbox.
 // Registration can move the source down on George: reserve that space so
 // an otherwise correct whole-canvas scale cannot clip a fingertip.
 const wholeCanvasFit=Math.min(base.w/master.w,base.h/master.h,
  pivot.x/crook.x,(base.w-1-pivot.x)/(master.w-1-crook.x),
  pivot.y/crook.y,(base.h-1-pivot.y)/(master.h-1-crook.y));
 const scale={x:wholeCanvasFit,y:wholeCanvasFit},shift={x:pivot.x-crook.x*scale.x,y:pivot.y-crook.y*scale.y};
 const keep=Math.floor(pivot.y)-8,blend=8,targetTone=tone(base),delta=targetTone.map((v,i)=>v-sourceTone[i]);
 const out={w:base.w,h:base.h,rgba:new Uint8Array(base.w*base.h*4)};
 // Inverse map the WHOLE source canvas, then register its crook at the elbow.
 // Bilinear sampling is premultiplied-alpha; no bbox fit, silhouette crop or browser round trip.
 for(let y=0;y<base.h;y++)for(let x=0;x<base.w;x++){
  const sx=(x+.5-shift.x)/scale.x-.5,sy=(y+.5-shift.y)/scale.y-.5,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
  const rgba=[0,0,0,0];for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const px=ix+xx,py=iy+yy;if(px<0||py<0||px>=master.w||py>=master.h)continue;const j=(py*master.w+px)*4,w=(xx?fx:1-fx)*(yy?fy:1-fy),a=master.rgba[j+3]/255;rgba[3]+=a*w;for(let c=0;c<3;c++)rgba[c]+=master.rgba[j+c]*a*w;}
  const i=(y*base.w+x)*4,k=Math.max(0,Math.min(1,(y-keep)/blend)),ba=base.rgba[i+3]/255,ga=rgba[3],a=ba*(1-k)+ga*k;
  for(let c=0;c<3;c++){let v=ga?rgba[c]/ga:0;const skinWeight=Math.max(0,Math.min(1,(v-65)/80));v=Math.max(0,Math.min(255,v+delta[c]*skinWeight));out.rgba[i+c]=a?Math.round((base.rgba[i+c]*ba*(1-k)+v*ga*k)/a):0;}
  out.rgba[i+3]=Math.round(a*255);
  if(y<=keep)out.rgba.set(base.rgba.subarray(i,i+4),i); // exact original cap, including transparent RGB
 }
 // Graft the silhouette gradually too: alpha blending alone exposes a wide
 // lateral shelf as soon as the first generated row crosses the paint threshold.
 const edges=(im,y)=>{let lo=im.w,hi=-1;for(let x=0;x<im.w;x++)if(im.rgba[(y*im.w+x)*4+3]>=40){lo=Math.min(lo,x);hi=Math.max(hi,x);}return[lo,hi];};
 const startEdge=edges(base,keep),endEdge=edges(out,keep+blend);
 for(let y=keep+1;y<keep+blend;y++){const k=(y-keep)/blend,lo=Math.floor(startEdge[0]*(1-k)+endEdge[0]*k),hi=Math.ceil(startEdge[1]*(1-k)+endEdge[1]*k);
  for(let x=0;x<base.w;x++)if(x<lo||x>hi)out.rgba.fill(0,(y*base.w+x)*4,(y*base.w+x+1)*4);}
 // Match short horizontal ink-run thickness to this rig's base; do not grow alpha,
 // alter cap pixels, or treat broad shadow shapes as outlines.
 const baseInkMedian=median(inkRuns(base)),beforeInkMedian=median(inkRuns(out));
 const beforeInk=out.rgba.slice();
 for(let y=keep+blend+1;y<base.h;y++){let start=-1;for(let x=0;x<=base.w;x++){const i=(y*base.w+x)*4,dark=x<base.w&&beforeInk[i+3]>=128&&Math.max(...beforeInk.subarray(i,i+3))<90;if(dark&&start<0)start=x;if(!dark&&start>=0){const len=x-start;if(len<baseInkMedian&&len<=16){const pad=baseInkMedian-len,lo=start-Math.floor(pad/2),hi=x+Math.ceil(pad/2);for(let xx=lo;xx<hi;xx++){if(xx<0||xx>=base.w)continue;const j=(y*base.w+xx)*4;if(beforeInk[j+3]<128)continue;const near=Math.max(start,Math.min(x-1,xx)),k=(y*base.w+near)*4;for(let c=0;c<3;c++)out.rgba[j+c]=beforeInk[k+c];}}start=-1;}}}
 const output=root+'src/assets/wrestlers/'+id+'/forearm_'+config.outputName+'.png';
 const expected=encodeRgbaPng(out);
 if(process.argv.includes('--check')){if(!readFileSync(output).equals(expected))throw Error(id+': stale fit; rebuild');}
 else writeFileSync(output,expected);
 let capDiff=0,opaque=0,ink=0,bbox=[base.w,base.h,-1,-1],seamMax=0;
 for(let y=0;y<base.h;y++){let min=base.w,max=-1,prevMin=base.w,prevMax=-1;for(let x=0;x<base.w;x++){const i=(y*base.w+x)*4;if(y<=keep)for(let c=0;c<4;c++)if(out.rgba[i+c]!==base.rgba[i+c])capDiff++;if(out.rgba[i+3]>=40){opaque++;min=Math.min(min,x);max=Math.max(max,x);bbox=[Math.min(bbox[0],x),Math.min(bbox[1],y),Math.max(bbox[2],x),Math.max(bbox[3],y)];if(Math.max(...out.rgba.subarray(i,i+3))<90)ink++;}
 if(y>keep&&y<=keep+blend+1&&out.rgba[i-4*base.w+3]>=40){prevMin=Math.min(prevMin,x);prevMax=Math.max(prevMax,x);}}
 if(y>keep&&y<=keep+blend+1&&min<=max&&prevMin<=prevMax)seamMax=Math.max(seamMax,Math.abs(min-prevMin),Math.abs(max-prevMax));}
 result.rigs[id]={canvas:[base.w,base.h],baseSha256:createHash('sha256').update(bytes).digest('hex'),pivot,contact:{x:config.masterContact.x*scale.x+shift.x,y:config.masterContact.y*scale.y+shift.y},semanticAnchors:{clutch:{u:(config.masterContact.x*scale.x+shift.x)/base.w,v:(config.masterContact.y*scale.y+shift.y)/base.h}},wholeCanvasScale:scale,registrationShift:shift,capRows:[0,keep],blendRows:[keep+1,keep+blend],capChangedChannels:capDiff,sourceSkinMedian:sourceTone,targetSkinMedian:targetTone,fittedSkinMedian:tone(out),toneShift:delta,baseInkMedianPx:baseInkMedian,beforeInkMedianPx:beforeInkMedian,fittedInkMedianPx:median(inkRuns(out)),alpha40Pixels:opaque,inkPixelsUnder90:ink,bboxAlpha40:bbox,maxJoinRowEdgeStepPx:seamMax,output:output.slice(root.length)};
 const c=result.rigs[id].semanticAnchors.clutch;
 if(c.u<0||c.u>1||c.v<0||c.v>1)throw Error(id+': contact outside canvas');
 if(capDiff)throw Error('cap changed');
}
const reportText=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(shared+name+'/fit-measurements.json','utf8')!==reportText)throw Error(name+': stale fit measurements');}
else writeFileSync(shared+name+'/fit-measurements.json',reportText);
console.log(name+': '+Object.entries(result.rigs).map(([id,r])=>id+' '+r.canvas.join('x')+' capDiff='+r.capChangedChannels).join('; '));
allResults[name]=result;

}
