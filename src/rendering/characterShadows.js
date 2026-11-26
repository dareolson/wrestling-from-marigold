import { W, H, RING } from '../constants.js';

// CPU silhouette shadows. PROMOTED to default by Derek 2026-11-25 (accepted after watching live): `?shadows=off` (any value but v1) = the old ovals.
// No Arena/rope ownership or extra character art.
export const characterShadowsEnabled = () => {
    if (typeof location === 'undefined') return false;
    const v = new URLSearchParams(location.search).get('shadows');
    return v === null || v === 'v1';
};
// The accepted look is the reference angle (default); `?shadowAngle=original` = the first prototype's direction.
export const shadowAngleParam = () => (typeof location !== 'undefined' && new URLSearchParams(location.search).get('shadowAngle') === 'original' ? 'original' : 'reference');

// Use the rendered painted support, not the ideal IK target: those differ on
// George's bound leg art. Never ground an airborne or authored move this way.
export function shadowGround(w) {
    const root = w._groundAttack?.root?.y ?? (w._onRopes?.() ? w._corner.matY : w.y);
    if (w.state !== 'standing' || w._activeMove || w._strut) return root;
    const sk = w.skeleton, supports = [];
    for (const side of ['near', 'far']) {
        if (sk?.[side + 'Foot']?.planted !== true) continue;
        const shin = sk[side + 'Shin'], sole = shin?._soleAnchorFrac;
        const point = sole && sk.constructor.imageAnchorPoint
            ? sk.constructor.imageAnchorPoint(shin, sole)
            : sk?.semanticAnchors?.[side + 'Boot.sole'];
        if (Number.isFinite(point?.y)) supports.push(point.y);
    }
    return supports.length ? supports.reduce((a, b) => a + b, 0) / supports.length : root;
}

// One mat projection for every pose. A state switch must never turn the cast
// into an identity copy of the body, or collapse its determinant through zero.
// This is a 2.5D approximation: screen height above the mat supplies elevation.
export function shadowProjection(w, angle = 'original') {
    const ground = shadowGround(w);
    const reference = angle === 'reference';
    const shear = reference ? -0.38 : 0.38;
    const flatten = reference ? 0.30 : -0.30;
    return { a: 1, b: 0, c: -shear, d: flatten, e: shear * ground, f: (1 - flatten) * ground };
}

// Cast the current painted geometry, including crops, flips and bound joints.
function drawShadowPart(ctx, part, m = null) {
    const frame = part.frame, source = frame.source?.image;
    if (!source || !frame.cutWidth || !frame.cutHeight) return;
    ctx.save();
    if (m) ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    const t = part.getWorldTransformMatrix();
    ctx.transform(t.a, t.b, t.c, t.d, t.tx, t.ty);
    // Mirror around the display origin, as Phaser's Image renderer does.
    ctx.translate(part.flipX ? part.width - 2 * part.displayOriginX : 0,
        part.flipY ? part.height - 2 * part.displayOriginY : 0);
    ctx.scale(part.flipX ? -1 : 1, part.flipY ? -1 : 1);
    let sx = frame.cutX, sy = frame.cutY, sw = frame.cutWidth, sh = frame.cutHeight;
    let dx = -part.displayOriginX + (frame.x || 0), dy = -part.displayOriginY + (frame.y || 0);
    if (part.isCropped && part._crop) {
        const crop = part._crop;
        sx = crop.cx; sy = crop.cy; sw = crop.cw; sh = crop.ch;
        dx = -part.displayOriginX + crop.x; dy = -part.displayOriginY + crop.y;
    }
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, sw, sh);
    ctx.restore();
}

const layers = new WeakMap();
let serial = 0;

export function syncCharacterShadow(w) {
    if (!characterShadowsEnabled() || !w.skeleton?._headIsImage) return false;
    const scene = w.skeleton._scene;
    if (!scene?.textures?.createCanvas || !scene.events) return false;
    let layer = layers.get(scene);
    if (!layer) {
        const angle = shadowAngleParam();
        const key = `wfm-character-shadow-${serial++}`;
        const texture = scene.textures.createCanvas(key, W, H);
        const ink = document.createElement('canvas');
        ink.width = W; ink.height = H;
        // A separate multiply batch preserves model occlusion. Sharing the
        // normal-alpha batch produced visible shading on grounded bodies in
        // final-image comparisons, despite correct scene depth values.
        const image = scene.add.image(0, 0, key).setOrigin(0).setDepth(3.4)
            .setAlpha(0.29).setBlendMode('MULTIPLY');
        const body = document.createElement('canvas');
        body.width = W; body.height = H;
        const wrestlers = new Set();
        const visibleParts = actor => (actor.skeleton?._parts ?? []).filter(part =>
            part.visible && part.alpha > 0 && part.frame && part !== actor.skeleton.pelvisMask);
        const drawCast = (ctx, actor) => {
            const matrix = shadowProjection(actor, angle);
            for (const part of visibleParts(actor)) drawShadowPart(ctx, part, matrix);
        };
        const render = () => {
            const ctx = ink.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, W, H);
            ctx.save();
            for (const actor of wrestlers) drawCast(ctx, actor);
            // One union, then one opacity: overlapping parts/actors don't darken seams.
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, H);
            ctx.restore();
            const out = texture.context;
            out.setTransform(1, 0, 0, 1, 0, 0);
            out.clearRect(0, 0, W, H);
            out.save();
            out.beginPath();
            for (const [i, p] of [RING.nearLeft, RING.nearRight, RING.farRight, RING.farLeft].entries()) {
                if (i === 0) out.moveTo(p.x, p.y); else out.lineTo(p.x, p.y);
            }
            out.closePath(); out.clip();
            // Canvas shadows work in Safari without relying on context.filter.
            // Move the source offscreen and leave only its softly diffused shadow.
            out.shadowColor = '#111111';
            out.shadowBlur = 3;
            out.shadowOffsetX = W * 2;
            out.drawImage(ink, -W * 2, 0);
            out.restore();
            // Native scene depth handles body occlusion. Do not subtract a
            // body cutout: double-compositing its antialias creates a light rim.
            texture.refresh();
        };
        // Read-only review hook. Per-actor casting is sampled only on demand;
        // normal rendering does not scan pixels or allocate per-frame canvases.
        layer = { wrestlers, image, cast: ink, output: texture.canvas,
            // Coverage is diagnostic only; never used to erase the visible cast.
            get body() {
                const ctx = body.getContext('2d');
                ctx.clearRect(0, 0, W, H);
                for (const actor of wrestlers) for (const part of visibleParts(actor)) drawShadowPart(ctx, part);
                return body;
            },
            actorCast(actor) {
                const canvas = document.createElement('canvas');
                canvas.width = W; canvas.height = H;
                drawCast(canvas.getContext('2d'), actor);
                return canvas;
            } };
        scene._characterShadowReview = layer;
        layers.set(scene, layer);
        scene.events.on('prerender', render);
        scene.events.once('shutdown', () => {
            scene.events.off('prerender', render);
            image.destroy(); scene.textures.remove(key); layers.delete(scene);
            delete scene._characterShadowReview;
        });
    }
    layer.wrestlers.add(w);
    return true;
}
