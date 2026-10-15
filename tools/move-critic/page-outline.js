// Browser-side: a placed Phaser image's PAINTED outline in world space (opaque
// boundary of its texture frame, cached per frame). Shared by sample.mjs and
// refine.mjs, which import it from the dev server.
const cache = new Map();

export function boundary(img) {
    const key = `${img.texture.key}:${img.frame.name}`;
    if (cache.has(key)) return cache.get(key);
    const f = img.frame, src = img.texture.getSourceImage();
    const cw = f.cutWidth, ch = f.cutHeight;
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, f.cutX, f.cutY, cw, ch, 0, 0, cw, ch);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < cw && y < ch && data[(y * cw + x) * 4 + 3] > 128;
    const step = Math.max(1, Math.round(Math.max(cw, ch) / 48));
    const points = [];
    for (let y = 0; y < ch; y += step) for (let x = 0; x < cw; x += step) {
        if (!solid(x, y)) continue;
        if (!solid(x - step, y) || !solid(x + step, y) || !solid(x, y - step) || !solid(x, y + step)) points.push([x / cw, y / ch]);
    }
    cache.set(key, points);
    return points;
}

export function place(img, [u, v]) {
    let lx = (u - img.originX) * img.displayWidth;
    const ly = (v - img.originY) * img.displayHeight;
    if (img.flipX) lx = -lx;
    const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
    return [img.x + lx * c - ly * s, img.y + lx * s + ly * c];
}

export const outline = img => boundary(img).map(p => place(img, p));
