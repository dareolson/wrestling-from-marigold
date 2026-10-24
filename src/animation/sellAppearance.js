import { baseEntryForSlot, textureKey } from '../rig/partVariants.js';
import { clutchSell, groundedSlot } from './sells.js';
import { backRiseWeight } from './backRisePerformance.js';

// ?sellart=v1 comparison only. These are authored contact choices, never
// angle-triggered substitutions. Keep each body part independent: a palm
// pressed to the back may ultimately need different paint from a head clutch.
export const GROUNDED_SELL_ART = Object.freeze({ back: 'grip', head: 'grip' });

// Match the existing clutch's reach/hold/release keys. Change the hand while
// it approaches the body and retain it until the release has finished, rather
// than switching at contact or when a measured elbow crosses a threshold.
export function clutchArtPhase(u) {
    if (!Number.isFinite(u) || u <= 0 || u >= 1) return 'rest';
    if (u < 0.25) return 'approach';
    if (u <= 0.70) return 'contact';
    return 'release';
}

/** One complete, rig-supported selection for the currently authored clutch. */
export function groundedSellParts(sell, skeleton, textureExists = null) {
    const cur = sell?.plan?.[sell.i];
    const donor = GROUNDED_SELL_ART[cur?.part];
    if (cur?.name !== 'clutch' || !donor || !(cur.duration > 0)
        || clutchArtPhase(sell.t / cur.duration) === 'rest') return {};

    const textures = skeleton?._textureConfig;
    if (!textures) return {};
    const side = groundedSlot(cur.limb, sell.facing0, cur.lying, skeleton, cur.rolls) ?? 'near';
    const { hands } = clutchSell(cur.lying, cur.part, cur.duration, side);
    return supportedHands(Object.keys(hands), donor, skeleton, textureExists);
}

// Get-up uses the same authored near-hand back protection as the back clutch.
// It makes no claim that the other hand is an open, weight-bearing palm.
export function backRiseParts(t, skeleton, textureExists = null) {
    return backRiseWeight(t) > 0
        ? supportedHands(['near'], GROUNDED_SELL_ART.back, skeleton, textureExists) : {};
}

function supportedHands(hands, donor, skeleton, textureExists) {
    const textures = skeleton?._textureConfig;
    if (!textures) return {};
    const family = textures.handInForearm ? 'forearm' : 'hand';
    const slotSuffix = textures.handInForearm ? 'Forearm' : 'Hand';
    const parts = {};
    for (const hand of hands) {
        const slot = `${hand}${slotSuffix}`;
        const variant = textures.variants?.[slot]?.[donor] ?? textures.variants?.[family]?.[donor];
        const key = textureKey(variant);
        if (!baseEntryForSlot(textures, slot) || !key) continue;
        if (skeleton._partImages && !skeleton._partImages[slot]) continue;
        if (textureExists && !textureExists(key)) continue;
        parts[slot] = donor;
    }
    return parts;
}
