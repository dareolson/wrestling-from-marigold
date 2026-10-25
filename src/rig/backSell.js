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
    return { ok: true, reason: null, gripArt, contact, data };
}
