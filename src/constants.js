export const W = 960;
export const H = 600;

export const RING = {
    nearLeft:  { x: 40,  y: 445 },
    nearRight: { x: 920, y: 445 },
    farLeft:   { x: 210, y: 258 },
    farRight:  { x: 750, y: 258 },
    ropes: [
        { nearY: 380, farY: 218 },
        { nearY: 316, farY: 181 },
        { nearY: 251, farY: 142 },
    ],
    apronY: 490,
};

export function ringBoundsAtY(y) {
    const { nearLeft, nearRight, farLeft, farRight } = RING;
    const t = (nearLeft.y - y) / (nearLeft.y - farLeft.y);
    return {
        left:  nearLeft.x  + (farLeft.x  - nearLeft.x)  * t,
        right: nearRight.x + (farRight.x - nearRight.x) * t,
    };
}

// scale (PLAN_SCALE): one perspective, no size pops. Promoted to default by Derek 2026-11-19: on unless the URL says `?scale=off` (any value but `v1` turns it off; same rule as defaultOnFlag in
// Wrestler.js). Node without `location` stays off, and `?scale=off` is byte-identical to the old game (same y, same draw scale, every frame).
export const scaleCandidate = () => {
    if (typeof location === 'undefined') return false;
    const v = new URLSearchParams(location.search).get('scale');
    return v === null || v === 'v1';
};
// ?scaleDebug=1 (T3.4): render-only size overlay (src/scaleDebug.js); off by default, changes nothing in play.
export const scaleDebugCandidate = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('scaleDebug') === '1';

// The ring's side edges meet at the horizon: the intersection of nearLeft->farLeft and nearRight->farRight (y ≈ -39), derived from RING so a moved corner can't leave it stale.
export function ringHorizonY(ring = RING) {
    const dl = ring.farLeft.x - ring.nearLeft.x, dr = ring.farRight.x - ring.nearRight.x, dy = ring.farLeft.y - ring.nearLeft.y;
    const t = (ring.nearRight.x - ring.nearLeft.x) / (dl - dr);   // left edge x = right edge x
    return ring.nearLeft.y + dy * t;
}
export const HORIZON_Y = ringHorizonY();

export function perspectiveScale(y) {
    if (scaleCandidate()) {   // ?scale=v1 (T2.1): the wrestlers' perspective is the ring's: size ∝ distance below the horizon, same clamp to the ring rows
        const yc = Math.max(RING.farLeft.y, Math.min(RING.nearLeft.y, y));
        return (yc - HORIZON_Y) / (RING.nearLeft.y - HORIZON_Y);
    }
    const t = Math.max(0, Math.min(1, (y - RING.farLeft.y) / (RING.nearLeft.y - RING.farLeft.y)));
    return 0.58 + t * 0.42;
}
