// v7 thigh-recut candidate for the isolated George AI pilot.
//
// Derek reviewed george-ai-pilot-v6 live and found NO meaningful visual
// improvement over v5. v6 is not literally a no-op -- it does apply a
// uniform 1.25x scale bump to the same v3 thigh bitmap -- but the
// correction is visually inadequate: the same long, narrow silhouette only
// grows from ~27.6 to ~34.5 world pixels wide, about 4-6 SCREEN pixels at
// normal ring depth. The underlying long, narrow silhouette itself never
// changed, so the thighs still read too small and thin against the v5/v6
// torso.
//
// v7 fixes ONLY the thigh, with a genuine recut rather than another uniform
// multiplier on the unchanged v3 bitmap. v3's cutter (cut_v3_thigh.py)
// placed its knee cut at source Y=985 -- well below the leg's real
// anatomical knee -- retaining most of the drawn calf inside what
// Skeleton.js treats as the thigh bone. That excess length is what forced
// v5/v6 to under-scale the whole silhouette to keep a believable bone
// length; recutting at the REAL knee transition (source Y=880, measured
// directly from the source art's width profile and hand-drawn knee crease --
// full method in prepare_v7_thigh_recut.py's docstring and
// candidates/v7-thigh-recut/diagnostics/cut-report.json) removes that excess
// so a single uniform scale can hit both a visibly broader width AND a
// still-believable 65-68 world-px hip-to-knee span at once -- the "shorter
// source bone span that can be rendered at a larger uniform scale" the brief
// asked for.
//
// Forearms, shins, torso, pelvis overlay, head, and the shared upper arm are
// all carried forward from george-ai-pilot-v6 UNCHANGED -- not revisited,
// per the brief ("primarily a thigh recut and visual-proof pass, not
// another broad rig rewrite"). Does not replace george-ai-pilot, -v2, -v4,
// -v5, or -v6 -- all five remain intact, reversible comparison points --
// nor shipped george.js/george/.
//
// Cutter: Sprite sheets/AI Pilot/George/tools/prepare_v7_thigh_recut.py.
// Reuses cut_v3_thigh.py's exact chroma-key/straight-cut/trim-to-content
// method against the SAME untouched source
// (candidates/v3-new-thigh/source/george-generated-thigh-source-v1.png) --
// only the cut row changes. No black transverse line, no kneecap circle/
// oval/peg/bulb, no synthesized anatomy anywhere; the top hip stroke and
// both side contours above the cut are byte-identical source pixels.
import { georgeAiPilotV6 } from './george_ai_pilot_v6.js';

// ── Thigh recut ─────────────────────────────────────────────────────────
// Measured directly from the source art (not reused from v3/v6):
//   - Real knee transition: source Y=880 (v3 used Y=985). Sits centered in
//     both the flat width-minimum plateau (Y=868-926) AND the hand-drawn
//     knee "bend crease" ink stroke (Y=836-900) -- see the cutter's
//     docstring for the full row-width-profile and connected-component
//     measurement.
//   - 40-source-px underlap retained below the knee (within the brief's
//     35-50px range; matches the underlap convention v3's own cutter used
//     at 45px and prepare_v5_arm_trim.py's arm crops used at 40px).
//   - New hip-to-knee bone span: 880 - 209 (top hip Y) = 671 source px, vs.
//     v3/v6's 776 -- a genuinely shorter bone, not just a smaller crop.
const THIGH_BONE_PX = 671; // = kneeTransitionY(880) - topHipY(209), from v7-thigh-recut/diagnostics/cut-report.json
const THIGH_CANVAS = [401, 751]; // = outputCanvas, cut-report.json
const THIGH_PIVOT = 0.02663115845539281; // = padding(20) / canvasH(751) -- same construction as v6's THIGH_PIVOT

// Scale solved to hit TARGET_THIGH_H = 67 world px, the midpoint of the
// brief's 65-68px target range (not an arbitrary multiplier on the old
// bitmap -- this is a fresh derivation against the NEW, shorter bone span).
// At this scale the resulting thigh box width is ~38.97 world px --
// against v6's 33.72 and v5's ~27.6 -- close to the brief's ~40px starting
// target and, unlike v6's 1.25x bump, large enough to be visible without
// zooming at normal ring depth (a 15.6% width increase over v6 on top of
// v6's own 25% increase over v5, both at a shorter, more proportionate bone
// length instead of a stretched one).
const TARGET_THIGH_H = 67;
const EFFECTIVE_SCALE_THIGH = TARGET_THIGH_H / THIGH_BONE_PX; // 0.09985096870342772
const THIGH_H = THIGH_BONE_PX * EFFECTIVE_SCALE_THIGH; // 67.0 world units -- Skeleton.js's separate IK bone-length constant (this._thighH), not auto-derived from box.h; see v6's own comment on why this must be set explicitly.

// Knee anchor: local row (880 - crop_y0(189)) / canvasH(751) = 691/751.
// Same construction v6 used for its own distalAnchorFrac.v (796/861).
const THIGH_DISTAL_ANCHOR_V = 0.9201065246338216;

const limbBox = (scale, canvasW, canvasH, pivot) => ({
    w: canvasW * scale * (1 - pivot),
    h: canvasH * scale * (1 - pivot),
});

export const georgeAiPilotV7 = {
    ...georgeAiPilotV6,
    id: 'george-ai-pilot-v7',
    textures: {
        ...georgeAiPilotV6.textures,
        // Re-keyed (byte-identical content, unchanged from v6) into this
        // character's own asset folder -- same convention every prior pilot
        // candidate has used, avoiding any cross-character texture-key/
        // preload-path ambiguity in Arena.js's per-char.id loader.
        head: 'george_ai_v7_head',
        torso: { ...georgeAiPilotV6.textures.torso, key: 'george_ai_v7_torso' },
        pelvisOverlay: { ...georgeAiPilotV6.textures.pelvisOverlay, key: 'george_ai_v7_pelvis_overlay' },
        upperArm: { ...georgeAiPilotV6.textures.upperArm, key: 'george_ai_v7_upper_arm' },
        nearForearm: { ...georgeAiPilotV6.textures.nearForearm, key: 'george_ai_v7_near_forearm' },
        farForearm: { ...georgeAiPilotV6.textures.farForearm, key: 'george_ai_v7_far_forearm' },
        nearShin: { ...georgeAiPilotV6.textures.nearShin, key: 'george_ai_v7_near_shin' },
        farShin: { ...georgeAiPilotV6.textures.farShin, key: 'george_ai_v7_far_shin' },
        // Only real change: the recut thigh bitmap, its canvas/pivot/anchor/
        // scale, and the derived thighH IK bone length.
        thighH: THIGH_H,
        thigh: {
            key: 'george_ai_v7_thigh',
            box: limbBox(EFFECTIVE_SCALE_THIGH, THIGH_CANVAS[0], THIGH_CANVAS[1], THIGH_PIVOT),
            jointPivotFrac: THIGH_PIVOT,
            distalAnchorFrac: { u: 0.5, v: THIGH_DISTAL_ANCHOR_V },
        },
    },
};
