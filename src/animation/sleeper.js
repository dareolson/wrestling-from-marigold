// The rear sleeper out of the waistlock (PLAN_GRAPPLES Stage 4d, S1-S7). Pure data and math, behind `?waistlock=v1`, like waistlock.js and
// waistlockThrows.js: nothing here touches a Wrestler or a POSE. Times in seconds, lengths in px at s = 1 (the caller scales).
// KNEES: on the upright path a NEGATIVE lKnee/rKnee folds the heel back (see the note at the top of clips/index.js); every knee value here is
// negative or zero, and tools/debug/clip_knee_audit.mjs is the check, not the sign you expect.
import { WAISTLOCK } from './waistlock.js';

// S2: the gameplay timings stay those of Arena._tickSleeper (z under 1.4 s, zz under 2.8 s, zzz after, the KO at 4.0 s, 4.5 stamina/s).
export const SLEEPER = Object.freeze({
    stages: Object.freeze([
        Object.freeze({ id: 'fight', z: 'z', until: 1.4 }),
        Object.freeze({ id: 'flail', z: 'zz', until: 2.8 }),
        Object.freeze({ id: 'limp', z: 'zzz', until: 4.0 }),
    ]),
    ko: 4.0,
    behind: 50,                         // px between the two men's origins while it is on (waistlock's holdBehind is 82: the neck is nearer than the waist)
    upstage: WAISTLOCK.upstage,         // he stays this far upstage so he draws behind (S3, D12 below the belt)
    enter: 0.30,                        // the hold's pose to the sleeper's: the attacker's arm comes round the neck
    sinkBlend: 0.35,                    // s a stage's sink takes to settle, in or out (an escape tick rises him one stage over this)
    damageKey: 'sleeperHold',
    snapmareSmallWindowStages: Object.freeze(['fight', 'flail']),   // S6: not in 'limp', too far gone
});

// The stage the hold is in `t` seconds after it was applied (clamped to the last one).
export function sleeperStage(t) {
    return SLEEPER.stages.find(s => t < s.until) ?? SLEEPER.stages[SLEEPER.stages.length - 1];
}
// An escape tick brings him back up one stage (S3b: limp -> flail -> fight): the timer to restart at, the start of the stage before his.
export function stageRestartTime(stageId) {
    const i = SLEEPER.stages.findIndex(s => s.id === stageId);
    return i <= 1 ? 0 : SLEEPER.stages[i - 2].until;
}

// Pose keys (the channel names of WAISTLOCK_POSES, but the legs are direct: no absolute shins, so the knee audit reads what is set). The attacker leans in with `bend`, his hips stay half a step back (D12); the
// defender's chin is up and his knees soften more each stage. `crouch` is the whole-body sink; the get-ups' KNEEL key is the 'limp' target
// (checked on the render at T4d.2, not assumed from these numbers).
export const SLEEPER_POSES = Object.freeze({
    // `lead` is the near-side leg's thigh, `rear` the far-side one's (resolved to lLeg/rLeg by sleeperChannels); both knees take `knee` (negative).
    attacker: Object.freeze({
        fight: Object.freeze({ bend: 0.45, crouch: 0.20, lead: -0.20, rear: 0.05, knee: -0.30 }),
        flail: Object.freeze({ bend: 0.50, crouch: 0.40, lead: -0.25, rear: 0.05, knee: -0.50 }),
        limp: Object.freeze({ bend: 0.55, crouch: 0.65, lead: -0.30, rear: 0.05, knee: -0.80 }),
    }),
    defender: Object.freeze({
        fight: Object.freeze({ bend: -0.05, crouch: 0.10, lead: -0.05, rear: 0.08, knee: -0.15 }),
        flail: Object.freeze({ bend: 0.05, crouch: 0.35, lead: 0.05, rear: 0.12, knee: -0.50 }),
        limp: Object.freeze({ bend: 0.15, crouch: 0.70, lead: 0.35, rear: 0.30, knee: -1.40 }),
    }),
});

// The defender's pose channels at timer `t`, the sink eased between stages over sinkBlend (so a stage change, in either direction, never pops).
export function sleeperSink(t, role = 'defender') {
    const keys = SLEEPER_POSES[role], ids = SLEEPER.stages.map(s => s.id);
    const i = ids.indexOf(sleeperStage(t).id), prev = ids[Math.max(0, i - 1)];
    const since = t - (i > 0 ? SLEEPER.stages[i - 1].until : 0), k = Math.max(0, Math.min(1, since / SLEEPER.sinkBlend)), e = k * k * (3 - 2 * k);
    const out = {};
    for (const ch of Object.keys(keys[ids[i]])) out[ch] = (keys[prev][ch] ?? 0) + ((keys[ids[i]][ch] ?? 0) - (keys[prev][ch] ?? 0)) * e;
    return out;
}

// Pose channels for one role at timer `t`: sink (body and legs, eased between stages) plus the defender's arms for the stage (S3b). `lSide` is
// skeleton.lChannelSide(facing). `seed` picks the flail. Arm channels are the base the fight's IK (Arena._holdSleeperGrips) pulls the hands off.
export function sleeperChannels(role, lSide, t, seed = 1) {
    const k = sleeperSink(t, role), nearCh = lSide === 'far' ? 'r' : 'l', farCh = nearCh === 'l' ? 'r' : 'l';
    const out = { bend: k.bend, crouch: k.crouch, [`${nearCh}Leg`]: k.lead, [`${farCh}Leg`]: k.rear, lKnee: k.knee, rKnee: k.knee };
    if (role === 'attacker') return out;
    const stage = sleeperStage(t).id, A = SLEEPER_ARMS;
    const arms = (near, far) => Object.assign(out, { [`${nearCh}Arm`]: near.arm, [`${nearCh}Elbow`]: near.elbow, [`${farCh}Arm`]: far.arm, [`${farCh}Elbow`]: far.elbow });
    if (stage === 'fight') {
        const tug = Math.sin(2 * Math.PI * A.fight.tugHz * t) * A.fight.tug;
        arms({ arm: A.fight.near.arm + tug, elbow: A.fight.near.elbow }, { arm: A.fight.far.arm - tug, elbow: A.fight.far.elbow });
    } else if (stage === 'flail') {
        const swings = flailSwings(seed), cur = swings.find(w => t >= w.at && t < w.at + w.dur) ?? swings.at(-1);
        const u = Math.max(0, Math.min(1, (t - cur.at) / cur.dur)), env = Math.sin(Math.PI * u);
        const hang = A.limp.near;
        const reach = { arm: hang.arm + (cur.arm - hang.arm) * env, elbow: hang.elbow + (cur.elbow - hang.elbow) * env };
        const rest = { arm: A.fight.near.arm * 0.5, elbow: A.fight.near.elbow * 0.6 };
        arms(cur.side === 'near' ? reach : rest, cur.side === 'far' ? reach : rest);
    } else {
        const sway = Math.sin(t * 2.2) * A.limp.sway;
        arms({ arm: A.limp.near.arm + sway, elbow: A.limp.near.elbow }, { arm: A.limp.far.arm - sway, elbow: A.limp.far.elbow });
    }
    return out;
}

// S3b: the defender's arms. fight = both hands up at the choking forearm, small fast tugs; flail = the grip is broken, the arms swing and reach, uneven and
// off-beat; limp = the hands slide down and the arms hang. Channels are arm angles (lArm/rArm, radians, 0 = down, positive forward) and elbows.
// The seeded pick per swing keeps a flail from repeating in step.
export const SLEEPER_ARMS = Object.freeze({
    fight: Object.freeze({ near: Object.freeze({ arm: 1.55, elbow: 1.50 }), far: Object.freeze({ arm: 1.75, elbow: 1.35 }), tugHz: 6, tug: 0.08 }),
    flail: Object.freeze({ swingMin: 0.18, swingMax: 0.34, reach: Object.freeze([0.5, 2.0]), decay: 0.55 }),
    limp: Object.freeze({ near: Object.freeze({ arm: 0.08, elbow: 0.25 }), far: Object.freeze({ arm: 0.12, elbow: 0.25 }), sway: 0.05 }),
});

// A small seeded generator (mulberry32), so a flail is the same for the same seed and different for another; no Math.random in a pose.
export function seeded(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The flail's swings from `from` to `to` seconds: [{ at, dur, arm, elbow, side }], each a random reach for one arm, the later ones shorter and slower.
export function flailSwings(seed, from = SLEEPER.stages[0].until, to = SLEEPER.stages[1].until) {
    const rnd = seeded(seed), F = SLEEPER_ARMS.flail, out = [];
    let t = from, n = 0;
    while (t < to) {
        const slow = 1 + n * 0.25, dur = (F.swingMin + rnd() * (F.swingMax - F.swingMin)) * slow;
        const amp = F.decay ** n;
        out.push({ at: t, dur, side: rnd() < 0.5 ? 'near' : 'far', arm: F.reach[0] + rnd() * (F.reach[1] - F.reach[0]) * amp, elbow: 0.3 + rnd() * 1.0 * amp });
        t += dur; n++;
    }
    return out;
}

// S6: the small snapmare, from the same clip as the full one with one option. `flip: 'small'` is about a half turn and lands him seated; the seat is held
// 0.8 s and then the get-up. Damage and sell as the plan says.
export const SNAPMARE_SMALL = Object.freeze({
    flip: 'small',
    landAngle: Math.PI,                 // a half turn: over the shoulder onto his seat, back to the thrower (solved against the render at T4d.3)
    seat: 0.8,                          // s seated before the get-up
    damageKey: 'snapmareSmall',         // STAMINA_DRAIN key, 7
    sellSpec: Object.freeze({ part: 'back', intensity: 0.5 }),
});
export const SNAPMARE_FLIPS = Object.freeze(['full', 'small']);
export function snapmareFlipAngle(flip = 'full', fullAngle = 1.5 * Math.PI) {
    if (!SNAPMARE_FLIPS.includes(flip)) throw new Error(`unknown snapmare flip "${flip}"`);
    return flip === 'small' ? SNAPMARE_SMALL.landAngle : fullAngle;
}

// Can the defender's small snapmare (his power) answer the hold at this timer? Only while it is z or zz (S6).
export function smallSnapmareOpen(t) {
    return SLEEPER.snapmareSmallWindowStages.includes(sleeperStage(t).id);
}
