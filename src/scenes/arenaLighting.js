// Arena lighting experiment — see ARENA_LIGHTING_AND_DEPTH_CONCEPTS.md for the
// full design brief. This module holds every tunable constant for the four
// approved effects (fixtures, mat light pool, atmospheric beams, rope
// shadows) plus the fixture/pool/beam draw helpers. Rope-shadow drawing
// itself stays in Arena.js's _updateRopes (it must reuse that method's own
// live rope point arrays — see ROPE_SHADOW's comment below), but its tunable
// numbers live here with everything else.
//
// Toggle: append ?lighting=0 to the game URL to render the pre-lighting
// baseline (fixtures/pool/beams hidden, rope shadows skipped) for an exact
// before/after comparison. Defaults to enabled — see lightingEnabled().
export function lightingEnabled() {
    return new URLSearchParams(location.search).get('lighting') !== '0';
}

// Three theatrical fixtures cut from the gitignored concept sheet (see
// tools/arena-lighting-cutter/cut-fixtures.mjs) — placements per the concept
// doc's "Recommended fixture map". `top` is the sprite's top edge (origin
// 0.5/0), deliberately negative so the mount disappears slightly above the
// playable frame. rotationDeg is Phaser's screen-space clockwise convention.
export const FIXTURES = [
    {
        key: 'left-fresnel-black', x: 245, top: -15, width: 132,
        rotationDeg: 9, flipX: false,
    },
    {
        key: 'followspot', x: 480, top: -25, width: 118,
        rotationDeg: 4, flipX: false, // a near-90° spin would swing the bulk of the sprite sideways off a top-anchored origin (rotating "hangs down" into "extends sideways") — a small tilt instead, aim reads through the pool/beams, not the art's own internal lens direction
    },
    {
        key: 'fresnel-silver', x: 715, top: -15, width: 132,
        rotationDeg: -9, flipX: true, // mirrored, tilts inward opposite the left fixture
    },
];

// Broad, feathered mat pool — many concentric normal-blended ellipses with a
// quadratic alpha falloff (same layered-circle technique as Arena.js's
// createSmokeTexture/createFlashTexture/createDustTexture, just elliptical
// and drawn once instead of baked into a reusable point texture, since this
// is a single static shape, not a spawned instance). See drawMatLightPool's
// own comment for why normal blend, not additive.
export const MAT_POOL = {
    x: 480, y: 350,
    color: 0xf0e6cc, // pale warm tungsten, not neutral white — period followspot color
    outerRx: 250, outerRy: 145,
    rings: 14,
    peakAlpha: 0.1,
};

// Atmospheric beams from each fixture's approximate lens position toward the
// aim points in the concept doc's "Suggested aim points". Alpha is a sine
// hump over the beam's own length (0 at the source, peaking mid-air, back to
// 0 at the aim point) — reads in the smoky air, fades out before it would
// otherwise paint a hard line on the mat, without needing a separate mask.
export const BEAMS = [
    { fromX: 272, fromY: 70,  toX: 405, toY: 345, startHalfW: 5,  endHalfW: 46 },
    { fromX: 480, fromY: 78,  toX: 480, toY: 335, startHalfW: 6,  endHalfW: 50 },
    { fromX: 688, fromY: 70,  toX: 555, toY: 345, startHalfW: 5,  endHalfW: 46 },
];
export const BEAM_COLOR = 0xece2c8;
export const BEAM_PEAK_ALPHA = 0.1;
export const BEAM_DEPTH = 2.9; // above deep crowd/far posts, below the ring mat (3) so the mat's own opaque fill gives a free hard stop, below wrestlers (12+)

export const FIXTURE_DEPTH = 1.8; // above background/deep crowd, below the mat/wrestlers — see arena background's own "dark upper space" band

// Rope-shadow projection, applied inside Arena.js's _updateRopes to the same
// live points archPts()/sidePoint() already compute for the visible ropes —
// never a separate sag/press calculation. Index 0/1/2 = bottom/middle/top
// rope (RING.ropes' own order). dispY is the doc's "screen-down
// displacement"; side ropes add a smaller dispX component angled away from
// the central lamp (~x480) on top of a slightly reduced dispY.
export const ROPE_SHADOW = {
    dispY: [6.5, 11, 18],
    dispX: [3, 5, 8],
    halfW: [3.0, 4.2, 6.0], // wider than the visible rope's own halfW (see NBANDS/BANDS halfW in _updateRopes)
    alpha: [0.4, 0.32, 0.24], // bottom closest/sharpest → top softest/faintest
    color: 0x000000,
};

// Draws the three fixture sprites (called once from Arena.js's create()).
export function drawFixtures(scene) {
    for (const f of FIXTURES) {
        const img = scene.add.image(f.x, f.top, f.key)
            .setOrigin(0.5, 0)
            .setDepth(FIXTURE_DEPTH)
            .setFlipX(f.flipX)
            .setAngle(f.rotationDeg);
        const scale = f.width / img.width;
        img.setScale(scale);
    }
}

// Draws the mat light pool once into a dedicated Graphics object (masked to
// the mat trapezoid by the caller) — static, so no per-frame redraw cost.
// Deliberately NORMAL blend, not additive: concentric rings under additive
// blending sum their alphas at the shared center point (18 rings at even a
// modest peak alpha blew out to near-white — found via screenshot, not
// guessed), whereas normal alpha compositing (biggest/faintest ring first,
// smallest/brightest painted last) gives a predictable, restrained peak
// exactly equal to peakAlpha, matching the "no washed-out mat/logo detail"
// requirement.
export function drawMatLightPool(gfx) {
    const { x, y, color, outerRx, outerRy, rings, peakAlpha } = MAT_POOL;
    for (let i = rings; i >= 1; i--) {
        const t = i / rings;
        gfx.fillStyle(color, peakAlpha * (1 - t) * (1 - t));
        gfx.fillEllipse(x, y, outerRx * t * 2, outerRy * t * 2);
    }
}

// Draws the three atmospheric beams once into a dedicated Graphics object
// (masked to the mat trapezoid is NOT applied here — beams are meant to read
// above the mat, in the smoky air; see BEAM_DEPTH's comment for how they're
// still kept off the mat itself).
export function drawBeams(gfx) {
    gfx.setBlendMode(Phaser.BlendModes.ADD);
    const SEGS = 24;
    for (const b of BEAMS) {
        for (let i = 0; i < SEGS; i++) {
            const t0 = i / SEGS, t1 = (i + 1) / SEGS;
            const tm = (t0 + t1) / 2;
            const x0 = b.fromX + (b.toX - b.fromX) * t0, y0 = b.fromY + (b.toY - b.fromY) * t0;
            const x1 = b.fromX + (b.toX - b.fromX) * t1, y1 = b.fromY + (b.toY - b.fromY) * t1;
            const w0 = b.startHalfW + (b.endHalfW - b.startHalfW) * t0;
            const w1 = b.startHalfW + (b.endHalfW - b.startHalfW) * t1;
            const alpha = BEAM_PEAK_ALPHA * Math.sin(Math.PI * tm);
            if (alpha <= 0.001) continue;
            const len = Math.hypot(x1 - x0, y1 - y0) || 1;
            const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
            gfx.fillStyle(BEAM_COLOR, alpha);
            gfx.fillPoints([
                { x: x0 + nx * w0, y: y0 + ny * w0 },
                { x: x1 + nx * w1, y: y1 + ny * w1 },
                { x: x1 - nx * w1, y: y1 - ny * w1 },
                { x: x0 - nx * w0, y: y0 - ny * w0 },
            ], true);
        }
    }
}
