# Thesz v2 Pass A — art-direction decisions (SETTLED)

**Status: closed 2026-08-23 by Derek.** Nothing here is blocking. This file is
now the record of what was decided and why, so a later pass cannot silently
reopen it.

---

## D-0 — Likeness authority (corrected)

**Ruling.** `lou-canonical-chroma-v1.png` is the likeness authority. It supplies
Lou's identity, proportions, costume, palette, and profile.
`LouTheszFullBodyRef.png` is **removed from all generation inputs**: it depicts
an erroneous moustache and contaminates the model.

Lou is **unequivocally clean-shaven**.

This corrects an error in the first draft of this packet, which named the
contaminated file as primary likeness truth and measured the palette from it.
Both are fixed. `v2-layer-standardization/REPORT.md` already documented the
correct authority; the draft did not follow it.

## D-1 — Ink standard: apply it, identity unchanged

**Ruling.** Apply the v2 tapered artist-stroke standard — 5–6.5 source px
exterior with 20–25% local variation, 3.5–4.5 px major divisions, 2.5–3.2 px
secondary detail, no uniform marker-like outline, no black ring around joints.

**Apply it without changing Lou's established identity.** The stroke *treatment*
changes; the man does not. Face, hair, build, costume, and palette stay as the
approved canonical has them. This is a change in how the line is drawn, not in
what is drawn.

## D-2 — Turnaround: George supplies format only

**Ruling.** George's approved turnaround supplies the **five-view format**
— front, front3q, profile, back3q, back — and nothing else. It is not a likeness
reference. Lou's face, hair, physique, and palette come from the canonical.

Lou's profile faces **right**, consistent with the approved canonical and with
the manifest's `sourceFacing: "right"`. George's profile faces left; that is
George's registration, and it does not transfer.

**The model may extrapolate the remaining views.** The canonical supplies a
right-facing near-profile; front, front3q, back3q and back are interpretations.
That is precisely why Pass A exists as its own gate — those interpretations get
approved before any part is cut.

## D-3 — Era and grooming

**Ruling.** 1952, age 36, prime NWA-champion period. Clean-shaven: no moustache,
no beard, no stubble.

## D-4 — Costume: black trunks and blue boots, unchanged

**Ruling.** Keep the current **black trunks** and **blue lace-up boots**. No
colour change.

**Recorded technical note, accepted rather than actioned.** Measured from the
approved canonical, the trunks and the outline ink are both pure black
(luma 0.0). `CHARACTER_ART_SOURCE_STANDARD.md` asks for ≥24 luma between
adjacent gameplay-critical regions, and the pelvis is one. So the trunk edge is
carried by silhouette and by the skin/trunks boundary (178.8 → 0.0, a large
gap), not by a trunks-vs-ink value step.

This is a known, accepted deviation, not an oversight. It is written down here
so that if the hip boundary ever reads poorly at 154 px in Gate A, the cause is
already identified and the fix is a costume-value decision rather than a rig
bug. Every other adjacency passes comfortably — see `REFERENCES.md`.

## D-5 — Neutral pose: open hands

**Ruling.** Erect neutral, feet planted, arms relaxed slightly away from the
torso, **hands open**. The canonical shows closed fists; the v2 base hand slot
is `hand.open`, and `hand.fist` is derived from it as a Pass-C variant. Opening
the hands at Pass A is what makes that derivation possible.

---

## Not decisions — fixed by the manifest

- **Height.** 530 px master → 265 px near-ring. Matches real Thesz at 6'2".
- **Runtime.** All seven `runtimePrerequisites` are `pending`. Pass A produces a
  source sheet; nothing here renders in a match and shipped Thesz is untouched.
- **Production bank.** Empty in Pass A. Populated in Pass B by masking the
  approved masters at 1:1 — never by regenerating a limb.
