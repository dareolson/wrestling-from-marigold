// The back sell (lying hold, contact-latched grip art, carried rise, standing back hand) is measured
// per rig, so it is supported per rig (PLAN_GEORGE_TRANSFER T1.3). A rig supports it only when it has
// BOTH a painted `torso.semanticAnchors.backWaist` AND `textures.backSell`. There is no default set of
// numbers: a rig without `backSell` is unsupported and its sell stays off, whatever its anchor says.
//
//   textures.backSell = {
//     holdW,          lowest centre weight of the lying hold whose breathing trough keeps the contact within contactPx
//     recoveryArm,    standing recovery: offset added to the near arm channel of the settled pose
//     recoveryElbow,  standing recovery: offset added to the near elbow of the settled pose
//     settledElbow,   the elbow the settled pose carries (what tweenPose('idle') settles on)
//     contactPx,      the distance at which the hand counts as on the back (grip art latch threshold)
//     evidence,       the tool and date that measured these
//     handUnder,      OPTIONAL boolean, default false (Rev 2 D6): while the grip latch is on, the near forearm (and
//                     near hand) draw BEHIND the torso, so a hand at the back contour reads as under the body
//     aroundVia,      OPTIONAL { u, v, recoveryArm?, recoveryElbow? } (Rev 3 D9), only with handUnder. u, v: a point on the
//                     torso image (finite, may lie off the art, even off the image) OUTSIDE the painted torso that the hand
//                     goes through on its way behind the body and back out (below and outboard of backWaist). Without
//                     aroundVia the hand takes the straight path. recoveryArm / recoveryElbow (both or neither, finite): the
//                     near-arm pose OFFSETS, like recoveryArm / recoveryElbow, that put the standing wrist at that point
//                     (tools/debug/around_recovery_probe.mjs), the via pose of the standing recovery's route. phase (optional, T2.5):
//                     { arm: [a, b], elbow: [a, b] }, 0 <= a < b <= 1, the share of the way TO the via pose (hw 0 -> standW) in which each
//                     channel moves, eased; the arm leading and the elbow following swings the elbow out first and then the forearm
//                     round, instead of both channels sweeping together. approach (optional, in
//                     (.05, .45)): the fraction of a back clutch the reach takes to get in (sells.js clutchSell, default .25)
//     legScale,       OPTIONAL number in (0, 1], default 1 (Rev 4 D12): scales the leg and hip offsets (nearThigh, nearShin,
//                     farThigh, farShin, hip) of every sell and of the lying hold's legs, so this rig's knees bend less
//                     while down; torso, arms and hands are unchanged (sells.js scaleLegs)
//   }
// The settled arm is not stored: it is the rig's idle pose `lArm` (see settledBackHand in
// backRisePerformance.js), the same value the live settled pose carries.
import { GROUNDED_SELL_ART, nearGripParts } from '../animation/sellAppearance.js';

export const BACK_SELL_FIELDS = Object.freeze(['holdW', 'recoveryArm', 'recoveryElbow', 'settledElbow', 'contactPx']);

/**
 * { ok, reason, gripArt, contact, data }
 *   ok       the back sell runs on this rig
 *   reason   null when ok, else why not ('no backWaist anchor' | 'no backSell data' | 'invalid backSell data: <field>')
 *   gripArt  'painted' when the rig has a grip donor for the near hand, else 'none' (the baked fist stays)
 *   contact  the contact the distance is measured from: 'clutchPatch' (the grip art's painted patch) or
 *            'wristProxy' (the wrist, a labelled stand-in when the rig has no painted patch)
 *   data     the rig's backSell object, or null when not ok
 */
export function backSellSupport(skeleton) {
    const textures = skeleton?._textureConfig;
    const gripArt = skeleton && Object.keys(nearGripParts(skeleton)).length ? 'painted' : 'none';
    const slot = textures?.handInForearm ? 'nearForearm' : 'nearHand', family = textures?.handInForearm ? 'forearm' : 'hand';
    const variant = textures?.variants?.[slot]?.[GROUNDED_SELL_ART.back] ?? textures?.variants?.[family]?.[GROUNDED_SELL_ART.back];
    const contact = gripArt === 'painted' && variant?.semanticAnchors?.clutch ? 'clutchPatch' : 'wristProxy';
    const no = reason => ({ ok: false, reason, gripArt, contact, data: null });
    if (!skeleton?.torso?._semanticAnchors?.backWaist) return no('no backWaist anchor');
    const data = textures?.backSell;
    if (!data) return no('no backSell data');
    for (const k of BACK_SELL_FIELDS) if (!Number.isFinite(data[k])) return no(`invalid backSell data: ${k}`);
    if (!(data.holdW > 0 && data.holdW <= 1) || !(data.contactPx > 0)) return no('invalid backSell data: range');
    if (typeof data.evidence !== 'string' || !data.evidence) return no('invalid backSell data: evidence');
    if (data.handUnder !== undefined && typeof data.handUnder !== 'boolean') return no('invalid backSell data: handUnder');
    if (data.legScale !== undefined && !(Number.isFinite(data.legScale) && data.legScale > 0 && data.legScale <= 1)) return no('invalid backSell data: legScale');
    if (data.aroundVia !== undefined) {
        const via = data.aroundVia, arm = via?.recoveryArm, elbow = via?.recoveryElbow;
        if (!Number.isFinite(via?.u) || !Number.isFinite(via?.v) || data.handUnder !== true
            || (arm === undefined) !== (elbow === undefined) || (arm !== undefined && !(Number.isFinite(arm) && Number.isFinite(elbow)))
            || (via.approach !== undefined && !(via.approach > 0.05 && via.approach < 0.45))
            || (via.phase !== undefined && !(['arm', 'elbow'].every(k => Array.isArray(via.phase?.[k]) && via.phase[k].length === 2
                && via.phase[k][0] >= 0 && via.phase[k][0] < via.phase[k][1] && via.phase[k][1] <= 1)))) return no('invalid backSell data: aroundVia');
    }
    return { ok: true, reason: null, gripArt, contact, data };
}

// Rev 3 D9: the hand's route to the back waist for a rig with `aroundVia`, as a polyline in the reach weight w (the
// clutch's own envelope: 0 at rest, 1 at the waist, eased in time): the posed place to the via point over w in
// [0, viaW], then the via point to the waist over [viaW, 1]. It runs backwards as the hand lets go. The route is longer
// than the straight line, so the clutch reach takes longer to get in (`aroundVia.approach`). `viaW` and `standW` (the
// standing route's via weight) are the numbers tools/debug/route_probe.mjs sweeps, through Skeleton.AROUND.
export const AROUND = { viaW: 0.2, standW: 0.5, rampMs: 800 };   // rampMs: the standing recovery's fade-in on a rig with a via pose (Wrestler.RECOVERY_RAMP_MS is 200 otherwise)
// the standing recovery's via pose as { arm, elbow } offsets, or null when the rig has none
export const recoveryVia = backSell => Number.isFinite(backSell?.aroundVia?.recoveryArm) && backSell.handUnder === true
    ? { arm: backSell.aroundVia.recoveryArm, elbow: backSell.aroundVia.recoveryElbow, ...(backSell.aroundVia.phase ? { phase: backSell.aroundVia.phase } : {}) } : null;
// One near-arm channel of the standing route at recovery hand weight hw: `start` (hw 0) to start + viaOffset (hw standW)
// to `target` (hw 1), linear in hw each way. Runs backwards as the hand lets go. `phase` ([a, b] or null, T2.5): the channel
// moves only over that share of the way to the via pose, eased (smoothstep), so two channels can follow one another.
export function aroundChannel(start, viaOffset, target, hw, standW = AROUND.standW, phase = null) {
    const k = Math.max(0, Math.min(1, hw)), via = start + viaOffset;
    if (k > standW) return via + (target - via) * ((k - standW) / (1 - standW));
    let u = standW > 0 ? k / standW : 1;
    if (phase) { const x = Math.max(0, Math.min(1, (u - phase[0]) / (phase[1] - phase[0]))); u = x * x * (3 - 2 * x); }
    return start + viaOffset * u;
}
const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
export function aroundGoal(start, via, target, w, viaW = AROUND.viaW) {
    const k = Math.max(0, Math.min(1, w));
    return k <= viaW ? lerp(start, via, viaW > 0 ? k / viaW : 1) : lerp(via, target, (k - viaW) / (1 - viaW));
}
