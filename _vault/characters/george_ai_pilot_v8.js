// v8 torso/upper-arm orientation fix for the isolated George AI pilot.
//
// Derek: "george's torso and upper arm are facing the wrong direction,
// george's arm socket placement is correct so leave that as is." Preliminary
// pass ahead of a fuller prompt Derek is sending separately.
//
// The torso art (unchanged since george_ai_pilot_v4.js) draws one shoulder
// as a large, rounded, foreshortened bulge and the other as a smaller,
// flatter shoulder with the visible nipple/chest line -- a single 3/4-turn
// body, not a flat front-on torso. v4's own rigProfile.sockets puts the big
// bulge at farShoulder.u=0.859 and the smaller shoulder at
// nearShoulder.u=0.194 (george_ai_pilot_v4.js lines 132-138) -- i.e. the
// bulge that reads as closer to the viewer is wired to the FAR (background)
// arm, and the flatter, receding-looking shoulder is wired to the NEAR
// (foreground) arm. That is backwards from how the perspective in the art
// actually reads, which is what made the rendered torso look like it was
// turned/facing the wrong way.
//
// Fix: mirror the torso.png and upper_arm.png bitmaps themselves
// (horizontal flip, sips -f horizontal) -- not a runtime flipX (Skeleton.js
// has no per-part flip flag, only a whole-character facing flip; see
// Skeleton.js "all PNGs are baked facing right" contract) and not a
// synthesized redraw. Mirroring swaps which canvas side (left vs right)
// carries the big bulge vs the small shoulder, so the EXISTING
// nearShoulder.u=0.194 / farShoulder.u=0.859 socket fractions -- which
// Derek confirmed are correctly placed and should not be touched -- now
// pick up the correct content at each side: the big bulge lands under
// nearShoulder (u=0.194, canvas-left) and the smaller shoulder lands under
// farShoulder (u=0.859, canvas-right).
//
// upperArm's distalAnchorFrac.u is 0.5 (dead-center) so a horizontal mirror
// of upper_arm.png leaves that anchor point exactly where it was --
// nothing to recompute there either.
//
// pelvis_overlay.png ALSO had to be mirrored, even though the brief only
// named torso/upper arm: it's a separate texture Skeleton.js draws on top
// of the torso's own baked-in trunks to solve a draw-order seam (see v5/v6
// history), and its art is asymmetric (a highlight/shadow drawn to match
// the torso's original, unmirrored hip torque). Left unmirrored against a
// now-mirrored torso, its edges no longer coincide with the trunks baked
// into the torso bitmap underneath it -- Derek saw this as "an extra set
// of trunks attached to it." Mirroring it back into alignment (same `sips
// -f horizontal`, box/jointPivotFrac untouched, same reasoning as
// torso/upperArm) removed the doubled outline.
//
// Only the torso/upperArm/pelvisOverlay bitmaps change. Box/jointPivotFrac/
// distalAnchorFrac/rigProfile.sockets are byte-for-byte inherited from v7
// (== v4's original measurements) -- no numeric value in this file differs
// from georgeAiPilotV7. Thigh (v7's recut), forearms/shins/head (v6's
// corrections) are all carried forward unchanged. Does not replace
// george-ai-pilot, -v2, -v4, -v5, -v6, or -v7 -- all six remain intact,
// reversible comparison points -- nor shipped george.js/george/.
import { georgeAiPilotV7 } from './george_ai_pilot_v7.js';

// torso/pelvisOverlay MUST share one box object, not two separate { w, h }
// literals: Skeleton.js's _placePart renders each part at its own
// img._texDims (see the constructor's img() closure), so whatever this box
// says IS the actual on-screen size -- there is no code path that keeps two
// independent boxes in sync. Derek's rig-tuner pass (2026-07-26) tuned
// torso.box.w to 78 without also moving pelvisOverlay.box.w off its stale
// 80, since the tuner exposes them as two separate sliders -- Codex caught
// the 2-world-px drift live (a doubled/drifting outline where the overlay no
// longer exactly covers the torso's trunks seam). Sharing one object
// reference here means editing either the torso or pelvisOverlay box slider
// in the tuner moves both at once, by construction -- the registration
// contract can't drift silently again.
const TORSO_BOX = { w: 67, h: 127 }; // Derek, rig-tuner live pass 2026-07-26 (sixth export) -- h was 126.616

export const georgeAiPilotV8 = {
    ...georgeAiPilotV7,
    id: 'george-ai-pilot-v8',
    textures: {
        ...georgeAiPilotV7.textures,
        // Re-keyed into this character's own asset folder, same convention
        // every prior pilot candidate used. Only torso/upperArm point at
        // new (mirrored) bitmaps -- every other key here just re-points at
        // the same v7 geometry under a v8-local key.
        head: 'george_ai_v8_head',
        torso: { ...georgeAiPilotV7.textures.torso, key: 'george_ai_v8_torso', box: TORSO_BOX },
        pelvisOverlay: { ...georgeAiPilotV7.textures.pelvisOverlay, key: 'george_ai_v8_pelvis_overlay', box: TORSO_BOX },
        // box.w narrowed 45.42->39 (Derek, rig-tuner live pass 2026-07-26,
        // second post-surgical-fix export) -- jointPivotFrac/distalAnchorFrac
        // deliberately preserved from v7 via the spread below, since the
        // tuner's export only lists the box/offset sliders it actually
        // exposes and doesn't re-state cutter-derived joint anchors; a literal
        // replace of this whole entry would have silently dropped them and
        // broken the elbow attachment routing.
        // pivotOffsetFrac: 0.065 new in the sixth export -- see the
        // egor-precedent note on thigh below re: pivotOffsetFrac+tilt combos.
        // That combo turned out to be a REAL Skeleton.js bug this time, not
        // just an ugly tune: elbow_anchor_sweep went from 0.000px to
        // 1.18-1.39px the moment this pivotOffsetFrac landed, because
        // _socketPoint (which _trueDistalEnd uses for the distal/elbow
        // anchor) computed from the pre-pivotOffsetFrac shoulder point while
        // _placePart actually draws the arm shifted by that same correction.
        // Fixed at the source in Skeleton.js's _socketPoint (mirrors
        // _placePart's own correction before deriving the local anchor) --
        // opt-in, zero change for every part without pivotOffsetFrac,
        // reconfirmed byte-identical for george/thesz. elbow_anchor_sweep is
        // back to 0.000px with the fix in place.
        upperArm: { ...georgeAiPilotV7.textures.upperArm, key: 'george_ai_v8_upper_arm', box: { w: 35, h: 67 }, pivotOffsetFrac: 0.065 }, // box.w 32->35 (seventh export)
        // box new this pass (was inherited from v7 ~36.23x70.20, essentially
        // h-unchanged/w-narrowed); pivotOffsetFrac: 0.029 new this pass, same
        // egor-precedent caveat as upperArm above.
        nearForearm: { ...georgeAiPilotV7.textures.nearForearm, key: 'george_ai_v8_near_forearm', box: { w: 32, h: 70.203 }, pivotOffsetFrac: 0.029 },
        farForearm: { ...georgeAiPilotV7.textures.farForearm, key: 'george_ai_v8_far_forearm' },
        nearShin: { ...georgeAiPilotV7.textures.nearShin, key: 'george_ai_v8_near_shin' },
        farShin: { ...georgeAiPilotV7.textures.farShin, key: 'george_ai_v8_far_shin' },
        // box essentially unchanged from v7's inherited value (39/72.991 vs
        // 38.98/72.99 -- within rounding). jointPivotFrac/distalAnchorFrac
        // deliberately preserved via the spread, same reasoning as upperArm
        // above.
        //
        // pivotOffsetFrac: -0.079 was also in this same export -- built,
        // then dropped after Derek's live "looking like egor" review (P2,
        // facing -1) against P1 (facing 1, otherwise numerically identical
        // config -- confirmed via a live render diff at matched facing).
        // Bisected empirically rather than guessed: reverting rigProfile.
        // sockets alone did NOT fix it; reverting ONLY pivotOffsetFrac (thigh)
        // still looked hunched; reverting ONLY nearShinTilt (below) alone also
        // still looked hunched -- only reverting BOTH together at facing -1
        // restored a normal standing posture matching facing 1. So this is a
        // genuine interaction between the two, not either alone, and it only
        // shows up at facing -1 (P2's slot) even though the numeric config is
        // identical at both facings -- worth a deeper Skeleton.js look if
        // this knob is wanted again, rather than re-adding blind. (Sixth
        // export reintroduces the same pivotOffsetFrac + tilt combination on
        // the ARM chain instead of the leg -- re-verified facing -1 visually
        // this time before accepting it; see upperArm/nearForearm below.)
        thigh: { ...georgeAiPilotV7.textures.thigh, key: 'george_ai_v8_thigh', box: { w: 39, h: 72.991 } },

        // Derek's rig-tuner sessions (2026-07-26): headOffsetX/Y,
        // armOffsetX/Y, legOffsetX/nearLegOffsetY/farLegOffsetX/Y are all
        // silently inert on this character and are deliberately left out --
        // this rig supplies rigProfile.sockets (below) for neck/shoulders/
        // hips, and Skeleton.js roots those joints from the authored u/v
        // fractions instead of the generic offset-knob chain whenever
        // sockets are present (see Skeleton.js's _torsoSockets comment and
        // the neck-anchor/shoulder/hip-render branches gated on
        // _neckInTorso/_torsoSockets/hipPoint). Confirmed empirically
        // (headless render diff, unchanged pixels), not assumed. Forearm and
        // shin offsets have no socket equivalent, so they DO apply --
        // that's why only those survive below. The rig-tuner's
        // "rigProfile.sockets" panel is the actual control for neck/
        // shoulder/hip position on this character.
        //
        // Recurred 2026-07-26 (third export, same session as the box/
        // pivotOffsetFrac/nearShinTilt/socket changes below): Derek's tuner
        // export also included legOffsetX: -3, nearLegOffsetY: 1,
        // farLegOffsetX: -1, farLegOffsetY: 6 -- deliberately NOT added here,
        // same reasoning as above: Skeleton.js's near/far hip-render blocks
        // only read these when `!nearHipPoint`/`!farHipPoint` (i.e. no hip
        // socket), and this character declares both, so they'd be dead
        // config. Flagged back to Derek rather than silently applied or
        // silently dropped.
        //
        // Recurred again 2026-07-26 (seventh export), same category but for
        // the SHOULDER: farArmOffsetY: 2 -- Skeleton.js only reads
        // farArmOffsetX/Y in the `else` branch when `!this._torsoSockets`
        // (see the "Shoulder position" comment ~line 1114); this character
        // declares neck/nearShoulder/farShoulder sockets, so that branch
        // never runs. Not added, flagged again -- the rig-tuner's generic
        // per-character offset panel doesn't know which knobs a given
        // character's socket/pivot mechanisms have already superseded.
        heightScale: 0.825,
        headScale: 0.89, // Derek, rig-tuner live pass 2026-07-26 (fifth export) -- was 0.99
        // nearArmTilt/farArmTilt new this pass (Derek, sixth export) --
        // Skeleton.js's this._nearArmTilt/_farArmTilt (both default 0),
        // added to the near/far upper-arm's render angle, same mechanism as
        // the leg's nearShinTilt/farShinTilt.
        nearArmTilt: -3 * Math.PI / 180,
        farArmTilt: 8.5 * Math.PI / 180, // Derek, rig-tuner live pass 2026-07-26 (seventh export) -- was -14.5deg
        // farArmOffsetY: 2 was also in the seventh export -- see the inert-
        // knob note above (this character's shoulders are socket-rooted).
        nearForearmOffsetX: -2,
        nearForearmOffsetY: 3,
        farForearmOffsetX: -6, // Derek, rig-tuner live pass 2026-07-26 (seventh export) -- was -3
        farForearmOffsetY: 1,  // Derek, rig-tuner live pass 2026-07-26 (seventh export) -- was 6
        // nearShinOffsetY/farShinOffsetY were 12/12 from an earlier Derek
        // rig-tuner pass -- proven (sole_grounding_sweep.mjs) to sink the
        // painted sole ~9-13px through the mat, since this offset applies
        // AFTER the hip-height IK solve (Skeleton.js ~line 1189) and is
        // never read by the sole-anchor solve that plants the foot
        // (~lines 805-863). That pass was fixed by zeroing both to 0.
        //
        // Derek's 2026-07-26 (later) rig-tuner export set these back to
        // 10/11 -- re-ran sole_grounding_sweep.mjs against the current
        // rig and it reproduces the same failure: max planted-sole gap
        // 9.69px (idle, near sole, facing 1), FAIL against the 2px gate.
        // Root cause is identical to the 12/12 case above -- this offset
        // still isn't read by the grounding solve at any nonzero value.
        // Left as Derek explicitly set it rather than silently reverted;
        // flagged in the same handoff pass for a decision (revert to 0,
        // or fix the grounding solve to read this offset).
        nearShinOffsetX: -2, // Derek, rig-tuner live pass 2026-07-26 (fifth export) -- was 6
        nearShinOffsetY: 12, // unchanged this pass
        // nearShinTilt (13.5deg) was also in an earlier export -- built, then
        // dropped along with thigh's pivotOffsetFrac above after Derek's live
        // "looking like egor" review; see that comment for the bisected
        // root cause (the two only break posture together, and only at
        // facing -1). Skeleton.js's this._nearShinTilt defaults to 0.
        farShinOffsetX: 3, // Derek, rig-tuner live pass 2026-07-26 (fifth export) -- was 6
        farShinOffsetY: 13, // Derek, rig-tuner live pass 2026-07-26 (fifth export) -- was 12, see the sole-sink comment above (same unresolved issue, one unit worse)
        rigProfile: {
            sockets: {
                neck:         { u: 0.612, v: 0.136 }, // unchanged this pass
                nearShoulder: { u: 0.21,  v: 0.136 }, // unchanged this pass
                farShoulder:  { u: 0.652, v: 0.187 }, // Derek, rig-tuner live pass 2026-07-26 (sixth export) -- was u:0.737,v:0.23
                nearHip:      { u: 0.469, v: 0.793 }, // Derek, rig-tuner live pass 2026-07-26 (fifth export) -- was u:0.392
                farHip:       { u: 0.676, v: 0.748 }, // unchanged this pass
            },
        },
    },
};
