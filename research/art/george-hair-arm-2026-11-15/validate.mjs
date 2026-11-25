import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeRgbaPng} from '../../../tools/wrestler-cutter/validate-source-manifest.mjs';
const root=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const specs=[['upperArm-hairReach-v1.png','upper_arm.png',296,410,150,{x:148.4,y:246}],['forearm-hairFix-v1.png','forearm.png',426,439,233,{x:250,y:359}]];
const results=specs.map(([file,base,w,h,keep,anchor])=>{
 const bytes=readFileSync(new URL(file,root)),im=decodeRgbaPng(bytes),refBytes=readFileSync(new URL('references/'+base,root)),ref=decodeRgbaPng(refBytes);
 const live=readFileSync(new URL('../../../src/assets/wrestlers/george-roster-v1/'+base,root));
 let changed=0,edgeAlpha=0;for(let i=0;i<(keep+1)*w*4;i++)if(im.rgba[i]!==ref.rgba[i])changed++;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if((x===0||x===w-1||y===0||y===h-1)&&im.rgba[(y*w+x)*4+3]>0)edgeAlpha++;
 const anchorAlpha=im.rgba[(Math.floor(anchor.y)*w+Math.floor(anchor.x))*4+3];
 const r={file,canvas:[im.w,im.h],sha256:hash(bytes),originalCapRows:[0,keep],changedCapChannels:changed,edgeAlphaPixels:edgeAlpha,anchor,anchorAlpha,baseStillMatchesReference:live.equals(refBytes)};
 if(im.w!==w||im.h!==h||changed||edgeAlpha||anchorAlpha<128||!r.baseStillMatchesReference)throw Error(JSON.stringify(r));return r;
});
writeFileSync(new URL('validation.json',root),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
