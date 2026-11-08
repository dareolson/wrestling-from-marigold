// PLAN_GRAPPLES T2.0b: George's original shaft + a George-style hand only.
// Called by build_forearm_variant.mjs; never changes rows y <= 252.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeRgbaPng} from '../wrestler-cutter/validate-source-manifest.mjs';
import {encodeRgbaPng} from '../wrestler-cutter/export-v2-sheet.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const georgeDonorRoot='Sprite sheets/AI Pilot/shared/articulation-donors/2026-11-07-george-clasps-v2/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const median=a=>a.length?a.sort((a,b)=>a-b)[Math.floor(a.length/2)]:0;
function tone(im,y0,y1){const v=[[],[],[]];for(let y=y0;y<y1;y++)for(let x=0;x<im.w;x++){const i=(y*im.w+x)*4,p=im.rgba;if(p[i+3]>220&&p[i]>150&&p[i]>p[i+1]*1.05&&p[i+1]>p[i+2])for(let c=0;c<3;c++)v[c].push(p[i+c]);}return v.map(median);}
export function fitGeorgeClasp(name,rig,{check=false}={}){
 const config=JSON.parse(readFileSync(root+georgeDonorRoot+'donors.json'))[name];if(!config)throw Error('Missing George hand: '+name);
 const baseFile='src/assets/wrestlers/george-roster-v1/forearm.png',baseBytes=readFileSync(root+baseFile),base=decodeRgbaPng(baseBytes);
 const bytes=readFileSync(root+georgeDonorRoot+config.master),src=decodeRgbaPng(bytes),cp=config.sourceContact;
 if(src.rgba[(cp.y*src.w+cp.x)*4+3]<128)throw Error(name+': palm anchor not painted');
 const {scale,sourceWrist,targetWrist,wristRow,blendRows}=config;
 const shift={x:targetWrist.x-sourceWrist.x*scale.x,y:targetWrist.y-sourceWrist.y*scale.y};
 const out={w:base.w,h:base.h,rgba:new Uint8Array(base.rgba)}; // includes every transparent RGBA byte
 const srcTone=tone(src,sourceWrist.y,src.h),targetTone=tone(base,wristRow-24,wristRow),delta=targetTone.map((v,i)=>v-srcTone[i]);
 const edges=(im,y)=>{let lo=im.w,hi=-1;for(let x=0;x<im.w;x++)if(im.rgba[(y*im.w+x)*4+3]>=40){lo=Math.min(lo,x);hi=Math.max(hi,x);}return[lo,hi];};
 for(let y=wristRow;y<base.h;y++)for(let x=0;x<base.w;x++){
  const sx=(x+.5-shift.x)/scale.x-.5,sy=(y+.5-shift.y)/scale.y-.5,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
  const p=[0,0,0,0];for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const px=ix+xx,py=iy+yy;if(px<0||py<0||px>=src.w||py>=src.h)continue;const j=(py*src.w+px)*4,w=(xx?fx:1-fx)*(yy?fy:1-fy),a=src.rgba[j+3]/255;p[3]+=w*a;for(let c=0;c<3;c++)p[c]+=src.rgba[j+c]*w*a;}
  const i=(y*base.w+x)*4,k=Math.min(1,(y-wristRow)/blendRows),ba=base.rgba[i+3]/255,ga=p[3],a=ba*(1-k)+ga*k;
  for(let c=0;c<3;c++){const raw=ga?p[c]/ga:0,v=Math.max(0,Math.min(255,raw+delta[c]*Math.max(0,Math.min(1,(raw-65)/80))));out.rgba[i+c]=a?Math.round((base.rgba[i+c]*ba*(1-k)+v*ga*k)/a):0;}
  out.rgba[i+3]=Math.round(a*255);
  if(y===wristRow)out.rgba.set(base.rgba.subarray(i,i+4),i);
 }
 // A contour transition is confined to the hand-side of the wrist boundary.
 const first=edges(base,wristRow),last=edges(out,wristRow+blendRows);
 for(let y=wristRow+1;y<wristRow+blendRows;y++){const k=(y-wristRow)/blendRows,lo=Math.floor(first[0]*(1-k)+last[0]*k),hi=Math.ceil(first[1]*(1-k)+last[1]*k);for(let x=0;x<base.w;x++)if(x<lo||x>hi)out.rgba.fill(0,(y*base.w+x)*4,(y*base.w+x+1)*4);}
 let changed=0,above=0,channels=0,bbox=[base.w,base.h,-1,-1];
 for(let y=0;y<base.h;y++)for(let x=0;x<base.w;x++){const i=(y*base.w+x)*4;let diff=false;for(let c=0;c<4;c++)if(base.rgba[i+c]!==out.rgba[i+c]){channels++;diff=true;}if(diff){changed++;if(y<=wristRow)above++;bbox=[Math.min(bbox[0],x),Math.min(bbox[1],y),Math.max(bbox[2],x),Math.max(bbox[3],y)];}}
 if(above)throw Error(name+': shaft changed');
 const contact={x:cp.x*scale.x+shift.x,y:cp.y*scale.y+shift.y},entry=rig.textures.forearm,pivot={x:(.5+entry.pivotOffsetFrac)*base.w,y:entry.jointPivotFrac*base.h};
 if(contact.y<wristRow||contact.x<0||contact.x>=base.w||contact.y>=base.h)throw Error(name+': bad contact');
 if(check){const a=rig.textures.variants?.forearm?.[name]?.semanticAnchors?.clutch;if(!a||Math.abs(a.u-contact.x/base.w)>1e-10||Math.abs(a.v-contact.y/base.h)>1e-10)throw Error(name+': stale registered George contact anchor');}
 const output='src/assets/wrestlers/george-roster-v1/forearm_'+config.outputName+'.png',expected=encodeRgbaPng(out);
 if(check){if(!readFileSync(root+output).equals(expected))throw Error(name+': stale George hand fit');}else writeFileSync(root+output,expected);
 return {canvas:[base.w,base.h],baseSha256:hash(baseBytes),master:georgeDonorRoot+config.master,masterSha256:hash(bytes),masterCanvas:[src.w,src.h],sourceWrist,sourceContact:cp,handScale:scale,registrationShift:shift,pivot,contact,semanticAnchors:{clutch:{u:contact.x/base.w,v:contact.y/base.h}},wristRow,preservedRows:[0,wristRow],blendRows:[wristRow,wristRow+blendRows],capChangedChannels:0,changedPixelsAboveWrist:above,changedPixels:changed,changedRgbaChannels:channels,changedBounds:bbox,sourceSkinMedian:srcTone,targetSkinMedian:targetTone,fittedHandSkinMedian:tone(out,wristRow+blendRows,base.h),toneShift:delta,output};
}

// Anchor-only metadata update. No variant registration or grip behavior is changed.
export function writeGeorgeClaspAnchor(name,anchor){
 const path=root+'src/characters/george_roster_v1.js';let text=readFileSync(path,'utf8');
 const re=new RegExp('("'+name+'":\\s*\\{[\\s\\S]*?"clutch":\\s*\\{\\s*"u":\\s*)[-0-9.eE]+(,\\s*"v":\\s*)[-0-9.eE]+');
 if(!re.test(text))throw Error('George anchor missing: '+name);
 text=text.replace(re,(_,a,b)=>a+anchor.u+b+anchor.v);writeFileSync(path,text);
}
