// `?corners=v1` (PLAN_ROPES stage RC): drawing only. On a real ring the posts do not hold the rope ends: each level's two strands meet at a turnbuckle just inside the corner and a short connector runs
// out to the post. The strands, the `RING` corners and everything measured against them stay where they are; the corner point becomes the turnbuckle and the POST moves out along the corner's outward
// diagonal (the bisector of its two walls on screen, away from the ring). Pure: Arena.drawPosts draws what this returns.
export const CORNER_GAP = Object.freeze({ near: 8, far: 5 });   // px the post moves out (the ring's scale: ~1 px per 1.3"); reported on the TC.2 page

const unit = (dx, dy) => { const d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; };

/**
 * Per corner (`nl`, `nr`, `fl`, `fr`): { corner (the RING point), out (unit outward diagonal), gap, foot (the post's footprint: the corner moved out), levels: [{ turnbuckle, onPost, connector }] }.
 * `turnbuckle` is the strand end: the corner x at that level's rope row there (near: `nearY`, far: `farY`), exactly where the strands are drawn from. `onPost` is the same height on the moved post
 * (the post is the old one translated, so a level's row moves by the footprint's dy); `connector` is the length from one to the other.
 */
export function cornerGeom(ring, gap = CORNER_GAP) {
    const { nearLeft, nearRight, farLeft, farRight, ropes } = ring;
    // each corner's two wall directions pointing away from it, along the mat's edges
    const spec = {
        nl: { c: nearLeft, a: nearRight, b: farLeft, g: gap.near, row: 'nearY' },
        nr: { c: nearRight, a: nearLeft, b: farRight, g: gap.near, row: 'nearY' },
        fl: { c: farLeft, a: farRight, b: nearLeft, g: gap.far, row: 'farY' },
        fr: { c: farRight, a: farLeft, b: nearRight, g: gap.far, row: 'farY' },
    };
    const out = {};
    for (const [k, { c, a, b, g, row }] of Object.entries(spec)) {
        const u = unit(a.x - c.x, a.y - c.y), v = unit(b.x - c.x, b.y - c.y), o = unit(-(u.x + v.x), -(u.y + v.y));
        const foot = { x: c.x + o.x * g, y: c.y + o.y * g };
        out[k] = {
            corner: { x: c.x, y: c.y }, out: o, gap: g, foot,
            levels: ropes.map(r => {
                const turnbuckle = { x: c.x, y: r[row] }, onPost = { x: foot.x, y: r[row] + (foot.y - c.y) };
                return { turnbuckle, onPost, connector: Math.hypot(onPost.x - turnbuckle.x, onPost.y - turnbuckle.y) };
            }),
        };
    }
    return out;
}
