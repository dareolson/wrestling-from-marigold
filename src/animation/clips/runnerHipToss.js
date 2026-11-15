// Running hip toss: extra lift from the rebound, without changing the tie-up toss.
import { hipTossClip } from './hipToss.js';
import { runnerEntryClip } from './runnerEntry.js';
import { shinsFromFolds } from '../../rig/articulation.js';
const extraLift = new Map([[.14, 0], [.3, 28], [.42, 55], [.52, 32]]);
export function runnerHipTossClip(distance = 160) {
    const tracks = Object.fromEntries(Object.entries(hipTossClip.tracks).map(([role, track]) => [role, {
        ...track, keyframes: track.keyframes.map(k => {
            const { lKnee, rKnee, ...pose } = k.pose;
            return { ...k, pose: shinsFromFolds({ ...pose,
                lFold: lKnee ?? .22, rFold: rKnee ?? .22,
                lift: pose.lift + (role === 'defender' ? extraLift.get(k.at) ?? 0 : 0),
            }) };
        }),
    }]));
    return runnerEntryClip({ ...hipTossClip, tracks }, distance, 'hipTossRunner');
}
