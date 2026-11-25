import { windowWeight } from './AnimationClip.js';

export function leapfrogPressWeight(time,apex) {
    return windowWeight({in:[apex-.31,apex-.25],out:[apex-.19,apex-.05]},time);
}

// The runner keeps his run and gait. Only the upper-body clearance pose is
// borrowed while the jumper passes over him; never write it into his live pose.
export function leapfrogDuckPose(pose, time, apex) {
    const knees=windowWeight({in:[apex-.4,apex-.3],out:[apex+.2,apex+.4]},time);
    const waist=windowWeight({in:[apex-.25,apex-.1],out:[apex+.2,apex+.4]},time);
    if(!knees&&!waist) return pose;
    const bend=pose.bend??0,crouch=pose.crouch??0;
    return {...pose,bend:bend+(1.25-bend)*waist,crouch:crouch+(1.45-crouch)*knees};
}
