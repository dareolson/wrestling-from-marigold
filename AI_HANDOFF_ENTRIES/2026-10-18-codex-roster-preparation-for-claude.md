# Claude: Procreate roster preparation is ready

2026-10-18 · Codex · requested by Derek. This is the current art-thread handoff.
Older move-refinement and entanglement work remains recorded; it is not deleted.

## Start here

Derek completed FOUR Procreate PSDs and asked Codex to follow your existing
conventions because he is saving your tokens for tomorrow morning. Intake,
full-canvas extraction, background exclusion and separate alpha/component
cleanup are complete. Do not repeat generation or ask him to remove backgrounds.
Next useful work is measured part normalization and an isolated comparison rig.

Authoritative delivered masters and all derived work:

`Sprite sheets/RosterNew/2026-10-18/`

Read `README.md`, `EXTRACTION.md`, and `sources.json` there. Each character's
`extracted-v1/LAYER_INVENTORY.md` and manifests give the concrete layer IDs,
alpha accounting and provenance. The PSDs, not the earlier generated PNGs, are
Derek's edited art authority. Original Downloads files remain untouched.

## Files, canvases and selected parts

| PSD / character directory | Canvas | Art layer IDs and roles |
| --- | --- | --- |
| GeorgeNew | 2388 x 1668 | 2 shin A, 3 shin B, 4 torso, 5 thigh A, 6 thigh B, 7 upper arm, 8 forearm/hand, 9 head |
| GuidoNew | 2388 x 1668 | 2 torso, 3 shin A, 4 shin B, 5 thigh A, 6 thigh B, 7 upper arm, 8 taped forearm/hand, 9 head |
| Killer_Kowalski | 914 x 1721 | 2 torso, 3 shin A, 4 shin B, 5 thigh A, 6 thigh B, 7 forearm/hand, 8 upper arm, 9 head |
| LouNew | 4096 x 1714 | 1 L Lower Leg, 2 whole L Arm, 3 R Lower Leg, 4 Torso, 5 L Upper Leg, 6 R Upper Leg, 7 Head, 8 R Upper Arm, 9 R Lower Arm |

For the three new sources, layer 0 is Background and layer 1 is the hidden
whole-figure reference. Guido/Kowalski backgrounds were visible in the PSD:
explicitly excluded anyway. Lou's only excluded layer is Background. Leg A/B
names are intentionally not yet anatomical near/far assignments; derive those
from the actual source geometry/stack before binding.

## What is already done

- All channels decoded using your `tools/wrestler-cutter/psd-layer-reader.py`.
- Original/archive PSD SHA-256 verified at intake and after extraction/cleanup.
- 33 art layers exported losslessly at original full-canvas dimensions/origin.
- Background and hidden full-figure layers exported separately for provenance.
- Transparent assembled figure plus white/gray inspection views per character.
- Separate cleaned copies use your prior Lou approach: alpha <=15 cleared,
  largest connected component retained. This implementation uses 8-connectivity
  and rejects a secondary component >64 pixels for review. Actual removed
  detached components were at most 32 pixels. Raw pixels remain available.
- Cleaned surviving RGBA pixels verified against raw exports; no opacity boost,
  RGB repaint, anatomy generation, resizing or limb rotation performed.
- Convenience `measurement-crops/` now provides tightly bounded clean parts
  with 16px padding and a manifest recording EXACT source rectangle/origin.
  Full-canvas coordinate = crop coordinate + recorded origin. These are not
  calibrated runtime parts; do not infer pivots from canvas midpoints.
- PSD reader now reports mask/group/blend-range metadata; exporter rejects
  unsupported masks/groups/clipping/blend-if and non-normal/partial-opacity
  layers. All four deliveries pass the supported format checks.
- Runtime art, configs, roster kits and game behavior are unchanged.

Per character, use:

```text
extracted-v1/layers-full-canvas/                 raw art
extracted-v1/excluded-layers/                    background/reference provenance
extracted-v1/figure.png                          raw composite
extracted-v1/LAYER_INVENTORY.md                   human-readable intake
extracted-v1/manifest.json                       source + raw export metadata
extracted-v1/cleaned-v1/layers-full-canvas/       cleaned aligned art
extracted-v1/cleaned-v1/figure.png                cleaned composite
extracted-v1/cleaned-v1/manifest.json             cleanup accounting
extracted-v1/cleaned-v1/measurement-crops/        crop PNGs + reversible origins
```

## Follow your existing Lou method

Reference:

- `AI_HANDOFF_ENTRIES/2026-10-07-claude-integrate-lou-procreate-master.md`
- `AI_HANDOFF_ENTRIES/2026-10-07-claude-lou-procreate-master-integration.md`
- `CHARACTER_ART_RECOVERY_AUDIT.md` (interchange and approval gates)
- `RIG_AND_MOVE_PIPELINE.md` (binding arithmetic and bone-axis definitions)
- `src/characters/thesz_procreate_v1.js` (working comparison precedent)

Suggested sequence:

1. Start with LouNew against the current Lou comparison path, since that gives
   a known control. Compare the new PSD with the previous master; its hash is
   different, so do not assume anchors/config values remain valid.
2. Inspect the source assembly; pick the unobstructed shared upper-arm/thigh
   paintings the current loader actually supports. Preserve both leg paintings
   as donors. No renderer expansion merely to consume extra paintings.
3. Measure anatomical joints on full-canvas sources and record their cropped
   coordinates. Shoulder = actual proximal/socket geometry, not the centroid
   of the hanging arm's entire torso overlap. Shin axis = knee to ankle,
   not knee to the projected boot toe or sole mass.
4. Straighten ONLY derived limb copies around measured anchors. Prior Lou
   handoff documented that `straighten-limb-bake.mjs` failed to transport
   `sourcePixel` in ankle mode; inspect whether it is fixed before relying on
   that path. Do not blindly reapply the old workaround or old angles.
5. Derive proportional boxes and head scale from actual ink/anchor geometry,
   including jointPivotFrac growth. Do not force George/Kowalski/Guido into
   Lou's widths or carry over his offsets. Keep approved body proportions.
6. Build an opt-in comparison character and render its neutral assembly early.
   Then inspect both-facing walk and grounded transitions. Bring George through
   the same proven path, then Guido/Kowalski. Do not promote shipped art without
   Derek's visual review of the assembled result.
7. Run the existing rig/participation and representative real gameplay checks
   once source assembly looks right; record measured limitations honestly.

## Character-specific traps

- **Guido:** only one isolated forearm is supplied, and it includes wrist tape.
  Sharing it would tape BOTH wrists. Preserve the one-taped-wrist canon. An
  untaped counterpart must come from suitable supplied donor art or an explicit
  art correction, not silently repainting Derek's source. Retain the taped
  forearm even if you stage a limited comparison first; disclose that limitation.
- **Lou:** `L Arm` is shoulder-to-hand, not a forearm. Existing split R arm can
  supply a shared articulated base; preserve the whole arm as donor. Do not
  claim a whole painting bends at an absent elbow cut.
- **All:** hands/boots remain baked into forearms/shins. Do not manufacture
  uncertain independent hand/boot splits. Rounded caps visible in source are
  not proof of rotation-invariant opaque joint coverage.
- **Pelvis/feet:** Derek explicitly corrected all three new source figures to
  more side-on pelvis/legs, with both boots pointing in the travel direction.
  Preserve it. No frontal pelvis with a sideways head; no outward 45-degree
  toe caused by reusing old offsets. Measure and preview, don't fix a mismatch
  by distorting the illustration.
- **Trunks:** modest vintage cut with substantial hip coverage and medium-low
  curved leg openings. Repeated generation drift toward tiny high-cut briefs
  and square boyshorts was rejected. Preserve Derek's final PSD paint.
- **Faces/build:** George is softer-faced/personable, naturally strong with
  slimmer limbs, not evil or a bloated bodybuilder. Kowalski retains distinctive
  angular features and a tall frame with reduced bulk. Guido is youthful and
  compact. No regeneration or unsolicited likeness changes.
- **Earlier deep review:** it used baseline 1311f8b. Some old move/grounded issues
  may have been fixed since. Reproduce against current code rather than treating
  historical numbers as current failures or blaming the new PSDs.

## Verification and reproducibility

```sh
python3 tools/wrestler-cutter/export-roster-psds.py 'Sprite sheets/RosterNew/2026-10-18' --cleanup
```

Python dependencies were already installed: Pillow, NumPy, SciPy. No installation
was performed. Exporter: `tools/wrestler-cutter/export-roster-psds.py`.
It validates source hashes, supported layer features, RGBA PNG round-trips,
surviving cleaned pixels, and preserved raw-file hashes. Crop PNG round-trips
are checked too. All four PSDs passed; 8/8/8/9 art layers respectively.
Raw reconstructed figures visually inspected for all four, cleaned George also
inspected. No gameplay test/build run was needed for source-only extraction;
do not cite old test counts as validation of new comparison rigs.

Useful later gates, under Node 22 and a local dev server:

```sh
npm run rig:validate
npm test
npm run build
node tools/rig/certify.mjs <comparison-character-config-name>
WFM_URL=http://127.0.0.1:5173 node tools/debug/move_participation_proof.mjs /tmp/roster-joints.json
```

Read each tool's actual character-selection support before claiming new
candidates were covered. A test passing for the old roster is not a proof of
new characters. Cover both facings, planted soles, selected strikes/throws,
hold contacts, falls, grounded handoff and get-up in the new comparison path.

## Workspace / next handoff

There is substantial pre-existing story/opening work and generated art in the
working tree. Inspect git status; preserve all unrelated modifications.
`Sprite sheets/` is ignored in normal git status: do not assume these artifacts
are tracked/backed up merely because their handoff is tracked. Source hashes,
export files and the editable PSDs are preserved locally. Do not indiscriminately
force-add large art/history directories or fold story changes into this work.

Update the handoff with comparison IDs, actual checks, source/derived paths,
remaining art corrections and a visual review link. No need to spend tokens
re-auditing the already completed raw extraction unless provenance fails.
