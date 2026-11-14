// PLAN_LIGHT_MOVES T6.3 (?light=v1): a paired throw's clip with a runner entry. The clip starts with the man at its own first distance, standing; a man coming back
// off the ropes is `distance` out and running. This puts a lead-in in front of the clip: the attacker waits in his first pose, the runner strides in at his run speed
// (x falls at RUN_SPEED_UNITS) and eases into the clip's first defender pose as he arrives; the clip then plays unchanged, shifted by the lead-in.
import { RUN_SPEED_UNITS } from './backBodyDropV2.js';

const RUN = { lArm: -0.5, rArm: 0.6, lElbow: 1.0, rElbow: 0.9, lLeg: 0.55, rLeg: -0.45, lKnee: 0.9, rKnee: 0.2, lean: 0, crouch: 0.05, tilt: 0, lift: 0, bend: 0.1 };
const RUN_B = { ...RUN, lArm: 0.6, rArm: -0.5, lLeg: -0.45, rLeg: 0.55, lKnee: 0.2, rKnee: 0.9 };
const MIN_LEAD = 0.12;

export function runnerEntryClip(base, distance, id = `${base.id}Runner`) {
    const def = base.tracks.defender.keyframes, att = base.tracks.attacker.keyframes, x0 = def[0].transform.x;
    const lead = +Math.max(MIN_LEAD, (distance - x0) / RUN_SPEED_UNITS).toFixed(3);
    const shift = k => ({ ...k, at: +(k.at + lead).toFixed(3) });
    const defLead = [
        { at: 0, ease: 'linear', pose: RUN, transform: { x: distance, y: 0 }, parts: {} },
        { at: +(lead * 0.5).toFixed(3), ease: 'linear', pose: RUN_B, transform: { x: distance - (distance - x0) / 2, y: 0 }, parts: {} },
    ];
    return {
        ...base,
        id,
        duration: +(base.duration + lead).toFixed(3),
        events: base.events.map(e => ({ ...e, at: +(e.at + lead).toFixed(3) })),
        tracks: {
            attacker: { ...base.tracks.attacker, keyframes: [{ ...att[0], at: 0 }, ...att.map(shift)] },
            defender: { ...base.tracks.defender, keyframes: [...defLead, ...def.map(shift)] },
        },
    };
}
