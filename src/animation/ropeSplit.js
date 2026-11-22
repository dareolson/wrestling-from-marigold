// ?ropes=v1 (PLAN_ROPES T1.1): the side strands are cut at each wrestler's ground depth. A piece nearer the camera than a man draws just above him, a piece farther draws just below,
// so a strand wraps round a body instead of sorting against it as one fixed band. Pure: Arena feeds it the men's depths and draws the result.
//   men: [{ t, depth, low }]  t = ground depth along the side wall (0 near corner, 1 far corner); depth / low = the highest / lowest draw depth among his parts (a paired move can lay him
//   at his partner's depth, so Arena reads the parts, not 12 + ground y * 0.03). `low` defaults to `depth`.
//   returns { ts, group, depths }: sorted sample ts (the uniform ones plus every cut), group[j] for the segment ts[j]..ts[j+1], depths[g] for each group.
export const SPLIT_SEGS = 8;
export const SPLIT_STEP = 0.01;     // a strand piece draws this far above / below the man it is nearer / farther than (his own parts span base .. base + 0.0041)
export const SPLIT_MERGE = 0.02;    // two men closer than this in depth (0.67 px of ground y) share one cut: a depth between them would fall inside their parts
export function splitPlan(men, segs = SPLIT_SEGS) {
    const sorted = men.map((m, i) => ({ ...m, i })).sort((a, b) => b.depth - a.depth);   // nearest the camera first
    const cuts = [], cutOf = [];
    for (const m of sorted) {
        const t = Math.min(1, Math.max(0, m.t)), last = cuts.at(-1);
        const low = m.low ?? m.depth;
        if (last && last.low - m.depth < SPLIT_MERGE) { last.low = Math.min(last.low, low); cutOf[m.i] = cuts.length - 1; continue; }   // one cut for both: above the nearer man's parts, below the farther man's
        cuts.push({ t, depth: m.depth, low }); cutOf[m.i] = cuts.length - 1;
    }
    const ts = [];
    for (let i = 0; i <= segs; i++) ts.push(i / segs);
    for (const c of cuts) ts.push(c.t);
    ts.sort((a, b) => a - b);
    const u = ts.filter((t, i) => i === 0 || t - ts[i - 1] > 1e-9);
    const group = [];
    for (let j = 0; j < u.length - 1; j++) group.push(cuts.filter(c => c.t <= u[j] + 1e-9).length);
    const depths = [cuts.length ? cuts[0].depth + SPLIT_STEP : 26];
    for (let k = 1; k < cuts.length; k++) depths.push((cuts[k - 1].low + cuts[k].depth) / 2);
    if (cuts.length) depths.push(cuts.at(-1).low - SPLIT_STEP);
    return { ts: u, group, depths, cuts, cutOf };
}

// ?ropes=v1 (T1.3): a part whose ink reaches past a side wall's plane is outside the ring, so the strand passes between it and the rest of the body: it draws below the pieces
// that sit behind its man. `b` = the plane x either side at his depth ({ left, right }); margin keeps a part that only touches the plane from flickering across it.
export const PAST_MARGIN = 2;
export function pastPlane(minX, maxX, b, margin = PAST_MARGIN) { return minX < b.left - margin || maxX > b.right + margin; }
// The depth such a part takes: under the piece group just behind its man (`plan.depths[cutOf + 1]`), by less than a step so it stays above any man farther back.
export function pastPartDepth(plan, manIndex) { return plan.depths[plan.cutOf[manIndex] + 1] - 0.003; }
