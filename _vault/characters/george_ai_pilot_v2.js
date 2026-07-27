// Versioned hinge-art candidate for the isolated George AI pilot.
//
// This preset exists beside (and does not replace) george-ai-pilot so the v1
// live failures can be compared against the candidate through the real Phaser
// renderer. Every bitmap is deterministically cut from the approved gameplay
// master by Sprite sheets/AI Pilot/George/tools/prepare_rig_assets.py.
import { georgeAiPilot } from './george_ai_pilot.js';

const EFFECTIVE_SCALE = 0.24861350162554982;

// _placePart grows both stored box axes by 1/(1-jointPivotFrac). Store both
// axes with the matching (1-pivot) factor so the final displayed canvas uses
// one uniform EFFECTIVE_SCALE in X and Y. The v1 pilot applied that factor to
// height only, unintentionally widening every internally-pivoted limb.
const limbBox = (canvasW, canvasH, pivot) => ({
    w: canvasW * EFFECTIVE_SCALE * (1 - pivot),
    h: canvasH * EFFECTIVE_SCALE * (1 - pivot),
});

const UPPER_ARM_PIVOT = 0.24501514334406976;
const FOREARM_PIVOT = 0.24487724450823645;
const THIGH_PIVOT = 0.2486240351184444;
const NEAR_SHIN_PIVOT = 0.2258611399163658;
const FAR_SHIN_PIVOT = 0.23422963443403397;

export const georgeAiPilotV2 = {
    ...georgeAiPilot,
    id: 'george-ai-pilot-v2',
    textures: {
        ...georgeAiPilot.textures,
        head: 'george_ai_v2_head',
        torso: {
            key: 'george_ai_v2_torso',
            box: { w: 294 * EFFECTIVE_SCALE, h: 530 * EFFECTIVE_SCALE },
        },
        // Same 294x530 canvas, crop, origin, facing, scale, and rotation as
        // torso. It contains only real trunks pixels + their real ink edge and
        // draws above both thigh roots; no generated hip cap pixels exist.
        pelvisOverlay: {
            key: 'george_ai_v2_pelvis_overlay',
            box: { w: 294 * EFFECTIVE_SCALE, h: 530 * EFFECTIVE_SCALE },
        },
        upperArm: {
            key: 'george_ai_v2_upper_arm',
            box: limbBox(178, 392, UPPER_ARM_PIVOT),
            jointPivotFrac: UPPER_ARM_PIVOT,
            distalAnchorFrac: { u: 0.5, v: 0.7876694133997495 },
        },
        forearm: {
            key: 'george_ai_v2_forearm',
            box: limbBox(190, 379, FOREARM_PIVOT),
            jointPivotFrac: FOREARM_PIVOT,
        },
        thigh: {
            key: 'george_ai_v2_thigh',
            box: limbBox(294, 418, THIGH_PIVOT),
            jointPivotFrac: THIGH_PIVOT,
            distalAnchorFrac: { u: 0.5, v: 0.7629836656658558 },
        },
        // soleAnchorFrac.u mirrored (1 - u) 2026-07-25: the v2-hinge cutter's
        // source master was drawn facing left, so every baked part was a
        // mirror image of Skeleton.js's required "PNGs baked facing right"
        // contract -- see AI_HANDOFF.md's 2026-07-25 "orientation fix" entry.
        nearShin: {
            key: 'george_ai_v2_near_shin',
            box: limbBox(292, 509, NEAR_SHIN_PIVOT),
            jointPivotFrac: NEAR_SHIN_PIVOT,
            soleAnchorFrac: { u: 0.615825671845873, v: 0.9090156749238549 },
        },
        farShin: {
            key: 'george_ai_v2_far_shin',
            box: limbBox(364, 452, FAR_SHIN_PIVOT),
            jointPivotFrac: FAR_SHIN_PIVOT,
            soleAnchorFrac: { u: 0.6214887064664337, v: 0.8976677194167121 },
        },
        // Re-tuned 2026-07-25 after the orientation fix (see AI_HANDOFF.md's
        // 2026-07-25 "orientation fix" entry -- soleAnchorFrac.u above is now
        // mirrored to match the corrected facing-right art). The prior value
        // (1.1525793979640757) was a pure knee-to-sole MAGNITUDE ratio
        // (86.86 vs 75.36 unscaled); that ratio is unchanged by the mirror
        // (squared terms), but the sole's off-axis x now points the opposite
        // (correct) direction relative to the knee, which the idle FK's
        // pelvis-averaging solve is sensitive to beyond raw magnitude --
        // re-measured empirically (tools/debug's ad hoc farShinScale search,
        // sweeping sk._farShinScale directly against both facings' idle
        // sole gaps) rather than recomputed from the ratio alone. 1.20 is
        // the minimax point: worst idle gap 0.98px (facing 1) vs 0.94px
        // (facing -1), both well inside the sole_grounding_sweep.mjs <=2px
        // gate (was 2.15px/0.20px, failing facing 1, at the old ratio-only
        // value).
        farShinScale: 1.20,
    },
};
