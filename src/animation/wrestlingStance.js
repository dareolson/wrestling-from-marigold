// Facing-relative reach: the far hand checks the opponent while the near
// hand protects the chest. Keep the elbows staggered in the profile view.
export function wrestlingStance(rigId,lower=false) {
    const power=rigId==='kowalski-roster-v1',showman=rigId==='george-roster-v1';
    if(lower)return {near:{upper:.22,forearm:1.70},far:{upper:.22,forearm:1.35}};
    return {
        near:{upper:power?.08:showman?.16:.12,forearm:power?2.05:showman?2.20:2.30},
        far:{upper:power?.65:.78,forearm:power?1.40:1.50},
    };
}

// Guard proximity already eases over time. Use it once for the entire body,
// including during steps, instead of losing readiness to the walking arm blend.
export function readyStancePose(pose,weight,rigId) {
    const w=Math.max(0,Math.min(1,weight));
    if(!w)return pose;
    const crouch=rigId==='kowalski-roster-v1'?.38:.34;
    return {...pose,crouch:(pose.crouch??0)+(Math.max(pose.crouch??0,crouch)-(pose.crouch??0))*w,
        bend:(pose.bend??0)+.09*w};
}

// Readable reach/retract gestures with a slower secondary rhythm. The rear
// hand answers the lead hand instead of both arms pumping together.
// Absolute scene time keeps the result independent of frame rate.
export function probingGuard(rigId,time,lower=false) {
    const base=wrestlingStance(rigId,lower),power=rigId==='kowalski-roster-v1';
    const t=time*(power?.82:1),a=2.4*(power?.72:1);
    const lead=Math.sin(t*2.1)+.25*Math.sin(t*.83+.7);
    const rear=Math.sin(t*2.1+2.2)+.2*Math.sin(t*1.13);
    return {
        near:{upper:base.near.upper+.055*a*rear,forearm:base.near.forearm+.085*a*rear},
        far:lower?{...base.far,wrist:.15*lead}:{upper:base.far.upper+.085*a*lead,forearm:base.far.forearm-.075*a*lead},
    };
}
