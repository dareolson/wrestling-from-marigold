// v6 correction candidate for the isolated George AI pilot.
//
// Derek's "looks great" v5 approval (2026-07-26) was RESCINDED the same day
// after a fuller review of the complete character found three concrete
// problems v5's spot-check poses had missed:
//
//   1. Both thighs read much too small against the new (v4/v5) torso.
//   2. The near/far forearm assets are assigned to the wrong physical side
//      and wrongly mirrored -- thumbs do not read as facing up.
//   3. The near/front shin-and-boot art bakes in an angled-foot perspective
//      that does not read correctly during walking; the back/far shin-and-
//      boot art (a clean side-profile boot) should be used for BOTH legs.
//
// v6 fixes ONLY those three things. Everything else -- the pass-3 mirrored
// torso, the near/far torso socket assignments, the pelvis overlay/draw-
// order solution, the head, the trimmed shared upper arm and its length,
// the dynamic-pelvis/authored-anchor/painted-sole runtime mechanisms -- is
// carried forward from george-ai-pilot-v5 unchanged. Does not replace
// george-ai-pilot, -v2, -v4, or -v5 -- all four remain intact, reversible
// comparison points -- nor shipped george.js/george/.
//
// Cutter: Sprite sheets/AI Pilot/George/tools/prepare_v6_corrections.py.
// Does not re-derive anything from raw source sheets -- copies torso/
// pelvis_overlay/upper_arm/thigh byte-identical from v5/v3, and only
// produces new pixels for the forearm swap+mirror and the shin duplication
// (see that script's own docstring for the full method).
import { georgeAiPilotV5 } from './george_ai_pilot_v5.js';

// ── Thigh correction ────────────────────────────────────────────────────
// v5 inherited v3's thigh at EFFECTIVE_SCALE_THIGH = 0.06887886597938145,
// chosen SOLELY to reproduce the old master's thighH=53.45 unchanged --
// Derek's fuller review found the resulting thighs read far too small
// against the new (independently-scaled) v4/v5 torso. Uniform-scale trials
// were swept relative to v5 (approximately 1.15x/1.25x/1.35x) through the
// real renderer, comparing thickness/hip coverage/knee placement against
// the v5 TORSO, not the old thighH number -- see the dated handoff entry
// for the actual comparison and why 1.25x was picked. Same bitmap as v5
// (Sprite sheets/.../v3-new-thigh/parts/thigh.png), no recut -- a uniform
// scale bump was sufficient to fix both width and a still-believable
// hip-to-knee span, so the "recut closer to the knee" fallback in the brief
// was not needed.
const EFFECTIVE_SCALE_THIGH_V5 = 0.06887886597938145;
const THIGH_SCALE_TRIAL_MULTIPLIER = 1.25;
const EFFECTIVE_SCALE_THIGH = EFFECTIVE_SCALE_THIGH_V5 * THIGH_SCALE_TRIAL_MULTIPLIER;
const THIGH_PIVOT = 0.023228803716608595; // unchanged -- same bitmap/crop as v5
const THIGH_CANVAS = [401, 861];
const THIGH_BONE_PX = 776; // hip-to-knee span on this bitmap, from v3-new-thigh/diagnostics/cut-report.json
// thighH is a SEPARATE bone-length constant Skeleton.js's IK solver uses
// (this._thighH, read independently of texture.box) -- NOT automatically
// derived from box.h. v4/v5 never overrode it because their EFFECTIVE_SCALE_
// THIGH was solved specifically to reproduce the inherited default (776 *
// 0.06887886597938145 = 53.45 world units) -- see george_ai_pilot_v4.js's
// own comment on this. Scaling the box without also scaling thighH would
// silently leave the IK hip-to-knee bone at the OLD short length while the
// SPRITE renders bigger -- exactly the mismatch the brief warns about
// ("scaling the thigh changes the authored hip-to-knee vector... recompute
// the resulting bone span rather than hiding it with offsets"). Caught by
// torso_socket_sweep.mjs failing farHip at 3.16px before this was added.
const THIGH_H = THIGH_BONE_PX * EFFECTIVE_SCALE_THIGH; // 776 * 0.0860985... = 66.81 world units

const limbBox = (scale, canvasW, canvasH, pivot) => ({
    w: canvasW * scale * (1 - pivot),
    h: canvasH * scale * (1 - pivot),
});

// ── Forearm correction ──────────────────────────────────────────────────
// v5's near_forearm.png/far_forearm.png bitmaps are SWAPPED and each
// horizontally mirrored at the cutter (prepare_v6_corrections.py), not
// patched with a runtime flipX exception. Because the swap only relabels
// which bitmap is "near" vs "far" and mirroring never touches a canvas's
// height or its vertical pivot fraction, v6's nearForearm reuses v5's
// FAR_FOREARM box/pivot numbers verbatim (that geometry now backs the new
// near_forearm.png bitmap) and v6's farForearm reuses v5's NEAR_FOREARM
// numbers verbatim, the same shorthand v5 itself used relative to v4.
const NEW_NEAR_FOREARM_CANVAS = [322, 624]; // = old v5 far_forearm canvas
const NEW_FAR_FOREARM_CANVAS = [370, 661]; // = old v5 near_forearm canvas
const NEW_NEAR_FOREARM_PIVOT = 0.0641025641025641; // = old v5 FAR_FOREARM_PIVOT
const NEW_FAR_FOREARM_PIVOT = 0.060514372163388806; // = old v5 NEAR_FOREARM_PIVOT
const EFFECTIVE_SCALE_FOREARM = 0.12021111879672974; // unchanged from v5 -- same bitmaps, just swapped+mirrored

// ── Shin/foot correction ────────────────────────────────────────────────
// Both legs now render the SAME bitmap (the v2/v4/v5 far_shin.png -- the
// clean side-profile boot; the angled near/front boot is dropped entirely).
// Since both sides share one source geometry, both get the SAME
// jointPivotFrac/soleAnchorFrac -- v5's own farShin numbers, not the old
// distinct nearShin ones. farShinScale starts at 1.0 (equal near/far reach,
// per the brief -- "begin with equal near/far shin scales when both use the
// same bitmap"), then re-measured against sole_grounding_sweep.mjs -- see
// the dated handoff entry for whether that held or needed a justified,
// non-blind adjustment.
const SHIN_PIVOT = 0.23422963443403397; // = v2/v4/v5's FAR_SHIN_PIVOT
const SHIN_CANVAS = [364, 452]; // = v2/v4/v5's far_shin.png canvas
const SHIN_SOLE_ANCHOR = { u: 0.6214887064664337, v: 0.8976677194167121 }; // = v2/v4/v5's far_shin soleAnchorFrac
const EFFECTIVE_SCALE_LEG = 0.24861350162554982; // v1/v2's shared EFFECTIVE_SCALE (shin was never re-scaled per-sheet)

export const georgeAiPilotV6 = {
    ...georgeAiPilotV5,
    id: 'george-ai-pilot-v6',
    textures: {
        ...georgeAiPilotV5.textures,
        head: 'george_ai_v6_head',
        torso: { ...georgeAiPilotV5.textures.torso, key: 'george_ai_v6_torso' },
        pelvisOverlay: { ...georgeAiPilotV5.textures.pelvisOverlay, key: 'george_ai_v6_pelvis_overlay' },
        upperArm: { ...georgeAiPilotV5.textures.upperArm, key: 'george_ai_v6_upper_arm' },
        thighH: THIGH_H,
        thigh: {
            key: 'george_ai_v6_thigh',
            box: limbBox(EFFECTIVE_SCALE_THIGH, THIGH_CANVAS[0], THIGH_CANVAS[1], THIGH_PIVOT),
            jointPivotFrac: THIGH_PIVOT,
            distalAnchorFrac: { u: 0.5, v: 0.924506387921022 },
        },
        nearForearm: {
            key: 'george_ai_v6_near_forearm',
            box: limbBox(EFFECTIVE_SCALE_FOREARM, NEW_NEAR_FOREARM_CANVAS[0], NEW_NEAR_FOREARM_CANVAS[1], NEW_NEAR_FOREARM_PIVOT),
            jointPivotFrac: NEW_NEAR_FOREARM_PIVOT,
        },
        farForearm: {
            key: 'george_ai_v6_far_forearm',
            box: limbBox(EFFECTIVE_SCALE_FOREARM, NEW_FAR_FOREARM_CANVAS[0], NEW_FAR_FOREARM_CANVAS[1], NEW_FAR_FOREARM_PIVOT),
            jointPivotFrac: NEW_FAR_FOREARM_PIVOT,
        },
        nearShin: {
            key: 'george_ai_v6_near_shin',
            box: limbBox(EFFECTIVE_SCALE_LEG, SHIN_CANVAS[0], SHIN_CANVAS[1], SHIN_PIVOT),
            jointPivotFrac: SHIN_PIVOT,
            soleAnchorFrac: SHIN_SOLE_ANCHOR,
        },
        farShin: {
            key: 'george_ai_v6_far_shin',
            box: limbBox(EFFECTIVE_SCALE_LEG, SHIN_CANVAS[0], SHIN_CANVAS[1], SHIN_PIVOT),
            jointPivotFrac: SHIN_PIVOT,
            soleAnchorFrac: SHIN_SOLE_ANCHOR,
        },
        farShinScale: 1.0,
    },
};
