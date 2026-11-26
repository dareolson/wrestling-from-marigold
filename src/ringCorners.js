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
 * TC.5 (Derek's references): one corner rig from the strand end `a` (where the level's two strands meet) to the post `b` on `gfx` (a Phaser Graphics). A black padded cover wraps the meeting
 * (a rounded teardrop, about 4 rope-thicknesses tall and longer than tall, tip toward the post, a soft highlight and a seam line, no bright edge), then a short dark strap, a small metal ring (the only
 * light part), a short black barrel with a faint highlight, a thin hook, and an eye on the post. `sc` = 1 near and far (the far connector is short and sits on the crowd, so it keeps the near rig's size), `rim` lighter at the far corners. Parts sit at fractions
 * of the connector's length `L` so any `?cornerGap=` works.
 */
export function drawTurnbuckle(gfx, a, b, sc = 1, rim = 0x5a5a54) {
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, u = { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
    let n = { x: -u.y, y: u.x }; if (n.y > 0) n = { x: -n.x, y: -n.y };   // n points up the screen: the pad's light side
    const at = (d, off = 0) => ({ x: a.x + u.x * d + n.x * off, y: a.y + u.y * d + n.y * off });
    const line = (p, q, w, col) => { gfx.lineStyle(w, col, 1); gfx.lineBetween(p.x, p.y, q.x, q.y); };
    const BLACK = 0x1f1f1c, RIM = rim, SOFT = 0x8c8c82, SEAM = 0x080807;   // near-black parts with a soft grey rim and highlight so they read on the dark crowd
    const H = 12 * sc, pad = Math.max(0.5 * L, 1.6 * H), tip = 0.15 * L, back = tip - pad;   // distances along u from `a`: the pad runs back..tip
    // the pad: a round back and a pointed tip, as a polygon of its half-widths
    const prof = (t) => t < 0.3 ? Math.sqrt(Math.max(0, 1 - ((0.3 - t) / 0.3) ** 2)) : Math.pow(Math.max(0, 1 - (t - 0.3) / 0.7), 0.85);
    const N = 18, top = [], bot = [];
    for (let k = 0; k <= N; k++) { const t = k / N, d = back + pad * t, w = H / 2 * prof(t); top.push(at(d, w)); bot.push(at(d, -w)); }
    const outline = [...top, ...bot.reverse()];
    gfx.fillStyle(BLACK, 1);
    gfx.fillPoints(outline, true);
    gfx.lineStyle(Math.max(1, 1.1 * sc), RIM, 1); gfx.strokePoints(outline, true, true);   // the soft rim
    line(at(back + pad * 0.2, H * 0.22), at(tip - pad * 0.1, H * 0.1), Math.max(1, 1.2 * sc), SOFT);          // the soft highlight along the top
    line(at(back + pad * 0.25, -H * 0.12), at(tip - pad * 0.15, -H * 0.04), Math.max(0.8, 0.9 * sc), SEAM);   // the seam
    // strap, ring, barrel, hook, eye
    const s0 = tip - pad * 0.05, s1 = 0.42 * L, r = 0.47 * L, b0 = 0.52 * L, b1 = 0.80 * L;
    line(at(s0), at(s1), 3.6 * sc + 1.6, RIM); line(at(s0), at(s1), 3.6 * sc, BLACK);
    line(at(s0 + (s1 - s0) * 0.5, 0.6 * sc), at(s1, 0.6 * sc), Math.max(0.7, 0.8 * sc), SEAM);
    gfx.lineStyle(Math.max(1, 1.3 * sc), 0xbcbcb0, 1); gfx.strokeCircle(at(r).x, at(r).y, 1.9 * sc);   // the small metal ring: the only light part
    line(at(b0), at(b1), 5.6 * sc + 1.6, RIM); line(at(b0), at(b1), 5.6 * sc, BLACK);
    line(at(b0 + 1, -1.4 * sc), at(b1 - 1, -1.4 * sc), Math.max(0.8, 0.9 * sc), SOFT);
    line(at(b1), at(L - 2.2 * sc), Math.max(1.4, 1.5 * sc), RIM);
    gfx.lineStyle(Math.max(1.4, 1.5 * sc), RIM, 1); gfx.strokeCircle(b.x, b.y, 2 * sc);                // the eye on the post
}
