// Read final rendered images, after mirroring and body tilt. The gap metric
// complements anchor alignment; an overlapping corner alone is not certification.
const pixels = new Map();
function opaque(img, x, y) {
    let p = pixels.get(img.texture.key);
    if (!p) {
        const source = img.texture.getSourceImage();
        const c = document.createElement('canvas'); c.width = source.width; c.height = source.height;
        const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(source, 0, 0);
        p = { width: c.width, data: ctx.getImageData(0, 0, c.width, c.height).data }; pixels.set(img.texture.key, p);
    }
    const dx = x - img.x, dy = y - img.y, c = Math.cos(img.rotation), s = Math.sin(img.rotation);
    let u = (dx * c + dy * s) / img.displayWidth + img.originX;
    let v = (-dx * s + dy * c) / img.displayHeight + img.originY;
    if (img.flipX) u = 1 - u; if (img.flipY) v = 1 - v;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    const f = img.frame, px = f.cutX + Math.floor(u * f.cutWidth), py = f.cutY + Math.floor(v * f.cutHeight);
    return p.data[(py * p.width + px) * 4 + 3] >= 32;
}
function world(img, a) {
    const u = img.flipX ? 1 - a.u : a.u, v = img.flipY ? 1 - a.v : a.v;
    const x = (u - img.originX) * img.displayWidth, y = (v - img.originY) * img.displayHeight;
    const c = Math.cos(img.rotation), s = Math.sin(img.rotation);
    return { x: img.x + x * c - y * s, y: img.y + x * s + y * c };
}
export function measureJoints(sk) {
    const result = {};
    for (const side of ['near', 'far']) for (const kind of ['Elbow', 'Knee']) {
        const name = side + kind, joint = sk.jointAttachmentPoints[name];
        const parent = sk[side + (kind === 'Elbow' ? 'UpArm' : 'Thigh')];
        const child = sk[side + (kind === 'Elbow' ? 'Forearm' : 'Shin')];
        const p = child._jointPivotFrac ?? 0;
        const proximal = child._binding?.proximal ?? { u: 0.5 + (child._pivotOffsetFrac ?? 0) * (1 - p), v: p };
        const childPoint = world(child, proximal);
        const parentPoint = parent._binding?.distal ? world(parent, parent._binding.distal)
            : parent._distalAnchorFrac ? world(parent, parent._distalAnchorFrac) : null;
        const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        const a = [], b = []; let overlap = 0, uncoveredCorePixels = 0;
        for (let y = Math.floor(joint.y - 10); y <= joint.y + 10; y++) for (let x = Math.floor(joint.x - 10); x <= joint.x + 10; x++) {
            if ((x - joint.x) ** 2 + (y - joint.y) ** 2 > 100) continue;
            const pa = opaque(parent, x + 0.5, y + 0.5), pb = opaque(child, x + 0.5, y + 0.5);
            if (!pa && !pb && (x + 0.5 - joint.x) ** 2 + (y + 0.5 - joint.y) ** 2 <= 4) uncoveredCorePixels++;
            if (pa) a.push([x,y]); if (pb) b.push([x,y]); if (pa && pb) overlap++;
        }
        let gap = overlap ? 0 : Infinity;
        if (!overlap) for (const [ax, ay] of a) for (const [bx, by] of b) gap = Math.min(gap, Math.hypot(ax-bx, ay-by));
        result[name] = { childError: distance(childPoint, joint),
            parentError: parentPoint ? distance(parentPoint, joint) : null,
            inkGap: Number.isFinite(gap) ? gap : 999, overlap, uncoveredCorePixels };
    }
    return result;
}
