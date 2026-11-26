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
// ropes (PLAN_ROPES): promoted to default by Derek 2026-11-23: on unless the URL says `?ropes=off` (any value but `v1` turns it off, as scale). Node without `location` stays off,
// and `?ropes=off` is the old ropes, byte for byte.
export const ropesCandidate = () => {
    if (typeof location === 'undefined') return false;
    const v = new URLSearchParams(location.search).get('ropes');
    return v === null || v === 'v1';
};
// ropesPast (T1.3): with ropes=v1, a part whose ink reaches past a side plane draws under the strand. Its own opt-in so Derek can judge it against ropes=v1 alone: it trades side-wall order for ink past the plane.
export const ropesPastCandidate = () => ropesCandidate() && new URLSearchParams(location.search).get('ropesPast') === '1';
// ropeSpill (PLAN_ROPES stage RS): `?ropeSpill=v1` (with ropes on), opt-in until Derek judges it: a knockdown beside a side wall can end with his head and shoulders under the bottom strand.
export const ropeSpillCandidate = () => ropesCandidate() && new URLSearchParams(location.search).get('ropeSpill') === 'v1';
// corners (PLAN_ROPES stage RC): `?corners=v1`, opt-in, drawing only: the posts move out of the rope corners, a turnbuckle and a connector tie each level to its post (src/ringCorners.js).
export const cornersCandidate = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('corners') === 'v1';
// `?cornerGap=<px at the near posts>` (TC.3, with ?corners=v1): how far the posts move out; the far posts scale with the far/near ring width. Default 30 (Derek, TC.3).
export const cornerGapPx = () => { if (typeof location === 'undefined') return 30; const v = Number(new URLSearchParams(location.search).get('cornerGap')); return Number.isFinite(v) && new URLSearchParams(location.search).has('cornerGap') ? Math.max(0, v) : 30; };
// `?ropeSag=<scale>` (Derek 2026-11-25, "a touch of natural sag"): multiplies every strand's resting droop (Arena REST_SAG 6 / 4.5 / 3 px near, bottom to top). Default 3 (Derek picked 3 from research/ropes-2026-11/sag/); `?ropeSag=1` = the old droop.
export const ropeSagScale = () => { if (typeof location === 'undefined') return 3; const q = new URLSearchParams(location.search), v = Number(q.get('ropeSag')); return q.has('ropeSag') && Number.isFinite(v) ? Math.max(0, v) : 3; };
// ropeContact (PLAN_ROPES T2.1/T2.2): with ropes on, parts bend the strands and each bend is a spring. Promoted by Derek 2026-11-23 ("good enough for now"): on with ropes unless
// `?ropeContact=off` (any value but `v1` is off), which is the R1 root-only press.
export const ropeContactCandidate = () => { if (!ropesCandidate()) return false; const v = new URLSearchParams(location.search).get('ropeContact'); return v === null || v === 'v1'; };
/** `?ropeSway=<scale>` (PLAN_ROPES T1.6, with ?ropes=v1): how big the bottom strand's swing is; 2 default (Derek 2026-11-23), 0 off. */
export const ropeSwayScale = () => { if (typeof location === 'undefined') return 2; const v = Number(new URLSearchParams(location.search).get('ropeSway')); return Number.isFinite(v) && new URLSearchParams(location.search).has('ropeSway') ? Math.max(0, v) : 2; };
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
