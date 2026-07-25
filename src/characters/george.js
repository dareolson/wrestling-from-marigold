// Gorgeous George — character config.
// Far limbs mirror near limbs in code — you only draw one set.
//
// 2026-07-19 (newgeorge redraw): the old GeorgeParts source was hand-cut
// piece-by-piece, with mismatched pivots that needed a long chain of
// per-part offsetX/Y/tilt nudges (see git history) to line back up. The
// redraw follows DRAWING_GUIDE's "draw the full body, then cut it into
// layers on one shared canvas" method instead (same method used for the
// New Lou/thesz redraw) — every part's silhouette/pivot already agrees with
// the reference by construction, so those compensation hacks are gone.
// Only values that are still structurally necessary (headScale, the shin's
// own display box) are set below; if something still reads off in-engine,
// tune it live with tools/rig-tuner/ rather than re-accumulating offsets
// here blind.
export const george = {
    id:        'george',
    // Sampled directly off Sprite sheets/NewGeorge/Georgereference.png —
    // used only as the flat-fill color for this character's non-textured
    // fallback draws (piledriver/flat/dropkick poses in Wrestler.js), so it
    // should track the actual art rather than be freely restyled.
    skinCol:   0xc7a2ac,
    trunksCol: 0xd54283,
    textures: {
        // Measured (Derek, 2026-07-19: "george looks about seven feet
        // tall"): at s=1 (the DRAWING_GUIDE near-edge calibration point,
        // 43px/ft), George's assembled skeleton (head-top to boot-sole)
        // rendered 300px tall = 6.98ft — confirmed via
        // window.__RIG_TOOL.skeleton().head/nearShin.getBounds(). Real
        // George stood 5'9" (69in = 5.75ft = 247px at s=1); heightScale =
        // 247/300 = 0.824. Wrestler.js folds this into draw()'s local `s`
        // only — never into the `s` getter (movement/reach/hit-detection),
        // so this is purely a visual resize, no gameplay-balance change.
        // Thesz (6'2") got the matching treatment — see thesz.js — so the
        // two now read at their real relative heights instead of both
        // rendering ~7ft.
        // Re-solved 0.824→0.798 (Derek, 2026-07-19) once the floating-feet
        // fix below (nearShinOffsetY/farShinOffsetY) landed — re-measured
        // raw (heightScale=1) height 310.05px, heightScale = 247/310.05 = 0.798.
        heightScale: 0.798,
        head:     'george_head',
        // head2/torso2-style split carries over: neck is baked into the
        // torso layer (GeorgeTorso.png), the head layer (GeorgeHead.png) is
        // neck-free — confirmed by measuring the two source layers on their
        // shared 1536x1024 canvas: head content runs y 76-257, torso
        // content starts at y 235 — the two overlap exactly where the neck
        // stub sits, same pattern Skeleton.js's `_neckInTorso` expects.
        neckInTorso: true,
        // headScale started from a measured 0.91 (ink-content-basis ratio,
        // same method as thesz's redraw — see git history for the
        // derivation), then brought down further to 0.745 in the live
        // rig-tuner pass (Derek, 2026-07-19): the measured value matches the
        // reference illustration's own proportions, but George's head still
        // read too big once seated on the in-engine torso/shoulders next to
        // his now-tuned limb scale.
        headScale: 0.745,
        // headOffsetX/Y below: live rig-tuner pass (Derek, 2026-07-19) —
        // small seating nudge on top of the measured headScale above, same
        // as thesz's own headOffsetX/Y (clean art still wants this, it's
        // not part of the old distortion chain).
        headOffsetX: 10,
        headOffsetY: 10,
        // Re-checked against Georgereference.png's shared-canvas silhouette
        // (2026-07-19): 78x106 preserves the processed torso's 190:260
        // aspect ratio to rounding, so the earlier -5% box is sound.
        // Object form only overrides display size; joint math is untouched.
        torso:    { key: 'george_torso', box: { w: 78, h: 106 } },
        // armOffsetY: live rig-tuner export (Derek), same seating-nudge
        // category as thesz's own armOffsetY — near-shoulder Y seat only.
        armOffsetY: 1,
        // Widths re-derived from the uncut shared-canvas reference, not the
        // prior live-tuned boxes. Largest-component, axis-normal p90 ink
        // thicknesses are torso 169.01px, upper arm 84.15px, forearm
        // 63.61px. After compensating only for each runtime PNG's crop/
        // rotation padding, those ratios solve to 54.63px and 40.15px at
        // this 78px torso box; rounded to whole display pixels below.
        // Heights retain the existing visual-length tuning. Elbow-chain
        // joint math remains on the shared bone lengths, untouched.
        // h reduced 5% (75→71.25, rounded to 71 — 2026-07-23, Derek: "reduce
        // the length of george's arms by five percent") — length only,
        // width untouched, same box-resize technique as the thigh/torso
        // length tweaks above (visual only; upperArmH bone length is unset,
        // so the shoulder/elbow joint chain doesn't move, just the rendered
        // art's length).
        upperArm: { key: 'george_upper_arm', box: { w: 55, h: 71 } },
        // nearForearmOffsetX: live rig-tuner pass (Derek, 2026-07-19).
        // jointPivotFrac (2026-07-21/22, general joint-attachment contract —
        // see AI_HANDOFF.md's 2026-07-19 Codex entries and Skeleton.js's
        // img()/_attachChild comments): George's forearm art carries
        // deliberate flesh-tone overlap slack above the elbow, which the
        // cutter used to shave off (flattenOpaqueCap) to force a flat
        // top-of-texture cap — that's what let the elbow visibly detach
        // during bends and get-up poses. `CHARACTERS.george.jointPivotParts`
        // in tools/wrestler-cutter/process-parts.mjs now opts this part out
        // of that shave and reports where the true elbow row landed instead;
        // this is that value (rerun via `node tools/wrestler-cutter/
        // process-parts.mjs george`, verificationOk true — see that report's
        // jointPivotFrac.forearm). Skeleton.js's img() uses it as the
        // texture's internal setOrigin y-fraction so the overlap art tucks
        // under the upper arm instead of hanging below the joint. h reduced
        // 5% (69→65.55, rounded to 66 — 2026-07-23, same "reduce the length
        // of george's arms by five percent" ask as upperArm above) — this
        // box's h is defined as the below-pivot bone span (see Skeleton.js's
        // _placePart jointPivotFrac comment), so shrinking it directly
        // shortens the visible forearm without touching jointPivotFrac.
        // Then a second, forearm-only pass (2026-07-23, Derek: "reduce the
        // size of just his lower arms an additional five percent") — "size"
        // this time, not just length, so both w and h scaled 5% together:
        // 40→38, 66→62.7 (rounded to 63). Then a third pass, same day
        // (Derek: "make george's forearms 5 percent smaller") — both
        // dimensions again: 38→36.1 (rounded to 36), 63→59.85 (rounded to
        // 60).
        forearm:  { key: 'george_forearm', box: { w: 36, h: 60 }, jointPivotFrac: 0.1804878048780488 },
        // Left as-is after wiring jointPivotFrac above (2026-07-22): unlike
        // the shin's offsets (see nearShinOffsetY's comment below — those
        // were ~13-27px, comparable to RIG.KNEE_OVERLAP=18, i.e. clearly the
        // old backoff compensation), this is only 2px against
        // RIG.ELBOW_OVERLAP=17 — an order of magnitude too small to be that
        // same compensation, so it's left in place as a minor fist-position
        // nudge rather than zeroed.
        nearForearmOffsetX: 2,
        // nearForearmOffsetY: live rig-tuner export (Derek, 2026-07-24 —
        // post-shoulder-attachment-fix pass), same category as
        // nearForearmOffsetX above.
        nearForearmOffsetY: -3,
        // farForearmOffsetX/Y (2026-07-24, live rig-tuner export, Derek —
        // re-tuned after the shoulder attachment fix landed; supersedes the
        // 2026-07-23 -3/-6 values) — the far elbow was left un-nudged when
        // jointPivotFrac was wired in (see the comment above), but reads
        // slightly off in the actual game view; these are a small
        // live-tuned seat, same category as nearForearmOffsetX above, not a
        // sign the joint-attachment math needs revisiting.
        farForearmOffsetX: -4,
        farForearmOffsetY: -8,
        // "Thighs need to be longer" (Derek, 2026-07-19) — tried as a
        // per-character `thighH` bone-length bump first; wrong lever.
        // `Skeleton.js`'s `img()` always stashes a fixed `_texDims` display
        // box on the thigh Image (TEX.thigh's default even for a plain
        // string entry, see the constructor) — `_placePart` uses that box
        // unconditionally, so growing `thighH` alone never grows the
        // rendered art. All it did was raise the hip (the standing-pose
        // hipY solve holds the *ankle* fixed at ground, so a longer thigh
        // bone pushes the hip and everything above it further up) —
        // "his feet are on the ground but the rest of him needs to come
        // down" was that bug, exactly. Reverted; the fix is a display-box
        // resize instead, same technique as torso/arms above: box.h = the
        // default 70 recomputed as if thighH were 68 (68+HIP_OVERLAP 14),
        // while width is independently re-derived from Georgereference.png:
        // thigh/torso axis-normal p90 thickness = 114.56/169.01. Correcting
        // for the runtime PNG padding gives 85.08px at the retained 78px
        // torso box, rounded to 85 (the old 96 was the aspect-scaled guess).
        // Bone length (and so
        // the hip/torso/head position) stays at the shared default —
        // purely visual, the shin (drawn on top at the knee) covers the
        // extra length past the true joint.
        thigh:    { key: 'george_thigh', box: { w: 85, h: 82 } },
        // legOffsetX/nearLegTilt/near+far leg+shin offsets/nearShinScale
        // below: live rig-tuner pass (Derek, 2026-07-19), tuned together
        // against the new art's actual silhouette (not carried over from
        // the old GeorgeParts numbers).
        legOffsetX: 7,
        // Shared near+far hip-render nudge (applied to both legs equally,
        // on top of their already-tuned near/far-specific offsets below) —
        // Derek, 2026-07-19: legs sat a touch low.
        legOffsetY: -8,
        nearLegTilt: -5 * Math.PI / 180,
        // nearShinOffsetX/Y, farShinOffsetX/Y (2026-07-23, live rig-tuner
        // pass, Derek — supersedes the 2026-07-22 re-derived values that
        // were here before). The 07-22 pass zeroed these against the
        // jointPivotFrac attachment fix and measured sub-2px pivot/ground
        // gaps via window.__WFM_GAME + knee_pivot_audit — but Derek looked
        // at the actual rendered leg in the browser and the calf still
        // didn't read as connected: pivot-coincidence and ground-gap
        // measurements check the render ORIGIN, not whether the visible art
        // between thigh and boot reads as one connected limb at real game
        // scale. Reopened tools/rig-tuner/ and dragged the near/far shin
        // handles live until the calf visually joined the knee; these four
        // values are that live-tuned export, applied as-is.
        nearShinOffsetX: -4,
        nearShinOffsetY: 3,
        nearShinScale: 0.81,
        farLegOffsetX: 27,
        farLegOffsetY: -2,
        // farShinOffsetX/Y (2026-07-23, live rig-tuner export, Derek —
        // supersedes the analytically-derived 17/6 that were here
        // momentarily). Same root cause as that prior pass: the far-leg 5%
        // size reduction (farShinScale 0.81→0.77) shrinks the shin toward
        // its top-anchored render origin, lifting the boot off the mat
        // (measured ~8.1px unscaled via window.__WFM_GAME right after the
        // scale change). That measurement got the *ground contact* to
        // sub-pixel, but Derek then live-tuned the final seat himself in
        // tools/rig-tuner/ for the actual look, not just the numeric gap —
        // these are that export, applied as-is.
        farShinOffsetX: 16,
        farShinOffsetY: -12,
        // Far shin had no scale knob at all until this pass (Skeleton.js/
        // rig-tuner only had nearShinScale) — added farShinScale so the far
        // leg could be brought down to match the near leg's new 0.81 rather
        // than rendering at an un-scaled, now-mismatched size next to it.
        // Reduced an additional 5% (0.81→0.7695, rounded to 0.77 —
        // 2026-07-23, Derek: "his far leg needs to be reduced in size by
        // five percent") as part of the same far-leg-only pass as
        // farThighScale below.
        farShinScale: 0.77,
        // Far thigh had no scale knob at all either (2026-07-23, same "far
        // leg needs to be reduced" ask — the far leg is thigh AND shin, and
        // only the shin had a knob). Added the matching RIG.FAR_THIGH_SCALE
        // mechanism to Skeleton.js/rig-tuner (mirrors how farShinScale was
        // added), set to 0.95 (5% down from the un-scaled default of 1) —
        // george's far thigh had never been scaled before this.
        farThighScale: 0.95,
        // Object form overrides the Skeleton.js TEX default display box —
        // shin always needs this since its true box depends on this
        // character's own boot-art fillFrac (see Skeleton.js's TEX
        // comment). New shin.png fills its 150x230 canvas at fillFrac=1 (no
        // width-limited crop, unlike the old art's 0.841), so the box
        // follows the documented formula directly instead of an extra
        // per-character fudge factor:
        //   scale  = (P.shinH + P.bootH) / fillFrac / canvasH = 89/1/230 = 0.387
        //   box.w  = canvasW * scale                          = 150*0.387 ≈ 58
        //   box.h  = canvasH * scale + RIG.KNEE_OVERLAP        = 89 + 18   = 107
        // jointPivotFrac: same joint-attachment contract as the forearm
        // above, applied to the knee — see that comment for the mechanism.
        // Value from process-parts.mjs's report.jointPivotFrac.shin.
        shin:     { key: 'george_shin', box: { w: 58, h: 107 }, jointPivotFrac: 0.125 },
    },
    // Arena's PRESETS.george overrides this with 'powerIdle' at runtime; this
    // said 'idle' since 2026-07-12 (known inconsistency). Aligned so tools
    // reading the character file (rig-tuner) preview the real resting stance.
    idlePose:  'powerIdle',
    tauntPose: 'tauntArmsWide',
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick',
        'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
    ],
};
