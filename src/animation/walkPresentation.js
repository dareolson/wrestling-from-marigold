const TAU=Math.PI*2;
const clamp=n=>Math.max(0,Math.min(1,n));

export function walkProfile(rigId){
    // George's painted near and far leg chains have different sole reaches.
    // Don't force the supporting leg into the airborne leg's crouch envelope.
    return rigId==='george-roster-v1'
        ? {hipTracks:1,walkReach:.995,loadDrop:1.2,crouch:.02,farGround:-6}:null;
}

// Trial locomotion only: existing paintings and joint solves remain in use.
export function walkPresentation(pose,weight,guard){
    const w=clamp(weight),mix=(a,b)=>a+(b-a)*w;
    if(!w)return {pose,guard};
    return {pose:{...pose,lArm:mix(pose.lArm??0,.08),rArm:mix(pose.rArm??0,.16),
        lElbow:mix(pose.lElbow??.7,.38),rElbow:mix(pose.rElbow??.7,.42)},
        guard:guard*(1-.45*w)};
}

export function walkLoad(phase,stance){
    const load=p=>{
        const t=((p%TAU)+TAU)%TAU/TAU;
        return t<stance*.36?Math.sin(Math.PI*t/(stance*.36))**2:0;
    };
    return Math.max(load(phase),load(phase+Math.PI));
}

// Match the backward speed of the planted sole at both swing boundaries.
// This small follow-through replaces the old stop/start of the swing foot.
export function walkSwing(u,stride,stance){
    const v=clamp(u),m=-(1-stance)/stance;
    const progress=(-2*v**3+3*v*v)+m*(2*v**3-3*v*v+v);
    return {fx:stride*(progress-.5),liftFrac:16*v*v*(1-v)*(1-v)};
}
