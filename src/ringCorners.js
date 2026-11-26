// `?corners=v1` (PLAN_ROPES stage RC): drawing only. On a real ring the posts do not hold the rope ends: each level's two strands meet at a turnbuckle just inside the corner and a short connector runs
// out to the post. The strands, the `RING` corners and everything measured against them stay where they are; the corner point becomes the turnbuckle and the POST moves out along the corner's outward
// diagonal (the bisector of its two walls on screen, away from the ring). Pure: Arena.drawPosts draws what this returns.
export const CORNER_GAP = Object.freeze({ near: 30, far: 30 * 540 / 880 });   // TC.4 default (Derek picked 30 at TC.3, ~8"); `?cornerGap=<px at the near posts>` overrides; near 880 px ~ 20 ft, so 1 px ~ 3".
/** The gaps for `near` px at the near posts: the far posts scale with the far/near ring width (540/880). */
export const cornerGaps = (near, ring = { nearLeft: { x: 40 }, nearRight: { x: 920 }, farLeft: { x: 210 }, farRight: { x: 750 } }) => ({ near, far: near * (ring.farRight.x - ring.farLeft.x) / (ring.nearRight.x - ring.nearLeft.x) });

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

/**
 * TC.4: one real turnbuckle from the strand end `a` to the post `b` on `gfx` (a Phaser Graphics): a rope eye at the strand end, a thread rod, a metal barrel (thicker than the rope, about half the connector,
 * lit along its top), a rod and an eye bolt into the post. `sc` = 1 near, 540/880 far. Every part is drawn twice, a dark outline under the lighter fill, so it reads against the crowd as well as the mat.
 */
export function drawTurnbuckle(gfx, a, b, sc = 1) {
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, u = { x: (b.x - a.x) / L, y: (b.y - a.y) / L }, n = { x: -u.y, y: u.x };
    const at = (t, off = 0) => ({ x: a.x + u.x * L * t + n.x * off, y: a.y + u.y * L * t + n.y * off });
    const th = 5 * sc, re = 2.6 * sc, rb = 2.2 * sc, b0 = 0.22, b1 = 0.72;
    const line = (p, q, w, col) => { gfx.lineStyle(w, col, 1); gfx.lineBetween(p.x, p.y, q.x, q.y); };
    const ring = (p, r, w, col) => { gfx.lineStyle(w, col, 1); gfx.strokeCircle(p.x, p.y, r); };
    // outline pass
    const O = 0x0a0a08;   // Derek 2026-11-25: black hardware, a faint sheen so it still reads apart from the ropes (0x36 fill, 0x82 highlight)
    line(a, b, 2.4 * sc + 1.6, O); line(at(b0), at(b1), th + 2, O);
    ring(at(re / L), re, 1.6 * sc + 1.6, O); ring(b, rb, 1.6 * sc + 1.6, O);
    // fill pass: rods, then the barrel with its lit top edge and shaded bottom edge, then the eye and the eye bolt
    line(a, b, 2.4 * sc, 0x2a2a26);
    line(at(b0), at(b1), th, 0x1c1c1a);
    line(at(b0, th * 0.28), at(b1, th * 0.28), th * 0.3, 0x111110);
    line(at(b0, -th * 0.28), at(b1, -th * 0.28), th * 0.34, 0x4c4c46);
    line(at(b0), at(b0 + 0.02), th, 0x2e2e2a); line(at(b1 - 0.02), at(b1), th, 0x2e2e2a);   // the barrel's end collars
    ring(at(re / L), re, 1.6 * sc, 0x3a3a34); ring(b, rb, 1.6 * sc, 0x34342e);
}
