# Prompt for Claude — independent audit of the character-art recovery plan

Read the repository and perform a **read-only independent audit** of the new character-art recovery direction. Do not edit code, art, manifests, or documentation. Do not generate images. Do not merely agree with Codex's conclusions.

Start with these two new documents:

- `CHARACTER_ART_RECOVERY_AUDIT.md`
- `CHARACTER_PART_INVENTORY.md`

Then verify their important claims directly against at least:

- `AI_HANDOFF.md`
- `CHARACTER_ART_SOURCE_STANDARD.md`
- `CHARACTER_PIPELINE_REVIEW.md`
- `RIG_AND_MOVE_PIPELINE.md`
- `COHESIVE_BODY_RIG_BLUEPRINT.md`
- `src/Skeleton.js`
- `src/rig/partVariants.js`
- `src/rig/sourceManifestAdapter.js`
- `src/rig/referenceRig.js`
- `src/animation/clips/hammerlock.js`
- `src/animation/clips/hammerlock.tracks.js`
- `tools/move-editor/README.md`
- the July–September 2026 entries under `AI_HANDOFF_ENTRIES/`
- the actual shipped Lou/George assets and the retained Lou/George candidate directories.

## Context from Derek

First audit a serious documentation failure: Derek states that he **never
requested** the “broader, stockier, more compact” Lou attributed to him in the
September 15 verdict, September 26 brief, tracked generation prompt, and later
summaries. Treat that direction as an AI-originated hallucination, not a past
Derek decision and not a change of mind. Identify how the false attribution
propagated and flag every still-active document or process that could revive it.

Derek accepts that generated art needs manual cleanup and normalization in Procreate. The intended workflow is now:

1. generated or existing art supplies donors;
2. Derek resolves likeness, anatomy, silhouette, linework, and joint painting in Procreate;
3. aligned layers return to Codex;
4. deterministic tools crop, bind, test, and integrate them.

The immediate product goal is deliberately small: produce a working Lou that is only a little better than the current demo, then add replacement parts as moves demonstrate a need. Open/closed/grip hands and expression heads are the first likely families. Torso twists, special limbs, boots, and secondary body views come later when evidence demands them.

Derek's larger goal has not changed: moves should be able to swap artwork when ordinary rigid rotation cannot produce a convincing wrestling pose. Finishing Lou should define an understandable checklist that can then be repeated for George and future wrestlers.

## Questions you must answer

### A. Audit the retrospective

1. Which July–September investments are genuinely reusable for this narrower plan?
2. Which artifacts are only diagnostic provenance or donor material?
3. Which conclusions in `CHARACTER_ART_RECOVERY_AUDIT.md` are unsupported, overstated, stale, or contradicted by the current code?
4. Did Codex miss any important successful work that should be preserved?
5. Did Codex label anything useful as a dead end too quickly?

### B. Audit the minimum Lou 1.1 milestone

1. Is the proposed hand vertical slice truly the smallest end-to-end proof of the replacement system?
2. For shipped Lou, should the first implementation split hands from forearms, or should it temporarily use complete forearm-plus-hand variants? Compare risk, code changes, Procreate burden, visual quality, and how well each option becomes the standard for George.
3. Verify whether `workingHand`, `strikingForearm`, side-specific fallbacks, variant reset, preload discovery, editor preview, and runtime keyframe swaps work as described.
4. Name every code/art/config change actually required to make one `grip` hand appear in the hammerlock and reset safely afterward.
5. Identify any hidden blocker in grounding, depth order, facing, semantic contacts, legacy compatibility, or the character validators.

### C. Audit the inventory

1. Is the proposed part taxonomy sufficient for the existing move library?
2. Which parts are genuinely universal base requirements, and which should remain move-driven?
3. Are `fist`, `open`, and `grip` the correct first hand states? Recommend changes only when tied to an existing move or known near-term move.
4. Are the five proposed head expressions the right minimum, or can the first production set be smaller?
5. Which existing moves are most likely to require special arms, legs, boots, torsos, or body views after hands?
6. Confirm the stated architecture gap for true torso twists. Explain the smallest correct implementation if per-variant shoulder/hip/neck sockets are needed.
7. Identify any replacement family that the current variant merger or renderer cannot safely support despite appearing in the inventory.

### D. Audit the Procreate round trip

1. Is exporting every layer as a transparent PNG on one common full-body canvas the safest interchange format?
2. What guide layers and metadata must be included so Codex can crop and bind without guessing?
3. Should Derek draw full limbs first and derive overlapping segments, as proposed?
4. Recommend exact joint-overlap and hidden-edge practices that work with the current draw order and articulation ranges.
5. Identify where the existing source standard is valuable and where it is too expensive for the immediate Lou 1.1 goal.

### E. Recommend the next process

Provide a concrete sequence with:

- a one-week/smallest vertical slice;
- explicit stop/go gates;
- the exact human decision required at each visual gate;
- which checks should be cheap and early;
- which expensive checks must wait until after visual approval;
- a clean handoff contract among Derek, Codex, and Claude;
- how Lou's completed inventory becomes George's checklist without copying Lou's anatomy or proportions.

## Required output format

Return:

1. **Bottom-line verdict** — no more than ten sentences.
2. **Claims verified from code** — cite file paths and relevant symbols/lines.
3. **Corrections to Codex's audit** — numbered, most serious first.
4. **Recommended Lou 1.1 vertical slice** — exact assets, code seams, tests, and visual gates.
5. **Revised part inventory** — only changes you recommend, with reasons.
6. **Procreate handoff checklist** — concise and operational.
7. **George transfer test** — what must be true before calling the method repeatable.
8. **Risks and stop conditions** — including when to abandon a local repair instead of starting another generated sheet.

Distinguish clearly between:

- facts verified from current code/art;
- inferences;
- recommendations;
- questions only Derek can answer.

Do not use passing test counts as evidence of visual quality. Do not recommend another five-view or full-character generation before the Lou 1.1 vertical slice is proven unless you can show from the current runtime that it is unavoidable.
