const EPSILON = 1e-9;

function assertPoint(point, label) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
        throw new TypeError(`${label} must contain finite x/y`);
    }
}

function assertCanvas(canvas) {
    if (!Number.isFinite(canvas?.w) || canvas.w <= 0
        || !Number.isFinite(canvas?.h) || canvas.h <= 0) {
        throw new TypeError('canvas must contain positive w/h');
    }
}

// Skeleton angles use 0=down and positive=clockwise in model space, while
// Phaser applies image.rotation in screen space. Keeping this transform pure
// makes the same authored proximal/distal pair usable by the renderer, tests,
// and tooling without adding per-pose offsets.
export function solveTwoAnchorBinding({
    canvas,
    proximal,
    distal,
    worldProximal,
    worldDistal,
    facing = 1,
}) {
    assertCanvas(canvas);
    assertPoint(proximal, 'proximal');
    assertPoint(distal, 'distal');
    assertPoint(worldProximal, 'worldProximal');
    assertPoint(worldDistal, 'worldDistal');
    if (facing !== 1 && facing !== -1) throw new RangeError('facing must be 1 or -1');

    const sourceDx = facing * (distal.x - proximal.x);
    const sourceDy = distal.y - proximal.y;
    const worldDx = worldDistal.x - worldProximal.x;
    const worldDy = worldDistal.y - worldProximal.y;
    const sourceLength = Math.hypot(sourceDx, sourceDy);
    const worldLength = Math.hypot(worldDx, worldDy);
    if (sourceLength < EPSILON) throw new RangeError('source anchors must not coincide');
    if (worldLength < EPSILON) throw new RangeError('world anchors must not coincide');

    const sourceAngle = Math.atan2(sourceDx, sourceDy);
    const worldAngle = Math.atan2(worldDx, worldDy);
    const skeletonAngle = worldAngle - sourceAngle;
    const scale = worldLength / sourceLength;

    return {
        x: worldProximal.x,
        y: worldProximal.y,
        originX: facing > 0 ? proximal.x / canvas.w : 1 - proximal.x / canvas.w,
        originY: proximal.y / canvas.h,
        rotation: -skeletonAngle,
        skeletonAngle,
        scale,
        displayWidth: canvas.w * scale,
        displayHeight: canvas.h * scale,
        flipX: facing < 0,
    };
}

export function transformBoundPoint(binding, canvas, point, facing = 1) {
    assertCanvas(canvas);
    assertPoint(point, 'point');
    const sourceX = facing * (point.x - (facing > 0
        ? binding.originX * canvas.w
        : (1 - binding.originX) * canvas.w));
    const sourceY = point.y - binding.originY * canvas.h;
    const lx = sourceX * binding.scale;
    const ly = sourceY * binding.scale;
    return {
        x: binding.x + lx * Math.cos(binding.skeletonAngle) + ly * Math.sin(binding.skeletonAngle),
        y: binding.y - lx * Math.sin(binding.skeletonAngle) + ly * Math.cos(binding.skeletonAngle),
    };
}

export function solveAnchoredAttachment({ canvas, anchor, worldAnchor, angle, scale, facing = 1 }) {
    assertCanvas(canvas);
    assertPoint(anchor, 'anchor');
    assertPoint(worldAnchor, 'worldAnchor');
    if (!Number.isFinite(angle) || !Number.isFinite(scale) || scale <= 0) {
        throw new TypeError('angle and positive scale are required');
    }
    return {
        x: worldAnchor.x,
        y: worldAnchor.y,
        originX: facing > 0 ? anchor.x / canvas.w : 1 - anchor.x / canvas.w,
        originY: anchor.y / canvas.h,
        rotation: -angle,
        skeletonAngle: angle,
        scale,
        displayWidth: canvas.w * scale,
        displayHeight: canvas.h * scale,
        flipX: facing < 0,
    };
}

export function applyImageBinding(image, binding) {
    image.setOrigin(binding.originX, binding.originY)
        .setPosition(binding.x, binding.y)
        .setRotation(binding.rotation)
        .setDisplaySize(binding.displayWidth, binding.displayHeight)
        .setFlipX(binding.flipX);
    return binding;
}
