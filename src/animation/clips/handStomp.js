// PLAN_LIGHT_MOVES T8.1 (?light=v1): the hand stomp on a man lying on his stomach. A one-wrestler clip (the man stays on the grounded rig; his resting hand and his sell are
// falls.js handHitSell): the attacker sets his weight on the right leg, chambers the left knee, and drives the boot flat down onto the man's near hand, grinds it, then steps back.
// One spec (build rules): the base is Lou's first fit; a rig that stands or reaches differently is an attacker override by rig id (rigOverrides.js). `reach` is how far from the
// attacker's root the boot's sole lands, in px at s = 1, measured per rig at the contact frame; the executor puts the root there from the man's drawn hand, so the sole meets it.
import { shinsFromFolds } from '../../rig/articulation.js';
import { specFor } from './rigOverrides.js';

export const HAND_STOMP_SPEC = {
    exit: 28,           // after the stomp he steps this far back from the man (px at s = 1), to where the scene's body separation leaves him, so nothing pops when the clip ends
    standY: 0,          // his root's depth against the hand's drawn point (px at s = 1, + = nearer the camera)
    reach: 69.5,          // sole to root along the facing at contact (px at s = 1)
    times: { set: 0.65, chamber: 0.85, contact: 0.97, grind: 1.13, back: 1.38, end: 1.65 },   // 0 -> set: the walk to the hand (his transform keys), the weight settling
    // per key: the body. lLeg/lFold = the stomping leg (thigh angle, heel fold); rLeg/rFold the support leg.
    keys: {
        idle:    { lLeg: -0.04, rLeg: 0.16, lFold: 0, rFold: 0, lArm: 0, rArm: 0, lElbow: 0.1, rElbow: 0.1, lean: 0, bend: 0, crouch: 0, lift: 0 },
        set:     { lLeg: 0.05,  rLeg: 0.12, lFold: 0.3, rFold: 0.45, lArm: 0.35, rArm: -0.2, lElbow: 0.3, rElbow: 0.2, lean: 0.06, bend: 0.1, crouch: 0.2, lift: 0 },
        chamber: { lLeg: 1.15,  rLeg: 0.05, lFold: 1.45, rFold: 0.6, lArm: 0.7, rArm: -0.3, lElbow: 0.4, rElbow: 0.2, lean: 0.04, bend: 0.12, crouch: 0.3, lift: 6 },
        contact: { lLeg: 0.62,  rLeg: 0.08, lFold: 0.12, rFold: 0.8, lArm: 0.5, rArm: -0.3, lElbow: 0.3, rElbow: 0.2, lean: 0.22, bend: 0.22, crouch: 0.46, lift: 0 },
        grind:   { lLeg: 0.58,  rLeg: 0.08, lFold: 0.12, rFold: 0.85, lArm: 0.45, rArm: -0.3, lElbow: 0.3, rElbow: 0.2, lean: 0.26, bend: 0.25, crouch: 0.5, lift: 0 },
        back:    { lLeg: 0.2,   rLeg: 0.12, lFold: 0.4, rFold: 0.4, lArm: 0.2, rArm: 0, lElbow: 0.2, rElbow: 0.1, lean: 0.1, bend: 0.1, crouch: 0.15, lift: 0 },
    },
    // first-fit differences by rig: the ankle's offset from the man's wrist at the hit (hand_stomp_probe.mjs) less Lou's, so every rig's boot lands at the same place on the hand
    attacker: {
        'george-roster-v1':   { reach: 63.3 },
        'kowalski-roster-v1': { reach: 74.4 },
        'guido-roster-v1':    { reach: 70.1 },
    },
};

// `walk`: where he stands for the stomp, from where he starts ({ x along his facing, y down the screen }, px at s = 1); he gets there by the set key, so the walk is part of the clip.
export const handStompClip = (spec = HAND_STOMP_SPEC, rigId, walk = { x: 0, y: 0 }) => {
    const s = specFor(spec, { attackerRigId: rigId }), t = s.times;
    const key = (at, k) => ({ at, ease: 'easeInOut', pose: shinsFromFolds(s.keys[k]), transform: at === 0 ? { x: 0, y: 0 } : { x: walk.x - (at >= t.end ? s.exit : 0), y: walk.y } });
    return {
        id: 'handStomp',
        duration: t.end,
        events: [{ at: t.contact, type: 'impact' }],
        tracks: { attacker: { keyframes: [key(0, 'idle'), key(t.set, 'set'), key(t.chamber, 'chamber'), key(t.contact, 'contact'), key(t.grind, 'grind'), key(t.back, 'back'), key(t.end, 'idle')] } },
        // the support sole holds the mat point it had from the set to the step back
        plants: [{ role: 'attacker', leg: 'r', in: [t.set, t.set + 0.05], out: [t.back, t.back + 0.05], kneeRestart: true }],
    };
};
