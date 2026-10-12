# Character Art Recovery Audit

**Date:** 2026-09-27  
**Scope:** July–September 2026 wrestler-art, rig, move-authoring, and validation work  
**Purpose:** Preserve what is genuinely reusable, stop repeating failed loops, and define the smallest improvement that can ship over the current demo.

## Executive verdict

The full-sheet generation strategy did not produce a production Lou. It repeatedly changed likeness, proportions, part anatomy, view, or joint construction while fixing a different defect. The latest assembled experiments also drifted Lou from tall and relatively lanky toward a compact bodybuilder silhouette. Those candidates are not a new body baseline.

The last two months were not empty, however. The repository now contains most of the runtime architecture Derek originally wanted:

- independently articulated shoulders, elbows, hips, and knees;
- optional separate near/far lower limbs;
- optional separately socketed hands and boots;
- per-keyframe part variants;
- facing-aware semantic part selection for moves;
- expression/head variant support;
- two-anchor limb binding and authored internal pivots;
- move-editor preview, contacts, onion skins, and seekable clips;
- candidate mapping, joint sweeps, articulation proofs, and runtime validation.

The useful conclusion is therefore not “start the character system over.” It is:

> Keep the working demo and rig. Replace artwork incrementally. Treat generated images as donor material. Make Derek's Procreate normalization a required production stage.

## Verified current baseline

Run on 2026-09-27 under Node 22.23.1:

- `npm test`: **544/544 passed**.
- `npm run build`: **passed**.
- `npm run rig:validate`: **passed** for `george`, `thesz`, and the removable `thesz-front3q-r1` comparison character.

The shipped George and Lou remain the only sensible visual/runtime baseline. No recent Lou candidate is approved to replace shipped Lou wholesale.

## What is genuinely useful

### 1. The shipped demo is a safe compatibility baseline

Production George and Lou still build and validate. New art can be added behind optional configuration rather than replacing a whole character at once. The removable `thesz-front3q-r1` character also proved that a candidate can be tested in the live game without changing production Lou.

**Keep:** `src/characters/thesz.js`, `src/characters/george.js`, the current production assets, reversible comparison presets, and the rule that new art does not become default until Derek approves it in motion.

### 2. The replacement-part architecture already exists

`src/rig/partVariants.js` and `Skeleton.js` support:

- base and variant textures;
- shared families with side-specific overrides;
- `head`, `torso`, upper/lower limb, hand, and boot replacement slots;
- independent near/far hands and boots;
- discrete part changes on animation keyframes;
- automatic reset to base art when a move ends or is interrupted;
- semantic slots such as `workingHand` and `strikingForearm`, resolved from live facing.

This is the core of the intended move-specific art system. It is underused because finished production variants do not yet exist for Lou or George, not because the system needs to be invented again.

### 3. The rig learned the right structural lessons

The following mechanisms are reusable and should not be discarded:

- authored `jointPivotFrac` overlap instead of butt-jointing two cropped edges;
- two-anchor binding for limb segments;
- explicit neck, shoulder, hip, elbow, knee, wrist, ankle, sole, and semantic contact anchors;
- facing-safe mirroring of off-center anchors;
- separately placed hands and boots;
- planted-sole grounding;
- near/far lower-limb perspective support;
- local elbow and knee pose channels.

The rig can already express the segmented character system. Art should be authored to it incrementally rather than asking one generation to solve every segment simultaneously.

### 4. The move-authoring work is valuable

The seekable clip runtime and move editor are real production assets. The hammerlock proved:

- paired choreography can be authored and replayed;
- a move can select replacement art at a keyframe;
- facing-aware semantic selection works;
- required contacts can be measured rather than implied;
- preview and runtime can share the same authored staging frame.

The jab and hammerlock are the two reference implementations for future variant-aware moves. This work directly supports grip hands, fists, expression changes, and move-specific limb silhouettes.

### 5. The diagnostic tools are useful when kept subordinate to Derek's eye

Keep these tools:

- `art:map-candidate` — identifies whether delivered parts map to real runtime slots and catches baked bends/trunks/head content;
- `art:measure-joints` — stress-tests joint coverage;
- `art:proofs` — produces assembled and articulated review sheets;
- `art:straighten-limbs` — repairs a known baked-axis defect without repainting;
- `art:key-plate` — cleans alpha plates before measurement;
- `rig:validate` and `rig:certify` — verify configuration/runtime contracts;
- the rig tuner and move editor.

They detect structural failures. They do not approve likeness, anatomy, silhouette, line quality, or whether a wrestler looks good.

### 6. Several art artifacts remain useful as references or donors

Use, but do not overstate:

- **Shipped Lou:** authoritative current gameplay silhouette and the baseline that a first improvement must beat.
- **Original Lou references and working production parts:** likeness and proportion reference; preserve the tall/lanky read.
- **Pass-A v3:** useful likeness/reference material, but not a coherent production turnaround; its five views visibly drift in age, hair, anatomy, and camera.
- **Profile normalized v4/v5:** mechanically informative secondary-view material, not the primary gameplay body and not a visual template for George.
- **Front3q v4-straightened:** diagnostic control proving the mapping/proof path; explicitly rejected as production art.
- **v5/v6/v7 generated sheets:** donor library only. A rejected sheet may still contain one useful head, hand, boot, forearm, or texture treatment.
- **Current three-quarter head:** provisional donor. It supplies the desired view but is not yet approved for Lou likeness or as the default head.
- **Existing profile head:** preserve as an alternate/mechanics head until the view policy is decided in practice.
- **George expression PNGs:** useful source material for the future head inventory, but currently not production-wired or visually certified as a complete family.

## What should stop

### Stop whole-character replacement as the default iteration unit

Do not regenerate Lou's entire body to repair one arm, thigh, head, or trunks defect. Each full regeneration reopens already acceptable decisions and makes cause/effect impossible to track.

### Stop treating a generated sheet as a production asset exporter

Generation may supply a donor painting. It does not own final silhouette, anatomical continuity, exact joint placement, alpha cleanup, line continuity, or crop geometry. Derek owns those in Procreate; deterministic tools own cropping and binding afterward.

### Stop optimizing local parts before approving the assembled silhouette

The neutral figure must pass at gameplay size before exhaustive joint measurement or tuner work. If the overall body is wrong, local mechanical refinement is sunk cost.

### Stop equating automated passes with visual approval

The project repeatedly certified structurally valid art that was visibly wrong. Mechanical certification and visual approval remain separate statuses.

### Stop the 95-cell/five-view program as an immediate shipping dependency

The large canonical-v2 package produced valuable ideas and tooling, but no production character currently consumes its promised 95-cell bank. Keep it as future architecture. Do not require it before Lou gains one useful hand or expression swap.

### Do not use a rigid whole arm or whole leg as a bendable runtime part

The current rig bends at the elbow and knee. A single shoulder-to-hand or hip-to-boot bitmap cannot bend in the middle. Whole limbs are useful as **Procreate authoring sources**, from which overlapping runtime segments are derived. They are not useful as final articulated parts unless the project later adds mesh deformation or frame-by-frame pose sprites.

## Root process failure

The process asked image generation to solve four different jobs at once:

1. likeness and camera view;
2. whole-body anatomy and silhouette;
3. modular decomposition and hidden overlap;
4. final production cleanup and exact runtime geometry.

The model could often solve two or three, but not all four consistently. Subsequent automatic fixes then changed decisions Derek had not asked to reopen.

The revised process assigns one owner to each job:

| Job | Owner |
| --- | --- |
| Likeness/proportion target | Derek-approved reference and silhouette |
| Donor ideation | Image generation, one requested family at a time |
| Anatomy, linework, cleanup, normalization | Derek in Procreate |
| Cropping, alpha, anchors, binding, proofs | Codex/tooling |
| Final visual approval | Derek |
| Independent process critique | Claude |

## Minimum shippable recovery: “Lou 1.1”

The goal is not a rebuilt Lou. It is current production Lou with one visible, useful capability added without degrading anything else.

### Locked invariants

- Production Lou's body silhouette, scale, trunks coverage, stance, and current likeness remain unchanged.
- No whole-body generated candidate replaces him.
- The profile and provisional three-quarter heads both remain available; neither is declared the permanent default during this milestone.
- Existing moves and base poses must remain visually and mechanically unchanged when no variant is selected.

### First vertical slice

1. Prepare a Procreate template from the working Lou, at a useful enlarged source scale.
2. Draw the complete near and far arms naturally before splitting them.
3. Derive overlapping forearm and hand parts from those full arms.
4. Produce three hand states: `fist`, `open`, and `grip`.
5. Keep the wrist anchor identical across all three states.
6. Wire `grip` into one existing hold, preferably hammerlock, using the existing semantic selection path.
7. Keep `fist` or the current hand as the base state so every other move remains unchanged.
8. Review the real game in both facings and at the three gameplay scales.

This proves the complete new process—donor/reference → Procreate → aligned export → deterministic cut/bind → move-selected replacement—without rebuilding Lou's torso, thighs, head, and feet simultaneously.

### Why hands first

- Derek identified them as the first obvious replacement family.
- The variant and semantic-selection architecture already exists.
- A hand swap is immediately visible in holds and strikes.
- It changes a small area and therefore carries much less silhouette risk than a torso or thigh replacement.
- Once Lou's wrist/hand contract works, George can repeat the same document structure and export checklist.

## Known architecture limits to respect

- **Head expressions/views:** supported as texture variants if canvas and neck geometry remain locked.
- **Hands and boots:** supported as separately socketed attachments and variants, but shipped Lou/George still use baked forearm-hand and shin-boot art. The first production use must split and repaint those seams.
- **Forearm/shin/upper-arm/thigh variants:** supported when geometry remains compatible with the base part.
- **Torso variants:** texture swapping exists, but meaningful torso twisting moves shoulder/hip/neck sockets. Current variant merging does not provide per-variant torso socket geometry. Mild paint-only changes are possible; a real twist needs variant-specific socket support or a different composite strategy.
- **Whole arm/leg bending:** unsupported without a new deformation or frame-animation system.
- **Multiple body views:** the source standard describes them, but runtime `bodyView` transport is still pending. Do not generate a complete inventory of unused views before one primary-view replacement family ships.

## New production loop

1. **Name the move problem.** Example: “hammerlock hand does not grip.”
2. **Choose the smallest affected family.** Hand before forearm; forearm before full arm; full-body regeneration last.
3. **Prepare a donor pack.** Include the shipped part, approved silhouette, useful rejected fragments, joint guide, and target move screenshots.
4. **Generate only if a donor is missing.** Request one family or one pose, not a complete character sheet.
5. **Normalize in Procreate.** Derek owns contour, anatomy, likeness, line weight, and overlap paint.
6. **Export aligned layers.** Preserve a common full-body canvas and a separate guide layer; do not crop individual layers by hand.
7. **Cut and bind deterministically.** Codex removes empty padding, records anchors, and creates the runtime variant.
8. **Cheap structural checks.** Alpha, filenames, dimensions, axis, anchors, and mapping.
9. **Visual neutral/move gate.** Derek reviews the real assembly before exhaustive sweeps.
10. **Mechanical stress proof.** Only approved-looking art receives full articulation and runtime certification.
11. **Wire one move.** Confirm the variant changes at the right keyframe and resets after completion/cancellation.
12. **Promote or retain as donor.** Record status explicitly; never let “candidate” silently become “production.”

## Procreate interchange contract

The safest interchange is:

- Derek keeps the layered `.procreate` document as the editable source.
- Export one flattened neutral composite PNG.
- Export every part layer as a transparent PNG at the **same full-canvas dimensions and origin**.
- Export the joint/marker guide separately; never flatten markers into production art.
- Do not crop, resize, or rotate individual exports after drawing.
- Use stable layer names from `CHARACTER_PART_INVENTORY.md`.

Codex then performs the final per-part crops and writes the geometry metadata. This preserves alignment and removes the need for either side to guess where a part belonged.

## Decision rule for future characters

Lou establishes the repeatable minimum, not the maximum imaginable inventory. George then follows the same order:

1. base primary-view body;
2. hand family;
3. expression heads;
4. only the torso/limb/boot variants demanded by actual move failures;
5. secondary views when a shipped move truly requires them.

Do not build speculative parts merely because the schema can hold them.

