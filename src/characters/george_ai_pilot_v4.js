// v4 modular-source candidate for the isolated George AI pilot: a surgical
// torso/trunks + shared-upper-arm + distinct near/far-forearm repair over
// george-ai-pilot-v2, using Derek-approved replacement source art. Does not
// replace george-ai-pilot or george-ai-pilot-v2 — both remain intact,
// reversible comparison points — nor shipped george.js/george/.
//
// New source sheets (gitignored, not committed):
//   Sprite sheets/AI Pilot/George/candidates/v4-modular-source/source/
//     george-torso-upper-arm-source-v1.png   (torso + one shared upper arm)
//     george-near-far-forearms-source-v1.png (two distinct forearms/hands)
//   Sprite sheets/AI Pilot/George/candidates/v3-new-thigh/source/
//     george-generated-thigh-source-v1.png   (replacement thigh, previously
//     cut/mirrored to face right — reused verbatim, not recut; see that
//     candidate's diagnostics/cut-report.json)
// Cut by the new, versioned tools/prepare_v4_modular_assets.py (see that
// script's module docstring for the full chroma-key/alignment/pelvis-overlay
// method and Sprite sheets/AI Pilot/George/candidates/v4-modular-source/
// diagnostics/rig-profile.json for every measured anchor and canvas this
// file's numbers come from).
//
// Reused unchanged from george-ai-pilot-v2 (Derek: "retain the existing
// approved George head" / "retain the existing near/far shin-and-boot art
// unless testing proves a specific incompatibility" — no such incompatibility
// found): head + its five expression variants, near_shin/far_shin + their
// soleAnchorFrac/jointPivotFrac, the dynamic-pelvis hip-socket mechanism,
// the painted-sole IK/FK grounding path, and the pelvis-overlay depth/draw-
// order contract. thighH/shinH are ALSO inherited unchanged (53.45/40.19) —
// see EFFECTIVE_SCALE_THIGH's derivation comment below for why that isn't a
// coincidence.
import { georgeAiPilotV2 } from './george_ai_pilot_v2.js';

// ONE EFFECTIVE SCALE PER SOURCE SHEET (not one global constant): v4 draws
// from three independently-generated sheets with no guaranteed shared
// pixel-per-real-world-inch density (unlike v1/v2, entirely cut from one
// master). Each scale below is DERIVED — not guessed — by matching a
// measured span in the new art against the SAME span already established
// and Derek-reviewed in george_ai_pilot.js/george_ai_pilot_v2.js, since this
// is a surgical repair (Derek: "does not want a redesign"), so preserving
// those already-approved body proportions is the correct target. Full
// numbers and method: tools/prepare_v4_modular_assets.py's derive step +
// candidates/v4-modular-source/diagnostics/rig-profile.json's
// "scaleDerivation" block.
//
//   EFFECTIVE_SCALE_TORSO_ARM: the new torso's own measured neck-to-hipMid
//   span (canvas 619x910, span 0.83352 of canvas height) is solved so it
//   equals george_ai_pilot.js's already-calibrated torso span
//   (105.536 world units — itself derived from the ORIGINAL approved
//   master's own head-top-to-sole measurement). Applies to the torso,
//   pelvis overlay, and shared upper arm (all three from the same sheet).
//
//   EFFECTIVE_SCALE_FOREARM: the forearms sheet is a different generation
//   from the torso+arm sheet, so it needs its own resampling ratio. Derived
//   from real joint continuity — the shared upper arm's elbow-end width
//   (137 source-px, torso+arm sheet) matched against both forearms'
//   elbow-end width (157px near / 155px far, forearms sheet; averaged to
//   156), each measured 30 source-px in from its rounded tip
//   (width_at_offset_from_tip). ratio = 137/156 = 0.87821;
//   EFFECTIVE_SCALE_FOREARM = EFFECTIVE_SCALE_TORSO_ARM * ratio.
//
//   EFFECTIVE_SCALE_THIGH: solved so the reused v3 thigh's own measured
//   hip-to-knee bone span (776 source-px, from that candidate's own
//   cut-report.json) equals the EXISTING thighH (53.45) unchanged — this is
//   why thighH below is NOT overridden: the scale was chosen specifically
//   to reproduce the already-approved leg-length proportion on the new art,
//   not the other way around.
const EFFECTIVE_SCALE_TORSO_ARM = 0.1391383407251759;
const EFFECTIVE_SCALE_FOREARM = 0.1221920043548019;
const EFFECTIVE_SCALE_THIGH = 0.06887886597938145;

// _placePart grows both stored box axes by 1/(1-jointPivotFrac) — store
// both axes pre-divided by (1-pivot) so the final displayed canvas uses one
// uniform scale in X and Y (same convention george_ai_pilot_v2.js's limbBox
// established, carried forward here per sheet).
const limbBox = (scale, canvasW, canvasH, pivot) => ({
    w: canvasW * scale * (1 - pivot),
    h: canvasH * scale * (1 - pivot),
});

// jointPivotFrac = parts.<name>.proximal[1] (contract point 3, same as
// v1/v2) — straight from candidates/v4-modular-source/diagnostics/
// rig-profile.json.
const UPPER_ARM_PIVOT = 0.04888735326469214;
const NEAR_FOREARM_PIVOT = 0.04318140570907742;
const FAR_FOREARM_PIVOT = 0.040946029248215235;
const THIGH_PIVOT = 0.023228803716608595;

export const georgeAiPilotV4 = {
    ...georgeAiPilotV2,
    id: 'george-ai-pilot-v4',
    textures: {
        ...georgeAiPilotV2.textures,
        head: 'george_ai_v4_head',
        torso: {
            key: 'george_ai_v4_torso',
            box: { w: 619 * EFFECTIVE_SCALE_TORSO_ARM, h: 910 * EFFECTIVE_SCALE_TORSO_ARM },
        },
        // Same 619x910 canvas/crop/origin/facing/scale as torso — drawn from
        // the same source crop by tools/prepare_v4_modular_assets.py's
        // pelvis_overlay(), containing only real magenta trunks pixels plus
        // their real antialiased/ink edge. Draws above both thigh roots
        // (Skeleton.js's fixed depth order), so the shared thighs rotate
        // underneath a stable costume edge instead of exposing a hip
        // wedge/cap — same mechanism george-ai-pilot-v2 already uses,
        // reused unchanged, not reimplemented.
        pelvisOverlay: {
            key: 'george_ai_v4_pelvis_overlay',
            box: { w: 619 * EFFECTIVE_SCALE_TORSO_ARM, h: 910 * EFFECTIVE_SCALE_TORSO_ARM },
        },
        // rigProfile.sockets: freshly measured on the NEW torso art (this is
        // a different canvas from v1/v2's torso, so their sockets cannot be
        // reused — see candidates/v4-modular-source/diagnostics/
        // torso-socket-overlay.png for the visual placement check).
        // CORRECTED 2026-07-25 (Derek, three passes on the same "his torso
        // is backwards" bug — see tools/prepare_v4_modular_assets.py's
        // TORSO_NEAR_SHOULDER comment for the full account of all three):
        // pass 1 swapped the near/far shoulder+hip LABELS (unverified claim
        // about george.js's convention turned out backwards); pass 2 found
        // that alone wasn't enough — the torso's own drawn silhouette
        // needed an actual horizontal mirror (`torso.png`/
        // `pelvis_overlay.png` now flipped at the cutter, same category of
        // fix as the original v1/v2 orientation fix), but combining the
        // mirror with pass 1's label swap canceled it back out ("arm is
        // pinned to the wrong shoulder"); pass 3 (this state) reverts the
        // label swap so the ORIGINAL bigger-deltoid-is-"near" assignment
        // combines with the mirror — verified algebraically to reproduce
        // george.js's own near-shoulder-on-image-left/far-on-image-right
        // pattern at facing=+1 (nearShoulder.u=0.194 < 0.5, farShoulder.u
        // =0.859 > 0.5, same as george.js's 0.346/0.654).
        // nearHip/farHip presence keeps this on the same dynamic-pelvis +
        // authored-leg-rig opt-in path as v1/v2 (Skeleton.js's
        // _solveTorsoOrigin/_authoredLegRig) — reused, not reimplemented.
        rigProfile: {
            sockets: {
                neck:         { u: 0.5169628432956381, v: 0.03296703296703297 },
                nearShoulder: { u: 0.1938610662358643, v: 0.17362637362637362 },
                farShoulder:  { u: 0.8594507269789984, v: 0.16923076923076924 },
                nearHip:      { u: 0.5298869143780292, v: 0.8747252747252747 },
                farHip:       { u: 0.7027463651050081, v: 0.8582417582417582 },
            },
        },
        // Shared upper arm (Derek: "use one shared upper arm for both
        // sides") — same texture entry object doubles as both farUpArm's
        // and nearUpArm's source (Skeleton.js's constructor), so both
        // forearms attach through the SAME measured distalAnchorFrac: one
        // elbow attachment contract, per the brief.
        upperArm: {
            key: 'george_ai_v4_upper_arm',
            box: limbBox(EFFECTIVE_SCALE_TORSO_ARM, 350, 753, UPPER_ARM_PIVOT),
            jointPivotFrac: UPPER_ARM_PIVOT,
            distalAnchorFrac: { u: 0.5, v: 0.9502570124081569 },
        },
        // Two distinct forearms (Derek: near = outward-facing hand, far =
        // inward-facing hand) sharing the SAME EFFECTIVE_SCALE_FOREARM (one
        // source scale) and the SAME upper-arm elbow contract above. Their
        // jointPivotFrac values (0.0432/0.0409) are close by construction —
        // both come from the same rounded-elbow-cap tip convention on the
        // same sheet — satisfying the brief's "compatible hidden overlap"
        // requirement without forcing them numerically identical. Terminal
        // parts (no child limb) — no distalAnchorFrac needed, same as every
        // prior forearm entry.
        nearForearm: {
            key: 'george_ai_v4_near_forearm',
            box: limbBox(EFFECTIVE_SCALE_FOREARM, 370, 876, NEAR_FOREARM_PIVOT),
            jointPivotFrac: NEAR_FOREARM_PIVOT,
        },
        farForearm: {
            key: 'george_ai_v4_far_forearm',
            box: limbBox(EFFECTIVE_SCALE_FOREARM, 322, 891, FAR_FOREARM_PIVOT),
            jointPivotFrac: FAR_FOREARM_PIVOT,
        },
        // Legacy `forearm` key intentionally cleared (inherited from v2,
        // which itself inherited it from v1) — every consumer of this
        // config (Skeleton.js's constructor, Arena.js's PART_FILES preload)
        // reads nearForearm/farForearm directly, and leaving the inherited
        // key set would make Arena.js's preload loop try to load a
        // nonexistent `george-ai-pilot-v4/forearm.png`. Same reasoning for
        // the inherited, already-unused `shin` key below (v1's single-shin
        // key that v2/v4 never render — both use nearShin/farShin — but
        // that Arena.js would otherwise still try to load from this
        // character's own asset folder).
        forearm: undefined,
        shin: undefined,
        // Replacement thigh (candidates/v3-new-thigh, reused verbatim —
        // see this file's header). thighH is NOT overridden: 53.45
        // (inherited from george_ai_pilot.js via george_ai_pilot_v2.js) is
        // exactly the target EFFECTIVE_SCALE_THIGH above was solved to
        // reproduce, preserving the already-approved leg-length proportion
        // rather than redesigning it.
        thigh: {
            key: 'george_ai_v4_thigh',
            box: limbBox(EFFECTIVE_SCALE_THIGH, 401, 861, THIGH_PIVOT),
            jointPivotFrac: THIGH_PIVOT,
            distalAnchorFrac: { u: 0.5, v: 0.924506387921022 },
        },
        // farShinScale is NOT inherited from george-ai-pilot-v2's tuned 1.20
        // — that value equalizes near/far sole reach against v2's OWN hip
        // socket geometry, which this torso's freshly-measured
        // nearHip/farHip sockets do not share. Re-measured empirically for
        // v4 the same way v1/v2 were (sweeping sk._farShinScale directly
        // against sole_grounding_sweep.mjs's reported worst-case gap, both
        // facings).
        // Re-swept across all three "torso is backwards" correction passes
        // above (each changed which physical hip nearHip/farHip point at, or
        // added the torso mirror, both of which affect the dynamic-pelvis
        // solve this depends on). Final state (pass 3) reverted nearHip/
        // farHip to their ORIGINAL pass-0 assignment — same physical
        // v-geometry as the very first v4 tuning pass, just now paired with
        // a mirrored torso — so unsurprisingly the minimax point landed back
        // on the same 1.185 (worst gap 0.97px vs. 1.21px at 1.18, 1.33px at
        // 1.20) — comfortably inside the <=2px gate with margin both sides.
        farShinScale: 1.185,
    },
};
