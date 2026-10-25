// The torso's painted silhouette as a distance field, and the clearance test built on it (PLAN_GEORGE_TRANSFER
// Rev 3 D10). A hand behind the body may swap depth only while it is outside the painted art, else it vanishes in
// place. Pure: the browser seam (`silhouetteOf`) reads the texture, everything else takes numbers, so Node tests
// drive it with a stub.

/**
 * Distance field of an alpha image. `distance(x, y)` is the distance in SOURCE px from a point (image pixel
 * coordinates, may lie outside the image by up to `pad`) to the nearest pixel whose alpha >= threshold; 0 inside.
 * Two-pass chamfer (3-4 weights) on a grid padded by `pad` px on every side, so a point off the image edge, like
 * George's aroundVia (u < 0), still has a true distance.
 */
export function buildSilhouette(width, height, alpha, { threshold = 128, pad = 256 } = {}) {
    const W = width + 2 * pad, H = height + 2 * pad, INF = 1e9;
    const d = new Float32Array(W * H).fill(INF);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (alpha[y * width + x] >= threshold) d[(y + pad) * W + x + pad] = 0;
    const A = 1, B = 1.4142;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; let v = d[i];
        if (x > 0) v = Math.min(v, d[i - 1] + A);
        if (y > 0) { v = Math.min(v, d[i - W] + A); if (x > 0) v = Math.min(v, d[i - W - 1] + B); if (x < W - 1) v = Math.min(v, d[i - W + 1] + B); }
        d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x; let v = d[i];
        if (x < W - 1) v = Math.min(v, d[i + 1] + A);
        if (y < H - 1) { v = Math.min(v, d[i + W] + A); if (x < W - 1) v = Math.min(v, d[i + W + 1] + B); if (x > 0) v = Math.min(v, d[i + W - 1] + B); }
        d[i] = v;
    }
    return {
        width, height, pad,
        distance(x, y) {
            const cx = Math.max(-pad, Math.min(width + pad - 1, Math.floor(x))), cy = Math.max(-pad, Math.min(height + pad - 1, Math.floor(y)));
            const v = d[(cy + pad) * W + cx + pad];
            // beyond the padded grid: the clamped value plus the overshoot (an upper bound, never an under-count)
            const over = Math.hypot(x - Math.max(-pad, Math.min(width + pad - 1, x)), y - Math.max(-pad, Math.min(height + pad - 1, y)));
            return v >= 1e8 ? Infinity : v + over;
        },
    };
}

/**
 * A world point in the image's source-pixel coordinates (the inverse of Skeleton.imageAnchorPoint, including the
 * Image's origin, flips and transform), or null when the image has no usable frame/matrix.
 */
export function imagePixelPoint(image, world) {
    const frame = image?.frame;
    if (!frame || !image.getWorldTransformMatrix || !Number.isFinite(world?.x) || !Number.isFinite(world?.y)) return null;
    const m = image.getWorldTransformMatrix();
    const det = m.a * m.d - m.b * m.c;
    if (!(Math.abs(det) > 1e-12)) return null;
    const dx = world.x - m.tx, dy = world.y - m.ty;
    const lx = (m.d * dx - m.c * dy) / det, ly = (-m.b * dx + m.a * dy) / det;
    const px = lx + image.displayOriginX, py = ly + image.displayOriginY;      // local display px from the frame's top-left
    return { x: image.flipX ? frame.realWidth - px : px, y: image.flipY ? frame.realHeight - py : py,
        gamePerPixel: Math.hypot(m.a, m.b) };
}

/**
 * Distance in GAME px from a world point to the torso's painted art; 0 when the point is on it, Infinity when the
 * image/silhouette is unusable (an unusable measurement is never "clear").
 */
export function silhouetteDistance(image, world, silhouette) {
    const p = imagePixelPoint(image, world);
    if (!p || !silhouette) return Infinity;
    return silhouette.distance(p.x, p.y) * p.gamePerPixel;
}

/**
 * The clearance test: every sample outside the art by at least `marginPx` game px.
 * { clear, min, distances }  `min` is the smallest distance (the number to report); a sample that is null (not
 * measurable this frame) makes the hand not clear.
 */
export function handClearance(image, samples, silhouette, marginPx = 1) {
    const distances = {};
    let min = Infinity;
    for (const [name, point] of Object.entries(samples)) {
        const dist = point ? silhouetteDistance(image, point, silhouette) : -Infinity;
        distances[name] = dist; if (dist < min) min = dist;
    }
    return { clear: Object.keys(samples).length > 0 && min >= marginPx, min, distances };
}

// ── browser seam (not used by the Node tests) ──────────────────────────────────────────────────────────────
const cache = new Map();

/** The silhouette of an Image's current texture (art with alpha >= `threshold`, 128 by default), built once per texture key and
 *  threshold; null if the pixels can't be read. */
export function silhouetteOf(image, threshold = 128) {
    const tex = image?.texture?.key;
    if (!tex) return null;
    const key = threshold === 128 ? tex : `${tex}@${threshold}`;
    if (cache.has(key)) return cache.get(key);
    let built = null;
    try {
        const src = image.texture.getSourceImage(), c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
        const rgba = g.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
        for (let i = 0; i < a.length; i++) a[i] = rgba[i * 4 + 3];
        built = buildSilhouette(c.width, c.height, a, { threshold });
    } catch { built = null; }
    cache.set(key, built);
    return built;
}

/**
 * Where the hand ends on a forearm image that has the hand baked in: the centroid of the opaque pixels in the
 * lowest rows, as { u, v } on the image (the form imageAnchorPoint takes). Null if the pixels can't be read.
 */
export function handTipOf(image, rows = 4) {
    const key = image?.texture?.key;
    if (!key) return null;
    const k = `tip:${key}`;
    if (cache.has(k)) return cache.get(k);
    let tip = null;
    try {
        const src = image.texture.getSourceImage(), c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let last = -1;
        for (let y = c.height - 1; y >= 0 && last < 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { last = y; break; }
        if (last >= 0) {
            let sx = 0, n = 0;
            for (let y = Math.max(0, last - rows + 1); y <= last; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { sx += x + .5; n++; }
            tip = { u: sx / n / c.width, v: (last + 1) / c.height };
        }
    } catch { tip = null; }
    cache.set(k, tip);
    return tip;
}
