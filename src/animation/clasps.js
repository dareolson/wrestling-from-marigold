// Clasping hands (PLAN_GRAPPLES Stage 2, T2.2, `?grapples=v1`). Pure: which forearm art each gripping arm wears this frame.
// A grip list entry (lockupGrips / waistlockGrips) names its `clasp` (collarTie, elbowCup, waistClasp). The art goes on when that grip's
// weight reaches CLASP_ON (the hand closing) and comes off when it falls below it on the release; one arm never wears two.
export const CLASP_ON = 0.5;
// The share of the arm's full length a clasping arm reaches at most, so the elbow is always bent a little (0.999 would lock it straight).
export const CLASP_REACH = 0.94;
// A grip label with no art of its own wears another label's art until Codex draws it (bicepGrip: the elbowCup hand).
export const CLASP_ART = Object.freeze({ bicepGrip: 'elbowCup' });
export const claspArt = (label) => CLASP_ART[label] ?? label;

// list: holdGrips entries ({ arm: 'l'|'r', w, clasp? }). lSide: which physical side carries the lArm channel (Skeleton.lChannelSide).
// has(name, slot): whether this rig has that art for that slot. Returns { <slot>: name } (slot is nearForearm / farForearm).
export function claspSelection(list, lSide, has = () => true) {
    const other = (side) => (side === 'near' ? 'far' : 'near');
    const best = {};
    for (const item of list) {
        if (!item.clasp || !(item.w >= CLASP_ON)) continue;
        const slot = `${item.arm === 'l' ? lSide : other(lSide)}Forearm`;
        if (!has(claspArt(item.clasp), slot)) continue;
        if (!best[slot] || item.w > best[slot].w) best[slot] = item;
    }
    return Object.fromEntries(Object.entries(best).map(([slot, item]) => [slot, claspArt(item.clasp)]));
}
