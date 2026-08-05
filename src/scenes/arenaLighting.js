// Arena lighting experiment — see ARENA_LIGHTING_AND_DEPTH_CONCEPTS.md for the
// full design brief. This module holds every tunable constant for the
// approved effects (mat light pool, atmospheric beams, rope shadows) plus
// the pool/beam draw helpers. Rope-shadow drawing itself stays in Arena.js's
// _updateRopes (it must reuse that method's own live rope point arrays — see
// ROPE_SHADOW's comment below), but its tunable numbers live here with
// everything else.
//
// 2026-08-05 (round 3, Derek's visual verdict on round 2): "orb in the
// middle of the ring", "feels composited over the scene", "rope shadows
// dramatically too thick". Three fixes:
//   - Mat pool rebuilt from stacked normal-blended ellipses (round 1/2's
//     technique — see git history — still summed to a small bright core at
//     the shared center point no matter how low peakAlpha went, since every
//     ring's fill still overlaps every smaller ring on top of it) into ONE
//     draw of a smooth radial-gradient canvas texture (ensureGlowTexture),
//     so there's no ring-stack construction left to produce a core at all.
//   - Beams now drive a real influence field (beamInfluenceAt) that
//     brightens dust motes passing through a shaft and casts a restrained
//     footprint glow on the crowd/haze band where each shaft lands, so the
//     light has visible consequences instead of sitting on top of the scene
//     as translucent polygons.
//   - Rope shadows shrunk from ~9-32px halo'd bands down to ~rope-width
//     hard lines (see ROPE_SHADOW) with spreadMul removed — width is now
//     fixed; only the centerline moves with live sag/press.
//
// 2026-08-05 (round 2, Derek + Codex): the three visible fixture sprites
// from the first pass were cut entirely ("the fixtures are junk") — see git
// history at ba00501 for that art/placement if it's ever worth revisiting.
//
// Toggle: append ?lighting=0 to the game URL to render the pre-lighting
// baseline (pool/beams hidden, rope shadows skipped) for an exact
// before/after comparison. Defaults to enabled — see lightingEnabled().
export function lightingEnabled() {
    return new URLSearchParams(location.search).get('lighting') !== '0';
}

// Shared soft-edged white circle, generated once per page load as an actual
// canvas radial gradient (browser-interpolated, not a stack of discrete
// rings) and reused — tinted/scaled/positioned differently — by both the mat
// pool and the beam spill footprints below. A flat plateau out to ~55% of
// the radius, then one continuous falloff to fully transparent at the edge:
// no intermediate stops, so there's nothing to read as banding or stepping.
const GLOW_TEX_KEY = 'arenaGlowTex';
const GLOW_TEX_SIZE = 256;
function ensureGlowTexture(scene) {
    if (scene.textures.exists(GLOW_TEX_KEY)) return;
    const tex = scene.textures.createCanvas(GLOW_TEX_KEY, GLOW_TEX_SIZE, GLOW_TEX_SIZE);
    const ctx = tex.getContext();
    const c = GLOW_TEX_SIZE / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,1)');
    grad.addColorStop(0.8, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GLOW_TEX_SIZE, GLOW_TEX_SIZE);
    tex.refresh();
}

// Broad, feathered mat pool — a single tinted/scaled Image drawn from the
// shared glow texture (ensureGlowTexture), not a stack of shapes, so the
// center is a true flat plateau instead of a re-composited bright core (see
// this file's header comment for why the old construction always produced
// one). Elliptical via non-uniform scale (outerRx/outerRy independently).
export const MAT_POOL = {
    x: 480, y: 350,
    color: 0xf0e6cc, // pale warm tungsten, not neutral white — period followspot color
    outerRx: 250, outerRy: 145,
    peakAlpha: 0.16,
};

// Returns a masked/positioned Image ready for the caller to setDepth+setMask
// (Arena.js's _setupArenaLighting owns depth/mask, matching every other
// lighting layer).
export function createMatLightPool(scene) {
    ensureGlowTexture(scene);
    const { x, y, color, outerRx, outerRy, peakAlpha } = MAT_POOL;
    return scene.add.image(x, y, GLOW_TEX_KEY)
        .setTint(color)
        .setAlpha(peakAlpha)
        .setScale((outerRx * 2) / GLOW_TEX_SIZE, (outerRy * 2) / GLOW_TEX_SIZE);
}

// Atmospheric beams — no fixture sprites are drawn (see this file's header
// comment), so these read as ambient light entering from above the visible
// frame rather than shafts from a specific lamp. `fromY` sits above y=0 and
// the length-wise alpha profile (see drawBeams) is already ~0 near the
// source, so there's no visible point of origin. `phase` offsets each
// beam's gentle organic wobble (drawBeams) so the three don't wave in
// lockstep.
//
// Round 3: peak alpha raised (0.075 -> 0.13) per Derek's "underwhelming,
// feels composited" verdict — judged against post-processed screenshots
// (scanlines/grain/vignette/smoke all applied), not raw Graphics output.
export const BEAMS = [
    { fromX: 300, fromY: -60, toX: 410, toY: 340, startHalfW: 10, endHalfW: 60, phase: 0 },
    { fromX: 480, fromY: -60, toX: 480, toY: 330, startHalfW: 12, endHalfW: 66, phase: 2.1 },
    { fromX: 660, fromY: -60, toX: 550, toY: 340, startHalfW: 10, endHalfW: 60, phase: 4.2 },
];
export const BEAM_COLOR = 0xece2c8;
export const BEAM_PEAK_ALPHA = 0.13;
export const BEAM_DEPTH = 2.9; // above deep crowd/far posts, below the ring mat (3) so the mat's own opaque fill gives a free hard stop, below wrestlers (12+)
export const BEAM_WAVE_AMPLITUDE = 5; // px — breaks up the straight taper so it doesn't read as a rigid geometric cone

// Beam "footprint" glow — a restrained, spatially-corresponding brightening
// of the crowd/haze band directly behind the ring where each shaft actually
// lands, using the same shared glow texture as the mat pool (tinted/scaled/
// additive instead of normal-blended). This is what makes the beams read as
// interacting with the environment instead of floating in front of it.
export const BEAM_SPILL_Y = 150; // mid-crowd band, above the ring apron, below the crowd's own top rows
export const BEAM_SPILL_ALPHA = 0.1;

export function createBeamSpill(scene) {
    ensureGlowTexture(scene);
    return BEAMS.map(b => {
        const t = (BEAM_SPILL_Y - b.fromY) / (b.toY - b.fromY);
        const cx = b.fromX + (b.toX - b.fromX) * t;
        const hw = b.startHalfW + (b.endHalfW - b.startHalfW) * t;
        return scene.add.image(cx, BEAM_SPILL_Y, GLOW_TEX_KEY)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setTint(BEAM_COLOR)
            .setAlpha(BEAM_SPILL_ALPHA)
            .setScale((hw * 4.4) / GLOW_TEX_SIZE, (hw * 2.6) / GLOW_TEX_SIZE);
    });
}

// Shared influence field so atmospheric particles (currently just dust
// motes, see Arena.js's _scheduleDustMote) can react to the beams without a
// general lighting engine or a second per-frame pass: given a point, how
// deep inside a beam's cross-section it sits (0 outside every beam, up to 1
// dead-center in a beam at its brightest length-wise point). Reuses each
// beam's own straight-line lerp + linear half-width taper — no new geometry.
export function beamInfluenceAt(x, y) {
    let influence = 0;
    for (const b of BEAMS) {
        const t = (y - b.fromY) / (b.toY - b.fromY);
        if (t < 0 || t > 1) continue;
        const cx = b.fromX + (b.toX - b.fromX) * t;
        const hw = b.startHalfW + (b.endHalfW - b.startHalfW) * t;
        const d = Math.abs(x - cx);
        if (d >= hw) continue;
        const edge = 1 - d / hw; // 1 at centerline, 0 at the beam's own edge
        const lengthProfile = Math.sin(Math.PI * t); // matches drawBeams' own alpha taper
        influence = Math.max(influence, edge * lengthProfile);
    }
    return influence;
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

// Rope-shadow projection, applied inside Arena.js's _updateRopes to the same
// live points archPts()/sidePoint() already compute for the visible ropes —
// never a separate sag/press calculation.
//
// Round 2 drew one merged band per ring side (see git history for the
// physical reasoning: three vertically-stacked ropes under a roughly-
// overhead light converge toward one ground line). Round 3 keeps that
// merged-band structure but corrects its scale: Derek's verdict was that
// the bands (halfW 6-9, plus a 1.8x-wider halo pass) read as broad ~12-32px
// stripes, nowhere near "hard overhead shadow" — a hard light source casts
// a shadow close to the width of the thing casting it. `halfW` below is now
// sized to roughly match each side's own visible rope width (near ropes
// draw at halfW 2, far at halfW 1, side ropes taper ~1.5->0.9 — see
// Arena.js's fillRibbon/fillRibbonBands calls in _updateRopes), the 1.8x
// halo is gone (replaced with the same ~1px antialiasing halo the visible
// ropes themselves use, see AA in _updateRopes), and `spreadMul` — which
// widened the band under sag/press — is 0: sag/bounce now only moves the
// centerline (still anchored to the bottom rope's own live points, offset
// by dx/dy), never inflates the shadow's width. See buildMergedBand's
// comment in Arena.js for the centerline mechanics, unchanged from round 2.
// side.taper mirrors the visible side ropes' own perspective narrowing
// (Arena.js's `hw.push((3.0 - 1.2 * t) / 2)` in _updateRopes) as a
// multiplier on halfW, t = 0 (near corner) -> 1 (far corner).
export const ROPE_SHADOW = {
    color: 0x000000,
    near: { dy: 12, dx: 0, halfW: 2.2, alpha: 0.4, spreadMul: 0 },
    far:  { dy: 70, dx: 0, halfW: 1.3, alpha: 0.35, spreadMul: 0 },
    side: { dy: 10, dx: 6, halfW: 1.7, alpha: 0.38, spreadMul: 0, taper: t => 1 - 0.4 * t },
};
