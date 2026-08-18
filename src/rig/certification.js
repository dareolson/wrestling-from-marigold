// Articulation certification — the invariant kernel.
//
// Every function here is pure. It consumes an OBSERVATION (a plain snapshot
// of what a rendered Skeleton actually put on screen: image transforms, the
// joint points the rig believes it drew to, semantic anchors, depths) and
// returns measurements. Nothing here imports Phaser, touches the DOM, or
// knows how the snapshot was captured, so the same measurements run in
// `node --test` against synthetic observations and in the browser against a
// live rig.
//
// The measurements are deliberately taken from the RENDERED transform rather
// than from the binding that produced it. A schema-level check ("the binding
// object has a proximal anchor") passes while the screen is wrong; re-deriving
// each authored anchor's world position from the image's final
// x/y/rotation/origin/displaySize/flipX is the only way to catch a solver
// that computes a correct binding and then applies it incorrectly. That is
// exactly the class of defect this layer was built for: centering every hand
// and boot on its quad instead of its authored wrist/ankle anchor was
// invisible to all 205 unit tests, both validators, and both rendered probes.

/**
 * Parent→child structural chains, including the wrist and ankle links that
 * had no rendered coverage before this file existed.
 *
 * `parent.socket` names a torso rigProfile socket; `parent.anchor: 'distal'`
 * means the parent limb's own authored distal binding anchor. `child.anchor`
 * is always the child's proximal binding anchor — that is the swap contract:
 * a replacement part may repaint anything except where it attaches.
 */
export const STRUCTURAL_CHAINS = Object.freeze([
    Object.freeze({ joint: 'neck', parent: { slot: 'torso', socket: 'neck' }, child: { slot: 'head' } }),
    Object.freeze({ joint: 'nearShoulder', parent: { slot: 'torso', socket: 'nearShoulder' }, child: { slot: 'nearUpArm' } }),
    Object.freeze({ joint: 'farShoulder', parent: { slot: 'torso', socket: 'farShoulder' }, child: { slot: 'farUpArm' } }),
    Object.freeze({ joint: 'nearElbow', parent: { slot: 'nearUpArm', anchor: 'distal' }, child: { slot: 'nearForearm' } }),
    Object.freeze({ joint: 'farElbow', parent: { slot: 'farUpArm', anchor: 'distal' }, child: { slot: 'farForearm' } }),
    Object.freeze({ joint: 'nearWrist', parent: { slot: 'nearForearm', anchor: 'distal' }, child: { slot: 'nearHand' } }),
    Object.freeze({ joint: 'farWrist', parent: { slot: 'farForearm', anchor: 'distal' }, child: { slot: 'farHand' } }),
    Object.freeze({ joint: 'nearHip', parent: { slot: 'torso', socket: 'nearHip' }, child: { slot: 'nearThigh' } }),
    Object.freeze({ joint: 'farHip', parent: { slot: 'torso', socket: 'farHip' }, child: { slot: 'farThigh' } }),
    Object.freeze({ joint: 'nearKnee', parent: { slot: 'nearThigh', anchor: 'distal' }, child: { slot: 'nearShin' } }),
    Object.freeze({ joint: 'farKnee', parent: { slot: 'farThigh', anchor: 'distal' }, child: { slot: 'farShin' } }),
    Object.freeze({ joint: 'nearAnkle', parent: { slot: 'nearShin', anchor: 'distal' }, child: { slot: 'nearBoot' } }),
    Object.freeze({ joint: 'farAnkle', parent: { slot: 'farShin', anchor: 'distal' }, child: { slot: 'farBoot' } }),
]);

/**
 * Depth-order rules the pelvis model depends on. pelvisUnderlay must sit
 * BEHIND both thighs and pelvisMask ABOVE both thighs; that pair is what
 * stops a hole opening at the hip during splits, sprawls and get-ups.
 * George's legacy middle-depth pelvisOverlay satisfies neither, which is why
 * he is not the reference.
 */
export const DEPTH_RULES = Object.freeze([
    Object.freeze({ behind: 'pelvisUnderlay', inFront: 'nearThigh' }),
    Object.freeze({ behind: 'pelvisUnderlay', inFront: 'farThigh' }),
    Object.freeze({ behind: 'nearThigh', inFront: 'pelvisMask' }),
    Object.freeze({ behind: 'farThigh', inFront: 'pelvisMask' }),
]);

export const DEFAULT_BUDGET = Object.freeze({
    // World px between an authored anchor and the joint it must sit on. A
    // structural anchor is not "close enough" — this is a hard geometric
    // identity, so the budget only absorbs float noise and rounding.
    anchorErrorPx: 0.75,
    // World px a structural anchor may move when a variant is swapped in.
    // Semantic contact points are free to move; wrists and ankles are not.
    variantDriftPx: 0.05,
    // Radians of articulation that may land in the very first frame of a
    // transition, as a fraction of the transition's total travel.
    firstFrameJumpFraction: 0.5,
    // Radians a joint may move between adjacent frames of a sampled motion.
    maxAngularStepRad: 0.85,
    // World px an endpoint may move between adjacent frames.
    maxEndpointStepPx: 60,
    // Signed local flex must keep its sign across facings — a mirrored pose
    // that inverts a bend reads as a broken elbow, not a mirrored one.
    facingFlexTolerance: 0.02,
    // World px a planted sole may sit above the mat line before the wrestler
    // reads as floating.
    soleContactPx: 6,
    // World px a sole may sink below the mat line. Small and deliberate: the
    // boot silhouette can legitimately overlap the mat edge slightly, but a
    // foot travelling through the floor is a grounding solve failure.
    solePenetrationPx: 2.5,
});

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function isPoint(point) {
    return !!point && isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

/**
 * World position of a normalized {u,v} point on a rendered part.
 *
 * This is the exact inverse of the world→texture mapping the joint audit
 * already uses to sample art pixels, so a point derived here lands on the
 * same texel that audit would read. flipX mirrors u only; Phaser never
 * touches originX when flipping, which is why the mirror has to be applied
 * to the fraction rather than to the resulting offset.
 */
export function anchorWorldPoint(transform, frac) {
    if (!transform || !frac) return null;
    const { x, y, rotation, originX, originY, displayWidth, displayHeight, flipX, flipY } = transform;
    if (![x, y, rotation, originX, originY, displayWidth, displayHeight].every(isFiniteNumber)) return null;
    if (!isFiniteNumber(frac.u) || !isFiniteNumber(frac.v)) return null;
    // flipY is the exact vertical twin of flipX. Nothing in the rig sets it
    // any more — the grounded on-back reflection that did was removed
    // (2026-08-17) — and certifyOrientation now FAILS any part that has it.
    // The mirroring stays here regardless: this function must report where a
    // texel actually landed, including for a part that should not have been
    // flipped, or the orientation finding would be masked by a phantom
    // anchor error pointing at the wrong cause.
    const u = flipX ? 1 - frac.u : frac.u;
    const v = flipY ? 1 - frac.v : frac.v;
    const lx = (u - originX) * displayWidth;
    const ly = (v - originY) * displayHeight;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return { x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Measure one structural chain in one rendered sample.
 *
 * Returns `status: 'unmeasurable'` when the character does not supply the
 * anchors this chain needs. That is a real, reportable state rather than a
 * pass: George and Thesz make every one of these unmeasurable, which is the
 * finding that motivated this whole layer. Counting an unmeasurable chain as
 * a pass is how the architecture stayed unverified for so long.
 */
export function measureChain(sample, chain) {
    const jointPoint = sample.joints?.[chain.joint];
    const childPart = sample.parts?.[chain.child.slot];
    const parentPart = sample.parts?.[chain.parent.slot];
    const base = { joint: chain.joint, child: chain.child.slot, parent: chain.parent.slot };

    if (!childPart?.visible || !parentPart?.visible) {
        return { ...base, status: 'absent', reason: 'part not rendered' };
    }
    if (!isPoint(jointPoint)) {
        return { ...base, status: 'unmeasurable', reason: `no rig joint point for ${chain.joint}` };
    }

    const childProximal = childPart.anchors?.proximal;
    if (!childProximal) {
        return { ...base, status: 'unmeasurable', reason: `${chain.child.slot} has no proximal binding anchor` };
    }
    const childAnchorWorld = anchorWorldPoint(childPart, childProximal);
    if (!childAnchorWorld) {
        return { ...base, status: 'nonfinite', reason: `${chain.child.slot} transform is not finite` };
    }

    let parentAnchorWorld = null;
    let parentReason = null;
    if (chain.parent.socket) {
        const socket = parentPart.sockets?.[chain.parent.socket];
        if (socket) parentAnchorWorld = anchorWorldPoint(parentPart, socket);
        else parentReason = `torso has no ${chain.parent.socket} socket`;
    } else {
        const distal = parentPart.anchors?.distal;
        if (distal) parentAnchorWorld = anchorWorldPoint(parentPart, distal);
        else parentReason = `${chain.parent.slot} has no distal binding anchor`;
    }

    return {
        ...base,
        status: 'measured',
        jointPoint,
        proximalErrorPx: distance(childAnchorWorld, jointPoint),
        distalErrorPx: parentAnchorWorld ? distance(parentAnchorWorld, jointPoint) : null,
        distalUnmeasurable: parentReason,
    };
}

/** Measure every structural chain in one sample. */
export function measureSample(sample) {
    return STRUCTURAL_CHAINS.map(chain => measureChain(sample, chain));
}

/** Every numeric field of every rendered part must be finite. */
export function findNonFiniteTransforms(sample) {
    const bad = [];
    for (const [slot, part] of Object.entries(sample.parts ?? {})) {
        if (!part?.visible) continue;
        for (const key of ['x', 'y', 'rotation', 'originX', 'originY', 'displayWidth', 'displayHeight', 'depth']) {
            if (part[key] !== undefined && !isFiniteNumber(part[key])) bad.push(`${slot}.${key}`);
        }
    }
    for (const [name, point] of Object.entries(sample.joints ?? {})) {
        if (!isPoint(point)) bad.push(`joints.${name}`);
    }
    for (const [name, point] of Object.entries(sample.semanticAnchors ?? {})) {
        if (!isPoint(point)) bad.push(`semanticAnchors.${name}`);
    }
    return bad;
}

/**
 * No rendered part may be reflected.
 *
 * This exists because of a real defect the rest of this kernel could not see.
 * The grounded on-back render reflected every assembled part across the mat
 * axis — negating rotation, setting flipY, inverting originY — and mirrored
 * jointAttachmentPoints to match. Every anchor therefore still coincided
 * exactly with its parent joint, so certifyPose reported a clean pass on a
 * body whose every face, boot, trunk, arm and leg PNG was upside down.
 *
 * Anchor coincidence proves parts are CONNECTED. It says nothing about
 * whether they are the right way up, because a reflection preserves all the
 * distances this kernel measures. That is the blind spot, and this is the
 * cheapest exact closure of it: flipY is never legitimate in this rig, so its
 * presence is by itself a defect. flipX IS legitimate (it is how facing is
 * mirrored) and is deliberately not checked here.
 */
export function findReflectedParts(sample) {
    const reflected = [];
    for (const [slot, part] of Object.entries(sample.parts ?? {})) {
        if (!part?.visible) continue;
        if (part.flipY) reflected.push(slot);
    }
    return reflected;
}

/** Pelvis layers must bracket the thighs in depth, not sit between them. */
export function checkDepthOrder(sample) {
    const violations = [];
    for (const rule of DEPTH_RULES) {
        const behind = sample.parts?.[rule.behind];
        const inFront = sample.parts?.[rule.inFront];
        if (!behind?.visible || !inFront?.visible) continue;
        if (!(behind.depth < inFront.depth)) {
            violations.push({
                ...rule,
                behindDepth: behind.depth,
                inFrontDepth: inFront.depth,
            });
        }
    }
    return violations;
}

/**
 * Continuity across a sampled motion.
 *
 * Endpoints being finite proves only that the limb survived; it says nothing
 * about how it got there. A cold channel assigned straight to its
 * destination is NaN-free and pops on frame one. `firstFrameFraction` is the
 * share of total travel that lands in the opening frame — a seeded channel
 * spreads its travel across the tween and scores near zero.
 */
export function certifyMotion(samples, { budget = DEFAULT_BUDGET } = {}) {
    const findings = [];
    if (!Array.isArray(samples) || samples.length < 2) {
        return { findings, tracked: 0 };
    }

    const jointNames = new Set();
    for (const sample of samples) for (const name of Object.keys(sample.joints ?? {})) jointNames.add(name);

    for (const name of jointNames) {
        let maxStep = 0;
        let previous = null;
        for (const sample of samples) {
            const point = sample.joints?.[name];
            if (!isPoint(point)) continue;
            if (previous) maxStep = Math.max(maxStep, distance(previous, point));
            previous = point;
        }
        if (maxStep > budget.maxEndpointStepPx) {
            findings.push({
                kind: 'endpoint-discontinuity',
                joint: name,
                maxEndpointStepPx: maxStep,
                budgetPx: budget.maxEndpointStepPx,
            });
        }
    }

    const channels = new Set();
    for (const sample of samples) for (const name of Object.keys(sample.flex ?? {})) channels.add(name);

    for (const channel of channels) {
        const series = samples
            .map(sample => sample.flex?.[channel])
            .filter(isFiniteNumber);
        if (series.length < 2) continue;
        let maxStep = 0;
        for (let i = 1; i < series.length; i++) maxStep = Math.max(maxStep, Math.abs(series[i] - series[i - 1]));
        const total = Math.abs(series.at(-1) - series[0]);
        const firstStep = Math.abs(series[1] - series[0]);
        if (maxStep > budget.maxAngularStepRad) {
            findings.push({ kind: 'angular-discontinuity', channel, maxAngularStepRad: maxStep, budgetRad: budget.maxAngularStepRad });
        }
        // Only meaningful once the joint actually travelled — a joint that
        // barely moves has a noisy, meaningless first-frame fraction.
        if (total > 0.3 && firstStep > total * budget.firstFrameJumpFraction) {
            findings.push({
                kind: 'first-frame-jump',
                channel,
                firstFrameRad: firstStep,
                totalRad: total,
                fraction: firstStep / total,
                budgetFraction: budget.firstFrameJumpFraction,
            });
        }
    }
    return { findings, tracked: jointNames.size + channels.size };
}

/**
 * Facing symmetry, measured as bend-direction equivalence rather than as a
 * pixel mirror.
 *
 * A strict mirror comparison would fail George by design: his
 * `faceLeftOverrides` are values Derek tuned directly against the facing < 0
 * render because a 3/4-view torso does not necessarily read well mirrored,
 * independent of whether the math is right. The invariant that actually
 * matters — and the one objective 5 asks for — is that a pose does not invert
 * a bend when mirrored. Local flex is facing-independent by construction, so
 * the same pose must produce the same signed flex at both facings.
 */
export function certifyFacingSymmetry(right, left, { budget = DEFAULT_BUDGET } = {}) {
    const findings = [];
    for (const channel of Object.keys(right.flex ?? {})) {
        const a = right.flex[channel];
        const b = left.flex?.[channel];
        if (!isFiniteNumber(a) || !isFiniteNumber(b)) continue;
        if (Math.sign(a) !== Math.sign(b) && Math.abs(a) > budget.facingFlexTolerance && Math.abs(b) > budget.facingFlexTolerance) {
            findings.push({ kind: 'bend-inversion', channel, right: a, left: b });
        } else if (Math.abs(a - b) > budget.facingFlexTolerance) {
            findings.push({ kind: 'facing-flex-mismatch', channel, right: a, left: b, deltaRad: Math.abs(a - b) });
        }
    }
    return findings;
}

/**
 * A replacement part may repaint anything except where it attaches.
 * `samplesByVariant` maps a variant id to a rendered sample; the structural
 * anchor must not move between them, while the semantic contact point may.
 */
export function certifyVariantDrift(samplesByVariant, { slot, jointName, semanticName, budget = DEFAULT_BUDGET } = {}) {
    const findings = [];
    const entries = Object.entries(samplesByVariant);
    if (entries.length < 2) return findings;
    const [baselineId, baseline] = entries[0];
    const baseJoint = baseline.joints?.[jointName];
    if (!isPoint(baseJoint)) {
        return [{ kind: 'variant-unmeasurable', slot, jointName, reason: 'no structural joint point in baseline sample' }];
    }
    let semanticMoved = false;
    for (const [id, sample] of entries.slice(1)) {
        const joint = sample.joints?.[jointName];
        if (!isPoint(joint)) {
            findings.push({ kind: 'variant-unmeasurable', slot, variant: id, jointName, reason: 'no structural joint point' });
            continue;
        }
        const drift = distance(baseJoint, joint);
        if (drift > budget.variantDriftPx) {
            findings.push({ kind: 'structural-anchor-drift', slot, variant: id, jointName, driftPx: drift, budgetPx: budget.variantDriftPx });
        }
        const baseSemantic = baseline.semanticAnchors?.[semanticName];
        const semantic = sample.semanticAnchors?.[semanticName];
        if (isPoint(baseSemantic) && isPoint(semantic) && distance(baseSemantic, semantic) > budget.variantDriftPx) {
            semanticMoved = true;
        }
    }
    // A swap where nothing moved at all means the variant never reached the
    // screen — the swap silently did nothing, which would otherwise read as a
    // clean pass on the drift check.
    if (!semanticMoved && entries.length > 1) {
        findings.push({ kind: 'variant-inert', slot, baselineId, reason: 'no semantic contact point moved across variants; the swap may not have rendered' });
    }
    return findings;
}

/**
 * Sole grounding — does the wrestler actually stand on the mat?
 *
 * Deliberately "at least one planted foot" rather than "both feet down": a
 * knee lift, a single-knee stance and a dropkick chamber all legitimately
 * carry one foot in the air, and an invariant that demanded both would have to
 * be switched off for exactly the high-strain poses this matrix exists to
 * cover. What is never legitimate is every foot floating, or a foot
 * travelling through the floor.
 *
 * Measured on the boot's authored `sole` semantic anchor, not on the boot
 * quad's bottom edge — the painted sole is lateral to the shin axis, so the
 * quad's lowest corner is not where the wrestler's weight lands.
 */
export function certifySoleGrounding(sample, { groundY, budget = DEFAULT_BUDGET } = {}) {
    const findings = [];
    if (!isFiniteNumber(groundY)) return findings;
    const soles = Object.entries(sample.semanticAnchors ?? {})
        .filter(([name]) => name.endsWith('.sole'))
        .filter(([, point]) => isPoint(point));
    if (soles.length === 0) {
        return [{ kind: 'sole-unmeasurable', reason: 'no boot sole anchors; character has no attachment-slot boots' }];
    }
    let planted = null;
    for (const [name, point] of soles) {
        const above = groundY - point.y;
        if (above < -budget.solePenetrationPx) {
            findings.push({
                kind: 'sole-penetration',
                slot: name,
                belowGroundPx: -above,
                budgetPx: budget.solePenetrationPx,
            });
        }
        if (Math.abs(above) <= budget.soleContactPx) planted = name;
    }
    if (!planted) {
        const highest = soles.reduce((best, entry) => (entry[1].y > best[1].y ? entry : best));
        findings.push({
            kind: 'no-planted-foot',
            nearestSlot: highest[0],
            aboveGroundPx: groundY - highest[1].y,
            budgetPx: budget.soleContactPx,
        });
    }
    return findings;
}

/** Roll a sample's chain measurements up into findings against a budget. */
export function certifyPose(sample, { budget = DEFAULT_BUDGET } = {}) {
    const findings = [];
    for (const measurement of measureSample(sample)) {
        if (measurement.status === 'nonfinite') {
            findings.push({ kind: 'nonfinite-transform', joint: measurement.joint, detail: measurement.reason });
            continue;
        }
        if (measurement.status !== 'measured') continue;
        if (measurement.proximalErrorPx > budget.anchorErrorPx) {
            findings.push({
                kind: 'proximal-anchor-error',
                joint: measurement.joint,
                slot: measurement.child,
                errorPx: measurement.proximalErrorPx,
                budgetPx: budget.anchorErrorPx,
            });
        }
        if (measurement.distalErrorPx !== null && measurement.distalErrorPx > budget.anchorErrorPx) {
            findings.push({
                kind: 'distal-anchor-error',
                joint: measurement.joint,
                slot: measurement.parent,
                errorPx: measurement.distalErrorPx,
                budgetPx: budget.anchorErrorPx,
            });
        }
    }
    for (const slot of findNonFiniteTransforms(sample)) {
        findings.push({ kind: 'nonfinite-transform', detail: slot });
    }
    for (const violation of checkDepthOrder(sample)) {
        findings.push({ kind: 'depth-order', detail: `${violation.behind} must render behind ${violation.inFront}`, ...violation });
    }
    for (const slot of findReflectedParts(sample)) {
        findings.push({ kind: 'reflected-part', slot, detail: `${slot} renders flipped vertically (upside-down artwork)` });
    }
    return findings;
}

/**
 * Attribution — objective 7.
 *
 * A moveset author needs to know which of four things to go fix. The
 * reference rig is what makes the question answerable: it is the only
 * character that renders the full production contract, so if IT fails, the
 * failure cannot be blamed on anyone's artwork.
 *
 *   architecture    — the compliant reference rig fails the same invariant.
 *                     Nobody's art can fix this.
 *   source-artwork  — the reference rig passes and a character with known
 *                     legacy art fails. Regenerate the art; do not add
 *                     offsets.
 *   binding-geometry— the reference rig passes, the character is standards-
 *                     compliant, and it still fails: its manifest anchors
 *                     disagree with its ink.
 *   coverage-gap    — the rig never rendered this pose at all, so no
 *                     invariant was exercised. Not a pass.
 */
export function classifyFinding({ finding, referenceFailed, characterIsCompliant, renderPath, isReference = false }) {
    if (renderPath === 'unrigged') return 'coverage-gap';
    if (finding.kind === 'chain-unmeasurable') return 'coverage-gap';
    if (finding.kind === 'nonfinite-transport' || finding.kind === 'nonfinite-transform') return 'runtime-transport';
    // A reflected part is always the render path's doing — no artwork can
    // cause or fix it, so it must never be attributed to a character's art.
    if (finding.kind === 'reflected-part') return 'architecture';
    if (finding.kind === 'first-frame-jump' || finding.kind === 'angular-discontinuity') return 'animation-data';
    // A geometry failure ON the reference rig is architectural by
    // construction: its manifest anchors and its ink are generated from each
    // other, so they cannot disagree. There is no artwork left to blame.
    if (isReference || referenceFailed) return 'architecture';
    return characterIsCompliant ? 'binding-geometry' : 'source-artwork';
}
