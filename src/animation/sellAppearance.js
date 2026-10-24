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

// The near hand holding the back (lying hold, rise, standing recovery) chooses its art
// from the MEASURED contact distance, never from a timer or a phase name (D4). A latch:
// a change needs the wanted state to persist GRIP_DWELL_MS and at least GRIP_REFRACTORY_MS
// since the last change, so a distance hovering at the threshold cannot flicker the art.
// State is { on, pendingSince, switchedAt }; this returns the next state and mutates nothing.
export const GRIP_CONTACT_PX = 15;
export const GRIP_DWELL_MS = 100;
export const GRIP_REFRACTORY_MS = 250;
export const newGripLatch = (on = false, now = 0) => ({ on, pendingSince: null, switchedAt: on ? now : -Infinity });
export function stepGripLatch(state, distancePx, nowMs) {
    if (!Number.isFinite(distancePx)) return state;
    const want = distancePx <= GRIP_CONTACT_PX;
    if (want === state.on) return state.pendingSince === null ? state : { ...state, pendingSince: null };
    const pendingSince = state.pendingSince ?? nowMs;
    if (nowMs - pendingSince >= GRIP_DWELL_MS && nowMs - state.switchedAt >= GRIP_REFRACTORY_MS)
        return { on: want, pendingSince: null, switchedAt: nowMs };
    return pendingSince === state.pendingSince ? state : { ...state, pendingSince };
}

/** The near-hand grip selection, for callers that already decided the latch is on. */
export const nearGripParts = (skeleton, textureExists = null) => supportedHands(['near'], GROUNDED_SELL_ART.back, skeleton, textureExists);

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
