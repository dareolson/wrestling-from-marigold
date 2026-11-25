// ?ropes=v1 (PLAN_ROPES T1.3): where a part's painted ink reaches along x in world space. The opaque bounding box of each frame image is found once (alpha >= 128, as the rope probe does)
// and carried through the part's world matrix, so a rotated part is covered by the box of its corners (never smaller than its ink).
const boxes = new Map();
function inkBox(frame) {
    const key = (frame.texture?.key ?? '') + '|' + frame.name;
    let b = boxes.get(key);
    if (b !== undefined) return b;
    const w = frame.cutWidth, h = frame.cutHeight, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(frame.source.image, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
    const d = cx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] >= 128) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    b = x1 < 0 ? null : { x0, y0, x1, y1 };
    boxes.set(key, b);
    return b;
}
/** World extent of a visible skeleton part's ink: { minX, maxX, minY, maxY }, or null for a part with no painted pixel. */
export function partInkX(im) {
    const f = im.frame;
    if (!f?.source?.image) return null;
    const b = inkBox(f);
    if (!b) return null;
    const m = im.getWorldTransformMatrix(), ox = im.displayOriginX, oy = im.displayOriginY, ox0 = f.x ?? 0, oy0 = f.y ?? 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const i of [b.x0, b.x1 + 1]) for (const j of [b.y0, b.y1 + 1]) {
        const px = (im.flipX ? f.realWidth - (i + ox0) : i + ox0) - ox, py = (im.flipY ? f.realHeight - (j + oy0) : j + oy0) - oy;
        const X = m.a * px + m.c * py + m.tx, Y = m.b * px + m.d * py + m.ty;
        if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
    }
    return { minX, maxX, minY, maxY };
}

// ?ropeSpill=v1 (PLAN_ROPES TS.6b): the part's INK PIXELS (alpha >= 128, through the world matrix) against the bottom strand at his depth. `S` is ropeSpill.strandAtDepth's { xs, ys, rows }.
// Returns the furthest any ink pixel on the strand's rows (|y - ys| <= rows) lies past the strand's drawn x, in px along `dir` (+ = past it, away from the ring), or -Infinity when no ink is on those rows.
const alphas = new Map();
function alphaOf(frame) {
    const key = (frame.texture?.key ?? '') + '|' + frame.name;
    let a = alphas.get(key);
    if (a) return a;
    const w = frame.cutWidth, h = frame.cutHeight, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(frame.source.image, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
    a = { w, h, d: cx.getImageData(0, 0, w, h).data };
    alphas.set(key, a);
    return a;
}
export function inkPast(im, dir, S, step = 2) {
    const f = im?.visible ? im.frame : null;
    if (!f?.source?.image || !S) return -Infinity;
    const A = alphaOf(f), m = im.getWorldTransformMatrix(), ox = im.displayOriginX, oy = im.displayOriginY, ox0 = f.x ?? 0, oy0 = f.y ?? 0;
    let best = -Infinity;
    for (let j = 0; j < A.h; j += step) for (let i = 0; i < A.w; i += step) {
        if (A.d[(j * A.w + i) * 4 + 3] < 128) continue;
        const px = (im.flipX ? f.realWidth - (i + ox0) : i + ox0) - ox, py = (im.flipY ? f.realHeight - (j + oy0) : j + oy0) - oy;
        const y = m.b * px + m.d * py + m.ty;
        if (Math.abs(y - S.ys) > S.rows) continue;
        const o = dir * ((m.a * px + m.c * py + m.tx) - S.xs);
        if (o > best) best = o;
    }
    return best;
}
