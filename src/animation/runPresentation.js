const clamp=n=>Math.max(0,Math.min(1,n));

export function runPresentation(pose,weight){
    const w=clamp(weight),mix=(a,b)=>a+(b-a)*w;
    if(!w)return pose;
    return {...pose,lArm:mix(pose.lArm??0,.10),rArm:mix(pose.rArm??0,.16),
        lElbow:mix(pose.lElbow??.7,1.2),rElbow:mix(pose.rElbow??.7,1.2),
        crouch:mix(pose.crouch??0,.035)};
}

export function runProfile(rigId){
    return {walkReach:rigId==='george-roster-v1' ? .995 : .99,
        farGround:rigId==='george-roster-v1' ? -6 : 0};
}

export function runArmFlex(phase){
    const opposing=Math.cos(phase-.1);
    return {near:1.2-.12*opposing,far:1.2+.12*opposing};
}
