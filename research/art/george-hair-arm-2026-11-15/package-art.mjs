import {chromium} from 'playwright-core';
import {writeFileSync,readFileSync} from 'node:fs';
import {decodeRgbaPng} from '../../../tools/wrestler-cutter/validate-source-manifest.mjs';
import {encodeRgbaPng} from '../../../tools/wrestler-cutter/export-v2-sheet.mjs';
const out=new URL('./',import.meta.url).pathname;
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage();
await p.goto('http://127.0.0.1:5201/');
const reports=[];
for(const spec of [
 {name:'upperArm-hairReach-v1',source:'upperArm-hairReach-source-v1.png',base:'upper_arm.png',w:296,h:410,keep:150,blend:12},
 {name:'forearm-hairFix-v1',source:'forearm-hairFix-source-v1.png',base:'forearm.png',w:426,h:439,keep:233,blend:22},
]){
 const r=await p.evaluate(async s=>{
  const root='/research/art/george-hair-arm-2026-11-15/';
  const load=async url=>{const im=new Image();im.src=url;await im.decode();return im;};
  const src=await load(root+'sources/'+s.source),base=await load(root+'references/'+s.base);
  const cv=document.createElement('canvas');cv.width=s.w;cv.height=s.h;const ctx=cv.getContext('2d');ctx.drawImage(src,0,0,s.w,s.h);
  const bc=document.createElement('canvas');bc.width=s.w;bc.height=s.h;const bx=bc.getContext('2d');bx.drawImage(base,0,0);
  const art=ctx.getImageData(0,0,s.w,s.h),orig=bx.getImageData(0,0,s.w,s.h);
  for(let y=0;y<=s.keep+s.blend;y++)for(let x=0;x<s.w;x++){
   const i=(y*s.w+x)*4,t=y<=s.keep?0:(y-s.keep)/s.blend;
   for(let c=0;c<4;c++)art.data[i+c]=Math.round(orig.data[i+c]*(1-t)+art.data[i+c]*t);
  }
  ctx.putImageData(art,0,0);let capDiff=0;for(let i=0;i<(s.keep+1)*s.w*4;i++)if(art.data[i]!==orig.data[i])capDiff++;
  return {png:cv.toDataURL('image/png').split(',')[1],sourceCanvas:[src.width,src.height],canvas:[s.w,s.h],capDiff,capRows:[0,s.keep],blendRows:[s.keep+1,s.keep+s.blend]};
 },spec);
 // Canvas performs premultiplication at translucent edges; restore the original
 // cap bytes after resampling so the delivered joint cap is pixel-identical.
 const packed=decodeRgbaPng(Buffer.from(r.png,'base64')),original=decodeRgbaPng(readFileSync(out+'references/'+spec.base));
 packed.rgba.set(original.rgba.subarray(0,(spec.keep+1)*spec.w*4),0);
 writeFileSync(out+spec.name+'.png',encodeRgbaPng(packed));delete r.png;r.capDiff=0;reports.push({file:spec.name+'.png',...r});
}
writeFileSync(out+'packaging.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));await b.close();
