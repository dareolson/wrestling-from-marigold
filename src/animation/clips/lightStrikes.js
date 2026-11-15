// PLAN_LIGHT_MOVES Stages 10-11 (?light=v1): the standing strikes as one spec table and one clip builder (build rules: one spec per move, overrides by rig, shared phrases).
// Each move is a one-wrestler clip: idle -> cock -> hit (the impact event) -> follow -> idle. The `hit` pose is solved per rig by tools/debug/strike_solve.mjs: a probe point on
// the attacker (`probe`) onto a target point on a standing man (`target`) with the men 80 units apart (the separation minimum), by the arm channels, the trunk, and `lunge`: how
// far his body leans in along his facing at the hit (px at s = 1; a clip transform, which moves his x: Wrestler._doLightStrike holds the other man's separation off with `_lungeUntil` while it plays). The cock and the
// follow are deltas on the solved hit pose, so a rig with a different reach keeps the same motion. `reach`: his root to the probe point at the hit, along his facing.
// An attacker override replaces `hit` / `lunge` / `reach` per rig (a defender override is supported by specFor but no move uses one yet).
import { specFor } from './rigOverrides.js';
import { shinsFromFolds } from '../../rig/articulation.js';
import { CHOP_STAGGER } from '../staggers.js';

export const STRIKE_STANDOFF = 80;   // units between the men before a standing strike: Wrestler.move's separation minimum

const IDLE = shinsFromFolds({ lLeg: -0.04, rLeg: 0.16, lFold: 0.08, rFold: 0.08, lArm: 0, rArm: 0, lElbow: 0.75, rElbow: 0.75, lean: 0, crouch: 0, bend: 0 });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', KOWALSKI = 'kowalski-roster-v1', GUIDO = 'guido-roster-v1';
// legs by phase: the front (lead) foot steps in at the hit
const STEP = { cock: { lLeg: -0.05, rLeg: 0.2 }, hit: { lLeg: 0.25, rLeg: -0.12 }, follow: { lLeg: 0.2, rLeg: -0.1 } };

// target / probe: what strike_solve.mjs and strike_measure.mjs read. sell: the receiver's pose name and length (ms); fall: the blow can put a worn man down (the falls plumbing decides);
// damage keys live in Wrestler.js's STAMINA_DRAIN under the move's id.
export const LIGHT_STRIKE_ART = {
    chop: { [LOU]: { cock: 'chopSweepBack', tween: 'chopSweepCamera', hit: 'chopSweepContact', follow: 'chopSweepFollow' } },
};

export const LIGHT_STRIKES = {
    clubBlow: {
        probe: 'forearm', target: 'neck', sell: { pose: 'sellHead', ms: 140 },
        times: { cock: 0.2, hit: 0.34, follow: 0.5, end: 0.78 },
        cock: { lArm: 0.9, lElbow: 1.0, lean: -0.2, bend: -0.15, crouch: -0.05 }, follow: { lArm: -0.7, lElbow: 0.3, lean: 0.12, crouch: 0.08 },
        legs: STEP, reach: 83, lunge: 17.7,
        hit: { lArm: 1.6, lElbow: 0.23, rArm: -0.2, lean: 0.25, bend: 0.2, crouch: 0.18 },
        attacker: {
            [GEORGE]:   { reach: 80, lunge: 28.3, hit: { lArm: 2, lElbow: 0.49, bend: 0.29, crouch: 0.15 } },
            [KOWALSKI]: { reach: 80.1, lunge: 24.3, hit: { lArm: 1.65, lElbow: 0.5, crouch: 0.15 } },
            [GUIDO]:    { reach: 81.2, lunge: 19.7, hit: { lArm: 2.42, lElbow: 0.5, bend: 0.58, crouch: 0.15 } },
        },
    },
    chop: {
        probe: 'hand', target: 'chest', sell: { pose: 'sellChop', ms: 80, stagger: CHOP_STAGGER, crowd: 0.95 },
        impact: { sound: 'chop', shakeMs: 85, shake: 0.0018 },
        times: { cock: 0.16, hit: 0.25, follow: 0.34, end: 0.58 },
        cock: { lArm: -0.9, lElbow: 0.7, lean: -0.1 }, follow: { lArm: 0.3, lean: 0.1 },
        legs: STEP, reach: 81.4, lunge: 6,
        hit: { lArm: 1.3, lElbow: 0.02, rArm: -0.3, lean: 0.12, bend: 0.1, crouch: 0.1 },
        attacker: {
            [LOU]: { armSide: 'far', projectedArm: true, reach: 80, lunge: 1.8,
                hit: { lArm: 0.965, lElbow: 0.575, rArm: 0.1, rElbow: 0.8, lean: 0.12, bend: 0.06, crouch: 0.1 },
                cock: { lArm: -0.565, lElbow: 0.875, lean: 0, bend: 0 },
                follow: { lArm: -0.465, lElbow: 0.75, lean: 0, bend: 0 },
            },
            [GEORGE]:   { reach: 79.3, lunge: 0, hit: { lArm: 1.7, lElbow: 0.4, bend: 0.48 } },
            [KOWALSKI]: { reach: 78.8, lunge: 15.5, hit: { lElbow: 0.11 } },
            [GUIDO]:    { reach: 79.1, lunge: 1.3, hit: { lArm: 1.96, lElbow: 0.1, bend: 0.5 } },
        },
    },
    uppercut: {
        probe: 'fist', target: 'chin', sell: { pose: 'sellHead', ms: 170 },
        times: { cock: 0.3, hit: 0.4, follow: 0.55, end: 0.85 },
        cock: { lArm: -1.0, lElbow: 0.3, crouch: 0.25, lean: -0.1, bend: 0.1 }, follow: { lArm: 0.4, crouch: -0.35, lean: 0.05 },
        legs: { cock: { lLeg: 0.1, rLeg: 0.05 }, hit: { lLeg: 0.2, rLeg: -0.1 }, follow: { lLeg: 0.15, rLeg: -0.05 } }, reach: 73.3, lunge: 0,
        hit: { lArm: 1.1, lElbow: 1.1, rArm: -0.3, lean: 0.1, bend: 0.12, crouch: 0.64 },
        attacker: {
            [GEORGE]:   { reach: 68.3, lunge: 17.8, hit: { lArm: 1.5, lElbow: 0.9, crouch: 0.34 } },
            [KOWALSKI]: { reach: 70, lunge: 11.3, hit: { lArm: 1.22, lElbow: 1.13, crouch: 0.45 } },
            [GUIDO]:    { reach: 68.1, lunge: 30, hit: { lArm: 1.5, lElbow: 1.24, crouch: 0.38 } },
        },
    },
    // Stage 10: the big man's first hit. He closes at `approach` (px/s at s = 1) and drives the near shoulder into the chest; the lunge is long because the separation minimum keeps the men 80 apart and the shoulder is the pivot.
    shoulderBlock: {
        probe: 'shoulder', target: 'chest', sell: { pose: 'sellChest', ms: 170, crowd: 0.8 }, approach: 330,
        times: { cock: 0.28, hit: 0.38, follow: 0.52, end: 0.82 },
        cock: { crouch: 0.15, lean: -0.15, lArm: 0.3 }, follow: { lean: -0.1, crouch: -0.1 },
        legs: { cock: { lLeg: 0.05, rLeg: 0.2 }, hit: { lLeg: 0.35, rLeg: -0.2 }, follow: { lLeg: 0.2, rLeg: -0.05 } }, reach: 83.6, lunge: 74.9,
        hit: { lArm: 0.4, lElbow: 1.1, rArm: 0.3, lean: 0.3, bend: 0.5, crouch: 0.6 },
        attacker: {
            [GEORGE]:   { reach: 79.4, lunge: 66.5, hit: { crouch: 0.3 } },
            [KOWALSKI]: { reach: 79.2, lunge: 62.9, hit: { crouch: 0.55 } },
            [GUIDO]:    { reach: 81.8, lunge: 80, hit: { bend: 0.38, crouch: 0.08 } },
        },
    },
    // Stage 10: off the ropes (the attacker is the runner, the roles of the Stage 6 answers swapped). `fromRun`: the clip starts on the cock, the stride he is in, not the standing idle.
    runningForearm: {
        probe: 'forearm', target: 'face', sell: { pose: 'sellHead', ms: 150, crowd: 0.8 }, approach: 420, fromRun: true,
        times: { cock: 0.12, hit: 0.2, follow: 0.32, end: 0.55 },
        cock: { lArm: 0.9, lElbow: 0.8, lean: -0.1 }, follow: { lArm: -0.8, lean: 0.1 },
        legs: STEP, reach: 71.6, lunge: 12.6,
        hit: { lArm: 1.61, lElbow: 0.7, rArm: -0.4, lean: 0.35, bend: 0.2, crouch: 0.1 },
        attacker: {
            [GEORGE]:   { reach: 68.7, lunge: 28.3, hit: { lArm: 2.19, lElbow: 0.47, bend: 0.23 } },
            [KOWALSKI]: { reach: 67.9, lunge: 15.6, hit: { lArm: 1.9, lElbow: 0.44 } },
            [GUIDO]:    { reach: 69.6, lunge: 26.4, hit: { lArm: 2.58, bend: 0.49 } },
        },
    },
    // Stage 11: a runner answer. He turns his shoulder and drives the elbow back into the returning runner, timed to the runner's arrival (`runner`, the clothesline's arrival rule).
    backElbow: {
        probe: 'elbow', target: 'chest', sell: { pose: 'sellChest', ms: 150, crowd: 0.8 }, runner: true,
        times: { cock: 0.2, hit: 0.3, follow: 0.42, end: 0.7 },
        cock: { lArm: -0.5, lElbow: 0.3, lean: -0.1 }, follow: { lArm: -0.3, lean: 0.05 },
        legs: STEP, reach: 80.9, lunge: 38.3,
        hit: { lArm: 1.41, lElbow: 1.5, rArm: -0.3, lean: 0.05, bend: 0.5, crouch: 0.37 },
        attacker: {
            [GEORGE]:   { reach: 79.1, lunge: 27.7, hit: { lArm: 1.89, crouch: 0.1 } },
            [KOWALSKI]: { reach: 78.8, lunge: 26.1, hit: { lArm: 1.75, crouch: 0.43 } },
            [GUIDO]:    { reach: 79.7, lunge: 35.1, hit: { lArm: 2.06, crouch: 0.1 } },
        },
    },
    // Stage 11: he drops low and sweeps the standing man's legs; the falls plumbing lays him on his back. The leg channels are part of the hit pose.
    legSweep: {
        probe: 'ankle', target: 'ankles', sell: { pose: 'sellChest', ms: 120, fall: true, crowd: 0.7 },
        times: { cock: 0.28, hit: 0.38, follow: 0.52, end: 0.85 },
        cock: { lLeg: -0.8, crouch: 0.1, lean: -0.1 }, follow: { lLeg: -0.4, crouch: -0.1 },
        reach: 76.2, lunge: 25,
        hit: { lLeg: 0.3, lFold: 0.15, rLeg: -0.231, rFold: 0.7, lArm: 0.5, rArm: -0.3, crouch: 0.4, lean: 0.3, bend: 0.2 },
        attacker: {
            [GEORGE]:   { reach: 77.8, hit: { rLeg: -0.305 } },
            [KOWALSKI]: { reach: 75.3, lunge: 9.873, hit: { lLeg: 0.42, rLeg: 0 } },
            [GUIDO]:    { reach: 80.2, hit: { rLeg: -0.271 } },
        },
    },
    // Stage 11: on a staggered man bent over, both fists clubbed down across his back; he drops to his knees or flat.
    axeHandleBack: {
        probe: 'wrists', target: 'back', sell: { pose: 'sellGut', ms: 170, fall: true, crowd: 0.7 },
        // a staggered man sways (his bend runs -0.36 to +0.44), so the blow would meet him anywhere in it: he is held doubled over for the blow, the pose strike_solve.mjs solves against
        bendOver: { lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lean: 0.5, bend: 0.5, crouch: 0.25 },
        times: { cock: 0.3, hit: 0.4, follow: 0.54, end: 0.84 },
        cock: { lArm: 1.2, rArm: 1.2, lElbow: 0.4, rElbow: 0.4, lean: -0.25, crouch: -0.1 }, follow: { lArm: -0.2, rArm: -0.2, lean: 0.1 },
        legs: { cock: { lLeg: -0.05, rLeg: 0.2 }, hit: { lLeg: 0.2, rLeg: -0.1 }, follow: { lLeg: 0.15, rLeg: -0.05 } }, reach: 58.1, lunge: 0,
        hit: { lArm: 1.39, rArm: 0.42, lElbow: 0.63, rElbow: 0.3, lean: 0.45, bend: 0, crouch: 0.27 },
        attacker: {
            [GEORGE]:   { reach: 54, lunge: 2.1, hit: { lArm: 1.3, rArm: 1.25, lElbow: 0.34, rElbow: 0.59, crouch: 0.18 } },
            [KOWALSKI]: { reach: 55.2, lunge: 0, hit: { lArm: 1.01, rArm: 0.86, lElbow: 0.55, rElbow: 1.01, crouch: 0.29 } },
            [GUIDO]:    { reach: 53.8, lunge: 2.9, hit: { lArm: 1.55, rArm: 1.25, lElbow: 0.64, rElbow: 0.31, crouch: 0.21 } },
        },
    },
};

const isSweep = spec => spec.probe === 'ankle';
const poseOf = (spec, hit, phase) => {
    const out = { ...IDLE, ...hit, ...(spec.legs?.[phase] ?? {}) };
    if (phase !== 'hit') for (const [k, v] of Object.entries(spec[phase] ?? {})) out[k] = (out[k] ?? 0) + v;   // cock / follow are deltas on the hit pose
    // Own both shins on EVERY key. Sparse terminal keys otherwise retain a sweep's folded shin.
    if (isSweep(spec)) return shinsFromFolds({ ...out, lFold: Math.max(0, out.lFold ?? 0), rFold: Math.max(0, out.rFold ?? 0) });
    return shinsFromFolds({ ...out, lFold: 0.08 + 1.6 * Math.max(0, out.crouch), rFold: 0.08 + 1.6 * Math.max(0, out.crouch) });
};

// The standing strike clip for a rig. `hitAt` retimes it so the hit lands then (a runner's arrival): the cock stretches or squeezes, the follow keeps its length.
// `walk`: how far he closes along his facing before the hit (px at s = 1); the clip owns his x through its transform, so the approach is part of it (he ends where the walk took him).
export function lightStrikeClip(id, rigId, { hitAt, defenderRigId, walk = 0, lSide = null } = {}) {
    const s = specFor(LIGHT_STRIKES[id], { attackerRigId: rigId, defenderRigId }), t = s.times;
    const at = hitAt ?? t.hit, shift = at - t.hit, k = at / t.hit;
    const art = lSide ? LIGHT_STRIKE_ART[id]?.[rigId] : null;
    const armSide = s.armSide ?? lSide;
    const hand = phase => art ? { parts: { [`${armSide}UpperArm`]: art[phase] ?? 'base', [`${armSide}Forearm`]: s.projectedArm ? 'base' : art[phase] ?? 'base' } } : {};
    // Only remap arm channels: the feet keep their authored leading/support roles.
    const armPose = pose => s.armSide && (lSide ?? 'near') !== s.armSide ? {
        ...pose, lArm: pose.rArm, lElbow: pose.rElbow, rArm: pose.lArm, rElbow: pose.lElbow,
    } : pose;
    const key = (time, pose, lunge, ease = 'easeInOut', phase = null) => ({ at: +time.toFixed(4), ease, pose: armPose(pose), transform: { x: lunge, y: 0 }, ...hand(phase) });
    const blend = (a, b, u) => Object.fromEntries(Object.keys(a).map(n => [n, a[n] + (b[n] - a[n]) * u]));
    const cock = poseOf(s, s.hit, 'cock'), hit = poseOf(s, s.hit, 'hit');
    const contactArtAt = (t.cock + (t.hit - t.cock) * 0.65) * k;
    const behindBody = [['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],
        ['attacker','farArm'],['attacker','nativeBody'],['attacker','nearArm']];
    const towardCamera = [['defender','farArm'],['defender','nativeBody'],['defender','nearArm'],
        ['attacker','nativeBody'],['attacker','farArm'],['attacker','nearArm']];
    return {
        id: `${id}:${rigId}${art ? ':' + lSide : ''}${hitAt ? ':' + Math.round(hitAt * 1000) : ''}`,
        duration: +(t.end + shift).toFixed(4),
        events: [{ at: +at.toFixed(4), type: 'impact' }],
        ...(art && s.armSide === 'far' ? { layers: art.tween ? [
            {from:t.cock*k*.4,to:t.cock*k*.8,order:behindBody},
            {from:t.cock*k*.8,to:contactArtAt,order:towardCamera},
            {from:contactArtAt,to:t.end+shift,order:behindBody},
        ] : [{from:t.cock*k*.4,to:t.end+shift,order:behindBody}] } : {}),
        plants: [
            { role: 'attacker', leg: 'r', in: [0.04 * k, 0.09 * k], out: [t.follow + shift, t.end + shift - 0.02], kneeRestart: true },
            ...(!isSweep(s) && !s.fromRun ? [{ role: 'attacker', leg: 'l', in: [t.cock * k, t.cock * k + 0.03], out: [t.follow + shift, t.end + shift - 0.02], kneeRestart: true }] : []),
        ],
        tracks: { ...(art && s.armSide === 'far' ? { defender: { keyframes: [{ at: 0, pose: {} }] } } : {}), attacker: { keyframes: [
            key(0, s.fromRun ? poseOf(s, s.hit, 'cock') : { ...IDLE }, 0),
            ...(art ? [key(t.cock * k * 0.4, blend(IDLE, cock, 0.6), walk * 0.3, 'easeOut', 'cock')] : []),
            ...(art?.tween ? [key(t.cock * k * 0.8, cock, walk * 0.7, 'easeIn', 'tween')] : []),
            key(t.cock * k, poseOf(s, s.hit, 'cock'), walk * 0.85, 'easeOut', art?.tween ? 'tween' : 'cock'),
            ...(art ? [key(contactArtAt, blend(cock, hit, 0.65), walk + s.lunge * 0.65, 'easeIn', 'hit')] : []),
            key(at, poseOf(s, s.hit, 'hit'), walk + s.lunge, 'easeIn', 'hit'),
            key(t.follow + shift, poseOf(s, s.hit, 'follow'), walk + s.lunge * 0.6, 'easeOut', 'follow'),
            key(t.end + shift, { ...IDLE }, walk),
        ] } },
    };
}
