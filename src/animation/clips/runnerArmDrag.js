// A returning runner is caught at the wrist and elbow, pulled across a low base,
// and rolls through onto his back. The standing arm-drag executor is unchanged.
import { RUN_SPEED_UNITS } from './backBodyDropV2.js';
import { shinsFromFolds } from '../../rig/articulation.js';
const idle = { lLeg: -.1, rLeg: .2, lFold: .22, rFold: .22, lArm: .1, rArm: .2, lElbow: .7, rElbow: .7, crouch: .05, bend: 0, lean: 0, tilt: 0, lift: 0 };
export function runnerArmDragClip(distance = 160) {
    const D = Math.max(70, distance), catchAt = Math.max(.12, (D - 68) / RUN_SPEED_UNITS);
    const t = n => +(catchAt + n).toFixed(3), impact = t(.58), end = t(1.0);
    const attacker = [
        [0, idle, 0],
        [catchAt, { ...idle, lArm: 1.0, rArm: .8, lElbow: .5, rElbow: .8, crouch: .2, bend: .1 }, 0],
        [t(.16), { ...idle, crouch: 1.0, bend: .25, lLeg: -.65, rLeg: .3, lFold: 1.6, rFold: 1.25, lArm: .55, rArm: .65, lElbow: 1.4, rElbow: 1.2 }, -16],
        [t(.32), { ...idle, crouch: 1.35, bend: .3, lLeg: -.6, rLeg: -.25, lFold: 1.9, rFold: 1.8, lArm: .3, rArm: .5, lElbow: 1.6, rElbow: 1.4 }, -28],
        [impact, { ...idle, crouch: 1.15, lLeg: -.5, rLeg: -.2, lFold: 1.7, rFold: 1.5, lArm: .35, rArm: .3 }, -28],
        [end, idle, -18],
    ];
    const defender = [
        [0, { ...idle, lLeg: .55, rLeg: -.45, lFold: .9, rFold: .2, lArm: -.5, rArm: .6 }, D],
        [catchAt, { ...idle, lArm: 1.1, lElbow: .5, rArm: .4, bend: .1 }, 68],
        [t(.16), { ...idle, tilt: .9, lift: 12, bend: .25, lArm: 1.7, lElbow: .4, rArm: 1.2, lFold: .6, rFold: .5 }, 4],
        [t(.32), { ...idle, tilt: 2.5, lift: 35, lArm: 1.9, lElbow: .4, rArm: 1.6, lFold: .6, rFold: .5 }, -54],
        [t(.46), { ...idle, tilt: 4.1, lift: -40, lArm: 1.3, rArm: 1.2, lFold: .5, rFold: .4 }, -110],
        [impact, { ...idle, tilt: 4.7, lift: -110, lLeg: .35, rLeg: .3, lArm: .6, rArm: .5, lFold: .4, rFold: .3 }, -150],
        [end, { ...idle, tilt: 4.7, lift: -110, lLeg: .06, rLeg: .25, lArm: .05, rArm: .1 }, -150],
    ];
    const keys = (rows, facing) => rows.map(([at, pose, x]) => ({ at, ease: at <= catchAt ? 'linear' : 'easeInOut', pose: shinsFromFolds(pose), transform: { x, y: 0 }, facing, parts: facing === 1 && at >= catchAt && at <= t(.32) ? { nearForearm: 'grip', farForearm: 'grip' } : {} }));
    return {
        id: 'armDragRunner', duration: end, events: [{ at: impact, type: 'impact' }],
        tracks: { attacker: { keyframes: keys(attacker, 1) }, defender: { keyframes: keys(defender, -1) } },
        grips: [
            { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Wrist', side: 'same' }, in: [catchAt-.06, catchAt], out: [t(.24),t(.32)], natural: true, palm: 'clutch' },
            { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Elbow', side: 'other' }, in: [catchAt-.06, catchAt], out: [t(.2),t(.3)], natural: true, palm: 'clutch' },
        ],
        layers: [{ from: 0, to: end, order: [['defender','farArm'],['defender','nativeBody'],['attacker','farArm'],['attacker','nativeBody'],['defender','nearArm'],['attacker','nearArm']] }],
    };
}
