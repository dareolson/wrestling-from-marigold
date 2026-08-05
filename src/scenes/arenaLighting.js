// Arena lighting experiment — see ARENA_LIGHTING_AND_DEPTH_CONCEPTS.md for the
// full design brief. This module holds every tunable constant for the
// approved effects (mat light pool, atmospheric beams, rope shadows) plus
// the pool/beam draw helpers. Rope-shadow drawing itself stays in Arena.js's
// _updateRopes (it must reuse that method's own live rope point arrays — see
// ROPE_SHADOW's comment below), but its tunable numbers live here with
// everything else.
//
// 2026-08-05 (round 2, Derek + Codex): the three visible fixture sprites
// from the first pass were cut entirely ("the fixtures are junk") — see git
// history at ba00501 for that art/placement if it's ever worth revisiting.
// The beams were reworked to read as ambient shafts from above the frame
// with no equipment implied, and the rope shadows were rebuilt from three
// separate per-rope stripes into one merged, irregular band per ring side —
// see ROPE_SHADOW's comment for the physical reasoning.
//
// Toggle: append ?lighting=0 to the game URL to render the pre-lighting
// baseline (pool/beams hidden, rope shadows skipped) for an exact
// before/after comparison. Defaults to enabled — see lightingEnabled().
export function lightingEnabled() {
    return new URLSearchParams(location.search).get('lighting') !== '0';
}

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

// Atmospheric beams — no fixture sprites are drawn this pass (see this
// file's header comment), so these read as ambient light entering from
// above the visible frame rather than shafts from a specific lamp.
// `fromY` sits above y=0 and the length-wise alpha profile (see drawBeams)
// is already ~0 near the source, so there's no visible point of origin.
// `phase` offsets each beam's gentle organic wobble (drawBeams) so the
// three don't wave in lockstep.
export const BEAMS = [
    { fromX: 300, fromY: -60, toX: 410, toY: 340, startHalfW: 10, endHalfW: 60, phase: 0 },
    { fromX: 480, fromY: -60, toX: 480, toY: 330, startHalfW: 12, endHalfW: 66, phase: 2.1 },
    { fromX: 660, fromY: -60, toX: 550, toY: 340, startHalfW: 10, endHalfW: 60, phase: 4.2 },
];
export const BEAM_COLOR = 0xece2c8;
export const BEAM_PEAK_ALPHA = 0.075;
export const BEAM_DEPTH = 2.9; // above deep crowd/far posts, below the ring mat (3) so the mat's own opaque fill gives a free hard stop, below wrestlers (12+)
export const BEAM_WAVE_AMPLITUDE = 5; // px — breaks up the straight taper so it doesn't read as a rigid geometric cone

// Rope-shadow projection, applied inside Arena.js's _updateRopes to the same
// live points archPts()/sidePoint() already compute for the visible ropes —
// never a separate sag/press calculation.
//
// Round 1 drew three separate offset stripes, one per rope (bottom/middle/
// top). Codex's correction: under a roughly-overhead light source, three
// vertically stacked ropes project toward essentially the same ground line
// — their shadows overlap into ONE soft, irregular band below the lowest
// (nearest-to-mat) rope, not three parallel stripes. So each merged band
// below is anchored to the BOTTOM rope's own live points (RING.ropes[0]),
// displaced by a single dy(/dx); the middle and top ropes only contribute
// extra width where all three currently diverge (press/bounce), via
// `spreadMul` — see the buildMergedBand comment in Arena.js — which is how
// "sag and bounce still deform" the combined shadow without drawing them as
// separate layers again.
//
// Four bands, one per ring side: `near` (the bottom horizontal rope, the
// only one round 1 drew), `far` (missing entirely in round 1 — the back
// ropes sit well above the mat's own far edge in screen space, so `far.dy`
// is much larger, just enough to land the band just past that edge), and
// one shared `side` config reused for both the left and right ropes (dx
// signed by direction in Arena.js).
export const ROPE_SHADOW = {
    color: 0x000000,
    near: { dy: 12, dx: 0, halfW: 9, alpha: 0.16, spreadMul: 0.22 },
    far:  { dy: 70, dx: 0, halfW: 6, alpha: 0.10, spreadMul: 0.18 },
    side: { dy: 10, dx: 6, halfW: 8, alpha: 0.15, spreadMul: 0.20 },
};

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

// Draws the atmospheric beams once into a dedicated Graphics object. Each
// segment gets a soft halo pass (wider, fainter) under a slightly-less-
// than-full-alpha core — no single hard-edged polygon boundary — and a
// gentle per-beam wobble (amplitude ramping from 0 at the source to full at
// the aim point) so the shaft reads as haze wandering in the air rather
// than a rigid cone. Not masked to the mat — beams belong in the
// atmosphere above it; BEAM_DEPTH's own comment covers how they still stay
// off the mat itself.
export function drawBeams(gfx) {
    gfx.setBlendMode(Phaser.BlendModes.ADD);
    const SEGS = 28;
    for (const b of BEAMS) {
        for (let i = 0; i < SEGS; i++) {
            const t0 = i / SEGS, t1 = (i + 1) / SEGS;
            const tm = (t0 + t1) / 2;
            const wob0 = Math.sin(t0 * Math.PI * 2.4 + b.phase) * BEAM_WAVE_AMPLITUDE * t0;
            const wob1 = Math.sin(t1 * Math.PI * 2.4 + b.phase) * BEAM_WAVE_AMPLITUDE * t1;
            const x0 = b.fromX + (b.toX - b.fromX) * t0 + wob0, y0 = b.fromY + (b.toY - b.fromY) * t0;
            const x1 = b.fromX + (b.toX - b.fromX) * t1 + wob1, y1 = b.fromY + (b.toY - b.fromY) * t1;
            const w0 = b.startHalfW + (b.endHalfW - b.startHalfW) * t0;
            const w1 = b.startHalfW + (b.endHalfW - b.startHalfW) * t1;
            const alpha = BEAM_PEAK_ALPHA * Math.sin(Math.PI * tm);
            if (alpha <= 0.001) continue;
            const len = Math.hypot(x1 - x0, y1 - y0) || 1;
            const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
            const quad = (hw0, hw1, a) => {
                gfx.fillStyle(BEAM_COLOR, a);
                gfx.fillPoints([
                    { x: x0 + nx * hw0, y: y0 + ny * hw0 },
                    { x: x1 + nx * hw1, y: y1 + ny * hw1 },
                    { x: x1 - nx * hw1, y: y1 - ny * hw1 },
                    { x: x0 - nx * hw0, y: y0 - ny * hw0 },
                ], true);
            };
            quad(w0 * 1.7, w1 * 1.7, alpha * 0.3);
            quad(w0, w1, alpha * 0.7);
        }
    }
}
