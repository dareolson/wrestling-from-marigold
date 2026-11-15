// PLAN_LIGHT_MOVES Stages 10-11 (?light=v1): the strikes on a man lying on the mat. One-wrestler clips (the man stays on the grounded rig and sells through _downHitReact), built like handStomp.js:
// one spec per move, a rig that differs is an attacker override, the executor walks him to the man's drawn target point (`reach`: root to the contact point along his facing, px at s = 1).
//   mountedPunches (T10.4): supine man; he settles onto a low bilateral kneeling base, beside the man on the camera side, and the fists come down alternately on the face.
//   bodyStomps (T11.6): prone man; the hand stomp's own stomp (its keys and per-rig `reach` are imported), three times, on the back.
import { shinsFromFolds } from '../../rig/articulation.js';
import { specFor } from './rigOverrides.js';
import { HAND_STOMP_SPEC } from './handStomp.js';

const REST = shinsFromFolds({ lLeg: -0.04, rLeg: 0.16, lFold: 0.08, rFold: 0.08, lArm: 0, rArm: 0, lElbow: 0.75, rElbow: 0.75, lean: 0, crouch: 0, bend: 0 });

const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', KOWALSKI = 'kowalski-roster-v1', GUIDO = 'guido-roster-v1';

export const MOUNTED_PUNCHES_SPEC = {
    reach: 81,                // root to the fist at the contact along the facing (px at s = 1); solved per rig (strike_solve.mjs mountedPunch: its `reach` less the standing place `lunge`)
    depth: 12,                 // his root this far below the man's root in depth: beside him on the camera side (camera side)
    punches: 4,                // alternating, lead hand first; the kit's `style.punches` overrides
    times: { set: 0.55, first: 0.95, gap: 0.3, cock: 0.13, tail: 0.35, rise: 0.4 },
    // Bilateral low kneel: both knees at mat height, heels folded back; no floating raised far knee.
    kneel: { down: { leg: -0.05, fold: 2.4 }, up: { leg: -0.05, fold: 2.4 }, crouch: 1.0, bend: 0.45 },
    // the striking arm at the hit, and its cock (deltas on the hit): the fist drops onto the face, the other arm guards
    hit:  { lArm: 0.896, lElbow: 0.575, lean: 0.5, bend: 0.7 },
    hitR: { arm: 0.232, elbow: 1.428 },   // the other hand's punch from the same place (the far arm draws from a different shoulder; strike_solve.mjs mountedPunchR)
    cock: { lArm: 0.9, lElbow: 0.8, lean: -0.12 },
    guard: { arm: 0.6, elbow: 1.4 },
    // first fit by rig (miss R/L px at the fist-to-face point, the lunge at its 100 px bound for George and Guido)
    attacker: {
        [GEORGE]:   { reach: 51,   hit: { lArm: 0.9, lElbow: 0.02 }, hitR: { arm: 0.7, elbow: 0.02 } },   // 6.6 px
        [KOWALSKI]: { reach: 54.8, hit: { lArm: 0.713, lElbow: 0.379 }, hitR: { arm: 0.2, elbow: 1.12 } },    // 3 px
        [GUIDO]:    { reach: 51.9, hit: { lArm: 0.9, lElbow: 0.22 }, hitR: { arm: 0.204, elbow: 1.063 } },   // 4.6 px
    },
};

// `nearChannel`: which leg channel ('l' or 'r') is the camera-side leg for this facing (skeleton.lChannelSide(facing) === 'near' is 'l'). `walk`: { x along his facing, y down the screen } to where he kneels.
export function mountedPunchesClip(spec = MOUNTED_PUNCHES_SPEC, rigId, { nearChannel = 'l', walk = { x: 0, y: 0 }, punches } = {}) {
    const s = specFor(spec, { attackerRigId: rigId }), t = s.times, far = nearChannel === 'l' ? 'r' : 'l', n = punches ?? s.punches;
    const kneel = (k = 1) => ({
        [nearChannel + 'Leg']: s.kneel.down.leg * k, [far + 'Leg']: s.kneel.up.leg * k, [nearChannel + 'Fold']: s.kneel.down.fold * k, [far + 'Fold']: s.kneel.up.fold * k,
        crouch: s.kneel.crouch * k, bend: s.kneel.bend * k, lean: 0.1, lElbow: 0.75, rElbow: 0.75, lArm: 0, rArm: 0,
    });
    // arm channels for one punch: the striking arm (`l` or `r`) and the pose it is in
    const arms = (hand, phase) => {
        const ch = hand, other = hand === 'l' ? 'r' : 'l', hit = s.hit, g = s.guard, mine = hand === 'l' ? { arm: hit.lArm, elbow: hit.lElbow } : s.hitR;
        const arm = phase === 'cock' ? mine.arm + s.cock.lArm : mine.arm, elbow = phase === 'cock' ? mine.elbow + s.cock.lElbow : mine.elbow;
        return { [ch + 'Arm']: arm, [ch + 'Elbow']: elbow, [other + 'Arm']: g.arm, [other + 'Elbow']: g.elbow, lean: hit.lean + (phase === 'cock' ? s.cock.lean : 0), bend: hit.bend };
    };
    const at = (time, pose, y = walk.y) => ({ at: +time.toFixed(4), ease: 'easeInOut', pose: shinsFromFolds({ ...kneel(), ...pose }), transform: { x: walk.x, y } });
    const keys = [{ at: 0, ease: 'easeInOut', pose: { ...REST }, transform: { x: 0, y: 0 } }, at(t.set, {})];
    const events = [];
    let last = t.set;
    for (let i = 0; i < n; i++) {
        const hand = i % 2 === 0 ? 'l' : 'r', hitAt = t.first + i * t.gap;
        keys.push(at(hitAt - t.cock, arms(hand, 'cock')), at(hitAt, arms(hand, 'hit')));
        events.push({ at: +hitAt.toFixed(4), type: 'impact' });
        last = hitAt;
    }
    keys.push(at(last + t.tail * 0.5, { lean: 0.3, lArm: 0.5, rArm: 0.5, lElbow: 1.0, rElbow: 1.0 }));
    keys.push({ at: +(last + t.tail + t.rise).toFixed(4), ease: 'easeInOut', pose: { ...REST }, transform: { x: walk.x - 24, y: walk.y } });
    return { id: `mountedPunches:${rigId}`, duration: +(last + t.tail + t.rise).toFixed(4), events, tracks: { attacker: { keyframes: keys }, defender: { keyframes: [{ at: 0 }, { at: +(last + t.tail + t.rise).toFixed(4) }] } },
        layers: [{ from: t.set, to: +(last + t.tail).toFixed(4), order: [
            ['attacker', 'farLeg'], ['defender', 'farArm'], ['defender', 'nativeBody'], ['defender', 'nearArm'],
            ['attacker', 'farArm'], ['attacker', 'torso'], ['attacker', 'head'], ['attacker', 'nearLeg'], ['attacker', 'nearArm'],
        ] }],
        plants: [{ role: 'attacker', leg: nearChannel, in: [t.set, t.set + 0.05], out: [last + t.tail * 0.5, last + t.tail * 0.5 + 0.05], kneeRestart: true }, { role: 'attacker', leg: far, in: [t.set, t.set + 0.05], out: [last + t.tail * 0.5, last + t.tail * 0.5 + 0.05], kneeRestart: true }] };
}

// Body stomps: the hand stomp's keys, three times on the back. `reach` is HAND_STOMP_SPEC's (the same stomp from the same pose), so every rig's boot lands where the hand stomp's does, here on the torso's drawn point.
export const BODY_STOMPS_SPEC = {
    stomps: 3,
    standY: 0,                 // his root's depth against the man's back point (px at s = 1); measured at the contact (stomp_probe)
    cycle: 0.36,               // contact to contact
    exit: 28,
    times: { set: 0.65, first: 0.97, lift: 0.14, tail: 0.3, end: 0.3 },
    attacker: {},
};
export const bodyStompsClip = (rigId, { walk = { x: 0, y: 0 }, stomps } = {}, spec = BODY_STOMPS_SPEC) => {
    const hs = specFor(HAND_STOMP_SPEC, { attackerRigId: rigId }), b = specFor(spec, { attackerRigId: rigId }), t = b.times, K = hs.keys, n = stomps ?? b.stomps;
    const key = (time, k, ease = 'easeInOut', dx = 0) => ({ at: +time.toFixed(4), ease, pose: shinsFromFolds(K[k]), transform: time === 0 ? { x: 0, y: 0 } : { x: walk.x - dx, y: walk.y } });
    const keys = [key(0, 'idle'), key(t.set, 'set')], events = [];
    let lastContact = t.first;
    for (let i = 0; i < n; i++) {
        const c = t.first + i * b.cycle;
        keys.push(key(c - t.lift, 'chamber', 'easeOut'), key(c, 'contact', 'easeIn'));
        events.push({ at: +c.toFixed(4), type: 'impact' });
        lastContact = c;
    }
    keys.push(key(lastContact + t.tail, 'back'), key(lastContact + t.tail + t.end, 'idle', 'easeInOut', b.exit));
    return { id: `bodyStomps:${rigId}`, duration: +(lastContact + t.tail + t.end).toFixed(4), events, tracks: { attacker: { keyframes: keys } },
        plants: [{ role: 'attacker', leg: 'r', in: [t.set, t.set + 0.05], out: [lastContact + t.tail, lastContact + t.tail + 0.05], kneeRestart: true }] };
};
