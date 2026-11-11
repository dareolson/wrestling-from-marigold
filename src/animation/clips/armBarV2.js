// Kneeling wrestling arm bar, opt-in through light=v1. Same squeezes/damage
// as armBar; the receiver stays supine while the attacker controls his wrist
// and presses the forearm near the elbow, instead of lying across his body.
import { armBarClip } from './armBar.js';
import { shinsFromFolds } from '../../rig/articulation.js';

const TIMES = [0, .25, .6, .95, 1.3, 1.6, 1.8, 2.2, 2.4, 2.8, 3, 3.25, 3.6];
const clamp = v => Math.max(0, Math.min(1, v));
// The hands stay low while he walks in and come up with the reach (grips in at .35, on the wrist by .95).
const reach = at => clamp((at - .25) / .7);
export function armBarEntryClip(distance = 70) {
    const keyframes = role => TIMES.map(at => {
        const enter = clamp(at / .95), leave = clamp((at - 3) / .6);
        const held = enter * (1 - leave);
        const squeeze = [1.6, 2.2, 2.8].includes(at) ? 1 : 0;
        const pose = role === 'attacker' ? shinsFromFolds({
            lArm: .08 + .72 * reach(at), rArm: .15 + .75 * reach(at), lElbow: .3 + .5 * reach(at), rElbow: .3 + .5 * reach(at),
            lLeg: -.45 * held, rLeg: -.45 * held,
            lFold: 2.1 * held, rFold: 2.1 * held,
            crouch: 1.05 * held, bend: (.45 + squeeze * .10) * held,
            lean: .05, tilt: 0, lift: 0,
        }) : shinsFromFolds({
            lArm: .05 + .8 * held, lElbow: .12,
            rArm: .05 + squeeze * .8, rElbow: .2 + squeeze * .25,
            lLeg: .05, rLeg: .1 + squeeze * .12,
            lFold: .15, rFold: .15 + squeeze * .35,
            crouch: 0, lean: 0, bend: squeeze * .1,
            tilt: -Math.PI / 2, lift: -110,
        });
        return { at, ease: 'easeInOut', pose,
            // Kneel at his shoulder on the camera side (y +40 is the front of the mat), the man eased 30 back so the thighs clear his hips, belly and legs.
            transform: { x: role === 'defender' ? distance : (distance + 40) * held, y: (role === 'attacker' ? 40 : -30) * held || 0 },
            parts: role === 'attacker' ? { nearForearm: at > 0 && at < 3.25 ? 'grip' : 'base', farForearm: at > 0 && at < 3.25 ? 'grip' : 'base' } : {},
        };
    });
    return {
        ...armBarClip, id: 'armBarV2',
        tracks: { attacker: { keyframes: keyframes('attacker') }, defender: { keyframes: keyframes('defender') } },
        grips: [
            { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Wrist', side: 'same' }, in: [.35, .95], out: [3, 3.25], natural: true, palm: 'clutch' },
            { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Elbow', side: 'other', fore: .55 }, in: [.35, .95], out: [3, 3.25], natural: true, palm: 'clutch' },
        ],
        plants: [
            { role: 'attacker', leg: 'l', in: [.95, 1.05], out: [3, 3.25] },
            { role: 'attacker', leg: 'r', in: [.95, 1.05], out: [3, 3.25] },
        ],
        layers: [{ from: 0, to: 3.6, order: [
            ['defender', 'farArm'], ['defender', 'torso'], ['defender', 'head'], ['defender', 'farLeg'], ['defender', 'nearLeg'],
            ['attacker', 'farLeg'], ['attacker', 'nearLeg'], ['attacker', 'torso'], ['attacker', 'head'],
            ['defender', 'nearArm'], ['attacker', 'farArm'], ['attacker', 'nearArm'],
        ] }],
    };
}
