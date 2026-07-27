# Claude Task — George v8 Surgical Seam Fix

This instruction supersedes Claude's 2026-07-26 claim that the v8 art-edge
cleanup was complete. Derek visually rejected that pass. Automated rig and
joint audits do not evaluate these ink seams and are not evidence of success.

## Objective

Make only two visible seams disappear:

1. No black/dark stroke around the torso's neck scoop.
2. No black/dark interior stroke across the front/top shoulder where the near
   upper arm overlaps the torso.

Also restore the torso pixels that the rejected pass mistakenly inpainted at
the armpit. Do not redesign, retune, or improve anything else.

## What the rejected pass did wrong

- It never modified `upper_arm.png`. It removed a different isolated stroke
  from `torso.png` around source bbox `(125,259)-(181,340)` and left an
  inpainted/blurred patch. Restore that torso region from the pre-cleanup
  mirrored v8 source.
- It deliberately added a six-pixel black quadratic-Bezier collar stroke in
  `prepare_v8_corrections.py` with `draw.line(...)`. Derek does not want a
  replacement collar line. Remove it completely.
- Its passing audits only prove rig geometry. They do not prove that the
  unwanted strokes are gone.

## File allowlist

You may modify only:

- `src/assets/wrestlers/george-ai-pilot-v8/torso.png`
- `src/assets/wrestlers/george-ai-pilot-v8/upper_arm.png`
- `Sprite sheets/AI Pilot/George/tools/prepare_v8_corrections.py`, only as
  needed to make those exact pixel corrections reproducible
- new comparison screenshots under `tools/debug/shots/`

Do not modify any other file. In particular, do not modify:

- `src/characters/george_ai_pilot_v8.js`
- `src/Skeleton.js`
- `src/Wrestler.js`
- `src/scenes/Arena.js`
- `tools/rig-tuner/rig-tuner.js`
- `pelvis_overlay.png`, the trunks, head, forearms, thighs, or shins
- `AI_HANDOFF.md` or `AI_HANDOFF_TASKS.json` before Derek approves

If another file appears to require a change, stop and report it. Do not make
the change.

## Exact operations

### A. Undo the wrong torso shoulder edit

Restore only the rejected inpainted armpit/shoulder patch around source bbox
`(125,259)-(181,340)` from the clean pre-correction v8 torso (the horizontally
mirrored v7 torso). Do not remove another torso stroke. Do not inpaint a larger
region. The front/top shoulder complaint refers to `upper_arm.png`, not this
torso component.

### B. Remove the neck-scoop stroke

Keep the current scoop's alpha silhouette, width, depth, and position unchanged.
Remove the entire black/dark curve drawn along that scoop. The finished scoop
must be an unoutlined transparent opening in the torso.

Forbidden:

- no collar outline
- no accent line
- no replacement curve
- no thinner or lighter stroke
- no new anatomy
- no change to the neck socket or head anchor
- no additional scooping

Deleting or disabling the current six-pixel `draw.line(...)` call is necessary
but not sufficient: also remove the black curve already baked into the current
PNG without changing the scoop geometry.

### C. Remove the actual front-shoulder stroke

Inspect the assembled v8 and identify the black proximal/top outline belonging
to the near `upper_arm.png` where that arm overlaps the torso. Edit
`upper_arm.png`. Remove only the portion that becomes an interior seam when
assembled, replacing it with continuous matching skin/shading and appropriate
alpha. Preserve the external deltoid silhouette where it remains visible
outside the torso.

Do not use connected-component location guesses from `torso.png`. Do not move,
resize, rotate, recrop, or repad the upper arm. Preserve its canvas, anchor,
pivot, and registration exactly.

If you cannot unambiguously identify which pixels are the unwanted assembled
stroke, stop and show Derek one marked screenshot. Do not guess and do not edit.

## Frozen decisions

The current trunks/backfill, torso and pelvis registration, pose, sockets,
scale, offsets, grounding, depth order, and all other art are frozen for this
task. Do not image-generate anything. Do not perform cleanup that Derek did not
name. Do not treat comments in the old completion entry as authorization to
broaden scope.

## Required workflow and stop points

1. Before editing, record `git status`, checksums for the two target PNGs, and
   one assembled gameplay screenshot showing both rejected seams.
2. Make one surgical correction pass limited to the allowlist.
3. Report the exact changed-pixel bounding box for each PNG. Any changed pixels
   outside the neck band, the restored torso armpit bbox, or the upper arm's
   proximal seam region are a failure; undo only this pass and stop.
4. Show Derek:
   - a native-resolution torso neck crop;
   - a native-resolution upper-arm proximal crop;
   - assembled gameplay-scale v8 in both facings;
   - one raised-arm pose that exposes the front shoulder.
5. Stop for Derek's visual decision.

Do not run the full test/audit suite, update the handoff, commit, push, claim
completion, or begin another corrective attempt before Derek reviews those
images. If Derek rejects the first pass, stop and wait for exact direction.

## Acceptance criteria

- The scoop shape is unchanged and has no visible dark boundary stroke.
- The assembled front shoulder has no interior black seam.
- The torso's mistakenly blurred armpit patch is restored.
- No frozen file or value changed.
- Derek explicitly approves the screenshots. This approval is the only finish
  condition.
