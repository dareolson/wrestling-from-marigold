# Claude execution prompt — integrate and test Derek's Lou Procreate master

You are working in the `wrestling-from-marigold` repository. Derek has supplied
a layered Photoshop document derived from the 2026-10-06 cohesive Lou image
generation. Integrate it as a **new opt-in comparison character**, test it in
the actual game, and leave shipped Lou unchanged until Derek visually approves
the candidate.

This is an execution task, not a design review. Carry it through extraction,
binding, proofs, runtime registration, and proportional verification. Do not
declare the art production-ready merely because mechanical tests pass.

## Source of truth

PSD:

```text
Sprite sheets/AI Pilot/Lou/procreate-masters/2026-10-06-imagegen-cohesive-v1/lou-cohesive-v1-procreate-master.psd
```

Verified intake facts:

```text
Adobe Photoshop Image
canvas: 4096 x 1714
mode: RGBA, 8-bit channels
size: 7,051,161 bytes
sha256: 41a6af6469e650ab4e55ab0fc8caf4cc7a998fa99fd3dd6929d1f129d8a8b3bb
```

Related provenance and generation notes:

```text
Sprite sheets/AI Pilot/Lou/procreate-masters/2026-10-06-imagegen-cohesive-v1/README.md
Sprite sheets/New Lou/LouTheszFullBodyRef.png
Sprite sheets/AI Pilot/Lou/v2-layer-standardization/references/lou-canonical-chroma-v1.png
```

The PSD is Derek's edited authority. The earlier generated PNGs are provenance
only and must not overwrite his work.

## Read before editing

Read these files completely, in this order:

1. `AI_HANDOFF.md`, especially the current status summary and latest entries.
2. `CHARACTER_ART_RECOVERY_AUDIT.md`.
3. `CHARACTER_PART_INVENTORY.md`.
4. `CHARACTER_ART_SOURCE_STANDARD.md`, especially elbow/knee overlap, hidden
   attachment surfaces, pelvis ownership, wrist/hand and ankle/boot sockets.
5. `RIG_AND_MOVE_PIPELINE.md`, especially “Binding art to the rig.”
6. `src/characters/thesz_front3q_r1.js` as the removable comparison-character
   precedent. Do not copy its measurements blindly.
7. `src/characters/thesz.js`, `src/rig/partVariants.js`, and the relevant
   preload/character-selection code in `src/scenes/Arena.js`.

Inspect `git status` first. Existing modifications and untracked files belong
to Derek or another agent. Preserve them and do not fold unrelated work into
this task.

## Non-negotiable art direction

- Lou is tall and relatively lanky, not compact, stocky, barrel-chested, or a
  modern bodybuilder. Do not “correct” Derek's proportions toward the rejected
  broader direction.
- Lou is unmistakably clean-shaven. No mustache, beard, stubble, five-o'clock
  shadow, upper-lip shadow, or contour that reads as a mustache.
- The primary gameplay view is `front3q`.
- Preserve Derek's pixels. Integration may remove an isolated background layer,
  transparent padding, or demonstrably non-art halo through a preserved,
  repeatable source-processing step. Do not repaint anatomy or silently alter
  silhouette, face, hands, costume, or linework.
- Mechanical success is not visual approval. Derek owns likeness, silhouette,
  anatomy, and final visual acceptance.

## Phase 1 — PSD intake and layer audit

1. Preserve the PSD byte-for-byte. Verify its SHA-256 before doing anything.
2. Use a PSD-aware reader/exporter and inventory every layer/group in document
   order: name, visibility, bounds, opacity, blend mode, masks, and whether it
   contains pixels. Do not flatten the document and pretend it arrived as
   separated art.
3. Save a human-readable layer inventory beside the PSD. Record the tool and
   exact command used. If a required dependency is unavailable, do not replace
   the layered extraction with screenshots or hand-copied pixels; report the
   exact blocker and use an approved/installable PSD reader only with proper
   authorization.
4. Export a flattened full-character preview and each meaningful art layer as
   transparent PNGs at the original **4096 x 1714 full-canvas dimensions and
   origin**. Put these in a new versioned sibling directory; never overwrite the
   PSD or the generated provenance PNGs.
5. Keep guide/marker/background layers separate and exclude them from production
   art. A black canvas or checkerboard is not transparency.
6. Measure alpha. Confirm the intended body paint is opaque and that transparent
   pixels do not retain a large colored halo. Preserve the raw exports even if
   a deterministic keyed/cleaned derivative is needed.

At the end of this phase, state exactly what Derek actually delivered. Do not
assume layer names from prior chat. If layers are ambiguously named, determine
their identity from the composite and record the mapping.

## Phase 2 — map the delivered layers to the current runtime

Prefer the smallest compatible integration. Do not expand the renderer unless
the existing architecture truly cannot represent Derek's delivered base body.

Current base-art contract that the comparison path can consume:

```text
head
torso
upper_arm              shared between near/far
thigh                  shared between near/far
near_forearm
far_forearm
near_shin
far_shin
```

The architecture also supports separately socketed near/far hands and boots,
but only use them if the PSD actually supplies clean separate attachments with
stable wrist/ankle geometry. Do not manufacture a hand or boot split by cutting
through uncertain anatomy.

Important constraints:

- The current base loader/runtime deliberately shares `upper_arm` and `thigh`.
  If the PSD contains separate near/far versions, preserve both as source/donor
  layers but select the best unobstructed painting for the shared runtime base.
  Do not add new base filenames or renderer behavior merely to avoid making
  that documented choice.
- Forearms and shins may remain hand/boot-baked compatibility parts if Derek did
  not supply trustworthy separate hands/boots.
- The torso must be headless in the runtime export, with complete shoulder,
  chest, trunks, and pelvis paint behind its attachments. Do not draw the head
  twice or erase it from a flattened bust that lacks underlying paint.
- The torso or an explicit pelvis underlay must own a complete rounded opaque
  underbody behind both thighs. Do not wire a redundant pelvis overlay simply
  because a similarly named layer exists.
- Elbows and knees use internal shared anchors and painted overlap, never
  edge-to-edge butt joints. Hidden attachment faces carry continuous skin paint,
  not a dark cap, bevel, or seam ring.
- Derive every anchor from the full-canvas art and record it. Do not inherit
  `thesz_front3q_r1` coordinates, boxes, offsets, or scales without independent
  measurement.

Create a versioned landmark/mapping JSON that includes the full-canvas source
coordinates and the normalized coordinates of every runtime crop. At minimum:

```text
head: neck anchor and axis
torso: neck, near/far shoulder, near/far hip if using dynamic pelvis
upper_arm: shoulder and elbow
near/far_forearm: elbow and wrist/hand axis
thigh: hip and knee
near/far_shin: knee, ankle, and sole
separate hands, if present: wrist, wrist axis, semantic contact
separate boots, if present: ankle, ankle axis, heel/toe/sole contacts
```

Generate tight runtime crops deterministically from the aligned full-canvas
exports. Retain sufficient painted overlap around every declared joint. Do not
move, resize, or rotate individual source layers to make them fit before the
measurements are recorded.

## Phase 3 — bind as a removable comparison character

Create a new candidate named:

```text
thesz-procreate-v1
```

Use:

```text
src/assets/wrestlers/thesz-procreate-v1/
src/characters/thesz_procreate_v1.js
```

Register it through the same opt-in character-selection path as
`thesz-front3q-r1`, so it can be launched explicitly with:

```text
?p1=thesz-procreate-v1&p2=george
```

Requirements:

- Do not replace files under `src/assets/wrestlers/thesz/`.
- Do not change the default wrestler card, default matchup, shipped `thesz`
  config, move set, pose tables, damage, AI, or gameplay tuning.
- Reuse shipped Lou's move set and poses initially, as the existing comparison
  character does, so the review isolates art and binding.
- Derive display boxes from the delivered art and declared anchors using the
  `_placePart` growth arithmetic documented in `RIG_AND_MOVE_PIPELINE.md`.
- Start all candidate-only screen offsets at zero. If a nonzero offset is truly
  required after measurement, document what physical registration error it
  corrects. Do not tune offsets to hide malformed crops or bad anchors.
- Solve overall display height transparently. Provide an equal-height proof
  against shipped Lou as well as the untouched candidate scale so Derek can
  distinguish art proportions from runtime scaling.
- Keep all additions removable by deleting the new candidate config/assets and
  its explicit registration lines.

## Phase 4 — structural and visual proofs

Run the repository's actual mapping and proof tools. Inspect their current
`--help`/usage before invoking them rather than inventing flags.

Produce, under a versioned evidence directory:

1. Full-canvas layer contact sheet and crop map.
2. Neutral assembly on transparency.
3. Neutral assembly on a high-contrast checker/background that exposes holes,
   halos, and accidental semi-transparency.
4. Broadcast/game-scale renders at the project's three established gameplay
   scales.
5. Equal-height side-by-side with shipped Lou, clearly labeled left/right.
6. Both horizontal facings.
7. Articulation sweeps for both shoulders, elbows, hips, and knees, including
   straight, guard/45°, 90°, deep flex, overhead/hammerlock where applicable,
   and representative leg separation/get-up angles.
8. Real-game screenshots for idle, walking, jab, lockup, hammerlock, one
   overhead pose, one grounded/pin pose, and one move with deep knee flex.

Review the following independently:

- anchor coincidence;
- opaque joint coverage throughout rotation;
- correct view/orientation and mirroring;
- neck, shoulder, elbow, pelvis, knee, wrist, and ankle seams;
- sole grounding in both facings;
- head scale and neck connection;
- clean-shaven face at gameplay scale;
- tall/lanky silhouette versus shipped Lou and Derek's full-body reference;
- near/far depth read;
- hands and fingers in idle, strike, and hold poses;
- background halo or translucent edge contamination.

Do not call a mechanical pass a visual pass. List every visible defect plainly,
even if all automated checks succeed.

## Phase 5 — verification

At minimum run:

```text
npm test
npm run build
npm run rig:validate
```

Also run the applicable candidate mapping, joint measurement, articulation
proof, and rig certification commands after confirming their present CLI
syntax. Add focused tests for the new registration/config if existing tests do
not already exercise it. Verify that shipped `thesz` asset hashes and behavior
remain unchanged.

Test the real browser path, not only static scripts:

- candidate loads by explicit query parameter;
- both facings render;
- moves complete without missing textures, NaNs, detached parts, or grounding
  regressions;
- interruption/cancellation resets any selected variants;
- selecting ordinary shipped Lou still loads the original character unchanged.

If browser automation is unavailable, state that explicitly and provide the
exact URL and remaining manual checks; do not imply screenshots were reviewed
when they were not.

## Stop conditions

Stop before production promotion. Do not make `thesz-procreate-v1` the default
or delete prior candidates.

If the PSD lacks a body part required for a coherent assembly, if a torso is a
flattened full bust with no underlying shoulder/chest paint, or if a joint lacks
enough authored overlap to survive rotation, do not fabricate invisible anatomy
or tune around it. Complete every safe extraction and diagnostic step, then
return a precise Procreate correction list to Derek with annotated evidence.

## Deliverables and report

Deliver:

- preserved PSD and SHA verification;
- PSD layer inventory;
- raw aligned full-canvas layer exports;
- deterministic cropped runtime assets;
- landmark/mapping metadata;
- opt-in `thesz-procreate-v1` config and registration;
- all named evidence/proofs;
- focused automated tests plus full test/build/rig results;
- a concise visual defect/correction list for Derek;
- an `AI_HANDOFF.md` entry recording what changed, exact commands/results, and
  the candidate's truthful status.

End with one of these statuses only:

- **READY FOR DEREK VISUAL REVIEW** — complete opt-in integration, mechanical
  checks pass, production promotion intentionally not performed.
- **NEEDS PROCREATE CORRECTION** — integration reached the furthest safe point,
  with exact missing/failed art requirements and evidence paths.
- **BLOCKED ON PSD EXTRACTION** — only if layered pixels genuinely cannot be
  read without new authorization; name the required tool/action precisely.

Do not commit or push unless Derek separately asks. Do not absorb unrelated
dirty-worktree files into this task.
