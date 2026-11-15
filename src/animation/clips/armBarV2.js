// Kneeling wrestling arm bar, opt-in through light=v1. Same squeezes/damage
// as armBar; the receiver stays supine while the attacker controls his wrist
// and presses the forearm near the elbow, instead of lying across his body.
import { armBarClip } from './armBar.js';
import { shinsFromFolds } from '../../rig/articulation.js';
import { LOU_RIG, specFor } from './rigOverrides.js';

// One spec, defender overrides by rig. Lou's baked hand extends beyond the visible wrist, so whoever holds Lou's arm grips just above that hand,
// 82% along the elbow-to-endpoint segment.
export const ARM_BAR_V2_SPEC = {
    wristTarget: { joint: 'Wrist' },
    defender: { [LOU_RIG]: { wristTarget: { joint: 'Elbow', fore: .82 } } },
    // T9.1 half kneel (Derek 2026-11-14: the double kneel read as one boneless tube). The camera-side knee is down on the mat, thigh near vertical, shin running back; the far foot is planted,
    // thigh forward, shin near vertical. Thigh angles in rad, fold = the heel's fold; held scales them in.
    kneel: { down: { leg: -.05, fold: 2.3 }, up: { leg: 1.0, fold: 1.25 }, crouch: 1.3, bend: .45, depth: 18 },
};

const TIMES = [0, .25, .6, .95, 1.3, 1.6, 1.8, 2.2, 2.4, 2.8, 3, 3.25, 3.6];
const clamp = v => Math.max(0, Math.min(1, v));
// The hands stay low while he walks in and come up with the reach (grips in at .35, on the wrist by .95).
const reach = at => clamp((at - .25) / .7);
// `nearChannel`: which leg channel ('l' or 'r') is the camera-side leg for this attacker's facing (the rig's lChannelSide(facing) === 'near' is 'l').
export function armBarEntryClip(distance = 70, defenderRigId = null, nearChannel = 'l') {
    const { wristTarget, kneel } = specFor(ARM_BAR_V2_SPEC, { defenderRigId });
    const far = nearChannel === 'l' ? 'r' : 'l';
    const keyframes = role => TIMES.map(at => {
        const enter = clamp(at / .95), leave = clamp((at - 3) / .6);
        const held = enter * (1 - leave);
        const squeeze = [1.6, 2.2, 2.8].includes(at) ? 1 : 0, strain = held * (at > 1 && at < 3 ? 1 : 0);
        const pose = role === 'attacker' ? shinsFromFolds({
            lArm: .08 + .72 * reach(at), rArm: .15 + .75 * reach(at), lElbow: .3 + .5 * reach(at), rElbow: .3 + .5 * reach(at),
            // Hips sunk so both knees rest on the mat (T2.7b): the old 1.35 crouch left the thigh near vertical over a 1.85-2.05 rad fold, the stub-and-kink under the trunks.
            [nearChannel + 'Leg']: kneel.down.leg * held, [far + 'Leg']: kneel.up.leg * held,
            [nearChannel + 'Fold']: kneel.down.fold * held, [far + 'Fold']: kneel.up.fold * held,
            crouch: kneel.crouch * held, bend: (kneel.bend + squeeze * .10) * held,
            lean: .05, tilt: 0, lift: 0,
        }) : shinsFromFolds({
            // The man sells the hold: a steady strain through the hold (strain), a hard writhe on each squeeze (squeeze): free arm slaps up, back curls, free knee draws in, hips lift.
            lArm: .05 + .8 * held, lElbow: .12,
            rArm: .05 + (strain * .3 + squeeze * 1.0), rElbow: .2 + strain * .1 + squeeze * .4,
            lLeg: .05 + squeeze * .1, rLeg: .1 + strain * .06 + squeeze * .3,
            lFold: .15 + squeeze * .3, rFold: .15 + strain * .2 + squeeze * .9,
            crouch: 0, lean: strain * .08 + squeeze * .1, bend: strain * .1 + squeeze * .35,
            tilt: -Math.PI / 2, lift: -110 - strain * 3 - squeeze * 9,
        });
        return { at, ease: 'easeInOut', pose,
            // Codex's kneel beside him on the camera side of the mat (Derek 2026-11-10: the T2.7 reposition broke the art; this geometry stays).
            transform: { x: role === 'defender' ? distance : (distance - 15) * held, y: role === 'attacker' ? kneel.depth * held : 0 },
            parts: role === 'attacker' ? { nearForearm: at > 0 && at < 3.25 ? 'grip' : 'base', farForearm: at > 0 && at < 3.25 ? 'grip' : 'base' } : {},
        };
    });
    return {
        ...armBarClip, id: 'armBarV2',
        tracks: { attacker: { keyframes: keyframes('attacker') }, defender: { keyframes: keyframes('defender') } },
        grips: [
            { role: 'attacker', arm: 'l', to: { role: 'defender', ...wristTarget, side: 'same' }, in: [.35, .95], out: [3, 3.25], natural: true, palm: 'clutch' },
            { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Elbow', side: 'other', fore: .55 }, in: [.35, .95], out: [3, 3.25], natural: true, palm: 'clutch' },
        ],
        plants: [
            { role: 'attacker', leg: nearChannel, in: [.95, 1.05], out: [3, 3.25] },
            { role: 'attacker', leg: far, in: [.95, 1.05], out: [3, 3.25] },
        ],
        // Preserve each rig's complete body stack, including head and garment
        // masks. Splitting it into torso/head/legs put thighs over pelvis masks.
        // Both parts of the far arm stay behind that block throughout the move.
        layers: [{ from: 0, to: 3.6, order: [
            ['defender', 'farArm'], ['defender', 'nativeBody'], ['attacker', 'farArm'], ['attacker', 'nativeBody'], ['defender', 'nearArm'], ['attacker', 'nearArm'],
        ] }],
    };
}
