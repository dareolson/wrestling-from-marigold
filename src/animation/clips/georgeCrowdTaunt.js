// PLAN_GEORGE_PERFORMANCE A, "Admire me / how dare you" (?light=v1&georgePerformance=1): after the strut settles, George stands still and
// presents himself to the crowd, holds for the applause that does not come, recoils offended, sweeps the crowd away with the near forearm
// and hands back to his idle. Upper body only: the legs, crouch and any knee/shin channels hold the stance he starts from, so the soles stay
// planted and no knee is authored. One-wrestler clip; Wrestler._doCrowdTaunt plays it and drives the face on its events.
// Angles are a first pass by eye on the rig (lArm ~1.1 = forearm level at the face, jab.js); Derek judges.
export const CROWD_TAUNT = {
    times: { settle: 0.30, present: 0.70, holdEnd: 1.35, recoil: 1.60, sweepMid: 1.83, sweep: 2.05, end: 2.60 },
    keys: {
        // chest up, elbows out
        settle:  { lArm: 0.30, rArm: 0.05, lElbow: 0.85, rElbow: 0.85, lean: -0.08, bend: -0.04 },
        // arms open below the shoulder, the near arm leading, elbows soft: "here I am"
        present: { lArm: 0.85, rArm: 0.55, lElbow: 0.45, rElbow: 0.55, lean: -0.14, bend: -0.08 },
        // the hold: almost still, a touch more open
        hold:    { lArm: 0.90, rArm: 0.60, lElbow: 0.42, rElbow: 0.52, lean: -0.15, bend: -0.09 },
        // offended: chest draws back, the near hand comes to the upper chest (below the face), the far arm drops
        recoil:  { lArm: 0.40, rArm: 0.25, lElbow: 2.10, rElbow: 0.90, lean: -0.24, bend: -0.14 },
        // the dismissal: the near forearm sweeps out and down once, low
        sweepMid:{ lArm: 0.80, rArm: 0.20, lElbow: 1.10, rElbow: 0.85, lean: -0.16, bend: -0.06 },
        sweep:   { lArm: 0.55, rArm: 0.15, lElbow: 0.35, rElbow: 0.80, lean: -0.10, bend: -0.02 },
    },
};

// PLAN_GEORGE_PERFORMANCE B, "Effortless superiority": with the other man down, a chest lift, the near hand turned out at waist height to
// present him ("look what I did"), the far fist on the hip, a self-satisfied pause, back to guard. 1.15 s, no travel.
export const SUPERIORITY = {
    times: { lift: 0.20, present: 0.40, holdEnd: 0.90, end: 1.15 },
    keys: {
        lift:    { lArm: 0.25, rArm: -0.10, lElbow: 0.80, rElbow: 1.20, lean: -0.12, bend: -0.06 },
        present: { lArm: 0.55, rArm: -0.25, lElbow: 0.55, rElbow: 1.70, lean: -0.15, bend: -0.08 },
        hold:    { lArm: 0.58, rArm: -0.25, lElbow: 0.52, rElbow: 1.70, lean: -0.16, bend: -0.09 },
    },
};

const UPPER = ['lArm', 'rArm', 'lElbow', 'rElbow', 'lean', 'bend'];

// The hand the l-channel arm (the presenting / dismissing arm) wears from each key on: George's forearm variants (Codex 2026-11-15:
// presentPalm, dismiss; george_roster_v1.js). Art swaps are discrete, so each is set on the key the motion starts from. `lSlot` is the
// forearm slot the l channels draw at this facing (Skeleton.lChannelSide); the other forearm stays on its base art.
const CROWD_HANDS = { settle: 'presentPalm', present: 'presentPalm', hold: 'presentPalm', recoil: 'chestTouch', sweepMid: 'dismiss', sweep: 'dismiss' };
const SUPERIORITY_HANDS = { lift: 'presentPalm', present: 'presentPalm', hold: 'presentPalm' };

function builder(stance, lSlot) {
    const lower = Object.fromEntries(Object.entries(stance).filter(([k, v]) => Number.isFinite(v) && !UPPER.includes(k) && !['tilt', 'lift'].includes(k)));
    const upperOf = p => Object.fromEntries(UPPER.map(k => [k, Number.isFinite(p[k]) ? p[k] : (k.endsWith('Elbow') ? 0.7 : 0)]));
    const key = (at, upper, hand = 'base', ease = 'easeInOut') => ({ at, ease, pose: { ...lower, ...upper }, ...(lSlot ? { parts: { [lSlot]: hand } } : {}) });
    return { upperOf, key };
}

// `stance`: the pose he is in when it starts (his own idle after the strut). Its lower body is held on every key; the first key is the stance
// itself and the last returns the upper body to `idle` (his idlePose, so tweening on to it afterwards is a no-op).
export function georgeCrowdTauntClip(stance, idle = stance, { lSlot = null, spec = CROWD_TAUNT, hands = CROWD_HANDS } = {}) {
    const t = spec.times, { upperOf, key } = builder(stance, lSlot), k = (n, at = t[n]) => key(at, spec.keys[n], hands[n], n === 'hold' ? 'linear' : n === 'recoil' || n === 'sweep' ? 'easeOut' : 'easeInOut');
    return {
        id: 'georgeCrowdTaunt',
        duration: t.end,
        events: [{ at: t.settle, type: 'present' }, { at: t.holdEnd, type: 'reject' }, { at: t.recoil, type: 'dismiss' }, { at: t.sweep, type: 'release' }],
        tracks: { attacker: { keyframes: [
            key(0, upperOf(stance)),
            k('settle'), k('present'),
            k('hold', t.holdEnd),
            k('recoil'), k('sweepMid'), k('sweep'),
            key(t.end, upperOf(idle)),
        ] } },
    };
}

export function georgeSuperiorityClip(stance, idle = stance, { lSlot = null, spec = SUPERIORITY, hands = SUPERIORITY_HANDS } = {}) {
    const t = spec.times, { upperOf, key } = builder(stance, lSlot);
    return {
        id: 'georgeSuperiority',
        duration: t.end,
        events: [{ at: 0.05, type: 'superior' }, { at: t.holdEnd, type: 'release' }],   // the runtime does not fire an event at 0
        tracks: { attacker: { keyframes: [
            key(0, upperOf(stance)),
            key(t.lift, spec.keys.lift, hands.lift),
            key(t.present, spec.keys.present, hands.present, 'easeOut'),
            key(t.holdEnd, spec.keys.hold, hands.hold, 'linear'),
            key(t.end, upperOf(idle)),
        ] } },
    };
}

// PLAN_GEORGE_PERFORMANCE C, "My hair!": the far hand (hairSmooth art, drawn behind the head) goes up to the back of the head, pauses
// on the hair, strokes once down the back of it; the near hand comes up in front of the chin to look at the fingers (inspect art); a
// resentful look at the opponent; back to idle. Arm poses from tools/debug/hair_touch_search.mjs (the near arm cannot reach the hair on
// this rig). Wear changes the rhythm, not the gesture: disheveled is quicker with a shorter pause, battered breaks off after the touch.
export const HAIR_CHECK = {
    // Stage D (T-D1): the hand rests on the hair half a second, two strokes, chest up toward the hand, a long look at the fingers
    times: { reach: 0.35, touch: 0.45, hold: 0.90, stroke: 1.15, lift: 1.30, stroke2: 1.60, inspect: 1.85, inspectEnd: 2.25, glance: 2.40, end: 2.60 },
    keys: {
        reach:   { rArm: 3.30, rElbow: 0.60, lArm: 0.15, lElbow: 0.80, lean: -0.12, bend: -0.07 },   // finger pads at the top of the back of the hair
        touch:   { rArm: 3.28, rElbow: 0.64, lArm: 0.15, lElbow: 0.80, lean: -0.17, bend: -0.11 },   // chest lifted toward the hand
        hold:    { rArm: 3.28, rElbow: 0.64, lArm: 0.15, lElbow: 0.80, lean: -0.18, bend: -0.12 },
        stroke:  { rArm: 2.90, rElbow: 1.30, lArm: 0.20, lElbow: 0.90, lean: -0.10, bend: -0.06 },   // down the back of the head
        lift:    { rArm: 3.20, rElbow: 0.72, lArm: 0.18, lElbow: 0.85, lean: -0.16, bend: -0.10 },   // back up for the second pass
        stroke2: { rArm: 2.85, rElbow: 1.35, lArm: 0.20, lElbow: 0.90, lean: -0.08, bend: -0.04 },
        inspect: { rArm: 0.30, rElbow: 0.90, lArm: 0.45, lElbow: 2.20, lean: 0.02, bend: 0.04 },     // the near hand before the chin, palm to his face
        held:    { rArm: 0.28, rElbow: 0.90, lArm: 0.47, lElbow: 2.22, lean: 0.03, bend: 0.05 },
        glance:  { rArm: 0.25, rElbow: 0.85, lArm: 0.40, lElbow: 1.60, lean: -0.04, bend: -0.02 },
    },
    // stage -> time scale, and whether he gets as far as looking at his hand
    stages: [{ scale: 1.0, inspect: true }, { scale: 0.85, inspect: true }, { scale: 0.8, inspect: false }],
};
const HAIR_HANDS = { reach: { r: 'hairSmooth' }, touch: { r: 'hairSmooth' }, hold: { r: 'hairSmooth' }, stroke: { r: 'hairSmooth' }, lift: { r: 'hairSmooth' }, stroke2: { r: 'hairSmooth' }, inspect: { l: 'inspect' }, held: { l: 'inspect' }, glance: {} };

// lSlot / rSlot: the forearm slots the l and r channels draw at this facing. stage: his wear stage (0 clean, 1 disheveled, 2 battered).
export function georgeHairCheckClip(stance, idle = stance, { lSlot = null, rSlot = null, stage = 0, spec = HAIR_CHECK } = {}) {
    const st = spec.stages[Math.max(0, Math.min(2, stage))], sc = x => +(x * st.scale).toFixed(3), t = spec.times;
    const lower = Object.fromEntries(Object.entries(stance).filter(([k, v]) => Number.isFinite(v) && !UPPER.includes(k) && !['tilt', 'lift'].includes(k)));
    const upperOf = p => Object.fromEntries(UPPER.map(k => [k, Number.isFinite(p[k]) ? p[k] : (k.endsWith('Elbow') ? 0.7 : 0)]));
    const parts = (h = {}) => (lSlot && rSlot ? { parts: { [lSlot]: h.l ?? 'base', [rSlot]: h.r ?? 'base' } } : {});
    const key = (at, upper, h, ease = 'easeInOut') => ({ at, ease, pose: { ...lower, ...upper }, ...parts(h) });
    const k = (n, at, ease) => key(at, spec.keys[n], HAIR_HANDS[n], ease);
    const frames = [key(0, upperOf(stance), HAIR_HANDS.reach), k('reach', sc(t.reach), 'easeOut'), k('touch', sc(t.touch), 'linear'), k('hold', sc(t.hold), 'linear'), k('stroke', sc(t.stroke))];
    let end, events;
    if (st.inspect) {
        frames.push(k('lift', sc(t.lift)), k('stroke2', sc(t.stroke2)), k('inspect', sc(t.inspect)), k('held', sc(t.inspectEnd), 'linear'), k('glance', sc(t.glance)));
        end = sc(t.end);
        events = [{ at: 0.05, type: 'hairTouch' }, { at: sc(t.inspect), type: 'inspect' }, { at: sc(t.inspectEnd), type: 'resent' }, { at: sc(t.glance) + 0.05, type: 'release' }];
    } else {
        // battered: the first stroke goes nowhere; he yanks the hand down and snarls
        const yank = sc(t.stroke) + 0.25;
        frames.push(k('glance', yank, 'easeOut'));
        end = yank + 0.35;
        events = [{ at: 0.05, type: 'hairTouch' }, { at: sc(t.stroke), type: 'abort' }, { at: end - 0.05, type: 'release' }];
    }
    frames.push(key(end, upperOf(idle), {}));
    return { id: 'georgeHairCheck', duration: end, events, tracks: { attacker: { keyframes: frames } } };
}
