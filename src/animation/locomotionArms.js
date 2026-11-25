const clamp=n=>Math.max(0,Math.min(1,n));

// Facing-relative shoulder angles and LOCAL elbow flex. Keeping the elbow
// local prevents the forearm from sliding around its parent as it follows.
// The phase delay is periodic (not frame-history smoothing), so mirrored
// playback, fixed-step capture and interrupted locomotion stay deterministic.
export function locomotionArms(phase,runWeight=0,guard=0){
    const r=clamp(runWeight),g=clamp(guard),mix=(a,b)=>a+(b-a)*r;
    const swing=Math.cos(phase-.1),lag=Math.cos(phase-.4);
    const amplitude=mix(.28,.55),nearCenter=mix(-.08,-.12),farCenter=mix(-.04,-.08);
    const walkFlex=.28+.07*Math.sin(phase-.25);
    const farWalkFlex=.28-.07*Math.sin(phase-.25);
    const one=(upper,flex)=>({upper:upper+(.60-upper)*g,
        forearm:upper+flex+(1.50-upper-flex)*g});
    return {near:one(nearCenter-amplitude*swing,mix(walkFlex,1.14-.18*lag)),
        far:one(farCenter+amplitude*swing,mix(farWalkFlex,1.14+.18*lag))};
}
