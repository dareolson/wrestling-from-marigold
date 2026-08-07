import { W, H, RING, ringBoundsAtY } from '../constants.js';
import Wrestler from '../Wrestler.js';
import InputHandler from '../InputHandler.js';
import AIHandler from '../AIHandler.js';
import CrowdAudio from '../CrowdAudio.js';
import { george } from '../characters/george.js';
import { thesz } from '../characters/thesz.js';
import { enumerateCharacterAssets } from '../rig/partVariants.js';
import MoveRuntime from '../animation/MoveRuntime.js';
import { jabClip } from '../animation/clips/jab.js';
import { hammerlockClip } from '../animation/clips/hammerlock.js';
import { lightingEnabled, createMatLightPool, drawBeams, createBeamSpill, beamInfluenceAt, BEAM_DEPTH, ROPE_SHADOW, insetMatTrapezoid } from './arenaLighting.js';

// 2026-07-26 (promoted-george roster change): the roster is now just these
// two. George is the former AI art-swap pilot (v1-v9), flattened and
// promoted into george.js after Derek's live approval; the entire pilot
// lineage and the previous hand-drawn George are preserved under `_vault/`
// (characters + asset folders), not deleted, in case of a future revert.
// The third placeholder body type ("brawler", Graphics-fallback only, no
// textures) is vaulted out of the active roster too -- see PRESETS below.
const CHARACTERS = [george, thesz];

// Named crowd extras: each is one chroma-keyed multi-frame reference sheet
// cut via tools/audience-cutter into src/assets/audience/<slug>/frame1..N.png
// (not the wrestler rig pipeline — these are flat multi-frame sprites, not
// jointed body parts). `restFrame` is the idle texture (usually 1); reacting
// plays forward from restFrame through `frames` and back down, mirrored (see
// _reactCrowdExtras). `spots` place instances of that one source design
// around the ring — x/h/flip/tint jitter so a single design doesn't read as
// an obvious clone row.
//
// `sizeBasis` picks what spot.h anchors to when frames are re-scaled
// (see _setExtraFrame): 'height' scales off the tallest frame — correct
// when the frames genuinely change height (oldman's sit→stand). 'width'
// scales off the resting frame's width instead, for extras that stay
// seated throughout — their raised-arm frames (and any per-sheet crop/
// scale drift between separately-cut source sheets) still vary in raw
// pixel height, and height-basis scaling would render that as growing
// taller, i.e. looking like they're standing up.
//
// FRONT-ROW GRID (2026-07-15 reshuffle, widened 2026-07-18, widened again
// same day): the visible "core" of the row was originally x 220-780
// (W/2 ± 280, 55px steps) — flanking outside it read as invisible (found
// with browndresslady's first attempt). Derek: "widen the row to make more
// room, some of the characters are being either squished or pushed back" —
// widened to W/2 ± 325 (x 155-805), 65px steps. Then, after the separate
// "size equalized to alfred" pass below made every character 5% bigger
// again ("make the background audience five percent bigger across the
// board and widen their rows to accommodate so no one is squished or
// displaced"), widened once more to keep pace: W/2 ± 340, 68px steps
// (65 * 1.05). Same 11 slots in the same left-to-right order throughout —
// nobody has moved relative to their neighbors since the original
// reshuffle, only the spacing has grown to match each size bump:
//   W/2 + [-340, -272, -204, -136, -68, 0, +68, +136, +204, +272, +340]
// Re-verified visible via screenshot at both new outer edges (oldman at
// -325, marlon at +325) before committing to the -325/+325 pass — see the
// create() call sites' own comments if either ever needs pulling back in.
// Not independently re-verified at the current -340/+340 edges, but the
// margin from that check (960-wide canvas, -325 already read fine) leaves
// enough room that 15 more px shouldn't cross back into the invisible zone.
// Derek's target is ~10 unique designs total, one instance each, so the
// 2026-07-15 reshuffle dropped every design down to a single spot and left
// the other 6 slots open rather than doubling anyone up (oldman previously
// ate 5 of the 11 slots himself — the exact "obvious repeat" problem being
// solved).
// **Adding a new design: pick an unused x from the list above** — all 11
// proven positions are now occupied (dizzy took -204, groucho took -272,
// alfred took +68, audrey took +136, lucille took +204, marlon took +340);
// a 12th extra needs either a reshuffle or a new placement strategy (a
// second, more distant row was floated as untested back in the
// marilyn-era entries). h/tint/flip still need tuning per new design's
// own frame proportions — only the x grid is reusable as-is.
//
// LIGHTING (2026-07-17): tints brightened from their original ~0x55-0x6b
// range to ~0x96-0xac — front row is meant to be the lightest crowd row
// (rows 2/3 behind it are explicitly dimmer, see drawSecondRow/
// drawThirdRow's setTint calls), but still slightly darker than the ring
// itself (drawRingMat's 0xb0b0a8 / drawNearApron's 0xa0a098). Previously
// the front row was tinted darker than the untinted rows behind it —
// backwards falloff, fixed here. Each spot's tint below is this fixed,
// brightened base value — EXTRA_ROWS' own `dim` (below) darkens rows 2/3
// further from there, it doesn't replace this fix.
//
// THREE-ROW DEPTH BAND (2026-07-16, Derek, direct commit): every spot
// before this pass sat on (near enough) one shared baseline — groundY only
// varied by each character's own tuned `h` (±14px total spread) — so the
// row read as designs jammed onto one line rather than a crowd with any
// depth. `row` (1/2/3, default 1) now buckets each spot into one of three
// bands via EXTRA_ROWS: row 1 is the untouched "camera favorite" baseline
// (groundY = farLeft.y + h*0.45, full scale, full tint, depth 1.5); rows
// 2/3 push groundY up (further from the near camera), scale down, dim the
// tint, and lower depth, so they read as sitting further back and start
// blending toward the background-row cutouts instead of competing with the
// front row. Assignment interleaves across the x grid (index % 3) rather
// than blocking rows 2/3 to one side, so the recession reads across the
// full width: row 1 = oldman/browndresslady/alfred/popcornguy, row 2 =
// groucho/elvis/audrey/marlon, row 3 = dizzy/marilyn/lucille — marlon
// (added after this system landed) continues the same index%3 pattern at
// its own grid index (10 → row 2).
//
// SIZE EQUALIZED TO ALFRED (2026-07-18): Derek: "many of them are tiny and
// look like children" — each character's own `h` had drifted independently
// (100-122) AND rows 2/3's scaleMul (0.82/0.66, above) multiplies on top of
// that at render time, so the actual on-screen size varied far more than
// the raw h numbers suggested — a row-3 character at h=100 rendered at
// 100*0.66=66px, less than half alfred's own 112 (row 1, scaleMul 1.0, so
// his raw h IS his rendered size). Solved each spot's `h` so rendered size
// (h * EXTRA_ROWS[row].scaleMul) equals alfred's 112 exactly: row 1 -> 112
// unchanged/flattened, row 2 -> 112/0.82 = 137, row 3 -> 112/0.66 = 170.
// This intentionally removes scale as a depth cue for rows 2/3 — they still
// read as further back via the dimmer tint and the yOffset push (both
// untouched) — since matching Derek's literal ask ("size them up to his
// size") isn't compatible with also keeping them visibly smaller.
//
// +5% ACROSS THE BOARD (2026-07-18, same day): Derek: "make the background
// audience five percent bigger across the board and widen their rows to
// accommodate so no one is squished or displaced." Every spot's `h` scaled
// by 1.05 off the values above: row 1 112->118, row 2 137->144, row 3
// 170->179 — the row-to-row EQUALIZED-TO-ALFRED relationship (h *
// scaleMul all landing on the same rendered size) is preserved since every
// row got the identical 5% multiplier. The x grid was widened to match
// (65px -> 68px steps) — see the FRONT-ROW GRID comment above — so the
// bigger sprites don't run into their neighbors at the old spacing.
const EXTRA_ROWS = {
    1: { yOffset: 0,   scaleMul: 1.0,  dim: 1.0,  depth: 1.5 },
    2: { yOffset: -20, scaleMul: 0.82, dim: 0.8,  depth: 1.35 },
    3: { yOffset: -38, scaleMul: 0.66, dim: 0.62, depth: 1.2 },
};

// Scales a 0xRRGGBB tint's channels by `factor` (<1 darkens) — used to dim
// rows 2/3 of CROWD_EXTRAS so they recede instead of just sitting smaller.
function dimTint(hex, factor) {
    const r = Math.round(((hex >> 16) & 0xff) * factor);
    const g = Math.round(((hex >> 8) & 0xff) * factor);
    const b = Math.round((hex & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
}

const CROWD_EXTRAS = [
    {
        // Sit→stand cutout. Planted right behind the ring (not the deep
        // background crowd) at a prominent "camera favorite" scale. Down
        // to a single spot as of the 2026-07-15 reshuffle (was 6, then 5
        // after elvis took the center one) — see the grid note above.
        slug: 'oldman',
        frames: 4,
        restFrame: 1,
        sizeBasis: 'height',
        spots: [
            { x: W / 2 - 340, h: 118, flip: false, tint: 0x969086, row: 1 },
        ],
    },
    {
        // Seated cheer cycle, not a stand-up: frame1 is her resting seated
        // pose; frames 2-8 build clap → hands-up → fist-pump peak → settle
        // back down (order confirmed against the two source sheets, see
        // AI_HANDOFF.md 2026-07-15). Down to a single spot as of the
        // 2026-07-15 reshuffle (was 2) — see the grid note above.
        slug: 'browndresslady',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Derek: split the row's 8-frame reactions into two independent
        // 4-frame animations — animA (1-4, "seat behavior") on its own
        // random idle loop like the ringside extras (_scheduleTwoAnimExtra,
        // via _setupCrowdExtras), animB (5-8, "cheer") only ever fired by
        // real match events (_reactCrowdExtras, scoped to animB when
        // present — see that method's comment). randomB:false keeps the
        // idle loop from ever picking animB itself.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 - 136, h: 118, flip: false, tint: 0xa39c8d, row: 1 },
        ],
    },
    {
        // Seated throughout (frame1 calm w/ popcorn bucket; frames 2-4 eat,
        // frames 5-8 build to an open-mouth shout and a fist-pump peak with
        // popcorn flying — two source sheets, same merge pattern as
        // browndresslady). Down to a single spot as of the 2026-07-15
        // reshuffle (was 2) — see the grid note above.
        slug: 'popcornguy',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 + 272, h: 118, flip: false, tint: 0x9d9789, row: 1 },
        ],
    },
    {
        // Seated throughout (frame1 calm w/ sunglasses + a sipped drink;
        // frames 2-4 sip and lose the sunglasses in surprise; frames 5-8
        // build to a full glass-raised, fist-pumping cheer — two source
        // sheets, same merge pattern as browndresslady/popcornguy).
        slug: 'marilyn',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 + 0, h: 179, flip: false, tint: 0x9d9789, row: 3 },
        ],
    },
    {
        // Seated throughout, never stands (frame1 calm hands-folded rest;
        // frames 2-4 a subtle settle micro-loop; frames 5-8 legs spread
        // wider and one arm raises to a fist-pump peak — two source
        // sheets, same calm-then-build merge pattern as browndresslady/
        // popcornguy/marilyn; order was visually obvious from the QA
        // preview, no round-trip needed). Seated right next to marilyn
        // per Derek's request — the two spots are only 55px apart.
        slug: 'elvis',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 - 68, h: 144, flip: false, tint: 0x9d9789, row: 2 },
        ],
    },
    {
        // Seated throughout, never stands (frame1 calm w/ glasses and tie;
        // frames 2-4 a subtle hands-starting-to-move build; frames 5-8
        // build to excited talking → double fist-pump → single raised fist
        // shouting → clapping — two source sheets, same calm-then-build
        // merge pattern as browndresslady/popcornguy/marilyn/elvis; order
        // was visually obvious from the QA preview, no round-trip needed).
        // Sixth extra, placed at the reshuffle's -150 grid slot (see the
        // grid note above) rather than eating another oldman instance.
        slug: 'dizzy',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 - 204, h: 179, flip: true, tint: 0xaca496, row: 3 },
        ],
    },
    {
        // Seated throughout, never stands (frame1 calm, hands folded, cigar
        // down; frames 2-4 pick the cigar up to a raised hold; frames 5-8
        // build leaning further in, gesturing with the free hand, to a
        // pointing-outward punchline gesture — two source sheets, same
        // calm-then-build merge pattern as the other seated extras; order
        // was visually obvious from the QA preview, no round-trip needed).
        // Seventh extra, placed at the reshuffle's -205 grid slot (see the
        // grid note above).
        slug: 'groucho',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        // Derek: "can the grouchos have smoke" — cigar smoke puffs spawned
        // at the cigar tip, see _setupCrowdExtras' smokeOffset check and
        // _scheduleSmokePuff. Derek, live: "connect it to the end of his
        // cigar though, get the source right there" — read the actual cut
        // frame1.png (178x360 native): the lit tip sits ~13px in from the
        // left edge, ~50px down from the top (he's facing/holding it
        // toward his own left). Converted through _setExtraFrame's own
        // math (sizeBasis:'width' scale = spot.h/rest.h, then row 2's own
        // 0.82 scaleMul on top): offsetX = (13 - 178/2) * (144/360) * 0.82
        // ≈ -25, offsetY = -(360 - 50) * (144/360) * 0.82 ≈ -102.
        smokeOffset: { x: -25, y: -102 },
        spots: [
            { x: W / 2 - 272, h: 144, flip: false, tint: 0x9d9789, row: 2 },
        ],
    },
    {
        // Seated throughout, never stands (frame1 calm hands folded on lap;
        // frames 2-4 settle forward slightly; frames 5-8 continue that
        // forward lean, hands clasping and rising toward the chest like a
        // building applause — two source sheets, same calm-then-build merge
        // pattern as the other seated extras; order was visually obvious
        // from the QA preview, no round-trip needed). Eighth extra, placed
        // at the reshuffle's +70 grid slot (see the grid note above).
        slug: 'alfred',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 + 68, h: 118, flip: false, tint: 0x9d9789, row: 1 },
        ],
    },
    {
        // Seated throughout, never stands (frame1 reserved hands-folded
        // rest; frames 2-4 a gloved hand rises to the mouth in a delicate
        // gasp; frames 5-8 continue that gasp, hands clasped near the chin,
        // leaning further forward as the reaction builds — two source
        // sheets, same calm-then-build merge pattern as the other seated
        // extras; order was visually obvious from the QA preview, no
        // round-trip needed). Ninth extra, placed at the reshuffle's +125
        // grid slot (see the grid note above).
        slug: 'audrey',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 + 136, h: 144, flip: false, tint: 0x9d9789, row: 2 },
        ],
    },
    {
        // Seated throughout, never stands (frame1 calm hands folded in lap;
        // frames 2-4 build to hands-to-cheeks shock, wide-eyed; frames 5-8
        // continue into animated talking gestures, a bigger two-handed
        // gesture, an arms-up cheer peak, then settle back down to clasped
        // hands — two source sheets, same calm-then-build-then-settle merge
        // pattern as browndresslady; order was visually obvious from the QA
        // preview, no round-trip needed). Tenth extra, placed at the
        // reshuffle's +190 grid slot (see the grid note above).
        slug: 'lucille',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'width',
        // Seat-behavior/cheer split — see browndresslady's comment above.
        animA: [1, 2, 3, 4],
        animB: [5, 6, 7, 8],
        randomB: false,
        spots: [
            { x: W / 2 + 204, h: 179, flip: true, tint: 0x9d9789, row: 3 },
        ],
    },
    {
        // Sit→stand cutout, not seated-throughout like most of the row
        // (frame1 calm hands folded; frames 2-3 lean forward, hands
        // gripping his knees, building tension; frame4/frame5 is a hinge
        // pose shared across both source sheets — hunched forward, hands
        // gripping the chair edge, about to rise; frames 6-7 rise off the
        // chair to standing; frame8 a full standing fist-pump cheer — two
        // source sheets, same merge pattern as the others but he actually
        // gets up, so sizeBasis is 'height' like oldman rather than
        // 'width'). Eleventh extra, placed at the reshuffle's last open
        // +300 grid slot (see the grid note above) — fills the row to
        // Derek's ~10-design target plus one. row:2 continues the
        // EXTRA_ROWS index%3 interleave (see that const's comment) at his
        // own grid index (10 → row 2) — added after that system landed.
        slug: 'marlon',
        frames: 8,
        restFrame: 1,
        sizeBasis: 'height',
        spots: [
            { x: W / 2 + 340, h: 144, flip: false, tint: 0x9d9789, row: 2 },
        ],
    },
];

// Ringside photographer — deliberately NOT part of CROWD_EXTRAS: he
// shouldn't get swept into drawSecondRow/ThirdRow/FourthRow's random
// background pool (built straight off CROWD_EXTRAS) since he's a unique
// named character, not filler, and he sits beside the ring (see
// _setupPhotographer's groundY override) rather than behind it like that
// array's spots. Still reuses the same extra/spot/fan shape and
// _setExtraFrame/_reactCrowdExtras machinery via _setupPhotographer, so
// match-event reactions (pinfalls, nearfalls — see _logEvent) work for
// free once he's pushed into crowdFans.
//
// Art is profile-oriented (faces right) — two source sheets, calm seated
// with camera on his lap building to camera raised at eye level (frames
// 1-4), then rising off the chair to standing with a flash-bulb peak on the
// last frame (frames 5-8, same hinge-pose seam between sheets as marlon).
// sizeBasis 'height' since he stands, same reasoning as oldman/marlon — see
// tools/audience-cutter/cut.mjs's file-header comment for the batch-scale
// fix that was needed for his particular source resolution to actually show
// that growth (2026-07-17: his frames were all landing at an identical
// capped height, so he wasn't visibly standing at all before that fix).
const PHOTOGRAPHER = {
    slug: 'photographer',
    frames: 8,
    restFrame: 1,
    sizeBasis: 'height',
    // Derek 2026-07-17: even with cut.mjs's batch-scale fix (see that
    // file's header comment) restoring a real height difference between
    // seated and standing frames, the standing set (5-8, the second source
    // sheet) still didn't read as big enough a change — the art's own
    // proportions, not a scale bug this time. Explicit +25% on top of the
    // computed scale for just those four frames (see _setExtraFrame's
    // frameScale multiplier). Derek later, separately: "the photographer
    // seems too small when he's sitting, but the right size when he's
    // standing" — the seated frames (1-4) had no multiplier at all, just
    // the shared base scale, so they read small next to 5-8's +25%. +5%
    // on 1-4 to close that gap without matching the standing set's own
    // (much bigger, deliberately-exaggerated) jump.
    frameScale: { 1: 1.05, 2: 1.05, 3: 1.05, 4: 1.05, 5: 1.25, 6: 1.25, 7: 1.25, 8: 1.25 },
    // Frame 8 is his flash-bulb pose (see this const's frame-breakdown
    // comment above) — flashOnPeak fires a real screen flash the instant
    // he lands on it (see _setExtraFrame's flashOnPeak check and
    // _triggerCameraFlash), so "capturing the moment" actually reads as a
    // camera going off, not just a pose.
    flashOnPeak: true,
    // Derek: "his animation has him step forward from his chair, can we
    // code that in" — the art's rising sequence (frames 5-8) already reads
    // as leaning/stepping out of the chair, but until now every frame was
    // pinned to the same spot.x; only the pose changed, not his position.
    // stepOffset is an opt-in per-frame x shift (see _setExtraFrame),
    // direction-aware via spot.flip so it always steps toward the ring, not
    // just +x — a gentle forward creep peaking at the flash, then
    // _reactCrowdExtras' own down-sequence naturally carries him back to
    // spot.x as he settles back into the chair.
    stepOffset: { 5: 5, 6: 14, 7: 22, 8: 24 },
};

// Corner policeman — same "unique named character, not filler" reasoning as
// PHOTOGRAPHER: deliberately NOT part of CROWD_EXTRAS (would otherwise get
// swept into drawSecondRow/ThirdRow/FourthRow's random background pool),
// reuses the same _setupPhotographer-style setup + _setExtraFrame/
// _reactCrowdExtras machinery via _setupPoliceman.
//
// Source art (single sheet, unlike photographer/marlon's two-sheet merge —
// see AI_HANDOFF.md) is a 4x2 pose grid, not a horizontal strip: cut by
// splitting into two temp horizontal strips first (row1 -> real `policeman`
// slug frames 1-4, row2 -> renumbered into frames 5-8), each run through
// the unmodified tools/audience-cutter/cut.mjs with a shared --scale so
// both rows land on one consistent scale (native tallest frames 429px/430px
// — see that tool's file-header comment for why a shared scale matters).
// He stands at attention throughout and gradually turns from front-facing
// (frame1) to full right-profile (frame8) — no sit->stand growth, so
// sizeBasis is 'width' (anchors scale to the resting frame, same reasoning
// as marilyn/elvis/popcornguy's seated-throughout turn/gesture frames)
// rather than 'height' (which assumes a real height change is the signal,
// oldman/marlon/photographer's actual sit->stand case).
const POLICEMAN = {
    slug: 'policeman',
    frames: 8,
    restFrame: 1,
    sizeBasis: 'width',
};

// Lou Thesz's manager, Ed "Strangler" Lewis — same "unique named character,
// not filler" treatment as PHOTOGRAPHER/POLICEMAN: kept out of CROWD_EXTRAS,
// own const, built via the shared _setupTwoAnimExtra. Source art is another
// single-sheet 4x2 pose grid (1717x916, same shape as the policeman's
// sheet), cut the same
// way: split into two temp horizontal-strip PNGs (row1 -> real
// `stranglerlewis` slug frames 1-4, row2 -> a temp slug renumbered into
// frames 5-8), each run through unmodified cut.mjs with a shared --scale
// (native tallest frames 418px/417px — no real growth signal, matches the
// policeman's case). He stands throughout, building from a calm profile
// stance through a shout, a cupped-hand call, and a pointing accusation
// (frames 1-4) into a fist-pump, a pointing jab, an open-handed plea, and
// back to a calm profile (frames 5-8) — no sit->stand growth, so
// sizeBasis is 'width' like POLICEMAN, not 'height'.
//
// Derek: split the 8-frame sequence into two independent 4-frame animations
// that fire off intermittently, rather than one continuous 8-frame build
// tied to match events — closer to the policeman's own independent-loop
// treatment than the photographer/CROWD_EXTRAS' crowdFans hook, except with
// two distinct animations to alternate between instead of one variable-
// depth turn. ANIM_A (frames 1-4: calm -> shout -> cupped-hand call ->
// pointing accusation) and ANIM_B (frames 5-8: fist-pump -> pointing jab ->
// open-handed plea -> settles back to a calm profile, already reads as
// resolved by frame8) are each their own self-contained cycle — see
// _setupTwoAnimExtra/_scheduleTwoAnimExtra, the generic version of what was
// originally a lewis-only method (generalized once ANNOUNCER/BELL_RINGER
// below needed the identical two-anim shape — see those consts).
//
// Facing convention is the OPPOSITE of PHOTOGRAPHER/POLICEMAN: this sheet's
// rest pose (frame1) faces LEFT natively (confirmed against the cut frame,
// not assumed from the other two extras' convention) — so a RIGHT-side
// placement needs flip:false to face into the ring, not flip:true.
const STRANGLER_LEWIS = {
    slug: 'stranglerlewis',
    frames: 8,
    restFrame: 1,
    sizeBasis: 'width',
    animA: [1, 2, 3, 4],
    animB: [5, 6, 7, 8],
};

// Ringside broadcast pair — announcer (mic + folding chair) and timekeeper/
// bell-ringer (stopwatch, mallet, bell, small table), Derek's follow-up ask
// after "who else might be ringside." Same single-sheet 4x2 grid shape and
// cut process as STRANGLER_LEWIS/POLICEMAN (both sheets 1716x916, split into
// two temp row-strips, each run through cut.mjs with a shared --scale:
// announcer 0.8491/native 424px+385px, bellringer 0.8824/native 408px+
// 423px). Both stand — well, sit — throughout with no real height change,
// so sizeBasis 'width' like every other seated/standing-in-place extra.
//
// Both sheets' own furniture (mic stand, table/bell) is baked into the art
// itself rather than drawn separately in code — simpler than trying to
// hand-match a procedural table's perspective/scale to two independently
// generated character sheets, and it means each can be placed and scaled
// independently without needing to share one literal prop.
//
// Facing convention matches PHOTOGRAPHER/POLICEMAN (right natively,
// confirmed against each cut frame1.png), NOT stranglerlewis's reversed
// convention — flip:false reads correctly on the LEFT side of the ring,
// same side the photographer already sits on.
//
// Frame breakdowns (same asymmetric animA-reverses/animB-snaps shape as
// STRANGLER_LEWIS, since both sheets' frame4 and frame8 already read as
// settled/neutral rather than mid-gesture):
// ANNOUNCER animA [1-4]: neutral -> leans into mic -> gestures toward the
//   ring -> big emphatic call, arm raised. animB [5-8]: neutral (near-
//   identical to 1) -> cups a hand to listen -> animated talking gesture ->
//   settles back to neutral.
// BELL_RINGER animA [1-4]: neutral -> checks stopwatch -> sets it down ->
//   neutral rest. animB [5-8]: mallet raised -> mid-strike on the bell ->
//   follow-through -> settles back to neutral, stopwatch back in hand.
const ANNOUNCER = {
    slug: 'announcer',
    frames: 8,
    restFrame: 1,
    sizeBasis: 'width',
    animA: [1, 2, 3, 4],
    animB: [5, 6, 7, 8],
};
const BELL_RINGER = {
    slug: 'bellringer',
    frames: 8,
    restFrame: 1,
    sizeBasis: 'width',
    animA: [1, 2, 3, 4],
    animB: [5, 6, 7, 8],
    // Derek: "he should only hit the bell when the match begins or ends...
    // I'm ok with him picking up and putting down the stop watch at
    // random." randomB:false opts him out of _scheduleTwoAnimExtra's
    // random animA/animB coin flip — animA (the stopwatch) still fires on
    // its normal intermittent schedule, animB (the bell strike) only ever
    // plays via the explicit _ringTimekeeperBell() call from the real
    // match-start/match-end bell moments in _endMatch.
    randomB: false,
};

// "Backs of heads" foreground crowd — Derek dropped four real cutouts
// (backheadlady1/2, backheadman1/2, each an 8-frame 4x2 grid, same cut
// process as the other single-sheet designs above) to replace
// drawSideCrowd's fgRow1/fgRow2, which until now were flat procedural
// fillCircle/fillEllipse blobs, not real art. Unlike every extra above,
// these are MULTI-INSTANCE filler — 20 seats total (see drawSideCrowd's
// FG_ROW1/FG_ROW2 arrays) each randomly assigned one of these 4 designs,
// not one unique named character per design.
//
// All 8 frames read as one pool of small idle fidgets (head-angle shifts,
// an occasional hand-to-hair/hat adjustment, a slight body turn) with no
// clear "build to a peak" the way the front-row extras' frames do — there's
// no seat/cheer split here, just _scheduleBackCrowdIdle picking a random
// frame to visit and back on its own loop, same shape as
// _schedulePolicemanScan. sizeBasis 'width' — seated throughout, no growth.
const BACK_CROWD = [
    { slug: 'backheadlady1', frames: 8, restFrame: 1, sizeBasis: 'width' },
    { slug: 'backheadlady2', frames: 8, restFrame: 1, sizeBasis: 'width' },
    { slug: 'backheadman1', frames: 8, restFrame: 1, sizeBasis: 'width' },
    { slug: 'backheadman2', frames: 8, restFrame: 1, sizeBasis: 'width' },
];

// Crowd reaction swell per match event type (0..1)
const POP_SIZES = {
    pinfall: 1.0, sleeperKO: 1.0, nearfall: 0.9, kickout: 0.6,
    knockdown: 0.55, ropeBreak: 0.5, sleeperEscape: 0.5, grappleBlock: 0.5,
    pinAttempt: 0.45, sleeperApplied: 0.4, dodge: 0.3, stagger: 0.25, move: 0.18,
};

export default class Arena extends Phaser.Scene {
    constructor() {
        super('Arena');
    }

    preload() {
        for (const char of CHARACTERS) {
            // Base parts and move/expression variants share one manifest seam.
            // Non-file rig metadata is filtered by enumerateCharacterAssets.
            for (const asset of enumerateCharacterAssets(char)) this.load.image(asset.key, asset.file);
        }
        for (const extra of CROWD_EXTRAS) {
            for (let i = 1; i <= extra.frames; i++) {
                this.load.image(`${extra.slug}${i}`, `src/assets/audience/${extra.slug}/frame${i}.png`);
            }
        }
        // Unique named ringside characters (kept out of CROWD_EXTRAS — see
        // PHOTOGRAPHER's comment for why), each still a flat multi-frame
        // sprite sheet cut via the same audience-cutter pipeline.
        for (const extra of [PHOTOGRAPHER, POLICEMAN, STRANGLER_LEWIS, ANNOUNCER, BELL_RINGER]) {
            for (let i = 1; i <= extra.frames; i++) {
                this.load.image(`${extra.slug}${i}`, `src/assets/audience/${extra.slug}/frame${i}.png`);
            }
        }
        // Multi-instance filler designs (see BACK_CROWD's comment) — same
        // per-frame load shape, just not one-const-per-instance.
        for (const extra of BACK_CROWD) {
            for (let i = 1; i <= extra.frames; i++) {
                this.load.image(`${extra.slug}${i}`, `src/assets/audience/${extra.slug}/frame${i}.png`);
            }
        }
    }

    create() {
        this.drawArenaBackground();
        this.createSmokeTexture();
        this.createDustTexture();
        this.drawSecondRow();
        this.drawThirdRow();
        this.drawFourthRow();
        this.drawFifthRow();
        this.drawSixthRow();
        this._setupAmbientSmokers();
        this._setupDustMotes();
        this._scheduleAmbientCameraFlash();
        this._setupCrowdExtras();
        // Ringside photographer. The "genuinely ringside" move to
        // groundY=465 put his feet inside the near apron's own 445-490
        // y-span — he read as standing on the apron/in the ring itself once
        // actually seen, not ringside at all. Derek: "go back to where he
        // was, he just needed to be nudged a little" — back to the
        // x=70/h=140/groundY=380 spot (see git history) with a small nudge:
        // x=85, groundY=400 (position only — "he can stay where he is" on
        // the next round of feedback). h bumped 145→181 (+25%, Derek: "made
        // 25 percent bigger in his seating phase and his standing phase" —
        // one h change covers both since sizeBasis:'height' scales every
        // frame off this single value, frameScale below layering on top for
        // frames 5-8 same as before). Depth set in _setupPhotographer, see
        // that call for the "stacked behind the ring canvas" reasoning.
        // groundY nudged 400→418 (Derek: "his knees are above ring level"
        // — his seated knee height was floating clear of the mat's near
        // edge instead of reading as grounded against it), then one more
        // small nudge 418→428 ("just a little nudge lower"). Then, while
        // tuning the announcer/bell-ringer cluster beside him: "move the
        // photographer slightly down the y and slightly back" — groundY
        // 428->438, x 85->75.
        this._setupPhotographer(75, 181, 438);
        // Corner policeman. Landed first beside the near-right post
        // (x=905/h=140/groundY=415 — see git history for that round,
        // including the drawSideCrowd right-flank occlusion bug found and
        // fixed along the way). Derek then asked to move him to the
        // upper-right (far-right) post instead — RING.farRight = (750,258),
        // a separate fixed post from the near-right one, own vertical span
        // (drawPosts: y 138-274) — and make him "a little taller, maybe as
        // tall as the second rope." groundY=270 sits at that post's own
        // base; h=90 puts his head at RING.ropes[1].farY=181 (the second
        // rope's far-side height) at that groundY — a direct read of
        // Derek's ask, not a perspective-scaled guess (he's deliberately
        // larger than the deep background crowd at this depth would
        // otherwise suggest). x=790 clears the ring's own boundary at this
        // y (~761, receding-perspective boundary formula — see rightBoundary
        // in the old drawSideCrowd, same geometry) with ~30px margin, while
        // staying close to the post's own x=750. Confirmed via
        // window.__WFM_GAME measurement + screenshot, not guessed blind.
        // flip:true (default) since the art faces right natively (see
        // POLICEMAN's comment) but every right-side corner needs him
        // facing left, into the ring — Derek's planning one of these per
        // corner, hence _setupPoliceman now takes flip as a param instead
        // of hardcoding it.
        // 2x size, head held at the same screen position: origin is
        // (0.5,1) (bottom-center = groundY), so top-of-head = groundY - h.
        // Old top = 270-90 = 180; new h=180 needs groundY=180+180=360 to
        // keep that same top.
        this._setupPoliceman(790, 180, 360);
        // Second corner policeman — Derek's planned "one per corner" follow-
        // through (see the comment directly above). Near-left post
        // (RING.nearLeft = {x:40, y:445}), "above the announcer" (whose own
        // groundY is 380 — see the announcer/bell-ringer cluster below).
        // Same h=180 as the far-right cop for visual consistency (same
        // character, same apparent scale). flip:false this time — the art
        // faces right natively, and on the LEFT side that already faces
        // into the ring, same reasoning as the photographer's own
        // flip:false at this same post. Then "about a half inch down the y
        // axis and two inches forward on the x axis" — translated to
        // screen-space nudges at roughly the same small/bigger ratio:
        // groundY 320->335, x 40->100. Then "stacked behind the announcer,
        // another half inch down the y axis and two more inches on the x"
        // — depth 2.8->2.6 (below the announcer's own 2.7, so the
        // announcer draws in front of him where they overlap, same
        // stacking trick as the announcer/photographer pair), groundY
        // 335->350, x 100->160.
        this._setupPoliceman(160, 180, 350, false, 2.6);
        // Ed "Strangler" Lewis, Lou Thesz's manager. Derek: ringside, below
        // the cop, not fully covering him, same (right) side of the ring —
        // then, live, "he's facing with his back to the ring" (flip fixed,
        // see STRANGLER_LEWIS's comment), "needs to be at least 25
        // percent larger" (h 140 -> 175), "25 percent bigger again"
        // (175 -> 219), "yikes, 15 percent smaller than now" (219 -> 186,
        // technically correct but read as too big a swing live: "incredible
        // hulk to danny devito"), now split the difference between those
        // two (203, midpoint of 186/219) rather than another single-
        // direction guess. groundY held at 440 throughout (origin (0.5,1)
        // means h grows/shrinks from his planted feet, not the reverse).
        // Uses the generic _setupTwoAnimExtra (was a lewis-only method,
        // generalized below once the announcer/bell-ringer pair needed the
        // identical two-intermittent-animation shape).
        this._setupTwoAnimExtra(STRANGLER_LEWIS, 850, 203, 440, false);
        // Ringside announcer + timekeeper/bell-ringer pair, Derek's pick
        // after "who else might be ringside." Placed on the LEFT side, past
        // the photographer (x=85), so the right side doesn't get any more
        // crowded than it already is with the cop + Lewis. Both face right
        // natively (see ANNOUNCER/BELL_RINGER's comment) which already
        // reads as facing into the ring from this side, so flip:false —
        // no reversed-facing mistake to repeat this time.
        //
        // Different placement convention than every prior ringside extra —
        // see _setupTwoAnimExtra's depth-param comment for why. First pass
        // used groundY=440/h=190 (photographer/lewis's "beside the ring"
        // convention, depth 2.8): both sheets are ~150-175px wide (whole
        // cutout is character+table), wide enough that at any x with real
        // clearance from a corner post, the entire footprint landed inside
        // the ring's mat trapezoid at that y and rendered as nothing —
        // confirmed via window.__WFM_GAME (positions correct) + a
        // screenshot (nothing there). Moved IN FRONT of the ring instead —
        // groundY=505 sits just past RING.apronY (490, the mat's own front
        // skirt), depth=12 (above the foreground "backs of heads" crowd
        // silhouettes at depth 11 in drawSideCrowd, so they read as the
        // closest, most prominent ringside figures, not tucked behind
        // anonymous filler). h dropped 190->105 to match — at groundY=505
        // the old h=190 would put the top of his head at y=315, up inside
        // the rope band (RING.ropes' nearY values run 251-380), visibly
        // clipping through the ropes; h=105 keeps the top around y=400,
        // comfortably below the near ropes' y=380 floor.
        //
        // Re-positioned again, live: Derek wanted them on the same side as
        // the photographer (x=85) instead of spread further right along
        // the front — announcer above him, bell-ringer below him — then
        // "also need to be made 50 percent larger" (h 105 -> 158). Same
        // depth=12 in-front-of-the-ring convention throughout (depth-
        // ordered, not y-dependent, so it renders correctly at any
        // groundY — see _setupTwoAnimExtra's comment).
        //
        // First announcer placement (groundY=380, x=85, same x as the
        // photographer) read as "basically on the photographer's head" —
        // a different groundY than the photographer's own 428 put him on a
        // different ground line entirely, floating with his chair legs in
        // open air rather than planted beside him. Derek: "think of his
        // chair as on train tracks, he's to the left/above the journalist,
        // but they are on the same ground" — groundY matched to the
        // photographer's 428 (same ground line), x moved left instead of
        // groundY moved up to read as "above" (offset along the same
        // track, not stacked on a different one). Same-ground fix read as
        // "better, but on his other side" — x flipped from 40 (left of the
        // photographer) to 200 (right of him, toward the ring) — but 200
        // read as "he's in the ring now" (too far right at depth=12, which
        // draws in front of the mat regardless of position, so nothing
        // stopped him from reading as standing on the mat itself instead of
        // beside it). Derek: "from the journalist, he moves only slightly
        // right on the x axis and up the y axis, the journalist should
        // stack in front of him and the stage in front of both of them" —
        // a real depth-ordering ask, not just a position tweak. Dropped the
        // depth=12 in-front-of-everything convention for the announcer
        // specifically and went back to the photographer/policeman/lewis
        // "beside/behind the ring" shape instead: depth=2.7 (just below the
        // photographer's 2.8, so the photographer draws in front of him
        // where they overlap; both still below drawRingMat's 3, so the mat
        // — "the stage" — occludes both, same as it already does the
        // photographer). Position is a small offset from the photographer's
        // own spot (85, 428), not a fresh guess: x+20, groundY-18. Then
        // "back him up slightly and move him a few more up the y axis" —
        // x pulled back in 105->95, groundY nudged up further 410->395.
        // Then, once the bell-ringer's own position settled: "move the
        // announcer slightly back on the x axis" — x 95->85. Then
        // "decreased in size by five percent" — h 158->150. Then "move him
        // slightly up the y axis" — groundY 395->380. Then "forward on the
        // x axis slightly" — x 85->95. Then "made five percent smaller
        // again" — h 150->143.
        this._setupTwoAnimExtra(ANNOUNCER, 95, 143, 380, false, 2.7);
        // "now the time keeper will be slightly up the y from the
        // announcer" — groundY moved from 505 (its old standalone
        // in-front-of-the-ring spot) to just above the announcer's own 395.
        // Then: "he needs to be stacked below the photographer, announcer
        // and ring, a bit further up the y axis and 25 percent upscaled" —
        // dropped the depth=12 in-front-of-everything convention (same fix
        // as the announcer got) for depth=2.6, below the announcer's 2.7
        // (and transitively below the photographer's 2.8 and drawRingMat's
        // 3). groundY nudged 380->365, h scaled 158->198 (+25%) — but that
        // read as "clearly upscaled more than 25 percent" live, so dialed
        // back to +5% off the original 158 instead: 158 -> 166. Then
        // "move him slightly down the y axis and a bit forward on the x
        // axis" — groundY 365->378, x 85->95. Then, an audition: "I want
        // to audition the time keeper in front of the ring, his table
        // should be about at the head level of the audience, but since
        // he's closer, he would also change size" — back to the depth=12
        // in-front-of-everything convention (like the very first pass, see
        // _setupTwoAnimExtra's comment), sized up since foreground reads
        // as closer/bigger. Table sits ~56% down frame1.png's own height
        // (read directly off the cut frame, not guessed) — solved groundY
        // so that point lands around y=545, matching drawSideCrowd's
        // closest foreground crowd row (fgRow1, heads at y~542-556).
        // h bumped 166->220 for the "closer = bigger" read; groundY solves
        // to ~640, past the canvas's own H=600 bottom edge — intentional,
        // not a bug: fgRow1 itself is "cropped just below shoulders" by
        // design (see that row's own comment), so a closer, named
        // character running past the same edge is consistent with it,
        // not broken. Derek: "he looks good, move him just a bit up the y
        // axis and stack him in front of the lower left ring post" —
        // groundY 640->620, x 95->45 (RING.nearLeft.x=40, near posts drawn
        // in drawPosts at x=nearLeft.x/nearRight.x), depth bumped 12->26,
        // above drawPosts' near-post depth of 25.7, so he draws in front of
        // the post rather than behind it. Then "forward a bit on the x
        // axis" — x 45->65, then "a bit more on the x axis" — x 65->85.
        // Return value captured this time (unlike every other
        // _setupTwoAnimExtra call) — _ringTimekeeperBell needs a handle on
        // this specific fan to fire his bell-strike animation from
        // _endMatch's real match-start/end bell moments.
        // "let's move the timekeeper up closer to the ringside" -> "up the
        // y axis" — groundY 620->530. Then "forward on the x axis and a
        // little bit down the y axis" — x 85->105, groundY 530->550. Then
        // "a little bit more forward on the x axis and a little bit down
        // the y axis again" — x 105->120, groundY 550->565. Then "same
        // adjustment one more time" — x 120->135, groundY 565->580. Then
        // "five percent smaller" — h 220->209 -> 199 (five percent again).
        this.bellRingerFan = this._setupTwoAnimExtra(BELL_RINGER, 135, 199, 580, false, 26);
        this.drawSideCrowd();
        this.drawFarApronAndRopes();
        this.drawRingMat();
        this._drawRingMarkings();
        this.drawNearApron();
        this._setupDynamicRopes();
        this.drawPosts();
        this._setupArenaLighting();
        this.createScanlines();

        this.grainGfx = this.add.graphics().setDepth(60);

        this.flickerOverlay = this.add.graphics().setDepth(70);
        this.flickerOverlay.fillStyle(0xffffff, 1);
        this.flickerOverlay.fillRect(0, 0, W, H);
        this.flickerOverlay.setAlpha(0);

        // Camera-flash glow (see _triggerCameraFlash) — created here rather
        // than lazily in update() so it's part of the same children-list
        // snapshot the HUD camera setup below takes; an object created
        // after that snapshot wouldn't be in hudCam's ignore list and would
        // render on both cameras.
        //
        // Was a Graphics object redrawn every frame with 2 raw fillCircle
        // calls — Derek: "the flashes have circular edges now and look
        // weird." Two discrete hard-edged discs (even at different alphas)
        // reads as visible rings, not a soft glow — same problem
        // createSmokeTexture/createDustTexture already solved for their
        // own effects. Switched to a single baked feathered texture
        // (createFlashTexture) on a reused Image instead, matching that
        // fix.
        this.createFlashTexture();
        this.cameraFlashImg = this.add.image(0, 0, 'cameraFlashGlow').setDepth(70).setVisible(false);

        try {
            const cam = this.cameras.main;
            const cm = cam.filters.internal.addColorMatrix();
            cm.colorMatrix.grayscale(1);
            cam.filters.external.addVignette(0.5, 0.5, 0.82, 0.45);
            // Derek: "should we try applying barrel distortion and warping
            // the edges to look like an old crt tv." Phaser 4 has a native
            // Barrel filter for exactly this (amount=1 is no distortion,
            // >1 bulges outward like curved glass, <1 pinches inward) —
            // same camera-filter mechanism the grayscale/vignette above
            // already use, no new per-object work. Started subtle (1.06)
            // per Derek's own caveat that heavy CRT curvature crops/warps
            // edge content in a way that reads as a bug, not style. Then
            // "reduce the barrel distortion by half" — half the deviation
            // from 1 (the no-distortion baseline), 1.06 -> 1.03.
            //
            // Derek then asked why it reads as localized to the center and
            // whether the circle could be made to cover the width. Checked
            // the actual shader (FilterBarrel.frag) and tested at an
            // exaggerated amount (1.6) to see the real shape empirically
            // rather than guess: the masked region (`length(xy) < 1.0`) is
            // an ellipse that already touches all four edge-midpoints
            // (left, right, top, bottom), just not the four corners — the
            // ropes visibly bowed out to the left/right screen edges at
            // 1.6. So "cover the width" isn't the actual fix, because it
            // already does; at a subtle amount like 1.03 the displacement
            // is just near-zero right at the ellipse's own edge (a fixed
            // point of the pow() curve by construction) and only reads as
            // visible in the middle, where the ring's long straight lines
            // make bending easy to spot against busier crowd detail near
            // the edges. Derek: "push everything" — 1.03 -> 1.2, past the
            // subtle range into clearly-visible-at-the-edges territory,
            // short of the 1.6 test's more dramatic warp. Then, live: "half
            // the amount of barrel distortion, it just really kicked in" —
            // half the deviation from 1 again, 1.2 -> 1.1 -> 1.05
            // ("maybe half that").
            cam.filters.external.addBarrel(1.05);
        } catch (e) {
            console.warn('Camera filters unavailable:', e.message);
        }

        // Debug time-scale (?ts=3): game dt, tween clocks, and delayed calls all
        // scale together so move timing stays in sync. For headless sims only —
        // makes big-N balance runs feasible (8-min matches at 2× headless slowdown
        // were taking ~16 wall-minutes each).
        this.timeScale = Number(new URLSearchParams(location.search).get('ts')) || 1;
        if (this.timeScale !== 1) {
            this.tweens.timeScale = this.timeScale;
            this.time.timeScale   = this.timeScale;
        }

        this.showTitleCard();
        this._setupGame();

        // HUD camera — renders meters/clock without the vignette so they stay
        // readable at the frame edges. Gets its own grayscale filter so the
        // colored stamina bars keep the B/W broadcast look. Objects created
        // after this point render on both cameras unless ignored on one.
        try {
            const hudObjects = [this.staminaGfx, this.heatGfx, this.heatLbl, this.clockLbl, this.p1ModeLbl, this.p2ModeLbl];
            this.hudCam = this.cameras.add(0, 0, W, H);
            const cmHud = this.hudCam.filters.internal.addColorMatrix();
            cmHud.colorMatrix.grayscale(1);
            this.hudCam.ignore(this.children.list.filter(o => !hudObjects.includes(o)));
            this.cameras.main.ignore(hudObjects);
        } catch (e) {
            console.warn('HUD camera unavailable:', e.message);
        }
    }

    drawArenaBackground() {
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x0e0e0e, 1);
        gfx.fillRect(0, 0, W, H);

        // Arena light warming the upper half where the crowd sits
        gfx.fillStyle(0x222220, 1);
        gfx.fillRect(0, 0, W, 170);

        gfx.fillStyle(0x1a1a18, 1);
        gfx.fillRect(0, 170, W, 200);
    }

    // First row added back behind the front row (2026-07-16), one row only
    // — the plan going forward is to confirm each row looks right live
    // before adding the next, rather than designing a multi-row system
    // blind. Depth is read the same way the front row already reads
    // distance — smaller scale and a *smaller* y (higher up on screen)
    // than the front row's groundY, since a camera pitched slightly down
    // projects a further-back point higher in frame. Row is staggered half
    // the front row's seat spacing off its x grid so it doesn't sit as an
    // obvious second copy directly above each front-row seat.
    //
    // Composition was originally 25% oldman, 25% browndresslady, 50% any
    // design at random, per Derek's own explicit ask at the time — dropped
    // 2026-07-18 ("we can stop the 50 percent oldman and browndresslady
    // scheme") for uniform random across the full pool; see pick()'s own
    // comment.
    //
    // Follow-up same session: brought closer (bigger scale, lower/closer Y)
    // per Derek's read that the first pass sat too small/far; no-adjacent-
    // repeat pick so the same design can't land next to itself twice in a
    // row; and ambient flicker motion (same restFrame<->altFrame idea as
    // the front row's reactions, just idle-triggered instead of event-
    // triggered) so the row doesn't sit frozen like the first pass did.
    drawSecondRow() {
        let s = 42017;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        const pool = CROWD_EXTRAS.map(e => {
            const key = `${e.slug}${e.restFrame}`;
            const src = this.textures.get(key).getSourceImage();
            return { key, h: src.height, slug: e.slug, restFrame: e.restFrame, frames: e.frames };
        });
        // Derek: "we can stop the 50 percent oldman and browndresslady
        // scheme" — was a deliberate 25%/25%/50%-random weighting (see
        // drawSecondRow's own header comment for the original ask); now
        // uniform across the full pool, same no-adjacent-repeat guard.
        let prevKey = null;
        const pick = () => {
            let design;
            let attempts = 0;
            do {
                design = pool[Math.floor(rand() * pool.length)];
                attempts++;
            } while (design.key === prevKey && attempts < 8);
            prevKey = design.key;
            return design;
        };

        // COUNT 16->26, X span ±280->±450 — Derek: "I want to fill all the
        // negative space" (found via screenshot: big empty flanks on both
        // sides of the ring, well past where these rows' old ±280 span
        // ended at x 200-760 on a 960-wide canvas). COUNT scaled with the
        // wider span (880/560 ratio) to keep the same seat density rather
        // than just spreading the existing 16 thinner.
        const COUNT = 26;
        const SPOT_H = 90; // brought closer/bigger from the first pass's 72
        const Y = 268; // brought closer/lower from the first pass's 236, still above the front row's ~300-320 groundY
        const X_START = W / 2 - 450, X_END = W / 2 + 450;
        const STAGGER = 20; // half the front row's ~40-65px spacing

        for (let i = 0; i < COUNT; i++) {
            const t = i / (COUNT - 1);
            // Per-seat jitter (each row's own already-distinct RNG stream)
            // — Derek: "something needs to happen so that they don't look
            // like they are stacked on top of each other... it looks off."
            // Every row shared the exact same X_START/X_END/STAGGER/COUNT,
            // so seat i landed at the identical x in all five rows —
            // literal vertical columns of figures rising straight through
            // the whole crowd. The jitter desyncs that since no two rows'
            // rand() sequences match. First pass used ±25px and Derek:
            // "that made it look horrible, way more subtle was needed" —
            // seats are only ~35px apart at this COUNT/span, so ±25 was
            // overlapping/scattering seats into their neighbors' space
            // rather than just breaking the column alignment. Dropped to
            // ±7, enough to desync without disrupting the spacing.
            const cx = X_START + t * (X_END - X_START) + STAGGER + (rand() - 0.5) * 14;
            const design = pick();
            const flip = rand() < 0.5;
            const scale = SPOT_H / design.h;
            const img = this.add.image(cx, Y, design.key)
                .setOrigin(0.5, 1)
                .setDepth(1)
                .setTint(0x6e6e6e) // dimmer than row 1's ~0x96-0xac tints — depth falloff behind the front row
                .setScale(flip ? -scale : scale, scale);
            this._scheduleAmbientFlicker(img, design);
        }
    }

    // Third row, same template as drawSecondRow (same pool-weighting, same
    // no-adjacent-repeat pick, same stagger/count) — only the depth cue
    // changes: SPOT_H and Y both stepped down by the same ratio row 2 used
    // over the front row (~0.82×), continuing that recession instead of
    // guessing new numbers. Own RNG seed so its design/flip picks don't
    // mirror row 2's seat-for-seat. Row 2 was signed off as-is (Derek
    // 2026-07-16) — left untouched here, including its plain (non-cheer)
    // _scheduleAmbientFlicker call.
    //
    // Cheer: row 3 passes `{ cheer: true }` so a fraction of its idle
    // cycles jump all the way to each design's own peak frame (last frame —
    // every CROWD_EXTRAS design's sequence builds to a fist-pump/cheer peak
    // there, see the per-design comments above) instead of just the subtle
    // restFrame<->frame2 flicker row 2 uses.
    drawThirdRow() {
        let s = 71309;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        const pool = CROWD_EXTRAS.map(e => {
            const key = `${e.slug}${e.restFrame}`;
            const src = this.textures.get(key).getSourceImage();
            return { key, h: src.height, slug: e.slug, restFrame: e.restFrame, frames: e.frames };
        });
        // Derek: "we can stop the 50 percent oldman and browndresslady
        // scheme" — was a deliberate 25%/25%/50%-random weighting (see
        // drawSecondRow's own header comment for the original ask); now
        // uniform across the full pool, same no-adjacent-repeat guard.
        let prevKey = null;
        const pick = () => {
            let design;
            let attempts = 0;
            do {
                design = pool[Math.floor(rand() * pool.length)];
                attempts++;
            } while (design.key === prevKey && attempts < 8);
            prevKey = design.key;
            return design;
        };

        // COUNT 16->26, X span ±280->±450 — Derek: "I want to fill all the
        // negative space" (found via screenshot: big empty flanks on both
        // sides of the ring, well past where these rows' old ±280 span
        // ended at x 200-760 on a 960-wide canvas). COUNT scaled with the
        // wider span (880/560 ratio) to keep the same seat density rather
        // than just spreading the existing 16 thinner.
        const COUNT = 26;
        const SPOT_H = 74; // row 2's 90 × ~0.82, the same step-down row 2 used over the front row
        const Y = 226;     // row 2's 268 × ~0.82
        const X_START = W / 2 - 450, X_END = W / 2 + 450;
        const STAGGER = 20;

        for (let i = 0; i < COUNT; i++) {
            const t = i / (COUNT - 1);
            // Per-seat jitter (each row's own already-distinct RNG stream)
            // — Derek: "something needs to happen so that they don't look
            // like they are stacked on top of each other... it looks off."
            // Every row shared the exact same X_START/X_END/STAGGER/COUNT,
            // so seat i landed at the identical x in all five rows —
            // literal vertical columns of figures rising straight through
            // the whole crowd. The jitter desyncs that since no two rows'
            // rand() sequences match. First pass used ±25px and Derek:
            // "that made it look horrible, way more subtle was needed" —
            // seats are only ~35px apart at this COUNT/span, so ±25 was
            // overlapping/scattering seats into their neighbors' space
            // rather than just breaking the column alignment. Dropped to
            // ±7, enough to desync without disrupting the spacing.
            const cx = X_START + t * (X_END - X_START) + STAGGER + (rand() - 0.5) * 14;
            const design = pick();
            const flip = rand() < 0.5;
            const scale = SPOT_H / design.h;
            const img = this.add.image(cx, Y, design.key)
                .setOrigin(0.5, 1)
                .setDepth(0.9) // below row 2's depth 1 — row 3 is farther back, must draw/occlude behind it, not on top
                .setTint(0x4b4b4b) // darker than row 2's 0x6e6e6e — continues the depth falloff
                .setScale(flip ? -scale : scale, scale);
            this._scheduleAmbientFlicker(img, design, { cheer: true });
        }
    }

    // Fourth row, same template as drawThirdRow (weighting/no-adjacent-
    // repeat/stagger/count/cheer all identical) — SPOT_H/Y stepped down by
    // the same ~0.82× ratio again (continuing 118→90→74→61, 300ish→268→
    // 226→185), own RNG seed, and one tint step darker than row 3's
    // 0x4b4b4b per Derek's "a little darker than before."
    drawFourthRow() {
        let s = 130111;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        const pool = CROWD_EXTRAS.map(e => {
            const key = `${e.slug}${e.restFrame}`;
            const src = this.textures.get(key).getSourceImage();
            return { key, h: src.height, slug: e.slug, restFrame: e.restFrame, frames: e.frames };
        });
        // Derek: "we can stop the 50 percent oldman and browndresslady
        // scheme" — was a deliberate 25%/25%/50%-random weighting (see
        // drawSecondRow's own header comment for the original ask); now
        // uniform across the full pool, same no-adjacent-repeat guard.
        let prevKey = null;
        const pick = () => {
            let design;
            let attempts = 0;
            do {
                design = pool[Math.floor(rand() * pool.length)];
                attempts++;
            } while (design.key === prevKey && attempts < 8);
            prevKey = design.key;
            return design;
        };

        // COUNT 16->26, X span ±280->±450 — Derek: "I want to fill all the
        // negative space" (found via screenshot: big empty flanks on both
        // sides of the ring, well past where these rows' old ±280 span
        // ended at x 200-760 on a 960-wide canvas). COUNT scaled with the
        // wider span (880/560 ratio) to keep the same seat density rather
        // than just spreading the existing 16 thinner.
        // COUNT bumped 26->32 (past the "fill negative space" pass, above)
        // — Derek: "go back to how it was [drop the center-density warp]
        // and in the back three rows have less distance between each
        // person, have it be less as each row goes back." Same X_START/
        // X_END span as row 2/3, more seats packed into it — tighter
        // spacing here, tighter again in rows 5/6 below.
        const COUNT = 32;
        const SPOT_H = 61; // row 3's 74 × ~0.82
        const Y = 185;     // row 3's 226 × ~0.82
        const X_START = W / 2 - 450, X_END = W / 2 + 450;
        const STAGGER = 20;

        for (let i = 0; i < COUNT; i++) {
            const t = i / (COUNT - 1);
            // Per-seat jitter (each row's own already-distinct RNG stream)
            // — Derek: "something needs to happen so that they don't look
            // like they are stacked on top of each other... it looks off."
            // Every row shared the exact same X_START/X_END/STAGGER/COUNT,
            // so seat i landed at the identical x in all five rows —
            // literal vertical columns of figures rising straight through
            // the whole crowd. The jitter desyncs that since no two rows'
            // rand() sequences match. First pass used ±25px and Derek:
            // "that made it look horrible, way more subtle was needed" —
            // seats are only ~35px apart at this COUNT/span, so ±25 was
            // overlapping/scattering seats into their neighbors' space
            // rather than just breaking the column alignment. Dropped to
            // ±7, enough to desync without disrupting the spacing.
            const cx = X_START + t * (X_END - X_START) + STAGGER + (rand() - 0.5) * 14;
            const design = pick();
            const flip = rand() < 0.5;
            const scale = SPOT_H / design.h;
            const img = this.add.image(cx, Y, design.key)
                .setOrigin(0.5, 1)
                .setDepth(0.8) // below row 3's depth 0.9 — farthest back, must occlude behind everything in front
                .setTint(0x343434) // darker than row 3's 0x4b4b4b — continues the depth falloff
                .setScale(flip ? -scale : scale, scale);
            this._scheduleAmbientFlicker(img, design, { cheer: true });
        }
    }

    // Fifth row — Derek: "I think we need at least two more rows behind...
    // it still doesn't seem like a big enough crowd." Same template as
    // rows 2-4 (weighting/no-adjacent-repeat/stagger/count/cheer all
    // identical), SPOT_H/Y stepped down the same ~0.82× ratio again
    // (61->50, 185->152), own RNG seed. Tint drops to near-silhouette
    // (0x202020, down from row 4's 0x343434) per "they can be silhouette
    // like the last row" — but each seat has a 20% chance of rolling one
    // of the brighter row 2-4 tints instead (visibleTints below) per "some
    // of them could randomly be a little visible," so the row isn't a
    // uniformly flat silhouette mass.
    drawFifthRow() {
        let s = 190501;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        const pool = CROWD_EXTRAS.map(e => {
            const key = `${e.slug}${e.restFrame}`;
            const src = this.textures.get(key).getSourceImage();
            return { key, h: src.height, slug: e.slug, restFrame: e.restFrame, frames: e.frames };
        });
        let prevKey = null;
        const pick = () => {
            let design;
            let attempts = 0;
            do {
                design = pool[Math.floor(rand() * pool.length)];
                attempts++;
            } while (design.key === prevKey && attempts < 8);
            prevKey = design.key;
            return design;
        };

        const COUNT = 40; // tighter than row 4's 32 — "less distance... as each row goes back"
        const SPOT_H = 50; // row 4's 61 × ~0.82
        const Y = 152;     // row 4's 185 × ~0.82
        const X_START = W / 2 - 450, X_END = W / 2 + 450;
        const STAGGER = 20;
        const visibleTints = [0x6e6e6e, 0x4b4b4b, 0x343434]; // rows 2/3/4's own tints

        for (let i = 0; i < COUNT; i++) {
            const t = i / (COUNT - 1);
            // Per-seat jitter (each row's own already-distinct RNG stream)
            // — Derek: "something needs to happen so that they don't look
            // like they are stacked on top of each other... it looks off."
            // Every row shared the exact same X_START/X_END/STAGGER/COUNT,
            // so seat i landed at the identical x in all five rows —
            // literal vertical columns of figures rising straight through
            // the whole crowd. The jitter desyncs that since no two rows'
            // rand() sequences match. First pass used ±25px and Derek:
            // "that made it look horrible, way more subtle was needed" —
            // seats are only ~35px apart at this COUNT/span, so ±25 was
            // overlapping/scattering seats into their neighbors' space
            // rather than just breaking the column alignment. Dropped to
            // ±7, enough to desync without disrupting the spacing.
            const cx = X_START + t * (X_END - X_START) + STAGGER + (rand() - 0.5) * 14;
            const design = pick();
            const flip = rand() < 0.5;
            const scale = SPOT_H / design.h;
            const tint = rand() < 0.2 ? visibleTints[Math.floor(rand() * visibleTints.length)] : 0x202020;
            const img = this.add.image(cx, Y, design.key)
                .setOrigin(0.5, 1)
                .setDepth(0.7) // below row 4's depth 0.8 — farther back still
                .setTint(tint)
                .setScale(flip ? -scale : scale, scale);
            this._scheduleAmbientFlicker(img, design, { cheer: true });
        }
    }

    // Sixth row — same template/reasoning as drawFifthRow (see that
    // method's comment), one more ~0.82× step down (50->41, 152->125),
    // darker silhouette base (0x161616) with the same 20%-chance-of-a-
    // brighter-row-tint variety roll.
    drawSixthRow() {
        let s = 220901;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        const pool = CROWD_EXTRAS.map(e => {
            const key = `${e.slug}${e.restFrame}`;
            const src = this.textures.get(key).getSourceImage();
            return { key, h: src.height, slug: e.slug, restFrame: e.restFrame, frames: e.frames };
        });
        let prevKey = null;
        const pick = () => {
            let design;
            let attempts = 0;
            do {
                design = pool[Math.floor(rand() * pool.length)];
                attempts++;
            } while (design.key === prevKey && attempts < 8);
            prevKey = design.key;
            return design;
        };

        const COUNT = 50; // densest of the three back rows — "less distance... as each row goes back"
        const SPOT_H = 41; // row 5's 50 × ~0.82
        const Y = 125;     // row 5's 152 × ~0.82
        const X_START = W / 2 - 450, X_END = W / 2 + 450;
        const STAGGER = 20;
        const visibleTints = [0x6e6e6e, 0x4b4b4b, 0x343434, 0x202020];

        for (let i = 0; i < COUNT; i++) {
            const t = i / (COUNT - 1);
            // Per-seat jitter (each row's own already-distinct RNG stream)
            // — Derek: "something needs to happen so that they don't look
            // like they are stacked on top of each other... it looks off."
            // Every row shared the exact same X_START/X_END/STAGGER/COUNT,
            // so seat i landed at the identical x in all five rows —
            // literal vertical columns of figures rising straight through
            // the whole crowd. The jitter desyncs that since no two rows'
            // rand() sequences match. First pass used ±25px and Derek:
            // "that made it look horrible, way more subtle was needed" —
            // seats are only ~35px apart at this COUNT/span, so ±25 was
            // overlapping/scattering seats into their neighbors' space
            // rather than just breaking the column alignment. Dropped to
            // ±7, enough to desync without disrupting the spacing.
            const cx = X_START + t * (X_END - X_START) + STAGGER + (rand() - 0.5) * 14;
            const design = pick();
            const flip = rand() < 0.5;
            const scale = SPOT_H / design.h;
            const tint = rand() < 0.2 ? visibleTints[Math.floor(rand() * visibleTints.length)] : 0x161616;
            const img = this.add.image(cx, Y, design.key)
                .setOrigin(0.5, 1)
                .setDepth(0.6) // below row 5's depth 0.7 — farthest back of all six rows
                .setTint(tint)
                .setScale(flip ? -scale : scale, scale);
            this._scheduleAmbientFlicker(img, design, { cheer: true });
        }
    }

    // REMOVED (2026-07-19) — was a soft fog fade at both edges of the
    // background-crowd rows, meant to sell "more people obscured by smoke
    // and lighting" (Derek's original ask). Derek, live: "there's something
    // going on on the right and left extreme sides of the screen, some
    // kind of overlay that looks wrong" — a light gray (0xb8b8ae) band
    // against this scene's very dark palette read as a wrong, out-of-place
    // bright smudge rather than atmospheric haze; it fought the existing
    // camera-level vignette (which darkens edges) instead of extending it.
    // See git history for the full implementation if a darker-toned retry
    // is wanted later.

    // Ambient idle motion for one background-crowd seat: flips between its
    // restFrame and one alternate frame (that design's own second frame —
    // already a hand-tuned first-step-of-reaction pose, see CROWD_EXTRAS)
    // on its own randomized rhythm, so seats don't move in lockstep. No
    // rescale on the swap — scale is fixed once from restFrame's height, so
    // a wider-cropped alt frame doesn't shrink-and-sink the figure (see
    // _setExtraFrame's comment on that bug for the front row's version of
    // this same fix).
    //
    // `cheer` (row 3 only, see drawThirdRow): when true, a fraction of the
    // "active" beats jump to the design's own peak frame instead of the
    // subtle altFrame, with a longer hold — an actual cheer, not just a
    // shift in the seat.
    _scheduleAmbientFlicker(img, design, { cheer = false } = {}) {
        if (design.frames <= 1) return;
        const altFrame = Math.min(design.frames, 2);
        if (altFrame === design.restFrame) return;
        const peakFrame = design.frames;
        let atRest = true;
        const tick = () => {
            if (!img.active) return; // scene may have shut down mid-timer
            atRest = !atRest;
            if (atRest) {
                img.setTexture(`${design.slug}${design.restFrame}`);
                const hold = 1000 + Math.random() * 2600;
                this.time.delayedCall(hold, tick);
            } else {
                const doCheer = cheer && peakFrame > altFrame && Math.random() < 0.3;
                img.setTexture(`${design.slug}${doCheer ? peakFrame : altFrame}`);
                const hold = doCheer ? 500 + Math.random() * 500 : 200 + Math.random() * 260;
                this.time.delayedCall(hold, tick);
            }
        };
        this.time.delayedCall(Math.random() * 3000, tick); // stagger start times
    }

    // Test crowd: named audience members (CROWD_EXTRAS, each a multi-frame
    // cutout), repeated with enough variation (x spread, flip, size/tint
    // jitter) that a given design doesn't read as an obvious clone row —
    // but each IS one source design, so this is a ceiling-of-repetition
    // test, not a real varied crowd. Planted right behind the ring (not the
    // deep background crowd) at a prominent "camera favorite" scale. Each
    // spot's `row` (see EXTRA_ROWS) picks depth (below drawRingMat's 3, above
    // drawCrowd's 1) and how far its ground line sits above RING.farLeft.y
    // (258 — the mat's crowd-side edge); row 1's ground line crosses at the
    // torso, same occlusion mechanism the side-crowd rows use against the
    // ring boundary, and rows 2/3 push further back from there.
    _setupCrowdExtras() {
        this.crowdFans = [];
        for (const extra of CROWD_EXTRAS) {
            // Per-frame natural pixel dimensions — needed for both
            // sizeBasis modes, and because a seated extra's raised-arm
            // frames (or, across separately-cut source sheets, ordinary
            // crop/scale drift) naturally have a different bounding-box
            // height per frame even though the character never grows.
            extra._dims = {};
            for (let i = 1; i <= extra.frames; i++) {
                const src = this.textures.get(`${extra.slug}${i}`).getSourceImage();
                extra._dims[i] = { w: src.width, h: src.height };
            }
            for (const spot of extra.spots) {
                const rowCfg = EXTRA_ROWS[spot.row || 1];
                const fan = { img: this.add.image(spot.x, 0, `${extra.slug}${extra.restFrame}`)
                    .setOrigin(0.5, 1)
                    .setTint(dimTint(spot.tint, rowCfg.dim))
                    .setDepth(rowCfg.depth), extra, spot, reacting: false };
                this._setExtraFrame(fan, extra.restFrame);
                this.crowdFans.push(fan);
                // Extras split into animA/animB (see browndresslady's
                // comment) get their own independent "seat behavior" idle
                // loop on top of crowdFans membership — animA fires at
                // random via _scheduleTwoAnimExtra (randomB:false keeps it
                // from ever picking animB itself), while animB ("cheer")
                // stays reserved for real match events via
                // _reactCrowdExtras. Extras without animA (oldman, marlon)
                // are unaffected — they keep reacting with their old
                // full-frame cycle only.
                if (extra.animA) this._scheduleTwoAnimExtra(fan);
                // extra.smokeOffset (groucho only, currently) — cigar
                // smoke puffs rising from a fixed offset off this fan's
                // own groundY. See _scheduleSmokePuff.
                if (extra.smokeOffset) this._scheduleSmokePuff(fan, extra.smokeOffset);
            }
        }
    }

    // Sets a crowd extra instance to reference frame `f`, rescaling to match.
    // Both sizeBasis modes compute ONE scale per extra from a fixed
    // reference frame's own dimensions and apply it uniformly to every
    // frame — never recomputed from the currently-displayed frame's own
    // bounding box. Recomputing per-frame was the bug fixed 2026-07-16:
    // pinning displayed WIDTH constant by rescaling off each frame's own
    // (pose-dependent) crop width made a sideways limb extension shrink the
    // whole figure to compensate, reading as "gets smaller and sinks" —
    // exactly the failure mode this two-mode design exists to avoid on the
    // height axis for oldman.
    // 'height' scales off the tallest frame (oldman's sit→stand — a real
    // height change should read as growth). 'width' scales off the resting
    // frame's own height instead, for extras that stay seated throughout;
    // their raised-arm/spread-leg frames then vary in *display* size
    // naturally with their own crop dimensions, rather than being distorted
    // to fit a pinned display width.
    _setExtraFrame(fan, f) {
        const { extra, spot } = fan;
        const rowCfg = EXTRA_ROWS[spot.row || 1];
        let scale;
        if (extra.sizeBasis === 'width') {
            const rest = extra._dims[extra.restFrame];
            scale = spot.h / rest.h;
        } else {
            const refH = Math.max(...Object.values(extra._dims).map(d => d.h));
            scale = spot.h / refH;
        }
        scale *= rowCfg.scaleMul;
        // extra.frameScale is an opt-in per-frame multiplier on top of the
        // above (photographer only, currently) — for when the art's own
        // relative proportions don't read as big enough a change even
        // after a correct batch-scale cut (see cut.mjs), and a deliberate
        // per-frame exaggeration is wanted instead.
        scale *= extra.frameScale?.[f] ?? 1;
        // ~torso-height occlusion by the mat at row 1; rowCfg.yOffset pulls
        // rows 2/3 further from the near camera (see EXTRA_ROWS). spot.groundY
        // lets a fan opt out of the row-based anchor entirely — needed for
        // the photographer/policeman, who sit beside the ring at an explicit
        // near-camera depth, not behind it (see _setupPhotographer/
        // _setupPoliceman); rowCfg.yOffset still applies on top but is a
        // no-op for them since neither sets spot.row (defaults to row 1,
        // yOffset 0).
        const groundY = (spot.groundY ?? (RING.farLeft.y + spot.h * 0.45)) + rowCfg.yOffset;
        // extra.stepOffset is an opt-in per-frame x shift on top of spot.x
        // (photographer only) — direction-aware via spot.flip so "forward"
        // always means toward the ring regardless of which side a future
        // instance sits on, not just increasing x.
        const stepX = spot.x + (spot.flip ? -1 : 1) * (extra.stepOffset?.[f] ?? 0);
        fan.img.setTexture(`${extra.slug}${f}`)
            .setX(stepX)
            .setY(groundY)
            .setScale(spot.flip ? -scale : scale, scale);
        // extra.flashOnPeak (photographer only): landing on the last frame
        // — his flash-bulb pose — pops a localized flash at the bulb's
        // actual position. Only the forward leg of a reaction cycle ever
        // reaches `extra.frames` (_reactCrowdExtras' `down` sequence stops
        // one short of it), so this only fires once per reaction, at the
        // actual peak.
        //
        // Offsets read directly off frame8.png (220x360, origin 0.5/1 =
        // bottom-center): the bulb sits ~30% of the display width toward
        // his facing direction from center (he's holding the camera out in
        // front of him, not centered on his body) and ~90% of the way up
        // from his feet (right at the top of the raised camera, well above
        // head height) — plain groundY/stepX (his body center) was "back
        // from where the bulb would be."
        //
        // Derek also flagged the flash as "a frame too early" — it used to
        // fire the instant _setExtraFrame lands on frame 8, i.e. in the
        // same beat the pose itself changes. Delaying it one
        // _reactCrowdExtras STEP (130ms) lets the standing/flash pose
        // actually land on screen first, so the pop reads as the bulb
        // firing *after* he's raised the camera, not simultaneously with
        // the pose change.
        if (f === extra.frames && extra.flashOnPeak) {
            const dir = spot.flip ? -1 : 1;
            const flashX = stepX + dir * fan.img.displayWidth * 0.30;
            const flashY = groundY - fan.img.displayHeight * 0.90;
            this.time.delayedCall(130, () => this._triggerCameraFlash(flashX, flashY));
        }
    }

    // Builds the single ringside photographer fan. Mirrors _setupCrowdExtras'
    // per-extra body (dims cache, fan shape) for one PHOTOGRAPHER instance,
    // seated beside the ring rather than behind it like the CROWD_EXTRAS
    // front row (see the create() call site for the placement history).
    // Uses spot.groundY (see _setExtraFrame) to anchor to an explicit
    // near-camera Y instead of the RING.farLeft.y-based formula every
    // CROWD_EXTRAS spot uses.
    //
    // Kept as its own method rather than folded into CROWD_EXTRAS so he
    // isn't swept into drawSecondRow/ThirdRow/FourthRow's random background
    // pool (he's a unique named character, not filler). Pushed into
    // this.crowdFans so _reactCrowdExtras' match-event hook (pinfalls,
    // nearfalls, etc.) picks him up the same as every other extra — no
    // separate trigger code needed. Called from create() alongside
    // _setupCrowdExtras().
    _setupPhotographer(x, h, groundY) {
        const extra = { ...PHOTOGRAPHER, _dims: {} };
        for (let i = 1; i <= extra.frames; i++) {
            const src = this.textures.get(`${extra.slug}${i}`).getSourceImage();
            extra._dims[i] = { w: src.width, h: src.height };
        }
        // flip: false — he's drawn facing right, which already faces into
        // the ring from this near-left-of-center position.
        const spot = { x, h, flip: false, tint: 0x9d9789, groundY };
        const fan = {
            img: this.add.image(spot.x, 0, `${extra.slug}${extra.restFrame}`)
                .setOrigin(0.5, 1)
                .setTint(spot.tint)
                // Depth 2.8 — below drawRingMat's 3 (Derek: "he needs to be
                // stacked behind the ring canvas"), so the mat renders in
                // front of whatever part of him overlaps its trapezoid at
                // this x/y, reading as tucked beside/behind the ring's edge
                // rather than floating in front of it. Still above
                // drawFarApronAndRopes (2) and every background crowd layer
                // (0.8-1.5) — only the mat itself occludes him.
                .setDepth(2.8),
            extra, spot, reacting: false,
        };
        this._setExtraFrame(fan, extra.restFrame);
        this.crowdFans.push(fan);
    }

    // Builds the single corner policeman fan. Same fan shape as
    // _setupPhotographer (spot.groundY override, own depth) — see
    // POLICEMAN's comment for why he's kept out of CROWD_EXTRAS and how his
    // source art differs from every prior extra (single 4x2 grid sheet, not
    // a horizontal strip).
    //
    // Deliberately NOT pushed into this.crowdFans, unlike every other extra
    // (Derek: "make his animations intermittent and not tied to the
    // excitement, the cop isn't watching the match, he's looking for
    // threats") — crowdFans is what _reactCrowdExtras iterates off
    // _logEvent's match-pop hook, so joining it would turn his head-turn on
    // every pinfall/nearfall same as the crowd's excitement, exactly what
    // this call is meant to avoid. Instead kicks off his own independent
    // random-interval loop, _schedulePolicemanScan, unrelated to match state.
    //
    // flip is a param (not hardcoded) since Derek's planning one of these
    // per corner: the art is drawn facing right (see POLICEMAN's comment),
    // so a right-side corner needs flip:true to face left into the ring
    // (this call site's default) while a left-side corner will need
    // flip:false, without touching this method again.
    // depth defaults to 2.8, same as the photographer's own default — a
    // second policeman instance can pass a lower value to stack behind a
    // neighboring extra in the same corner cluster (see the near-left
    // cop's call site: "stacked behind the announcer").
    _setupPoliceman(x, h, groundY, flip = true, depth = 2.8) {
        const extra = { ...POLICEMAN, _dims: {} };
        for (let i = 1; i <= extra.frames; i++) {
            const src = this.textures.get(`${extra.slug}${i}`).getSourceImage();
            extra._dims[i] = { w: src.width, h: src.height };
        }
        const spot = { x, h, flip, tint: 0x9d9789, groundY };
        const fan = {
            img: this.add.image(spot.x, 0, `${extra.slug}${extra.restFrame}`)
                .setOrigin(0.5, 1)
                .setTint(spot.tint)
                // Depth below drawRingMat's 3 so the mat occludes whatever
                // part of him overlaps its trapezoid at this x/y, still
                // above drawFarApronAndRopes (2) and every background
                // crowd layer (0.8-1.5).
                .setDepth(depth),
            extra, spot, reacting: false,
        };
        this._setExtraFrame(fan, extra.restFrame);
        this._schedulePolicemanScan(fan);
    }

    // Independent idle loop for the corner policeman — turns his head
    // partway (or all the way) through his front-to-profile frame range on
    // his own random schedule, then back to attention, unrelated to
    // _logEvent/match excitement (see _setupPoliceman's comment for why
    // he's not on the same hook as every other crowd fan). Each glance
    // picks a random target frame (not always the full 8) so successive
    // scans don't read as one repeating animation — a quick look, then
    // sometimes a longer turn, like actually scanning the room rather than
    // playing a loop.
    _schedulePolicemanScan(fan) {
        const IDLE_MIN = 4000, IDLE_MAX = 11000; // intermittent, not a steady cycle
        this.time.delayedCall(IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN), () => {
            const target = fan.extra.restFrame + 1 + Math.floor(Math.random() * (fan.extra.frames - fan.extra.restFrame));
            const up = [];
            for (let f = fan.extra.restFrame + 1; f <= target; f++) up.push(f);
            const down = up.slice(0, -1).reverse();
            const STEP = 170, HOLD = 400 + Math.random() * 900;
            up.forEach((f, i) => this.time.delayedCall(i * STEP, () => this._setExtraFrame(fan, f)));
            const downStart = up.length * STEP + HOLD;
            down.forEach((f, i) => this.time.delayedCall(downStart + i * STEP, () => this._setExtraFrame(fan, f)));
            this.time.delayedCall(downStart + down.length * STEP + STEP, () => {
                this._setExtraFrame(fan, fan.extra.restFrame);
                this._schedulePolicemanScan(fan); // reschedule the next glance
            });
        });
    }

    // Builds a single ringside fan for any "two independent 4-frame
    // animations, fired intermittently" extra — originally a lewis-only
    // method, generalized once ANNOUNCER/BELL_RINGER needed the identical
    // shape (see STRANGLER_LEWIS's comment). Same fan shape as
    // _setupPhotographer/_setupPoliceman (spot.groundY override, own
    // depth). NOT pushed into crowdFans (unlike the photographer) — these
    // animations run on their own independent schedule
    // (_scheduleTwoAnimExtra), same "not driven by _reactCrowdExtras'
    // match-pop hook" shape as the policeman's scan loop.
    //
    // flip is a param, same shape as _setupPoliceman — always confirm the
    // sheet's own native facing direction against its actual frame1.png
    // before picking a default; stranglerlewis's convention turned out to
    // be the reverse of photographer/policeman/announcer/bellringer's, and
    // got placed backwards once already from assuming instead of checking.
    //
    // depth defaults to 2.8, the photographer/policeman/lewis "beside the
    // ring, stacked behind the ring canvas" convention — that trick only
    // works because those designs are narrow enough to straddle the mat's
    // left/right boundary and mostly clear it. The announcer/bellringer
    // call sites pass an explicit higher depth instead: their sheets are
    // ~150-175px wide (character + table/mic baked into the same cutout),
    // wide enough that at any x with real margin from a corner post their
    // ENTIRE footprint lands inside the ring's mat trapezoid at ringside
    // y-values — not straddling the boundary, fully behind depth 3, fully
    // invisible (found via screenshot: they measured into the scene fine
    // but rendered as nothing). Placed in FRONT of the ring instead — see
    // the create() call site.
    _setupTwoAnimExtra(extraDef, x, h, groundY, flip, depth = 2.8) {
        const extra = { ...extraDef, _dims: {} };
        for (let i = 1; i <= extra.frames; i++) {
            const src = this.textures.get(`${extra.slug}${i}`).getSourceImage();
            extra._dims[i] = { w: src.width, h: src.height };
        }
        const spot = { x, h, flip, tint: 0x9d9789, groundY };
        const fan = {
            img: this.add.image(spot.x, 0, `${extra.slug}${extra.restFrame}`)
                .setOrigin(0.5, 1)
                .setTint(spot.tint)
                // See _setupTwoAnimExtra's comment for the depth param —
                // 2.8 (default) for the "beside the ring" convention, a
                // higher explicit value for "in front of the ring" extras.
                .setDepth(depth),
            extra, spot, reacting: false,
        };
        this._setExtraFrame(fan, extra.restFrame);
        this._scheduleTwoAnimExtra(fan);
        return fan;
    }

    // Plays one of a _setupTwoAnimExtra fan's two 4-frame animations
    // through to completion, then calls onComplete (if given). Factored out
    // of _scheduleTwoAnimExtra so an explicit event trigger (see
    // _ringTimekeeperBell) can play a specific animation on demand, not
    // just the random loop.
    //
    // Guarded by fan.reacting so an explicit trigger and the random loop
    // can't stomp on each other's frame-setting mid-cycle — same shape as
    // _reactCrowdExtras' own reacting guard. Returns false (does nothing)
    // if already playing; callers that need to reschedule regardless
    // (the random loop) handle that themselves rather than relying on
    // onComplete firing.
    //
    // animA plays forward then reverses back through its own frames to
    // restFrame — a real up/down cycle, for animations that end mid-
    // gesture. animB is assumed to already land on a settled/neutral pose
    // at its last frame (true for every current user — see each const's
    // frame-breakdown comment), so it only plays forward and then snaps
    // straight back to restFrame rather than walking back down through
    // frames that would replay the gesture in reverse.
    _playTwoAnimExtra(fan, anim, onComplete) {
        if (fan.reacting) return false;
        fan.reacting = true;
        const isAnimA = anim === fan.extra.animA;
        const up = anim;
        const down = isAnimA ? up.slice(0, -1).reverse() : [fan.extra.restFrame];
        const STEP = 170, HOLD = 500 + Math.random() * 900;
        up.forEach((f, i) => this.time.delayedCall(i * STEP, () => this._setExtraFrame(fan, f)));
        const downStart = up.length * STEP + HOLD;
        down.forEach((f, i) => this.time.delayedCall(downStart + i * STEP, () => this._setExtraFrame(fan, f)));
        this.time.delayedCall(downStart + down.length * STEP + STEP, () => {
            this._setExtraFrame(fan, fan.extra.restFrame);
            fan.reacting = false;
            onComplete?.();
        });
        return true;
    }

    // Independent intermittent loop shared by every _setupTwoAnimExtra fan
    // — picks one of its two 4-frame animations at random (extra.animA/
    // animB) on each firing, unrelated to match state. Mirrors
    // _schedulePolicemanScan's shape (random idle gap, reschedules itself)
    // but walks a full animation array rather than a variable-depth turn.
    //
    // extra.randomB === false opts an extra OUT of ever picking animB here
    // — BELL_RINGER's case (Derek: "he should only hit the bell when the
    // match begins or ends, it needs to be binded to those actions and not
    // used otherwise... I'm ok with him picking up and putting down the
    // stop watch at random"). animB still exists and plays fine — see
    // _ringTimekeeperBell, which calls _playTwoAnimExtra directly with
    // animB, bypassing this random gate entirely.
    _scheduleTwoAnimExtra(fan) {
        const IDLE_MIN = 5000, IDLE_MAX = 13000; // intermittent, not a steady cycle
        this.time.delayedCall(IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN), () => {
            const anim = fan.extra.randomB === false || Math.random() < 0.5 ? fan.extra.animA : fan.extra.animB;
            // started === false means an explicit trigger (e.g. the bell)
            // is already mid-animation — skip this firing rather than
            // fight over the same frame, just reschedule the next one.
            const started = this._playTwoAnimExtra(fan, anim, () => this._scheduleTwoAnimExtra(fan));
            if (!started) this._scheduleTwoAnimExtra(fan);
        });
    }

    // Fires the timekeeper's bell-strike animation (BELL_RINGER.animB) on
    // demand — called from the two real match-bell moments (_endMatch's
    // crowd.bell(3), and the post-reset crowd.bell(1) for the next match),
    // not on any timer. this.bellRingerFan is null until _setupTwoAnimExtra
    // creates him in create() (see that call site) and unset entirely if
    // he's ever removed, so this is a no-op rather than a crash if called
    // before setup or in a build without him.
    _ringTimekeeperBell() {
        if (!this.bellRingerFan) return;
        this._playTwoAnimExtra(this.bellRingerFan, this.bellRingerFan.extra.animB);
    }

    // Pops a localized flash at (x, y) — Derek: a full-screen version (the
    // first pass, reusing flickerOverlay) read as too intense; "it should
    // only flash around the bulb." Just records start time + position;
    // update() owns the decay curve and repositions this.cameraFlashImg
    // (a feathered-texture glow, see createFlashTexture) there instead of
    // washing the whole frame.
    _triggerCameraFlash(x, y) {
        this._flashStart = this.time.now;
        this._flashX = x;
        this._flashY = y;
    }

    // Ambient crowd camera flashes — Derek asked what else could "up the
    // production value" like the smoke; reuses _triggerCameraFlash as-is
    // (single-flash state — a random one landing in the same ~200ms window
    // as the photographer's own peak-frame flash would just restart the
    // timer at the newer position, a minor and rare enough overlap not
    // worth generalizing to a multi-flash array for). Fires from a random
    // point across the background crowd's own rough footprint rather than
    // any specific extra, selling "someone in the stands has a camera"
    // without needing a real character/position to anchor to, same
    // "ambient, not tied to a character" shape as _setupAmbientSmokers.
    //
    // Y range 120-280 -> 120-240: Derek: "make sure cameras don't go off
    // below where the ring is, meaning on the ring, or in the front row or
    // the back." RING.farLeft.y=258 is the ring mat's own far/top edge —
    // the old range's upper end (280) dipped into that trapezoid, and
    // combined with the flash glow's own ~40px radius could visibly bleed
    // onto the ring or into the row 1/FRONT_ROW territory below it. 240
    // keeps flashes inside rows 3-6's clearly-crowd-only band, with real
    // margin before the ring starts.
    _scheduleAmbientCameraFlash() {
        const GAP_MIN = 4000, GAP_MAX = 9000;
        this.time.delayedCall(GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN), () => {
            const x = 60 + Math.random() * (W - 120);
            const y = 120 + Math.random() * 120;
            this._triggerCameraFlash(x, y);
            this._scheduleAmbientCameraFlash();
        });
    }

    // Plays a subset of the crowd fans forward through their reference
    // frames (from restFrame) and back down, each on its own random
    // delay/hold so they don't move in lockstep — hooked off _logEvent so
    // they react to real match spots, not idle ticks.
    //
    // Extras with animA/animB (see browndresslady's comment) only react
    // through animB ("cheer") here — animA ("seat behavior") runs on its
    // own independent schedule (_scheduleTwoAnimExtra) entirely untouched
    // by match events. Extras without that split (oldman, marlon,
    // photographer) keep the original full-frame (1..extra.frames) cycle,
    // unchanged.
    //
    // animB doesn't start at restFrame (5-8, not 1) the way the old
    // full-frame cycle always did, so a plain reverse-of-up wouldn't
    // actually make it back to rest (it'd stop at animB's own first frame,
    // 5) — the explicit push below closes that gap.
    _reactCrowdExtras() {
        for (const fan of this.crowdFans) {
            if (fan.reacting) continue;
            if (Math.random() > 0.65) continue; // not everyone reacts to every spot
            fan.reacting = true;
            const up = fan.extra.animB ? [...fan.extra.animB] : Array.from({ length: fan.extra.frames }, (_, i) => i + 1);
            const down = up.slice(0, -1).reverse();
            if (fan.extra.animB && down[down.length - 1] !== fan.extra.restFrame) down.push(fan.extra.restFrame);
            const start = Math.random() * 300;
            const STEP = 130, HOLD = 1400 + Math.random() * 900;
            up.forEach((f, i) => this.time.delayedCall(start + i * STEP, () => this._setExtraFrame(fan, f)));
            const downStart = start + up.length * STEP + HOLD;
            down.forEach((f, i) => this.time.delayedCall(downStart + i * STEP, () => this._setExtraFrame(fan, f)));
            this.time.delayedCall(downStart + down.length * STEP, () => { fan.reacting = false; });
        }
    }

    drawSideCrowd() {
        let s = 9173;
        const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

        // Both flanks' flat fillCircle/fillEllipse dots are gone now — left
        // flank removed for the ringside photographer (Derek: "we can get
        // rid of the fake crowd on that side"), right flank removed for the
        // corner policeman (_setupPoliceman, occupying this same right-side
        // y-range): the flat dots rendered at depth 10, in front of his
        // actual cutout art (depth 2.8), hiding him completely. Same
        // "redundant/inconsistent next to real cutout art" reasoning as the
        // left side.

        // Foreground crowd — backs of heads, closest to camera. Real
        // cutouts (BACK_CROWD) since 2026-07-18, replacing the flat
        // fillCircle/fillEllipse blobs that used to render here — see that
        // const's comment.
        //
        // lum bumped a second time (70-96 -> 150-190 on the row that
        // survived, below) after Derek spotted "a black mask or whatever at
        // the crowd shoulder level" — setTint is multiplicative, and unlike
        // Lewis/announcer's light suits, these designs' own clothing/chairs
        // are already dark brown/navy in the source art; multiplying that
        // by a mid-gray tint crushed it to near-black while the lighter
        // hair/skin stayed visible, and with many seated figures sharing
        // the same neck-to-shoulder transition height, that read as one
        // uniform hard-edged band, not natural shading. Pushing lum much
        // higher keeps the multiply from crushing the already-dark source
        // colors.
        //
        // Original two-row layout killed and rebuilt (2026-07-18, second
        // pass) — Derek: "kill the first row, they are too tiny and the
        // distribution is off, it's all beehive lady... the row that
        // exists is too small but making a little bigger can be the front
        // front row, but the one behind it should be bigger and probably
        // darkened and blurred." The old fgRow2 (coded first, smaller,
        // closer to camera in draw order but visually "further back" —
        // Derek's "first row") is gone entirely, not just resized: at
        // h=95 it read as tiny/childlike (same lesson as the CROWD_EXTRAS
        // resize-to-alfred pass earlier), and Math.floor(rand() *
        // BACK_CROWD.length) picking independently per seat had no
        // guardrail against runs of the same design — with only 4 designs
        // across 20 seats, "it's all beehive lady" (backheadlady1's
        // distinctive hairstyle) was a real, not imagined, pattern.
        //
        // Replaced with: fgRow1 (renamed FRONT_ROW below) bumped a little
        // bigger and kept as the front-front row; a brand-new layer
        // (LAYER3 — Derek: "save this layer for a final third layer," a
        // layer 2 is still TBD/unplaced between FRONT_ROW and LAYER3) sized
        // comparably-to-bigger (not shrunk — the "tiny reads as childlike"
        // lesson applies to depth cues too, not just the CROWD_EXTRAS
        // pass), reading as an extreme-foreground silhouette via near-zero
        // lum and a cheap multi-copy blur (spawnBlurredBackHead: 2 offset
        // low-alpha copies plus one full-alpha copy, animated together —
        // Phaser 4's Blur filter is camera-only, no per-GameObject blur
        // exists in this version, so this is the practical approximation).
        //
        // Design assignment is a fixed rotation (random start phase)
        // instead of independent random picks per seat — guarantees the
        // "stagger man woman man woman, don't repeat too often" ask
        // structurally, not statistically. Shared across all three rows
        // (one continuous rotation) so the overall distribution stays even
        // rather than each row separately risking its own run of repeats.
        //
        // Weighted 3:1 toward backheadman1 over backheadman2 — Derek:
        // "less of the bald guy, more of the hat guy, bald guy is a little
        // distracting if there's too many of him." Was an even 1:1:1:1
        // cycle (lady1/man1/lady2/man2); man1 now appears 3x per 8-seat
        // cycle to man2's 1x, lady1/lady2 unchanged at 2x each, still
        // alternating man/woman throughout.
        this.backCrowdFans = [];
        const designRotation = [
            'backheadlady1', 'backheadman1', 'backheadlady2', 'backheadman1',
            'backheadlady1', 'backheadman2', 'backheadlady2', 'backheadman1',
        ].map(slug => BACK_CROWD.find(d => d.slug === slug));
        let rotationIdx = Math.floor(rand() * designRotation.length);
        const nextDesign = () => designRotation[rotationIdx++ % designRotation.length];

        const spawnBackCrowd = (x, h, groundY, lum, depth = 28, alpha = 1) => {
            const design = nextDesign();
            const col = (lum << 16) | (lum << 8) | lum;
            const flip = rand() < 0.5;
            const extra = { ...design, _dims: {} };
            for (let i = 1; i <= design.frames; i++) {
                const src = this.textures.get(`${design.slug}${i}`).getSourceImage();
                extra._dims[i] = { w: src.width, h: src.height };
            }
            const fan = {
                img: this.add.image(x, 0, `${design.slug}${design.restFrame}`)
                    .setOrigin(0.5, 1)
                    .setTint(col)
                    .setAlpha(alpha)
                    // depth param added when SECOND_ROW needed to sit
                    // BEHIND FRONT_ROW's default 28 — see that row's
                    // comment. Default 28 unchanged for FRONT_ROW itself:
                    // above the bell-ringer's 26 and drawPosts' near-post
                    // depth of 25.7 (Derek: "the crowd needs to be in
                    // front of the time keeper"). alpha param added for
                    // THIRD_ROW's "semi opaque" ask, below.
                    .setDepth(depth),
                extra, spot: { x, h, flip, groundY }, reacting: false,
            };
            this._setExtraFrame(fan, design.restFrame);
            this.backCrowdFans.push(fan);
            this._scheduleBackCrowdIdle(fan);
        };

        // LAYER3 (the multi-copy-blur silhouette layer, 11 seats
        // edge-to-edge) got killed for merging into one flat dark bar
        // instead of reading as individual people — see git history for
        // spawnBlurredBackHead/_setBlurredFrame/_scheduleBlurredIdle if
        // that specific approach is wanted again. Replaced with a gradient
        // vignette (below) PLUS a real SECOND_ROW brought back in — Derek:
        // "the second row is gone again" — using the same real art as
        // FRONT_ROW (not a near-black silhouette), just fewer seats with
        // actual gaps between them (not edge-to-edge) so they can't merge
        // into a stripe the same way. Originally sat BEHIND FRONT_ROW
        // (depth 20) so FRONT_ROW's own detail would break up the row
        // visually — but Derek: "move the row of audience that is stacked
        // behind the timekeeper to the very front" (it was landing behind
        // the timekeeper's own depth 26 too, at that x). Depth 20 -> 30,
        // above everything in this method including the vignette (29) and
        // FRONT_ROW (28).
        // x's tightened (200/180/180/200 gaps -> 150/160/160/150), groundY
        // nudged down repeatedly (560 -> 585 -> 600 -> 615), and the whole
        // row shifted left (170-790 centered on 480 -> 60-540 centered
        // near the timekeeper's own x=135) — Derek: "move them a bit closer
        // together and move them a bit down the y axis," "a little more
        // down the y axis," then "go a little more down the y axis and
        // make this row closest to the timekeeper."
        // Depth 30 -> 27: Derek: "all the biggest sprites should be at the
        // back, it looks weird when a small sprite is at the back" — at
        // depth 30, this row (h=175) drew IN FRONT of FRONT_ROW (h=204,
        // depth 28) despite being the smaller sprite, backwards from how
        // depth/size should stack (bigger reads as closer, so it should be
        // the one drawn last/on top). 27 keeps it in front of the
        // timekeeper (26, still "closest to the timekeeper" per the
        // earlier ask) while sitting behind FRONT_ROW's bigger sprites.
        // x's computed directly off FRONT_ROW's own 9 seats (55, 168, 278,
        // 390, 490, 595, 700, 810, 910) rather than picked independently —
        // Derek: "stagger the three rows better, some places are jumbled
        // others are bare," then "get the ghost layer into the blank white
        // spots... and also stagger them better." SECOND_ROW and THIRD_ROW
        // together now cover the 8 gaps BETWEEN FRONT_ROW's seats, one row
        // or the other (or both, at the persistent 542-647 bare spot) per
        // gap: gap midpoints are 111, 223, 334, 440, 542, 647, 755, 860.
        // SECOND_ROW takes 111, 223, 440, 647, 860.
        const SECOND_ROW = [
            { x: 111, lum: 104 }, { x: 223, lum: 98 }, { x: 440, lum: 108 },
            { x: 647, lum: 100 }, { x: 860, lum: 102 },
        ];
        SECOND_ROW.forEach(({ x, lum }) => {
            const jitter = (rand() - 0.5) * 20;
            // groundY 615->635: Derek: "the entire audience foreground
            // needs to come down the y axis a little bit" (applied to all
            // three rows).
            spawnBackCrowd(x + jitter, 175, 635, lum, 27);
        });

        // THIRD_ROW — Derek: "add another row behind the two we have, this
        // time with larger, semi opaque watchers like we had before, but
        // they move." "Like we had before" = LAYER3's look (bigger,
        // reduced-opacity figures), but NOT its mechanics: LAYER3 used 11
        // seats edge-to-edge with a 3-copy blur-stack per seat, which is
        // exactly what merged into the flat "black tinted stripe" Derek
        // killed it for. This reuses spawnBackCrowd instead (single image,
        // real animated idle loop via _scheduleBackCrowdIdle — "they
        // move") with only 4 seats and wide real gaps between them, same
        // "don't cover the full width edge-to-edge" lesson SECOND_ROW
        // already applied. Depth 15 — behind both FRONT_ROW (28) and
        // SECOND_ROW (27), "behind the two we have." h=260 ("larger" —
        // bigger than FRONT_ROW's 204, not smaller despite being the
        // furthest-back row, same "don't shrink for depth" reasoning as
        // the CROWD_EXTRAS resize-to-alfred pass). alpha=0.55 ("semi
        // opaque"). lum kept moderate (120-135, the "avoid crushing"
        // range from the earlier tint fix) rather than LAYER3's near-black
        // 15 — full silhouette isn't what "semi opaque" asked for.
        // x's now the remaining 4 of FRONT_ROW's 8 gap-midpoints not used
        // by SECOND_ROW (see that row's comment): 40 (off the left edge,
        // past FRONT_ROW's own first seat), 334, 542, 755. 542 sits right
        // next to SECOND_ROW's 647 — deliberate double coverage at the
        // 542-647 span, the specific bare gap Derek flagged ("get the
        // ghost layer into the blank white spots").
        const THIRD_ROW = [
            { x: 40,  lum: 128 }, { x: 334, lum: 122 },
            { x: 542, lum: 132 }, { x: 755, lum: 124 },
        ];
        THIRD_ROW.forEach(({ x, lum }) => {
            const jitter = (rand() - 0.5) * 24;
            // groundY 590 -> 698: Derek: "their heads should be about level
            // [with] the other row" — at groundY=590 with h=260, the top
            // (head) landed at y=330, ~105px above FRONT_ROW/SECOND_ROW's
            // own head level (~y=436-440), reading as floating rather than
            // a row sitting behind them. 698 lines the head level up
            // (698-260=438). Then 698->718 — "the entire audience
            // foreground needs to come down the y axis a little bit."
            spawnBackCrowd(x + jitter, 260, 718, lum, 15, 0.55);
        });

        // Vignette — Derek: "it needs feathering," then after the first
        // fix: "why can't we feather that harsh edge from that mask...
        // right now it looks like a filter [not] a camera vignette."
        // Rebuilt from scratch rather than re-tuned: fillGradientStyle is
        // WebGL-only (Graphics.js: "@webglOnly") and even where it renders,
        // a flat full-width rectangle with a linear top-to-bottom alpha
        // ramp reads as a filter overlay, not a vignette — real lens
        // vignettes darken radially (stronger at the corners/edges, soft
        // and rounded), not as a straight horizontal band. Replaced with
        // many thin non-overlapping bands (so alphas don't compound),
        // eased quadratically (slow at the top, accelerating toward the
        // bottom — actual "feathering" instead of a linear ramp) AND
        // tapered narrower near the top, widening to full-canvas width
        // only at the very bottom edge, faking the rounded/radial falloff
        // a rectangle alone can't give. Plain fillStyle/fillRect — no
        // WebGL-only calls, so it renders the same under Canvas fallback.
        const vignetteGfx = this.add.graphics().setDepth(29);
        const VIGNETTE_TOP = 380, VIGNETTE_MAX_ALPHA = 0.6, VIGNETTE_BANDS = 30;
        const bandH = (H - VIGNETTE_TOP) / VIGNETTE_BANDS;
        for (let i = 0; i < VIGNETTE_BANDS; i++) {
            const t = (i + 1) / VIGNETTE_BANDS; // 0..1 excluding 0, so the top band is already faintly visible
            const alpha = VIGNETTE_MAX_ALPHA * t * t; // quadratic ease — gentle start, stronger finish
            const taper = (1 - t) * 220; // rounds the shape inward near the top, 0 inset at the bottom
            vignetteGfx.fillStyle(0x000000, alpha);
            vignetteGfx.fillRect(taper, VIGNETTE_TOP + i * bandH, W - taper * 2, bandH + 1);
        }

        // FRONT_ROW — the front-front row, closest to camera. Bumped a
        // little bigger (165 -> 185 -> 204, +10% "both") and down a little
        // twice (610 -> 625 -> 640, "the first row should move down the y
        // axis slightly").
        const FRONT_ROW = [
            { x: 55,  lum: 154 }, { x: 168, lum: 150 }, { x: 278, lum: 158 },
            { x: 390, lum: 152 }, { x: 490, lum: 156 }, { x: 595, lum: 151 },
            { x: 700, lum: 155 }, { x: 810, lum: 153 }, { x: 910, lum: 150 },
        ];
        FRONT_ROW.forEach(({ x, lum }) => {
            const jitter = (rand() - 0.5) * 20;
            // groundY 640->660: "the entire audience foreground needs to
            // come down the y axis a little bit."
            spawnBackCrowd(x + jitter, 204, 660, lum);
        });
    }

    // Independent idle loop for a single BACK_CROWD fan — occasionally
    // hops to a random different frame (a small fidget: head-angle shift,
    // hand-to-hair/hat adjustment, a slight turn) and back, unrelated to
    // match state. Simpler than _scheduleTwoAnimExtra/_schedulePolicemanScan
    // on purpose: these 8 frames don't build toward any peak (see
    // BACK_CROWD's comment) — there's nothing to walk up through, just one
    // pose to visit and return from.
    _scheduleBackCrowdIdle(fan) {
        const IDLE_MIN = 3000, IDLE_MAX = 9000;
        this.time.delayedCall(IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN), () => {
            if (fan.reacting) { this._scheduleBackCrowdIdle(fan); return; }
            fan.reacting = true;
            const target = 2 + Math.floor(Math.random() * (fan.extra.frames - 1)); // 2..frames
            const HOLD = 300 + Math.random() * 600;
            this._setExtraFrame(fan, target);
            this.time.delayedCall(HOLD, () => {
                this._setExtraFrame(fan, fan.extra.restFrame);
                fan.reacting = false;
                this._scheduleBackCrowdIdle(fan);
            });
        });
    }

    drawFarApronAndRopes() {
        const gfx = this.add.graphics().setDepth(2);
        const { farLeft, farRight } = RING;

        gfx.fillStyle(0x909088, 1);
        gfx.fillRect(farLeft.x, farRight.y, farRight.x - farLeft.x, 16);
    }

    drawRingMat() {
        const gfx = this.add.graphics().setDepth(3);
        const { nearLeft, nearRight, farLeft, farRight } = RING;

        gfx.fillStyle(0xb0b0a8, 1);
        gfx.beginPath();
        gfx.moveTo(nearLeft.x, nearLeft.y);
        gfx.lineTo(nearRight.x, nearRight.y);
        gfx.lineTo(farRight.x, farRight.y);
        gfx.lineTo(farLeft.x, farLeft.y);
        gfx.closePath();
        gfx.fillPath();
    }

    // Center seam + MWF logo circle — split out from drawRingMat's flat fill
    // (2026-08-04, arena lighting pass) so the mat light pool can sit
    // between the two: fill (depth 3) -> pool (3.1, see
    // _setupArenaLighting) -> this markings pass (3.2) -> rope shadows
    // (3.3). Drawn at 3.2 unconditionally (not just when lighting is on) —
    // harmless no-op depth bump over the old flat depth-3 draw when the
    // pool doesn't exist.
    _drawRingMarkings() {
        const gfx = this.add.graphics().setDepth(3.2);
        const { nearLeft, nearRight, farLeft, farRight } = RING;

        const mnx = (nearLeft.x + nearRight.x) / 2;
        const mfx = (farLeft.x + farRight.x) / 2;
        gfx.lineStyle(1, 0xb0b0a8, 0.4);
        gfx.lineBetween(mnx, nearLeft.y, mfx, farLeft.y);

        const lx = (mnx + mfx) / 2;
        const ly = (nearLeft.y + farLeft.y) / 2 + 15;
        gfx.lineStyle(2, 0xb0b0a8, 0.5);
        gfx.strokeCircle(lx, ly, 38);
        gfx.lineStyle(1, 0xb0b0a8, 0.3);
        gfx.strokeCircle(lx, ly, 30);
    }

    drawNearApron() {
        const gfx = this.add.graphics().setDepth(6);
        const { nearLeft, nearRight, apronY } = RING;

        gfx.fillStyle(0xa0a098, 1);
        gfx.fillRect(nearLeft.x, nearLeft.y, nearRight.x - nearLeft.x, apronY - nearLeft.y);

        gfx.lineStyle(2, 0xb8b8b0, 1);
        gfx.lineBetween(nearLeft.x, apronY, nearRight.x, apronY);

        // MWF banner block on apron
        const mx = (nearLeft.x + nearRight.x) / 2;
        const my = nearLeft.y + (apronY - nearLeft.y) / 2;
        gfx.fillStyle(0x888880, 1);
        gfx.fillRect(mx - 55, my - 7, 110, 14);
    }

    _setupDynamicRopes() {
        // Near ropes sit between the camera and everything in the ring, so by
        // default they render above the deepest wrestler depth (12 + 445*0.03
        // = 25.35). They're banded by x — like the side ropes are banded by
        // depth — so when a wrestler is pressed into them, just the strands at
        // his back re-sort behind his body while the rest of the span keeps
        // crossing in front of the ring broadcast-style.
        this.nearRopeBands = [];
        for (let i = 0; i < 24; i++) {
            this.nearRopeBands.push(this.add.graphics().setDepth(25.5));
        }
        this.farRopeGfx  = this.add.graphics().setDepth(2);
        this.nearRopeSag = { val: 0, vel: 0 };
        this.farRopeSag  = { val: 0, vel: 0 };

        // Side ropes span the ring's whole depth, so no single depth value can
        // sort them against a wrestler standing mid-ring. Draw them in bands,
        // each depth-sorted with the wrestler formula (12 + groundY * 0.03) at
        // the band's ground position along the ring edge.
        this.sideRopeBands = [];
        const BANDS = 8;
        for (let i = 0; i < BANDS; i++) {
            const tMid    = (i + 0.5) / BANDS; // 0 = near corner → 1 = far corner
            const groundY = RING.nearLeft.y + (RING.farLeft.y - RING.nearLeft.y) * tMid;
            const g = this.add.graphics().setDepth(12 + groundY * 0.03);
            g._baseDepth = 12 + groundY * 0.03;
            this.sideRopeBands.push(g);
        }
    }

    // Wrestlers close enough to a rope wall press into it: 0 press at 34px
    // inside the plane, full press at the movement clamp (20px), so contact
    // peaks exactly where whip bounces, rope breaks, and cornered stalling
    // put a body. Airborne/held/climbing states don't press; grounded bodies
    // only reach the bottom strand.
    _ropePresses() {
        const SKIP = new Set(['climbing', 'onTurnbuckle', 'diving', 'grabbed',
                              'falling', 'flipping', 'slamming', 'dropkicking']);
        const LOW  = new Set(['down', 'gettingUp', 'possum', 'pinned',
                              'sleeping', 'pin', 'elbowDrop', 'elbowDropping']);
        const press = d => Math.min(1, Math.max(0, (34 - d) / 14));
        // near presses only feed the depth re-sort (horizontal ropes don't
        // deform — the toward-camera bow read badly); side presses also bow
        const out = { near: [], side: { '-1': [], 1: [] } };
        for (const w of [this.w1, this.w2]) {
            if (!w || SKIP.has(w.state)) continue;
            // per-strand weight bottom→top: an upright back bends the middle
            // and top ropes; a body on the mat only nudges the bottom one
            const wRope = LOW.has(w.state) ? [1, 0.15, 0] : [0.8, 1, 0.85];
            const depth = 12 + w.y * 0.03;
            const b = ringBoundsAtY(w.y);
            const t = (RING.nearLeft.y - w.y) / (RING.nearLeft.y - RING.farLeft.y);
            const kNear = press(RING.nearLeft.y - w.y);
            const kL    = press(w.x - b.left);
            const kR    = press(b.right - w.x);
            if (kNear) out.near.push({ x: w.x, k: kNear, depth, w: wRope });
            if (kL)    out.side[-1].push({ t, k: kL, depth, w: wRope });
            if (kR)    out.side[1].push({ t, k: kR, depth, w: wRope });
        }
        return out;
    }

    triggerRopeBounce(side) {
        const sag = side === 'far' ? this.farRopeSag : this.nearRopeSag;
        sag.vel += 90;
    }

    _updateRopes(dt) {
        const { nearLeft, nearRight, farLeft, farRight, ropes } = RING;

        for (const s of [this.nearRopeSag, this.farRopeSag]) {
            s.vel += (-s.val * 30 - s.vel * 8) * dt;
            s.val += s.vel * dt;
        }

        const farG = this.farRopeGfx;
        farG.clear();
        for (const b of this.nearRopeBands) b.clear();
        for (const b of this.sideRopeBands) b.clear();
        if (this.ropeShadowGfx) this.ropeShadowGfx.clear();

        const ns = this.nearRopeSag.val;
        const fs = this.farRopeSag.val;

        // Local rope deformation: wrestlers pressed into a wall bow the
        // strands around their position with a smooth cosine falloff.
        const presses = this._ropePresses();
        const bump = (u, c, r) => {
            const q = Math.abs(u - c) / r;
            return q >= 1 ? 0 : 0.5 + 0.5 * Math.cos(q * Math.PI);
        };

        // Sample an arched rope as a polyline — sag peaks mid-span; warp(x)
        // adds local press deformation on top of the uniform sag
        const archPts = (x0, y0, x1, y1, sag, warp, segs = 24) => {
            const pts = [];
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const x = x0 + (x1 - x0) * t;
                pts.push({ x, y: y0 + (y1 - y0) * t + sag * Math.sin(t * Math.PI) + (warp ? warp(x) : 0) });
            }
            return pts;
        };

        // Crack-free ribbon: stroked polylines tear at the segment joints once
        // lines get thick (Graphics has no line joins) — fill one continuous
        // quad strip instead. halfW may be an array for tapered width.
        const ribbonEdges = (pts, halfW) => {
            const top = [], bot = [];
            for (let i = 0; i < pts.length; i++) {
                const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
                const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
                const hw = Array.isArray(halfW) ? halfW[i] : halfW;
                top.push({ x: pts[i].x + nx * hw, y: pts[i].y + ny * hw });
                bot.push({ x: pts[i].x - nx * hw, y: pts[i].y - ny * hw });
            }
            return { top, bot };
        };
        // Two passes: a slightly wider faint halo under the solid core fakes
        // the antialiasing the post-filter framebuffers throw away — without
        // it the rope edges stair-step, worst on the diagonal side ropes.
        const AA = 0.9;
        const drawStrip = (gfx, top, bot, color, alpha) => {
            gfx.fillStyle(color, alpha);
            gfx.fillPoints([...top, ...[...bot].reverse()], true);
        };
        const fillRibbon = (gfx, pts, halfW, color, alpha, hlColor) => {
            const grow = w => Array.isArray(w) ? w.map(v => v + AA) : w + AA;
            const halo = ribbonEdges(pts, grow(halfW));
            drawStrip(gfx, halo.top, halo.bot, color, alpha * 0.3);
            const core = ribbonEdges(pts, halfW);
            drawStrip(gfx, core.top, core.bot, color, alpha);
            // Arena light catches the top of the strand — a thin bright edge
            // keeps dark ropes readable where they cross the crowd shadows
            if (hlColor) {
                const shrink = w => Array.isArray(w)
                    ? w.map(v => v - Math.max(0.7, v * 0.55))
                    : halfW - Math.max(0.7, halfW * 0.55);
                const inner = ribbonEdges(pts, shrink(halfW));
                const mid = pts.length >> 1;
                const useTop = core.top[mid].y < core.bot[mid].y; // pick the visually-upper edge
                const o = useTop ? core.top : core.bot;
                const n = useTop ? inner.top : inner.bot;
                gfx.fillStyle(hlColor, alpha * 0.9);
                gfx.fillPoints([...o, ...[...n].reverse()], true);
            }
        };

        // Fill a ribbon split across an array of band graphics — one segment
        // per band, pts.length === bands.length + 1. Edges are computed once
        // over the whole span so adjacent bands share exact vertices: no
        // cracks between graphics.
        const fillRibbonBands = (bands, pts, hw, color, alpha, hlColor, hlAlpha) => {
            const core  = ribbonEdges(pts, hw);
            const halo  = ribbonEdges(pts, hw.map(v => v + AA));
            const inner = ribbonEdges(pts, hw.map(v => v - Math.max(0.7, v * 0.55)));
            const mid   = pts.length >> 1;
            const useTop = core.top[mid].y < core.bot[mid].y;
            const hlO = useTop ? core.top  : core.bot;
            const hlI = useTop ? inner.top : inner.bot;
            for (let i = 0; i < bands.length; i++) {
                const g = bands[i];
                g.fillStyle(color, alpha * 0.3);
                g.fillPoints([halo.top[i], halo.top[i + 1], halo.bot[i + 1], halo.bot[i]], true);
                g.fillStyle(color, alpha);
                g.fillPoints([core.top[i], core.top[i + 1], core.bot[i + 1], core.bot[i]], true);
                g.fillStyle(hlColor, hlAlpha);
                g.fillPoints([hlO[i], hlO[i + 1], hlI[i + 1], hlI[i]], true);
            }
        };

        // Side rope point at parameter t (0 = near corner → 1 = far corner);
        // bows outward in x and downward in y, peaking at the midpoint.
        const BANDS  = this.sideRopeBands.length;
        const NBANDS = this.nearRopeBands.length;
        const yBow  = (ns + fs) * 0.5;
        const xBow  = (ns + fs) * 0.6;
        const sidePoint = (nearP, farP, rope, dir, t, rest, warpX) => {
            const bow = Math.sin(t * Math.PI);
            return {
                x: nearP.x + (farP.x - nearP.x) * t + dir * xBow * bow + (warpX ? warpX(t) : 0),
                y: rope.nearY + (rope.farY - rope.nearY) * t + (yBow + rest) * bow,
            };
        };

        // Resting gravity sag, bottom rope loosest → top rope tightest (px at
        // the near side; far side scaled down with the perspective). The
        // spring sag from bounces rides on top of this.
        const REST_SAG = [6, 4.5, 3];

        // Rope shadows (see ROPE_SHADOW and the merged-band pass further
        // below) project the exact same near/far/side point arrays the
        // visible ropes are built from — captured here as they're computed,
        // never recalculated — per rope index (0=bottom/1=middle/2=top,
        // RING.ropes' own order). The *Ref arrays are each rope's own
        // corner-to-corner line with zero sag/press (same archPts/sidePoint
        // calls, sag and warp forced to 0/null) — a per-rope zero-deflection
        // baseline, used only to measure how much THAT rope is currently
        // deforming (see buildMergedBand below), not drawn.
        const nearPtsByRi = [], nearRefByRi = [];
        const farPtsByRi = [], farRefByRi = [];
        const sidePtsByRi = [], sideRefByRi = [];

        ropes.forEach((rope, ri) => {
            const rest = REST_SAG[ri] ?? 4;
            // Horizontal ropes — 25% less spring sag than side ropes
            // Dark taped ropes, period-correct — they read as dark strands
            // against the lit canvas and melt into the crowd shadows above it.
            // No press deformation: bodies bow along their movement axis
            // (side to side), and a toward/away-from-camera bulge reads wrong.
            const nearPts = archPts(nearLeft.x, rope.nearY, nearRight.x, rope.nearY, rest + ns * 0.75, null, NBANDS);
            nearPtsByRi[ri] = nearPts;
            // Reference uses `rest` (the rope's own always-present resting
            // gravity droop), not 0 — a dead-flat line. Zeroing it out made
            // the near shadow's "deviation" include that resting droop
            // (~6px, comparable to the whole inset margin) even with the
            // rope perfectly still, pushing the shadow's baseline-relative
            // position past the mat edge at rest, not just during a real
            // bounce (found via pixel-sampling the rendered frame, not
            // guessed). Only ns (spring bounce) should count as live motion.
            nearRefByRi[ri] = archPts(nearLeft.x, rope.nearY, nearRight.x, rope.nearY, rest, null, NBANDS);
            fillRibbonBands(this.nearRopeBands, nearPts,
                new Array(NBANDS + 1).fill(2), 0x32322e, 1, 0x8e8e82, 0.9);
            const farPts = archPts(farLeft.x, rope.farY, farRight.x, rope.farY, rest * 0.58 + fs * 0.75, null);
            farPtsByRi[ri] = farPts;
            farRefByRi[ri] = archPts(farLeft.x, rope.farY, farRight.x, rope.farY, rest * 0.58, null);
            fillRibbon(farG, farPts, 1, 0x3c3c38, 0.9, 0x787870);

            // Side ropes — one segment per depth band so wrestlers sort
            // correctly; a press bows them outward in x, fading with distance.
            const sideRest = rest * 0.8;
            sidePtsByRi[ri] = {};
            sideRefByRi[ri] = {};
            for (const dir of [-1, 1]) {
                const nearP = dir < 0 ? nearLeft : nearRight;
                const farP  = dir < 0 ? farLeft  : farRight;
                const warpX = t => dir * presses.side[dir].reduce(
                    (a, p) => a + p.k * p.w[ri] * 8 * (1 - 0.42 * t) * bump(t, p.t, 0.28), 0);
                const pts = [], ref = [], hw = [];
                for (let i = 0; i <= BANDS; i++) {
                    const t = i / BANDS;
                    pts.push(sidePoint(nearP, farP, rope, dir, t, sideRest, warpX));
                    ref.push(sidePoint(nearP, farP, rope, dir, t, sideRest, null)); // resting droop included, press excluded — see near-rope comment above
                    hw.push((3.0 - 1.2 * t) / 2); // thinner with distance
                }
                sidePtsByRi[ri][dir] = pts;
                sideRefByRi[ri][dir] = ref;
                fillRibbonBands(this.sideRopeBands, pts, hw, 0x36362f, 0.85, 0x82827a, 0.75);
            }
        });

        // Dynamic mat-clipped rope shadows — one thin, merged line per ring
        // side (near/far/left/right), anchored to the BOTTOM rope's own
        // live points and displaced per ROPE_SHADOW, not three separate
        // offset stripes (see ROPE_SHADOW's own comment in arenaLighting.js
        // for why merged, and for round 3's "close to rope width, fixed
        // width" correction). Drawn into the masked this.ropeShadowGfx
        // (clipped to the mat trapezoid by its GeometryMask, see
        // _setupArenaLighting). Skipped entirely when the lighting
        // experiment is off (?lighting=0).
        if (this.lightingOn && this.ropeShadowGfx) {
            const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
            // Builds one band's centerline + per-point half-width. The
            // centerline is `baseline` (a REST position running along the
            // mat's own inset edge — see _setupArenaLighting's
            // this._shadowBaseline, computed once from insetMatTrapezoid),
            // perturbed by the BOTTOM rope's own current deviation from its
            // zero-deflection reference point (bPts[i] - bRef[i]) — i.e. sag/
            // bounce/press still move the shadow live, they just displace a
            // point anchored to the mat edge instead of the rope's own
            // literal (and, for the top rope in particular, far-from-the-
            // edge) screen position. `spread` (how much any of the three
            // ropes is currently diverging from its own reference) is still
            // measured here but ROPE_SHADOW's spreadMul is 0 as of round 3 —
            // Derek: the shadows should be close to rope width and hold that
            // width through sag/bounce, so only the centerline moves; width
            // no longer inflates. Left wired through cfg so a future pass
            // can dial it back in via that one constant instead of
            // re-deriving this measurement.
            // cfg.taper(t), t = 0 (near corner) -> 1 (far corner), lets the
            // side bands narrow with perspective the same way the visible
            // side ropes do (see their own `hw` formula above) — near/far
            // bands don't pass one, so their width stays flat end to end.
            const buildMergedBand = (bPts, mPts, tPts, bRef, mRef, tRef, baseline, cfg) => {
                const pts = [], hw = [];
                for (let i = 0; i < bPts.length; i++) {
                    const spread = Math.max(dist(bPts[i], bRef[i]), dist(mPts[i], mRef[i]), dist(tPts[i], tRef[i]));
                    const t = i / (bPts.length - 1);
                    const taper = cfg.taper ? cfg.taper(t) : 1;
                    pts.push({
                        x: baseline[i].x + (bPts[i].x - bRef[i].x),
                        y: baseline[i].y + (bPts[i].y - bRef[i].y),
                    });
                    hw.push(cfg.halfW * taper + spread * cfg.spreadMul);
                }
                return { pts, hw };
            };
            // Round 3: no more 1.8x-wider halo pass — that's what blew these
            // up into 12-32px stripes. A hard overhead light casts a shadow
            // close to the width of the rope itself, so the halo here is
            // just the same ~1px antialiasing fringe the visible ropes'
            // own fillRibbon/fillRibbonBands use (AA, above), not a second
            // wide band.
            const drawBand = (pts, hw, alpha) => {
                const halo = ribbonEdges(pts, hw.map(v => v + AA));
                drawStrip(this.ropeShadowGfx, halo.top, halo.bot, ROPE_SHADOW.color, alpha * 0.3);
                const core = ribbonEdges(pts, hw);
                drawStrip(this.ropeShadowGfx, core.top, core.bot, ROPE_SHADOW.color, alpha);
            };

            const N = ROPE_SHADOW.near;
            const near = buildMergedBand(
                nearPtsByRi[0], nearPtsByRi[1], nearPtsByRi[2],
                nearRefByRi[0], nearRefByRi[1], nearRefByRi[2], this._shadowBaseline.near, N);
            drawBand(near.pts, near.hw, N.alpha);

            const F = ROPE_SHADOW.far;
            const far = buildMergedBand(
                farPtsByRi[0], farPtsByRi[1], farPtsByRi[2],
                farRefByRi[0], farRefByRi[1], farRefByRi[2], this._shadowBaseline.far, F);
            drawBand(far.pts, far.hw, F.alpha);

            const S = ROPE_SHADOW.side;
            for (const dir of [-1, 1]) {
                const baseline = dir < 0 ? this._shadowBaseline.left : this._shadowBaseline.right;
                const side = buildMergedBand(
                    sidePtsByRi[0][dir], sidePtsByRi[1][dir], sidePtsByRi[2][dir],
                    sideRefByRi[0][dir], sideRefByRi[1][dir], sideRefByRi[2][dir], baseline, S);
                drawBand(side.pts, side.hw, S.alpha);
            }
        }

        // Re-sort pressed bands behind the pressing wrestler. Only full
        // contact re-sorts (k ≥ 0.55, i.e. within ~6px of the movement clamp)
        // so the flip lands at the moment of body contact; the deeper
        // wrestler still sorts behind the rope everywhere else because
        // depth is monotonic in ground y.
        for (let i = 0; i < NBANDS; i++) {
            const bx = nearLeft.x + (nearRight.x - nearLeft.x) * ((i + 0.5) / NBANDS);
            let d = 25.5;
            for (const p of presses.near) {
                if (p.k >= 0.55 && bump(bx, p.x, 95) > 0.15) d = Math.min(d, p.depth - 0.02);
            }
            this.nearRopeBands[i].setDepth(d);
        }
        for (let i = 0; i < BANDS; i++) {
            const g = this.sideRopeBands[i];
            const tMid = (i + 0.5) / BANDS;
            let d = g._baseDepth;
            for (const dir of [-1, 1]) {
                for (const p of presses.side[dir]) {
                    if (p.k >= 0.55 && Math.abs(tMid - p.t) < 0.3) d = Math.min(d, p.depth - 0.02);
                }
            }
            g.setDepth(d);
        }
    }

    drawPosts() {
        const { nearLeft, nearRight, farLeft, farRight, ropes, apronY } = RING;
        const topRope = ropes[2];

        // Near posts render in front of wrestlers and near ropes; far posts sit
        // behind the mat (depth 3) so the ring covers their bases, but above
        // the crowd (1) and far apron (2).
        const nearGfx = this.add.graphics().setDepth(25.7);
        const farGfx  = this.add.graphics().setDepth(2.5);

        const drawPost = (gfx, p) => {
            gfx.fillStyle(0x686860, 1);
            gfx.fillRect(p.x - p.w / 2, p.top, p.w, p.bot - p.top);
            gfx.fillStyle(0x888880, 1);
            gfx.fillCircle(p.x, p.top, p.w * 0.8);
        };

        drawPost(nearGfx, { x: nearLeft.x,  top: topRope.nearY - 6, bot: apronY,          w: 8 });
        drawPost(nearGfx, { x: nearRight.x, top: topRope.nearY - 6, bot: apronY,          w: 8 });
        drawPost(farGfx,  { x: farLeft.x,   top: topRope.farY - 4,  bot: farLeft.y  + 16, w: 5 });
        drawPost(farGfx,  { x: farRight.x,  top: topRope.farY - 4,  bot: farRight.y + 16, w: 5 });

        const tbSize = { near: 7, far: 4 };
        ropes.forEach(rope => {
            nearGfx.fillStyle(0x484840, 1);
            nearGfx.fillRect(nearLeft.x  - tbSize.near, rope.nearY - tbSize.near / 2, tbSize.near * 2, tbSize.near);
            nearGfx.fillRect(nearRight.x - tbSize.near, rope.nearY - tbSize.near / 2, tbSize.near * 2, tbSize.near);
            farGfx.fillStyle(0x484840, 1);
            farGfx.fillRect(farLeft.x  - tbSize.far, rope.farY - tbSize.far / 2, tbSize.far * 2, tbSize.far);
            farGfx.fillRect(farRight.x - tbSize.far, rope.farY - tbSize.far / 2, tbSize.far * 2, tbSize.far);
        });
    }

    // Arena lighting experiment (2026-08-04, reworked 2026-08-05) — see
    // ARENA_LIGHTING_AND_DEPTH_CONCEPTS.md and src/scenes/arenaLighting.js
    // for the full design brief and tunable constants. ?lighting=0 on the
    // game URL disables the whole slice (pool/beams skipped here, rope
    // shadows skipped in _updateRopes) for an exact before/after
    // comparison; purely visual, doesn't touch gameplay state.
    //
    // No fixture sprites are drawn as of the 2026-08-05 rework (Derek: "the
    // fixtures are junk" — see arenaLighting.js's header comment). The mat
    // light pool and rope shadows are both masked to the mat trapezoid
    // (drawRingMat's own polygon) so neither can spill onto the crowd,
    // apron, posts, or ringside characters. Beams are NOT masked — they
    // belong in the atmosphere above the ring, not clipped to the mat.
    _setupArenaLighting() {
        this.lightingOn = lightingEnabled();
        if (!this.lightingOn) return;

        const { nearLeft, nearRight, farLeft, farRight } = RING;
        const matMaskGfx = this.make.graphics({ x: 0, y: 0, add: false });
        matMaskGfx.fillStyle(0xffffff);
        matMaskGfx.beginPath();
        matMaskGfx.moveTo(nearLeft.x, nearLeft.y);
        matMaskGfx.lineTo(nearRight.x, nearRight.y);
        matMaskGfx.lineTo(farRight.x, farRight.y);
        matMaskGfx.lineTo(farLeft.x, farLeft.y);
        matMaskGfx.closePath();
        matMaskGfx.fillPath();
        const matMask = matMaskGfx.createGeometryMask();

        // Mat pool sits between the flat mat fill (depth 3, drawRingMat) and
        // the seam/logo linework (depth 3.2, _drawRingMarkings) — see that
        // method's comment for the full depth stack. A single tinted glow
        // Image now (see createMatLightPool), not a Graphics fill — round 3
        // fix for the concentric-ellipse "orb" bug (see arenaLighting.js's
        // header comment).
        const poolImg = createMatLightPool(this).setDepth(3.1).setMask(matMask);

        const beamGfx = this.add.graphics().setDepth(BEAM_DEPTH);
        drawBeams(beamGfx);

        // Restrained footprint glow where each beam lands on the crowd/haze
        // band behind the ring — same depth as the shafts themselves so
        // they read as one continuous light, not a separate effect.
        for (const spill of createBeamSpill(this)) spill.setDepth(BEAM_DEPTH);

        // Rope shadows redraw every frame in _updateRopes (reusing that
        // method's own live rope point arrays) — just the masked Graphics
        // target is set up here. Depth 3.3: above the mat fill/pool/logo,
        // below the near apron (6), near posts (25.7), and every wrestler/
        // rope depth (12+). The mask keeps it off the far posts (2.5)
        // regardless — see this method's own header comment.
        this.ropeShadowGfx = this.add.graphics().setDepth(3.3).setMask(matMask);

        // Rope-shadow REST baselines — one straight line per ring side,
        // running along the mat's own trapezoid edge inset inward by that
        // band's own halfW (see ROPE_SHADOW/insetMatTrapezoid's comments in
        // arenaLighting.js for why: round 1-3 anchored each band to the
        // bottom rope's own live position + a fixed offset, which put the
        // near band ~47px off the near edge and the far band ~33px off the
        // far edge). Computed once here since the mat geometry is static;
        // _updateRopes perturbs these points every frame with live sag/
        // bounce/press, it never repositions them. insetMatTrapezoid miters
        // the four inset edges together so adjacent bands share an exact
        // corner point — near/left/far/right connect with no seam.
        const insetOf = cfg => cfg.halfW * ROPE_SHADOW.insetMul + ROPE_SHADOW.insetPad;
        const insetCorners = insetMatTrapezoid(RING, {
            near: insetOf(ROPE_SHADOW.near),
            far: insetOf(ROPE_SHADOW.far),
            left: insetOf(ROPE_SHADOW.side),
            right: insetOf(ROPE_SHADOW.side),
        });
        const lerpPts = (p1, p2, segs) => {
            const pts = [];
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                pts.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
            }
            return pts;
        };
        this._shadowBaseline = {
            near:  lerpPts(insetCorners.nearLeft, insetCorners.nearRight, this.nearRopeBands.length),
            far:   lerpPts(insetCorners.farLeft, insetCorners.farRight, this.nearRopeBands.length),
            left:  lerpPts(insetCorners.nearLeft, insetCorners.farLeft, this.sideRopeBands.length),
            right: lerpPts(insetCorners.nearRight, insetCorners.farRight, this.sideRopeBands.length),
        };
    }

    // Bakes a soft-edged circle texture once — layered fillCircle passes at
    // falling alpha (same trick _triggerCameraFlash uses, just with more
    // rings for a softer result) — for _scheduleSmokePuff to reuse, cheaper
    // than any per-puff Graphics draw, and a plain fillCircle alone would
    // read as a hard disc, not a wisp. Derek: "feather the edges" — went
    // from 3 rings to 10 with a quadratic falloff, and a bigger canvas
    // (64px vs 40px) so the outermost, faintest rings have room to actually
    // read as a gradient instead of getting cropped by the texture bounds.
    createSmokeTexture() {
        const gfx = this.add.graphics();
        const SIZE = 64, CENTER = 32, RINGS = 10, MAX_R = 30, PEAK_ALPHA = 0.3;
        for (let i = RINGS; i >= 1; i--) {
            const t = i / RINGS; // 1 at the outer edge, small near center
            gfx.fillStyle(0xc8c8c0, PEAK_ALPHA * (1 - t) * (1 - t));
            gfx.fillCircle(CENTER, CENTER, MAX_R * t);
        }
        gfx.generateTexture('smokePuff', SIZE, SIZE);
        gfx.destroy();
    }

    // Same layered-circle technique as createSmokeTexture/createDustTexture
    // — many concentric rings at a quadratic alpha falloff, baked once,
    // instead of the original _triggerCameraFlash render's 2 raw
    // fillCircle discs (which read as visible hard-edged rings — Derek:
    // "the flashes have circular edges now and look weird"). 16 rings on a
    // 100px canvas gives a real gradient across the flash's full
    // ~50px radius rather than 2 discrete steps.
    createFlashTexture() {
        const gfx = this.add.graphics();
        const SIZE = 100, CENTER = 50, RINGS = 16, MAX_R = 48, PEAK_ALPHA = 0.9;
        for (let i = RINGS; i >= 1; i--) {
            const t = i / RINGS;
            gfx.fillStyle(0xffffff, PEAK_ALPHA * (1 - t) * (1 - t));
            gfx.fillCircle(CENTER, CENTER, MAX_R * t);
        }
        gfx.generateTexture('cameraFlashGlow', SIZE, SIZE);
        gfx.destroy();
    }

    createDustTexture() {
        const gfx = this.add.graphics();
        const SIZE = 20, CENTER = 10, RINGS = 7, MAX_R = 9, PEAK_ALPHA = 0.55;
        for (let i = RINGS; i >= 1; i--) {
            const t = i / RINGS;
            gfx.fillStyle(0xe8e8d8, PEAK_ALPHA * (1 - t) * (1 - t));
            gfx.fillCircle(CENTER, CENTER, MAX_R * t);
        }
        gfx.generateTexture('dustMote', SIZE, SIZE);
        gfx.destroy();
    }

    // Dust motes drifting through the arena light — Derek asked what else
    // could "up the production value" like the smoke; this reuses
    // drawArenaBackground's own lit band (y 0-170, the "arena light
    // warming the upper half where the crowd sits" fill) as the only place
    // motes spawn, same idea as light catching dust in a real lit room.
    // Respawns itself at a fresh random position on its own random gap —
    // 14 independent slots, staggered start, so it reads as a steady
    // ambient scatter rather than a synchronized pulse or a fixed cluster.
    //
    // Derek, live: "more subtle, subtler falloff and need warping." Three
    // fixes: peak alpha dropped (0.35-0.6 -> 0.1-0.2, on top of
    // createDustTexture's own softer edge — doubly subtler); the alpha
    // tween's flat `hold` plateau removed in favor of one continuous
    // yoyo arc (duration life/2 each way, no hold) so it reads as a smooth
    // rise-and-fall rather than fade-in/steady/fade-out; and scaleX/scaleY
    // now run as two separate out-of-phase tweens (same "independent,
    // out-of-phase motions read as organic warping" trick
    // _spawnSmokePuffAt already uses) instead of one fixed setScale, so
    // each mote subtly pulses/deforms rather than staying a static dot.
    _scheduleDustMote() {
        const x = Math.random() * W, y = Math.random() * 170;
        const baseScale = 0.4 + Math.random() * 0.5;
        const mote = this.add.image(x, y, 'dustMote')
            .setDepth(1.6) // same "floating in the lit air above the background crowd" layer the smoke uses
            .setAlpha(0)
            .setScale(baseScale, baseScale);
        const life = 4000 + Math.random() * 3000;
        // Motes spawned inside a beam's footprint catch the light and read
        // brighter than ambient ones — beamInfluenceAt (arenaLighting.js) is
        // the shared field every atmospheric particle can sample; checked
        // once at spawn (motes drift only ~50px, so the beam they started
        // in is still the one they're mostly in) rather than every frame.
        const beamBoost = this.lightingOn ? beamInfluenceAt(x, y) * 0.35 : 0;
        this.tweens.add({
            targets: mote,
            alpha: 0.1 + Math.random() * 0.1 + beamBoost,
            duration: life / 2,
            yoyo: true,
            ease: 'Sine.easeInOut',
            onComplete: () => { this.tweens.killTweensOf(mote); mote.destroy(); },
        });
        // Wanders through 2 random intermediate waypoints instead of one
        // straight interpolation to a final point — Derek: "more random in
        // their path." Phaser tweens accept an array of values per prop
        // and visit each in sequence over the total duration, so this is
        // still one tween, just a meandering one instead of point-to-point.
        this.tweens.add({
            targets: mote,
            x: [x + (Math.random() - 0.5) * 40, x + (Math.random() - 0.5) * 50, x + (Math.random() - 0.5) * 60],
            y: [y + 3 + Math.random() * 6, y + 6 + Math.random() * 10, y + 8 + Math.random() * 15], // gentle downward settle — "fall even slower": shorter distance over the same duration
            duration: life,
            ease: 'Sine.easeInOut',
        });
        this.tweens.add({
            targets: mote,
            scaleX: baseScale * (0.7 + Math.random() * 0.5),
            duration: life * (0.3 + Math.random() * 0.2),
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
        this.tweens.add({
            targets: mote,
            scaleY: baseScale * (0.7 + Math.random() * 0.5),
            duration: life * (0.4 + Math.random() * 0.3),
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
        this.time.delayedCall(life + 200 + Math.random() * 800, () => this._scheduleDustMote());
    }

    _setupDustMotes() {
        const COUNT = 7; // "make them half as common" — was 14
        for (let i = 0; i < COUNT; i++) {
            this.time.delayedCall(Math.random() * 4000, () => this._scheduleDustMote());
        }
    }

    // Spawns one soft puff at (x, y), tweens it drifting up while
    // stretching and fading, then destroys it — a single wisp, not a real
    // particle system (this codebase has no particle emitter set up
    // anywhere yet). Shared by _scheduleSmokePuff (groucho's cigar, tracks
    // a moving fan) and _scheduleAmbientSmoke (fixed ambient positions
    // scattered through the crowd, not tied to any character's hand).
    //
    // Iterated live with Derek across several rounds on groucho's cigar
    // before this became shared code — see git history for the blow-by-
    // blow (subtlety, feathering, slow-down, warp) if tuning it again.
    // sizeMul/alphaMul let ambient background instances read smaller/
    // fainter than groucho's own, depth lets them sit behind whichever
    // crowd row they're planted in rather than always in front like his.
    _spawnSmokePuffAt(x, y, { sizeMul = 1, alphaMul = 1, depth = 1.6 } = {}) {
        const puff = this.add.image(x, y, 'smokePuff')
            .setDepth(depth)
            .setAlpha(0.13 * alphaMul)
            .setScale(0.3 * sizeMul, 0.3 * sizeMul)
            .setAngle((Math.random() - 0.5) * 20);
        this.tweens.add({
            targets: puff,
            x: x + (Math.random() - 0.5) * 12,
            y: y - (75 + Math.random() * 15) * sizeMul,
            alpha: 0,
            duration: 3800 + Math.random() * 900,
            ease: 'Sine.easeOut',
            onComplete: () => { this.tweens.killTweensOf(puff); puff.destroy(); },
        });
        this.tweens.add({
            targets: puff,
            scaleX: (0.5 + Math.random() * 0.4) * sizeMul,
            angle: puff.angle + (Math.random() - 0.5) * 60,
            duration: 2000 + Math.random() * 800,
            ease: 'Sine.easeInOut',
        });
        this.tweens.add({
            targets: puff,
            scaleY: (2.0 + Math.random() * 0.8) * sizeMul,
            duration: 3200 + Math.random() * 900,
            ease: 'Sine.easeOut',
        });
    }

    // Reschedules itself, same "independent loop, own random gap" shape as
    // _scheduleBackCrowdIdle et al. Reads fan.img.x/y live each firing
    // rather than caching spot.x/groundY once — harmless for groucho (a
    // fixed CROWD_EXTRAS spot that never moves), but keeps this reusable
    // if a future smoking extra ever does move (stepOffset, etc.).
    _scheduleSmokePuff(fan, offset) {
        const GAP_MIN = 500, GAP_MAX = 750;
        this.time.delayedCall(GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN), () => {
            // offset.x flips with the fan's own spot.flip, same
            // direction-aware convention _setExtraFrame's stepOffset uses
            // — groucho is flip:false today so this is a no-op for him,
            // but keeps the offset correct if a future mirrored smoker
            // reuses it.
            const dir = fan.spot.flip ? -1 : 1;
            this._spawnSmokePuffAt(fan.img.x + offset.x * dir, fan.img.y + offset.y, { depth: 1.6 });
            this._scheduleSmokePuff(fan, offset);
        });
    }

    // Ambient period-atmosphere smoke, scattered through the crowd — Derek:
    // "I just want the crowd to be smoking... it doesn't have to be
    // necessarily perfect, they can be in the back, maybe one or two in
    // the foreground... it's about the overall ambiance of the time
    // period." Unlike groucho's cigar (a real prop in his hand), these
    // aren't anchored to any specific character — just fixed points in the
    // crowd's general footprint, since nobody's actually holding a visible
    // cigarette at this scale/distance anyway. Same reschedule shape as
    // _scheduleSmokePuff, fixed (x, y) instead of a moving fan.
    _scheduleAmbientSmoke(x, y, opts) {
        const GAP_MIN = 500, GAP_MAX = 750;
        this.time.delayedCall(GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN), () => {
            this._spawnSmokePuffAt(x, y, opts);
            this._scheduleAmbientSmoke(x, y, opts);
        });
    }

    // 10 ambient smokers — Derek: "if 15 is trivial, let's do at least 10."
    // 8 in the back rows (depth matched to roughly which background row
    // they'd sit in — see drawFourth/Fifth/SixthRow's own depths of
    // 0.8/0.7/0.6), 2 up front. Positions hand-picked across the crowd's
    // actual x/y footprint (backgrounds span x 30-930/y 125-300) rather
    // than randomized at runtime — keeps them out of the ring posts/mat
    // and spread across the width rather than risking a random cluster.
    //
    // The 2 front ones were originally planted at y 270-280, depth 1.6 —
    // that's the BACKGROUND crowd's own y-range (behind the ring), not
    // actually "foreground." Derek: "two of the smokes are in the ring,
    // move them to the level of the foreground audience's heads and pick
    // a head for each one and increase their size, but stack them behind
    // so the head covers the smoke." Foreground here means drawSideCrowd's
    // FRONT_ROW (depth 28, groundY 660, h 204 — the row actually in front
    // of the ring, not CROWD_EXTRAS' row behind it). Repositioned to two
    // of FRONT_ROW's own seat x's (390, 700) at that row's head level
    // (top = groundY - h = 456, nudged to 465 to sit in the hair mass
    // rather than the empty air right above it), sized up accordingly, and
    // given depth 27.5 — below FRONT_ROW's 28 (so his head visually covers
    // the smoke's base — "stack them behind") but above SECOND_ROW's 27.
    //
    // Derek also: "increase the smoke sizes too, except for grouchos" —
    // BACK's sizeMul bumped 0.6->0.9; groucho's own cigar smoke
    // (_scheduleSmokePuff, separate code path via CROWD_EXTRAS'
    // smokeOffset) is untouched by this method entirely.
    _setupAmbientSmokers() {
        const BACK = [
            { x: 90,  y: 145, depth: 0.6 },
            { x: 250, y: 130, depth: 0.6 },
            { x: 420, y: 140, depth: 0.65 },
            { x: 600, y: 128, depth: 0.6 },
            { x: 760, y: 150, depth: 0.65 },
            { x: 870, y: 165, depth: 0.7 },
            { x: 150, y: 190, depth: 0.7 },
            { x: 520, y: 175, depth: 0.7 },
        ];
        BACK.forEach(({ x, y, depth }) => this._scheduleAmbientSmoke(x, y, { sizeMul: 0.9, alphaMul: 0.75, depth }));

        const FRONT = [
            { x: 390, y: 465 },
            { x: 700, y: 465 },
        ];
        FRONT.forEach(({ x, y }) => this._scheduleAmbientSmoke(x, y, { sizeMul: 2.2, alphaMul: 1, depth: 27.5 }));
    }

    createScanlines() {
        const gfx = this.add.graphics();
        gfx.fillStyle(0x000000, 1);
        for (let y = 0; y < H; y += 2) {
            gfx.fillRect(0, y, W, 1);
        }
        gfx.generateTexture('scanlines', W, H);
        gfx.destroy();
        this.add.image(0, 0, 'scanlines').setOrigin(0, 0).setAlpha(0.18).setDepth(50);
    }

    showTitleCard() {
        const overlay = this.add.graphics().setDepth(200);
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, W, H);

        const base = { fontFamily: '"Times New Roman", Times, serif', color: '#d8d8d0', align: 'center' };
        const t1 = this.add.text(W / 2, H / 2 - 70, 'MIDWEST WRESTLING FEDERATION',
            { ...base, fontSize: '18px', letterSpacing: 7 }).setOrigin(0.5).setDepth(201);
        const t2 = this.add.text(W / 2, H / 2 - 30, 'presents',
            { ...base, fontSize: '13px', letterSpacing: 6, fontStyle: 'italic' }).setOrigin(0.5).setDepth(201);
        const t3 = this.add.text(W / 2, H / 2 + 12, 'WRESTLING FROM MARIGOLD',
            { ...base, fontSize: '30px', letterSpacing: 10 }).setOrigin(0.5).setDepth(201);
        const t4 = this.add.text(W / 2, H / 2 + 62, 'LIVE FROM MARIGOLD ARENA  ·  CHICAGO, ILLINOIS',
            { ...base, fontSize: '11px', letterSpacing: 3 }).setOrigin(0.5).setDepth(201);
        const t5 = this.add.text(W / 2, H / 2 + 85, 'WFM',
            { ...base, fontSize: '9px', letterSpacing: 5, color: '#888880' }).setOrigin(0.5).setDepth(201);

        const all = [overlay, t1, t2, t3, t4, t5];
        all.forEach(e => e.setAlpha(0));

        this.tweens.add({
            targets: all,
            alpha: 1,
            duration: 900,
            ease: 'Linear',
            onComplete: () => {
                this.time.delayedCall(3200, () => {
                    this.tweens.add({
                        targets: all,
                        alpha: 0,
                        duration: 1400,
                        ease: 'Linear',
                        onComplete: () => all.forEach(e => e.destroy()),
                    });
                });
            },
        });
    }

    _setupGame() {
        const kb = this.input.keyboard;

        const keys1 = {
            up:       kb.addKey('W'),
            down:     kb.addKey('S'),
            left:     kb.addKey('A'),
            right:    kb.addKey('D'),
            action:   kb.addKey('F'),     // grapple: whip / clothesline / pin
            power:    kb.addKey('G'),     // power:   slam / elbow drop / dropkick
            finisher: kb.addKey('H'),     // finisher: sleeper hold
            run:      kb.addKey('R'),     // run to rope
            evade:    kb.addKey('E'),     // tap: backstep — dodges strikes
            block:    kb.addKey('T'),     // hold: braced stance — stuffs grapples
        };
        const keys2 = {
            up:       kb.addKey('UP'),
            down:     kb.addKey('DOWN'),
            left:     kb.addKey('LEFT'),
            right:    kb.addKey('RIGHT'),
            action:   kb.addKey('ENTER'),
            power:    kb.addKey('SHIFT'),
            finisher: kb.addKey('SPACE'),
            run:      kb.addKey('FORWARD_SLASH'),
            evade:    kb.addKey('COMMA'),  // tap: backstep — dodges strikes
            block:    kb.addKey('PERIOD'), // hold: braced stance — stuffs grapples
        };

        const input1 = new InputHandler('keyboard', keys1);
        const input2 = new InputHandler('keyboard', keys2);

        // Kit + AI presets. Roster is just these two (2026-07-26,
        // promoted-george roster change — the "brawler" placeholder body
        // type and the entire george-ai-pilot v1-v9 comparison lineage are
        // vaulted out; see `_vault/` and this file's CHARACTERS comment
        // above). Default card is Lou Thesz vs George; ?p1=/?p2= (WFM_P1/
        // WFM_P2 through the debug harness) still swap a side for sims.
        // Old-TV booking rule: one man light, one man dark, so the
        // grayscale broadcast filter never lets two overlapping bodies read
        // as one.
        const PRESETS = {
            george: {
                name: 'GEORGE', personality: 'george', idlePose: 'powerIdle',
                skin: 0xa87858, trunks: 0x1a1a1a,
                moveSet: ['irishWhip', 'clothesline', 'piledriver', 'suplex', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt', 'hammerlock', 'kneeLift', 'backBodyDrop', 'kneeDrop'],
                textures: george.textures,
            },
            thesz: {
                // Clean technical kit — no headbutt, no piledriver; suplex and
                // slam are his conversions, the holds are his actual game
                name: 'THESZ', personality: 'thesz', idlePose: 'theszIdle',
                skin: 0xe8c098, trunks: 0x484848,
                moveSet: ['irishWhip', 'clothesline', 'bodySlam', 'suplex', 'pin', 'elbowDrop', 'dropkick', 'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'theszPress', 'hammerlock', 'backBodyDrop', 'kneeDrop'],
                textures: thesz.textures,
            },
        };
        const q  = new URLSearchParams(location.search);
        const c1 = this._preset1 = PRESETS[q.get('p1')] ?? PRESETS.thesz;
        const c2 = this._preset2 = PRESETS[q.get('p2')] ?? PRESETS.george;

        this.w1 = new Wrestler(this, 330, 360, c1.skin, c1.trunks, input1, c1.moveSet, c1.textures ?? {});
        this.w1.facing   = 1;
        this.w1.idlePose = c1.idlePose;

        this.w2 = new Wrestler(this, 630, 360, c2.skin, c2.trunks, input2, c2.moveSet, c2.textures ?? {});
        this.w2.facing   = -1;
        this.w2.idlePose = c2.idlePose;

        // Seekable move-animation runtime, driven by this Scene's own clock in
        // _tickGame — no second timer. Only the jab is migrated so far (see
        // RIG_AND_MOVE_PIPELINE.md); every other move still uses the legacy
        // tween/timer path. shutdown() cancels active clips and clears the
        // registry so nothing survives a Scene restart.
        this.moveRuntime = new MoveRuntime();
        this.moveRuntime.register(jabClip);
        this.moveRuntime.register(hammerlockClip);
        this.events.once('shutdown', () => this.moveRuntime.shutdown());

        // Both P1 and P2 default to keyboard (Derek, 2026-07-12 — loading the
        // game for a quick look shouldn't immediately throw them into a
        // fight). Keys 1 and 2 toggle each player between keyboard and AI —
        // turn both AI on to watch a match.
        const lblStyle = {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '10px',
            color: '#888880',
            letterSpacing: 2,
        };
        this._p1Keyboard = input1;
        this._p1AI       = new AIHandler(c1.personality);
        this._p1AI.setWrestlers(this.w1, this.w2);
        this.p1ModeLbl = this.add.text(24, 26, '', lblStyle).setOrigin(0, 0).setDepth(155);
        this._showPlayerMode(1);
        kb.addKey('ONE').on('down', () => this._togglePlayer(1));

        this._p2Keyboard = input2;
        this._p2AI       = new AIHandler(c2.personality);
        this._p2AI.setWrestlers(this.w2, this.w1);
        this.p2ModeLbl = this.add.text(W - 24, 26, '', lblStyle).setOrigin(1, 0).setDepth(155);
        this._showPlayerMode(2);
        kb.addKey('TWO').on('down', () => this._togglePlayer(2));

        // Pin countdown text
        this.pinText = this.add.text(W / 2, H / 2 - 10, '', {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '72px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5).setDepth(150).setAlpha(0);

        // Stamina bars — thin strips at top of screen, outside the broadcast frame
        this.staminaGfx = this.add.graphics().setDepth(155);

        this.pinState      = null; // { attacker, defender, timer }
        this.sleeperState  = null; // { attacker, defender, timer }
        this.headlockState = null; // { attacker, defender, timer }
        this.lockupState   = null; // { attacker, defender, timer }

        // Crowd heat — 0–100, bumped by big moves, taunts, nearfalls. Cools
        // exponentially toward a floor that big spots ratchet upward, so a
        // match that has delivered stays warm between spots instead of
        // bleeding back to silence (see bumpHeat/_updateHeat).
        this.heat      = 30;
        this.heatFloor = 10;
        this._heatChain = 0;
        this._lastBumpT = -99;
        this.heatGfx = this.add.graphics().setDepth(152);
        this.heatLbl = this.add.text(W / 2, H - 30, 'CROWD', {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '9px',
            color: '#a8a8a0',
            letterSpacing: 4,
        }).setOrigin(0.5, 1).setDepth(153);

        // Match event log — consumed by the future AI commentary system.
        // Each entry: { t, type, ...payload }
        // Significant types: 'move', 'knockdown', 'stagger', 'pinAttempt',
        //   'kickout', 'nearfall', 'pinfall', 'sleeperApplied',
        //   'sleeperEscape', 'sleeperKO'
        this.matchEvents = [];
        this._matchTime  = 0;
        this.matchOver   = false;

        // Crowd audio — synthesized murmur tracks the heat meter, pops on events.
        // Browsers block audio until a user gesture, so start on first input.
        this.crowd = new CrowdAudio();
        const unlockAudio = () => this.crowd.start();
        this.input.keyboard.once('keydown', unlockAudio);
        this.input.once('pointerdown', unlockAudio);

        // Match clock — counts up, TV-graphic style; draw at the time limit.
        // 10 min for now; the 30-minute Broadway becomes a story-mode setting.
        this.matchLimit = 10 * 60;
        this.clockLbl = this.add.text(W / 2, 12, '0:00', {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '15px',
            color: '#999990',
            letterSpacing: 3,
        }).setOrigin(0.5, 0).setDepth(155);
    }

    _playerRig(n) {
        return n === 1
            ? { w: this.w1, ai: this._p1AI, kb: this._p1Keyboard, lbl: this.p1ModeLbl, name: this._preset1.name }
            : { w: this.w2, ai: this._p2AI, kb: this._p2Keyboard, lbl: this.p2ModeLbl, name: this._preset2.name };
    }

    _togglePlayer(n) {
        const r = this._playerRig(n);
        r.w.input = r.w.input === r.ai ? r.kb : r.ai;
        this._showPlayerMode(n);
    }

    // Show a player's control mode for a few seconds, then fade
    _showPlayerMode(n) {
        const r    = this._playerRig(n);
        const isAI = r.w.input === r.ai;
        r.lbl.setText(isAI ? `P${n}: ${r.name} (AI) — ${n} = KEYBOARD` : `P${n}: KEYBOARD — ${n} = AI`);
        r.lbl.setAlpha(1);
        this.tweens.killTweensOf(r.lbl);
        this.tweens.add({
            targets: r.lbl,
            alpha: 0,
            delay: 3500,
            duration: 800,
        });
    }

    _drawStaminaBars() {
        const g   = this.staminaGfx;
        const BAR_W = 180, BAR_H = 6, PAD = 24, Y = 14;
        g.clear();

        const draw = (wrestler, x, flip) => {
            const pct = wrestler.stamina / 100;
            const fillW = BAR_W * pct;
            // Background
            g.fillStyle(0x222222, 0.8);
            g.fillRect(x, Y, BAR_W, BAR_H);
            // Fill — green → yellow → red as stamina drops
            const col = pct > 0.5 ? 0x88bb44 : pct > 0.25 ? 0xccaa22 : 0xbb3322;
            g.fillStyle(col, 1);
            g.fillRect(flip ? x + BAR_W - fillW : x, Y, fillW, BAR_H);
        };

        draw(this.w1, PAD, false);                   // P1 bar — grows right
        draw(this.w2, W - PAD - BAR_W, true);        // P2 bar — grows left
    }

    // Append a timestamped event to the match log.
    // Future AI commentary system reads this to generate contextual play-by-play.
    _logEvent(type, payload = {}) {
        this.matchEvents.push({ t: Math.round(this._matchTime), type, ...payload });
        const pop = POP_SIZES[type];
        if (pop) this.crowd.pop(pop);
        if (pop >= 0.15) this._reactCrowdExtras();
        if (type === 'dodge') this.bumpHeat(3); // logged from strike impact callbacks
    }

    bumpHeat(amount) {
        // Chained spots play bigger: bumps landing within 4s of the previous
        // one build a multiplier, so a sequence heats the room faster than
        // the same moves spread across dead air.
        this._heatChain = (this._matchTime - this._lastBumpT < 4) ? Math.min(5, this._heatChain + 1) : 0;
        this._lastBumpT = this._matchTime;
        this.heat = Math.min(100, this.heat + amount * (1 + 0.18 * this._heatChain));
        // Big spots ratchet the crowd's floor — once they've seen a nearfall
        // the room never goes back to cold silence.
        if (amount >= 8) this.heatFloor = Math.min(60, this.heatFloor + amount * 0.45);
    }

    // Comeback mechanic: surviving a big spot refunds stamina, so the wrestler
    // who's behind gets a real chance to swing the match. The refund scales
    // with crowd heat (50% cold → 150% at full roar) — a hot crowd literally
    // lifts you, which is what the heat meter is *for*.
    _comeback(wrestler, stamina) {
        wrestler.stamina = Math.min(100, wrestler.stamina + stamina * (0.5 + this.heat / 100));
    }

    _isAtRopes(wrestler) {
        const b = ringBoundsAtY(wrestler.y);
        const threshold = 30 * wrestler.s;
        return wrestler.x <= b.left + threshold || wrestler.x >= b.right - threshold;
    }

    // A move that lands directly in a cover (the Thesz press) enters the pin
    // here — tryAction's return-value path only covers grapples on a downed
    // man. Mirrors that path: states + pinHold pose + pinState + event.
    startPin(attacker, defender) {
        if (this.matchOver) return;
        attacker.state = 'pinning';
        defender.state = 'pinned';
        attacker.tweenPose('pinHold', 200, 'Linear');
        if (!this.pinState) {
            this.pinState = { attacker, defender, timer: 0 };
            this._logEvent('pinAttempt', { attacker: attacker === this.w1 ? 'p1' : 'p2', defenderStamina: Math.round(defender.stamina) });
        }
    }

    _showRopeBreak() {
        this.pinText.setText('ROPE BREAK').setAlpha(1);
        this.time.delayedCall(1000, () => this.pinText.setAlpha(0));
        this.bumpHeat(12);
        this._logEvent('ropeBreak');
    }

    _heatForMove(move) {
        const bumps = {
            irishWhip: 2, clothesline: 8, bodySlam: 12, piledriver: 15,
            dropkick: 8, elbowDrop: 7, doubleAxeHandle: 8, sleeperHold: 6,
            headlock: 3, armDrag: 6, suplex: 12, dive: 10, topDive: 18,
            jab: 3, headbutt: 5, taunt: 10, turnbuckleTaunt: 12, theszPress: 16,
            hammerlock: 5, kneeLift: 5, backBodyDrop: 10, kneeDrop: 7,
        };
        const n = bumps[move];
        if (n) this.bumpHeat(n);
    }

    _updateHeat(dt) {
        // A roar dies down over ~15s but settles at the simmer the match has
        // earned rather than draining linearly to zero. The floor itself
        // cools very slowly, so a long dead stretch does lose the room.
        this.heatFloor = Math.max(10, this.heatFloor - 0.15 * dt);
        this.heat = this.heatFloor + (this.heat - this.heatFloor) * Math.exp(-0.08 * dt);
        this.crowd.setHeat(this.heat / 100);
    }

    _drawHeatMeter() {
        const g = this.heatGfx;
        g.clear();
        const BAR_W = 200, BAR_H = 7;
        const bx = (W - BAR_W) / 2;
        const by = H - 26;

        // Visible frame — the old bare dark-on-dark bar vanished into the
        // vignette at the bottom of the frame
        g.fillStyle(0x000000, 0.9);
        g.fillRect(bx - 2, by - 2, BAR_W + 4, BAR_H + 4);
        g.lineStyle(1, 0x777770, 0.9);
        g.strokeRect(bx - 2, by - 2, BAR_W + 4, BAR_H + 4);

        // Dim under-fill marks the ratcheted floor — how much of the room
        // the match has permanently won over
        g.fillStyle(0x55554e, 1);
        g.fillRect(bx, by, BAR_W * (this.heatFloor / 100), BAR_H);

        const fillW = BAR_W * (this.heat / 100);
        const lum = Math.floor(90 + this.heat * 1.4); // readable gray (cold) → blazing white (hot)
        const col = (Math.min(255, lum) << 16) | (Math.min(255, lum) << 8) | Math.min(255, lum);
        g.fillStyle(col, 1);
        g.fillRect(bx, by, fillW, BAR_H);

        this.heatLbl.setPosition(W / 2, by - 4);
    }

    _tickGame(dt) {
        const { w1, w2 } = this;

        // Clock pauses while the end-of-match banner is up
        if (!this.matchOver) {
            this._matchTime += dt;
            const m = Math.floor(this._matchTime / 60);
            const s = Math.floor(this._matchTime % 60);
            this.clockLbl.setText(`${m}:${String(s).padStart(2, '0')}`);

            // Time-limit draw — held off while a pin or sleeper is resolving
            if (this._matchTime >= this.matchLimit && !this.pinState && !this.sleeperState) {
                this._logEvent('timeLimitDraw');
                this._endMatch('TIME LIMIT — DRAW');
            }
        }

        // Tick AI before wrestler actions so decisions are ready this frame.
        // Paused while the win banner is up so the AI doesn't attack the loser —
        // and cleared, or the frozen key map keeps re-firing its last presses.
        if (!this.matchOver) {
            w1.input.tick?.(dt);
            w2.input.tick?.(dt);
        } else {
            w1.input.clear?.();
            w2.input.clear?.();
        }

        w1.move(dt, w2);
        w2.move(dt, w1);

        w1.tickDown(dt);
        w2.tickDown(dt);
        w1.tickPossum(dt);
        w2.tickPossum(dt);

        w1.tickRun(dt);
        w2.tickRun(dt);

        w1.updateCombatBlend(dt, w2);
        w2.updateCombatBlend(dt, w1);

        // Defense first — a block/evade registered this frame beats the
        // attack attempts resolved below
        w1.tickDefense(dt, w2);
        w2.tickDefense(dt, w1);

        // Grapple actions — only one can initiate per frame
        const r1 = w1.tryAction(w2);
        const r2 = r1 ? false : w2.tryAction(w1);

        // Power moves — mutually exclusive, state machine handles most conflicts
        const p1 = w1.tryPower(w2);
        const p2 = p1 ? false : w2.tryPower(w1);

        // Finisher slot
        const f1 = w1.tryFinisher(w2);
        const f2 = f1 ? false : w2.tryFinisher(w1);

        // Self-initiated run — mutually exclusive, no defender to log
        const rn1 = w1.tryRun();
        if (!rn1) w2.tryRun();

        // Running attack — fires while returning from rope
        const ra1 = w1.tryRunningAttack(w2);
        const ra2 = ra1 ? false : w2.tryRunningAttack(w1);

        // Turnbuckle climb and dive
        w1.tryClimb(); w2.tryClimb();
        const d1 = w1.tryDive(w2);
        const d2 = d1 ? false : w2.tryDive(w1);

        // Log every move that landed this frame and bump crowd heat
        const logMove = (move, attacker, defender) => {
            if (!move || move === true) return;
            // Stuffed grapple — the credit belongs to the blocker, not the attacker
            if (move === 'grappleBlocked') {
                this._logEvent('grappleBlock', { blocker: attacker === 'p1' ? 'p2' : 'p1' });
                this.bumpHeat(6);
                return;
            }
            const type = (move !== 'taunt' && (move === 'knockdown' || defender.state === 'down' || defender.state === 'falling' || defender.state === 'flipping'))
                ? 'knockdown' : (defender.state === 'staggered' ? 'stagger' : 'move');
            this._logEvent(type, { attacker, move, defenderStamina: Math.round(defender.stamina) });
            this._heatForMove(move);
            // Playing to the crowd converts heat into wind: taunts refund
            // stamina scaled by how hot the building is (via _comeback)
            if (move === 'taunt' || move === 'turnbuckleTaunt') {
                this._comeback(attacker === 'p1' ? this.w1 : this.w2, 4);
            }
        };
        logMove(r1,  'p1', w2); logMove(r2,  'p2', w1);
        logMove(p1,  'p1', w2); logMove(p2,  'p2', w1);
        logMove(f1,  'p1', w2); logMove(f2,  'p2', w1);
        logMove(ra1, 'p1', w2); logMove(ra2, 'p2', w1);
        logMove(d1, 'p1', w2); logMove(d2, 'p2', w1);

        if ((r1 === 'lockup') && !this.lockupState) {
            this.lockupState = { attacker: w1, defender: w2, timer: 0 };
        } else if ((r2 === 'lockup') && !this.lockupState) {
            this.lockupState = { attacker: w2, defender: w1, timer: 0 };
        }

        if (this.lockupState) this._tickLockup(dt);

        if (r1 === 'pin' && !this.pinState) {
            this.pinState = { attacker: w1, defender: w2, timer: 0 };
            this._logEvent('pinAttempt', { attacker: 'p1', defenderStamina: Math.round(w2.stamina) });
        } else if (r2 === 'pin' && !this.pinState) {
            this.pinState = { attacker: w2, defender: w1, timer: 0 };
            this._logEvent('pinAttempt', { attacker: 'p2', defenderStamina: Math.round(w1.stamina) });
        }

        if (f1 === 'sleeperHold' && !this.sleeperState) {
            this.sleeperState = { attacker: w1, defender: w2, timer: 0 };
            this._logEvent('sleeperApplied', { attacker: 'p1' });
        } else if (f2 === 'sleeperHold' && !this.sleeperState) {
            this.sleeperState = { attacker: w2, defender: w1, timer: 0 };
            this._logEvent('sleeperApplied', { attacker: 'p2' });
        }

        if (this.pinState)      this._tickPin(dt);
        if (this.sleeperState)  this._tickSleeper(dt);
        if (this.headlockState) this._tickHeadlock(dt);

        this._orphanWatchdog(w1, w2, dt);
        this._orphanWatchdog(w2, w1, dt);

        // Advance active move clips last, so their sampled pose is the final
        // word for the frame (it overrides move()'s idle-drift) and authored
        // impact markers fire against this frame's already-resolved states.
        this.moveRuntime.update(dt);

        w1.draw();
        w2.draw();
        this._updateRopes(dt);
        this._drawStaminaBars();
        this._updateHeat(dt);
        this._drawHeatMeter();
    }

    // Safety net for the whole class of "partner state changed, victim
    // stranded" bugs: a wrestler stuck in a paired state whose counterpart
    // (attacker state or Arena hold-state) is gone gets freed after a short
    // grace period. Root causes are also guarded at the source (_doSell,
    // _releaseGrabbed) — this catches whatever slips through next.
    _orphanWatchdog(w, opp, dt) {
        const orphaned =
            (w.state === 'grabbed'    && opp.state !== 'slamming') ||
            (w.state === 'pinned'     && !this.pinState)           ||
            (w.state === 'pinning'    && !this.pinState)           ||
            (w.state === 'sleeping'   && !this.sleeperState)       ||
            (w.state === 'headlocked' && !this.headlockState)      ||
            (w.state === 'holding'    && !this.sleeperState && !this.headlockState && !w._fixedHold) ||
            (w.state === 'lockup'     && !this.lockupState);

        if (!orphaned) { w._orphanT = 0; return; }
        w._orphanT = (w._orphanT ?? 0) + dt;
        if (w._orphanT < 0.6) return;

        this._logEvent('orphanRescue', { wrestler: w === this.w1 ? 'p1' : 'p2', from: w.state });
        w._orphanT = 0;
        if (w.state === 'grabbed') {
            w.state      = 'down';
            w.stateTimer = 4.5;
            w.slamPhase  = null;
            w.slamType   = null;
        } else {
            w.state = 'standing';
            w.tweenPose('idle', 200, 'Linear');
        }
    }

    _tickPin(dt) {
        const ps = this.pinState;
        ps.timer += dt;

        // Rope break — defender's position is at the ropes
        if (this._isAtRopes(ps.defender)) {
            ps.attacker.state    = 'standing';
            ps.defender.state    = 'down';
            ps.defender.stateTimer = 1.5;
            this.pinText.setAlpha(0);
            this._showRopeBreak();
            this.pinState = null;
            return;
        }

        const count = Math.min(3, Math.floor(ps.timer / 0.85) + 1);
        this.pinText.setText(String(count)).setAlpha(1);

        const kickout = (atCount) => {
            ps.attacker.state = 'standing';
            ps.defender.state = 'standing';
            this.pinText.setAlpha(0);
            const who = ps.defender === this.w1 ? 'p1' : 'p2';
            this._logEvent('kickout', { wrestler: who, atCount, defenderStamina: Math.round(ps.defender.stamina) });
            if (atCount >= 2) {
                this._logEvent('nearfall', { attacker: who === 'p1' ? 'p2' : 'p1' });
                this.bumpHeat(22);
                // Comeback: surviving a deep count fires the crowd up AND puts
                // wind back in the survivor — matches arc instead of snowballing
                this._comeback(ps.defender, 15);
            }
            this.pinState = null;
        };

        // Defender mashes action to kick out
        if (ps.defender.tryKickout()) { kickout(count); return; }

        // One 2.9 save per wrestler per match: the first cover that would end
        // it becomes a manufactured nearfall instead — every match gets at
        // least one heartstopper before a pin can finish
        if (ps.timer >= 2.35 && !ps.defender.pinSaveUsed) {
            ps.defender.pinSaveUsed = true;
            this.bumpHeat(10); // on top of the nearfall bump below
            kickout(2.9);
            return;
        }

        // Three-count complete — pin succeeds
        if (ps.timer >= 2.55) {
            this.pinText.setAlpha(0);
            const winner = ps.attacker === this.w1 ? 1 : 2;
            this._logEvent('pinfall', { winner: `p${winner}` });
            ps.attacker.state = 'standing';
            ps.defender.state = 'standing';
            this.pinState = null;
            this._showWin(winner);
        }
    }

    _tickSleeper(dt) {
        const ss = this.sleeperState;
        ss.timer += dt;

        // Keep attacker hugged to the defender
        ss.attacker.x = ss.defender.x - ss.attacker.facing * 50 * ss.attacker.s;

        // Rope break
        if (this._isAtRopes(ss.defender)) {
            ss.attacker.tweenPose('idle', 200, 'Linear');
            ss.defender.tweenPose('idle', 200, 'Linear');
            ss.attacker.state = 'standing';
            ss.defender.state = 'standing';
            this.pinText.setAlpha(0);
            this._showRopeBreak();
            this.sleeperState = null;
            return;
        }

        // Drain defender stamina continuously (~18 total over 4s)
        ss.defender._drain(4.5 * dt);

        // Show deepening z's as the hold wears them down
        const zText = ss.timer < 1.4 ? 'z' : ss.timer < 2.8 ? 'zz' : 'zzz';
        this.pinText.setText(zText).setAlpha(1);

        const release = (toDown) => {
            ss.attacker.tweenPose('idle', 200, 'Linear');
            ss.defender.tweenPose('idle', 200, 'Linear');
            ss.attacker.state = 'standing';
            if (toDown) {
                ss.defender.state      = 'down';
                ss.defender.stateTimer = 6.5;
            } else {
                ss.defender.state = 'standing';
            }
            this.pinText.setAlpha(0);
            this.sleeperState = null;
        };

        if (ss.defender.tryEscape()) {
            this._logEvent('sleeperEscape', { wrestler: ss.defender === this.w1 ? 'p1' : 'p2' });
            this._comeback(ss.defender, 10);
            this.bumpHeat(8);
            release(false); return;
        }
        if (ss.timer >= 4.0) {
            const winner = ss.attacker === this.w1 ? 1 : 2;
            this._logEvent('sleeperKO', { winner: `p${winner}` });
            release(true);
            this._showWin(winner); // a full sleeper is a finish, not a nap
            return;
        }
    }

    _tickHeadlock(dt) {
        const hs = this.headlockState;
        hs.timer += dt;

        // Attacker stands to the side — both face the same direction
        hs.attacker.x = hs.defender.x - hs.attacker.facing * 68 * hs.attacker.s;

        // Rope break
        if (this._isAtRopes(hs.defender)) {
            hs.attacker.tweenPose('idle', 200, 'Linear');
            hs.attacker.state = 'standing';
            hs.defender.state = 'standing';
            hs.defender.tweenPose('idle', 200, 'Linear');
            this._showRopeBreak();
            this.headlockState = null;
            return;
        }

        // Continuous stamina drain — the headlock is the era's real wear
        // move; at 4/s a full ride costs 12, competitive with a slam
        hs.defender._drain(4.0 * dt);

        const release = (toDown) => {
            hs.attacker.tweenPose('idle', 200, 'Linear');
            hs.attacker.state = 'standing';
            if (toDown) {
                hs.defender.state      = 'down';
                hs.defender.stateTimer = 3.5;
                hs.defender.tweenPose('idle', 150, 'Linear');
            } else {
                hs.defender.state = 'standing';
                hs.defender.tweenPose('idle', 200, 'Linear');
            }
            this.headlockState = null;
        };

        if (hs.defender.tryHeadlockEscape()) {
            this._comeback(hs.defender, 5);
            this.bumpHeat(5);
            release(false); return;
        }
        if (hs.timer >= 3.0)                 { release(true);  return; }
    }

    _tickLockup(dt) {
        const ls = this.lockupState;
        ls.timer += dt;

        // Hold them at arm's length facing each other — gap of ~100 scaled units
        const s      = ls.attacker.s;
        const midX   = (ls.attacker.x + ls.defender.x) / 2;
        const halfGap = 50 * s; // half of 100*s total gap
        const dir    = ls.attacker.facing; // points from attacker toward defender
        ls.attacker.x += (midX - dir * halfGap - ls.attacker.x) * 0.18;
        ls.defender.x  += (midX + dir * halfGap - ls.defender.x)  * 0.18;
        // The drift aims at an unclamped midpoint — at a wall it walks bodies
        // through the rope plane (probes logged lockups at x≈890)
        ls.attacker._clamp();
        ls.defender._clamp();

        const who = ls.attacker === this.w1 ? 'p1' : 'p2';

        // Hammerlock: finisher key, attacker-only, checked independently of
        // the action/power follow-up branches below (finisher was otherwise
        // unused in here — standing finisher still resolves to
        // sleeper/Thesz press/taunt outside a lockup, tryFinisher requires
        // state === 'standing').
        if (ls.attacker.input.justDown('finisher') && ls.attacker.moveSet.includes('hammerlock')) {
            const attacker = ls.attacker, defender = ls.defender;
            this.lockupState = null;
            attacker._doHammerlock(defender);
            this._logEvent('move', { attacker: who, move: 'hammerlock', defenderStamina: Math.round(defender.stamina) });
            this._heatForMove('hammerlock');
            return;
        }

        // Defender contests by pressing grapple — steals the lockup
        if (ls.defender.input.justDown('action')) {
            [ls.attacker, ls.defender] = [ls.defender, ls.attacker];
            ls.timer = 0;
            ls.attacker.tweenPose('lockup', 150, 'Cubic.easeOut');
            return;
        }

        // Attacker executes follow-up: grapple again + optional direction
        if (ls.attacker.input.justDown('action')) {
            const goUp    = ls.attacker.input.isDown('up');
            const goDown  = ls.attacker.input.isDown('down');
            const goLeft  = ls.attacker.input.isDown('left');
            const goRight = ls.attacker.input.isDown('right');
            const dir     = goLeft ? -1 : goRight ? 1 : ls.attacker.facing;

            ls.attacker.state = 'standing';
            ls.defender.state = 'standing';
            this.lockupState  = null;

            // Log + heat together — these bypassed _heatForMove for months,
            // leaving the AI's primary offense (lockup slams) heat-invisible
            // and slam-heavy matches flatlined at heat ~17.
            const followUp = (move, type = 'move') => {
                this._logEvent(type, { attacker: who, move, defenderStamina: Math.round(ls.defender.stamina) });
                this._heatForMove(move);
            };

            if (goDown && ls.attacker.moveSet.includes('headlock')) {
                ls.attacker._doHeadlock(ls.defender);
                this.headlockState = { attacker: ls.attacker, defender: ls.defender, timer: 0 };
                followUp('headlock');
            } else if (goUp && ls.attacker.moveSet.includes('suplex')) {
                ls.attacker._doSuplex(ls.defender);
                followUp('suplex');
            } else if (goRight && ls.attacker.moveSet.includes('armBar')) {
                ls.attacker._doArmBar(ls.defender);
                followUp('armBar');
            } else if (goLeft && ls.attacker.moveSet.includes('ankleLock')) {
                ls.attacker._doAnkleLock(ls.defender);
                followUp('ankleLock');
            } else if ((goLeft || goRight) && ls.attacker.moveSet.includes('irishWhip')) {
                ls.attacker._doIrishWhip(ls.defender, dir);
                followUp('irishWhip');
            } else if (ls.attacker.moveSet.includes('piledriver')) {
                ls.attacker._doPiledriver(ls.defender);
                followUp('piledriver', 'knockdown');
            } else if (ls.attacker.moveSet.includes('bodySlam')) {
                ls.attacker._doBodySlam(ls.defender);
                followUp('bodySlam', 'knockdown');
            } else {
                ls.attacker._doIrishWhip(ls.defender, dir);
                followUp('irishWhip');
            }
            return;
        }

        // Arm drag: power button from lockup — quick pivot throw
        if (ls.attacker.input.justDown('power') && ls.attacker.moveSet.includes('armDrag')) {
            ls.attacker.state = 'standing';
            ls.defender.state = 'standing';
            this.lockupState  = null;
            ls.attacker._doArmDrag(ls.defender);
            this._logEvent('move', { attacker: who, move: 'armDrag', defenderStamina: Math.round(ls.defender.stamina) });
            this._heatForMove('armDrag');
            return;
        }

        // Timeout — break the clinch
        if (ls.timer >= 0.8) {
            ls.attacker.state = 'standing';
            ls.defender.state = 'standing';
            ls.attacker.tweenPose('idle', 220, 'Linear');
            ls.defender.tweenPose('idle', 220, 'Linear');
            this.lockupState = null;
        }
    }

    _showWin(player) {
        this._endMatch(`PLAYER ${player} WINS`);
    }

    _endMatch(message) {
        this.matchOver = true;
        // Kill any in-flight hold/pin state — a pin attempt sneaking in on the
        // final frame otherwise survives the banner and ticks into the next match
        this.pinState = this.sleeperState = this.headlockState = this.lockupState = null;
        this.pinText.setAlpha(0);
        this.crowd.bell(3);
        this._ringTimekeeperBell();
        const txt = this.add.text(W / 2, H / 2, message, {
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '42px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            letterSpacing: 8,
        }).setOrigin(0.5).setDepth(200).setAlpha(0);
        this.hudCam?.ignore(txt); // created after the HUD camera — main cam only

        this.tweens.add({ targets: txt, alpha: 1, duration: 400, ease: 'Linear' });

        // Reset after a few seconds
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: txt, alpha: 0, duration: 600, ease: 'Linear',
                onComplete: () => {
                    txt.destroy();
                    this.w1.x = 330; this.w1.y = 360; this.w1.state = 'standing'; this.w1.facing =  1; this.w1.stamina = 100;
                    this.w2.x = 630; this.w2.y = 360; this.w2.state = 'standing'; this.w2.facing = -1; this.w2.stamina = 100;
                    this.w1.pinSaveUsed = false;
                    this.w2.pinSaveUsed = false;
                    this._matchTime = 0;
                    // Fresh crowd for the next match — and _lastBumpT must not
                    // outlive the match clock it's compared against
                    this.heat      = 30;
                    this.heatFloor = 10;
                    this._heatChain = 0;
                    this._lastBumpT = -99;
                    this.matchOver  = false;
                    this.crowd.bell(1);
                    this._ringTimekeeperBell();
                },
            });
        });
    }

    update(time, delta) {
        this._tickGame(delta / 1000 * this.timeScale);

        // Derek: "I can't see it at all, remember, we're black and white"
        // — the black half of the grain (0x000000 @ 0.15) was doing almost
        // nothing against a scene that's mostly already-dark/black; only
        // the white half had any real chance of showing, and 700 pixels
        // across a 960x600 (576,000px) canvas at just 0.12 alpha was too
        // sparse/faint to register anyway. Pixel counts and alphas both
        // bumped so it actually reads.
        // "let's up the intensity" — pushed further still.
        const g = this.grainGfx;
        g.clear();
        g.fillStyle(0xffffff, 0.4);
        for (let i = 0; i < 2600; i++) {
            g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1);
        }
        g.fillStyle(0x000000, 0.42);
        for (let i = 0; i < 2600; i++) {
            g.fillRect(Math.random() * W | 0, Math.random() * H | 0, 1, 1);
        }

        const flicker = Math.sin(time * 0.0017) * 0.012 + Math.random() * 0.008;
        this.flickerOverlay.setAlpha(Math.max(0, flicker));

        // Camera flash (see _triggerCameraFlash): a small soft-edged glow
        // at the bulb's own position, not a screen-wide wash — Derek's
        // correction after the first pass (reusing flickerOverlay
        // full-screen) read as too intense. Sharp attack, quick
        // square-falloff decay over CAMERA_FLASH_MS so it pops rather than
        // fades gently. Was 2 raw fillCircle discs redrawn every frame
        // (visible hard edges — see createFlashTexture's comment); now a
        // single reused Image on the pre-baked feathered texture, just
        // repositioned/rescaled/faded each frame instead of redrawn.
        if (this._flashStart != null) {
            const CAMERA_FLASH_MS = 200;
            const t = (time - this._flashStart) / CAMERA_FLASH_MS;
            if (t < 1) {
                const a = (1 - t) ** 2;
                this.cameraFlashImg.setVisible(true).setPosition(this._flashX, this._flashY).setAlpha(a);
            } else {
                this._flashStart = null;
                this.cameraFlashImg.setVisible(false);
            }
        } else if (this.cameraFlashImg.visible) {
            this.cameraFlashImg.setVisible(false);
        }
    }
}
