import { resolvePartSelection, textureKey } from './rig/partVariants.js';
import {
    applyImageBinding,
    solveAnchoredAttachment,
    solveTwoAnchorBinding,
    transformBoundPoint,
} from './rig/twoAnchorBinding.js';
import { childAngleFromLocalFlex, localFlexFromChildAngle } from './rig/articulation.js';

// Proportions in unscaled pixels — multiply by s before placing parts.
// Lengths originally chosen to match the old single-piece stick-figure totals
// exactly (arm 76, leg 89≈88, torso 112) while splitting at elbow and knee
// joints. upperArmH later doubled (Derek's proportion note, 2026-07-12 — the
// arm read too short); forearmH untouched, so the old arm-76 total no longer
// holds.
// Exported (with TEX and RIG below) as a read/write seam for the dev-only
// rig tuner (tools/rig-tuner/) — nothing in the game mutates these, so
// runtime behavior is identical to when they were module-private consts.
export const P = {
    // 1.75x (32->56) — thighs read squished/flat and too short (Derek,
    // 2026-07-12). TEX.thigh moves with it, same 1:1 convention as
    // upperArmH's own doubling below (plus HIP_OVERLAP — see below).
    thighH:    56,
    // 2x (32->64) — 1.5x still read too small to line up with the thigh
    // (Derek, 2026-07-12). Per-character shin boxes (george.js/thesz.js)
    // grow with it, plus KNEE_OVERLAP — see below.
    shinH:     64,
    bootH:     25,
    legW:      26,
    upperArmH: 68,
    // 1.5x (42->63) — forearms read squished/stubby (Derek, 2026-07-12).
    // TEX.forearm.h moves with it, same 1:1 convention as upperArmH's own
    // doubling above.
    forearmH:  63,
    armW:      18,
    torsoH:    112,
    torsoW:    20,
    trunksH:   40,
    headR:     34,
};

// Display boxes for parts backed by real PNG textures, unscaled px (multiply
// by s like everything in P). The placeholder stick-figure blocks above are
// deliberately narrow (torsoW 20, legW 26) — stretching a 190px-wide torso
// PNG into that box would render it as a column. Widths derive from the rig
// bone lengths and each art canvas's aspect ratio; heights stay equal to the
// bone lengths so all joint/pivot math is untouched.
//
// The cutter pipeline (tools/wrestler-cutter/process-parts.mjs) makes the
// art fill each canvas's full height, so canvas top = pivot joint and
// canvas bottom = bone end and these boxes map 1:1 for every part EXCEPT the
// shin, whose PNG has the boot baked in: its box must span shinH + bootH
// (32 + 25 = 57 unscaled) so the boot sole lands on the ground line, while
// the knee pivot and the _end/ankle math still use shinH exactly as before.
// The shin's canvas is also typically width-limited by the boot toe (a
// pivot-symmetric crop can't fill the canvas height at legal width), so its
// true box is (37, 57) / fillFrac — fillFrac is character-specific (each
// artist's boot silhouette differs) and reported by the pipeline, so there
// is no single default here: every character wiring a shin texture must
// supply its own box explicitly (see george.js, thesz.js). Recompute from
// the reported fillFrac if a shin art asset is regenerated.
// upperArm/forearm/thigh widths below are widened past the raw art-derived
// crop (Derek's proportion note, 2026-07-12: limbs read too thin next to the
// torso — measured fill was ~50-60% of canvas width vs. torso's ~70-80%).
// upperArm and thigh 2x, forearm 1.5x over the original derived values
// (28, 29, 32 — see git history). upperArm.h doubled (34->68) to match
// P.upperArmH's own doubling (Derek: arm read too short) — this is the one
// case where TEX.*.h has to move too, since the two are meant to stay 1:1.
export const TEX = {
    torso:    { w: 82, h: 112 },
    upperArm: { w: 56, h: 68 },
    forearm:  { w: 44, h: 63 },
    // h = thighH (56) + HIP_OVERLAP (14, see below) — the extra 14 renders
    // above the true hip point so the thigh tucks under the trunks instead
    // of floating below them with a visible gap (Derek, 2026-07-12).
    thigh:    { w: 82, h: 70 },
};

// Legacy heads (thesz) are drawn with a deliberately long neck (slack meant
// to tuck behind the collar rather than show in full). Measured on thesz
// head.png: the neck (near-constant-width region below the jawline) runs
// ~31-33% of the 200px canvas height. Cropped out of the texture entirely
// (not just drawn-over) in the Skeleton constructor, then the head's Y
// anchor is pushed down by the same amount in world space
// (updateUpright/_applyGrounded) so the remaining visible neck still meets
// the collar with no gap. 0.24 hides ~3/4 of the neck (raised from an
// initial 1/2 — Derek: heads still sat too high) while staying under the
// ~31% jawline floor, so it never eats into face content (Derek,
// 2026-07-12). Superseded for characters whose torso art bakes the neck in
// instead (george.js's `neckInTorso: true`) — see `_neckInTorso` below.
const HEAD_HIDE_FRAC = 0.24;

const TAU = Math.PI * 2;

// Overlap/stagger/nudge tuning scalars. One mutable exported object (same
// dev-tool seam as P/TEX above) — each value keeps its original name and
// meaning, and nothing in the game writes to it.
export const RIG = {
    // Unscaled px the forearm's placement pulls back up the upper-arm bone
    // (see updateUpright's far/near arm blocks) so a bent elbow doesn't show a
    // wedge-shaped gap between the two rotated rectangles.
    ELBOW_OVERLAP: 17,
    // Far arm renders a touch smaller than the near arm — sells the 3/4 shoulder
    // depth (see SHOULDER_STAGGER below) instead of reading same-size-but-offset.
    FAR_ARM_SCALE: 0.85,
    // Shoulder stagger, unscaled px (scaled by s where applied): the torso art
    // is drawn three-quarter (both shoulders visible, not coincident), so the
    // near/far arms shouldn't pivot from the exact same point. Near arm sits
    // back toward the torso's rear/back-curve edge; far arm sits slightly
    // ahead of it (Derek, 2026-07-12).
    SHOULDER_STAGGER: 12,
    // Unscaled px the thigh's placement pulls up into the torso/trunks (see
    // TEX.thigh's matching +HIP_OVERLAP height above) so the hip joint tucks
    // under the trunks instead of floating below them with a gap.
    HIP_OVERLAP: 14,
    // Far thigh renders slightly ahead of the near thigh (same 3/4-depth idea as
    // SHOULDER_STAGGER), and both pull back toward the hip a bit — the wider
    // thigh art (see TEX.thigh) was reading like both legs stepped too far
    // forward of the body (Derek, 2026-07-12).
    HIP_STAGGER: 8,
    LEG_BACK_BIAS: 10,
    // Small additional per-leg nudges on top of the above (Derek, 2026-07-12,
    // tuned over several rounds — the up/down and fwd/back directions below were
    // flipped from an earlier pass that read backward on every axis): near/
    // camera-facing thigh pushed forward a touch and lowered a touch; far thigh
    // pulled back a touch, lowered a bit, and tilted further backward (render
    // angle only — see FAR_THIGH_TILT below, applied where the far thigh is
    // placed in updateUpright).
    NEAR_LEG_FWD: 10,
    NEAR_LEG_UP: -5,
    FAR_LEG_FWD: -5,
    // Eased back from 8, then reversed direction entirely (Derek, 2026-07-12) —
    // at 8 the far thigh's image retracted away from the true knee point enough
    // that the shin (which still anchors off that unmoved knee — see
    // KNEE_OVERLAP) read as stretched longer than the near leg's; the
    // higher-not-lower direction was backward, so this now lowers instead.
    FAR_LEG_UP: 0,
    // Render-only angle bias (the true far.thighAng used for the knee/IK chain
    // is untouched) so the far thigh reads tilted — negative (backward) since
    // the earlier +10deg (forward) direction was backward.
    FAR_THIGH_TILT: -10 * Math.PI / 180,
    // Unscaled px the shin's placement pulls up into the thigh (each character's
    // shin box height grows by the same amount — george.js/thesz.js) so the knee
    // joint tucks under the thigh instead of floating below it with a gap, same
    // technique as HIP_OVERLAP one joint down (Derek, 2026-07-12).
    // Tuned from reference: subtle overlap (18-20% of shin height) for clean connection.
    KNEE_OVERLAP: 18,
    // Near/front shin renders bigger, further forward, and a touch higher than
    // the far shin (Derek, 2026-07-12 — another +5% on top of the first pass).
    NEAR_SHIN_SCALE: 1.1,
    NEAR_SHIN_FWD: 5,
    NEAR_SHIN_UP: 5,
    // Far shin had no matching scale knob until 2026-07-19 (george rig-tuner
    // pass found the gap: nearShinScale could be tuned per-character but the
    // far shin was hardcoded to plain `s`, so once a character's near shin
    // was scaled down/up there was no way to keep the far shin visually
    // matched). Defaults to 1 — bit-identical rendering for every character
    // that doesn't set farShinScale.
    FAR_SHIN_SCALE: 1,
    // Far thigh had no scale knob at all (2026-07-23, Derek: "his far leg
    // needs to be reduced in size by five percent" — the far leg is thigh
    // AND shin, and only the shin had a knob) — same gap FAR_SHIN_SCALE
    // closed for the shin, mirrored here for the thigh. Defaults to 1 —
    // bit-identical rendering for every character that doesn't set
    // farThighScale.
    FAR_THIGH_SCALE: 1,
};

// ─── Gait tuning ─────────────────────────────────────────────────────────────
// STRIDE  — full front-to-back foot travel, unscaled px
// STANCE  — fraction of the cycle a foot is planted (vs. swinging)
// LIFT    — how high the swing foot lifts off the mat, unscaled px
//
// WALK_FREQ is DERIVED, not guessed. For a planted foot to stay locked in world
// space (no skating), its backward sweep speed must exactly cancel the body's
// forward speed. Working that through (see BUILDLOG), the lock condition is:
//     WALK_FREQ = STANCE * 2π / STRIDE
// and it is independent of SPEED — so the same stride locks at walk and run pace.
export const GAIT = {
    STRIDE: 56,   // step length — long enough to slow the cadence, short enough not to lunge
    STANCE: 0.55, // a touch less ground time so the forward recovery swing reads
    LIFT:   22,   // pick the feet up enough that the step is legible, not a backward paw
    get WALK_FREQ() { return this.STANCE * TAU / this.STRIDE; },
};

// Foot offset for one leg at a given gait phase.
//   fx       — horizontal offset from the hip, unscaled px (+ = forward of hip)
//   lift     — vertical lift off the mat, unscaled px
//   liftFrac — 0 planted … 1 peak of swing
function footGait(phase) {
    const t = (((phase % TAU) + TAU) % TAU) / TAU; // 0..1
    if (t < GAIT.STANCE) {
        // Stance: foot planted, sweeping linearly from front to back at ground speed.
        const u = t / GAIT.STANCE;
        return { fx: GAIT.STRIDE * (0.5 - u), lift: 0, liftFrac: 0 };
    }
    // Swing: foot lifts in a sine arc and eases forward to the next plant.
    const u = (t - GAIT.STANCE) / (1 - GAIT.STANCE);
    const e = u * u * (3 - 2 * u);                 // smoothstep — accelerate then settle
    const liftFrac = Math.sin(Math.PI * u);
    return { fx: GAIT.STRIDE * (-0.5 + e), lift: GAIT.LIFT * liftFrac, liftFrac };
}

// Two-bone IK (law of cosines). Root at (hx,hy), target at (fx,fy); bone lengths
// L1 (thigh) and L2 (shin). kneeDir (±1) picks which way the knee points.
// Angles use the skeleton convention: 0 = straight down, +angle rotates toward +x
// (so endpoint = pivot + (sin·len, cos·len)).
function solveLeg(hx, hy, fx, fy, L1, L2, kneeDir) {
    let dx = fx - hx, dy = fy - hy;
    let dist = Math.hypot(dx, dy);
    const reach = (L1 + L2) * 0.999;
    if (dist > reach) { const k = reach / dist; dx *= k; dy *= k; dist = reach; }
    if (dist < 1e-3) dist = 1e-3;
    const aFoot = Math.atan2(dx, dy);
    let c = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    c = Math.min(1, Math.max(-1, c));
    const thighAng = aFoot + kneeDir * Math.acos(c);
    const kx = hx + Math.sin(thighAng) * L1;
    const ky = hy + Math.cos(thighAng) * L1;
    const shinAng = Math.atan2(fx - kx, fy - ky);
    return { thighAng, shinAng };
}

// Two-bone IK whose second link ends at an authored off-axis point (for
// example a painted boot sole) rather than on the shin's centerline. Solve
// the equivalent knee-to-anchor link, then remove its local angular offset
// to recover the shin image angle. lx/ly use _endXY's local convention.
function solveLegToAnchor(hx, hy, fx, fy, L1, lx, ly, kneeDir) {
    const anchorLen = Math.hypot(lx, ly);
    const anchorOffset = Math.atan2(lx, ly);
    const solved = solveLeg(hx, hy, fx, fy, L1, anchorLen, kneeDir);
    return {
        thighAng: solved.thighAng,
        shinAng: solved.shinAng - anchorOffset,
    };
}

function ensureTexture(scene) {
    if (scene.textures.exists('sk_pixel')) return;
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('sk_pixel', 2, 2);
    g.destroy();
}

// A textures-map entry is either a plain texture-key string (use the TEX
// default display box for that part) or { key, box: { w, h }, pivotOffsetFrac,
// jointPivotFrac, distalAnchorFrac } (override the box — required for any
// character's shin, since its true box depends on that character's own
// boot-art fillFrac; see the TEX comment above). pivotOffsetFrac (2026-07-15):
// optional, opt-in — see _placePart's comment for what it corrects and why
// it's off by default. jointPivotFrac (2026-07-21): optional, opt-in — see
// the constructor's img() comment and _attachChild below for what it
// corrects. distalAnchorFrac (2026-07-25, cohesive-body-rig-binding Phase A
// + George elbows slice — see COHESIVE_BODY_RIG_BLUEPRINT.md and
// tools/debug/elbow_anchor_sweep.mjs): optional, opt-in, { u, v } in the same
// canvas-fraction convention as jointPivotFrac's v (0 = top edge, 1 = bottom
// edge; u: 0 = left edge, 0.5 = laterally centered, 1 = right edge of the
// unflipped source PNG) — see _trueDistalEnd below. Unlike pivotOffsetFrac,
// this does not move the part's own render position; it only corrects where
// a CHILD limb attaches, for a part whose painted distal (far) joint isn't
// where the generic shared bone-length constant (P.upperArmH etc.) assumes.
// Measured true for George's upper arm: the shared bone length (68 unscaled)
// undershoots this character's own box height (71) by 3px, and the elbow
// ink's own lateral centroid sits at u=0.60, not 0.5 — laterally offset from
// the shoulder end's near-centered ink (u=0.527), so the single-scalar
// pivotOffsetFrac knob (built for one constant offset shared by both ends)
// can't correct this without misplacing the shoulder to fix the elbow.
function resolveTexEntry(entry, defaultDims) {
    if (!entry) return { key: null, dims: defaultDims, pivot: 0, jointPivotFrac: 0, distalAnchorFrac: null, soleAnchorFrac: null, binding: null, semanticAnchors: null, displayScale: 1 };
    if (typeof entry === 'string') return { key: entry, dims: defaultDims, pivot: 0, jointPivotFrac: 0, distalAnchorFrac: null, soleAnchorFrac: null, binding: null, semanticAnchors: null, displayScale: 1 };
    return {
        key: entry.key, dims: entry.box ?? defaultDims,
        pivot: entry.pivotOffsetFrac ?? 0,
        jointPivotFrac: entry.jointPivotFrac ?? 0,
        distalAnchorFrac: entry.distalAnchorFrac ?? null,
        // soleAnchorFrac (2026-07-25, George AI pilot grounding — see
        // george_ai_pilot.js's shin entry comment): opt-in, canvas-fraction
        // painted-sole point, same convention as distalAnchorFrac. Not
        // consumed by the authored gait/FK grounding path and independently
        // verified by the sole sweep through _socketPoint.
        soleAnchorFrac: entry.soleAnchorFrac ?? null,
        binding: entry.binding ?? null,
        semanticAnchors: entry.semanticAnchors ?? null,
        displayScale: entry.displayScale ?? 1,
    };
}

export default class Skeleton {
    // textures: optional map of part keys → preloaded texture keys, or
    // { key, box } to override that part's display box (see resolveTexEntry)
    //   { head, torso, pelvisOverlay, pelvisUnderlay, pelvisMask, upperArm, forearm, thigh, shin,
    //     nearShin, farShin }
    // Parts with a texture use the PNG; others fall back to sk_pixel + tint.
    // Providing 'torso' hides the trunks block; providing 'shin' hides the boot block.
    constructor(scene, skinCol, trunksCol, textures = {}) {
        ensureTexture(scene);
        this._headCol  = skinCol;
        this.skinCol   = skinCol;
        this.trunksCol = trunksCol;

        // texDims: when a part has a real texture, stash its TEX (or
        // per-character override) display box on the Image so _placePart
        // swaps it in for the block dims. The placeholder path leaves
        // _texDims undefined and renders exactly as before.
        // jointPivotFrac (2026-07-21, general joint-attachment contract —
        // see AI_HANDOFF.md's 2026-07-19 Codex entries): the cutter can now
        // export shin/forearm art whose alpha content genuinely extends past
        // the knee/elbow (authored overlap slack), instead of shaving that
        // slack off to force a flat top-of-texture cap. For a part that
        // supplies this, the true joint row sits jointPivotFrac of the way
        // down the texture, not at row 0 — setOrigin there so the extra
        // above-joint art tucks under the parent limb (which draws behind it
        // in the existing depth order) instead of hanging below the joint.
        // Absent (default 0, every part before this) = setOrigin(0.5, 0),
        // byte-identical to the old behavior.
        const img = (entry, col, defaultDims) => {
            const { key, dims, pivot, jointPivotFrac, distalAnchorFrac, soleAnchorFrac, binding, semanticAnchors, displayScale } = resolveTexEntry(entry, defaultDims);
            const i = scene.add.image(0, 0, key || 'sk_pixel').setOrigin(0.5, jointPivotFrac);
            if (!key) i.setTint(col);
            else if (dims) {
                i._texDims = dims;
                i._pivotOffsetFrac = pivot;
                i._jointPivotFrac = jointPivotFrac;
                i._distalAnchorFrac = distalAnchorFrac;
                i._soleAnchorFrac = soleAnchorFrac;
                i._binding = binding;
                i._semanticAnchors = semanticAnchors;
                i._attachmentDisplayScale = displayScale;
            }
            return i;
        };

        const farThighEntry = textures.farThigh ?? textures.thigh;
        const nearThighEntry = textures.nearThigh ?? textures.thigh;
        const farShinEntry = textures.farShin ?? textures.shin;
        const nearShinEntry = textures.nearShin ?? textures.shin;
        // nearForearm/farForearm (2026-07-25, George AI pilot v4 — distinct
        // near/far hand orientations): same generic opt-in fallback pattern
        // as farThigh/nearThigh and farShin/nearShin above. Absent (every
        // character before v4) = both fall through to the shared `forearm`
        // entry, byte-identical to the single-forearm path every character
        // used before this existed.
        const farForearmEntry = textures.farForearm ?? textures.forearm;
        const nearForearmEntry = textures.nearForearm ?? textures.forearm;
        const farHandEntry = textures.farHand ?? textures.hand;
        const nearHandEntry = textures.nearHand ?? textures.hand;
        const farBootEntry = textures.farBoot ?? textures.boot;
        const nearBootEntry = textures.nearBoot ?? textures.boot;
        this.farThigh    = img(farThighEntry,     skinCol, TEX.thigh);
        this.farShin     = img(farShinEntry,      skinCol, TEX.shin);
        this.farBoot     = farBootEntry ? img(farBootEntry, 0x181818, { w: 40, h: P.bootH })
            : (farShinEntry ? null : img(null, 0x181818));
        this.farUpArm    = img(textures.upperArm, skinCol, TEX.upperArm);
        this.farForearm  = img(farForearmEntry,   skinCol, TEX.forearm);
        this.farHand     = farHandEntry ? img(farHandEntry, skinCol, { w: 40, h: 40 }) : null;
        this.torso       = img(textures.torso,    skinCol, TEX.torso);
        this.pelvisOverlay = textures.pelvisOverlay
            ? img(textures.pelvisOverlay, trunksCol, TEX.torso)
            : null;
        this.pelvisUnderlay = textures.pelvisUnderlay
            ? img(textures.pelvisUnderlay, trunksCol, TEX.torso)
            : null;
        this.pelvisMask = textures.pelvisMask
            ? img(textures.pelvisMask, trunksCol, TEX.torso)
            : null;
        this.trunks      = textures.torso  ? null : img(null, trunksCol);
        this.nearThigh   = img(nearThighEntry,    skinCol, TEX.thigh);
        this.nearShin    = img(nearShinEntry,     skinCol, TEX.shin);
        this.nearBoot    = nearBootEntry ? img(nearBootEntry, 0x181818, { w: 40, h: P.bootH })
            : (nearShinEntry ? null : img(null, 0x181818));
        this.nearUpArm   = img(textures.upperArm, skinCol, TEX.upperArm);
        this.nearForearm = img(nearForearmEntry,  skinCol, TEX.forearm);
        this.nearHand    = nearHandEntry ? img(nearHandEntry, skinCol, { w: 40, h: 40 }) : null;

        if (textures.head) {
            // headAnchorFrac (2026-07-25, George AI pilot — see Sprite
            // sheets/AI Pilot/George/CLAUDE_INTEGRATION_HANDOFF.md): optional,
            // opt-in { u, v } canvas-fraction origin for a head whose painted
            // neck connection point isn't at the legacy hard-coded
            // bottom-center (0.5, 1) — e.g. a head drawn at a 3/4 angle for a
            // gameplay-master view, where the neck sits off-center laterally
            // and a little above the canvas's true bottom edge. When present,
            // this replaces (0.5, 1) as the Image's own origin, so whatever
            // world point the neck/socket code below computes lands exactly
            // on this measured point instead of assuming bottom-center. Any
            // art below the anchor is authored overlap that tucks behind the
            // torso (same depth order as every other part), same convention
            // as distalAnchorFrac/jointPivotFrac — no crop is needed the way
            // HEAD_HIDE_FRAC needs one for the legacy long-neck heads below.
            // Absent (every head before this) = exact old (0.5, 1) origin.
            this._headAnchorFrac = textures.headAnchorFrac ?? null;
            const originU = this._headAnchorFrac ? this._headAnchorFrac.u : 0.5;
            const originV = this._headAnchorFrac ? this._headAnchorFrac.v : 1;
            // Stashed so any code path that flips the head for facing < 0
            // can also flip its origin to 1 - originU — flipX mirrors the
            // drawn pixels but never touches origin, so an off-center origin
            // (headAnchorFrac, anchored to a specific art feature like the
            // neck) stays glued to the wrong feature after a flip unless this
            // is done every time. Found live ("his head is off") — see
            // updateUpright's _mirrorUpright for the first fix of this; this
            // stashed value lets the direct (non-canonical) facing < 0 path
            // apply the identical correction.
            this._headOriginU = originU;
            this.head = scene.add.image(0, 0, textures.head).setOrigin(originU, originV);
            this._headIsImage = true;
            // neckInTorso: the character's torso art bakes the neck in
            // (pivot-flush at its own top edge) and the head art is neck-free,
            // so the head's bottom edge anchors straight to the torso pivot —
            // no crop needed. Defaults to false: legacy heads (thesz) still
            // carry their own neck slack, cropped below.
            this._neckInTorso = !!textures.neckInTorso;
            if (!this._neckInTorso && !this._headAnchorFrac) {
                // Crop rect is in fixed texture-space px, independent of the s-scaled
                // display size set every frame — safe to compute once here.
                this._headHidePx = Math.round(this.head.height * HEAD_HIDE_FRAC);
                this.head.setCrop(0, 0, this.head.width, this.head.height - this._headHidePx);
            }
            // Per-character head size override, e.g. george.js's headScale: 0.9
            // (Derek, 2026-07-12: George's head read ~10% too big for his body).
            // Defaults to 1 — most characters shouldn't need this.
            this._headScale = textures.headScale ?? 1;
            // Per-character head anchor nudge, unscaled px (Derek, 2026-07-12:
            // george's head2 art is cropped along the jaw curve rather than a
            // clean neck line, so only the chin-tip pixel is flush with the
            // canvas's bottom-center pivot — the visible jaw/ear mass sits well
            // above and behind that point, reading as a head floating too high
            // and too far back. headOffsetY sinks the anchor down (+ = lower on
            // screen) toward where the jaw mass actually sits; headOffsetX shifts
            // it along the facing direction (+ = toward facing/forward). Defaults
            // to 0 — only needed for art cropped this way.
            this._headOffsetX = textures.headOffsetX ?? 0;
            this._headOffsetY = textures.headOffsetY ?? 0;
        } else {
            this.head = scene.add.graphics();
            this._headIsImage = false;
        }
        // Per-character shoulder/upper-arm nudge, unscaled px, same convention
        // as headOffsetX/Y (+X = toward facing/forward, +Y = down). Defaults
        // to 0. Applied in updateUpright only (standing/walking) — grounded
        // poses untouched.
        this._armOffsetX = textures.armOffsetX ?? 0;
        this._armOffsetY = textures.armOffsetY ?? 0;
        // Near/far arm parity with the leg knobs below (2026-07-15 — arms
        // previously had only the shared armOffsetX/Y above and a single
        // drag handle, no way to move/tilt one shoulder without the other).
        // Same conventions as the matching leg knobs: tilt is a render-only
        // angle bias (radians, wrestler-local, mirrored by facing), offsets
        // are unscaled px nudges on top of the shared armOffsetX/Y + the
        // fixed SHOULDER_STAGGER split.
        this._nearArmTilt = textures.nearArmTilt ?? 0;
        this._farArmOffsetX = textures.farArmOffsetX ?? 0;
        this._farArmOffsetY = textures.farArmOffsetY ?? 0;
        this._farArmTilt = textures.farArmTilt ?? null;
        // Forearm placement nudges — arms had no equivalent of the legs'
        // nearShinOffsetX/Y / farShinOffsetX/Y until now.
        this._nearForearmOffsetX = textures.nearForearmOffsetX ?? 0;
        this._nearForearmOffsetY = textures.nearForearmOffsetY ?? 0;
        this._farForearmOffsetX = textures.farForearmOffsetX ?? 0;
        this._farForearmOffsetY = textures.farForearmOffsetY ?? 0;
        // Per-character thigh nudge, unscaled px. Defaults to 0. Applied on
        // top of HIP_OVERLAP in updateUpright. legOffsetY: + = down (both
        // thighs). legOffsetX: + = toward facing/forward (near thigh only —
        // george.js's front thigh needed a forward nudge, 2026-07-12).
        this._legOffsetY = textures.legOffsetY ?? 0;
        this._legOffsetX = textures.legOffsetX ?? 0;
        // Near-thigh-only extra vertical nudge on top of legOffsetY, same
        // + = down convention (george.js's front leg needed to come up a
        // touch without moving the far leg, 2026-07-12).
        this._nearLegOffsetY = textures.nearLegOffsetY ?? 0;
        // Near-thigh-only render-angle bias, radians, wrestler-local
        // (mirrored by facing at render time — tune while facing right,
        // e.g. "5 o'clock to 5:30" = +15deg clockwise; the tuned value
        // itself is facing-independent). The true near.thighAng used for
        // the knee/IK chain is untouched. Fixed 2026-07-14: this used to be
        // applied screen-absolute, so a knee tuned correctly in one facing
        // detached in the other (see AI_HANDOFF.md).
        this._nearLegTilt = textures.nearLegTilt ?? 0;
        // Per-character near-shin nudge on top of the shared NEAR_SHIN_FWD/UP,
        // unscaled px, same +X = forward/+Y = down convention as the leg
        // offsets above (george.js, 2026-07-12).
        this._nearShinOffsetX = textures.nearShinOffsetX ?? 0;
        this._nearShinOffsetY = textures.nearShinOffsetY ?? 0;
        // Near-shin-only render-angle bias, same wrestler-local,
        // facing-mirrored convention as nearLegTilt above (e.g. "6 o'clock
        // to 7 o'clock" = -30deg, tuned while facing right). The true
        // near.shinAng used for the ankle/boot chain is untouched.
        this._nearShinTilt = textures.nearShinTilt ?? 0;
        // Far-shin render nudge, same +X = forward/+Y = down convention as
        // nearShinOffsetX/Y — the far shin previously had no per-character
        // knob, so a character whose thigh art is offset (thesz's legOffsetX)
        // had no way to keep the far knee's art aligned (2026-07-12).
        this._farShinOffsetX = textures.farShinOffsetX ?? 0;
        this._farShinOffsetY = textures.farShinOffsetY ?? 0;
        // Far-thigh render nudge + tilt, same conventions as legOffsetX/Y and
        // nearLegTilt. A character whose reference art shows the legs together
        // (thesz's New Lou full-body ref: the far leg is fully hidden behind
        // the near leg at rest) needs the far thigh's render offsets to equal
        // the near thigh's — the shared HIP_STAGGER/LEG_BACK_BIAS/FAR_LEG_*
        // constants deliberately stagger them apart. farLegTilt REPLACES
        // RIG.FAR_THIGH_TILT when set (null = global default); both are now
        // wrestler-local values mirrored by facing at render time (same
        // convention as nearLegTilt), so the two thighs' render angles can
        // be made identical at any facing. Fixed 2026-07-14: farLegTilt used
        // to bypass the facing mirror entirely when set (see AI_HANDOFF.md).
        this._farLegOffsetX = textures.farLegOffsetX ?? 0;
        this._farLegOffsetY = textures.farLegOffsetY ?? 0;
        this._farLegTilt = textures.farLegTilt ?? null;
        // rigProfile.sockets (2026-07-25, cohesive-body-rig-binding Phase C
        // slice — see COHESIVE_BODY_RIG_BLUEPRINT.md): optional, opt-in
        // { neck, nearShoulder, farShoulder } canvas-fraction anchors on the
        // torso texture (same { u, v } convention as distalAnchorFrac — see
        // its comment). When present, updateUpright roots the neck/shoulders
        // from these measured torso-relative points via _socketPoint instead
        // of the standalone SHOULDER_STAGGER + armOffsetX/Y + headOffsetX/Y
        // chain. Absent (every character/part before this existed) = that
        // chain runs exactly as before, byte-identical. George's and Thesz's
        // current sockets were derived algebraically from their existing
        // tuned offsets (not re-measured from ink), specifically so this
        // migration is a pure refactor — same rendered output, formalized
        // mechanism — not a new visual correction. Scoped to upright mode
        // and shoulders/neck only for this slice; hips and the grounded/
        // get-up torso rooting are unmigrated (see the socket derivation's
        // AI_HANDOFF.md entry for why hips don't fit this same simple model).
        this._torsoSockets = textures.rigProfile?.sockets ?? null;
        // faceLeftOverrides (2026-07-26, Derek's direct request after the
        // canonical-mirror approach still didn't read right on live review):
        // a second, independently-tuned set of values for facing < 0,
        // applied as-is rather than derived by mirroring the facing >= 0
        // config. Flat keys map to this same "_<key>" private-field
        // convention every other config value uses; rigProfile.sockets
        // entries patch this._torsoSockets by name. See updateUpright's
        // _withFaceLeftOverrides.
        this._faceLeftOverrides = textures.faceLeftOverrides ?? null;
        // _authoredLegRig (2026-07-25, George AI pilot focused correction —
        // see AI_HANDOFF_ENTRIES/2026-07-25-codex-george-ai-pilot-review.md
        // "Neutralize inherited FAR_THIGH_TILT, NEAR_SHIN_FWD/UP, and
        // NEAR_SHIN_SCALE through one opt-in authored-rig path"): reuses the
        // SAME opt-in as the dynamic-pelvis hip-socket mechanism (both
        // nearHip and farHip sockets present) rather than a separate config
        // flag — a character with authored hip sockets already declares its
        // own hip/knee geometry explicitly, so the legacy cosmetic
        // corrections built for the old shared-bone-length rig (staggering,
        // biasing, and rescaling legs that had no better source of truth)
        // no longer apply. George's and Thesz's rigProfile.sockets has no
        // hip entries, so this is false for both — every RIG.FAR_THIGH_TILT/
        // NEAR_SHIN_FWD/UP/SCALE use below stays exactly as before for them.
        this._authoredLegRig = !!(this._torsoSockets?.nearHip && this._torsoSockets?.farHip);
        // Per-character near-shin display scale, defaulting to the shared
        // NEAR_SHIN_SCALE (1.1). thesz sets 1.0: measured against the New Lou
        // reference, the 1.1 bump rendered his near shin ~24% wider than the
        // ref (the far shin, at 1.0, already matched) — and any near/far size
        // difference makes hiding the far leg behind the near one impossible.
        // Authored-leg-rig characters (both hip sockets present — see
        // _authoredLegRig above) default to 1 instead: this cosmetic bump was
        // built for the old shared-bone-length rig with no better source of
        // truth, and the pilot's uniform-scale box already renders both legs
        // at their measured real size.
        this._nearShinScale = textures.nearShinScale ?? (this._authoredLegRig ? 1 : RIG.NEAR_SHIN_SCALE);
        // Matching far-shin knob (2026-07-19) — see RIG.FAR_SHIN_SCALE.
        this._farShinScale = textures.farShinScale ?? RIG.FAR_SHIN_SCALE;
        // Matching far-thigh knob (2026-07-23) — see RIG.FAR_THIGH_SCALE.
        this._farThighScale = textures.farThighScale ?? RIG.FAR_THIGH_SCALE;
        // Per-character leg bone lengths, unscaled px, defaulting to the
        // shared P values (characters that don't set them are bit-identical
        // to the old behavior). These move the actual joint chain — hip
        // height, IK knee, ankle/mat contact — not just art boxes: thesz's
        // reference drawing has legs ~18% shorter relative to his torso than
        // the shared rig's stylized bones (2026-07-12). A character's shin
        // box height must be re-derived when shinH changes (sole-on-mat —
        // see the TEX comment above).
        this._thighH = textures.thighH ?? P.thighH;
        this._shinH  = textures.shinH  ?? P.shinH;
        this._parts = [
            this.farThigh, this.farShin, this.farBoot,
            this.farUpArm, this.farForearm,
            this.farHand,
            this.pelvisUnderlay, this.torso, this.trunks, this.pelvisOverlay, this.pelvisMask,
            this.nearThigh, this.nearShin, this.nearBoot,
            this.nearUpArm, this.nearForearm,
            this.nearHand,
            this.head,
        ].filter(Boolean);

        // Stable semantic slots are the runtime seam for expression and
        // move-specific art. Hands and boots are currently baked into the
        // forearm/shin, so a grip/fist/bent-foot variant replaces that whole
        // calibrated part while inheriting its anchors and display box.
        this._textureConfig = textures;
        this._partImages = {
            head: this._headIsImage ? this.head : null,
            torso: this.torso,
            pelvisOverlay: this.pelvisOverlay,
            pelvisUnderlay: this.pelvisUnderlay,
            pelvisMask: this.pelvisMask,
            nearUpperArm: this.nearUpArm,
            farUpperArm: this.farUpArm,
            nearForearm: this.nearForearm,
            farForearm: this.farForearm,
            nearHand: this.nearHand,
            farHand: this.farHand,
            nearThigh: this.nearThigh,
            farThigh: this.farThigh,
            nearShin: this.nearShin,
            farShin: this.farShin,
            nearBoot: nearBootEntry ? this.nearBoot : null,
            farBoot: farBootEntry ? this.farBoot : null,
        };
        this._partBaseDims = Object.fromEntries(
            Object.entries(this._partImages).map(([slot, image]) => [slot, image?._texDims ? { ...image._texDims } : null]),
        );
        this._partVariantState = {};
    }

    // Apply one complete appearance selection. Omitted slots reset to base,
    // which makes clip interruption/cleanup deterministic instead of leaving
    // a fist, grip, hurt face, or bent boot stranded on the wrestler.
    setPartVariants(selection = {}) {
        const resolved = resolvePartSelection(this._textureConfig, selection);
        for (const [slot, img] of Object.entries(this._partImages)) {
            if (!img) continue;
            const name = selection[slot] ?? 'base';
            if (this._partVariantState[slot] === name) continue;
            const entry = resolved[slot];
            const key = textureKey(entry);
            if (!key) continue;

            img.setTexture(key);
            if (slot !== 'head') {
                const meta = resolveTexEntry(entry, this._partBaseDims[slot]);
                img._texDims = meta.dims;
                img._pivotOffsetFrac = meta.pivot;
                img._jointPivotFrac = meta.jointPivotFrac;
                img._distalAnchorFrac = meta.distalAnchorFrac;
                img._soleAnchorFrac = meta.soleAnchorFrac;
                img._binding = meta.binding;
                img._semanticAnchors = meta.semanticAnchors;
                img._attachmentDisplayScale = meta.displayScale;
                img.setOrigin(0.5, meta.jointPivotFrac);
            }
            this._partVariantState[slot] = name;
        }
    }

    // Sub-depths enforce far→head→torso→near layering within a single wrestler
    // depth slot. Head sits behind torso (not in front, as it used to) so the
    // torso actually covers the cropped-off neck stub instead of just abutting
    // it — genuine overlap, not a butt-joint (Derek, 2026-07-12). Tradeoff:
    // the near arm (still ordered after torso) now also draws in front of the
    // head/face, which matters for headlock/sleeper/guard — see AI_HANDOFF if
    // that reads wrong and needs revisiting.
    setDepth(base) {
        // Far arm and far leg used to share depth `base`, so Phaser's stable
        // depth-sort fell back to display-list insertion order — the arm was
        // constructed after the leg, so it always drew on top, poking the far
        // hand through the trunks instead of tucking behind the far thigh
        // (Derek, 2026-07-15). Split into two bands so the far leg wins.
        // Parent cap draws over the child's authored overlap band. If the
        // forearm wins this tie, that band sweeps across the upper-arm end as
        // the elbow bends and the joint appears to drift. The tiny split is
        // contained inside each existing far/near depth band.
        this.farForearm.setDepth(base);
        this.farHand?.setDepth(base - 0.00001);
        this.farUpArm.setDepth(base + 0.00001);
        // A complete pelvis underbody sits behind both thighs and remains
        // visible only in the opening between them. The optional mask is a
        // separate front garment edge above both thigh roots. Legacy
        // pelvisOverlay keeps its historical middle depth unchanged.
        this.pelvisUnderlay?.setDepth(base + 0.00005);
        this.farThigh.setDepth(base + 0.0001);
        this.farShin.setDepth(base + 0.0001);
        this.farBoot?.setDepth(base + 0.0001);
        this.head.setDepth(base + 0.0005);
        this.torso.setDepth(base + 0.001);
        this.trunks?.setDepth(base + 0.002);
        // pelvisOverlay (george-ai-pilot only) sits below the near leg now —
        // Derek: "his near leg needs to stack on top of his trunks" — so it
        // still draws over the torso/trunks seam it was added for, but no
        // longer over the near thigh.
        this.pelvisOverlay?.setDepth(base + 0.0025);
        this.nearThigh.setDepth(base + 0.003);
        this.nearShin.setDepth(base + 0.003);
        this.nearBoot?.setDepth(base + 0.003);
        this.pelvisMask?.setDepth(base + 0.0035);
        this.nearHand?.setDepth(base + 0.00399);
        this.nearForearm.setDepth(base + 0.004);
        this.nearUpArm.setDepth(base + 0.00401);
    }

    setVisible(v) {
        this._parts.forEach(p => p.setVisible(v));
    }

    // Place a limb Image: pivot at top-center (origin 0.5, 0), rotated by angle.
    _place(img, px, py, w, h, angle) {
        img.setPosition(px, py)
           .setRotation(-angle)
           .setDisplaySize(Math.max(1, w), Math.max(1, h));
    }

    // Place a body part: textured parts (PNG art) swap in their art-derived
    // TEX display box and mirror horizontally for facing < 0 (all PNGs are
    // baked facing right, same convention as the head). Placeholder blocks
    // fall through to _place with the exact same args as always — the
    // stick-figure rendering path is untouched.
    //
    // pivotOffsetFrac correction (2026-07-15, opt-in, off by default): every
    // caller computes px,py assuming the art's ink is laterally centered in
    // its canvas at whichever edge visually matters (top edge for a part
    // whose own pivot reads as a joint, e.g. the shin at the knee; bottom
    // edge for a part whose far end reads as the next joint, e.g. the thigh
    // at the knee) — see tools/debug/knee_pivot_audit.mjs, which found this
    // false for Thesz's thigh (22.3% of canvas width off-center). When it
    // isn't, no fixed-px offset knob can fully correct it: those are tuned
    // at one pose and don't rotate with the limb, so they drift at every
    // other angle (the audit's own finding). This is the general fix:
    // inverting _endXY's transform for a known local lateral offset `lx`
    // shows the correction is the same regardless of which edge (top or
    // bottom) the offset was measured at — px -= lx*cos(angle), py +=
    // lx*sin(angle), derived by hand, not guessed. Absent (every character/
    // part as of this writing) = zero change, byte-identical render. This
    // does NOT replace the already-agreed fix for Thesz's specific thigh
    // crop (see AI_HANDOFF.md, 2026-07-15) — that's a real asset re-crop,
    // still pending Derek's approval, and remains the right call there. This
    // is for the next case where re-cropping isn't practical.
    // jointPivotFrac correction: `w`/`h` (the caller's box target) are always
    // the intended BELOW-pivot bone span — same meaning as before this knob
    // existed. When the origin sits inside the texture (jointPivotFrac > 0),
    // that span is only the fraction (1 - jointPivotFrac) of the full
    // display box, so the full box must be grown by 1/(1-jointPivotFrac) for
    // the below-pivot portion to still measure h. jointPivotFrac 0 (default)
    // divides by 1 — unchanged math, byte-identical to before.
    _placePart(img, px, py, w, h, angle, s, facing) {
        if (img._texDims) {
            img.setFlipX(facing < 0);
            if (img._pivotOffsetFrac) {
                const lx = facing * img._pivotOffsetFrac * img._texDims.w * s;
                px -= lx * Math.cos(angle);
                py += lx * Math.sin(angle);
            }
            const growth = 1 / (1 - (img._jointPivotFrac || 0));
            this._place(img, px, py, img._texDims.w * s * growth, img._texDims.h * s * growth, angle);
        } else {
            this._place(img, px, py, w, h, angle);
        }
    }

    // Production eight-part path. A part with explicit normalized proximal
    // and distal anchors is fitted to the authoritative world-space bone.
    // Both endpoints are therefore exact at every rotation and facing; art
    // overlap can extend freely on either side without changing the joint.
    _placeBoundPart(img, worldProximal, worldDistal, facing) {
        if (!img?._binding?.proximal || !img._binding.distal || !img._texDims) return null;
        const canvas = img._texDims;
        const toPixels = point => ({ x: point.u * canvas.w, y: point.v * canvas.h });
        const binding = solveTwoAnchorBinding({
            canvas,
            proximal: toPixels(img._binding.proximal),
            distal: toPixels(img._binding.distal),
            worldProximal,
            worldDistal,
            facing,
        });
        applyImageBinding(img, binding);
        img._lastBinding = binding;
        return binding;
    }

    _placeAttachment(img, worldAnchor, angle, scale, facing, semanticSlot) {
        if (!img?._binding?.proximal || !img._texDims) return null;
        const canvas = img._texDims;
        const proximal = {
            x: img._binding.proximal.u * canvas.w,
            y: img._binding.proximal.v * canvas.h,
        };
        const binding = solveAnchoredAttachment({
            canvas, anchor: proximal, worldAnchor, angle,
            scale: scale * (img._attachmentDisplayScale ?? 1), facing,
        });
        applyImageBinding(img, binding);
        img._lastBinding = binding;
        if (semanticSlot) {
            for (const [name, point] of Object.entries(img._semanticAnchors ?? {})) {
                const world = transformBoundPoint(binding, canvas, {
                    x: point.u * canvas.w,
                    y: point.v * canvas.h,
                }, facing);
                this.semanticAnchors ??= {};
                this.semanticAnchors[`${semanticSlot}.${name}`] = world;
            }
        }
        return binding;
    }

    _placeLimbPart(img, worldProximal, worldDistal, legacy) {
        const bound = this._placeBoundPart(img, worldProximal, worldDistal, legacy.facing);
        if (bound) return bound;
        this._placePart(img, legacy.x, legacy.y, legacy.w, legacy.h, legacy.angle, legacy.scale, legacy.facing);
        return null;
    }

    // Resolves the render position for a child limb
    // (upper-arm/forearm/thigh/shin)
    // whose pivot should connect to the parent's true joint point (jointX,
    // jointY). If the child's texture supplies an internal jointPivotFrac
    // (see the constructor's img() comment — the art's own alpha content
    // already extends past the joint), the pivot IS the joint: return it
    // directly, no correction needed. Otherwise, fall back to the technique
    // this file already used per-joint before 2026-07-21: pull the render
    // origin back up the bone by overlapPx along backoffAngle, so the
    // flat-capped texture's edge tucks toward the parent instead of leaving
    // a gap. Shared by updateUpright and _applyGrounded so both paths
    // resolve joint connectivity identically — previously _applyGrounded
    // didn't apply this correction at all, which is why a knee/elbow that
    // looked connected standing could pop open while getting up (see
    // AI_HANDOFF.md's 2026-07-19 Codex entries).
    _attachChild(childImg, jointX, jointY, backoffAngle, s, overlapPx) {
        if (childImg._jointPivotFrac) return { x: jointX, y: jointY };
        return this._end(jointX, jointY, -overlapPx * s, backoffAngle);
    }

    // Debug/verification seam for the all-joint attachment contract. Reports
    // how far the true joint sits inside the child's rectangular render box:
    // positive = covered, zero = a fragile butt-joint, negative = detached.
    // It intentionally measures the render contract rather than guessing at
    // character-specific source pixels; cutter verification separately proves
    // that authored joint rows contain opaque art.
    _recordJointAttachment(name, childImg, jointX, jointY, angle) {
        const dx = jointX - childImg.x;
        const dy = jointY - childImg.y;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
        const above = childImg.originY * childImg.displayHeight + localY;
        const below = (1 - childImg.originY) * childImg.displayHeight - localY;
        const side = childImg.displayWidth / 2 - Math.abs(localX);
        this.jointAttachmentMargins ??= {};
        this.jointAttachmentPoints ??= {};
        this.jointAttachmentMargins[name] = {
            above, below, side, min: Math.min(above, below, side),
        };
        this.jointAttachmentPoints[name] = { x: jointX, y: jointY };
    }

    // World-space endpoint (bottom) of a limb given its pivot and length.
    _end(px, py, h, angle) {
        return {
            x: px + Math.sin(angle) * h,
            y: py + Math.cos(angle) * h,
        };
    }

    // General local-to-world point transform for a rendered part: given a
    // point (lx, ly) in that part's own local space (origin at its top-center
    // pivot, +y toward the bottom edge, +x toward the facing/right side of the
    // unflipped source PNG), returns its world position under the same
    // position+rotation convention _place()/_end() already use. Verified
    // consistent with _end() at lx=0 (reduces to the same formula). Originally
    // diagnostic-only; also used by _trueDistalEnd below (2026-07-25) since
    // that's the same local->world point transform a lateral distal-anchor
    // correction needs.
    _endXY(px, py, lx, ly, angle) {
        return {
            x: px + lx * Math.cos(angle) + ly * Math.sin(angle),
            y: py - lx * Math.sin(angle) + ly * Math.cos(angle),
        };
    }

    // True distal joint of a parent limb — where a child should attach.
    // Defaults to _end() (bone-axis endpoint at the caller's generic bone
    // length, byte-identical to every part before this existed). When the
    // image carries distalAnchorFrac (its painted distal joint measured off
    // the generic bone-length assumption — see resolveTexEntry's comment),
    // both axes are recomputed from the image's own actual display box
    // instead: lx from how far off-center the ink sits, ly from how far down
    // the box the ink actually ends (which need not match the shared bone-
    // length constant `len` was derived from). Does not touch the parent's
    // own render position/rotation. `s` must be the parent's ACTUAL render
    // scale (including e.g. FAR_ARM_SCALE) so both terms match its real
    // display box.
    _trueDistalEnd(img, px, py, len, angle, s, facing) {
        const anchor = img._distalAnchorFrac;
        if (!anchor) return this._end(px, py, len, angle);
        return this._socketPoint(img, anchor.u, anchor.v, px, py, angle, s, facing);
    }

    // World position of a { u, v } canvas-fraction point on `img` (same
    // convention as distalAnchorFrac — see resolveTexEntry's comment),
    // given the part's actual current render position/angle/scale. Used for
    // rigProfile.sockets (torso-owned shoulder/neck/hip anchors — see the
    // constructor's _torsoSockets comment) and by _trueDistalEnd above. No
    // fallback: only called when a socket/anchor is already known to exist.
    // jointPivotFrac-aware (2026-07-25, Codex review correctness fix — see
    // _trueDistalEnd's prior version): `u,v` are canvas-absolute fractions
    // (0 = top/left edge, 1 = bottom/right edge), but the image's actual
    // origin sits at jointPivotFrac down the (grown) canvas, not at row 0 —
    // same growth/offset math _trueDistalEnd used to apply inline. No
    // current torso socket combines with a nonzero jointPivotFrac (the
    // torso never sets one), so growth=1 there — byte-identical to the
    // prior non-growth-aware version for every existing torso-socket call.
    _socketPoint(img, u, v, px, py, angle, s, facing) {
        // Mirror _placePart's own pivotOffsetFrac correction on px/py before
        // deriving a local anchor point from them (2026-07-26, found via
        // elbow_anchor_sweep.mjs going from 0.000px to 1.18-1.39px the moment
        // george-ai-pilot-v8's upperArm first combined pivotOffsetFrac with
        // its existing distalAnchorFrac). Without this, _socketPoint/
        // _trueDistalEnd computed the distal/socket point from the part's
        // PRE-correction render origin while _placePart actually draws the
        // image shifted by `lx`, so any part with both knobs set drifted by
        // exactly that shift. No part combined the two before this pass.
        // Absent pivotOffsetFrac (every part before this) = zero change,
        // byte-identical to the prior version.
        if (img._pivotOffsetFrac) {
            const lx0 = facing * img._pivotOffsetFrac * img._texDims.w * s;
            px -= lx0 * Math.cos(angle);
            py += lx0 * Math.sin(angle);
        }
        const jointPivotFrac = img._jointPivotFrac || 0;
        const growth = 1 / (1 - jointPivotFrac);
        const dw = img._texDims.w * s * growth;
        const dh = img._texDims.h * s * growth;
        const lx = facing * (u - 0.5) * dw;
        const ly = (v - jointPivotFrac) * dh;
        return this._endXY(px, py, lx, ly, angle);
    }

    // Local-space vector from an image's render origin to an authored
    // canvas-fraction point, using the exact growth/flip convention shared
    // by _socketPoint. Keeping this as a vector lets gait IK target a baked
    // painted sole directly instead of approximating it with a static
    // vertical ankle-to-mat scalar.
    _anchorVector(img, anchor, s, facing) {
        const jointPivotFrac = img._jointPivotFrac || 0;
        const growth = 1 / (1 - jointPivotFrac);
        const dw = img._texDims.w * s * growth;
        const dh = img._texDims.h * s * growth;
        return {
            x: facing * (anchor.u - 0.5) * dw,
            y: (anchor.v - jointPivotFrac) * dh,
        };
    }

    // Inverse of _socketPoint: solves the torso's own render origin (the
    // px,py normally handed to _placePart) so that the torso's measured
    // near/far-hip socket MIDPOINT lands exactly on `pelvisX, pelvisY` — the
    // authoritative dynamic-pelvis target (x/hipY upright, hipX/hipY
    // grounded) — under the torso's actual rotation/scale/facing, instead of
    // the fixed torsoH bone-length walk every character used before this
    // (see Sprite sheets/AI Pilot/George/CLAUDE_INTEGRATION_HANDOFF.md's
    // "Hip-socket design for this pilot"). This is a genuine affine inverse
    // (derived by hand, verified against _socketPoint's forward transform at
    // lx=ly=0), not a screen-space nudge: calling _socketPoint on this
    // result with the same (u,v) midpoint reproduces (pelvisX, pelvisY)
    // exactly. Only called when a character supplies both rigProfile
    // nearHip and farHip sockets (opt-in — see each call site's guard); no
    // shipped character does yet, so this path is unexercised for George/
    // Thesz and their torso origin keeps using the legacy walk untouched.
    _solveTorsoOrigin(pelvisX, pelvisY, angle, s, facing) {
        const sockets = this._torsoSockets;
        const dw = this.torso._texDims.w * s;
        const dh = this.torso._texDims.h * s;
        const midU = (sockets.nearHip.u + sockets.farHip.u) / 2;
        const midV = (sockets.nearHip.v + sockets.farHip.v) / 2;
        const lx = facing * (midU - 0.5) * dw;
        const ly = midV * dh;
        return this._endXY(pelvisX, pelvisY, -lx, -ly, angle);
    }

    // 2026-07-26 (promoted-george "egor" fix): the authored-sole/dynamic-
    // pelvis FK math below (particularly _solveTorsoOrigin's near/far
    // hip-height averaging in the pose-driven branch) does not reproduce a
    // true mirror image at facing < 0 when the standing pose itself is
    // left/right-asymmetric — George's own powerIdle (lLeg: -0.18, rLeg:
    // 0.13) is exactly that. Verified empirically, not guessed: George at
    // facing -1 read visibly hunched ("egor") while a genuine pixel-level
    // mirror of the identical facing +1 render looked correct — proving the
    // asymmetry is in this file's math, not the art or config. A dumped
    // joint comparison confirmed torso/shoulder/hip sockets mirror exactly
    // (0.000px) but the FK-derived knees/elbows do not (~9.5px/~2px). Rather
    // than chase the exact term across several hundred lines of interacting
    // facing-multiplied and near/far-swapped formulas, this wrapper computes
    // the WHOLE body as if facing were +1 (the orientation already proven
    // correct) and mirrors the fully-assembled result with one well-understood
    // transform (_mirrorUpright) — robust regardless of which upstream
    // formula isn't perfectly facing-symmetric. Opt-in and scoped tightly:
    // only characters declaring both hip sockets (_authoredLegRig) take this
    // path, and only at facing < 0; every other character (thesz, any
    // future non-authored-leg-rig character, and george itself at facing
    // >= 0) runs _updateUprightCore directly, byte-identical to before this
    // wrapper existed.
    updateUpright(x, y, s, facing, pose, walkPhase, combatBlend = 0, lean = 0, moveBlend = 0, liftScale = 1, runBlend = 0) {
        // faceLeftOverrides takes priority over the canonical-mirror trick
        // below: Derek tuned these numbers directly against the facing < 0
        // render itself (rig-tuner's "face left" toggle), so they're applied
        // as-is, at the real requested facing, not derived by mirroring.
        if (facing < 0 && this._faceLeftOverrides) {
            this._withFaceLeftOverrides(() => {
                this._updateUprightCore(x, y, s, facing, pose, walkPhase, combatBlend, lean, moveBlend, liftScale, runBlend);
            });
            return;
        }
        if (this._authoredLegRig && facing < 0) {
            this._updateUprightCore(x, y, s, 1, pose, walkPhase, combatBlend, lean, moveBlend, liftScale, runBlend);
            this._mirrorUpright(x);
            return;
        }
        this._updateUprightCore(x, y, s, facing, pose, walkPhase, combatBlend, lean, moveBlend, liftScale, runBlend);
    }

    // Temporarily patches this._<key> private fields (and this._torsoSockets
    // entries) to the faceLeftOverrides values for the duration of `fn`, then
    // restores the facing>=0 values — so the SAME skeleton instance still
    // renders correctly if it's ever asked for facing>=0 later (rig-tuner's
    // toggle, or a wrestler that turns around mid-match).
    _withFaceLeftOverrides(fn) {
        const o = this._faceLeftOverrides;
        const snapshot = {};
        for (const key of Object.keys(o)) {
            if (key === 'rigProfile') continue;
            snapshot[key] = this['_' + key];
            this['_' + key] = o[key];
        }
        let socketsSnapshot = null;
        if (o.rigProfile?.sockets) {
            socketsSnapshot = { ...this._torsoSockets };
            Object.assign(this._torsoSockets, o.rigProfile.sockets);
        }
        try {
            fn();
        } finally {
            for (const key of Object.keys(snapshot)) this['_' + key] = snapshot[key];
            if (socketsSnapshot) this._torsoSockets = socketsSnapshot;
        }
    }

    // Mirrors the fully-assembled canonical (facing=1) render about the
    // wrestler's own world x — see updateUpright's comment above for why.
    // A horizontal reflection: negate each part's x offset from the mirror
    // line, negate its rotation, and toggle flipX (the standard sprite-
    // mirroring trick — flipX alone would show canonical poses backwards
    // without also negating rotation, and rotation alone would leave every
    // part's own texture unflipped).
    _mirrorUpright(x) {
        const mirrorImg = img => {
            if (!img) return;
            img.x = 2 * x - img.x;
            img.rotation = -img.rotation;
            img.flipX = !img.flipX;
            // Every limb part uses a symmetric origin (0.5, ...), where
            // 1 - originX is a no-op — but the head's origin comes from
            // headAnchorFrac (opt-in, off-center: u=0.588 for George), which
            // pins the anchor to a specific FEATURE of the art (the neck),
            // not the quad's center. flipX mirrors the drawn pixels but never
            // touches origin, so without this the anchor stays glued to the
            // same quad-fraction while the art underneath it flips — the
            // anchor point ends up sampling a different part of the (now
            // mirrored) head art than the neck, reading as a displaced head.
            // Mirroring originX alongside the flip keeps it locked to the
            // same art feature. Found live ("his head is off") after the
            // initial version of this fix shipped only x/rotation/flipX.
            if (img.originX !== undefined) img.originX = 1 - img.originX;
        };
        for (const img of [
            this.torso, this.pelvisUnderlay, this.pelvisOverlay, this.pelvisMask, this.head,
            this.nearUpArm, this.farUpArm, this.nearForearm, this.farForearm,
            this.nearHand, this.farHand,
            this.nearThigh, this.farThigh, this.nearShin, this.farShin,
            this.nearBoot, this.farBoot,
        ]) mirrorImg(img);

        const mirrorPoint = p => { if (p) p.x = 2 * x - p.x; };
        mirrorPoint(this.nearFoot);
        mirrorPoint(this.farFoot);
        mirrorPoint(this.nearKneeDebug);
        mirrorPoint(this.farKneeDebug);
        for (const dbg of [this.nearThighRenderDebug, this.farThighRenderDebug, this.nearShinRenderDebug, this.farShinRenderDebug]) {
            if (!dbg) continue;
            dbg.x = 2 * x - dbg.x;
            dbg.angle = -dbg.angle;
            dbg.facing = -dbg.facing;
        }
        for (const name of Object.keys(this.jointAttachmentPoints ?? {})) {
            this.jointAttachmentPoints[name].x = 2 * x - this.jointAttachmentPoints[name].x;
        }
        for (const name of Object.keys(this.semanticAnchors ?? {})) {
            this.semanticAnchors[name].x = 2 * x - this.semanticAnchors[name].x;
        }
    }

    // Record the joint relationship this frame is actually drawing, in the same
    // units a pose channel would supply it: local flex for lElbow/rElbow/lKnee/
    // rKnee, and the absolute pose-convention angle for the legacy lForearm/
    // rForearm/lShin/rShin. For elbows this is captured at the pose-input seam,
    // before combat-guard/run/display adjustments. Those downstream adjustments
    // still compose identically after a seed; recording the final image angle as
    // an input would apply them twice on the next frame.
    //
    // Wrestler.tweenPose reads this to seed a channel the live pose has never
    // carried, so the first articulation of that joint tweens from where the
    // limb already is instead of snapping to its destination.
    //
    // `facing` is the one this core pass is evaluating with, which is not always
    // the wrestler's facing: the mirrored path renders at facing 1 and flips
    // afterwards. That is correct here — local flex is facing-independent by
    // construction, and the legacy absolute value is stored the way this same
    // skeleton will consume it.
    _recordJointState(kind, side, parentAngle, childAngle, facing) {
        if (!Number.isFinite(parentAngle) || !Number.isFinite(childAngle)) return;
        const state = this._jointState ??= {};
        if (kind === 'elbow') {
            state[`${side}Elbow`]   = localFlexFromChildAngle(parentAngle, childAngle, facing, 'elbow');
            state[`${side}Forearm`] = childAngle * facing;
        } else {
            state[`${side}Knee`] = localFlexFromChildAngle(parentAngle, childAngle, facing, 'knee');
            state[`${side}Shin`] = childAngle * facing;
        }
    }

    /**
     * The value a pose channel would need to hold to reproduce the joint
     * relationship currently on screen. Undefined before the first render.
     */
    currentPoseChannel(channel) {
        return this._jointState?.[channel];
    }

    // Pose-channel seeds are meaningful only for the last upright render.
    // Wrestler.draw clears them before choosing its render path; updateUpright
    // repopulates them, while grounded/airborne/procedural silhouettes leave
    // them unavailable so a later tween cannot seed from stale standing data.
    invalidatePoseChannels() {
        this._jointState = null;
    }

    _updateUprightCore(x, y, s, facing, pose, walkPhase, combatBlend = 0, lean = 0, moveBlend = 0, liftScale = 1, runBlend = 0) {
        this.jointAttachmentMargins = {};
        this.jointAttachmentPoints = {};
        const thighH    = this._thighH * s;
        const shinH     = this._shinH  * s;
        const bootH     = P.bootH     * s;
        const legW      = P.legW      * s;
        const upperArmH = P.upperArmH * s;
        const forearmH  = P.forearmH  * s;
        const armW      = P.armW      * s;
        const torsoH    = P.torsoH    * s;
        const torsoW    = P.torsoW    * s;
        const trunksH   = P.trunksH   * s;
        const headR     = P.headR     * s;

        const sinWP = Math.sin(walkPhase);
        const swing = facing * sinWP;

        // Use the procedural foot-locking gait for walking and plain idle. When a move
        // poses the legs (slam, lockup, sleeper, etc.) and the wrestler is essentially
        // stationary, fall back to the original pose-driven FK so those moves are untouched.
        const poseLegActive = Math.abs(pose.lLeg) + Math.abs(pose.rLeg) > 0.05;
        const useGait = moveBlend > 0.2 || !poseLegActive;

        // ── Hip height ──────────────────────────────────────────────────────────
        // In gait mode the hip rides on whichever leg is bearing weight, so the body
        // bob EMERGES from leg geometry instead of being a bolted-on sine. The hip can
        // never be higher than a planted (near-straight) leg allows: H = min(reach_i).
        const legLen     = thighH + shinH;       // hip → ankle chain
        const authoredSoles = !!(this._authoredLegRig && this.nearShin._soleAnchorFrac && this.farShin._soleAnchorFrac);
        const modularSoles = !!(this.nearBoot?._binding?.proximal && this.nearBoot?._semanticAnchors?.sole
            && this.farBoot?._binding?.proximal && this.farBoot?._semanticAnchors?.sole);
        // Legacy ankle target. Authored-sole rigs bypass it below and solve
        // their painted knee-to-sole vector directly.
        const ankleRest  = bootH * 0.9;
        const ankleGndY  = y - ankleRest;
        const LMAX       = legLen * 0.985;        // never fully lock the knee

        const footA = footGait(walkPhase);
        const footB = footGait(walkPhase + Math.PI);

        // Crouch: pose-driven knee bend — hip drops by the vertical extent the
        // bent legs lose, so feet stay planted at the mat.
        const crouch = pose.crouch ?? 0;
        const cThigh = crouch * 0.85; // thigh rotates forward
        const cShin  = crouch * 0.75; // shin rotates back under the body

        let hipY;
        if (useGait) {
            let hipYwalk, hipYstand;
            if (authoredSoles) {
                // The baked pilot boot's sole is lateral to the shin axis,
                // so its vertical ankle-to-sole span changes with shin
                // angle. Treat the measured knee-to-sole vector as the
                // actual second IK link and derive hip height from that same
                // reach. Hip socket offsets are included so neither side is
                // silently overextended by the torso's 3/4-view pelvis.
                const nearSole = this._anchorVector(this.nearShin, this.nearShin._soleAnchorFrac, s * this._nearShinScale, facing);
                const farSole = this._anchorVector(this.farShin, this.farShin._soleAnchorFrac, s * this._farShinScale, facing);
                const sockets = this._torsoSockets;
                const midU = (sockets.nearHip.u + sockets.farHip.u) / 2;
                const midV = (sockets.nearHip.v + sockets.farHip.v) / 2;
                const torsoDW = this.torso._texDims.w * s;
                const torsoDH = this.torso._texDims.h * s;
                const hipOffset = socket => ({
                    x: facing * (socket.u - midU) * torsoDW,
                    y: (socket.v - midV) * torsoDH,
                });
                const nearHipOffset = hipOffset(sockets.nearHip);
                const farHipOffset = hipOffset(sockets.farHip);
                const nearMax = (thighH + Math.hypot(nearSole.x, nearSole.y)) * 0.985;
                const farMax = (thighH + Math.hypot(farSole.x, farSole.y)) * 0.985;
                const dxA = facing * footA.fx * s - nearHipOffset.x;
                const dxB = facing * footB.fx * s - farHipOffset.x;
                const reachA = Math.sqrt(Math.max(0, nearMax * nearMax - dxA * dxA));
                const reachB = Math.sqrt(Math.max(0, farMax * farMax - dxB * dxB));
                hipYwalk = Math.max(y - nearHipOffset.y - reachA, y - farHipOffset.y - reachB);
                hipYstand = Math.max(
                    y - nearHipOffset.y - nearMax * 0.99,
                    y - farHipOffset.y - farMax * 0.99,
                );
            } else {
                const dxA = footA.fx * s, dxB = footB.fx * s;
                const reachA = Math.sqrt(Math.max(0, LMAX * LMAX - dxA * dxA));
                const reachB = Math.sqrt(Math.max(0, LMAX * LMAX - dxB * dxB));
                hipYwalk = ankleGndY - Math.min(reachA, reachB);
                hipYstand = ankleGndY - LMAX * 0.99;
            }
            hipY = hipYstand + (hipYwalk - hipYstand) * Math.min(1, moveBlend);
            hipY += crouch * legLen * 0.22; // milder while moving; IK bends the knees
        } else {
            // Pose-driven FK branch (idle and most authored poses — see
            // useGait above).
            if (authoredSoles) {
                // Pose-driven FK has no ankle target to correct after the
                // fact, but all joint angles are already known here. Solve
                // the shared pelvis translation directly from the two
                // transformed painted sole points; their midpoint is the
                // minimax translation when the authored stance gives the
                // two sides slightly different vertical extents.
                const MAX_LEG = 0.38, KNEE_BEND = 0.22;
                const lThigh = facing * (pose.lLeg + cThigh) + swing * MAX_LEG;
                const rThigh = facing * (pose.rLeg + cThigh) - swing * MAX_LEG;
                const lShin = pose.lKnee !== undefined
                    ? childAngleFromLocalFlex(lThigh, pose.lKnee, facing, 'knee')
                    : pose.lShin !== undefined ? facing * pose.lShin : lThigh - facing * (sinWP * KNEE_BEND + cThigh + cShin);
                const rShin = pose.rKnee !== undefined
                    ? childAngleFromLocalFlex(rThigh, pose.rKnee, facing, 'knee')
                    : pose.rShin !== undefined ? facing * pose.rShin : rThigh + facing * (sinWP * KNEE_BEND - cThigh - cShin);
                this._recordJointState('knee', 'l', lThigh, lShin, facing);
                this._recordJointState('knee', 'r', rThigh, rShin, facing);
                const [farThighAng, farShinAng, nearThighAng, nearShinAng] = facing >= 0
                    ? [rThigh, rShin, lThigh, lShin]
                    : [lThigh, lShin, rThigh, rShin];
                const sockets = this._torsoSockets;
                const midV = (sockets.nearHip.v + sockets.farHip.v) / 2;
                const torsoDH = this.torso._texDims.h * s;
                const requiredHipY = (side, thighAng, shinAng, thighImg, shinImg, thighScale, shinScale) => {
                    const hipOffsetY = (sockets[`${side}Hip`].v - midV) * torsoDH;
                    const thighVector = this._anchorVector(thighImg, thighImg._distalAnchorFrac, thighScale, facing);
                    const soleVector = this._anchorVector(shinImg, shinImg._soleAnchorFrac, shinScale, facing);
                    const thighDrop = -thighVector.x * Math.sin(thighAng) + thighVector.y * Math.cos(thighAng);
                    const soleDrop = -soleVector.x * Math.sin(shinAng) + soleVector.y * Math.cos(shinAng);
                    return y - hipOffsetY - thighDrop - soleDrop;
                };
                const farRequired = requiredHipY('far', farThighAng, farShinAng, this.farThigh, this.farShin, s * this._farThighScale, s * this._farShinScale);
                const nearRequired = requiredHipY('near', nearThighAng, nearShinAng, this.nearThigh, this.nearShin, s, s * this._nearShinScale);
                hipY = (farRequired + nearRequired) / 2;
            } else {
                hipY = y - bootH - (thighH * Math.cos(cThigh) + shinH * Math.cos(cShin));
            }
        }

        const torsoTop  = hipY - torsoH;
        const shoulderY = torsoTop + 12 * s; // arm pivot slightly below torso top
        // Shoulder pivot is pinned to the same x as the torso/hip below it — the
        // torso image is a rigid, non-rotating block anchored at x (see below), so
        // any separate horizontal shift here (previously a sin(lean) drift meant to
        // suggest forward lean) pulls the arm/head pivot off the torso instead of
        // pitching it, reading as the shoulders floating loose of the body.
        const shoulderX = x;

        const MAX_ARM = 0.26;

        // Walk gets a wider swing arc; run stays controlled (fades out as runBlend rises).
        const walkSwing = 1 - runBlend;
        const armSwing  = MAX_ARM * (1 + runBlend * 0.35 + walkSwing * 0.50);
        let lArmAng = facing * pose.lArm - swing * armSwing;
        let rArmAng = facing * pose.rArm + swing * armSwing;
        // Walk: mild arm-tracking so forearm swings back with the arm and folds
        // slightly inward on the upswing — run elbow code below overrides at runBlend→1.
        // Keep the default elbow as a real hinge: forearm angle is the upper
        // arm angle plus a stable relative bend. The old `arm * 1.1 + .52`
        // relationship slowly changed the joint angle while the shoulder
        // moved, which made the overlapping artwork look as though it slid
        // around the elbow; its ~30deg baseline also read almost straight at
        // game scale. About 40deg remains relaxed but makes the split clear
        // while staying inside Lou's narrower authored elbow overlap at the
        // most extreme overhead pose.
        const FOREARM_BEND = 0.70;
        // Optional per-pose elbow override (pose.lForearm/rForearm, skeleton-
        // convention absolute angle) — lets a pose set the elbow bend
        // independent of the shoulder instead of always inheriting this
        // derived relationship. undefined (every pose before 2026-07-15)
        // preserves the old formula exactly. Combat/run blends and ARM_FWD
        // below still apply on top either way, so an authored elbow angle
        // still composes with guard/run state.
        let lForearmAng = pose.lElbow !== undefined
            ? childAngleFromLocalFlex(lArmAng, pose.lElbow, facing, 'elbow')
            : pose.lForearm !== undefined ? facing * pose.lForearm : lArmAng + facing * FOREARM_BEND;
        let rForearmAng = pose.rElbow !== undefined
            ? childAngleFromLocalFlex(rArmAng, pose.rElbow, facing, 'elbow')
            : pose.rForearm !== undefined ? facing * pose.rForearm : rArmAng + facing * FOREARM_BEND;
        // Captured before the guard/run/ARM_FWD adjustments below, so a seeded
        // value reproduces this same elbow relationship.
        this._recordJointState('elbow', 'l', lArmAng, lForearmAng, facing);
        this._recordJointState('elbow', 'r', rArmAng, rForearmAng, facing);

        // Combat-ready guard: arms come up and forward as opponents close in.
        if (combatBlend > 0) {
            const GUARD_UPPER = facing * 0.60;
            const GUARD_FORE  = facing * 1.50;
            const b = combatBlend;
            lArmAng = lArmAng + (GUARD_UPPER - lArmAng) * b;
            rArmAng = rArmAng + (GUARD_UPPER - rArmAng) * b;
            lForearmAng = lForearmAng + (GUARD_FORE - lForearmAng) * b;
            rForearmAng = rForearmAng + (GUARD_FORE - rForearmAng) * b;
        }

        // Running: forearm folds forward on the upswing, swings back on the backstroke.
        // The lArmAng * 0.7 term lets the forearm track the arm's backward travel so
        // it doesn't always stay in front.
        if (runBlend > 0) {
            const RUN_ELBOW = Math.PI * 0.13;
            lForearmAng += (lArmAng * 2.3 + facing * RUN_ELBOW - lForearmAng) * runBlend;
            rForearmAng += (rArmAng * 2.3 + facing * RUN_ELBOW - rForearmAng) * runBlend;
        }

        // Arms hang slightly in front of the centerline — breaks mirror symmetry.
        const ARM_FWD = facing * 0.09;
        lArmAng     += ARM_FWD;
        rArmAng     += ARM_FWD;
        lForearmAng += ARM_FWD;
        rForearmAng += ARM_FWD;

        const [farAA, farFA, nearAA, nearFA] =
            facing >= 0
                ? [rArmAng, rForearmAng, lArmAng, lForearmAng]
                : [lArmAng, lForearmAng, rArmAng, rForearmAng];

        // Torso origin + hip sockets (2026-07-25, George AI pilot — dynamic
        // pelvis design, see Sprite sheets/AI Pilot/George/
        // CLAUDE_INTEGRATION_HANDOFF.md's "Hip-socket design for this
        // pilot"): optional, opt-in — when a character's rigProfile supplies
        // BOTH nearHip and farHip sockets, the torso's render origin is
        // solved (_solveTorsoOrigin) so its measured hip-socket midpoint
        // lands exactly on the authoritative pelvis target (x, hipY) instead
        // of the fixed torsoH bone-length walk below, and each leg's true
        // hip root becomes that socket's own world point instead of the
        // shared (x, hipY) every character used before this — legs hang from
        // the torso art itself. torsoOriginX/Y replace every `x`/`torsoTop`
        // use below that positions the torso or something socket-rooted on
        // it (torso placement, shoulder sockets, neck socket); they default
        // to exactly (x, torsoTop) — byte-identical — when hip sockets are
        // absent, which is every character as of this writing (George's and
        // Thesz's current rigProfile.sockets has neck/nearShoulder/
        // farShoulder only).
        let torsoOriginX = x, torsoOriginY = torsoTop;
        let nearHipPoint = null, farHipPoint = null;
        if (this._torsoSockets?.nearHip && this._torsoSockets?.farHip) {
            const origin = this._solveTorsoOrigin(x, hipY, 0, s, facing);
            torsoOriginX = origin.x;
            torsoOriginY = origin.y;
            nearHipPoint = this._socketPoint(this.torso, this._torsoSockets.nearHip.u, this._torsoSockets.nearHip.v, torsoOriginX, torsoOriginY, 0, s, facing);
            farHipPoint  = this._socketPoint(this.torso, this._torsoSockets.farHip.u,  this._torsoSockets.farHip.v,  torsoOriginX, torsoOriginY, 0, s, facing);
        }

        // ── Legs ────────────────────────────────────────────────────────────────
        let far, near;
        if (useGait) {
            // Two feet half a cycle apart, knees solved by IK. A=near, B=far.
            far  = this._gaitLeg(footB, facing, x, hipY, authoredSoles || modularSoles ? y : ankleGndY, thighH, shinH, s, liftScale, farHipPoint, authoredSoles ? this.farShin : null, s * this._farShinScale, modularSoles ? this.farBoot : null);
            near = this._gaitLeg(footA, facing, x, hipY, authoredSoles || modularSoles ? y : ankleGndY, thighH, shinH, s, liftScale, nearHipPoint, authoredSoles ? this.nearShin : null, s * this._nearShinScale, modularSoles ? this.nearBoot : null);
        } else {
            // Original pose-driven FK (move stances). Preserves the facing-based
            // far/near mapping and per-leg swing alternation exactly as before.
            const MAX_LEG = 0.38, KNEE_BEND = 0.22;
            const lLegAng = facing * (pose.lLeg + cThigh) + swing * MAX_LEG;
            const rLegAng = facing * (pose.rLeg + cThigh) - swing * MAX_LEG;
            // Optional per-pose knee override (pose.lShin/rShin, same
            // convention as lForearm/rForearm above) — pose-driven FK only;
            // the gait/walking IK branch above is untouched by design, it's
            // procedural and shouldn't be hijacked pose-by-pose.
            const lShinAng = pose.lKnee !== undefined
                ? childAngleFromLocalFlex(lLegAng, pose.lKnee, facing, 'knee')
                : pose.lShin !== undefined ? facing * pose.lShin : lLegAng - facing * (sinWP * KNEE_BEND + cThigh + cShin);
            const rShinAng = pose.rKnee !== undefined
                ? childAngleFromLocalFlex(rLegAng, pose.rKnee, facing, 'knee')
                : pose.rShin !== undefined ? facing * pose.rShin : rLegAng + facing * (sinWP * KNEE_BEND - cThigh - cShin);
            this._recordJointState('knee', 'l', lLegAng, lShinAng, facing);
            this._recordJointState('knee', 'r', rLegAng, rShinAng, facing);
            const farPlant  = Math.max(0,  sinWP * facing);
            const nearPlant = Math.max(0, -sinWP * facing);
            const mk = (t, sh, plant, hipPoint) => ({
                hx: hipPoint ? hipPoint.x : x, hy: hipPoint ? hipPoint.y : hipY, thighAng: t, shinAng: sh,
                // Boots stay flat through a crouch — drop the crouch shin
                // rotation before scaling, or toes point skyward when kneeling
                bootAng: (sh + facing * (cThigh + cShin)) * Math.max(0.25, 1 - plant * 0.75),
            });
            if (facing >= 0) {
                far  = mk(rLegAng, rShinAng, farPlant, farHipPoint);
                near = mk(lLegAng, lShinAng, nearPlant, nearHipPoint);
            } else {
                far  = mk(lLegAng, lShinAng, farPlant, farHipPoint);
                near = mk(rLegAng, rShinAng, nearPlant, nearHipPoint);
            }
        }

        // Far leg — drawn first (behind torso). Thigh's render origin is
        // pulled up into the torso/trunks by HIP_OVERLAP (TEX.thigh.h grew
        // by the same amount) so the hip joint tucks under the trunks
        // instead of floating below them; staggered slightly ahead of the
        // near thigh (3/4 depth, like SHOULDER_STAGGER) and both pulled back
        // by LEG_BACK_BIAS since the wider thigh art read too far forward of
        // the body. legOffsetY is a per-character vertical nudge (george.js).
        // The true hip point (far.hx/hy) and far.thighAng stay the knee/IK
        // anchor, untouched — farRenderAng only biases how the far thigh's
        // image itself is drawn (FAR_THIGH_TILT).
        const farRenderAng = far.thighAng + facing * (this._farLegTilt ?? (this._authoredLegRig ? 0 : RIG.FAR_THIGH_TILT));
        const farHipRender = this._attachChild(this.farThigh, far.hx, far.hy, farRenderAng, s, RIG.HIP_OVERLAP);
        // Hip-socket path (farHipPoint set): render exactly at the socket —
        // jointPivotFrac already supplies the thigh's hidden proximal
        // overlap (see the constructor's img() comment), so none of the
        // legacy stagger/bias/offset knobs apply here (the pilot's own
        // contract: "do not reintroduce HIP_STAGGER, LEG_BACK_BIAS, or
        // per-part X/Y compensation on the pilot path").
        if (!farHipPoint) {
            farHipRender.x += facing * (RIG.HIP_STAGGER - RIG.LEG_BACK_BIAS + RIG.FAR_LEG_FWD + this._farLegOffsetX) * s;
            farHipRender.y += (this._legOffsetY - RIG.FAR_LEG_UP + this._farLegOffsetY) * s;
        }
        const farKnee  = this._end(far.hx, far.hy, thighH, far.thighAng);
        this._placeLimbPart(this.farThigh, { x: far.hx, y: far.hy }, farKnee, {
            x: farHipRender.x, y: farHipRender.y, w: legW, h: thighH,
            angle: farRenderAng, scale: s * this._farThighScale, facing,
        });
        this._recordJointAttachment('farHip', this.farThigh, far.hx, far.hy, this.farThigh._binding ? far.thighAng : farRenderAng);
        // Painted-knee routing (2026-07-25, Codex review — "route the
        // thigh's declared distalAnchorFrac through the upright and grounded
        // knee calculation"): when the thigh declares a distalAnchorFrac,
        // the shin attaches to the thigh's own ACTUAL rendered/painted knee
        // point (via the thigh's real render transform: farHipRender/
        // farRenderAng, exactly the args just handed to _placePart above)
        // instead of the generic bone-length farKnee. farKnee itself stays
        // the pure geometric IK joint used below for the ankle/foot chain
        // and farKneeDebug — foot-planting precision is untouched. Absent
        // (every thigh before the pilot) = farTrueKnee === farKnee exactly,
        // byte-identical to the previous single-variable version.
        const farTrueKnee = this.farThigh._binding ? farKnee : this.farThigh._distalAnchorFrac
            ? this._trueDistalEnd(this.farThigh, farHipRender.x, farHipRender.y, thighH, farRenderAng, s * this._farThighScale, facing)
            : farKnee;
        // Shin's render origin pulls up into the thigh by KNEE_OVERLAP (each
        // character's shin box grew by the same amount) so the knee tucks in
        // cleanly instead of floating below the thigh — farAnkle below still
        // anchors off the true farKnee, untouched. If farShin carries
        // jointPivotFrac (authored overlap art), _attachChild skips the
        // pull-back and anchors directly at farTrueKnee instead.
        const farShinRender = this._attachChild(this.farShin, farTrueKnee.x, farTrueKnee.y, far.shinAng, s, RIG.KNEE_OVERLAP);
        farShinRender.x += facing * this._farShinOffsetX * s;
        farShinRender.y += this._farShinOffsetY * s;
        const farAnkle = this._end(farKnee.x, farKnee.y, shinH, far.shinAng);
        this.jointAttachmentPoints.farAnkle = { ...farAnkle };
        this._placeLimbPart(this.farShin, farKnee, farAnkle, {
            x: farShinRender.x, y: farShinRender.y, w: legW, h: shinH,
            angle: far.shinAng, scale: s * this._farShinScale, facing,
        });
        this._recordJointAttachment('farKnee', this.farShin, farKnee.x, farKnee.y, far.shinAng);
        if (this.farBoot) {
            if (!this._placeAttachment(this.farBoot, farAnkle, far.bootAng, s, facing, 'farBoot')) {
                this._place(this.farBoot, farAnkle.x, farAnkle.y, legW + 4 * s, bootH, far.bootAng);
            }
        }
        // Debug read seam (feel-audit foot-lock verification) — world ankle
        // position + planted flag. footA/footB->near/far mapping is stable in
        // gait mode (see comment above); meaningless in pose-driven FK, so null.
        const farSole = this.semanticAnchors?.['farBoot.sole'];
        this.farFoot = { x: far.soleX ?? farSole?.x ?? farAnkle.x, y: far.soleY ?? farSole?.y ?? farAnkle.y, planted: useGait ? footB.lift === 0 : null };
        // Debug read seam (2026-07-15, knee pivot-vs-art audit): true skeleton
        // knee joint, plus the exact render transforms fed to the thigh/shin
        // Images, so an external script can independently check whether the
        // art's own visual knee point (measured from the PNG, then carried
        // through these same transforms via _endXY) lands on farKnee across
        // poses/facings. Debug-only — nothing here feeds back into rendering.
        this.farKneeDebug = { x: farKnee.x, y: farKnee.y };
        this.farThighRenderDebug = { x: farHipRender.x, y: farHipRender.y, angle: farRenderAng, s: s * this._farThighScale, facing, texDims: this.farThigh._texDims };
        this.farShinRenderDebug = { x: farShinRender.x, y: farShinRender.y, angle: far.shinAng, s: s * this._farShinScale, facing, texDims: this.farShin._texDims };

        // Shoulder position: rigProfile.sockets (2026-07-25, cohesive-body-
        // rig-binding Phase C — see the constructor's _torsoSockets comment)
        // roots near/far shoulders from measured torso-relative anchors when
        // a character supplies them, replacing the SHOULDER_STAGGER +
        // armOffsetX/Y + farArmOffsetX/Y chain below. George's and Thesz's
        // socket values were derived algebraically from that exact chain, so
        // this branch renders byte-identical output for both — a pure
        // mechanism refactor, not a new correction. Absent (any future
        // placeholder/new character without a rigProfile) falls through to
        // the original chain unchanged.
        let farShoulderX, farShoulderY, nearShoulderX, armShoulderY;
        if (this._torsoSockets) {
            const near = this._socketPoint(this.torso, this._torsoSockets.nearShoulder.u, this._torsoSockets.nearShoulder.v, torsoOriginX, torsoOriginY, 0, s, facing);
            const far  = this._socketPoint(this.torso, this._torsoSockets.farShoulder.u,  this._torsoSockets.farShoulder.v,  torsoOriginX, torsoOriginY, 0, s, facing);
            nearShoulderX = near.x;
            farShoulderX = far.x;
            farShoulderY = far.y;
            armShoulderY = near.y;
        } else {
            // Shoulder stagger: the torso art is drawn three-quarter (both shoulders
            // visible, not coincident), so the near/far arms shouldn't pivot from the
            // exact same point. Near arm sits back toward the torso's rear/back-curve
            // edge; far arm sits slightly ahead of it — matches the 3/4 shoulder line
            // even though the head itself stays a flat profile (Derek, 2026-07-12).
            const SHOULDER_STAGGER = RIG.SHOULDER_STAGGER * s;
            const armShoulderX = shoulderX + facing * this._armOffsetX * s;
            armShoulderY = shoulderY + this._armOffsetY * s;
            // Far-shoulder-only nudge on top of the shared armOffsetX/Y + stagger,
            // same near/far-parity idea as the leg offsets (2026-07-15 — arms
            // previously had no far-only placement knob at all).
            farShoulderX  = armShoulderX + facing * (SHOULDER_STAGGER + this._farArmOffsetX * s);
            farShoulderY  = armShoulderY + this._farArmOffsetY * s;
            nearShoulderX = armShoulderX - facing * SHOULDER_STAGGER;
        }
        // Near/far shoulder render-angle bias, same wrestler-local,
        // facing-mirrored convention as nearLegTilt/farLegTilt. Arms have no
        // IK chain downstream (unlike legs' shin), so — unlike the leg
        // tilt knobs, which bias only the rendered image and leave the true
        // thighAng untouched for the shin IK to anchor to — this angle is
        // used directly for both the upper-arm's render AND the elbow anchor
        // the forearm hangs from; there's nothing else reading an
        // "un-tilted" arm angle.
        const farUpArmAng  = farAA  + facing * (this._farArmTilt ?? 0);
        const nearUpArmAng = nearAA + facing * this._nearArmTilt;

        // Upper-arm art anchors at its authored shoulder row. Pulling the
        // whole image backward to manufacture overlap makes the rounded
        // deltoid swell above the torso (the reported "football pads"
        // distortion). Keep the shoulder at its true authored anchor; only
        // child segments with overlap slack use _attachChild.
        const farGraphElbow = this._end(farShoulderX, farShoulderY, upperArmH * RIG.FAR_ARM_SCALE, farUpArmAng);
        this._placeLimbPart(this.farUpArm, { x: farShoulderX, y: farShoulderY }, farGraphElbow, {
            x: farShoulderX, y: farShoulderY, w: armW, h: upperArmH,
            angle: farUpArmAng, scale: s * RIG.FAR_ARM_SCALE, facing,
        });
        this._recordJointAttachment('farShoulder', this.farUpArm, farShoulderX, farShoulderY, farUpArmAng);
        // FAR_ARM_SCALE changes the rendered bone length as well as width;
        // the elbow must end at that rendered length. The old full-length
        // endpoint left a 10px invisible reach beyond the far upper arm, so
        // Lou's forearm was correctly attached to the skeleton but visibly
        // floating beyond the painted elbow.
        const farTrueElbow = this.farUpArm._binding ? farGraphElbow
            : this._trueDistalEnd(this.farUpArm, farShoulderX, farShoulderY, upperArmH * RIG.FAR_ARM_SCALE, farUpArmAng, s * RIG.FAR_ARM_SCALE, facing);
        // Back off along the CHILD forearm's axis. Using the upper-arm angle
        // makes the root orbit the elbow whenever the joint bends.
        const farElbow = this._attachChild(this.farForearm, farTrueElbow.x, farTrueElbow.y, farFA, s, RIG.ELBOW_OVERLAP);
        const farForearmX = farElbow.x + facing * this._farForearmOffsetX * s;
        const farForearmY = farElbow.y + this._farForearmOffsetY * s;
        const farWrist = this._end(farTrueElbow.x, farTrueElbow.y, forearmH * RIG.FAR_ARM_SCALE, farFA);
        this.jointAttachmentPoints.farWrist = { ...farWrist };
        this._placeLimbPart(this.farForearm, farTrueElbow, farWrist, {
            x: farForearmX, y: farForearmY, w: armW, h: forearmH,
            angle: farFA, scale: s * RIG.FAR_ARM_SCALE, facing,
        });
        this._recordJointAttachment('farElbow', this.farForearm, farTrueElbow.x, farTrueElbow.y, farFA);
        this._placeAttachment(this.farHand, farWrist, farFA, s * RIG.FAR_ARM_SCALE, facing, 'farHand');

        // Torso: full height when trunks are baked into the PNG, split otherwise.
        // torsoOriginX/Y (see the comment above the leg-solving block) is
        // exactly (x, torsoTop) unless hip sockets solved a different origin.
        this._placePart(this.torso, torsoOriginX, torsoOriginY, torsoW, this.trunks ? torsoH - trunksH : torsoH, 0, s, facing);
        if (this.pelvisUnderlay) this._placePart(this.pelvisUnderlay, torsoOriginX, torsoOriginY, torsoW, torsoH, 0, s, facing);
        if (this.pelvisOverlay) this._placePart(this.pelvisOverlay, torsoOriginX, torsoOriginY, torsoW, torsoH, 0, s, facing);
        if (this.pelvisMask) this._placePart(this.pelvisMask, torsoOriginX, torsoOriginY, torsoW, torsoH, 0, s, facing);
        if (this.trunks) this._place(this.trunks, x, hipY - trunksH, torsoW, trunksH, 0);

        // Near leg — drawn in front of torso
        const nearRenderAng = near.thighAng + facing * this._nearLegTilt;
        const nearHipRender = this._attachChild(this.nearThigh, near.hx, near.hy, nearRenderAng, s, RIG.HIP_OVERLAP);
        // Hip-socket path — see the matching farHipPoint comment above.
        if (!nearHipPoint) {
            nearHipRender.x -= facing * (RIG.HIP_STAGGER + RIG.LEG_BACK_BIAS - RIG.NEAR_LEG_FWD) * s;
            nearHipRender.x += facing * this._legOffsetX * s;
            nearHipRender.y += (this._legOffsetY - RIG.NEAR_LEG_UP + this._nearLegOffsetY) * s;
        }
        const nearKnee  = this._end(near.hx, near.hy, thighH, near.thighAng);
        this._placeLimbPart(this.nearThigh, { x: near.hx, y: near.hy }, nearKnee, {
            x: nearHipRender.x, y: nearHipRender.y, w: legW, h: thighH,
            angle: nearRenderAng, scale: s, facing,
        });
        this._recordJointAttachment('nearHip', this.nearThigh, near.hx, near.hy, this.nearThigh._binding ? near.thighAng : nearRenderAng);
        // Painted-knee routing — see the matching far-leg comment above.
        const nearTrueKnee = this.nearThigh._binding ? nearKnee : this.nearThigh._distalAnchorFrac
            ? this._trueDistalEnd(this.nearThigh, nearHipRender.x, nearHipRender.y, thighH, nearRenderAng, s, facing)
            : nearKnee;
        const nearShinRenderAng = near.shinAng + facing * this._nearShinTilt;
        const nearShinRender = this._attachChild(this.nearShin, nearTrueKnee.x, nearTrueKnee.y, nearShinRenderAng, s, RIG.KNEE_OVERLAP);
        nearShinRender.x += facing * ((this._authoredLegRig ? 0 : RIG.NEAR_SHIN_FWD) + this._nearShinOffsetX) * s;
        nearShinRender.y += ((this._authoredLegRig ? 0 : -RIG.NEAR_SHIN_UP) + this._nearShinOffsetY) * s;
        const nearAnkle = this._end(nearKnee.x, nearKnee.y, shinH, near.shinAng);
        this.jointAttachmentPoints.nearAnkle = { ...nearAnkle };
        this._placeLimbPart(this.nearShin, nearKnee, nearAnkle, {
            x: nearShinRender.x, y: nearShinRender.y, w: legW, h: shinH,
            angle: nearShinRenderAng, scale: s * this._nearShinScale, facing,
        });
        this._recordJointAttachment('nearKnee', this.nearShin, nearKnee.x, nearKnee.y, nearShinRenderAng);
        if (this.nearBoot) {
            if (!this._placeAttachment(this.nearBoot, nearAnkle, near.bootAng, s, facing, 'nearBoot')) {
                this._place(this.nearBoot, nearAnkle.x, nearAnkle.y, legW + 4 * s, bootH, near.bootAng);
            }
        }
        const nearSole = this.semanticAnchors?.['nearBoot.sole'];
        this.nearFoot = { x: near.soleX ?? nearSole?.x ?? nearAnkle.x, y: near.soleY ?? nearSole?.y ?? nearAnkle.y, planted: useGait ? footA.lift === 0 : null };
        // Debug read seam — see the matching farKneeDebug/farThighRenderDebug/
        // farShinRenderDebug comment above.
        this.nearKneeDebug = { x: nearKnee.x, y: nearKnee.y };
        this.nearThighRenderDebug = { x: nearHipRender.x, y: nearHipRender.y, angle: nearRenderAng, s, facing, texDims: this.nearThigh._texDims };
        this.nearShinRenderDebug = { x: nearShinRender.x, y: nearShinRender.y, angle: nearShinRenderAng, s: s * this._nearShinScale, facing, texDims: this.nearShin._texDims };

        // Near arm — shoulder stays on its authored anchor like the far arm.
        const nearGraphElbow = this._end(nearShoulderX, armShoulderY, upperArmH, nearUpArmAng);
        this._placeLimbPart(this.nearUpArm, { x: nearShoulderX, y: armShoulderY }, nearGraphElbow, {
            x: nearShoulderX, y: armShoulderY, w: armW, h: upperArmH,
            angle: nearUpArmAng, scale: s, facing,
        });
        this._recordJointAttachment('nearShoulder', this.nearUpArm, nearShoulderX, armShoulderY, nearUpArmAng);
        const nearTrueElbow = this.nearUpArm._binding ? nearGraphElbow
            : this._trueDistalEnd(this.nearUpArm, nearShoulderX, armShoulderY, upperArmH, nearUpArmAng, s, facing);
        const nearElbow = this._attachChild(this.nearForearm, nearTrueElbow.x, nearTrueElbow.y, nearFA, s, RIG.ELBOW_OVERLAP);
        const nearForearmX = nearElbow.x + facing * this._nearForearmOffsetX * s;
        const nearForearmY = nearElbow.y + this._nearForearmOffsetY * s;
        const nearWrist = this._end(nearTrueElbow.x, nearTrueElbow.y, forearmH, nearFA);
        this.jointAttachmentPoints.nearWrist = { ...nearWrist };
        this._placeLimbPart(this.nearForearm, nearTrueElbow, nearWrist, {
            x: nearForearmX, y: nearForearmY, w: armW, h: forearmH,
            angle: nearFA, scale: s, facing,
        });
        this._recordJointAttachment('nearElbow', this.nearForearm, nearTrueElbow.x, nearTrueElbow.y, nearFA);
        this._placeAttachment(this.nearHand, nearWrist, nearFA, s, facing, 'nearHand');

        // Head — PNG image (pivot at neck bottom) or plain circle
        const headY = torsoTop - headR * 0.7;
        // neckY: the torso's own top pivot, unscaled by headScale — where the
        // head's bottom edge anchors when the neck is baked into the torso art.
        const neckY = torsoTop;
        if (this._headIsImage) {
            // Neck sits at the top of the torso; head extends upward from there.
            // Flip horizontally to match facing direction (PNG is drawn facing right).
            // _headScale (per-character, default 1) shrinks/grows the whole
            // display box; folded in here so the crop math stays in sync.
            const headDispH = headR * 2.5 * this._headScale;
            // neckInTorso art is pivot-flush on both sides of the joint (torso's
            // top edge and head's bottom edge), so anchoring at neckY connects
            // them directly. Legacy heads carry neck slack in their own art;
            // sink the anchor by the cropped-out amount (world px) so the
            // shortened visible neck still meets the collar with no gap.
            // Neck socket (2026-07-25, Phase C — see the constructor's
            // _torsoSockets comment): when present, replaces the standalone
            // headOffsetX/Y-off-shoulderX/neckY pair below with the same
            // torso-relative socket mechanism the shoulders use. George's
            // and Thesz's neck sockets were derived algebraically from their
            // existing headOffsetX/Y, so this is byte-identical for both.
            let anchorX, anchorY;
            if (this._neckInTorso && this._torsoSockets?.neck) {
                const neck = this._socketPoint(this.torso, this._torsoSockets.neck.u, this._torsoSockets.neck.v, torsoOriginX, torsoOriginY, 0, s, facing);
                anchorX = neck.x;
                anchorY = neck.y;
            } else {
                anchorY = this._neckInTorso
                    ? neckY + this._headOffsetY * s
                    : neckY + this._headHidePx * headDispH / this.head.height;
                anchorX = this._neckInTorso
                    ? shoulderX + facing * this._headOffsetX * s
                    : shoulderX;
            }
            this.head
                .setPosition(anchorX, anchorY)
                .setDisplaySize(headR * 2.0 * this._headScale, headDispH)
                .setFlipX(facing < 0);
            // See the constructor's _headOriginU comment: flipX never
            // touches origin, so an off-center headAnchorFrac origin must be
            // re-mirrored every time facing changes, not just once.
            if (this._headOriginU !== undefined) this.head.originX = facing < 0 ? 1 - this._headOriginU : this._headOriginU;
            // Record the ACTUAL anchor used to place the head (2026-07-25,
            // Codex review — "Record the actual anchorX/anchorY" — the
            // legacy shoulderX/neckY recorded here previously even when the
            // head was placed at a socket-resolved or headOffsetX/Y-nudged
            // anchorX/anchorY, hiding any socket-mapping error from
            // joint_attachment_audit. Does not change any rendering — only
            // the debug bookkeeping joint_attachment_audit.mjs reads —
            // re-verified clean via the full audit suite below.
            this._recordJointAttachment('neck', this.head, anchorX, anchorY, 0);
        } else {
            this.head.clear();
            this.head.fillStyle(this._headCol, 1);
            this.head.fillCircle(shoulderX, headY, headR);
        }
    }

    // ── Get-up sequence ──────────────────────────────────────────────────────
    // Grounded keyposes for the flat → sit up → all fours → standing rise.
    // All angles are facing-relative skeleton convention (0 = straight down,
    // + rotates toward facing); `hip` is hip height above the mat in unscaled
    // px; `torso` is the hip→shoulder direction (π/2 = lying toward facing,
    // π = vertical). Mirroring for facing < 0 is a sign flip on every angle.
    // The flat, supine rest pose: hips on the mat, torso barely off it, arms
    // at the sides, legs away from facing.
    //
    // Shared BY REFERENCE with GETUP_POSES[0] and with updateGrounded below,
    // so a wrestler who drops, lies there, and then rises cannot pop between
    // two subtly different "flat" poses — there is exactly one flat pose, and
    // editing it moves the lying pose and the get-up's first keyframe
    // together by construction.
    // Named FLAT, not SUPINE, and it means it: as authored this pose lies
    // PRONE (face down). There is currently NO supine grounded pose.
    //
    // A render-time reflection used to turn this face-up
    // (_mirrorGroundedOnBack, removed 2026-08-17). It reflected every
    // assembled part across the mat axis — negating rotation, setting flipY,
    // inverting originY — which kept the anchors mathematically connected, so
    // certification passed, while turning every face, boot, trunk, arm and leg
    // PNG literally upside down. A real supine pose needs authored joint
    // angles and back-facing torso/head art, not a reflection of front-view
    // art; until that exists, wrestlers lie prone. See RIG_AND_MOVE_PIPELINE.md.
    // Carries `t: 0` so this object can BE GETUP_POSES[0] rather than merely
    // matching it. An earlier version spread it into the keyframe, which left
    // two objects with equal values — good enough to keep them in sync at
    // module load, but not the identity the comment claimed (Codex review,
    // 2026-08-13). _applyGrounded ignores `t`; only updateGetUp reads it.
    static GROUNDED_FLAT = Object.freeze({
        t: 0.00,
        hip: 10, torso: 1.62,
        farThigh: -1.45, farShin: -1.60, nearThigh: -1.40, nearShin: -1.55,
        farArm: -1.48, farFore: -1.55, nearArm: -1.42, nearFore: -1.50,
    });

    // Static grounded poses reachable through updateGrounded. 'down',
    // 'possum' and 'pinned' all rendered identically through the old
    // _drawFlat primitive path, so they still share one pose here — this
    // migration raises their fidelity without inventing new choreography.
    static GROUNDED_POSES = Object.freeze({
        flat: Skeleton.GROUNDED_FLAT,
    });

    static GETUP_POSES = [
        //         hips on mat, torso barely off it, arms at sides, legs away
        //         from facing. THE SAME OBJECT as GROUNDED_FLAT, not a copy —
        //         lying down and the get-up's first frame are one pose by
        //         identity, so they cannot drift apart.
        Skeleton.GROUNDED_FLAT,
        //         sitting up — torso reclined ~55°, hands propped on the mat behind the hips
        { t: 0.34, hip: 14, torso: 2.50, farThigh: -1.42, farShin: -1.62, nearThigh: -1.34, nearShin: -1.56, farArm: -0.38, farFore: -0.55, nearArm: -0.30, nearFore: -0.48 },
        //         all fours — thighs vertical, shins flat behind, arms straight down, torso sloping up to the shoulders
        { t: 0.72, hip: 42, torso: 1.92, farThigh:  0.06, farShin: -1.46, nearThigh: -0.06, nearShin: -1.52, farArm:  0.06, farFore:  0.02, nearArm: -0.06, nearFore: -0.02 },
        //         standing — matches updateUpright's rest geometry closely enough to hand off
        { t: 1.00, hip: 88, torso: Math.PI, farThigh: 0, farShin: 0, nearThigh: 0, nearShin: 0, farArm: 0.10, farFore: 0.16, nearArm: 0.06, nearFore: 0.12 },
    ];

    /**
     * Draw a static grounded pose — flat on the mat — through the modular rig.
     *
     * Before this existed, 'down'/'pinned'/'possum' were drawn by
     * Wrestler._drawFlat: two filled rectangles and a circle, with the
     * skeleton hidden. No joint, no binding, no part — so a wrestling move
     * authored on those states exercised no articulation guarantee at all,
     * and the certifier reported them as coverage gaps rather than passes.
     *
     * Routing them here also closes a visible seam: lying flat and the first
     * frame of the get-up now come from the same pose object, instead of
     * cutting from primitives to a full skeleton.
     */
    updateGrounded(x, y, s, facing, poseName = 'flat') {
        const pose = Skeleton.GROUNDED_POSES[poseName];
        if (!pose) throw new RangeError(`unknown grounded pose "${poseName}"`);
        this._applyGrounded(x, y, s, facing, pose);
    }

    // Grounded renders are PRONE. The on-back reflection that used to turn
    // them face-up (_mirrorGroundedOnBack, with _groundedImages and
    // _clearGroundedOnBack) was removed 2026-08-17: it reflected every
    // assembled part across the mat axis, which kept anchors connected — so
    // certification passed — while rendering every part PNG upside down.
    // Do not reintroduce a reflection here. A supine pose is authored joint
    // angles plus back-facing torso/head art; certifyOrientation now fails
    // any reflected part so this cannot come back unnoticed.

    // Draw the get-up at progress t (0 flat → 1 standing) by interpolating the
    // grounded keyposes. Wrestler swaps to updateUpright when the tween lands.
    updateGetUp(x, y, s, facing, t) {
        const K = Skeleton.GETUP_POSES;
        let a = K[0], b = K[K.length - 1];
        for (let i = 0; i < K.length - 1; i++) {
            if (t >= K[i].t && t <= K[i + 1].t) { a = K[i]; b = K[i + 1]; break; }
        }
        const u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
        const g = {};
        for (const k of Object.keys(a)) g[k] = a[k] + (b[k] - a[k]) * u;
        this._applyGrounded(x, y, s, facing, g);
        // The whole rise renders PRONE, from the same pose the wrestler was
        // lying in. There is no turn-over: the reflection that used to supply
        // one rendered every part upside down (see GROUNDED_FLAT).
    }

    // Place every part from a grounded pose: hip-rooted, torso free to pitch
    // anywhere from lying to vertical. This is the piece updateUpright can't
    // do (it assumes a vertical torso), and it's all the sit/crawl states need.
    _applyGrounded(x, y, s, facing, g) {
        this.jointAttachmentMargins = {};
        this.jointAttachmentPoints = {};
        const f = facing >= 0 ? 1 : -1;
        const ang = a => f * a; // mirror: sin flips with the angle sign, cos is untouched

        const thighH = this._thighH * s, shinH = this._shinH * s, bootH = P.bootH * s;
        const legW   = P.legW   * s, armW  = P.armW  * s;
        const upperArmH = P.upperArmH * s, forearmH = P.forearmH * s;
        const torsoH = P.torsoH * s, torsoW = P.torsoW * s, trunksH = P.trunksH * s;
        const headR  = P.headR  * s;

        const hipX = x, hipY = y - g.hip * s;
        const ta   = ang(g.torso);                       // hip → shoulder direction
        const down = ta - Math.PI;                        // shoulder → hip direction
        // shX/shY: torso's own render origin (the shoulder/neck end — see
        // _placePart below). Legacy: fixed torsoH bone-length walk up from
        // the authoritative hip point. Hip-socket path (2026-07-25, George
        // AI pilot dynamic-pelvis design — see updateUpright's matching
        // torsoOriginX/nearHipPoint comment and Sprite sheets/AI Pilot/
        // George/CLAUDE_INTEGRATION_HANDOFF.md): when both nearHip/farHip
        // sockets are present, solve the origin instead so the torso's own
        // measured hip-socket midpoint lands on (hipX, hipY) under this
        // pose's actual torso rotation, then read each leg's true hip root
        // off that placed torso. Absent = shX/shY exactly as before and
        // nearHipPoint/farHipPoint stay null — byte-identical for every
        // character before this existed.
        let shX = hipX + Math.sin(ta) * torsoH;
        let shY = hipY + Math.cos(ta) * torsoH;
        let nearHipPoint = null, farHipPoint = null;
        if (this._torsoSockets?.nearHip && this._torsoSockets?.farHip) {
            const origin = this._solveTorsoOrigin(hipX, hipY, down, s, facing);
            shX = origin.x;
            shY = origin.y;
            nearHipPoint = this._socketPoint(this.torso, this._torsoSockets.nearHip.u, this._torsoSockets.nearHip.v, shX, shY, down, s, facing);
            farHipPoint  = this._socketPoint(this.torso, this._torsoSockets.farHip.u,  this._torsoSockets.farHip.v,  shX, shY, down, s, facing);
        }

        // Torso image pivots at the shoulders and extends down the back to the
        // hips; trunks cover the hip end of that line
        this._placePart(this.torso, shX, shY, torsoW, this.trunks ? torsoH - trunksH : torsoH, down, s, facing);
        if (this.pelvisUnderlay) this._placePart(this.pelvisUnderlay, shX, shY, torsoW, torsoH, down, s, facing);
        if (this.pelvisOverlay) this._placePart(this.pelvisOverlay, shX, shY, torsoW, torsoH, down, s, facing);
        if (this.pelvisMask) this._placePart(this.pelvisMask, shX, shY, torsoW, torsoH, down, s, facing);
        if (this.trunks) {
            const tx = hipX + Math.sin(ta) * trunksH;
            const ty = hipY + Math.cos(ta) * trunksH;
            this._place(this.trunks, tx, ty, torsoW, trunksH, down);
        }

        // Legs root at the hip; boots continue the shin line. Thigh/shin
        // attach through the same _attachChild helper updateUpright uses
        // (2026-07-21) — previously this closure placed both parts flush at
        // their parent's exact joint point with no HIP_OVERLAP/KNEE_OVERLAP
        // pull-back at all, unlike the standing pose, which is exactly why a
        // knee that looked connected standing could pop open while getting
        // up (see AI_HANDOFF.md's 2026-07-19 Codex entries).
        const leg = (thigh, shin, imgs, hipPoint) => {
            const [thighImg, shinImg, bootImg] = imgs;
            const tA = ang(thigh), sA = ang(shin);
            const rootX = hipPoint ? hipPoint.x : hipX;
            const rootY = hipPoint ? hipPoint.y : hipY;
            const hipRender = this._attachChild(thighImg, rootX, rootY, tA, s, RIG.HIP_OVERLAP);
            const side = thighImg === this.farThigh ? 'far' : 'near';
            const knee = this._end(rootX, rootY, thighH, tA);
            this._placeLimbPart(thighImg, { x: rootX, y: rootY }, knee, {
                x: hipRender.x, y: hipRender.y, w: legW, h: thighH,
                angle: tA, scale: s, facing,
            });
            this._recordJointAttachment(`${side}Hip`, thighImg, rootX, rootY, tA);
            // Painted-knee routing — see updateUpright's matching far/near-leg
            // comment. knee itself stays the pure geometric joint (feeds the
            // ankle chain and the recorded audit point below), untouched.
            const trueKnee = thighImg._binding ? knee : thighImg._distalAnchorFrac
                ? this._trueDistalEnd(thighImg, hipRender.x, hipRender.y, thighH, tA, s, facing)
                : knee;
            const kneeRender = this._attachChild(shinImg, trueKnee.x, trueKnee.y, sA, s, RIG.KNEE_OVERLAP);
            const ankle = this._end(knee.x, knee.y, shinH, sA);
            this.jointAttachmentPoints[`${side}Ankle`] = { ...ankle };
            this._placeLimbPart(shinImg, knee, ankle, {
                x: kneeRender.x, y: kneeRender.y, w: legW, h: shinH,
                angle: sA, scale: s, facing,
            });
            this._recordJointAttachment(`${side}Knee`, shinImg, knee.x, knee.y, sA);
            if (bootImg) {
                if (!this._placeAttachment(bootImg, ankle, sA + f * 0.3, s, facing, `${side}Boot`)) {
                    this._place(bootImg, ankle.x, ankle.y, legW + 4 * s, bootH, sA + f * 0.3);
                }
            }
        };
        leg(g.farThigh,  g.farShin,  [this.farThigh,  this.farShin,  this.farBoot],  farHipPoint);
        leg(g.nearThigh, g.nearShin, [this.nearThigh, this.nearShin, this.nearBoot], nearHipPoint);

        // Shoulder sockets in grounded/get-up mode (2026-07-25, Codex review
        // — "Use individual torso shoulder sockets during grounded/get-up
        // rendering"): gated on the SAME dynamic-pelvis opt-in as the hip
        // sockets above (nearHipPoint/farHipPoint set), not on socket
        // presence alone — George's and Thesz's torsos already carry
        // nearShoulder/farShoulder sockets (Phase C, upright-only), but their
        // grounded mode has never rooted arms from them (both arms simply
        // root at shX/shY, no stagger) — gating on socket-presence alone
        // would change their shipped grounded rendering. Requiring the hip
        // sockets too keeps this reachable only by the pilot's own opt-in
        // rig, so George/Thesz stay byte-identical (nearShoulderPoint/
        // farShoulderPoint stay null for them, and rootX/rootY below fall
        // through to the untouched shX/shY).
        let nearShoulderPoint = null, farShoulderPoint = null;
        if (nearHipPoint && farHipPoint && this._torsoSockets?.nearShoulder && this._torsoSockets?.farShoulder) {
            nearShoulderPoint = this._socketPoint(this.torso, this._torsoSockets.nearShoulder.u, this._torsoSockets.nearShoulder.v, shX, shY, down, s, facing);
            farShoulderPoint  = this._socketPoint(this.torso, this._torsoSockets.farShoulder.u,  this._torsoSockets.farShoulder.v,  shX, shY, down, s, facing);
        }

        // Arms root at the authored shoulder anchor (socket, when the
        // opt-in above resolved one; otherwise the shared torso origin).
        // Forearms use their own axis for overlap so the elbow root cannot
        // orbit during a bend.
        const arm = (up, fore, imgs, shoulderPoint) => {
            const [upImg, foreImg] = imgs;
            const uA = ang(up), fA = ang(fore);
            const side = upImg === this.farUpArm ? 'far' : 'near';
            const depthScale = side === 'far' ? RIG.FAR_ARM_SCALE : 1;
            const rootX = shoulderPoint ? shoulderPoint.x : shX;
            const rootY = shoulderPoint ? shoulderPoint.y : shY;
            const elbowGraph = this._end(rootX, rootY, upperArmH * depthScale, uA);
            this._placeLimbPart(upImg, { x: rootX, y: rootY }, elbowGraph, {
                x: rootX, y: rootY, w: armW, h: upperArmH,
                angle: uA, scale: s * depthScale, facing,
            });
            this._recordJointAttachment(`${side}Shoulder`, upImg, rootX, rootY, uA);
            const elbow = upImg._binding ? elbowGraph
                : this._trueDistalEnd(upImg, rootX, rootY, upperArmH * depthScale, uA, s * depthScale, facing);
            const elbowRender = this._attachChild(foreImg, elbow.x, elbow.y, fA, s, RIG.ELBOW_OVERLAP);
            const wrist = this._end(elbow.x, elbow.y, forearmH * depthScale, fA);
            this.jointAttachmentPoints[`${side}Wrist`] = { ...wrist };
            this._placeLimbPart(foreImg, elbow, wrist, {
                x: elbowRender.x, y: elbowRender.y, w: armW, h: forearmH,
                angle: fA, scale: s * depthScale, facing,
            });
            this._recordJointAttachment(`${side}Elbow`, foreImg, elbow.x, elbow.y, fA);
            const handImg = side === 'far' ? this.farHand : this.nearHand;
            this._placeAttachment(handImg, wrist, fA, s * depthScale, facing, `${side}Hand`);
        };
        arm(g.farArm,  g.farFore,  [this.farUpArm,  this.farForearm], farShoulderPoint);
        arm(g.nearArm, g.nearFore, [this.nearUpArm, this.nearForearm], nearShoulderPoint);

        // Head continues past the shoulders along the torso line. (shX, shY)
        // is the torso's own pivot here too (see the torso placement above),
        // so it doubles as neckY for a neckInTorso head.
        const hx = shX + Math.sin(ta) * headR * 0.9;
        const hy = shY + Math.cos(ta) * headR * 0.9;
        if (this._headIsImage) {
            const headDispH = headR * 2.5 * this._headScale;
            // Neck socket (2026-07-25, George AI pilot — see updateUpright's
            // matching neck-socket comment). Gated on _headAnchorFrac (only
            // the pilot sets it, never George/Thesz) so this is unreachable
            // for existing characters even though their torso already
            // carries a neck socket — they keep the legacy headOffsetX/Y
            // chain in grounded mode exactly as before.
            let anchorX, anchorY;
            if (this._headAnchorFrac && this._torsoSockets?.neck) {
                const neck = this._socketPoint(this.torso, this._torsoSockets.neck.u, this._torsoSockets.neck.v, shX, shY, down, s, facing);
                anchorX = neck.x;
                anchorY = neck.y;
            } else {
                anchorY = this._neckInTorso
                    ? shY + this._headOffsetY * s
                    : shY + this._headHidePx * headDispH / this.head.height;
                anchorX = this._neckInTorso
                    ? shX + facing * this._headOffsetX * s
                    : shX;
            }
            this.head.setPosition(anchorX, anchorY).setDisplaySize(headR * 2.0 * this._headScale, headDispH).setFlipX(facing < 0);
            // See the constructor's _headOriginU comment / the matching fix
            // in the upright branch above.
            if (this._headOriginU !== undefined) this.head.originX = facing < 0 ? 1 - this._headOriginU : this._headOriginU;
            // Record the ACTUAL anchor — see updateUpright's matching neck
            // comment. Debug bookkeeping only, no rendering change.
            this._recordJointAttachment('neck', this.head, anchorX, anchorY, 0);
        } else {
            this.head.clear();
            this.head.fillStyle(this._headCol, 1);
            this.head.fillCircle(hx, hy, headR);
        }
    }

    // Gait leg: foot target from footGait, knee solved by two-bone IK. The planted
    // boot rolls flat-forward over the ball of the foot; the swing boot trails the shin.
    // hipPoint (2026-07-25, George AI pilot dynamic-pelvis design — see
    // updateUpright's torsoOriginX/nearHipPoint comment): optional {x,y}
    // override for the IK root and the returned hx/hy. The foot TARGET
    // (footX/footY) stays computed off the shared `x`/ankleGndY regardless —
    // per the pilot's own contract, planted feet stay authoritative and only
    // the root each leg solves FROM moves to its own socket. Absent (every
    // call before this existed) = root is exactly (x, hipY), byte-identical.
    _gaitLeg(foot, facing, x, hipY, ankleGndY, thighH, shinH, s, liftScale = 1, hipPoint = null, soleImg = null, soleScale = s, bootImg = null) {
        const footX = x + facing * foot.fx * s;
        const footY = ankleGndY - foot.lift * s * liftScale;
        const rootX = hipPoint ? hipPoint.x : x;
        const rootY = hipPoint ? hipPoint.y : hipY;
        let soleVector = soleImg?._soleAnchorFrac
            ? this._anchorVector(soleImg, soleImg._soleAnchorFrac, soleScale, facing)
            : null;
        if (!soleVector && bootImg?._binding?.proximal && bootImg?._semanticAnchors?.sole) {
            const canvas = bootImg._texDims;
            const factor = s * (bootImg._attachmentDisplayScale ?? 1);
            const proximal = bootImg._binding.proximal;
            const sole = bootImg._semanticAnchors.sole;
            const bx = facing * (sole.u - proximal.u) * canvas.w * factor;
            const by = (sole.v - proximal.v) * canvas.h * factor;
            const delta = facing * 0.35;
            soleVector = {
                x: bx * Math.cos(delta) + by * Math.sin(delta),
                y: shinH - bx * Math.sin(delta) + by * Math.cos(delta),
            };
        }
        const { thighAng, shinAng } = soleVector
            ? solveLegToAnchor(rootX, rootY, footX, footY, thighH, soleVector.x, soleVector.y, facing)
            : solveLeg(rootX, rootY, footX, footY, thighH, shinH, facing);
        // Boot continues the line of the shin (no kink so it never reads as a detached
        // block) with just a small forward toe.
        const bootAng = shinAng + facing * 0.35;
        const result = { hx: rootX, hy: rootY, thighAng, shinAng, bootAng };
        if (soleVector) {
            result.soleX = footX;
            result.soleY = footY;
        }
        return result;
    }

    destroy() {
        this._parts.forEach(p => p.destroy());
    }
}
