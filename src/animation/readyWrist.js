// Deform continuously through the narrow wrist instead of cutting a hand
// slice off the forearm. Proximal pixels and all rig anchors stay fixed.
export function readyWristPoint(x,y,w,h,angle) {
    const px=w*.50,py=h*.585;
    const u=Math.max(0,Math.min(1,(y/h-.50)/.18)),weight=u*u*(3-2*u);
    const dx=x-px,dy=y-py,c=Math.cos(angle),s=Math.sin(angle);
    return {x:x+weight*(px+1.25*(dx*c-dy*s)-x),
        y:y+weight*(py+1.25*(dx*s+dy*c)-y)};
}

function triangle(ctx,image,src,dst) {
    const [p,q,r]=src,[a,b,c]=dst;
    const sx=q.x-p.x,sy=q.y-p.y,tx=r.x-p.x,ty=r.y-p.y,det=sx*ty-tx*sy;
    const ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y;
    const m11=(ux*ty-vx*sy)/det,m12=(uy*ty-vy*sy)/det;
    const m21=(sx*vx-tx*ux)/det,m22=(sx*vy-tx*uy)/det;
    const mx=(a.x+b.x+c.x)/3,my=(a.y+b.y+c.y)/3;
    ctx.save();ctx.beginPath();
    // Tiny overlap avoids antialiased cracks between neighboring triangles.
    dst.forEach((v,n)=>{const dx=v.x-mx,dy=v.y-my,k=.25/(Math.hypot(dx,dy)||1);
        ctx[n?'lineTo':'moveTo'](v.x+dx*k,v.y+dy*k);});
    ctx.closePath();ctx.clip();
    ctx.setTransform(m11,m12,m21,m22,a.x-m11*p.x-m21*p.y,a.y-m12*p.x-m22*p.y);
    ctx.drawImage(image,0,0);ctx.restore();
}

export function readyWristTexture(scene,baseKey,angle=0) {
    const step=Math.max(-12,Math.min(12,Math.round(angle/.015)));
    const key=`${baseKey}_smooth_hand125_wrist_${step}`;
    if(scene.textures.exists(key))return key;
    const image=scene.textures.get(baseKey).getSourceImage(),{width:w,height:h}=image;
    const texture=scene.textures.createCanvas(key,w,h),ctx=texture.context;
    const top=Math.floor(h*.50),rows=24,cols=4;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const x=col*w/cols,x2=(col+1)*w/cols,y=top+row*(h-top)/rows,y2=top+(row+1)*(h-top)/rows;
        const src=[{x,y},{x:x2,y},{x:x2,y:y2},{x,y:y2}];
        const dst=src.map(p=>readyWristPoint(p.x,p.y,w,h,step*.015));
        for(const indices of [[0,1,2],[0,2,3]])triangle(ctx,image,indices.map(i=>src[i]),indices.map(i=>dst[i]));
    }
    ctx.drawImage(image,0,0,w,top,0,0,w,top);
    texture.refresh();return key;
}
