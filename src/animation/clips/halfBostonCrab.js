// PLAN_LIGHT_MOVES B2 (?light=v1): the half Boston crab, a mat hold on a downed man. The ankle lock's pickup (ankleLockV2's keys to 0.6 s), a 0.3 s step around the
// leg, the receiver's roll onto his front, the leg tucked under the attacker's arm, then three pulls (he sits back, drags the man toward him) each with a fist strike
// from the receiver, and an exit (he steps back out, the receiver is left prone). One source: tools/move-preview/ imports this file and passes its JSON as `spec`.
//  - The turn flips the facing on a near-symmetric pose (legs crossing, knees and elbows straight): knees and elbows bend toward the facing, so any other pose
//    snaps when mirrored. The receiver's roll flip is stepped the same way.
//  - Grips (D5) hold only through the pickup; the tuck is posed, not gripped. The layer stack is the preview's.
//  - Both men own their shins (shinsFromFolds): no positive lKnee/rKnee (D3). `facing` keys are relative to the attacker's facing at play.
import { ankleLockEntryClip } from './ankleLockV2.js';
import { shinsFromFolds } from '../../rig/articulation.js';
import { specFor } from './rigOverrides.js';
import { turnPoses, rollPoses, exitPoses } from './groundPhrases.js';

export const HALF_CRAB_SPEC = {
    "gap": 20,
    "attY": 18,
    "att": {
        "crouch": 1.6,
        "bend": -0.2,
        "lean": -0.25,
        "lLeg": -0.15,
        "rLeg": 0.1,
        "lFold": 2.0,
        "rFold": 2.0,
        "lArm": -0.25,
        "rArm": 0.3,
        "lElbow": 1.8,
        "rElbow": 0.7,
        "tilt": 0,
        "lift": 0
    },
    "def": {
        "tilt": 1.75,
        "lift": -93,
        "lLeg": -0.7,
        "rLeg": 0.45,
        "lFold": 1.3,
        "rFold": 0.15,
        "lArm": 1.8,
        "rArm": 3.0,
        "lElbow": 1.52,
        "rElbow": 0.32,
        "crouch": 0,
        "lean": 0,
        "bend": 0
    },
    // Overrides by role and rig (rigOverrides.js). George's frame stands farther off and carries the arms and crouch differently; Lou's trapped leg folds deeper
    // as the receiver. These were the pairing table 'george-lou' before B3b (same numbers, so the approved clips are unchanged).
    "attacker": {
        "george-roster-v1": { "gap": 30, "att": { "lArm": -0.6, "lElbow": 1.65, "crouch": 1.75 } }
    },
    "defender": {
        "thesz-procreate-v1": { "def": { "lFold": 1.6 } }
    }
};

export const HALF_CRAB_TIMES = { turn: 0.78, roll: 0.88, tuck: 1.18, end: 4.6, exit: 5.5, pulls: [1.6, 2.5, 3.4] };
const FRONT = [['defender', 'farArm'], ['defender', 'nativeBody'], ['defender', 'nearArm'], ['attacker', 'farArm'], ['attacker', 'nativeBody'], ['attacker', 'nearArm']];
const HOLD_ORDER = [['defender', 'farArm'], ['defender', 'nativeBody'], ['defender', 'nearArm'], ['attacker', 'farArm'], ['attacker', 'nativeBody'], ['defender', 'lLeg'], ['attacker', 'nearArm']];

// `distance`: hips to hips at the entry (the receiver lies there and never moves). Returns a clip for MoveRuntime.register.
export function halfBostonCrabClip(distance = 120, { spec = HALF_CRAB_SPEC, attackerRigId, defenderRigId, order = FRONT } = {}) {
    const s = specFor(spec, { attackerRigId, defenderRigId }), { turn, roll, tuck, end, exit, pulls } = HALF_CRAB_TIMES, D = distance;
    const pickup = ankleLockEntryClip(D);
    const frames = { attacker: [], defender: [] };
    for (const [role, out] of Object.entries(frames)) {
        for (const k of pickup.tracks[role].keyframes.filter(k => k.at <= 0.6)) out.push({ at: k.at, pose: k.pose, x: k.transform.x, y: k.transform.y ?? 0, facing: role === 'attacker' ? 1 : -1, parts: k.parts });
    }
    const add = (role, at, pose, gap = s.gap, sign) => frames[role].push({
        at, pose: shinsFromFolds(pose), x: role === 'attacker' ? D - gap : D, y: role === 'attacker' ? s.attY : 0,
        facing: sign ?? (role === 'attacker' ? -1 : 1), parts: role === 'defender' ? { nearForearm: 'base', farForearm: 'base' } : { nearForearm: 'grip', farForearm: 'grip' },
    });
    // The turn: a step around the leg (0.6-0.9 s). The facing flips at `turn` on a straight-legged, straight-armed pose.
    const { wide, cross } = turnPoses(s.att);
    add('attacker', 0.68, wide, 65, 1);
    add('attacker', turn - 0.01, cross, 62, 1);
    add('attacker', turn, cross, 62);
    add('attacker', 0.92, { ...wide, lLeg: -0.3, rLeg: 0.3, lElbow: 0.8, rElbow: 0.4 }, 58);
    add('attacker', 1.0, { ...s.att, bend: 0.2, lean: 0, lArm: -0.1, lElbow: 1.4, rArm: -0.2, rElbow: 0.7 });
    add('attacker', tuck, { ...s.att, bend: 0.2, lean: 0 });
    // The receiver rolls over while the attacker brings the leg into position; his roll flip is stepped on the mirrored pose.
    const { down: rollPose, over } = rollPoses(s.def);
    add('defender', 0.86, over, 0, -1);
    add('defender', roll, rollPose);
    frames.defender.at(-1).ease = 'step';
    add('defender', 1.0, { ...s.def, tilt: 1.65, lift: -97, lFold: s.def.lFold - 0.45 });
    add('defender', tuck, s.def);
    // Each pull: he sits back (hips low, torso leans back) and drags the leg with him; the man slides toward him.
    for (const [at, back] of [[pulls[0], 1], [2.0, 0], [pulls[1], 1], [2.9, 0], [pulls[2], 1], [3.8, 0], [end, 0]]) {
        add('attacker', at, { ...s.att, bend: s.att.bend + (back ? -0.3 : 0.1), lean: s.att.lean + (back ? -0.22 : 0) });
        add('defender', at, { ...s.def, lLeg: s.def.lLeg - (back ? 0.2 : 0), lFold: s.def.lFold + (back ? 0.25 : 0) });
        frames.defender.at(-1).x = D - (back ? s.drag ?? 12 : 0);
    }
    // One elbow stays braced while the other fist pounds on each pull.
    const support = { ...s.def };
    const punches = [
        { peak: pulls[0], arm: 'l', up: [3.0, 0.9], hit: [2.65, 0.2] },
        { peak: pulls[1], arm: 'r', up: [3.6, 0.9], hit: [3.0, 0.2] },
        { peak: pulls[2], arm: 'l', up: [3.0, 0.9], hit: [2.65, 0.2] },
    ];
    const baseFrames = [...frames.defender].sort((a, b) => a.at - b.at);
    const atPose = at => {
        let i = 0; while (i + 1 < baseFrames.length && baseFrames[i + 1].at <= at) i++;
        const a = baseFrames[i], b = baseFrames[Math.min(i + 1, baseFrames.length - 1)];
        const k = b.at === a.at ? 0 : (at - a.at) / (b.at - a.at);
        return Object.fromEntries(Object.keys(a.pose).map(n => [n, typeof a.pose[n] === 'number' ? a.pose[n] + ((b.pose[n] ?? a.pose[n]) - a.pose[n]) * k : a.pose[n]]));
    };
    for (const { peak, arm, up, hit } of punches) {
        for (const [at, v] of [[peak - 0.3, null], [peak - 0.15, up], [peak - 0.08, up], [peak, hit], [peak + 0.08, hit], [peak + 0.2, null]]) {
            const pose = { ...atPose(at), lArm: support.lArm, lElbow: support.lElbow, rArm: support.rArm, rElbow: support.rElbow };
            if (v) { pose[arm + 'Arm'] = v[0]; pose[arm + 'Elbow'] = v[1]; }
            const f = { at, pose, x: D, y: 0, facing: 1, parts: { nearForearm: arm === 'l' && v ? 'grip' : 'base', farForearm: arm === 'r' && v ? 'grip' : 'base' } };
            frames.defender = frames.defender.filter(k => Math.abs(k.at - at) > 0.0001); frames.defender.push(f);
        }
    }
    // Exit: he rises and backs out along the mat (facing unchanged), the man lets the leg fall and lies; Wrestler lays him down prone from the last body.
    const out = exitPoses(s.att, s.def);
    add('attacker', 4.85, out.attacker[0], s.gap + 14);
    add('attacker', 5.2, out.attacker[1], s.gap + 40);
    add('attacker', exit, out.attacker[2], s.gap + 56);
    add('defender', 4.85, out.defenderLetGo);
    add('defender', exit, out.defenderLies);

    for (const f of frames.attacker) f.ease = 'easeInOut';
    for (const list of Object.values(frames)) list.sort((a, b) => a.at - b.at);
    const toKey = f => ({ at: f.at, ease: f.ease ?? 'linear', pose: f.pose, transform: { x: f.x, y: f.y }, facing: f.facing, parts: f.parts });
    return {
        id: 'halfBostonCrab',
        duration: exit,
        events: [{ at: roll, type: 'roll' }, ...pulls.map(at => ({ at, type: 'squeeze' }))],
        tracks: { attacker: { keyframes: frames.attacker.map(toKey) }, defender: { keyframes: frames.defender.map(toKey) } },
        // the pickup's hands (heel, toe) through the first step; ankleLockV2's windows
        grips: [
            { role: 'attacker', arm: 'l', to: { role: 'defender', joint: 'Ankle', side: 'same', anchor: 'heel' }, in: [0.2, 0.3], out: [turn - 0.1, turn - 0.002], natural: true, palm: 'clutch' },
            { role: 'attacker', arm: 'r', to: { role: 'defender', joint: 'Ankle', side: 'other', anchor: 'toe' }, in: [0.2, 0.3], out: [turn - 0.1, turn - 0.002], natural: true, palm: 'clutch' },
        ],
        plants: [],
        layers: [{ from: 0, to: roll, order }, { from: roll, to: exit, order: HOLD_ORDER }],
    };
}
