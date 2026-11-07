// Clasping hands (PLAN_GRAPPLES Stage 2, T2.2, `?grapples=v1`). Pure: which forearm art each gripping arm wears this frame.
// A grip list entry (lockupGrips / waistlockGrips) names its `clasp` (collarTie, elbowCup, waistClasp); one arm never wears two. The art
// swaps while the hand is moving fast, so the change of shape hides in the motion (r6, Derek G2: at weight .5 the hand had mostly arrived):
//   on:  grip weight >= CLASP_GRAB_MIN and (the hand moved >= CLASP_FAST px last frame, or the weight is already >= CLASP_FULL);
//   off: the grip has been at CLASP_FULL and its weight falls below CLASP_RELEASE; it stays off until the grip is gone.
// Measured (tools/debug/clasp_r6_speed.mjs, 48 hands over the plain, shove and rope endings): on the grab no single weight puts every hand's swap
// on its fastest frames (some hands burst at weight .1-.3, others at .8-1), so the hand's own speed picks the frame and the weights are only
// the fallbacks. On the release the hands move in jitter from the first weight drop to about 8 frames later and peak at the frame the weight
// passes .2, so a weight does it (.2: 8 of 48 swaps under 8 px/frame, mean 20; .5 was 16 of 48, mean 12; a speed rule 26 of 48, mean 10).
export const CLASP_RELEASE = 0.2;
export const CLASP_GRAB_MIN = 0.05;
export const CLASP_FULL = 0.95;
export const CLASP_FAST = 8;
// The share of the arm's full length a clasping arm reaches at most, so the elbow is always bent a little (0.999 would lock it straight).
export const CLASP_REACH = 0.94;
// A grip label with no art of its own wears another label's art until Codex draws it (bicepGrip: the elbowCup hand).
export const CLASP_ART = Object.freeze({ bicepGrip: 'elbowCup' });
export const claspArt = (label) => CLASP_ART[label] ?? label;

// list: holdGrips entries ({ arm: 'l'|'r', w, clasp? }). lSide: which physical side carries the lArm channel (Skeleton.lChannelSide).
// has(name, slot): whether this rig has that art for that slot. state (all optional): worn { <slot>: art } on now, speed(slot) the hand's px
// moved last frame, released / full { <slot>: true } the arms whose art already came off this grip / whose grip has been full. Returns
// { want: { <slot>: name }, released, full }
// (slot is nearForearm / farForearm). With no state the art is on from CLASP_GRAB_MIN.
export function claspStep(list, lSide, has = () => true, { worn = {}, speed = () => Infinity, released = {}, full = {} } = {}) {
    const other = (side) => (side === 'near' ? 'far' : 'near');
    const best = {};
    for (const item of list) {
        if (!item.clasp || !(item.w >= CLASP_GRAB_MIN)) continue;
        const slot = `${item.arm === 'l' ? lSide : other(lSide)}Forearm`;
        if (!has(claspArt(item.clasp), slot)) continue;
        if (!best[slot] || item.w > best[slot].w) best[slot] = item;
    }
    const want = {}, off = {}, held = {};
    for (const [slot, item] of Object.entries(best)) {
        const art = claspArt(item.clasp), fast = speed(slot) >= CLASP_FAST;
        if (full[slot] || item.w >= CLASP_FULL) held[slot] = true;
        if (worn[slot] === art) {
            if (held[slot] && item.w < CLASP_RELEASE) off[slot] = true;
            else want[slot] = art;
        } else if (released[slot]) off[slot] = true;
        else if (item.w >= CLASP_FULL || fast) want[slot] = art;
    }
    return { want, released: off, full: held };
}

export const claspSelection = (list, lSide, has) => claspStep(list, lSide, has).want;
