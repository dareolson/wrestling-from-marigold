// PLAN_GEORGE_PERFORMANCE Stage E (T-E2): the new taunt gestures for Lou, Guido and Kowalski. Upper body only on the georgeCrowdTaunt.js pattern: the legs, crouch
// and any knee/shin channels hold the stance he starts from (soles planted, no knee authored), the first key is that stance and the last returns the upper body to
// his idle. Body-relative: angles only, no art swaps (base fists), so the same gesture plays on any rig. `talk` / `shout` events drive FaceDriver.perform on the rigs that
// have faces. Angles are a first pass by eye on Lou; Derek judges at gate GE.
import { builder } from './georgeCrowdTaunt.js';

// the l channel is the near / leading arm, r the other; times in seconds, keys by name
export const TAUNT_GESTURES = {
    // the far hand (behind the head, so the face stays clear) to the ear, then cupped out and waiting for the crowd (Lou, Guido up)
    earCup: {
        times: { lift: 0.30, cup: 0.55, lean1: 0.95, lean2: 1.35, end: 1.80 },
        keys: {
            lift:  { rArm: 1.60, lArm: 0.10, rElbow: 1.90, lElbow: 0.85, lean: -0.04, bend: 0 },
            cup:   { rArm: 1.95, lArm: 0.10, rElbow: 2.25, lElbow: 0.85, lean: 0.02, bend: 0.04 },
            lean1: { rArm: 1.95, lArm: 0.12, rElbow: 2.25, lElbow: 0.85, lean: 0.07, bend: 0.06 },
            lean2: { rArm: 1.95, lArm: 0.10, rElbow: 2.25, lElbow: 0.85, lean: 0.03, bend: 0.04 },
        },
        events: [{ at: 0.30, type: 'talk' }, { at: 1.35, type: 'release' }],
    },
    // point at the opponent with the leading arm, the other fist raised and pumped once (Lou forward)
    pointFist: {
        times: { point: 0.28, fist: 0.50, pump: 0.80, fist2: 1.05, end: 1.60 },
        keys: {
            point: { lArm: 1.50, rArm: 0.30, lElbow: 0.10, rElbow: 0.90, lean: -0.06, bend: -0.02 },
            fist:  { lArm: 1.52, rArm: 2.40, lElbow: 0.10, rElbow: 1.30, lean: -0.10, bend: -0.04 },
            pump:  { lArm: 1.52, rArm: 2.75, lElbow: 0.10, rElbow: 1.00, lean: -0.12, bend: -0.05 },
            fist2: { lArm: 1.52, rArm: 2.40, lElbow: 0.10, rElbow: 1.30, lean: -0.10, bend: -0.04 },
        },
        events: [{ at: 0.28, type: 'talk' }, { at: 1.05, type: 'release' }],
    },
    // a fist driven up twice to the crowd (Guido neutral)
    fistPump: {
        times: { cock: 0.22, up1: 0.42, down1: 0.62, up2: 0.84, hold: 1.10, end: 1.40 },
        keys: {
            cock:  { lArm: 0.30, rArm: 1.20, lElbow: 0.85, rElbow: 1.90, lean: -0.06, bend: -0.02 },
            up1:   { lArm: 0.30, rArm: 2.70, lElbow: 0.85, rElbow: 0.70, lean: -0.14, bend: -0.06 },
            down1: { lArm: 0.30, rArm: 1.60, lElbow: 0.85, rElbow: 1.60, lean: -0.08, bend: -0.03 },
            up2:   { lArm: 0.30, rArm: 2.80, lElbow: 0.85, rElbow: 0.60, lean: -0.16, bend: -0.07 },
            hold:  { lArm: 0.30, rArm: 2.80, lElbow: 0.85, rElbow: 0.60, lean: -0.16, bend: -0.07 },
        },
        events: [{ at: 0.22, type: 'talk' }, { at: 1.10, type: 'release' }],
    },
    // both fists to the chest, beaten alternately, head back, roaring (Kowalski up)
    chestBeat: {
        times: { set: 0.30, hit1: 0.50, off1: 0.68, hit2: 0.88, off2: 1.06, hit3: 1.26, roar: 1.50, end: 2.00 },
        keys: {
            set:  { lArm: 0.15, rArm: 0.15, lElbow: 1.90, rElbow: 1.90, lean: -0.18, bend: -0.10 },
            hit1: { lArm: 0.05, rArm: 0.30, lElbow: 2.10, rElbow: 1.70, lean: -0.20, bend: -0.12 },
            off1: { lArm: 0.45, rArm: 0.15, lElbow: 1.40, rElbow: 1.90, lean: -0.18, bend: -0.10 },
            hit2: { lArm: 0.30, rArm: 0.05, lElbow: 1.70, rElbow: 2.10, lean: -0.20, bend: -0.12 },
            off2: { lArm: 0.15, rArm: 0.45, lElbow: 1.90, rElbow: 1.40, lean: -0.18, bend: -0.10 },
            hit3: { lArm: 0.05, rArm: 0.30, lElbow: 2.10, rElbow: 1.70, lean: -0.20, bend: -0.12 },
            roar: { lArm: 0.95, rArm: 0.95, lElbow: 0.55, rElbow: 0.55, lean: -0.28, bend: -0.16 },
        },
        events: [{ at: 0.30, type: 'talk' }, { at: 1.50, type: 'shout' }, { at: 2.00, type: 'release' }],
    },
    // the leading hand drawn across the throat at the opponent, then held (Kowalski forward)
    throatSlash: {
        times: { raise: 0.30, set: 0.48, slash: 0.68, hold: 0.80, end: 1.50 },
        keys: {
            raise: { lArm: 1.30, rArm: 0.15, lElbow: 2.20, rElbow: 0.85, lean: -0.06, bend: 0 },
            set:   { lArm: 1.20, rArm: 0.15, lElbow: 2.45, rElbow: 0.85, lean: -0.08, bend: -0.02 },
            slash: { lArm: 1.40, rArm: 0.15, lElbow: 0.95, rElbow: 0.85, lean: -0.10, bend: -0.03 },
            hold:  { lArm: 1.40, rArm: 0.15, lElbow: 0.95, rElbow: 0.85, lean: -0.10, bend: -0.03 },
        },
        events: [{ at: 0.30, type: 'shout' }, { at: 0.80, type: 'release' }],
    },
};

export function tauntGestureClip(name, stance, idle = stance) {
    const spec = TAUNT_GESTURES[name];
    if (!spec) throw new Error(`unknown taunt gesture: ${name}`);
    const { upperOf, key } = builder(stance, null), t = spec.times;
    const names = Object.keys(spec.keys);
    return {
        id: `taunt_${name}`,
        duration: t.end,
        events: spec.events,
        tracks: { attacker: { keyframes: [
            key(0, upperOf(stance)),
            ...names.map((n, i) => key(t[n], spec.keys[n], 'base', i === 0 ? 'easeOut' : 'easeInOut')),
            key(t.end, upperOf(idle)),
        ] } },
    };
}
