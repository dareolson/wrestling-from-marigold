# Handoff: clasping hands approved at G2

2026-11-07 evening · Claude Opus · branch `story/marigold-opening`, HEAD at this commit, not pushed.

## What happened this session

- **G2 approved** (Derek, r7 at bebc34e: "looks good"). PLAN_GRAPPLES Stage 2 clasps are done.
- **r5 (8fdb9fe):** the tied-up man holds each of the attacker's upper arms at the middle of the biceps (`LOCKUP.bicepGrip` .5, label
  `bicepGrip`, wears the `elbowCup` art), no hand behind the neck. Derek: "they need to be defending themselves, not just hugging."
  Codex r4 findings fixed: the .94 reach cap and its aim only apply with the clasp art on.
- **r6 (3c89198):** the art swap moved onto the fast frames of the grab (hand speed) and the release (weight < .2, latched). Derek:
  no visible change. The real cause was found after it (next point); r6's timing stays.
- **T2.0b (Codex, 5201724):** George's three clasp forearms were Lou's drawing (outline, wrist mark, elbow notch), so the whole
  forearm changed at the swap. Now his own `forearm.png` down to the wrist (0 px changed), new hands only.
- **r7 (051b84b, bebc34e):** the attacker's elbow hand cups the partner's near forearm (`LOCKUP.elbowFore` .25); it was aimed at
  the far elbow behind the torso ("resting his fist on george's ribs"). Pixel-level swap check added (`clasp_r7_pixels.mjs`).

## Lessons

- A "frozen swap" check on sprite quads proves nothing about the art; compare drawn pixels (r5's 0.06 px missed a whole redraw).
- Targets on the partner's far arm land behind his torso; grip the arm drawn in front (r3 for the defender, r7 for the attacker).
- Derek's rule, saved to memory: in a tie-up the defender grips the attacker's biceps, never hugs.

## Open (polish list, not blocking)

George's collar hand on Lou 27.5 px off, his elbow near straight (0.09 rad); Lou-defending biceps hand 14 px; Lou's clasp art
changes 72-294 shaft px per swap (Derek doesn't see it); George's new hand outlines thinner than his base hand. Pre-existing:
`waistlock_cleanup` snapmare-flip "match ends inside the clip" fails, also before r6.

## Next

[PLAN_FINISHERS.md](../PLAN_FINISHERS.md) Stage 1, F1.1 (trigger and controller, `?finisher=v1`), Sonnet. Later in grapples: the
steal as a visible shove, more clasps (wrist grab, arm drag, headlock).

## Repo state

Frame dumps (g2-clasps, whip-weight) now gitignored, kept on disk. Three old Codex waistlock review scripts in `tools/debug/`
(`throw_support_review`, `waistlock_contact_probe`, `waistlock_review_report`) left untracked: unreviewed, waistlock is parked.
Last full suite was at r4; run the full suite, build and coverage before the next push.
